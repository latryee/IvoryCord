import { SignalingMessage, UserMetadata, ChatMessage } from '../types/index.js';

export type SignalingEventMap = {
  'connected': () => void;
  'disconnected': () => void;
  'error': (err: string) => void;
  'room-joined': (data: { roomId: string; selfId: string; peers: UserMetadata[]; chatHistory?: ChatMessage[] }) => void;
  'user-joined': (user: UserMetadata) => void;
  'user-left': (data: { userId: string; username: string }) => void;
  'signal-offer': (data: { senderPeerId: string; sdp: RTCSessionDescriptionInit }) => void;
  'signal-answer': (data: { senderPeerId: string; sdp: RTCSessionDescriptionInit }) => void;
  'signal-ice': (data: { senderPeerId: string; candidate: RTCIceCandidateInit }) => void;
  'user-state-update': (data: { userId: string; isMuted?: boolean; isDeafened?: boolean; isSpeaking?: boolean }) => void;
  'chat-message': (msg: ChatMessage) => void;
};

export class SignalingClient {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private listeners: Map<keyof SignalingEventMap, Set<Function>> = new Map();
  private reconnectTimer: number | null = null;
  private isExplicitlyClosed = false;

  constructor(serverUrl = 'wss://ivorycord-production.up.railway.app') {
    this.serverUrl = serverUrl;
  }

  public connect(): Promise<void> {
    this.isExplicitlyClosed = false;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log(`[SignalingClient] Connected to ${this.serverUrl}`);
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const msg: SignalingMessage = JSON.parse(event.data);
            this.handleMessage(msg);
          } catch (e) {
            console.error('[SignalingClient] Failed to parse message:', e);
          }
        };

        this.ws.onerror = (err) => {
          console.error('[SignalingClient] WebSocket error:', err);
          this.emit('error', 'Signaling server connection error');
          reject(err);
        };

        this.ws.onclose = () => {
          console.log('[SignalingClient] Disconnected');
          this.emit('disconnected');
          if (!this.isExplicitlyClosed) {
            this.scheduleReconnect();
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private handleMessage(message: SignalingMessage): void {
    switch (message.type) {
      case 'room-joined':
        this.emit('room-joined', {
          roomId: message.roomId,
          selfId: message.selfId,
          peers: message.peers as UserMetadata[],
          chatHistory: message.chatHistory,
        });
        break;

      case 'user-joined':
        this.emit('user-joined', message.user as UserMetadata);
        break;

      case 'user-left':
        this.emit('user-left', {
          userId: message.userId,
          username: message.username,
        });
        break;

      case 'signal-offer':
        this.emit('signal-offer', {
          senderPeerId: message.senderPeerId,
          sdp: message.sdp,
        });
        break;

      case 'signal-answer':
        this.emit('signal-answer', {
          senderPeerId: message.senderPeerId,
          sdp: message.sdp,
        });
        break;

      case 'signal-ice':
        this.emit('signal-ice', {
          senderPeerId: message.senderPeerId,
          candidate: message.candidate,
        });
        break;

      case 'user-state-update':
        this.emit('user-state-update', {
          userId: message.userId,
          isMuted: message.isMuted,
          isDeafened: message.isDeafened,
          isSpeaking: message.isSpeaking,
        });
        break;

      case 'chat-message':
        this.emit('chat-message', message.message);
        break;

      case 'error':
        this.emit('error', message.message);
        break;
    }
  }

  public joinRoom(roomId: string, username: string, avatarColor?: string): void {
    this.send({
      type: 'join-room',
      roomId,
      username,
      avatarColor,
    });
  }

  public sendChatMessage(roomId: string, text?: string, imageUrl?: string): void {
    this.send({
      type: 'send-chat',
      roomId,
      text,
      imageUrl,
    });
  }

  public sendOffer(targetPeerId: string, sdp: RTCSessionDescriptionInit): void {
    this.send({
      type: 'signal-offer',
      targetPeerId,
      senderPeerId: '',
      sdp,
    });
  }

  public sendAnswer(targetPeerId: string, sdp: RTCSessionDescriptionInit): void {
    this.send({
      type: 'signal-answer',
      targetPeerId,
      senderPeerId: '',
      sdp,
    });
  }

  public sendIceCandidate(targetPeerId: string, candidate: RTCIceCandidateInit): void {
    this.send({
      type: 'signal-ice',
      targetPeerId,
      senderPeerId: '',
      candidate,
    });
  }

  public updateUserState(state: { isMuted?: boolean; isDeafened?: boolean; isSpeaking?: boolean }): void {
    this.send({
      type: 'user-state-update',
      userId: '',
      ...state,
    });
  }

  private send(msg: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public on<K extends keyof SignalingEventMap>(event: K, fn: SignalingEventMap[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn);
  }

  public off<K extends keyof SignalingEventMap>(event: K, fn: SignalingEventMap[K]): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(fn);
    }
  }

  private emit<K extends keyof SignalingEventMap>(event: K, ...args: Parameters<SignalingEventMap[K]>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((fn) => {
        try {
          (fn as any)(...args);
        } catch (e) {
          console.error(`Error in signaling event listener ${event}:`, e);
        }
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      console.log('[SignalingClient] Reconnecting...');
      this.connect().catch(() => {});
    }, 3000);
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public setServerUrl(url: string): void {
    this.serverUrl = url;
  }
}
