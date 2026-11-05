import NotFound from './NotFound';
import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Phone, Lock, Shield, BarChart3, Zap, Download, Eye, EyeOff } from 'lucide-react';
import { getCurrentPortal } from '@/utils/portalConfig';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [mpin, setMpin] = useState('');
  const currentPortal = getCurrentPortal();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [agree, setAgree] = useState(true);
  const [loginStep, setLoginStep] = useState<'phone' | 'mpin'>('phone');
  const [mpinDigits, setMpinDigits] = useState(['', '', '', '']);
  const logo = '/Finonest%20logo.png';

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    setIsStandalone(standalone);
  }, []);

  const handleDigitChange = (value: string, idx: number) => {
    const cleanValue = value.slice(-1).replace(/\D/g, '');
    const newDigits = [...mpinDigits];
    newDigits[idx] = cleanValue;
    setMpinDigits(newDigits);
    setMpin(newDigits.join(''));
    if (cleanValue && idx < 3) {
      const nextInput = document.getElementById(`mpin-digit-${idx + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace') {
      const newDigits = [...mpinDigits];
      if (!mpinDigits[idx] && idx > 0) {
        newDigits[idx - 1] = '';
        setMpinDigits(newDigits);
        setMpin(newDigits.join(''));
        const prevInput = document.getElementById(`mpin-digit-${idx - 1}`);
        if (prevInput) {
          prevInput.focus();
        }
      } else {
        newDigits[idx] = '';
        setMpinDigits(newDigits);
        setMpin(newDigits.join(''));
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) { toast.error('Please enter your phone number'); return; }
    if (!mpin) { toast.error('Please enter your MPIN'); return; }
    if (phone.length !== 10) { toast.error('Please enter a valid 10-digit phone number'); return; }
    if (mpin.length !== 4) { toast.error('Please enter a valid 4-digit MPIN'); return; }
    setLoading(true);

    try {
      const result = await login(phone, mpin);
      setLoading(false);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Login successful');
        navigate('/');
      }
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || 'Invalid credentials');
    }
  };

  const features = [
    { icon: <Shield size={22} />, title: 'Role-Based Access', desc: 'Multi-level permissions for admins, managers, brokers & employees' },
    { icon: <BarChart3 size={22} />, title: 'Real-Time Analytics', desc: 'Track applications, commissions & performance metrics live' },
    { icon: <Zap size={22} />, title: 'Streamlined Workflow', desc: 'Application to disbursement with full document tracking' },
  ];

  if (!currentPortal) {
    return <NotFound />;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      {/* ─── DESKTOP LAYOUT ─── */}
      <div className="hidden lg:flex min-h-[100dvh] bg-transparent w-full">
        {/* ─── LEFT PANEL (DESKTOP) ─── */}
        <div className="lg:flex lg:w-[52%] relative overflow-hidden glass-panel m-4 lg:mr-2 rounded-[2.5rem]">
          <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full h-full">
            <div className="flex items-center gap-3.5">
              <img src={logo} alt="Finonest India" className="h-14 w-auto object-contain drop-shadow-md" />
            </div>

            <div className="flex-1 flex flex-col justify-center -mt-8">
              <h1 className="text-4xl xl:text-[2.75rem] font-extrabold text-gray-900 dark:text-white leading-[1.15] mb-4 tracking-tight drop-shadow-sm">
                Car Loan Sales<br />
                <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                  & Management
                </span>
              </h1>
              <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed max-w-sm mb-8 font-medium">
                Complete loan lifecycle management — from lead generation to disbursement, all in one powerful platform.
              </p>

              <div className="space-y-3.5">
                {features.map(f => (
                  <div key={f.title} className="flex items-start gap-3 group">
                    <div className="shrink-0 w-9 h-9 rounded-xl glass-card flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-white/40 dark:group-hover:bg-white/10 transition-all duration-300 shadow-sm border border-white/50 dark:border-white/10">
                      {f.icon}
                    </div>
                    <div className="pt-0.5">
                      <h3 className="text-gray-900 dark:text-white text-sm font-semibold mb-0.5">{f.title}</h3>
                      <p className="text-gray-600 dark:text-slate-400 text-xs leading-relaxed font-medium">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>


            </div>

            <p className="text-gray-500 dark:text-slate-400 text-xs font-medium">© 2025 Finonest India. All rights reserved.</p>
          </div>
        </div>

        {/* ─── RIGHT PANEL (FORM) ─── */}
        <div className="flex-1 flex items-center justify-center bg-transparent"
          style={{
            padding: 'max(1.25rem, env(safe-area-inset-top)) max(1.25rem, env(safe-area-inset-right)) max(1.25rem, env(safe-area-inset-bottom)) max(1.25rem, env(safe-area-inset-left))',
            minHeight: '100dvh',
          }}
        >
          <div className="w-full max-w-[420px]">
            <div className="lg:hidden flex flex-col items-center mb-8">
              <img src={logo} alt="Finonest India" className="h-14 w-auto object-contain drop-shadow-md mb-3" />
            </div>



            {/* Card */}
            <div className="glass-card p-7 sm:p-8 shadow-xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight drop-shadow-sm">Sign In</h2>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5 drop-shadow-sm">Phone Number</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setPhone(value);
                        }}
                      placeholder="10-digit phone number"
                      maxLength={10}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5 drop-shadow-sm">MPIN</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={mpin}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setMpin(value);
                        }}
                      placeholder="4-digit MPIN"
                      maxLength={4}
                      className="w-full pl-10 pr-11 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-mpin')}
                    className="text-xs text-blue-700 dark:text-blue-400 font-semibold hover:underline underline-offset-2"
                  >
                    Forgot MPIN?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl text-white text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-r from-[#60a5fa] to-[#2563eb] hover:from-[#3b82f6] hover:to-[#1d4ed8] lg:bg-none lg:bg-[#1D4ED8] lg:hover:bg-[#1e40af] border-none"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in…
                    </div>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={16} />
                    </>
                  )}

                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-gray-200/50 dark:border-gray-700/50 text-center">
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium tracking-wide">
                  Internal Staff Portal • Authorized Access Only
                </p>
              </div>
            </div>

            <p className="text-center text-xs text-gray-500 dark:text-slate-400 mt-5 font-medium drop-shadow-sm">
              Secured with end-to-end encryption
            </p>
          </div>
        </div>
      </div>

      {/* ─── MOBILE LAYOUT (PHONE UI MATCHING MOCKUP) ─── */}
      <div className="lg:hidden flex flex-col min-h-[100dvh] w-full bg-white font-sans relative">
        {/* Blue Header Section */}
        <div className="bg-gradient-to-tr from-[#829CF8] to-[#DBE2FF] h-[34vh] min-h-[220px] w-full flex items-center justify-center relative shadow-[0_8px_30px_rgba(125,155,255,0.3)]">
          <div className="flex flex-col items-center gap-2">
            <img src={logo} alt="Finonest India" className="h-16 w-auto object-contain brightness-0 invert drop-shadow-md" />
          </div>
        </div>

        {/* Form Container (white card overlapping the header) */}
        <div className="flex-1 px-5 -mt-10 relative z-10">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.06)] border border-slate-100 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading">Sign In</h2>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-2.5 px-1 max-w-[280px] mx-auto">
                {loginStep === 'phone'
                  ? 'Earn more with Finonest by offering Personal Loans, Used Car Loans and Home Loans'
                  : 'Enter your 4-digit MPIN to log in and keep your account safe and secure.'}
              </p>
            </div>

            {loginStep === 'phone' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (phone.length === 10) {
                    setLoginStep('mpin');
                    } else {
                    toast.error('Please enter a valid 10-digit mobile number');
                  }
                }}
                className="space-y-6"
              >
                {/* Phone Input */}
                <div className="relative">
                  <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold tracking-wide transition-all">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(value);
                      }}
                    placeholder="9983077289"
                    maxLength={10}
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:border-[#7D9BFF] transition-all bg-white focus:ring-1 focus:ring-[#7D9BFF]"
                  />
                </div>

                {/* Secure disclaimer box */}
                <div className="bg-[#F4F7FF] rounded-2xl p-4">
                  <p className="text-[10px] text-slate-500 text-center leading-normal font-bold">
                    We keep your details secure and do not share with others without your permission.
                  </p>
                </div>

                {/* Agreement checkbox */}
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="agreement-mob"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#7D9BFF] focus:ring-[#7D9BFF] focus:ring-offset-0 shrink-0 accent-[#7D9BFF]"
                  />
                  <label htmlFor="agreement-mob" className="text-[9.5px] text-slate-500 leading-normal font-semibold">
                    I hereby agree to the <span className="text-[#FF7A00] font-bold cursor-pointer hover:underline">Terms of Finonest</span> & <span className="text-[#FF7A00] font-bold cursor-pointer hover:underline">Privacy Policy</span> and to receive communication via SMS, Voice, and Email from Finonest.
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !agree}
                  className="w-full py-4 rounded-2xl text-white text-xs font-bold bg-[#7D9BFF] hover:bg-[#6A8AFF] active:scale-[0.98] transition-all shadow-[0_8px_20px_rgba(125,155,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border-none cursor-pointer"
                >
                  Submit
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-6">
                {/* 4 separate custom digit inputs */}
                <div className="flex justify-center gap-3.5 my-6">
                  {mpinDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`mpin-digit-${idx}`}
                      type="password"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(e.target.value, idx)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      className="w-12 h-12 rounded-xl border border-slate-200 text-center text-lg font-bold text-slate-800 focus:outline-none focus:border-[#7D9BFF] focus:ring-1 focus:ring-[#7D9BFF] transition-all bg-white"
                    />
                  ))}
                </div>

                {/* Secure disclaimer box */}
                <div className="bg-[#F4F7FF] rounded-2xl p-4">
                  <p className="text-[10px] text-slate-500 text-center leading-normal font-bold">
                    We keep your details secure and do not share with others without your permission.
                  </p>
                </div>

                {/* Agreement checkbox */}
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="agreement-mob"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#7D9BFF] focus:ring-[#7D9BFF] focus:ring-offset-0 shrink-0 accent-[#7D9BFF]"
                  />
                  <label htmlFor="agreement-mob" className="text-[9.5px] text-slate-500 leading-normal font-semibold">
                    I hereby agree to the <span className="text-[#FF7A00] font-bold cursor-pointer hover:underline">Terms of Finonest</span> & <span className="text-[#FF7A00] font-bold cursor-pointer hover:underline">Privacy Policy</span> and to receive communication via SMS, Voice, and Email from Finonest.
                  </label>
                </div>

                {/* Submit / Login Button */}
                <button
                  type="submit"
                  disabled={loading || !agree || mpin.length !== 4}
                  className="w-full py-4 rounded-2xl text-white text-xs font-bold bg-[#7D9BFF] hover:bg-[#6A8AFF] active:scale-[0.98] transition-all shadow-[0_8px_20px_rgba(125,155,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border-none cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </div>
                  ) : 'Submit'}
                </button>

                {/* Forgot MPIN? Reset here */}
                <div className="text-center mt-4">
                  <p className="text-xs text-slate-500 font-semibold">
                    Forgot MPIN?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/forgot-mpin');
                      }}
                      className="text-[#FF7A00] font-bold hover:underline cursor-pointer bg-transparent border-none"
                    >
                      Reset here
                    </button>
                  </p>
                </div>
              </form>
            )}

            <div className="mt-5 text-center">
              <p className="text-xs text-slate-500 font-medium tracking-wide">
                Internal Staff Portal • Authorized Access Only
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
