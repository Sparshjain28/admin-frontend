import React, { useState, useEffect } from 'react';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Users, Clock, CheckCircle2, IndianRupee, PieChart as PieChartIcon, Building2, TrendingUp, Calendar, ArrowUpRight, BarChart3, Target, Download, FileText, Eye, Share2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, LabelList
} from 'recharts';
import { useNavigate, Navigate } from 'react-router-dom';
import { downloadDashboardPDF } from '@/lib/dashboard-pdf-export';
import Navbar from '@/components/Navbar';
import { ScrollSection } from '@/components/ScrollSection';
import MobileDashboard from '@/components/MobileDashboard';

const STATUS_CHART_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'];
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface DashboardContextType {
  timeline: string;
  setTimeline: (value: string) => void;
  dateRange: { start: string; end: string };
  setDateRange: (value: { start: string; end: string }) => void;
  showExportMenu: boolean;
  setShowExportMenu: (value: boolean) => void;
  isGeneratingPDF: boolean;
  setIsGeneratingPDF: (value: boolean) => void;
  handleExportDashboard?: () => Promise<void>;
  handleViewDashboard?: () => Promise<void>;
  handleShareDashboard?: () => Promise<void>;
}

export const DashboardContext = React.createContext<DashboardContextType | null>(null);

export const useDashboardContext = () => {
  const context = React.useContext(DashboardContext);
  if (!context) throw new Error('useDashboardContext must be used within Dashboard');
  return context;
};

export const useDashboardContextSafe = () => {
  return React.useContext(DashboardContext);
};

const DASHBOARD_TITLES: { [key in UserRole]: string } = {
  admin: 'Admin Dashboard',
  manager: 'Manager Dashboard',
  sales_manager: 'Sales Manager Dashboard',
  branch_manager: 'Branch Manager Dashboard',
  dsa: 'DSA Dashboard',
  team_leader: 'Team Leader Dashboard',
  executive: 'Executive Dashboard',
};

