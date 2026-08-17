import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { ClientConnection, SignalMessage, UserMetadata, ChatMessage } from './types.js';

export class RoomManager {
  private rooms: Map<string, Set<string>> = new Map(); // roomId -> Set<peerId>
  private clients: Map<string, ClientConnection> = new Map(); // peerId -> ClientConnection
  private roomChats: Map<string, ChatMessage[]> = new Map(); // roomId -> ChatMessage[] (Son 50 mesaj)

  // Kalıcı Odalar (Kullanıcı kalmasa dahi asla silinmeyen ana sunucular)
  private permanentRooms: Set<string> = new Set(['ivory', 'Ivory']);

  constructor() {
    // Kalıcı "ivory" ana salonunu başlat
    this.rooms.set('ivory', new Set());
    this.roomChats.set('ivory', []);
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

    // Normalleştir
    const targetRoomId = roomId.toLowerCase() === 'ivory' ? 'ivory' : roomId;

    // Önceki odadan çıkış yap
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

    const roomPeers = this.rooms.get(targetRoomId)!;
    const chatHistory = this.roomChats.get(targetRoomId) || [];

    // Odadaki mevcut kullanıcıların listesini topla
    const existingPeers: UserMetadata[] = [];
    for (const otherPeerId of roomPeers) {
      const otherClient = this.clients.get(otherPeerId);
      if (otherClient) {
        existingPeers.push(otherClient.user);
      }
    }

    // Yeni kullanıcıya mevcut odayı ve mesaj geçmişini bildir
    this.send(client.ws, {
      type: 'room-joined',
      roomId: targetRoomId,
      selfId: peerId,
      peers: existingPeers,
      chatHistory,
    });

    // Odadaki diğer kullanıcılara yeni kullanıcının katıldığını bildir
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
      history.shift(); // En fazla son 50 mesajı hafızada tut
    }

    // Odadaki herkese (gönderen dahil) mesajı ilet
    this.broadcastToRoom(roomId, {
      type: 'chat-message',
      message: chatMsg,
    });

    console.log(`[RoomManager] [Chat in ${roomId}] ${client.user.username}: ${text || '[Görsel Gönderildi]'}`);
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

      // Kalıcı odaları asla silme!
      if (roomPeers.size === 0 && !this.permanentRooms.has(roomId)) {
        this.rooms.delete(roomId);
        this.roomChats.delete(roomId);
        console.log(`[RoomManager] Room '${roomId}' deleted (empty).`);
      }
    }

    console.log(`[RoomManager] User '${client.user.username}' (${peerId}) left room '${roomId}'.`);
    client.roomId = null;
  }

  public removeClient(peerId: string): void {
    this.leaveRoom(peerId);
    this.clients.delete(peerId);
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
    if (!targetClient) {
      return;
    }

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
