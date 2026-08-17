import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { ClientConnection, SignalMessage, UserMetadata, ChatMessage, PublicRoomInfo } from './types.js';

const EMPTY_ROOM_TIMEOUT_MS = 10 * 60 * 1000; // 10 Dakika Boş Kalma Süresi

export class RoomManager {
  private rooms: Map<string, Set<string>> = new Map(); // roomId -> Set<peerId>
  private clients: Map<string, ClientConnection> = new Map(); // peerId -> ClientConnection
  private roomChats: Map<string, ChatMessage[]> = new Map(); // roomId -> ChatMessage[]
  private emptySince: Map<string, number> = new Map(); // roomId -> timestamp

  // Kalıcı Odalar (Asla kapanmayan ana salon)
  private permanentRooms: Set<string> = new Set(['ivory', 'Ivory']);

  constructor() {
    // Kalıcı "ivory" ana salonunu başlat
    this.rooms.set('ivory', new Set());
    this.roomChats.set('ivory', []);

    // Her 30 saniyede bir 10 dakikadır boş olan odaları temizle
    setInterval(() => {
      this.cleanupExpiredEmptyRooms();
    }, 30000);
  }

  public registerClient(ws: WebSocket, id: string): ClientConnection {
    const connection: ClientConnection = {
      ws,
      user: {
        id,
        username: 'Anonymous',
        avatarColor: this.getRandomColor(),
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        joinedAt: Date.now(),
      },
      roomId: null,
      isAlive: true,
    };
    this.clients.set(id, connection);
    return connection;
  }

  public getClient(peerId: string): ClientConnection | undefined {
    return this.clients.get(peerId);
  }

  public joinRoom(peerId: string, roomId: string, username: string, avatarColor?: string): void {
    const client = this.clients.get(peerId);
    if (!client) return;

    const targetRoomId = roomId.toLowerCase() === 'ivory' ? 'ivory' : roomId;

    if (client.roomId) {
      this.leaveRoom(peerId);
    }

    client.roomId = targetRoomId;
    client.user.username = username || `User_${peerId.substring(0, 4)}`;
    if (avatarColor) client.user.avatarColor = avatarColor;

    if (!this.rooms.has(targetRoomId)) {
      this.rooms.set(targetRoomId, new Set());
      this.roomChats.set(targetRoomId, []);
    }

    // Odaya biri girdiği için boşluk sayacını kaldır
    this.emptySince.delete(targetRoomId);

    const roomPeers = this.rooms.get(targetRoomId)!;
    const chatHistory = this.roomChats.get(targetRoomId) || [];

    const existingPeers: UserMetadata[] = [];
    for (const otherPeerId of roomPeers) {
      const otherClient = this.clients.get(otherPeerId);
      if (otherClient) {
        existingPeers.push(otherClient.user);
      }
    }

    this.send(client.ws, {
      type: 'room-joined',
      roomId: targetRoomId,
      selfId: peerId,
      peers: existingPeers,
      chatHistory,
    });

    this.broadcastToRoom(
      targetRoomId,
      {
        type: 'user-joined',
        user: client.user,
      },
      peerId
    );

    roomPeers.add(peerId);
    console.log(`[RoomManager] User '${client.user.username}' (${peerId}) joined room '${targetRoomId}'. Room size: ${roomPeers.size}`);

    this.broadcastRoomsList();
  }

  public handleChatMessage(peerId: string, roomId: string, text?: string, imageUrl?: string): void {
    const client = this.clients.get(peerId);
    if (!client || !client.roomId || client.roomId !== roomId) return;
    if (!text?.trim() && !imageUrl) return;

    const chatMsg: ChatMessage = {
      id: randomUUID(),
      senderId: peerId,
      senderName: client.user.username,
      senderAvatarColor: client.user.avatarColor,
      text: text?.trim() || undefined,
      imageUrl: imageUrl || undefined,
      timestamp: Date.now(),
    };

    if (!this.roomChats.has(roomId)) {
      this.roomChats.set(roomId, []);
    }

    const history = this.roomChats.get(roomId)!;
    history.push(chatMsg);
    if (history.length > 50) {
      history.shift();
    }

    this.broadcastToRoom(roomId, {
      type: 'chat-message',
      message: chatMsg,
    });
  }

