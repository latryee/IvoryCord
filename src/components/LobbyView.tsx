import React, { useState, useEffect } from 'react';
import {
  Headphones,
  ArrowRight,
  Sliders,
  Radio,
  Server,
  PlusCircle,
  LogIn,
  Dice5,
  Clipboard,
  Users,
  Clock,
} from 'lucide-react';
import { AudioSettings, AudioLevelData, PublicRoomInfo } from '../types/index.js';
import { AudioVisualizer } from './AudioVisualizer.js';
import { AudioEngine } from '../audio/AudioEngine.js';

interface LobbyViewProps {
  onJoin: (roomId: string, username: string, serverUrl?: string) => void;
  isConnecting: boolean;
  errorMessage: string | null;
  settings: AudioSettings;
  publicRooms: PublicRoomInfo[];
  onOpenSettings: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  onJoin,
  isConnecting,
  errorMessage,
  settings,
  publicRooms,
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [newRoomName, setNewRoomName] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [username, setUsername] = useState(
    localStorage.getItem('ivorycord_username') || `Oyuncu_${Math.floor(100 + Math.random() * 900)}`
  );
  const [serverUrl, setServerUrl] = useState('wss://ivorycord-production.up.railway.app');
  const [showAdvancedServer, setShowAdvancedServer] = useState(false);

  // Lobi için Canlı Mikrofon Önizleme
  const [previewLevel, setPreviewLevel] = useState<AudioLevelData>({
    decibels: -100,
    normalizedLevel: 0,
    isSpeaking: false,
  });

  useEffect(() => {
    let previewEngine: AudioEngine | null = null;

    const startPreview = async () => {
      try {
        previewEngine = new AudioEngine(settings);
        previewEngine.setOnLevelChange((data) => {
          setPreviewLevel(data);
        });
        await previewEngine.initialize();
      } catch (err) {
        console.warn('Lobi mikrofon önizlemesi başlatılamadı:', err);
      }
    };

    startPreview();

    return () => {
      if (previewEngine) {
        previewEngine.cleanup();
      }
    };
  }, [settings]);

