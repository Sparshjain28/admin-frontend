import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { cleanupDigilocker } from '@/lib/digilockerCleanup';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [panNumber, setPanNumber] = useState('');
  const [isPanVerified, setIsPanVerified] = useState(false);
  // The name comes from the verified PAN, so it is locked: it is only ever filled by a PAN verification, never typed.
  // It stays locked while the user types a different PAN (it unlocks nowhere on this page).
  const [nameLocked, setNameLocked] = useState(false);
  // The PAN that is verified on the server right now. Changing it has to go through a verification of the new PAN.
  const [serverPan, setServerPan] = useState('');
  const [aadhaarData, setAadhaarData] = useState<any>(null);
  const [panFetching, setPanFetching] = useState(false);
  // Locked once a PAN is successfully verified via DigiLocker — manual
  // typing stays disabled while that verification call is in flight, and
  // stays locked afterward since it's now a trusted, auto-fetched value.
  // If DigiLocker never returns a verified PAN, this stays false and the
  // field remains editable by hand.
  const [panLockedByDigilocker, setPanLockedByDigilocker] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [referCode, setReferCode] = useState('');
  const [panFilePath, setPanFilePath] = useState('');
  const [aadhaarFilePath, setAadhaarFilePath] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [digilockerStatus, setDigilockerStatus] = useState<string>('Initializing DigiLocker...');
  // A persistent, unmissable confirmation that DigiLocker verification
  // actually completed — separate from the transient success toast and the
  // small status line, both easy to miss.
  const [digilockerVerified, setDigilockerVerified] = useState(false);
  const logo = '/Finonest%20logo.png';

  useEffect(() => {
    api.get('/auth/profile')
      .then((profile) => {
        if (profile) {
          setPanNumber(profile.kyc?.pan_number || '');
          if (profile.kyc?.pan_verified && profile.kyc?.pan_number) {
            setIsPanVerified(true);
            setServerPan(String(profile.kyc.pan_number).toUpperCase());
          }
          setNameLocked(!!profile.name_locked);
          if (profile.name) {
            const parts = profile.name.split(' ');
            setFirstName(parts[0] || '');
            setLastName(parts.slice(1).join(' ') || '');
          }
          setEmail(profile.email || '');
          setDob(profile.kyc?.date_of_birth || '');
          setGender(profile.kyc?.gender || 'Male');
          setState(profile.kyc?.address?.state || '');
          setCity(profile.kyc?.address?.city || '');
          setPinCode(profile.kyc?.address?.pincode || '');
          setFullAddress(profile.kyc?.address?.line1 || '');
          setReferCode(profile.refer_code || '');
        }
      })
      .catch(console.error);

    let isMounted = true;
    cleanupDigilocker('#digilocker-btn-container');

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
              const container = document.querySelector('#digilocker-btn-container');
              if (!container) return;

              cleanupDigilocker('#digilocker-btn-container');

              (window as any).DigiboostSdk({
                gateway: 'production', 
                token: response.token,
                selector: '#digilocker-btn-container',
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
                    if (fetchRes.success) {
                      if (fetchRes.aadhaarData) {
                        const aadhaar = fetchRes.aadhaarData;
                        setAadhaarData(aadhaar);
                        if (aadhaar.full_name) {
                          const parts = aadhaar.full_name.split(' ');
                          setFirstName(parts[0] || '');
                          setLastName(parts.slice(1).join(' ') || '');
                        }
                        if (aadhaar.dob) setDob(aadhaar.dob);
                        if (aadhaar.gender) setGender(aadhaar.gender === 'M' ? 'Male' : aadhaar.gender === 'F' ? 'Female' : 'Other');
                        if (aadhaar.full_address) setFullAddress(aadhaar.full_address);
                        
                        const stateStr = aadhaar.state || aadhaar.address?.state;
                        const distStr = aadhaar.district || aadhaar.address?.dist;
                        const pcStr = aadhaar.pin || aadhaar.address?.pc || aadhaar.zip;
                        if (stateStr) setState(stateStr);
                        if (distStr) setCity(distStr);
                        if (pcStr) setPinCode(pcStr);
                      }
                      
                      if (fetchRes.panData) {
                        const pan = fetchRes.panData.pan_number || fetchRes.panData.pan || fetchRes.panData.id_number;
                        if (pan) {
                          const verified = await handlePANChange(pan);
                          setPanLockedByDigilocker(verified);
                        }
                      }

                      if (fetchRes.panFilePath) setPanFilePath(fetchRes.panFilePath);
                      if (fetchRes.aadhaarFilePath) setAadhaarFilePath(fetchRes.aadhaarFilePath);

                      toast.success('KYC details fetched successfully!', { id: fetchId });
                      setDigilockerStatus('DigiLocker Verification Complete');
                      setDigilockerVerified(true);
                    } else {
                      throw new Error(fetchRes.error || 'Failed to fetch Aadhaar details');
                    }
                  } catch (err: any) {
                    setDigilockerStatus(`Error: ${err.message || 'Failed to fetch KYC details'}`);
                    toast.error(err.message || 'Error fetching Aadhaar details', { id: fetchId });
                  }
                },
                onFailure: (error: any) => {
                  console.error("Verification failed:", error);
                  setDigilockerStatus(`Verification failed: ${error?.message || error || 'cancelled'}`);
                  toast.error("DigiLocker verification failed or was cancelled.");
                }
              });
            }, 100);
          } else {
            setDigilockerStatus("Error: DigiboostSdk is not defined on window.");
            toast.error("Failed to load Digilocker SDK.");
          }
        } else {
          setDigilockerStatus(`Error: ${response.error || "Failed to init session"}`);
          toast.error(response.error || "Failed to initialize Digilocker session.");
        }
      } catch (err: any) {
        console.error("Failed to init digilocker:", err);
        setDigilockerStatus(`Error: ${err.message || "Failed to start Digilocker"}`);
        toast.error(err.message || "Error starting Digilocker.");
      }
    };
    
    initSdk();

    return () => {
      isMounted = false;
      cleanupDigilocker('#digilocker-btn-container');
    };
  }, []);
  // Typing a PAN only edits the field and drops the verified state: it is verified when the user presses "Verify"
  // (handlePANChange below does the real verification; it is also what the DigiLocker callback calls).
  const onPanTyped = (val: string) => {
    setPanNumber(val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10));
    setIsPanVerified(false);
  };
  const panFormatOk = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber);
  const verifyTypedPan = async () => {
    const ok = await handlePANChange(panNumber);
    if (!ok) toast.error('Could not verify this PAN. Check the number and try again.');
  };
  const handlePANChange = async (val: string): Promise<boolean> => {
    const uppercaseVal = val.toUpperCase().slice(0, 10);
    setPanNumber(uppercaseVal);
    setIsPanVerified(false);

    if (uppercaseVal.length === 10) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (panRegex.test(uppercaseVal)) {
        setPanFetching(true);
        try {
          const d = await api.post('/kyc/verify-pan', { pan_number: uppercaseVal, save_to_profile: true });
          if (d.success && d.data) {
            setIsPanVerified(true);
            setNameLocked(true);
            setServerPan(uppercaseVal);
            const profile = d.data;
            if (profile.full_name) {
              const parts = profile.full_name.split(' ');
              setFirstName(parts[0] || '');
              setLastName(parts.slice(1).join(' ') || '');
            }
            if (profile.date_of_birth) setDob(profile.date_of_birth);
            if (profile.gender) setGender(profile.gender);
            if (profile.address?.state) setState(profile.address.state);
            if (profile.address?.city) setCity(profile.address.city);
            if (profile.address?.zip) setPinCode(profile.address.zip);
            return true;
          }
        } catch (e) {
        } finally {
          setPanFetching(false);
        }
      }
    }
    return false;
  };

  const handlePinCodeChange = async (val: string) => {
    const numericVal = val.replace(/\D/g, '').slice(0, 6);
    setPinCode(numericVal);
    
    if (numericVal.length === 6) {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${numericVal}`);
        const data = await response.json();
        if (data && data[0]?.Status === 'Success') {
          const postOffice = data[0].PostOffice[0];
          setCity(postOffice.District);
          setState(postOffice.State);
        }
      } catch (err) {
}
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (serverPan && panNumber.toUpperCase() !== serverPan && !isPanVerified) {
      toast.error('Verify the new PAN first. Your name is fetched from it.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        full_name: `${firstName} ${lastName}`.trim(),
        pan_number: panNumber,
        // updateProfile only writes columns that are actually present in
        // the request body (columns not sent stay untouched) — pan_verified
        // was never included here, so a PAN that showed "✓ Verified" on
        // screen (isPanVerified, set after a real /kyc/verify-pan success)
        // was silently never recorded as verified in the database.
        pan_verified: isPanVerified,
        pan_file_path: panFilePath,
        aadhaar_file_path: aadhaarFilePath,
        aadhaar_data: aadhaarData || undefined,
        aadhaar_number: aadhaarData?.aadhaar_number || aadhaarData?.masked_aadhaar || undefined,
        // Only claim an Aadhaar verification when this page really got one (never send "false": it must not un-verify).
        aadhaar_verified: aadhaarData ? true : undefined,
        date_of_birth: dob,
        gender: gender,
        address_line1: fullAddress,
        city: city,
        state: state,
        pincode: pinCode,
        country: 'India',
        email: email,
        ...(referCode?.trim() ? { refer_code: referCode.trim() } : {})
      };

      await api.put('/auth/profile', payload);
      toast.success('Profile completed successfully!');
      navigate('/profile');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white font-sans relative pb-8">
      {/* Blue Header Section */}
      <div className="bg-gradient-to-tr from-[#829CF8] to-[#DBE2FF] h-[30vh] min-h-[200px] w-full flex items-center justify-center relative shadow-[0_8px_30px_rgba(125,155,255,0.3)]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-5 top-6 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-95 shadow-sm"
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <img src={logo} alt="Finonest India" className="h-16 w-auto object-contain brightness-0 invert drop-shadow-md" />
      </div>

      {/* Form Container */}
      <div className="flex-1 px-5 -mt-10 relative z-10">
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.06)] border border-slate-100 max-w-md mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading">Let's Get You Started</h2>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-2.5 px-2">
              Set up your account to start exploring and enjoy seamless access to all features.
            </p>
          </div>

          {/* digilockerStatus was being set throughout the flow (Loading,
              Ready, Verification Complete, every error message) but this
              container rendered a hardcoded "Initializing DigiLocker..."
              string instead of the actual state — so none of those updates
              were ever visible, and the user had no way to tell what was
              happening or whether it had finished.
              Also: the status text used to live INSIDE the same div the SDK
              injects its button into, and that div's innerHTML was wiped
              with a raw DOM call to make room for the SDK's button — this
              silently fights with React the moment digilockerStatus changes
              again (React still thinks a <span> lives in there and tries to
              update it, while the real DOM now holds the SDK's own button),
              which could make the button flicker, vanish, or never actually
              settle. Status text now lives in its own sibling div that React
              fully owns; the button container below is left completely
              empty for the SDK to own outright. */}
          <div className="text-xs text-blue-600 font-medium text-center mb-1">{digilockerStatus}</div>
          <div id="digilocker-btn-container" className="min-h-[48px] w-full border border-dashed border-blue-300 rounded-xl mb-4 bg-blue-50/50" />

          {/* A status line inside the SDK's own button container is easy to
              miss (and that container's DOM is partly taken over by the
              third-party widget) — this banner sits outside it and stays
              visible for as long as the confirmation matters. */}
          {digilockerVerified && (
            <div className="mb-4 w-full flex items-center justify-center gap-2 border border-green-300 rounded-xl py-2.5 bg-green-50 text-green-700 text-sm font-semibold">
              <span>✅ Verified via DigiLocker</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* PAN Number */}
            <div className="relative flex items-center gap-2">
              <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold tracking-wide z-10 flex items-center gap-1">
                PAN Number {isPanVerified && <span className="text-green-500 font-extrabold tracking-tight">✓ Verified</span>}
              </label>
              <input
                type="text"
                value={panNumber}
                onChange={(e) => onPanTyped(e.target.value)}
                placeholder="ABCDE1234F"
                maxLength={10}
                // Disabled while a verification call (DigiLocker or manual)
                // is in flight, and stays locked once DigiLocker has
                // successfully verified a PAN — only unlocks for manual
                // typing if DigiLocker never provided a verified PAN.
                disabled={panFetching || panLockedByDigilocker}
                className="min-w-0 flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:border-[#7D9BFF] transition-all bg-white focus:ring-1 focus:ring-[#7D9BFF] disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                required
              />
              {panFormatOk && !isPanVerified && !panLockedByDigilocker && (
                <button
                  type="button"
                  onClick={verifyTypedPan}
                  disabled={panFetching}
                  className="shrink-0 rounded-2xl bg-[#7D9BFF] px-4 py-3 text-xs font-bold text-white transition-all hover:bg-[#6A8AFF] active:scale-[0.97] disabled:opacity-60"
                >
                  {panFetching ? 'Verifying…' : 'Verify'}
                </button>
              )}
            </div>

            {panFormatOk && !isPanVerified && !panLockedByDigilocker && (
              <p className="-mt-3 text-[10px] font-semibold text-amber-600">
                Press Verify to check this PAN. Your name is fetched from it.
              </p>
            )}

            {/* First & Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold tracking-wide z-10">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  readOnly={nameLocked}
                  onChange={(e) => !nameLocked && setFirstName(e.target.value)}
                  placeholder="Rahul"
                  className={`w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold ${nameLocked ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''} focus:outline-none focus:border-[#7D9BFF] transition-all bg-white focus:ring-1 focus:ring-[#7D9BFF]`}
                  required
                />
              </div>
              <div className="relative">
                <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold tracking-wide z-10">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  readOnly={nameLocked}
                  onChange={(e) => !nameLocked && setLastName(e.target.value)}
                  placeholder="Jain"
                  className={`w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold ${nameLocked ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''} focus:outline-none focus:border-[#7D9BFF] transition-all bg-white focus:ring-1 focus:ring-[#7D9BFF]`}
                  required
                />
              </div>
            </div>

            {nameLocked && (
              <p className="-mt-3 flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                🔒 Your name is taken from your verified PAN and cannot be edited. Change your PAN (and verify it) to change it.
              </p>
            )}

            {/* Email Address */}
            <div className="relative">
              <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold tracking-wide z-10">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:border-[#7D9BFF] transition-all bg-white focus:ring-1 focus:ring-[#7D9BFF]"
                required
              />
            </div>

            {/* Date of Birth */}
            <div className="relative">
              <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold tracking-wide z-10">
                Date Of Birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:border-[#7D9BFF] transition-all bg-white focus:ring-1 focus:ring-[#7D9BFF] text-left"
                required
              />
            </div>

            {/* Gender */}
            <div className="relative">
              <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold tracking-wide z-10">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:border-[#7D9BFF] transition-all bg-white focus:ring-1 focus:ring-[#7D9BFF]"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* State */}
            <div className="relative">
              <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold tracking-wide z-10">
                State
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:border-[#7D9BFF] transition-all bg-white focus:ring-1 focus:ring-[#7D9BFF]"
                required
              >
                <option value="">Select state</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi">Delhi</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Haryana">Haryana</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
              </select>
            </div>

            {/* City */}
            <div className="relative">
              <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold tracking-wide z-10">
                City
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:border-[#7D9BFF] transition-all bg-white focus:ring-1 focus:ring-[#7D9BFF]"
                required
              >
                <option value="">Select city</option>
                <option value="Jaipur">Jaipur</option>
                <option value="Mumbai">Mumbai</option>
                <option value="New Delhi">New Delhi</option>
                <option value="Ahmedabad">Ahmedabad</option>
                <option value="Gurugram">Gurugram</option>
                <option value="Noida">Noida</option>
              </select>
            </div>

            {/* PIN Code */}
            <div className="relative">
              <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold tracking-wide z-10">
                PIN Code
              </label>
              <input
                type="tel"
                value={pinCode}
                onChange={(e) => handlePinCodeChange(e.target.value)}
                placeholder="Enter PIN code"
                maxLength={6}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:border-[#7D9BFF] transition-all bg-white focus:ring-1 focus:ring-[#7D9BFF]"
                required
              />
            </div>

            {/* Full Address */}
            <div className="relative">
              <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold tracking-wide z-10">
                Full Address
              </label>
              <input
                type="text"
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="Enter Address"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:border-[#7D9BFF] transition-all bg-white focus:ring-1 focus:ring-[#7D9BFF]"
                required
              />
            </div>

            {/* Referral Code option */}
            <div className="relative">
              <label className="absolute -top-2 left-4 px-1.5 bg-white text-[10px] text-slate-400 font-bold tracking-wide z-10">
                Referral Code (Optional)
              </label>
              <input
                type="text"
                value={referCode}
                onChange={(e) => setReferCode(e.target.value.toUpperCase())}
                placeholder="Enter Referral Code"
                className="w-full px-4 py-3 rounded-2xl border border-[#FF7A00] text-slate-800 text-sm font-semibold focus:outline-none focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00] transition-all bg-white"
              />
            </div>

            {/* Submit Profile Button */}
            <button
              type="submit"
              disabled={loading || panFetching || (!!serverPan && panNumber.toUpperCase() !== serverPan && !isPanVerified)}
              className="w-full py-4 rounded-2xl text-white text-xs font-bold bg-[#7D9BFF] hover:bg-[#6A8AFF] active:scale-[0.98] transition-all shadow-[0_8px_20px_rgba(125,155,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border-none cursor-pointer mt-4"
            >
              {loading ? 'Submitting...' : 'Submit Profile'}
            </button>

            {/* Submit Later */}
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-xs text-[#FF7A00] font-extrabold hover:underline cursor-pointer bg-transparent border-none"
              >
                Sumbit Later
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

