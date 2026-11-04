import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Filter, TrendingUp, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import { useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';

const PDD_BUCKETS = [
  { label: '1–30 days',  min: 1,  max: 30,  color: '#22c55e', light: '#dcfce7', text: '#15803d' },
  { label: '31–45 days', min: 31, max: 45,  color: '#f59e0b', light: '#fef3c7', text: '#b45309' },
  { label: '46–60 days', min: 46, max: 60,  color: '#f97316', light: '#ffedd5', text: '#c2410c' },
  { label: '61–90 days', min: 61, max: 90,  color: '#ef4444', light: '#fee2e2', text: '#b91c1c' },
  { label: '90+ days',   min: 91, max: Infinity, color: '#7c3aed', light: '#ede9fe', text: '#6d28d9' },
];

function getPddDays(loan: any): number | null {
  if (loan.application_stage !== 'DISBURSED') return null;
  const dateStr = loan.disbursement_date;
  if (!dateStr) return null;
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  return days >= 1 ? days : null;
}

function formatPddDays(days: number): string { return `${days}d`; }

function getManagerName(loan: any): string {
  return loan.assigned_to_name || loan.sourcing_person_name || loan.sales_manager || loan.manager_name || loan.created_by_name || 'Unassigned';
}

function getBucket(days: number) {
  return PDD_BUCKETS.find(b => days >= b.min && days <= b.max) || PDD_BUCKETS[PDD_BUCKETS.length - 1];
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ data, title, subtitle }: {
  data: { label: string; value: number; color: string; light: string; text: string }[];
  title: string; subtitle?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) return (
    <div className="stat-card flex flex-col items-center justify-center py-16">
      <AlertTriangle size={32} className="text-muted-foreground/30 mb-3" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">No disbursed loans found</p>
    </div>
  );

  const cx = 120, cy = 120, r = 100, inner = 52;
  let cumAngle = -Math.PI / 2;
  const slices = data.filter(d => d.value > 0).map(d => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle), y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle), y2 = cy + r * Math.sin(cumAngle);
    return { ...d, path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${angle > Math.PI ? 1 : 0},1 ${x2},${y2} Z` };
  });
  const hoveredItem = hovered ? data.find(d => d.label === hovered) : null;

  return (
    <div className="stat-card">
      <div className="mb-4">
        <p className="text-base font-bold text-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <svg width="240" height="240" viewBox="0 0 240 240" className="shrink-0">
          {slices.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="3"
              opacity={hovered && hovered !== s.label ? 0.4 : 1}
              style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
              onMouseEnter={() => setHovered(s.label)} onMouseLeave={() => setHovered(null)} />
          ))}
          <circle cx={cx} cy={cy} r={inner} fill="white" />
          {hoveredItem ? (
            <>
              <text x={cx} y={cy - 10} textAnchor="middle" fontSize="22" fontWeight="bold" fill="#1e293b">{hoveredItem.value}</text>
              <text x={cx} y={cy + 8} textAnchor="middle" fontSize="10" fill="#64748b">{Math.round((hoveredItem.value / total) * 100)}%</text>
              <text x={cx} y={cy + 22} textAnchor="middle" fontSize="9" fill="#94a3b8">{hoveredItem.label}</text>
            </>
          ) : (
            <>
              <text x={cx} y={cy - 6} textAnchor="middle" fontSize="26" fontWeight="bold" fill="#1e293b">{total}</text>
              <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#64748b">Total Cases</text>
            </>
          )}
        </svg>
        <div className="flex flex-col gap-3 w-full">
          {data.map(d => (
            <div key={d.label}
              className="flex items-center justify-between gap-2 p-2 rounded-lg transition-colors cursor-pointer"
              style={{ backgroundColor: hovered === d.label ? d.light : 'transparent' }}
              onMouseEnter={() => setHovered(d.label)} onMouseLeave={() => setHovered(null)}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-sm text-muted-foreground">{d.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-bold text-foreground">{d.value}</span>
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: d.light, color: d.text }}>
                  {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Manager Pie Chart ────────────────────────────────────────────────────────
function ManagerPieChart({ loans, selectedManager, onManagerChange }: {
  loans: any[];
  selectedManager: string;
  onManagerChange: (m: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const managers = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    loans.forEach(l => { const n = getManagerName(l); if (!seen.has(n)) { seen.add(n); list.push(n); } });
    return list.sort();
  }, [loans]);

  const managerStats = useMemo(() => {
    const map: Record<string, { buckets: number[]; total: number }> = {};
    loans.forEach(l => {
      const name = getManagerName(l);
      const days = getPddDays(l)!;
      if (!map[name]) map[name] = { buckets: [0, 0, 0, 0, 0], total: 0 };
      const idx = PDD_BUCKETS.findIndex(b => days >= b.min && days <= b.max);
      if (idx >= 0) { map[name].buckets[idx]++; map[name].total++; }
    });
    return map;
  }, [loans]);

  const MANAGER_COLORS = ['#6366f1','#f59e0b','#22c55e','#ef4444','#7c3aed','#0ea5e9','#f97316','#10b981','#ec4899','#84cc16'];

  const pieData = useMemo(() => {
    if (selectedManager === 'all') {
      return managers.map((name, i) => ({
        label: name, value: managerStats[name]?.total || 0,
        color: MANAGER_COLORS[i % MANAGER_COLORS.length], light: '#f1f5f9', text: '#334155',
      })).filter(d => d.value > 0);
    }
    const stats = managerStats[selectedManager];
    if (!stats) return [];
    return PDD_BUCKETS.map((b, i) => ({ ...b, value: stats.buckets[i] }));
  }, [selectedManager, managers, managerStats]);

  const total = pieData.reduce((s, d) => s + d.value, 0);
  const cx = 120, cy = 120, r = 100, inner = 52;
  let cumAngle = -Math.PI / 2;
  const slices = pieData.filter(d => d.value > 0).map(d => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle), y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle), y2 = cy + r * Math.sin(cumAngle);
    return { ...d, path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${angle > Math.PI ? 1 : 0},1 ${x2},${y2} Z` };
  });
  const hoveredItem = hovered ? pieData.find(d => d.label === hovered) : null;

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <p className="text-base font-bold text-foreground">PDD — Manager Wise</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedManager === 'all' ? 'Cases per manager' : `Bucket breakdown for ${selectedManager}`}
          </p>
        </div>
        <div className="relative shrink-0">
          <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <select value={selectedManager} onChange={e => { onManagerChange(e.target.value); setHovered(null); }}
            className="appearance-none pl-7 pr-6 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:border-accent">
            <option value="all">All Managers</option>
            {managers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-xs text-muted-foreground">No data for selected manager</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <svg width="240" height="240" viewBox="0 0 240 240" className="shrink-0">
            {slices.map((s, i) => (
              <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="3"
                opacity={hovered && hovered !== s.label ? 0.4 : 1}
                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseEnter={() => setHovered(s.label)} onMouseLeave={() => setHovered(null)} />
            ))}
            <circle cx={cx} cy={cy} r={inner} fill="white" />
            {hoveredItem ? (
              <>
                <text x={cx} y={cy - 10} textAnchor="middle" fontSize="22" fontWeight="bold" fill="#1e293b">{hoveredItem.value}</text>
                <text x={cx} y={cy + 8} textAnchor="middle" fontSize="10" fill="#64748b">{Math.round((hoveredItem.value / total) * 100)}%</text>
                <text x={cx} y={cy + 22} textAnchor="middle" fontSize="9" fill="#94a3b8">{hoveredItem.label.split(' ')[0]}</text>
              </>
            ) : (
              <>
                <text x={cx} y={cy - 6} textAnchor="middle" fontSize="26" fontWeight="bold" fill="#1e293b">{total}</text>
                <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#64748b">
                  {selectedManager === 'all' ? 'Total Cases' : 'Cases'}
                </text>
              </>
            )}
          </svg>
          <div className="flex flex-col gap-2.5 w-full max-h-56 overflow-y-auto pr-1">
            {pieData.map(d => (
              <div key={d.label}
                className="flex items-center justify-between gap-2 p-2 rounded-lg transition-colors cursor-pointer"
                style={{ backgroundColor: hovered === d.label ? d.light : 'transparent' }}
                onMouseEnter={() => setHovered(d.label)} onMouseLeave={() => setHovered(null)}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-muted-foreground truncate">{d.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-foreground">{d.value}</span>
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: d.light, color: d.text }}>
                    {Math.round((d.value / total) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function OperationsDashboard() {
  const { user } = useAuth();
  const [selectedManager, setSelectedManager] = useState('all');

  const { data: rawLoans, isLoading } = useQuery({
    queryKey: ['ops-loans-dashboard'],
    queryFn: () => api.get('/loans'),
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
  });

  const loans: any[] = Array.isArray(rawLoans) ? rawLoans : [];

  const disbursedLoans = useMemo(() =>
    loans.filter((l: any) => l.application_stage === 'DISBURSED'), [loans]);

  const loansWithPdd = useMemo(() =>
    disbursedLoans.filter((l: any) => getPddDays(l) !== null), [disbursedLoans]);

  const totalDisbursed = disbursedLoans.length;
  const pddTracked = loansWithPdd.length;
  const pddMissing = disbursedLoans.filter((l: any) => !l.disbursement_date).length;
  const pendingOver60 = loansWithPdd.filter((l: any) => getPddDays(l)! > 60).length;

  const pddBucketData = useMemo(() =>
    PDD_BUCKETS.map(b => ({
      ...b,
      value: loansWithPdd.filter((l: any) => { const d = getPddDays(l)!; return d >= b.min && d <= b.max; }).length,
    })), [loansWithPdd]);

  // Manager stats for the full-width breakdown table — filtered by selectedManager
  const allManagers = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    loansWithPdd.forEach(l => { const n = getManagerName(l); if (!seen.has(n)) { seen.add(n); list.push(n); } });
    return list.sort();
  }, [loansWithPdd]);

  const managerStats = useMemo(() => {
    const map: Record<string, { buckets: number[]; total: number; loans: any[] }> = {};
    loansWithPdd.forEach(l => {
      const name = getManagerName(l);
      const days = getPddDays(l)!;
      if (!map[name]) map[name] = { buckets: [0, 0, 0, 0, 0], total: 0, loans: [] };
      const idx = PDD_BUCKETS.findIndex(b => days >= b.min && days <= b.max);
      if (idx >= 0) { map[name].buckets[idx]++; map[name].total++; }
      map[name].loans.push(l);
    });
    return map;
  }, [loansWithPdd]);

  // Table rows — show all managers or just selected one
  const tableManagers = selectedManager === 'all'
    ? allManagers.filter(m => managerStats[m]?.total > 0)
    : allManagers.filter(m => m === selectedManager && managerStats[m]?.total > 0);

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operations Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">PDD tracking — auto-counted from disbursement date</p>
        </div>
        <Link
          to="/team"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity w-fit shadow-sm"
        >
          <Users size={16} /> My Team
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-green-100"><CheckCircle size={20} className="text-green-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Disbursed</p><p className="text-2xl font-bold text-foreground">{totalDisbursed}</p></div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100"><Clock size={20} className="text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">PDD Tracked</p><p className="text-2xl font-bold text-foreground">{pddTracked}</p></div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-100"><AlertTriangle size={20} className="text-red-600" /></div>
          <div><p className="text-xs text-muted-foreground">Over 60 Days</p><p className="text-2xl font-bold text-foreground">{pendingOver60}</p></div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-100"><TrendingUp size={20} className="text-orange-600" /></div>
          <div><p className="text-xs text-muted-foreground">No Date Set</p><p className="text-2xl font-bold text-foreground">{pddMissing}</p></div>
        </div>
      </div>

      {/* Pie Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DonutChart
          data={pddBucketData}
          title="PDD Distribution — All Disbursed Loans"
          subtitle={`${pddTracked} cases tracked across ${PDD_BUCKETS.length} time buckets`}
        />
        <ManagerPieChart
          loans={loansWithPdd}
          selectedManager={selectedManager}
          onManagerChange={setSelectedManager}
        />
      </div>

    

      {/* Missing disbursement_date warning */}
      {pddMissing > 0 && (
        <div className="p-4 rounded-xl border border-orange-200 bg-orange-50 flex items-start gap-3">
          <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">{pddMissing} disbursed loan{pddMissing > 1 ? 's' : ''} missing disbursement date</p>
            <p className="text-xs text-orange-600 mt-0.5">PDD days cannot be calculated without a disbursement date. Please update these loans.</p>
          </div>
        </div>
      )}
    </div>
  );
}
