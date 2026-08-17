import React, { useState } from 'react';
import {
  X,
  Sliders,
  Mic,
  Volume2,
  Activity,
  ShieldCheck,
  Zap,
  RotateCw,
} from 'lucide-react';
import { AudioSettings, AudioLevelData, AudioDevice } from '../types/index.js';
import { AudioVisualizer } from './AudioVisualizer.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AudioSettings;
  onSaveSettings: (settings: Partial<AudioSettings>) => void;
  localAudioLevel: AudioLevelData;
  availableDevices: {
    inputs: AudioDevice[];
    outputs: AudioDevice[];
  };
  onRefreshDevices: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  localAudioLevel,
  availableDevices,
  onRefreshDevices,
}) => {
  const [activeTab, setActiveTab] = useState<'vad' | 'devices' | 'advanced'>('vad');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0e131d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-100">Ses ve VAD Ayarları</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Menüsü */}
        <div className="flex border-b border-white/10 px-6 gap-6 bg-[#090d14]">
          <button
            onClick={() => setActiveTab('vad')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'vad'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Ses Aktivite Algılama (VAD)
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'devices'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Mic className="w-4 h-4" />
            Giriş / Çıkış Cihazları
          </button>

          <button
            onClick={() => setActiveTab('advanced')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'advanced'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Gelişmiş & Filtreler
          </button>
        </div>

        {/* Modal Gövdesi */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-gray-300 text-sm">
          {/* TAB 1: VAD ve Mikrofon Kalibrasyonu */}
          {activeTab === 'vad' && (
            <div className="space-y-6">
              {/* Canlı Mikrofon Kalibrasyon Barı */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-200 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-emerald-400" />
                    Canlı Mikrofon Kalibrasyon Testi
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    Sarı Çizgi = Ses Eşiği ({settings.vadThreshold} dB)
                  </span>
                </div>

                <AudioVisualizer
                  level={localAudioLevel.normalizedLevel}
                  decibels={localAudioLevel.decibels}
                  threshold={settings.vadThreshold}
                  isSpeaking={localAudioLevel.isSpeaking}
                  showThresholdMarker={true}
                  showDb={true}
                  size="lg"
                />

                <p className="text-xs text-gray-400">
                  Normal konuşurken barın sarı çizginin sağına (yeşile) geçtiğinden,
                  arka plan gürültüsünde ise sarı çizginin solunda kaldığından emin olun.
                </p>
              </div>

              {/* VAD Eşik Değeri Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-medium text-gray-200">
                    Ses Eşik Seviyesi (Sensitivity Threshold)
                  </label>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {settings.vadThreshold} dB
                  </span>
                </div>
                <input
                  type="range"
                  min="-65"
                  max="-15"
                  step="1"
                  value={settings.vadThreshold}
                  onChange={(e) =>
                    onSaveSettings({ vadThreshold: parseInt(e.target.value) })
                  }
                  className="w-full h-2 bg-gray-800 rounded-lg cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[11px] text-gray-500 font-mono">
                  <span>-65 dB (Çok Hassas)</span>
                  <span>-40 dB (Önerilen)</span>
                  <span>-15 dB (Sadece Yüksek Ses)</span>
                </div>
              </div>

              {/* Hold Time / Hangover Time Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-medium text-gray-200">
                    Gecikmeli Kapanma Süresi (Hold / Hangover Time)
                  </label>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {settings.vadHoldTime} ms
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="25"
                  value={settings.vadHoldTime}
                  onChange={(e) =>
                    onSaveSettings({ vadHoldTime: parseInt(e.target.value) })
                  }
                  className="w-full h-2 bg-gray-800 rounded-lg cursor-pointer accent-emerald-500"
                />
                <p className="text-xs text-gray-400">
                  Konuşmayı bıraktıktan sonra mikrofonun açık kalacağı süre. Kelime sonlarının veya fısıltıların kesilmesini engeller.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Cihaz Seçimleri */}
          {activeTab === 'devices' && (
            <div className="space-y-5">
              <div className="flex justify-end">
                <button
                  onClick={onRefreshDevices}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Cihaz Listesini Yenile
                </button>
              </div>

              {/* Giriş Cihazı (Mikrofon) */}
              <div className="space-y-2">
                <label className="font-medium text-gray-200 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-emerald-400" />
                  Giriş Aygıtı (Mikrofon)
                </label>
                <select
                  value={settings.inputDeviceId}
                  onChange={(e) => onSaveSettings({ inputDeviceId: e.target.value })}
                  className="w-full bg-[#151c28] border border-white/10 rounded-xl px-4 py-2.5 text-gray-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="default">Varsayılan Sistem Mikrofonu</option>
                  {availableDevices.inputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Mikrofon (${d.deviceId.slice(0, 8)})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Çıkış Cihazı (Hoparlör/Kulaklık) */}
              <div className="space-y-2">
                <label className="font-medium text-gray-200 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  Çıkış Aygıtı (Kulaklık / Hoparlör)
                </label>
                <select
                  value={settings.outputDeviceId}
                  onChange={(e) => onSaveSettings({ outputDeviceId: e.target.value })}
                  className="w-full bg-[#151c28] border border-white/10 rounded-xl px-4 py-2.5 text-gray-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="default">Varsayılan Sistem Hoparlörü</option>
                  {availableDevices.outputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Hoparlör (${d.deviceId.slice(0, 8)})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: Gelişmiş Ses Filtreleri */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              {/* Eko Engelleme (Echo Cancellation) */}
              <label className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors">
                <div>
                  <div className="font-semibold text-gray-200">Eko Engelleme (AEC)</div>
                  <div className="text-xs text-gray-400">
                    Hoparlörden çıkan sesin mikrofona yankı yapmasını önler.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.echoCancellation}
                  onChange={(e) => onSaveSettings({ echoCancellation: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </label>

              {/* Gürültü Filtreleme (Noise Suppression) */}
              <label className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors">
                <div>
                  <div className="font-semibold text-gray-200">Gürültü Bastırma (Noise Suppression)</div>
                  <div className="text-xs text-gray-400">
                    Klavye tuş sesleri ve fan uğultularını filtreler.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.noiseSuppression}
                  onChange={(e) => onSaveSettings({ noiseSuppression: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </label>

              {/* Otomatik Kazanç Kontrolü (Auto Gain Control) */}
              <label className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors">
                <div>
                  <div className="font-semibold text-gray-200">Otomatik Kazanç (Auto Gain Control)</div>
                  <div className="text-xs text-gray-400">
                    Sesinizi standart bir seviyede dengeler.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoGainControl}
                  onChange={(e) => onSaveSettings({ autoGainControl: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </label>

              {/* Opus 128kbps Modu */}
              <label className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors">
                <div>
                  <div className="font-semibold text-gray-200 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    Ultra HD Opus Codec (48kHz / 128kbps)
                  </div>
                  <div className="text-xs text-gray-400">
                    Kristal netliğinde stüdyo kalitesinde ses aktarımı.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.highBitrateOpus}
                  onChange={(e) => onSaveSettings({ highBitrateOpus: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#090d14] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-sm rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
          >
            Kaydet & Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
