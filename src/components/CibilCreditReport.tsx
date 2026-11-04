import React, { useState, useEffect } from 'react';
import { CreditCard, RefreshCw, ChevronDown, ChevronUp, Loader2, AlertTriangle, CheckCircle, User, Building2, IndianRupee } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import ConsentModal from '@/components/ConsentModal';

function getAPI() {
  return import.meta.env.VITE_API_URL || '/api';
}

function authHeaders() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function fmt(v: any) { return v || '—'; }
function fmtCur(v: any) {
  const n = Number(v);
  return isNaN(n) || n === 0 ? '—' : `₹${n.toLocaleString('en-IN')}`;
}
const ACCOUNT_TYPE_MAP: Record<string, string> = {
  '01': 'Auto Loan', '1': 'Auto Loan',
  '02': 'Home Loan', '2': 'Home Loan',
  '03': 'Property Loan', '3': 'Property Loan',
  '04': 'Loan Against Shares', '4': 'Loan Against Shares',
  '05': 'Personal Loan', '5': 'Personal Loan',
  '06': 'Consumer Loan', '6': 'Consumer Loan',
  '07': 'Gold Loan', '7': 'Gold Loan',
  '08': 'Education Loan', '8': 'Education Loan',
  '09': 'Loan to Professional', '9': 'Loan to Professional',
  '10': 'Credit Card',
  '11': 'Leasing',
  '12': 'Overdraft',
  '13': 'Two-Wheeler Loan',
  '14': 'Kisan Credit Card',
  '15': 'Commercial Vehicle Loan',
  '16': 'Fleet Card',
  '17': 'Commercial Vehicle Loan',
  '19': 'Secured Credit Card',
  '32': 'Used Car Loan',
  '33': 'Construction Equipment Loan',
  '34': 'Tractor Loan',
  '35': 'Staff Loan',
  '51': 'Business Loan',
  '52': 'Business Loan - Small',
  '53': 'Business Loan - Agriculture',
  '61': 'Business Loan - Unsecured',
  '69': 'Short Term Personal Loan',
  '00': 'Others',
};
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtAccType(v: any) {
  if (!v) return '—';
  return ACCOUNT_TYPE_MAP[String(v)] || String(v);
}

// ── Score Gauge (half-circle, 300–900) ──────────────────────────────────────
function ScoreGauge({ score }: { score: number }) {
  const pct = Math.min(Math.max((score - 300) / 600, 0), 1);
  const color = score >= 750 ? '#16a34a' : score >= 700 ? '#22c55e' : score >= 650 ? '#f59e0b' : score >= 600 ? '#f97316' : '#ef4444';
  const label = score >= 750 ? 'Excellent' : score >= 700 ? 'Good' : score >= 650 ? 'Fair' : score >= 600 ? 'Average' : 'Poor';

  // Half-circle: left=180°, right=0°, drawn left→right
  const R = 64, cx = 90, cy = 82;
  const totalArc = Math.PI * R;
  const fillArc = pct * totalArc;
  // Arc path: start at left end, sweep to right end
  const sx = cx - R, sy = cy;
  const ex = cx + R, ey = cy;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative">
        <svg width="180" height="96" viewBox="0 0 180 96">
          {/* Track */}
          <path d={`M ${sx} ${sy} A ${R} ${R} 0 0 1 ${ex} ${ey}`}
            fill="none" stroke="#e5e7eb" strokeWidth="13" strokeLinecap="round" />
          {/* Colored fill */}
          <path d={`M ${sx} ${sy} A ${R} ${R} 0 0 1 ${ex} ${ey}`}
            fill="none" stroke={color} strokeWidth="13" strokeLinecap="round"
            strokeDasharray={`${fillArc} ${totalArc}`} />
          {/* 300 label */}
          <text x={sx - 2} y={sy + 14} textAnchor="middle" fontSize="9" fill="#9ca3af" fontWeight="500">300</text>
          {/* 900 label */}
          <text x={ex + 2} y={ey + 14} textAnchor="middle" fontSize="9" fill="#9ca3af" fontWeight="500">900</text>
        </svg>
        {/* Score + label centered inside arc */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-3 pointer-events-none">
          <span className="text-3xl font-extrabold leading-none" style={{ color }}>{score}</span>
          <span className="text-xs font-bold mt-0.5" style={{ color }}>{label}</span>
        </div>
      </div>

      {/* Legend bar */}
      <div className="flex w-full mt-2 rounded-full overflow-hidden h-2">
        {[['#ef4444', 20], ['#f97316', 17], ['#f59e0b', 16], ['#22c55e', 17], ['#16a34a', 30]].map(([c, w], i) => (
          <div key={i} style={{ background: c as string, width: `${w}%` }} />
        ))}
      </div>
      <div className="flex justify-between w-full mt-1 px-0.5">
        {['Poor', 'Average', 'Fair', 'Good', 'Excellent'].map(l => (
          <span key={l} className={`text-[9px] font-semibold ${l === label ? 'text-foreground' : 'text-muted-foreground'
            }`}>{l}</span>
        ))}
      </div>
    </div>
  );
}

