import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Download, Filter, Search, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function DisbursementLedger() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [search, setSearch] = useState('');

  const { data: ledger, isLoading } = useQuery({
    queryKey: ['disbursement-ledger', user?.id, dateRange, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      if (search) params.append('search', search);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/disbursement-ledger?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!user,
  });

  const handleExport = () => {
    if (!ledger || ledger.length === 0) {
      toast.error('No data to export');
      return;
    }
    const csv = 'Loan ID,Customer Name,Amount,Date,Bank/NBFC,Branch,Status,UTR No\\n' +
      ledger.map((row: any) =>
        `${row.loan_id},"${row.customer_name}",${row.amount},${new Date(row.date).toLocaleDateString()},"${row.bank_nbfc}","${row.branch_name}",${row.status},${row.utr_no || '-'}`
      ).join('\\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'disbursement_ledger.csv';
    a.click();
    toast.success('Ledger exported successfully');
  };

  const totalDisbursed = ledger?.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0) || 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <FileText size={20} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Disbursement Ledger</h1>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-primary hover:opacity-90 text-primary-foreground text-sm font-bold px-4 py-2 rounded-lg transition-opacity shadow-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        {/* Filters */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Filters & Search</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Search Customer / ID / UTR</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">From Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">To Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setDateRange({ start: '', end: '' }); setSearch(''); }}
                className="w-full bg-muted text-foreground px-4 py-2 rounded-lg hover:bg-muted/80 transition-colors text-sm font-bold border border-border"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        {/* Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border flex flex-col justify-between">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Filtered Disbursed Amount</p>
            <p className="text-2xl font-bold text-foreground">₹{(totalDisbursed / 100000).toFixed(2)}L</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border flex flex-col justify-between">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Total Loans</p>
            <p className="text-2xl font-bold text-foreground">{ledger?.length || 0}</p>
          </div>
        </div>

        {/* Ledger Table */}
        {/* Ledger Table */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground">Loading ledger data...</div>
          ) : ledger && ledger.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Loan ID / Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Bank / Branch</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">UTR No</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ledger.map((row: any) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground text-sm">{row.loan_id}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{row.customer_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-extrabold text-foreground">
                          ₹{Number(row.amount || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-foreground">{row.bank_nbfc}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{row.branch_name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-muted-foreground">
                        {row.utr_no || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center text-muted-foreground">
              No disbursement records found for the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
