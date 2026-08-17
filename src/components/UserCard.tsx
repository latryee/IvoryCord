import React, { useState } from 'react';
import { Mic, MicOff, Headphones, Volume2, VolumeX, Radio } from 'lucide-react';
import { PeerInfo } from '../types/index.js';
import { AudioVisualizer } from './AudioVisualizer.js';

interface UserCardProps {
  peer: PeerInfo;
  isSelf?: boolean;
  onVolumeChange?: (volume: number) => void;
}

export const UserCard: React.FC<UserCardProps> = ({
  peer,
  isSelf = false,
  onVolumeChange,
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const getInitials = (name: string) => {
    return name ? name.substring(0, 2).toUpperCase() : '??';
  };

  const volumePercent = Math.round(peer.volume * 100);

  return (
    <div
      className={`relative group flex flex-col p-4 rounded-2xl transition-all duration-300 glass-panel ${
        peer.isSpeaking
          ? 'border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.25)] bg-emerald-950/20'
          : 'border-white/5 hover:border-white/10 hover:bg-white/[0.03]'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Avatar ve Konuşma Halkası */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-md transition-all duration-200 ${
              peer.isSpeaking ? 'speaking-active scale-105' : ''
            }`}
            style={{
              backgroundColor: peer.avatarColor || '#3b82f6',
              border: peer.isSpeaking ? '2.5px solid #10b981' : '2px solid rgba(255,255,255,0.1)',
            }}
          >
            {getInitials(peer.username)}
          </div>

          {/* Konuşuyor Rozeti */}
          {peer.isSpeaking && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#0b0e14]" />
            </span>
          )}

          {/* Susturuldu / Sağır Rozeti */}
          {(peer.isMuted || peer.isDeafened) && (
            <div className="absolute -bottom-1 -right-1 bg-red-500/90 text-white p-1 rounded-full border-2 border-[#0b0e14]">
              {peer.isDeafened ? (
                <Headphones className="w-3 h-3" />
              ) : (
                <MicOff className="w-3 h-3" />
              )}
            </div>
          )}
        </div>

        {/* Kullanıcı Bilgisi & Ses Barı */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm text-gray-100 truncate flex items-center gap-1.5">
              {peer.username}
              {isSelf && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                  Sen
                </span>
              )}
            </h3>

            {/* Durum İkonu */}
            <div className="flex items-center gap-1 text-gray-400">
              {peer.isSpeaking ? (
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              ) : peer.isMuted ? (
                <MicOff className="w-4 h-4 text-red-400" />
              ) : (
                <Mic className="w-4 h-4 text-gray-500 opacity-50" />
              )}
            </div>
          </div>

          {/* Canlı Mikrofon Seviye Çubuğu */}
          <div className="mt-2">
            <AudioVisualizer
              level={peer.audioLevel}
              isSpeaking={peer.isSpeaking}
              showDb={false}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Bireysel Ses Ayar Kontrolü (Sadece diğer kullanıcılar için) */}
      {!isSelf && onVolumeChange && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between gap-3 text-xs text-gray-400">
          <button
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            className="flex items-center gap-1.5 hover:text-gray-200 transition-colors"
          >
            {peer.volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-gray-400" />
            )}
            <span className="font-mono">{volumePercent}%</span>
          </button>

          {/* Hızlı %100 Butonu */}
          {peer.volume !== 1.0 && (
            <button
              onClick={() => onVolumeChange(1.0)}
              className="text-[10px] text-emerald-400 hover:underline"
            >
              Sıfırla
            </button>
          )}

          {/* Ses Slider'ı */}
          <div className="flex-1 max-w-[140px] flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={peer.volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-700 accent-emerald-500 rounded-lg cursor-pointer"
              title={`Kullanıcı Sesi: %${volumePercent}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
