import { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, Download, Eye, FileText, Filter, Loader2, Search, X, Zap } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import RtoSummaryBar from '@/components/rto/RtoSummaryBar';
import { RtoFlagBadge, TxnCell, RcCell, txnText, rcText, istDateTime, istShort } from '@/components/rto/rtoShared';

const getPddDays = (loan: any): number | null => {
  if (!loan.disbursement_date) return null;
  const days = Math.floor((Date.now() - new Date(loan.disbursement_date).getTime()) / 86400000);
  return days >= 1 ? days : null;
};

const formatDate = (value: string | null | undefined) => value
  ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const getExecutiveName = (loan: any) => loan.assigned_to_name || loan.sourcing_person_name || loan.created_by_name || '—';
const getManagerName = (loan: any) => loan.branch_manager_name || loan.sourcing_manager_name || '—';
const getDsaBmName = (loan: any) => {
  const role = String(loan.created_by_role || '').trim().toLowerCase();
  if (role === 'dsa') return loan.assigned_to_name || loan.sourcing_person_name || loan.created_by_name || '—';
  if (role === 'branch_manager') return loan.branch_manager_name || loan.sourcing_manager_name || loan.created_by_name || '—';
  // If created by executive or other role, fallback to their reporting DSA or Branch Manager
  return loan.branch_dsa_manager_name || loan.branch_manager_name || loan.sourcing_manager_name || '—';
};
const maskMobile = (m: string) => m.length > 4 ? `${m.slice(0, 2)}XXXXXX${m.slice(-2)}` : m;
function MaskedMobile({ mobile }: { mobile: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-default font-mono"
    >
      {hovered ? mobile : maskMobile(mobile)}
    </span>
  );
}

const getStatusValue = (loan: any) => String(loan.pdd_status || 'Pending').toLowerCase() === 'in progress' ? 'WIP' : (loan.pdd_status || 'Pending');
const getStatusClass = (status: string) => {
  if (status.toLowerCase() === 'completed') return 'bg-green-100 text-green-700';
  if (status.toLowerCase() === 'wip' || status.toLowerCase() === 'in progress') return 'bg-blue-100 text-blue-700';
  return 'bg-amber-100 text-amber-700';
};

