import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Layers,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  IndianRupee,
  Filter,
  RefreshCw,
  Phone,
  Building2,
  ShieldCheck,
  Wallet,
  Settings2,
  FileText,
  ChevronRight,
  PieChart,
  Percent,
  CreditCard,
  ChevronDown,
  User,
  ExternalLink,
  Users,
  Search,
  ArrowDownRight
} from 'lucide-react';
import { api } from '@/lib/api';

type PeriodType = 'current_month' | 'previous_month' | 'till_date';

interface DsaInfo {
  id: number;
  user_id: string;
  full_name: string;
  phone: string;
  status: string;
  refer_code: string;
  created_at: string;
  branch_name: string | null;
  loan_ops_name: string | null;
  loan_ops_phone: string | null;
  accountant_name: string | null;
  accountant_phone: string | null;
  operations_name: string | null;
  operations_phone: string | null;
}

interface SummaryData {
  total_cases: number;
  disbursed_cases: number;
  disbursed_amount: number;
  total_earnings: number;
  approved_cases: number;
  rejected_cases: number;
  pending_cases: number;
  conversion_rate: number;
  avg_ticket_size: number;
  is_credit_card?: boolean;
  generated_cases?: number;
  in_process_cases?: number;
  active_cases?: number;
}

interface BreakdownItem {
  category: string;
  subcategory: string;
  product_name: string;
  total_cases: number;
  disbursed_cases: number;
  disbursed_amount: number;
  rejected_cases: number;
  pending_cases: number;
  conversion_rate: number;
}

interface FilterOptions {
  categories: string[];
  subcategories: Record<string, string[]>;
  products: Record<string, string[]>;
}

interface RecentCase {
  id: number;
  customer_name: string;
  phone: string;
  loan_amount: string;
  case_type: string;
  product_name: string;
  application_stage: string;
  created_at: string;
  login_date: string | null;
  disbursement_date: string | null;
}

export interface TeamMember {
  id: number;
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  role: string;
  status: string;
  reporting_to: number | null;
  reporting_to_name: string | null;
  reporting_to_role: string | null;
  hierarchy_level: number;
  created_at: string;
  photo_path: string | null;
  total_cases: number;
  disbursed_cases: number;
  disbursed_amount: number;
}

export interface TeamSummary {
  total_members: number;
  team_leaders_count: number;
  executives_count: number;
  other_roles_count: number;
  active_members_count: number;
}

export interface TeamData {
  summary: TeamSummary;
  members: TeamMember[];
}

interface PerformanceResponse {
  dsa: DsaInfo;
  period: string;
  summary: SummaryData;
  breakdown: BreakdownItem[];
  filterOptions: FilterOptions;
  recentCases: RecentCase[];
  team?: TeamData;
}

