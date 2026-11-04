import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { User, CreditCard, FileText, MapPin, CheckCircle, XCircle, Eye, EyeOff, Calendar, Users, Pencil, Check, X, Camera, Upload, Shield, ArrowLeft, Phone, Mail, Building, Home, Code, Landmark, Wallet, Activity, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { CardFront, CardBack } from '@/components/IDCard';
import html2canvas from 'html2canvas';
import { cleanupDigilocker } from '@/lib/digilockerCleanup';


function formatDisplayDate(dateStr?: any) {
  if (!dateStr || dateStr === '—') return '—';
  let clean = String(dateStr).trim();
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(clean)) {
    const parts = clean.split(/[-/]/);
    clean = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  const d = new Date(clean);
  if (isNaN(d.getTime())) return typeof dateStr === 'string' ? dateStr : '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDisplayGender(gender?: string) {
  if (!gender || gender === '—') return '—';
  const g = gender.trim().toUpperCase();
  if (g === 'M' || g === 'MALE') return 'Male';
  if (g === 'F' || g === 'FEMALE') return 'Female';
  if (g === 'O' || g === 'OTHER') return 'Other';
  return gender;
}

function formatDisplayAadhaar(val?: string) {
  if (!val || val === '—') return '—';
  const clean = val.replace(/\s+/g, '');
  if (clean.length >= 4) {
    return `XXXX XXXX ${clean.slice(-4)}`;
  }
  return val;
}

export default function UserProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [verifyingPan, setVerifyingPan] = useState(false);
  const [verifyingAadhaar, setVerifyingAadhaar] = useState(false);
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [showPanForm, setShowPanForm] = useState(false);
  const [showAadhaarForm, setShowAadhaarForm] = useState(false);
  const [showAadhaarOtpForm, setShowAadhaarOtpForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"personal" | "bank" | "idcard">("personal");
  const [aadhaarSessionId, setAadhaarSessionId] = useState<string>('');
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [verifyingAadhaarOtp, setVerifyingAadhaarOtp] = useState(false);
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');
  const [verifyingBank, setVerifyingBank] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // DigiLocker — this page had no DigiLocker option at all (unlike Signup
  // and ProfileSetup, which both use it); PAN/Aadhaar here were manual-only
  // (PAN via /kyc/verify-pan, Aadhaar via a separate OTP flow). Added the
  // same widget so an existing user can (re-)verify via DigiLocker too,
  // without removing the manual paths.
  const [digilockerStatus, setDigilockerStatus] = useState<string>('Initializing DigiLocker...');
  const [digilockerVerified, setDigilockerVerified] = useState(false);

  useEffect(() => {
    api.get('/auth/profile?t=' + Date.now())
      .then((data) => { 
        setProfile(data); 
        setPhoneValue(data.phone || ''); 
        setPanNumber(data.kyc?.pan_number || '');
        setAadhaarNumber(data.kyc?.aadhaar_number || '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let isMounted = true;
    cleanupDigilocker('#userprofile-digilocker-btn-container');

    const initSdk = async () => {
      try {
        setDigilockerStatus('Loading SDK script...');
        const loadScript = () => new Promise((resolve) => {
          if ((window as any).DigiboostSdk) return resolve(true);
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/gh/surepassio/surepass-digiboost-web-sdk@latest/index.min.js';
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.head.appendChild(script);
        });

        const scriptLoaded = await loadScript();
        if (!isMounted) return;
        if (!scriptLoaded) {
          setDigilockerStatus('Error: Failed to load SDK from network.');
          return;
        }

        setDigilockerStatus('Fetching secure token...');
        const response = await api.post('/auth/digilocker/init', {});
        if (!isMounted) return;

        if (response.success && response.token) {
          if (typeof (window as any).DigiboostSdk !== 'undefined') {
            setDigilockerStatus('Ready!');

            setTimeout(() => {
              if (!isMounted) return;
              const container = document.querySelector('#userprofile-digilocker-btn-container');
              if (!container) return;

              cleanupDigilocker('#userprofile-digilocker-btn-container');

              (window as any).DigiboostSdk({
                gateway: 'production',
                token: response.token,
                selector: '#userprofile-digilocker-btn-container',
                style: {
                  backgroundColor: "#2563EB",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: "600",
                  width: "100%",
                },
                onSuccess: async (data: any) => {
                  const fetchId = toast.loading('Fetching KYC details from DigiLocker...');
                  try {
                    const fetchRes = await api.post('/auth/digilocker/fetch', { client_id: data.client_id });
                    if (fetchRes.success && (fetchRes.aadhaarData || fetchRes.panData)) {
                      let anyVerified = false;

                      if (fetchRes.aadhaarData) {
                        const aadhaar = fetchRes.aadhaarData;
                        const effectiveAadhaarNum = aadhaar.masked_aadhaar || aadhaar.aadhaar_number || undefined;
                        try {
                          await api.put('/auth/profile', {
                            full_name: aadhaar.full_name || undefined,
                            aadhaar_number: effectiveAadhaarNum,
                            aadhaar_data: aadhaar,
                            aadhaar_verified: true,
                            date_of_birth: aadhaar.dob || undefined,
                            gender: aadhaar.gender === 'M' ? 'Male' : aadhaar.gender === 'F' ? 'Female' : aadhaar.gender || undefined,
                            address_line1: aadhaar.full_address || undefined,
                            state: aadhaar.state || aadhaar.address?.state || undefined,
                            city: aadhaar.district || aadhaar.address?.dist || undefined,
                            pincode: aadhaar.pin || aadhaar.address?.pc || aadhaar.zip || undefined,
                          });
                          setAadhaarNumber(effectiveAadhaarNum || '');
                          anyVerified = true;
                        } catch (e: any) {
                          toast.error(e.message || 'Failed to save Aadhaar details');
                        }
                      }

                      if (fetchRes.panData) {
                        const pan = fetchRes.panData.pan_number || fetchRes.panData.pan || fetchRes.panData.id_number;
                        if (pan) {
                          const verified = await handleVerifyPan(pan);
                          anyVerified = anyVerified || !!verified;
                        }
                      }

                      if (anyVerified) {
                        toast.success('KYC details verified via DigiLocker!', { id: fetchId });
                        setDigilockerStatus('DigiLocker Verification Complete');
                        setDigilockerVerified(true);
                        setTimeout(() => {
                          api.get('/auth/profile?t=' + Date.now())
                            .then((data) => setProfile(data))
                            .catch(console.error);
                        }, 1000);
                      } else {
                        throw new Error(fetchRes.error || 'Failed to verify PAN/Aadhaar via DigiLocker');
                      }
                    } else {
                      throw new Error(fetchRes.error || 'Failed to fetch details from DigiLocker');
                    }
                  } catch (err: any) {
                    setDigilockerStatus(`Error: ${err.message || 'Failed to fetch KYC details'}`);
                    toast.error(err.message || 'Error fetching KYC details', { id: fetchId });
                  }
                },
                onFailure: (error: any) => {
                  console.error("DigiLocker verification failed:", error);
                  setDigilockerStatus(`Verification failed: ${error?.message || error || 'cancelled'}`);
                  toast.error("DigiLocker verification failed or was cancelled.");
                }
              });
            }, 100);
          } else {
            setDigilockerStatus("Error: DigiboostSdk is not defined on window.");
          }
        } else {
          setDigilockerStatus(`Error: ${response.error || "Failed to init session"}`);
        }
      } catch (err: any) {
        setDigilockerStatus(`Error: ${err.message || "Failed to start DigiLocker"}`);
      }
    };

    initSdk();

    return () => {
      isMounted = false;
      cleanupDigilocker('#userprofile-digilocker-btn-container');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5MB'); return; }
    setUploadingPhoto(true);
    try {
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`/api/auth/profile/photo`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = null; }
      if (!res.ok || !data || !data.success) {
        toast.error(data?.error || `Upload failed (${res.status})`);
        return;
      }
      setProfile((prev: any) => ({ ...prev, photo_path: data.photo_path }));
      toast.success('Photo updated!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleSavePhone = async () => {
    if (!phoneValue || phoneValue.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setSavingPhone(true);
    try {
      await api.put('/auth/profile/phone', { phone: phoneValue });
      setProfile((prev: any) => ({ ...prev, phone: phoneValue }));
      setEditingPhone(false);
      toast.success('Mobile number updated!');
    } catch {
      toast.error('Failed to update mobile number');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleVerifyPan = async (panOverride?: string) => {
    const panToVerify = panOverride || panNumber;
    if (!panToVerify || panToVerify.length !== 10) {
      toast.error('Please enter a valid 10-character PAN number');
      return false;
    }
    if (panOverride) setPanNumber(panOverride);
    setVerifyingPan(true);
    try {
      const response = await api.post('/kyc/verify-pan', { pan_number: panToVerify, save_to_profile: true });
if (response.success) {
        setShowPanForm(false);
        toast.success('PAN verified successfully! Name updated from PAN.');

        setTimeout(() => {
          api.get('/auth/profile?t=' + Date.now())
            .then((data) => {
setProfile(data);
              setPanNumber(data.kyc?.pan_number || '');
            })
            .catch((err) => {
toast.error('Failed to refresh profile');
            });
        }, 1000);
        return true;
      } else {
        toast.error(response.message || response.error || 'PAN verification failed');
      }
    } catch (error: any) {
toast.error(error.message || 'Failed to verify PAN');
    } finally {
      setVerifyingPan(false);
    }
    return false;
  };

  const handleVerifyAadhaar = async () => {
    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      toast.error('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    setVerifyingAadhaar(true);
    try {
      const response = await api.post('/kyc/verify-aadhaar', { aadhaar_number: aadhaarNumber });
if (response.success && response.requiresOtp) {
setAadhaarSessionId(response.sessionId || '');
        setShowAadhaarForm(false);
        setShowAadhaarOtpForm(true);
        toast.success('OTP sent to your Aadhaar linked mobile number');
      } else if (response.success) {
        setShowAadhaarForm(false);
        toast.success('Aadhaar verified successfully!');
        setTimeout(() => {
          api.get('/auth/profile?t=' + Date.now())
            .then((data) => { 
              setProfile(data); 
              setAadhaarNumber(data.kyc?.aadhaar_number || '');
            })
            .catch(console.error);
        }, 500);
      } else {
        toast.error(response.message || 'Aadhaar verification failed');
      }
    } catch (error: any) {
toast.error(error.message || 'Failed to verify Aadhaar');
    } finally {
      setVerifyingAadhaar(false);
    }
  };

  const handleVerifyBank = async () => {
    if (!bankAccountNumber || !bankIfscCode) {
      toast.error('Please enter account number and IFSC code');
      return;
    }
    setVerifyingBank(true);
    try {
      const response = await api.post('/kyc/verify-bank', {
        id_number: bankAccountNumber,
        ifsc: bankIfscCode
      });
      if (response.success && response.data) {
        toast.success('Bank account verified successfully!');
        
        // Update user profile with verified bank details
        await api.put('/auth/profile', {
          bank_account_number: bankAccountNumber,
          bank_ifsc_code: bankIfscCode,
          bank_name: response.data.ifsc_details?.bank_name || response.data.bank_name,
          bank_account_holder: response.data.full_name,
          bank_verified: true,
          bank_data: response.data
        });
        
        setShowBankForm(false);
        
        // Refresh profile
        setTimeout(() => {
          api.get('/auth/profile?t=' + Date.now())
            .then((data) => setProfile(data))
            .catch(console.error);
        }, 500);
      } else {
        toast.error(response.error || 'Bank verification failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify bank account');
    } finally {
      setVerifyingBank(false);
    }
  };

  const handleVerifyAadhaarOtp = async () => {
    if (!aadhaarOtp || aadhaarOtp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    
    if (!aadhaarSessionId) {
      toast.error('Session ID missing. Please request OTP again.');
return;
    }
    
    setVerifyingAadhaarOtp(true);
    try {
      const payload = {
        session_id: aadhaarSessionId,
        otp: aadhaarOtp,
        aadhaar_number: aadhaarNumber,
        save_to_profile: true
      };
const response = await api.post('/kyc/verify-aadhaar-otp', payload);
if (response.success) {
        setShowAadhaarOtpForm(false);
        setAadhaarOtp('');
        setAadhaarSessionId('');
        toast.success('Aadhaar verified successfully!');
        
        setTimeout(() => {
          api.get('/auth/profile?t=' + Date.now())
            .then((data) => { 
              setProfile(data); 
              setAadhaarNumber(data.kyc?.aadhaar_number || '');
            })
            .catch(console.error);
        }, 500);
      } else {
        toast.error(response.error || 'OTP verification failed');
      }
    } catch (error: any) {
toast.error(error.message || 'Failed to verify OTP');
    } finally {
      setVerifyingAadhaarOtp(false);
    }
  };

  const maskAadhaar = (num: string) => {
    if (!num) return '************';
    return 'XXXX-XXXX-' + num.slice(-4);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#F5F7FA]">
      <div className="w-8 h-8 border-4 border-[#0024A2]/20 border-t-[#0024A2] rounded-full animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="text-center text-gray-500 py-16">Failed to load profile.</div>
  );

  const kyc = profile.kyc || {};

  return (
    <div className="relative w-full min-h-screen bg-[#F8F9FA] font-sans pb-24">
      {/* Header Area with light blue gradient */}
      <div className="bg-gradient-to-b from-[#E8EEFF] to-[#FFFFFF] pt-12 pb-24 relative px-6">
        <div className="flex justify-between items-center max-w-3xl mx-auto">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-[#829CF8] flex items-center justify-center text-white shadow-sm transition-transform active:scale-95">
            <ArrowLeft size={18} className="stroke-[2.5]" />
          </button>
          <h1 className="text-[17px] font-semibold text-slate-900">Profile</h1>
          <button onClick={() => navigate('/profile-setup')} className="w-9 h-9 rounded-full bg-[#829CF8] flex items-center justify-center text-white shadow-sm transition-transform active:scale-95">
            <Pencil size={16} className="stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-3xl mx-auto px-5 relative z-10 -mt-16">
        {/* Avatar and Name */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-[100px] h-[100px] rounded-full bg-[#F97316] flex items-center justify-center text-white border-[5px] border-white shadow-sm overflow-hidden">
              {profile.photo_path ? (
                <img
                  src={profile.photo_path.startsWith('http') ? profile.photo_path : `/${profile.photo_path}`}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <User size={52} className="text-white/90 mt-5" strokeWidth={1.5} />
              )}
            </div>
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#0024A2] text-white flex items-center justify-center shadow-md hover:bg-[#0024A2]/80 transition-colors"
            >
              {uploadingPhoto ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Camera size={14} />
              )}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
          
          <h2 className="text-xl font-bold mt-3 text-slate-800">{profile.name}</h2>
          {/* The name came from the verified PAN. The server also refuses to change it. */}
          {profile.name_locked && (
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500" title="Your name is taken from your verified PAN and cannot be edited">
              <Lock size={11} /> Name locked (verified via PAN)
            </span>
          )}
          <span className="px-3.5 py-1 bg-[#F3E8FF] text-[#7E22CE] rounded-full text-[11px] font-bold tracking-wide mt-1.5 capitalize">
            {profile.role?.replace('_', ' ')}
          </span>
        </div>

        {/* Tabs */}
        <div className="w-full mt-10 flex">
          <button 
            onClick={() => setActiveTab('personal')}
            className={`flex-1 py-3 text-[13px] font-bold transition-all relative rounded-t-[14px] flex items-center justify-center gap-2 ${activeTab === 'personal' ? 'text-[#3B82F6] bg-[#EFF6FF]' : 'text-slate-400 bg-transparent'}`}
          >
            {activeTab === 'personal' && <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />}
            Personal Information
          </button>
          <button 
            onClick={() => setActiveTab('bank')}
            className={`flex-1 py-3 text-[13px] font-bold transition-all relative rounded-t-[14px] flex items-center justify-center gap-2 ${activeTab === 'bank' ? 'text-[#3B82F6] bg-[#EFF6FF]' : 'text-slate-400 bg-transparent'}`}
          >
            {activeTab === 'bank' && <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />}
            Bank Information
          </button>
          <button 
            onClick={() => setActiveTab('idcard')}
            className={`flex-1 py-3 text-[13px] font-bold transition-all relative rounded-t-[14px] flex items-center justify-center gap-2 ${activeTab === 'idcard' ? 'text-[#3B82F6] bg-[#EFF6FF]' : 'text-slate-400 bg-transparent'}`}
          >
            {activeTab === 'idcard' && <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />}
            Business Card
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="w-full bg-white border border-slate-100 rounded-b-2xl rounded-tr-2xl shadow-sm overflow-hidden">
          {activeTab === 'personal' && (
            <div className="p-4 sm:p-6 space-y-4">

              {!(kyc.pan_verified && kyc.aadhaar_verified) && (
                <>
                  {/* Status text in its own div, never inside the SDK's
                      mount container below — see Signup.tsx/ProfileSetup.tsx
                      for why sharing that node with React was a problem. */}
                  <div className="text-xs text-blue-600 font-medium text-center">{digilockerStatus}</div>
                  <div id="userprofile-digilocker-btn-container" className="min-h-[44px] w-full border border-dashed border-blue-300 rounded-xl bg-blue-50/50" />
                  {digilockerVerified && (
                    <div className="w-full flex items-center justify-center gap-2 border border-green-300 rounded-xl py-2.5 bg-green-50 text-green-700 text-sm font-semibold">
                      <span>✅ Verified via DigiLocker</span>
                    </div>
                  )}
                </>
              )}

              <ProfileField icon={Phone} label="MOBILE" value={profile.phone || '—'} />
              <ProfileField icon={Mail} label="EMAIL" value={profile.email || '—'} />
              
              <div className="flex flex-col">
                <ProfileField icon={CreditCard} label="PAN NUMBER" value={kyc.pan_number || '—'} 
                  action={!kyc.pan_verified && (
                    <button onClick={() => setShowPanForm(!showPanForm)} className="text-[11px] font-bold bg-[#EFF6FF] text-[#3B82F6] px-3 py-1 rounded-full">
                      Verify
                    </button>
                  )}
                />
                
                {showPanForm && !kyc.pan_verified && (
                  <div className="pl-14 pr-2 pb-4 mt-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={panNumber}
                        onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
                        placeholder="ABCDE1234F"
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 font-mono"
                        maxLength={10}
                      />
                      <button
                        onClick={() => handleVerifyPan()}
                        disabled={verifyingPan || panNumber.length !== 10}
                        className="px-3 py-2 bg-[#3B82F6] text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50"
                      >
                        {verifyingPan ? '...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col border-t border-slate-100 pt-4">
                <ProfileField icon={FileText} label="AADHAAR NUMBER" value={formatDisplayAadhaar(kyc.aadhaar_number || profile?.aadhaar_number || kyc.aadhaar_data?.masked_aadhaar)} hasBorder={false}
                  action={!kyc.aadhaar_verified && (
                    <button onClick={() => setShowAadhaarForm(!showAadhaarForm)} className="text-[11px] font-bold bg-[#EFF6FF] text-[#3B82F6] px-3 py-1 rounded-full">
                      Verify
                    </button>
                  )}
                />
                
                {showAadhaarForm && !kyc.aadhaar_verified && !showAadhaarOtpForm && (
                  <div className="pl-14 pr-2 pb-4 mt-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aadhaarNumber}
                        onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        placeholder="123456789012"
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 font-mono"
                        maxLength={12}
                      />
                      <button
                        onClick={handleVerifyAadhaar}
                        disabled={verifyingAadhaar || aadhaarNumber.length !== 12}
                        className="px-3 py-2 bg-[#3B82F6] text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50"
                      >
                        {verifyingAadhaar ? '...' : 'Send OTP'}
                      </button>
                    </div>
                  </div>
                )}

                {showAadhaarOtpForm && (
                  <div className="pl-14 pr-2 pb-4 mt-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aadhaarOtp}
                        onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter OTP"
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 text-center tracking-widest font-mono"
                        maxLength={6}
                      />
                      <button
                        onClick={handleVerifyAadhaarOtp}
                        disabled={verifyingAadhaarOtp || aadhaarOtp.length !== 6}
                        className="px-3 py-2 bg-[#3B82F6] text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50"
                      >
                        {verifyingAadhaarOtp ? '...' : 'Verify'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <ProfileField icon={Calendar} label="DATE OF BIRTH" value={formatDisplayDate(kyc.date_of_birth || profile?.date_of_birth)} />
              </div>
              <ProfileField icon={Activity} label="GENDER" value={formatDisplayGender(kyc.gender || profile?.gender)} />
              <ProfileField icon={MapPin} label="STATE" value={kyc.address?.state || '—'} />
              <ProfileField icon={Building} label="CITY" value={kyc.address?.city || '—'} />
              <ProfileField icon={Home} label="FULL ADDRESS" value={
                kyc.address?.line1 || kyc.address?.city || kyc.address?.state
                  ? [kyc.address.line1, kyc.address.line2, kyc.address.city, kyc.address.state, kyc.address.pincode].filter(Boolean).join(', ')
                  : '—'
              } hasBorder={false} />

              {profile.dsa_firm && (
                <div className="mt-2 space-y-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Connected firm</p>
                    <p className="text-[15px] font-bold text-slate-800">{profile.dsa_firm.legal_name || profile.dsa_firm.display_name || '—'}</p>
                  </div>
                  <ProfileField icon={Building} label="DSA DISPLAY NAME" value={profile.dsa_firm.display_name || '—'} />
                  <ProfileField icon={Building} label="BUSINESS TYPE" value={profile.dsa_firm.business_type || '—'} />
                  <ProfileField icon={CreditCard} label="BUSINESS PAN" value={profile.dsa_firm.business_pan || '—'} />
                  <ProfileField icon={User} label="YOUR DESIGNATION" value={profile.dsa_firm.designation || '—'} />
                  <ProfileField icon={FileText} label={profile.dsa_firm.gstin ? 'GSTIN' : 'UDYAM NUMBER'}
                    value={profile.dsa_firm.gstin
                      ? `${profile.dsa_firm.gstin}${profile.dsa_firm.gstin_checked_with_portal ? '' : ' (not checked with the GST portal)'}`
                      : profile.dsa_firm.udyam_number ? `${profile.dsa_firm.udyam_number} (as entered)` : '—'} />
                  <ProfileField icon={Home} label="OFFICE ADDRESS" hasBorder={false}
                    value={[profile.dsa_firm.address, profile.dsa_firm.city, profile.dsa_firm.state, profile.dsa_firm.pincode].filter(Boolean).join(', ') || '—'} />
                </div>
              )}

            </div>
          )}

          {activeTab === 'bank' && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col">
                <ProfileField 
                  icon={Landmark} 
                  label="BANK ACCOUNT" 
                  value={kyc.bank_details?.bank_name || '—'} 
                  action={!kyc.bank_details?.verified && (
                    <button onClick={() => setShowBankForm(!showBankForm)} className="text-[11px] font-bold bg-[#EFF6FF] text-[#3B82F6] px-3 py-1 rounded-full">
                      Verify
                    </button>
                  )}
                />
                
                {showBankForm && !kyc.bank_details?.verified && (
                  <div className="pl-14 pr-2 pb-4 mt-2 border-b border-slate-100">
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Account Number</label>
                        <input
                          type="text"
                          value={bankAccountNumber}
                          onChange={(e) => setBankAccountNumber(e.target.value)}
                          placeholder="Account Number"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">IFSC Code</label>
                        <input
                          type="text"
                          value={bankIfscCode}
                          onChange={(e) => setBankIfscCode(e.target.value.toUpperCase())}
                          placeholder="IFSC Code"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 font-mono"
                        />
                      </div>
                      <button
                        onClick={handleVerifyBank}
                        disabled={!bankAccountNumber || !bankIfscCode || verifyingBank}
                        className="w-full py-2 bg-[#3B82F6] text-white text-sm font-bold rounded-lg hover:bg-blue-600 disabled:opacity-50 flex justify-center items-center gap-2"
                      >
                        {verifyingBank ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify Account'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <ProfileField icon={User} label="ACCOUNT HOLDER NAME" value={kyc.bank_details?.account_holder_name || profile.name || '—'} />
              <ProfileField icon={Wallet} label="ACCOUNT NUMBER" value={kyc.bank_details?.account_number || '—'} />
              <ProfileField icon={Code} label="IFSC CODE" value={kyc.bank_details?.ifsc_code || '—'} />
              <ProfileField icon={MapPin} label="BRANCH ADDRESS" value={kyc.bank_details?.data?.ifsc_details?.city || '—'} hasBorder={false} />
            </div>
          )}

          {activeTab === 'idcard' && (
            <div className="p-4 sm:p-6 space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800">Your Business Card</h3>
                <button 
                  onClick={async () => {
                    const front = document.getElementById('card-front');
                    const back = document.getElementById('card-back');
                    if (front && back) {
                      try {
                        const CARD_W = 450;
                        const CARD_H = Math.round(CARD_W * (2.125 / 3.375));
                        const GAP = 20;

                        const canvasFront = await html2canvas(front, { scale: 3, useCORS: true, width: CARD_W, height: CARD_H });
                        const canvasBack = await html2canvas(back, { scale: 3, useCORS: true, width: CARD_W, height: CARD_H });

                        const finalCanvas = document.createElement('canvas');
                        finalCanvas.width = CARD_W * 3;
                        finalCanvas.height = (CARD_H * 2 + GAP) * 3;
                        const ctx = finalCanvas.getContext('2d')!;
                        ctx.scale(3, 3);
                        ctx.fillStyle = '#f8fafc';
                        ctx.fillRect(0, 0, CARD_W, CARD_H * 2 + GAP);
                        ctx.drawImage(canvasFront, 0, 0, CARD_W, CARD_H);
                        ctx.drawImage(canvasBack, 0, CARD_H + GAP, CARD_W, CARD_H);

                        const link = document.createElement('a');
                        link.download = 'Business_Card.png';
                        link.href = finalCanvas.toDataURL('image/png');
                        link.click();
                      } catch (err) {
                        console.error('Failed to download', err);
                        toast.error('Failed to download Business Card');
                      }
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2"
                >
                  <Upload size={16} className="rotate-180" /> Download Business Card
                </button>
              </div>
              
              <div className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col items-center overflow-x-auto">
                <div className="shadow-lg rounded-lg overflow-hidden border border-gray-200">
                  <CardFront cardData={{
                    userId: profile.user_id || profile.id?.toString() || 'PENDING',
                    name: profile.name || '',
                    position: 'Business Associate',
                    company: 'Finonest',
                    mobile: profile.phone || '',
                    address: kyc.address ? [kyc.address.line1, kyc.address.city, kyc.address.state, kyc.address.pincode].filter(Boolean).join(', ') : 'Finonest House, 3rd Floor, BL Tower 1, Mahaveer Nagar, Tonk Road, Jaipur',
                    photo: profile.photo_path ? (profile.photo_path.startsWith('http') ? profile.photo_path : `/${profile.photo_path}`) : null
                  }} />
                </div>
                
                <div className="shadow-lg rounded-lg overflow-hidden border border-gray-200">
                  <CardBack cardData={{
                    userId: profile.user_id || profile.id?.toString() || 'PENDING',
                    name: profile.name || '',
                    position: 'Business Associate',
                    company: 'Finonest',
                    mobile: profile.phone || '',
                    address: kyc.address ? [kyc.address.line1, kyc.address.city, kyc.address.state, kyc.address.pincode].filter(Boolean).join(', ') : 'Finonest House, 3rd Floor, BL Tower 1, Mahaveer Nagar, Tonk Road, Jaipur',
                    photo: profile.photo_path ? (profile.photo_path.startsWith('http') ? profile.photo_path : `/${profile.photo_path}`) : null
                  }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Reusable ProfileField Component
function ProfileField({ icon: Icon, label, value, action, hasBorder = true }: { icon: any, label: string, value: string, action?: React.ReactNode, hasBorder?: boolean }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="w-9 h-9 rounded-xl bg-[#FFEDD5] text-[#F97316] flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={16} strokeWidth={2.5} />
      </div>
      <div className={`flex-1 pb-4 flex justify-between items-center ${hasBorder ? 'border-b border-slate-100' : ''}`}>
        <div className="pr-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-[14px] font-medium text-slate-800 leading-snug">{value}</p>
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}

