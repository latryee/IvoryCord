import { SignalingClient } from './SignalingClient.js';
import { optimizeOpusSDP } from './sdpUtils.js';

interface PeerConnectionData {
  peerId: string;
  pc: RTCPeerConnection;
  stream?: MediaStream;
  sourceNode?: MediaStreamAudioSourceNode;
  gainNode?: GainNode;
  analyserNode?: AnalyserNode;
  audioElement?: HTMLAudioElement;
  pendingCandidates: RTCIceCandidateInit[];
  isOfferInitiator: boolean;
  volume: number; // 0.0 - 2.0
}

export type PeerAudioLevelCallback = (peerId: string, level: number, isSpeaking: boolean) => void;
export type PeerStateChangeCallback = (peerId: string, state: RTCPeerConnectionState) => void;

export class WebRTCManager {
  private signalingClient: SignalingClient;
  private audioContext: AudioContext | null = null;
  private localStream: MediaStream | null = null;
  private peers: Map<string, PeerConnectionData> = new Map();
  private rtcConfig: RTCConfiguration;
  private peerAnalysisLoopId: number | null = null;

  // Callbacks
  private onPeerAudioLevel: PeerAudioLevelCallback | null = null;
  private onPeerStateChange: PeerStateChangeCallback | null = null;

  // Global Deafen State
  private isDeafened = false;

