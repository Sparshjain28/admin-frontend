import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FLAG_META, RtoFlagBadge, istDate, istDateTime } from './rtoShared';

const ORDER = ['RED_ALERT', 'OBSERVATION', 'REGULAR'] as const;
const th = 'px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap';
const td = 'px-3 py-2 text-xs align-top';

/**
 * RTO flag counts across all tracked loans (admin / ops). Clicking a count
 * lists every loan with that flag — independent of the PDD page's paging.
 */
export default function RtoSummaryBar({ onOpenLoan }: { onOpenLoan: (loanId: number) => void }) {
  const [open, setOpen] = useState<(typeof ORDER)[number] | null>(null);

  const { data: summary } = useQuery({
    queryKey: ['rto-summary'],
    queryFn: async () => (await api.get('/rto/summary')).data as { counts: Record<string, number> },
    refetchInterval: 5 * 60_000,
  });
  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: ['rto-summary', open],
    queryFn: async () => (await api.get(`/rto/summary?flag=${open}`)).data.loans as any[],
    enabled: !!open,
  });

  const counts = summary?.counts ?? {};
  const total = ORDER.reduce((s, f) => s + (counts[f] || 0), 0) + (counts.NOT_CHECKED || 0);
  if (!summary || total === 0) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2" data-testid="rto-summary-bar">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">RTO (VAHAN)</span>
        {ORDER.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setOpen(f)}
            disabled={!counts[f]}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${FLAG_META[f].badge} hover:brightness-95`}
          >
            <span className={`h-2 w-2 rounded-full ${FLAG_META[f].dot}`} aria-hidden="true" />
            {FLAG_META[f].label}
            <span className="tabular-nums">{counts[f] || 0}</span>
          </button>
        ))}
        {!!counts.NOT_CHECKED && (
          <span className="text-[11px] text-muted-foreground">{counts.NOT_CHECKED} not checked yet</span>
        )}
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {open && <RtoFlagBadge flag={open} />} {open ? `${counts[open] || 0} loan(s)` : ''}
            </DialogTitle>
          </DialogHeader>
          {listLoading ? (
            <div className="py-10 text-center text-xs text-muted-foreground"><Loader2 size={16} className="mx-auto mb-2 animate-spin" />Loading…</div>
          ) : (
            <div className="max-h-[65vh] overflow-auto rounded-lg border border-border">
              <table className="w-full">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur">
                  <tr className="border-b border-border">
                    <th className={th}>Customer</th>
                    <th className={th}>RC Number</th>
                    <th className={th}>Lender (Case Type)</th>
                    <th className={th}>Disbursed</th>
                    <th className={th}>Reason</th>
                    <th className={th}>Last checked</th>
                    <th className={`${th} text-right`}>Lead</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {(list ?? []).map((l) => (
                    <tr key={l.loan_id} className="hover:bg-muted/20">
                      <td className={td}><p className="font-semibold">{l.applicant_name || '—'}</p><p className="text-[10px] text-muted-foreground">{l.loan_number}</p></td>
                      <td className={`${td} uppercase tracking-wider font-medium whitespace-nowrap`}>{l.vehicle_number}</td>
                      <td className={td}>{l.lender || '—'} <span className="text-muted-foreground">({l.case_type || '—'})</span></td>
                      <td className={`${td} whitespace-nowrap`}>{istDate(l.disbursement_date)}</td>
                      <td className={`${td} min-w-[220px]`}>{l.flag_reason || '—'}</td>
                      <td className={`${td} whitespace-nowrap text-muted-foreground`}>{istDateTime(l.last_checked_at)}</td>
                      <td className={`${td} text-right`}>
                        <button type="button" onClick={() => onOpenLoan(l.loan_id)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5">
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
