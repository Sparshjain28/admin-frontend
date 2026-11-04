import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Download, Filter, CheckCircle2, Clock, AlertCircle, X, Edit2, Check, XCircle, Eye, Car, Shield, Users, Search, Trash2, ChevronDown, ChevronRight, PlusCircle, Receipt, FileText } from 'lucide-react';
import { toast } from 'sonner';
import LedgerDetailModal from '@/components/LedgerDetailModal';
import PaymentRequestModal from '@/components/PaymentRequestModal';

const ENTRY_PURPOSES = [
  'LOAN CLOSURE',
  'CUSTOMER PAYMENT',
  'RTO CHARGES',
  'INSURANCE',
  'PUC',
  'CHALLAN',
  'SOA/BANKING'
];

function compressImage(file: File, maxSizeMB = 1, maxWidth = 1920): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.size <= maxSizeMB * 1024 * 1024) {
      resolve(file);
      return;
    }
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = h * maxWidth / w; w = maxWidth; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return; }
        const compressed = new File([blob], file.name, { type: file.type });
        resolve(compressed.size < file.size ? compressed : file);
      }, file.type, 0.7);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

export default function AccountPayments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryData, setEntryData] = useState({
    txn_type: '',
    utr_no: '',
    amount: '',
    bill_number: '',
    credit_debit: 'debit',
    remarks: '',
    loan_id: ''
  });
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [viewingLedger, setViewingLedger] = useState<any>(null);
  const [loanDetails, setLoanDetails] = useState<any>(null);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [initiatingPaymentId, setInitiatingPaymentId] = useState<number | null>(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [utrError, setUtrError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectPaymentId, setRejectPaymentId] = useState<number | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [infoHover, setInfoHover] = useState<{ payment: any; rect: DOMRect } | null>(null);
  const [semiApproved, setSemiApproved] = useState<Map<number, {
    utr_no?: string;
    admin_remarks?: string;
    accountant_remarks?: string;
  }>>(new Map());

  // Raise Payment Request Modal state
  const [showRaiseRequestModal, setShowRaiseRequestModal] = useState(false);
  const [userLoans, setUserLoans] = useState<any[]>([]);
  const [selectedLoanIdForRequest, setSelectedLoanIdForRequest] = useState<string>('');
  const [raiseAmount, setRaiseAmount] = useState<string>('');
  const [raisePurpose, setRaisePurpose] = useState<string>('REQUEST RAISED FOR BILL MAPPING');
  const [raiseBillNo, setRaiseBillNo] = useState<string>('');
  const [raiseRemarks, setRaiseRemarks] = useState<string>('');
  const [raiseFile, setRaiseFile] = useState<File | null>(null);
  const [isSubmittingRaise, setIsSubmittingRaise] = useState(false);

  // Dedicated Bill Mapping Modal state
  const [showBillMappingModal, setShowBillMappingModal] = useState(false);
  const [billMappingFiles, setBillMappingFiles] = useState<File[]>([]);
  const [billMappingRemarks, setBillMappingRemarks] = useState('');
  const [isSubmittingBillMapping, setIsSubmittingBillMapping] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedPartners, setExpandedPartners] = useState<Record<string, boolean>>({});



  const { data: payments = [] } = useQuery({
    queryKey: ['account-payments', user?.id],
    queryFn: async () => {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const headers = { Authorization: `Bearer ${localStorage.getItem('auth_token')}` };
      const statuses = ['bm_dsa_pending', 'bm_dsa_sm_pending', 'sales_manager_approval', 'accountant_approval', 'admin_approval', 'pending'];
      const results = await Promise.all(
        statuses.map(s =>
          fetch(`${baseUrl}/accountant/payments?status=${s}`, { headers })
            .then(r => r.ok ? r.json() : [])
        )
      );
      const flat = results.flat();
      const unique = flat.filter((p, i, arr) => arr.findIndex((x: any) => Number(x.id) === Number(p.id)) === i);
      return unique.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || a.payment_date || 0).getTime();
        const dateB = new Date(b.created_at || b.payment_date || 0).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return Number(b.id || 0) - Number(a.id || 0);
      });
    },
    enabled: !!user,
  });

  // Hydrate semiApproved state from API response on load/reload
  useEffect(() => {
    if (!payments?.length) return;
    const map = new Map<number, { utr_no?: string; admin_remarks?: string; accountant_remarks?: string }>();
    for (const p of payments) {
      if (p.semi_approved) {
        map.set(Number(p.id), {
          utr_no: p.utr_reference || undefined,
          admin_remarks: p.admin_remarks || undefined,
          accountant_remarks: p.accountant_remarks || undefined,
        });
      }
    }
    if (map.size > 0) {
      setSemiApproved(map);
    }
  }, [payments]);

  // Separate query to fetch completed + rejected
  const { data: historyPayments = [] } = useQuery({
    queryKey: ['account-payments-history', user?.id],
    queryFn: async () => {
      const [completedRes, rejectedRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/payments?status=completed`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        }),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/payments?status=rejected`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        })
      ]);
      const completed = completedRes.ok ? await completedRes.json() : [];
      const rejected = rejectedRes.ok ? await rejectedRes.json() : [];
      return [...completed, ...rejected];
    },
    enabled: !!user,
  });





  // Sync an approved payout earning to Tally (Commission A/c Dr → Person A/c Cr)
  const handleSyncPayoutToTally = async (earningId: number) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/payouts/earnings/${earningId}/sync-tally`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Synced to Tally');
      } else {
        toast.error(data.error || 'Failed to sync to Tally');
      }
    } catch (error) {
      toast.error('Failed to sync to Tally');
    }
  };

  // Mark an approved payout as paid (also pushes the Tally journal)
  const handleMarkPayoutPaid = async (earningId: number) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/payouts/earnings/${earningId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ status: 'paid' })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Payout marked as paid');
        queryClient.invalidateQueries({ queryKey: ['account-approved-payouts'] });
      } else {
        toast.error(data.error || 'Failed to mark as paid');
      }
    } catch (error) {
      toast.error('Failed to mark as paid');
    }
  };



  // Fetch folio accounts for My Folios tab
  const { data: folioAccounts = [], isLoading: foliosLoading } = useQuery({
    queryKey: ['folio-accounts', user?.id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/folio-accounts`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!user,
  });

  // Fetch all user loans so unmapped leads also display in All Bills tab
  const { data: userLoansList = [] } = useQuery({
    queryKey: ['user-loans-all', user?.id],
    queryFn: async () => {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${baseUrl}/loans?limit=500`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data.loans || [];
    },
    enabled: !!user,
  });

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/payments/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...entryData,
          amount: Number(entryData.amount),
          loan_id: entryData.loan_id ? Number(entryData.loan_id) : null
        })
      });
      if (response.ok) {
        toast.success('Entry submitted for approval');
        setShowEntryForm(false);
        setEntryData({ txn_type: '', utr_no: '', amount: '', bill_number: '', credit_debit: 'debit', remarks: '', loan_id: '' });
        queryClient.invalidateQueries({ queryKey: ['account-payments'] });
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to add entry');
      }
    } catch (error) {
      toast.error('Failed to add entry');
    }
  };

  const handleUpdateStatus = async (id: number, status: string, options?: { utr_no?: string; bill_number?: string; txn_type?: string; remarks?: string; admin_remarks?: string; accountant_remarks?: string; sales_manager_remarks?: string }) => {
    try {
      if (isAccountantRole && status !== 'rejected') {
        const remarksVal = options?.accountant_remarks || options?.remarks;
        if (!remarksVal || !remarksVal.trim()) {
          toast.error('Remarks are mandatory for Accountant approval');
          return;
        }
      }
      const payload: any = { status };
      if (options?.utr_no) payload.utr_no = options.utr_no;
      if (options?.bill_number) payload.bill_number = options.bill_number;
      if (options?.remarks) payload.remarks = options.remarks;
      if (options?.admin_remarks) payload.admin_remarks = options.admin_remarks;
      if (options?.accountant_remarks) payload.accountant_remarks = options.accountant_remarks;
      if (options?.sales_manager_remarks) payload.sales_manager_remarks = options.sales_manager_remarks;

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/payments/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        let successMsg = '';

        if (status === 'sales_manager_approval') {
          successMsg = 'Payment approved';
        } else if (status === 'accountant_approval') {
          successMsg = 'Approved, pending accountant review';
        } else if (status === 'completed') {
          successMsg = 'Payment initiated successfully';
        } else if (status === 'rejected') {
          successMsg = 'Billing request rejected successfully';
        } else if (status === 'approved') {
          successMsg = 'Bill mapping approved successfully';
        } else if (status === 'admin_approval') {
          successMsg = 'Payment approved, pending admin review';
        } else {
          successMsg = `Payment ${status}`;
        }

        toast.success(successMsg);
        // clear any local UI state
        setShowLedgerModal(false);
        setViewingLedger(null);
        setLoanDetails(null);
        setUtrNumber('');
        queryClient.invalidateQueries({ queryKey: ['account-payments'] });
        queryClient.invalidateQueries({ queryKey: ['accountant-dashboard'] });
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/payments/${editingPayment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(editingPayment)
      });
      if (response.ok) {
        toast.success('Payment entry updated successfully');
        setEditingPayment(null);
        queryClient.invalidateQueries({ queryKey: ['account-payments'] });
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update entry');
      }
    } catch (error) {
      toast.error('Failed to update entry');
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/payments/export`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'payments.csv';
        a.click();
        toast.success('Payments exported');
      }
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const handleViewLedger = async (payment: any) => {
    setSelectedLoanId(payment.loan_id?.toString());
    // Merge semi-approved UTR/remarks into viewingLedger in case query hasn't refetched yet
    const semiData = semiApproved.get(Number(payment.id));
    if (semiData) {
      payment = { ...payment, utr_reference: semiData.utr_no || payment.utr_reference, admin_remarks: semiData.admin_remarks || payment.admin_remarks, accountant_remarks: semiData.accountant_remarks || payment.accountant_remarks };
    }
    setViewingLedger(payment);
    setShowLedgerModal(true);
    if (payment.loan_id) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/payments/case-details/${payment.loan_id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          setLoanDetails(data);
        }
      } catch (error) {
      }
    }
  };

  const handleDeleteAll = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/payments/all`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'All requests deleted');
        setShowDeleteAllModal(false);
        queryClient.invalidateQueries({ queryKey: ['account-payments'] });
        queryClient.invalidateQueries({ queryKey: ['account-payments-history'] });
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete all requests');
    }
  };

  const fetchUserLoans = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${baseUrl}/loans?limit=100`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserLoans(Array.isArray(data) ? data : data.loans || []);
      }
    } catch (e) {
      console.error('Failed to fetch user loans', e);
    }
  };

  const handleRaisePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanIdForRequest || !raiseAmount) {
      toast.error('Please select a loan and enter amount');
      return;
    }
    setIsSubmittingRaise(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const formData = new FormData();
      formData.append('loan_id', selectedLoanIdForRequest);
      formData.append('amount', raiseAmount);
      formData.append('payout_amount', raiseAmount);
      formData.append('purpose', raisePurpose);
      formData.append('txn_type', raisePurpose === 'REQUEST RAISED FOR BILL MAPPING' ? 'BILL_MAPPING_REQUEST' : raisePurpose);
      if (raiseBillNo) formData.append('bill_number', raiseBillNo);
      if (raiseRemarks) formData.append('remarks', raiseRemarks);
      if (raiseFile) formData.append('document', raiseFile);

      const res = await fetch(`${baseUrl}/accountant/payments/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Payment request submitted successfully for Accountant review');
        setShowRaiseRequestModal(false);
        setSelectedLoanIdForRequest('');
        setRaiseAmount('');
        setRaiseBillNo('');
        setRaiseRemarks('');
        setRaiseFile(null);
        queryClient.invalidateQueries({ queryKey: ['account-payments'] });
      } else {
        toast.error(data.error || 'Failed to submit payment request');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit payment request');
    } finally {
      setIsSubmittingRaise(false);
    }
  };

  const handleRaiseBillMappingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanIdForRequest) {
      toast.error('Please select a loan');
      return;
    }
    if (billMappingFiles.length === 0) {
      toast.error('File upload is mandatory. Please select a supporting document.');
      return;
    }
    setIsSubmittingBillMapping(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const formData = new FormData();
      formData.append('loan_id', selectedLoanIdForRequest);
      formData.append('amount', '0');
      formData.append('purpose', 'REQUEST RAISED FOR BILL MAPPING');
      formData.append('txn_type', 'BILL_MAPPING_REQUEST');
      if (billMappingRemarks) formData.append('remarks', billMappingRemarks);
      if (billMappingFiles.length > 0) formData.append('document', billMappingFiles[0]);

      const res = await fetch(`${baseUrl}/accountant/payments/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        const nextApprover = user?.role === 'branch_manager' || user?.role === 'dsa' ? 'Sales Manager' : 'Accountant';
        toast.success(`✅ ${data.message || `Bill mapping request sent to ${nextApprover} successfully!`}`);
        setShowBillMappingModal(false);
        setSelectedLoanIdForRequest('');
        setBillMappingFiles([]);
        setBillMappingRemarks('');
        queryClient.invalidateQueries({ queryKey: ['account-payments'] });
        queryClient.invalidateQueries({ queryKey: ['folio-accounts'] });
      } else {
        toast.error(data.error || 'Failed to submit bill mapping request');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit bill mapping request');
    } finally {
      setIsSubmittingBillMapping(false);
    }
  };

  // Filter by role, status, and user for workflow
  const role = user?.role;
  const uid = Number(user?.id);
  const isAdminRole = ['admin', 'super_admin', 'l1_admin', 'l1 - admin', 'admin_head'].includes((role || '').toLowerCase()) || (role || '').toLowerCase().includes('admin');
  const isAccountantRole = ['accountant', 'accountant_head', 'account_head'].includes((role || '').toLowerCase()) || (role || '').toLowerCase().includes('accountant');

  const sortByRecent = (arr: any[]) => {
    return [...arr].sort((a: any, b: any) => {
      const timeA = new Date(a.created_at || a.payment_date || 0).getTime();
      const timeB = new Date(b.created_at || b.payment_date || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return Number(b.id || 0) - Number(a.id || 0);
    });
  };

  // Pending for Approval: entries needing this user's action
  const pendingForApproval = sortByRecent(payments?.filter((p: any) => {
    if (['completed', 'rejected', 'approved', 'bill_map_completed'].includes(p.status)) return false;

    const isBillMapping = p.txn_type === 'BILL_MAPPING_REQUEST' || p.purpose === 'REQUEST RAISED FOR BILL MAPPING' || p.txn_type === 'FOLIO_CREATION_REQUEST' || (typeof p.purpose === 'string' && p.purpose.startsWith('FOLIO:'));
    if (role === 'sales_manager') {
      if (isBillMapping) return false;
      return p.status === 'pending' || p.status === 'bm_dsa_sm_pending';
    }
    if (role === 'branch_manager' || role === 'dsa') return p.status === 'bm_dsa_pending' || p.status === 'bm_dsa_sm_pending';
    if (isAccountantRole) return p.status === 'sales_manager_approval' || p.status === 'accountant_approval' || (isBillMapping && (p.status === 'pending' || p.status === 'accountant_approval'));
    if (isAdminRole) return p.status === 'admin_approval' || p.status === 'pending_approval' || (isBillMapping && (p.status === 'admin_approval' || p.status === 'pending' || p.status === 'accountant_approval'));
    return false;
  }) || []);

  // In Process: entries created by this user, still in workflow (not completed/rejected)
  const inProcess = sortByRecent(payments?.filter((p: any) => {
    const isBillMapping = p.txn_type === 'BILL_MAPPING_REQUEST' || p.purpose === 'REQUEST RAISED FOR BILL MAPPING' || p.txn_type === 'FOLIO_CREATION_REQUEST' || (typeof p.purpose === 'string' && p.purpose.startsWith('FOLIO:'));
    if (role === 'sales_manager' && isBillMapping) return false;
    return Number(p.user_id) === uid && !['completed', 'rejected'].includes(p.status);
  }) || []);

  // Completed Requests: entries the current user personally approved/rejected
  const completedRequests = sortByRecent([...historyPayments, ...payments]
    .filter((p: any) => {
      const isBillMapping = p.txn_type === 'BILL_MAPPING_REQUEST' || p.purpose === 'REQUEST RAISED FOR BILL MAPPING' || p.txn_type === 'FOLIO_CREATION_REQUEST' || (typeof p.purpose === 'string' && p.purpose.startsWith('FOLIO:'));
      if (role === 'sales_manager' && isBillMapping) return false;
      // Always include completed/rejected (backend already filters by personal approval)
      if (p.status === 'completed' || p.status === 'rejected') return true;
      // For intermediate statuses: show if the user personally approved at their level
      if (role === 'branch_manager' || role === 'dsa') {
        return Number(p.sm_approved_by) === uid
          && ['sales_manager_approval', 'accountant_approval', 'admin_approval'].includes(p.status);
      }
      if (role === 'sales_manager') {
        return Number(p.sales_manager_approved_by) === uid
          && ['accountant_approval', 'admin_approval'].includes(p.status);
      }
      if (role === 'accountant') {
        return Number(p.accountant_approved_by) === uid
          && ['admin_approval'].includes(p.status);
      }
      return false;
    })
    // Deduplicate by id
    .filter((p, i, arr) => arr.findIndex((x: any) => Number(x.id) === Number(p.id)) === i));

  const handleSemiApprove = (id: number, data?: {
    utr_no?: string;
    admin_remarks?: string;
    accountant_remarks?: string;
  }) => {
    setSemiApproved(prev => {
      const next = new Map(prev);
      const existing = next.get(id) || {};
      next.set(id, { ...existing, ...data });
      return next;
    });
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/payments/${id}/semi-approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      body: JSON.stringify(data || {}),
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['account-payments'] });
      queryClient.invalidateQueries({ queryKey: ['loan-payments-ledger'] });
    }).catch(() => { });
  };

  const getApproveStatus = (payment: any) => {
    const isBillMapping = payment?.txn_type === 'BILL_MAPPING_REQUEST' || payment?.purpose === 'REQUEST RAISED FOR BILL MAPPING' || payment?.txn_type === 'FOLIO_CREATION_REQUEST' || (typeof payment?.purpose === 'string' && payment.purpose.startsWith('FOLIO:'));
    if (isBillMapping) {
      if (role === 'accountant') return 'admin_approval';
      if (role === 'admin') return 'completed';
      return '';
    }
    if (role === 'branch_manager' || role === 'dsa') {
      if (payment?.status === 'bm_dsa_sm_pending' || payment?.status === 'bm_dsa_pending') return 'sales_manager_approval';
      return 'sales_manager_approval';
    }
    if (role === 'sales_manager') {
      return 'sales_manager_approval';
    }
    if (role === 'accountant') return 'admin_approval';
    if (role === 'admin') return 'completed';
    return '';
  };

  const handleFinalApprove = async () => {
    for (const id of selectedIds) {
      const payment = pendingForApproval.find((p: any) => Number(p.id) === id);
      if (!payment) continue;
      if (isAccountantRole) {
        const opts = semiApproved.get(id);
        const remarksVal = opts?.accountant_remarks || opts?.remarks;
        if (!remarksVal || !remarksVal.trim()) {
          toast.error(`Remarks are mandatory for Accountant approval (Request ID: ${payment.request_id || id})`);
          return;
        }
      }
      const alreadySemi = semiApproved.has(id);
      if (role === 'admin' && !alreadySemi) {
        // Admin semi-approves first — keeps request in pending for a separate final approve
        handleSemiApprove(id, {});
        continue;
      }
      const targetStatus = getApproveStatus(payment);
      if (targetStatus) {
        const opts = semiApproved.get(id);
        await handleUpdateStatus(Number(id), targetStatus, { utr_no: opts?.utr_no, admin_remarks: opts?.admin_remarks, accountant_remarks: opts?.accountant_remarks });
        setSemiApproved(prev => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      }
    }
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getApprovalTrace = (p: any) => {
    if (!p) return null;
    const isBillMapping = p.txn_type === 'BILL_MAPPING_REQUEST' || p.purpose === 'REQUEST RAISED FOR BILL MAPPING' || p.txn_type === 'FOLIO_CREATION_REQUEST' || (typeof p.purpose === 'string' && p.purpose.startsWith('FOLIO:'));
    if (isBillMapping) {
      if (p.status === 'admin_approval') {
        return { accepted: 'DSA, Accountant', inProcess: 'Admin', pending: 'Admin' };
      }
      if (p.status === 'sales_manager_approval' || p.status === 'pending' || p.status === 'accountant_approval') {
        return { accepted: 'DSA / BM', inProcess: 'Accountant', pending: 'Accountant, Admin' };
      }
      if (p.status === 'completed') {
        return { accepted: 'DSA, Accountant, Admin', inProcess: 'Completed', pending: 'None' };
      }
      if (p.status === 'rejected') {
        return { accepted: '-', inProcess: 'Rejected', pending: '-' };
      }
    } else {
      if (p.status === 'bm_dsa_pending') {
        return { accepted: 'DSA / BM', inProcess: 'Branch Manager', pending: 'Branch Manager, Sales Manager, Accountant, Admin' };
      }
      if (p.status === 'bm_dsa_sm_pending' || p.status === 'pending') {
        return { accepted: 'DSA / BM', inProcess: 'Sales Manager', pending: 'Sales Manager, Accountant, Admin' };
      }
      if (p.status === 'sales_manager_approval') {
        return { accepted: 'DSA / BM, Sales Manager', inProcess: 'Accountant', pending: 'Accountant, Admin' };
      }
      if (p.status === 'accountant_approval') {
        return { accepted: 'DSA / BM, Sales Manager, Accountant', inProcess: 'Admin', pending: 'Admin' };
      }
      if (p.status === 'admin_approval') {
        return { accepted: 'DSA / BM, Sales Manager, Accountant', inProcess: 'Admin', pending: 'Admin' };
      }
      if (p.status === 'completed') {
        return { accepted: 'DSA / BM, Sales Manager, Accountant, Admin', inProcess: 'Completed', pending: 'None' };
      }
      if (p.status === 'rejected') {
        return { accepted: '-', inProcess: 'Rejected', pending: '-' };
      }
    }
    return { accepted: '-', inProcess: p.status, pending: '-' };
  };

  const isAdmin = isAdminRole;
  const isAccountant = isAccountantRole;
  const canBulkApprove = isAdmin || isAccountant;

  const filterBySearch = (list: any[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((item: any) => {
      const matchDate = (item.payment_date || item.created_at || '') && new Date(item.payment_date || item.created_at).toLocaleDateString('en-IN').toLowerCase().includes(q);
      const matchInitiator = (item.created_by_name || item.initiator_name || item.user_name || item.partner_name || item.user?.name || '').toLowerCase().includes(q);
      const matchReqId = String(item.request_id || item.id || '').toLowerCase().includes(q);
      const matchCustomer = (item.customer_name || item.applicant_name || item.borrower_name || '').toLowerCase().includes(q);
      const matchBillNo = (item.bill_number || '').toLowerCase().includes(q);
      const matchVehicleNo = (item.vehicle_number || '').toLowerCase().includes(q);
      const matchMaker = ([item.maker_name, item.maker_model].filter(Boolean).join(' ') || '').toLowerCase().includes(q);
      const matchAcc = String(item.account_number || item.loan_account_number || item.account_no || item.bank_account_number || '').toLowerCase().includes(q);
      const matchIfsc = String(item.ifsc_code || item.ifsc || '').toLowerCase().includes(q);
      const matchPurpose = String(item.purpose || item.entry_purpose || item.txn_type || item.remarks || '').toLowerCase().includes(q);
      const matchAmount = String(item.amount || item.payout_amount || item.total_amount || '').toLowerCase().includes(q);
      const matchStatus = String(item.status || item.withdrawal_status || '').toLowerCase().includes(q);

      return matchDate || matchInitiator || matchReqId || matchCustomer || matchBillNo || matchVehicleNo || matchMaker || matchAcc || matchIfsc || matchPurpose || matchAmount || matchStatus;
    });
  };

  const myFolios = useMemo(() => {
    const existingFolioLoanIds = new Set(
      folioAccounts.filter((f: any) => !!f.loan_id).map((f: any) => Number(f.loan_id))
    );

    const seenKeys = new Set<string>();
    const uniqueFolioAccounts: any[] = [];

    folioAccounts.forEach((f: any) => {
      const billKey = f.bill_number ? String(f.bill_number).trim().toLowerCase() : '';
      const loanKey = f.loan_id ? String(f.loan_id) : '';
      const custKey = (f.customer_name || f.mapped_customer_name) ? String(f.customer_name || f.mapped_customer_name).trim().toLowerCase() : '';

      const key = billKey ? `bill_${billKey}` : loanKey ? `loan_${loanKey}` : custKey ? `cust_${custKey}` : `id_${f.id}`;

      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueFolioAccounts.push(f);
      }
    });

    const mappedFolios = uniqueFolioAccounts.map((f: any) => {
      const matchingLoan = userLoansList.find((l: any) => Number(l.id) === Number(f.loan_id));
      return {
        ...f,
        bill_number: f.bill_number || matchingLoan?.bill_number || '',
        customer_name: f.customer_name || f.mapped_customer_name || matchingLoan?.applicant_name || matchingLoan?.customer_name || '-',
        vehicle_number: f.vehicle_number || f.mapped_vehicle_number || matchingLoan?.vehicle_number || '-',
        maker_name: f.maker_name || matchingLoan?.maker_name || '',
        maker_model: f.maker_model || f.mapped_maker_model || matchingLoan?.maker_model || matchingLoan?.model_variant_name || '-',
        amount: f.amount || f.mapped_loan_amount || matchingLoan?.loan_amount || 0,
        created_at: f.created_at || matchingLoan?.created_at || f.mapped_at,
        disbursement_date: f.disbursement_date || matchingLoan?.disbursement_date || f.mapped_disbursement_date,
      };
    });

    const unmappedLoans = userLoansList
      .filter((loan: any) => {
        const hasIdMatch = existingFolioLoanIds.has(Number(loan.id));
        const hasBillMatch = loan.bill_number && seenKeys.has(`bill_${loan.bill_number.trim().toLowerCase()}`);
        return !hasIdMatch && !hasBillMatch;
      })
      .map((loan: any) => ({
        id: `loan_${loan.id}`,
        loan_id: loan.id,
        bill_number: loan.bill_number || '',
        customer_name: loan.applicant_name || loan.customer_name || 'N/A',
        vehicle_number: loan.vehicle_number || '-',
        maker_name: loan.maker_name || '',
        maker_model: loan.maker_model || loan.model_variant_name || '-',
        amount: loan.loan_amount || 0,
        created_at: loan.created_at,
        disbursement_date: loan.disbursement_date,
        status: 'active'
      }));

    const combined = [...mappedFolios, ...unmappedLoans];
    return combined.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || a.disbursement_date || a.mapped_at || 0).getTime();
      const dateB = new Date(b.created_at || b.disbursement_date || b.mapped_at || 0).getTime();
      if (dateA !== dateB) return dateB - dateA;

      const idA = Number(String(a.loan_id || a.id || '').replace(/\D/g, '') || 0);
      const idB = Number(String(b.loan_id || b.id || '').replace(/\D/g, '') || 0);
      return idB - idA;
    });
  }, [folioAccounts, userLoansList]);

  const filteredMyFolios = filterBySearch(myFolios);
  const filteredPendingForApproval = filterBySearch(pendingForApproval);
  const filteredInProcess = filterBySearch(inProcess);
  const filteredCompletedRequests = filterBySearch(completedRequests);

  const tabs = [
    { id: 'pending', label: 'Pending for Approval', count: filteredPendingForApproval.length, roles: ['admin', 'accountant', 'branch_manager', 'dsa', 'sales_manager', 'executive', 'team_leader', 'operation_team', 'loan_operations', 'manager'] },
    { id: 'inprocess', label: 'In Process', count: filteredInProcess.length, roles: ['admin', 'accountant', 'branch_manager', 'dsa', 'sales_manager', 'executive', 'team_leader', 'operation_team', 'loan_operations', 'manager'] },
    { id: 'history', label: 'Completed Requests', count: filteredCompletedRequests.length, roles: ['admin', 'accountant', 'branch_manager', 'dsa', 'sales_manager', 'executive', 'team_leader', 'operation_team', 'loan_operations', 'manager'] },
    { id: 'folios', label: 'All Bills', count: filteredMyFolios.length, roles: ['admin', 'accountant', 'branch_manager', 'dsa', 'sales_manager', 'executive', 'team_leader', 'operation_team', 'loan_operations', 'manager'] },
  ];

  return (
    <div className="flex-1 flex flex-col h-full  overflow-hidden  relative z-10 lg:-mt-8">
      <div className="flex-1 overflow-y-auto   ">
        {/* Tabs */}
        <div className="flex items-center justify-between gap-2 px-2 sm:px-2 mb-4 border-b border-border mt-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 min-w-0">
            <div className="flex gap-0.5 shrink-0">
              {tabs.filter(t => t.roles.some(r => r === 'admin' ? isAdminRole : r === 'accountant' ? isAccountantRole : (r.toLowerCase() === (user?.role || '').toLowerCase()))).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap shrink-0 ${activeTab === tab.id
                      ? 'bg-primary text-primary-foreground border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search Input - placed directly after Raise Payment Request */}
            <div className="relative w-36 sm:w-56 shrink-0 mb-1 ml-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-7 py-1 text-xs rounded-full border-2 border-gray-400 dark:border-gray-500 bg-background text-foreground placeholder:text-gray-400 focus:outline-none focus:border-primary shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {(user?.role === 'admin' || user?.role === 'accountant' || (user?.role || '').toLowerCase().includes('admin') || (user?.role || '').toLowerCase().includes('account')) && (
            <div className="shrink-0 mb-1">
              <button onClick={() => setShowDeleteAllModal(true)} className="hidden lg:inline-flex px-2 py-1 text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-200 dark:border-red-800">
                <Trash2 size={12} className="inline mr-1" />Delete All
              </button>
            </div>
          )}
        </div>

        {/* Tab Content: Pending for Approval */}
        {activeTab === 'pending' && (
          <div className="space-y-3">
            {canBulkApprove && selectedIds.size > 0 && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
                <button onClick={handleFinalApprove} className="px-3 py-1.5 text-[10px] font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Final Approve ({selectedIds.size})
                </button>
              </div>
            )}
            {filteredPendingForApproval.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">No pending requests</div>
            ) : (
              <>
                {/* Mobile: Cards */}
                <div className="grid grid-cols-1 gap-2 lg:hidden">
                  {filteredPendingForApproval.map((payment: any) => {
                    const isBillMapReq = payment.txn_type === 'BILL_MAPPING_REQUEST' || payment.purpose === 'REQUEST RAISED FOR BILL MAPPING';
                    const stageLabel = isBillMapReq
                      ? (payment.status === 'admin_approval'
                        ? { text: 'Admin Pending', bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' }
                        : { text: 'Accountant Pending', bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' })
                      : payment.status === 'bm_dsa_sm_pending' ? { text: 'BM/DSA & SM Pending', bg: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' }
                        : payment.status === 'bm_dsa_pending' ? { text: 'BM/DSA Pending', bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' }
                          : payment.status === 'pending' ? { text: 'SM Pending', bg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' }
                            : payment.status === 'sales_manager_approval' ? { text: 'Accountant Pending', bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' }
                              : payment.status === 'admin_approval' ? { text: 'Admin Pending', bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' }
                                : { text: payment.status || '-', bg: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300' };
                    const canAct = isBillMapReq
                      ? ((payment.status === 'pending' || payment.status === 'sales_manager_approval' || payment.status === 'accountant_approval') && (isAccountantRole || isAdminRole)) || (payment.status === 'admin_approval' && isAdminRole)
                      : (payment.status === 'bm_dsa_pending' && (role === 'branch_manager' || role === 'dsa'))
                        || (payment.status === 'bm_dsa_sm_pending' && (role === 'branch_manager' || role === 'dsa' || role === 'sales_manager'))
                        || (payment.status !== 'bm_dsa_pending' && payment.status !== 'bm_dsa_sm_pending' && (isAccountantRole || isAdminRole))
                        || (payment.status === 'pending' && role === 'sales_manager');
                    return (
                      <div key={payment.id} className="bg-card rounded-xl border border-border shadow-sm p-3">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 min-w-0">
                            {canBulkApprove && semiApproved.has(Number(payment.id)) && (
                              <input type="checkbox" checked={selectedIds.has(Number(payment.id))} onChange={() => toggleSelect(Number(payment.id))} className="accent-primary cursor-pointer shrink-0" />
                            )}
                            <span className="text-[9px] text-foreground truncate">{payment.payment_date || payment.created_at ? new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-IN') : '-'} | Requestid :-   {payment.request_id || '-'}</span>
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-semibold ${stageLabel.bg}`}>{stageLabel.text}</span>
                        </div>
                        <div className="mt-1 flex justify-between">
                          <span>
                            <p className="text-[13px] font-bold text-foreground truncate">Customer name:- {payment.customer_name || '-'}</p>
                            <p className="text-[12px] font-bold text-foreground truncate">Initiater:- {payment.user_name || '-'}</p>
                          </span>
                          <span className="flex flex-col mr-3">
                            <span className="text-lg font-bold text-foreground">₹{Number(payment.payout_amount || 0).toLocaleString('en-IN')}</span>
                            <span className="text-[12px] text-foreground font-semibold  max-w-[55%] text-right">{payment.purpose || payment.remarks || '-'}{payment.purpose === 'LOAN CLOSURE' && (payment.rc_lender_name || payment.bank_nbfc) && <span className="text-muted-foreground font-normal"> ({payment.rc_lender_name || payment.bank_nbfc})</span>}</span>
                          </span>
                        </div>
                        <div className='mt-1.5 flex justify-between'>
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            {((payment.txn_type === 'BILL_MAPPING_REQUEST' || payment.purpose === 'REQUEST RAISED FOR BILL MAPPING') ? payment.loan_account_number : payment.account_number) && (
                              <span className="text-[10px] font-semibold text-foreground truncate">A/c:- {(payment.txn_type === 'BILL_MAPPING_REQUEST' || payment.purpose === 'REQUEST RAISED FOR BILL MAPPING') ? (payment.loan_account_number || '-') : (payment.account_number || '-')}</span>
                            )}
                            {payment.ifsc_code && <span className="text-[10px] font-semibold text-foreground truncate">IFSC:- {payment.ifsc_code}</span>}
                            {payment.upi_link && <button onClick={() => navigator.clipboard.writeText(payment.upi_link)} className="px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[8px] font-semibold rounded border border-blue-600/20">Copy UPI</button>}
                            {payment.documents?.filter((d: any) => d.field_name === 'qr_upload').map((doc: any) => (
                              <a key={doc.id} href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${doc.file_path}`} target="_blank" className="px-1.5 py-0.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[8px] font-semibold rounded border border-blue-600/20">QR Upload</a>
                            ))}
                            {payment.documents?.filter((d: any) => d.field_name !== 'qr_upload').map((doc: any) => (
                              <a key={doc.id} href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${doc.file_path}`} target="_blank" className="px-1.5 py-0.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[8px] font-semibold rounded border border-blue-600/20">{payment.purpose === 'LOAN CLOSURE' ? 'Docs' : 'Proof'}</a>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onMouseEnter={(e) => { const rect = (e.target as HTMLElement).getBoundingClientRect(); setInfoHover({ payment, rect }); }} onMouseLeave={() => setInfoHover(null)} className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50">i</button>
                            {isAdminRole || (isAccountantRole && semiApproved.has(Number(payment.id))) ? (
                              <button onClick={() => handleViewLedger(payment)} className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 rounded text-[10px] font-semibold"><Edit2 size={12} className="inline mr-1" />Edit</button>
                            ) : (
                              <button onClick={() => handleViewLedger(payment)} className="px-3 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 rounded text-[10px] font-semibold flex items-center gap-1"><Eye size={15} className="inline" /> View</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Desktop: Table */}
                <div className="hidden lg:block rounded-2xl shadow-sm border border-border overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        {canBulkApprove && <th className="px-2 py-2 w-8">{semiApproved.size > 0 && <input type="checkbox" checked={selectedIds.size === filteredPendingForApproval.length && filteredPendingForApproval.length > 0} onChange={() => { if (selectedIds.size === filteredPendingForApproval.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filteredPendingForApproval.map((p: any) => Number(p.id)))); }} className="accent-primary cursor-pointer" />}</th>}
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Initiater Name</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Request ID</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Customer Name</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">A/c Number</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">IFSC</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Purpose</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Amount</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stage</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredPendingForApproval.map((payment: any) => {
                        const isBillMapReq = payment.txn_type === 'BILL_MAPPING_REQUEST' || payment.purpose === 'REQUEST RAISED FOR BILL MAPPING';
                        const stageLabel = isBillMapReq
                          ? (payment.status === 'admin_approval'
                            ? { text: 'Admin Pending', bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' }
                            : { text: 'Accountant Pending', bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' })
                          : payment.status === 'bm_dsa_sm_pending' ? { text: 'BM/DSA & SM Pending', bg: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' }
                            : payment.status === 'bm_dsa_pending' ? { text: 'BM/DSA Pending', bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' }
                              : payment.status === 'pending' ? { text: 'SM Pending', bg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' }
                                : payment.status === 'sales_manager_approval' ? { text: 'Accountant Pending', bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' }
                                  : payment.status === 'admin_approval' ? { text: 'Admin Pending', bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' }
                                    : { text: payment.status || '-', bg: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300' };
                        const canAct = isBillMapReq
                          ? ((payment.status === 'pending' || payment.status === 'sales_manager_approval' || payment.status === 'accountant_approval') && (isAccountantRole || isAdminRole)) || (payment.status === 'admin_approval' && isAdminRole)
                          : (payment.status === 'bm_dsa_pending' && (role === 'branch_manager' || role === 'dsa'))
                            || (payment.status === 'bm_dsa_sm_pending' && (role === 'branch_manager' || role === 'dsa' || role === 'sales_manager'))
                            || (payment.status !== 'bm_dsa_pending' && payment.status !== 'bm_dsa_sm_pending' && (isAccountantRole || isAdminRole))
                            || (payment.status === 'pending' && role === 'sales_manager');
                        return (
                          <tr key={payment.id} className="hover:bg-blue-50/50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors bg-white" onClick={() => canAct && handleViewLedger(payment)}>
                            {canBulkApprove && <td className="px-2 py-1.5 sm:py-2">{semiApproved.has(Number(payment.id)) && <input type="checkbox" checked={selectedIds.has(Number(payment.id))} onChange={() => toggleSelect(Number(payment.id))} className="accent-primary cursor-pointer" />}</td>}
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">{payment.payment_date || payment.created_at ? new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-IN') : '-'}</td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-medium text-foreground">{payment.user_name || '-'}</td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-mono text-foreground">{payment.request_id || '-'}</td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs text-foreground">{payment.customer_name || '-'}</td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-mono text-foreground">
                              {(payment.txn_type === 'BILL_MAPPING_REQUEST' || payment.purpose === 'REQUEST RAISED FOR BILL MAPPING') ? (payment.loan_account_number || '-') : (payment.account_number || '-')}
                            </td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-mono text-muted-foreground whitespace-nowrap">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span>{payment.ifsc_code || '-'}</span>
                                {payment.upi_link && <button onClick={() => navigator.clipboard.writeText(payment.upi_link)} className="px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[9px] font-semibold rounded border border-blue-600/20">Copy UPI</button>}
                                {payment.documents?.filter((d: any) => d.field_name === 'qr_upload').map((doc: any) => (
                                  <a key={doc.id} href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${doc.file_path}`} target="_blank" className="px-1.5 py-0.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[9px] font-semibold rounded border border-blue-600/20">QR</a>
                                ))}
                                {payment.documents?.filter((d: any) => d.field_name !== 'qr_upload').map((doc: any) => (
                                  <a key={doc.id} href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${doc.file_path}`} target="_blank" className="px-1.5 py-0.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[9px] font-semibold rounded border border-blue-600/20">{payment.purpose === 'LOAN CLOSURE' ? 'Docs' : 'Proof'}</a>
                                ))}
                              </div>
                            </td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs text-foreground">{payment.purpose || payment.remarks || '-'}{payment.purpose === 'LOAN CLOSURE' && (payment.rc_lender_name || payment.bank_nbfc) && <div className="text-[9px] text-muted-foreground">{payment.rc_lender_name || payment.bank_nbfc}</div>}</td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-bold text-foreground">₹{Number(payment.payout_amount || 0).toLocaleString('en-IN')}</td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${stageLabel.bg}`}>{stageLabel.text}</span></td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button onMouseEnter={(e) => { const rect = (e.target as HTMLElement).getBoundingClientRect(); setInfoHover({ payment, rect }); }} onMouseLeave={() => setInfoHover(null)} className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50" title="View Approval Trace">i</button>
                                {isAdminRole || (isAccountantRole && semiApproved.has(Number(payment.id))) ? (
                                  <button onClick={() => handleViewLedger(payment)} className="px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 rounded text-[10px] font-semibold flex items-center gap-1" title="Edit/Review"><Edit2 size={12} /> Edit</button>
                                ) : (
                                  <button onClick={() => handleViewLedger(payment)} className="px-2.5 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 rounded text-[10px] font-semibold flex items-center gap-1" title="View & Approve"><Eye size={14} /> View</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab Content: In Process */}
        {activeTab === 'inprocess' && (
          <div className="">
            {filteredInProcess.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">No in-process requests</div>
            ) : (
              <>
                {/* Mobile: Cards */}
                <div className="grid grid-cols-1 gap-2 lg:hidden">
                  {filteredInProcess.map((payment: any) => {
                    const stageLabel = (payment.txn_type === 'BILL_MAPPING_REQUEST' || payment.purpose === 'REQUEST RAISED FOR BILL MAPPING')
                      ? (payment.status === 'admin_approval'
                        ? { text: 'Admin Pending', bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' }
                        : { text: 'Accountant Pending', bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' })
                      : payment.status === 'bm_dsa_sm_pending' ? { text: 'BM/DSA & SM Pending', bg: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' }
                        : payment.status === 'bm_dsa_pending' ? { text: 'BM/DSA Pending', bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' }
                          : payment.status === 'pending' ? { text: 'SM Pending', bg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' }
                            : payment.status === 'sales_manager_approval' ? { text: 'Accountant Pending', bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' }
                              : payment.status === 'admin_approval' ? { text: 'Admin Pending', bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' }
                                : { text: payment.status || '-', bg: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300' };
                    const canAct = (payment.status === 'bm_dsa_pending' && (role === 'branch_manager' || role === 'dsa'))
                      || (payment.status === 'bm_dsa_sm_pending' && (role === 'branch_manager' || role === 'dsa' || role === 'sales_manager'))
                      || (payment.status !== 'bm_dsa_pending' && payment.status !== 'bm_dsa_sm_pending' && (role === 'accountant' || role === 'admin'))
                      || (payment.status === 'pending' && role === 'sales_manager');
                    return (
                      <div key={payment.id} className="bg-card rounded-xl border border-border shadow-sm p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-foreground">{payment.payment_date || payment.created_at ? new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-IN') : '-'} | Requestid :-   {payment.request_id || '-'}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-semibold ${stageLabel.bg}`}>{stageLabel.text}</span>
                        </div>
                        <div className="mt-1 flex justify-between">
                          <span>
                            <p className="text-[13px] font-bold text-foreground truncate">Customer name:- {payment.customer_name || '-'}</p>
                            <p className="text-[12px] font-bold text-foreground truncate">Initiater:- {payment.user_name || '-'}</p>
                          </span>
                          <span className="flex flex-col items-end">
                            <span className="text-lg font-bold text-foreground">₹{Number(payment.payout_amount || 0).toLocaleString('en-IN')}</span>
                            <span className="text-[12px] text-foreground font-semibold  max-w-[55%] text-right">{payment.purpose || payment.remarks || '-'}{payment.purpose === 'LOAN CLOSURE' && (payment.rc_lender_name || payment.bank_nbfc) && <span className="text-muted-foreground font-normal"> ({payment.rc_lender_name || payment.bank_nbfc})</span>}</span>
                          </span>
                        </div>
                        <div className='mt-1.5 flex justify-between'>
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            {((payment.txn_type === 'BILL_MAPPING_REQUEST' || payment.purpose === 'REQUEST RAISED FOR BILL MAPPING') ? payment.loan_account_number : payment.account_number) && (
                              <span className="text-[10px] font-semibold text-foreground truncate">A/c:- {(payment.txn_type === 'BILL_MAPPING_REQUEST' || payment.purpose === 'REQUEST RAISED FOR BILL MAPPING') ? (payment.loan_account_number || '-') : (payment.account_number || '-')}</span>
                            )}
                            {payment.ifsc_code && <span className="text-[10px] font-semibold text-foreground truncate">IFSC:- {payment.ifsc_code}</span>}
                            {payment.upi_link && <button onClick={() => navigator.clipboard.writeText(payment.upi_link)} className="px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[8px] font-semibold rounded border border-blue-600/20">Copy UPI</button>}
                            {payment.documents?.filter((d: any) => d.field_name === 'qr_upload').map((doc: any) => (
                              <a key={doc.id} href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${doc.file_path}`} target="_blank" className="px-1.5 py-0.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[8px] font-semibold rounded border border-blue-600/20">QR Upload</a>
                            ))}
                            {payment.documents?.filter((d: any) => d.field_name !== 'qr_upload').map((doc: any) => (
                              <a key={doc.id} href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${doc.file_path}`} target="_blank" className="px-1.5 py-0.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[8px] font-semibold rounded border border-blue-600/20">{payment.purpose === 'LOAN CLOSURE' ? 'Docs' : 'Proof'}</a>
                            ))}
                          </div>
                          <div className="  flex items-center gap-2 shrink-0">
                            <button onMouseEnter={(e) => { const rect = (e.target as HTMLElement).getBoundingClientRect(); setInfoHover({ payment, rect }); }} onMouseLeave={() => setInfoHover(null)} className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50">i</button>
                            {isAdmin || (isAccountant && semiApproved.has(Number(payment.id))) ? (
                              <button onClick={() => handleViewLedger(payment)} className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 rounded text-[10px] font-semibold"><Edit2 size={12} className="inline mr-1" />Edit</button>
                            ) : canAct ? (
                              <button onClick={() => handleViewLedger(payment)} className="px-3 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 rounded text-[10px] font-semibold"><Eye size={15} className="inline mr-1" />View</button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Desktop: Table */}
                <div className="hidden lg:block rounded-2xl shadow-sm border border-border overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Initiater Name</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Request ID</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Customer Name</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">A/c Number</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">IFSC</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Purpose</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Amount</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stage</th>
                        <th className="px-3 py-2 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredInProcess.map((payment: any) => {
                        const stageLabel = (payment.txn_type === 'BILL_MAPPING_REQUEST' || payment.purpose === 'REQUEST RAISED FOR BILL MAPPING')
                          ? (payment.status === 'admin_approval'
                            ? { text: 'Admin Pending', bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' }
                            : { text: 'Accountant Pending', bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' })
                          : payment.status === 'bm_dsa_sm_pending' ? { text: 'BM/DSA & SM Pending', bg: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' }
                            : payment.status === 'bm_dsa_pending' ? { text: 'BM/DSA Pending', bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' }
                              : payment.status === 'pending' ? { text: 'SM Pending', bg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' }
                                : { text: payment.status || '-', bg: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300' };
                        return (
                          <tr key={payment.id} className="hover:bg-gray-50 bg-white">
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">{payment.payment_date || payment.created_at ? new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-IN') : '-'}</td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-medium text-foreground">{payment.user_name || '-'}</td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-mono text-foreground">{payment.request_id || '-'}</td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs text-foreground">{payment.customer_name || '-'}</td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-mono text-foreground">
                              {(payment.txn_type === 'BILL_MAPPING_REQUEST' || payment.purpose === 'REQUEST RAISED FOR BILL MAPPING') ? (payment.loan_account_number || '-') : (payment.account_number || '-')}
                            </td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-mono text-muted-foreground whitespace-nowrap">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span>{payment.ifsc_code || '-'}</span>
                                {payment.upi_link && <button onClick={() => navigator.clipboard.writeText(payment.upi_link)} className="px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[9px] font-semibold rounded border border-blue-600/20">Copy UPI</button>}
                                {payment.documents?.filter((d: any) => d.field_name === 'qr_upload').map((doc: any) => (
                                  <a key={doc.id} href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${doc.file_path}`} target="_blank" className="px-1.5 py-0.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[9px] font-semibold rounded border border-blue-600/20">QR</a>
                                ))}
                                {payment.documents?.filter((d: any) => d.field_name !== 'qr_upload').map((doc: any) => (
                                  <a key={doc.id} href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${doc.file_path}`} target="_blank" className="px-1.5 py-0.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[9px] font-semibold rounded border border-blue-600/20">{payment.purpose === 'LOAN CLOSURE' ? 'Docs' : 'Proof'}</a>
                                ))}
                              </div>
                            </td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs text-foreground">{payment.purpose || payment.remarks || '-'}{payment.purpose === 'LOAN CLOSURE' && (payment.rc_lender_name || payment.bank_nbfc) && <div className="text-[9px] text-muted-foreground">{payment.rc_lender_name || payment.bank_nbfc}</div>}</td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-bold text-foreground">₹{Number(payment.payout_amount || 0).toLocaleString('en-IN')}</td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${stageLabel.bg}`}>{stageLabel.text}</span></td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button onMouseEnter={(e) => { const rect = (e.target as HTMLElement).getBoundingClientRect(); setInfoHover({ payment, rect }); }} onMouseLeave={() => setInfoHover(null)} className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50" title="View Approval Trace">i</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab Content: Completed Requests */}
        {activeTab === 'history' && (
          <div className="">
            {filteredCompletedRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">No completed requests</div>
            ) : (
              <>
                {/* Mobile: Cards */}
                <div className="grid grid-cols-1 gap-2 lg:hidden">
                  {filteredCompletedRequests.map((payment: any) => {
                    const isRejected = payment.status === 'rejected';
                    const showRejected = isRejected && Number(payment.approved_by) === uid;
                    const stageLabel = isRejected
                      ? { text: showRejected ? 'Rejected' : 'Approved', bg: showRejected ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' }
                      : { text: 'Completed', bg: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' };
                    const canAct = (payment.status === 'bm_dsa_pending' && (role === 'branch_manager' || role === 'dsa'))
                      || (payment.status === 'bm_dsa_sm_pending' && (role === 'branch_manager' || role === 'dsa' || role === 'sales_manager'))
                      || (payment.status !== 'bm_dsa_pending' && payment.status !== 'bm_dsa_sm_pending' && (role === 'accountant' || role === 'admin'))
                      || (payment.status === 'pending' && role === 'sales_manager');
                    return (
                      <div key={payment.id} className="bg-card rounded-xl border border-border shadow-sm p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-foreground">{payment.payment_date || payment.created_at ? new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-IN') : '-'} | Requestid :-   {payment.request_id || '-'}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-semibold ${stageLabel.bg}`}>{stageLabel.text}</span>
                        </div>
                        <div className="mt-1 flex justify-between">
                          <span>
                            <p className="text-[13px] font-bold text-foreground truncate">Customer name:- {payment.customer_name || '-'}</p>
                            <p className="text-[12px] font-bold text-foreground truncate">Initiater:- {payment.user_name || '-'}</p>
                          </span>
                          <span className="flex flex-col mr-3">
                            <span className="text-lg font-bold text-foreground">₹{Number(payment.payout_amount || 0).toLocaleString('en-IN')}</span>
                            <span className="text-[12px] text-foreground font-semibold  max-w-[55%] text-right">{payment.purpose || payment.remarks || '-'}{payment.purpose === 'LOAN CLOSURE' && (payment.rc_lender_name || payment.bank_nbfc) && <span className="text-muted-foreground font-normal"> ({payment.rc_lender_name || payment.bank_nbfc})</span>}</span>
                          </span>
                        </div>
                        <div className='mt-1.5 flex justify-between'>
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            {((payment.txn_type === 'BILL_MAPPING_REQUEST' || payment.purpose === 'REQUEST RAISED FOR BILL MAPPING') ? payment.loan_account_number : payment.account_number) && (
                              <span className="text-[10px] font-semibold text-foreground truncate">A/c:- {(payment.txn_type === 'BILL_MAPPING_REQUEST' || payment.purpose === 'REQUEST RAISED FOR BILL MAPPING') ? (payment.loan_account_number || '-') : (payment.account_number || '-')}</span>
                            )}
                            {payment.ifsc_code && <span className="text-[10px] font-semibold text-foreground truncate">IFSC:- {payment.ifsc_code}</span>}
                            {payment.upi_link && <button onClick={() => navigator.clipboard.writeText(payment.upi_link)} className="px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[8px] font-semibold rounded border border-blue-600/20">Copy UPI</button>}
                            {payment.documents?.filter((d: any) => d.field_name === 'qr_upload').map((doc: any) => (
                              <a key={doc.id} href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${doc.file_path}`} target="_blank" className="px-1.5 py-0.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[8px] font-semibold rounded border border-blue-600/20">QR Upload</a>
                            ))}
                            {payment.documents?.filter((d: any) => d.field_name !== 'qr_upload').map((doc: any) => (
                              <a key={doc.id} href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${doc.file_path}`} target="_blank" className="px-1.5 py-0.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[8px] font-semibold rounded border border-blue-600/20">{payment.purpose === 'LOAN CLOSURE' ? 'Docs' : 'Proof'}</a>
                            ))}
                          </div>
                          <div className="  flex items-center gap-2 shrink-0">
                            <button onMouseEnter={(e) => { const rect = (e.target as HTMLElement).getBoundingClientRect(); setInfoHover({ payment, rect }); }} onMouseLeave={() => setInfoHover(null)} className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50">i</button>
                            {isAdmin || (isAccountant && semiApproved.has(Number(payment.id))) ? (
                              <button onClick={() => handleViewLedger(payment)} className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 rounded text-[10px] font-semibold"><Edit2 size={12} className="inline mr-1" />Edit</button>
                            ) : canAct ? (
                              <button onClick={() => handleViewLedger(payment)} className="px-3 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 rounded text-[10px] font-semibold"><Eye size={15} className="inline mr-1" />View</button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Desktop: Table */}
                <div className="hidden lg:block rounded-2xl shadow-sm border border-border overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Initiater Name</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Request ID</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Customer Name</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">A/c Number</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">IFSC</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Purpose</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Amount</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stage</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredCompletedRequests.map((payment: any) => {
                        const isRejected = payment.status === 'rejected';
                        const showRejected = isRejected && Number(payment.approved_by) === uid;
                        const stageLabel = isRejected
                          ? { text: showRejected ? 'Rejected' : 'Approved', bg: showRejected ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' }
                          : { text: 'Completed', bg: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' };
                        return (
                          <tr key={payment.id} className="hover:bg-gray-50 bg-white">
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">{payment.payment_date || payment.created_at ? new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-IN') : '-'}</td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-medium text-foreground">{payment.user_name || '-'}</td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-mono text-foreground">{payment.request_id || '-'}</td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs text-foreground">{payment.customer_name || '-'}</td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-mono text-foreground">
                              {(payment.txn_type === 'BILL_MAPPING_REQUEST' || payment.purpose === 'REQUEST RAISED FOR BILL MAPPING') ? (payment.loan_account_number || '-') : (payment.account_number || '-')}
                            </td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-mono text-muted-foreground whitespace-nowrap">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span>{payment.ifsc_code || '-'}</span>
                                {payment.upi_link && <button onClick={() => navigator.clipboard.writeText(payment.upi_link)} className="px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[9px] font-semibold rounded border border-blue-600/20">Copy UPI</button>}
                                {payment.documents?.filter((d: any) => d.field_name === 'qr_upload').map((doc: any) => (
                                  <a key={doc.id} href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${doc.file_path}`} target="_blank" className="px-1.5 py-0.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[9px] font-semibold rounded border border-blue-600/20">QR</a>
                                ))}
                                {payment.documents?.filter((d: any) => d.field_name !== 'qr_upload').map((doc: any) => (
                                  <a key={doc.id} href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${doc.file_path}`} target="_blank" className="px-1.5 py-0.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[9px] font-semibold rounded border border-blue-600/20">{payment.purpose === 'LOAN CLOSURE' ? 'Docs' : 'Proof'}</a>
                                ))}
                              </div>
                            </td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs text-foreground">{payment.purpose || payment.remarks || '-'}{payment.purpose === 'LOAN CLOSURE' && (payment.rc_lender_name || payment.bank_nbfc) && <div className="text-[9px] text-muted-foreground">{payment.rc_lender_name || payment.bank_nbfc}</div>}</td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-bold text-foreground">₹{Number(payment.payout_amount || 0).toLocaleString('en-IN')}</td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${stageLabel.bg}`}>{stageLabel.text}</span></td>
                            <td className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button onMouseEnter={(e) => { const rect = (e.target as HTMLElement).getBoundingClientRect(); setInfoHover({ payment, rect }); }} onMouseLeave={() => setInfoHover(null)} className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50" title="View Approval Trace">i</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}



        {/* Tab Content: My Folios */}
        {activeTab === 'folios' && (
          <div className="">
            {foliosLoading ? (
              <div className="text-center py-8 text-muted-foreground text-xs">Loading folios...</div>
            ) : filteredMyFolios.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">No folios found</div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2 lg:hidden">
                  {filteredMyFolios.map((folio: any) => {
                    const targetLoanId = folio.loan_id || folio.linked_loan_id;
                    const isBillMapPayment = (p: any) =>
                      p.txn_type === 'BILL_MAPPING_REQUEST' ||
                      p.purpose === 'REQUEST RAISED FOR BILL MAPPING' ||
                      p.txn_type === 'FOLIO_CREATION_REQUEST' ||
                      (typeof p.purpose === 'string' && p.purpose.startsWith('FOLIO:'));
                    const pendingBillMapping = payments?.find((p: any) =>
                      Number(p.loan_id) === Number(targetLoanId) &&
                      isBillMapPayment(p) &&
                      p.status !== 'completed' && p.status !== 'rejected'
                    );
                    const isAdminApproved = (folio.status === 'active' || (folio.tally_synced || folio.tally_sync_status === 'SUCCESS') || Boolean(folio.bill_number)) && !pendingBillMapping;
                    const latestPaymentReq = payments?.find((p: any) =>
                      Number(p.loan_id) === Number(targetLoanId) &&
                      !isBillMapPayment(p)
                    );
                    const billTrace = pendingBillMapping ? getApprovalTrace(pendingBillMapping) : null;
                    const paymentTrace = latestPaymentReq ? getApprovalTrace(latestPaymentReq) : null;

                    return (
                      <div
                        key={folio.id}
                        className="bg-card rounded-xl border border-border shadow-sm p-3 transition-colors cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          if (targetLoanId) {
                            navigate(`/loans/${targetLoanId}/payments`);
                          } else {
                            navigate(`/accountant/folio-details?folio_id=${folio.id}`);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-foreground">{folio.created_at ? new Date(folio.created_at).toLocaleDateString('en-IN') : '-'}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">Folio</span>
                        </div>
                        <div className="mt-1 flex justify-between">
                          <span className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-foreground truncate">Customer name:- {folio.customer_name || '-'}</p>
                            <p className="text-[11px] font-semibold text-foreground truncate">Bill No:- {pendingBillMapping ? '-' : (folio.bill_number || '-')}</p>
                            <p className="text-[11px] font-semibold text-foreground truncate">RC No:- {folio.vehicle_number || '-'}</p>
                            <p className="text-[11px] font-semibold text-foreground truncate">Model:- {[folio.maker_name, folio.maker_model].filter(Boolean).join(' ') || '-'}</p>
                          </span>
                          <span className="flex flex-col items-end shrink-0">
                            <span className="text-lg font-bold text-foreground whitespace-nowrap">₹{Number(folio.amount || 0).toLocaleString('en-IN')}</span>
                          </span>
                        </div>
                         <div className="mt-2 pt-2 border-t border-border flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                          {pendingBillMapping ? (
                            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">⏳ Pending ({billTrace?.inProcess || 'Accountant'})</span>
                          ) : folio.bill_number ? (
                            <span className="text-[9px] font-bold text-green-600 dark:text-green-400">✓ Mapped ({folio.bill_number})</span>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedLoanIdForRequest(String(targetLoanId || ''));
                                setBillMappingFiles([]);
                                setBillMappingRemarks('');
                                setShowBillMappingModal(true);
                              }}
                              className="px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 rounded-lg text-[10px] font-bold border border-amber-500/20"
                            >
                              + Raise Bill Mapping
                            </button>
                          )}

                          {!folio.bill_number ? (
                            <span
                              title="Bill should be mapped first"
                              className="px-2.5 py-1 bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 rounded-lg text-[10px] font-medium border border-gray-200 dark:border-gray-700 cursor-not-allowed select-none inline-flex items-center gap-1"
                            >
                              <Plus size={11} className="opacity-50" />
                              Raise Payment
                            </span>
                          ) : latestPaymentReq && latestPaymentReq.status !== 'completed' && latestPaymentReq.status !== 'rejected' ? (
                            <div className="flex items-center gap-1.5 bg-purple-500/5 dark:bg-purple-500/10 p-1 rounded-xl border border-purple-500/20">
                              <div 
                                className="relative group inline-flex items-center gap-1 cursor-pointer select-none"
                                title={`✓ Approved: ${paymentTrace?.accepted || '-'}\n⏳ Pending: ${paymentTrace?.pending || '-'}`}
                              >
                                <span className="text-[9px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                  ⏳ Pending {paymentTrace?.inProcess || 'Approval'}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  fetchUserLoans();
                                  setSelectedLoanIdForRequest(String(targetLoanId || ''));
                                  setRaisePurpose('');
                                  setShowRaiseRequestModal(true);
                                }}
                                title="Raise another payment request"
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition-all inline-flex items-center gap-0.5"
                              >
                                <Plus size={11} />
                                Raise
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                fetchUserLoans();
                                setSelectedLoanIdForRequest(String(targetLoanId || ''));
                                setRaisePurpose('');
                                setShowRaiseRequestModal(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-[10px] font-bold shadow-sm inline-flex items-center gap-1"
                            >
                              <Plus size={12} />
                              Raise Payment
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="hidden lg:block overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-sm">
                  <table className="w-full text-[10px] sm:text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border border-gray-300">Date</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border border-gray-300">Bill No</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border border-gray-300">Customer Name</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border border-gray-300">RC / Model</th>
                        <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border border-gray-300">Amount</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border border-gray-300">Bill Mapping Request</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border border-gray-300">Raise Payment Request</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMyFolios.map((folio: any) => {
                        const targetLoanId = folio.loan_id || folio.linked_loan_id;
                        const isBillMapPayment = (p: any) =>
                          p.txn_type === 'BILL_MAPPING_REQUEST' ||
                          p.purpose === 'REQUEST RAISED FOR BILL MAPPING' ||
                          p.txn_type === 'FOLIO_CREATION_REQUEST' ||
                          (typeof p.purpose === 'string' && p.purpose.startsWith('FOLIO:'));
                        const pendingBillMapping = payments?.find((p: any) =>
                          Number(p.loan_id) === Number(targetLoanId) &&
                          isBillMapPayment(p) &&
                          p.status !== 'completed' && p.status !== 'rejected'
                        );
                        const isAdminApproved = (folio.status === 'active' || (folio.tally_synced || folio.tally_sync_status === 'SUCCESS') || Boolean(folio.bill_number)) && !pendingBillMapping;
                        const latestPaymentReq = payments?.find((p: any) =>
                          Number(p.loan_id) === Number(targetLoanId) &&
                          !isBillMapPayment(p)
                        );
                        const billTrace = pendingBillMapping ? getApprovalTrace(pendingBillMapping) : null;
                        const paymentTrace = latestPaymentReq ? getApprovalTrace(latestPaymentReq) : null;

                        return (
                          <tr
                            key={folio.id}
                            className="bg-white hover:bg-blue-50/50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                            onClick={() => {
                              if (targetLoanId) {
                                navigate(`/loans/${targetLoanId}/payments`);
                              } else {
                                navigate(`/accountant/folio-details?folio_id=${folio.id}`);
                              }
                            }}
                          >
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap border border-gray-300">{folio.created_at ? new Date(folio.created_at).toLocaleDateString('en-IN') : '-'}</td>
                            <td className="px-3 py-2 font-medium text-gray-800 border border-gray-300">{folio.bill_number || '-'}</td>
                            <td className="px-3 py-2 text-gray-800 border border-gray-300">{folio.customer_name || '-'}</td>
                            <td className="px-3 py-2 text-gray-800 border border-gray-300 max-w-[120px]">
                              <div className="font-mono truncate">{folio.vehicle_number || '-'}</div>
                              <div className="text-gray-500 text-[9px] truncate">{[folio.maker_name, folio.maker_model].filter(Boolean).join(' ') || '-'}</div>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-800 border border-gray-300">₹{Number(folio.amount || 0).toLocaleString('en-IN')}</td>
                            
                            {/* Column 6: BILL MAPPING REQUEST */}
                            <td className="px-3 py-2 text-center border border-gray-300 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              {pendingBillMapping ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                  ⏳ Pending ({billTrace?.inProcess || 'Accountant'})
                                </span>
                              ) : folio.bill_number ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                                  ✓ Mapped ({folio.bill_number})
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedLoanIdForRequest(String(targetLoanId || ''));
                                    setBillMappingFiles([]);
                                    setBillMappingRemarks('');
                                    setShowBillMappingModal(true);
                                  }}
                                  className="px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 rounded-lg text-[10px] font-bold border border-amber-500/20 transition-all"
                                >
                                  + Raise Bill Mapping
                                </button>
                              )}
                            </td>

                            {/* Column 7: RAISE PAYMENT REQUEST */}
                            <td className="px-3 py-2 text-center border border-gray-300 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              {!folio.bill_number ? (
                                <span
                                  title="Bill should be mapped first"
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 rounded-lg text-[10px] font-semibold border border-gray-200 dark:border-gray-700 cursor-not-allowed select-none"
                                >
                                  <Plus size={11} className="opacity-50" />
                                  Raise Payment
                                </span>
                              ) : latestPaymentReq && latestPaymentReq.status !== 'completed' && latestPaymentReq.status !== 'rejected' ? (
                                <div className="inline-flex items-center justify-center gap-1.5 bg-purple-500/5 dark:bg-purple-500/10 p-1 rounded-xl border border-purple-500/20">
                                  <div 
                                    className="relative group inline-flex items-center gap-1 cursor-pointer select-none"
                                    title={`✓ Approved: ${paymentTrace?.accepted || '-'}\n⏳ Pending: ${paymentTrace?.pending || '-'}`}
                                  >
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                      ⏳ Pending {paymentTrace?.inProcess || 'Approval'}
                                    </span>
                                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-purple-200/80 dark:bg-purple-800/60 text-purple-700 dark:text-purple-300 text-[8px] font-bold group-hover:scale-110 transition-transform">
                                      i
                                    </span>

                                    {/* Floating Hover Card */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:flex flex-col gap-1 px-3 py-2 bg-slate-900 text-white dark:bg-slate-800 rounded-lg shadow-2xl text-[10px] whitespace-nowrap z-50 pointer-events-none border border-slate-700">
                                      <div className="font-semibold text-emerald-400">✓ Approved: {paymentTrace?.accepted || '-'}</div>
                                      <div className="font-medium text-amber-300">⏳ Pending: {paymentTrace?.pending || '-'}</div>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => {
                                      fetchUserLoans();
                                      setSelectedLoanIdForRequest(String(targetLoanId || ''));
                                      setRaisePurpose('');
                                      setShowRaiseRequestModal(true);
                                    }}
                                    title="Raise another payment request"
                                    className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition-all inline-flex items-center gap-0.5"
                                  >
                                    <Plus size={11} />
                                    Raise
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    fetchUserLoans();
                                    setSelectedLoanIdForRequest(String(targetLoanId || ''));
                                    setRaisePurpose('');
                                    setShowRaiseRequestModal(true);
                                  }}
                                  className="px-3 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-[10px] font-bold shadow-xs transition-all inline-flex items-center gap-1"
                                >
                                  <Plus size={12} />
                                  Raise Payment
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Entry Form Modal */}
      {showEntryForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-card border border-border shadow-2xl rounded-2xl p-6 max-w-lg w-full my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 sticky top-0">
              <h2 className="text-xl font-bold text-foreground">Add New Entry</h2>
              <button onClick={() => setShowEntryForm(false)} className="p-1 text-muted-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer shrink-0">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Purpose</label>
                <select
                  value={entryData.txn_type}
                  onChange={(e) => setEntryData({ ...entryData, txn_type: e.target.value })}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  required
                >
                  <option value="">Select Purpose</option>
                  {ENTRY_PURPOSES.map(purpose => (
                    <option key={purpose} value={purpose}>{purpose}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Case ID / Loan ID (Optional)</label>
                <input
                  type="number"
                  value={entryData.loan_id}
                  onChange={(e) => setEntryData({ ...entryData, loan_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Enter Loan ID to link to Folio"
                />
              </div>

              {!entryData.loan_id && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">UTR Number</label>
                    <input
                      type="text"
                      value={entryData.utr_no}
                      onChange={(e) => setEntryData({ ...entryData, utr_no: e.target.value })}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">Bill Number (Optional)</label>
                    <input
                      type="text"
                      value={entryData.bill_number}
                      onChange={(e) => setEntryData({ ...entryData, bill_number: e.target.value })}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                  <input
                    type="number"
                    value={entryData.amount}
                    onChange={(e) => setEntryData({ ...entryData, amount: e.target.value })}
                    className="w-full pl-8 pr-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Credit/Debit</label>
                <select
                  value={entryData.credit_debit}
                  onChange={(e) => setEntryData({ ...entryData, credit_debit: e.target.value })}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                >
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Remarks</label>
                <textarea
                  value={entryData.remarks}
                  onChange={(e) => setEntryData({ ...entryData, remarks: e.target.value })}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEntryForm(false)}
                  className="flex-1 px-4 py-2 bg-muted text-foreground text-sm font-semibold rounded-lg hover:bg-muted/80 transition-colors border border-border"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-sm">
                  Submit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Edit Entry Form Modal */}
      {editingPayment && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-card border border-border shadow-2xl rounded-2xl p-6 max-w-lg w-full my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 sticky top-0">
              <h2 className="text-xl font-bold text-foreground">Edit Entry</h2>
              <button onClick={() => setEditingPayment(null)} className="p-1 text-muted-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer shrink-0">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Purpose</label>
                <select
                  value={editingPayment.txn_type}
                  onChange={(e) => setEditingPayment({ ...editingPayment, txn_type: e.target.value })}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  required
                >
                  <option value="">Select Purpose</option>
                  {ENTRY_PURPOSES.map(purpose => (
                    <option key={purpose} value={purpose}>{purpose}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Case ID / Loan ID (Optional)</label>
                <input
                  type="number"
                  value={editingPayment.loan_id || ''}
                  onChange={(e) => setEditingPayment({ ...editingPayment, loan_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Enter Loan ID to link to Folio"
                />
              </div>

              {!editingPayment.loan_id && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">UTR Number</label>
                    <input
                      type="text"
                      value={editingPayment.utr_no || editingPayment.utr_reference || ''}
                      onChange={(e) => setEditingPayment({ ...editingPayment, utr_no: e.target.value })}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">Bill Number (Optional)</label>
                    <input
                      type="text"
                      value={editingPayment.bill_number || ''}
                      onChange={(e) => setEditingPayment({ ...editingPayment, bill_number: e.target.value })}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                  <input
                    type="number"
                    value={editingPayment.amount || editingPayment.payout_amount || ''}
                    onChange={(e) => setEditingPayment({ ...editingPayment, amount: e.target.value })}
                    className="w-full pl-8 pr-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Credit/Debit</label>
                <select
                  value={editingPayment.credit_debit || 'debit'}
                  onChange={(e) => setEditingPayment({ ...editingPayment, credit_debit: e.target.value })}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                >
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Remarks</label>
                <textarea
                  value={editingPayment.remarks || ''}
                  onChange={(e) => setEditingPayment({ ...editingPayment, remarks: e.target.value })}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="flex-1 px-4 py-2 bg-muted text-foreground text-sm font-semibold rounded-lg hover:bg-muted/80 transition-colors border border-border"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Chain Hover Tooltip */}
      {infoHover && (
        <div
          className="fixed z-50 w-64 bg-white dark:bg-gray-800 border border-border rounded-lg shadow-xl p-3 text-[10px] leading-relaxed pointer-events-none"
          style={{
            left: Math.min(infoHover.rect.right + 8, window.innerWidth - 270),
            top: infoHover.rect.top,
          }}
        >
          {infoHover.payment.upi_link && (
            <div className="font-bold text-foreground border-b border-border pb-1 mb-1.5">
              <span className="text-green-600 font-semibold">Pay by Self</span>
            </div>
          )}
          <div className="space-y-1">
            {infoHover.payment.status === 'rejected' ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-red-500 font-medium">✗ Rejected by</span>
                  <span className="text-red-500 font-medium text-right">{infoHover.payment.rejected_by_name || '-'}</span>
                </div>
                {infoHover.payment.remarks && (
                  <div className="text-muted-foreground mt-1 pt-1 border-t border-border/50">
                    <span className="font-medium">Reason: </span>{infoHover.payment.remarks}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">BM/DSA</span>
                  {infoHover.payment.sm_approved_by_name ? (
                    <span className="text-green-600 font-medium">✓ {infoHover.payment.sm_approved_by_name}</span>
                  ) : (
                    <span className="text-red-500 font-medium">✗ Pending</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">SM</span>
                  {infoHover.payment.sm2_approved_by_name ? (
                    <span className="text-green-600 font-medium">✓ {infoHover.payment.sm2_approved_by_name}</span>
                  ) : infoHover.payment.status === 'bm_dsa_sm_pending' ? (
                    <span className="text-red-500 font-medium">✗ Pending</span>
                  ) : (
                    <span className="text-muted-foreground font-medium">— N/A</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Accountant</span>
                  {infoHover.payment.accountant_approved_by_name ? (
                    <span className="text-green-600 font-medium">✓ {infoHover.payment.accountant_approved_by_name}</span>
                  ) : (
                    <span className="text-red-500 font-medium">✗ Pending</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Admin</span>
                  {infoHover.payment.admin_approved_by_name ? (
                    <span className="text-green-600 font-medium">✓ {infoHover.payment.admin_approved_by_name}</span>
                  ) : (
                    <span className="text-red-500 font-medium">✗ Pending</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reject Remarks Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-foreground mb-4">Reject Request</h3>
            <textarea
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full p-3 border border-border rounded-lg text-sm bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-muted text-foreground text-sm font-semibold rounded-lg hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectPaymentId) {
                    handleUpdateStatus(rejectPaymentId, 'rejected', { remarks: rejectRemarks });
                    setShowRejectModal(false);
                  }
                }}
                disabled={!rejectRemarks.trim()}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-foreground mb-2">Delete All Requests?</h3>
            <p className="text-xs text-muted-foreground mb-4">This will permanently delete all payment requests from the system. This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2 bg-muted text-foreground text-sm font-semibold rounded-lg hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raise Payment Request Modal */}
      {showRaiseRequestModal && (
        <PaymentRequestModal
          loanId={selectedLoanIdForRequest}
          initialPurpose={raisePurpose}
          onClose={() => setShowRaiseRequestModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['account-payments'] });
            queryClient.invalidateQueries({ queryKey: ['folio-accounts'] });
          }}
        />
      )}

      {/* Raise Bill Mapping Request Modal (Image 2) */}
      {showBillMappingModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-900 backdrop-blur-xl rounded-2xl shadow-2xl p-5 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-gray-100">Raise Bill Mapping Request</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">Upload supporting document and enter remarks/password</p>

            <form onSubmit={handleRaiseBillMappingSubmit} className="space-y-4">
              {/* File Upload Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Supporting Document <span className="text-red-500 font-bold">* (Mandatory)</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    if (file.size > 10 * 1024 * 1024) {
                      if (file.type.startsWith('image/')) {
                        const compressed = await compressImage(file);
                        setBillMappingFiles([compressed]);
                        return;
                      }
                      toast.error(`${file.name} exceeds 10MB limit`);
                      return;
                    }

                    setBillMappingFiles([file]);
                  }}
                  className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Supported: PDF, JPG, PNG, DOC, DOCX (Max 10MB)</p>
              </div>

              {/* File Display */}
              {billMappingFiles.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    File selected
                  </p>
                  <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText size={16} className="text-blue-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{billMappingFiles[0].name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {billMappingFiles[0].size >= 1024 * 1024 
                            ? `${(billMappingFiles[0].size / (1024 * 1024)).toFixed(2)} MB` 
                            : `${(billMappingFiles[0].size / 1024).toFixed(1)} KB`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBillMappingFiles([])}
                      className="text-red-600 hover:text-red-700 flex-shrink-0 ml-2 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Remarks / PDF Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Remarks / PDF Password <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(If PDF is password protected)</span>
                </label>
                <input
                  type="text"
                  value={billMappingRemarks}
                  onChange={(e) => setBillMappingRemarks(e.target.value)}
                  placeholder="Enter remarks or PDF password (e.g. Password: 123456)"
                  className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBillMappingModal(false);
                    setBillMappingFiles([]);
                    setBillMappingRemarks('');
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBillMapping || billMappingFiles.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-medium"
                >
                  {isSubmittingBillMapping ? 'Submitting...' : 'Raise Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Detail Modal */}
      <LedgerDetailModal
        isOpen={showLedgerModal}
        onClose={() => {
          setShowLedgerModal(false);
          setViewingLedger(null);
          setLoanDetails(null);
        }}
        loanDetails={loanDetails}
        viewingLedger={viewingLedger}
        onApprove={(paymentId, options: {
          utr_no?: string;
          bill_number?: string;
          admin_remarks?: string;
          accountant_remarks?: string;
          sales_manager_remarks?: string;
        } | undefined) => {
          const payment = payments?.find((p: any) => Number(p.id) === Number(paymentId));
          let nextStatus = getApproveStatus(payment);
          if (!nextStatus) {
            if (user?.role === 'sales_manager') {
              nextStatus = 'sales_manager_approval';
            } else if (user?.role === 'branch_manager' || user?.role === 'dsa') {
              nextStatus = 'sales_manager_approval';
            } else if (isAccountantRole) {
              nextStatus = 'admin_approval';
            } else if (isAdminRole) {
              nextStatus = 'completed';
            } else {
              nextStatus = 'sales_manager_approval';
            }
          }
          handleUpdateStatus(paymentId, nextStatus, {
            utr_no: options?.utr_no,
            bill_number: options?.bill_number,
            admin_remarks: options?.admin_remarks,
            accountant_remarks: options?.accountant_remarks,
            sales_manager_remarks: options?.sales_manager_remarks,
          });
        }}
        onBillMappingConfirm={(paymentId, billNumber) => {
          // Bill mapping already handled by /map endpoint
          // No need to update status as backend already set status to accountant_approval
          void Promise.resolve();
        }}
        onReject={(paymentId, remarks) => {
          const role = user?.role;
          handleUpdateStatus(paymentId, 'rejected', {
            ...(role === 'accountant' ? { accountant_remarks: remarks } : {}),
            ...(role === 'sales_manager' ? { sales_manager_remarks: remarks } : {}),
            ...(role !== 'accountant' && role !== 'sales_manager' ? { remarks } : {}),
          });
        }}
        userRole={user?.role}
      />

    </div>
  );
}