  constructor(
    signalingClient: SignalingClient,
    rtcConfig: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 10,
    }
  ) {
    this.signalingClient = signalingClient;
    this.rtcConfig = rtcConfig;
    this.setupSignalingListeners();
  }

  public setAudioContext(audioCtx: AudioContext): void {
    this.audioContext = audioCtx;
  }

  public setLocalStream(stream: MediaStream): void {
    this.localStream = stream;

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      for (const [peerId, peerData] of this.peers.entries()) {
        const senders = peerData.pc.getSenders();
        const audioSender = senders.find((s) => s.track?.kind === 'audio');

        if (audioSender) {
          audioSender.replaceTrack(audioTrack).catch(console.error);
        } else {
          peerData.pc.addTrack(audioTrack, stream);
          this.initiateOffer(peerId).catch(console.error);
        }
      }
    }
  }

  private setupSignalingListeners(): void {
    this.signalingClient.on('signal-offer', async ({ senderPeerId, sdp }) => {
      await this.handleOffer(senderPeerId, sdp);
    });

    this.signalingClient.on('signal-answer', async ({ senderPeerId, sdp }) => {
      await this.handleAnswer(senderPeerId, sdp);
    });

    this.signalingClient.on('signal-ice', async ({ senderPeerId, candidate }) => {
      await this.handleIceCandidate(senderPeerId, candidate);
    });

    this.signalingClient.on('user-left', ({ userId }) => {
      this.closePeer(userId);
    });
  }

  /**
   * Yeni bir peer için RTCPeerConnection oluştur
   */
  public async createPeerConnection(peerId: string, isInitiator: boolean): Promise<RTCPeerConnection> {
    if (this.peers.has(peerId)) {
      this.closePeer(peerId);
    }

    const pc = new RTCPeerConnection(this.rtcConfig);

    const peerData: PeerConnectionData = {
      peerId,
      pc,
      pendingCandidates: [],
      isOfferInitiator: isInitiator,
      volume: 1.0,
    };

    this.peers.set(peerId, peerData);

    // 1. Yerel ses kanalını ekle
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        pc.addTrack(audioTrack, this.localStream);
      }
    }

    // 2. ICE Adaylarını Yönet
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingClient.sendIceCandidate(peerId, event.candidate.toJSON());
      }
    };

    // 3. Bağlantı Durumu Değişiklikleri
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${peerId} connection state: ${pc.connectionState}`);
      if (this.onPeerStateChange) {
        this.onPeerStateChange(peerId, pc.connectionState);
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeer(peerId);
      }
    };

    // 4. Uzak Ses Akışını Yakala
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote audio track from peer: ${peerId}`);
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      peerData.stream = remoteStream;
      this.setupPeerAudioGraph(peerData, remoteStream);
    };

    if (isInitiator) {
      await this.initiateOffer(peerId);
    }

    this.ensurePeerAnalysisLoop();

    return pc;
  }

  /**
   * Web Audio API & HTMLAudioElement Fallback Yönlendirmesi
   */
  private setupPeerAudioGraph(peerData: PeerConnectionData, stream: MediaStream): void {
    // 1. HTMLAudioElement ile doğrudan hoparlör garantisi
    try {
      if (!peerData.audioElement) {
        const audio = new Audio();
        audio.autoplay = true;
        audio.srcObject = stream;
        audio.volume = this.isDeafened ? 0 : Math.min(1.0, peerData.volume);
        peerData.audioElement = audio;
        audio.play().catch(() => {});
      } else {
        peerData.audioElement.srcObject = stream;
      }
    } catch (e) {
      console.warn('[WebRTC] HTMLAudioElement başlatılamadı:', e);
    }

    // 2. Web Audio API Grafiği (GainNode & AnalyserNode)
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 48000 });
    }

    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      if (peerData.sourceNode) peerData.sourceNode.disconnect();
      if (peerData.gainNode) peerData.gainNode.disconnect();
      if (peerData.analyserNode) peerData.analyserNode.disconnect();

      const source = this.audioContext.createMediaStreamSource(stream);
      const gain = this.audioContext.createGain();
      const analyser = this.audioContext.createAnalyser();

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.2;

      gain.gain.value = this.isDeafened ? 0 : peerData.volume;

      source.connect(gain);
      gain.connect(analyser);

      peerData.sourceNode = source;
      peerData.gainNode = gain;
      peerData.analyserNode = analyser;
    } catch (e) {
      console.error(`[WebRTC] Audio graph setup failed for ${peerData.peerId}:`, e);
    }
  }

  private async initiateOffer(peerId: string): Promise<void> {
    const peerData = this.peers.get(peerId);
    if (!peerData) return;

    try {
      const offer = await peerData.pc.createOffer({
        offerToReceiveAudio: true,
      });

      const modifiedSdp = optimizeOpusSDP(offer.sdp || '', { bitrate: 128000, stereo: true });
      const modifiedOffer = new RTCSessionDescription({ type: 'offer', sdp: modifiedSdp });

      await peerData.pc.setLocalDescription(modifiedOffer);
      this.signalingClient.sendOffer(peerId, modifiedOffer);
    } catch (error) {
      console.error(`[WebRTC] Error creating offer for ${peerId}:`, error);
    }
  }

  private async handleOffer(senderPeerId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    let peerData = this.peers.get(senderPeerId);
    if (!peerData) {
      await this.createPeerConnection(senderPeerId, false);
      peerData = this.peers.get(senderPeerId)!;
    }

    try {
      await peerData.pc.setRemoteDescription(new RTCSessionDescription(sdp));

      while (peerData.pendingCandidates.length > 0) {
        const candidate = peerData.pendingCandidates.shift();
        if (candidate) {
          await peerData.pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }

      const answer = await peerData.pc.createAnswer();
      const modifiedSdp = optimizeOpusSDP(answer.sdp || '', { bitrate: 128000, stereo: true });
      const modifiedAnswer = new RTCSessionDescription({ type: 'answer', sdp: modifiedSdp });

      await peerData.pc.setLocalDescription(modifiedAnswer);
      this.signalingClient.sendAnswer(senderPeerId, modifiedAnswer);
    } catch (error) {
      console.error(`[WebRTC] Error handling offer from ${senderPeerId}:`, error);
    }
  }

  private async handleAnswer(senderPeerId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    const peerData = this.peers.get(senderPeerId);
    if (!peerData) return;

    try {
      await peerData.pc.setRemoteDescription(new RTCSessionDescription(sdp));

      while (peerData.pendingCandidates.length > 0) {
        const candidate = peerData.pendingCandidates.shift();
        if (candidate) {
          await peerData.pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }
    } catch (error) {
      console.error(`[WebRTC] Error handling answer from ${senderPeerId}:`, error);
    }
  }

  private async handleIceCandidate(senderPeerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peerData = this.peers.get(senderPeerId);
    if (!peerData) return;

    try {
      if (peerData.pc.remoteDescription && peerData.pc.remoteDescription.type) {
        await peerData.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        peerData.pendingCandidates.push(candidate);
      }
    } catch (error) {
      console.error(`[WebRTC] Error adding ICE candidate for ${senderPeerId}:`, error);
    }
  }

  public setPeerVolume(peerId: string, volume: number): void {
    const peerData = this.peers.get(peerId);
    if (peerData) {
      peerData.volume = Math.max(0, Math.min(2.0, volume));
      if (peerData.gainNode && !this.isDeafened) {
        peerData.gainNode.gain.setValueAtTime(peerData.volume, this.audioContext?.currentTime || 0);
      }
      if (peerData.audioElement && !this.isDeafened) {
        peerData.audioElement.volume = Math.min(1.0, peerData.volume);
      }
    }
  }

  public setDeafened(deafened: boolean): void {
    this.isDeafened = deafened;
    for (const peerData of this.peers.values()) {
      if (peerData.gainNode) {
        const targetGain = deafened ? 0 : peerData.volume;
        peerData.gainNode.gain.setValueAtTime(targetGain, this.audioContext?.currentTime || 0);
      }
      if (peerData.audioElement) {
        peerData.audioElement.volume = deafened ? 0 : Math.min(1.0, peerData.volume);
      }
    }
  }

  private ensurePeerAnalysisLoop(): void {
    if (this.peerAnalysisLoopId !== null) return;

    const dataArray = new Float32Array(256);

    const loop = () => {
      for (const [peerId, peerData] of this.peers.entries()) {
        if (peerData.analyserNode && this.onPeerAudioLevel) {
          peerData.analyserNode.getFloatTimeDomainData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const level = Math.min(100, Math.max(0, Math.round(rms * 400)));
          const isSpeaking = level > 5;

          this.onPeerAudioLevel(peerId, level, isSpeaking);
        }
      }

      this.peerAnalysisLoopId = requestAnimationFrame(loop);
    };

    this.peerAnalysisLoopId = requestAnimationFrame(loop);
  }

  public setOnPeerAudioLevel(cb: PeerAudioLevelCallback | null): void {
    this.onPeerAudioLevel = cb;
  }

  public setOnPeerStateChange(cb: PeerStateChangeCallback | null): void {
    this.onPeerStateChange = cb;
  }

  public closePeer(peerId: string): void {
    const peerData = this.peers.get(peerId);
    if (peerData) {
      if (peerData.sourceNode) peerData.sourceNode.disconnect();
      if (peerData.gainNode) peerData.gainNode.disconnect();
      if (peerData.analyserNode) peerData.analyserNode.disconnect();
      if (peerData.audioElement) {
        peerData.audioElement.pause();
        peerData.audioElement.srcObject = null;
        peerData.audioElement.remove();
      }

      peerData.pc.close();
      this.peers.delete(peerId);
      console.log(`[WebRTC] Closed and cleaned up peer: ${peerId}`);
    }
  }

  public cleanup(): void {
    if (this.peerAnalysisLoopId !== null) {
      cancelAnimationFrame(this.peerAnalysisLoopId);
      this.peerAnalysisLoopId = null;
    }

    for (const peerId of Array.from(this.peers.keys())) {
      this.closePeer(peerId);
    }
    this.peers.clear();
  }
}