interface AnimatedCounterProps {
  value: number | undefined | null;
  type?: 'number' | 'currency' | 'percentage';
  duration?: number;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  type = 'number',
  duration = 900,
}) => {
  const target = Number(value) || 0;
  const [displayValue, setDisplayValue] = useState<number>(0);

  useEffect(() => {
    if (target === 0) {
      setDisplayValue(0);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic curve
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = target * ease;

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(target);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [target, duration]);

  if (target === 0) {
    if (type === 'currency') return <>₹0</>;
    if (type === 'percentage') return <>0%</>;
    return <>0</>;
  }

  if (type === 'currency') {
    if (target >= 10000000) {
      return <>₹{(displayValue / 10000000).toFixed(2)} Cr</>;
    }
    if (target >= 100000) {
      return <>₹{(displayValue / 100000).toFixed(2)} Lakh</>;
    }
    return (
      <>
        {new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format(Math.round(displayValue))}
      </>
    );
  }

  if (type === 'percentage') {
    return (
      <>
        {target % 1 === 0 ? Math.round(displayValue) : displayValue.toFixed(1)}%
      </>
    );
  }

  return <>{new Intl.NumberFormat('en-IN').format(Math.round(displayValue))}</>;
};

export default function DsaPerformance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── Filters State ──
  const [period, setPeriod] = useState<PeriodType>('current_month');

  // Cascading product selections (Default to 'Loan' so stats are cleanly separated)
  const [selectedCategory, setSelectedCategory] = useState<string>('Loan');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');

  // ── Fetch DSA Performance Data ──
  const { data, isLoading, isError, refetch } = useQuery<PerformanceResponse>({
    queryKey: [
      'dsa-performance',
      id,
      period,
      selectedCategory,
      selectedSubcategory,
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('period', period);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (selectedSubcategory !== 'all') params.set('subcategory', selectedSubcategory);

      return api.get(`/brokers/dsa/${id}/performance?${params.toString()}`);
    },
    enabled: !!id,
  });

  const dsa = data?.dsa;
  const summary = data?.summary || {
    total_cases: 0,
    disbursed_cases: 0,
    disbursed_amount: 0,
    total_earnings: 0,
    approved_cases: 0,
    rejected_cases: 0,
    pending_cases: 0,
    conversion_rate: 0,
    avg_ticket_size: 0,
  };
  const breakdown = data?.breakdown || [];
  const filterOptions = data?.filterOptions || {
    categories: ['Loan'],
    subcategories: {},
    products: {},
  };
  const recentCases = data?.recentCases || [];

  // ── Team & Hierarchy States ──
  const [teamSearch, setTeamSearch] = useState('');
  const [teamRoleFilter, setTeamRoleFilter] = useState<'all' | 'team_leader' | 'executive'>('all');
  const team: TeamData = data?.team || {
    summary: {
      total_members: 0,
      team_leaders_count: 0,
      executives_count: 0,
      other_roles_count: 0,
      active_members_count: 0,
    },
    members: [],
  };

  const filteredTeamMembers = useMemo(() => {
    let list = team.members;
    if (teamRoleFilter !== 'all') {
      list = list.filter((m) => m.role === teamRoleFilter);
    }
    if (teamSearch.trim()) {
      const q = teamSearch.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.full_name?.toLowerCase().includes(q) ||
          m.phone?.includes(q) ||
          m.user_id?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [team.members, teamRoleFilter, teamSearch]);

  // ── Cascading Subcategories based on Category ──
  const availableSubcategories = useMemo(() => {
    if (selectedCategory === 'all') {
      const allSubs = new Set<string>();
      Object.values(filterOptions.subcategories || {}).forEach((subs) => {
        subs.forEach((s) => allSubs.add(s));
      });
      breakdown.forEach((b) => allSubs.add(b.subcategory));
      return Array.from(allSubs);
    }
    return filterOptions.subcategories?.[selectedCategory] || [];
  }, [selectedCategory, filterOptions, breakdown]);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedSubcategory('all');
  };

  const handleSubcategoryChange = (sub: string) => {
    setSelectedSubcategory(sub);
  };

  const resetFilters = () => {
    setSelectedCategory('Loan');
    setSelectedSubcategory('all');
  };

  // ── Drill-down Navigation Handlers ──
  const navigateToLoans = (stage?: string) => {
    const params = new URLSearchParams();
    if (dsa?.id) params.set('dsa_id', String(dsa.id));
    if (dsa?.full_name) params.set('dsa_name', dsa.full_name);
    if (period) params.set('period', period);
    if (stage) params.set('status', stage);
    if (selectedSubcategory !== 'all') params.set('caseType', selectedSubcategory);
    navigate(`/loans?${params.toString()}`);
  };

  const navigateToCards = (filters?: { status?: string; activationStatus?: string }) => {
    const params = new URLSearchParams();
    if (dsa?.id) params.set('dsa_id', String(dsa.id));
    if (dsa?.full_name) params.set('dsa', dsa.full_name);
    if (period) params.set('period', period);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.activationStatus) params.set('activationStatus', filters.activationStatus);
    navigate(`/main-cc-leads?${params.toString()}`);
  };

  const handleTotalCasesClick = () => {
    if (selectedCategory === 'Credit Card') {
      navigateToCards();
    } else {
      navigateToLoans();
    }
  };

  const handleDisbursedClick = () => {
    if (selectedCategory === 'Credit Card') {
      navigateToCards({ activationStatus: 'Active' });
    } else {
      navigateToLoans('DISBURSED');
    }
  };

  const handleEarningsClick = () => {
    const params = new URLSearchParams();
    params.set('tab', 'earning');
    params.set('status', 'paid');
    if (dsa?.full_name) params.set('dsa', dsa.full_name);
    if (period) params.set('period', period);
    if (selectedCategory === 'Credit Card') {
      params.set('category', 'Credit Card');
    } else if (selectedCategory === 'Loan') {
      params.set('category', 'Loan');
      if (selectedSubcategory !== 'all') {
        params.set('subcategory', selectedSubcategory);
      }
    } else {
      params.set('category', 'Loan');
    }
    navigate(`/payouts?${params.toString()}`);
  };

  const handlePendingClick = () => {
    if (selectedCategory === 'Credit Card') {
      navigateToCards({ status: 'Generated' });
    } else {
      navigateToLoans('SUBMITTED,LOGIN,IN_PROCESS');
    }
  };

  const handleApprovedClick = () => {
    if (selectedCategory === 'Credit Card') {
      navigateToCards({ status: 'Approved' });
    } else {
      navigateToLoans('APPROVED,SANCTIONED');
    }
  };

  const handleRejectedClick = () => {
    if (selectedCategory === 'Credit Card') {
      navigateToCards({ status: 'Rejected' });
    } else {
      navigateToLoans('REJECTED,CANCELLED,DECLINED');
    }
  };

  // Indian Rupee Formatter
  const formatINR = (val: number) => {
    if (!val || isNaN(val)) return '₹0';
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} Lakh`;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'DS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="animate-spin text-primary" size={32} />
        <p className="text-sm font-semibold text-muted-foreground animate-pulse font-heading">
          Loading DSA Performance Analytics…
        </p>
      </div>
    );
  }

  if (isError || !dsa) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
        <div className="text-center space-y-4 max-w-md bg-card border border-border/80 rounded-2xl p-6 shadow-sm">
          <XCircle size={48} className="text-destructive mx-auto" />
          <h2 className="text-xl font-bold font-heading text-foreground">Failed to load DSA Performance</h2>
          <p className="text-sm text-muted-foreground">
            Could not fetch metrics for this DSA. Please ensure the DSA exists and try again.
          </p>
          <button
            onClick={() => navigate('/brokers')}
            className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/90 transition-colors shadow-sm"
          >
            Back to DSA Partners
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-28 sm:pb-16">
      {/* ── Partner Profile & Period Header ── */}
      <div className="bg-card border border-border/80 rounded-xl p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-3.5">
          {/* Left: Avatar & DSA Identity */}
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate(`/brokers/${dsa.id}/profile`)}
              className="group cursor-pointer focus:outline-none shrink-0 mt-0.5 sm:mt-0"
              title="Click to view full profile & KYC details"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#2872A1] to-[#184F70] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm ring-1 ring-primary/20 group-hover:ring-primary/60 group-hover:scale-105 transition-all font-heading">
                {getInitials(dsa.full_name)}
              </div>
            </button>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/brokers/${dsa.id}/profile`)}
                  className="text-left group/name cursor-pointer focus:outline-none"
                  title="Click to view full profile & KYC details"
                >
                  <h1 className="text-base sm:text-xl font-bold tracking-tight text-foreground font-heading group-hover/name:text-primary transition-colors truncate">
                    {dsa.full_name}
                  </h1>
                </button>
                <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {dsa.user_id ? (dsa.user_id.startsWith('#') ? dsa.user_id : `#${dsa.user_id}`) : `#FL-${dsa.id}`}
                </span>
                {dsa.status && (
                  <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 capitalize shrink-0">
                    {dsa.status}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/brokers/${dsa.id}/profile`)}
                  className="px-2 sm:px-2.5 py-0.5 rounded text-[11px] sm:text-xs font-semibold bg-muted hover:bg-primary hover:text-primary-foreground text-foreground border border-border/80 flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0"
                  title="Click to view KYC checklist & filled vs pending details"
                >
                  <User size={11} />
                  <span>Profile & KYC</span>
                  <ExternalLink size={10} className="opacity-70" />
                </button>
              </div>

              {/* Secondary Details: Phone, Ref, Branch */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground">
                {dsa.phone && (
                  <a
                    href={`tel:${dsa.phone}`}
                    className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 rounded bg-muted/50 border border-border/60 text-foreground hover:text-primary transition-colors font-mono"
                    title="Click to call"
                  >
                    <Phone size={11} className="text-primary" />
                    <span>{dsa.phone}</span>
                  </a>
                )}
                {dsa.refer_code && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/50 border border-border/60">
                    <span className="text-muted-foreground">Ref:</span>
                    <span className="font-mono font-semibold text-foreground">{dsa.refer_code}</span>
                  </span>
                )}
                {dsa.branch_name && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/50 border border-border/60">
                    <Building2 size={11} className="text-muted-foreground" />
                    <span>{dsa.branch_name}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Period Selector Tabs (Segmented grid on mobile, inline on desktop) */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1 p-0.5 bg-muted/60 rounded-lg border border-border/80 w-full sm:w-auto self-stretch sm:self-start lg:self-center">
            <button
              onClick={() => setPeriod('current_month')}
              className={`px-2 sm:px-3 py-1.5 sm:py-1 rounded-md text-xs font-semibold text-center transition-all ${
                period === 'current_month'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Current Month
            </button>
            <button
              onClick={() => setPeriod('previous_month')}
              className={`px-2 sm:px-3 py-1.5 sm:py-1 rounded-md text-xs font-semibold text-center transition-all ${
                period === 'previous_month'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Previous Month
            </button>
            <button
              onClick={() => setPeriod('till_date')}
              className={`px-2 sm:px-3 py-1.5 sm:py-1 rounded-md text-xs font-semibold text-center transition-all ${
                period === 'till_date'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Till Date
            </button>
          </div>
        </div>
      </div>

      {/* ── Product Filter Toolbar (Interactive & Sleek) ── */}
      <div className="bg-card border border-border/80 rounded-xl p-2.5 sm:px-3.5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex flex-row items-center gap-1.5 xs:gap-2 sm:gap-4 w-full sm:w-auto">
            {/* Category Dropdown */}
            <div className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-initial min-w-0">
              <span className="text-[11px] sm:text-xs font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1 shrink-0">
                <Filter size={11} className="text-primary hidden xs:inline" />
                <span className="hidden xs:inline">Category:</span>
                <span className="xs:hidden">Cat:</span>
              </span>
              <div className="relative flex-1 sm:flex-initial sm:w-44 min-w-0">
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full appearance-none pl-2 sm:pl-2.5 pr-5 sm:pr-7 py-1 text-[11px] sm:text-xs font-semibold bg-background border border-border/80 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all cursor-pointer truncate"
                >
                  {filterOptions.categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5 sm:pr-2 text-muted-foreground">
                  <ChevronDown size={12} className="sm:hidden" />
                  <ChevronDown size={13} className="hidden sm:block" />
                </div>
              </div>
            </div>

            {/* Sub-Category Dropdown (only for Loans) */}
            {selectedCategory !== 'Credit Card' && (
              <div className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-initial min-w-0">
                <span className="text-[11px] sm:text-xs font-medium text-muted-foreground whitespace-nowrap shrink-0">
                  <span className="hidden sm:inline">Sub-Category:</span>
                  <span className="sm:hidden">Sub-Cat:</span>
                </span>
                <div className="relative flex-1 sm:flex-initial sm:w-56 min-w-0">
                  <select
                    value={selectedSubcategory}
                    onChange={(e) => handleSubcategoryChange(e.target.value)}
                    disabled={availableSubcategories.length === 0}
                    className="w-full appearance-none pl-2 sm:pl-2.5 pr-5 sm:pr-7 py-1 text-[11px] sm:text-xs font-semibold bg-background border border-border/80 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary disabled:opacity-50 transition-all cursor-pointer truncate"
                  >
                    <option value="all">All Sub-Categories</option>
                    {availableSubcategories.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5 sm:pr-2 text-muted-foreground">
                    <ChevronDown size={12} className="sm:hidden" />
                    <ChevronDown size={13} className="hidden sm:block" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reset button if filter is active */}
          {(selectedCategory !== 'Loan' || selectedSubcategory !== 'all') && (
            <button
              onClick={resetFilters}
              className="text-xs text-primary hover:underline font-semibold self-end sm:self-center shrink-0"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="space-y-3">
        {/* Row 1: Key Financials & Volume (3 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Card 1: Total Applications / Files */}
          <div
            onClick={handleTotalCasesClick}
            title={selectedCategory === 'Credit Card' ? 'Click to view credit card applications' : 'Click to view all loan files'}
            className="bg-card border border-border/80 rounded-xl p-3 sm:p-3.5 shadow-sm flex flex-col justify-between hover:border-primary/60 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer group select-none"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1 sm:mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-primary transition-colors font-heading">
                {selectedCategory === 'Credit Card' ? 'Total Applications' : 'Total Files'}
              </span>
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <FileText size={15} />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-foreground font-heading tracking-tight">
                <AnimatedCounter value={summary.total_cases} />
              </p>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-border/60">
                <span className="truncate">
                  {selectedCategory === 'Credit Card' ? 'Cards sourced by DSA' : 'Cases sourced by DSA'}
                </span>
                <span className="text-primary font-semibold flex items-center gap-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform">
                  View all <ChevronRight size={11} />
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Hero Financial Metric (Disbursed Volume / Active Cards) */}
          {selectedCategory === 'Credit Card' ? (
            <div
              onClick={handleDisbursedClick}
              title="Click to view active credit card leads"
              className="bg-gradient-to-br from-card to-primary/[0.03] border border-primary/30 rounded-xl p-3 sm:p-3.5 shadow-sm flex flex-col justify-between hover:border-primary/60 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer group select-none"
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1 sm:mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary font-heading">
                  Active / Issued Cards
                </span>
                <div className="p-1.5 rounded-lg bg-primary text-primary-foreground shadow-2xs">
                  <CreditCard size={15} />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-foreground truncate font-heading tracking-tight">
                  <AnimatedCounter value={summary.disbursed_cases} />
                </p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-border/60">
                  <span className="truncate">Activated & live cards</span>
                  <span className="text-primary font-semibold flex items-center gap-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform">
                    View active <ChevronRight size={11} />
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={handleDisbursedClick}
              title="Click to view disbursed loans"
              className="bg-gradient-to-br from-card to-primary/[0.03] border border-primary/30 rounded-xl p-3 sm:p-3.5 shadow-sm flex flex-col justify-between hover:border-primary/60 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer group select-none"
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1 sm:mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary font-heading">
                  Disbursed Volume
                </span>
                <div className="p-1.5 rounded-lg bg-primary text-primary-foreground shadow-2xs">
                  <IndianRupee size={15} />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-foreground truncate font-heading tracking-tight">
                  <AnimatedCounter value={summary.disbursed_amount} type="currency" />
                </p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-border/60">
                  <span className="truncate">Total loan business volume</span>
                  <span className="text-primary font-semibold flex items-center gap-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform">
                    View disbursed <ChevronRight size={11} />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Card 3: Total Earnings */}
          <div
            onClick={handleEarningsClick}
            title="Click to view approved earnings & payouts"
            className="bg-card border border-border/80 rounded-xl p-3 sm:p-3.5 shadow-sm flex flex-col justify-between hover:border-primary/60 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer group select-none"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1 sm:mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-primary transition-colors font-heading">
                Total Earnings
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Wallet size={15} />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-foreground truncate font-heading tracking-tight">
                <AnimatedCounter value={summary.total_earnings || 0} type="currency" />
              </p>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-border/60">
                <span className="truncate">Approved commission & payout</span>
                <span className="text-primary font-semibold flex items-center gap-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform">
                  View payouts <ChevronRight size={11} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Status & Funnel Breakdown (4 Sleek Funnel Cards) */}
        {selectedCategory === 'Credit Card' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {/* 1. Generated */}
            <div
              onClick={() => navigateToCards({ status: 'Generated' })}
              title="Click to view generated card leads"
              className="bg-card border border-border/80 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:border-primary/60 hover:shadow-xs transition-all cursor-pointer group select-none flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider group-hover:text-primary transition-colors font-heading truncate">
                  Generated
                </span>
                <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0">
                  <FileText size={12} />
                </div>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-black text-foreground font-heading">
                  <AnimatedCounter value={summary.generated_cases ?? 0} />
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
                  New Leads
                </p>
              </div>
            </div>

            {/* 2. In Process */}
            <div
              onClick={() => navigateToCards({ status: 'In_Process' })}
              title="Click to view in-process card leads"
              className="bg-card border border-border/80 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:border-primary/60 hover:shadow-xs transition-all cursor-pointer group select-none flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider group-hover:text-primary transition-colors font-heading truncate">
                  In Process
                </span>
                <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0">
                  <Clock size={12} />
                </div>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-black text-foreground font-heading">
                  <AnimatedCounter value={summary.in_process_cases ?? 0} />
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
                  Verification
                </p>
              </div>
            </div>

            {/* 3. Approved */}
            <div
              onClick={() => navigateToCards({ status: 'Approved' })}
              title="Click to view approved card leads"
              className="bg-card border border-border/80 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:border-primary/60 hover:shadow-xs transition-all cursor-pointer group select-none flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider group-hover:text-primary transition-colors font-heading truncate">
                  Approved
                </span>
                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 shrink-0">
                  <CheckCircle2 size={12} />
                </div>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-black text-foreground font-heading">
                  <AnimatedCounter value={summary.approved_cases ?? 0} />
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
                  Card Approved
                </p>
              </div>
            </div>

            {/* 4. Rejected */}
            <div
              onClick={() => navigateToCards({ status: 'Rejected' })}
              title="Click to view rejected card leads"
              className="bg-card border border-border/80 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:border-destructive/60 hover:shadow-xs transition-all cursor-pointer group select-none flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider group-hover:text-destructive transition-colors font-heading truncate">
                  Rejected
                </span>
                <div className="p-1 rounded-md bg-destructive/10 text-destructive shrink-0">
                  <XCircle size={12} />
                </div>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-black text-foreground font-heading">
                  <AnimatedCounter value={summary.rejected_cases ?? 0} />
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
                  Declined
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Loans Funnel (4 Cards) */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {/* Disbursed */}
            <div
              onClick={handleDisbursedClick}
              title="Click to view disbursed loans"
              className="bg-card border border-border/80 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:border-primary/60 hover:shadow-xs transition-all cursor-pointer group select-none flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider group-hover:text-primary transition-colors font-heading truncate">
                  Disbursed
                </span>
                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 shrink-0">
                  <CheckCircle2 size={12} />
                </div>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-black text-foreground font-heading">
                  <AnimatedCounter value={summary.disbursed_cases} />
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
                  <span className="text-emerald-600 font-semibold">
                    <AnimatedCounter value={summary.conversion_rate} type="percentage" />
                  </span> Conversion
                </p>
              </div>
            </div>

            {/* In-Process */}
            <div
              onClick={handlePendingClick}
              title="Click to view in-process loans"
              className="bg-card border border-border/80 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:border-primary/60 hover:shadow-xs transition-all cursor-pointer group select-none flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider group-hover:text-primary transition-colors font-heading truncate">
                  In Process
                </span>
                <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0">
                  <Clock size={12} />
                </div>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-black text-foreground font-heading">
                  <AnimatedCounter value={summary.pending_cases} />
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
                  Underwriting
                </p>
              </div>
            </div>

            {/* Approved */}
            <div
              onClick={handleApprovedClick}
              title="Click to view approved/sanctioned loans"
              className="bg-card border border-border/80 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:border-primary/60 hover:shadow-xs transition-all cursor-pointer group select-none flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider group-hover:text-primary transition-colors font-heading truncate">
                  Approved
                </span>
                <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0">
                  <TrendingUp size={12} />
                </div>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-black text-foreground font-heading">
                  <AnimatedCounter value={summary.approved_cases} />
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
                  Sanctioned
                </p>
              </div>
            </div>

            {/* Rejected */}
            <div
              onClick={handleRejectedClick}
              title="Click to view rejected loans"
              className="bg-card border border-border/80 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:border-destructive/60 hover:shadow-xs transition-all cursor-pointer group select-none flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider group-hover:text-destructive transition-colors font-heading truncate">
                  Rejected
                </span>
                <div className="p-1 rounded-md bg-destructive/10 text-destructive shrink-0">
                  <XCircle size={12} />
                </div>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-black text-foreground font-heading">
                  <AnimatedCounter value={summary.rejected_cases} />
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
                  Declined
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── DSA Team & Hierarchy Section (Finonest Theme Matching) ── */}
        <div className="bg-card border border-border/80 rounded-xl p-3 sm:p-4 shadow-sm space-y-3">
          {/* Header & Controls Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/80 pb-3">
            {/* Title & Theme-Consistent Stat Badges */}
            <div className="space-y-1.5 sm:space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Users size={16} />
                </div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading">
                  DSA Team & Hierarchy
                </h2>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar sm:flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0">
                  Total: <AnimatedCounter value={team.summary.total_members} />
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-foreground/80 border border-border/80 shrink-0">
                  <AnimatedCounter value={team.summary.team_leaders_count} /> Team Leaders
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-foreground/80 border border-border/80 shrink-0">
                  <AnimatedCounter value={team.summary.executives_count} /> Executives
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                  <AnimatedCounter value={team.summary.active_members_count} /> Active
                </span>
              </div>
            </div>

            {/* Controls: Search, Role Filter, View Switch */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
              {/* Search Bar */}
              <div className="relative w-full sm:w-48">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Search name, phone, ID..."
                  className="w-full pl-8 pr-2.5 py-1 text-xs bg-background border border-border/80 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>

              {/* Role Filter Tabs (Segmented grid on mobile, inline on desktop) */}
              <div className="grid grid-cols-3 sm:flex items-center gap-1 p-0.5 bg-muted/60 rounded-lg border border-border/80 text-xs w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setTeamRoleFilter('all')}
                  className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold text-center transition-all ${
                    teamRoleFilter === 'all'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All (<AnimatedCounter value={team.summary.total_members} />)
                </button>
                <button
                  type="button"
                  onClick={() => setTeamRoleFilter('team_leader')}
                  className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold text-center transition-all ${
                    teamRoleFilter === 'team_leader'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  TL (<AnimatedCounter value={team.summary.team_leaders_count} />)
                </button>
                <button
                  type="button"
                  onClick={() => setTeamRoleFilter('executive')}
                  className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold text-center transition-all ${
                    teamRoleFilter === 'executive'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Exec (<AnimatedCounter value={team.summary.executives_count} />)
                </button>
              </div>
            </div>
          </div>

          {/* ── Systematic Table View ── */}
          <div className="overflow-x-auto border border-border/80 rounded-lg bg-card shadow-2xs">
            <table className="w-full text-left text-xs border-collapse min-w-[620px] sm:min-w-full">
              <thead>
                <tr className="border-b border-border/80 bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-heading whitespace-nowrap">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Team Member</th>
                  <th className="py-2.5 px-3">Role / Designation</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Reporting To</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredTeamMembers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Users size={22} className="mx-auto mb-1.5 text-muted-foreground/60" />
                      <p className="font-semibold text-foreground text-xs">
                        {team.members.length === 0
                          ? 'No team members reporting under this DSA'
                          : 'No team members match your search or filter'}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {team.members.length === 0
                          ? 'Team Leaders and Executives assigned to this DSA will appear in this table.'
                          : 'Try resetting the search query or filter.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTeamMembers.map((member, idx) => {
                    const isTL = member.role === 'team_leader';
                    const isExec = member.role === 'executive';

                    return (
                      <tr
                        key={member.id}
                        className="hover:bg-muted/40 transition-colors group"
                      >
                        {/* Index */}
                        <td className="py-2.5 px-3 text-center text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                          {idx + 1}
                        </td>

                        {/* Member Name & ID */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2872A1] to-[#184F70] text-white flex items-center justify-center font-bold text-xs shadow-sm ring-1 ring-primary/20 font-heading shrink-0">
                              {getInitials(member.full_name)}
                            </div>
                            <div>
                              <p className="font-bold text-foreground text-xs group-hover:text-primary transition-colors font-heading">
                                {member.full_name}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                #{member.user_id || `ID-${member.id}`}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge (Website Primary Style) */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 capitalize">
                            {isTL ? 'Team Leader' : isExec ? 'Executive' : member.role}
                          </span>
                        </td>

                        {/* Contact */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {member.phone ? (
                            <a
                              href={`tel:${member.phone}`}
                              className="inline-flex items-center gap-1.5 font-mono text-foreground hover:text-primary transition-colors"
                              title="Click to call"
                            >
                              <Phone size={11} className="text-primary" />
                              <span>{member.phone}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground italic">N/A</span>
                          )}
                        </td>

                        {/* Reporting To */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {member.reporting_to_name ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground text-xs">
                                {member.reporting_to_name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border/80">
                                {member.reporting_to_role === 'dsa' ? 'DSA' : member.reporting_to_role === 'team_leader' ? 'TL' : 'Superior'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              DSA (Direct)
                            </span>
                          )}
                        </td>

                        {/* Status (Website Emerald Style) */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 capitalize">
                            {member.status}
                          </span>
                        </td>

                        {/* Joined Date */}
                        <td className="py-2.5 px-3 text-right text-muted-foreground text-[11px] whitespace-nowrap">
                          {member.created_at ? new Date(member.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
