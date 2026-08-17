export interface UserMetadata {
  id: string;
  username: string;
  avatarColor: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  joinedAt: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarColor: string;
  text?: string;
  imageUrl?: string;
  timestamp: number;
}

export type InputMode = 'vad' | 'ptt';

export interface AudioSettings {
  inputMode: InputMode; // 'vad' (Ses Aktivitesi) veya 'ptt' (Bas-Konuş)
  pttKey: string; // Bas-konuş tuşu (örn: 'KeyV', 'Space', 'ControlLeft')
  inputDeviceId: string;
  outputDeviceId: string;
  vadThreshold: number; // dB cinsinden eşik
  vadHoldTime: number; // ms cinsinden bekleme süresi
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  highBitrateOpus: boolean; // 128kbps stereo vs 64kbps mono
}

export interface AudioLevelData {
  decibels: number;
  normalizedLevel: number; // 0 - 100 arası yumuşatılmış değer
  isSpeaking: boolean;
}

export interface PeerInfo {
  id: string;
  username: string;
  avatarColor: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  volume: number; // 0 - 2 (1.0 = %100, 2.0 = %200)
  audioLevel: number; // 0 - 100
  connectionState: RTCPeerConnectionState;
  joinedAt: number;
}

export interface PublicRoomInfo {
  id: string;
  name: string;
  memberCount: number;
  isPermanent: boolean;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface RoomState {
  status: ConnectionStatus;
  roomId: string | null;
  selfId: string | null;
  username: string;
  avatarColor: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  peers: PeerInfo[];
  errorMessage: string | null;
  serverUrl: string;
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export type SignalingMessage =
  | {
      type: 'join-room';
      roomId: string;
      username: string;
      avatarColor?: string;
    }
  | {
      type: 'room-joined';
      roomId: string;
      selfId: string;
      peers: UserMetadata[];
      chatHistory?: ChatMessage[];
    }
  | {
      type: 'user-joined';
      user: UserMetadata;
    }
  | {
      type: 'user-left';
      userId: string;
      username: string;
    }
  | {
      type: 'signal-offer';
      targetPeerId: string;
      senderPeerId: string;
      sdp: RTCSessionDescriptionInit;
    }
  | {
      type: 'signal-answer';
      targetPeerId: string;
      senderPeerId: string;
      sdp: RTCSessionDescriptionInit;
    }
  | {
      type: 'signal-ice';
      targetPeerId: string;
      senderPeerId: string;
      candidate: RTCIceCandidateInit;
    }
  | {
      type: 'user-state-update';
      userId: string;
      isMuted?: boolean;
      isDeafened?: boolean;
      isSpeaking?: boolean;
    }
  | {
      type: 'send-chat';
      roomId: string;
      text?: string;
      imageUrl?: string;
    }
  | {
      type: 'chat-message';
      message: ChatMessage;
    }
  | {
      type: 'get-rooms';
    }
  | {
      type: 'rooms-list';
      rooms: PublicRoomInfo[];
    }
  | {
      type: 'error';
      message: string;
    };
