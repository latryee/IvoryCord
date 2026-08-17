import React, { useState } from 'react';
import {
  Copy,
  Check,
  Users,
  Sliders,
  Share2,
  MessageSquare,
} from 'lucide-react';
import { RoomState, AudioLevelData, AudioSettings, AudioDevice, ChatMessage } from '../types/index.js';
import { UserCard } from './UserCard.js';
import { ControlBar } from './ControlBar.js';
import { SettingsModal } from './SettingsModal.js';
import { ChatPanel } from './ChatPanel.js';

interface RoomViewProps {
  roomState: RoomState;
  localAudioLevel: AudioLevelData;
  settings: AudioSettings;
  availableDevices: {
    inputs: AudioDevice[];
    outputs: AudioDevice[];
  };
  messages: ChatMessage[];
  unreadChatCount: number;
  onSendMessage: (text?: string, imageUrl?: string) => void;
  onMarkChatRead: (isOpen: boolean) => void;
  onSaveSettings: (settings: Partial<AudioSettings>) => void;
  onRefreshDevices: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onSetPeerVolume: (peerId: string, volume: number) => void;
  onLeaveRoom: () => void;
}

export const RoomView: React.FC<RoomViewProps> = ({
  roomState,
  localAudioLevel,
  settings,
  availableDevices,
  messages,
  unreadChatCount,
  onSendMessage,
  onMarkChatRead,
  onSaveSettings,
  onRefreshDevices,
  onToggleMute,
  onToggleDeafen,
  onSetPeerVolume,
  onLeaveRoom,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true); // Varsayılan olarak yan sohbet açık
  const [isCopied, setIsCopied] = useState(false);

  const toggleChat = () => {
    const nextState = !isChatOpen;
    setIsChatOpen(nextState);
    onMarkChatRead(nextState);
  };

  const handleCopyRoomId = () => {
    if (!roomState.roomId) return;
    navigator.clipboard.writeText(roomState.roomId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Kendi kullanıcı objemiz
  const selfUser = {
    id: roomState.selfId || 'self',
    username: roomState.username,
    avatarColor: roomState.avatarColor,
    isMuted: roomState.isMuted,
    isDeafened: roomState.isDeafened,
    isSpeaking: roomState.isSpeaking,
    volume: 1.0,
    audioLevel: localAudioLevel.normalizedLevel,
    connectionState: 'connected' as RTCPeerConnectionState,
    joinedAt: Date.now(),
  };

  const totalMembers = 1 + roomState.peers.length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090c10] select-none overflow-hidden">
      {/* 1. Üst Bar */}
      <header className="h-16 px-6 glass-panel border-b border-white/10 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
            <h1 className="font-bold text-gray-100 text-base tracking-wide flex items-center gap-1.5">
              <span className="text-gray-500 font-mono">#</span>
              {roomState.roomId}
            </h1>
          </div>

          {/* Oda Kodunu Kopyala */}
          <button
            onClick={handleCopyRoomId}
            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-xs font-mono flex items-center gap-1.5 border border-white/10 transition-colors"
            title="Oda kodunu panoya kopyala"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-400" />
                <span>Kodu Kopyala</span>
              </>
            )}
          </button>
        </div>

        {/* Sağ Üst İstatistikler & Butonlar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.03] border border-white/5 rounded-full text-xs text-gray-400">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>{totalMembers} Katılımcı</span>
          </div>

          <button
            onClick={toggleChat}
            className={`relative p-2 rounded-xl border border-white/10 transition-colors ${
              isChatOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
            title="Sohbet Paneli"
          >
            <MessageSquare className="w-4 h-4" />
            {unreadChatCount > 0 && !isChatOpen && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-gray-950 font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white border border-white/10 transition-colors"
            title="Ses Ayarları"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Ana Gövde (Ses Izgarası + Yan Sohbet Paneli) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sol Alan: Katılımcı Kartları */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <UserCard peer={selfUser} isSelf={true} />

              {roomState.peers.map((peer) => (
                <UserCard
                  key={peer.id}
                  peer={peer}
                  isSelf={false}
                  onVolumeChange={(vol) => onSetPeerVolume(peer.id, vol)}
                />
              ))}
            </div>

            {/* Odada Tek Başına İse Davet Kartı */}
            {roomState.peers.length === 0 && (
              <div className="mt-8 p-8 rounded-3xl border border-dashed border-white/10 text-center space-y-4 max-w-md mx-auto bg-white/[0.01]">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                  <Share2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-200">
                    Oda Hazır, Arkadaşlar Bekleniyor
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Arkadaşlarının bu odaya katılabilmesi için oda kodunu onlarla paylaş:
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 p-2 bg-[#121824] border border-white/10 rounded-xl">
                  <span className="font-mono text-sm text-emerald-400 font-bold px-2">
                    {roomState.roomId}
                  </span>
                  <button
                    onClick={handleCopyRoomId}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {isCopied ? 'Kopyalandı' : 'Kodu Kopyala'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Sağ Alan: Yan Sohbet Paneli (Collapsible) */}
        {isChatOpen && (
          <ChatPanel
            roomId={roomState.roomId || ''}
            messages={messages}
            selfId={roomState.selfId}
            onSendMessage={onSendMessage}
            onClose={() => {
              setIsChatOpen(false);
              onMarkChatRead(false);
            }}
          />
        )}
      </div>

      {/* 3. Alt Dock Toolbar */}
      <ControlBar
        roomState={roomState}
        localAudioLevel={localAudioLevel}
        vadThreshold={settings.vadThreshold}
        isChatOpen={isChatOpen}
        unreadChatCount={unreadChatCount}
        onToggleChat={toggleChat}
        onToggleMute={onToggleMute}
        onToggleDeafen={onToggleDeafen}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLeaveRoom={onLeaveRoom}
      />

      {/* 4. Ayarlar Modalı */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={onSaveSettings}
        localAudioLevel={localAudioLevel}
        availableDevices={availableDevices}
        onRefreshDevices={onRefreshDevices}
      />
    </div>
  );
};
