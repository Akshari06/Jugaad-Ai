
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingBag, CheckCircle2, Store, X, Calendar, AlertTriangle, ArrowRight, Clock, Mic, StopCircle, Loader2 } from 'lucide-react';
import { InventoryItem, SaleItem } from '../types';
import { t } from '../utils/i18n';
import { processUserMessage } from '../services/geminiService';

interface BillCalculatorProps {
  inventory: InventoryItem[];
  cart: SaleItem[];
  setCart: React.Dispatch<React.SetStateAction<SaleItem[]>>;
  onComplete: (items: SaleItem[], total: number) => void;
  onAddNewItem: (item: InventoryItem) => void;
  userLanguage: string;
}

// Simple Audio Recorder Component logic integrated
const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];
            
            mediaRecorder.current.ondataavailable = (event) => {
                audioChunks.current.push(event.data);
            };
            
            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
        }
    };

    const stopRecording = (): Promise<Blob> => {
        return new Promise((resolve) => {
            if (mediaRecorder.current) {
                mediaRecorder.current.onstop = () => {
                    const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' }); // Gemini handles webm/wav
                    resolve(audioBlob);
                };
                mediaRecorder.current.stop();
                mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
                setIsRecording(false);
            } else {
                resolve(new Blob());
            }
        });
    };

    return { isRecording, startRecording, stopRecording };
};

