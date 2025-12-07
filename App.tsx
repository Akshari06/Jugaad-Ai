import React, { useState, useEffect } from 'react';
import { LayoutDashboard, MessageSquareText, LogOut, Store, User, Calculator, Sparkles } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import WelcomeScreen from './components/WelcomeScreen';
import BillCalculator from './components/BillCalculator';
import { InventoryItem, SaleRecord, UserProfile, ExpenseRecord, SaleItem } from './types';
import { t } from './utils/i18n';

// Helper to generate dates relative to today
const daysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
};

// Mock Initial Data with Expiry Dates and Images
const INITIAL_INVENTORY: InventoryItem[] = [
  { 
    id: '1', 
    name: 'Marie Gold Biscuits', 
    quantity: 45, 
    unit: 'packet', 
    price: 10, 
    expiryDate: daysAgo(-90),
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&q=80'
  },
  { 
    id: '2', 
    name: 'Maggi Noodles', 
    quantity: 8, 
    unit: 'packet', 
    price: 14, 
    expiryDate: daysAgo(-120),
    image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=300&q=80'
  }, 
  { 
    id: '3', 
    name: 'Tata Salt', 
    quantity: 20, 
    unit: 'kg', 
    price: 25, 
    expiryDate: daysAgo(-365),
    image: 'https://images.unsplash.com/photo-1518110925495-5fe26535db2f?w=300&q=80'
  },
  { 
    id: '4', 
    name: 'Red Label Tea', 
    quantity: 4, 
    unit: 'box', 
    price: 120, 
    expiryDate: daysAgo(-500),
    image: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=300&q=80'
  },
  { 
    id: '5', 
    name: 'Surf Excel', 
    quantity: 30, 
    unit: 'sachet', 
    price: 5, 
    expiryDate: daysAgo(-730),
    image: 'https://images.unsplash.com/photo-1527015098135-e5f8f3b7d722?w=300&q=80'
  },
  { 
    id: '6', 
    name: 'Amul Milk', 
    quantity: 5, 
    unit: 'packet', 
    price: 28, 
    expiryDate: daysAgo(-1), // Expiring soon
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&q=80'
  },
  { 
    id: '7', 
    name: 'Bread', 
    quantity: 5, 
    unit: 'loaf', 
    price: 40, 
    expiryDate: daysAgo(-2), // Expiring soon
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&q=80'
  },
];