// ── Small label+value cell ───────────────────────────────────────────────────
function Cell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-muted/30 rounded-lg px-2.5 py-1.5 min-w-0">
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-xs font-semibold truncate ${highlight ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

// ── DPD color helper ─────────────────────────────────────────────────────────
function dpdColor(dpd: number) {
  if (dpd === 0) return { bg: 'bg-green-500' };
  if (dpd <= 30) return { bg: 'bg-yellow-400' };
  if (dpd <= 60) return { bg: 'bg-orange-500' };
  return { bg: 'bg-red-600' };
}

// ── Collapsible section wrapper ─────────────────────────────────────────────
function CollapsibleSection({ label, dot, defaultOpen = false, id, children }: {
  label: string; dot: string; defaultOpen?: boolean; id?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !id) return;
    const handler = () => setOpen(true);
    el.addEventListener('force-open', handler);
    return () => el.removeEventListener('force-open', handler);
  }, [id]);

  return (
    <div id={id} ref={ref} className="bg-card border border-border rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <p className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dot} inline-block`} />
          {label}
        </p>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </div>
      {open && <div className="px-4 pb-4 pt-3 border-t border-border">{children}</div>}
    </div>
  );
}

// ── Account card with full payment history ───────────────────────────────────
// ── Payment History Grid ───────────────────────────────────────────────────
function PaymentHistoryGrid({ history }: { history: any[] }) {
  if (!history || history.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground italic bg-muted/30 p-3 rounded-lg border border-dashed border-border">
        No monthly payment history available for this account.
      </p>
    );
  }

  const byYear: Record<number, Record<number, { dpd: number; isXXX: boolean }>> = {};

  history.forEach((ph: any) => {
    const m = parseInt(String(ph.month || ph.Month || '0'));
    const y = parseInt(String(ph.year || ph.Year || '0'));
    const raw = String(ph.days_past_due ?? ph.DaysPastDue ?? '0').trim();
    const isXXX = raw.toUpperCase() === 'XXX';
    const dpd = isXXX ? 0 : (parseInt(raw.replace(/[^0-9]/g, '')) || 0);
    if (m >= 1 && m <= 12 && y > 0) {
      if (!byYear[y]) byYear[y] = {};
      byYear[y][m] = { dpd, isXXX: false };
    }
  });

  const sortedYears = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));
  if (sortedYears.length === 0) return (
    <p className="text-[11px] text-muted-foreground italic bg-muted/30 p-3 rounded-lg border border-dashed border-border">
      No monthly payment history available for this account.
    </p>
  );

  return (
    <div className="space-y-4">
      {sortedYears.map(yr => (
        <div key={yr}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold text-foreground w-10">{yr}</span>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <div className="grid grid-cols-12 gap-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
              const cell = byYear[Number(yr)]?.[m];
              const hasData = cell !== undefined;
              const isXXX = cell?.isXXX;
              const dpd = cell?.dpd ?? 0;
              let bg = 'bg-muted/40';
              let label: string | number = '';
              let textColor = 'text-muted-foreground/30';
              if (hasData) {
                const c = dpdColor(dpd);
                bg = c.bg;
                label = dpd === 0 ? '✓' : dpd;
                textColor = 'text-white';
              }
              return (
                <div key={m} className="flex flex-col items-center gap-px">
                  <span className="text-[6px] font-bold text-muted-foreground uppercase">{MONTHS_SHORT[m - 1]}</span>
                  <div
                    className={`w-full h-4 ${bg} rounded-sm flex items-center justify-center text-[7px] font-bold ${textColor} cursor-help`}
                    title={hasData ? (isXXX ? `${MONTHS_SHORT[m - 1]} ${yr}: No data` : `${MONTHS_SHORT[m - 1]} ${yr}: ${dpd} DPD`) : `${MONTHS_SHORT[m - 1]} ${yr}: —`}
                  >
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex gap-3 flex-wrap pt-2 border-t border-border/50">
        {[
          { color: 'bg-green-500', label: 'On Time' },
          { color: 'bg-yellow-400', label: '1–30 DPD' },
          { color: 'bg-orange-500', label: '31–60 DPD' },
          { color: 'bg-red-600', label: '61–90 DPD' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
            <span className="text-[9px] font-bold text-muted-foreground uppercase">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DPD Status Summary ───────────────────────────────────────────────────
type DpdBucket = 'onTime' | 'dpd30' | 'dpd60' | 'dpd90' | 'critical';
interface DpdBank { name: string; accIndex: number; }

function DpdStatusSummary({ accounts }: { accounts: any[] }) {
  const [popup, setPopup] = useState<{ bucket: DpdBucket; banks: DpdBank[] } | null>(null);

  const stats: Record<DpdBucket, number> = { onTime: 0, dpd30: 0, dpd60: 0, dpd90: 0, critical: 0 };
  const banksByBucket: Record<DpdBucket, DpdBank[]> = { onTime: [], dpd30: [], dpd60: [], dpd90: [], critical: [] };
  let total = 0;

  accounts.forEach((acc, accIndex) => {
    const history = acc.payment_history || acc.paymentHistory || [];
    const name = acc.subscriber_name || acc.lender || 'Unknown Bank';
    const bucketHit = new Set<DpdBucket>();
    history.forEach((h: any) => {
      const dpdVal = h.days_past_due !== undefined ? h.days_past_due : h.DaysPastDue;
      const dpd = parseInt(String(dpdVal || 0).replace(/[^0-9]/g, '')) || 0;
      total++;
      let bucket: DpdBucket;
      if (dpd === 0) bucket = 'onTime';
      else if (dpd <= 30) bucket = 'dpd30';
      else if (dpd <= 60) bucket = 'dpd60';
      else if (dpd <= 90) bucket = 'dpd90';
      else bucket = 'critical';
      stats[bucket]++;
      bucketHit.add(bucket);
    });
    bucketHit.forEach(bucket => {
      if (!banksByBucket[bucket].find(b => b.accIndex === accIndex)) {
        banksByBucket[bucket].push({ name, accIndex });
      }
    });
  });

  if (total === 0) return null;

  const buckets: { key: DpdBucket; label: string; textCls: string; bgCls: string; borderCls: string }[] = [
    { key: 'onTime', label: 'On Time', textCls: 'text-green-700', bgCls: 'bg-green-500/10', borderCls: 'border-green-500/20' },
    { key: 'dpd30', label: '1-30 DPD', textCls: 'text-yellow-700', bgCls: 'bg-yellow-500/10', borderCls: 'border-yellow-500/20' },
    { key: 'dpd60', label: '31-60 DPD', textCls: 'text-orange-700', bgCls: 'bg-orange-500/10', borderCls: 'border-orange-500/20' },
    { key: 'dpd90', label: '61-90 DPD', textCls: 'text-red-700', bgCls: 'bg-red-500/10', borderCls: 'border-red-500/20' },
    { key: 'critical', label: '90+ DPD', textCls: 'text-red-950', bgCls: 'bg-red-900/10', borderCls: 'border-red-900/20' },
  ];
  // Only DPD buckets are clickable (not On Time)
  const clickableBuckets: DpdBucket[] = ['dpd30', 'dpd60', 'dpd90', 'critical'];

  const scrollToAccount = (accIndex: number) => {
    setPopup(null);
    const acc = accounts[accIndex];
    const isClosed = acc && acc.account_status !== 'Active';
    setTimeout(() => {
      if (isClosed) {
        const closedSection = document.getElementById('closed-accounts-section');
        if (closedSection) closedSection.dispatchEvent(new CustomEvent('force-open', { bubbles: true }));
      }
      setTimeout(() => {
        const el = document.getElementById(`account-card-${accIndex}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          el.dispatchEvent(new CustomEvent('dpd-open', { bubbles: true }));
        }
      }, isClosed ? 120 : 0);
    }, 80);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-3">Overall DPD Health</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {buckets.map(({ key, label, textCls, bgCls, borderCls }) => (
          <button
            key={key}
            onClick={() => clickableBuckets.includes(key) && stats[key] > 0 && setPopup(p => p?.bucket === key ? null : { bucket: key, banks: banksByBucket[key] })}
            className={`${bgCls} border ${borderCls} rounded-lg p-2 flex flex-col items-center transition-all ${clickableBuckets.includes(key) && stats[key] > 0 ? 'cursor-pointer hover:brightness-95 active:scale-95' : 'cursor-default'
              } ${popup?.bucket === key ? 'ring-2 ring-offset-1 ring-current' : ''}`}
          >
            <span className={`text-[9px] font-bold uppercase ${textCls}`}>{label}</span>
            <span className={`text-lg font-black ${textCls}`}>{stats[key]}</span>
            {clickableBuckets.includes(key) && stats[key] > 0 && <span className={`text-[8px] ${textCls} opacity-60`}>tap to view</span>}
          </button>
        ))}
      </div>

      {/* Popup */}
      {popup && (
        <div className="mt-3 bg-muted/40 border border-border rounded-xl p-3 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">
            Banks with {buckets.find(b => b.key === popup.bucket)?.label} payments
          </p>
          {popup.banks.map((b, i) => (
            <button
              key={i}
              onClick={() => scrollToAccount(b.accIndex)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border hover:bg-primary/5 hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 size={13} className="text-primary shrink-0" />
                <span className="text-xs font-semibold text-foreground truncate">{b.name}</span>
              </div>
              <span className="text-[10px] text-primary font-bold shrink-0 group-hover:underline">View ↓</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 bg-muted/30 h-1.5 rounded-full overflow-hidden flex">
        <div style={{ width: `${(stats.onTime / total) * 100}%` }} className="bg-green-500" />
        <div style={{ width: `${(stats.dpd30 / total) * 100}%` }} className="bg-yellow-500" />
        <div style={{ width: `${(stats.dpd60 / total) * 100}%` }} className="bg-orange-500" />
        <div style={{ width: `${(stats.dpd90 / total) * 100}%` }} className="bg-red-600" />
        <div style={{ width: `${(stats.critical / total) * 100}%` }} className="bg-red-950" />
      </div>
      <p className="text-[9px] text-muted-foreground text-center mt-1.5 italic">Analyzed {total} total payment months across all accounts</p>
    </div>
  );
}



function AccountCard({ acc, defaultOpen, accIndex }: { acc: any; defaultOpen?: boolean; accIndex: number }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const isActive = acc.account_status === 'Active';
  const overdue = Number(acc.amount_overdue || 0);
  const isCreditCard = String(acc.account_type).includes('Credit Card');

  useEffect(() => {
    const el = document.getElementById(`account-card-${accIndex}`);
    if (!el) return;
    const handler = () => setOpen(true);
    el.addEventListener('dpd-open', handler);
    return () => el.removeEventListener('dpd-open', handler);
  }, [accIndex]);

  return (
    <div id={`account-card-${accIndex}`} className="border border-border rounded-xl overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Building2 size={14} className="text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{fmt(acc.subscriber_name)}</p>
            <p className="text-[10px] text-muted-foreground">
              {fmtAccType(acc.account_type)} · {isCreditCard ? fmtCur(acc.credit_limit || acc.sanctioned_amount) : fmtCur(acc.sanctioned_amount)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {overdue > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold">
              DPD
            </span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isActive
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-muted text-muted-foreground'
            }`}>
            {isActive ? 'Active' : 'Closed'}
          </span>
          {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </div>

      {open && (
        <div className="px-3 pb-4 border-t border-border bg-muted/5 space-y-3">
          {/* Account details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-3">
            <Cell label="Account No." value={fmt(acc.account_number)} />
            <Cell label="Lender" value={fmt(acc.subscriber_name)} />
            <Cell label="Account Type" value={fmtAccType(acc.account_type)} />
            {isCreditCard ? (
              <Cell label="Credit Limit" value={fmtCur(acc.credit_limit || acc.sanctioned_amount)} />
            ) : (
              <Cell label="Sanctioned Amt" value={fmtCur(acc.sanctioned_amount)} />
            )}
            <Cell label="Current Balance" value={fmtCur(acc.current_balance)} />
            <Cell label="Amount Overdue" value={overdue > 0 ? fmtCur(overdue) : '₹0'} highlight={overdue > 0} />
            <Cell label="EMI Amount" value={fmtCur(acc.emi_amount)} />
            <Cell label="Open Date" value={fmt(acc.open_date)} />
            <Cell label="Close Date" value={fmt(acc.close_date)} />
            <Cell label="Last Payment" value={fmt(acc.date_of_last_payment)} />
            <Cell label="Date Reported" value={fmt(acc.date_reported)} />
            <Cell label="Holder Type" value={fmt(acc.account_holder_type)} />
          </div>

          {/* Payment History */}
          <div className="mt-4">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
              Payment History Grid
            </p>
            <PaymentHistoryGrid history={acc.payment_history || acc.paymentHistory} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
interface Props { loan: any; isStandalone?: boolean; }

const ALLOWED_STAGES = ['SUBMITTED', 'LOGIN', 'IN_PROCESS', 'APPROVED', 'DISBURSED', 'REJECTED', 'CANCELLED'];

export default function CibilCreditReport({ loan, isStandalone = false }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const stage = loan?.application_stage || '';
  const isAllowedStage = ALLOWED_STAGES.includes(stage);

  // Define roles that are allowed to download PDF reports
  const canDownload = user?.role === 'admin' || user?.role === 'sales_manager' || user?.role === 'manager';

  // Parse saved report from loan immediately — survives page refresh
  const parseSaved = (loanData: any) => {
    const rawData = loanData?.link_loan_data || loanData?.credit_report_data;
    const score = loanData?.bureau_score || loanData?.credit_score;

    // If we have either raw data OR at least a score, we have "some" report
    if (!rawData && !score) return null;

    let saved: any = rawData || {};
    // Handle potential double/triple stringified JSON
    while (typeof saved === 'string') {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          saved = parsed;
        } else {
          break; // Stop if it parses to a primitive
        }
      } catch (e) {
        break; // Stop if not valid JSON
      }
    }

    return {
      credit_score: saved.credit_score || score || null,
      auto_loans: saved.auto_loans || [],
      full_report: saved.full_report || {},
      from_db: true,
      from_cache: !!saved.from_cache,
      fetched_at: saved.fetched_at || null,
      cache_age: saved.fetched_at
        ? `${Math.floor((Date.now() - new Date(saved.fetched_at).getTime()) / 86400000)} days ago`
        : score ? 'Pulled via Score' : null,
    };
  };

  const [report, setReport] = useState<any>(() => parseSaved(loan));
  const [fromCache, setFromCache] = useState(!!parseSaved(loan));
  const [cacheAge, setCacheAge] = useState<string | null>(() => parseSaved(loan)?.cache_age || null);
  // Track whether a live fetch just completed — prevents loan prop sync from overwriting fresh data
  const freshFetchRef = React.useRef(false);

  // Sync report state whenever loan prop updates — but skip if a live fetch just ran
  useEffect(() => {
    if (freshFetchRef.current) {
      freshFetchRef.current = false;
      return;
    }
    const saved = parseSaved(loan);
    if (saved) {
      setReport(saved);
      setFromCache(true);
      setCacheAge(saved.cache_age);
    }
  }, [loan?.link_loan_data, loan?.credit_report_data, loan?.bureau_score]);

  const fetchReport = async (overrideOtp = false, forceRefresh = false) => {
    const rcNumber = (loan as any)?.vehicle_number || '';
    const name = loan?.applicant_name || loan?.customer_name || '';
    const mobile = loan?.mobile || loan?.phone || '';
    if (!name) { toast.error('Applicant name required'); return; }
    if (!mobile) { toast.error('Mobile number required'); return; }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Session expired. Please log in again.');
        return;
      }
      
      if (!forceRefresh && !otpVerified && overrideOtp !== true) {
        setLoading(true);
        const cacheCheckRes = await fetch(`${getAPI()}/link-loan/credit-report`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ name, mobile, rc_number: rcNumber, check_cache_only: true }),
        });
        if (cacheCheckRes.ok) {
          const cacheCheckData = await cacheCheckRes.json();
          if (cacheCheckData.cache_miss && !cacheCheckData.consent_already_approved) {
            setLoading(false);
            setShowConsentModal(true);
            return;
          }
        }
        setLoading(false);
      }
      
      setLoading(true);
      const res = await fetch(`${getAPI()}/link-loan/credit-report`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name, mobile, pan: loan?.pan_number || loan?.pan || '', rc_number: rcNumber, force_refresh: forceRefresh, standalone_report_id: isStandalone ? loan?.id : undefined }),
      });
      const text = await res.text();
      if (!text || !text.trim()) {
        throw new Error('Server returned an empty response. Please try again.');
      }
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Server returned invalid response. Please try again.');
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch credit report');
      }
      freshFetchRef.current = true;
      setReport(data);
      setFromCache(data.from_cache || false);
      setCacheAge(data.cache_age || null);

      // Invalidate the correct queries based on the context
      if (isStandalone) {
        queryClient.invalidateQueries({ queryKey: ['standalone-credit-reports'] });
      } else if (loan?.id && typeof loan.id === 'number') {
        queryClient.invalidateQueries({ queryKey: ['loan', String(loan.id)] });
        queryClient.invalidateQueries({ queryKey: ['lead', String(loan.id)] });
        queryClient.invalidateQueries({ queryKey: ['loan'] });
        queryClient.invalidateQueries({ queryKey: ['lead'] });
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!report) return;
    setDownloadingPDF(true);
    try {
      const res = await fetch(`${getAPI()}/credit-reports/generate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          reportData: {
            credit_score: report.credit_score,
            full_report: report.full_report || {},
            auto_loans: report.auto_loans || [],
            from_cache: report.from_cache || report.from_db || false,
            fetched_at: report.fetched_at || new Date().toISOString(),
          },
          loanId: loan?.id || 'unknown',
          customerName:
            loan?.applicant_name ||
            loan?.customer_name ||
            report?.full_report?.personal?.name ||
            '',
        }),
      });
      const data = await res.json();
      if (!data.success || !data.pdf?.fileName) throw new Error(data.message || 'PDF generation failed');

      const pdfRes = await fetch(`${getAPI()}/credit-reports/download/${data.pdf.fileName}`, {
        headers: authHeaders(),
      });
      if (!pdfRes.ok) throw new Error('Failed to fetch PDF file');
      const blob = await pdfRes.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CRIF_Report_${loan?.applicant_name || loan?.customer_name || 'Customer'}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to download PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Render if stage is appropriate OR if we already have report data
  const shouldShow = isAllowedStage || !!report;
  if (!shouldShow) return null;

  const score: number = report?.credit_score || 0;
  const full = report?.full_report || {};
  const personal = full.personal || {};
  const accounts: any[] = full.accounts || [];
  const enquiries: any[] = full.enquiries || [];
  const autoLoans: any[] = report?.auto_loans || [];

  const activeCount = accounts.filter(a => a.account_status === 'Active').length;
  const closedCount = accounts.filter(a => a.account_status !== 'Active').length;
  const totalBalance = accounts.reduce((s, a) => s + (Number(a.current_balance) || 0), 0);
  const totalOverdue = accounts.reduce((s, a) => s + (Number(a.amount_overdue) || 0), 0);

  return (
    <div className="space-y-4">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-primary" />
          <span className="text-sm font-bold text-foreground">CRIF Credit Score Report</span>
          {fromCache && cacheAge && (
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Cached · {cacheAge}
            </span>
          )}
        </div>
        {report && (
          <div className="flex items-center gap-2">
            {user?.role === 'admin' && (
              <button
                onClick={() => fetchReport(true, true)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all shadow-sm disabled:opacity-60"
                title="Trigger a fresh Hard Pull from the Bureau API"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Hard Pull (Bureau)
              </button>
            )}
            <button
              onClick={() => fetchReport(false, false)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-60"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            {canDownload && (
              <button
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-60"
                title="Download Credit Report as PDF"
              >
                {downloadingPDF ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                {downloadingPDF ? 'Generating...' : 'Download PDF'}
              </button>
            )}
          </div>
        )}
      </div>

      {report && !loading && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${report.from_db || report.from_cache
          ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'
          : 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
          }`}>
          <div className={`w-2 h-2 rounded-full ${report.from_db || report.from_cache ? 'bg-amber-500' : 'bg-green-500'} animate-pulse`} />
          <span>
            {report.from_db || report.from_cache
              ? `Source: Local Database (Fetched ${report.cache_age || 'previously'})`
              : 'Source: Live Bureau API (Fresh Data)'}
          </span>
          {(report.from_db || report.from_cache) && (
            <span className="ml-auto text-[10px] opacity-70">Admin can repull for latest data</span>
          )}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground bg-card border border-border rounded-2xl animate-pulse">
          <Loader2 size={32} className="animate-spin text-primary" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-bold text-foreground">Fetching Live Bureau Report</span>
            <span className="text-[11px] opacity-70">Contacting Experian/CIBIL API...</span>
          </div>
        </div>
      )}

      {!report && !loading && (
        <div className="space-y-4">
          {/* Customer Information Card */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <User size={14} className="text-primary" />
              <p className="text-xs font-bold text-foreground uppercase tracking-wide">Customer Information</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {loan?.applicant_name && <Cell label="Full Name" value={loan.applicant_name} />}
              {loan?.mobile && <Cell label="Mobile" value={loan.mobile} />}
              {loan?.email && <Cell label="Email" value={loan.email} />}
              {loan?.customer_id && <Cell label="Customer ID" value={loan.customer_id} />}
              {loan?.loan_number && <Cell label="Loan Number" value={loan.loan_number} />}
              {(loan as any)?.current_address && (
                <div className="col-span-2 sm:col-span-3 bg-muted/30 rounded-lg px-2.5 py-1.5">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Address</p>
                  <p className="text-xs font-semibold text-foreground">{(loan as any).current_address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Information Card */}
          {(loan as any)?.vehicle_number && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={14} className="text-primary" />
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">Vehicle Information</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {(loan as any)?.vehicle_number && <Cell label="Registration No" value={(loan as any).vehicle_number} />}
                {(loan as any)?.maker_name && <Cell label="Maker" value={(loan as any).maker_name} />}
                {(loan as any)?.model_variant_name && <Cell label="Model" value={(loan as any).model_variant_name} />}
                {(loan as any)?.fuel_type && <Cell label="Fuel Type" value={(loan as any).fuel_type} />}
                {(loan as any)?.manufacturing_date && <Cell label="Manufacturing Date" value={new Date((loan as any).manufacturing_date).toLocaleDateString('en-IN')} />}
                {(loan as any)?.ownership_type && <Cell label="Ownership" value={(loan as any).ownership_type} />}
              </div>
            </div>
          )}

          {/* Loan Details Card */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <IndianRupee size={14} className="text-primary" />
              <p className="text-xs font-bold text-foreground uppercase tracking-wide">Loan Details</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {loan?.loan_amount && <Cell label="Loan Amount" value={fmtCur(loan.loan_amount)} />}
              {loan?.tenure && <Cell label="Tenure" value={`${loan.tenure} months`} />}
              {(loan as any)?.selected_financier && <Cell label="Financier" value={(loan as any).selected_financier} />}
              {(loan as any)?.case_type && <Cell label="Case Type" value={(loan as any).case_type} />}
              {(loan as any)?.income_source && <Cell label="Income Source" value={(loan as any).income_source} />}
              {(loan as any)?.monthly_income && <Cell label="Monthly Income" value={fmtCur((loan as any).monthly_income)} />}
            </div>
          </div>

          {/* Fetch Credit Report CTA */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {/* Subtle gradient top bar */}
            <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-blue-500/60 to-primary/30" />

            <div className="flex flex-col items-center text-center px-6 py-10">
              {/* Icon ring */}
              <div className="relative mb-5">
                <div className="w-20 h-20 rounded-full bg-primary/8 border border-primary/15 flex items-center justify-center">
                  <CreditCard size={34} className="text-primary" />
                </div>
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 border-2 border-card flex items-center justify-center">
                  <AlertTriangle size={10} className="text-white" />
                </span>
              </div>

              <h3 className="text-base font-extrabold text-foreground tracking-tight">No Credit Report Found</h3>
              <p className="text-xs text-muted-foreground max-w-xs mt-1.5 leading-relaxed">
                Pull the latest bureau data from <span className="font-semibold text-foreground">CRIF / Experian</span> to view credit score, payment history &amp; linked loans.
              </p>

              {/* Divider */}
              <div className="w-full max-w-xs h-px bg-border my-5" />

              {/* Feature pills */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {['Credit Score', 'Payment History', 'Active Loans', 'DPD Analysis'].map(f => (
                  <span key={f} className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-primary/8 text-primary border border-primary/15">{f}</span>
                ))}
              </div>

              {user?.role === 'admin' ? (
                <button
                  onClick={() => fetchReport(true)}
                  className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] bg-red-600 hover:bg-red-700 text-white shadow-red-600/25"
                >
                  <RefreshCw size={15} />
                  Fetch Bureau Report (Hard Pull)
                </button>
              ) : (
                <button
                  onClick={() => fetchReport(false)}
                  className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary hover:opacity-90 text-primary-foreground shadow-primary/25"
                >
                  <RefreshCw size={15} />
                  Fetch Bureau Report (via Consent)
                </button>
              )}

              {user?.role !== 'admin' && (
                <p className="text-[10px] text-muted-foreground mt-3">Contact admin for a fresh hard pull from the bureau</p>
              )}
            </div>
          </div>
        </div>
      )}

      {report && !loading && (
        <>
          <DpdStatusSummary accounts={accounts} />

          {/* ── Score + Summary ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Score gauge */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-1">
              {/* CRIF Logo + Title */}
              <div className="flex items-center gap-2 mb-2 w-full">
                <img src="/crif.png" alt="CRIF High Mark" className="h-8 w-auto object-contain" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">CRIF Credit Score</p>
              </div>
              {score > 0 ? (
                <ScoreGauge score={score} />
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground py-6">
                  <AlertTriangle size={16} />
                  <span className="text-sm">Score not available</span>
                </div>
              )}
            </div>

            {/* Summary stats */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-3">Account Summary</p>
              <div className="grid grid-cols-2 gap-1.5">
                <Cell label="Total Accounts" value={String(accounts.length)} />
                <Cell label="Active Accounts" value={String(activeCount)} />
                <Cell label="Closed Accounts" value={String(closedCount)} />
                <Cell label="Auto Loans" value={String(autoLoans.length)} />
                <Cell label="Total Balance" value={fmtCur(totalBalance)} />
                <Cell label="Total Overdue" value={totalOverdue > 0 ? fmtCur(totalOverdue) : '₹0'} highlight={totalOverdue > 0} />
                <Cell label="Enquiries" value={String(enquiries.length)} />
              </div>
              <div className="mt-3">
                {totalOverdue > 0 ? (
                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs font-semibold">
                    <AlertTriangle size={12} /> Overdue amount detected — review required
                  </div>
                ) : accounts.length > 0 ? (
                  <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-semibold">
                    <CheckCircle size={12} /> No overdue amount
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* ── Personal Information ── */}
          {(personal.name || personal.pan || personal.mobile) && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <User size={14} className="text-primary" />
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">Personal Information</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {personal.name && <Cell label="Full Name" value={personal.name} />}
                {personal.dob && <Cell label="Date of Birth" value={personal.dob} />}
                {personal.gender && <Cell label="Gender" value={personal.gender} />}
                {personal.pan && <Cell label="PAN" value={personal.pan} />}
                {personal.mobile && <Cell label="Mobile" value={personal.mobile} />}
                {personal.address && (
                  <div className="col-span-2 sm:col-span-3 bg-muted/30 rounded-lg px-2.5 py-1.5">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Address</p>
                    <p className="text-xs font-semibold text-foreground">{personal.address}</p>
                  </div>
                )}
              </div>
            </div>
          )}



          {/* ── Active Accounts ── */}
          <CollapsibleSection
            label={`Active Accounts (${activeCount})`}
            dot="bg-green-500"
            defaultOpen
          >
            {activeCount > 0 ? (
              <div className="space-y-2">
                {accounts.filter(a => a.account_status === 'Active').map((acc, i) => (
                  <AccountCard key={i} acc={acc} defaultOpen={true} accIndex={accounts.indexOf(acc)} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No active accounts found.</p>
            )}
          </CollapsibleSection>

          {/* ── Closed Accounts ── */}
          <CollapsibleSection
            label={`Closed Accounts (${closedCount})`}
            dot="bg-muted-foreground"
            id="closed-accounts-section"
          >
            {closedCount > 0 ? (
              <div className="space-y-2">
                {accounts.filter(a => a.account_status !== 'Active').map((acc, i) => (
                  <AccountCard key={i} acc={acc} accIndex={accounts.indexOf(acc)} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No closed accounts found.</p>
            )}
          </CollapsibleSection>

          {enquiries.length > 0 && (
            <CollapsibleSection
              label={`Credit Enquiries (${enquiries.length})`}
              dot="bg-blue-500"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1.5 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Institution</th>
                      <th className="text-left py-1.5 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Purpose</th>
                      <th className="text-left py-1.5 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="text-right py-1.5 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map((e: any, i: number) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-1.5 px-2 font-semibold text-foreground">{fmt(e.lender || e.institution_name)}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{fmt(e.purpose || e.enquiry_purpose)}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{fmt(e.date || e.enquiry_date)}</td>
                        <td className="py-1.5 px-2 text-right text-muted-foreground">{e.amount > 0 ? fmtCur(e.amount) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}
        </>
      )}

      {showConsentModal && (
        <ConsentModal
          isOpen={true}
          mobile={loan?.mobile || loan?.phone || ''}
          hideSkipButton={true}
          onSuccess={() => {
            setShowConsentModal(false);
            setOtpVerified(true);
            fetchReport(true, false);
          }}
          onClose={() => setShowConsentModal(false)}
        />
      )}
    </div>
  );
}

