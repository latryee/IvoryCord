import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Mic,
  Volume2,
  Activity,
  ShieldCheck,
  RotateCw,
  Keyboard,
  Radio,
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
  const [activeTab, setActiveTab] = useState<'input' | 'devices' | 'advanced'>('input');
  const [isRecordingKey, setIsRecordingKey] = useState(false);

  // Bas-Konuş Tuş Yakalama
  useEffect(() => {
    if (!isRecordingKey) return;

    const handleKeyCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const keyName = e.code || e.key;
      onSaveSettings({ pttKey: keyName });
      setIsRecordingKey(false);
    };

    window.addEventListener('keydown', handleKeyCapture, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyCapture, { capture: true });
  }, [isRecordingKey, onSaveSettings]);

  if (!isOpen) return null;

  const formatKeyName = (key: string) => {
    if (key.startsWith('Key')) return key.replace('Key', '');
    if (key === 'Space') return 'Boşluk (Space)';
    if (key === 'ControlLeft' || key === 'ControlRight') return 'Ctrl';
    if (key === 'AltLeft' || key === 'AltRight') return 'Alt';
    if (key === 'ShiftLeft' || key === 'ShiftRight') return 'Shift';
    return key;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0e131d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#0a0e16]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-100">Ses ve İletişim Ayarları</h2>
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
            onClick={() => setActiveTab('input')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'input'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            Giriş Modu (VAD & Bas-Konuş)
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
            Mikrofon & Hoparlör
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
            Gelişmiş Filtreler
          </button>
        </div>

        {/* Modal Gövdesi */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-gray-300 text-sm">
          {/* TAB 1: GİRİŞ MODU & VAD / BAS-KONUŞ */}
          {activeTab === 'input' && (
            <div className="space-y-6">
              {/* Giriş Modu Seçimi (Radio Cards) */}
              <div className="space-y-2">
                <label className="font-semibold text-gray-200 block text-xs uppercase tracking-wider">
                  Giriş Modu
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Ses Aktivitesi */}
                  <div
                    onClick={() => onSaveSettings({ inputMode: 'vad' })}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      settings.inputMode === 'vad'
                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-100 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        Ses Aktivitesi (VAD)
                      </span>
                      <span className={`w-3 h-3 rounded-full border-2 ${settings.inputMode === 'vad' ? 'border-emerald-400 bg-emerald-400' : 'border-gray-600'}`} />
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Bas-konuş olmadan konuştuğunuz anda otomatik algılar ve iletir.
                    </p>
                  </div>

                  {/* Bas-Konuş */}
                  <div
                    onClick={() => onSaveSettings({ inputMode: 'ptt' })}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      settings.inputMode === 'ptt'
                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-100 flex items-center gap-2">
                        <Keyboard className="w-4 h-4 text-emerald-400" />
                        Bas-Konuş (Push-to-Talk)
                      </span>
                      <span className={`w-3 h-3 rounded-full border-2 ${settings.inputMode === 'ptt' ? 'border-emerald-400 bg-emerald-400' : 'border-gray-600'}`} />
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Sadece belirlediğiniz tuşa basılı tuttuğunuzda sesinizi karşıya iletir.
                    </p>
                  </div>
                </div>
              </div>

              {/* BAS-KONUŞ TUŞ ATAMA ALANI */}
              {settings.inputMode === 'ptt' && (
                <div className="p-4 rounded-xl bg-[#141b28] border border-emerald-500/30 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-100 text-xs uppercase tracking-wider">
                        Bas-Konuş Kısayol Tuşu
                      </h4>
                      <p className="text-xs text-gray-400">
                        Oyun oynarken basılı tutarak konuşacağınız tuş.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsRecordingKey(true)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 border ${
                        isRecordingKey
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500 animate-pulse'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                      }`}
                    >
                      <Keyboard className="w-3.5 h-3.5" />
                      {isRecordingKey ? 'Bir Tuşa Basın...' : `[ ${formatKeyName(settings.pttKey || 'KeyV')} ] Tuş Değiştir`}
                    </button>
                  </div>
                </div>
              )}

              {/* Canlı Mikrofon Kalibrasyon Barı */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-200 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-emerald-400" />
                    Canlı Mikrofon Giriş Testi
                  </span>
                  {settings.inputMode === 'vad' && (
                    <span className="text-xs text-gray-400 font-mono">
                      Sarı Çizgi = Ses Eşiği ({settings.vadThreshold} dB)
                    </span>
                  )}
                </div>

                <AudioVisualizer
                  level={localAudioLevel.normalizedLevel}
                  decibels={localAudioLevel.decibels}
                  threshold={settings.vadThreshold}
                  isSpeaking={localAudioLevel.isSpeaking}
                  showThresholdMarker={settings.inputMode === 'vad'}
                  showDb={true}
                  size="lg"
                />
              </div>

              {/* VAD Eşik Değeri Slider (Yalnızca VAD modunda) */}
              {settings.inputMode === 'vad' && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-medium text-gray-200">
                        Ses Aktivite Eşiği (Sensitivity Threshold)
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
                      <span>-65 dB (Hassas)</span>
                      <span>-48 dB (Önerilen)</span>
                      <span>-15 dB (Yüksek Ses)</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-medium text-gray-200">
                        Kelime Sonu Koruma Süresi (Hold Time)
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
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: CİHAZ SEÇİMİ */}
          {activeTab === 'devices' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Donanım cihazlarınızı buradan seçin.
                </span>
                <button
                  type="button"
                  onClick={onRefreshDevices}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Listeyi Yenile
                </button>
              </div>

              {/* Giriş Cihazı (Mikrofon) */}
              <div className="space-y-2">
                <label className="font-semibold text-gray-200 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-emerald-400" />
                  Giriş Cihazı (Mikrofon)
                </label>
                <select
                  value={settings.inputDeviceId}
                  onChange={(e) => onSaveSettings({ inputDeviceId: e.target.value })}
                  className="w-full bg-[#141b28] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="default">Varsayılan Sistem Mikrofonu</option>
                  {availableDevices.inputs.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Mikrofon (${device.deviceId.slice(0, 8)})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Çıkış Cihazı (Hoparlör / Kulaklık) */}
              <div className="space-y-2">
                <label className="font-semibold text-gray-200 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  Çıkış Cihazı (Hoparlör / Kulaklık)
                </label>
                <select
                  value={settings.outputDeviceId}
                  onChange={(e) => onSaveSettings({ outputDeviceId: e.target.value })}
                  className="w-full bg-[#141b28] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="default">Varsayılan Sistem Hoparlörü</option>
                  {availableDevices.outputs.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Hoparlör (${device.deviceId.slice(0, 8)})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: GELİŞMİŞ FİLTRELER */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <h4 className="font-medium text-gray-200">Yankı Engelleme (Echo Cancellation)</h4>
                  <p className="text-xs text-gray-400">Hoparlörden mikrofona dönen sesleri süzer.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.echoCancellation}
                  onChange={(e) => onSaveSettings({ echoCancellation: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 cursor-pointer rounded"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <h4 className="font-medium text-gray-200">Gürültü Bastırma (Noise Suppression)</h4>
                  <p className="text-xs text-gray-400">Fan, klavye ve arka plan cızırtılarını filtreler.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.noiseSuppression}
                  onChange={(e) => onSaveSettings({ noiseSuppression: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 cursor-pointer rounded"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <h4 className="font-medium text-gray-200">Otomatik Kazanç Kontrolü (Auto Gain)</h4>
                  <p className="text-xs text-gray-400">Kısık sesleri yükseltir, patlamaları dengeler.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoGainControl}
                  onChange={(e) => onSaveSettings({ autoGainControl: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 cursor-pointer rounded"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#090d14] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};
