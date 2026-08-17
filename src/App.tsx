import { useState, useEffect } from 'react';
import { useVoiceChat } from './hooks/useVoiceChat.js';
import { LobbyView } from './components/LobbyView.js';
import { RoomView } from './components/RoomView.js';
import { SettingsModal } from './components/SettingsModal.js';

export function App() {
  const {
    roomState,
    settings,
    saveSettings,
    localAudioLevel,
    availableDevices,
    publicRooms,
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
  } = useVoiceChat();

  const [isLobbySettingsOpen, setIsLobbySettingsOpen] = useState(false);

  // Klavye Kısayolları (M / Mute, D / Deafen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key.toLowerCase() === 'm' && !e.repeat) {
        e.preventDefault();
        toggleMute();
      } else if (e.key.toLowerCase() === 'd' && !e.repeat) {
        e.preventDefault();
        toggleDeafen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMute, toggleDeafen]);

  const isInRoom = roomState.status === 'connected' || (roomState.status === 'connecting' && roomState.roomId !== null);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#090c10] text-gray-100 overflow-hidden">
      {!isInRoom ? (
        <>
          <LobbyView
            onJoin={joinRoom}
            isConnecting={roomState.status === 'connecting'}
            errorMessage={roomState.errorMessage}
            settings={settings}
            publicRooms={publicRooms}
            onOpenSettings={() => setIsLobbySettingsOpen(true)}
          />
          <SettingsModal
            isOpen={isLobbySettingsOpen}
            onClose={() => setIsLobbySettingsOpen(false)}
            settings={settings}
            onSaveSettings={saveSettings}
            localAudioLevel={localAudioLevel}
            availableDevices={availableDevices}
            onRefreshDevices={refreshDevices}
          />
        </>
      ) : (
        <RoomView
          roomState={roomState}
          localAudioLevel={localAudioLevel}
          settings={settings}
          availableDevices={availableDevices}
          messages={messages}
          unreadChatCount={unreadChatCount}
          onSendMessage={sendChatMessage}
          onMarkChatRead={markChatRead}
          onSaveSettings={saveSettings}
          onRefreshDevices={refreshDevices}
          onToggleMute={toggleMute}
          onToggleDeafen={toggleDeafen}
          onSetPeerVolume={setPeerVolume}
          onLeaveRoom={leaveRoom}
        />
      )}
    </div>
  );
}

export default App;
