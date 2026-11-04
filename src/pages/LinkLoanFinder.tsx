import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search, AlertTriangle, CheckCircle, RefreshCw, Car, CreditCard,
  Building2, ChevronDown, ChevronUp, Loader2, ShieldAlert, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { Navigate, useSearchParams } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '/api';
const ALLOWED_ROLES = ['admin', 'sales_manager', 'branch_manager'];

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  };
}

function fmt(v: any) { return v || '—'; }
function fmtCur(v: any) {
  const n = Number(v);
  return isNaN(n) || n === 0 ? '—' : `₹${n.toLocaleString('en-IN')}`;
}

interface AutoLoan {
  account_number?: string;
  subscriber_name?: string;
  account_type?: string;
  sanctioned_amount?: number;
  current_balance?: number;
  open_date?: string;
  close_date?: string;
  account_holder_type?: string;
  ownership_indicator?: string;
  account_status?: string;
  date_reported?: string;
  security_status?: string;
  emi_amount?: number;
  amount_overdue?: number;
}

function InfoCell({ label, value, highlight, small }: { label: string; value: string; highlight?: boolean; small?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`font-bold text-slate-500 uppercase tracking-widest ${small ? 'text-[9px]' : 'text-[10px]'}`}>{label}</span>
      <span className={`font-bold ${small ? 'text-xs' : 'text-sm'} ${highlight ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}>{value}</span>
    </div>
  );
}

function dpdColor(dpd: number) {
  if (dpd === 0) return 'bg-[#22C55E]';
  if (dpd <= 30) return 'bg-[#EAB308]';
  if (dpd <= 60) return 'bg-[#F97316]';
  if (dpd <= 90) return 'bg-[#EF4444]';
  return 'bg-[#7F1D1D]';
}

function PaymentHistoryGrid({ history }: { history: any[] }) {
  if (!history || history.length === 0) return (
    <p className="text-[11px] text-slate-400 italic">No payment history available</p>
  );

  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // byYear[year][month] = { dpd, isXXX }
  const byYear: Record<string, Record<number, { dpd: number; isXXX: boolean }>> = {};

  history.forEach((ph: any) => {
    const m = parseInt(String(ph.month || '0'));
    const y = parseInt(String(ph.year || '0'));
    const raw = String(ph.days_past_due || '').trim();
    const isXXX = raw.toUpperCase() === 'XXX';
    const dpd = isXXX ? 0 : (parseInt(raw.replace(/[^0-9]/g, '')) || 0);
    if (m >= 1 && m <= 12 && y > 0) {
      if (!byYear[y]) byYear[y] = {};
      byYear[y][m] = { dpd, isXXX: false };
    }
  });

  const sortedYears = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));
  if (sortedYears.length === 0) return (
    <p className="text-[11px] text-slate-400 italic">No payment history available</p>
  );

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Payment History</p>
      <div className="flex flex-col gap-4">
        {sortedYears.map(yr => (
          <div key={yr}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-[#1E3A5F] w-10">{yr}</span>
              <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="grid grid-cols-12 gap-0.5">
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => {
                const cell = byYear[yr]?.[m];
                const hasData = cell !== undefined;
                const isXXX = cell?.isXXX;
                const dpd = cell?.dpd ?? 0;
                let bg = 'bg-slate-100 dark:bg-slate-800';
                let label: string | number = '';
                let textColor = 'text-slate-300';
                if (hasData) {
                  bg = dpdColor(dpd);
                    label = dpd === 0 ? '✓' : dpd;
                    textColor = 'text-white';
                }
                return (
                  <div key={m} className="flex flex-col items-center gap-px">
                    <span className="text-[6px] font-bold text-slate-400 uppercase">{MONTHS_SHORT[m-1]}</span>
                    <div
                      className={`w-full h-4 ${bg} rounded-sm flex items-center justify-center text-[7px] font-bold ${textColor} cursor-help`}
                      title={hasData ? (isXXX ? `${MONTHS_SHORT[m-1]} ${yr}: No data` : `${MONTHS_SHORT[m-1]} ${yr}: ${dpd} DPD`) : `${MONTHS_SHORT[m-1]} ${yr}: —`}
                    >
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800">
        {[
          { color: 'bg-[#22C55E]', label: 'On Time (0 DPD)' },
          { color: 'bg-[#EAB308]', label: '1–30 DPD' },
          { color: 'bg-[#F97316]', label: '31–60 DPD' },
          { color: 'bg-[#EF4444]', label: '61–90 DPD' },
          { color: 'bg-[#7F1D1D]', label: '90+ DPD' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
            <span className="text-[9px] font-bold text-slate-500 uppercase">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


function TagLinkLoanButton({ rc, lender, loans }: { rc: string; lender: string; loans: AutoLoan[] }) {
  const [tagging, setTagging] = useState(false);
  const [tagged, setTagged] = useState(false);

  const handleTag = async () => {
    setTagging(true);
    try {
      const res = await fetch(`${API}/link-loan/tag-lead`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ rc_number: rc, lender, link_loans: loans }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to tag lead');
      setTagged(true);
      toast.success('Lead tagged as LINK LOAN EXIST');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTagging(false);
    }
  };

  if (tagged) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-300 text-green-700 dark:text-green-400 text-sm font-semibold">
        <CheckCircle size={16} /> Lead successfully tagged as LINK LOAN EXIST
      </div>
    );
  }

  return (
    <button
      onClick={handleTag}
      disabled={tagging}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-60 transition-all"
    >
      {tagging ? <Loader2 size={15} className="animate-spin" /> : <Tag size={15} />}
      Tag Lead as LINK LOAN EXIST
    </button>
  );
}

export default function LinkLoanFinder() {
  const { user } = useAuth();

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const [searchParams] = useSearchParams();
  const rcQuery = searchParams.get('rc');

  const [rc, setRc] = useState(rcQuery ? rcQuery.toUpperCase() : '');
  const [loadingRc, setLoadingRc] = useState(false);
  const [vehicle, setVehicle] = useState<any>(null);
  const [manualMobile, setManualMobile] = useState('');
  const [manualFirstName, setManualFirstName] = useState('');
  const [manualLastName, setManualLastName] = useState('');
  const [manualPan, setManualPan] = useState('');
  const [creditFetchTriggered, setCreditFetchTriggered] = useState(false);
  const [loadingCredit, setLoadingCredit] = useState(false);
  const [allLoans, setAllLoans] = useState<AutoLoan[]>([]);
  const [autoLoans, setAutoLoans] = useState<AutoLoan[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  const [creditScore, setCreditScore] = useState<number | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<AutoLoan | null>(null);
  const [sameLenderLoans, setSameLenderLoans] = useState<AutoLoan[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [creditFetched, setCreditFetched] = useState(false);
  const [personalInfo, setPersonalInfo] = useState<{name?: string; pan?: string; mobile?: string}>({});

  const isFinanced = vehicle?.finance_status &&
    !['not financed', 'noc issued', 'clear', ''].includes((vehicle.finance_status || '').toLowerCase());

  const handleRcSearch = async (searchRc?: string) => {
    const rcToSearch = String(searchRc || rc || '');
    if (!rcToSearch.trim()) { toast.error('Enter a vehicle RC number'); return; }
    setLoadingRc(true);
    setVehicle(null); setAllLoans([]); setAutoLoans([]); setSelectedLoan(null); setSameLenderLoans([]);
    setCreditScore(null); setCreditFetched(false); setPersonalInfo({});
    setManualMobile(''); setManualFirstName(''); setManualLastName(''); setManualPan('');
    try {
      const res = await fetch(`${API}/link-loan/rc-lookup`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ rc_number: rcToSearch.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'RC lookup failed');
      setVehicle(data);
      setManualMobile(String(data.mobile || ''));
      setManualFirstName(String(data.first_name || ''));
      setManualLastName(String(data.last_name || ''));
      setManualPan(String(data.pan || ''));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingRc(false);
    }
  };

  useEffect(() => {
    if (rcQuery && !vehicle && !loadingRc) {
      handleRcSearch(rcQuery);
    }
  }, [rcQuery]);

  // Removed duplicated isFinanced
  // Fetch credit report when triggered
  useEffect(() => {
    if (!creditFetchTriggered || !vehicle || !isFinanced) return;
    const firstName = manualFirstName.trim();
    const mobile = manualMobile.trim();
    if (!firstName || mobile.length < 10) {
      toast.error('First name and 10-digit mobile are required');
      setCreditFetchTriggered(false);
      return;
    }
    const name = `${firstName} ${manualLastName.trim()}`.trim();
    setLoadingCredit(true);
    setAllLoans([]); setAutoLoans([]); setSelectedLoan(null); setSameLenderLoans([]); setCreditScore(null); setCreditFetched(false); setPersonalInfo({});
    fetch(`${API}/link-loan/credit-report`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name, mobile, rc_number: rc.trim().toUpperCase(), pan: manualPan.trim().toUpperCase() }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { toast.error(data.error); return; }
        const fullReport = data.full_report || {};
        const accounts = fullReport.accounts || [];
        setAllLoans(accounts);
        setAutoLoans(data.auto_loans || []);
        setCreditScore(data.credit_score || null);
        setFromCache(data.from_cache || false);
        setCacheAge(data.cache_age || null);
        setPersonalInfo(data.full_report?.personal || {});
        setCreditFetched(true);
        if (data.warning) toast.warning(data.warning);
      })
      .catch(() => toast.error('Failed to fetch credit report'))
      .finally(() => { setLoadingCredit(false); setCreditFetchTriggered(false); });
  }, [creditFetchTriggered]);

  const handleRepull = async () => {
    if (!vehicle) return;
    const name = `${manualFirstName.trim()} ${manualLastName.trim()}`.trim();
    const mobile = manualMobile.trim();
    if (!name || mobile.length < 10) { toast.error('Name and mobile required'); return; }
    setLoadingCredit(true);
    setAllLoans([]); setAutoLoans([]); setSelectedLoan(null); setSameLenderLoans([]); setCreditScore(null); setCreditFetched(false); setPersonalInfo({});
    try {
      const res = await fetch(`${API}/link-loan/credit-report`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name, mobile, rc_number: rc.trim().toUpperCase(), force_refresh: true, pan: manualPan.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const fullReport = data.full_report || {};
      const accounts = fullReport.accounts || [];
      setAllLoans(accounts);
      setAutoLoans(data.auto_loans || []);
      setCreditScore(data.credit_score || null);
      setFromCache(data.from_cache || false);
      setCacheAge(data.cache_age || null);
      setPersonalInfo(data.full_report?.personal || {});
      setCreditFetched(true);
      if (data.warning) toast.warning(data.warning);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingCredit(false);
    }
  };

  const handleSelectLoan = (loan: AutoLoan) => {
    setSelectedLoan(loan);
    const lender = (loan.subscriber_name || '').toLowerCase();
    const others = allLoans.filter(
      l => l !== loan &&
        (l.subscriber_name || '').toLowerCase() === lender &&
        (l.account_status || '').toLowerCase() === 'active'
    );
    setSameLenderLoans(others);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldAlert size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Link Loan Finder</h1>
          <p className="text-sm text-muted-foreground">Check for linked loans via RC number and Experian credit report</p>
        </div>
      </div>

      {/* Step 1: RC Search */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Car size={16} className="text-primary" /> Step 1 — Vehicle RC Lookup
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={rc}
            onChange={e => setRc(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleRcSearch()}
            placeholder="Enter RC Number (e.g. MH12AB1234)"
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono uppercase"
          />
          <button
            onClick={() => handleRcSearch()}
            disabled={loadingRc}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-secondary font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-all"
          >
            {loadingRc ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>
        </div>

        {vehicle && (
          <div className="mt-4 p-4 rounded-xl bg-muted/40 border border-border space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoCell label="Owner Name" value={`${vehicle.first_name || ''} ${vehicle.last_name || ''}`.trim() || '—'} />
              <InfoCell label="Mobile" value={fmt(vehicle.mobile)} />
              <InfoCell label="RC Number" value={fmt(vehicle.rc_number)} />
              <InfoCell label="Vehicle" value={`${fmt(vehicle.maker_name)} ${fmt(vehicle.model_name)}`.trim()} />
              <InfoCell label="Finance Status" value={fmt(vehicle.finance_status)} highlight={isFinanced} />
              <InfoCell label="Financer" value={fmt(vehicle.financer)} />
            </div>

            {!isFinanced ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm font-medium">
                <CheckCircle size={16} /> Vehicle is not currently financed. No link loan check required.
              </div>
            ) : (
              <div className="space-y-3">
                {/* PAN field — always shown for CRIF CIBIL lookup */}
                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">CIBIL Lookup Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">First Name *</label>
                      <input type="text" value={manualFirstName} onChange={e => setManualFirstName(e.target.value)} placeholder="First name" className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Last Name</label>
                      <input type="text" value={manualLastName} onChange={e => setManualLastName(e.target.value)} placeholder="Last name" className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Mobile *</label>
                      <input type="tel" value={manualMobile} onChange={e => setManualMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile" className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono" maxLength={10} />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">PAN Number *</label>
                      <input type="text" value={manualPan} onChange={e => setManualPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))} placeholder="ABCDE1234F" className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono uppercase" maxLength={10} />
                    </div>
                  </div>
                  <button
                    onClick={() => setCreditFetchTriggered(true)}
                    disabled={!manualFirstName.trim() || manualMobile.trim().length < 10 || loadingCredit}
                    className="mt-2 flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-secondary text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    <CreditCard size={13} /> Fetch CIBIL Report
                  </button>
                </div>

                {/* Loading state */}
                {loadingCredit && (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30">
                    <Loader2 size={18} className="animate-spin text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Fetching credit report from bureau…</p>
                      <p className="text-xs text-muted-foreground">This may take a few seconds</p>
                    </div>
                  </div>
                )}

                {/* Admin repull */}
                {creditFetched && user.role === 'admin' && (
                  <div className="flex items-center justify-between">
                    {fromCache && cacheAge && (
                      <span className="text-xs text-muted-foreground">Cached · {cacheAge}</span>
                    )}
                    <button
                      onClick={handleRepull}
                      disabled={loadingCredit}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors ml-auto"
                    >
                      <RefreshCw size={13} className={loadingCredit ? 'animate-spin' : ''} /> Repull Fresh
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Credit Report Results — only shown after fetch */}
      {creditFetched && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 flex items-center justify-center">
              <CreditCard size={18} className="text-[#2D5A7B]" />
            </div>
            <h2 className="text-[15px] font-bold text-[#2D5A7B] uppercase tracking-wide">
              Step 2 — Credit Report Results
            </h2>
          </div>

          <div className="space-y-4">
            {fromCache && cacheAge && (
              <p className="text-[13px] text-slate-500">Data from cache · {cacheAge}</p>
            )}

            {/* Personal Information & Credit Score */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Personal Information Card */}
              <div className="p-6 rounded-[18px] border-[1.5px] border-[#3B82F6] bg-white dark:bg-slate-900 shadow-sm">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-4">Personal Information (Bureau)</p>
                <div className="space-y-3">
                  <InfoCell label="Full Name" value={personalInfo.name || '—'} />
                  <InfoCell label="PAN Number" value={personalInfo.pan || '—'} />
                  <InfoCell label="Mobile Number" value={personalInfo.mobile || '—'} />
                </div>
              </div>

              {/* Credit Score Card */}
              {creditScore !== null ? (
                <div className="p-6 rounded-[18px] border-[1.5px] border-[#4ADE80] bg-white dark:bg-slate-900 flex items-center gap-6 shadow-sm">
                  <div className="text-[46px] font-bold text-[#22C55E] leading-none">{creditScore}</div>
                  <div className="flex flex-col gap-1">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">Credit Score (Bureau)</p>
                    <p className="text-[18px] font-bold text-[#22C55E]">Excellent</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 text-amber-700 text-xs font-medium">
                  ⚠ Bureau score not available for this customer
                </div>
              )}
            </div>

            <div className="pt-2">
              <p className="text-[14px] text-slate-500 font-medium">Select the loan linked to this vehicle</p>
            </div>

            {/* Loan List */}
            {allLoans.length === 0 ? (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 text-green-700 dark:text-green-400 text-sm font-medium">
                <CheckCircle size={16} /> No loans found in credit bureau.
              </div>
            ) : (
              <div className="space-y-4">
                {allLoans
                  .filter(loan => {
                    const type = (loan.account_type || '').toLowerCase();
                    const status = (loan.account_status || '').toLowerCase();
                    const isAuto = autoLoans.some(al => al.account_number === loan.account_number) ||
                      ['auto loan', 'car loan', 'used car loan', 'commercial vehicle loan'].some(t => type.includes(t));
                    const isCorrectStatus = ['active', 'closed'].includes(status);
                    return isAuto && isCorrectStatus;
                  })
                  .sort((a, b) => (a.account_status === 'Active' ? -1 : 1))
                  .map((loan, i) => {
                    const isAutoLoan = true; // Since we filtered, these are all auto loans
                    const isSelected = selectedLoan === loan;

                    return (
                      <div
                        key={`${loan.account_number}-${i}`}
                        onClick={() => isAutoLoan ? handleSelectLoan(loan) : null}
                        className={`relative p-6 rounded-[20px] border-[1.5px] transition-all bg-white dark:bg-slate-900 ${isSelected
                            ? 'border-[#2D5A7B] shadow-md ring-1 ring-[#2D5A7B]/5'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          } ${isAutoLoan ? 'cursor-pointer' : 'opacity-80'}`}
                      >
                        {/* Custom Radio Button */}
                        <div className="absolute top-7 left-6">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-[#2D5A7B]' : 'border-slate-300'}`}>
                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#2D5A7B]" />}
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="pl-10">
                          <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[16px] text-[#1E3A5F]">{fmt(loan.subscriber_name)}</span>
                            </div>
                            <span className={`text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${loan.account_status === 'Active'
                                ? 'bg-[#DCFCE7] text-[#166534]'
                                : 'bg-[#F1F5F9] text-[#475569]'
                              }`}>
                              {fmt(loan.account_status)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-4">
                            <InfoCell label="Account Type" value={fmt(loan.account_type)} small />
                            <InfoCell label="Sanctioned Amt" value={fmtCur(loan.sanctioned_amount)} small />
                            <InfoCell label="Current Balance" value={fmtCur(loan.current_balance)} small />
                            <InfoCell label="EMI Amount" value={fmtCur((loan as any).emi_amount)} small />
                            <InfoCell label="Overdue Amt" value={fmtCur((loan as any).amount_overdue)} small />
                            <InfoCell label="Opened" value={fmt(loan.open_date)} small />
                            <InfoCell label="Closed" value={fmt(loan.close_date)} small />
                            <InfoCell label="Last Payment" value={fmt((loan as any).date_of_last_payment)} small />
                          </div>

                          <div className="mt-5">
                            <button
                              onClick={e => { e.stopPropagation(); setExpanded(prev => ({ ...prev, [`${loan.account_number}-${i}`]: !prev[`${loan.account_number}-${i}`] })); }}
                              className="text-[13px] font-bold text-[#2D5A7B] flex items-center gap-1 hover:opacity-80 transition-opacity"
                            >
                              {expanded[`${loan.account_number}-${i}`] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              More details
                            </button>
                          </div>

                          {expanded[`${loan.account_number}-${i}`] && (
                            <>
                              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4 pt-5 border-t border-slate-100 dark:border-slate-800">
                                <InfoCell label="Account No." value={fmt(loan.account_number)} small />
                                <InfoCell label="Holder Type" value={fmt(loan.account_holder_type)} small />
                                <InfoCell label="Reported Date" value={fmt((loan as any).date_reported)} small />
                                <InfoCell label="Security Status" value={fmt((loan as any).security_status)} small />
                                <InfoCell label="Ownership" value={fmt((loan as any).ownership_indicator || loan.account_holder_type)} small />
                                <InfoCell label="Account Status" value={fmt(loan.account_status)} small />
                              </div>
                              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <PaymentHistoryGrid history={(loan as any).payment_history || []} />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Same Lender Analysis */}
      {selectedLoan && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-primary" /> Step 3 — Same Lender Analysis
          </h2>

          {sameLenderLoans.length === 0 ? (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm font-medium">
              <CheckCircle size={16} />
              No other active loans found from <strong className="mx-1">{selectedLoan.subscriber_name}</strong>. No link loan detected.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-700">
                <AlertTriangle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-700 dark:text-red-400 text-sm">⚠ Multiple Loans Found from Same Lender</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                    {sameLenderLoans.length} additional active loan{sameLenderLoans.length > 1 ? 's' : ''} found from{' '}
                    <strong>{selectedLoan.subscriber_name}</strong>. This case should be tagged as{' '}
                    <strong>LINK LOAN EXIST</strong>.
                  </p>
                </div>
              </div>

              {sameLenderLoans.map((loan, i) => (
                <div key={i} className="p-4 rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm text-foreground">{fmt(loan.subscriber_name)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 font-semibold">LINK LOAN</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <InfoCell label="Lender Name" value={fmt(loan.subscriber_name)} />
                    <InfoCell label="Loan Account Type" value={fmt(loan.account_type)} />
                    <InfoCell label="Sanctioned Amount" value={fmtCur(loan.sanctioned_amount)} />
                    <InfoCell label="Balance Amount" value={fmtCur(loan.current_balance)} />
                    <InfoCell label="Account Opening Date" value={fmt(loan.open_date)} />
                    <InfoCell label="Account Closing Date" value={fmt(loan.close_date)} />
                    <InfoCell label="Account Holder Type" value={fmt(loan.account_holder_type || loan.ownership_indicator)} />
                  </div>
                </div>
              ))}

              <TagLinkLoanButton rc={rc} lender={selectedLoan.subscriber_name || ''} loans={sameLenderLoans} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
