import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, X, Hash, Image as ImageIcon, XCircle, ZoomIn } from 'lucide-react';
import { ChatMessage } from '../types/index.js';

interface ChatPanelProps {
  roomId: string;
  messages: ChatMessage[];
  selfId: string | null;
  onSendMessage: (text?: string, imageUrl?: string) => void;
  onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  roomId,
  messages,
  selfId,
  onSendMessage,
  onClose,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedImage]);

  // Görseli sıkıştırıp Base64 Data URL'ye dönüştür
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setSelectedImage(compressedDataUrl);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Pano (Ctrl+V) ile Görsel / Ekran Görüntüsü Yakalama
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processImageFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    onSendMessage(inputText.trim() || undefined, selectedImage || undefined);
    setInputText('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    return name ? name.substring(0, 2).toUpperCase() : '??';
  };

  return (
    <div className="w-80 md:w-96 flex flex-col h-full bg-[#0d121c] border-l border-white/10 glass-panel shadow-2xl transition-all duration-300 z-20">
      {/* 1. Üst Başlık */}
      <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between bg-[#090d14]/70">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-100 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-gray-500" />
              {roomId} Sohbet
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">Metin & Görsel Paylaşımı</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          title="Sohbeti Gizle"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Mesaj Listesi */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500 space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-gray-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-gray-400">
              Henüz mesaj yok
            </p>
            <p className="text-[11px] text-gray-500 max-w-[200px]">
              Odadaki arkadaşlarına mesaj yaz veya ekran görüntüsü (Ctrl+V) yapıştır!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderId === selfId;
            return (
              <div
                key={msg.id}
                className={`flex gap-3 group animate-in fade-in duration-150 ${
                  isSelf ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white shadow-sm border border-white/10"
                  style={{ backgroundColor: msg.senderAvatarColor || '#3b82f6' }}
                >
                  {getInitials(msg.senderName)}
                </div>

                {/* Mesaj İçeriği */}
                <div className={`flex flex-col max-w-[78%] ${isSelf ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-1 px-0.5">
                    <span className="text-[11px] font-semibold text-gray-300">
                      {msg.senderName}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>

                  {/* Görsel Varsa Göster */}
                  {msg.imageUrl && (
                    <div className="relative group/img mb-1 rounded-2xl overflow-hidden border border-white/10 shadow-lg cursor-pointer">
                      <img
                        src={msg.imageUrl}
                        alt="Paylaşılan görsel"
                        onClick={() => setPreviewModalImage(msg.imageUrl || null)}
                        className="max-h-56 max-w-full object-cover hover:opacity-90 transition-opacity rounded-2xl"
                      />
                      <div
                        onClick={() => setPreviewModalImage(msg.imageUrl || null)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white text-xs gap-1 font-medium"
                      >
                        <ZoomIn className="w-4 h-4" /> Büyüt
                      </div>
                    </div>
                  )}

                  {/* Metin Varsa Göster */}
                  {msg.text && (
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words ${
                        isSelf
                          ? 'bg-emerald-600/90 text-white rounded-tr-none shadow-md shadow-emerald-950/40'
                          : 'bg-[#182030] text-gray-200 border border-white/5 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Gönderilmek Üzere Seçilen Görsel Önizlemesi */}
      {selectedImage && (
        <div className="px-4 py-2 bg-[#141b28] border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={selectedImage}
              alt="Seçilen görsel"
              className="w-12 h-12 object-cover rounded-lg border border-emerald-500/40"
            />
            <span className="text-[11px] text-emerald-400 font-medium">
              Görsel eklendi (Göndermeye hazır)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="text-gray-400 hover:text-red-400 transition-colors"
            title="Görseli Kaldır"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 4. Mesaj ve Görsel Giriş Barı */}
      <div className="p-3 border-t border-white/10 bg-[#090d14]/80">
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          {/* Gizli Dosya Seçici */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* Görsel Yükle Butonu */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/10 transition-colors"
            title="Görsel veya Ekran Görüntüsü Yükle"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {/* Metin Girişi (Ctrl+V Pano Desteğiyle) */}
          <input
            ref={inputRef}
            type="text"
            maxLength={500}
            value={inputText}
            onPaste={handlePaste}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`#${roomId} kanalına mesaj veya görsel (Ctrl+V)...`}
            className="w-full bg-[#141b28] border border-white/10 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
          />

          {/* Gönder Butonu */}
          <button
            type="submit"
            disabled={!inputText.trim() && !selectedImage}
            className="absolute right-1.5 p-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 text-gray-950 rounded-lg transition-all shadow-md"
            title="Gönder"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* 5. Tam Ekran Görsel Önizleme Modalı (Lightbox) */}
      {previewModalImage && (
        <div
          onClick={() => setPreviewModalImage(null)}
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={previewModalImage}
              alt="Büyük görsel"
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl border border-white/10 object-contain"
            />
            <button
              onClick={() => setPreviewModalImage(null)}
              className="absolute -top-3 -right-3 p-2 bg-gray-900 border border-white/20 text-white rounded-full hover:bg-gray-800 transition-colors shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
