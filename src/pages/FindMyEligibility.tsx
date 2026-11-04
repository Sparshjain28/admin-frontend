import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Calculator, Loader2, AlertCircle, CheckCircle2, XCircle, ShieldCheck, CreditCard, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { Slider } from '@/components/ui/slider';
import ConsentModal from '@/components/ConsentModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  };
}

const formatWithCommas = (value: number) => new Intl.NumberFormat('en-IN').format(value);

interface EligibilityResult {
  bank_id: number;
  bank_name: string;
  logo_url: string | null;
  eligible: boolean;
  loan_amount: number | null;
  ltv_percent: number | null;
  roi: number | null;
  min_tenure: number | null;
  max_tenure: number | null;
  reasons: string[];
}

interface PanData {
  pan_number: string;
  full_name?: string;
}

const inputClass = 'w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-accent';
const labelClass = 'block text-[11px] font-medium text-muted-foreground mb-0.5';
const sectionTitleClass = 'text-xs font-bold text-foreground mb-2 flex items-center gap-1.5';

// Must match CASE_TYPES in findEligibilityController.js. For Purchase the
// amount field below is a down payment; for Refinance/BT it's instead the
// asset's current value (no down payment exists in those cases).
const CASE_TYPES = ['Used Car Purchase', 'Used Car Refinance Up', 'Used Car BT/Top Up'];
const isPurchaseCaseType = (ct: string) => ct.toUpperCase().includes('PURCHASE');

// Self Employed "Profile" — a single flat list of real job/profession
// types. Picking one auto-selects the broader category (profile) behind
// the scenes (e.g. "CA" implies "Professional"), instead of making the
// admin pick the category first and then a sub-type.
const PROFILE_SUBTYPES: { label: string; profile: string }[] = [
  { label: 'Business', profile: 'Business' },
  { label: 'CA', profile: 'Professional' },
  { label: 'Doctor', profile: 'Professional' },
  { label: 'Engineer', profile: 'Professional' },
  { label: 'Architect', profile: 'Professional' },
  { label: 'IT Freelancer', profile: 'Freelancer/Agent' },
  { label: 'LIC Agent', profile: 'Freelancer/Agent' },
  { label: 'Property Broker', profile: 'Freelancer/Agent' },
  { label: 'Gig Worker', profile: 'Freelancer/Agent' },
  { label: 'Farmer', profile: 'Farmer' },
  { label: 'Other Income', profile: 'Other Income' },
];