export default function BillCalculator({ inventory, cart, setCart, onComplete, onAddNewItem, userLanguage }: BillCalculatorProps) {
  const [view, setView] = useState<'catalog' | 'cart'>('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Voice Input State
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceText, setVoiceText] = useState('');

  // New Item Form State
  const [newItemData, setNewItemData] = useState({
      name: '',
      quantity: '',
      price: '',
      expiryDate: ''
  });

  const filteredInventory = useMemo(() => {
    return inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [inventory, searchTerm]);

  const addToCart = (item: InventoryItem, qtyToAdd: number = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.name === item.name);
      if (existing) {
        return prev.map(i => i.name === item.name ? { ...i, quantity: i.quantity + qtyToAdd } : i);
      }
      return [...prev, { name: item.name, quantity: qtyToAdd, price: item.price }];
    });
  };

  const updateQty = (name: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.name === name) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item; 
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (name: string) => {
    setCart(prev => prev.filter(i => i.name !== name));
  };

  const totalAmount = cart.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    onComplete(cart, totalAmount);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
        setIsProcessingVoice(true);
        const blob = await stopRecording();
        
        // Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            try {
                // Send to Gemini with ADD_TO_CART intent implicit in prompt or handled by system instruction
                // We'll append a text prompt to guide it
                const response = await processUserMessage("Add these items to the current bill:", base64Audio, null, userLanguage, blob.type);
                
                if (response.text) setVoiceText(response.text);
                
                if (response.action === 'ADD_TO_CART' && response.data && response.data.items) {
                    response.data.items.forEach((voiceItem: any) => {
                         // Find matching inventory item for price
                         const invItem = inventory.find(i => i.name.toLowerCase().includes(voiceItem.name.toLowerCase()));
                         const price = invItem?.price || voiceItem.price || 0;
                         
                         setCart(prev => {
                             const existing = prev.find(p => p.name === voiceItem.name);
                             if (existing) {
                                 return prev.map(p => p.name === voiceItem.name ? {...p, quantity: p.quantity + voiceItem.quantity} : p);
                             }
                             return [...prev, { name: voiceItem.name, quantity: voiceItem.quantity, price }];
                         });
                    });
                    setView('cart'); // Switch to cart view to show added items
                }
            } catch (e) {
                console.error(e);
                setVoiceText("Error processing voice.");
            } finally {
                setIsProcessingVoice(false);
            }
        };
    } else {
        setVoiceText("");
        startRecording();
    }
  };

  const handleAddNewSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (newItemData.name && newItemData.quantity && newItemData.price) {
          const newItem: InventoryItem = {
              id: Date.now().toString(),
              name: newItemData.name,
              quantity: parseInt(newItemData.quantity),
              price: parseFloat(newItemData.price),
              unit: 'unit',
              expiryDate: newItemData.expiryDate || undefined
          };
          onAddNewItem(newItem);
          setShowAddModal(false);
          setNewItemData({ name: '', quantity: '', price: '', expiryDate: '' });
      }
  };

  const getExpiryStatus = (expiryStr?: string) => {
      if (!expiryStr) return null;
      const date = new Date(expiryStr);
      const days = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      
      if (days < 0) return { label: t('expired', userLanguage), color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle };
      if (days <= 7) return { label: t('expiring', userLanguage), color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock };
      return null;
  };

  if (showSuccess) {
      return (
          <div className="h-full flex flex-col items-center justify-center bg-emerald-50 text-center p-6 animate-in fade-in zoom-in">
              <div className="bg-white p-6 rounded-full shadow-lg mb-4">
                  <CheckCircle2 size={64} className="text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('saleRecorded', userLanguage)}</h2>
              <p className="text-gray-600">{t('stockUpdated', userLanguage)}</p>
          </div>
      )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 relative">
      
      {/* Add New Item Modal */}
      {showAddModal && (
          <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-900">{t('addNewProduct', userLanguage)}</h3>
                      <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <form onSubmit={handleAddNewSubmit} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">{t('itemName', userLanguage)}</label>
                          <input 
                              type="text" 
                              required
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="e.g. Basmati Rice 1kg"
                              value={newItemData.name}
                              onChange={e => setNewItemData({...newItemData, name: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">{t('quantity', userLanguage)}</label>
                            <input 
                                type="number" 
                                required
                                min="1"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Stock"
                                value={newItemData.quantity}
                                onChange={e => setNewItemData({...newItemData, quantity: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">{t('rate', userLanguage)}</label>
                            <input 
                                type="number" 
                                required
                                min="0"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Price"
                                value={newItemData.price}
                                onChange={e => setNewItemData({...newItemData, price: e.target.value})}
                            />
                        </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">{t('expiryDate', userLanguage)}</label>
                          <input 
                              type="date" 
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700"
                              value={newItemData.expiryDate}
                              onChange={e => setNewItemData({...newItemData, expiryDate: e.target.value})}
                          />
                      </div>
                      <button 
                          type="submit" 
                          className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl mt-2 hover:bg-emerald-700 transition-colors"
                      >
                          {t('saveProduct', userLanguage)}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="bg-emerald-600 text-white p-4 shadow-sm z-10 sticky top-0">
         <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2">
                 <Store size={22} className="opacity-90" />
                 <h1 className="font-bold text-lg tracking-tight">{t('quickBill', userLanguage)}</h1>
             </div>
             <button 
                onClick={() => setShowAddModal(true)}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5"
             >
                <Plus size={16} /> {t('addProduct', userLanguage)}
             </button>
         </div>

         {/* Search & Tabs Combined */}
         <div className="flex gap-2">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder={t('searchPlaceholder', userLanguage)}
                    className="w-full pl-9 pr-4 py-2 bg-white rounded-lg text-sm text-gray-800 placeholder-gray-400 outline-none shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <div className="flex bg-emerald-800/30 p-1 rounded-lg shrink-0">
                 <button 
                    onClick={() => setView('catalog')}
                    className={`p-1.5 px-3 rounded-md text-sm font-medium transition-all ${view === 'catalog' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-100 hover:bg-white/10'}`}
                 >
                    {t('itemsTab', userLanguage)}
                 </button>
                 <button 
                    onClick={() => setView('cart')}
                    className={`p-1.5 px-3 rounded-md text-sm font-medium transition-all relative ${view === 'cart' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-100 hover:bg-white/10'}`}
                 >
                    {t('cartTab', userLanguage)}
                    {cart.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border border-emerald-600">
                            {cart.length}
                        </span>
                    )}
                 </button>
             </div>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 no-scrollbar">
          
          {/* Voice Input Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 mb-4 shadow-sm">
              <h3 className="text-sm font-bold text-blue-900 mb-1">{t('voiceInput', userLanguage)}</h3>
              <p className="text-[10px] text-blue-700 mb-3 opacity-80">{t('voiceInputDesc', userLanguage)}</p>
              
              <div className="flex items-center gap-3">
                  <button 
                    onClick={handleVoiceInput}
                    disabled={isProcessingVoice}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                      {isProcessingVoice ? <Loader2 size={16} className="animate-spin" /> : isRecording ? <StopCircle size={16} /> : <Mic size={16} />}
                      {isProcessingVoice ? t('generating', userLanguage) : isRecording ? t('recording', userLanguage).split('.')[0] : t('speak', userLanguage)}
                  </button>
                  {voiceText && <p className="text-xs text-gray-600 italic flex-1 truncate bg-white/50 p-2 rounded">{voiceText}</p>}
              </div>
          </div>

          {view === 'catalog' ? (
              <>
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2 px-1">{t('manualItems', userLanguage)}</h3>
                {filteredInventory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                        <ShoppingBag size={48} className="mb-2 opacity-50" />
                        <p>{t('noItemsFound', userLanguage)}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 mb-20">
                        {filteredInventory.map((item) => {
                            const status = getExpiryStatus(item.expiryDate);
                            return (
                                <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex flex-col justify-between hover:border-emerald-300 transition-colors relative overflow-hidden group">
                                    <div className="mb-2">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight">{item.name}</h3>
                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${item.quantity < 10 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {item.quantity} {t('left', userLanguage)}
                                            </span>
                                        </div>
                                        <p className="text-emerald-600 font-bold text-base">₹{item.price}</p>
                                        
                                        {/* Expiry Information */}
                                        <div className="mt-2 flex flex-col gap-1">
                                            {item.expiryDate && (
                                                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                    <Calendar size={10} />
                                                    <span>{t('exp', userLanguage)}: {new Date(item.expiryDate).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            {status && (
                                                <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${status.color} w-fit`}>
                                                    <status.icon size={10} />
                                                    <span>{status.label}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => addToCart(item)}
                                        className="mt-2 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold py-2 rounded-lg text-sm flex items-center justify-center gap-1 transition-colors active:scale-95"
                                    >
                                        <Plus size={16} /> {t('add', userLanguage)}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
              </>
          ) : (
              <div className="space-y-4 pb-32">
                  {cart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                          <ShoppingBag size={48} className="mb-4 opacity-50" />
                          <p>{t('cartEmpty', userLanguage)}</p>
                          <button onClick={() => setView('catalog')} className="mt-4 text-emerald-600 font-medium hover:underline">
                              {t('browseItems', userLanguage)}
                          </button>
                      </div>
                  ) : (
                      <div className="space-y-3">
                          {cart.map((item, idx) => (
                              <div key={idx} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                                  <div className="flex-1">
                                      <h4 className="font-semibold text-gray-800 text-sm">{item.name}</h4>
                                      <p className="text-gray-500 text-xs">₹{item.price} x {item.quantity}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                                          <button 
                                            onClick={() => item.quantity > 1 ? updateQty(item.name, -1) : removeItem(item.name)}
                                            className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-red-500 active:scale-90 transition-all"
                                          >
                                              {item.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                                          </button>
                                          <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                                          <button 
                                            onClick={() => updateQty(item.name, 1)}
                                            className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-emerald-600 active:scale-90 transition-all"
                                          >
                                              <Plus size={14} />
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          )}
      </div>
      
       {/* Checkout Bar - Fixed at bottom */}
      {view === 'cart' && cart.length > 0 && !showSuccess && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20 animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between mb-4">
                  <div>
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{t('total', userLanguage)} ({totalItems})</p>
                      <p className="text-2xl font-bold text-gray-900">₹{totalAmount}</p>
                  </div>
              </div>
              <button 
                onClick={handleCheckout}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-200 transform active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {t('completeSale', userLanguage)} <ArrowRight size={20} />
              </button>
          </div>
      )}
    </div>
  );
}
