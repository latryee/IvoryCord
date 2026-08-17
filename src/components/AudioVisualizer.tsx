import React from 'react';

interface AudioVisualizerProps {
  level: number; // 0 - 100
  decibels?: number; // dBFS (-100 to 0)
  threshold?: number; // dBFS (-70 to -10)
  isSpeaking?: boolean;
  showDb?: boolean;
  showThresholdMarker?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  level,
  decibels,
  threshold = -48,
  isSpeaking = false,
  showDb = true,
  showThresholdMarker = false,
  className = '',
  size = 'md',
}) => {
  // Eşik değerini 0-100 arasına normalleştir (-65 dB -> 0, -12 dB -> 100)
  const minDb = -65;
  const maxDb = -12;
  const thresholdPercent = Math.max(
    0,
    Math.min(100, ((threshold - minDb) / (maxDb - minDb)) * 100)
  );

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {/* VU-Meter Arka Plan ve Bar */}
      <div
        className={`relative w-full ${heightClasses[size]} bg-gray-800/80 rounded-full overflow-hidden border border-gray-700/50`}
      >
        {/* Doluluk Çubuğu */}
        <div
          className={`h-full transition-all duration-75 ease-out rounded-full ${
            isSpeaking
              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-green-300 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
              : 'bg-gradient-to-r from-gray-600 to-gray-500 opacity-60'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, level))}%` }}
        />

        {/* VAD Eşik Değeri Çizgisi (Kullanıcının ayarladığı nokta) */}
        {showThresholdMarker && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10 shadow-[0_0_4px_rgba(251,191,36,0.8)]"
            style={{ left: `${thresholdPercent}%` }}
            title={`VAD Eşiği: ${threshold} dB`}
          >
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
          </div>
        )}
      </div>

      {/* dB ve Durum Bilgisi */}
      {showDb && (
        <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 px-0.5">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'
              }`}
            />
            {isSpeaking ? (
              <span className="text-emerald-400 font-medium">Konuşuyor</span>
            ) : (
              <span>Sessiz</span>
            )}
          </span>

          {decibels !== undefined && (
            <span className="text-gray-400">{decibels > -90 ? `${decibels} dB` : '-∞ dB'}</span>
          )}
        </div>
      )}
    </div>
  );
};
