import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Calendar, ChevronDown, Eye, EyeOff, Loader2, Lock, UserCheck, AlertTriangle } from 'lucide-react';
import { cleanupDigilocker } from '@/lib/digilockerCleanup';

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { token: inviteToken } = useParams<{ token?: string }>();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // When reached via /join/:token (an invite link), validate it up front —
  // the role/reporting manager are fixed by the invite, not chosen here.
  const [inviteStatus, setInviteStatus] = useState<'checking' | 'valid' | 'invalid'>(inviteToken ? 'checking' : 'valid');
  const [inviteInfo, setInviteInfo] = useState<{ role?: string; role_label?: string; inviter_name?: string; reason?: string }>({});
  // Invited to become a DSA: the KYC steps are replaced by the DSA onboarding that starts after the account is created.
  const isDsaInvite = inviteInfo.role === 'dsa';

  useEffect(() => {
    if (!inviteToken) return;
    api.get(`/invites/${inviteToken}`)
      .then((data: any) => {
        if (data.valid) {
          setInviteInfo({ role: data.role, role_label: data.role_label, inviter_name: data.inviter_name });
          setInviteStatus('valid');
        } else {
          setInviteInfo({ reason: data.reason });
          setInviteStatus('invalid');
        }
      })
      .catch(() => {
        setInviteInfo({ reason: 'Could not check this invite link. Please try again.' });
        setInviteStatus('invalid');
      });
  }, [inviteToken]);
  const logo = '/Finonest%20logo.png';

  // Mobile Entry (Step 1)
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState(false);

  // OTP Verification (Step 2)
  const [phoneOtp, setPhoneOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [countdown, setCountdown] = useState(45);

  // Set MPIN (Step 3)
  const [mpin, setMpin] = useState(['', '', '', '']);
  const [confirmMpin, setConfirmMpin] = useState(['', '', '', '']);
  const mpinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmMpinRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Complete Profile (Step 4)
  const [panNumber, setPanNumber] = useState('');
  const [panFetching, setPanFetching] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');
  const [panData, setPanData] = useState<any>(null);
  // Locked once a PAN is successfully verified via DigiLocker (the API
  // path) — manual typing stays disabled while that verification call is
  // in flight, and stays locked afterward since it's now a trusted,
  // auto-fetched value. If DigiLocker never returns a PAN (or verification
  // fails), this stays false and the field remains editable by hand.
  const [panLockedByDigilocker, setPanLockedByDigilocker] = useState(false);
  // True while the PAN has been verified by the API. The name then comes from the PAN and is locked.
  // A ref, because the DigiLocker callback below was created earlier and would read stale state.
  const panVerifiedRef = useRef(false);

  // Bank & Referral (Step 5)
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');
  const [verifyingBank, setVerifyingBank] = useState(false);
  const [businessPanFetching, setBusinessPanFetching] = useState(false);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [referCode, setReferCode] = useState('');
  
  const [digilockerStatus, setDigilockerStatus] = useState<string>('Initializing DigiLocker...');
  // A persistent, unmissable confirmation that DigiLocker verification
  // actually completed — separate from the transient success toast.
  const [digilockerVerified, setDigilockerVerified] = useState(false);
  const [aadhaarData, setAadhaarData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    cleanupDigilocker('#signup-digilocker-btn-container');

    // Only initialize SDK when user reaches step 4
    if (currentStep === 4 && !isDsaInvite) {
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
                const container = document.querySelector('#signup-digilocker-btn-container');
                if (!container) return;

                cleanupDigilocker('#signup-digilocker-btn-container');

                (window as any).DigiboostSdk({
                  gateway: 'production', 
                  token: response.token,
                  selector: '#signup-digilocker-btn-container',
                  style: {
                    backgroundColor: "#2563EB",
                    color: "white",
                    padding: "12px 24px",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: "600",
                    width: "100%",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    marginBottom: "16px"
                  },
                  onSuccess: async (data: any) => {
                    const fetchId = toast.loading('Fetching Aadhaar details...');
                    try {
                      const fetchRes = await api.post('/auth/digilocker/fetch', { client_id: data.client_id });
                      if (fetchRes.success && (fetchRes.aadhaarData || fetchRes.panData)) {
                        if (fetchRes.aadhaarData) {
                          const aadhaar = fetchRes.aadhaarData;
                          setAadhaarData(aadhaar); // Save the raw Aadhaar data for signup submission

                          if (aadhaar.full_name && !panVerifiedRef.current) {
                            const parts = aadhaar.full_name.split(' ');
                            setFirstName(parts[0] || '');
                            setLastName(parts.slice(1).join(' ') || '');
                          }
                          if (aadhaar.dob) setDob(aadhaar.dob);
                          if (aadhaar.gender) setGender(aadhaar.gender === 'M' ? 'Male' : aadhaar.gender === 'F' ? 'Female' : 'Other');
                          if (aadhaar.full_address) setAddress(aadhaar.full_address);
                          if (aadhaar.zip) setPincode(aadhaar.zip);
                          if (aadhaar.address?.state) setState(aadhaar.address.state);
                          if (aadhaar.address?.dist) setCity(aadhaar.address.dist);
                        }

                        const pan = fetchRes.panData?.pan_number || fetchRes.panData?.pan || fetchRes.panData?.id_number;
                        if (pan) {
                          const verified = await handlePanChange(pan);
                          setPanLockedByDigilocker(verified);
                        }

                        toast.success('DigiLocker details verified and filled successfully!', { id: fetchId });
                        setDigilockerVerified(true);
                      } else {
                        throw new Error(fetchRes.error || 'Failed to fetch Aadhaar/PAN details');
                      }
                    } catch (err: any) {
                      toast.error(err.message || 'Error fetching Aadhaar details', { id: fetchId });
                    }
                  },
                  onFailure: (error: any) => {
                    console.error("Verification failed:", error);
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
          console.error("Failed to init digilocker:", err);
          setDigilockerStatus(`Error: ${err.message || "Failed to start Digilocker"}`);
        }
      };
      
      initSdk();
    }

    return () => {
      isMounted = false;
      cleanupDigilocker('#signup-digilocker-btn-container');
    };
  }, [currentStep, isDsaInvite]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (currentStep === 2 && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [currentStep, countdown]);

  const handleSendOtp = async () => {
    if (!phone || phone.length !== 10) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    if (!agree) {
      toast.error('Please agree to terms and privacy policy');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/send-mobile-otp', { phone });
      toast.success('OTP sent to your mobile!');
      setCountdown(45);
      setCurrentStep(2);
    } catch (e: any) {
      toast.error(e.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpString = phoneOtp.join('');
    if (otpString.length !== 6) {
      toast.error('Enter the full 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/verify-mobile-otp', { phone, otp: otpString });
      toast.success('Mobile number verified!');
      setCurrentStep(3);
    } catch (e: any) {
      toast.error(e.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSetMpin = () => {
    const mpinStr = mpin.join('');
    const confirmStr = confirmMpin.join('');
    
    if (mpinStr.length !== 4) {
      toast.error('Please enter a 4-digit MPIN');
      return;
    }
    if (mpinStr !== confirmStr) {
      toast.error('MPINs do not match');
      return;
    }
    setCurrentStep(4);
  };

  const validatePAN = (pan: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  };

  const handlePanChange = async (value: string): Promise<boolean> => {
    const cleanValue = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    // Changing the PAN drops the earlier verification, so the name unlocks until the new PAN is verified.
    if (cleanValue !== panNumber) {
      setPanData(null);
      panVerifiedRef.current = false;
    }
    setPanNumber(cleanValue);

    if (cleanValue.length === 10 && validatePAN(cleanValue)) {
      setPanFetching(true);
      try {
        const checkData = await api.post('/auth/check-pan', { pan_number: cleanValue });
        const data = await api.post('/kyc/verify-pan', { pan_number: cleanValue });
        if (data.success && data.data) {
          setPanData(data.data);
          panVerifiedRef.current = true;
          const fetchedName = data.data.full_name || '';
          const parts = fetchedName.trim().split(' ');
          if (parts.length > 0) {
            setFirstName(parts[0]);
            setLastName(parts.slice(1).join(' '));
          }
          if (data.data.dob) {
            // attempt to format DD/MM/YYYY to YYYY-MM-DD
            if (data.data.dob.includes('/')) {
              const [d,m,y] = data.data.dob.split('/');
              if (y && m && d) setDob(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
            } else {
              setDob(data.data.dob);
            }
          }
          if (data.data.gender) {
            const g = data.data.gender.toLowerCase();
            if (g.startsWith('m')) setGender('Male');
            else if (g.startsWith('f')) setGender('Female');
            else setGender('Other');
          }
          toast.success('PAN Details verified automatically');
          return true;
        }
      } catch(e: any) {
        if (e.message && e.message.includes('already registered')) {
          toast.error(e.message);
        } else {
          toast.error(e.message || 'Failed to verify PAN automatically');
        }
      } finally {
        setPanFetching(false);
      }
    }
    return false;
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
        setBankDetails(response.data);
      } else {
        toast.error(response.error || 'Bank verification failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify bank account');
    } finally {
      setVerifyingBank(false);
    }
  };

  const handleProceedToStep5 = () => {
    if (!firstName || !lastName || !panNumber) {
      toast.error('Please fill required fields (Name and PAN)');
      return;
    }
    if (!validatePAN(panNumber)) {
      toast.error('Invalid PAN format');
      return;
    }
    setCurrentStep(5);
  };

  const handleSignup = async () => {
    if (isDsaInvite && !firstName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    setLoading(true);
    try {
      const response = await signUp(isDsaInvite ? {
        name: `${firstName} ${lastName}`.trim(),
        mpin: mpin.join(''),
        phone,
        email: email || undefined,
        role: 'executive',
        invite_token: inviteToken,
      } : {
        name: `${firstName} ${lastName}`.trim(),
        mpin: mpin.join(''),
        phone,
        email,
        address: `${address}, ${city}, ${state} - ${pincode}`,
        pan_number: panNumber,
        pan_data: panData || {
          dob,
          gender,
          address: { line_1: address, city, state, zip: pincode }
        },
        aadhaar_data: aadhaarData || undefined,
        aadhaar_number: aadhaarData?.aadhaar_number || aadhaarData?.masked_aadhaar || undefined,
        aadhaar_verified: Boolean(aadhaarData),
        role: 'executive',
        invite_token: inviteToken || undefined,
        refer_code: referCode || undefined,
        bank_account_number: bankAccountNumber || undefined,
        bank_ifsc_code: bankIfscCode || undefined,
        bank_name: bankDetails?.ifsc_details?.bank_name || bankDetails?.bank_name || undefined,
        bank_account_holder: bankDetails?.full_name || undefined,
        bank_verified: !!bankDetails,
        bank_data: bankDetails || undefined
      });

      if (response.success) {
        toast.success(isDsaInvite ? 'Account created. Log in to complete your DSA onboarding.' : inviteToken ? 'Account created — you can log in right away!' : 'Account created successfully!');
        navigate('/login');
      } else {
        throw new Error(response.error || 'Signup failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const newOtp = [...phoneOtp];
    newOtp[index] = value;
    setPhoneOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !phoneOtp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleMpinChange = (index: number, value: string, isConfirm: boolean) => {
    if (isConfirm) {
      const newMpin = [...confirmMpin];
      newMpin[index] = value;
      setConfirmMpin(newMpin);
      if (value && index < 3) confirmMpinRefs.current[index + 1]?.focus();
    } else {
      const newMpin = [...mpin];
      newMpin[index] = value;
      setMpin(newMpin);
      if (value && index < 3) mpinRefs.current[index + 1]?.focus();
    }
  };

  const handleMpinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>, isConfirm: boolean) => {
    if (e.key === 'Backspace') {
      if (isConfirm) {
        if (!confirmMpin[index] && index > 0) confirmMpinRefs.current[index - 1]?.focus();
      } else {
        if (!mpin[index] && index > 0) mpinRefs.current[index - 1]?.focus();
      }
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="flex-1 flex flex-col items-center mt-6">
            <h2 className="text-[22px] font-bold text-slate-900 mb-1">Login</h2>
            <p className="text-[11px] text-slate-500 text-center mb-8 px-4 leading-relaxed">
              Earn more with Finonest by selling Credit Card, Personal Loans, Home Loans and Insurance
            </p>

            <div className="w-full relative mb-8">
              <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold z-10">
                Mobile Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9983077289"
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:border-[#7D9BFF] transition-all bg-white"
              />
            </div>

            <div className="w-full bg-[#F8FAFF] rounded-xl p-3 mb-8">
              <p className="text-[10px] text-slate-500 text-center font-semibold">
                We keep your details secure and do not share with others without your permission.
              </p>
            </div>

            <div className="mt-auto w-full">
              <div className="flex items-start gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#7D9BFF] focus:ring-[#7D9BFF] accent-[#7D9BFF]"
                />
                <p className="text-[9.5px] text-slate-500 font-semibold leading-relaxed">
                  I hereby agree to the <span className="text-[#FF7A00] hover:underline cursor-pointer">Terms of Finonest</span> & <span className="text-[#FF7A00] hover:underline cursor-pointer">Privacy Policy</span> and to receive communication via SMS, Voice, and Email from Finonest.
                </p>
              </div>

              <button
                onClick={handleSendOtp}
                disabled={loading || phone.length !== 10 || !agree}
                className="w-full py-3.5 rounded-xl text-white text-sm font-bold bg-[#7D9BFF] hover:bg-[#6A8AFF] active:scale-95 transition-all disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Submit'}
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="flex-1 flex flex-col items-center mt-6">
            <h2 className="text-[22px] font-bold text-slate-900 mb-1">Verification Code</h2>
            <p className="text-[11px] text-slate-500 text-center mb-8 px-4 leading-relaxed">
              We\'ve sent a 6-digit OTP verification code to your phone number {phone} <span className="text-[#FF7A00] cursor-pointer" onClick={() => setCurrentStep(1)}>(Edit)</span>
            </p>

            <div className="flex gap-2 justify-center w-full mb-6">
              {phoneOtp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  className="w-11 h-11 rounded-xl border border-slate-200 text-center text-lg font-bold text-slate-900 focus:border-[#7D9BFF] focus:outline-none bg-white transition-all shadow-sm"
                />
              ))}
            </div>

            <p className="text-[10px] text-slate-900 font-bold mb-auto">
              Resend Code In <span className="text-green-600">00:{countdown.toString().padStart(2, '0')}</span>
            </p>

            <div className="w-full mt-auto pt-8">
              <button
                onClick={handleVerifyOtp}
                disabled={loading || phoneOtp.join('').length !== 6}
                className="w-full py-3.5 rounded-xl text-white text-sm font-bold bg-[#7D9BFF] hover:bg-[#6A8AFF] active:scale-95 transition-all disabled:opacity-60 mb-4"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
              
              <p className="text-[10px] text-center text-slate-500 font-bold">
                Didn\'t receive code? <span className="text-[#FF7A00] cursor-pointer hover:underline" onClick={countdown === 0 ? handleSendOtp : undefined}>Request again</span>
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="flex-1 flex flex-col items-center mt-6">
            <h2 className="text-[22px] font-bold text-slate-900 mb-1">Set Your MPIN</h2>
            <p className="text-[11px] text-slate-500 text-center mb-8 px-4 leading-relaxed">
              Set a 4-digit MPIN to protect your account. You\'ll use it every time you log in for quick and secure access.
            </p>

            <div className="w-full mb-6">
              <p className="text-[10px] text-slate-400 font-bold mb-2">Enter MPIN</p>
              <div className="flex gap-3">
                {mpin.map((digit, i) => (
                  <input
                    key={`enter-${i}`}
                    ref={el => mpinRefs.current[i] = el}
                    type="password"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleMpinChange(i, e.target.value.replace(/\D/g, ''), false)}
                    onKeyDown={e => handleMpinKeyDown(i, e, false)}
                    className="w-12 h-12 rounded-xl border border-slate-200 text-center text-lg font-bold text-slate-900 focus:border-[#7D9BFF] focus:outline-none bg-white shadow-sm"
                  />
                ))}
              </div>
            </div>

            <div className="w-full mb-auto">
              <p className="text-[10px] text-slate-400 font-bold mb-2">Confirm MPIN</p>
              <div className="flex gap-3">
                {confirmMpin.map((digit, i) => (
                  <input
                    key={`confirm-${i}`}
                    ref={el => confirmMpinRefs.current[i] = el}
                    type="password"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleMpinChange(i, e.target.value.replace(/\D/g, ''), true)}
                    onKeyDown={e => handleMpinKeyDown(i, e, true)}
                    className="w-12 h-12 rounded-xl border border-slate-200 text-center text-lg font-bold text-slate-900 focus:border-[#7D9BFF] focus:outline-none bg-white shadow-sm"
                  />
                ))}
              </div>
            </div>

            <div className="w-full mt-10">
              <button
                onClick={handleSetMpin}
                disabled={mpin.join('').length !== 4 || confirmMpin.join('').length !== 4}
                className="w-full py-3.5 rounded-xl text-white text-sm font-bold bg-[#7D9BFF] hover:bg-[#6A8AFF] active:scale-95 transition-all disabled:opacity-60 mb-4"
              >
                Continue
              </button>
              
              <div className="text-center">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="text-[10px] text-[#FF7A00] font-bold hover:underline bg-transparent border-none"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        );

      case 4:
        if (isDsaInvite) {
          return (
            <div className="flex-1 flex flex-col mt-4">
              <div className="text-center mb-6">
                <h2 className="text-[22px] font-bold text-slate-900 mb-1">Your Details</h2>
                <p className="text-[11px] text-slate-500 px-4">Just your name for now. Your KYC is done in the DSA onboarding after your account is created.</p>
              </div>
              <div className="space-y-4 pb-4">
                {[
                  { label: 'First Name', value: firstName, set: setFirstName, placeholder: 'Enter first name' },
                  { label: 'Last Name', value: lastName, set: setLastName, placeholder: 'Enter last name' },
                  { label: 'Email (optional)', value: email, set: setEmail, placeholder: 'Enter email' },
                ].map((f) => (
                  <div className="relative" key={f.label}>
                    <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold z-10">{f.label}</label>
                    <input
                      type="text"
                      value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:border-[#7D9BFF] bg-white"
                    />
                  </div>
                ))}
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800 mb-1">Next: DSA onboarding</p>
                  After your account is created, log in and complete PAN, Aadhaar (DigiLocker), bank details and the agreement. You can use the rest of the app once you submit.
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleSignup}
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl text-white text-sm font-bold bg-[#7D9BFF] hover:bg-[#6A8AFF] active:scale-95 transition-all mb-4 shadow-sm disabled:opacity-60"
                  >
                    {loading ? 'Creating account...' : 'Create account'}
                  </button>
                </div>
              </div>
            </div>
          );
        }
        return (
          <div className="flex-1 flex flex-col mt-4">
            <div className="text-center mb-6">
              <h2 className="text-[22px] font-bold text-slate-900 mb-1">Let\'s Get You Started</h2>
              <p className="text-[11px] text-slate-500 px-4">
                Set up your account to start exploring and enjoy seamless access to all features.
              </p>
            </div>

            {/* Status text lives in its own div, never inside the SDK's
                mount container below — mutating that container's DOM
                directly (to make room for the SDK's injected button) used
                to fight with React re-rendering a <span> it thought still
                lived there on every later status change, which could make
                the button flicker, vanish, or never settle. */}
            <div className="text-xs text-blue-600 font-medium text-center mb-1">{digilockerStatus}</div>
            <div id="signup-digilocker-btn-container" className="min-h-[48px] w-full border border-dashed border-blue-300 rounded-xl mb-4 bg-blue-50/50" />

            {/* Persistent confirmation, separate from the transient success
                toast and the status line above — stays visible so there's
                an unmissable way to tell verification actually completed. */}
            {digilockerVerified && (
              <div className="mb-4 w-full flex items-center justify-center gap-2 border border-green-300 rounded-xl py-2.5 bg-green-50 text-green-700 text-sm font-semibold">
                <span>✅ Verified via DigiLocker</span>
              </div>
            )}

            <div className="space-y-4 pb-4">
              {/* PAN Number */}
              <div className="relative">
                <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold z-10">PAN Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={panNumber}
                    onChange={(e) => handlePanChange(e.target.value)}
                    maxLength={10}
                    // Disabled while a verification call (DigiLocker or
                    // manual) is in flight, and stays locked once DigiLocker
                    // has successfully verified a PAN — only unlocks for
                    // manual typing if DigiLocker never provided a verified
                    // PAN (panLockedByDigilocker stays false).
                    disabled={panFetching || panLockedByDigilocker}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-bold focus:outline-none focus:border-[#7D9BFF] bg-white uppercase disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                  {panFetching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-[#7D9BFF]/30 border-t-[#7D9BFF] rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* First & Last Name */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold z-10">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={!!panData}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-bold focus:outline-none focus:border-[#7D9BFF] bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="relative flex-1">
                  <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold z-10">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={!!panData}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-bold focus:outline-none focus:border-[#7D9BFF] bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              {panData && (
                <p className="-mt-2 flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                  <Lock size={10} /> Name is taken from your verified PAN and cannot be edited.
                </p>
              )}

              {/* Email Address */}
              <div className="relative">
                <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold z-10">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:border-[#7D9BFF] bg-white"
                />
              </div>

              {/* DOB */}
              <div className="relative">
                <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold z-10">Date Of Birth</label>
                <div className="relative">
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:border-[#7D9BFF] bg-white appearance-none"
                  />
                  <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none" />
                </div>
              </div>

              {/* Gender */}
              <div className="relative">
                <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold z-10">Gender</label>
                <div className="relative">
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-bold focus:outline-none focus:border-[#7D9BFF] bg-white appearance-none"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* State */}
              <div className="relative">
                <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold z-10">State</label>
                <div className="relative">
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:border-[#7D9BFF] bg-white appearance-none"
                  >
                    <option value="" className="text-slate-300">Select state</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Assam">Assam</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Chhattisgarh">Chhattisgarh</option>
                    <option value="Goa">Goa</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                    <option value="Chandigarh">Chandigarh</option>
                    <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                    <option value="Ladakh">Ladakh</option>
                    <option value="Lakshadweep">Lakshadweep</option>
                    <option value="Puducherry">Puducherry</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* City */}
              <div className="relative">
                <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold z-10">City</label>
                <div className="relative">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Enter city"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:border-[#7D9BFF] bg-white"
                  />
                </div>
              </div>

              {/* PIN Code */}
              <div className="relative">
                <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold z-10">PIN Code</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter PIN code"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:border-[#7D9BFF] bg-white"
                />
              </div>

              {/* Full Address */}
              <div className="relative">
                <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold z-10">Full Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter Address"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:border-[#7D9BFF] bg-white"
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={handleProceedToStep5}
                  className="w-full py-3.5 rounded-xl text-white text-sm font-bold bg-[#7D9BFF] hover:bg-[#6A8AFF] active:scale-95 transition-all mb-4 shadow-sm"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="flex-1 flex flex-col mt-4">
            <div className="text-center mb-6">
              <h2 className="text-[22px] font-bold text-slate-900 mb-1">Bank Details (Optional)</h2>
              <p className="text-[11px] text-slate-500 px-4">
                Add your bank account for payouts and optionally enter a referral code. You can also do this later from your profile.
              </p>
            </div>

            <div className="space-y-5 pb-4">
              <div className="relative">
                <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold z-10">Account Number</label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => {
                    setBankAccountNumber(e.target.value);
                    setBankDetails(null);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-bold focus:outline-none focus:border-[#7D9BFF] bg-white"
                />
              </div>

              <div className="relative">
                <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold z-10">IFSC Code</label>
                <input
                  type="text"
                  value={bankIfscCode}
                  onChange={(e) => {
                    setBankIfscCode(e.target.value.toUpperCase());
                    setBankDetails(null);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-bold focus:outline-none focus:border-[#7D9BFF] bg-white"
                />
              </div>

              {bankDetails ? (
                <div className="p-3 bg-green-50 text-green-700 text-xs font-semibold rounded-xl border border-green-100 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Verified: {bankDetails.full_name}
                </div>
              ) : (
                <button
                  onClick={handleVerifyBank}
                  disabled={!bankAccountNumber || !bankIfscCode || verifyingBank}
                  className="w-full py-3 rounded-xl text-[#7D9BFF] border border-[#7D9BFF] text-sm font-bold hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-50"
                >
                  {verifyingBank ? 'Verifying...' : 'Verify Bank Account'}
                </button>
              )}

              <div className="relative mt-6 pt-4 border-t border-slate-100">
                <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold z-10">Referral Code (Optional)</label>
                <input
                  type="text"
                  value={referCode}
                  onChange={(e) => setReferCode(e.target.value)}
                  placeholder="Enter refer code if you have one"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-bold focus:outline-none focus:border-[#7D9BFF] bg-white"
                />
              </div>

              <div className="pt-4 mt-auto">
                <button
                  onClick={handleSignup}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-white text-sm font-bold bg-[#7D9BFF] hover:bg-[#6A8AFF] active:scale-95 transition-all disabled:opacity-60 mb-4 shadow-sm"
                >
                  {loading ? 'Submitting...' : 'Complete Signup'}
                </button>
                <div className="text-center">
                  <button onClick={handleSignup} disabled={loading} className="text-xs text-[#FF7A00] font-bold bg-transparent border-none">
                    Skip optional fields & Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  // Invite link still being checked, or it's not usable — don't show the
  // wizard at all in either case.
  if (inviteToken && inviteStatus !== 'valid') {
    return (
      <div className="min-h-[100dvh] w-full bg-[#1A1A1A] font-sans relative flex items-center justify-center">
        <div className="w-full h-[100dvh] max-w-[480px] bg-white sm:h-[850px] overflow-hidden relative flex flex-col">
          <div className="bg-[#9EADFF] h-[35%] w-full flex-shrink-0 flex items-center justify-center pt-8 pb-16 relative z-0">
            <img src={logo} alt="Finonest" className="h-[72px] object-contain brightness-0 invert drop-shadow-sm" />
          </div>
          <div className="flex-1 bg-white rounded-t-3xl -mt-6 z-10 px-6 sm:px-8 pt-10 pb-6 flex flex-col items-center text-center">
            {inviteStatus === 'checking' ? (
              <>
                <Loader2 size={32} className="animate-spin text-[#829CF8] mb-4" />
                <p className="text-sm text-gray-500">Checking your invite link…</p>
              </>
            ) : (
              <>
                <AlertTriangle size={32} className="text-amber-500 mb-4" />
                <h2 className="text-base font-bold text-gray-900 mb-2">Invite link not usable</h2>
                <p className="text-sm text-gray-500">{inviteInfo.reason || 'This invite link is invalid.'}</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-[#1A1A1A] font-sans relative flex items-center justify-center">
      {/* Mobile/Responsive Layout Wrapper */}
      <div className="w-full h-[100dvh] max-w-[480px] bg-white sm:h-[850px] overflow-hidden relative flex flex-col">
        {/* Blue Header Area */}
        <div className="bg-[#9EADFF] h-[35%] w-full flex-shrink-0 flex items-center justify-center pt-8 pb-16 relative z-0">
          <img src={logo} alt="Finonest" className="h-[72px] object-contain brightness-0 invert drop-shadow-sm" />
        </div>

        {/* White Card Overlapping Header */}
        <div className="flex-1 bg-white rounded-t-3xl -mt-6 z-10 px-6 sm:px-8 pt-8 pb-6 flex flex-col overflow-y-auto">
          {inviteToken && inviteStatus === 'valid' && (
            <div className="flex items-center gap-2 bg-[#EEF1FF] border border-[#C7D2FE] rounded-xl px-3 py-2.5 mb-4 text-xs text-[#4F46E5]">
              <UserCheck size={16} className="shrink-0" />
              <span>
                You're joining as <strong>{inviteInfo.role_label}</strong>, invited by <strong>{inviteInfo.inviter_name}</strong>.
              </span>
            </div>
          )}
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
}
