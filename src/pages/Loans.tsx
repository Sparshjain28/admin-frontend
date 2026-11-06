import { useEffect, useState, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, APPLICATION_STAGES, ApplicationStage } from '@/lib/mock-data';
import { exportToExcel, parseExcel } from '@/lib/export-utils';
import { exportLoanPDF, downloadLoanPDF, prepareLoanShareBundle, prepareDocumentShareBundle } from '@/lib/pdf-export';
import { toast } from 'sonner';
import LoanStatusBadge from '@/components/LoanStatusBadge';
const LoanApplicationStageManager = lazy(() => import('@/components/LoanApplicationStageManager'));
import { Search, Plus, ChevronRight, ChevronDown, Download, Upload, Printer, MessageCircle, Edit2, Trash2, Settings, Share2, FileText, Clock, SlidersHorizontal, Calendar, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import MobileLoansWorkflow from '@/components/MobileLoansWorkflow';
import HierarchyCascadingFilter, { HierarchyFilterState } from '@/components/HierarchyCascadingFilter';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import VisualDateRangePicker from '@/components/VisualDateRangePicker';

const truncateVehicleName = (name: string) => {
  if (!name) return '—';
  const words = name.split(/\s+/);
  if (words.length > 3) {
    return words.slice(0, 3).join(' ') + '...';
  }
  return name;
};

const maskMobile = (m: string) => {
  if (!m) return '—';
  const str = String(m);
  return str.length > 4 ? `${str.slice(0, 2)}XXXXXX${str.slice(-2)}` : str;
};

const MaskedMobile = ({ mobile }: { mobile: string }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-default font-mono"
      title={mobile}
    >
      {hovered ? mobile : maskMobile(mobile)}
    </span>
  );
};

// Loan Timer Component for SUBMITTED and LOGIN stages only (Disabled permanently - TIME UP removed)
const LoanStageTimer = (_props: { createdAt?: string; applicationStage?: string; stageChangedAt?: string; timerEnabled?: boolean }) => {
  return null;
};

// Helper function to check if timer is expired (Disabled permanently - never expire/disable)
const isLoanTimerExpired = (_createdAt?: string, _applicationStage?: string, _stageChangedAt?: string): boolean => {
  return false;
};

type ApplicationStageFilter = ApplicationStage | 'all';

