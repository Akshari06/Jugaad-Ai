
import React, { useMemo, useState } from 'react';
import { InventoryItem, SaleRecord, ExpenseRecord } from '../types';
import { generateMarketingMessage } from '../services/geminiService';
import { Share2, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, IndianRupee, Package, PieChart as PieIcon, Activity, CalendarClock, ShoppingCart, PlusCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { t } from '../utils/i18n';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';

interface DashboardProps {
  inventory: InventoryItem[];
  sales: SaleRecord[];
  expenses: ExpenseRecord[];
  onRestock: (itemName: string) => void;
  userLanguage: string;
}

export default function Dashboard({ inventory, sales, expenses, onRestock, userLanguage }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'financial' | 'products'>('financial');
  const [marketingMsg, setMarketingMsg] = useState<string | null>(null);
  const [isLoadingMsg, setIsLoadingMsg] = useState(false);

  // --- Calculations ---
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayStr = now.toISOString().split('T')[0];

    const isCurrentMonth = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    };
    const isToday = (dateStr: string) => {
        return dateStr.startsWith(todayStr);
    };
    
    // Financials
    const todayIncome = sales.filter(s => isToday(s.date)).reduce((sum, s) => sum + s.totalAmount, 0);
    const todayExpense = expenses.filter(e => isToday(e.date)).reduce((sum, e) => sum + e.amount, 0);
    const monthlyIncome = sales.filter(s => isCurrentMonth(s.date)).reduce((sum, s) => sum + s.totalAmount, 0);
    const monthlyExpense = expenses.filter(e => isCurrentMonth(e.date)).reduce((sum, e) => sum + e.amount, 0);
    
    // Cash Flow Ratio (Income / Expense)
    const cashFlowRatio = monthlyExpense > 0 ? (monthlyIncome / monthlyExpense).toFixed(1) : (monthlyIncome > 0 ? "∞" : "0");

    // Charts Data
    // 1. Daily Income (Last 14 Days)
    const dailyData = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayIncome = sales
            .filter(s => s.date.startsWith(dateStr))
            .reduce((sum, s) => sum + s.totalAmount, 0);
        dailyData.push({ day: d.getDate(), amount: dayIncome, date: dateStr });
    }

    // 2. Monthly Income (All 12 Months)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData = monthNames.map((name, index) => {
        const income = sales
            .filter(s => new Date(s.date).getMonth() === index)
            .reduce((sum, s) => sum + s.totalAmount, 0);
        return { name, income };
    });

    // Products & Rates Logic
    // 1. Restock Needed (< 10 qty)
    const restockNeeded = inventory.filter(i => i.quantity < 10);

    // 2. Expiring Soon (<= 7 days)
    const expiringSoon = inventory.filter(i => {
        if (!i.expiryDate) return false;
        const days = Math.ceil((new Date(i.expiryDate).getTime() - now.getTime()) / (1000 * 3600 * 24));
        return days <= 7 && days >= 0;
    });

    // 3. Top Selling
    const productSalesMap = new Map<string, number>();
    sales.forEach(sale => {
        sale.items.forEach(item => {
            const current = productSalesMap.get(item.name) || 0;
            productSalesMap.set(item.name, current + item.quantity);
        });
    });
    
    const topSelling = Array.from(productSalesMap.entries())
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

    // 4. Product Rates Table Data (Sorted by revenue)
    const productRates = inventory.map(item => {
        const totalSold = productSalesMap.get(item.name) || 0;
        return {
            ...item,
            totalSold,
            revenue: totalSold * item.price
        };
    }).sort((a, b) => b.revenue - a.revenue);

    return { 
        todayIncome, todayExpense, monthlyIncome, monthlyExpense, cashFlowRatio,
        dailyData, monthlyData,
        restockNeeded, expiringSoon, topSelling, productRates 
    };
  }, [sales, expenses, inventory]);

  const generatePromo = async () => {
    setIsLoadingMsg(true);
    const msg = await generateMarketingMessage(inventory, userLanguage);
    setMarketingMsg(msg);
    setIsLoadingMsg(false);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      
      {/* Sub-Header Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 pt-2 shrink-0">
        <div className="flex gap-6">
            <button 
                onClick={() => setActiveTab('financial')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'financial' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500'}`}
            >
                <PieIcon size={16} /> {t('financials', userLanguage)}
            </button>
            <button 
                onClick={() => setActiveTab('products')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'products' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500'}`}
            >
                <Package size={16} /> {t('productsRates', userLanguage)}
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20 no-scrollbar">
        {activeTab === 'financial' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                
                {/* 1. Today's Report Cards */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide opacity-70">{t('todaysReport', userLanguage)}</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                            <strong className="text-[10px] text-emerald-600 uppercase block mb-1">{t('todayIncome', userLanguage)}</strong>
                            <div className="text-xl font-bold text-emerald-700">₹{stats.todayIncome}</div>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                            <strong className="text-[10px] text-red-600 uppercase block mb-1">{t('todayExpense', userLanguage)}</strong>
                            <div className="text-xl font-bold text-red-700">₹{stats.todayExpense}</div>
                        </div>
                    </div>
                </div>

                {/* Cash Flow Ratio */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-gray-700">{t('cashFlowRatio', userLanguage)}</h3>
                        <p className="text-xs text-gray-400">Income vs Expense (This Month)</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`text-2xl font-bold ${parseFloat(stats.cashFlowRatio) >= 1 ? 'text-emerald-600' : 'text-orange-500'}`}>
                            {stats.cashFlowRatio}x
                        </div>
                        {parseFloat(stats.cashFlowRatio) >= 1 ? <TrendingUp size={20} className="text-emerald-500"/> : <AlertTriangle size={20} className="text-orange-500"/>}
                    </div>
                </div>

                {/* 2. Daily Income Graph */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-4">{t('dailyIncome', userLanguage)}</h3>
                    <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.dailyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={10} />
                                <YAxis axisLine={false} tickLine={false} fontSize={10} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    cursor={{ fill: '#f0fdf4' }}
                                />
                                <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. All Months Income Graph */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-4">{t('monthlyTrends', userLanguage)} (Yearly)</h3>
                    <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} />
                                <YAxis axisLine={false} tickLine={false} fontSize={10} hide />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    cursor={{ fill: '#eff6ff' }}
                                />
                                <Bar dataKey="income" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                 {/* Marketing Generator */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-xl shadow-md text-white mt-4">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                        ✨ {t('boostSales', userLanguage)}
                    </h3>
                    {marketingMsg ? (
                        <div className="bg-white/10 p-3 rounded-lg mb-4 text-sm backdrop-blur-sm border border-white/20">
                            {marketingMsg}
                        </div>
                    ) : null}

                    <button 
                        onClick={generatePromo}
                        disabled={isLoadingMsg}
                        className="w-full bg-white text-indigo-600 font-semibold py-2 rounded-lg text-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoadingMsg ? t('generating', userLanguage) : (
                            <>
                                <Share2 size={16} /> {t('createPromo', userLanguage)}
                            </>
                        )}
                    </button>
                </div>
            </div>
        ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                 {/* 1. Restock Needed & 2. Expiring Soon (Horizontal Scroll) */}
                 <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
                    {/* Restock Card */}
                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl min-w-[200px] flex-1">
                        <div className="flex items-center gap-2 mb-2 text-orange-800">
                             <ShoppingCart size={18} />
                             <h3 className="font-bold text-sm">{t('restockNeeded', userLanguage)}</h3>
                        </div>
                        {stats.restockNeeded.length > 0 ? (
                            <ul className="space-y-2">
                                {stats.restockNeeded.slice(0, 3).map(item => (
                                    <li key={item.id} className="flex justify-between items-center bg-white p-2 rounded shadow-sm text-xs">
                                        <span className="font-medium text-gray-700 truncate max-w-[100px]">{item.name}</span>
                                        <button onClick={() => onRestock(item.name)} className="text-orange-600 font-bold text-[10px] bg-orange-100 px-2 py-1 rounded">
                                            +10
                                        </button>
                                    </li>
                                ))}
                                {stats.restockNeeded.length > 3 && <li className="text-[10px] text-center text-orange-600">+{stats.restockNeeded.length - 3} more</li>}
                            </ul>
                        ) : (
                            <p className="text-xs text-orange-400 italic">All stocked up!</p>
                        )}
                    </div>

                    {/* Expiring Card */}
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl min-w-[200px] flex-1">
                        <div className="flex items-center gap-2 mb-2 text-red-800">
                             <CalendarClock size={18} />
                             <h3 className="font-bold text-sm">{t('expiringSoon', userLanguage)}</h3>
                        </div>
                        {stats.expiringSoon.length > 0 ? (
                             <ul className="space-y-2">
                                {stats.expiringSoon.slice(0, 3).map(item => (
                                    <li key={item.id} className="flex justify-between items-center bg-white p-2 rounded shadow-sm text-xs">
                                        <span className="font-medium text-gray-700 truncate max-w-[100px]">{item.name}</span>
                                        <span className="text-red-500 font-bold">{new Date(item.expiryDate!).getDate()}/{new Date(item.expiryDate!).getMonth()+1}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-red-400 italic">No expiry alerts.</p>
                        )}
                    </div>
                 </div>

                 {/* 3. Top Selling Products */}
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                     <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <TrendingUp size={16} className="text-emerald-500"/> {t('topSelling', userLanguage)}
                     </h3>
                     <div className="space-y-3">
                         {stats.topSelling.map((item, idx) => (
                             <div key={idx} className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx===0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                     #{idx + 1}
                                 </div>
                                 <div className="flex-1">
                                     <div className="flex justify-between text-sm">
                                         <span className="font-medium text-gray-800">{item.name}</span>
                                         <span className="text-gray-500">{item.qty} sold</span>
                                     </div>
                                     <div className="h-1.5 w-full bg-gray-100 rounded-full mt-1 overflow-hidden">
                                         <div 
                                            className="h-full bg-emerald-500 rounded-full" 
                                            style={{ width: `${(item.qty / stats.topSelling[0].qty) * 100}%` }}
                                         ></div>
                                     </div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>

                 {/* 4. Products Sales and Rates & Price Table */}
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                     <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                         <h3 className="font-bold text-gray-800 text-sm">{t('productSalesRate', userLanguage)}</h3>
                     </div>
                     <table className="w-full text-sm text-left">
                         <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                             <tr>
                                 <th className="px-4 py-3 font-medium">{t('product', userLanguage)}</th>
                                 <th className="px-4 py-3 font-medium text-right">{t('price', userLanguage)}</th>
                                 <th className="px-4 py-3 font-medium text-right">{t('salesRate', userLanguage)}</th>
                                 <th className="px-4 py-3 font-medium text-right">Rev.</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                             {stats.productRates.slice(0, 10).map((item, idx) => (
                                 <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                     <td className="px-4 py-3 font-medium text-gray-800 max-w-[120px] truncate">
                                         {item.name}
                                     </td>
                                     <td className="px-4 py-3 text-right text-gray-600">₹{item.price}</td>
                                     <td className="px-4 py-3 text-right">
                                         <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                                             {item.totalSold}
                                         </span>
                                     </td>
                                     <td className="px-4 py-3 text-right font-medium text-emerald-600">
                                         ₹{item.revenue}
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                     <div className="p-2 text-center border-t border-gray-100">
                         <span className="text-xs text-gray-400">Showing top 10 items</span>
                     </div>
                 </div>
            </div>
        )}
      </div>
    </div>
  );
}
