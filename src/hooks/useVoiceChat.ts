import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AudioSettings,
  AudioLevelData,
  PeerInfo,
  RoomState,
  AudioDevice,
  ChatMessage,
} from '../types/index.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { SignalingClient } from '../audio/SignalingClient.js';
import { WebRTCManager } from '../audio/WebRTCManager.js';
import {
  playJoinSound,
  playLeaveSound,
  playMessageSound,
  playMuteSound,
} from '../audio/soundEffects.js';

const SETTINGS_STORAGE_KEY = 'ivorycord_audio_settings';
const DEFAULT_SETTINGS: AudioSettings = {
  inputDeviceId: 'default',
  outputDeviceId: 'default',
  vadThreshold: -48, // dB
  vadHoldTime: 300, // ms
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  highBitrateOpus: true,
};

export function useVoiceChat() {
  // 1. Ayarları Yükle
  const [settings, setSettings] = useState<AudioSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // 2. Oda & Bağlantı Durumu
  const [roomState, setRoomState] = useState<RoomState>({
    status: 'disconnected',
    roomId: null,
    selfId: null,
    username: localStorage.getItem('ivorycord_username') || `Player_${Math.floor(1000 + Math.random() * 9000)}`,
    avatarColor: '#10b981',
    isMuted: false,
    isDeafened: false,
    isSpeaking: false,
    peers: [],
    errorMessage: null,
    serverUrl: 'ws://localhost:4000',
  });

  // 3. Oda Sohbet Mesajları
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const isChatOpenRef = useRef<boolean>(false);

  // 4. Canlı Ses Seviyeleri (60fps VU-Meter)
  const [localAudioLevel, setLocalAudioLevel] = useState<AudioLevelData>({
    decibels: -100,
    normalizedLevel: 0,
    isSpeaking: false,
  });

  const [availableDevices, setAvailableDevices] = useState<{
    inputs: AudioDevice[];
    outputs: AudioDevice[];
  }>({ inputs: [], outputs: [] });

  // Core Motor Örnekleri
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const signalingClientRef = useRef<SignalingClient | null>(null);
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);

  // Ayarları localStorage'a kaydet
  const saveSettings = useCallback((newSettings: Partial<AudioSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      if (audioEngineRef.current) {
        audioEngineRef.current.updateSettings(newSettings);
      }
      return updated;
    });
  }, []);

  // Cihazları Listele
  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs: AudioDevice[] = [];
      const outputs: AudioDevice[] = [];

      devices.forEach((d) => {
        if (d.kind === 'audioinput') {
          inputs.push({ deviceId: d.deviceId, label: d.label || `Mikrofon (${d.deviceId.slice(0, 5)})`, kind: 'audioinput' });
        } else if (d.kind === 'audiooutput') {
          outputs.push({ deviceId: d.deviceId, label: d.label || `Hoparlör (${d.deviceId.slice(0, 5)})`, kind: 'audiooutput' });
        }
      });

      setAvailableDevices({ inputs, outputs });
    } catch (e) {
      console.warn('[useVoiceChat] Cihazlar listelenemedi:', e);
    }
  }, []);

  // 5. Odaya Katılma Fonksiyonu
  const joinRoom = useCallback(
    async (roomId: string, username: string, serverUrl?: string) => {
      setRoomState((prev) => ({
        ...prev,
        status: 'connecting',
        roomId,
        username,
        errorMessage: null,
      }));
      setMessages([]);
      setUnreadChatCount(0);
      localStorage.setItem('ivorycord_username', username);

      try {
        // A. Ses Motorunu Başlat
        const audioEngine = new AudioEngine(settings);
        audioEngineRef.current = audioEngine;

        audioEngine.setOnLevelChange((data) => {
          setLocalAudioLevel(data);
        });

        audioEngine.setOnSpeakingChange((speaking) => {
          setRoomState((prev) => ({ ...prev, isSpeaking: speaking }));
          if (signalingClientRef.current) {
            signalingClientRef.current.updateUserState({ isSpeaking: speaking });
          }
        });

        const localStream = await audioEngine.initialize();
        const audioCtx = audioEngine.getAudioContext();

        // B. Sinyalleşme İstemcisini Başlat
        const targetServerUrl = serverUrl || roomState.serverUrl;
        const signalingClient = new SignalingClient(targetServerUrl);
        signalingClientRef.current = signalingClient;

        // C. WebRTC Yöneticisini Başlat
        const webrtcManager = new WebRTCManager(signalingClient);
        webrtcManagerRef.current = webrtcManager;

        if (audioCtx) {
          webrtcManager.setAudioContext(audioCtx);
        }
        webrtcManager.setLocalStream(localStream);

        // Uzak peer ses seviyeleri dinleyicisi
        webrtcManager.setOnPeerAudioLevel((peerId, level, isSpeaking) => {
          setRoomState((prev) => ({
            ...prev,
            peers: prev.peers.map((p) =>
              p.id === peerId ? { ...p, audioLevel: level, isSpeaking } : p
            ),
          }));
        });

        // Sinyalleşme Event'leri
        signalingClient.on('room-joined', async ({ roomId: joinedRoomId, selfId, peers, chatHistory }) => {
          console.log(`[useVoiceChat] Odaya girildi: ${joinedRoomId}, selfId: ${selfId}`);
          playJoinSound();

          if (chatHistory && chatHistory.length > 0) {
            setMessages(chatHistory);
          }

          const initialPeers: PeerInfo[] = peers.map((p) => ({
            id: p.id,
            username: p.username,
            avatarColor: p.avatarColor,
            isMuted: p.isMuted,
            isDeafened: p.isDeafened,
            isSpeaking: p.isSpeaking,
            volume: 1.0,
            audioLevel: 0,
            connectionState: 'new',
            joinedAt: p.joinedAt,
          }));

          setRoomState((prev) => ({
            ...prev,
            status: 'connected',
            roomId: joinedRoomId,
            selfId,
            peers: initialPeers,
          }));

          // Odadaki mevcut herkese doğru WebRTC Offer başlat
          for (const peer of peers) {
            await webrtcManager.createPeerConnection(peer.id, true);
          }
        });

        signalingClient.on('user-joined', (user) => {
          console.log('[useVoiceChat] Yeni kullanıcı katıldı:', user);
          playJoinSound();

          setRoomState((prev) => {
            if (prev.peers.some((p) => p.id === user.id)) return prev;
            return {
              ...prev,
              peers: [
                ...prev.peers,
                {
                  id: user.id,
                  username: user.username,
                  avatarColor: user.avatarColor,
                  isMuted: user.isMuted,
                  isDeafened: user.isDeafened,
                  isSpeaking: user.isSpeaking,
                  volume: 1.0,
                  audioLevel: 0,
                  connectionState: 'connecting',
                  joinedAt: user.joinedAt,
                },
              ],
            };
          });
        });

        signalingClient.on('user-left', ({ userId }) => {
          console.log('[useVoiceChat] Kullanıcı ayrıldı:', userId);
          playLeaveSound();

          setRoomState((prev) => ({
            ...prev,
            peers: prev.peers.filter((p) => p.id !== userId),
          }));
        });

        signalingClient.on('user-state-update', ({ userId, isMuted, isDeafened, isSpeaking }) => {
          setRoomState((prev) => ({
            ...prev,
            peers: prev.peers.map((p) => {
              if (p.id === userId) {
                return {
                  ...p,
                  ...(isMuted !== undefined ? { isMuted } : {}),
                  ...(isDeafened !== undefined ? { isDeafened } : {}),
                  ...(isSpeaking !== undefined ? { isSpeaking } : {}),
                };
              }
              return p;
            }),
          }));
        });

        // Sohbet Mesajı Geldiğinde
        signalingClient.on('chat-message', (msg) => {
          setMessages((prev) => [...prev, msg]);
          playMessageSound();
          if (!isChatOpenRef.current) {
            setUnreadChatCount((prev) => prev + 1);
          }
        });

        signalingClient.on('error', (err) => {
          setRoomState((prev) => ({
            ...prev,
            status: 'error',
            errorMessage: err,
          }));
        });

        // WebSocket sunucusuna bağlan ve odaya katıl
        await signalingClient.connect();
        signalingClient.joinRoom(roomId, username);

        await refreshDevices();
      } catch (err: any) {
        console.error('[useVoiceChat] Odaya katılma hatası:', err);
        setRoomState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: err?.message || 'Mikrofona veya sunucuya erişilemedi',
        }));
        leaveRoom();
      }
    },
    [roomState.serverUrl, settings, refreshDevices]
  );

  // 6. Odadan Ayrılma & Temizlik
  const leaveRoom = useCallback(() => {
    playLeaveSound();

    if (signalingClientRef.current) {
      signalingClientRef.current.disconnect();
      signalingClientRef.current = null;
    }

    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.cleanup();
      webrtcManagerRef.current = null;
    }

    if (audioEngineRef.current) {
      audioEngineRef.current.cleanup();
      audioEngineRef.current = null;
    }

    setRoomState((prev) => ({
      ...prev,
      status: 'disconnected',
      roomId: null,
      selfId: null,
      isSpeaking: false,
      peers: [],
    }));

    setMessages([]);
    setUnreadChatCount(0);

    setLocalAudioLevel({
      decibels: -100,
      normalizedLevel: 0,
      isSpeaking: false,
    });
  }, []);

  // 7. Mesaj / Görsel Gönder
  const sendChatMessage = useCallback(
    (text?: string, imageUrl?: string) => {
      if (!signalingClientRef.current || !roomState.roomId) return;
      if (!text?.trim() && !imageUrl) return;
      signalingClientRef.current.sendChatMessage(roomState.roomId, text?.trim(), imageUrl);
    },
    [roomState.roomId]
  );

  // 8. Sohbet Okundu İşareti
  const markChatRead = useCallback((isOpen: boolean) => {
    isChatOpenRef.current = isOpen;
    if (isOpen) {
      setUnreadChatCount(0);
    }
  }, []);

  // 9. Mikrofon Sustur / Aç
  const toggleMute = useCallback(() => {
    if (!audioEngineRef.current) return;
    const nextMuted = !roomState.isMuted;
    audioEngineRef.current.setMuted(nextMuted);
    playMuteSound(nextMuted);

    setRoomState((prev) => ({ ...prev, isMuted: nextMuted }));
    if (signalingClientRef.current) {
      signalingClientRef.current.updateUserState({ isMuted: nextMuted });
    }
  }, [roomState.isMuted]);

  // 10. Sağırlaş (Deafen) / Aç
  const toggleDeafen = useCallback(() => {
    const nextDeafened = !roomState.isDeafened;
    
    if (audioEngineRef.current) {
      audioEngineRef.current.setDeafened(nextDeafened);
    }
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.setDeafened(nextDeafened);
    }

    setRoomState((prev) => ({
      ...prev,
      isDeafened: nextDeafened,
      isMuted: nextDeafened ? true : prev.isMuted,
    }));

    if (signalingClientRef.current) {
      signalingClientRef.current.updateUserState({
        isDeafened: nextDeafened,
        isMuted: nextDeafened ? true : roomState.isMuted,
      });
    }
  }, [roomState.isDeafened, roomState.isMuted]);

  // 11. Bireysel Uzak Kullanıcı Sesini Değiştir
  const setPeerVolume = useCallback((peerId: string, volume: number) => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.setPeerVolume(peerId, volume);
    }
    setRoomState((prev) => ({
      ...prev,
      peers: prev.peers.map((p) => (p.id === peerId ? { ...p, volume } : p)),
    }));
  }, []);

  useEffect(() => {
    refreshDevices();
    return () => {
      leaveRoom();
    };
  }, []);

  return {
    roomState,
    settings,
    saveSettings,
    localAudioLevel,
    availableDevices,
    refreshDevices,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleDeafen,
    setPeerVolume,
    messages,
    unreadChatCount,
    sendChatMessage,
    markChatRead,
  };
}
