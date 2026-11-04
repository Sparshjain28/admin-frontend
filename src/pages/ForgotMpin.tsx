import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Lock, Shield, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotMpin() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newMpin, setNewMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [loading, setLoading] = useState(false);
  const logo = '/Finonest%20logo.png';

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/forgot-mpin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        toast.success('OTP sent to your phone number');
        setStep(2);
      } else {
        toast.error(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      setLoading(false);
      toast.error('An error occurred. Please try again.');
    }
  };

  const handleResetMpin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    if (newMpin.length !== 4) {
      toast.error('MPIN must be 4 digits');
      return;
    }
    if (newMpin !== confirmMpin) {
      toast.error('MPINs do not match');
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/reset-mpin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, newMpin })
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        toast.success('MPIN reset successfully!');
        setStep(3);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        toast.error(data.message || 'Failed to reset MPIN');
      }
    } catch (err) {
      setLoading(false);
      toast.error('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      {/* ─── DESKTOP LAYOUT ─── */}
      <div className="hidden lg:flex min-h-screen items-center justify-center p-5 bg-transparent w-full">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="Finonest India" className="h-14 w-auto object-contain drop-shadow-md mb-3" />
          </div>

          <div className="glass-card p-7 sm:p-8 shadow-xl">
            <div className="mb-6">
              <button
                onClick={() => step === 1 ? navigate('/login') : setStep(step - 1)}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight drop-shadow-sm">
                {step === 1 && 'Forgot MPIN'}
                {step === 2 && 'Reset MPIN'}
                {step === 3 && 'Success!'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {step === 1 && 'Enter your phone number to receive OTP'}
                {step === 2 && 'Enter OTP and set new MPIN'}
                {step === 3 && 'Your MPIN has been reset successfully'}
              </p>
            </div>

            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit phone number"
                      maxLength={10}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl text-white text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-r from-[#60a5fa] to-[#2563eb] hover:from-[#3b82f6] hover:to-[#1d4ed8] lg:bg-none lg:bg-[#1D4ED8] lg:hover:bg-[#1e40af] border-none"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending OTP…
                    </div>
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleResetMpin} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">OTP</label>
                  <div className="relative">
                    <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                    <input
                      type="tel"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit OTP"
                      maxLength={6}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">New MPIN</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                    <input
                      type="password"
                      value={newMpin}
                      onChange={(e) => setNewMpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="4-digit MPIN"
                      maxLength={4}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">Confirm MPIN</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                    <input
                      type="password"
                      value={confirmMpin}
                      onChange={(e) => setConfirmMpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="Confirm 4-digit MPIN"
                      maxLength={4}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl text-white text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-r from-[#60a5fa] to-[#2563eb] hover:from-[#3b82f6] hover:to-[#1d4ed8] lg:bg-none lg:bg-[#1D4ED8] lg:hover:bg-[#1e40af] border-none"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Resetting…
                    </div>
                  ) : (
                    'Reset MPIN'
                  )}
                </button>
              </form>
            )}

            {step === 3 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Redirecting to login page...
                </p>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-gray-200/50 dark:border-gray-700/50 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Remember your MPIN?{' '}
                <Link to="/login" className="text-blue-700 dark:text-blue-400 font-bold hover:underline underline-offset-2">
                  Login
                </Link>
              </p>
            </div>
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
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading">
                {step === 1 && 'Forgot MPIN?'}
                {step === 2 && 'Reset MPIN'}
                {step === 3 && 'Success!'}
              </h2>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-2.5 px-1 max-w-[280px] mx-auto">
                {step === 1 && "Don't worry, we'll help you reset it. Enter your registered mobile number to get started."}
                {step === 2 && 'Enter the OTP sent to your phone and choose a new 4-digit MPIN.'}
                {step === 3 && 'Your MPIN has been reset successfully.'}
              </p>
            </div>

            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-6">
                {/* Phone Input */}
                <div className="relative">
                  <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold tracking-wide transition-all">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
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

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl text-white text-xs font-bold bg-[#7D9BFF] hover:bg-[#6A8AFF] active:scale-[0.98] transition-all shadow-[0_8px_20px_rgba(125,155,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border-none cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending OTP...
                    </div>
                  ) : 'Send OTP'}
                </button>

                {/* Back to Login link */}
                <div className="text-center mt-4">
                  <p className="text-xs text-slate-500 font-semibold">
                    Back to{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="text-[#FF7A00] font-bold hover:underline cursor-pointer bg-transparent border-none"
                    >
                      Login
                    </button>
                  </p>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleResetMpin} className="space-y-6">
                {/* OTP Input */}
                <div className="relative">
                  <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold tracking-wide transition-all">
                    Enter OTP
                  </label>
                  <input
                    type="tel"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:border-[#7D9BFF] transition-all bg-white focus:ring-1 focus:ring-[#7D9BFF]"
                  />
                </div>

                {/* New MPIN Input */}
                <div className="relative">
                  <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold tracking-wide transition-all">
                    New MPIN
                  </label>
                  <input
                    type="password"
                    value={newMpin}
                    onChange={(e) => setNewMpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Enter new 4-digit MPIN"
                    maxLength={4}
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:border-[#7D9BFF] transition-all bg-white focus:ring-1 focus:ring-[#7D9BFF]"
                  />
                </div>

                {/* Confirm MPIN Input */}
                <div className="relative">
                  <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold tracking-wide transition-all">
                    Confirm MPIN
                  </label>
                  <input
                    type="password"
                    value={confirmMpin}
                    onChange={(e) => setConfirmMpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Confirm new 4-digit MPIN"
                    maxLength={4}
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:border-[#7D9BFF] transition-all bg-white focus:ring-1 focus:ring-[#7D9BFF]"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl text-white text-xs font-bold bg-[#7D9BFF] hover:bg-[#6A8AFF] active:scale-[0.98] transition-all shadow-[0_8px_20px_rgba(125,155,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border-none cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Resetting...
                    </div>
                  ) : 'Reset MPIN'}
                </button>

                {/* Back to Login link */}
                <div className="text-center mt-4">
                  <p className="text-xs text-slate-500 font-semibold">
                    Back to{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="text-[#FF7A00] font-bold hover:underline cursor-pointer bg-transparent border-none"
                    >
                      Login
                    </button>
                  </p>
                </div>
              </form>
            )}

            {step === 3 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Redirecting to login page...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
