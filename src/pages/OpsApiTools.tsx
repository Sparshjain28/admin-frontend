import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, XCircle, ArrowLeft, Car, Phone, AlertTriangle, Clock, Eye, Database, FileText } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const auth = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` });

const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all';
const btnClass = 'flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0';

function FieldRow({ label, value }: { label: string; value: any }) {
  if (!value && value !== false && value !== 0) return null;
  return (
    <div className="bg-muted/30 rounded-lg px-3 py-2">
      <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
      <p className="text-xs font-semibold text-foreground mt-0.5">{String(value)}</p>
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  if (!error) return null;
  return <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2"><XCircle size={14} className="shrink-0 mt-0.5" />{error}</div>;
}

// ── DB History Panel shown below each tool ─────────────────────────────────
function ToolHistory({ toolKey, onView }: { toolKey: string; onView: (queryKey: string) => void }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/rc-verification/cache/${toolKey}`, { headers: auth() });
      const json = await res.json();
      if (json.success) setHistory(json.data);
    } catch {}
    setLoading(false);
  }, [toolKey]);

  useEffect(() => { load(); }, [load]);

  // Re-load when parent signals a new search was saved
  useEffect(() => {
    const handler = () => load();
    window.addEventListener(`ops-cache-saved-${toolKey}`, handler);
    return () => window.removeEventListener(`ops-cache-saved-${toolKey}`, handler);
  }, [toolKey, load]);

  if (loading) return null;
  if (history.length === 0) return null;

  return (
    <div className="mt-6 pt-5 border-t border-border">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={13} className="text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">Previous Searches</span>
        <span className="text-[10px] text-muted-foreground">({history.length})</span>
      </div>
      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {history.map((h) => (
          <div key={h.query_key} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Database size={11} className="text-accent shrink-0" />
              <span className="text-xs font-mono font-bold text-foreground truncate">{h.query_key}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {new Date(h.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <button
              onClick={() => onView(h.query_key)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-accent border border-accent/30 rounded-md hover:bg-accent/10 transition-colors shrink-0"
            >
              <Eye size={11} /> View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── RC Lookup ──────────────────────────────────────────────────────────────
function RCLookup() {
  const [rc, setRc] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [fromCache, setFromCache] = useState(false);

  const showResult = (d: any, cached: boolean) => { setData(d); setFromCache(cached); setError(''); };

  const run = async () => {
    if (!rc.trim()) return;
    setLoading(true); setData(null); setError('');
    try {
      const res = await fetch(`${API_URL}/rc-verification/lookup`, { method: 'POST', headers: auth(), body: JSON.stringify({ rc_number: rc.trim().toUpperCase() }) });
      const json = await res.json();
      if (json.success) { 
        // Handle new { rc_details, challan_info } structure from backend
        const resultData = json.data?.rc_details || json.data;
        showResult(resultData, json.from_cache); 
        window.dispatchEvent(new Event('ops-cache-saved-lookup')); 
      }
      else setError(json.error || json.message || 'Failed');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleView = async (queryKey: string) => {
    setLoading(true); setData(null); setError(''); setRc(queryKey);
    try {
      const res = await fetch(`${API_URL}/rc-verification/cache/lookup/${encodeURIComponent(queryKey)}`, { headers: auth() });
      const json = await res.json();
      if (json.success) {
        const resultData = json.data?.rc_details || json.data;
        showResult(resultData, true);
      }
      else setError('Failed to load cached result');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input className={inputClass} placeholder="Enter RC number (e.g. RJ14AC7458)" value={rc} onChange={e => setRc(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && run()} maxLength={15} />
        <button onClick={run} disabled={loading || !rc.trim()} className={btnClass}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Lookup
        </button>
      </div>
      <ErrorBox error={error} />
      {data && (
        <>
          {fromCache && <p className="text-[10px] text-accent mb-2 flex items-center gap-1"><Database size={10} /> Loaded from saved data</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {[
              ['Owner', data.owner_name], ['RC Number', data.rc_number], ['Financer (HPN)', data.financer],
              ['Financed', data.financed ? 'Yes' : 'No'], ['RC Status', data.rc_status],
              ['Maker', data.maker_description], ['Model', data.maker_model], ['Fuel', data.fuel_type],
              ['Color', data.color], ['Chassis', data.vehicle_chasi_number], ['Engine', data.vehicle_engine_number],
              ['Registered At', data.registered_at], ['Insurance Co', data.insurance_company],
              ['Insurance Upto', data.insurance_upto], ['Mfg Date', data.manufacturing_date],
              ['Owner No', data.owner_number], ['Fit Upto', data.fit_up_to],
            ].map(([l, v]) => <FieldRow key={l as string} label={l as string} value={v} />)}
          </div>
        </>
      )}
      <ToolHistory toolKey="lookup" onView={handleView} />
    </div>
  );
}

// ── RC to Mobile ───────────────────────────────────────────────────────────
function RCToMobile() {
  const [rc, setRc] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [fromCache, setFromCache] = useState(false);

  const showResult = (d: any, cached: boolean) => { setData(d); setFromCache(cached); setError(''); };

  const run = async () => {
    if (!rc.trim()) return;
    setLoading(true); setData(null); setError('');
    try {
      const res = await fetch(`${API_URL}/rc-verification/rc-to-mobile`, { method: 'POST', headers: auth(), body: JSON.stringify({ rc_number: rc.trim().toUpperCase() }) });
      const json = await res.json();
      if (json.success) { showResult(json.data, json.from_cache); window.dispatchEvent(new Event('ops-cache-saved-rc-to-mobile')); }
      else setError(json.error || json.message || 'Failed');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleView = async (queryKey: string) => {
    setLoading(true); setData(null); setError(''); setRc(queryKey);
    try {
      const res = await fetch(`${API_URL}/rc-verification/cache/rc-to-mobile/${encodeURIComponent(queryKey)}`, { headers: auth() });
      const json = await res.json();
      if (json.success) showResult(json.data, true);
      else setError('Failed to load cached result');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input className={inputClass} placeholder="Enter RC number" value={rc} onChange={e => setRc(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && run()} maxLength={15} />
        <button onClick={run} disabled={loading || !rc.trim()} className={btnClass}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Search
        </button>
      </div>
      <ErrorBox error={error} />
      {data && (
        <>
          {fromCache && <p className="text-[10px] text-accent mb-2 flex items-center gap-1"><Database size={10} /> Loaded from saved data</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[['RC Number', data.rc_number], ['Mobile', data.mobile_number], ['Owner', data.owner_name]].map(([l, v]) => <FieldRow key={l as string} label={l as string} value={v} />)}
          </div>
        </>
      )}
      <ToolHistory toolKey="rc-to-mobile" onView={handleView} />
    </div>
  );
}

// ── Mobile to RC ───────────────────────────────────────────────────────────
function MobileToRC() {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [fromCache, setFromCache] = useState(false);

  const showResult = (d: any, cached: boolean) => { setData(d); setFromCache(cached); setError(''); };

  const run = async () => {
    if (!mobile.trim()) return;
    setLoading(true); setData(null); setError('');
    try {
      const res = await fetch(`${API_URL}/rc-verification/mobile-to-rc`, { method: 'POST', headers: auth(), body: JSON.stringify({ mobile_number: mobile.trim() }) });
      const json = await res.json();
      if (json.success) { showResult(json.data, json.from_cache); window.dispatchEvent(new Event('ops-cache-saved-mobile-to-rc')); }
      else setError(json.error || json.message || 'Failed');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleView = async (queryKey: string) => {
    setLoading(true); setData(null); setError(''); setMobile(queryKey);
    try {
      const res = await fetch(`${API_URL}/rc-verification/cache/mobile-to-rc/${encodeURIComponent(queryKey)}`, { headers: auth() });
      const json = await res.json();
      if (json.success) showResult(json.data, true);
      else setError('Failed to load cached result');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input className={inputClass} placeholder="Enter mobile number (10 digits)" value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && run()} maxLength={10} inputMode="numeric" />
        <button onClick={run} disabled={loading || mobile.length < 10} className={btnClass}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Search
        </button>
      </div>
      <ErrorBox error={error} />
      {data && (
        <>
          {fromCache && <p className="text-[10px] text-accent mb-2 flex items-center gap-1"><Database size={10} /> Loaded from saved data</p>}
          <div className="mt-3 space-y-2">
            {Array.isArray(data.rc_list) ? data.rc_list.map((item: any, i: number) => (
              <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 rounded-lg border border-border bg-muted/20">
                {[['RC Number', item.rc_number], ['Owner', item.owner_name], ['Maker', item.maker_description], ['Model', item.maker_model]].map(([l, v]) => <FieldRow key={l as string} label={l as string} value={v} />)}
              </div>
            )) : <FieldRow label="Result" value={JSON.stringify(data)} />}
          </div>
        </>
      )}
      <ToolHistory toolKey="mobile-to-rc" onView={handleView} />
    </div>
  );
}

// ── RC Challan ─────────────────────────────────────────────────────────────
function RCChallan() {
  const [rc, setRc] = useState('');
  const [loading, setLoading] = useState(false);
  const [challans, setChallans] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [fromCache, setFromCache] = useState(false);

  const showResult = (d: any, cached: boolean) => {
    setChallans(d?.challan_details || []);
    setFromCache(cached);
    setError('');
  };

  const run = async () => {
    if (!rc.trim()) return;
    setLoading(true); setChallans([]); setError('');
    try {
      const res = await fetch(`${API_URL}/rc-verification/challan`, { method: 'POST', headers: auth(), body: JSON.stringify({ rc_number: rc.trim().toUpperCase() }) });
      const json = await res.json();
      if (json.success) { showResult(json.data, json.from_cache); window.dispatchEvent(new Event('ops-cache-saved-challan')); }
      else setError(json.error || json.message || 'No challan data found');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleView = async (queryKey: string) => {
    setLoading(true); setChallans([]); setError(''); setRc(queryKey);
    try {
      const res = await fetch(`${API_URL}/rc-verification/cache/challan/${encodeURIComponent(queryKey)}`, { headers: auth() });
      const json = await res.json();
      if (json.success) showResult(json.data, true);
      else setError('Failed to load cached result');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const pending = challans.filter(c => c.challan_status === 'Pending');
  const disposed = challans.filter(c => c.challan_status !== 'Pending');

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input className={inputClass} placeholder="Enter RC number (e.g. HR55AP0244)" value={rc} onChange={e => setRc(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && run()} maxLength={15} />
        <button onClick={run} disabled={loading || !rc.trim()} className={btnClass}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Check
        </button>
      </div>
      <ErrorBox error={error} />
      {challans.length > 0 && (
        <div className="mt-3 space-y-4">
          <div className="flex items-center gap-3 text-xs">
            {fromCache && <span className="flex items-center gap-1 text-accent text-[10px]"><Database size={10} /> Loaded from saved data</span>}
            <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">{pending.length} Pending</span>
            <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">{disposed.length} Disposed</span>
            <span className="text-muted-foreground">{challans.length} total</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {challans.map((c: any) => (
              <div key={c.challan_number} className={`rounded-xl border p-3 ${c.challan_status === 'Pending' ? 'border-red-200 bg-red-50/50' : 'border-green-200 bg-green-50/50'}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-xs font-bold text-foreground">{c.offense_details}</p>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{c.challan_number}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${c.challan_status === 'Pending' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {c.challan_status}
                    </span>
                    <span className="text-xs font-bold text-foreground">₹{c.amount}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  <div><span className="text-muted-foreground">Date: </span><span className="font-medium">{c.challan_date}</span></div>
                  <div><span className="text-muted-foreground">State: </span><span className="font-medium">{c.state}</span></div>
                  {c.challan_place && <div className="col-span-2"><span className="text-muted-foreground">Place: </span><span className="font-medium">{c.challan_place}</span></div>}
                  {c.accused_name && <div><span className="text-muted-foreground">Accused: </span><span className="font-medium">{c.accused_name}</span></div>}
                  {c.court_name && <div className="col-span-2"><span className="text-muted-foreground">Court: </span><span className="font-medium">{c.court_name}</span></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <ToolHistory toolKey="challan" onView={handleView} />
    </div>
  );
}


// ── Vahan Application Status ───────────────────────────────────────────────
function VahanStatus() {
  const [rc, setRc] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [fromCache, setFromCache] = useState(false);

  const showResult = (d: any, cached: boolean) => { setData(d); setFromCache(cached); setError(''); };

  const run = async () => {
    if (!rc.trim()) return;
    setLoading(true); setData(null); setError('');
    try {
      const res = await fetch(`${API_URL}/rc-verification/vahan-status`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify({ rc_number: rc.trim().toUpperCase() }),
      });
      const json = await res.json();
      if (json.success) { showResult(json.data, json.from_cache); window.dispatchEvent(new Event('ops-cache-saved-vahan-status')); }
      else setError(json.error || 'Failed to fetch Vahan status');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleView = async (queryKey: string) => {
    setLoading(true); setData(null); setError(''); setRc(queryKey);
    try {
      const res = await fetch(`${API_URL}/rc-verification/cache/vahan-status/${encodeURIComponent(queryKey)}`, { headers: auth() });
      const json = await res.json();
      if (json.success) showResult(json.data, true);
      else setError('Failed to load cached result');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const parseReceiptDate = (appNo: string) => {
    if (!appNo) return '';
    const m = appNo.match(/^[A-Z]{2}(\d{2})(\d{2})(\d{2})/i);
    if (m) {
      const yy = m[1];
      const mm = m[2];
      const dd = m[3];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = parseInt(mm, 10) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${dd}-${months[monthIndex]}-${yy}`;
      }
    }
    return '';
  };

  const parseStatusDetails = (statusStr: string) => {
    const res = {
      finalStatus: '',
      currentStatus: '',
      date: '',
      time: ''
    };
    if (!statusStr) return res;
    
    const upper = statusStr.toUpperCase();
    
    // Parse date and time: e.g. "01-Jun-2022 16:13:39"
    const dtRegex = /(\d{2})-([A-Za-z]{3})-(\d{4})\s+(\d{2}:\d{2}:\d{2})/;
    const dtMatch = statusStr.match(dtRegex);
    if (dtMatch) {
      const dd = dtMatch[1];
      const mmm = dtMatch[2];
      const yyyy = dtMatch[3];
      const time = dtMatch[4];
      res.date = `${dd}-${mmm}-${yyyy.slice(-2)}`;
      res.time = time;
    }
    
    if (upper.includes('COMPLETED / APPROVED') || upper.includes('APPROVED')) {
      res.finalStatus = 'APPROVED';
      res.currentStatus = 'COMPLETED';
    } else if (upper.includes('ONLINE TRANSACTION SUCCESS') || upper.includes('TRANSACTION COMPLETE')) {
      res.finalStatus = 'APPROVED';
      res.currentStatus = 'COMPLETED';
    } else if (upper.includes('WITHDRAWN')) {
      res.finalStatus = 'Disposed';
      res.currentStatus = 'Withdrawn by User';
    } else {
      // Fallback
      if (upper.includes('/')) {
        const parts = statusStr.split('/');
        res.finalStatus = parts[1]?.split('ON')[0]?.trim() || parts[0]?.trim();
        res.currentStatus = parts[0]?.trim();
      } else {
        res.finalStatus = statusStr.split('ON')[0]?.trim() || statusStr;
        res.currentStatus = statusStr.split('ON')[0]?.trim() || statusStr;
      }
    }
    
    return res;
  };

  const rowSpans: { [key: string]: number } = {};
  const applications = Array.isArray(data?.applications) ? data.applications : [];
  applications.forEach((app: any) => {
    const appNo = app['Application No'] || '';
    if (appNo) {
      rowSpans[appNo] = (rowSpans[appNo] || 0) + 1;
    }
  });

  const seenAppNos = new Set<string>();
  const processedApps = applications.map((app: any) => {
    const appNo = app['Application No'] || '';
    const isFirstOccurrence = !seenAppNos.has(appNo);
    if (appNo) seenAppNos.add(appNo);

    const statusParsed = parseStatusDetails(app['Current Status'] || '');
    
    return {
      appNo,
      isFirstOccurrence,
      rowSpanCount: rowSpans[appNo] || 1,
      vehicleNo: data.registration_number || '',
      dateOfReceipt: parseReceiptDate(appNo),
      receiptNo: appNo,
      transactionPurpose: app['Transaction Purpose'] || '',
      finalStatus: statusParsed.finalStatus || 'N/A',
      currentStatus: statusParsed.currentStatus || 'N/A',
      date: statusParsed.date || 'N/A',
      time: statusParsed.time || 'N/A'
    };
  });

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input className={inputClass} placeholder="Enter RC number (e.g. MH02DW3463)" value={rc}
          onChange={e => setRc(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && run()} maxLength={15} />
        <button onClick={run} disabled={loading || !rc.trim()} className={btnClass}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Fetch
        </button>
      </div>
      <ErrorBox error={error} />

      {data && (
        <div className="mt-3 space-y-4">
          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap">
            {fromCache && <span className="flex items-center gap-1 text-[10px] text-accent"><Database size={10} /> Saved data</span>}
            <span className="text-xs font-bold text-foreground">{data.registration_number}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${data.valid_registration_number ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {data.valid_registration_number ? 'Valid RC' : 'Invalid RC'}
            </span>
            {data.issue && <span className="text-[10px] text-red-600">{data.issue}</span>}
          </div>

          {/* Table */}
          {processedApps.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
              <table className="w-full text-left text-[10px] border-collapse bg-card">
                <thead>
                  <tr className="bg-muted/80 border-b border-border text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="px-3 py-2 text-center">VEHICLE NO</th>
                    <th className="px-3 py-2 text-center">DATE OF RECEIPT</th>
                    <th className="px-3 py-2 text-center">RECEIPT NO</th>
                    <th className="px-3 py-2">TRANSACTION PURPOSE</th>
                    <th className="px-3 py-2 text-center">FINAL STATUS</th>
                    <th className="px-3 py-2">Current Status</th>
                    <th className="px-3 py-2">DATE</th>
                    <th className="px-3 py-2">TIME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 font-medium text-foreground">
                  {processedApps.map((app, idx) => (
                    <tr key={idx} className={`${idx % 2 === 0 ? 'bg-background/20' : 'bg-muted/5'} hover:bg-accent/5 transition-colors`}>
                      {/* Merged Columns */}
                      {app.isFirstOccurrence && (
                        <>
                          <td 
                            rowSpan={app.rowSpanCount} 
                            className="px-3 py-2 font-bold text-foreground whitespace-nowrap align-middle border-r border-border/30 text-center bg-muted/10"
                          >
                            {app.vehicleNo}
                          </td>
                          <td 
                            rowSpan={app.rowSpanCount} 
                            className="px-3 py-2 text-muted-foreground whitespace-nowrap align-middle border-r border-border/30 text-center bg-muted/10"
                          >
                            {app.dateOfReceipt}
                          </td>
                          <td 
                            rowSpan={app.rowSpanCount} 
                            className="px-3 py-2 font-mono font-bold text-foreground whitespace-nowrap align-middle border-r border-border/30 text-center bg-muted/10"
                          >
                            {app.receiptNo}
                          </td>
                        </>
                      )}
                      
                      {/* Regular Columns */}
                      <td className="px-3 py-2 text-foreground font-bold whitespace-nowrap border-r border-border/10">{app.transactionPurpose}</td>
                      <td className="px-3 py-2 text-center whitespace-nowrap border-r border-border/10">
                        {app.finalStatus === 'APPROVED' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-700 border border-green-200">
                            APPROVED
                          </span>
                        ) : app.finalStatus === 'Disposed' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-gray-150 text-gray-700 border border-gray-250">
                            Disposed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
                            {app.finalStatus}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-bold text-foreground whitespace-nowrap border-r border-border/10">{app.currentStatus}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap border-r border-border/10">{app.date}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{app.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No applications found for this vehicle.</p>
          )}
        </div>
      )}
      <ToolHistory toolKey="vahan-status" onView={handleView} />
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
const TOOLS = [
  { key: 'lookup',        label: 'RC Lookup',     icon: <Car size={16} />,           desc: 'Full RC details' },
  { key: 'rc-to-mobile',  label: 'RC → Mobile',   icon: <Phone size={16} />,         desc: 'Get mobile from RC' },
  { key: 'mobile-to-rc',  label: 'Mobile → RC',   icon: <Car size={16} />,           desc: 'Get RC from mobile' },
  { key: 'challan',       label: 'RC Challan',    icon: <AlertTriangle size={16} />, desc: 'Check challan details' },
  { key: 'vahan-status',  label: 'Vahan Status',  icon: <FileText size={16} />,      desc: 'Application status from Vahan' },
];

export default function OpsApiTools() {
  const [active, setActive] = useState<string | null>(null);
  const tool = TOOLS.find(t => t.key === active);

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6">
        {active && (
          <button onClick={() => setActive(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={15} /> Back
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{active ? tool?.label : 'API Tools'}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{active ? tool?.desc : 'RC verification & lookup tools'}</p>
        </div>
      </div>

      {!active ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TOOLS.map(t => (
            <button key={t.key} onClick={() => setActive(t.key)}
              className="flex flex-col items-start gap-2 p-4 bg-card border border-border rounded-xl hover:border-accent hover:shadow-sm transition-all text-left">
              <div className="p-2 bg-accent/10 rounded-lg text-accent">{t.icon}</div>
              <div>
                <p className="text-sm font-bold text-foreground">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border">
            <div className="p-2 bg-accent/10 rounded-lg text-accent">{tool?.icon}</div>
            <div>
              <h2 className="text-sm font-bold text-foreground">{tool?.label}</h2>
              <p className="text-xs text-muted-foreground">{tool?.desc}</p>
            </div>
          </div>
          {active === 'lookup'        && <RCLookup />}
          {active === 'rc-to-mobile'  && <RCToMobile />}
          {active === 'mobile-to-rc'  && <MobileToRC />}
          {active === 'challan'       && <RCChallan />}
          {active === 'vahan-status'  && <VahanStatus />}
        </div>
      )}
    </div>
  );
}
