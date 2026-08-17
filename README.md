# 🎙️ Ivorycord — Ultra-Low Latency Voice & Chat Application

Ivorycord, oyuncu ve arkadaş grupları için tasarlanmış; modern, düşük kaynak tüketen (ultra-low CPU/RAM), kristal netliğinde bas-konuşsuz sesli ve görsel destekli yazılı sohbet masaüstü uygulamasıdır.

---

## ✨ Özellikler

- **🎧 Stüdyo Kalitesinde Ses**: 48kHz Opus codec ve WebRTC Mesh P2P ses ağı.
- **⚡ Akıllı Dinamik VAD (Voice Activity Detection)**: Bas-konuş tuşuna basmadan, konuşmaya başladığınız anda milisaniyesinde devreye giren RMS/dB tabanlı ses aktivite algılayıcı ve kelime sonu koruma gecikmesi (hangover hold time).
- **🏰 Kalıcı "Ivory Ana Salon"**: 7/24 silinmeyen, tek tıkla girilen merkezi toplanma odası.
- **💬 Gerçek Zamanlı Metin Sohbeti**: Odadaki herkesle anlık mesajlaşma ve son 50 mesaj geçmişi.
- **🖼️ Ekran Görüntüsü & Görsel Paylaşımı**: `Ctrl+V` ile anında pano görseli yapıştırma, görsel sıkıştırma ve tam ekran lightbox önizlemesi.
- **🔔 Discord Tarzı Ses Efektleri**: Odaya katılma, ayrılma, susturma ve mesaj bildirim melodileri.
- **🎚️ Bireysel Ses Seviyesi Ayarı**: Her arkadaşınızın ses seviyesini ayrı ayrı %0 - %200 arasında ayarlayabilme.
- **🛡️ Gürültü Filtreleme**: Donanım tabanlı Echo Cancellation, Noise Suppression ve Auto Gain Control.
- **🎮 Oyun İçi Klavye Kısayolları**: `M` (Mikrofon Sustur), `D` (Sağırlaş).

---

## 🛠️ Kurulum & Geliştirme

### Gereksinimler
- [Node.js](https://nodejs.org/) (v18+)
- npm

### 1. Projeyi Klonlayın
```bash
git clone https://github.com/KULLANICI_ADINIZ/ivorycord.git
cd ivorycord
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
cd server && npm install && cd ..
```

### 3. Geliştirme Modunda Çalıştırma
```bash
# Frontend & Masaüstü Uygulamasını Başlatın
npm run dev
```

### 4. Bağımsız `.exe` Olarak Derleme
```bash
npm run dist
```
Çıktı `release/` klasöründe yer alır.

---

## 🚂 7/24 Railway Bulut Sunucu Kurulumu

1. [railway.app](https://railway.app) adresine gidin.
2. **"New Project"** -> **"Deploy from GitHub repo"** seçeneğiyle bu repoyu seçin.
3. Root Directory olarak `server` klasörünü belirleyin veya otomatik algılanmasını bekleyin.
4. Size vereceği `wss://xxxx.up.railway.app` adresini uygulamada **Özel Sunucu** olarak kullanabilirsiniz!
