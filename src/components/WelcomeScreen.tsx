
import React, { useState } from 'react';
import { Store, ArrowRight, CheckCircle2, Mail, Chrome, Grip, User, X, Volume2, HelpCircle, CheckSquare, Square } from 'lucide-react';
import { UserProfile } from '../types';
import { t } from '../utils/i18n';

interface WelcomeScreenProps {
  onLogin: (profile: UserProfile) => void;
}

const LANGUAGES = [
  { code: 'English', name: 'English', native: 'English' },
  { code: 'Hindi', name: 'Hindi', native: 'हिंदी' },
  { code: 'Kannada', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'Telugu', name: 'Telugu', native: 'తెలుగు' },
  { code: 'Tamil', name: 'Tamil', native: 'தமிழ்' },
  { code: 'Malayalam', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'Marathi', name: 'Marathi', native: 'मराठी' },
  { code: 'Bengali', name: 'Bengali', native: 'বাংলা' },
  { code: 'Gujarati', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'Punjabi', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'Urdu', name: 'Urdu', native: 'اُردُو' },
];

const MOCK_ACCOUNTS = [
  { name: 'Sharma General Store', email: 'sharma.retail@gmail.com', img: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80' },
  { name: 'Rahul Sharma', email: 'rahul.business@outlook.com', img: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&q=80' },
  { name: 'Jugaad User', email: 'user@jugaad.ai', img: null }
];

export default function WelcomeScreen({ onLogin }: WelcomeScreenProps) {
  const [step, setStep] = useState<'auth' | 'profile' | 'language'>('auth');
  const [showAccountChooser, setShowAccountChooser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberLanguage, setRememberLanguage] = useState(true);
  
  const [formData, setFormData] = useState({
    shopName: '',
    ownerName: '',
    email: '',
    language: '' // Initially empty
  });

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.email) {
      setStep('profile');
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.shopName && formData.ownerName) {
      setStep('language');
    }
  };

  const handleLanguageSelect = (code: string) => {
    setFormData({ ...formData, language: code });
  };

  const handleFinalContinue = () => {
    if (!formData.language) return;
    
    setIsLoading(true);
    
    if (rememberLanguage) {
        localStorage.setItem('userLanguage', formData.language);
    }
    
    // Simulate setup delay
    setTimeout(() => {
        onLogin({
            ...formData,
            language: formData.language || 'English'
        });
        setIsLoading(false);
    }, 1500);
  };

  const handleSocialLogin = () => {
    setShowAccountChooser(true);
  };

  const handleAccountSelect = (account: typeof MOCK_ACCOUNTS[0]) => {
      setFormData({ 
          ...formData, 
          email: account.email,
          ownerName: account.name.split(' ')[0] 
      });
      setShowAccountChooser(false);
      setStep('profile');
  };

  // --- LANGUAGE SCREEN RENDER ---
  if (step === 'language') {
      const displayLang = formData.language || 'English'; // For simulating translated text during load
      return (
        <div className="min-h-screen w-full bg-gray-50 flex flex-col font-sans">
            {/* 1. Top Bar */}
            <header className="bg-white px-4 py-3 shadow-sm flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
                        <Store size={18} />
                    </div>
                    <span className="font-bold text-gray-800 text-sm hidden sm:block">Jugaad-AI</span>
                </div>
                <h1 className="text-lg font-bold text-gray-900 absolute left-1/2 -translate-x-1/2 w-full text-center pointer-events-none">
                    {t('chooseLanguage', displayLang)}
                </h1>
                <button className="text-gray-400 hover:text-gray-600">
                    <HelpCircle size={22} />
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-lg w-full mx-auto p-4 pb-24 flex flex-col">
                
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in">
                        <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-6"></div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">{t('settingUp', formData.language)}</h2>
                        <p className="text-gray-500">{t('applyingSettings', formData.language)}...</p>
                    </div>
                ) : (
                    <>
                        {/* 2. Main Text */}
                        <div className="text-center mb-6 mt-2">
                            <h2 className="text-xl font-semibold text-gray-800 mb-1">
                                {t('selectLangMsg', 'English')}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {t('changeAnytime', 'English')}
                            </p>
                        </div>

                        {/* 3. Language Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            {LANGUAGES.map((lang) => {
                                const isSelected = formData.language === lang.code;
                                return (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleLanguageSelect(lang.code)}
                                        className={`
                                            relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 touch-manipulation min-h-[110px]
                                            ${isSelected 
                                                ? 'border-emerald-500 bg-emerald-50 shadow-md scale-[1.02]' 
                                                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}
                                        `}
                                    >
                                        {/* Selection Checkmark */}
                                        {isSelected && (
                                            <div className="absolute top-3 right-3 text-emerald-600">
                                                <CheckCircle2 size={20} fill="currentColor" className="text-white" />
                                            </div>
                                        )}

                                        {/* Speaker Icon (Visual Only) */}
                                        <div className="absolute top-3 left-3 text-gray-300">
                                            <Volume2 size={16} />
                                        </div>

                                        <span className="text-2xl font-bold text-gray-800 mb-1 mt-2">
                                            {lang.native}
                                        </span>
                                        <span className={`text-xs font-medium uppercase tracking-wide ${isSelected ? 'text-emerald-700' : 'text-gray-500'}`}>
                                            {lang.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </main>

            {/* 4. Footer Actions */}
            {!isLoading && (
                <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-6 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20">
                    <div className="max-w-lg mx-auto w-full space-y-4">
                        
                        {/* Remember Me Checkbox */}
                        <label className="flex items-center gap-3 cursor-pointer select-none group">
                             <div className="relative flex items-center">
                                <input 
                                    type="checkbox" 
                                    className="peer sr-only"
                                    checked={rememberLanguage}
                                    onChange={(e) => setRememberLanguage(e.target.checked)}
                                />
                                {rememberLanguage ? (
                                    <CheckSquare size={20} className="text-emerald-600" />
                                ) : (
                                    <Square size={20} className="text-gray-400 group-hover:text-gray-600" />
                                )}
                             </div>
                             <div className="flex flex-col">
                                 <span className="text-sm font-medium text-gray-800">{t('rememberLang', formData.language || 'English')}</span>
                                 <span className="text-[10px] text-gray-400">{t('defaultDevice', formData.language || 'English')}</span>
                             </div>
                        </label>

                        {/* Continue Button */}
                        <button
                            onClick={handleFinalContinue}
                            disabled={!formData.language}
                            className={`
                                w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95
                                ${formData.language 
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200' 
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'}
                            `}
                        >
                            {t('continue', formData.language || 'English')} <ArrowRight size={22} />
                        </button>

                        <button 
                            onClick={() => {
                                setFormData({...formData, language: 'English'});
                                setTimeout(() => onLogin({...formData, language: 'English'}), 500);
                            }}
                            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 font-medium py-1"
                        >
                            {t('skipNow', 'English')}
                        </button>
                    </div>
                </footer>
            )}
        </div>
      );
  }

  // --- EXISTING AUTH FLOW RENDER ---

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 flex items-center justify-center p-4 font-sans">
      
      {/* Account Chooser Modal */}
      {showAccountChooser && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-800">Choose an account</h3>
                      <button onClick={() => setShowAccountChooser(false)} className="text-gray-400 hover:text-gray-600">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-2">
                      <p className="px-4 py-2 text-sm text-gray-500">to continue to Jugaad-AI</p>
                      <div className="space-y-1">
                          {MOCK_ACCOUNTS.map((acc, idx) => (
                              <button 
                                key={idx}
                                onClick={() => handleAccountSelect(acc)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                              >
                                  {acc.img ? (
                                      <img src={acc.img} alt={acc.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                  ) : (
                                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold border border-emerald-200">
                                          {acc.name[0]}
                                      </div>
                                  )}
                                  <div>
                                      <p className="text-sm font-semibold text-gray-800">{acc.name}</p>
                                      <p className="text-xs text-gray-500">{acc.email}</p>
                                  </div>
                              </button>
                          ))}
                          <button 
                             onClick={() => { setShowAccountChooser(false); }}
                             className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                          >
                             <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                                 <User size={20} />
                             </div>
                             <p className="text-sm font-semibold text-gray-700">Use another account</p>
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        
        {/* Left Side - Hero / Info */}
        <div className="md:w-1/2 p-8 bg-emerald-50 flex flex-col justify-between relative overflow-hidden">
          {/* Decorative Circle */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100 rounded-full translate-x-1/2 -translate-y-1/2 opacity-50"></div>
          
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-emerald-600 p-2 rounded-lg shadow-lg text-white">
                <Store size={32} />
              </div>
              <h1 className="text-3xl font-bold text-emerald-900 tracking-tight">Jugaad-AI</h1>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Your Smart Shop Assistant
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Manage your inventory, track sales, and digitize your ledger just by talking or sending photos.
            </p>

            <ul className="space-y-4">
              {[
                "Voice-first inventory tracking",
                "Scan handwritten ledgers",
                "Easy Sales & Expense Reports",
                "Available in 10+ Indian Languages"
              ].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3 text-gray-700 font-medium">
                  <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Side - Forms */}
        <div className="md:w-1/2 p-8 md:p-12 bg-white flex flex-col justify-center">
          
          {step === 'auth' ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h3>
                <p className="text-gray-500">Access your digital dukaan.</p>
              </div>

              <div className="space-y-4">
                 <button 
                  onClick={handleSocialLogin}
                  className="w-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-colors relative overflow-hidden group"
                >
                  <Chrome size={20} className="text-blue-500" /> 
                  <span>Continue with Google</span>
                </button>
                <button 
                  onClick={handleSocialLogin}
                  className="w-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-colors"
                >
                  <Grip size={20} className="text-orange-500" /> 
                  <span>Continue with Microsoft</span>
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">Or with email</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="email" 
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                        placeholder="name@example.com"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    Continue <ArrowRight size={20} />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="mb-6">
                <button onClick={() => setStep('auth')} className="text-sm text-emerald-600 hover:underline mb-2">Back</button>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Setup Profile</h3>
                <p className="text-gray-500">Tell us about your shop.</p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-5">
                
                {/* Email Display */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Signed in as</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="email" 
                        disabled
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 focus:outline-none cursor-not-allowed"
                        value={formData.email}
                      />
                    </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Shop Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    placeholder="e.g. Sharma General Store"
                    value={formData.shopName}
                    onChange={e => setFormData({...formData, shopName: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Owner Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    placeholder="e.g. Rahul Sharma"
                    value={formData.ownerName}
                    onChange={e => setFormData({...formData, ownerName: e.target.value})}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
                >
                  Next <ArrowRight size={20} />
                </button>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
