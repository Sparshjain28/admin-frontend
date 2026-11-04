import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search, Loader2, ScanSearch, AlertCircle, CheckCircle2, Star,
  TrendingDown, TrendingUp, Minus, Database, Gauge, Info,
  Camera, History, Building2,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  };
}

/* ------------------------------------------------------------------ *
 * Ranking — faithful copy of LinkLoanFinderStep.tsx:111-151.
 * This page must order lenders EXACTLY as the live Add Lead screen
 * does, otherwise "selected was rank N" is meaningless.
 * If the sort changes there, change it here too.
 * ------------------------------------------------------------------ */
const SORT_SIGNATURE = 'tier > loanAmount > roi > tenure  (src: LinkLoanFinderStep.tsx:111-151)';

type Mode = 'thin' | 'rich';
type DateMode = 'pinned' | 'today';
type ActiveView = 'snapshot' | 'replay';

interface Lead {
  id: string;
  customer_id?: string;
  loan_number?: string;
  customer_name?: string;
  phone?: string;
  vehicle_number?: string;
  case_type?: string;
  created_at?: string;
  stage_data?: any;
  lead_stage_data?: any;
  __source?: 'lead' | 'loan';
}

interface FieldRow {
  label: string;
  value: string;
  source: 'stage_data' | 'lead' | 'missing' | 'derived';
  richOnly?: boolean;
  note?: string;
  /** value came from the linked loan, i.e. was recorded after the search ran */
  lateNote?: boolean;
}

