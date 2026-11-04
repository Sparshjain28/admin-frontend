import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/mock-data';
import { exportToExcel } from '@/lib/export-utils';
import { CreditCard, Download, Filter, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import MobileStatCarousel from '@/components/MobileStatCarousel';

const STATUS_STYLES: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  paid: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={10} />, label: 'Paid' },
  pending: { bg: 'bg-amber-100 text-amber-700', icon: <Clock size={10} />, label: 'Pending' },
  on_hold: { bg: 'bg-red-100 text-red-700', icon: <XCircle size={10} />, label: 'On Hold' },
};

export default function Commission() {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleExportReport = () => {
    if ((commissions as any[]).length === 0) { toast.error('No data to export'); return; }
    const rows = (commissions as any[]).map((c: any) => ({
      'ID': c.id,
      'Loan': c.loans?.applicant_name || '',
      'Loan ID': c.loan_id,
      'Broker': c.brokers?.name || '',
      'Loan Amount': c.loans?.loan_amount || 0,
      'Commission Rate': `${c.commission_rate}%`,
      'Commission Amount': c.commission_amount,
      'Status': c.status,
      'Paid Date': c.paid_date || '',
    }));
    exportToExcel(rows, 'commission-report');
    toast.success('Commission report exported as Excel!');
  };

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['commissions'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/commissions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch commissions');
      return res.json();
    },
  });

  const filtered = (commissions as any[]).filter(c => statusFilter === 'all' || c.status === statusFilter);

  const totalCommission = (commissions as any[]).reduce((s, c) => s + Number(c.commission_amount), 0);
  const paidCommission = (commissions as any[]).filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.commission_amount), 0);
  const pendingCommission = (commissions as any[]).filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.commission_amount), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commission Module</h1>
          <p className="text-muted-foreground text-sm mt-1">Track broker and employee payouts</p>
        </div>
        <button onClick={handleExportReport} className="flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm">
          <Download size={16} /> Export Report
        </button>
      </div>

      <div className="mb-6">
        <MobileStatCarousel items={[
          { icon: <CreditCard size={16} />, label: 'Total Commission', value: formatCurrency(totalCommission) },
          { icon: <CheckCircle2 size={16} />, label: 'Paid Out', value: formatCurrency(paidCommission) },
          { icon: <Clock size={16} />, label: 'Pending', value: formatCurrency(pendingCommission) },
        ]} />
      </div>

      <div className="stat-card mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-muted-foreground" />
          {['all', 'paid', 'pending', 'on_hold'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === s ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {s === 'all' ? 'All' : s === 'on_hold' ? 'On Hold' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading commissions…</div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No commission records found</p>
        ) : (
          filtered.map((c: any) => {
            const style = STATUS_STYLES[c.status] || STATUS_STYLES['pending'];
            return (
              <div key={c.id} className="stat-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{c.loans?.applicant_name || '—'}</p>
                    <p className="text-xs text-muted-foreground mono">{c.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${style.bg}`}>
                    {style.icon} {style.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Loan Amount</p>
                    <p className="font-medium text-foreground">{formatCurrency(Number(c.loans?.loan_amount || 0))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Commission</p>
                    <p className="font-bold text-accent">{formatCurrency(Number(c.commission_amount))}</p>
                    <p className="text-[10px] text-muted-foreground">{c.commission_rate}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Broker</p>
                    <p className="text-foreground truncate">{c.brokers?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Loan ID</p>
                    <p className="text-foreground truncate mono text-xs">{c.loan_id}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="stat-card hidden lg:block">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading commissions…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">ID</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Loan</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Broker</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Loan Amount</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Commission</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => {
                  const style = STATUS_STYLES[c.status] || STATUS_STYLES['pending'];
                  return (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 mono text-xs text-accent font-medium">{c.id.slice(0, 8).toUpperCase()}</td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-foreground">{c.loans?.applicant_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{c.loan_id}</p>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{c.brokers?.name || '—'}</td>
                      <td className="py-3 px-3 font-medium text-foreground">{formatCurrency(Number(c.loans?.loan_amount || 0))}</td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-accent">{formatCurrency(Number(c.commission_amount))}</p>
                        <p className="text-[10px] text-muted-foreground">{c.commission_rate}%</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${style.bg}`}>
                          {style.icon} {style.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && !isLoading && (
              <p className="text-center text-muted-foreground py-8 text-sm">No commission records found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
