import React from 'react';
import { Mic, MicOff, Headphones, Settings, PhoneOff, Zap, MessageSquare } from 'lucide-react';
import { AudioLevelData, RoomState } from '../types/index.js';
import { AudioVisualizer } from './AudioVisualizer.js';

interface ControlBarProps {
  roomState: RoomState;
  localAudioLevel: AudioLevelData;
  vadThreshold: number;
  isChatOpen: boolean;
  unreadChatCount: number;
  onToggleChat: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onOpenSettings: () => void;
  onLeaveRoom: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  roomState,
  localAudioLevel,
  vadThreshold,
  isChatOpen,
  unreadChatCount,
  onToggleChat,
  onToggleMute,
  onToggleDeafen,
  onOpenSettings,
  onLeaveRoom,
}) => {
  return (
    <footer className="w-full h-20 px-6 glass-panel border-t border-white/10 flex items-center justify-between z-30">
      {/* 1. Sol: Kullanıcı Profili & Canlı Mini VU-Meter */}
      <div className="flex items-center gap-4 min-w-[240px]">
        <div className="relative">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-md transition-all ${
              roomState.isSpeaking ? 'speaking-active' : ''
            }`}
            style={{
              backgroundColor: roomState.avatarColor || '#10b981',
              border: roomState.isSpeaking ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {roomState.username.substring(0, 2).toUpperCase()}
          </div>

          {roomState.isSpeaking && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-[#0b0e14]" />
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-100">{roomState.username}</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
              <Zap className="w-2.5 h-2.5" /> 48kHz Opus
            </span>
          </div>

          {/* Canlı Mikrofon VU Barı */}
          <div className="w-36 mt-1">
            <AudioVisualizer
              level={localAudioLevel.normalizedLevel}
              decibels={localAudioLevel.decibels}
              threshold={vadThreshold}
              isSpeaking={roomState.isSpeaking}
              showDb={false}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* 2. Orta: Bağlantı Durumu Özeti */}
      <div className="hidden md:flex items-center gap-3 text-xs text-gray-400 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          WebRTC Mesh (P2P Direct)
        </span>
        <span className="text-gray-600">|</span>
        <span>Eşik: {vadThreshold} dB</span>
        <span className="text-gray-600">|</span>
        <span>{roomState.peers.length + 1} Katılımcı</span>
      </div>

      {/* 3. Sağ: Kontrol Butonları */}
      <div className="flex items-center gap-2.5">
        {/* Sohbet Paneli Aç / Kapat */}
        <button
          onClick={onToggleChat}
          title={isChatOpen ? 'Sohbeti Kapat' : 'Sohbeti Aç'}
          className={`relative p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
            isChatOpen
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              : 'bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          {unreadChatCount > 0 && !isChatOpen && (
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-gray-950 font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-lg">
              {unreadChatCount > 9 ? '9+' : unreadChatCount}
            </span>
          )}
        </button>

        {/* Mikrofon Sustur/Aç */}
        <button
          onClick={onToggleMute}
          title={roomState.isMuted ? 'Mikrofonu Aç (M)' : 'Mikrofonu Sustur (M)'}
          className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
            roomState.isMuted
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
              : 'bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          {roomState.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Sağırlaş/Aç */}
        <button
          onClick={onToggleDeafen}
          title={roomState.isDeafened ? 'Kulaklığı Aç (D)' : 'Sağırlaş (D)'}
          className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
            roomState.isDeafened
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
              : 'bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Headphones className="w-5 h-5" />
        </button>

        {/* Ses Ayarları */}
        <button
          onClick={onOpenSettings}
          title="Ses ve VAD Ayarları"
          className="p-3 rounded-xl bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-200"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Odadan Ayrıl */}
        <button
          onClick={onLeaveRoom}
          title="Odadan Ayrıl"
          className="px-4 py-3 rounded-xl bg-rose-600/90 text-white font-medium flex items-center gap-2 hover:bg-rose-500 transition-all duration-200 shadow-lg shadow-rose-600/20 ml-2"
        >
          <PhoneOff className="w-5 h-5" />
          <span className="text-sm font-semibold hidden sm:inline">Ayrıl</span>
        </button>
      </div>
    </footer>
  );
};
