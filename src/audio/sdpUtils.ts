/**
 * WebRTC SDP Manipülasyon Yardımcısı (Opus 48kHz / Yüksek Kalite Zorlayıcı)
 */
export function optimizeOpusSDP(
  sdp: string,
  options: {
    bitrate?: number; // bps (örn: 128000 = 128 kbps)
    stereo?: boolean;
    useFec?: boolean;
    useDtx?: boolean;
  } = {}
): string {
  const {
    bitrate = 128000,
    stereo = true,
    useFec = true,
    useDtx = true,
  } = options;

  const lines = sdp.split('\r\n');
  let opusPayloadType: string | null = null;

  // 1. Opus Payload tipini bul (a=rtpmap:<payload> opus/48000/2)
  for (const line of lines) {
    if (line.startsWith('a=rtpmap:') && line.toLowerCase().includes('opus/48000')) {
      const match = line.match(/a=rtpmap:(\d+)\s+opus\/48000/i);
      if (match) {
        opusPayloadType = match[1];
        break;
      }
    }
  }

  if (!opusPayloadType) {
    return sdp; // Opus bulunamadıysa orijinal SDP'yi döndür
  }

  const modifiedLines: string[] = [];
  let fmtpFound = false;

  const opusParams = [
    `maxaveragebitrate=${bitrate}`,
    stereo ? 'stereo=1;sprop-stereo=1' : 'stereo=0',
    useFec ? 'useinbandfec=1' : 'useinbandfec=0',
    useDtx ? 'usedtx=1' : 'usedtx=0',
    'cbr=1', // Sabit bitrate ile jitter önleme
  ].join(';');

  for (const line of lines) {
    if (line.startsWith(`a=fmtp:${opusPayloadType}`)) {
      fmtpFound = true;
      // Mevcut fmtp parametrelerini genişlet veya güncelle
      modifiedLines.push(`${line};${opusParams}`);
    } else {
      modifiedLines.push(line);
    }
  }

  // Eğer fmtp satırı yoksa rtpmap'in hemen altına ekle
  if (!fmtpFound) {
    const finalLines: string[] = [];
    for (const line of modifiedLines) {
      finalLines.push(line);
      if (line.startsWith(`a=rtpmap:${opusPayloadType}`)) {
        finalLines.push(`a=fmtp:${opusPayloadType} ${opusParams}`);
      }
    }
    return finalLines.join('\r\n');
  }

  return modifiedLines.join('\r\n');
}