// Generate synthetic sales data for graphs (last 365 days for 12-month view)
const generateInitialSales = (): SaleRecord[] => {
    const records: SaleRecord[] = [];
    const itemNames = INITIAL_INVENTORY.map(i => i.name);

    for (let i = 0; i < 365; i++) {
        const date = daysAgo(i);
        // Random number of sales per day (0 to 8)
        const dailySalesCount = Math.floor(Math.random() * 9);
        
        for (let j = 0; j < dailySalesCount; j++) {
             // Pick a random real item
             const randomItemName = itemNames[Math.floor(Math.random() * itemNames.length)];
             const basePrice = INITIAL_INVENTORY.find(inv => inv.name === randomItemName)?.price || 10;
             const qty = Math.floor(Math.random() * 3) + 1;

             records.push({
                 id: `sale-${i}-${j}`,
                 date: date,
                 items: [{ name: randomItemName, quantity: qty, price: basePrice }],
                 totalAmount: basePrice * qty
             });
        }
    }
    return records.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

const INITIAL_SALES: SaleRecord[] = generateInitialSales();

const INITIAL_EXPENSES: ExpenseRecord[] = [
    { id: 'e1', description: 'Restock Maggi', amount: 500, date: daysAgo(2) },
    { id: 'e2', description: 'Shop Electricity Bill', amount: 1200, date: daysAgo(15) }
];

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'calculator'>('calculator'); // Default to calculator
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [sales, setSales] = useState<SaleRecord[]>(INITIAL_SALES);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(INITIAL_EXPENSES);
  const [cart, setCart] = useState<SaleItem[]>([]); // Lifted state

  useEffect(() => {
    // Check local storage for language preference on init (optional, mostly handled in WelcomeScreen)
    const storedLang = localStorage.getItem('userLanguage');
    if (user && storedLang && user.language !== storedLang) {
        setUser({ ...user, language: storedLang });
    }
  }, [user]);

  // Authentication Handlers
  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
  };

  const handleLogout = () => {
    setUser(null);
    setInventory(INITIAL_INVENTORY);
    setSales(INITIAL_SALES);
    setExpenses(INITIAL_EXPENSES);
    setCart([]);
    setActiveTab('calculator');
  };

  // Helper to generate a stock status message
  const getInitialStockStatus = () => {
    const lowStock = inventory.filter(i => i.quantity < 10);
    const expiringSoon = inventory.filter(i => {
        if (!i.expiryDate) return false;
        const days = Math.ceil((new Date(i.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        return days <= 7;
    });

    const count = inventory.length;
    let msg = `Namaste ${user?.ownerName || ''}! `;
    msg += `Current Inventory Status:\n• Total Products: ${count}\n`;
    
    if (lowStock.length > 0) {
      msg += `• ⚠️ Low Stock: ${lowStock.map(i => `${i.name} (${i.quantity})`).join(', ')}\n`;
    } 
    
    if (expiringSoon.length > 0) {
        msg += `• 🕒 Expiring Soon: ${expiringSoon.map(i => i.name).join(', ')}`;
    }
    
    if (lowStock.length === 0 && expiringSoon.length === 0) {
      msg += `• ✅ All items are well stocked and fresh.`;
    }
    
    msg += `\n\nHow can I help you today? (Speak or upload a photo)`;
    return msg;
  };

  // Central Logic for Updates
  const updateInventoryAndRecordSale = (itemsToSell: SaleItem[]) => {
      let total = 0;
      setInventory(prev => {
        const newInv = [...prev];
        itemsToSell.forEach((soldItem) => {
           const idx = newInv.findIndex(i => i.name.toLowerCase().includes(soldItem.name.toLowerCase()));
           if (idx > -1) {
             newInv[idx].quantity = Math.max(0, newInv[idx].quantity - soldItem.quantity);
             if (!soldItem.price) soldItem.price = newInv[idx].price;
             total += (soldItem.price * soldItem.quantity);
           }
        });
        return newInv;
      });

      const newSale: SaleRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        items: itemsToSell,
        totalAmount: total || itemsToSell.reduce((a, b) => a + ((b.price || 0) * b.quantity), 0)
      };
      setSales(prev => [...prev, newSale]);
  };

  const handleQuickRestock = (itemName: string) => {
    setInventory(prev => prev.map(item => {
      if (item.name === itemName) {
        // Record Expense for restock (assuming 80% of selling price is cost)
        const cost = (item.price * 0.8) * 10;
        setExpenses(curr => [...curr, {
          id: Date.now().toString(),
          description: `Quick Restock: ${item.name}`,
          amount: cost,
          date: new Date().toISOString()
        }]);
        
        return { ...item, quantity: item.quantity + 10 };
      }
      return item;
    }));
  };

  const handleAddNewItem = (newItem: InventoryItem) => {
    setInventory(prev => [newItem, ...prev]);
  };

  const handleSaleComplete = (items: SaleItem[]) => {
    updateInventoryAndRecordSale(items);
    setCart([]); // Clear cart after sale
  };

  const processCartItems = (data: any): SaleItem[] => {
      if (!data || !data.items) return [];
      return data.items.map((item: any) => {
          // Find matching inventory item for price
          const invItem = inventory.find(i => i.name.toLowerCase().includes(item.name.toLowerCase()));
          return { 
              name: item.name, 
              quantity: item.quantity, 
              price: invItem?.price || item.price || 0 
          };
      });
  };

  const handleAiAction = (actionType: string, data: any) => {
    if (actionType === 'UPDATE_INVENTORY' || actionType === 'RESTOCK') {
      let totalOutcome = 0;

      setInventory(prev => {
        const newInv = [...prev];
        data.items.forEach((newItem: any) => {
          const existingIndex = newInv.findIndex(i => i.name.toLowerCase().includes(newItem.name.toLowerCase()) || newItem.name.toLowerCase().includes(i.name.toLowerCase()));
          
          let quantityAdded = 0;
          let currentPrice = existingIndex > -1 ? newInv[existingIndex].price : (newItem.price || 50);

          if (existingIndex > -1) {
             const oldQty = newInv[existingIndex].quantity;
             if (newItem.changeType === 'subtract') {
                 newInv[existingIndex].quantity = Math.max(0, newInv[existingIndex].quantity - newItem.quantity);
             } else if (newItem.changeType === 'set') {
                 if (newItem.quantity > oldQty) quantityAdded = newItem.quantity - oldQty;
                 newInv[existingIndex].quantity = newItem.quantity;
             } else {
                 newInv[existingIndex].quantity += newItem.quantity;
                 quantityAdded = newItem.quantity;
             }
          } else {
            // Only add new items if specifically told to, or if RESTOCK logic implies adding
            if (newItem.changeType !== 'subtract') {
              newInv.push({
                id: Date.now().toString() + Math.random(),
                name: newItem.name,
                quantity: newItem.quantity,
                unit: 'unit',
                price: newItem.price || 0,
                expiryDate: daysAgo(-180), // Default expiry for new items
                image: 'https://images.unsplash.com/photo-1576618148400-f54bed99fcf8?w=300&q=80' // Placeholder
              });
              quantityAdded = newItem.quantity;
            }
          }

          if (quantityAdded > 0) {
              const costPrice = currentPrice * 0.8;
              totalOutcome += quantityAdded * costPrice;
          }
        });
        return newInv;
      });

      if (totalOutcome > 0) {
          setExpenses(prev => [...prev, {
              id: Date.now().toString(),
              description: `Restock: ${data.items.length} items`,
              amount: Math.round(totalOutcome),
              date: new Date().toISOString()
          }]);
      }

    } else if (actionType === 'RECORD_SALE') {
      updateInventoryAndRecordSale(data.items);
    } else if (actionType === 'ADD_TO_CART' || actionType === 'UPDATE_CART') {
      // Just update cart state, stay in current tab (Chat) unless explicit nav
      const items = processCartItems(data);
      setCart(prev => {
          const newCart = [...prev];
          items.forEach((item) => {
             const existing = newCart.find(p => p.name === item.name);
             if (existing) {
                 existing.quantity += item.quantity;
             } else {
                 newCart.push(item);
             }
          });
          return newCart;
      });
      // Do not change tab here, only for VIEW_BILL or NAVIGATE_BILL
    } else if (actionType === 'VIEW_BILL' || actionType === 'NAVIGATE_BILL') {
       // Update cart and NAVIGATE
       const items = processCartItems(data);
       setCart(prev => {
          const newCart = [...prev];
          items.forEach((item) => {
             const existing = newCart.find(p => p.name === item.name);
             if (existing) {
                 existing.quantity += item.quantity;
             } else {
                 newCart.push(item);
             }
          });
          return newCart;
      });
      setActiveTab('calculator');
    } else if (actionType === 'COMPLETE_SALE') {
        const items = processCartItems(data);
        updateInventoryAndRecordSale(items);
    }
  };

  if (!user) {
    return <WelcomeScreen onLogin={handleLogin} />;
  }

  const currentLang = user.language;

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden relative">
      {/* Mobile-first Layout Container */}
      <div className="mx-auto w-full h-full max-w-md bg-white shadow-2xl overflow-hidden flex flex-col sm:border-x sm:border-gray-300 relative z-10">
        
        {/* Dynamic Header */}
        <header className={`${activeTab === 'chat' ? 'bg-white text-gray-800 border-b border-gray-100' : 'bg-emerald-600 text-white'} p-4 shadow-sm z-10 flex items-center justify-between shrink-0 transition-colors duration-300`}>
          {activeTab === 'chat' ? (
             <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
                <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-[2px]">
                        <div className="w-full h-full bg-white rounded-full flex items-center justify-center relative overflow-hidden">
                             <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-purple-100 opacity-50"></div>
                             <Sparkles size={18} className="text-purple-600 relative z-10" fill="currentColor" />
                        </div>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full z-20"></div>
                </div>
                <div className="flex flex-col">
                    <h1 className="font-bold text-lg leading-none bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">{t('appName', currentLang)}</h1>
                    <span className="text-[10px] text-gray-400 font-medium">{t('withGemini', currentLang)}</span>
                </div>
             </div>
          ) : (
            <div className="flex items-center gap-2 overflow-hidden animate-in fade-in">
                <div className="bg-white/20 p-2 rounded-full shrink-0">
                  <Store size={20} />
                </div>
                <div className="min-w-0">
                  <h1 className="font-bold text-lg tracking-tight leading-none truncate">{user.shopName}</h1>
                  <p className="text-[10px] text-emerald-100 opacity-90 truncate">{user.ownerName} • {user.language}</p>
                </div>
            </div>
          )}

          <div className="flex items-center gap-1">
              <button 
                onClick={handleLogout}
                className={`p-2 rounded-full transition-colors ${activeTab === 'chat' ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-emerald-700 text-white'}`}
                title="Sign Out"
              >
                <LogOut size={20} />
              </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative bg-gray-50">
           {/* Tab 1: Calculator (Now Default) */}
           <div className={`absolute inset-0 transition-transform duration-300 transform ${activeTab === 'calculator' ? 'translate-x-0' : '-translate-x-full'}`}>
              <BillCalculator 
                inventory={inventory}
                cart={cart}
                setCart={setCart}
                onComplete={handleSaleComplete}
                onAddNewItem={handleAddNewItem}
                userLanguage={currentLang}
              />
           </div>

           {/* Tab 2: Dashboard */}
           <div className={`absolute inset-0 transition-transform duration-300 transform ${activeTab === 'dashboard' ? 'translate-x-0' : activeTab === 'chat' ? '-translate-x-full' : 'translate-x-full'}`}>
              <Dashboard 
                inventory={inventory} 
                sales={sales} 
                expenses={expenses}
                onRestock={handleQuickRestock}
                userLanguage={currentLang}
              />
           </div>

           {/* Tab 3: Chat */}
           <div className={`absolute inset-0 transition-transform duration-300 transform ${activeTab === 'chat' ? 'translate-x-0' : 'translate-x-full'}`}>
              <ChatInterface 
                onAiAction={handleAiAction} 
                inventory={inventory}
                userLanguage={currentLang}
                initialMessage={getInitialStockStatus()}
              />
           </div>
        </main>

        {/* Bottom Navigation */}
        <nav className="bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 shrink-0">
          <div className="flex justify-around items-center h-16">
            
            <button 
              onClick={() => setActiveTab('calculator')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === 'calculator' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <div className={`p-1.5 rounded-full transition-all duration-300 ${activeTab === 'calculator' ? 'bg-emerald-50 scale-110' : ''}`}>
                 <Calculator size={activeTab === 'calculator' ? 24 : 22} strokeWidth={activeTab === 'calculator' ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-medium">{t('calculator', currentLang)}</span>
            </button>

            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === 'dashboard' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <div className={`p-1.5 rounded-full transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-emerald-50 scale-110' : ''}`}>
                 <LayoutDashboard size={activeTab === 'dashboard' ? 24 : 22} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-medium">{t('insights', currentLang)}</span>
            </button>

            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === 'chat' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <div className={`p-1.5 rounded-full transition-all duration-300 ${activeTab === 'chat' ? 'bg-blue-50 scale-110' : ''}`}>
                  {activeTab === 'chat' ? (
                      <Sparkles size={24} className="text-blue-600 animate-pulse" />
                  ) : (
                      <MessageSquareText size={22} />
                  )}
              </div>
              <span className="text-[10px] font-medium">{t('aiChat', currentLang)}</span>
            </button>
            
          </div>
        </nav>

      </div>
    </div>
  );
}