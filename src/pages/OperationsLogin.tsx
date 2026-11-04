import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Phone, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function OperationsLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [mpin, setMpin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const logo = '/Finonest%20logo.png';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) { setError('Please enter your phone number'); return; }
    if (!mpin) { setError('Please enter your MPIN'); return; }
    if (phone.length !== 10) { setError('Please enter a valid 10-digit phone number'); return; }
    if (mpin.length !== 4) { setError('Please enter a valid 4-digit MPIN'); return; }

    setLoading(true);
    setError('');

    try {
      const result = await login(phone, mpin);
      setLoading(false);
      if (result?.error) {
        setError('Account pending verification. Please contact admin.');
        return;
      }
      // Only allow operation_team and loan_operations role — check from login result
      if (result?.user?.role !== 'operation_team' && result?.user?.role !== 'loan_operations') {
        setError('Access denied. This portal is for Operations Team only.');
        localStorage.removeItem('auth_token');
        return;
      }
      navigate('/ops/dashboard');
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'An error occurred during login');
    }
  };

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900"
      style={{
        padding: 'max(1.25rem, env(safe-area-inset-top)) max(1.25rem, env(safe-area-inset-right)) max(1.25rem, env(safe-area-inset-bottom)) max(1.25rem, env(safe-area-inset-left))',
      }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 75% 75%, #1d4ed8 0%, transparent 50%)' }}
      />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={logo} alt="Finonest India" className="h-12 w-auto object-contain mx-auto mb-4 drop-shadow-lg" />
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold px-3 py-1.5 rounded-full mb-3">
            <ShieldCheck size={13} />
            OPERATIONS PORTAL
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Operations Login</h1>
          <p className="text-slate-400 text-sm mt-1">Restricted access — Operations Team only</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-7 shadow-2xl">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
              <p className="text-red-300 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                  placeholder="10-digit phone number"
                  maxLength={10}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/40 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">MPIN</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={mpin}
                  onChange={(e) => { setMpin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                  placeholder="4-digit MPIN"
                  maxLength={4}
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl text-white text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-r from-blue-600 to-blue-700 border border-blue-500/30 mt-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </div>
              ) : (
                <>Sign In <ArrowRight size={15} /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-5">
          © 2025 Finonest India · Secured with end-to-end encryption
        </p>
      </div>
    </div>
  );
}