export function DesktopLoansWorkflow() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const queryClient = useQueryClient();
  const [search, setSearch] = useState(() => sessionStorage.getItem('loans_search') || '');
  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    const val = sessionStorage.getItem('loans_status');
    try {
      if (val) {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return val && val !== 'all' ? [val] : [];
  });
  const [caseTypeFilter, setCaseTypeFilter] = useState<string[]>(() => {
    const val = sessionStorage.getItem('loans_caseType');
    try {
      if (val) {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return val && val !== 'all' ? [val] : [];
  });
  const [hierarchyFilter, setHierarchyFilter] = useState<HierarchyFilterState>(() => {
    const stored = sessionStorage.getItem('loans_hierarchy');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.salesManager) && Array.isArray(parsed.branchManager)) return parsed;
        // Old state fallback
        return {
          salesManager: parsed?.salesManager || [],
          branchManager: parsed?.branchManager || [],
          teamLeader: parsed?.teamLeader || [],
          executive: parsed?.executive || []
        };
      } catch {}
    }
    return { salesManager: [], branchManager: [], teamLeader: [], executive: [] };
  });
  const [dateFrom, setDateFrom] = useState<string>(() => sessionStorage.getItem('loans_date_from') || '');
  const [dateTo, setDateTo] = useState<string>(() => sessionStorage.getItem('loans_date_to') || '');
  const [pddStatusFilter, setPddStatusFilter] = useState<string>(() => sessionStorage.getItem('loans_pddStatus') || 'all');
  const [disbursementMonthFilter, setDisbursementMonthFilter] = useState<string>(() => sessionStorage.getItem('loans_disbursementMonth') || 'all');
  const [currentPage, setCurrentPage] = useState(() => Number(sessionStorage.getItem('loans_page')) || 1);

  const [appliedSearch, setAppliedSearch] = useState(search);
  const [appliedStatusFilter, setAppliedStatusFilter] = useState(statusFilter);
  const [appliedCaseTypeFilter, setAppliedCaseTypeFilter] = useState(caseTypeFilter);
  const [appliedHierarchyFilter, setAppliedHierarchyFilter] = useState(hierarchyFilter);
  const [appliedDateFrom, setAppliedDateFrom] = useState(dateFrom);
  const [appliedDateTo, setAppliedDateTo] = useState(dateTo);
  const [appliedPddStatusFilter, setAppliedPddStatusFilter] = useState(pddStatusFilter);
  const [appliedDisbursementMonthFilter, setAppliedDisbursementMonthFilter] = useState(disbursementMonthFilter);

  // Sync applied filters with sessionStorage
  useEffect(() => {
    sessionStorage.setItem('loans_search', appliedSearch);
    sessionStorage.setItem('loans_status', JSON.stringify(appliedStatusFilter));
    sessionStorage.setItem('loans_caseType', JSON.stringify(appliedCaseTypeFilter));
    sessionStorage.setItem('loans_hierarchy', JSON.stringify(appliedHierarchyFilter));
    sessionStorage.setItem('loans_date_from', appliedDateFrom);
    sessionStorage.setItem('loans_date_to', appliedDateTo);
    sessionStorage.setItem('loans_pddStatus', appliedPddStatusFilter);
    sessionStorage.setItem('loans_disbursementMonth', appliedDisbursementMonthFilter);
    sessionStorage.setItem('loans_page', String(currentPage));
  }, [appliedSearch, appliedStatusFilter, appliedCaseTypeFilter, appliedHierarchyFilter, appliedDateFrom, appliedDateTo, appliedPddStatusFilter, appliedDisbursementMonthFilter, currentPage]);

  // Sync mobile screen layout filter changes instantly
  useEffect(() => {
    if (window.innerWidth < 640) {
      setAppliedSearch(search);
      setAppliedStatusFilter(statusFilter);
      setAppliedCaseTypeFilter(caseTypeFilter);
      setAppliedHierarchyFilter(hierarchyFilter);
      setAppliedDateFrom(dateFrom);
      setAppliedDateTo(dateTo);
      setAppliedPddStatusFilter(pddStatusFilter);
      setAppliedDisbursementMonthFilter(disbursementMonthFilter);
    }
  }, [search, statusFilter, caseTypeFilter, hierarchyFilter, dateFrom, dateTo, pddStatusFilter, disbursementMonthFilter]);

  const location = useLocation();

  // Sync URL search parameters on navigation (e.g. from DSA Performance cards)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const urlSearch = urlParams.get('search');
    const urlStatus = urlParams.get('status') || urlParams.get('application_stage');
    const urlCaseType = urlParams.get('caseType') || urlParams.get('case_type');
    const urlDsaId = urlParams.get('dsa_id');

    if (urlDsaId !== null) {
      // Clean slate for DSA drill-down navigation
      const s = urlSearch || '';
      setSearch(s);
      setAppliedSearch(s);

      const stages = urlStatus ? urlStatus.split(',').map(st => st.trim()).filter(Boolean) : [];
      setStatusFilter(stages);
      setAppliedStatusFilter(stages);

      const cases = urlCaseType ? urlCaseType.split(',').map(c => c.trim()).filter(Boolean) : [];
      setCaseTypeFilter(cases);
      setAppliedCaseTypeFilter(cases);

      setDateFrom('');
      setDateTo('');
      setAppliedDateFrom('');
      setAppliedDateTo('');
      setPddStatusFilter('all');
      setAppliedPddStatusFilter('all');
      setDisbursementMonthFilter('all');
      setAppliedDisbursementMonthFilter('all');
      setHierarchyFilter({ salesManager: [], branchManager: [], teamLeader: [], executive: [] });
      setAppliedHierarchyFilter({ salesManager: [], branchManager: [], teamLeader: [], executive: [] });
      setCurrentPage(1);
    } else if (urlSearch !== null || urlStatus !== null || urlCaseType !== null) {
      if (urlSearch !== null) {
        setSearch(urlSearch);
        setAppliedSearch(urlSearch);
      }
      if (urlStatus !== null) {
        const stages = urlStatus ? urlStatus.split(',').map(s => s.trim()).filter(Boolean) : [];
        setStatusFilter(stages);
        setAppliedStatusFilter(stages);
      }
      if (urlCaseType !== null) {
        const cases = urlCaseType ? urlCaseType.split(',').map(s => s.trim()).filter(Boolean) : [];
        setCaseTypeFilter(cases);
        setAppliedCaseTypeFilter(cases);
      }
      setCurrentPage(1);
    }
  }, [location.search]);

  const itemsPerPage = 50;
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [showStageManager, setShowStageManager] = useState(false);
  const [sharingLoanId, setSharingLoanId] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareMenuLoan, setShareMenuLoan] = useState<any>(null);
  const [shareBundles, setShareBundles] = useState<Record<string, Awaited<ReturnType<typeof prepareLoanShareBundle>>>>({});
  const [documentBundles, setDocumentBundles] = useState<Record<string, Awaited<ReturnType<typeof prepareDocumentShareBundle>>>>({});
  const importRef = useRef<HTMLInputElement>(null);
  const [showFilters, setShowFilters] = useState(false);

  const queryParams = useMemo(() => {
    const urlParams = new URLSearchParams(location.search);
    const dsaId = urlParams.get('dsa_id');
    const periodParam = urlParams.get('period');
    const params: Record<string, string> = {
      page: String(currentPage),
      limit: String(itemsPerPage),
    };
    if (dsaId) {
      // Scoped DSA drill-down: do not allow unrelated sessionStorage filters to interfere
      params.dsa_id = dsaId;
      if (periodParam) params.period = periodParam;
      const urlStatus = urlParams.get('status') || urlParams.get('application_stage');
      if (urlStatus) params.application_stage = urlStatus;
      const urlCaseType = urlParams.get('caseType') || urlParams.get('case_type');
      if (urlCaseType) params.case_type = urlCaseType;
      const urlSearch = urlParams.get('search');
      if (urlSearch) params.search = urlSearch;
      return params;
    }
    if (appliedSearch) params.search = appliedSearch;
    if (appliedStatusFilter.length > 0) params.application_stage = appliedStatusFilter.join(',');
    if (appliedCaseTypeFilter.length > 0) params.case_type = appliedCaseTypeFilter.join(',');
    if (appliedHierarchyFilter.salesManager?.length > 0) params.sales_manager = appliedHierarchyFilter.salesManager.join(',');
    if (appliedHierarchyFilter.branchManager?.length > 0) params.branch_manager = appliedHierarchyFilter.branchManager.join(',');
    if (appliedHierarchyFilter.teamLeader?.length > 0) params.team_leader = appliedHierarchyFilter.teamLeader.join(',');
    if (appliedHierarchyFilter.executive?.length > 0) params.executive = appliedHierarchyFilter.executive.join(',');
    if (appliedDateFrom) params.from_date = appliedDateFrom;
    if (appliedDateTo) params.to_date = appliedDateTo;
    if (appliedPddStatusFilter !== 'all') params.pdd_status = appliedPddStatusFilter;
    if (appliedDisbursementMonthFilter !== 'all') params.disbursement_month = appliedDisbursementMonthFilter;
    return params;
  }, [currentPage, appliedSearch, appliedStatusFilter, appliedCaseTypeFilter, appliedHierarchyFilter, appliedDateFrom, appliedDateTo, appliedPddStatusFilter, appliedDisbursementMonthFilter, location.search]);

  const { data: loansData = { data: [] as any[], total: 0, page: 1, limit: itemsPerPage, totalPages: 1 }, isLoading, error: loansError } = useQuery({
    queryKey: ['loans', user?.branch_id, queryParams],
    queryFn: async () => {
      const qs = new URLSearchParams(queryParams).toString();
      return api.get(`/loans?${qs}`);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const loans = (loansData as any)?.data || [];
  const total = (loansData as any)?.total ?? loans.length;

  const { data: configs = [] } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/config`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.ok ? await response.json() : [];
    },
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
        return allPerms[user?.role] || null;
      } catch {
        return null;
      }
    },
    enabled: !!user,
  });

  const isLoginStageEnabled = () => {
    const config = configs.find((c: any) => c.config_key === 'login_stage_enabled');
    if (!config) {
      return true;
    }
    const configEnabled = config.config_value === 'true';
    const hasPermission = user?.role === 'admin' || userPermissions?.dashboard?.components?.timer === true;
    
    return configEnabled && hasPermission;
  };

  const handleStageUpdate = (loan: any) => {
    setSelectedLoan(loan);
    setShowStageManager(true);
  };

  const deleteLoan = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete loan');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Loan deleted successfully');
    },
    onError: () => toast.error('Failed to delete loan'),
  });

  const handleDelete = (loan: any) => {
    if (confirm(`Are you sure you want to delete loan ${loan.loan_number || loan.id}?`)) {
      deleteLoan.mutate(loan.id);
    }
  };

  const handleShareLoan = async (loan: any) => {
    const loanId = String(loan.id);
    setSharingLoanId(loanId);

    try {
      const bundle = shareBundles[loanId];
      if (!bundle) {
        toast.info('Saved PDF is still loading. Please try again in a moment.');
        return;
      }

      if (!navigator.share) {
        toast.error('Sharing not available on this device');
        return;
      }

      if (navigator.canShare && !navigator.canShare({ files: bundle.files })) {
        toast.error('This device cannot share the prepared PDF');
        return;
      }

      try { await navigator.clipboard.writeText(bundle.text); toast.success('Message copied to clipboard! You can paste it when sharing.'); } catch(e){}
      await navigator.share({
        title: bundle.title,
        text: bundle.text,
        files: bundle.files,
      });
      toast.success('Shared PDF!');
    } catch (error: any) {
if (error?.name === 'AbortError') {
        toast.info('Sharing cancelled');
      } else {
        toast.error(error?.message || 'Failed to share loan application');
      }
    } finally {
      setSharingLoanId(current => current === loanId ? null : current);
    }
  };

  const openShareMenu = async (loan: any) => {
    setShareMenuLoan(loan);
    setShowShareMenu(true);

    const loanId = String(loan.id);
    if (!shareBundles[loanId]) {
      try {
        const freshLoan = await api.get(`/loans/${loan.id}`);
        const freshDocs = await api.get(`/loans/${loan.id}/documents`);
        const uniqueDocs = freshDocs.filter((doc: any, index: number, self: any[]) => {
          const firstIndex = self.findIndex(d =>
            d.document_type === doc.document_type &&
            d.file_name === doc.file_name
          );
          return index === firstIndex;
        });
        const bundle = await prepareLoanShareBundle(freshLoan, uniqueDocs);
        setShareBundles(current => current[loanId] ? current : { ...current, [loanId]: bundle });
      } catch (error) {
}
    }

    if (!documentBundles[loanId]) {
      try {
        const docs = await api.get(`/loans/${loan.id}/documents`);
        const uniqueDocs = docs.filter((doc: any, index: number, self: any[]) => {
          const firstIndex = self.findIndex(d =>
            d.document_type === doc.document_type &&
            d.file_name === doc.file_name
          );
          return index === firstIndex;
        });
        const bundle = await prepareDocumentShareBundle(uniqueDocs, loanId);
        setDocumentBundles(current => current[loanId] ? current : { ...current, [loanId]: bundle });
      } catch (error) {
}
    }
  };

  const handleShareDocs = async (loan: any) => {
    const loanId = String(loan.id);
    const bundle = documentBundles[loanId];
    if (!bundle) {
      toast.info('Images are still loading. Please try again in a moment.');
      return;
    }

    if (!navigator.share) {
      toast.error('Sharing not available on this device');
      return;
    }

    try {
      if (navigator.canShare && !navigator.canShare({ files: bundle.files })) {
        toast.error('This device cannot share the prepared images');
        return;
      }

      try { await navigator.clipboard.writeText(bundle.text); toast.success('Message copied to clipboard! You can paste it when sharing.'); } catch(e){}
      await navigator.share({
        title: bundle.title,
        text: bundle.text,
        files: bundle.files,
      });
      toast.success(`Shared ${bundle.docCount} images!`);
    } catch (error: any) {
if (error?.name === 'AbortError') {
        toast.info('Sharing cancelled');
      } else {
        toast.error(error?.message || 'Failed to share images');
      }
    }
  };

  const isExecutive = user?.role === 'executive';
  const canEditLoan = ['admin', 'dsa', 'branch_manager', 'ops_team'].includes(user?.role || '');
  const canEditStatus = !isExecutive;
  const isTeamLeader = user?.role === 'team_leader';
  const canDelete = user?.role === 'admin';
  const showUpdateColumn = !isExecutive;

  const handleExport = async () => {
    try {
      const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '';
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr;
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        } catch {
          return dateStr;
        }
      };

      const formatDisbursementMonth = (dateStr: string | null) => {
        if (!dateStr) return '';
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return '';
          const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          return `${months[d.getMonth()]} ${d.getFullYear()}`;
        } catch {
          return '';
        }
      };

      const formatRcType = (val: string | null) => {
        if (!val) return '';
        const v = String(val).toUpperCase();
        if (v === 'PHYSICAL_RC') return 'Physical';
        if (v === 'DIGITAL_RC') return 'Digital';
        return val;
      };

      const formatCollectedBy = (val: string | null) => {
        if (!val) return '';
        const v = String(val).toUpperCase();
        if (v === 'SELF') return 'Self';
        if (v === 'RTO_AGENT') return 'RTO Agent';
        if (v === 'BANKER') return 'Banker';
        return val;
      };

      const exportParams: Record<string, string> = {};
      if (search) exportParams.search = search;
      if (statusFilter.length > 0) exportParams.application_stage = statusFilter.join(',');
      if (caseTypeFilter.length > 0) exportParams.case_type = caseTypeFilter.join(',');
      if (hierarchyFilter.salesManager?.length > 0) exportParams.sales_manager = hierarchyFilter.salesManager.join(',');
      if (hierarchyFilter.branchManager?.length > 0) exportParams.branch_manager = hierarchyFilter.branchManager.join(',');
      if (hierarchyFilter.teamLeader?.length > 0) exportParams.team_leader = hierarchyFilter.teamLeader.join(',');
      if (hierarchyFilter.executive?.length > 0) exportParams.executive = hierarchyFilter.executive.join(',');
      if (dateFrom) exportParams.from_date = dateFrom;
      if (dateTo) exportParams.to_date = dateTo;
      if (pddStatusFilter !== 'all') exportParams.pdd_status = pddStatusFilter;
      if (disbursementMonthFilter !== 'all') exportParams.disbursement_month = disbursementMonthFilter;
      const qs = new URLSearchParams(exportParams).toString();
      const all: any[] = await api.get(`/loans${qs ? `?${qs}` : ''}`);
      if (all.length === 0) { toast.error('No data to export'); return; }

      const rows = all.map((l: any) => {
        let receiverName = '';
        let receiverContact = '';
        const collectedBy = String(l.rc_collected_by || '').toUpperCase();
        if (collectedBy === 'SELF') {
          receiverName = l.rto_agent_name_rc || '';
          receiverContact = l.rto_agent_mobile || '';
        } else if (collectedBy === 'BANKER') {
          receiverName = l.banker_name || '';
          receiverContact = l.banker_mobile || '';
        } else {
          receiverName = l.rto_agent_name_rc || '';
          receiverContact = l.rto_agent_mobile || '';
        }

        return {
          'Lead creation date': formatDate(l.created_at),
          'Lead creation month': formatDisbursementMonth(l.created_at),
          'Loan ID': l.loan_number || l.id,
          'Applicant Name': l.applicant_name || '',
          'RC No.': l.vehicle_number || '',
          'Vehicle Variant Name': l.model_variant_name || l.car_variant || l.maker_model || l.car_model || '',
          'Bank Name': l.bank_name || '',
          'Case Type': l.case_type || '',
          'Exciting Financial Name': l.rto_financer || l.financier || l.old_hpn || '',
          'Case Status': l.application_stage_label || l.status || '',
          'Loan Amount': l.loan_amount || '',
          'ROI': l.roi || '',
          'Tenure': l.tenure || '',
          'Disbursement Date': formatDate(l.disbursement_date),
          'Disbursement Month': formatDisbursementMonth(l.disbursement_date),
          'Loan Account Number': l.loan_account_number || '',
          'RC Type': formatRcType(l.rc_type),
          'RC Collected By': formatCollectedBy(l.rc_collected_by),
          'Receiver Name': receiverName,
          'Receiver Contact': receiverContact,
          'Executive Name': l.executive_name || '',
          'Team Leader Name': l.team_leader_name || '',
          'BM/ dsa name': l.branch_dsa_manager_name || l.branch_manager_name || '',
          'Sales Manager': l.sales_manager_name || '',
        };
      });

      exportToExcel(rows, 'loans');
      toast.success('Loans exported as Excel!');
    } catch (err: any) {
      toast.error(`Export failed: ${err.message || err}`);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const rows = await parseExcel(file);
      if (rows.length === 0) { toast.error('No valid data found in Excel file'); return; }
      let imported = 0;
      for (const row of rows) {
        // Map case_type from various Excel formats
        let caseType = row['Case Type'] || row['case_type'] || row['CaseType'] || '';
        const caseTypeLower = caseType.toLowerCase().trim();
        if (caseTypeLower === 'purchase' || caseTypeLower === 'yes' || caseTypeLower === 'used car purchase' || caseTypeLower === 'used_car_purchase') {
          caseType = 'Purchase';
        } else if (caseTypeLower === 'refinance' || caseTypeLower === 'used car refinance' || caseTypeLower === 'used_car_refinance') {
          caseType = 'Refinance';
        } else if (caseTypeLower === 'bt' || caseTypeLower === 'bt/top-up' || caseTypeLower === 'top-up' || caseTypeLower === 'topup' || caseTypeLower === 'used_car_bt_topup' || caseTypeLower === 'bt topup') {
          caseType = 'BT';
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/loans`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            applicant_name: row['Applicant'] || row['applicant_name'] || row['Customer Name'] || row['customer_name'] || row['Name'] || 'Unknown',
            customer_name: row['Applicant'] || row['applicant_name'] || row['Customer Name'] || row['customer_name'] || row['Name'] || 'Unknown',
            mobile: row['Mobile'] || row['mobile'] || row['Phone'] || row['phone'] || '0000000000',
            pan_number: row['PAN'] || row['pan_number'] || row['Pan Number'] || '',
            vehicle_number: row['Vehicle Number'] || row['vehicle_number'] || row['RC Number'] || row['Vehicle'] || '',
            case_type: caseType,
            loan_amount: Number(row['Loan Amount'] || row['loan_amount'] || row['Amount'] || 0),
            maker_name: row['Car Make'] || row['car_make'] || row['Maker'] || row['maker_name'] || '',
            maker_model: row['Car Model'] || row['car_model'] || row['Model'] || row['maker_model'] || '',
            financier_name: row['Financier'] || row['financier_name'] || row['Bank'] || row['Lender'] || '',
            current_address: row['Address'] || row['current_address'] || '',
            status: 'submitted',
            application_stage: 'SUBMITTED',
            created_by: user.id
          })
        });

        if (response.ok) imported++;
      }
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast.success(`${imported} loans imported successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    }
    e.target.value = '';
  };

  // Fixed 4 case types
  const CASE_TYPES = ['Purchase', 'Refinance', 'BT', 'Top-Up'];

  const uniqueExecutives = useMemo<string[]>(() => {
    const execs = new Set<string>();
    loans.forEach((l: any) => {
      if (l.executive_name) execs.add(l.executive_name);
    });
    return Array.from(execs).sort((a, b) => a.localeCompare(b));
  }, [loans]);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      setCurrentPage(1);
    }
  }, [search, statusFilter, caseTypeFilter, hierarchyFilter, dateFrom, dateTo, pddStatusFilter, disbursementMonthFilter]);

  // Server-side pagination: the rows on the current page are already filtered + sliced by the backend
  const totalPages = (loansData as any)?.totalPages ?? Math.ceil(total / itemsPerPage);
  const paginatedLoans = loans;

  // If the last item on the current page was deleted/filtered out, fall back to the last valid page
  useEffect(() => {
    if ((loansData as any)?.totalPages && currentPage > (loansData as any).totalPages) {
      setCurrentPage((loansData as any).totalPages);
    }
  }, [loansData, currentPage]);

  return (
    <>
      <div className="pb-24 lg:pb-0">
      <div className="hidden sm:flex flex-row items-center justify-between gap-2 mb-4">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-foreground font-bold -mt-1.5 whitespace-nowrap">{total} applications found</p>
        </div>
        {/* Desktop buttons only — mobile has sticky toolbar */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className={`flex items-center gap-2 font-medium py-2.5 px-4 rounded-xl transition-all text-sm whitespace-nowrap ${
              showFilters 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            <SlidersHorizontal size={16} /> 
          </button>
          {!isExecutive && (<>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 bg-muted text-foreground font-medium py-2.5 px-4 rounded-xl hover:bg-muted/80 transition-opacity text-sm whitespace-nowrap">
                <Download size={16} /> <ChevronDown size={14} className="opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border border-border z-50 min-w-[150px] rounded-xl p-1 shadow-md">
              <DropdownMenuItem onClick={handleExport} className="cursor-pointer flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors">
                <Download size={14} /> Export
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => importRef.current?.click()} className="cursor-pointer flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors">
                <Upload size={14} /> Import
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </>)}
        </div>
      </div>

      {new URLSearchParams(location.search).get('dsa_id') && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 mb-4 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">DSA Partner Filter:</span>
            <span className="font-bold text-foreground">
              {new URLSearchParams(location.search).get('dsa_name') || `DSA #${new URLSearchParams(location.search).get('dsa_id')}`}
            </span>
            {new URLSearchParams(location.search).get('period') && (
              <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-md font-semibold text-[11px] uppercase">
                {new URLSearchParams(location.search).get('period')?.replace('_', ' ')}
              </span>
            )}
            <span className="text-muted-foreground hidden sm:inline">• Showing cases sourced or assigned to this partner</span>
          </div>
          <button
            onClick={() => {
              navigate('/loans', { replace: true });
            }}
            className="text-xs text-primary font-bold hover:underline"
          >
            Clear DSA Filter
          </button>
        </div>
      )}

      {/* Desktop Filters — Card/Border layout */}
      {showFilters && (
        <div className="hidden sm:block border-2 border-slate-300 dark:border-zinc-700 bg-card p-5 rounded-lg mb-4 shadow-md animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative w-[280px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, loan ID, mobile, vehicle..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-md border border-slate-300 dark:border-zinc-700 bg-card text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all shadow-sm"
              />
            </div>
            {/* Stage Dropdown */}
            <div className="w-[180px]">
              <MultiSelectDropdown
                options={APPLICATION_STAGES.map(s => ({ value: s.value, label: s.label }))}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="All Stages"
              />
            </div>
            {/* Case Type Dropdown */}
            <div className="w-[150px]">
              <MultiSelectDropdown
                options={CASE_TYPES.map(ct => ({ value: ct, label: ct }))}
                value={caseTypeFilter}
                onChange={setCaseTypeFilter}
                placeholder="All Case Types"
              />
            </div>
            {/* Cascading Hierarchy Filter: Branch Manager, Team Leader, Executive */}
            <HierarchyCascadingFilter value={hierarchyFilter} onChange={setHierarchyFilter} />
            {/* Visual Date Range Filter (Goibibo Style) */}
            <VisualDateRangePicker
              startDate={dateFrom}
              endDate={dateTo}
              onChange={(start, end) => {
                setDateFrom(start);
                setDateTo(end);
                setAppliedDateFrom(start);
                setAppliedDateTo(end);
                setCurrentPage(1);
              }}
              onClear={() => {
                setDateFrom('');
                setDateTo('');
                setAppliedDateFrom('');
                setAppliedDateTo('');
                setCurrentPage(1);
              }}
            />
            {/* PDD Status Filter */}
            <div className="w-[150px]">
              <select
                value={pddStatusFilter}
                onChange={e => setPddStatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-slate-300 dark:border-zinc-700 bg-card text-xs font-medium text-foreground focus:outline-none focus:border-accent transition-all h-[38px] cursor-pointer shadow-sm"
              >
                <option value="all">All PDD Status</option>
                <option value="Completed">Completed</option>
                <option value="WIP">WIP</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
            {/* Disbursement Month Filter */}
            <div className="w-[180px]">
              <select
                value={disbursementMonthFilter}
                onChange={e => setDisbursementMonthFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-slate-300 dark:border-zinc-700 bg-card text-xs font-medium text-foreground focus:outline-none focus:border-accent transition-all h-[38px] cursor-pointer shadow-sm"
              >
                <option value="all">Disbursement Months</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
            <button
              onClick={() => {
                setAppliedSearch(search);
                setAppliedStatusFilter(statusFilter);
                setAppliedCaseTypeFilter(caseTypeFilter);
                setAppliedHierarchyFilter(hierarchyFilter);
                setAppliedDateFrom(dateFrom);
                setAppliedDateTo(dateTo);
                setAppliedPddStatusFilter(pddStatusFilter);
                setAppliedDisbursementMonthFilter(disbursementMonthFilter);
                setCurrentPage(1);
                setShowFilters(false);
              }}
              className="px-6 py-2 rounded-md bg-primary text-primary-foreground font-bold hover:bg-primary/90 text-xs transition-all shadow-md h-[38px] flex items-center justify-center whitespace-nowrap"
            >
              Apply Filter
            </button>
            <button
              onClick={() => {
                setSearch('');
                setCaseTypeFilter([]);
                setStatusFilter([]);
                setHierarchyFilter({ salesManager: [], branchManager: [], teamLeader: [], executive: [] });
                setDateFrom('');
                setDateTo('');
                setPddStatusFilter('all');
                setDisbursementMonthFilter('all');
                setAppliedSearch('');
                setAppliedStatusFilter([]);
                setAppliedCaseTypeFilter([]);
                setAppliedHierarchyFilter({ salesManager: [], branchManager: [], teamLeader: [], executive: [] });
                setAppliedDateFrom('');
                setAppliedDateTo('');
                setAppliedPddStatusFilter('all');
                setAppliedDisbursementMonthFilter('all');
                setCurrentPage(1);
                if (location.search) {
                  navigate('/loans', { replace: true });
                }
              }}
              className="px-6 py-2 rounded-md border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-muted text-xs font-medium transition-all h-[38px] flex items-center justify-center whitespace-nowrap shadow-sm"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Mobile sticky toolbar — sticks below header on scroll */}
      <div className="sm:hidden sticky -top-4 z-40 bg-background/95 backdrop-blur-md border border-border shadow-sm px-3 pt-2 pb-2 space-y-2 -mx-2 mb-4 rounded-b-2xl -mt-4">
          {/* Title row */}
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">{total} found</span>
          </div>
          {/* Row 1: buttons */}
          <div className="flex items-center gap-1.5 w-full">
            {!isExecutive && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex-1 flex items-center justify-center gap-1 bg-muted text-foreground font-semibold py-2 rounded-xl text-xs whitespace-nowrap w-full">
                    <Download size={13} /> Download <ChevronDown size={12} className="opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="bg-popover border border-border z-50 min-w-[150px] rounded-xl p-1 shadow-md">
                  <DropdownMenuItem onClick={handleExport} className="cursor-pointer flex items-center gap-2 px-3 py-2 text-xs rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors">
                    <Download size={13} /> Export
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => importRef.current?.click()} className="cursor-pointer flex items-center gap-2 px-3 py-2 text-xs rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors">
                    <Upload size={13} /> Import
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {/* Row 2: all filters */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-2 rounded-xl border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all" 
              />
            </div>
            <div className="w-[110px] shrink-0">
              <MultiSelectDropdown
                options={APPLICATION_STAGES.map(s => ({ value: s.value, label: s.label }))}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Stage"
                className="py-2"
              />
            </div>
            <div className="w-[100px] shrink-0">
              <MultiSelectDropdown
                options={CASE_TYPES.map(ct => ({ value: ct, label: ct }))}
                value={caseTypeFilter}
                onChange={setCaseTypeFilter}
                placeholder="Type"
                className="py-2"
              />
            </div>
            {(search || caseTypeFilter.length > 0 || statusFilter.length > 0 || dateFrom || dateTo || pddStatusFilter !== 'all' || disbursementMonthFilter !== 'all' || (hierarchyFilter.salesManager || []).length > 0 || (hierarchyFilter.branchManager || []).length > 0 || (hierarchyFilter.teamLeader || []).length > 0 || (hierarchyFilter.executive || []).length > 0) && (
              <button
                onClick={() => { setSearch(''); setCaseTypeFilter([]); setStatusFilter([]); setDateFrom(''); setDateTo(''); setPddStatusFilter('all'); setDisbursementMonthFilter('all'); setHierarchyFilter({ salesManager: [], branchManager: [], teamLeader: [], executive: [] }); }}
                className="shrink-0 px-2 py-2 rounded-xl border border-red-300 bg-red-50 text-red-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
          {/* Row 3: hierarchy filters (mobile) */}
          <div className="flex items-center gap-1.5">
            <HierarchyCascadingFilter value={hierarchyFilter} onChange={setHierarchyFilter} />
          </div>
          {/* Row 4: PDD Status & Disbursement Month (mobile) */}
          <div className="flex items-center gap-1.5">
            <select
              value={pddStatusFilter}
              onChange={e => setPddStatusFilter(e.target.value)}
              className="w-1/2 px-3 py-2 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all h-9 cursor-pointer"
            >
              <option value="all">All PDD Status</option>
              <option value="Completed">Completed</option>
              <option value="WIP">WIP</option>
              <option value="Pending">Pending</option>
            </select>
            <select
              value={disbursementMonthFilter}
              onChange={e => setDisbursementMonthFilter(e.target.value)}
              className="w-1/2 px-3 py-2 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all h-9 cursor-pointer"
            >
              <option value="all">All Disbursement Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>
          {/* Row 5: Date Range (mobile) */}
          <div className="w-full">
            <VisualDateRangePicker
              startDate={dateFrom}
              endDate={dateTo}
              onChange={(start, end) => {
                setDateFrom(start);
                setDateTo(end);
                setAppliedDateFrom(start);
                setAppliedDateTo(end);
                setCurrentPage(1);
              }}
              onClear={() => {
                setDateFrom('');
                setDateTo('');
                setAppliedDateFrom('');
                setAppliedDateTo('');
                setCurrentPage(1);
              }}
              className="w-full"
            />
          </div>
        </div>

      {/* Mobile Card View — only on screens < lg */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading applications…</div>
        ) : loansError ? (
          <div className="py-12 text-center">
            <div className="text-red-500 font-medium mb-2">Failed to load loans</div>
            <div className="text-sm text-muted-foreground mb-4">{(loansError as Error).message}</div>
            <button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['loans'] })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              Retry
            </button>
          </div>
        ) : total === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No applications found</div>
        ) : (
          <>
            {paginatedLoans.map((loan: any) => (
            <div
              key={loan.id}
              onClick={() => navigate(`/loans/${loan.id}`)}
              className="bg-card w-full shadow-sm hover:shadow-md border border-border/50 rounded-2xl overflow-hidden p-5 active:scale-[0.99] transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-lg tracking-tight truncate">{loan.applicant_name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <p className="text-xs font-semibold text-primary/70 bg-primary/5 border border-primary/10 px-2 py-0.5 rounded-md font-mono inline-block">{loan.loan_number || loan.id}</p>
                    <LoanStageTimer createdAt={loan.created_at} applicationStage={loan.application_stage} stageChangedAt={loan.stage_changed_at} timerEnabled={isLoginStageEnabled()} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {loan.created_at ? new Date(loan.created_at.endsWith('Z') || loan.created_at.includes('+') ? loan.created_at : loan.created_at.replace(' ','T') + '+05:30').toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : '—'}
                  </p>
                </div>
                <LoanStatusBadge applicationStage={loan.application_stage} applicationStageLabel={loan.application_stage_label} />
              </div>
              <div className="grid grid-cols-2 gap-4 py-3 border-y border-border">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Amount</p>
                  <p className="font-bold text-foreground text-base">{formatCurrency(Number(loan.loan_amount))}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Bank</p>
                  <p className="font-medium text-foreground truncate">{loan.bank_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Case Type</p>
                  <p className="font-medium text-foreground truncate">{loan.case_type || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Sourcing</p>
                  <p className="font-medium text-foreground truncate">{loan.assigned_to_name || loan.sourcing_person_name_display || loan.sourcing_person_name || '—'}</p>
                  {loan.sourcing_manager_name && <p className="text-[10px] text-muted-foreground truncate pt-0.5">{loan.sourcing_manager_name}</p>}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Converted By</p>
                  <p className="font-medium text-foreground truncate">{loan.created_by_name || '—'}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                {canEditLoan && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/loans/edit/${loan.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:bg-blue-500/10 transition-colors"
                  >
                    <Edit2 size={14} className="text-blue-500" /> Edit
                  </button>
                  <button
                    onClick={() => void openShareMenu(loan)}
                    disabled={sharingLoanId === String(loan.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:bg-green-500/10 transition-colors">
                    <MessageCircle size={14} className="text-green-500" />
                    Share
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(loan)}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                </div>
                )}
                {showUpdateColumn && (
                  <button
                    onClick={() => handleStageUpdate(loan)}
                    disabled={(['SUBMITTED', 'LOGIN'].includes(loan.application_stage) && isLoginStageEnabled()) && isLoanTimerExpired(loan.created_at, loan.application_stage, loan.stage_changed_at)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mt-1 rounded-lg border border-border bg-muted/30 text-xs font-semibold text-foreground hover:bg-muted/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-muted/30"
                    title={(['SUBMITTED', 'LOGIN'].includes(loan.application_stage) && isLoginStageEnabled()) && isLoanTimerExpired(loan.created_at, loan.application_stage, loan.stage_changed_at) ? 'Time expired' : 'Update Stage'}
                  >
                    <Settings size={14} /> Update Stage
                  </button>
                )}
              </div>
            </div>
            ))}
            
            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 pb-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card text-foreground disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card text-foreground disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <Sheet open={showShareMenu} onOpenChange={setShowShareMenu}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl px-5 pb-6 pt-5">
          <SheetHeader>
            <SheetTitle>Share Loan</SheetTitle>
          </SheetHeader>
          <div className="mt-5 space-y-3">
            <button
              onClick={async () => {
                setShowShareMenu(false);
                if (shareMenuLoan) {
                  await handleShareLoan(shareMenuLoan);
                }
              }}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Share PDF</p>
                  <p className="text-xs text-muted-foreground">Saved loan PDF only</p>
                </div>
                <Share2 size={18} className="text-blue-500 shrink-0" />
              </div>
            </button>
            <button
              onClick={async () => {
                setShowShareMenu(false);
                if (shareMenuLoan) {
                  await handleShareDocs(shareMenuLoan);
                }
              }}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Share Images</p>
                  <p className="text-xs text-muted-foreground">All loan documents</p>
                </div>
                <FileText size={18} className="text-green-500 shrink-0" />
              </div>
            </button>
            <button
              onClick={async () => {
                setShowShareMenu(false);
                if (shareMenuLoan) {
                  const docs = await api.get(`/loans/${shareMenuLoan.id}/documents`);
                  const uniqueDocs = docs.filter((doc: any, index: number, self: any[]) => {
                    const firstIndex = self.findIndex(d =>
                      d.document_type === doc.document_type &&
                      d.file_name === doc.file_name
                    );
                    return index === firstIndex;
                  });
                  downloadLoanPDF(shareMenuLoan, uniqueDocs);
                }
              }}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Download PDF</p>
                  <p className="text-xs text-muted-foreground">Save a copy on this device</p>
                </div>
                <Download size={18} className="text-accent shrink-0" />
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Table View — only on lg+ screens */}
      <div className="stat-card max-lg:hidden" style={{ height: 'calc(100vh - 120px)', overflowY: 'auto', overflowX: 'auto', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 }}>
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading applications…</div>
        ) : loansError ? (
          <div className="py-12 text-center">
            <div className="text-red-500 font-medium mb-2">Failed to load loans</div>
            <div className="text-sm text-muted-foreground mb-4">{(loansError as Error).message}</div>
            <button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['loans'] })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              Retry
            </button>
          </div>
        ) : (
          <div>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-1 pl-4 font-bold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border uppercase tracking-wider w-[110px] min-w-[110px]">Loan ID</th>
                  <th className="text-left py-2 px-1 font-bold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border uppercase tracking-wider w-[130px] min-w-[130px]">Applicant</th>
                  <th className="text-left py-2 px-1 font-bold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border uppercase tracking-wider w-[150px] min-w-[150px]">Vehicle</th>
                  <th className="text-left py-2 px-1 font-bold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border uppercase tracking-wider w-[90px] min-w-[90px]">Case Type</th>
                  <th className="text-left py-2 px-1 font-bold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border uppercase tracking-wider w-[140px] min-w-[140px]">Bank</th>
                  <th className="text-left py-2 px-1 font-bold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border uppercase tracking-wider w-[145px] min-w-[145px]">Sourcing</th>
                  <th className="text-left py-2 px-1 font-bold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border uppercase tracking-wider w-[125px] min-w-[125px]">Converted By</th>
                  <th className="text-right py-2 px-1 font-bold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border tracking-wider w-[90px] min-w-[90px]">Amount</th>
                  <th className="text-left py-2 px-1 font-bold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border uppercase tracking-wider w-[110px] min-w-[110px]">Stage</th>
                  <th className={`text-left py-2 pl-1 font-bold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border uppercase tracking-wider w-[80px] min-w-[80px] ${showUpdateColumn ? 'pr-1' : 'pr-4'}`}>Actions</th>
                  {showUpdateColumn && (
                    <th className="text-left py-2 pl-1 pr-4 font-bold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border uppercase tracking-wider w-[90px] min-w-[90px]">Update</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedLoans.map((loan: any) => (
                  <tr key={loan.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => navigate(`/loans/${loan.id}`)}>
                    <td className="py-2.5 pr-1 pl-4 whitespace-nowrap w-[110px] min-w-[110px]">
                      <p className="font-mono text-[10px] text-primary font-semibold">{loan.loan_number || loan.id}</p>
                      <p className="text-[9px] text-muted-foreground">
                        {loan.created_at ? new Date(loan.created_at.endsWith('Z') || loan.created_at.includes('+') ? loan.created_at : loan.created_at.replace(' ','T') + '+05:30').toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : '—'}
                      </p>
                      <LoanStageTimer createdAt={loan.created_at} applicationStage={loan.application_stage} stageChangedAt={loan.stage_changed_at} timerEnabled={isLoginStageEnabled()} />
                    </td>
                    <td className="py-2.5 px-1 whitespace-nowrap w-[130px] min-w-[130px]">
                      <p className="font-medium text-foreground text-[10px] max-w-[120px] truncate" title={loan.applicant_name}>{loan.applicant_name}</p>
                      <p className="text-[9px] text-muted-foreground">
                        {loan.mobile ? <MaskedMobile mobile={loan.mobile} /> : '—'}
                      </p>
                    </td>
                    <td className="py-2.5 px-1 whitespace-nowrap w-[150px] min-w-[150px]">
                      <div className="relative group/vehicle inline-block max-w-[140px]">
                        <p className="text-foreground text-[10px] cursor-help font-medium transition-colors hover:text-primary truncate" title={loan.model_variant_name || loan.car_variant || loan.maker_model || loan.car_model || '—'}>
                          {truncateVehicleName(loan.model_variant_name || loan.car_variant || loan.maker_model || loan.car_model)}
                        </p>
                        <div className="absolute left-0 bottom-full mb-1.5 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] rounded shadow-md opacity-0 group-hover/vehicle:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                          {loan.model_variant_name || loan.car_variant || loan.maker_model || loan.car_model || '—'}
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground max-w-[140px] truncate" title={loan.vehicle_number || ''}>{loan.vehicle_number || '—'}</p>
                    </td>
                    <td className="py-2.5 px-1 text-muted-foreground whitespace-nowrap text-[10px] w-[90px] min-w-[90px] max-w-[90px] truncate" title={loan.case_type || '—'}>{loan.case_type || '—'}</td>
                    <td className="py-2.5 px-1 text-muted-foreground whitespace-nowrap text-[10px] w-[140px] min-w-[140px] max-w-[140px] truncate" title={loan.bank_name || '—'}>{loan.bank_name || '—'}</td>
                    <td className="py-2.5 px-1 whitespace-nowrap w-[145px] min-w-[145px]">
                      <p className="text-foreground text-[10px] max-w-[135px] truncate" title={loan.assigned_to_name || loan.sourcing_person_name_display || loan.sourcing_person_name || '—'}>{loan.assigned_to_name || loan.sourcing_person_name_display || loan.sourcing_person_name || '—'}</p>
                      {loan.sourcing_manager_name && <p className="text-[9px] text-muted-foreground max-w-[135px] truncate" title={loan.sourcing_manager_name}>{loan.sourcing_manager_name}</p>}
                    </td>
                    <td className="py-2.5 px-1 text-muted-foreground whitespace-nowrap text-[10px] w-[125px] min-w-[125px] max-w-[125px] truncate" title={loan.created_by_name || '—'}>{loan.created_by_name || '—'}</td>
                    <td className="py-2.5 px-1 text-right font-semibold text-foreground whitespace-nowrap text-[10px] w-[90px] min-w-[90px]">{formatCurrency(Number(loan.loan_amount))}</td>
                    <td className="py-2.5 px-1 whitespace-nowrap w-[110px] min-w-[110px]"><LoanStatusBadge applicationStage={loan.application_stage} applicationStageLabel={loan.application_stage_label} /></td>
                    <td className={`py-2.5 pl-1 whitespace-nowrap w-[80px] min-w-[80px]`} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {!isExecutive && (
                        <button
                          onClick={() => exportLoanPDF(loan)}
                          className="p-1 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-accent/10 transition-colors"
                          title="Export PDF"
                        >
                          <Printer size={11} className="text-accent" />
                        </button>
                        )}
                        {!isExecutive && <div className="relative group/share">
                          <button
                            disabled={sharingLoanId === String(loan.id)}
                            className="p-1 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-green-500/10 transition-colors" title="Share options">
                            <MessageCircle size={11} className="text-green-500" />
                          </button>
                          <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover/share:opacity-100 group-hover/share:visible transition-all z-50">
                            <button
                              onClick={async () => {
                                const loanId = String(loan.id);
                                const bundle = shareBundles[loanId];
                                if (!bundle) {
                                  toast.info('Loading PDF…');
                                  return;
                                }
                                if (!navigator.share) {
                                  toast.error('Sharing not available');
                                  return;
                                }
                                try {
                                  if (navigator.canShare && !navigator.canShare({ files: bundle.files })) {
                                    toast.error('Cannot share on this device');
                                    return;
                                  }
                                  try { await navigator.clipboard.writeText(bundle.text); toast.success('Message copied to clipboard! You can paste it when sharing.'); } catch(e){}
                                  await navigator.share({
                                    title: bundle.title,
                                    text: bundle.text,
                                    files: bundle.files,
                                  });
                                  toast.success('Shared PDF!');
                                } catch (error: any) {
                                  if (error?.name !== 'AbortError') {
                                    toast.error(error?.message || 'Failed to share');
                                  }
                                }
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 flex items-center gap-2 border-b border-border/50"
                            >
                              <Share2 size={10} className="text-blue-500" />
                              Share PDF
                            </button>
                            <button
                              onClick={async () => {
                                const loanId = String(loan.id);
                                const bundle = documentBundles[loanId];
                                if (!bundle) {
                                  toast.info('Loading documents…');
                                  return;
                                }
                                if (!navigator.share) {
                                  toast.error('Sharing not available');
                                  return;
                                }
                                try {
                                  if (navigator.canShare && !navigator.canShare({ files: bundle.files })) {
                                    toast.error('Cannot share on this device');
                                    return;
                                  }
                                  try { await navigator.clipboard.writeText(bundle.text); toast.success('Message copied to clipboard! You can paste it when sharing.'); } catch(e){}
                                  await navigator.share({
                                    title: bundle.title,
                                    text: bundle.text,
                                    files: bundle.files,
                                  });
                                  toast.success(`Shared ${bundle.docCount} documents!`);
                                } catch (error: any) {
                                  if (error?.name !== 'AbortError') {
                                    toast.error(error?.message || 'Failed to share');
                                  }
                                }
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 flex items-center gap-2 border-b border-border/50"
                            >
                              <FileText size={10} className="text-green-500" />
                              Share Images
                            </button>
                            <button
                              onClick={async () => {
                                const docs = await api.get(`/loans/${loan.id}/documents`);
                                const uniqueDocs = docs.filter((doc: any, index: number, self: any[]) => {
                                  const firstIndex = self.findIndex(d =>
                                    d.document_type === doc.document_type &&
                                    d.file_name === doc.file_name
                                  );
                                  return index === firstIndex;
                                });
                                downloadLoanPDF(loan, uniqueDocs);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 flex items-center gap-2"
                            >
                              <Download size={10} className="text-accent" />
                              Download PDF
                            </button>
                          </div>
                        </div>}

                        {canEditLoan && (
                          <button
                            onClick={() => navigate(`/loans/edit/${loan.id}`)}
                            className="p-1 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-blue-500/10 transition-colors" title="Edit Loan">
                            <Edit2 size={11} className="text-blue-500" />
                          </button>
                        )}
                      </div>
                    </td>
                    {showUpdateColumn && (
                      <td className="py-2.5 pl-1 pr-4 whitespace-nowrap w-[90px] min-w-[90px]" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleStageUpdate(loan)}
                          disabled={(['SUBMITTED', 'LOGIN'].includes(loan.application_stage) && isLoginStageEnabled()) && isLoanTimerExpired(loan.created_at, loan.application_stage, loan.stage_changed_at)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-card text-[10px] font-medium text-foreground hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-card"
                          title={(['SUBMITTED', 'LOGIN'].includes(loan.application_stage) && isLoginStageEnabled()) && isLoanTimerExpired(loan.created_at, loan.application_stage, loan.stage_changed_at) ? 'Time expired' : 'Update Stage'}
                        >
                          <Settings size={11} /> Update
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {total === 0 && !isLoading && (
              <div className="py-20 text-center text-muted-foreground bg-muted/5">
                <p className="font-medium">No loans match your search criteria</p>
              </div>
            )}

            {/* Desktop Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-card border-t border-border mt-2 rounded-xl sticky left-0">
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, total)}</span> of{' '}
                      <span className="font-medium">{total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border hover:bg-muted focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors"
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronRight className="h-4 w-4 rotate-180" aria-hidden="true" />
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-foreground ring-1 ring-inset ring-border focus:z-20 focus:outline-offset-0 bg-accent/5">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border hover:bg-muted focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors"
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Loan Application Stage Manager Modal */}
      {showStageManager && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <LoanApplicationStageManager
            loan={selectedLoan}
            isOpen={showStageManager}
            onClose={() => {
              setShowStageManager(false);
              setSelectedLoan(null);
            }}
          />
        </Suspense>
      )}
      </div>
    </>
  );
}

export default function Loans() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return <MobileLoansWorkflow />;
  }

  return <DesktopLoansWorkflow />;
}

  