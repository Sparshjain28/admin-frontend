import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { RcCell, RtoFlagBadge, istDate, istDateTime, istTime, rcText } from './rtoShared';

const TXN_LABEL: Record<string, string> = { HPT: 'HPT (Txn 1)', TO: 'TO (Txn 2)', HPA: 'HPA (Txn 3)' };

interface Receipt {
  rc_no: string;
  flag: string | null;
  flag_reason: string | null;
  receipt_no: string;
  txn_purpose: string;
  txn_type: string;
  current_status: string | null;
  verify_on: string | null;
  verify_by: string | null;
  approve_on: string | null;
  approve_by: string | null;
  other_stages: Array<{ action?: string; status?: string; by?: string; on?: string }>;
}

interface RtoData {
  tracking: null | {
    flag: string | null;
    flag_reason: string | null;
    next_expected: string | null;
    last_checked_at: string | null;
    last_error: string | null;
    recheck_requested: boolean;
    closed_at: string | null;
    closed_reason: string | null;
    hpa_completed_at: string | null;
    rc_lender_match: string | null;
    rc_financer: string | null;
    rc_checked_at: string | null;
  };
  receipts: Receipt[];
}

const th = 'px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap';
const td = 'px-3 py-2 text-xs align-top';

/** RTO (VAHAN) status of a disbursed loan: case flag + one row per receipt. */
export default function RtoStatusCard({ loanId }: { loanId: number | string }) {
  const qc = useQueryClient();
  const { user } = useAuth() as any;
  const canCheckRc = ['admin', 'operation_team', 'ops_team', 'loan_operations', 'accountant'].includes(user?.role);
  const key = ['rto-loan', String(loanId)];

  const { data, isLoading, isError, refetch } = useQuery<RtoData>({
    queryKey: key,
    queryFn: async () => (await api.get(`/rto/loans/${loanId}`)).data,
    // while a "check now" is pending, look again every 30s
    refetchInterval: (q) => ((q.state.data as RtoData | undefined)?.tracking?.recheck_requested ? 30_000 : false),
  });

  const recheck = useMutation({
    mutationFn: () => api.post(`/rto/loans/${loanId}/recheck`, {}),
    onSuccess: () => {
      toast.success('Queued — the RTO bot will check this vehicle on VAHAN within a few minutes');
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: any) => toast.error(e?.message || 'Could not request a re-check'),
  });

  const rcCheck = useMutation({
    mutationFn: () => api.post(`/rto/loans/${loanId}/rc-check`, {}),
    onSuccess: (res: any) => {
      toast.success(`RC checked: ${rcText(res?.data?.match, res?.data?.financer) || res?.data?.match || 'done'}`);
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: any) => toast.error(e?.message || 'Could not check RC'),
  });

  const t = data?.tracking;
  const receipts = data?.receipts ?? [];
  const pending = !!t?.recheck_requested || recheck.isPending;

  return (
    <div className="stat-card mt-4" data-testid="rto-status-card">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">RTO Status (VAHAN)</h3>
            {t && <RtoFlagBadge flag={t.flag as any} reason={t.flag_reason} />}
          </div>
          {t ? (
            <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
              {t.flag_reason && <p className="text-foreground/80">{t.flag_reason}</p>}
              <p>
                {t.next_expected ? <>Next expected: <span className="font-semibold text-foreground">{TXN_LABEL[t.next_expected] || t.next_expected}</span> · </> : null}
                Last checked: {t.last_checked_at ? istDateTime(t.last_checked_at) : 'not yet'}
                {t.closed_at ? <> · Tracking closed{t.closed_reason ? ` (${t.closed_reason})` : ''}</> : null}
              </p>
              {t.hpa_completed_at && (
                <p className="flex flex-wrap items-center gap-1.5">
                  RC lender check: <RcCell match={t.rc_lender_match || 'PENDING'} financer={t.rc_financer} />
                  {t.rc_financer && <span>· RC shows {t.rc_financer}</span>}
                  {t.rc_checked_at && <span>· {istDateTime(t.rc_checked_at)}</span>}
                  {!t.rc_checked_at && <span>· runs 24h after HPA</span>}
                </p>
              )}
              {t.last_error && (
                <p className="flex items-center gap-1 text-amber-700"><AlertTriangle size={12} /> Last check failed: {t.last_error}</p>
              )}
            </div>
          ) : !isLoading && (
            <p className="mt-1 text-[11px] text-muted-foreground">Not checked on VAHAN yet. It is picked up in the next scheduled run, or check now.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
        {canCheckRc && t?.hpa_completed_at && t?.rc_lender_match !== 'MATCHED' && (
          <button
            type="button"
            onClick={() => rcCheck.mutate()}
            disabled={rcCheck.isPending}
            title="Checks the RC financer on Surepass (paid lookup)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#0024A2]/20 px-3 py-1.5 text-xs font-semibold text-[#0024A2] hover:bg-[#E8EEFF]/60 disabled:opacity-60"
          >
            {rcCheck.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
            Check RC
          </button>
        )}
        <button
          type="button"
          onClick={() => recheck.mutate()}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#0024A2]/20 px-3 py-1.5 text-xs font-semibold text-[#0024A2] hover:bg-[#E8EEFF]/60 disabled:opacity-60"
        >
          {pending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {pending ? 'Check queued…' : 'Check now'}
        </button>
        </div>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Loading RTO status…</p>
      ) : isError ? (
        <div className="py-6 text-center">
          <p className="text-xs font-semibold text-foreground">Could not load RTO status</p>
          <button type="button" onClick={() => refetch()} className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">Try again</button>
        </div>
      ) : receipts.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          {t?.last_checked_at ? 'No applications found on VAHAN for this vehicle.' : 'No receipts yet.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className={th}>RC No</th>
                <th className={th}>Flag Stage</th>
                <th className={th}>Receipt No</th>
                <th className={th}>Txn Purpose</th>
                <th className={th}>Current Status</th>
                <th className={th}>Verify Date</th>
                <th className={th}>Verify Time</th>
                <th className={th}>Verify By</th>
                <th className={th}>Approve Date</th>
                <th className={th}>Approve Time</th>
                <th className={th}>Approve By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {receipts.map((r) => {
                const notCounted = !r.flag && /not counted/i.test(r.flag_reason || '');
                return (
                  <tr key={`${r.receipt_no}|${r.txn_purpose}`} className={notCounted ? 'text-muted-foreground' : ''}>
                    <td className={`${td} uppercase tracking-wider font-medium whitespace-nowrap`}>{r.rc_no}</td>
                    <td className={td}>
                      {r.flag ? <RtoFlagBadge flag={r.flag as any} reason={r.flag_reason} /> : (
                        <span className="text-[10px] text-muted-foreground" title={r.flag_reason || ''}>{notCounted ? 'Old / not counted' : '—'}</span>
                      )}
                    </td>
                    <td className={`${td} font-mono text-[11px] whitespace-nowrap`}>{r.receipt_no}</td>
                    <td className={td}>
                      <span className="block font-semibold">{r.txn_purpose}</span>
                      {TXN_LABEL[r.txn_type] && <span className="block text-[10px] text-muted-foreground">{TXN_LABEL[r.txn_type]}</span>}
                    </td>
                    <td className={`${td} min-w-[220px]`}>{r.current_status || '—'}</td>
                    <td className={`${td} whitespace-nowrap`}>{istDate(r.verify_on)}</td>
                    <td className={`${td} whitespace-nowrap`}>{istTime(r.verify_on)}</td>
                    <td className={td}>{r.verify_by || '—'}</td>
                    <td className={`${td} whitespace-nowrap`}>{istDate(r.approve_on)}</td>
                    <td className={`${td} whitespace-nowrap`}>{istTime(r.approve_on)}</td>
                    <td className={td}>{r.approve_by || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
