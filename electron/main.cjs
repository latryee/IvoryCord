const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { WebSocketServer, WebSocket } = require('ws');
const { randomUUID } = require('crypto');

let mainWindow = null;
let wss = null;
const rooms = new Map();
const clients = new Map();
const roomChats = new Map(); // roomId -> ChatMessage[]
const emptySince = new Map(); // roomId -> timestamp
const permanentRooms = new Set(['ivory', 'Ivory']);
const EMPTY_ROOM_TIMEOUT_MS = 10 * 60 * 1000;

// Kalıcı Ivory odasını başlat
rooms.set('ivory', new Set());
roomChats.set('ivory', []);

// --- 1. Gömülü Sinyalleşme ve Sohbet Sunucusu ---
function startEmbeddedSignalingServer(port = 4000) {
  try {
    wss = new WebSocketServer({ port, maxPayload: 10 * 1024 * 1024 });

    wss.on('error', (err) => {
      console.log(`[Ivorycord] WebSocket port ${port} kullanımda, mevcut sunucu devralındı.`);
      wss = null;
    });

    function getRandomColor() {
      const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#14b8a6', '#f43f5e'];
      return colors[Math.floor(Math.random() * colors.length)];
    }

    function send(ws, msg) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    }

    function getPublicRooms() {
      const list = [];
      const ivoryPeers = rooms.get('ivory');
      list.push({
        id: 'ivory',
        name: 'Ivory Ana Salon',
        memberCount: ivoryPeers ? ivoryPeers.size : 0,
        isPermanent: true,
      });

      for (const [roomId, peers] of rooms.entries()) {
        if (roomId.toLowerCase() === 'ivory') continue;
        list.push({
          id: roomId,
          name: roomId,
          memberCount: peers.size,
          isPermanent: false,
        });
      }
      return list;
    }

    function broadcastRoomsList() {
      const msg = { type: 'rooms-list', rooms: getPublicRooms() };
      for (const client of clients.values()) {
        if (client.ws.readyState === WebSocket.OPEN) {
          send(client.ws, msg);
        }
      }
    }

    function broadcastToRoom(roomId, msg, excludePeerId) {
      const roomPeers = rooms.get(roomId);
      if (!roomPeers) return;
      for (const pId of roomPeers) {
        if (pId === excludePeerId) continue;
        const client = clients.get(pId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
          send(client.ws, msg);
        }
      }
    }

    function leaveRoom(peerId) {
      const client = clients.get(peerId);
      if (!client || !client.roomId) return;
      const rId = client.roomId;
      const roomPeers = rooms.get(rId);
      if (roomPeers) {
        roomPeers.delete(peerId);
        broadcastToRoom(rId, { type: 'user-left', userId: peerId, username: client.user.username });
        if (roomPeers.size === 0 && !permanentRooms.has(rId)) {
          emptySince.set(rId, Date.now());
        }
      }
      client.roomId = null;
      broadcastRoomsList();
    }

    // 30 saniyede bir boş odaları temizle
    setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [rId, ts] of emptySince.entries()) {
        if (now - ts >= EMPTY_ROOM_TIMEOUT_MS) {
          if (!permanentRooms.has(rId)) {
            rooms.delete(rId);
            roomChats.delete(rId);
            emptySince.delete(rId);
            changed = true;
          }
        }
      }
      if (changed) broadcastRoomsList();
    }, 30000);

    wss.on('connection', (ws) => {
      const peerId = randomUUID().substring(0, 8);
      const connection = {
        ws,
        user: {
          id: peerId,
          username: 'User',
          avatarColor: getRandomColor(),
          isMuted: false,
          isDeafened: false,
          isSpeaking: false,
          joinedAt: Date.now(),
        },
        roomId: null,
      };
      clients.set(peerId, connection);

      send(ws, { type: 'rooms-list', rooms: getPublicRooms() });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'join-room') {
            const targetRoomId = msg.roomId.toLowerCase() === 'ivory' ? 'ivory' : msg.roomId;
            leaveRoom(peerId);
            connection.roomId = targetRoomId;
            connection.user.username = msg.username || `User_${peerId}`;
            if (msg.avatarColor) connection.user.avatarColor = msg.avatarColor;

            if (!rooms.has(targetRoomId)) {
              rooms.set(targetRoomId, new Set());
              roomChats.set(targetRoomId, []);
            }
            emptySince.delete(targetRoomId);

            const roomPeers = rooms.get(targetRoomId);
            const chatHistory = roomChats.get(targetRoomId) || [];

            const existingPeers = [];
            for (const otherId of roomPeers) {
              const other = clients.get(otherId);
              if (other) existingPeers.push(other.user);
            }

            send(ws, { type: 'room-joined', roomId: targetRoomId, selfId: peerId, peers: existingPeers, chatHistory });
            broadcastToRoom(targetRoomId, { type: 'user-joined', user: connection.user }, peerId);
            roomPeers.add(peerId);
            broadcastRoomsList();
          } else if (msg.type === 'get-rooms') {
            send(ws, { type: 'rooms-list', rooms: getPublicRooms() });
          } else if (msg.type === 'signal-offer' || msg.type === 'signal-answer' || msg.type === 'signal-ice') {
            const target = clients.get(msg.targetPeerId);
            if (target) {
              msg.senderPeerId = peerId;
              send(target.ws, msg);
            }
          } else if (msg.type === 'user-state-update') {
            if (msg.isMuted !== undefined) connection.user.isMuted = msg.isMuted;
            if (msg.isDeafened !== undefined) connection.user.isDeafened = msg.isDeafened;
            if (msg.isSpeaking !== undefined) connection.user.isSpeaking = msg.isSpeaking;
            if (connection.roomId) {
              broadcastToRoom(connection.roomId, { type: 'user-state-update', userId: peerId, ...msg });
            }
          } else if (msg.type === 'send-chat') {
            if (connection.roomId && (msg.text?.trim() || msg.imageUrl)) {
              const chatMsg = {
                id: randomUUID(),
                senderId: peerId,
                senderName: connection.user.username,
                senderAvatarColor: connection.user.avatarColor,
                text: msg.text?.trim() || undefined,
                imageUrl: msg.imageUrl || undefined,
                timestamp: Date.now(),
              };

              if (!roomChats.has(connection.roomId)) {
                roomChats.set(connection.roomId, []);
              }
              const history = roomChats.get(connection.roomId);
              history.push(chatMsg);
              if (history.length > 50) history.shift();

              broadcastToRoom(connection.roomId, { type: 'chat-message', message: chatMsg });
            }
          }
        } catch (e) {
          console.error('[Signaling Error]', e);
        }
      });

      ws.on('close', () => {
        leaveRoom(peerId);
        clients.delete(peerId);
      });
    });
  } catch (err) {
    console.log('[Ivorycord] Sunucu başlatılamadı:', err.message);
  }
}

// --- 2. Masaüstü Penceresi ---
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 900,
    minHeight: 620,
    center: true,
    show: true,
    backgroundColor: '#090c10',
    title: 'Ivorycord Voice & Chat',
    icon: path.join(__dirname, '../build/icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      backgroundThrottling: false,
    },
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'media') return true;
    return false;
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') return callback(true);
    callback(false);
  });

  let htmlPath = path.join(app.getAppPath(), 'dist', 'index.html');
  if (!fs.existsSync(htmlPath)) {
    htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
  }

  mainWindow.loadFile(htmlPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startEmbeddedSignalingServer(4000);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (wss) {
    try {
      wss.close();
    } catch {}
  }
  app.quit();
});
