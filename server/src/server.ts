import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { RoomManager } from './RoomManager.js';
import { SignalMessage } from './types.js';

const PORT = Number(process.env.PORT) || 4000;
const wss = new WebSocketServer({
  port: PORT,
  host: '0.0.0.0',
  maxPayload: 10 * 1024 * 1024,
});
const roomManager = new RoomManager();

console.log(`\n======================================================`);
console.log(`  🚀 IVORYCORD ULTRA-LIGHT SIGNALING & CHAT SERVER    `);
console.log(`  🔊 Port: ${PORT}`);
console.log(`  🏰 Permanent Room: 'ivory'`);
console.log(`  ⏳ Empty Room Timeout: 10 Minutes`);
console.log(`======================================================\n`);

wss.on('connection', (ws: WebSocket) => {
  const peerId = randomUUID().substring(0, 8);
  const client = roomManager.registerClient(ws, peerId);

  console.log(`[WS] Client connected: ${peerId}`);

  // Bağlanan istemciye anında mevcut açık odaların listesini gönder
  roomManager.send(ws, {
    type: 'rooms-list',
    rooms: roomManager.getPublicRooms(),
  });

  // Heartbeat ping-pong
  ws.on('pong', () => {
    client.isAlive = true;
  });

  ws.on('message', (data: string) => {
    try {
      const message: SignalMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'join-room': {
          roomManager.joinRoom(
            peerId,
            message.roomId,
            message.username,
            message.avatarColor
          );
          break;
        }

        case 'get-rooms': {
          roomManager.send(ws, {
            type: 'rooms-list',
            rooms: roomManager.getPublicRooms(),
          });
          break;
        }

        case 'signal-offer': {
          roomManager.relaySignal(message.targetPeerId, peerId, {
            type: 'signal-offer',
            targetPeerId: message.targetPeerId,
            senderPeerId: peerId,
            sdp: message.sdp,
          });
          break;
        }

        case 'signal-answer': {
          roomManager.relaySignal(message.targetPeerId, peerId, {
            type: 'signal-answer',
            targetPeerId: message.targetPeerId,
            senderPeerId: peerId,
            sdp: message.sdp,
          });
          break;
        }

        case 'signal-ice': {
          roomManager.relaySignal(message.targetPeerId, peerId, {
            type: 'signal-ice',
            targetPeerId: message.targetPeerId,
            senderPeerId: peerId,
            candidate: message.candidate,
          });
          break;
        }

        case 'user-state-update': {
          roomManager.updateUserState(peerId, {
            isMuted: message.isMuted,
            isDeafened: message.isDeafened,
            isSpeaking: message.isSpeaking,
          });
          break;
        }

        case 'send-chat': {
          roomManager.handleChatMessage(peerId, message.roomId, message.text, message.imageUrl);
          break;
        }

        default:
          console.warn(`[WS] Unknown message type:`, message);
      }
    } catch (err) {
      console.error(`[WS] Failed to parse message from ${peerId}:`, err);
      roomManager.send(ws, {
        type: 'error',
        message: 'Invalid JSON message payload',
      });
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Client disconnected: ${peerId}`);
    roomManager.removeClient(peerId);
  });

  ws.on('error', (error) => {
    console.error(`[WS] Error on client ${peerId}:`, error);
  });
});

// 30 saniyede bir ölü bağlantıları temizle
const heartbeatInterval = setInterval(() => {
  for (const client of roomManager.getAllClients()) {
    if (!client.isAlive) {
      console.log(`[Heartbeat] Terminating inactive client ${client.user.id}`);
      client.ws.terminate();
      roomManager.removeClient(client.user.id);
      continue;
    }
    client.isAlive = false;
    client.ws.ping();
  }
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});
