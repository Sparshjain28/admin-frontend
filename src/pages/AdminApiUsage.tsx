import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BarChart2, Users, Zap, Database, RefreshCw, Filter, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

const API_LABELS: Record<string, string> = {
  'rc-lookup':    'RC Lookup',
  'challan':      'RC Challan',
  'rc-to-mobile': 'RC → Mobile',
  'mobile-to-rc': 'Mobile → RC',
  'vahan-status': 'Vahan Status',
};

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  'manual':           { label: 'Manual (Ops Tool)',  color: 'bg-blue-100 text-blue-700' },
  'loan-application': { label: 'Loan Application',   color: 'bg-purple-100 text-purple-700' },
  'auto-rc-lookup':   { label: 'Auto (RC Lookup)',    color: 'bg-green-100 text-green-700' },
  'ops-process':      { label: 'Ops Process RC',      color: 'bg-orange-100 text-orange-700' },
};

const formatDisplayDate = (dateStr: string) => {
  try {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day}-${months[parseInt(month, 10) - 1]}-${year}`;
  } catch (e) {
    return dateStr;
  }
};

export default function AdminApiUsage() {
  const today = new Date().toISOString().split('T')[0];

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [userFilter, setUserFilter] = useState('all');
  const [apiFilter, setApiFilter] = useState('all');

  const params = new URLSearchParams({ from, to, ...(userFilter !== 'all' && { userId: userFilter }), ...(apiFilter !== 'all' && { apiName: apiFilter }) });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['api-usage-stats', from, to, userFilter, apiFilter],
    queryFn: () => api.get(`/rc-verification/usage/stats?${params}`),
    staleTime: 0,
  });

  const summary = data?.summary || { total: 0, cached: 0, failed: 0 };
  const byUser: any[] = data?.byUser || [];
  const byApi: any[] = data?.byApi || [];
  const byDate: any[] = data?.byDate || [];
  const dailyReport: any[] = data?.dailyReport || [];
  const byUserApi: any[] = data?.byUserApi || [];

  // Build active APIs array
  const activeApis = useMemo(() => [...new Set(byApi.map((r: any) => r.api_name))], [byApi]);

  // Pivot user × api fresh calls matrix
  const userApiMatrix = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    byUserApi.forEach((r: any) => {
      if (!m[r.user_id]) m[r.user_id] = {};
      m[r.user_id][r.api_name] = Number(r.fresh);
    });
    return m;
  }, [byUserApi]);

  // Group and pivot daily report (date × user)
  const groupedDailyReport = useMemo(() => {
    const groups: Record<string, { date: string; user_id: number; user_name: string; calls: Record<string, number>; total: number }> = {};
    dailyReport.forEach((r: any) => {
      const key = `${r.date}_${r.user_id}`;
      if (!groups[key]) {
        groups[key] = {
          date: r.date,
          user_id: Number(r.user_id),
          user_name: r.user_name,
          calls: {},
          total: 0,
        };
      }
      const count = Number(r.total);
      groups[key].calls[r.api_name] = count;
      groups[key].total += count;
    });

    return Object.values(groups).sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.total - a.total;
    });
  }, [dailyReport]);

  // Build date × api matrix for the date chart
  const allDates = useMemo(() => [...new Set(byDate.map((r: any) => r.date))].sort().reverse(), [byDate]);
  const allApis = useMemo(() => [...new Set(byDate.map((r: any) => r.api_name))], [byDate]);
  const dateMatrix = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    byDate.forEach((r: any) => {
      if (!m[r.date]) m[r.date] = {};
      m[r.date][r.api_name] = Number(r.total);
    });
    return m;
  }, [byDate]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Loading API usage analytics...</p>
      </div>
    );
  }

  const selectClass = 'appearance-none px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:border-accent';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Usage Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track who called which API, how many times, and when</p>
        </div>
        <button onClick={() => refetch()} disabled={isLoading || isRefetching}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
          <RefreshCw size={14} className={isRefetching || isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-card border border-border rounded-xl">
        <Filter size={13} className="text-muted-foreground shrink-0" />
        <div className="flex items-center gap-1.5">
          <Calendar size={12} className="text-muted-foreground" />
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={selectClass} />
          <span className="text-xs text-muted-foreground">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={selectClass} />
        </div>
        <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className={selectClass}>
          <option value="all">All Users</option>
          {byUser.map((u: any) => <option key={u.user_id} value={u.user_id}>{u.user_name || `User #${u.user_id}`}</option>)}
        </select>
        <select value={apiFilter} onChange={e => setApiFilter(e.target.value)} className={selectClass}>
          <option value="all">All APIs</option>
          {Object.entries(API_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Daily Report table */}
      <div className="stat-card overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-sm font-bold text-foreground flex items-center gap-2"><Clock size={15} className="text-accent" /> Daily API Call Report (User-wise)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-2.5 text-muted-foreground font-semibold">Date</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-semibold">User</th>
                {activeApis.map(a => (
                  <th key={a} className="text-center px-4 py-2.5 text-muted-foreground font-semibold whitespace-nowrap">
                    {API_LABELS[a] || a}
                  </th>
                ))}
                <th className="text-center px-4 py-2.5 text-muted-foreground font-semibold bg-accent/5">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {groupedDailyReport.length === 0 && (
                <tr>
                  <td colSpan={activeApis.length + 3} className="text-center py-8 text-muted-foreground">
                    No logs recorded for the selected dates
                  </td>
                </tr>
              )}
              {groupedDailyReport.map((row: any) => (
                <tr key={`${row.date}_${row.user_id}`} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-foreground whitespace-nowrap">
                    {formatDisplayDate(row.date)}
                  </td>
                  <td className="px-4 py-2.5 text-foreground font-medium whitespace-nowrap">
                    {row.user_name || `User #${row.user_id}`}
                  </td>
                  {activeApis.map(a => {
                    const count = row.calls[a] || 0;
                    return (
                      <td key={a} className="px-4 py-2.5 text-center font-semibold">
                        {count > 0 ? (
                          <span className="text-foreground font-bold">{count}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5 text-center font-bold text-foreground bg-accent/5">
                    {row.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