  const generateRandomRoomName = () => {
    const prefixes = ['valorant', 'cs2', 'sohbet', 'duo-rank', 'gece-ekibi', 'tayfa', 'party'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(100 + Math.random() * 900);
    setNewRoomName(`${randomPrefix}-${randomNum}`);
  };

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setJoinRoomCode(text.trim());
    } catch {}
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRoom = newRoomName.trim() || `oda-${Math.floor(100 + Math.random() * 900)}`;
    if (!username.trim()) return;
    onJoin(slugify(finalRoom), username.trim(), serverUrl.trim());
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomCode.trim() || !username.trim()) return;
    onJoin(slugify(joinRoomCode.trim()), username.trim(), serverUrl.trim());
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-');
  };

  // Açık odalar filtresi (Ivory Ana Salon zaten üstte sabit olduğu için listede varsa ayırabiliriz)
  const otherRooms = publicRooms.filter((r) => r.id.toLowerCase() !== 'ivory');

  return (
    <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden bg-gradient-to-b from-[#090c10] via-[#0d121c] to-[#090c10]">
      {/* Arka Plan Işık Efektleri */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 left-1/4 w-[400px] h-[250px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-4">
        {/* Logo & Başlık */}
        <div className="text-center space-y-1">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 shadow-lg shadow-emerald-500/10 mb-1">
            <Headphones className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            IVORYCORD <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold border border-emerald-500/30">PRO</span>
          </h1>
          <p className="text-xs text-gray-400">
            Düşük Kaynaklı Oyun & Arkadaş Sesli Sohbeti
          </p>
        </div>

        {/* Ana Kart */}
        <div className="glass-panel p-5 rounded-3xl space-y-4 border border-white/10 shadow-2xl">
          {errorMessage && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              {errorMessage}
            </div>
          )}

          {/* 1. Profil / Kullanıcı Adı */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
              Kullanıcı Adınız
            </label>
            <input
              type="text"
              required
              maxLength={24}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Örn: GhostRider"
              className="w-full bg-[#121824] border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm font-semibold transition-all"
            />
          </div>

          {/* 2. Mikrofon Canlı Test Barı */}
          <div className="p-3 bg-black/25 rounded-xl border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center gap-1.5 font-medium text-[11px]">
                <Radio className={`w-3 h-3 ${previewLevel.isSpeaking ? 'text-emerald-400 animate-pulse' : 'text-gray-500'}`} />
                Mikrofon Testi ({settings.inputMode === 'ptt' ? 'Bas-Konuş Modu' : 'VAD Modu'})
              </span>
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px]"
              >
                <Sliders className="w-3 h-3" /> Ayarlar
              </button>
            </div>
            <AudioVisualizer
              level={previewLevel.normalizedLevel}
              decibels={previewLevel.decibels}
              threshold={settings.vadThreshold}
              isSpeaking={previewLevel.isSpeaking}
              showThresholdMarker={settings.inputMode === 'vad'}
              showDb={true}
              size="sm"
            />
          </div>

          {/* 🌟 3. KALICI SUNUCU: IVORY ANA SALON (1-Click Hızlı Giriş) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-teal-500/15 border border-amber-500/30 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-lg border border-amber-500/40 shadow-inner">
                🏰
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm text-gray-100">
                    Ivory Ana Salon
                  </h3>
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-mono font-bold">
                    7/24 KALICI
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Users className="w-3 h-3 text-amber-400" />
                  {publicRooms.find((r) => r.id === 'ivory')?.memberCount || 0} Çevrimiçi Katılımcı
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isConnecting || !username.trim()}
              onClick={() => onJoin('ivory', username.trim(), serverUrl.trim())}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-gray-950 font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1"
            >
              <span>Gir</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 4. Sekmeler: Özel Oda Oluştur vs Odaya Katıl */}
          <div className="flex p-1 bg-[#121824] rounded-xl border border-white/5 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'create'
                  ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Oda Oluştur
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('join')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'join'
                  ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Odaya Katıl {otherRooms.length > 0 && `(${otherRooms.length})`}
            </button>
          </div>

          {/* SEKME 1: ODA OLUŞTUR */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateRoom} className="space-y-3.5 animate-in fade-in duration-150">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-semibold text-gray-300">
                    Oda Adı Belirleyin
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomRoomName}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <Dice5 className="w-3 h-3" /> Rastgele İsim
                  </button>
                </div>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Örn: Valorant Tayfa, CS2 Klanı"
                  className="w-full bg-[#121824] border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm font-medium transition-all"
                />
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Özel odalar herkes çıktığında 10 dk sonra otomatik kapanır.
              </p>

              <button
                type="submit"
                disabled={isConnecting || !username.trim()}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
              >
                {isConnecting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                    Oda Kuruluyor...
                  </>
                ) : (
                  <>
                    <span>Odayı Oluştur ve Başlat</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* SEKME 2: ODAYA KATIL (Canlı Açık Odalar Tarayıcısı) */}
          {activeTab === 'join' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Açık Odalar Listesi */}
              {otherRooms.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
                    Sunucudaki Açık Odalar ({otherRooms.length})
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {otherRooms.map((room) => (
                      <div
                        key={room.id}
                        className="p-2.5 bg-[#141b28] hover:bg-[#192233] border border-white/5 hover:border-emerald-500/30 rounded-xl flex items-center justify-between transition-all"
                      >
                        <div>
                          <h4 className="font-bold text-xs text-gray-200">
                            #{room.name}
                          </h4>
                          <span className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
                            <Users className="w-2.5 h-2.5 text-emerald-400" />
                            {room.memberCount > 0
                              ? `${room.memberCount} Katılımcı`
                              : 'Boş (10 dk sonra kapanır)'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onJoin(room.id, username.trim(), serverUrl.trim())}
                          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-gray-950 font-bold text-xs rounded-lg transition-colors border border-emerald-500/30"
                        >
                          Katıl
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Kod ile Doğrudan Giriş */}
              <form onSubmit={handleJoinRoom} className="space-y-2 pt-1 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-semibold text-gray-300">
                    Özel Kod ile Giriş Yap
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteCode}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <Clipboard className="w-3 h-3" /> Yapıştır
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value)}
                  placeholder="Örn: squad-101"
                  className="w-full bg-[#121824] border border-white/10 rounded-xl px-3.5 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-xs font-mono transition-all"
                />

                <button
                  type="submit"
                  disabled={isConnecting || !joinRoomCode.trim() || !username.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-gray-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                      Bağlanılıyor...
                    </>
                  ) : (
                    <>
                      <span>Kodu Gir ve Katıl</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Gelişmiş Sunucu Ayarı Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvancedServer(!showAdvancedServer)}
              className="text-[11px] text-gray-400 hover:text-gray-200 flex items-center gap-1.5 transition-colors"
            >
              <Server className="w-3 h-3" />
              {showAdvancedServer ? 'Sunucu Ayarlarını Gizle' : 'Özel Sunucu (Railway / WebSocket IP)'}
            </button>

            {showAdvancedServer && (
              <div className="mt-2 animate-in fade-in duration-150">
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="wss://ivorycord-production.up.railway.app"
                  className="w-full bg-[#121824] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-gray-300 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
