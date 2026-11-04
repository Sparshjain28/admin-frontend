// Shared bits for the RTO (VAHAN) tracking UI.

export type RtoFlag = 'REGULAR' | 'OBSERVATION' | 'RED_ALERT' | null | undefined;

export const FLAG_META: Record<string, { label: string; dot: string; badge: string }> = {
  RED_ALERT:   { label: 'Red Alert',   dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 border-red-200' },
  OBSERVATION: { label: 'Observation', dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  REGULAR:     { label: 'Regular',     dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const IST = 'Asia/Kolkata';

// Stored timestamps are UTC; show them in IST.
export function istDate(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { timeZone: IST, day: '2-digit', month: 'short', year: 'numeric' });
}

export function istTime(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('en-IN', { timeZone: IST, hour: '2-digit', minute: '2-digit', hour12: true });
}

export function istShort(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { timeZone: IST, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

export function istDateTime(v?: string | null) {
  if (!v) return '—';
  return `${istDate(v)}, ${istTime(v)}`;
}

export function RtoFlagBadge({ flag, reason, compact = false }: { flag: RtoFlag; reason?: string | null; compact?: boolean }) {
  if (!flag) {
    return <span className="text-[10px] text-muted-foreground" title={reason || 'Not checked on VAHAN yet'}>Not checked</span>;
  }
  const m = FLAG_META[flag];
  if (!m) return <span className="text-[10px] text-muted-foreground">{flag}</span>;
  return (
    <span
      title={reason || m.label}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${m.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} aria-hidden="true" />
      {compact ? m.label.split(' ')[0] : m.label}
    </span>
  );
}

// ── per-Txn progress (PDD columns + export) ───────────────────────

export type TxnState = { state: 'DONE' | 'PENDING' | 'NOT_FILED' | 'NOT_NEEDED'; receipt_no?: string; status?: string; approve_on?: string | null };

const approvedDate = (t: TxnState) => {
  if (t.approve_on) return istDate(t.approve_on);
  const m = /APPROVED ON (\d{1,2}-[A-Za-z]{3}-\d{4})/i.exec(t.status || '');
  return m ? m[1].replace(/-/g, ' ') : '';   // "16-Oct-2026" → "16 Oct 2026", same as istDate()
};

export function txnText(t?: TxnState | null) {
  if (!t) return '';
  if (t.state === 'DONE') return `Done${approvedDate(t) ? ` ${approvedDate(t)}` : ''}`;
  if (t.state === 'PENDING') return 'Pending';
  if (t.state === 'NOT_FILED') return 'Not filed';
  return 'N/A';
}

export function TxnCell({ t }: { t?: TxnState | null }) {
  if (!t) return <span className="text-[10px] text-muted-foreground">—</span>;
  const cls = t.state === 'DONE' ? 'text-emerald-700'
    : t.state === 'PENDING' ? 'text-amber-700'
    : t.state === 'NOT_FILED' ? 'text-red-600'
    : 'text-muted-foreground';
  // compact in the table ("✓ 15 Oct"); full receipt + status on hover
  const short = t.state === 'DONE' ? `✓ ${approvedDate(t).replace(/\s\d{4}$/, '') || 'Done'}`
    : t.state === 'NOT_NEEDED' ? 'N/A' : txnText(t);
  return (
    <span className={`whitespace-nowrap text-[11px] font-semibold ${cls}`} title={[txnText(t), t.receipt_no, t.status].filter(Boolean).join(' — ')}>
      {short}
    </span>
  );
}

export function rcText(match?: string | null, financer?: string | null) {
  switch (match) {
    case 'MATCHED': return `Verified (${financer || ''})`;
    case 'MISMATCH': return `Mismatch: ${financer || ''}`;
    case 'NOT_UPDATED': return 'RC not updated';
    case 'PENDING': return 'Pending';
    default: return '';
  }
}

export function RcCell({ match, financer }: { match?: string | null; financer?: string | null }) {
  if (!match) return <span className="text-[10px] text-muted-foreground">—</span>;
  const cls = match === 'MATCHED' ? 'text-emerald-700' : match === 'MISMATCH' ? 'text-red-600' : 'text-amber-700';
  const short = match === 'MATCHED' ? '✓ Match' : match === 'MISMATCH' ? '✗ Mismatch' : match === 'NOT_UPDATED' ? 'Not upd.' : 'Pending';
  return <span className={`whitespace-nowrap text-[11px] font-semibold ${cls}`} title={rcText(match, financer)}>{short}</span>;
}
