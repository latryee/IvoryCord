import { WebSocket } from 'ws';

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

export interface PublicRoomInfo {
  id: string;
  name: string;
  memberCount: number;
  isPermanent: boolean;
}

export interface ClientConnection {
  ws: WebSocket;
  user: UserMetadata;
  roomId: string | null;
  isAlive: boolean;
}

export type SignalMessage =
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