export default function FindMyEligibility() {
  const { user, isLoading: authLoading } = useAuth();

  const [panNumber, setPanNumber] = useState('');
  const [panData, setPanData] = useState<PanData | null>(null);
  const [verifyingPan, setVerifyingPan] = useState(false);
  const [mobile, setMobile] = useState('');
  const [caseType, setCaseType] = useState('');

  const [cibilScore, setCibilScore] = useState<number | null>(null);
  // Real existing-loan/credit-card accounts from the pulled CIBIL report —
  // sent along so the backend's FOIR check can subtract actual obligations
  // instead of assuming the customer has none.
  const [creditAccounts, setCreditAccounts] = useState<any[]>([]);
  const [cibilPulling, setCibilPulling] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Income Source Details — trimmed down to just what's needed here.
  const [incomeSource, setIncomeSource] = useState('');
  // Salaried
  const [netMonthlySalary, setNetMonthlySalary] = useState('');
  const [salaryCreditMode, setSalaryCreditMode] = useState('Account Transfer');
  // Self Employed
  // profile is the broader category (Business/Professional/Freelancer/
  // Agent/Farmer/Other Income), auto-derived from whichever specific
  // profileSubtype (e.g. "CA") the admin actually picks — see PROFILE_SUBTYPES.
  const [profile, setProfile] = useState('');
  const [profileSubtype, setProfileSubtype] = useState('');
  // This tool needs an actual income number to compute eligibility, unlike
  // Add Lead which can collect Self Employed profiles (e.g. Farmer, or ITR
  // Available = No) without ever getting one — so this is a dedicated
  // field, always required once a profile is picked, separate from the
  // ITR Available/Annual Income fields below (which stay purely for
  // data collection).
  const [selfEmployedMonthlyIncome, setSelfEmployedMonthlyIncome] = useState('');
  const [hasOfficeSetup, setHasOfficeSetup] = useState('');
  const [dairyIncome, setDairyIncome] = useState('');
  const [jamabandhiAvailable, setJamabandhiAvailable] = useState('');
  // Shared by both branches
  const [itrAvailable, setItrAvailable] = useState('');
  const [annualIncomeItr, setAnnualIncomeItr] = useState('');

  const [downPayment, setDownPayment] = useState(100000);

  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<EligibilityResult[]>([]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handlePanBlur = async () => {
    if (!panNumber || panNumber.length !== 10) return;
    if (panData && panData.pan_number === panNumber) return;
    setVerifyingPan(true);
    try {
      const res = await fetch(`${API_URL}/kyc/verify-pan`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ pan_number: panNumber }),
      });
      const data = await res.json();
      const payload = data.data || data;
      if (payload && payload.full_name) {
        setPanData({ pan_number: panNumber, full_name: payload.full_name });
        toast.success('PAN verified!');
      } else {
        setPanData(null);
        toast.error('PAN verification failed.');
      }
    } catch {
      toast.error('Failed to verify PAN.');
    } finally {
      setVerifyingPan(false);
    }
  };

  const pullLiveCibil = async () => {
    try {
      const res = await fetch(`${API_URL}/link-loan/credit-report`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: panData?.full_name, mobile, pan: panNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to fetch CIBIL report.');
        return;
      }
      if (data.credit_score && data.credit_score !== 'N/A') {
        setCibilScore(Number(data.credit_score));
        setCreditAccounts(data.full_report?.accounts || []);
        toast.success('CIBIL report fetched!');
      } else {
        setCibilScore(null);
        setCreditAccounts([]);
        toast.error(data.warning || 'No CIBIL record found for this customer.');
      }
    } catch {
      toast.error('Failed to fetch CIBIL report.');
    } finally {
      setCibilPulling(false);
    }
  };

  const handlePullCibil = async () => {
    if (!panData || panData.pan_number !== panNumber) {
      toast.error('Verify PAN first.');
      return;
    }
    if (mobile.length !== 10) {
      toast.error('Enter a valid 10-digit mobile number.');
      return;
    }
    setCibilPulling(true);
    try {
      const res = await fetch(`${API_URL}/link-loan/credit-report`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: panData.full_name, mobile, pan: panNumber, check_cache_only: true }),
      });
      const data = await res.json();
      // Older than 90 days is treated the same as a cache miss — a CIBIL
      // score that old isn't reliable enough to decide eligibility on, so a
      // fresh pull is forced instead of silently reusing it.
      const isStale = typeof data.age_days === 'number' && data.age_days > 90;
      if (res.ok && !data.cache_miss && !isStale) {
        setCibilScore(data.credit_score ? Number(data.credit_score) : null);
        setCreditAccounts(data.full_report?.accounts || []);
        toast.success('Found cached CIBIL report!');
        setCibilPulling(false);
        return;
      }
      if (isStale) {
        toast.info(`Cached CIBIL report is ${data.cache_age} — fetching a fresh one.`);
      }
      // Cache miss (or stale) — need customer consent (OTP) before the live bureau pull.
      setShowConsentModal(true);
      setCibilPulling(false);
    } catch {
      toast.error('Failed to check CIBIL cache.');
      setCibilPulling(false);
    }
  };

  const effectiveMonthlyIncome = incomeSource === 'Salaried'
    ? (netMonthlySalary ? parseFloat(netMonthlySalary) : null)
    : incomeSource === 'Self Employed'
      ? (selfEmployedMonthlyIncome ? parseFloat(selfEmployedMonthlyIncome) : null)
      : null;

  const canSubmit = panNumber.length === 10 && !!caseType && cibilScore != null && !!effectiveMonthlyIncome && downPayment > 0;

  const handleCheck = async () => {
    setLoading(true);
    setSearched(false);
    try {
      const res = await fetch(`${API_URL}/find-eligibility`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          pan_number: panNumber,
          case_type: caseType,
          cibil_score: cibilScore,
          monthly_salary: effectiveMonthlyIncome,
          down_payment: downPayment,
          existing_accounts: creditAccounts,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to check eligibility.');
        return;
      }
      setResults(data.results || []);
      setSearched(true);
    } catch {
      toast.error('Failed to check eligibility.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
        <ConsentModal
          isOpen={showConsentModal}
          onClose={() => setShowConsentModal(false)}
          mobile={mobile}
          customerName={panData?.full_name}
          associateName={user?.name || user?.phone || 'Our Associate'}
          onSuccess={(skipped) => {
            setShowConsentModal(false);
            if (skipped) {
              toast.error('Customer denied consent for CIBIL check.');
              return;
            }
            setCibilPulling(true);
            pullLiveCibil();
          }}
        />

        <div className="glass-card p-3 md:p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calculator size={14} className="text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">Find My Eligibility</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">Eligible amount, ROI & tenure across lenders — no vehicle required</p>
            </div>
          </div>

          <h3 className={sectionTitleClass}>
            <ShieldCheck size={13} className="text-primary" /> Customer Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>PAN Number *</label>
              <input
                className={inputClass}
                placeholder="Enter 10-digit PAN"
                maxLength={10}
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                onBlur={handlePanBlur}
              />
              {verifyingPan && <p className="text-[10px] text-muted-foreground mt-0.5">Verifying PAN...</p>}
              {panData && panData.pan_number === panNumber && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-green-700 mt-0.5">
                  <CheckCircle2 size={10} /> {panData.full_name}
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Mobile Number *</label>
              <input
                type="tel"
                className={inputClass}
                placeholder="10-digit mobile"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className={labelClass}>Case Type *</label>
              <select className={inputClass} value={caseType} onChange={(e) => setCaseType(e.target.value)}>
                <option value="">Select Case Type</option>
                {CASE_TYPES.map((ct) => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-2.5 p-2.5 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <label className={labelClass}>CIBIL Score *</label>
                {cibilScore != null ? (
                  <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                    <ShieldCheck size={12} className="text-green-600" /> {cibilScore}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Not fetched yet</p>
                )}
              </div>
              <button
                type="button"
                onClick={handlePullCibil}
                disabled={cibilPulling || !panData || panData.pan_number !== panNumber || mobile.length !== 10}
                className="px-3 py-1.5 rounded-lg bg-foreground text-background text-[11px] font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                {cibilPulling ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                {cibilScore != null ? 'Re-fetch CIBIL' : 'Pull CIBIL Report'}
              </button>
            </div>
          </div>

          {/* Income Source Details — trimmed: Salaried just needs salary + credit mode;
              Self Employed needs Profile + Office Setup + ITR (Farmer gets Dairy Income
              + Jamabandhi instead of Office Setup/ITR, matching how farmers are treated
              elsewhere) — no business/professional sub-category fields. */}
          <div className="mt-4 pt-3 border-t border-border">
            <h3 className={sectionTitleClass}>
              <CreditCard size={13} className="text-primary" /> Income Source Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="col-span-1 md:col-span-2">
                <label className={labelClass}>Income Source *</label>
                <select className={inputClass} value={incomeSource} onChange={(e) => setIncomeSource(e.target.value)}>
                  <option value="">Select Income Source</option>
                  <option value="Salaried">Salaried</option>
                  <option value="Self Employed">Self Employed</option>
                </select>
              </div>

              {incomeSource === 'Salaried' && (
                <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Net Monthly Salary *</label>
                    <input type="number" className={inputClass} value={netMonthlySalary} onChange={(e) => setNetMonthlySalary(e.target.value)} placeholder="Enter net monthly salary" max="99999" />
                  </div>
                  <div>
                    <label className={labelClass}>Salary Credit Mode</label>
                    <select className={inputClass} value={salaryCreditMode} onChange={(e) => setSalaryCreditMode(e.target.value)}>
                      <option value="Account Transfer">Account Transfer</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>
              )}

              {incomeSource === 'Self Employed' && (
                <div className="col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Profile</label>
                    <select
                      className={inputClass}
                      value={profileSubtype}
                      onChange={(e) => {
                        const subtype = e.target.value;
                        setProfileSubtype(subtype);
                        setProfile(PROFILE_SUBTYPES.find((p) => p.label === subtype)?.profile || '');
                      }}
                    >
                      <option value="">Select Profile</option>
                      {PROFILE_SUBTYPES.map((p) => (
                        <option key={p.label} value={p.label}>{p.label}</option>
                      ))}
                    </select>
                    {profile && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-green-700 mt-0.5">
                        <CheckCircle2 size={10} /> Category: {profile}
                      </div>
                    )}
                  </div>

                  {profile && (
                    <div>
                      <label className={labelClass}>Estimated Monthly Income *</label>
                      <input type="number" className={inputClass} value={selfEmployedMonthlyIncome} onChange={(e) => setSelfEmployedMonthlyIncome(e.target.value)} placeholder="Enter estimated monthly income" />
                    </div>
                  )}

                  {profile !== 'Farmer' && profile && (
                    <div>
                      <label className={labelClass}>Office Setup</label>
                      <select className={inputClass} value={hasOfficeSetup} onChange={(e) => setHasOfficeSetup(e.target.value)}>
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  )}

                  {profile === 'Farmer' && (
                    <>
                      <div>
                        <label className={labelClass}>Dairy Income</label>
                        <select className={inputClass} value={dairyIncome} onChange={(e) => setDairyIncome(e.target.value)}>
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Jamabandhi Available</label>
                        <select className={inputClass} value={jamabandhiAvailable} onChange={(e) => setJamabandhiAvailable(e.target.value)}>
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    </>
                  )}

                  {profile && profile !== 'Farmer' && (
                    <div>
                      <label className={labelClass}>ITR Available</label>
                      <select className={inputClass} value={itrAvailable} onChange={(e) => setItrAvailable(e.target.value)}>
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  )}
                  {itrAvailable === 'Yes' && (
                    <div>
                      <label className={labelClass}>Annual Income (ITR) *</label>
                      <input type="number" className={inputClass} value={annualIncomeItr} onChange={(e) => setAnnualIncomeItr(e.target.value)} placeholder="Enter annual income" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Down Payment / Asset Value — meaning depends on case type */}
          <div className="mt-4 pt-3 border-t border-border space-y-2">
            <h3 className={sectionTitleClass + ' mb-0'}>
              <IndianRupee size={13} className="text-primary" />
              {caseType && !isPurchaseCaseType(caseType) ? 'Current Vehicle/Asset Value' : 'Down Payment'}
            </h3>
            {caseType && !isPurchaseCaseType(caseType) && (
              <p className="text-[10px] text-muted-foreground -mt-1">
                For Refinance/BT there's no down payment — enter the vehicle's current value instead; the lender's LTV% applies directly to it.
              </p>
            )}
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Amount *</label>
              <div className="flex items-center gap-0.5 bg-muted rounded-lg px-2 py-1">
                <span className="text-xs text-muted-foreground">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatWithCommas(downPayment)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^0-9]/g, '');
                    const raw = digits === '' ? 0 : Number(digits);
                    if (raw <= 5000000) setDownPayment(raw);
                  }}
                  className="w-24 bg-transparent text-right font-semibold text-xs outline-none"
                />
              </div>
            </div>
            <Slider value={[downPayment]} onValueChange={(v) => setDownPayment(v[0])} min={10000} max={5000000} step={5000} />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>₹10K</span><span>₹50L</span>
            </div>
          </div>

          <button
            onClick={handleCheck}
            disabled={!canSubmit || loading}
            className="mt-4 w-full md:w-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Calculator size={13} />}
            Check Eligibility
          </button>

          {searched && (
            <div className="space-y-2 mt-4 pt-4 border-t border-border">
              {results.length === 0 ? (
                <div className="text-center py-4">
                  <AlertCircle size={28} className="mx-auto text-amber-500 mb-2" />
                  <h3 className="text-xs font-semibold text-foreground mb-0.5">No Banks Configured</h3>
                  <p className="text-[11px] text-muted-foreground">Add banks in Bank Management first.</p>
                </div>
              ) : (
                results.map((r) => (
                  <div key={r.bank_id} className={`rounded-lg border border-border p-2.5 ${!r.eligible ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {r.logo_url && (
                          <div className="w-8 h-8 rounded-lg bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center border border-border">
                            <img
                              src={`${API_URL}${r.logo_url.startsWith('/') ? '' : '/'}${r.logo_url}`}
                              alt={r.bank_name}
                              className="w-full h-full object-contain"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                        )}
                        <div>
                          <h3 className="text-xs font-bold text-foreground flex items-center gap-1">
                            {r.bank_name}
                            {r.eligible ? (
                              <CheckCircle2 size={11} className="text-green-600" />
                            ) : (
                              <XCircle size={11} className="text-red-500" />
                            )}
                          </h3>
                          {!r.eligible && r.reasons.length > 0 && (
                            <p className="text-[10px] text-red-600 mt-0.5">{r.reasons[0]}</p>
                          )}
                        </div>
                      </div>

                      {r.eligible && (
                        <div className="flex flex-wrap gap-1.5 text-right">
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                            ₹{r.loan_amount?.toLocaleString('en-IN')}
                          </span>
                          {r.roi != null && (
                            <span className="px-2 py-0.5 rounded-full bg-muted text-foreground text-[10px] font-semibold">
                              {r.roi}% ROI
                            </span>
                          )}
                          {r.max_tenure != null && (
                            <span className="px-2 py-0.5 rounded-full bg-muted text-foreground text-[10px] font-semibold">
                              {r.min_tenure ?? 0}–{r.max_tenure}m
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
    </div>
  );
}