  public leaveRoom(peerId: string): void {
    const client = this.clients.get(peerId);
    if (!client || !client.roomId) return;

    const roomId = client.roomId;
    const roomPeers = this.rooms.get(roomId);

    if (roomPeers) {
      roomPeers.delete(peerId);
      this.broadcastToRoom(roomId, {
        type: 'user-left',
        userId: peerId,
        username: client.user.username,
      });

      // Eğer odada kimse kalmadıysa ve kalıcı oda değilse 10 dakikalık silme sayacını başlat
      if (roomPeers.size === 0 && !this.permanentRooms.has(roomId)) {
        this.emptySince.set(roomId, Date.now());
        console.log(`[RoomManager] Room '${roomId}' is now empty. Scheduled deletion in 10 minutes if no one joins.`);
      }
    }

    console.log(`[RoomManager] User '${client.user.username}' (${peerId}) left room '${roomId}'.`);
    client.roomId = null;
    this.broadcastRoomsList();
  }

  public removeClient(peerId: string): void {
    this.leaveRoom(peerId);
    this.clients.delete(peerId);
  }

  /**
   * 10 dakikadır tamamen boş olan geçici odaları sil
   */
  private cleanupExpiredEmptyRooms(): void {
    const now = Date.now();
    let changed = false;

    for (const [roomId, timestamp] of this.emptySince.entries()) {
      if (now - timestamp >= EMPTY_ROOM_TIMEOUT_MS) {
        if (!this.permanentRooms.has(roomId)) {
          this.rooms.delete(roomId);
          this.roomChats.delete(roomId);
          this.emptySince.delete(roomId);
          changed = true;
          console.log(`[RoomManager] Room '${roomId}' deleted after 10 minutes of inactivity.`);
        }
      }
    }

    if (changed) {
      this.broadcastRoomsList();
    }
  }

  public getPublicRooms(): PublicRoomInfo[] {
    const list: PublicRoomInfo[] = [];

    // 1. Önce Ivory Ana Salon
    const ivoryPeers = this.rooms.get('ivory');
    list.push({
      id: 'ivory',
      name: 'Ivory Ana Salon',
      memberCount: ivoryPeers ? ivoryPeers.size : 0,
      isPermanent: true,
    });

    // 2. Diğer aktif odalar
    for (const [roomId, peers] of this.rooms.entries()) {
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

  public broadcastRoomsList(): void {
    const rooms = this.getPublicRooms();
    const message: SignalMessage = {
      type: 'rooms-list',
      rooms,
    };

    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        this.send(client.ws, message);
      }
    }
  }

  public updateUserState(
    peerId: string,
    updates: { isMuted?: boolean; isDeafened?: boolean; isSpeaking?: boolean }
  ): void {
    const client = this.clients.get(peerId);
    if (!client || !client.roomId) return;

    if (updates.isMuted !== undefined) client.user.isMuted = updates.isMuted;
    if (updates.isDeafened !== undefined) client.user.isDeafened = updates.isDeafened;
    if (updates.isSpeaking !== undefined) client.user.isSpeaking = updates.isSpeaking;

    this.broadcastToRoom(client.roomId, {
      type: 'user-state-update',
      userId: peerId,
      ...updates,
    });
  }

  public relaySignal(
    targetPeerId: string,
    senderPeerId: string,
    message: SignalMessage
  ): void {
    const targetClient = this.clients.get(targetPeerId);
    if (!targetClient) return;
    this.send(targetClient.ws, message);
  }

  public broadcastToRoom(roomId: string, message: SignalMessage, excludePeerId?: string): void {
    const roomPeers = this.rooms.get(roomId);
    if (!roomPeers) return;

    for (const peerId of roomPeers) {
      if (peerId === excludePeerId) continue;
      const client = this.clients.get(peerId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        this.send(client.ws, message);
      }
    }
  }

  public send(ws: WebSocket, message: SignalMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public getAllClients(): IterableIterator<ClientConnection> {
    return this.clients.values();
  }

  private getRandomColor(): string {
    const colors = [
      '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', 
      '#f59e0b', '#06b6d4', '#14b8a6', '#f43f5e'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
