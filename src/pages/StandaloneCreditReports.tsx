import React, { useState, useMemo, lazy, Suspense } from 'react';
import { FileText, Plus, Search, X, Loader2, Eye, User, Phone, CreditCard, Calendar, BarChart2, ArrowLeft, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
const CibilCreditReport = lazy(() => import('@/components/CibilCreditReport'));
const AdvancedFilterPanel = lazy(() => import('@/components/AdvancedFilterPanel'));
import type { FilterState } from '@/components/AdvancedFilterPanel';
import ConsentModal from '@/components/ConsentModal';
import {
  filterReportsByCibilScore,
  filterReportsByAddress,
  filterReportsByAccountStatus,
  filterReportsByAccountTypes,
  filterReportsByLenders,
  filterReportsByLoanAmount,
  filterReportsByCreditCardLimit,
  filterReportsByDPD,
  filterReportsByOverdueAmount,
  extractAllLenders
} from '@/utils/creditReportFilters';

function getAPI() {
  return import.meta.env.VITE_API_URL || '/api';
}

function authHeaders() {
  const token = localStorage.getItem('auth_token');
  if (!token) throw new Error('Authentication token not found. Please log in again.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

interface CreditReport {
  id: number;
  customer_name: string;
  mobile: string;
  pan: string | null;
  credit_score: number | null;
  report_data: any;
  pdf_filename: string | null;
  created_by_name: string;
  created_at: string;
}

function getScoreColor(score: number | null) {
  if (!score) return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'N/A', bar: 'bg-gray-300' };
  if (score >= 750) return { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Excellent', bar: 'bg-emerald-500' };
  if (score >= 700) return { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Good', bar: 'bg-blue-500' };
  if (score >= 650) return { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Fair', bar: 'bg-yellow-500' };
  return { bg: 'bg-red-50', text: 'text-red-700', label: 'Poor', bar: 'bg-red-500' };
}

function normalizeFilterState(saved: any): FilterState {
  const DEFAULT_FILTER_STATE = {
    cibilScore: { operator: 'gte', value: null, min: null, max: null },
    accountStatus: 'all',
    accountTypes: [],
    lenders: [],
    loanAmount: { operator: 'gte', value: null, min: null, max: null },
    creditCardLimit: { operator: 'gte', value: null, min: null, max: null },
    address: { city: '', state: '', pincode: '' },
    dpd: { operator: 'gte', value: null, min: null, max: null },
    overdueAmount: 'all',
  };

  if (!saved || typeof saved !== 'object') return DEFAULT_FILTER_STATE as any;

  const state: any = JSON.parse(JSON.stringify(DEFAULT_FILTER_STATE));

  if (saved.cibilScore && typeof saved.cibilScore === 'object') {
    state.cibilScore = {
      operator: saved.cibilScore.operator || 'gte',
      value: saved.cibilScore.value !== undefined ? saved.cibilScore.value : null,
      min: saved.cibilScore.min !== undefined ? saved.cibilScore.min : null,
      max: saved.cibilScore.max !== undefined ? saved.cibilScore.max : null,
    };
  }

  if (saved.accountStatus === 'all' || saved.accountStatus === 'active' || saved.accountStatus === 'closed') {
    state.accountStatus = saved.accountStatus;
  }

  if (Array.isArray(saved.accountTypes)) {
    state.accountTypes = saved.accountTypes.filter((t: any) => typeof t === 'string');
  }

  if (Array.isArray(saved.lenders)) {
    state.lenders = saved.lenders.filter((l: any) => typeof l === 'string');
  }

  if (saved.loanAmount && typeof saved.loanAmount === 'object') {
    state.loanAmount = {
      operator: saved.loanAmount.operator || 'gte',
      value: saved.loanAmount.value !== undefined ? saved.loanAmount.value : null,
      min: saved.loanAmount.min !== undefined ? saved.loanAmount.min : null,
      max: saved.loanAmount.max !== undefined ? saved.loanAmount.max : null,
    };
  }

  if (saved.creditCardLimit && typeof saved.creditCardLimit === 'object') {
    state.creditCardLimit = {
      operator: saved.creditCardLimit.operator || 'gte',
      value: saved.creditCardLimit.value !== undefined ? saved.creditCardLimit.value : null,
      min: saved.creditCardLimit.min !== undefined ? saved.creditCardLimit.min : null,
      max: saved.creditCardLimit.max !== undefined ? saved.creditCardLimit.max : null,
    };
  }

  if (saved.address && typeof saved.address === 'object') {
    state.address = {
      city: typeof saved.address.city === 'string' ? saved.address.city : '',
      state: typeof saved.address.state === 'string' ? saved.address.state : '',
      pincode: typeof saved.address.pincode === 'string' ? saved.address.pincode : '',
    };
  }

  if (saved.dpd && typeof saved.dpd === 'object') {
    state.dpd = {
      operator: saved.dpd.operator || 'gte',
      value: saved.dpd.value !== undefined ? saved.dpd.value : null,
      min: saved.dpd.min !== undefined ? saved.dpd.min : null,
      max: saved.dpd.max !== undefined ? saved.dpd.max : null,
    };
  }

  if (saved.overdueAmount === 'all' || saved.overdueAmount === 'nil' || saved.overdueAmount === 'yes') {
    state.overdueAmount = saved.overdueAmount;
  } else if (saved.overdueAmount && typeof saved.overdueAmount === 'object') {
    if (saved.overdueAmount.value !== null || saved.overdueAmount.min !== null || saved.overdueAmount.max !== null) {
      state.overdueAmount = 'yes';
    } else {
      state.overdueAmount = 'all';
    }
  }

  return state;
}

export default function StandaloneCreditReports() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [formData, setFormData] = useState({ customerName: '', mobile: '', pan: '' });
  const [viewReport, setViewReport] = useState<CreditReport | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isCheckingCache, setIsCheckingCache] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [activeFilters, setActiveFilters] = useState<FilterState | null>(() => {
    try {
      const saved = localStorage.getItem('credit_reports_filters');
      return saved ? normalizeFilterState(JSON.parse(saved)) : null;
    } catch (e) {
      return null;
    }
  });
  // OTP flow state
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const handleViewReport = async (report: any) => {
    if (report.report_data) {
      setViewReport(report);
      return;
    }
    const toastId = toast.loading('Loading full report details...');
    try {
      const res = await fetch(`${getAPI()}/credit-reports/standalone/${report.id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load full report');
      const data = await res.json();
      if (data.success && data.report) {
         // Cache it locally so next time it won't trigger another API call
         report.report_data = data.report.report_data;
         setViewReport(data.report);
         toast.success('Loaded successfully', { id: toastId });
      } else {
         throw new Error('Report data not found');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading report', { id: toastId });
    }
  };

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['standalone-credit-reports', searchTerm, user?.id, !!activeFilters],
    queryFn: async () => {
      // report_data (~20KB/row) is only needed when Advanced Filters are
      // actually applied — they read full_report.accounts/personal per
      // row client-side. Everyday browsing/search doesn't need it at all
      // (viewing a single report already fetches its full data by id on
      // demand), so this was tripling+ the payload on every ordinary load.
      const reportDataParam = activeFilters ? '&include_report_data=true' : '';
      const url = user?.role === 'sales_manager'
        ? `${getAPI()}/credit-reports/standalone?search=${searchTerm}&created_by=${user.id}${reportDataParam}`
        : `${getAPI()}/credit-reports/standalone?search=${searchTerm}${reportDataParam}`;
      const res = await fetch(url, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch reports');
      return res.json();
    },
  });

  const fetchReportMutation = useMutation({
    mutationFn: async (payload: { customerName: string; mobile: string; pan: string; otpVerified?: boolean }) => {
      const nameParts = payload.customerName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const res = await fetch(`${getAPI()}/link-loan/credit-report`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: `${firstName} ${lastName}`.trim(),
          mobile: payload.mobile.trim(),
          pan: payload.pan || undefined,
          force_refresh: user?.role === 'admin',
          otpVerified: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch credit report');
      return { reportData: data, payload };
    },
    onSuccess: async ({ reportData: data, payload }) => {
      toast.success('Credit report fetched! Saving...');
      try {
        const saveRes = await fetch(`${getAPI()}/credit-reports/standalone/save`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            customerName: payload.customerName,
            mobile: payload.mobile.trim(),
            pan: payload.pan || null,
            reportData: data,
            pdfFilename: null,
          }),
        });
        const saveData = await saveRes.json();
        if (!saveRes.ok) throw new Error(saveData.message || 'Failed to save');
        await queryClient.invalidateQueries({ queryKey: ['standalone-credit-reports'] });
        const listRes = await fetch(`${getAPI()}/credit-reports/standalone/${saveData.reportId}`, {
          headers: authHeaders(),
        });
        const listData = await listRes.json();
        setShowPanel(false);
        setFormData({ customerName: '', mobile: '', pan: '' });
        if (listData.success && listData.report) setViewReport(listData.report);
        toast.success('Report saved successfully!');
      } catch (err: any) {
        toast.error(err.message || 'Save failed');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to fetch credit report');
    },
  });

  const handleFetchReport = async (overrideOtp = false) => {
    if (!formData.customerName || !formData.mobile) {
      toast.error('Customer name and mobile are required');
      return;
    }


    setIsCheckingCache(true);
    const toastId = toast.loading('Checking existing reports in database...');

    try {
      const checkRes = await fetch(`${getAPI()}/credit-reports/standalone/check?mobile=${formData.mobile.trim()}`, {
        headers: authHeaders(),
      });

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.success && checkData.exists && checkData.report) {
          toast.success('Found existing report in database. Loading cached data...', { id: toastId });

          // Just open the existing report directly without creating a duplicate entry
          setShowPanel(false);
          setFormData({ customerName: '', mobile: '', pan: '' });
          setViewReport(checkData.report);
          
          setIsCheckingCache(false);
          return;
        }
      }
      
      // Check crif_cibil_cache
      const cacheCheckRes = await fetch(`${getAPI()}/link-loan/credit-report`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: formData.customerName,
          mobile: formData.mobile.trim(),
          pan: formData.pan || null,
          check_cache_only: true
        })
      });
      if (cacheCheckRes.ok) {
        const cacheCheckData = await cacheCheckRes.json();
        if (cacheCheckData.cache_miss && !otpVerified && overrideOtp !== true && !cacheCheckData.consent_already_approved) {
          toast.dismiss(toastId);
          setIsCheckingCache(false);
          setShowConsentModal(true);
          return;
        }
      }
      
    } catch (err: any) {
    } finally {
      setIsCheckingCache(false);
    }

    toast.dismiss(toastId);
    fetchReportMutation.mutate({ ...formData, otpVerified: true });
  };

  const closePanel = () => {
    setShowPanel(false);
    setFormData({ customerName: '', mobile: '', pan: '' });
  };

  const allReports: CreditReport[] = reportsData?.reports || [];

  const availableLenders = useMemo(() => {
    return extractAllLenders(allReports);
  }, [allReports]);

  const reports = useMemo(() => {
    if (!activeFilters) return allReports;

    let filtered = allReports;
    filtered = filterReportsByCibilScore(filtered, activeFilters.cibilScore);
    filtered = filterReportsByAddress(filtered, activeFilters.address);
    filtered = filterReportsByAccountStatus(filtered, activeFilters.accountStatus);
    filtered = filterReportsByAccountTypes(filtered, activeFilters.accountTypes);
    filtered = filterReportsByLenders(filtered, activeFilters.lenders);
    filtered = filterReportsByLoanAmount(filtered, activeFilters.loanAmount);
    filtered = filterReportsByCreditCardLimit(filtered, activeFilters.creditCardLimit);
    filtered = filterReportsByDPD(filtered, activeFilters.dpd);
    filtered = filterReportsByOverdueAmount(filtered, activeFilters.overdueAmount);
    return filtered;
  }, [allReports, activeFilters]);

  // Pagination
  const totalPages = Math.ceil(reports.length / itemsPerPage);
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return reports.slice(startIndex, endIndex);
  }, [reports, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeFilters, searchTerm]);

  
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBulkUploading(true);
    const toastId = toast.loading('Processing bulk upload... This may take a while.');
    
    try {
      const formData = new FormData();
      formData.append('excel_file', file);
      
      const res = await fetch(`${getAPI()}/credit-reports/standalone/bulk-upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: formData
      });
      
      if (!res.ok) {
        let errStr = 'Failed to queue bulk upload';
        try {
           const errJson = await res.json();
           errStr = errJson.message || errStr;
        } catch(e) {}
        throw new Error(errStr);
      }
      
      const data = await res.json();
      const jobId = data.jobId;
      
      toast.loading('Processing bulk upload in background... 0%', { id: toastId });
      
      // Polling loop
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`${getAPI()}/credit-reports/standalone/bulk-upload/${jobId}/status`, { headers: authHeaders() });
          if (!statusRes.ok) return;
          const statusData = await statusRes.json();
          
          if (statusData.state === 'completed') {
            clearInterval(pollInterval);
            toast.success('Bulk upload processed successfully!', { id: toastId });
            setIsBulkUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            
            queryClient.invalidateQueries({ queryKey: ['standalone-credit-reports'] });
            
            // Download the file
            if (statusData.result && statusData.result.fileUrl) {
              const a = document.createElement('a');
              a.href = statusData.result.fileUrl; // This will use the proxy to hit backend /uploads
              a.download = `Bulk_CIBIL_Scores_${new Date().getTime()}.xlsx`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          } else if (statusData.state === 'failed') {
            clearInterval(pollInterval);
            toast.error('Bulk upload job failed in background', { id: toastId });
            setIsBulkUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          } else {
            // Update progress
            toast.loading(`Processing bulk upload in background... ${statusData.progress || 0}%`, { id: toastId });
            if (statusData.progress !== undefined) {
               setUploadProgress(statusData.progress);
            }
          }
        } catch (e) {
          // just swallow polling errors and retry next time
        }
      }, 3000);
      
    } catch (error: any) {
      toast.error(error.message || 'Error processing bulk upload', { id: toastId });
      setIsBulkUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyFilters = (filters: FilterState) => {
    setActiveFilters(filters);
    try {
      localStorage.setItem('credit_reports_filters', JSON.stringify(filters));
    } catch (e) {
}
    setShowFilters(false);

    const activeFilterCount = [
      filters.accountTypes.length > 0,
      filters.lenders.length > 0,
      filters.accountStatus !== 'all',
      filters.cibilScore.value !== null || filters.cibilScore.min !== null || filters.cibilScore.max !== null,
      filters.loanAmount.value !== null || filters.loanAmount.min !== null || filters.loanAmount.max !== null,
      filters.creditCardLimit.value !== null || filters.creditCardLimit.min !== null || filters.creditCardLimit.max !== null,
      filters.dpd.value !== null || filters.dpd.min !== null || filters.dpd.max !== null,
      filters.overdueAmount !== 'all',
      filters.address.city || filters.address.state || filters.address.pincode,
    ].filter(Boolean).length;

    if (activeFilterCount > 0) {
      toast.success(`${activeFilterCount} filter(s) applied`);
    }
  };

  const handleResetFilters = () => {
    setActiveFilters(null);
    try {
      localStorage.removeItem('credit_reports_filters');
    } catch (e) {
}
    toast.info('Filters reset');
  };

  const isSalesManager = user?.role === 'sales_manager';
  const canUseFilters = user?.role !== 'branch_manager' && user?.role !== 'team_leader';

  // Without Advanced Filters, these come straight from the backend
  // (computed via SQL over the full search-matched set, not from
  // reports.length/.filter(...)) — the list itself is capped to
  // MAX_LIST_LIMIT rows for load speed, so counting off the loaded rows
  // only ever reflected whatever page happened to be fetched, not the true
  // total across all 11k+ reports. With Advanced Filters active there's no
  // equivalent server-side count for those (lender/DPD/etc. filters run
  // client-side over report_data), so this keeps the prior behavior there —
  // counting the loaded-and-filtered subset, same as before this fix.
  const stats = [
    { label: 'Total Reports', value: activeFilters ? reports.length : (reportsData?.total ?? reports.length), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Excellent (750+)', value: activeFilters ? reports.filter(r => (r.credit_score || 0) >= 750).length : (reportsData?.excellent_count ?? 0), icon: BarChart2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Good (700–749)', value: activeFilters ? reports.filter(r => (r.credit_score || 0) >= 700 && (r.credit_score || 0) < 750).length : (reportsData?.good_count ?? 0), icon: BarChart2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Needs Attention', value: activeFilters ? reports.filter(r => r.credit_score && r.credit_score < 700).length : (reportsData?.needs_attention_count ?? 0), icon: BarChart2, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  ];

  return (
    <div>
      <div className="space-y-6 pb-24 lg:pb-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Credit Reports</h1>
            <p className="text-muted-foreground text-sm mt-1">{isSalesManager ? 'Your credit reports' : 'Fetch and manage bureau credit reports'}</p>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === 'admin' && (
              <>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleBulkUpload} 
                  accept=".xlsx,.xls" 
                  className="hidden" 
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBulkUploading}
                  className="inline-flex items-center gap-2 bg-white border border-border text-foreground font-semibold py-2.5 px-4 rounded-xl hover:bg-muted transition-colors text-sm disabled:opacity-50"
                >
                  {isBulkUploading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  <span className="hidden sm:inline">{isBulkUploading ? `Processing ${uploadProgress}%` : 'Bulk Upload'}</span>
                  <span className="sm:hidden">Bulk</span>
                </button>
              </>
            )}
            <button
              onClick={() => setShowPanel(true)}
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">New Report</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card text-center">
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="stat-card mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by customer name or mobile number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded transition-colors"
                >
                  <X size={14} className="text-muted-foreground" />
                </button>
              )}
            </div>
            {canUseFilters && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all shrink-0 ${showFilters
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'border-border text-foreground hover:border-accent hover:bg-accent/5'
                  }`}
              >
                <Filter size={15} />
                <span>Filters</span>
              </button>
            )}
          </div>
          {canUseFilters && showFilters && (
            <div className="mt-3">
              <Suspense fallback={
                <div className="flex items-center justify-center py-4 bg-muted/10 rounded-xl">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              }>
                <AdvancedFilterPanel
                  isOpen={showFilters}
                  onToggle={() => setShowFilters(!showFilters)}
                  onApply={handleApplyFilters}
                  onReset={handleResetFilters}
                  availableLenders={availableLenders}
                  initialFilters={activeFilters}
                />
              </Suspense>
            </div>
          )}
        </div>

        {searchTerm && (() => {
          // reportsData.total is the true SQL-matched count for this search
          // term (search runs server-side, unaffected by the list cap) —
          // reports.length would only show up to MAX_LIST_LIMIT even if
          // more actually matched.
          const searchTotal = activeFilters ? reports.length : (reportsData?.total ?? reports.length);
          return (
            <p className="text-sm text-gray-600 px-1">
              <span className="font-semibold text-gray-900">{searchTotal}</span> result{searchTotal !== 1 ? 's' : ''} for{' '}
              <span className="font-bold text-primary">"{searchTerm}"</span>
            </p>
          );
        })()}

        {isSalesManager && !searchTerm && (() => {
          const yourTotal = activeFilters ? reports.length : (reportsData?.total ?? reports.length);
          return (
            <p className="text-sm text-gray-600 px-1">
              Showing <span className="font-semibold text-gray-900">{yourTotal}</span> report{yourTotal !== 1 ? 's' : ''} created by you
            </p>
          );
        })()}

        {/* Pagination Info & Controls */}
        {reports.length > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-3 px-1">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
              <span className="font-semibold text-gray-900">{Math.min(currentPage * itemsPerPage, reports.length)}</span> of{' '}
              <span className="font-semibold text-gray-900">{reports.length}</span> loaded
              {/* Pagination pages through what's actually loaded (capped at
                  MAX_LIST_LIMIT for load speed), so that count is correct
                  here — but shown alongside the real database total so it's
                  clear there's more than what's paginated, findable via
                  search. */}
              {!activeFilters && !searchTerm && (reportsData?.total ?? 0) > reports.length && (
                <> &middot; <span className="font-semibold text-gray-900">{reportsData?.total}</span> total in database — search to find a specific report</>
              )}
            </p>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="stat-card flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-accent" size={28} />
              <p className="text-sm text-muted-foreground">Loading reports...</p>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="stat-card text-center py-12">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
              <FileText size={22} className="text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold">
              {searchTerm ? `No results for "${searchTerm}"` : 'No credit reports yet'}
            </p>
            {!searchTerm && (
              <p className="text-sm text-muted-foreground mt-1 mb-4">Pull bureau data for any customer to get started</p>
            )}
            {!searchTerm && (
              <button
                onClick={() => setShowPanel(true)}
                className="inline-flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm"
              >
                <Plus size={15} /> New Report
              </button>
            )}
          </div>
        ) : (
          <div className="stat-card overflow-hidden">
            {/* Table header — hidden on mobile */}
            <div className="hidden md:grid grid-cols-12 gap-4 items-center border-b border-border bg-muted/50 px-4 py-3">
              <div className="col-span-2"><p className="text-xs font-semibold text-foreground">Date</p></div>
              <div className="col-span-2"><p className="text-xs font-semibold text-foreground">Customer Name</p></div>
              <div className="col-span-2"><p className="text-xs font-semibold text-foreground">Mobile</p></div>
              <div className="col-span-2"><p className="text-xs font-semibold text-foreground">PAN Number</p></div>
              <div className="col-span-2"><p className="text-xs font-semibold text-foreground">Fetched By</p></div>
              <div className="col-span-1"><p className="text-xs font-semibold text-foreground">Credit Score</p></div>
              <div className="col-span-1"><p className="text-xs font-semibold text-foreground text-right">Action</p></div>
            </div>

            <div className="divide-y divide-gray-100">
              {paginatedReports.map((report) => {
                const score = report.credit_score;
                const scoreStyle = getScoreColor(score);
                return (
                  <div key={report.id} className="hover:bg-gray-50/70 transition-colors group">

                    {/* Mobile card */}
                    <div className="md:hidden px-4 py-4 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0">
                        <User size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{report.customer_name}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Phone size={11} className="text-gray-400" />{report.mobile}
                          </span>
                          {report.pan && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <CreditCard size={11} className="text-gray-400" />{report.pan}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar size={11} />{new Date(report.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">By {report.created_by_name}</p>
                        {score ? (
                          <span className={`inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${scoreStyle.bg} ${scoreStyle.text}`}>
                            <BarChart2 size={10} />{score} · {scoreStyle.label}
                          </span>
                        ) : (
                          <span className="inline-block mt-1 text-[11px] text-gray-400">No score</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleViewReport(report)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold shadow-sm shrink-0"
                      >
                        <Eye size={13} /> View
                      </button>
                    </div>

                    {/* Desktop row */}
                    <div className="hidden md:grid grid-cols-12 gap-4 items-center px-4 py-3">
                      <div className="col-span-2 flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400 shrink-0" />
                        <p className="text-sm text-gray-600">
                          {new Date(report.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="font-semibold text-gray-900 text-sm truncate">{report.customer_name}</p>
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <Phone size={14} className="text-gray-400 shrink-0" />
                        <p className="text-sm font-medium text-gray-700">{report.mobile}</p>
                      </div>
                      <div className="col-span-2">
                        {report.pan ? (
                          <div className="flex items-center gap-2">
                            <CreditCard size={14} className="text-gray-400 shrink-0" />
                            <p className="text-sm font-medium text-gray-700">{report.pan}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">N/A</span>
                        )}
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600 truncate">{report.created_by_name}</p>
                      </div>
                      <div className="col-span-1">
                        {score ? (
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${scoreStyle.bg}`}>
                            <span className={`text-sm font-bold ${scoreStyle.text}`}>{score}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">N/A</span>
                        )}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => handleViewReport(report)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-xs font-semibold shadow-sm hover:shadow-md"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {reports.length > itemsPerPage && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <div className="flex items-center gap-1">
              {currentPage > 3 && (
                <>
                  <button
                    onClick={() => setCurrentPage(1)}
                    className="w-10 h-10 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    1
                  </button>
                  {currentPage > 4 && <span className="px-2 text-gray-400">...</span>}
                </>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  return page === currentPage ||
                    page === currentPage - 1 ||
                    page === currentPage + 1 ||
                    (currentPage <= 2 && page <= 3) ||
                    (currentPage >= totalPages - 1 && page >= totalPages - 2);
                })
                .map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg font-medium text-sm transition-colors ${currentPage === page
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    {page}
                  </button>
                ))}

              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && <span className="px-2 text-gray-400">...</span>}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-10 h-10 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* View Report Modal */}
      {viewReport && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-end md:items-center justify-center md:p-6">
          <div className="bg-background w-full md:max-w-4xl lg:max-w-5xl h-[92vh] md:max-h-[90vh] overflow-y-auto md:rounded-2xl shadow-2xl rounded-t-2xl flex flex-col">
            <div className="sticky top-0 bg-background border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User size={16} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">{viewReport.customer_name}</h2>
                  <p className="text-xs text-muted-foreground">{viewReport.mobile}</p>
                </div>
              </div>
              <button onClick={() => setViewReport(null)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto pb-32 md:pb-6">
              <Suspense fallback={
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              }>
                <CibilCreditReport isStandalone={true} loan={{ id: viewReport.id, pan_number: viewReport.pan, applicant_name: viewReport.customer_name, mobile: viewReport.mobile, application_stage: 'LOGIN', credit_report_data: viewReport.report_data, credit_score: viewReport.credit_score }} />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* New Report Panel */}
      {showPanel && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end md:items-center md:justify-center md:p-6">
          <div className="bg-background w-full md:max-w-lg md:rounded-2xl overflow-y-auto shadow-2xl rounded-t-2xl max-h-[92vh] md:max-h-[85vh] flex flex-col">

            {/* Panel header */}
            <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center gap-3 z-10 shrink-0">
              <button
                onClick={closePanel}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors shrink-0"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-foreground leading-tight">New Credit Report</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Fetch bureau report for a customer</p>
              </div>
              <button onClick={closePanel} className="p-1.5 hover:bg-muted rounded-lg transition-colors shrink-0 md:hidden">
                <X size={18} />
              </button>
            </div>

            {/* Panel body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm bg-background"
                      placeholder="Enter full name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm bg-background"
                      placeholder="10-digit mobile number"
                      maxLength={10}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    PAN Number <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.pan}
                      onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                      className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm bg-background"
                      placeholder="ABCDE1234F"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>

              {/* Fetch Report button — always visible now that OTP is disabled */}

              {/* Fetch Report button */}
              <button
                id="fetch-credit-report-btn"
                onClick={() => handleFetchReport(false)}
                disabled={fetchReportMutation.isPending || isCheckingCache}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-semibold text-sm shadow-sm"
              >
                {fetchReportMutation.isPending || isCheckingCache
                  ? <><Loader2 className="animate-spin" size={17} />{isCheckingCache ? 'Checking Cache...' : 'Fetching Report...'}</>
                  : <><FileText size={17} />Fetch Credit Report</>}
              </button>

              {(fetchReportMutation.isPending || isCheckingCache) && (
                <p className="text-xs text-center text-muted-foreground">
                  {isCheckingCache ? 'Checking existing report cache...' : 'Fetching from bureau and saving to database...'}
                </p>
              )}

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2.5">What happens next?</p>
                <ul className="space-y-2">
                  {['Bureau report is fetched in real-time', 'Report is saved to the database', 'Full credit report opens automatically'].map((step, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-400">
                      <span className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 flex items-center justify-center font-bold text-[10px] shrink-0">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConsentModal && (
        <ConsentModal
          isOpen={true}
          mobile={formData.mobile}
          hideSkipButton={true}
          onSuccess={() => {
            setShowConsentModal(false);
            setOtpVerified(true);
            setTimeout(() => {
              handleFetchReport(true);
            }, 100);
          }}
          onClose={() => setShowConsentModal(false)}
        />
      )}
    </div>
  );
}

