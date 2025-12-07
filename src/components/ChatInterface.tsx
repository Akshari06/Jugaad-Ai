
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Image as ImageIcon, Loader2, Camera, User, StopCircle, ArrowRight } from 'lucide-react';
import { Message, InventoryItem } from '../types';
import { processUserMessage } from '../services/geminiService';
import { t } from '../utils/i18n';

interface ChatInterfaceProps {
  onAiAction: (action: string, data: any) => void;
  inventory: InventoryItem[];
  userLanguage: string;
  initialMessage?: string;
}

// Helper to find supported mime type
const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return 'audio/webm';
    const types = [
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
        'audio/wav',
        'audio/aac'
    ];
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return 'audio/webm'; // Fallback
};

// Helper: Compress Image to reduce lag (Highly Optimized for Speed)
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Use createObjectURL for better performance than FileReader
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = objectUrl;
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl); // Clean up memory immediately
      const canvas = document.createElement('canvas');
      // Reduced to 400px for ultra-fast processing and low latency API calls
      // This resolution is sufficient for text recognition on receipts/ledgers
      const MAX_SIZE = 400; 
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Compress to JPEG with 0.3 quality (very fast upload, readable text)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.3);
      resolve(dataUrl);
    };
    img.onerror = (err) => {
        URL.revokeObjectURL(objectUrl);
        reject(err);
    };
  });
};

const AudioRecorder: React.FC<{ onStop: (blob: Blob) => void, isRecording: boolean }> = ({ onStop, isRecording }) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeTypeRef = useRef<string>(getSupportedMimeType());

  useEffect(() => {
    if (isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mimeTypeRef.current = getSupportedMimeType();
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: mimeTypeRef.current });
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.start();
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        onStop(blob);
      };
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  return null;
};