const ROLE_BASED_COMPONENTS: { [key in UserRole]: string[] } = {
  admin: ['loginVolume', 'disbursement', 'approvedLoans', 'performanceChart', 'stageDistribution', 'bankDistribution', 'statusDistribution'],
  manager: ['loginVolume', 'disbursement', 'approvedLoans', 'performanceChart', 'stageDistribution'],
  sales_manager: ['loginVolume', 'approvedLoans', 'performanceChart'],
  branch_manager: ['loginVolume', 'disbursement', 'approvedLoans', 'stageDistribution'],
  dsa: ['approvedLoans', 'performanceChart'],
  team_leader: ['loginVolume', 'approvedLoans', 'performanceChart'],
  executive: ['disbursement', 'approvedLoans', 'statusDistribution', 'bankDistribution'],
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeline, setTimeline] = useState('this_year');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [permissions, setPermissions] = useState<any>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [loansData, setLoansData] = useState<any[]>([]);
  const [isLoadingLoans, setIsLoadingLoans] = useState(false);
  const [selectedManager, setSelectedManager] = useState<number | null>(null);
  const [loginVolumeFilter, setLoginVolumeFilter] = useState('LOGIN');
  const [disbursementFilter, setDisbursementFilter] = useState('DISBURSED');
  const [bankDistributionFilter, setBankDistributionFilter] = useState('ALL');

  useEffect(() => {
    if (user?.role === 'loan_operations') {
      navigate('/loan-ops/dashboard', { replace: true });
    } else if (user?.role === 'operation_team' || user?.role === 'ops_team') {
      navigate('/ops/dashboard', { replace: true });
    } else if (user?.role === 'accountant') {
      navigate('/accountant/dashboard', { replace: true });
    }
  }, [user?.role, navigate]);

  // Fetch managers list for admin
  const { data: managers = [] } = useQuery({
    queryKey: ['sales-managers'],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/by-role?roles=sales_manager`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return [];
        return await response.json();
      } catch {
        return [];
      }
    },
    enabled: user?.role === 'admin',
  });

  const { data: userPermissions } = useQuery({
    queryKey: ['user-permissions', user?.role],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/permissions/dashboard`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return null;
        const allPerms = await response.json();
        // Return permissions for current user's role
        return { permissions: allPerms[user?.role] || null };
      } catch {
        return null;
      }
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (userPermissions?.permissions) {
      setPermissions(userPermissions.permissions);
    }
  }, [userPermissions]);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.branch_id, timeline, dateRange, selectedManager, loginVolumeFilter, disbursementFilter, bankDistributionFilter],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({ timeline });
        if (timeline === 'custom' && dateRange.start && dateRange.end) {
          params.append('startDate', dateRange.start);
          params.append('endDate', dateRange.end);
        }
        if (selectedManager) {
          params.append('managerId', selectedManager.toString());
        }
        if (loginVolumeFilter !== 'LOGIN') {
          params.append('stageFilter', loginVolumeFilter);
        }
        if (disbursementFilter !== 'DISBURSED') {
          params.append('disbursementFilter', disbursementFilter);
        }
        if (bankDistributionFilter !== 'ALL') {
          params.append('bankDistributionFilter', bankDistributionFilter);
        }
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/dashboard/stats?${params}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return null;
        return await response.json();
      } catch (error) {
        return null;
      }
    },
    enabled: !!user,
  });

  const { data: convertedLeadsData } = useQuery({
    queryKey: ['converted-leads', timeline, dateRange, selectedManager],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({ timeline });
        if (timeline === 'custom' && dateRange.start && dateRange.end) {
          params.append('startDate', dateRange.start);
          params.append('endDate', dateRange.end);
        }
        if (selectedManager) {
          params.append('managerId', selectedManager.toString());
        }
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/dashboard/converted-leads?${params}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return [];
        return await response.json();
      } catch (error) {
        return [];
      }
    },
    enabled: !!user && user.role === 'executive',
  });

  // Fetch performance chart data
  const { data: performanceData } = useQuery({
    queryKey: ['performance-data', timeline, dateRange, selectedManager],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({ timeline });
        if (timeline === 'custom' && dateRange.start && dateRange.end) {
          params.append('startDate', dateRange.start);
          params.append('endDate', dateRange.end);
        }
        if (selectedManager) {
          params.append('managerId', selectedManager.toString());
        }
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/dashboard/performance?${params}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return [];
        return await response.json();
      } catch (error) {
        return [];
      }
    },
    enabled: !!user,
  });

  if (!user) return null;

  const convertedLeads = convertedLeadsData || [];

  const stats = dashboardData || {
    loginBankWise: [],
    disbursementBankWise: [],
    bankDistribution: [],
    approvedBankWise: [],
    pddTracker: {},
    stageBreakdown: [],
    monthlyTracker: {
      login: 0,
      inProcess: 0,
      approved: { units: 0, amount: 0 },
      disbursed: { units: 0, amount: 0 }
    },
    inProcessTags: []
  };

  const dashboardTitle = `Welcome, ${user.name || 'User'}`;

  useEffect(() => {
    if (isGeneratingPDF) {
      const executeExport = async () => {
        try {
          await downloadDashboardPDF({
            title: dashboardTitle,
            timeline: timeline,
            dateRange: timeline === 'custom' ? dateRange : undefined,
            stats: stats,
            user: user
          });
        } catch (error) {
          alert('Failed to generate PDF. Please try again.');
        } finally {
          setIsGeneratingPDF(false);
        }
      };
      executeExport();
    }
  }, [isGeneratingPDF]);

  const handleViewDashboard = async () => {
    try {
      const pdfBlob = await (await import('@/lib/dashboard-pdf-export')).generateDashboardPDF({
        title: dashboardTitle,
        timeline: timeline,
        dateRange: timeline === 'custom' ? dateRange : undefined,
        stats: stats,
        user: user
      });
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
    } catch (error) {
      alert('Failed to view PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleShareDashboard = async () => {
    try {
      const { downloadDashboardPDF } = await import('@/lib/dashboard-pdf-export');
      const pdfBlob = await (await import('@/lib/dashboard-pdf-export')).generateDashboardPDF({
        title: dashboardTitle,
        timeline: timeline,
        dateRange: timeline === 'custom' ? dateRange : undefined,
        stats: stats,
        user: user
      });

      const pdfFile = new File([pdfBlob], `dashboard-${new Date().getTime()}.pdf`, { type: 'application/pdf' });

      if (navigator.share) {
        await navigator.share({
          title: `Dashboard Report - ${dashboardTitle}`,
          text: `Dashboard Report for ${timeline}`,
          files: [pdfFile]
        });
      } else {
        alert('Sharing not available on this device. Please download the PDF instead.');
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportDashboard = async () => {
    try {
      await downloadDashboardPDF({
        title: dashboardTitle,
        timeline: timeline,
        dateRange: timeline === 'custom' ? dateRange : undefined,
        stats: stats,
        user: user
      });
    } catch (error) {
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const areaChartData = performanceData || [];

  const stageDistribution = stats.stageBreakdown?.map((s: any) => ({
    name: s.stage,
    value: parseInt(s.count || 0)
  })).filter((s: any) => s.value > 0) || [];

  const bankDistribution = (() => {
    if (!stats.bankDistribution || stats.bankDistribution.length === 0) return [];

    // Sort by count and get top 6
    const sortedBanks = stats.bankDistribution
      .map((b: any) => ({
        name: b.bankName || b.bank_name || 'Unknown',
        value: parseInt(b.count || 0)
      }))
      .filter((b: any) => b.value > 0)
      .sort((a, b) => b.value - a.value);

    if (sortedBanks.length <= 6) {
      return sortedBanks;
    }

    // Take top 6 and sum the rest as "Others"
    const top6 = sortedBanks.slice(0, 6);
    const others = sortedBanks.slice(6);
    const othersSum = others.reduce((sum, bank) => sum + bank.value, 0);

    if (othersSum > 0) {
      top6.push({ name: 'Others', value: othersSum });
    }

    return top6;
  })();

  const approvedCount = stats.monthlyTracker?.approved?.units || 0;
  const disbursedCount = stats.monthlyTracker?.disbursed?.units || 0;
  const pendingDisbursement = approvedCount - disbursedCount;

  const statusDistribution = [
    { name: 'Approved', value: approvedCount },
    { name: 'Pending Disbursement', value: pendingDisbursement },
    { name: 'Disbursed', value: disbursedCount },
  ];

  const chartCardClass = "bg-white dark:bg-gray-900/40 rounded-xl border border-border/50 shadow-sm flex flex-col hover:shadow-md transition-all duration-300";
  const headerClass = "card-header-safe";

  const handleNavigateToLoans = (stage: string) => {
    navigate(`/loans?stage=${stage}`);
  };

  const canViewComponent = (componentKey: string): boolean => {
    if (isAdmin) return true;
    if (!permissions?.dashboard?.components) return false;
    return permissions.dashboard.components[componentKey] === true;
  };

  const getRoleBasedStats = () => {
    return stats;
  };

  const roleBasedStats = getRoleBasedStats();
  const roleBasedComponents = ROLE_BASED_COMPONENTS[user?.role || 'dsa'] || [];

  // Status colors mapping
  const getStatusColor = (status: string) => {
    const colors = {
      'LOGIN': '#3b82f6',      // Blue
      'IN_PROCESS': '#f59e0b',  // Orange
      'APPROVED': '#10b981',    // Green
      'DISBURSED': '#059669'    // Dark Green
    };
    return colors[status as keyof typeof colors] || '#6b7280';
  };

  // Status display names
  const getStatusDisplayName = (status: string) => {
    const names = {
      'LOGIN': 'Login Volume',
      'IN_PROCESS': 'In Process Volume',
      'APPROVED': 'Approved Volume',
      'DISBURSED': 'Disbursed Volume'
    };
    return names[status as keyof typeof names] || 'Volume';
  };

  // Disbursement display names
  const getDisbursementDisplayName = (status: string) => {
    const names = {
      'DISBURSED': 'Disbursement',
      'APPROVED': 'Approved Amount',
      'IN_PROCESS': 'In Process Amount',
      'LOGIN': 'Login Amount'
    };
    return names[status as keyof typeof names] || 'Amount';
  };

  const isAdmin = user?.role === 'admin';
  const canViewDashboard = isAdmin || permissions?.dashboard?.view !== false;
  const canExportDashboard = isAdmin || permissions?.dashboard?.export === true;

  const BurstTableContent = () => {
    const [burstTableData, setBurstTableData] = useState<any>({ SUBMITTED: [], LOGIN: [], IN_PROCESS: [] });
    const [isTableLoading, setIsTableLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timerEnabled, setTimerEnabled] = useState(true);

    // Check if user has permission to view timer
    // Timer shows only if both config is enabled AND user has permission
    const canViewTimer = timerEnabled && (isAdmin || permissions?.dashboard?.components?.timer === true);

    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(timer);
    }, []);

    useEffect(() => {
      const fetchTimerConfig = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/config/key/login_stage_enabled`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
          });
          if (response.ok) {
            const config = await response.json();
            const enabled = config.config_value === 'true' || config.config_value === true;
            setTimerEnabled(enabled);
          } else {
            setTimerEnabled(true);
          }
        } catch (error) {
          setTimerEnabled(true);
        }
      };
      fetchTimerConfig();
    }, []);

    useEffect(() => {
      const fetchBurstTable = async () => {
        setIsTableLoading(true);
        try {
          const params = new URLSearchParams();
          if (selectedManager) {
            params.append('managerId', selectedManager.toString());
          }

          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/burst-table?${params}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
          });
          if (response.ok) {
            const data = await response.json();
            const grouped = {
              SUBMITTED: data.filter((loan: any) => loan.application_stage === 'SUBMITTED'),
              LOGIN: data.filter((loan: any) => loan.application_stage === 'LOGIN'),
              IN_PROCESS: data.filter((loan: any) => loan.application_stage === 'IN_PROCESS')
            };
            setBurstTableData(grouped);
          }
        } catch (error) {
          // Handle error silently
        } finally {
          setIsTableLoading(false);
        }
      };
      fetchBurstTable();
    }, [selectedManager]);

    const getTimeElapsed = (createdAt: string, stage: string) => {
      // Don't show timer for IN_PROCESS stage
      if (stage === 'IN_PROCESS') {
        return '';
      }

      // Check both config and permission for other stages
      if (!timerEnabled || !canViewTimer) {
        return '';
      }

      const created = new Date(createdAt);
      const diff = currentTime.getTime() - created.getTime();

      // All stages show countdown from 24:00:00 to 00:00:00
      const twentyFourHours = 24 * 60 * 60 * 1000;
      const remaining = twentyFourHours - diff;

      if (remaining <= 0) {
        return '00:00:00';
      }

      const remainingHours = Math.floor(remaining / (1000 * 60 * 60));
      const remainingMinutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const remainingSeconds = Math.floor((remaining % (1000 * 60)) / 1000);

      return `${remainingHours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const getTimerColor = (createdAt: string, stage: string) => {
      // Don't show timer for IN_PROCESS stage
      if (stage === 'IN_PROCESS') {
        return 'text-gray-500 dark:text-gray-400';
      }

      // Check both config and permission for other stages
      if (!timerEnabled || !canViewTimer) {
        return 'text-gray-500 dark:text-gray-400';
      }

      const created = new Date(createdAt);
      const diff = currentTime.getTime() - created.getTime();
      const totalHours = diff / (1000 * 60 * 60);
      const remaining = 24 - totalHours;

      // Color changes as time runs out (green to red)
      if (remaining <= 0) return 'text-red-700 dark:text-red-500 font-bold animate-pulse';
      if (remaining <= 4) return 'text-red-600 dark:text-red-400';
      if (remaining <= 8) return 'text-orange-600 dark:text-orange-400';
      if (remaining <= 16) return 'text-yellow-600 dark:text-yellow-400';
      return 'text-green-600 dark:text-green-400';
    };

    return (
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {/* SUBMITTED Column */}
        <div>
          <div className="bg-gray-100 dark:bg-gray-800 px-4 h-12 flex items-center font-semibold text-xs text-gray-700 dark:text-gray-300 border-b">
            SUBMITTED ({burstTableData.SUBMITTED?.length || 0})
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isTableLoading ? (
              <div className="py-8 px-4 text-center text-muted-foreground text-xs">Loading...</div>
            ) : burstTableData.SUBMITTED?.length === 0 ? (
              <div className="py-8 px-4 text-center text-muted-foreground text-xs">No loans</div>
            ) : (
              burstTableData.SUBMITTED?.map((loan: any) => (
                <div
                  key={loan.id}
                  onClick={() => navigate(`/loans/${loan.id}`)}
                  className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-foreground font-mono text-xs font-semibold">
                      {loan.loan_number || loan.id}
                    </div>
                    {timerEnabled && canViewTimer && (
                      <div className={`text-xs font-mono font-semibold ${getTimerColor(loan.created_at, 'SUBMITTED')}`}>
                        {getTimeElapsed(loan.created_at, 'SUBMITTED')}
                      </div>
                    )}
                  </div>
                  <div className="text-muted-foreground text-xs mt-1">
                    {loan.applicant_name || 'N/A'}
                  </div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    RC: {loan.vehicle_number || 'N/A'} • {loan.case_type || 'N/A'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* LOGIN Column */}
        <div>
          <div className="bg-blue-100 dark:bg-blue-900/30 px-4 h-12 flex items-center font-semibold text-xs text-blue-700 dark:text-blue-300 border-b">
            LOGIN ({burstTableData.LOGIN?.length || 0})
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isTableLoading ? (
              <div className="py-8 px-4 text-center text-muted-foreground text-xs">Loading...</div>
            ) : burstTableData.LOGIN?.length === 0 ? (
              <div className="py-8 px-4 text-center text-muted-foreground text-xs">No loans</div>
            ) : (
              burstTableData.LOGIN?.map((loan: any) => (
                <div
                  key={loan.id}
                  onClick={() => navigate(`/loans/${loan.id}`)}
                  className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-foreground font-mono text-xs font-semibold">
                      {loan.loan_number || loan.id}
                    </div>
                    {timerEnabled && canViewTimer && (
                      <div className={`text-xs font-mono font-semibold ${getTimerColor(loan.created_at, 'LOGIN')}`}>
                        {getTimeElapsed(loan.created_at, 'LOGIN')}
                      </div>
                    )}
                  </div>
                  <div className="text-muted-foreground text-xs mt-1">
                    {loan.applicant_name || 'N/A'}
                  </div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    RC: {loan.vehicle_number || 'N/A'} • {loan.case_type || 'N/A'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* IN_PROCESS Column */}
        <div>
          <div className="bg-yellow-100 dark:bg-yellow-900/30 px-4 h-12 flex items-center font-semibold text-xs text-yellow-700 dark:text-yellow-300 border-b">
            IN PROCESS ({burstTableData.IN_PROCESS?.length || 0})
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isTableLoading ? (
              <div className="py-8 px-4 text-center text-muted-foreground text-xs">Loading...</div>
            ) : burstTableData.IN_PROCESS?.length === 0 ? (
              <div className="py-8 px-4 text-center text-muted-foreground text-xs">No loans</div>
            ) : (
              burstTableData.IN_PROCESS?.map((loan: any) => (
                <div
                  key={loan.id}
                  onClick={() => navigate(`/loans/${loan.id}`)}
                  className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-foreground font-mono text-xs font-semibold">
                      {loan.loan_number || loan.id}
                    </div>
                    {/* No timer for IN_PROCESS loans */}
                  </div>
                  <div className="text-muted-foreground text-xs mt-1">
                    {loan.applicant_name || 'N/A'}
                  </div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    RC: {loan.vehicle_number || 'N/A'} • {loan.case_type || 'N/A'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  if (user?.role === 'loan_operations') {
    return <Navigate to="/loan-ops/dashboard" replace />;
  }
  if (user?.role === 'operation_team' || user?.role === 'ops_team') {
    return <Navigate to="/ops/dashboard" replace />;
  }
  if (user?.role === 'accountant') {
    return <Navigate to="/accountant/dashboard" replace />;
  }

  if (!canViewDashboard) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground">You don't have permission to view this dashboard</p>
        </div>
      </div>
    );
  }

  const contextValue: DashboardContextType = {
    timeline,
    setTimeline,
    dateRange,
    setDateRange,
    showExportMenu,
    setShowExportMenu,
    isGeneratingPDF,
    setIsGeneratingPDF,
    handleExportDashboard,
    handleViewDashboard,
    handleShareDashboard
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {/* Mobile View */}
      <div className="block md:hidden">
        <MobileDashboard />
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex flex-col gap-3 w-full">
        {/* Top Filters */}
        <div className="bg-white dark:bg-gray-900/40 p-4 rounded-xl border border-border/50 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-foreground">Dashboard Overview</h2>
            <div className="flex items-center gap-2">
              <select
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-blue-500"
              >
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_year">This Year</option>
                <option value="all_time">All Time</option>
                <option value="custom">Custom Range</option>
              </select>

              {timeline === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="px-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-muted-foreground">to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="px-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {user?.role === 'admin' && managers.length > 0 && (
                <select
                  value={selectedManager || ''}
                  onChange={(e) => setSelectedManager(e.target.value ? Number(e.target.value) : null)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Managers</option>
                  {managers.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Burst Table - Hidden for executives */}
        {user?.role !== 'executive' && (
          <ScrollSection delay={0} className="w-full">
            <div className="bg-white dark:bg-gray-900/40 rounded-xl border border-border/50 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-border/50 bg-gray-50/30 dark:bg-gray-800/20">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  <h3 className="font-bold text-sm text-foreground">Loans by Stage</h3>
                </div>
              </div>

              {/* Burst Table */}
              <div className="p-4">
                <BurstTableContent />
              </div>
            </div>
          </ScrollSection>
        )}

        {/* Charts Grid */}
        <ScrollSection delay={0.1} className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {/* Login Volume */}
          {(canViewComponent('loginVolume') || isAdmin) && (
            <div className={chartCardClass}>
              <div className="px-3 py-2 border-b border-border/50 bg-gray-50/30 dark:bg-gray-800/20 flex items-center gap-1">
                <Building2 size={13} className="text-primary" />
                <h3 className="font-bold text-xs text-foreground">{getStatusDisplayName(loginVolumeFilter)}</h3>
              </div>
              <div className="px-3 pt-2">
                <select
                  value={loginVolumeFilter}
                  onChange={(e) => setLoginVolumeFilter(e.target.value)}
                  className="text-xs border border-border/50 rounded px-2 py-1 bg-background text-foreground w-full"
                >
                  <option value="LOGIN">Login</option>
                  <option value="IN_PROCESS">In Process</option>
                  <option value="APPROVED">Approved</option>
                  <option value="DISBURSED">Disbursed</option>
                </select>
              </div>
              <div className="p-3 flex-1 min-h-[300px]">
                {roleBasedStats.loginBankWise && roleBasedStats.loginBankWise.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roleBasedStats.loginBankWise} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={getStatusColor(loginVolumeFilter)} stopOpacity={1} />
                          <stop offset="100%" stopColor={getStatusColor(loginVolumeFilter)} stopOpacity={0.4} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                      <XAxis
                        dataKey="bankName"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 600 }}
                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                      />
                      <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={36} animationDuration={1500}>
                        <LabelList dataKey="count" position="top" fill={getStatusColor(loginVolumeFilter)} fontSize={12} fontWeight={700} offset={8} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center opacity-20 text-[10px]">No data</div>}
              </div>
            </div>
          )}

          {/* Pie Charts Column */}
          <div className="flex flex-col gap-3">
            {/* Stage Distribution */}
            {(canViewComponent('stageDistribution') || isAdmin) && (
              <div className={chartCardClass}>
                <div className={headerClass}>
                  <div className="flex items-center gap-1">
                    <PieChartIcon size={13} className="text-primary" />
                    <h3 className="font-bold text-xs text-foreground">Stage Distribution</h3>
                  </div>
                </div>
                <div className="p-3 h-48 sm:h-56">
                  {stageDistribution && stageDistribution.length > 0 ? (
                    <div className="flex items-center w-full h-full">
                      {/* Pie Chart */}
                      <div className="w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stageDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={35}
                              outerRadius={55}
                              paddingAngle={3}
                              cornerRadius={4}
                              stroke="none"
                              fill="#8884d8"
                              dataKey="value"
                              animationDuration={1500}
                            >
                              {stageDistribution.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 600 }}
                              itemStyle={{ color: '#0f172a' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Legend */}
                      <div className="w-1/2 h-full flex flex-col justify-center pl-4 overflow-y-auto">
                        {stageDistribution.map((entry: any, index: number) => (
                          <div key={index} className="flex items-center justify-between mb-2 pr-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                              ></div>
                              <span className="font-medium text-xs text-foreground truncate max-w-[80px]" title={entry.name}>
                                {entry.name}
                              </span>
                            </div>
                            <span className="font-bold text-xs text-foreground">
                              {entry.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <div className="h-full flex items-center justify-center opacity-20 text-[10px]">No data</div>}
                </div>
              </div>
            )}

            {/* Bank Distribution */}
            {(canViewComponent('bankDistribution') || isAdmin) && (
              <div className={chartCardClass}>
                <div className="px-3 py-2 border-b border-border/50 bg-gray-50/30 dark:bg-gray-800/20 flex items-center gap-1">
                  <Building2 size={13} className="text-primary" />
                  <h3 className="font-bold text-xs text-foreground">Bank Distribution</h3>
                </div>
                <div className="px-3 py-2">
                  <select
                    value={bankDistributionFilter}
                    onChange={(e) => setBankDistributionFilter(e.target.value)}
                    className="text-xs border border-border/50 rounded px-2 py-1 bg-background text-foreground w-full"
                  >
                    <option value="ALL">All Stages</option>
                    <option value="LOGIN">Login</option>
                    <option value="IN_PROCESS">In Process</option>
                    <option value="APPROVED">Approved</option>
                    <option value="DISBURSED">Disbursed</option>
                  </select>
                </div>
                <div className="px-3 pb-3 h-48 sm:h-56">
                  {bankDistribution && bankDistribution.length > 0 ? (
                    <div className="flex items-center w-full h-full">
                      {/* Pie Chart */}
                      <div className="w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={bankDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={35}
                              outerRadius={55}
                              paddingAngle={3}
                              cornerRadius={4}
                              stroke="none"
                              fill="#8884d8"
                              dataKey="value"
                              animationDuration={1500}
                            >
                              {bankDistribution.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 600 }}
                              itemStyle={{ color: '#0f172a' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Legend */}
                      <div className="w-1/2 h-full flex flex-col justify-center pl-4 overflow-y-auto">
                        {bankDistribution.map((entry: any, index: number) => (
                          <div key={index} className="flex items-center justify-between mb-2 pr-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                              ></div>
                              <span className="font-medium text-xs text-foreground truncate max-w-[80px]" title={entry.name}>
                                {entry.name}
                              </span>
                            </div>
                            <span className="font-bold text-xs text-foreground">
                              {entry.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <div className="h-full flex items-center justify-center opacity-20 text-[10px]">No data</div>}
                </div>
              </div>
            )}

            {/* Status Distribution */}
            {(canViewComponent('statusDistribution') || isAdmin) && (
              <div className={chartCardClass}>
                <div className={headerClass}>
                  <div className="flex items-center gap-1">
                    <Target size={13} className="text-primary" />
                    <h3 className="font-bold text-xs text-foreground">Status Distribution</h3>
                  </div>
                </div>
                <div className="p-3 h-48 sm:h-56">
                  {statusDistribution && statusDistribution.length > 0 ? (
                    <div className="flex items-center w-full h-full">
                      {/* Pie Chart */}
                      <div className="w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={35}
                              outerRadius={55}
                              paddingAngle={3}
                              cornerRadius={4}
                              stroke="none"
                              fill="#8884d8"
                              dataKey="value"
                              animationDuration={1500}
                            >
                              {statusDistribution.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 600 }}
                              itemStyle={{ color: '#0f172a' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Legend */}
                      <div className="w-1/2 h-full flex flex-col justify-center pl-4 overflow-y-auto">
                        {statusDistribution.map((entry: any, index: number) => (
                          <div key={index} className="flex items-center justify-between mb-2 pr-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                              ></div>
                              <span className="font-medium text-xs text-foreground truncate max-w-[80px]" title={entry.name}>
                                {entry.name}
                              </span>
                            </div>
                            <span className="font-bold text-xs text-foreground">
                              {entry.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <div className="h-full flex items-center justify-center opacity-20 text-[10px]">No data</div>}
                </div>
              </div>
            )}
          </div>
        </ScrollSection>

        {/* Performance Chart */}
        {(canViewComponent('performanceChart') || isAdmin) && (
          <ScrollSection delay={0.3} className={chartCardClass}>
            <div className={headerClass}>
              <div className="flex items-center gap-1">
                <TrendingUp size={13} className="text-primary" />
                <h3 className="font-bold text-xs text-foreground">Performance Trend</h3>
              </div>
            </div>
            <div className="h-[200px] sm:h-[260px] xl:h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} >
                  <defs>
                    <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.1)', padding: '8px', fontSize: '12px' }}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                  />
                  <Area type="monotone" dataKey="logins" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLogins)" />
                  <Area type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorApproved)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ScrollSection>
        )}

        {user?.role === 'executive' && (
          <ScrollSection delay={0.4} className={chartCardClass}>
            <div className={headerClass}>
              <div className="flex items-center gap-1">
                <FileText size={13} className="text-primary" />
                <h3 className="font-bold text-xs text-foreground">Leads Converted to Loans</h3>
              </div>
            </div>
            <div className="p-4 overflow-x-auto">
              {convertedLeads && convertedLeads.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 px-2 font-semibold text-foreground text-xs">Lead Name</th>
                      <th className="text-left py-2 px-2 font-semibold text-foreground text-xs">Loan ID</th>
                      <th className="text-left py-2 px-2 font-semibold text-foreground text-xs">Amount</th>
                      <th className="text-left py-2 px-2 font-semibold text-foreground text-xs">Bank</th>
                      <th className="text-left py-2 px-2 font-semibold text-foreground text-xs">Status</th>
                      <th className="text-left py-2 px-2 font-semibold text-foreground text-xs">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {convertedLeads.map((lead: any) => (
                      <tr key={lead.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-2 text-foreground">{lead.leadName}</td>
                        <td className="py-2 px-2 text-foreground font-medium">{lead.loanId}</td>
                        <td className="py-2 px-2 text-foreground">₹{(lead.loanAmount / 100000).toFixed(1)}L</td>
                        <td className="py-2 px-2 text-muted-foreground text-xs">{lead.bankName}</td>
                        <td className="py-2 px-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${lead.status === 'DISBURSED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                            lead.status === 'APPROVED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-muted-foreground text-xs">{new Date(lead.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-32 flex items-center justify-center opacity-20 text-[10px]">No converted leads</div>
              )}
            </div>
          </ScrollSection>
        )}
      </div>
    </DashboardContext.Provider>
  );
}
