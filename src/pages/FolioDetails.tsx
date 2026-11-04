import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Search, X, RefreshCw } from 'lucide-react';
import FolioLedger from '@/components/FolioLedger';
import FolioCards from '@/components/FolioCards';
import RequestsTable from '@/components/RequestsTable';
import DraggableDocumentViewer from '@/components/DraggableDocumentViewer';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

const ROLE_SHORT_LABELS: Record<string, string> = {
  executive: 'Executive',
  team_leader: 'TL',
  branch_manager: 'BM',
  senior_manager: 'SM',
  sales_manager: 'SM',
  admin: 'Admin',
  ops_team: 'Ops',
  dsa: 'DSA',
};

function ApprovedPayments({ folio, onOpenViewer }: { folio: any; onOpenViewer?: (url: string, id: number) => void }) {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['folio-approved-payments', folio.id],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'all' });
      if (folio.loan_id) params.append('loanId', folio.loan_id.toString());
      if (folio.bill_number) params.append('billNumber', folio.bill_number);
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/payments?${params}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data;
    },
  });

  if (isLoading) return null;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-4 py-2 border-b border-border">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">All Requests</h3>
      </div>
      {payments.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-xs">No requests</div>
      ) : (
        <RequestsTable requests={payments} onOpenViewer={onOpenViewer} />
      )}
    </div>
  );
}

