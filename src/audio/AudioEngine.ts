import { AudioSettings, AudioLevelData } from '../types/index.js';

export type AudioLevelCallback = (data: AudioLevelData) => void;
export type SpeakingChangeCallback = (isSpeaking: boolean) => void;

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private rawMediaStream: MediaStream | null = null; // Sürekli açık kalan VAD analiz akışı
  private transmissionStream: MediaStream | null = null; // WebRTC'ye giden dinamik açılıp kapanan akış
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private animationFrameId: number | null = null;

  // Ayarlar
  private settings: AudioSettings = {
    inputDeviceId: 'default',
    outputDeviceId: 'default',
    vadThreshold: -48, // dB cinsinden eşik (Geniş mikrofon uyumluluğu için -48 dB)
    vadHoldTime: 300, // ms cinsinden bekleme süresi
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    highBitrateOpus: true,
  };

  // VAD ve Susturma Durumları
  private isSpeaking = false;
  private lastSpeakingTime = 0;
  private isManuallyMuted = false;
  private isDeafened = false;

  // Callbacks
  private onLevelChange: AudioLevelCallback | null = null;
  private onSpeakingChange: SpeakingChangeCallback | null = null;

  constructor(settings?: Partial<AudioSettings>) {
    if (settings) {
      this.settings = { ...this.settings, ...settings };
    }
  }

  /**
   * Mikrofon Başlatma & VAD Ayrık İletim Grafiği Kurulumu
   */
  public async initialize(): Promise<MediaStream> {
    this.cleanup();

    // 1. AudioContext Oluştur ve Başlat
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioCtx({
      sampleRate: 48000,
      latencyHint: 'interactive',
    });

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // 2. Esnek ve Donanım Uyumlu Mikrofon Kısıtlamaları
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: this.settings.echoCancellation,
      noiseSuppression: this.settings.noiseSuppression,
      autoGainControl: this.settings.autoGainControl,
      sampleRate: { ideal: 48000 },
      channelCount: { ideal: 1 },
    };

    if (this.settings.inputDeviceId && this.settings.inputDeviceId !== 'default') {
      audioConstraints.deviceId = { ideal: this.settings.inputDeviceId };
    }

    try {
      // Mikrofon akışını al
      this.rawMediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });

      // WebRTC için iletim akışını klonla
      this.transmissionStream = this.rawMediaStream.clone();
      
      // Başlangıçta iletim akışını kapat (VAD konuşma tespit edene kadar)
      this.setTransmissionEnabled(false);

      // Web Audio API Düğümleri (Ham akışa bağlanır, bu sayede VAD asla kesilmez!)
      this.sourceNode = this.audioContext.createMediaStreamSource(this.rawMediaStream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 512;
      this.analyserNode.smoothingTimeConstant = 0.15;

      this.sourceNode.connect(this.analyserNode);

      // VAD analiz döngüsünü başlat
      this.startVADLoop();

      console.log('[AudioEngine] Mikrofon ve VAD motoru başarıyla başlatıldı.');
      return this.transmissionStream;
    } catch (error) {
      console.warn('[AudioEngine] İdeal ayarlarla başlatılamadı, temel ayarlara geçiliyor:', error);
      
      // Fallback: En temel ayarlarla tekrar dene
      this.rawMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.transmissionStream = this.rawMediaStream.clone();
      this.setTransmissionEnabled(false);

      if (this.audioContext) {
        this.sourceNode = this.audioContext.createMediaStreamSource(this.rawMediaStream);
        this.analyserNode = this.audioContext.createAnalyser();
        this.sourceNode.connect(this.analyserNode);
        this.startVADLoop();
      }

      return this.transmissionStream;
    }
  }

  /**
   * Gerçek Zamanlı RMS & dBFS VAD Döngüsü
   */
  private startVADLoop(): void {
    if (!this.analyserNode) return;

    const bufferLength = this.analyserNode.fftSize;
    const dataArray = new Float32Array(bufferLength);

    const checkAudioLevel = () => {
      if (!this.analyserNode) return;

      // AudioContext askıdaysa uyandır
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      this.analyserNode.getFloatTimeDomainData(dataArray);

      // 1. RMS Hesaplama
      let sumOfSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i];
        sumOfSquares += val * val;
      }
      const rms = Math.sqrt(sumOfSquares / bufferLength);

      // 2. Desibel (dBFS) Dönüşümü
      let decibels = -100;
      if (rms > 0.00001) {
        decibels = 20 * Math.log10(rms);
      }
      decibels = Math.max(-100, Math.min(0, decibels));

      // 3. Normalleştirilmiş Görsel VU Değeri (0 - 100)
      // -65 dB (sessiz ortam) ile -12 dB (yüksek ses) aralığı
      const minDb = -65;
      const maxDb = -12;
      const normalizedLevel = Math.max(0, Math.min(100, ((decibels - minDb) / (maxDb - minDb)) * 100));

      const now = performance.now();

      // 4. VAD Karar Mekanizması
      if (this.isManuallyMuted || this.isDeafened) {
        this.updateSpeakingState(false);
      } else {
        if (decibels >= this.settings.vadThreshold) {
          this.lastSpeakingTime = now;
          this.updateSpeakingState(true);
        } else {
          // Hangover süresi (kelime sonları için gecikmeli kapatma)
          if (this.isSpeaking && now - this.lastSpeakingTime > this.settings.vadHoldTime) {
            this.updateSpeakingState(false);
          }
        }
      }

      // UI ve VU-Meter callback'ini tetikle
      if (this.onLevelChange) {
        this.onLevelChange({
          decibels: Math.round(decibels),
          normalizedLevel: Math.round(normalizedLevel),
          isSpeaking: this.isSpeaking,
        });
      }

      this.animationFrameId = requestAnimationFrame(checkAudioLevel);
    };

    this.animationFrameId = requestAnimationFrame(checkAudioLevel);
  }

  /**
   * Konuşma durumu değiştiğinde iletim kanalını aç/kapa
   */
  private updateSpeakingState(speaking: boolean): void {
    if (this.isSpeaking !== speaking) {
      this.isSpeaking = speaking;

      if (!this.isManuallyMuted && !this.isDeafened) {
        this.setTransmissionEnabled(speaking);
      }

      if (this.onSpeakingChange) {
        this.onSpeakingChange(speaking);
      }
    }
  }

  private setTransmissionEnabled(enabled: boolean): void {
    if (this.transmissionStream) {
      const track = this.transmissionStream.getAudioTracks()[0];
      if (track && track.enabled !== enabled) {
        track.enabled = enabled;
      }
    }
  }

  public setMuted(muted: boolean): boolean {
    this.isManuallyMuted = muted;
    if (muted) {
      this.setTransmissionEnabled(false);
      this.updateSpeakingState(false);
    }
    return this.isManuallyMuted;
  }

  public setDeafened(deafened: boolean): boolean {
    this.isDeafened = deafened;
    if (deafened) {
      this.setMuted(true);
    }
    return this.isDeafened;
  }

  public updateSettings(newSettings: Partial<AudioSettings>): void {
    const oldInputDevice = this.settings.inputDeviceId;
    this.settings = { ...this.settings, ...newSettings };

    if (newSettings.inputDeviceId !== undefined && newSettings.inputDeviceId !== oldInputDevice) {
      this.initialize().catch(console.error);
    }
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public getMediaStream(): MediaStream | null {
    return this.transmissionStream;
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getIsMuted(): boolean {
    return this.isManuallyMuted;
  }

  public getIsDeafened(): boolean {
    return this.isDeafened;
  }

  public setOnLevelChange(cb: AudioLevelCallback | null): void {
    this.onLevelChange = cb;
  }

  public setOnSpeakingChange(cb: SpeakingChangeCallback | null): void {
    this.onSpeakingChange = cb;
  }

  public cleanup(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.rawMediaStream) {
      this.rawMediaStream.getTracks().forEach((track) => track.stop());
      this.rawMediaStream = null;
    }

    if (this.transmissionStream) {
      this.transmissionStream.getTracks().forEach((track) => track.stop());
      this.transmissionStream = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }

    this.isSpeaking = false;
  }
}
