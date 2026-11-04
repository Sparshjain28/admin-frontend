import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/mock-data';
import { exportToExcel } from '@/lib/export-utils';
import { BarChart3, Download, FileText, IndianRupee, TrendingUp, Calendar, Users, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { toast } from 'sonner';
import MobileStatCarousel from '@/components/MobileStatCarousel';

const CHART_COLORS = ['#2dd4bf', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#6b7280', '#ec4899', '#14b8a6', '#f97316'];

const STAGE_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted', LOGIN: 'Login', IN_PROCESS: 'In Process',
  APPROVED: 'Approved', REJECTED: 'Rejected', DISBURSED: 'Disbursed', CANCELLED: 'Cancelled',
};

export default function Reports() {
  const [reportType, setReportType] = useState<'overview' | 'datewise' | 'teamwise' | 'lenderwise' | 'stagewise'>('overview');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedHierarchy, setSelectedHierarchy] = useState('all');

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['loans-reports'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch loans');
      return res.json();
    },
  });

  // Filter loans by date range and hierarchy
  const filteredLoans = useMemo(() => {
    let filtered = (loans as any[]).filter(l => {
      const created = new Date(l.created_at);
      const from = new Date(dateFrom); const to = new Date(dateTo); to.setHours(23, 59, 59);
      return created >= from && created <= to;
    });
    // Hierarchy filter — show only files that fall UNDER the selected person
    if (selectedHierarchy !== 'all') {
      filtered = filtered.filter(l => {
        // If this person is the sales manager (top), show all under them
        if ((l.senior_manager_name || '') === selectedHierarchy) return true;
        // If this person is the branch manager, show all under them
        if ((l.branch_manager_name || '') === selectedHierarchy) return true;
        // If this person is the team leader, show all under them
        if ((l.team_leader_name || '') === selectedHierarchy) return true;
        return false;
      });
    }
    // Executive filter — specific person
    if (selectedTeam !== 'all') {
      filtered = filtered.filter(l => (l.created_by_name || 'Unknown') === selectedTeam);
    }
    return filtered;
  }, [loans, dateFrom, dateTo, selectedTeam, selectedHierarchy]);

  // Get unique executives (only those visible after hierarchy filter)
  const teamMembers = useMemo(() => {
    let base = (loans as any[]);
    if (selectedHierarchy !== 'all') {
      base = base.filter(l =>
        (l.senior_manager_name || '') === selectedHierarchy ||
        (l.branch_manager_name || '') === selectedHierarchy ||
        (l.team_leader_name || '') === selectedHierarchy
      );
    }
    const members = new Set(base.map(l => l.created_by_name).filter(Boolean));
    return Array.from(members).sort();
  }, [loans, selectedHierarchy]);

  // Get hierarchy levels for filtering — grouped structure
  const hierarchyOptions = useMemo(() => {
    const options: { label: string; value: string; role: string }[] = [];
    const sms = new Set<string>();
    const bms = new Set<string>();
    const tls = new Set<string>();
    (loans as any[]).forEach(l => {
      if (l.senior_manager_name) sms.add(l.senior_manager_name);
      if (l.branch_manager_name) bms.add(l.branch_manager_name);
      if (l.team_leader_name) tls.add(l.team_leader_name);
    });
    Array.from(sms).sort().forEach(n => options.push({ label: n, value: n, role: 'SM' }));
    Array.from(bms).sort().forEach(n => { if (!sms.has(n)) options.push({ label: n, value: n, role: 'BM' }); });
    Array.from(tls).sort().forEach(n => { if (!bms.has(n) && !sms.has(n)) options.push({ label: n, value: n, role: 'TL' }); });
    return options;
  }, [loans]);

  // Grouped executive options — when hierarchy is selected, show TL > Executives
  const groupedExecutiveOptions = useMemo(() => {
    if (selectedHierarchy === 'all') {
      return [{ group: 'All', members: teamMembers }];
    }
    const allLoans = loans as any[];
    const tlExecMap: Record<string, Set<string>> = {};
    allLoans.forEach(l => {
      const matches = (l.senior_manager_name || '') === selectedHierarchy ||
        (l.branch_manager_name || '') === selectedHierarchy ||
        (l.team_leader_name || '') === selectedHierarchy;
      if (matches && l.created_by_name) {
        const tl = l.team_leader_name || 'Direct';
        if (!tlExecMap[tl]) tlExecMap[tl] = new Set();
        tlExecMap[tl].add(l.created_by_name);
      }
    });
    return Object.entries(tlExecMap).sort(([a], [b]) => a.localeCompare(b)).map(([tl, execs]) => ({
      group: tl,
      members: Array.from(execs).sort()
    }));
  }, [loans, selectedHierarchy, teamMembers]);

  // Stage data
  const stageData = useMemo(() => Object.entries(STAGE_LABELS).map(([key, label]) => ({
    name: label, value: filteredLoans.filter(l => (l.application_stage || 'SUBMITTED') === key).length,
  })).filter(d => d.value > 0), [filteredLoans]);

  // Lender data
  const lenderData = useMemo(() => {
    const map: Record<string, { cases: number; amount: number }> = {};
    filteredLoans.forEach(l => {
      const bank = l.financier_name || l.bank_name || 'Unassigned';
      if (!map[bank]) map[bank] = { cases: 0, amount: 0 };
      map[bank].cases += 1; map[bank].amount += Number(l.loan_amount || 0);
    });
    return Object.entries(map).map(([name, d]) => ({
      name: name.length > 18 ? name.substring(0, 18) + '…' : name, cases: d.cases, amount: Math.round(d.amount / 100000 * 100) / 100
    })).sort((a, b) => b.cases - a.cases).slice(0, 10);
  }, [filteredLoans]);

  // Daily data
  const dailyData = useMemo(() => {
    const map: Record<string, { cases: number; amount: number }> = {};
    filteredLoans.forEach(l => {
      const date = new Date(l.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      if (!map[date]) map[date] = { cases: 0, amount: 0 };
      map[date].cases += 1; map[date].amount += Number(l.loan_amount || 0) / 100000;
    });
    return Object.entries(map).map(([name, d]) => ({ name, cases: d.cases, amount: Math.round(d.amount * 100) / 100 }));
  }, [filteredLoans]);

  // Team-wise data
  const teamData = useMemo(() => {
    const map: Record<string, { cases: number; amount: number; disbursed: number; login: number; approved: number }> = {};
    filteredLoans.forEach(l => {
      const user = l.created_by_name || 'Unknown';
      if (!map[user]) map[user] = { cases: 0, amount: 0, disbursed: 0, login: 0, approved: 0 };
      map[user].cases += 1; map[user].amount += Number(l.loan_amount || 0);
      const stage = (l.application_stage || '').toUpperCase();
      if (stage === 'DISBURSED') map[user].disbursed += 1;
      if (stage === 'LOGIN' || stage === 'IN_PROCESS') map[user].login += 1;
      if (stage === 'APPROVED') map[user].approved += 1;
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.cases - a.cases);
  }, [filteredLoans]);

  // Date-wise detailed list (grouped by date)
  const dateGroupedFiles = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredLoans.forEach(l => {
      const date = new Date(l.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      if (!map[date]) map[date] = [];
      map[date].push(l);
    });
    return Object.entries(map).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [filteredLoans]);

  const totalVolume = filteredLoans.reduce((s, l) => s + Number(l.loan_amount || 0), 0);
  const avgLoanSize = filteredLoans.length > 0 ? totalVolume / filteredLoans.length : 0;
  const disbursedCount = filteredLoans.filter(l => (l.application_stage || '').toUpperCase() === 'DISBURSED').length;
  const conversionRate = filteredLoans.length > 0 ? Math.round((disbursedCount / filteredLoans.length) * 100) : 0;

  const handleExportExcel = () => {
    if (filteredLoans.length === 0) { toast.error('No data to export'); return; }
    const rows = filteredLoans.map(l => ({
      'Date': new Date(l.created_at).toLocaleDateString('en-IN'),
      'Loan ID': l.id, 'Applicant': l.applicant_name || l.customer_name,
      'Mobile': l.mobile, 'Vehicle': l.vehicle_number || '',
      'Maker/Model': `${l.maker_name || ''} ${l.maker_model || ''}`.trim(),
      'Financier': l.financier_name || l.bank_name || '', 'Loan Amount': l.loan_amount || 0,
      'Stage': STAGE_LABELS[l.application_stage] || l.application_stage || 'Submitted',
      'Created By': l.created_by_name || '',
    }));
    exportToExcel(rows, `report-${dateFrom}-to-${dateTo}`);
    toast.success('Report exported as Excel!');
  };

  const statItems = [
    { icon: <FileText size={16} />, label: 'Total Files', value: String(filteredLoans.length) },
    { icon: <IndianRupee size={16} />, label: 'Total Volume', value: formatCurrency(totalVolume) },
    { icon: <TrendingUp size={16} />, label: 'Avg Size', value: formatCurrency(avgLoanSize) },
    { icon: <BarChart3 size={16} />, label: 'Disbursed', value: `${disbursedCount} (${conversionRate}%)` },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Date-wise & Team-wise file analysis</p>
        </div>
        <button onClick={handleExportExcel} className="flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm">
          <Download size={16} /> Export Excel
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5 p-3 bg-muted/30 rounded-xl border border-border">
        <Calendar size={16} className="text-muted-foreground shrink-0" />
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground" />
        <span className="text-xs text-muted-foreground">to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground" />
        <div className="flex items-center gap-2">
          <Users size={14} className="text-muted-foreground" />
          <select value={selectedHierarchy} onChange={e => { setSelectedHierarchy(e.target.value); setSelectedTeam('all'); }} className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground">
            <option value="all">All Hierarchy</option>
            {hierarchyOptions.map(o => <option key={o.value} value={o.value}>[{o.role}] {o.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground">
            <option value="all">All Executives ({teamMembers.length})</option>
            {groupedExecutiveOptions.map(g => (
              g.group === 'All' ? (
                g.members.map(m => <option key={m} value={m}>{m}</option>)
              ) : (
                <optgroup key={g.group} label={`TL: ${g.group}`}>
                  {g.members.map(m => <option key={m} value={m}>{m}</option>)}
                </optgroup>
              )
            ))}
          </select>
        </div>
        <span className="text-xs font-bold text-accent ml-auto">{filteredLoans.length} files</span>
      </div>

      {/* KPIs */}
      <div className="mb-6"><MobileStatCarousel items={statItems} /></div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {([
          { key: 'overview', label: 'Overview' }, { key: 'datewise', label: 'Date-wise' },
          { key: 'teamwise', label: 'Team-wise' }, { key: 'lenderwise', label: 'Lender-wise' },
          { key: 'stagewise', label: 'Stage-wise' },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setReportType(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${reportType === tab.key ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-3 border-accent border-t-transparent rounded-full" /></div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {(reportType === 'overview' || reportType === 'datewise') && (
              <div className="stat-card lg:col-span-2">
                <h3 className="font-semibold text-foreground mb-4">📊 Daily Files Entered</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="cases" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Files" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {(reportType === 'overview' || reportType === 'lenderwise') && (
              <div className="stat-card">
                <h3 className="font-semibold text-foreground mb-4">🏦 Lender-wise Cases</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lenderData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={110} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="cases" fill="#10b981" radius={[0, 4, 4, 0]} name="Cases" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {(reportType === 'overview' || reportType === 'stagewise') && (
              <div className="stat-card">
                <h3 className="font-semibold text-foreground mb-4">📈 Stage Breakdown</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stageData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {stageData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Team-wise Table */}
          {(reportType === 'overview' || reportType === 'teamwise') && teamData.length > 0 && (
            <div className="stat-card mb-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Users size={16} /> Team-wise Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="p-2.5 text-[10px] uppercase font-bold text-muted-foreground">#</th>
                      <th className="p-2.5 text-[10px] uppercase font-bold text-muted-foreground">Executive</th>
                      <th className="p-2.5 text-[10px] uppercase font-bold text-muted-foreground text-center">Files</th>
                      <th className="p-2.5 text-[10px] uppercase font-bold text-muted-foreground text-center">Login</th>
                      <th className="p-2.5 text-[10px] uppercase font-bold text-muted-foreground text-center">Approved</th>
                      <th className="p-2.5 text-[10px] uppercase font-bold text-muted-foreground text-center">Disbursed</th>
                      <th className="p-2.5 text-[10px] uppercase font-bold text-muted-foreground text-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {teamData.map((row, i) => (
                      <tr key={row.name} className="hover:bg-muted/20">
                        <td className="p-2.5 text-xs text-muted-foreground">{i + 1}</td>
                        <td className="p-2.5 text-xs font-bold text-foreground">{row.name}</td>
                        <td className="p-2.5 text-xs font-bold text-blue-600 text-center">{row.cases}</td>
                        <td className="p-2.5 text-xs text-amber-600 text-center">{row.login}</td>
                        <td className="p-2.5 text-xs text-purple-600 text-center">{row.approved}</td>
                        <td className="p-2.5 text-xs font-bold text-green-600 text-center">{row.disbursed}</td>
                        <td className="p-2.5 text-xs text-foreground text-right">{formatCurrency(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Date-wise Detailed File List */}
          {(reportType === 'datewise') && dateGroupedFiles.length > 0 && (
            <div className="stat-card">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Calendar size={16} /> Files by Date</h3>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {dateGroupedFiles.map(([date, files]) => (
                  <div key={date}>
                    <div className="flex items-center justify-between mb-2 sticky top-0 bg-card z-10 py-1">
                      <span className="text-xs font-bold text-foreground bg-accent/10 px-3 py-1 rounded-full">{date}</span>
                      <span className="text-[10px] font-bold text-muted-foreground">{files.length} file{files.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="p-1.5 text-[9px] uppercase font-bold text-muted-foreground">ID</th>
                            <th className="p-1.5 text-[9px] uppercase font-bold text-muted-foreground">Applicant</th>
                            <th className="p-1.5 text-[9px] uppercase font-bold text-muted-foreground">Vehicle</th>
                            <th className="p-1.5 text-[9px] uppercase font-bold text-muted-foreground">Lender</th>
                            <th className="p-1.5 text-[9px] uppercase font-bold text-muted-foreground">Amount</th>
                            <th className="p-1.5 text-[9px] uppercase font-bold text-muted-foreground">Stage</th>
                            <th className="p-1.5 text-[9px] uppercase font-bold text-muted-foreground">By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {files.map((l: any) => (
                            <tr key={l.id} className="hover:bg-muted/20">
                              <td className="p-1.5 text-[10px] text-muted-foreground">#{l.id}</td>
                              <td className="p-1.5 text-[10px] font-bold text-foreground truncate max-w-[100px]">{l.applicant_name || l.customer_name || '—'}</td>
                              <td className="p-1.5 text-[10px] text-muted-foreground">{l.vehicle_number || '—'}</td>
                              <td className="p-1.5 text-[10px] text-foreground truncate max-w-[80px]">{l.financier_name || l.bank_name || '—'}</td>
                              <td className="p-1.5 text-[10px] font-medium text-accent">{l.loan_amount ? formatCurrency(Number(l.loan_amount)) : '—'}</td>
                              <td className="p-1.5"><span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-muted text-muted-foreground">{STAGE_LABELS[l.application_stage] || 'Submitted'}</span></td>
                              <td className="p-1.5 text-[10px] text-muted-foreground truncate max-w-[70px]">{l.created_by_name || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