export default function FolioDetails() {
  const [searchParams] = useSearchParams();
  const folioId = searchParams.get('folio_id');
  const loanId = searchParams.get('loan_id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (loanId) {
      navigate(`/loans/${loanId}/payments`, { replace: true });
    }
  }, [loanId, navigate]);

  useEffect(() => {
    if (folio?.loan_id) {
      navigate(`/loans/${folio.loan_id}/payments`, { replace: true });
    }
  }, [folio?.loan_id, navigate]);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isSyncingTally, setIsSyncingTally] = useState(false);

  const handleManualTallySync = async () => {
    setIsSyncingTally(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/tally/sync-now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ['folio-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['tally-status'] });
      queryClient.invalidateQueries({ queryKey: ['folio-detail'] });
      queryClient.invalidateQueries({ queryKey: ['folio-ledger'] });

      if (response.ok && data.success) {
        toast.success('Synced with Tally', { description: data.message || 'Updated folio ledger entries from Tally.' });
      } else {
        toast.error('Sync Error', { description: data.error || 'Failed to sync with Tally.' });
      }
    } catch (err: any) {
      toast.error('Sync Error', { description: err.message || 'Network error syncing with Tally.' });
    } finally {
      setIsSyncingTally(false);
    }
  };
  const [viewers, setViewers] = useState<{ url: string; id: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [lenderSearchTerm, setLenderSearchTerm] = useState('');
  const [showLenderDropdown, setShowLenderDropdown] = useState(false);
  const [lenderSelectedIndex, setLenderSelectedIndex] = useState<number>(-1);
  const lenderDropdownRef = useRef<HTMLDivElement>(null);
  const [editData, setEditData] = useState({
    lender_name: '',
    bill_number: '',
    purpose: '',
    amount: 0,
    customer_name: '',
    loan_account_number: '',
    opening_balance: 0,
    current_balance: 0,
    mapped_customer_name: '',
    mapped_mobile: '',
    mapped_vehicle_number: '',
    mapped_maker_model: '',
    mapped_bank_nbfc: '',
    mapped_loan_amount: 0,
    mapped_roi: '',
    mapped_tenure: '',
    mapped_disbursement_date: '',
    mapped_pdd_status: '',
    mapped_created_by_name: '',
    mapped_created_by_role: '',
    mapped_team_leader_name: '',
    mapped_team_leader_role: '',
    mapped_branch_manager_name: '',
    mapped_branch_manager_role: '',
    mapped_senior_manager_name: '',
    mapped_senior_manager_role: '',
    selectedLoanId: null,
  });

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setSelectedSearchIndex(-1);
      return;
    }
    setSelectedSearchIndex(-1);
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans?search=${encodeURIComponent(searchQuery)}`,
          { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.filter((loan: any) => !loan.bill_number && (loan.disbursement_date || (loan.application_stage || '').toUpperCase() === 'DISBURSED')));
        }
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    if (searchResults.length > 0) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [searchResults]);

  const { data: folio, isLoading: folioLoading } = useQuery({
    queryKey: ['folio-detail', folioId, loanId],
    queryFn: async () => {
      if (!folioId && !loanId) return null;

      // If folioId is provided, fetch directly by folio id
      if (folioId) {
        try {
          const res = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/folio-accounts`,
            {
              headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
            }
          );
          if (!res.ok) return null;
          const data = await res.json();

          // Find by folio id
          const folioData = data.find((f: any) => f.id?.toString() === folioId);

          return folioData;
        } catch (err) {
          return null;
        }
      }

      // If loanId is provided, find by loan_id
      if (loanId) {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/folio-accounts`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
          }
        );
        if (!res.ok) return null;
        const data = await res.json();

        let folioData = data.find((f: any) => f.loan_id?.toString() === loanId);

        return folioData;
      }

      return null;
    },
    enabled: !!folioId || !!loanId,
  });

  const hierarchyChain = useMemo(() => {
    if (!folio) return [];
    const ROLE_LABELS: Record<string, string> = {
      executive: 'Executive',
      team_leader: 'Team Leader',
      branch_manager: 'Branch Manager',
      senior_manager: 'Sales Manager',
      sales_manager: 'Sales Manager',
      admin: 'Admin',
      accountant: 'Accountant',
      operation_team: 'Operations',
      loan_operations: 'Loan Operations',
      ops_team: 'Operations',
      manager: 'Manager',
      dsa: 'DSA',
      bm: 'Branch Manager',
      tl: 'Team Leader',
    };
    const result: Array<{ name: string, role: string }> = [];
    if (folio.created_by_name) {
      result.push({ name: folio.created_by_name, role: ROLE_LABELS[folio.created_by_role] || folio.created_by_role || 'Executive' });
    }
    if (folio.hierarchy && folio.hierarchy.length > 0) {
      folio.hierarchy.forEach((h: any) => {
        const label = ROLE_LABELS[h.role] || h.role || '';
        result.push({ name: h.person_name, role: label });
      });
    }
    return result;
  }, [folio]);

  const { data: lenders = [] } = useQuery({
    queryKey: ['lenders-for-folio-edit'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banks`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!showEdit,
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (lenderDropdownRef.current && !lenderDropdownRef.current.contains(e.target as Node)) {
        setShowLenderDropdown(false);
      }
    };
    if (showLenderDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLenderDropdown]);

  useEffect(() => {
    if (!folio) return;
    setEditData({
      lender_name: folio.lender_name || '',
      bill_number: folio.bill_number || '',
      purpose: folio.purpose || '',
      amount: folio.folio_amount || folio.amount || 0,
      customer_name: folio.customer_name || '',
      loan_account_number: folio.loan_account_number || '',
      opening_balance: folio.opening_balance || 0,
      current_balance: folio.current_balance || 0,
      mapped_customer_name: folio.mapped_customer_name || folio.customer_name || '',
      mapped_mobile: folio.mapped_mobile || folio.mobile || '',
      mapped_vehicle_number: folio.mapped_vehicle_number || folio.vehicle_number || '',
      mapped_maker_model: folio.mapped_maker_model || folio.maker_model || '',
      mapped_bank_nbfc: folio.mapped_bank_nbfc || folio.bank_nbfc || folio.lender_name || '',
      mapped_loan_amount: folio.mapped_loan_amount || folio.amount || folio.folio_amount || 0,
      mapped_roi: folio.mapped_roi || folio.roi || '',
      mapped_tenure: folio.mapped_tenure || folio.tenure || '',
      mapped_disbursement_date: folio.mapped_disbursement_date || folio.disbursement_date || '',
      mapped_pdd_status: (folio.mapped_pdd_status === 'yes' ? 'COMPLETED' : folio.mapped_pdd_status === 'no' ? 'PENDING' : folio.mapped_pdd_status) || (folio.pdd_status === 'yes' ? 'COMPLETED' : folio.pdd_status === 'no' ? 'PENDING' : folio.pdd_status) || '',
      mapped_created_by_name: folio.mapped_created_by_name || folio.created_by_name || '',
      mapped_created_by_role: folio.mapped_created_by_role || folio.created_by_role || '',
      mapped_team_leader_name: folio.mapped_team_leader_name || folio.team_leader_name || '',
      mapped_team_leader_role: folio.mapped_team_leader_role || folio.team_leader_role || '',
      mapped_branch_manager_name: folio.mapped_branch_manager_name || folio.branch_manager_name || '',
      mapped_branch_manager_role: folio.mapped_branch_manager_role || folio.branch_manager_role || '',
      mapped_senior_manager_name: folio.mapped_senior_manager_name || folio.senior_manager_name || '',
      mapped_senior_manager_role: folio.mapped_senior_manager_role || folio.senior_manager_role || '',
      selectedLoanId: null,
    });
  }, [folio]);

  const displayLoan = folio && {
    id: folio.loan_id,
    customer_name: folio.mapped_customer_name || folio.customer_name,
    applicant_name: folio.mapped_customer_name || folio.customer_name,
    mobile: folio.mapped_mobile || folio.mobile,
    applicant_mobile: folio.mapped_mobile || folio.mobile,
    vehicle_number: folio.mapped_vehicle_number || folio.vehicle_number,
    maker_model: folio.mapped_maker_model || folio.maker_model,
    bank_nbfc: folio.mapped_bank_nbfc || folio.bank_nbfc || folio.lender_name,
    loan_amount: folio.mapped_loan_amount || folio.amount || folio.folio_amount,
    roi: folio.mapped_roi || folio.roi,
    tenure: folio.mapped_tenure || folio.tenure,
    disbursement_date: folio.mapped_disbursement_date || folio.disbursement_date,
    pdd_status: folio.mapped_pdd_status || folio.pdd_status,
    created_by_name: folio.mapped_created_by_name || folio.created_by_name,
    created_by_role: folio.mapped_created_by_role || folio.created_by_role,
    team_leader_name: folio.mapped_team_leader_name || folio.team_leader_name,
    team_leader_role: folio.mapped_team_leader_role || folio.team_leader_role,
    branch_manager_name: folio.mapped_branch_manager_name || folio.branch_manager_name,
    branch_manager_role: folio.mapped_branch_manager_role || folio.branch_manager_role,
    senior_manager_name: folio.mapped_senior_manager_name || folio.senior_manager_name,
    senior_manager_role: folio.mapped_senior_manager_role || folio.senior_manager_role,
  };

  // Calculate PDD days count (days since disbursement)
  const calculatePDDDays = () => {
    if (!displayLoan || !displayLoan.disbursement_date) return null;
    const days = Math.floor(
      (Date.now() - new Date(displayLoan.disbursement_date).getTime()) / 86400000
    );
    return days >= 0 ? days : null;
  };

  const handleReceivePayment = async () => {
    if (!paymentAmount || isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!folio?.id) return;
    setIsSubmittingPayment(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/folio-accounts/${folio.id}/payment-received`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: JSON.stringify({ amount: parseFloat(paymentAmount), remarks: paymentRemarks }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit payment');
      toast.success(data.message || 'Payment processed successfully');
      setPaymentAmount('');
      setPaymentRemarks('');
      queryClient.invalidateQueries({ queryKey: ['folio-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['folio-detail'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const selectLoan = (loan: any) => {
    if (loan.bill_number && loan.bill_number !== folio?.bill_number) {
      toast.error(`This loan is already mapped to bill number ${loan.bill_number}`);
      setSearchQuery('');
      setSearchResults([]);
      return;
    }
    setEditData(prev => ({
      ...prev,
      mapped_customer_name: loan.applicant_name || loan.customer_name || '',
      mapped_mobile: loan.mobile || '',
      mapped_vehicle_number: loan.vehicle_number || '',
      mapped_maker_model: loan.maker_model || '',
      mapped_bank_nbfc: loan.bank_name || loan.financier_name || '',
      mapped_loan_amount: loan.loan_amount || 0,
      mapped_roi: loan.roi?.toString() || '',
      mapped_tenure: loan.tenure?.toString() || '',
      mapped_disbursement_date: loan.disbursement_date || '',
      mapped_pdd_status: loan.pdd_status === 'yes' ? 'COMPLETED' : loan.pdd_status === 'no' ? 'PENDING' : loan.pdd_status || '',
      mapped_created_by_name: loan.created_by_name || '',
      mapped_created_by_role: loan.created_by_role || '',
      mapped_team_leader_name: loan.team_leader_name || '',
      mapped_team_leader_role: loan.team_leader_role || '',
      mapped_branch_manager_name: loan.branch_dsa_manager_name || loan.branch_manager_name || '',
      mapped_branch_manager_role: loan.branch_manager_role || '',
      mapped_senior_manager_name: loan.sales_manager_name || loan.senior_manager_name || '',
      mapped_senior_manager_role: loan.senior_manager_role || '',
      loan_account_number: loan.loan_account_number || prev.loan_account_number,
      // Store selected loan ID for mapping - don't overwrite folio's bill_number
      selectedLoanId: loan.id,
    }));
    setSearchQuery(loan.applicant_name || loan.customer_name || loan.loan_number || '');
    setSearchResults([]);
  };

  if (folioLoading) {
    return <div className="py-20 text-center text-muted-foreground">Loading...</div>;
  }

  if (!folio) {
    return <div className="py-20 text-center text-muted-foreground">Folio not found</div>;
  }

  return (
    <div ref={pageRef} className="w-full max-w-7xl mx-auto -mt-4 space-y-4 sm:space-y-6">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-lg sm:text-2xl font-bold text-foreground">
          {folio.bill_number}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">₹</span>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Amount"
              className="w-24 pl-5 pr-2 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-medium"
              disabled={isSubmittingPayment}
            />
          </div>
          <input
            type="text"
            value={paymentRemarks}
            onChange={(e) => setPaymentRemarks(e.target.value)}
            placeholder="Remarks"
            className="w-32 px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-medium"
            disabled={isSubmittingPayment}
          />
          <button
            onClick={handleReceivePayment}
            disabled={isSubmittingPayment}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors text-xs font-bold disabled:opacity-50"
          >
            {isSubmittingPayment ? 'Processing...' : 'Receive'}
          </button>
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors text-xs font-semibold"
          >
            <Pencil size={14} />
            Edit
          </button>

          <button
            onClick={handleManualTallySync}
            disabled={isSyncingTally}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors text-xs font-semibold disabled:opacity-50"
            title="Sync with Remote Tally"
          >
            <RefreshCw size={14} className={isSyncingTally ? 'animate-spin' : ''} />
            {isSyncingTally ? 'Syncing...' : 'Sync Tally'}
          </button>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition"
          >
            <ArrowLeft size={18} />
            Back
          </button>
        </div>
      </div>

      {/* Mobile: Two Section Card Layout */}
      <div className="lg:hidden grid grid-cols-1 gap-2 sm:gap-3">
        {(folio.loan_id || folio.customer_name || folio.mapped_customer_name || folio.vehicle_number || folio.lender_name) ? (
          <div className="bg-card p-3 rounded-lg border border-border shadow-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">Customer Name</p>
                <p className="font-semibold text-foreground text-sm truncate">{displayLoan?.customer_name || displayLoan?.applicant_name || folio.customer_name || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">Mobile</p>
                <p className="font-semibold text-foreground text-sm">{displayLoan?.mobile || displayLoan?.applicant_mobile || folio.mapped_mobile || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">Vehicle Number</p>
                <p className="font-mono font-semibold text-foreground text-sm truncate">{displayLoan?.vehicle_number || folio.vehicle_number || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">Vehicle Model</p>
                <p className="font-semibold text-foreground text-sm truncate">{displayLoan?.maker_model || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">Disbursed Date</p>
                <p className="font-semibold text-foreground text-sm">
                  {displayLoan?.disbursement_date ? new Date(displayLoan.disbursement_date).toLocaleDateString('en-IN') : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">PDD Days</p>
                <p className="font-semibold text-foreground text-sm">
                  {calculatePDDDays() !== null ? `${calculatePDDDays()} days` : '-'}
                  <span className={`ml-2 inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${displayLoan?.pdd_status === 'yes' || displayLoan?.pdd_status === 'COMPLETED' || displayLoan?.pdd_status?.toLowerCase() === 'completed'
                    ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                    : displayLoan?.pdd_status === 'no' || displayLoan?.pdd_status === 'PENDING' || displayLoan?.pdd_status?.toLowerCase() === 'pending'
                      ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                      : 'bg-gray-500/10 text-gray-600 border border-gray-500/20'
                    }`}>
                    {displayLoan?.pdd_status === 'yes' || displayLoan?.pdd_status?.toLowerCase() === 'completed' ? 'COMPLETED' : displayLoan?.pdd_status === 'no' || displayLoan?.pdd_status?.toLowerCase() === 'pending' ? 'PENDING' : displayLoan?.pdd_status || '-'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">Lender/Bank</p>
                <p className="font-semibold text-foreground text-sm truncate">{displayLoan?.bank_nbfc || folio.lender_name || folio.bank_nbfc || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">Purpose</p>
                <p className="font-semibold text-foreground text-sm truncate">{(folio.purpose || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">Loan Amount</p>
                <p className="font-semibold text-foreground text-sm">{displayLoan?.loan_amount ? ('₹' + Number(displayLoan.loan_amount).toLocaleString('en-IN')) : (folio.amount ? ('₹' + Number(folio.amount).toLocaleString('en-IN')) : '-')}</p>
                <p className="text-muted-foreground text-[11px]">{displayLoan?.roi || '-'}% / {displayLoan?.tenure || '-'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card p-3 rounded-lg border border-border shadow-sm flex items-center justify-between">
            <p className="text-muted-foreground text-sm">No loan linked to this folio yet</p>
            <button onClick={() => setShowEdit(true)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700">Map Loan</button>
          </div>
        )}
        <div className="bg-card p-3 rounded-lg border border-border shadow-sm">
          <div className="space-y-2">
            <div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                {hierarchyChain.map((person, i) => (
                  <div key={i} className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-2 text-[10px] min-w-0">
                    <span className="text-muted-foreground text-[8px] uppercase font-semibold truncate">{person.role}</span>
                    <span className="font-medium text-foreground truncate text-[10px]">{person.name}</span>
                  </div>
                ))}
                {hierarchyChain.length === 0 && <p className="text-muted-foreground text-[10px] col-span-2">No data</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: Three Section Card Layout */}
      <div className="hidden lg:block">
        {(folio.loan_id || folio.customer_name || folio.mapped_customer_name || folio.vehicle_number || folio.lender_name) ? (
          <FolioCards
            customerName={displayLoan?.customer_name || displayLoan?.applicant_name || folio.customer_name || '-'}
            mobile={displayLoan?.mobile || displayLoan?.applicant_mobile || folio.mapped_mobile || '-'}
            disbursementDate={displayLoan?.disbursement_date ? new Date(displayLoan.disbursement_date).toLocaleDateString('en-IN') : '-'}
            pddDays={calculatePDDDays() !== null ? `${calculatePDDDays()} days` : '-'}
            pddStatus={displayLoan?.pdd_status || '-'}
            vehicleNumber={displayLoan?.vehicle_number || folio.vehicle_number || '-'}
            vehicleModel={displayLoan?.maker_model || '-'}
            lenderBank={displayLoan?.bank_nbfc || folio.lender_name || folio.bank_nbfc || '-'}
            loanAmount={'₹' + Number(displayLoan?.loan_amount || folio.amount || 0).toLocaleString('en-IN')}
            roi={displayLoan?.roi || '-'}
            tenure={displayLoan?.tenure || '-'}
            hierarchy={hierarchyChain}
          />
        ) : (
          <div className="lg:grid lg:grid-cols-3 gap-2">
            <div className="bg-card p-3 rounded-lg border border-border shadow-sm flex items-center justify-between col-span-3">
              <p className="text-muted-foreground text-sm">No loan linked to this folio yet</p>
              <button onClick={() => setShowEdit(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition">Map Loan to Folio</button>
            </div>
          </div>
        )}
      </div>

      {/* Ledger Section */}
      {folio?.id && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <FolioLedger
            folioId={folio.id?.toString()}
            folioAmount={folio.folio_amount || folio.amount}
            customerName={displayLoan?.customer_name || displayLoan?.applicant_name || folio.customer_name || 'N/A'}
            customerPhone={displayLoan?.mobile || displayLoan?.applicant_mobile || "-"}
            loanAccountNumber={folio.loan_account_number || '-'}
            lenderName={folio.lender_name || folio.bank_nbfc || folio.mapped_bank_nbfc || "-"}
            hideReceivePayment
            viewers={viewers}
            onOpenViewer={(url: string, id: number) => setViewers(prev => [...prev, { url, id }])}
            onCloseViewer={(id: number) => setViewers(prev => prev.filter(x => x.id !== id))}
          />
        </div>
      )}

      {/* Approved Payments Section */}
      {folio?.id && <ApprovedPayments folio={folio} onOpenViewer={(url, id) => setViewers(prev => [...prev, { url, id }])} />}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 flex items-start sm:items-center justify-center bg-black/40 backdrop-blur-sm z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-3xl max-h-[75vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h2 className="text-sm font-bold text-foreground">Edit Folio</h2>
              <button type="button" onClick={() => setShowEdit(false)} className="p-1 text-muted-foreground hover:bg-muted rounded-lg transition-colors"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {/* Search Loan & Bill Number in one line */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative" ref={searchDropdownRef}>
                    <label className="block text-sm font-semibold text-foreground mb-2">Search Loan</label>
                    {editData.selectedLoanId ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 text-xs bg-muted/30 border border-border rounded text-foreground min-h-[30px]">
                        <span className="font-medium">{editData.mapped_customer_name || editData.mapped_mobile || 'Loan selected'}</span>
                        <button type="button" onClick={() => { setEditData(prev => ({ ...prev, selectedLoanId: null })); setSearchQuery(''); }} className="ml-auto text-muted-foreground hover:text-foreground text-[10px] underline">Change</button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          placeholder="Search by customer name, mobile, loan number..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setSelectedSearchIndex(prev => Math.min(prev + 1, searchResults.length - 1));
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setSelectedSearchIndex(prev => Math.max(prev - 1, 0));
                            } else if (e.key === 'Enter' && selectedSearchIndex >= 0 && searchResults[selectedSearchIndex]) {
                              selectLoan(searchResults[selectedSearchIndex]);
                            } else if (e.key === 'Escape') {
                              setSearchResults([]);
                              searchInputRef.current?.blur();
                            }
                          }}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground"
                        />
                      </div>
                    )}
                    {(searchLoading || searchResults.length > 0) && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                        {searchLoading ? (
                          <div className="px-4 py-3 text-center text-muted-foreground text-xs">Searching...</div>
                        ) : searchResults.map((loan: any, idx: number) => (
                          <button
                            key={loan.id}
                            type="button"
                            onMouseEnter={() => setSelectedSearchIndex(idx)}
                            onClick={() => selectLoan(loan)}
                            className={`w-full px-3 py-1.5 text-left transition-colors border-b border-border last:border-b-0 text-xs ${idx === selectedSearchIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-foreground'
                              }`}
                          >
                            <div className="font-medium">{loan.applicant_name || loan.customer_name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">Loan: {loan.loan_number} | {loan.mobile || '-'} | {loan.bank_name || loan.financier_name || '-'} | A/c: {loan.loan_account_number || '-'}{loan.bill_number ? ` | Bill: ${loan.bill_number} (mapped)` : ''}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Bill No. <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={editData.bill_number}
                      onChange={(e) => setEditData({ ...editData, bill_number: e.target.value })}
                      placeholder="Enter Bill number"
                      className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground"
                      required
                    />
                  </div>
                </div>

                {/* 3-Card Edit Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {/* Left: Customer Details */}
                  <div className="bg-card p-3 rounded-lg border border-border shadow-sm">
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Customer Name</label>
                        <input type="text" value={editData.mapped_customer_name} onChange={(e) => setEditData({ ...editData, mapped_customer_name: e.target.value })} disabled={!!editData.selectedLoanId}
                          className="w-full px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground disabled:opacity-60 disabled:cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Mobile Number</label>
                        <input type="text" value={editData.mapped_mobile} onChange={(e) => setEditData({ ...editData, mapped_mobile: e.target.value })} disabled={!!editData.selectedLoanId}
                          className="w-full px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground disabled:opacity-60 disabled:cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Disbursed Date</label>
                        <input type="date" value={editData.mapped_disbursement_date ? editData.mapped_disbursement_date.split('T')[0] : ''} onChange={(e) => setEditData({ ...editData, mapped_disbursement_date: e.target.value })} disabled={!!editData.selectedLoanId}
                          className="w-full px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground disabled:opacity-60 disabled:cursor-not-allowed" />
                      </div>

                    </div>
                  </div>

                  {/* Middle: Vehicle Details */}
                  <div className="bg-card p-3 rounded-lg border border-border shadow-sm">
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Vehicle Number</label>
                        <input type="text" value={editData.mapped_vehicle_number} onChange={(e) => setEditData({ ...editData, mapped_vehicle_number: e.target.value })} disabled={!!editData.selectedLoanId}
                          className="w-full px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground disabled:opacity-60 disabled:cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Vehicle Model</label>
                        <input type="text" value={editData.mapped_maker_model} onChange={(e) => setEditData({ ...editData, mapped_maker_model: e.target.value })} disabled={!!editData.selectedLoanId}
                          className="w-full px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground disabled:opacity-60 disabled:cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Lender/Bank</label>
                        {editData.mapped_bank_nbfc || editData.lender_name ? (
                          <div className="flex gap-1 items-center">
                            <div className="flex-1 px-2 py-1 text-xs bg-muted/30 rounded border border-border">
                              <span className="font-medium text-foreground">{editData.mapped_bank_nbfc || editData.lender_name}</span>
                            </div>
                            {!editData.selectedLoanId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditData(prev => ({ ...prev, lender_name: '', mapped_bank_nbfc: '' }));
                                  setLenderSearchTerm('');
                                  setShowLenderDropdown(false);
                                }}
                                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="relative" ref={lenderDropdownRef}>
                            <input
                              type="text"
                              placeholder="Search lender..."
                              value={lenderSearchTerm}
                              onChange={(e) => setLenderSearchTerm(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowDown') { e.preventDefault(); setLenderSelectedIndex(prev => prev < (lenders as any[]).length - 1 ? prev + 1 : prev); }
                                else if (e.key === 'ArrowUp') { e.preventDefault(); setLenderSelectedIndex(prev => prev > 0 ? prev - 1 : -1); }
                                else if (e.key === 'Enter' && lenderSelectedIndex >= 0) {
                                  e.preventDefault();
                                  const lender = (lenders as any[])[lenderSelectedIndex];
                                  setEditData(prev => ({ ...prev, lender_name: lender.name, mapped_bank_nbfc: lender.name }));
                                  setLenderSearchTerm('');
                                  setShowLenderDropdown(false);
                                  setLenderSelectedIndex(-1);
                                } else if (e.key === 'Escape') { setShowLenderDropdown(false); }
                              }}
                              onFocus={() => setShowLenderDropdown(true)}
                              disabled={!!editData.selectedLoanId}
                              className="w-full px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                            {showLenderDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                                {(lenders as any[]).filter((l: any) => !lenderSearchTerm || l.name.toLowerCase().includes(lenderSearchTerm.toLowerCase())).length > 0 ? (
                                  (lenders as any[]).filter((l: any) => !lenderSearchTerm || l.name.toLowerCase().includes(lenderSearchTerm.toLowerCase())).map((lender: any, idx: number) => (
                                    <button
                                      key={lender.id}
                                      type="button"
                                      onClick={() => {
                                        setEditData(prev => ({ ...prev, lender_name: lender.name, mapped_bank_nbfc: lender.name }));
                                        setLenderSearchTerm('');
                                        setShowLenderDropdown(false);
                                        setLenderSelectedIndex(-1);
                                      }}
                                      className={`w-full px-2 py-1.5 text-left transition-colors border-b border-border last:border-b-0 text-xs ${idx === lenderSelectedIndex ? 'bg-primary/20 text-foreground font-medium' : 'hover:bg-muted/50 text-foreground'
                                        }`}
                                    >
                                      <div className="font-medium text-foreground">{lender.name}</div>
                                      <div className="text-[10px] text-muted-foreground">{lender.bank_code}</div>
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-2 py-1.5 text-center text-muted-foreground text-xs">No lenders found</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Loan Amount & Status */}
                  <div className="bg-card p-3 rounded-lg border border-border shadow-sm">
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Loan Amount (₹)</label>
                        <input type="number" value={editData.mapped_loan_amount} onChange={(e) => setEditData({ ...editData, mapped_loan_amount: Number(e.target.value) })} disabled={!!editData.selectedLoanId}
                          className="w-full px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground disabled:opacity-60 disabled:cursor-not-allowed" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">ROI (%)</label>
                          <input type="text" value={editData.mapped_roi} onChange={(e) => setEditData({ ...editData, mapped_roi: e.target.value })} disabled={!!editData.selectedLoanId}
                            className="w-full px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground disabled:opacity-60 disabled:cursor-not-allowed" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Tenure (m)</label>
                          <input type="text" value={editData.mapped_tenure} onChange={(e) => setEditData({ ...editData, mapped_tenure: e.target.value })} disabled={!!editData.selectedLoanId}
                            className="w-full px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground disabled:opacity-60 disabled:cursor-not-allowed" />
                        </div>
                      </div>
                      {/* Loan Account Number */}
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Loan Account No.</label>
                        <input type="text" value={editData.loan_account_number} onChange={(e) => setEditData({ ...editData, loan_account_number: e.target.value })}
                          className="w-full px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">PDD Days Count</p>
                        <p className="font-semibold text-foreground text-xs">{calculatePDDDays() !== null ? `${calculatePDDDays()} days` : '-'}
                          <span className={`ml-2 inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold ${displayLoan?.pdd_status === 'yes' || displayLoan?.pdd_status === 'COMPLETED' || displayLoan?.pdd_status?.toLowerCase() === 'completed'
                            ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                            : displayLoan?.pdd_status === 'no' || displayLoan?.pdd_status === 'PENDING' || displayLoan?.pdd_status?.toLowerCase() === 'pending'
                              ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                              : 'bg-gray-500/10 text-gray-600 border border-gray-500/20'
                            }`}>
                            {displayLoan?.pdd_status === 'yes' || displayLoan?.pdd_status?.toLowerCase() === 'completed' ? 'COMPLETED' : displayLoan?.pdd_status === 'no' || displayLoan?.pdd_status?.toLowerCase() === 'pending' ? 'PENDING' : displayLoan?.pdd_status || '-'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Hierarchy - read only display */}
                <div>
                  <div className="flex flex-col gap-1 text-[11px]">
                    {hierarchyChain.map((person, i) => (
                      <div key={i} className="flex items-center text-[10px]">
                        <span className="text-muted-foreground text-[8px] uppercase font-semibold w-[80px] shrink-0 truncate">{person.role}</span>
                        <span className="text-muted-foreground text-[8px] w-[12px] shrink-0 text-center">:</span>
                        <span className="font-medium text-foreground truncate text-[10px]">{person.name}</span>
                      </div>
                    ))}
                    {hierarchyChain.length === 0 && <p className="text-muted-foreground text-[10px]">No data</p>}
                  </div>
                </div>


              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-border shrink-0">
              <button onClick={() => setShowEdit(false)}
                className="px-3 py-1 bg-muted text-foreground text-xs font-semibold rounded hover:bg-muted/80 transition-colors">Cancel</button>
              <button onClick={async () => {
                if (!folio?.id) return;
                setSaving(true);
                try {
                  const body: any = {
                    lender_name: editData.lender_name || null,
                    bill_number: editData.bill_number || null,
                    purpose: editData.purpose || null,
                    amount: editData.amount || 0,
                    customer_name: editData.customer_name || null,
                    loan_account_number: editData.loan_account_number || null,
                    opening_balance: editData.opening_balance || 0,
                    current_balance: editData.current_balance || 0,
                    mapped_customer_name: editData.mapped_customer_name || null,
                    mapped_mobile: editData.mapped_mobile || null,
                    mapped_vehicle_number: editData.mapped_vehicle_number || null,
                    mapped_maker_model: editData.mapped_maker_model || null,
                    mapped_bank_nbfc: editData.mapped_bank_nbfc || null,
                    mapped_loan_amount: editData.mapped_loan_amount || 0,
                    mapped_roi: editData.mapped_roi || null,
                    mapped_tenure: editData.mapped_tenure || null,
                    mapped_disbursement_date: editData.mapped_disbursement_date || null,
                    mapped_created_by_name: editData.mapped_created_by_name || null,
                    mapped_created_by_role: editData.mapped_created_by_role || null,
                    mapped_team_leader_name: editData.mapped_team_leader_name || null,
                    mapped_team_leader_role: editData.mapped_team_leader_role || null,
                    mapped_branch_manager_name: editData.mapped_branch_manager_name || null,
                    mapped_branch_manager_role: editData.mapped_branch_manager_role || null,
                    mapped_senior_manager_name: editData.mapped_senior_manager_name || null,
                    mapped_senior_manager_role: editData.mapped_senior_manager_role || null,
                  };
                  // If a loan was selected, include loan_id so backend can map folio to loan and update loan's bill_number
                  if (editData.selectedLoanId) {
                    body.loan_id = editData.selectedLoanId;
                  }
                  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/folio-accounts/${folio.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
                    body: JSON.stringify(body),
                  });
                  if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || 'Failed to update');
                  }
                  queryClient.invalidateQueries({ queryKey: ['folio-detail'] });
                  queryClient.invalidateQueries({ queryKey: ['folio-accounts'] });
                  toast.success('Folio details updated');
                  setShowEdit(false);
                } catch (err: any) {
                  toast.error(err.message || 'Failed to update folio');
                } finally {
                  setSaving(false);
                }
              }} disabled={saving}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewers.map(v => createPortal(
        <DraggableDocumentViewer key={v.id} url={v.url} onClose={() => setViewers(prev => prev.filter(x => x.id !== v.id))} />,
        document.body
      ))}
    </div>
  );
}