export default function LenderAnalysis() {
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<Lead[]>([]);
  const [lead, setLead] = useState<Lead | null>(null);
  const [stageData, setStageData] = useState<any>(null);

  const [activeView, setActiveView] = useState<ActiveView>('snapshot');
  const [mode, setMode] = useState<Mode>('thin');
  const [running, setRunning] = useState(false);
  const [lenders, setLenders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [runError, setRunError] = useState<string | null>(null);
  // The linked loan when a lead is loaded (or vice versa). It is not optional
  // detail: leads.stage_data is frozen at the lender step, so everything the RM
  // filled in afterwards exists only on the loan.
  const [companion, setCompanion] = useState<any>(null);
  // 'pinned' reproduces the original run; 'today' omits the dates so the BRE
  // falls back to new Date() — i.e. what the same lead would score if it walked
  // in this morning. Tracked separately from `mode` so either can be compared.
  const [dateMode, setDateMode] = useState<DateMode>('pinned');
  const [ranWith, setRanWith] = useState<{ mode: Mode; dateMode: DateMode } | null>(null);
  const [apiIdv, setApiIdv] = useState<number | null>(null);
  const [idvFetching, setIdvFetching] = useState(false);

  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  /* ---------------- lookup ---------------- */

  // Two different snapshots exist and they are NOT interchangeable:
  //
  //   leads.stage_data  = the whole /add-lead/submit request body
  //                       (addLeadController.js:382-385 stores JSON.stringify(req.body))
  //                       -> ~20 keys: selectedAddress, creditScore, autoLoans,
  //                          selectedLoanId, dropdowns, fullReport, rc_data, idvData...
  //   loans.stage_data  = a hand-built 9-key object (AddLead.tsx:972-982)
  //                       -> selectedBankDetails, idvData, rcData, residenceType + 5 farm fields
  //
  // getLoanById returns BOTH (l.stage_data at loanController.js:912 and
  // ld.stage_data as lead_stage_data at :921). Preferring `stage_data` picked the
  // THIN one on every loan-sourced record, which is why the credit score, auto
  // loans, selected bank and address all came back missing. Merge with the rich
  // lead snapshot winning, so nothing the RM's session had is lost.
  const asObj = (raw: any) => {
    if (!raw) return null;
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
  };

  // WHY A SECOND RECORD IS FETCHED AT ALL.
  //
  // leads.stage_data is written by saveLeadMutation -> POST /add-lead/submit,
  // and that fires from LinkLoanFinderStep's onSubmit (AddLead.tsx:1985-1991) —
  // i.e. ON THE LENDER STEP, step 4. Income Source, Profile and Residence Type
  // are collected on step 5 (AddLead.tsx:2010), and the bank is picked via
  // onApply moments later. So the lead snapshot is frozen BEFORE any of that
  // exists, and no amount of reading it harder will produce those values.
  //
  // They were saved — on the loan, at final submit: income_source and profile as
  // columns (loanController.js:1366,1687) and residenceType/selectedBankDetails/
  // idvData inside loans.stage_data (AddLead.tsx:972-982). getLeadById hands us
  // ln.id as loan_id (leadController.js:369), so the loan is reachable.
  //
  // Precedence is deliberate: the LEAD snapshot wins wherever it has a value,
  // because it is the state as of the search. The loan only fills the gaps —
  // and those gap-filled fields are all rich-mode-only, never sent in thin, so
  // recovering them cannot distort the reproduction.
  const mergeSnapshots = (primary: any, secondary: any) => {
    if (!primary && !secondary) return null;
    // A blanket {...thin, ...rich} is wrong: the rich lead snapshot is a
    // progress-save, so it frequently holds a key the RM had not filled in yet
    // ('' or null), and that empty value would clobber the filled one on the
    // loan's own snapshot. residenceType is the live example — LoanDetail reads
    // it from loan.stage_data (ApplicantTab.tsx:38), and the lead snapshot's
    // empty copy was hiding it. Rich still wins, but only when it has something.
    const isEmpty = (v: any) =>
      v == null || v === '' ||
      (Array.isArray(v) && v.length === 0) ||
      (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
    const out: any = { ...(secondary || {}) };
    for (const [k, v] of Object.entries(primary || {})) {
      if (!isEmpty(v) || !(k in out)) out[k] = v;
    }
    return out;
  };

  // Keys the lead snapshot could not possibly hold, so the UI can say where a
  // value came from and, more importantly, WHEN it was recorded.
  const fromLoanOnly = (sdMerged: any, leadSd: any) =>
    new Set(Object.keys(sdMerged || {}).filter(k => {
      const lv = leadSd?.[k];
      return lv == null || lv === '' ||
        (Array.isArray(lv) && lv.length === 0) ||
        (typeof lv === 'object' && !Array.isArray(lv) && Object.keys(lv).length === 0);
    }));

  const handleSearch = async () => {
    const q = query.trim();
    if (q.length < 2) {
      toast.error('Enter an application number');
      return;
    }
    setSearching(true);
    setMatches([]);
    setLead(null);
    setStageData(null);
    setLenders([]);
    setStats(null);
    setRunError(null);
    try {
      // Leads first.
      const leadRes = await fetch(`${API}/leads?search=${encodeURIComponent(q)}&limit=10`, {
        headers: authHeaders(),
      });
      if (!leadRes.ok) throw new Error(`Lead lookup failed (HTTP ${leadRes.status})`);
      const leadRows = await leadRes.json();
      const leadList: Lead[] = (Array.isArray(leadRows) ? leadRows : leadRows?.leads || [])
        .map((r: any) => ({ ...r, __source: 'lead' as const }));

      // Loans as a fallback: a loan created by Reapply carries no lead_id
      // (AddLead.tsx:911), so /leads?search= can never reach it even though
      // the Loans screen shows it.
      let loanList: Lead[] = [];
      if (leadList.length === 0) {
        const loanRes = await fetch(`${API}/loans/search?q=${encodeURIComponent(q)}`, {
          headers: authHeaders(),
        });
        if (loanRes.ok) {
          const loanRows = await loanRes.json();
          loanList = (Array.isArray(loanRows) ? loanRows : [])
            .map((r: any) => ({ ...r, __source: 'loan' as const }));
        }
      }

      const list = [...leadList, ...loanList];
      if (list.length === 0) {
        setRunError(`Nothing matched "${q}" — 0 leads, 0 loans. Check the number, or whether your role can see this record.`);
        toast.error('No lead or loan found for that number');
        return;
      }
      if (list.length === 1) {
        await loadLead(list[0].id, list[0].__source || 'lead');
      } else {
        setMatches(list);
      }
    } catch (e: any) {
      toast.error(e.message || 'Lookup failed');
    } finally {
      setSearching(false);
    }
  };

  const loadLead = async (id: string, source: 'lead' | 'loan' = 'lead') => {
    setMatches([]);
    setApiIdv(null);
    setCompanion(null);
    try {
      const path = source === 'loan' ? `${API}/loans/${id}` : `${API}/leads/${id}`;
      const res = await fetch(path, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Could not load ${source} (HTTP ${res.status})`);
      const row = await res.json();

      // A lead's snapshot stops at the lender step; the rest is on its loan.
      let mate: any = null;
      if (source === 'lead' && row?.loan_id) {
        const r = await fetch(`${API}/loans/${row.loan_id}`, { headers: authHeaders() });
        if (r.ok) mate = await r.json();
      }

      const leadSd = source === 'loan' ? asObj(row?.lead_stage_data) : asObj(row?.stage_data);
      const loanSd = source === 'loan' ? asObj(row?.stage_data) : asObj(mate?.stage_data);
      const sd = mergeSnapshots(leadSd, loanSd);

      const snapLenders = Array.isArray(sd?.presented_lenders) && sd.presented_lenders.length > 0
        ? sd.presented_lenders
        : Array.isArray(sd?.selectedBankDetails?.presented_lenders) && sd.selectedBankDetails.presented_lenders.length > 0
          ? sd.selectedBankDetails.presented_lenders
          : Array.isArray(leadSd?.presented_lenders) && leadSd.presented_lenders.length > 0
            ? leadSd.presented_lenders
            : Array.isArray(loanSd?.presented_lenders) && loanSd.presented_lenders.length > 0
              ? loanSd.presented_lenders
              : [];

      setLead({ ...row, __source: source });
      setCompanion(source === 'loan' ? null : mate);
      setStageData(sd ? { ...sd, __leadSd: leadSd, __loanSd: loanSd } : null);
      if (snapLenders && snapLenders.length > 0) {
        setActiveView('snapshot');
      } else {
        setActiveView('replay');
      }

      if (!sd) {
        setRunError('Neither this record nor its linked one has a stage_data snapshot — replay is not possible.');
      } else if (source === 'lead' && row?.loan_id && !mate) {
        toast.error('Linked loan could not be loaded — income, profile and residence may show as missing');
      }
    } catch (e: any) {
      toast.error(e.message || 'Could not load lead');
    }
  };

  /* ---------------- input rebuild (saved data only) ---------------- */

  const sd = stageData || {};
  const rc = sd.rc_data || sd.rcData || {};
  const fullRc = rc.full_rc_data || {};

  // Must mirror the live chain exactly (AddLead.tsx:2004), including its
  // hardcoded last resort — if the lead searched on "Jaipur, Rajasthan" because
  // every other level was empty, the replay has to search on that too, or the
  // branches (and therefore the whole ranking) differ. `selectedAddress` is
  // already 'other'-resolved before being saved (AddLead.tsx:838).
  const addressLevels: [string, string][] = [
    ['stage_data.selectedAddress', sd.selectedAddress || ''],
    ['stage_data.dropdowns.addresses[0]', sd.dropdowns?.addresses?.[0] || ''],
    ['rc.registered_at', rc.registered_at || ''],
    ['rc.full_rc_data.present_address', fullRc.present_address || ''],
    ['hardcoded live default', 'Jaipur, Rajasthan'],
  ];
  const addressHit = addressLevels.find(([, v]) => !!v)!;
  const address: string = addressHit[1];
  const addressSource: string = addressHit[0];
  // case_type exists in TWO vocabularies and they are not interchangeable:
  //
  //   form / snapshot : 'used_car_purchase' | 'used_car_refinance' | 'used_car_bt_topup'
  //   DB columns      : 'Purchase' | 'Refinance' | 'Refine' | 'BT' | 'Top-Up' |
  //                     'Used Car-purchase' | 'Used Car-Refine'
  //                     (AddLead.tsx:918-919 writes these; reverseCaseType at
  //                      AddLead.tsx:264-269 exists to undo them)
  //
  // Live always sends the slug, because it sends form.case_type. The backend and
  // getMatchingRate both normalize dashes/underscores and substring-match, so
  // they tolerate either. getLoanParameters does NOT: it tests
  // `includes('refinance')`, and 'Used Car-Refine' does not contain that — it
  // would silently fall through to the purchase band (90% instead of 120% LTV),
  // shrinking the loan amount and moving the lender down sort key 2. So anything
  // read from a column is translated into the slug live would have sent.
  const toSlug = (raw: string): string => {
    const v = (raw || '').toLowerCase();
    if (!v) return '';
    if (/^used_car_|^new_car_/.test(v)) return v;          // already a slug
    if (v.includes('refin')) return 'used_car_refinance';  // Refine AND Refinance
    if (v.includes('bt') || v.includes('top')) return 'used_car_bt_topup';
    if (v.includes('purchase')) return 'used_car_purchase';
    return v;
  };
  const caseTypeRaw: string = sd.case_type || lead?.case_type || '';
  const caseType: string = toSlug(caseTypeRaw);
  const caseTypeNote: string = !caseTypeRaw ? ''
    : sd.case_type ? 'from the snapshot — the exact string live sent'
      : caseType === caseTypeRaw.toLowerCase()
        ? 'from the record column'
        : `translated from the column value "${caseTypeRaw}" into the slug live would have sent`;
  // leads.bureau_score is a real column (leadController.js:62) and survives even
  // when the snapshot does not, so it is a legitimate last resort for the score.
  const creditScore: number | undefined =
    sd.creditScore || sd.credit_score || (lead as any)?.bureau_score || undefined;
  const creditScoreSource = sd.creditScore || sd.credit_score ? 'snapshot'
    : (lead as any)?.bureau_score ? 'bureau_score column' : 'none';
  const autoLoans: any[] = sd.autoLoans || sd.auto_loans || [];
  const idvData = sd.idvData || sd.idv_data || null;
  const ownerNumber = fullRc.owner_number || rc.owner_number || '';
  // Prefer the snapshot: selectedLoanId is what was actually clicked on the
  // lender screen. The DB columns (bank_name on a loan, financier_name on a
  // lead) are a fallback — they can be reassigned later during processing, so
  // they are not necessarily the bank that was picked at recommendation time.
  const bankFromSnapshot: string = sd.selectedLoanId || sd.selectedBankDetails?.bank_name || '';
  const bankFromDb: string =
    (lead as any)?.bank_name || (lead as any)?.financier_name ||
    companion?.bank_name || companion?.financier_name || '';
  const selectedBankName: string = bankFromSnapshot || bankFromDb;
  const selectedBankSource: 'snapshot' | 'db' | 'none' =
    bankFromSnapshot ? 'snapshot' : bankFromDb ? 'db' : 'none';
  // getLoanById exposes only pan_number, stage_data and loan_amount_required from
  // the joined lead (loanController.js:919-923) — no dob — and `loans` has no dob
  // column either. So on a loan-sourced record the row cannot supply it, but the
  // rich lead snapshot can: /add-lead/submit spreads ...form, and the leads INSERT
  // takes dob from that same body (leadController.js:606-607).
  const dob: string =
    sd.dob || sd.date_of_birth ||
    (lead as any)?.dob || (lead as any)?.date_of_birth ||
    companion?.dob || companion?.date_of_birth || '';
  const dobSource = (sd.dob || sd.date_of_birth) ? 'snapshot'
    : ((lead as any)?.dob || (lead as any)?.date_of_birth) ? 'record row' : 'none';

  // income_source and profile are real columns on `loans` (loanController.js:1366,
  // 1687) — which is where LoanDetail reads them from (ApplicantTab.tsx:209,231).
  // They are NOT snapshot keys, so checking only stage_data showed them MISSING on
  // records that plainly display them elsewhere in the app.
  const incomeSource: string =
    sd.incomeSource || sd.income_source || (lead as any)?.income_source || companion?.income_source || '';
  const profile: string = sd.profile || (lead as any)?.profile || companion?.profile || '';
  // residenceType exists only inside a stage_data snapshot, never as a column.
  const residenceType: string = sd.residenceType || sd.residence_type || '';

  // True when the value exists only because the loan was fetched — i.e. it was
  // recorded on a LATER step than the lender search. Rich mode may use it, but
  // the RM did not have it when the recommendation was produced, so the panel
  // has to say so rather than quietly presenting it as input of the day.
  const leadSd = sd.__leadSd || null;
  const loanSd = sd.__loanSd || null;

  // Raw frozen snapshot of lenders presented to RM at step 4
  const rawPresented =
    sd.presented_lenders ||
    sd.selectedBankDetails?.presented_lenders ||
    leadSd?.presented_lenders ||
    loanSd?.presented_lenders ||
    loanSd?.selectedBankDetails?.presented_lenders ||
    [];
  const savedPresentedLenders: any[] = Array.isArray(rawPresented) ? rawPresented : [];

  const selectedBankNameLower = (selectedBankName || '').trim().toLowerCase();
  const snapshotSelectedIndex = savedPresentedLenders.findIndex((l: any) => {
    const nameMatch = (l.bank_name || '').trim().toLowerCase() === selectedBankNameLower;
    const idMatch = l.bank_id && (
      String(l.bank_id).toLowerCase() === String(sd.selectedLoanId || '').toLowerCase() ||
      String(l.bank_id).toLowerCase() === String(sd.selectedBankDetails?.bank_id || '').toLowerCase()
    );
    return nameMatch || idMatch;
  });
  const snapshotSelected = snapshotSelectedIndex >= 0 ? savedPresentedLenders[snapshotSelectedIndex] : null;
  const snapshotTop = savedPresentedLenders[0] || null;

  const lateKeys = fromLoanOnly(sd, leadSd);
  const isLate = (snapKey: string, leadCol?: any, loanCol?: any) =>
    (lateKeys.has(snapKey) && !leadCol) || (!!loanCol && !leadCol && !leadSd?.[snapKey]);
  const LATE_NOTE = 'recorded on a later step than the lender search — the RM did not have this when the recommendation was made';

  // The key list has to match what actually arrives from the valuation API.
  // AddLead reads seven keys (AddLead.tsx:1806-1807) and so does the backend
  // (findLenderController.js:1056) — and in a real response the amount sits in
  // fair_market_retail_value / book_value / dealer_purchase_price far more often
  // than in any `idv*` key. Checking only the idv* keys is why loan amount and
  // EMI came back blank.
  const IDV_KEYS = [
    'fair_market_retail_value',
    'book_value',
    'dealer_purchase_price',
    'idv',
    'idv_value',
    'tentative_idv',
    'vehicle_value',
  ];

  // These values are frequently strings ("450000", "4,50,000", "₹4,50,000"), so
  // a typeof === 'number' test drops them. Strip currency noise only: anything
  // left over means it is not an amount, so "2019-05-12" cannot become 20190512.
  const toAmount = (v: any): number | null => {
    if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : null;
    if (typeof v !== 'string') return null;
    const cleaned = v.replace(/^Rs\.?/i, '').replace(/[₹,\s]/g, '');
    if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
    const n = Number(cleaned);
    return n > 0 ? n : null;
  };

  // Returns the key it matched as well as the value, so the panel can name the
  // exact path the number came from instead of asserting a figure.
  const extractIdvAmount = (): { value: number; key: string } | null => {
    const searchObj = (obj: any, path: string): { value: number; key: string } | null => {
      if (!obj || typeof obj !== 'object') return null;
      const at = (k: string) => (path ? `${path}.${k}` : k);
      for (const k of IDV_KEYS) {
        const n = toAmount(obj[k]);
        if (n) return { value: n, key: at(k) };
      }
      for (const key in obj) {
        const n = /idv|value/i.test(key) ? toAmount(obj[key]) : null;
        if (n) return { value: n, key: at(key) };
        const res = searchObj(obj[key], at(key));
        if (res) return res;
      }
      return null;
    };
    // The valuation does not only live in idvData. findLenderController merges the
    // IDV response straight back into the SAME rc_cache row (:1118-1123,
    // api_type='idv'), so a cached RC payload carries fair_market_retail_value /
    // idv_value alongside the registration fields — which is exactly where
    // thirdPartyLoansApi reads it from (:497, :1008). stage_data.vehicle_data is a
    // third shape the same number turns up in (:236). Check all of them.
    for (const [label, obj] of [
      ['idvData', idvData],
      ['rc', rc],
      ['rc.full_rc_data', fullRc],
      ['vehicle_data', sd.vehicle_data || sd.vehicleData],
    ] as [string, any][]) {
      if (!obj) continue;
      const hit = searchObj(obj, '');
      if (hit) return { value: hit.value, key: `${label}.${hit.key}` };
    }
    return null;
  };

  // idvData is the richest source, but plenty of records never stored it.
  // selectedBankDetails.tentativeValue is the exact IDV the lender screen used
  // at selection time (LinkLoanFinderStep.tsx:315), so it is an equally
  // faithful fallback — and still saved data, no API call.
  //
  // What is NOT a source any more: lead.tentative_value. AddLead does send that
  // field (AddLead.tsx:962), but createLead builds its INSERT from a fixed
  // whitelist (leadController.js:580-645) that has no tentative_value column, so
  // the value is dropped server-side and no endpoint ever returns it. Reading it
  // was dead code.
  // ORDER MATTERS, and it is the reverse of what looks natural.
  //
  // selectedBankDetails.tentativeValue is not "a fallback" — it IS the number the
  // live screen used. At selection time live does `const idvAmount =
  // extractIdvAmount()` and stores it as `tentativeValue`
  // (LinkLoanFinderStep.tsx:296,315), so it already bakes in live's own
  // preference for a fresh /find-lender/idv call over the snapshot
  // (LinkLoanFinderStep.tsx:178). It is the recorded answer.
  //
  // Parsing idvData is only a RECONSTRUCTION, and a deliberately more capable
  // one: live checks 4 keys and ignores string values, this checks 7 and parses
  // strings. That is better arithmetic but worse fidelity — from the same
  // idvData, this can produce a number where live produced null and then went to
  // the API for a different one. So the recorded answer wins, and the
  // reconstruction is used only when no bank was ever selected.
  const idvHit = extractIdvAmount();
  const idvFromSelection = toAmount(sd.selectedBankDetails?.tentativeValue);
  const idvFromSnapshot = idvHit?.value ?? null;
  const idv = idvFromSelection || idvFromSnapshot || apiIdv;
  const idvSource = idvFromSelection ? 'selectedBankDetails.tentativeValue (what live actually used)'
    : idvHit ? `rebuilt from ${idvHit.key} — live may have used a different figure`
      : apiIdv ? "today's live API call, NOT saved data" : 'none';
  // Loud when the two disagree: it means the replay's amounts cannot match live.
  const idvMismatch = (idvFromSelection && idvFromSnapshot && idvFromSelection !== idvFromSnapshot)
    ? { used: idvFromSelection, rebuilt: idvFromSnapshot } : null;

  // Last resort, and deliberately a button rather than automatic. Two reasons it
  // exists: the live lender screen preferred this very call over the snapshot
  // (LinkLoanFinderStep.tsx:178), so for records that saved no idvData the number
  // the RM actually saw was never stored anywhere. And the backend tries rc_cache
  // and ops_api_cache first but falls through to a paid external lookup on a miss,
  // so it must not fire on its own. A value from here is today's valuation, not
  // that day's — the panel labels it as such.
  const fetchApiIdv = async () => {
    const rcNumber = String(lead?.vehicle_number || rc.rc_number || '').trim();
    if (!rcNumber) {
      toast.error('No vehicle number on this record, nothing to look up');
      return;
    }
    setIdvFetching(true);
    try {
      const res = await fetch(`${API}/find-lender/idv`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ id_number: rcNumber }),
      });
      if (!res.ok) throw new Error(`IDV lookup failed (HTTP ${res.status})`);
      const data = await res.json();
      let found: number | null = null;
      for (const k of IDV_KEYS) {
        found = toAmount(data?.data?.[k]) ?? toAmount(data?.[k]);
        if (found) break;
      }
      if (!found) {
        toast.error('API answered but carried no usable IDV for this vehicle');
        return;
      }
      setApiIdv(found);
      toast.success(`IDV ₹${found.toLocaleString('en-IN')} (today's valuation)`);
    } catch (e: any) {
      toast.error(e.message || 'IDV lookup failed');
    } finally {
      setIdvFetching(false);
    }
  };

  const vehicleBase = {
    maker_name: rc.maker_name || fullRc.maker_name || '',
    maker_model: rc.model_name || fullRc.model_name || '',
    fuel_type: rc.fuel_type || fullRc.fuel_type || '',
    manufacturing_date:
      rc.manufacturing_date_formatted || fullRc.manufacturing_date_formatted ||
      rc.manufacturing_date || fullRc.manufacturing_date || '',
  };

  const inputRows = (): FieldRow[] => {
    const m = (v: any): FieldRow['source'] => (v === '' || v == null ? 'missing' : 'stage_data');
    return [
      {
        label: 'Address',
        value: address || '—',
        source: addressSource === 'hardcoded live default' ? 'missing' : m(address),
        note: addressSource === 'hardcoded live default'
          ? 'NOTHING was saved — this is the same hardcoded fallback the live screen uses (AddLead.tsx:2004). The branches, and therefore the whole ranking, are for Jaipur, not this customer.'
          : `from ${addressSource} — drives distance and serviceability`,
      },
      { label: 'Case type', value: caseType || '—', source: m(caseType), note: caseTypeNote },
      { label: 'Make', value: vehicleBase.maker_name || '—', source: m(vehicleBase.maker_name) },
      { label: 'Model', value: vehicleBase.maker_model || '—', source: m(vehicleBase.maker_model) },
      { label: 'Fuel', value: vehicleBase.fuel_type || '—', source: m(vehicleBase.fuel_type) },
      { label: 'Mfg date', value: vehicleBase.manufacturing_date || '—', source: m(vehicleBase.manufacturing_date) },
      {
        label: 'IDV (stored)',
        value: idv ? `₹${idv.toLocaleString('en-IN')}` : '—',
        source: m(idv),
        richOnly: true,
        note: idv
          ? `from ${idvSource} — drives every loan amount and EMI below`
          : 'not saved on this record, so loan amount and EMI cannot be reconstructed',
      },
      { label: 'Owner number', value: ownerNumber || '—', source: m(ownerNumber), richOnly: true },
      {
        label: 'Credit score',
        value: creditScore ? String(creditScore) : '—',
        source: m(creditScore),
        note: creditScore
          ? `from ${creditScoreSource} — without it the BRE skips every bureau rule`
          : 'absent, so the replay gives the BRE less than the live screen had',
      },
      { label: 'Auto loans', value: String(autoLoans.length), source: autoLoans.length ? 'stage_data' : 'missing' },
      { label: 'DOB', value: dob || '—', source: dob ? 'lead' : 'missing', richOnly: true, note: dob ? `from the ${dobSource}` : 'neither the snapshot nor the row carries it' },
      {
        label: 'Income source',
        value: incomeSource || '—',
        source: m(incomeSource),
        lateNote: incomeSource && !leadSd?.incomeSource,
        richOnly: true,
        note: 'CASH → rejected by all lenders. Stored as a column on the loan (loanController.js:1366), not in the snapshot',
      },
      { label: 'Profile', value: profile || '—', source: m(profile), richOnly: true, lateNote: !!profile && !leadSd?.profile, note: 'stored as a column on the loan (loanController.js:1687), not in the snapshot' },
      { label: 'Residence type', value: residenceType || '—', source: m(residenceType), richOnly: true, lateNote: !!residenceType && !leadSd?.residenceType, note: "lives only in the loan's own stage_data — never a column (ApplicantTab.tsx:38)" },
      { label: 'Loan amount', value: 'not sent', source: 'missing', richOnly: true, note: 'deliberately excluded — the saved loan_amount is derived from the bank that was selected, so feeding it back would bias the replay toward that bank' },
      { label: 'Tenure', value: 'not sent', source: 'missing', richOnly: true, note: 'deliberately excluded — same circularity as loan amount' },
      { label: 'Income proof', value: 'not mapped', source: 'missing', richOnly: true, note: 'mapping undecided — left blank on purpose' },
      { label: 'Annual income', value: 'not mapped', source: 'missing', richOnly: true, note: 'mapping undecided — left blank on purpose' },
      {
        label: 'disbursal_date (pinned)',
        value: lead?.created_at ? new Date(lead.created_at).toLocaleDateString('en-IN') : '—',
        source: 'derived',
        note: lead?.__source === 'loan'
          ? 'pinned to loan.created_at — the loan record does not expose the original lead date'
          : 'pinned to lead.created_at so vehicle and customer age match that day',
      },
    ];
  };

  /* ---------------- run replay ---------------- */

  const runReplay = async (m: Mode, dm: DateMode = dateMode) => {
    if (!address || !caseType) {
      setRunError('Address or case type missing in the saved snapshot — replay not possible.');
      return;
    }
    setRunning(true);
    setRunError(null);
    setLenders([]);
    setStats(null);
    try {
      const vehicleData: any = { ...vehicleBase };
      const loanData: any = {};
      if (dm === 'pinned' && lead?.created_at) {
        // IDFC uses disbursal_date; Hero Fincorp uses application_date.
        // Both should be the same point in time — when the lead was created.
        loanData.disbursal_date = lead.created_at;
        loanData.application_date = lead.created_at;
      }
      // dm === 'today': send neither, so the BRE's own fallback
      // (`parseDate(...) || new Date()`, idfc.js:178 / heroFincorp.js:206) takes
      // over. That is the same code path a live search hits right now, so the two
      // runs differ in exactly one variable.

      if (m === 'rich') {
        if (idv) vehicleData.idv_value = idv;
        if (ownerNumber) vehicleData.owner_number = ownerNumber;
        if (dob) loanData.dob = dob;
        if (incomeSource) loanData.income_source = incomeSource;
        if (profile) loanData.applicant_profile = profile;
        if (residenceType) loanData.house_ownership = residenceType;
        // loan_amount and tenure are intentionally NOT sent: both are derived
        // from selectedBankDetails, so passing them back into the BRE would
        // bias the replay toward the bank that was already chosen.
      }

      const body: any = { address, case_type: caseType, radius: 50, vehicleData, loanData };
      if (creditScore) body.creditReportData = { credit_score: creditScore, auto_loans: autoLoans };

      const res = await fetch(`${API}/find-lender/search-by-address`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.lenders) throw new Error('No lenders returned');

      setLenders(rank(data.lenders, caseType, idv || 0));
      setStats(data.stats || null);
      setRanWith({ mode: m, dateMode: dm });
    } catch (e: any) {
      setRunError(e.message || 'Replay failed');
    } finally {
      setRunning(false);
    }
  };

  /* ---------------- derived view data ---------------- */

  const selectedIndex = lenders.findIndex(
    l => (l.bank_name || '').toLowerCase() === (selectedBankName || '').toLowerCase()
  );
  const selected = selectedIndex >= 0 ? lenders[selectedIndex] : null;
  const top = lenders[0] || null;

  const borderlineCount = lenders.filter(l => isBorderline(l)).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <ScanSearch size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Lender Analysis</h1>
            <p className="text-sm text-muted-foreground">
              Replay the lender recommendation from a lead's saved snapshot and compare it with the bank actually selected
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="glass-card p-5 mb-6">
          <label className="block text-sm font-semibold text-foreground mb-2">Application number</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="UCLP-0112-001, a loan number, phone or vehicle number"
              className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-all"
            >
              {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              Look up
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <Database size={12} /> Read-only — nothing is written, and no valuation or bureau API is called
          </p>
        </div>

        {/* Multiple matches */}
        {matches.length > 0 && (
          <div className="glass-card p-5 mb-6">
            <h2 className="text-sm font-bold text-foreground mb-3">{matches.length} matches — pick one</h2>
            <div className="space-y-2">
              {matches.map(mt => (
                <button
                  key={mt.id}
                  onClick={() => loadLead(mt.id, mt.__source || 'lead')}
                  className="w-full text-left px-4 py-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">
                      {mt.customer_id || mt.loan_number || mt.id}
                    </span>
                    <span className="text-sm text-muted-foreground">{mt.customer_name}</span>
                    <span className="text-xs text-muted-foreground">{mt.vehicle_number}</span>
                    <span className="text-xs text-muted-foreground">
                      {mt.created_at ? new Date(mt.created_at).toLocaleDateString('en-IN') : ''}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lead loaded */}
        {lead && (
          <>
            {/* Lead Header */}
            <div className="glass-card p-5 mb-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-xl font-bold text-foreground">{lead.customer_name || 'Unnamed'}</h2>
                    <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                      {lead.customer_id || lead.loan_number}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {caseType || '—'} · {lead.vehicle_number || '—'} · created{' '}
                    {lead.created_at ? new Date(lead.created_at).toLocaleString('en-IN') : '—'}
                    {' '}· loaded from {lead.__source === 'loan' ? 'loans' : 'leads'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground uppercase font-semibold">Selected Lender</p>
                    <p className="text-sm font-bold text-foreground">{selectedBankName || 'None'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setActiveView('snapshot')}
                className={`px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all ${
                  activeView === 'snapshot'
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Camera size={16} />
                <span>Saved Snapshot (Presented to RM)</span>
                {savedPresentedLenders.length > 0 ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeView === 'snapshot' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {savedPresentedLenders.length} lenders
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                    0 captured
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveView('replay')}
                className={`px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all ${
                  activeView === 'replay'
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Gauge size={16} />
                <span>Live BRE Replay</span>
                {lenders.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeView === 'replay' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                  }`}>
                    Replayed ({lenders.length})
                  </span>
                )}
              </button>
            </div>

            {/* VIEW 1: SAVED SNAPSHOT */}
            {activeView === 'snapshot' && (
              <>
                {savedPresentedLenders.length > 0 ? (
                  <>
                    <SnapshotVerdictCard
                      selected={snapshotSelected}
                      selectedIndex={snapshotSelectedIndex}
                      selectedBankName={selectedBankName}
                      total={savedPresentedLenders.length}
                      top={snapshotTop}
                      savedAt={lead?.created_at}
                    />

                    {/* Snapshot Table */}
                    <div className="glass-card p-5 mb-6 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-muted-foreground border-b border-border">
                            <th className="text-left font-semibold py-2.5 pr-3">Position</th>
                            <th className="text-left font-semibold py-2.5 pr-3">Lender</th>
                            <th className="text-left font-semibold py-2.5 pr-3">BRE Status</th>
                            <th className="text-right font-semibold py-2.5 pr-3">Loan Amount</th>
                            <th className="text-right font-semibold py-2.5 pr-3">ROI</th>
                            <th className="text-right font-semibold py-2.5 pr-3">Tenure</th>
                            <th className="text-right font-semibold py-2.5 pr-3">EMI</th>
                            <th className="text-right font-semibold py-2.5">Branch / Distance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {savedPresentedLenders.map((item: any, i: number) => {
                            const isSel = i === snapshotSelectedIndex;
                            const isRec = item.is_recommended || (item.is_serviceable && i < 2);
                            return (
                              <tr
                                key={item.bank_id || item.bank_name || i}
                                className={`border-b border-border/40 transition-colors ${
                                  isSel ? 'bg-primary/5 ring-1 ring-inset ring-primary/30 font-medium' : ''
                                } ${!item.is_serviceable ? 'opacity-60' : ''}`}
                              >
                                <td className="py-3 pr-3 font-bold text-muted-foreground tabular-nums">
                                  #{item.position || i + 1}
                                </td>
                                <td className="py-3 pr-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-foreground">{item.bank_name}</span>
                                    {isRec && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-0.5">
                                        <Star size={9} /> RECOMMENDED
                                      </span>
                                    )}
                                    {isSel && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold">
                                        SELECTED
                                      </span>
                                    )}
                                  </div>
                                  {item.bre_reasons && item.bre_reasons.length > 0 && item.bre_status === 'rejected' && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5 max-w-md">
                                      {item.bre_reasons.slice(0, 2).join(' · ')}
                                    </p>
                                  )}
                                  {item.deprioritize_reasons && item.deprioritize_reasons.length > 0 && (
                                    <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5 max-w-md">
                                      {item.deprioritize_reasons.slice(0, 2).join(' · ')}
                                    </p>
                                  )}
                                </td>
                                <td className="py-3 pr-3">
                                  <SnapshotBreBadge status={item.bre_status} deprioritize={item.deprioritize} reasons={item.bre_reasons || item.deprioritize_reasons} />
                                </td>
                                <td className="py-3 pr-3 text-right tabular-nums font-semibold text-foreground">
                                  {item.loan_amount_display || '—'}
                                </td>
                                <td className="py-3 pr-3 text-right tabular-nums text-foreground">
                                  {item.roi_display || '—'}
                                </td>
                                <td className="py-3 pr-3 text-right tabular-nums text-foreground">
                                  {item.tenure_display || '—'}
                                </td>
                                <td className="py-3 pr-3 text-right tabular-nums text-foreground">
                                  {item.emi_display || '—'}
                                </td>
                                <td className="py-3 text-right tabular-nums text-muted-foreground text-xs">
                                  {item.branch_name ? (
                                    <div>
                                      <span className="font-medium text-foreground">{item.branch_name}</span>
                                      {item.distance_km != null && (
                                        <span className="block text-[11px] text-muted-foreground">{item.distance_km} km</span>
                                      )}
                                    </div>
                                  ) : item.distance_km != null ? (
                                    `${item.distance_km} km`
                                  ) : (
                                    '—'
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <p className="text-[11px] text-muted-foreground mt-4 flex items-start gap-1.5">
                        <Info size={12} className="shrink-0 mt-0.5" />
                        <span>
                          This snapshot was frozen and stored at the moment the RM reached step 4 (Lender Selection). It reflects the exact ranking, interest rates, and loan limits evaluated at that point in time.
                        </span>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="glass-card p-8 mb-6 text-center border-l-4 border-l-amber-500">
                    <History size={36} className="mx-auto text-amber-500/80 mb-3" />
                    <h3 className="text-base font-bold text-foreground mb-1">No Lender Snapshot Available for this Record</h3>
                    <p className="text-xs text-muted-foreground max-w-lg mx-auto mb-4 leading-relaxed">
                      This lead was created before lender snapshot tracking was enabled or the lender selection step was not completed.
                      You can use the <strong>Live BRE Replay</strong> tab to reconstruct the lender recommendations based on the saved customer and vehicle details.
                    </p>
                    <button
                      onClick={() => setActiveView('replay')}
                      className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold inline-flex items-center gap-2 hover:opacity-90 transition-all"
                    >
                      <Gauge size={14} /> Switch to Live BRE Replay
                    </button>
                  </div>
                )}
              </>
            )}

            {/* VIEW 2: LIVE BRE REPLAY */}
            {activeView === 'replay' && (
              <>
                {/* Replay Controls & Mode */}
                <div className="glass-card p-5 mb-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Replay Engine Configuration</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Reconstruct lender ranking using current or pinned BRE policy rules
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex rounded-xl border border-border overflow-hidden">
                        {(['thin', 'rich'] as Mode[]).map(mm => (
                          <button
                            key={mm}
                            onClick={() => setMode(mm)}
                            className={`px-4 py-2 text-xs font-bold transition-all ${
                              mode === mm
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-transparent text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {mm === 'thin' ? 'Thin (as live)' : 'Rich (full saved)'}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => runReplay(mode)}
                        disabled={running || !stageData}
                        className="px-5 py-2 rounded-xl bg-foreground text-background text-xs font-bold flex items-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
                      >
                        {running ? <Loader2 size={14} className="animate-spin" /> : <Gauge size={14} />}
                        Run replay
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3">
                    <strong className="text-foreground">Thin</strong> sends what the live Add Lead screen sent with the date pinned to creation.{' '}
                    <strong className="text-foreground">Rich</strong> adds IDV, owner number, DOB and income saved across all steps.
                  </p>
                </div>

                {/* Inputs */}
                <div className="glass-card p-5 mb-6">
                  <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <Database size={14} /> Inputs rebuilt from saved data
                    <span className="text-xs font-normal text-muted-foreground">— nothing guessed, nothing fetched</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                    {inputRows().map(r => (
                      <div
                        key={r.label}
                        className={`flex items-baseline justify-between gap-3 py-2 border-b border-border/50 ${
                          r.richOnly && mode === 'thin' ? 'opacity-40' : ''
                        }`}
                      >
                        <span className="text-xs text-muted-foreground shrink-0">
                          {r.label}
                          {r.richOnly && (
                            <span className="ml-1.5 text-[10px] uppercase tracking-wide text-primary/70">rich</span>
                          )}
                          {r.lateNote && (
                            <span title={LATE_NOTE}
                              className="ml-1.5 text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-500">
                              after search
                            </span>
                          )}
                        </span>
                        <span
                          className={`text-xs font-semibold text-right truncate ${
                            r.source === 'missing' ? 'text-amber-600 dark:text-amber-500' : 'text-foreground'
                          }`}
                          title={r.note ? `${r.value} — ${r.note}` : r.value}
                        >
                          {r.source === 'missing' && r.value === '—' ? 'MISSING' : r.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {runError && (
                  <div className="glass-card p-5 mb-6 border-l-4 border-l-amber-500">
                    <p className="text-sm text-foreground flex items-start gap-2">
                      <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                      {runError}
                    </p>
                  </div>
                )}

                {/* Replay Verdict */}
                {lenders.length > 0 && (
                  <>
                    <VerdictCard
                      selected={selected}
                      selectedIndex={selectedIndex}
                      selectedBankName={selectedBankName}
                      selectedBankSource={selectedBankSource}
                      snapshotKeys={Object.keys(sd).filter(k => !k.startsWith('__'))}
                      total={lenders.length}
                      top={top}
                      caseType={caseType}
                      idv={idv || 0}
                    />

                    {/* Ranked table */}
                    {!idv && (
                      <div className="glass-card p-5 mb-6 border-l-4 border-l-amber-500">
                        <p className="text-sm font-semibold text-foreground flex items-start gap-2">
                          <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                          No IDV — this ranking does not match what the RM saw
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                          Sort key 2 is the loan amount, computed as IDV × LTV%. With no IDV it is{' '}
                          <strong className="text-foreground">0 for every lender</strong>, so they all tie and the order
                          falls through to ROI, then tenure, then distance.
                        </p>
                        <div className="mt-3">
                          <button
                            onClick={fetchApiIdv}
                            disabled={idvFetching}
                            className="px-3 py-1.5 rounded-lg bg-foreground text-background text-[11px] font-bold flex items-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
                          >
                            {idvFetching ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                            Fetch IDV from API, then re-run
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="glass-card p-4 mb-6">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-xs font-bold text-foreground">Date used by the BRE</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xl leading-relaxed">
                            Everything else stays identical — only the date the BRE reckons customer and vehicle age changes.
                          </p>
                        </div>
                        <div className="flex rounded-xl border border-border overflow-hidden shrink-0">
                          {([
                            ['pinned', lead?.created_at ? `Lead date · ${new Date(lead.created_at).toLocaleDateString('en-IN')}` : 'Lead date'],
                            ['today', `Today · ${new Date().toLocaleDateString('en-IN')}`],
                          ] as [DateMode, string][]).map(([dm, label]) => (
                            <button
                              key={dm}
                              onClick={() => { setDateMode(dm); runReplay(mode, dm); }}
                              disabled={running}
                              className={`px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
                                dateMode === dm ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="glass-card p-5 mb-6 overflow-x-auto">
                      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                        <h2 className="text-sm font-bold text-foreground">
                          Replayed Ranked Lenders
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {lenders.length} total · {ranWith?.mode || mode} run ·{' '}
                            {ranWith?.dateMode === 'today' ? "today's date" : 'lead date'}
                          </span>
                        </h2>
                        <div className="flex items-center gap-2 flex-wrap">
                          {stats && (
                            <>
                              <Badge
                                tone={stats.google_api_calls === 0 ? 'good' : 'warn'}
                                label={`geocode API: ${stats.google_api_calls ?? 0}`}
                              />
                              <Badge tone="neutral" label={`branches evaluated: ${stats.osrm_distance_queries ?? 0}`} />
                            </>
                          )}
                          {borderlineCount > 0 && (
                            <Badge tone="warn" label={`${borderlineCount} borderline`} />
                          )}
                        </div>
                      </div>

                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-muted-foreground border-b border-border">
                            <th className="text-left font-semibold py-2 pr-3">#</th>
                            <th className="text-left font-semibold py-2 pr-3">Lender</th>
                            <th className="text-left font-semibold py-2 pr-3">BRE</th>
                            <th className="text-right font-semibold py-2 pr-3">Loan amount</th>
                            <th className="text-right font-semibold py-2 pr-3">ROI</th>
                            <th className="text-right font-semibold py-2 pr-3">Tenure</th>
                            <th className="text-right font-semibold py-2 pr-3">EMI</th>
                            <th className="text-right font-semibold py-2">Distance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lenders.map((l, i) => {
                            const rate = getMatchingRate(l.rates, caseType);
                            const roi = rate?.racc_rate ? `${rate.racc_rate}%` : '15%';
                            const ten = rate?.max_tenure ? `${rate.max_tenure} mo` : '48 mo';
                            const isSel = i === selectedIndex;
                            const isRec = l.is_serviceable && i < 2;
                            return (
                              <tr
                                key={`${l.bank_id}-${i}`}
                                className={`border-b border-border/40 ${
                                  isSel ? 'bg-primary/5 ring-1 ring-inset ring-primary/30' : ''
                                } ${!l.is_serviceable ? 'opacity-55' : ''}`}
                              >
                                <td className="py-2.5 pr-3 font-bold text-muted-foreground tabular-nums">{i + 1}</td>
                                <td className="py-2.5 pr-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-foreground">{l.bank_name}</span>
                                    {isRec && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-0.5">
                                        <Star size={9} /> RECOMMENDED
                                      </span>
                                    )}
                                    {isSel && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold">
                                        SELECTED
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 pr-3"><BreBadge lender={l} /></td>
                                <td className="py-2.5 pr-3 text-right tabular-nums text-foreground">
                                  {loanAmountText(l, caseType, idv || 0)}
                                </td>
                                <td className="py-2.5 pr-3 text-right tabular-nums text-foreground">{roi}</td>
                                <td className="py-2.5 pr-3 text-right tabular-nums text-foreground">{ten}</td>
                                <td className="py-2.5 pr-3 text-right tabular-nums text-foreground">
                                  {emiText(l, caseType, idv || 0, roi, ten)}
                                </td>
                                <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                                  {l.nearest_branch?.distance != null ? `${l.nearest_branch.distance} km` : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Snapshot Inspector Details */}
            <details className="glass-card p-5 mb-6">
              <summary className="text-sm font-bold text-foreground cursor-pointer flex items-center gap-2">
                <Info size={14} /> Snapshot Inspector (Raw Data & Diagnostic Keys)
              </summary>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">IDV candidates (loan amount and EMI need one of these)</p>
                  <div className="space-y-1">
                    {[
                      ['stage_data.selectedBankDetails.tentativeValue', sd.selectedBankDetails?.tentativeValue],
                      ['stage_data.idvData', sd.idvData ?? sd.idv_data],
                      ['rc payload (idv merged into rc_cache)', rc?.idv_value ?? rc?.fair_market_retail_value ?? rc?.tentative_idv],
                      ['rc.full_rc_data', fullRc?.fair_market_retail_value ?? fullRc?.idv_value ?? fullRc?.tentative_idv],
                      ['stage_data.vehicle_data', (sd.vehicle_data || sd.vehicleData)?.idv_value],
                    ].map(([k, v]) => (
                      <div key={k as string} className="flex items-baseline justify-between gap-3 text-xs">
                        <code className="text-muted-foreground">{k as string}</code>
                        <span className={v == null || v === '' ? 'text-amber-600 dark:text-amber-500 font-semibold' : 'text-foreground font-semibold'}>
                          {v == null || v === '' ? 'absent' : typeof v === 'object' ? `object (${Object.keys(v).length} keys)` : String(v)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-baseline justify-between gap-3 text-xs pt-1 border-t border-border/50">
                      <code className="text-foreground font-semibold">resolved IDV</code>
                      <span className={idv ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-amber-600 dark:text-amber-500 font-semibold'}>
                        {idv ? `₹${idv.toLocaleString('en-IN')} (${idvSource})` : 'none — loan amount and EMI stay blank'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">
                    Record loaded from <code>{lead?.__source === 'loan' ? 'loans' : 'leads'}</code>
                    {' · '}snapshot has {Object.keys(sd).filter(k => !k.startsWith('__')).length} top-level keys {companion ? '(lead snapshot + its linked loan)' : ''}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono break-words leading-relaxed">
                    {Object.keys(sd).length
                      ? Object.keys(sd).filter(k => !k.startsWith('__')).sort().map(k => {
                          const v = sd[k];
                          const empty = v == null || v === '' || (Array.isArray(v) && v.length === 0)
                            || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
                          return empty ? `${k}(empty)` : k;
                        }).join(', ')
                      : 'stage_data is empty — this record was not created through the Add Lead form'}
                  </p>
                </div>
              </div>
            </details>
          </>
        )}

        {!lead && matches.length === 0 && !searching && (
          <div className="glass-card p-12 text-center">
            <ScanSearch size={40} className="mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-sm text-muted-foreground">
              Enter an application number above to replay its lender recommendation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= helpers (copied from LinkLoanFinderStep) ================= */

function getMatchingRate(rates: any[], caseType: string) {
  if (!rates || rates.length === 0) return null;
  if (caseType) {
    const normalize = (s: string) => (s || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
    const normCase = normalize(caseType);
    const match = rates.find(r => r.product_name && normalize(r.product_name).includes(normCase));
    if (match) return match;
  }
  return rates[0];
}

function getLoanParameters(caseType: string, breLtv?: number) {
  if (breLtv && breLtv > 0) return { minPct: breLtv, maxPct: breLtv };
  const normCase = (caseType || '').toLowerCase();
  if (normCase.includes('refinance')) return { minPct: 80, maxPct: 120 };
  if (normCase.includes('bt')) return { minPct: 120, maxPct: 160 };
  if (normCase.includes('top')) return { minPct: 100, maxPct: 120 };
  return { minPct: 80, maxPct: 90 };
}

const capByBre = (v: number, breMaxAmount?: number) =>
  breMaxAmount && breMaxAmount > 0 ? Math.min(v, breMaxAmount) : v;

function calcEmi(principal: number, annualRate: number, months: number) {
  if (!principal || !annualRate || !months) return 0;
  const r = annualRate / 12 / 100;
  return Math.round(principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1));
}

const fmtMoney = (v: number) =>
  v >= 100000 ? `₹${(v / 100000).toFixed(2)}L` : `₹${Math.round(v).toLocaleString('en-IN')}`;

// Exactly what live computes (LinkLoanFinderStep.tsx:127-130) — no special case.
// With idv = 0 this returns 0 for EVERY lender, so sort key 2 ties and ROI
// decides, which is precisely what the live screen did. An earlier version
// returned each lender's BRE cap here to "differentiate" them; that produced a
// different order from live in exactly the case that matters most (no stored
// IDV), so it is gone — fidelity beats a prettier table.
function maxLoanOf(lender: any, caseType: string, idv: number) {
  const { maxPct } = getLoanParameters(caseType, lender.bre?.offer?.ltv);
  return capByBre(idv * (maxPct / 100), lender.bre?.offer?.max_loan_amount);
}

function loanAmountText(lender: any, caseType: string, idv: number) {
  if (!idv) return '—';
  const { minPct, maxPct } = getLoanParameters(caseType, lender.bre?.offer?.ltv);
  const cap = lender.bre?.offer?.max_loan_amount;
  const minL = capByBre(idv * (minPct / 100), cap);
  const maxL = capByBre(idv * (maxPct / 100), cap);
  return minL === maxL ? fmtMoney(minL) : `${fmtMoney(minL)} – ${fmtMoney(maxL)}`;
}

function emiText(lender: any, caseType: string, idv: number, roiStr: string, tenStr: string) {
  if (!idv) return '—';
  const rate = parseFloat(roiStr.replace(/[^0-9.]/g, '')) || 15;
  const months = parseInt(tenStr.replace(/[^0-9]/g, '')) || 48;
  const maxL = maxLoanOf(lender, caseType, idv);
  const e = calcEmi(maxL, rate, months);
  return e ? `₹${e.toLocaleString('en-IN')}` : '—';
}

/** Faithful copy of LinkLoanFinderStep.tsx:111-151 */
function rank(lenders: any[], caseType: string, idv: number) {
  const tierOf = (x: any) => {
    if (!x.is_serviceable) return 2;
    if (x.deprioritize) return 1;
    if (x.bre && x.bre.eligible) return -1;
    return 0;
  };
  const amountOf = (x: any) => maxLoanOf(x, caseType, idv);

  return [...lenders].sort((a, b) => {
    const tierA = tierOf(a), tierB = tierOf(b);
    if (tierA !== tierB) return tierA - tierB;

    const amountA = amountOf(a), amountB = amountOf(b);
    if (amountA !== amountB) return amountB - amountA;

    const matchA = getMatchingRate(a.rates, caseType);
    const matchB = getMatchingRate(b.rates, caseType);
    const aRate = matchA?.racc_rate ? parseFloat(matchA.racc_rate) : 999;
    const bRate = matchB?.racc_rate ? parseFloat(matchB.racc_rate) : 999;
    if (aRate !== bRate) return aRate - bRate;

    const aTenure = matchA?.max_tenure ? parseInt(matchA.max_tenure) : 0;
    const bTenure = matchB?.max_tenure ? parseInt(matchB.max_tenure) : 0;
    return bTenure - aTenure;
  });
}

function isBorderline(l: any) {
  const d = l.nearest_branch?.distance;
  const lim = l.nearest_branch?.geo_limit_km;
  if (d == null || !lim) return false;
  return Math.abs(d - lim) / lim <= 0.15;
}

/* ================= small presentational pieces ================= */

function Badge({ tone, label, hint }: { tone: 'good' | 'warn' | 'neutral'; label: string; hint?: string }) {
  const cls =
    tone === 'good' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : tone === 'warn' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500'
        : 'bg-muted text-muted-foreground';
  return <span title={hint} className={`px-2 py-1 rounded-lg text-[11px] font-bold ${cls}`}>{label}</span>;
}

function BreBadge({ lender }: { lender: any }) {
  if (!lender.bre) return <span className="text-xs text-muted-foreground">no policy</span>;
  if (!lender.bre.eligible) {
    return (
      <span title={(lender.bre.reasons || []).join(' · ')}
        className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-bold">
        REJECT
      </span>
    );
  }
  if (lender.deprioritize) {
    return (
      <span title={(lender.deprioritize_reasons || []).join(' · ')}
        className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[11px] font-bold">
        MANUAL
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
      ELIGIBLE
    </span>
  );
}

function Delta({ label, value, suffix, goodWhenLower }: {
  label: string; value: number; suffix?: string; goodWhenLower?: boolean;
}) {
  const zero = Math.abs(value) < 0.001;
  const isGood = zero ? null : goodWhenLower ? value < 0 : value > 0;
  const Icon = zero ? Minus : value > 0 ? TrendingUp : TrendingDown;
  const cls = zero ? 'text-muted-foreground'
    : isGood ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400';
  const shown = suffix === '₹'
    ? `${value > 0 ? '+' : value < 0 ? '−' : ''}₹${Math.abs(Math.round(value)).toLocaleString('en-IN')}`
    : `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(suffix === '%' ? 2 : 0)}${suffix || ''}`;
  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-bold flex items-center gap-1 tabular-nums ${cls}`}>
        <Icon size={13} /> {zero ? 'same' : shown}
      </p>
    </div>
  );
}

function VerdictCard({ selected, selectedIndex, selectedBankName, selectedBankSource, snapshotKeys, total, top, caseType, idv }: {
  selected: any; selectedIndex: number; selectedBankName: string;
  selectedBankSource: 'snapshot' | 'db' | 'none'; snapshotKeys: string[];
  total: number; top: any; caseType: string; idv: number;
}) {
  if (!selectedBankName) {
    return (
      <div className="glass-card p-5 mb-6 border-l-4 border-l-slate-400">
        <p className="text-sm text-foreground font-semibold">No selected bank found on this record</p>
        <p className="text-xs text-muted-foreground mt-1">
          Checked <code>stage_data.selectedLoanId</code>, <code>stage_data.selectedBankDetails.bank_name</code>,{' '}
          <code>bank_name</code> and <code>financier_name</code> — all empty. The ranking below is still valid,
          there is just nothing to compare it against.
        </p>
        {snapshotKeys.length > 0 && (
          <details className="mt-3">
            <summary className="text-xs text-primary cursor-pointer font-semibold">
              Keys present in the snapshot ({snapshotKeys.length})
            </summary>
            <p className="text-[11px] text-muted-foreground mt-2 font-mono break-words leading-relaxed">
              {snapshotKeys.sort().join(', ')}
            </p>
          </details>
        )}
      </div>
    );
  }
  if (!selected) {
    return (
      <div className="glass-card p-5 mb-6 border-l-4 border-l-amber-500">
        <p className="text-sm text-foreground font-semibold">
          Selected bank “{selectedBankName}” is not in today's lender list
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          It was most likely removed, renamed or deactivated since this lead was created — a clear sign of config drift.
        </p>
      </div>
    );
  }

  const rank1 = selectedIndex === 0;
  const inRec = selectedIndex < 2;
  const tone = rank1 ? 'border-l-emerald-500' : inRec ? 'border-l-amber-500' : 'border-l-red-500';

  const rateOf = (l: any) => {
    const r = getMatchingRate(l.rates, caseType);
    return r?.racc_rate ? parseFloat(r.racc_rate) : 15;
  };
  const tenOf = (l: any) => {
    const r = getMatchingRate(l.rates, caseType);
    return r?.max_tenure ? parseInt(r.max_tenure) : 48;
  };

  const dRoi = rateOf(selected) - rateOf(top);
  const dAmt = maxLoanOf(selected, caseType, idv) - maxLoanOf(top, caseType, idv);
  const dTen = tenOf(selected) - tenOf(top);
  const dEmi =
    calcEmi(maxLoanOf(selected, caseType, idv), rateOf(selected), tenOf(selected)) -
    calcEmi(maxLoanOf(top, caseType, idv), rateOf(top), tenOf(top));

  return (
    <div className={`glass-card p-5 mb-6 border-l-4 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {rank1
              ? <CheckCircle2 size={18} className="text-emerald-500" />
              : <AlertCircle size={18} className={inRec ? 'text-amber-500' : 'text-red-500'} />}
            <h2 className="text-lg font-bold text-foreground">
              {selected.bank_name} — rank {selectedIndex + 1} of {total}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {rank1
              ? 'Top recommendation was selected.'
              : inRec
                ? 'Inside the recommended set, but not the top pick.'
                : `Outside the recommended set — rank 1 was ${top?.bank_name}.`}
            {' '}Override reason: <strong className="text-foreground">not captured</strong>.
          </p>
          {selectedBankSource === 'db' && (
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
              The snapshot had no selected bank — this came from the record's <code>bank_name</code>/
              <code>financier_name</code> column, which can be reassigned later during processing. It may not
              be the bank that was actually picked on the lender screen.
            </p>
          )}
        </div>

        {!rank1 && (
          <div className="flex gap-6 flex-wrap">
            <Delta label="ROI vs rank 1" value={dRoi} suffix="%" goodWhenLower />
            <Delta label="Loan amount" value={dAmt} suffix="₹" />
            <Delta label="Tenure" value={dTen} suffix=" mo" />
            <Delta label="EMI" value={dEmi} suffix="₹" goodWhenLower />
          </div>
        )}
      </div>
    </div>
  );
}

function SnapshotBreBadge({ status, deprioritize, reasons }: { status: string; deprioritize?: boolean; reasons?: string[] }) {
  if (deprioritize) {
    return (
      <span
        title={reasons?.join(' · ') || 'Manual review required'}
        className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[11px] font-bold inline-block"
      >
        MANUAL
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span
        title={reasons?.join(' · ') || 'Policy rejected'}
        className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-bold inline-block"
      >
        REJECT
      </span>
    );
  }
  if (status === 'eligible') {
    return (
      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold inline-block">
        ELIGIBLE
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">no policy</span>;
}

function SnapshotVerdictCard({
  selected,
  selectedIndex,
  selectedBankName,
  total,
  top,
  savedAt,
}: {
  selected: any;
  selectedIndex: number;
  selectedBankName: string;
  total: number;
  top: any;
  savedAt?: string;
}) {
  if (!selectedBankName) {
    return (
      <div className="glass-card p-5 mb-6 border-l-4 border-l-slate-400">
        <div className="flex items-center gap-2 mb-1">
          <Info size={18} className="text-slate-500" />
          <p className="text-sm text-foreground font-semibold">No bank was recorded as selected for this lead</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          The snapshot captures all {total} presented lenders in exact ranking order, but no bank was selected by the RM at creation.
        </p>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="glass-card p-5 mb-6 border-l-4 border-l-amber-500">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle size={18} className="text-amber-500" />
          <p className="text-sm text-foreground font-semibold">
            Selected Bank “{selectedBankName}” is not in the captured snapshot
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          This bank was likely assigned or updated in operations/loan processing after the initial recommendation step.
        </p>
      </div>
    );
  }

  const rank1 = selectedIndex === 0;
  const inRec = selected.is_recommended || selectedIndex < 2;
  const tone = rank1 ? 'border-l-emerald-500' : inRec ? 'border-l-amber-500' : 'border-l-red-500';

  return (
    <div className={`glass-card p-5 mb-6 border-l-4 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {rank1 ? (
              <CheckCircle2 size={20} className="text-emerald-500" />
            ) : (
              <AlertCircle size={20} className={inRec ? 'text-amber-500' : 'text-red-500'} />
            )}
            <h2 className="text-lg font-bold text-foreground">
              {selected.bank_name} — Position #{selected.position || selectedIndex + 1} of {total}
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold">
              SELECTED BY RM
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {rank1 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Top recommendation was selected by the RM.
              </span>
            ) : inRec ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Position #{selected.position || selectedIndex + 1} was selected (within recommended set). Top recommendation was {top?.bank_name}.
              </span>
            ) : (
              <span className="text-red-600 dark:text-red-400 font-medium">
                RM overrode the recommendations: Selected position #{selected.position || selectedIndex + 1} instead of Rank 1 ({top?.bank_name}).
              </span>
            )}
          </p>
          {savedAt && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <Camera size={12} /> Captured at lead creation on {new Date(savedAt).toLocaleString('en-IN')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-background border border-border">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Offered Amount</p>
            <p className="text-sm font-bold text-foreground">{selected.loan_amount_display || '—'}</p>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-background border border-border">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">ROI</p>
            <p className="text-sm font-bold text-foreground">{selected.roi_display || '—'}</p>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-background border border-border">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tenure</p>
            <p className="text-sm font-bold text-foreground">{selected.tenure_display || '—'}</p>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-background border border-border">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">EMI</p>
            <p className="text-sm font-bold text-foreground">{selected.emi_display || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