export default function PDDTracking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [daysFilter, setDaysFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [managerSearch, setManagerSearch] = useState('');
  const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);
  const managerDropdownRef = useRef<HTMLDivElement>(null);
  const managerButtonRef = useRef<HTMLButtonElement>(null);
  const [managerDropdownCoords, setManagerDropdownCoords] = useState<{ top: number; left: number } | null>(null);
  const [lenderFilter, setLenderFilter] = useState('all');
  const [lenderSearch, setLenderSearch] = useState('');
  const [lenderDropdownOpen, setLenderDropdownOpen] = useState(false);
  const lenderButtonRef = useRef<HTMLButtonElement>(null);
  const lenderDropdownRef = useRef<HTMLDivElement>(null);
  const [lenderDropdownCoords, setLenderDropdownCoords] = useState<{ top: number; left: number } | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [draftFromDate, setDraftFromDate] = useState('');
  const [draftToDate, setDraftToDate] = useState('');
  const dateFilterButtonRef = useRef<HTMLButtonElement>(null);
  const dateFilterPopupRef = useRef<HTMLDivElement>(null);
  const [popupCoords, setPopupCoords] = useState<{ top: number; right: number } | null>(null);
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState('');
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const seenLoansRef = useRef(new Map<number, any>());
  const queryClient = useQueryClient();
  const pageSize = 20;

  const isSalesManager = user?.role === 'sales_manager';
  const isAdmin = user?.role === 'admin';
  const isLoanOps = user?.role === 'loan_operations';
  const isOps = user?.role === 'operation_team' || user?.role === 'ops_team' || isLoanOps;
  const isBranchManagerOrDsa = user?.role === 'branch_manager' || user?.role === 'dsa';
  const canUpdatePdd = user?.role === 'admin' || isOps;
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [isProcessingRc, setIsProcessingRc] = useState(false);

  const handleProcess = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessingRc(true);
    let successCount = 0;

    // Selection can span pages, so read each selected loan from what has been loaded.
    const selected = Array.from(selectedIds).map(id => seenLoansRef.current.get(id)).filter(Boolean);
    for (const loan of selected) {
      if (!loan.vehicle_number) continue;
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rc-verification/lookup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            },
            body: JSON.stringify({
              rc_number: loan.vehicle_number,
              _source: 'pdd-process',
              force_fresh: true,
            }),
          }
        );
        const data = await res.json();
        const rc = data?.data;
        if (data.success && rc) {
          const rcDetails = rc.rc_details || rc.rc_data || rc;
          const extractedFinancer = rcDetails.financer || rcDetails.finance_details?.financer;
          const isNotFinanced = rcDetails.financed === false || rcDetails.finance_status === 'Not Financed';
          const newHpn = extractedFinancer ? extractedFinancer : (isNotFinanced ? 'NO HPN' : '');

          const putRes = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${loan.id}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
              },
              body: JSON.stringify({ new_hpn: newHpn }),
            }
          );
          if (putRes.ok) {
            successCount++;
          }
        }
      } catch (e) {
        console.error('RC lookup error:', e);
      }
    }

    setIsProcessingRc(false);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['pdd-management-loans'] });
    if (successCount > 0) {
      toast.success(`Successfully processed and updated ${successCount} RC(s)!`);
    } else {
      toast.error('Failed to process the selected RC(s).');
    }
  };

  const handleSinglePddStatus = async (loanId: number, status: string) => {
    setUpdatingId(loanId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${loanId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify({ pdd_status: status }),
        }
      );
      if (!response.ok) {
        throw new Error('Failed to update PDD Status');
      }
      queryClient.invalidateQueries({ queryKey: ['pdd-management-loans'] });
      toast.success(`PDD Status updated to "${status}"`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update PDD Status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBulkPddStatus = async (status: string) => {
    setBulkUpdating(true);
    await Promise.all(
      Array.from(selectedIds).map(id =>
        fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
            body: JSON.stringify({ pdd_status: status }),
          }
        ).catch(() => { })
      )
    );
    queryClient.invalidateQueries({ queryKey: ['pdd-management-loans'] });
    setSelectedIds(new Set());
    setBulkUpdating(false);
    toast.success(`PDD Status updated to "${status}" for ${selectedIds.size} record(s).`);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dateFilterPopupRef.current && !dateFilterPopupRef.current.contains(e.target as Node) &&
        dateFilterButtonRef.current && !dateFilterButtonRef.current.contains(e.target as Node)
      ) {
        setDateRangeOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reposition portal popup on scroll/resize so it tracks the button
  useEffect(() => {
    if (!dateRangeOpen) return;
    const reposition = () => {
      if (!dateFilterButtonRef.current) return;
      const rect = dateFilterButtonRef.current.getBoundingClientRect();
      setPopupCoords({ top: rect.bottom + window.scrollY + 6, right: window.innerWidth - rect.right });
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [dateRangeOpen]);

  // Close manager dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        managerDropdownRef.current && !managerDropdownRef.current.contains(e.target as Node) &&
        managerButtonRef.current && !managerButtonRef.current.contains(e.target as Node)
      ) {
        setManagerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reposition manager dropdown portal on scroll/resize
  useEffect(() => {
    if (!managerDropdownOpen) return;
    const reposition = () => {
      if (!managerButtonRef.current) return;
      const rect = managerButtonRef.current.getBoundingClientRect();
      setManagerDropdownCoords({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [managerDropdownOpen]);

  // Close lender dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        lenderDropdownRef.current && !lenderDropdownRef.current.contains(e.target as Node) &&
        lenderButtonRef.current && !lenderButtonRef.current.contains(e.target as Node)
      ) {
        setLenderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reposition lender dropdown portal on scroll/resize
  useEffect(() => {
    if (!lenderDropdownOpen) return;
    const reposition = () => {
      if (!lenderButtonRef.current) return;
      const rect = lenderButtonRef.current.getBoundingClientRect();
      setLenderDropdownCoords({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [lenderDropdownOpen]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const buildPddParams = (requestedPage: number, limit: number) => {
    const params = new URLSearchParams({ view: 'pdd', page: String(requestedPage), limit: String(limit) });
    if (debouncedSearch.trim()) params.set('pdd_search', debouncedSearch.trim());
    if (statusFilter !== 'all') params.set('pdd_status', statusFilter);
    if (daysFilter !== 'all') params.set('pdd_days', daysFilter);
    if (managerFilter !== 'all') params.set(isAdmin ? 'pdd_manager_id' : 'pdd_manager_name', managerFilter);
    if (lenderFilter !== 'all') params.set('pdd_lender', lenderFilter);
    if (fromDate) params.set('disbursed_from', fromDate);
    if (toDate) params.set('disbursed_to', toDate);
    if (userTypeFilter === 'dsa' || userTypeFilter === 'branch_manager') params.set('pdd_user_type', userTypeFilter);
    if (selectedUser) params.set('created_by', selectedUser);
    return params;
  };

  const pddParams = buildPddParams(page, pageSize).toString();
  const { data: pddPage, isLoading, isError, refetch } = useQuery({
    queryKey: ['pdd-management-loans', pddParams],
    queryFn: () => api.get<any>(`/loans?${pddParams}`),
    placeholderData: keepPreviousData,
  });
  const visibleLoans: any[] = pddPage?.data ?? [];
  const totalLoans: number = pddPage?.total ?? 0;
  const totalPages = Math.max(1, pddPage?.totalPages ?? 1);

  useEffect(() => {
    visibleLoans.forEach(loan => seenLoansRef.current.set(loan.id, loan));
  }, [pddPage]);

  // RTO (VAHAN) flags for the loans on this page.
  const rtoIds = visibleLoans.map((loan: any) => loan.id).filter(Boolean).join(',');
  const { data: rtoFlags } = useQuery({
    queryKey: ['rto-flags', rtoIds],
    queryFn: async () => {
      const res: any = await api.get(`/rto/flags?ids=${rtoIds}`);
      return new Map<number, any>((res?.data ?? []).map((f: any) => [f.loan_id, f]));
    },
    enabled: rtoIds.length > 0,
    staleTime: 60_000,
  });
  const rtoOf = (loan: any) => rtoFlags?.get(loan.id);

  // A bulk update can empty the last page of a filtered list.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const hasManagerNameFilter = !isAdmin && !isSalesManager && !isBranchManagerOrDsa;
  const { data: managerNames = [] } = useQuery<string[]>({
    queryKey: ['pdd-manager-names'],
    queryFn: async () => {
      const response = await api.get<any>('/loans?view=pdd&facet=managers');
      return response?.managers ?? [];
    },
    enabled: hasManagerNameFilter,
  });

  const { data: smTeamMembers = [] } = useQuery({
    queryKey: ['pdd-sm-team'],
    queryFn: async () => {
      const response = await api.get('/users/my-team/hierarchy');
      const tree = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
      const flatten = (nodes: any[]): { id: string; name: string; role: string }[] =>
        nodes.flatMap(n => [
          { id: String(n.id || ''), name: String(n.full_name || n.name || ''), role: String(n.role || '') },
          ...flatten(n.team_members || []),
        ]);
      return flatten(tree).filter(m => m.id && m.name);
    },
    enabled: isSalesManager || isBranchManagerOrDsa,
  });

  const { data: userList = [] } = useQuery({
    queryKey: ['pdd-management-users', userTypeFilter],
    queryFn: async () => {
      const role = userTypeFilter === 'dsa' ? 'dsa'
        : userTypeFilter === 'branch_manager' ? 'branch_manager'
          : userTypeFilter === 'sales_manager' ? 'sales_manager'
            : userTypeFilter === 'executive' ? 'executive'
              : 'team_leader';
      const response = await api.get(`/users/by-role?roles=${role}`);
      const data = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
      return data.map((user: any) => ({
        id: String(user.id || user.user_id || ''),
        name: String(user.full_name || user.name || user.display_name || user.created_by_name || 'Unknown'),
      })).filter((user: any) => user.id);
    },
    enabled: userTypeFilter === 'dsa' || userTypeFilter === 'branch_manager' || userTypeFilter === 'sales_manager' || userTypeFilter === 'executive' || userTypeFilter === 'team_leader',
  });

  // For Sales Manager and BM/DSA: derive user list directly from their hierarchy
  // (by-role API is admin-only). For admin: use the by-role API result as-is.
  const filteredUserList = useMemo(() => {
    if (isBranchManagerOrDsa) {
      if (userTypeFilter === 'executive') return smTeamMembers.filter((m: any) => m.role === 'executive');
      if (userTypeFilter === 'team_leader') return smTeamMembers.filter((m: any) => m.role === 'team_leader');
      return [];
    }
    if (isSalesManager) {
      if (userTypeFilter === 'dsa') return smTeamMembers.filter((m: any) => m.role === 'dsa');
      if (userTypeFilter === 'branch_manager') return smTeamMembers.filter((m: any) => m.role === 'branch_manager');
      return [];
    }
    // Admin: use the by-role API result directly (covers dsa, branch_manager, sales_manager)
    return userList;
  }, [userList, isSalesManager, isBranchManagerOrDsa, userTypeFilter, smTeamMembers]);

  // Fetch all banks for lender filter
  const { data: allBanks = [] } = useQuery({
    queryKey: ['pdd-all-banks'],
    queryFn: async () => {
      const response = await api.get('/banks');
      const data = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
      return data.map((bank: any) => ({
        id: String(bank.id || ''),
        name: String(bank.name || ''),
      })).filter((bank: any) => bank.id && bank.name).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  // Fetch all users across key roles for admin's Manager filter
  const { data: allManagerUsers = [] } = useQuery({
    queryKey: ['pdd-all-manager-users'],
    queryFn: async () => {
      const roles = ['sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'];
      const results = await Promise.all(
        roles.map(role =>
          api.get(`/users/by-role?roles=${role}`)
            .then((res: any) => {
              const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
              return data.map((u: any) => ({
                id: String(u.id || u.user_id || ''),
                name: String(u.full_name || u.name || u.display_name || 'Unknown'),
                role,
              }));
            })
            .catch(() => [])
        )
      );
      return results.flat().filter(u => u.id && u.name);
    },
    enabled: isAdmin,
  });

  const filterOptions = { managers: managerNames, lenders: allBanks.map(bank => bank.name) };

  const formatDisplayDate = (value: string) => {
    if (!value) return '';
    const [y, m, d] = value.split('-');
    return `${d}-${m}-${y}`;
  };
  const dateRangeLabel = fromDate || toDate
    ? fromDate && toDate ? `${formatDisplayDate(fromDate)} → ${formatDisplayDate(toDate)}`
      : fromDate ? `From ${formatDisplayDate(fromDate)}` : `To ${formatDisplayDate(toDate)}`
    : 'Date';

  const setFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };
  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setDaysFilter('all');
    setManagerFilter('all');
    setManagerSearch('');
    setManagerDropdownOpen(false);
    setLenderFilter('all');
    setLenderSearch('');
    setLenderDropdownOpen(false);
    setFromDate('');
    setToDate('');
    setUserTypeFilter('all');
    setSelectedUser('');
    setPage(1);
  };
  const applyMobileFilters = () => setMobileFiltersOpen(false);

  const exportToExcel = async () => {
    setExporting(true);
    try {
      // Export every filtered record, not just the page on screen.
      const loansById = new Map<number, any>();
      let lastPage = 1;
      for (let requestedPage = 1; requestedPage <= lastPage; requestedPage++) {
        const response = await api.get<any>(`/loans?${buildPddParams(requestedPage, 500).toString()}`);
        (response?.data ?? []).forEach((loan: any) => loansById.set(loan.id, loan));
        lastPage = response?.totalPages ?? 1;
      }
      const sorted = Array.from(loansById.values()).sort((a: any, b: any) => (getPddDays(b) ?? -1) - (getPddDays(a) ?? -1));
      // RTO (VAHAN) progress for every exported loan, 500 ids per call
      const rtoById = new Map<number, any>();
      const exportIds = sorted.map((l: any) => l.id).filter(Boolean);
      for (let i = 0; i < exportIds.length; i += 500) {
        const res: any = await api.get(`/rto/flags?ids=${exportIds.slice(i, i + 500).join(',')}`).catch(() => null);
        (res?.data ?? []).forEach((f: any) => rtoById.set(f.loan_id, f));
      }
      const FLAG_LABEL: Record<string, string> = { REGULAR: 'Regular', OBSERVATION: 'Observation', RED_ALERT: 'Red Alert' };
    const rows = sorted.map((loan: any) => ({
      'Date of Disbursement': formatDate(loan.disbursement_date),
      'Customer Name': loan.applicant_name || '',
      'Lead ID': loan.loan_number || loan.id || '',
      'Vehicle Number': loan.vehicle_number || '',
      'Vehicle Name': loan.model_variant_name || loan.maker_model || loan.car_model || '',
      'Lender': loan.bank_name || loan.financier_name || '',
      'Case Type': loan.case_type || '',
      'Loan Account Number': loan.loan_account_number || '',
      'PDD Days Count': getPddDays(loan) ?? '',
      'PDD Status': loan.pdd_status || 'Pending',
      'Executive': loan.assigned_to_name || loan.sourcing_person_name || loan.created_by_name || '',
      'Team Leader': loan.team_leader_name || '',
      'Branch Manager': loan.branch_manager_name || '',
      'DSA': String(loan.created_by_role || '').trim().toLowerCase() === 'dsa' ? (loan.assigned_to_name || loan.sourcing_person_name || loan.created_by_name || '') : (loan.branch_dsa_manager_name || ''),
      'Sales Manager': loan.sales_manager_name || '',
      'RTO Flag': FLAG_LABEL[rtoById.get(loan.id)?.flag] || (rtoById.get(loan.id) ? '' : 'Not checked'),
      'RTO Reason': rtoById.get(loan.id)?.flag_reason || '',
      'HPT (Txn 1)': txnText(rtoById.get(loan.id)?.txn?.HPT),
      'TO (Txn 2)': txnText(rtoById.get(loan.id)?.txn?.TO),
      'HPA (Txn 3)': txnText(rtoById.get(loan.id)?.txn?.HPA),
      'RC Lender Check': rcText(rtoById.get(loan.id)?.rc_lender_match, rtoById.get(loan.id)?.rc_financer),
      'RC Financer (RC)': rtoById.get(loan.id)?.rc_financer || '',
      'RC Checked On': rtoById.get(loan.id)?.rc_checked_at ? istDateTime(rtoById.get(loan.id).rc_checked_at) : '',
      'RTO Last Checked': rtoById.get(loan.id)?.last_checked_at ? istDateTime(rtoById.get(loan.id).last_checked_at) : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PDD Management');
    XLSX.writeFile(wb, `PDD_Management_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      toast.error('Failed to export PDD records. Please try again.');
    } finally {
      setExporting(false);
    }
  };
  const leadView = (loan: any) => {
    const loanId = loan.loan_id || loan.id;
    if (!loanId) return;
    const route = user?.role === 'operation_team' || user?.role === 'ops_team' || user?.role === 'loan_operations'
      ? `/ops/loans/${loanId}`
      : `/loans/${loanId}`;
    navigate(route);
  };

  const renderLender = (loan: any) => (
    <div className="min-w-0">
      <p className="font-semibold text-foreground truncate">{loan.bank_name || loan.financier_name || '—'}</p>
      {loan.case_type && <p className="text-[10px] text-muted-foreground truncate">({loan.case_type})</p>}
    </div>
  );

  return (
    <div className="min-w-0 w-full space-y-3 -mt-3 sm:-mt-4 xl:-mt-5">
      <div className="md:hidden flex items-center gap-2 pb-1">
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={event => setFilter(setSearch, event.target.value)} placeholder="Search customer, mobile, RC…" className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-accent" />
        </div>
        <button type="button" aria-label="Open filters" onClick={() => setMobileFiltersOpen(true)} className="h-11 w-11 shrink-0 rounded-xl border border-border bg-primary/10 text-primary flex items-center justify-center"><Filter size={19} /></button>
      </div>

      {canUpdatePdd && selectedIds.size > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <span className="text-xs text-muted-foreground font-medium mr-1">
            {selectedIds.size === 1 ? '1 case selected' : `${selectedIds.size} cases selected`}
          </span>
          <button
            onClick={handleProcess}
            disabled={isProcessingRc}
            className={`px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm ${isProcessingRc ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isProcessingRc ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
            {isProcessingRc ? 'Processing...' : 'Process RC'}
          </button>
          <button
            onClick={() => handleBulkPddStatus('In Progress')}
            disabled={bulkUpdating}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60"
          >
            {bulkUpdating ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} In Progress
          </button>
          <button
            onClick={() => handleBulkPddStatus('Completed')}
            disabled={bulkUpdating}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-60"
          >
            {bulkUpdating ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Completed
          </button>
        </div>
      )}

      <div className="hidden md:flex md:flex-nowrap items-center gap-2 p-2 bg-card border border-border rounded-lg overflow-x-auto overflow-y-visible">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={event => setFilter(setSearch, event.target.value)} placeholder="Search customer, mobile, RC, lender…" className="w-full h-7 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:border-accent" />
        </div>
        <select value={statusFilter} onChange={event => setFilter(setStatusFilter, event.target.value)} className="h-7 flex-shrink-0 rounded-lg border border-border bg-background px-1 text-xs text-foreground min-w-[6rem]">
          <option value="all">All PDD Status</option><option>Completed</option><option>WIP</option><option>Pending</option>
        </select>
        <select value={daysFilter} onChange={event => setFilter(setDaysFilter, event.target.value)} className="h-7 flex-shrink-0 rounded-lg border border-border bg-background px-1 text-xs text-foreground min-w-[6rem]">
          <option value="all">All PDD Days</option><option value="1-30">1–30</option><option value="31-45">31–45</option><option value="46-60">46–60</option><option value="61-90">61–90</option><option value="90+">90+</option>
        </select>
        {!isBranchManagerOrDsa && !isAdmin && !isSalesManager && <select value={managerFilter} onChange={event => setFilter(setManagerFilter, event.target.value)} className="h-7 flex-shrink-0 rounded-lg border border-border bg-background px-1 text-xs text-foreground min-w-[6rem]"><option value="all">All Managers</option>{filterOptions.managers.map(name => <option key={name}>{name}</option>)}</select>}
        {isAdmin && (() => {
          const roleLabel: Record<string, string> = { sales_manager: 'SM', branch_manager: 'BM', dsa: 'DSA', team_leader: 'TL', executive: 'Exec' };
          const selectedManagerName = managerFilter !== 'all' ? (allManagerUsers.find((u: any) => u.id === managerFilter)?.name ?? 'All Managers') : 'All Managers';
          const visibleUsers = managerSearch.trim()
            ? allManagerUsers.filter((u: any) => u.name.toLowerCase().includes(managerSearch.trim().toLowerCase()))
            : allManagerUsers;
          return (
            <div className="relative flex-shrink-0">
              <button
                ref={managerButtonRef}
                type="button"
                onClick={() => { setManagerDropdownOpen(prev => !prev); setManagerSearch(''); }}
                className={`h-7 flex items-center gap-1 rounded-lg border px-2 text-xs font-medium transition-colors min-w-[7rem] max-w-[10rem] truncate ${managerFilter !== 'all' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-background border-border text-foreground hover:bg-muted'
                  }`}
              >
                <span className="truncate">{selectedManagerName}</span>
                {managerFilter !== 'all' && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={e => { e.stopPropagation(); setFilter(setManagerFilter, 'all'); setManagerDropdownOpen(false); }}
                    onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), setFilter(setManagerFilter, 'all'), setManagerDropdownOpen(false))}
                    className="ml-1 text-primary/60 hover:text-primary"
                  ><X size={11} /></span>
                )}
              </button>
              {managerDropdownOpen && managerDropdownCoords && ReactDOM.createPortal(
                <div
                  ref={managerDropdownRef}
                  style={{ position: 'absolute', top: managerDropdownCoords.top, left: managerDropdownCoords.left, zIndex: 99999, width: '15rem' }}
                  className="rounded-xl border border-border bg-background shadow-xl overflow-hidden"
                >
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <input
                        autoFocus
                        type="text"
                        value={managerSearch}
                        onChange={e => setManagerSearch(e.target.value)}
                        placeholder="Search user..."
                        className="w-full h-7 pl-6 pr-2 rounded-lg border border-border bg-muted/30 text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    <button
                      type="button"
                      onClick={() => { setFilter(setManagerFilter, 'all'); setManagerDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 ${managerFilter === 'all' ? 'font-semibold text-primary' : 'text-foreground'}`}
                    >
                      All Managers
                    </button>
                    {visibleUsers.length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">No users found</p>
                    )}
                    {visibleUsers.map((u: any) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { setFilter(setManagerFilter, u.id); setManagerDropdownOpen(false); setManagerSearch(''); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 flex items-center justify-between gap-2 ${managerFilter === u.id ? 'font-semibold text-primary bg-primary/5' : 'text-foreground'}`}
                      >
                        <span className="truncate">{u.name}</span>
                        <span className="shrink-0 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{roleLabel[u.role] ?? u.role}</span>
                      </button>
                    ))}
                  </div>
                </div>,
                document.body
              )}
            </div>
          );
        })()}
        <div className="relative flex-shrink-0">
          <button
            ref={lenderButtonRef}
            type="button"
            onClick={() => { setLenderDropdownOpen(prev => !prev); setLenderSearch(''); }}
            className={`h-7 flex items-center gap-1 rounded-lg border px-2 text-xs font-medium transition-colors min-w-[5rem] max-w-[10rem] ${lenderFilter !== 'all' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-background border-border text-foreground hover:bg-muted'
              }`}
          >
            <span className="truncate">{lenderFilter !== 'all' ? lenderFilter : 'All Lenders'}</span>
            {lenderFilter !== 'all' && (
              <span
                role="button"
                tabIndex={0}
                onClick={e => { e.stopPropagation(); setFilter(setLenderFilter, 'all'); setLenderDropdownOpen(false); }}
                onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), setFilter(setLenderFilter, 'all'), setLenderDropdownOpen(false))}
                className="ml-1 text-primary/60 hover:text-primary shrink-0"
              ><X size={11} /></span>
            )}
          </button>
          {lenderDropdownOpen && lenderDropdownCoords && ReactDOM.createPortal(
            <div
              ref={lenderDropdownRef}
              style={{ position: 'absolute', top: lenderDropdownCoords.top, left: lenderDropdownCoords.left, zIndex: 99999, width: '14rem' }}
              className="rounded-xl border border-border bg-background shadow-xl overflow-hidden"
            >
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    autoFocus
                    type="text"
                    value={lenderSearch}
                    onChange={e => setLenderSearch(e.target.value)}
                    placeholder="Search lender..."
                    className="w-full h-7 pl-6 pr-2 rounded-lg border border-border bg-muted/30 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                <button
                  type="button"
                  onClick={() => { setFilter(setLenderFilter, 'all'); setLenderDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 ${lenderFilter === 'all' ? 'font-semibold text-primary' : 'text-foreground'}`}
                >
                  All Lenders
                </button>
                {filterOptions.lenders
                  .filter(name => !lenderSearch.trim() || name.toLowerCase().includes(lenderSearch.trim().toLowerCase()))
                  .map(name => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => { setFilter(setLenderFilter, name); setLenderDropdownOpen(false); setLenderSearch(''); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 truncate ${lenderFilter === name ? 'font-semibold text-primary bg-primary/5' : 'text-foreground'}`}
                    >
                      {name}
                    </button>
                  ))}
                {lenderSearch.trim() && !filterOptions.lenders.some(n => n.toLowerCase().includes(lenderSearch.trim().toLowerCase())) && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No lenders found</p>
                )}
              </div>
            </div>,
            document.body
          )}
        </div>
        <div className="relative flex-shrink-0">
          <button
            type="button"
            ref={dateFilterButtonRef}
            onClick={() => {
              setDraftFromDate(fromDate);
              setDraftToDate(toDate);
              setDateRangeOpen(prev => !prev);
            }}
            className={`h-7 flex items-center gap-1.5 rounded-lg border px-1.5 text-xs font-bold transition-all duration-200 min-w-[7rem] ${fromDate || toDate || dateRangeOpen
                ? 'text-white border-transparent shadow-md'
                : 'bg-background text-foreground border-border hover:bg-muted'
              }`}
            style={(fromDate || toDate || dateRangeOpen) ? { backgroundColor: 'hsl(215 55% 28%)' } : {}}
          >
            <Calendar size={14} />
            <span>{dateRangeLabel}</span>
          </button>
        </div>
        {dateRangeOpen && popupCoords && ReactDOM.createPortal(
          <div
            ref={dateFilterPopupRef}
            style={{ position: 'absolute', top: popupCoords.top, right: popupCoords.right, zIndex: 99999 }}
            className="w-72 rounded-xl border border-border bg-background p-3 shadow-xl"
          >
            <div className="space-y-2 text-[11px] text-foreground">
              <div>
                <label className="mb-1 block font-semibold text-muted-foreground">From Date</label>
                <input
                  type="date"
                  value={draftFromDate}
                  onChange={e => setDraftFromDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-muted-foreground">To Date</label>
                <input
                  type="date"
                  value={draftToDate}
                  onChange={e => setDraftToDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setDraftFromDate(''); setDraftToDate(''); setFromDate(''); setToDate(''); setPage(1); setDateRangeOpen(false); }}
                  className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => { setFilter(setFromDate, draftFromDate); setFilter(setToDate, draftToDate); setDateRangeOpen(false); }}
                  className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
        <select
          className="h-7 flex-shrink-0 rounded-lg border border-border bg-background px-1 text-xs text-foreground min-w-[10rem]"
          value={selectedUser || userTypeFilter}
          onChange={event => {
            const val = event.target.value;
            if (val === 'all' || val === 'dsa' || val === 'branch_manager' || val === 'sales_manager' || val === 'executive' || val === 'team_leader') {
              setFilter(setUserTypeFilter, val);
              setSelectedUser('');
            } else {
              setFilter(setSelectedUser, val);
            }
          }}
        >
          <option value="all">All User Types</option>
          {!isBranchManagerOrDsa && <option value="dsa">DSA</option>}
          {!isBranchManagerOrDsa && <option value="branch_manager">Branch Manager</option>}
          {!isBranchManagerOrDsa && !isSalesManager && <option value="sales_manager">Sales Manager</option>}
          {isBranchManagerOrDsa && <option value="executive">Executive</option>}
          {isBranchManagerOrDsa && <option value="team_leader">Team Leader</option>}
          {(userTypeFilter === 'dsa' || userTypeFilter === 'branch_manager' || userTypeFilter === 'sales_manager' || userTypeFilter === 'executive' || userTypeFilter === 'team_leader') && filteredUserList.length > 0 && (
            <optgroup label={
              userTypeFilter === 'dsa' ? 'DSA Users' :
                userTypeFilter === 'branch_manager' ? 'Branch Managers' :
                  userTypeFilter === 'sales_manager' ? 'Sales Managers' :
                    userTypeFilter === 'executive' ? 'Executives' : 'Team Leaders'
            }>
              {filteredUserList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </optgroup>
          )}
        </select>
        <button type="button" onClick={resetFilters} aria-label="Reset filters" className="h-7 w-9 flex-shrink-0 rounded-lg border border-border bg-background text-muted-foreground flex items-center justify-center hover:bg-muted">
          <X size={16} />
        </button>
        <button type="button" onClick={exportToExcel} disabled={exporting} aria-label="Export to Excel" className="h-7 flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-60">
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export
        </button>
      </div>

      {mobileFiltersOpen && (
        <div className="md:hidden fixed inset-0 z-[100] bg-black/30" onClick={() => setMobileFiltersOpen(false)}>
          <section role="dialog" aria-modal="true" aria-label="Filters" onClick={event => event.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-hidden rounded-t-[26px] bg-background shadow-2xl">
            <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-muted-foreground/25" />
            <div className="flex items-center justify-between border-b border-border px-5 pb-3 pt-4">
              <h2 className="text-xl font-bold text-foreground">Filters</h2>
              <button type="button" aria-label="Close filters" onClick={() => setMobileFiltersOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground"><X size={24} /></button>
            </div>
            <div className="max-h-[calc(88vh-136px)] space-y-4 overflow-y-auto px-5 py-4 pb-28">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">PDD Days<select value={daysFilter} onChange={event => setFilter(setDaysFilter, event.target.value)} className="mt-1 block h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal normal-case text-foreground"><option value="all">All PDD Days</option><option value="1-30">1–30</option><option value="31-45">31–45</option><option value="46-60">46–60</option><option value="61-90">61–90</option><option value="90+">90+</option></select></label>
              {!isBranchManagerOrDsa && !isAdmin && !isSalesManager && <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Manager Filter<select value={managerFilter} onChange={event => setFilter(setManagerFilter, event.target.value)} className="mt-1 block h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal normal-case text-foreground"><option value="all">All Managers</option>{filterOptions.managers.map(name => <option key={name}>{name}</option>)}</select></label>}
              {isAdmin && (() => {
                const roleLabel: Record<string, string> = { sales_manager: 'SM', branch_manager: 'BM', dsa: 'DSA', team_leader: 'TL', executive: 'Exec' };
                const visibleUsers = managerSearch.trim()
                  ? allManagerUsers.filter((u: any) => u.name.toLowerCase().includes(managerSearch.trim().toLowerCase()))
                  : allManagerUsers;
                return (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Manager Filter</p>
                    <div className="relative mb-2">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        value={managerSearch}
                        onChange={e => setManagerSearch(e.target.value)}
                        placeholder="Search user..."
                        className="w-full h-10 pl-8 pr-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="rounded-xl border border-border bg-background overflow-hidden max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => setFilter(setManagerFilter, 'all')}
                        className={`w-full text-left px-3 py-2.5 text-sm border-b border-border/50 ${managerFilter === 'all' ? 'font-semibold text-primary bg-primary/5' : 'text-foreground hover:bg-muted/40'}`}
                      >
                        All Managers
                      </button>
                      {visibleUsers.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No users found</p>}
                      {visibleUsers.map((u: any) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setFilter(setManagerFilter, u.id)}
                          className={`w-full text-left px-3 py-2.5 text-sm border-b border-border/50 flex items-center justify-between gap-2 ${managerFilter === u.id ? 'font-semibold text-primary bg-primary/5' : 'text-foreground hover:bg-muted/40'}`}
                        >
                          <span>{u.name}</span>
                          <span className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{roleLabel[u.role] ?? u.role}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lender Filter
                <div className="mt-1">
                  <div className="relative mb-1.5">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={lenderSearch}
                      onChange={e => setLenderSearch(e.target.value)}
                      placeholder="Search lender..."
                      className="w-full h-10 pl-8 pr-3 rounded-xl border border-border bg-background text-sm font-normal normal-case focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="rounded-xl border border-border bg-background overflow-hidden max-h-48 overflow-y-auto">
                    <button type="button" onClick={() => setFilter(setLenderFilter, 'all')} className={`w-full text-left px-3 py-2.5 text-sm border-b border-border/50 font-normal normal-case ${lenderFilter === 'all' ? 'font-semibold text-primary bg-primary/5' : 'text-foreground hover:bg-muted/40'}`}>All Lenders</button>
                    {filterOptions.lenders
                      .filter(name => !lenderSearch.trim() || name.toLowerCase().includes(lenderSearch.trim().toLowerCase()))
                      .map(name => (
                        <button key={name} type="button" onClick={() => setFilter(setLenderFilter, name)} className={`w-full text-left px-3 py-2.5 text-sm border-b border-border/50 font-normal normal-case truncate ${lenderFilter === name ? 'font-semibold text-primary bg-primary/5' : 'text-foreground hover:bg-muted/40'}`}>{name}</button>
                      ))}
                    {lenderSearch.trim() && !filterOptions.lenders.some(n => n.toLowerCase().includes(lenderSearch.trim().toLowerCase())) && (
                      <p className="px-3 py-2 text-sm text-muted-foreground font-normal normal-case">No lenders found</p>
                    )}
                  </div>
                </div>
              </label>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Disbursement Date</p>
                <button
                  type="button"
                  onClick={() => { setDraftFromDate(fromDate); setDraftToDate(toDate); setDateRangeOpen(prev => !prev); }}
                  className={`mt-1 flex h-12 w-full items-center justify-between rounded-xl border px-3 text-sm font-normal transition-all duration-200 ${fromDate || toDate || dateRangeOpen ? 'text-white border-transparent' : 'bg-background text-foreground border-border'
                    }`}
                  style={(fromDate || toDate || dateRangeOpen) ? { backgroundColor: 'hsl(215 55% 28%)' } : {}}
                >
                  <span>{dateRangeLabel}</span>
                  <Calendar size={16} className={fromDate || toDate || dateRangeOpen ? 'text-white' : 'text-muted-foreground'} />
                </button>
                {dateRangeOpen && (
                  <div className="mt-2 rounded-xl border border-border bg-background p-3">
                    <div className="space-y-2 text-[11px] text-foreground">
                      <div>
                        <label className="mb-1 block font-semibold text-muted-foreground">From Date</label>
                        <input aria-label="From date" type="date" value={draftFromDate} onChange={e => setDraftFromDate(e.target.value)} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" />
                      </div>
                      <div>
                        <label className="mb-1 block font-semibold text-muted-foreground">To Date</label>
                        <input aria-label="To date" type="date" value={draftToDate} onChange={e => setDraftToDate(e.target.value)} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button type="button" onClick={() => { setDraftFromDate(''); setDraftToDate(''); setFromDate(''); setToDate(''); setPage(1); setDateRangeOpen(false); }} className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted">Clear</button>
                        <button type="button" onClick={() => { setFilter(setFromDate, draftFromDate); setFilter(setToDate, draftToDate); setDateRangeOpen(false); }} className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground">Apply</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">PDD Status<select value={statusFilter} onChange={event => setFilter(setStatusFilter, event.target.value)} className="mt-1 block h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal normal-case text-foreground"><option value="all">All PDD Status</option><option>Completed</option><option>WIP</option><option>Pending</option></select></label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">User Type<select value={userTypeFilter} onChange={event => { const value = event.target.value; setFilter(setUserTypeFilter, value); setSelectedUser(''); }} className="mt-1 block h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal normal-case text-foreground"><option value="all">All User Type</option>{!isBranchManagerOrDsa && <option value="dsa">DSA</option>}{!isBranchManagerOrDsa && <option value="branch_manager">Branch Manager</option>}{!isBranchManagerOrDsa && !isSalesManager && <option value="sales_manager">Sales Manager</option>}{isBranchManagerOrDsa && <option value="executive">Executive</option>}{isBranchManagerOrDsa && <option value="team_leader">Team Leader</option>}</select></label>
              {userTypeFilter === 'dsa' && (
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">DSA<select value={selectedUser} onChange={event => setFilter(setSelectedUser, event.target.value)} className="mt-1 block h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal normal-case text-foreground"><option value="">All DSAs</option>{filteredUserList.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
              )}
              {userTypeFilter === 'branch_manager' && (
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Branch Manager<select value={selectedUser} onChange={event => setFilter(setSelectedUser, event.target.value)} className="mt-1 block h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal normal-case text-foreground"><option value="">All Branch Managers</option>{filteredUserList.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
              )}
              {userTypeFilter === 'sales_manager' && (
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sales Manager<select value={selectedUser} onChange={event => setFilter(setSelectedUser, event.target.value)} className="mt-1 block h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal normal-case text-foreground"><option value="">All Sales Managers</option>{filteredUserList.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
              )}
              {userTypeFilter === 'executive' && (
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Executive<select value={selectedUser} onChange={event => setFilter(setSelectedUser, event.target.value)} className="mt-1 block h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal normal-case text-foreground"><option value="">All Executives</option>{filteredUserList.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
              )}
              {userTypeFilter === 'team_leader' && (
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Team Leader<select value={selectedUser} onChange={event => setFilter(setSelectedUser, event.target.value)} className="mt-1 block h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal normal-case text-foreground"><option value="">All Team Leaders</option>{filteredUserList.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 flex gap-3 border-t border-border bg-background px-5 py-4"><button type="button" onClick={resetFilters} className="h-12 flex-1 rounded-xl border border-primary text-primary text-sm font-bold">Reset</button><button type="button" onClick={applyMobileFilters} className="h-12 flex-1 rounded-xl bg-primary text-primary-foreground text-sm font-bold">Apply</button></div>
          </section>
        </div>
      )}

      {(isAdmin || isOps) && <RtoSummaryBar onOpenLoan={(loanId) => leadView({ id: loanId })} />}

      {isLoading ? <div className="stat-card py-12 text-center text-sm text-muted-foreground">Loading PDD records…</div> : isError ? <div className="stat-card py-12 text-center"><p className="text-sm font-semibold text-foreground">Could not load PDD records</p><button type="button" onClick={() => refetch()} className="mt-2 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted">Try again</button></div> : totalLoans === 0 ? <div className="stat-card py-12 text-center"><FileText size={28} className="mx-auto mb-2 text-muted-foreground" /><p className="text-sm font-semibold text-foreground">No PDD records found</p><p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p></div> : (
        <>
          <div className="md:hidden space-y-4">
            {visibleLoans.map((loan: any) => <div key={loan.id} className="stat-card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-sm text-foreground">{loan.applicant_name || '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{loan.mobile || '—'}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-1 tracking-wider uppercase">{loan.vehicle_number || '—'}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusClass(getStatusValue(loan))}`}>{getStatusValue(loan)}</span>
                  <RtoFlagBadge flag={rtoOf(loan)?.flag} reason={rtoOf(loan)?.flag_reason} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-y border-border py-3 text-xs"><div><p className="text-muted-foreground">Date of Disbursement</p><p className="font-semibold mt-0.5">{formatDate(loan.disbursement_date)}</p></div><div><p className="text-muted-foreground">Lender (Case Type)</p>{renderLender(loan)}</div><div><p className="text-muted-foreground">Executive (Manager)</p><p className="font-semibold truncate mt-0.5">{getExecutiveName(loan)} <span className="font-normal text-muted-foreground">({getManagerName(loan)})</span></p></div><div><p className="text-muted-foreground">PDD Days Count</p><p className="font-semibold mt-0.5">{getPddDays(loan) ?? '—'}{getPddDays(loan) !== null ? ' days' : ''}</p></div></div>
              <button type="button" disabled={!loan.id} onClick={() => leadView(loan)} className="w-full flex items-center justify-center gap-2 py-2 bg-accent text-accent-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"><Eye size={14} /> Lead View</button>
            </div>)}
          </div>

          <div className="hidden md:block stat-card overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-border bg-muted/40">
            {canUpdatePdd && (
              <th className="px-2 py-2 w-8">
                {!isLoanOps ? (
                  <input
                    type="checkbox"
                    className="accent-emerald-600"
                    checked={selectedIds.size === visibleLoans.length && visibleLoans.length > 0}
                    onChange={() => selectedIds.size === visibleLoans.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(visibleLoans.map((l: any) => l.id)))}
                  />
                ) : null}
              </th>
            )}
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap">Date of Disbursement</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap">Customer Name</th><th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground">RC Number</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground">Mobile Number</th><th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground">Lender Name (Case Type)</th><th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground">DSA/BM</th><th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground">PDD Days Count</th><th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground">PDD Status</th><th className="px-2 py-2 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap" title="RTO (VAHAN) status">RTO Flag</th><th className="px-2 py-2 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap" title="Hypothecation Termination">HPT<span className="block font-normal">Txn 1</span></th><th className="px-2 py-2 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap" title="Transfer of Ownership">TO<span className="block font-normal">Txn 2</span></th><th className="px-2 py-2 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap" title="Hypothecation Addition">HPA<span className="block font-normal">Txn 3</span></th><th className="px-2 py-2 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap" title="RC financer vs our lender, checked 24h after HPA">RC Lender</th><th className="px-2 py-2 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap">RTO Checked</th><th className="px-3 py-2 text-right text-[10px] font-semibold text-muted-foreground">Lead View</th>
          </tr></thead><tbody className="divide-y divide-border/50">{visibleLoans.map((loan: any) => <tr key={loan.id} className={`hover:bg-muted/20 ${selectedIds.has(loan.id) ? 'bg-emerald-50/50' : ''}`}>{canUpdatePdd && (
            <td className="px-2 py-2">
              <input
                type="checkbox"
                className="accent-emerald-600 scale-90 cursor-pointer"
                checked={selectedIds.has(loan.id)}
                onChange={() => {
                  if (isLoanOps) {
                    setSelectedIds(prev => (prev.has(loan.id) ? new Set() : new Set([loan.id])));
                  } else {
                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      next.has(loan.id) ? next.delete(loan.id) : next.add(loan.id);
                      return next;
                    });
                  }
                }}
              />
            </td>
          )}<td className="px-3 py-2 text-xs whitespace-nowrap">{formatDate(loan.disbursement_date)}</td><td className="px-3 py-2 text-xs font-semibold">{loan.applicant_name || '—'}</td><td className="px-3 py-2 text-xs uppercase tracking-wider font-medium">{loan.vehicle_number || '—'}</td><td className="px-3 py-2 text-xs whitespace-nowrap">{loan.mobile ? <MaskedMobile mobile={loan.mobile} /> : '—'}</td><td className="px-3 py-2 text-xs">{renderLender(loan)}</td><td className="px-3 py-2 text-xs font-semibold">{getDsaBmName(loan)}</td><td className="px-3 py-2 text-xs">{getPddDays(loan) ?? '—'}{getPddDays(loan) !== null ? ' days' : ''}</td><td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusClass(getStatusValue(loan))}`}>{getStatusValue(loan)}</span></td><td className="px-2 py-2"><RtoFlagBadge flag={rtoOf(loan)?.flag} reason={rtoOf(loan)?.flag_reason} /></td><td className="px-2 py-2"><TxnCell t={rtoOf(loan)?.txn?.HPT} /></td><td className="px-2 py-2"><TxnCell t={rtoOf(loan)?.txn?.TO} /></td><td className="px-2 py-2"><TxnCell t={rtoOf(loan)?.txn?.HPA} /></td><td className="px-2 py-2"><RcCell match={rtoOf(loan)?.rc_lender_match} financer={rtoOf(loan)?.rc_financer} /></td><td className="px-2 py-2 text-[10px] text-muted-foreground whitespace-nowrap">{istShort(rtoOf(loan)?.last_checked_at)}</td><td className="px-3 py-2 text-right"><button type="button" disabled={!loan.id} onClick={() => leadView(loan)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/5 disabled:opacity-50"><Eye size={14} /> View</button></td></tr>)}</tbody></table></div></div>
        </>
      )}

      {!isLoading && !isError && totalLoans > 0 && <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalLoans)} of {totalLoans}</span><div className="flex items-center gap-2"><button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)} className="px-2.5 py-1.5 rounded-lg border border-border disabled:opacity-40">Previous</button><span>Page {page} of {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)} className="px-2.5 py-1.5 rounded-lg border border-border disabled:opacity-40">Next</button></div></div>}
    </div>
  );
}