export default function ChatInterface({ onAiAction, userLanguage, initialMessage, inventory }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
        setMessages([{
            id: 'welcome',
            sender: 'ai',
            type: 'text',
            content: initialMessage || 'Namaste! Main hoon Jugaad-AI. Bataiye aaj kya madad karu?',
            timestamp: new Date()
        }]);
    }
  }, [initialMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      type: 'text',
      content: inputText,
      timestamp: new Date()
    };
    addMessage(userMsg);
    setInputText('');
    
    await processWithGemini(inputText, null, null);
  };

  const handleAudioStop = async (audioBlob: Blob) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      type: 'audio',
      content: t('voiceNoteSent', userLanguage),
      timestamp: new Date()
    };
    addMessage(userMsg);

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const result = reader.result as string;
      const base64Audio = result.split(',')[1];
      await processWithGemini(null, base64Audio, null, audioBlob.type);
    };
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowCameraMenu(false);
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Immediate UI update to show processing
    const tempId = Date.now().toString();
    addMessage({
      id: tempId,
      sender: 'user',
      type: 'text',
      content: '📸 Processing image...',
      timestamp: new Date()
    });
    
    // 2. Clear input so same file can be selected again if needed
    e.target.value = '';

    // 3. Defer processing to next tick to allow UI to render "Processing..."
    setTimeout(async () => {
        try {
            const compressedDataUrl = await compressImage(file);
            
            // Update message with the compressed image
            setMessages(prev => prev.map(m => m.id === tempId ? {
                ...m,
                type: 'image',
                content: 'Image Upload',
                mediaData: compressedDataUrl,
            } : m));

            const base64Image = compressedDataUrl.split(',')[1];
            await processWithGemini(null, null, base64Image);
        } catch (err) {
            console.error("Image error", err);
            setMessages(prev => prev.map(m => m.id === tempId ? {
                ...m,
                content: 'Error processing image.'
            } : m));
        }
    }, 50);
  };

  const processWithGemini = async (text: string | null, audio: string | null, image: string | null, audioMimeType?: string) => {
    setIsProcessing(true);
    try {
      const response = await processUserMessage(text, audio, image, userLanguage, audioMimeType);
      
      const aiMsg: Message = {
        id: Date.now().toString() + 'ai',
        sender: 'ai',
        type: 'text',
        content: response.text,
        timestamp: new Date(),
        suggestedActions: response.suggestedActions
      };
      addMessage(aiMsg);

      // Only auto-execute if it's NOT a review image action (which waits for user click)
      if (response.action && response.action !== 'NONE' && response.action !== 'REVIEW_IMAGE' && response.action !== 'SHOW_TOTAL') {
        onAiAction(response.action, response.data);
      }

    } catch (error) {
        addMessage({
            id: Date.now().toString(),
            sender: 'ai',
            type: 'text',
            content: "Network error. Please try again.",
            timestamp: new Date()
        });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuggestedAction = (actionType: string, data: any) => {
      // Handle SHOW_TOTAL completely inside chat with accurate pricing from inventory
      if (actionType === 'SHOW_TOTAL') {
          let total = 0;
          if (data && data.items) {
             data.items.forEach((item: any) => {
                 // Look up price in inventory for accuracy
                 const invItem = inventory.find(i => i.name.toLowerCase().includes(item.name.toLowerCase()));
                 const price = invItem ? invItem.price : (item.price || 0);
                 total += (item.quantity * price);
             });
          }

          addMessage({
              id: Date.now().toString(),
              sender: 'ai',
              type: 'text',
              content: `💰 Total Bill Amount: ₹${total}`,
              timestamp: new Date()
          });
          return;
      }

      // Delegate other actions to App (Update Stock, Complete Sale)
      onAiAction(actionType, data);
      
      let confirmText = "";
      if (actionType === 'NAVIGATE_BILL') confirmText = "Opening Bill Calculator...";
      else if (actionType === 'RESTOCK') confirmText = "Stock updated.";
      else if (actionType === 'UPDATE_CART') confirmText = "Items added to cart.";
      else if (actionType === 'COMPLETE_SALE') confirmText = "Sale recorded successfully.";

      if (confirmText) {
          addMessage({
              id: Date.now().toString(),
              sender: 'ai',
              type: 'text',
              content: `✅ ${confirmText}`,
              timestamp: new Date()
          });
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#efeae2] relative">
       {/* Background Pattern Overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#4a5568 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 z-0" ref={scrollRef}>
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                {msg.sender === 'customer' && (
                    <span className="text-[10px] text-blue-600 font-bold ml-1 mb-1 flex items-center gap-1">
                        <User size={10} /> {t('customer', userLanguage)}
                    </span>
                )}
                
                <div 
                  className={`p-3 shadow-sm text-sm relative 
                    ${msg.sender === 'user' 
                      ? 'bg-[#dcf8c6] text-gray-800 rounded-lg rounded-tr-none' 
                      : msg.sender === 'customer'
                        ? 'bg-blue-50 text-gray-800 rounded-lg rounded-tl-none border border-blue-100'
                        : 'bg-white text-gray-800 rounded-lg rounded-tl-none'}`}
                >
                  {msg.type === 'image' && msg.mediaData && (
                    <img src={msg.mediaData} alt="Uploaded" className="max-w-full rounded-lg mb-2 border border-gray-200" />
                  )}
                  {msg.type === 'audio' && (
                    <div className="flex items-center gap-2 text-gray-600 italic">
                      <Mic size={16} />
                      <span>{t('voiceNoteSent', userLanguage)}</span>
                    </div>
                  )}
                  {msg.type === 'text' && <p className="whitespace-pre-wrap">{msg.content}</p>}
                  
                  {/* Suggested Actions Buttons */}
                  {msg.suggestedActions && (
                      <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                          {msg.suggestedActions.map((action, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSuggestedAction(action.actionType, action.data)}
                                className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-2 rounded-lg border border-emerald-200 hover:bg-emerald-200 transition-colors flex items-center gap-1"
                              >
                                  {action.label}
                                  {action.actionType === 'NAVIGATE_BILL' && <ArrowRight size={12} />}
                              </button>
                          ))}
                      </div>
                  )}

                  <span className="text-[10px] text-gray-500 block text-right mt-1 opacity-70">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start w-full">
            <div className="bg-white rounded-lg p-3 rounded-tl-none shadow-sm flex items-center gap-2">
               <Loader2 className="animate-spin text-emerald-600" size={16} />
               <span className="text-xs text-gray-500">{t('aiProcessing', userLanguage)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white p-2 px-3 flex items-center gap-2 border-t border-gray-200 z-10 sticky bottom-0">
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleImageUpload}
        />
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          ref={cameraInputRef}
          onChange={handleImageUpload}
        />
        
        {/* Camera Menu */}
        <div className="relative">
            <button 
                onClick={() => setShowCameraMenu(!showCameraMenu)}
                className={`p-2 rounded-full transition-colors ${showCameraMenu ? 'bg-emerald-100 text-emerald-600' : 'text-gray-500 hover:bg-gray-100'}`}
                title="Camera / Upload"
                disabled={isRecording || isProcessing}
            >
                <Camera size={22} />
            </button>
            
            {showCameraMenu && (
                <div className="absolute bottom-12 left-0 bg-white rounded-lg shadow-xl border border-gray-100 p-2 min-w-[160px] flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2">
                    <button 
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 rounded-md text-left"
                    >
                        <Camera size={16} /> {t('takePhoto', userLanguage)}
                    </button>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 rounded-md text-left"
                    >
                        <ImageIcon size={16} /> {t('uploadGallery', userLanguage)}
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button 
                        onClick={() => setShowCameraMenu(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 rounded-md text-left justify-center"
                    >
                         {t('close', userLanguage)}
                    </button>
                </div>
            )}
        </div>
        
        {/* Text Input */}
        <div className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 flex items-center focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
          {isRecording ? (
              <div className="flex-1 flex items-center gap-2 text-red-500 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-sm font-medium">{t('recording', userLanguage)}</span>
              </div>
          ) : (
            <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={t('typeHere', userLanguage)}
                className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400 bg-transparent"
                disabled={isProcessing}
            />
          )}
        </div>

        {inputText.trim() ? (
            <button 
                onClick={handleSendMessage}
                className="p-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors shadow-sm"
                disabled={isProcessing}
            >
                <Send size={20} />
            </button>
        ) : (
            <button 
                onClick={() => setIsRecording(!isRecording)}
                className={`p-3 rounded-full transition-all shadow-sm ${isRecording ? 'bg-red-500 text-white scale-110' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                disabled={isProcessing}
            >
                {isRecording ? <StopCircle size={20} className="animate-pulse" /> : <Mic size={20} />}
            </button>
        )}

        <AudioRecorder isRecording={isRecording} onStop={handleAudioStop} />
      </div>
    </div>
  );
}
