import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, X, Trash2, AlertCircle, Calendar, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import PaymentRequestModal from '@/components/PaymentRequestModal';

export default function FolioAccounts() {
  const { user } = useAuth();
  const isAdminUser = ['admin', 'super_admin', 'l1_admin', 'l1 - admin', 'admin_head'].includes((user?.role || '').toLowerCase()) || (user?.role || '').toLowerCase().includes('admin');
  const isAccountantUser = ['accountant', 'accountant_head', 'account_head'].includes((user?.role || '').toLowerCase()) || (user?.role || '').toLowerCase().includes('accountant');
  const [searchParams] = useSearchParams();
  const loanIdParam = searchParams.get('loan_id');
  const billParam = searchParams.get('bill');
  const [searchTerm, setSearchTerm] = useState(billParam || '');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncingTally, setIsSyncingTally] = useState(false);

  const handleCheckTallyConnection = async () => {
    try {
      const res = await refetchTallyStatus();
      const statusData = res.data;
      if (statusData?.tallyConnected) {
        toast.success('Tally Connected', { description: 'Live connection with Tally gateway is active.' });
      } else {
        toast.error('Tally Disconnected', { description: 'Unable to reach Tally. Ensure Tally ERP application is running.' });
      }
    } catch (err: any) {
      toast.error('Tally Disconnected', { description: 'Unable to connect to Tally endpoint.' });
    }
  };

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
      const statusRes = await refetchTallyStatus();
      queryClient.invalidateQueries({ queryKey: ['folio-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['tally-status'] });
      queryClient.invalidateQueries({ queryKey: ['folio-detail'] });
      queryClient.invalidateQueries({ queryKey: ['folio-ledger'] });

      const isSyncedNow = statusRes.data?.productsSynced ?? tallyStatusData?.productsSynced;

      if (response.ok && data.success) {
        if (isSyncedNow) {
          toast.success('Products Synced', { description: 'All products and folios are synced with Tally.' });
        } else {
          toast.success('Tally Sync Completed', { description: data.message || 'Successfully synced items with Tally.' });
        }
      } else {
        toast.error('Products Unsynced', { description: data.error || 'Failed to sync with Tally gateway.' });
      }
    } catch (error: any) {
      toast.error('Products Unsynced', { description: error.message || 'Failed to sync with Tally.' });
    } finally {
      setIsSyncingTally(false);
    }
  };

  const handleAdminApproval = async (folioId: number, action: 'approve' | 'reject', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/folio-accounts/${folioId}/admin-approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ action })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(data.message || (action === 'approve' ? 'Approved & Synced to Tally' : 'Rejected'));
        queryClient.invalidateQueries({ queryKey: ['folio-accounts'] });
      } else {
        toast.error(data.error || 'Action failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    }
  };

  const [lenderSearchTerm, setLenderSearchTerm] = useState('');
  const [showLenderDropdown, setShowLenderDropdown] = useState(false);
  const [lenderSelectedIndex, setLenderSelectedIndex] = useState<number>(-1);
  const [loanSearchTerm, setLoanSearchTerm] = useState('');
  const [showLoanDropdown, setShowLoanDropdown] = useState(false);
  const [loanSelectedIndex, setLoanSelectedIndex] = useState<number>(-1);
  const [loanSearchResults, setLoanSearchResults] = useState<any[]>([]);
  const [loanSearchLoading, setLoanSearchLoading] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [deleteConfirmFolioId, setDeleteConfirmFolioId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPaymentRequest, setShowPaymentRequest] = useState(false);
  const [paymentRequestLoanId, setPaymentRequestLoanId] = useState<number | null>(null);
  const [paymentRequestFolio, setPaymentRequestFolio] = useState<any>(null);
  const [formData, setFormData] = useState({
    loan_id: '',
    loan_number: '',
    loan_account_number: '',
    lender_id: '',
    lender_name: '',
    bill_number: '',
    customer_name: '',
    purpose: 'payment_received',
    amount: '',
    custom_purpose: '',
    transaction_type: 'CR',
    bank_account: 'Yes Bank',
    transaction_id: ''
  });

  const purposeOptions = [
    { value: 'payment_received', label: 'Payment Received (CR)', type: 'CR' },
    { value: 'rto charges', label: 'RTO (DR)', type: 'DR' },
    { value: 'Challan', label: 'Challan (DR)', type: 'DR' },
    { value: 'PUC', label: 'PUC (DR)', type: 'DR' },
    { value: 'insurance', label: 'Insurance (DR)', type: 'DR' },
    { value: 'FC charges', label: 'FC Charges (DR)', type: 'DR' },
    { value: 'Financer', label: 'Financer (DR)', type: 'DR' },
    { value: 'Other', label: 'Other (DR)', type: 'DR' }
  ];
  const purposeLabelMap = Object.fromEntries(purposeOptions.map(p => [p.value, p.label.replace(/\s*\(.*?\)/, '')]));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lenderDropdownRef = useRef<HTMLDivElement>(null);
  const loanDropdownRef = useRef<HTMLDivElement>(null);

  // Close lender and loan dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (lenderDropdownRef.current && !lenderDropdownRef.current.contains(event.target as Node)) {
        setShowLenderDropdown(false);
      }
      if (loanDropdownRef.current && !loanDropdownRef.current.contains(event.target as Node)) {
        setShowLoanDropdown(false);
      }
    };

    if (showLenderDropdown || showLoanDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLenderDropdown, showLoanDropdown]);

  const { data: rawFolios } = useQuery({
    queryKey: ['folio-accounts', user?.id],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/folio-accounts`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!user,
  });

  const { data: tallyStatusData, isLoading: isTallyStatusLoading, refetch: refetchTallyStatus } = useQuery({
    queryKey: ['tally-status'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/tally/status`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) return null;
      return await response.json();
    },
    refetchInterval: 15000,
    enabled: !!user,
  });

  const prevConnectedRef = useRef<boolean | undefined>(undefined);
  const prevSyncedRef = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (tallyStatusData) {
      if (prevConnectedRef.current !== undefined && prevConnectedRef.current !== tallyStatusData.tallyConnected) {
        if (tallyStatusData.tallyConnected) {
          toast.success('Tally Connected', { description: 'Live connection with Tally has been established.' });
        } else {
          toast.error('Tally Disconnected', { description: 'Connection to Tally gateway was lost.' });
        }
      }
      prevConnectedRef.current = tallyStatusData.tallyConnected;

      if (prevSyncedRef.current !== undefined && prevSyncedRef.current !== tallyStatusData.productsSynced) {
        if (tallyStatusData.productsSynced) {
          toast.success('Products Synced', { description: 'All products and folios are synced with Tally.' });
        } else {
          toast.error('Products Unsynced', { description: `${tallyStatusData.productSyncDetails?.unsynced || 1} unsynced items remaining.` });
        }
      }
      prevSyncedRef.current = tallyStatusData.productsSynced;
    }
  }, [tallyStatusData]);

  useEffect(() => {
    if (!loanSearchTerm || loanSearchTerm.length < 2) {
      setLoanSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoanSearchLoading(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/search?q=${encodeURIComponent(loanSearchTerm)}`,
          { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setLoanSearchResults(Array.isArray(data) ? data : []);
        }
      } catch { setLoanSearchResults([]); }
      finally { setLoanSearchLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [loanSearchTerm]);

  const { data: lenders = [] } = useQuery({
    queryKey: ['lenders-for-folio'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banks`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!user && showCreateForm,
  });

  const handleCreateFolio = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_name || !formData.lender_name || !formData.bill_number || !formData.purpose || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/folio-accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          loan_id: formData.loan_id ? Number(formData.loan_id) : null,
          lender_name: formData.lender_name,
          bill_number: formData.bill_number,
          customer_name: formData.customer_name || null,
          loan_account_number: formData.loan_account_number || null,
          purpose: formData.purpose,
          amount: Number(formData.amount),
          opening_balance: Number(formData.amount),
          current_balance: Number(formData.amount),
          bank_account: formData.bank_account || 'Yes Bank',
          transaction_id: formData.transaction_id || null,
          utr_number: formData.transaction_id || null
        })
      });

      if (response.ok) {
        toast.success('Folio account created successfully');
        setFormData({ loan_id: '', loan_number: '', loan_account_number: '', lender_id: '', lender_name: '', bill_number: '', customer_name: '', purpose: 'payment_received', amount: '', custom_purpose: '', transaction_type: 'CR', bank_account: 'Yes Bank' });
        setShowCreateForm(false);
        setShowNewCustomerForm(false);
        setLenderSearchTerm('');
        setLoanSearchTerm('');
        queryClient.invalidateQueries({ queryKey: ['folio-accounts'] });
      } else {
        const error = await response.json();
        console.log('[FolioCreate] API error response:', error);
        toast.error(error.error || 'Failed to create folio account');
      }
    } catch (error) {
      console.log('[FolioCreate] Network/other error:', error);
      toast.error('Failed to create folio account');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteFolio = async (folioId: number) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/folio-accounts/${folioId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        toast.success('Folio account deleted successfully');
        setDeleteConfirmFolioId(null);
        queryClient.invalidateQueries({ queryKey: ['folio-accounts'] });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete folio account');
      }
    } catch (error) {
      toast.error('Failed to delete folio account');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter lenders based on search term
  const filteredLenders = lenders?.filter((lender: any) => {
    if (!lenderSearchTerm) return true;
    const searchLower = lenderSearchTerm.toLowerCase();
    return (
      lender.name?.toLowerCase().includes(searchLower) ||
      lender.bank_code?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const filteredLoans = loanSearchResults;

  const selectedLoan = loanSearchResults.find((loan: any) => loan.id?.toString() === formData.loan_id);

  // Handle keyboard navigation for loan dropdown
  const handleLoanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showLoanDropdown) return;

    const itemsCount = filteredLoans.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setLoanSelectedIndex(prev => (prev < itemsCount - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setLoanSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (loanSelectedIndex >= 0 && loanSelectedIndex < itemsCount) {
          const selectedLoan = filteredLoans[loanSelectedIndex];
          if (selectedLoan.bill_number) {
            toast.error(`This loan is already mapped to bill number ${selectedLoan.bill_number}`);
            setLoanSearchTerm('');
            setShowLoanDropdown(false);
            setLoanSelectedIndex(-1);
            return;
          }
          const lenderBank = selectedLoan.bank_name || selectedLoan.bank_nbfc || selectedLoan.financier_name || '';
          const lenderInitials = lenderBank.substring(0, 2).toUpperCase();
          setFormData({
            ...formData,
            loan_id: selectedLoan.id?.toString(),
            loan_number: selectedLoan.loan_number || '',
            loan_account_number: selectedLoan.loan_account_number || '',
            lender_name: lenderBank,
            customer_name: selectedLoan.applicant_name || selectedLoan.customer_name || '',
            bill_number: lenderInitials ? lenderInitials + '-' : '',
            amount: selectedLoan.loan_amount || ''
          });
          setLoanSearchTerm('');
          setShowLoanDropdown(false);
          setLoanSelectedIndex(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowLoanDropdown(false);
        setLoanSelectedIndex(-1);
        break;
    }
  };

  const handleFolioClick = (folio: any) => {
    if (!folio) return;
    if (folio.loan_id) {
      navigate(`/loans/${folio.loan_id}/payments`);
    } else {
      navigate(`/accountant/folio-details?folio_id=${folio.id}`);
    }
  };

  useEffect(() => {
    // Auto-navigate to folio details if loan_id provided
    if (loanIdParam && rawFolios) {
      const folio = rawFolios.find((f: any) => f.loan_id?.toString() === loanIdParam);
      if (folio) {
        handleFolioClick(folio);
      }
    }
  }, [loanIdParam, rawFolios, navigate]);

  // Navigate to folio by bill number
  useEffect(() => {
    const term = searchTerm;
    if (!term || term.length < 2) return;

    const fetchFolioByBillNumber = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/folio-accounts/bill/${term}`,
          {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
          }
        );
        if (response.ok) {
          const folio = await response.json();
          setTimeout(() => {
            handleFolioClick(folio);
          }, 500);
        }
      } catch (error) { }
    };

    const timer = setTimeout(fetchFolioByBillNumber, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, navigate]);

  // Client-side filter based on search term and date range
  const folios = (rawFolios || []).filter((f: any) => {
    if (searchTerm) {
      const st = searchTerm.toLowerCase();
      const match =
        f.loan_number?.toLowerCase()?.includes(st) ||
        f.loan_id?.toString()?.includes(st) ||
        f.bill_number?.toLowerCase()?.includes(st) ||
        f.customer_name?.toLowerCase()?.includes(st) ||
        f.bank_nbfc?.toLowerCase()?.includes(st) ||
        f.lender_name?.toLowerCase()?.includes(st) ||
        (f.folio_amount || f.amount || '0').toString().includes(st);
      if (!match) return false;
    }
    if (startDate || endDate) {
      const d = new Date(f.created_at);
      if (startDate && d < startDate) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6 lg:-mt-5 ">
      <div className="flex flex-col sm:flex-row gap-3 items-center  justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input type="text" placeholder="Search loan no., Bill no., customer, bank, amount..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
          </div>
          <DatePicker
            selectsRange
            startDate={startDate}
            endDate={endDate}
            onChange={(update: [Date | null, Date | null]) => setDateRange(update)}
            monthsShown={2}
            maxDate={new Date()}
            dateFormat="dd/MM/yyyy"
            customInput={
              <div className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg cursor-pointer text-sm text-muted-foreground hover:border-primary/50 transition-colors ">
                <Calendar size={16} />
                {startDate && endDate
                  ? `${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : ''}
                {(startDate || endDate) && (
                  <button onClick={(e) => { e.stopPropagation(); setDateRange([null, null]); }} className="ml-auto text-muted-foreground hover:text-foreground"><X size={14} /></button>
                )}
              </div>
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            {isAccountantUser || isAdminUser ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm whitespace-nowrap shadow-sm"
              >
                <Plus size={18} />
                New Folio
              </button>
            ) : null}

            {/* Tally Connection & Product Sync Status Badges right after New Folio */}
            <div className="flex items-center gap-2">
              {/* Tally Connection Status Badge (Green for connected, Red for not connected) */}
              <div 
                onClick={() => handleCheckTallyConnection()}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all duration-200 shadow-sm ${
                  isTallyStatusLoading 
                    ? 'bg-muted text-muted-foreground border-border'
                    : tallyStatusData?.tallyConnected
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/20'
                }`}
                title={`Tally Connection Status: ${tallyStatusData?.tallyConnected ? 'Connected (Click to verify connection)' : 'Disconnected (Click to retry connection)'}`}
              >
                <span className="relative flex h-2 w-2">
                  {tallyStatusData?.tallyConnected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${tallyStatusData?.tallyConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </span>
                <span className="whitespace-nowrap font-medium">
                  {isTallyStatusLoading ? (
                    <span className="flex items-center gap-1">
                      <RefreshCw size={12} className="animate-spin text-muted-foreground" /> Checking...
                    </span>
                  ) : tallyStatusData?.tallyConnected ? (
                    'Tally Connected'
                  ) : (
                    'Tally Disconnected'
                  )}
                </span>
              </div>

              {/* Product Sync Status Badge / Sync Button */}
              <button
                type="button"
                disabled={isSyncingTally || isTallyStatusLoading}
                onClick={() => handleManualTallySync()}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all duration-200 shadow-sm disabled:opacity-75 disabled:cursor-not-allowed ${
                  isSyncingTally || isTallyStatusLoading
                    ? 'bg-muted text-muted-foreground border-border'
                    : tallyStatusData?.productsSynced
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                }`}
                title={isSyncingTally ? 'Syncing with Tally...' : `Product Sync Status: ${tallyStatusData?.productsSynced ? (tallyStatusData?.productSyncDetails?.pendingApproval ? `All active products & folios are synced with Tally (${tallyStatusData.productSyncDetails.pendingApproval} pending admin approval)` : 'All products & folios are synced with Tally') : `${tallyStatusData?.productSyncDetails?.unsynced || 0} unsynced items remaining (Click to sync now)`}`}
              >
                {isSyncingTally ? (
                  <RefreshCw size={14} className="animate-spin text-amber-600 dark:text-amber-400" />
                ) : tallyStatusData?.productsSynced ? (
                  <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
                )}
                <span className="whitespace-nowrap font-medium">
                  {isSyncingTally ? (
                    'Syncing...'
                  ) : isTallyStatusLoading ? (
                    'Checking Sync...'
                  ) : tallyStatusData?.productsSynced ? (
                    'Sync Folio Now'
                  ) : (
                    `Sync Folio Now (${tallyStatusData?.productSyncDetails?.unsynced || 0})`
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>


      </div>



      <div className="grid grid-cols-1 gap-2 lg:hidden">
        {folios?.map((folio: any) => (
          <div key={folio.id} className="bg-card rounded-xl border border-border shadow-sm p-3">
            <button onClick={() => handleFolioClick(folio)} className="w-full text-left">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-foreground">{folio.created_at ? new Date(folio.created_at).toLocaleDateString('en-IN') : '-'}</span>
                {(isAdminUser || isAccountantUser) && (
                  <div className="mt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmFolioId(folio.id); }}
                      className="px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 rounded text-[10px] font-semibold"
                    >
                      <Trash2 size={12} className="inline mr-1" />delete
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-1 flex justify-between">
                <span className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground truncate">Bill No:- {folio.bill_number || '-'}</p>
                  <p className="text-[11px] font-semibold text-foreground truncate">Customer:- {folio.customer_name || '-'}</p>
                  <p className="text-[11px] font-semibold text-foreground truncate">Bank:- {folio.bank_nbfc || folio.lender_name || '-'}</p>
                  <p className="text-[11px] font-semibold text-foreground truncate">Purpose:- {purposeLabelMap[folio.purpose] || folio.purpose || '-'}</p>
                </span>
                <span className="flex flex-col items-end shrink-0">
                  <span className="text-lg font-bold text-foreground whitespace-nowrap">₹{Number(folio.folio_amount || folio.amount || 0).toLocaleString('en-IN')}</span>
                </span>
              </div>
            </button>


          </div>
        ))}
      </div>

      <div className="hidden lg:block bg-card border border-border rounded-xl shadow-sm overflow-x-auto">
        <div className="divide-y divide-border min-w-[750px]">
          <div className="grid grid-cols-[85px_95px_1.1fr_1.1fr_85px_1fr_210px] px-4 py-3 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider items-center gap-x-4 gap-y-2">
            <div>Date</div>
            <div>Bill No</div>
            <div>Purpose</div>
            <div>Customer Name</div>
            <div className="text-right pr-4">Amount</div>
            <div>Bank Name</div>
            <div>Status / Approval</div>
          </div>
          {folios?.map((folio: any) => {
            const isPending = folio.status === 'pending_approval' || folio.status === 'pending_admin_approval' || folio.tally_sync_status === 'WAITING_APPROVAL' || folio.tally_sync_status === 'WAITING_ADMIN_APPROVAL';
            const isRejected = folio.status === 'rejected' || folio.tally_sync_status === 'REJECTED';
            const isSynced = folio.status === 'active' || folio.tally_sync_status === 'SYNCED';

            return (
              <div key={folio.id} className="group border-b border-border hover:bg-muted/30 transition-colors">
                <div className="w-full grid grid-cols-[85px_95px_1.1fr_1.1fr_85px_1fr_210px] gap-x-4 gap-y-2 px-4 py-2.5 items-center text-left">
                  <div onClick={() => handleFolioClick(folio)} className="cursor-pointer text-muted-foreground text-xs font-medium">{folio.created_at ? new Date(folio.created_at).toLocaleDateString('en-IN') : '-'}</div>
                  <div onClick={() => handleFolioClick(folio)} className="cursor-pointer font-bold text-foreground text-sm">{folio.bill_number}</div>
                  <div onClick={() => handleFolioClick(folio)} className="cursor-pointer text-[10px] text-muted-foreground">{purposeLabelMap[folio.purpose] || folio.purpose || '-'}</div>
                  <div onClick={() => handleFolioClick(folio)} className="cursor-pointer text-xs text-muted-foreground">{folio.customer_name || '-'}</div>
                  <div onClick={() => handleFolioClick(folio)} className="cursor-pointer font-bold text-foreground text-sm text-right pr-4">₹{Number(folio.folio_amount || folio.amount || 0).toLocaleString('en-IN')}</div>
                  <div onClick={() => handleFolioClick(folio)} className="cursor-pointer text-xs text-muted-foreground">{folio.bank_nbfc || folio.lender_name || '-'}</div>

                  {/* Status & Action Column */}
                  <div className="flex items-center justify-between gap-1.5">
                    {isPending ? (
                      isAdminUser ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleAdminApproval(folio.id, 'approve', e)}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold rounded shadow transition-colors whitespace-nowrap"
                            title="Approve and Sync to Tally"
                          >
                            ✓ Approve Sync
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleAdminApproval(folio.id, 'reject', e)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded shadow transition-colors whitespace-nowrap"
                            title="Reject and Rollback Tally Sync"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-300 rounded-full text-[10px] font-medium whitespace-nowrap">
                          ⏳ Waiting Admin Approval
                        </span>
                      )
                    ) : isRejected ? (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-300 rounded-full text-[10px] font-medium whitespace-nowrap">
                        ✖ Rejected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full text-[10px] font-medium whitespace-nowrap">
                        ● Synced
                      </span>
                    )}

                    {(isAdminUser || isAccountantUser) && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmFolioId(folio.id); }}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-600 dark:text-red-400 shrink-0"
                        title="Delete folio"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmFolioId !== null && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border shadow-2xl rounded-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
              </div>
              <h3 className="text-lg font-bold text-foreground">Delete Folio?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This action cannot be undone. All data associated with this folio account will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmFolioId(null)}
                className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors font-medium"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteFolio(deleteConfirmFolioId)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folio Account Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border shadow-2xl rounded-2xl p-4 max-w-2xl w-full animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between ">
              <h2 className="text-lg font-bold text-foreground">Create Folio Account</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-1 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateFolio} className="space-y-4">
              {/* Loan Selection - Full width at the top */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Loan <span className="text-red-500">*</span></label>

                {showNewCustomerForm ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter customer name"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCustomerForm(false);
                        setLoanSearchTerm('');
                      }}
                      className="w-full px-4 py-2 text-sm bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Search Input - Always visible and editable */}
                    <div className="relative" ref={loanDropdownRef}>
                      <input
                        type="text"
                        placeholder="Search by customer name, mobile, loan number..."
                        value={loanSearchTerm}
                        onChange={(e) => {
                          setLoanSearchTerm(e.target.value);
                          setLoanSelectedIndex(-1);
                        }}
                        onKeyDown={handleLoanKeyDown}
                        onFocus={() => setShowLoanDropdown(true)}
                        onClick={() => setShowLoanDropdown(true)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />

                      {/* Dropdown */}
                      {showLoanDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                          {loanSearchLoading ? (
                            <div className="px-4 py-3 text-center text-muted-foreground text-sm">Searching...</div>
                          ) : filteredLoans.length > 0 ? (
                            filteredLoans.map((loan: any, idx: number) => (
                              <button
                                key={loan.id}
                                type="button"
                                onClick={() => {
                                  const lenderBank = loan.bank_name || loan.bank_nbfc || loan.financier_name || '';
                                  const lenderInitials = lenderBank ? lenderBank.substring(0, 2).toUpperCase() : '';
                                  const targetBill = loan.bill_number || (lenderInitials ? lenderInitials + '-' : '');
                                  setFormData({
                                    ...formData,
                                    loan_id: loan.id?.toString(),
                                    loan_number: loan.loan_number || '',
                                    loan_account_number: loan.loan_account_number || '',
                                    lender_name: lenderBank,
                                    customer_name: loan.applicant_name || loan.customer_name || '',
                                    bill_number: targetBill,
                                    amount: loan.loan_amount || ''
                                  });
                                  setLoanSearchTerm('');
                                  setShowLoanDropdown(false);
                                }}
                                className={`w-full px-4 py-2 text-left transition-colors border-b border-border last:border-b-0 ${idx === loanSelectedIndex ? 'bg-primary/20 text-foreground' : 'hover:bg-muted/50 text-foreground'}`}
                              >
                                <div className="font-medium gap-3 text-[0.8rem] flex">{loan.applicant_name || loan.customer_name} <div className="text-[1.5vh] text-muted-foreground">Loan: {loan.loan_number} | Mobile: {loan.mobile || '-'} | Lender: {loan.bank_name || loan.bank_nbfc || loan.financier_name || '-'} | Loan Account: {loan.loan_account_number || '-'}{loan.bill_number ? ` | Bill: ${loan.bill_number} (mapped)` : ''}</div></div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-center text-muted-foreground text-sm">
                              {loanSearchTerm.length < 2 ? 'Type to search loans...' : 'No loans found'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Row 1: Customer Name and Lender Name */}
              <div className="grid grid-cols-2 gap-4">
                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Customer Name</label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter customer name"
                    required
                  />
                </div>

                {/* Lender Name */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Lender Name <span className="text-red-500">*</span></label>
                  {formData.lender_name ? (
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 px-4 py-2 bg-muted/30 rounded-lg border border-border">
                        <div className="font-medium text-foreground">{formData.lender_name}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, lender_id: '', lender_name: '', bill_number: '' });
                          setLenderSearchTerm('');
                          setShowLenderDropdown(false);
                        }}
                        className="px-3 py-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="relative" ref={lenderDropdownRef}>
                      <input
                        type="text"
                        placeholder="Search by lender name or code..."
                        value={lenderSearchTerm}
                        onChange={(e) => setLenderSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setLenderSelectedIndex(prev =>
                              prev < filteredLenders.length - 1 ? prev + 1 : prev
                            );
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setLenderSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                          } else if (e.key === 'Enter' && lenderSelectedIndex >= 0) {
                            e.preventDefault();
                            const lender = filteredLenders[lenderSelectedIndex];
                            const lenderInitials = lender.name.substring(0, 2).toUpperCase();
                            setFormData({
                              ...formData,
                              lender_id: lender.id?.toString(),
                              lender_name: lender.name,
                              bill_number: lenderInitials ? lenderInitials + '-' : ''
                            });
                            setLenderSearchTerm('');
                            setShowLenderDropdown(false);
                            setLenderSelectedIndex(-1);
                          } else if (e.key === 'Escape') {
                            setShowLenderDropdown(false);
                          }
                        }}
                        onFocus={() => setShowLenderDropdown(true)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />

                      {/* Lender Dropdown */}
                      {showLenderDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                          {filteredLenders.length > 0 ? (
                            filteredLenders.map((lender: any, idx: number) => (
                              <button
                                key={lender.id}
                                type="button"
                                onClick={() => {
                                  const lenderInitials = lender.name.substring(0, 2).toUpperCase();
                                  setFormData({
                                    ...formData,
                                    lender_id: lender.id?.toString(),
                                    lender_name: lender.name,
                                    bill_number: lenderInitials ? lenderInitials + '-' : ''
                                  });
                                  setLenderSearchTerm('');
                                  setShowLenderDropdown(false);
                                  setLenderSelectedIndex(-1);
                                }}
                                className={`w-full px-4 py-3 text-left transition-colors border-b border-border last:border-b-0 ${idx === lenderSelectedIndex
                                  ? 'bg-primary/20 text-foreground font-medium'
                                  : 'hover:bg-muted/50 text-foreground'
                                  }`}
                              >
                                <div className="font-medium text-foreground">{lender.name}</div>
                                <div className="text-xs text-muted-foreground">{lender.bank_code}</div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-center text-muted-foreground text-sm">
                              No lenders found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Loan Number and Bill Number */}
              <div className="grid grid-cols-2 gap-4">
                {/* Loan Number */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Loan Account Number</label>
                  <input
                    type="text"
                    value={formData.loan_account_number}
                    maxLength={18}
                    onChange={(e) => setFormData({ ...formData, loan_account_number: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter or auto-fill from loan"
                  />
                </div>

                {/* Folio Number */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Bill Number <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.bill_number}
                    maxLength={10}
                    onChange={(e) => setFormData({ ...formData, bill_number: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter Bill number"
                    required
                  />
                </div>
              </div>

              {/* Receiving Bank Account */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Receiving Bank Account (Tally Account) <span className="text-red-500">*</span>
                </label>
                <select 
                  name="bank_account"
                  value={formData.bank_account}
                  onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                >
                  <option value="Yes Bank">Yes Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="IDFC Bank">IDFC Bank</option>
                  <option value="AU Bank">AU Bank</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                </select>
              </div>

              {/* Transaction ID / UTR Number input (commented out as requested - remote tally format remains unchanged) */}
              {/* <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Transaction ID / UTR Number
                </label>
                <input
                  type="text"
                  value={formData.transaction_id || ''}
                  onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. UTR / TXN12345678"
                />
              </div> */}



              {/* Row 3: Purpose and Amount */}
              <div className="grid grid-cols-2 gap-4">
                {/* Purpose */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Purpose <span className="text-red-500">*</span></label>
                  {formData.purpose === 'Other' ? (
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.custom_purpose}
                        onChange={(e) => setFormData({ ...formData, custom_purpose: e.target.value })}
                        placeholder="Please specify the purpose"
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 pr-20"
                        required
                      />
                      {/* CR/DR Toggle inside input */}
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 p-1 bg-muted rounded">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, transaction_type: 'CR' })}
                          className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${formData.transaction_type === 'CR'
                            ? 'bg-green-600 text-white'
                            : 'bg-background text-foreground hover:bg-muted border border-border'
                            }`}
                        >
                          CR
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, transaction_type: 'DR' })}
                          className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${formData.transaction_type === 'DR'
                            ? 'bg-red-600 text-white'
                            : 'bg-background text-foreground hover:bg-muted border border-border'
                            }`}
                        >
                          DR
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, purpose: '', custom_purpose: '' })}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value, custom_purpose: '', transaction_type: purposeOptions.find(p => p.value === e.target.value)?.type || 'CR' })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                      required
                    >
                      <option value="">Select a purpose...</option>
                      {purposeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Amount <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.amount ? Number(formData.amount.toString().replace(/,/g, '')).toLocaleString('en-IN') : ''}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/[^0-9]/g, '');
                      if (rawValue.length <= 10) {
                        setFormData({ ...formData, amount: rawValue });
                      }
                    }}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter amount"
                    maxLength={15}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setShowNewCustomerForm(false);
                    setFormData({ loan_id: '', loan_number: '', loan_account_number: '', lender_id: '', lender_name: '', bill_number: '', customer_name: '', purpose: 'payment_received', amount: '', custom_purpose: '', transaction_type: 'CR', bank_account: 'Yes Bank', transaction_id: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPaymentRequest && paymentRequestLoanId && (
        <PaymentRequestModal
          loanId={paymentRequestLoanId}
          folio={paymentRequestFolio}
          onClose={() => { setShowPaymentRequest(false); setPaymentRequestLoanId(null); setPaymentRequestFolio(null); }}
        />
      )}
    </div>
  );
}

