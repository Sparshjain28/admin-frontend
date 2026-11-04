import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import FolioLedger from '@/components/FolioLedger';
import FolioAccountCard from '@/components/FolioAccountCard';
import FolioCards from '@/components/FolioCards';
import { ArrowLeft, PlusCircle, FileText, AlertCircle, X } from 'lucide-react';
import { FloatingLabelInput, FloatingLabelSelect } from '@/components/FloatingLabelInput';
import { toast } from 'sonner';
import RequestsTable from '@/components/RequestsTable';
import DraggableDocumentViewer from '@/components/DraggableDocumentViewer';
import PaymentRequestModal from '@/components/PaymentRequestModal';
import { createPortal } from 'react-dom';

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


export default function LoanPaymentRequest() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewers, setViewers] = useState<{ url: string; id: number }[]>([]);
  const handleOpenViewer = (url: string, id: number) => {
    setViewers(prev => [...prev, { url, id }]);
  };

  const { data: loan, isLoading: loanLoading } = useQuery({
    queryKey: ['loan', id],
    queryFn: () => api.get(`/loans/${id}`),
    enabled: !!id,
  });

  // Fetch payments to extract the first bill number and pending requests
  const { data: payments } = useQuery({
    queryKey: ['loan-payments', id],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/payments?status=all&loanId=${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!id,
  });

  const { data: folioAccounts } = useQuery({
    queryKey: ['folio-accounts'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/folio-accounts`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) return [];
      return await res.json();
    },
  });

  const linkedFolio = useMemo(() => {
    if (!folioAccounts || folioAccounts.length === 0) return null;
    const loanBill = loan?.bill_number?.trim().toLowerCase();
    return folioAccounts.find((f: any) => {
      const folioBill = f.bill_number?.trim().toLowerCase();
      if (f.loan_id && String(f.loan_id) === String(id)) return true;
      if (f.linked_loan_id && String(f.linked_loan_id) === String(id)) return true;
      if (loanBill && folioBill && folioBill === loanBill) return true;
      if (payments?.length > 0 && payments.some((p: any) => p.bill_number && folioBill && folioBill === p.bill_number.trim().toLowerCase())) return true;
      return false;
    }) || null;
  }, [folioAccounts, id, loan?.bill_number, payments]);

  // Comprehensive details mapping with fallbacks from linkedFolio, loan, and payments
  const firstPaymentWithCustomer = useMemo(() => payments?.find((p: any) => p.customer_name), [payments]);

  const displayCustomerName = linkedFolio?.mapped_customer_name || linkedFolio?.customer_name || loan?.applicant_name || loan?.customer_name || firstPaymentWithCustomer?.customer_name || '-';
  const displayMobile = linkedFolio?.mapped_mobile || linkedFolio?.mobile || loan?.mobile || loan?.phone || '-';
  const displayVehicleNumber = linkedFolio?.mapped_vehicle_number || linkedFolio?.vehicle_number || loan?.vehicle_number || '-';
  const displayVehicleModel = [
    linkedFolio?.mapped_maker_name || linkedFolio?.maker_name || loan?.maker_name,
    linkedFolio?.mapped_maker_model || linkedFolio?.maker_model || loan?.maker_model
  ].filter(Boolean).join(' ') || linkedFolio?.mapped_maker_model || linkedFolio?.maker_model || loan?.maker_model || '-';
  const displayDisbursementDate = linkedFolio?.mapped_disbursement_date || linkedFolio?.disbursement_date || loan?.disbursement_date || loan?.loan_disbursement_date || null;
  const displayLenderBank = linkedFolio?.mapped_bank_nbfc || linkedFolio?.bank_nbfc || linkedFolio?.lender_name || loan?.bank_nbfc || loan?.financier_name || loan?.lender_name || '-';
  const displayPddStatus = linkedFolio?.mapped_pdd_status || linkedFolio?.pdd_status || loan?.pdd_status || '-';
  const displayLoanAmount = linkedFolio?.mapped_loan_amount || linkedFolio?.loan_amount || loan?.loan_amount || loan?.loan_amount_required || loan?.sanctioned_amount || 0;
  const displayRoi = linkedFolio?.mapped_roi || linkedFolio?.roi || loan?.roi;
  const displayTenure = linkedFolio?.mapped_tenure || linkedFolio?.tenure || loan?.tenure;

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

  const hierarchy = useMemo(() => {
    const result: Array<{ name: string, role: string }> = [];
    const source = linkedFolio || loan || {};

    const creatorName = source.mapped_created_by_name || source.created_by_name || source.sourcing_person_name || loan?.created_by_name;
    const creatorRole = source.mapped_created_by_role || source.created_by_role || 'Executive';
    if (creatorName) {
      result.push({ name: creatorName, role: ROLE_LABELS[creatorRole] || creatorRole });
    }

    const tlName = source.mapped_team_leader_name || source.h_team_leader_name || loan?.team_leader_name;
    const tlRole = source.mapped_team_leader_role || source.h_team_leader_role || 'Team Leader';
    if (tlName) {
      result.push({ name: tlName, role: ROLE_LABELS[tlRole] || tlRole });
    }

    const bmName = source.mapped_branch_manager_name || source.h_branch_dsa_manager_name || loan?.branch_manager_name;
    const bmRole = source.mapped_branch_manager_role || source.h_branch_dsa_manager_role || 'Branch Manager';
    if (bmName) {
      result.push({ name: bmName, role: ROLE_LABELS[bmRole] || bmRole });
    }

    const smName = source.mapped_senior_manager_name || source.h_sales_manager_name || loan?.sales_manager_name;
    const smRole = source.mapped_senior_manager_role || 'Sales Manager';
    if (smName) {
      result.push({ name: smName, role: ROLE_LABELS[smRole] || smRole });
    }

    if (result.length === 0 && linkedFolio?.hierarchy && linkedFolio.hierarchy.length > 0) {
      linkedFolio.hierarchy.forEach((h: any) => {
        result.push({
          name: h.person_name || h.name,
          role: ROLE_LABELS[h.role] || h.role || '',
        });
      });
    }

    if (result.length === 0 && payments && payments.length > 0) {
      const firstWithUser = payments.find((p: any) => p.created_by_name || p.initiater_name || p.user_name);
      if (firstWithUser) {
        result.push({
          name: firstWithUser.created_by_name || firstWithUser.initiater_name || firstWithUser.user_name,
          role: 'Initiator'
        });
      }
    }

    return result;
  }, [linkedFolio, loan, payments]);

  const paymentByOptions = useMemo(() => [
    { value: 'SELF', label: 'Self' },
    { value: 'FINONEST', label: 'Finonest' },
  ], []);

  const pendingPayments = payments?.filter((p: any) => p.status === 'sales_manager_approval' || p.status === 'pending' || p.status === 'accountant_approval') || [];
  const rejectedPayments = payments?.filter((p: any) => p.status === 'rejected') || [];
  const approvedPayments = payments?.filter((p: any) => p.status === 'completed') || [];
  const isBillMapPayment = (p: any) =>
    p.txn_type === 'BILL_MAPPING_REQUEST' ||
    p.purpose === 'REQUEST RAISED FOR BILL MAPPING' ||
    p.txn_type === 'FOLIO_CREATION_REQUEST' ||
    (typeof p.purpose === 'string' && p.purpose.startsWith('FOLIO:'));
  const hasPendingBillMapping = payments?.some((p: any) => isBillMapPayment(p) && p.status !== 'completed' && p.status !== 'rejected') || false;
  const hasAnyPending = payments?.some((p: any) => p.status !== 'completed' && p.status !== 'rejected') || false;
  // Map internal payment status to a human-friendly role/next-action label
  const mapStatusToRoleLabel = (status: string, txnType?: string, purpose?: string) => {
    const isBillMapping = txnType === 'BILL_MAPPING_REQUEST' || purpose === 'REQUEST RAISED FOR BILL MAPPING' || txnType === 'FOLIO_CREATION_REQUEST' || (typeof purpose === 'string' && purpose.startsWith('FOLIO:'));
    if (isBillMapping) {
      switch (status) {
        case 'accountant_approval':
          return 'Awaiting Bill Mapping - Accountant Review';
        case 'pending':
          return 'Raised â€” Awaiting Accountant';
        case 'rejected':
          return 'Rejected by Accountant - Can Retry';
        default:
          return 'Bill Mapping Pending';
      }
    }
    switch (status) {
      case 'sales_manager_approval':
        return 'Awaiting Sales Manager Approval';
      case 'accountant_approval':
        return 'Awaiting Accountant Approval';
      case 'pending':
        return 'Raised â€” Awaiting Sales Manager Approval';
      case 'rejected':
        return 'Rejected - Can Retry';
      default:
        return 'Pending Approval';
    }
  };

  const [billNumber, setBillNumber] = useState<string>('');
  const [showBillMappingUploadModal, setShowBillMappingUploadModal] = useState(false);
  const [billMappingFiles, setBillMappingFiles] = useState<File[]>([]);
  const [billMappingRemarks, setBillMappingRemarks] = useState('');

  useEffect(() => {
    if (hasPendingBillMapping) {
      setBillNumber('');
    } else if (payments) {
      const first = payments.find((p: any) => p.bill_number)?.bill_number;
      setBillNumber(first || linkedFolio?.bill_number || loan?.bill_number || '');
    } else if (linkedFolio?.bill_number || loan?.bill_number) {
      setBillNumber(linkedFolio?.bill_number || loan?.bill_number || '');
    }
  }, [payments, linkedFolio?.bill_number, loan?.bill_number, hasPendingBillMapping]);

  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (searchParams.get('openForm') === 'true' && billNumber) {
      setShowForm(true);
    }
  }, [searchParams, billNumber]);
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountError, setAccountError] = useState('');
  const [ifscError, setIfscError] = useState('');
  const [fcAmount, setFcAmount] = useState('');
  const [supportingDocs, setSupportingDocs] = useState<File[]>([]);
  const [paymentBy, setPaymentBy] = useState('');
  const [qrUpload, setQrUpload] = useState<File | null>(null);
  const [paymentProofs, setPaymentProofs] = useState<File[]>([]);
  const [bankInfoDoc, setBankInfoDoc] = useState<File | null>(null);
  const [upiLink, setUpiLink] = useState('');
  const [finonestTab, setFinonestTab] = useState<'bank' | 'qr' | 'upi'>('bank');
  const [verifyingBank, setVerifyingBank] = useState(false);
  const [bankVerifiedData, setBankVerifiedData] = useState<any>(null);
  const [bankVerifyError, setBankVerifyError] = useState('');
  const [bankVerifyAttempted, setBankVerifyAttempted] = useState(false);

  const handleVerifyBank = async () => {
    if (!accountNumber || accountNumber.length < 9) {
      setBankVerifyError('Enter a valid account number');
      return;
    }
    if (!ifscCode || ifscCode.length !== 11) {
      setBankVerifyError('Enter a valid IFSC code');
      return;
    }

    setVerifyingBank(true);
    setBankVerifyError('');
    setBankVerifiedData(null);
    setBankVerifyAttempted(false);
    try {
      const res = await api.post('/kyc/verify-bank', { id_number: accountNumber, ifsc: ifscCode, loan_id: id });
      if (res.success && res.data) {
        setBankVerifiedData(res.data);
        setBankVerifyAttempted(true);
        toast.success(`Verified: ${res.data.full_name || 'Account exists'}`);
      } else {
        setBankVerifyError(res.error || 'Bank verification failed');
        setBankVerifyAttempted(true);
        toast.error(res.error || 'Bank verification failed');
      }
    } catch (err: any) {
      setBankVerifyError(err.message || 'Bank verification failed');
      setBankVerifyAttempted(true);
      toast.error(err.message || 'Bank verification failed');
    } finally {
      setVerifyingBank(false);
    }
  };

  // Auto-fetch cached bank data when account number + IFSC are entered
  useEffect(() => {
    if (accountNumber.length >= 9 && ifscCode.length === 11) {
      const fetchCached = async () => {
        try {
          const res = await api.get(`/kyc/check-bank?account_number=${accountNumber}&ifsc_code=${ifscCode}`);
          if (res.success && res.fromCache && res.data) {
            setBankVerifiedData(res.data);
          }
        } catch {
          // ignore
        }
      };
      fetchCached();
    }
  }, [accountNumber, ifscCode]);

  const handleAccountNumberChange = (value: string) => {
    setAccountNumber(value);
    setBankVerifyError('');
    setBankVerifiedData(null);
    setBankVerifyAttempted(false);
  };

  const handleIfscCodeChange = (value: string) => {
    setIfscCode(value);
    setBankVerifyError('');
    setBankVerifiedData(null);
    setBankVerifyAttempted(false);
  };

  // Reset fields when purpose changes
  useEffect(() => {
    setAmount('');
    setFcAmount('');
    setAccountNumber('');
    setIfscCode('');
    setAccountError('');
    setIfscError('');
    setSupportingDocs([]);
    setPaymentBy('');
    setQrUpload(null);
    setPaymentProofs([]);
    setUpiLink('');
    setFinonestTab('bank');
    setBankVerifyAttempted(false);

    // Auto-fill last used payment method for this loan
    if (purpose !== 'CUSTOMER PAYMENT' && purpose !== 'LOAN CLOSURE' && payments && payments.length > 0) {
      const lastPayment = [...payments].reverse().find((p: any) => p.account_number && p.ifsc_code);
      if (lastPayment) {
        setAccountNumber(lastPayment.account_number);
        setIfscCode(lastPayment.ifsc_code);
        setFinonestTab('bank');
      }
    }
  }, [purpose]);

  useEffect(() => {
    if (paymentBy === 'FINONEST') {
      setAccountNumber('');
      setIfscCode('');
      setBankVerifiedData(null);
      setAccountError('');
      setIfscError('');
      setBankVerifyAttempted(false);
    } else if (paymentBy === 'SELF' && purpose !== 'CUSTOMER PAYMENT' && purpose !== 'LOAN CLOSURE' && payments && payments.length > 0) {
      const lastPayment = [...payments].reverse().find((p: any) => p.account_number && p.ifsc_code);
      if (lastPayment) {
        setAccountNumber(lastPayment.account_number);
        setIfscCode(lastPayment.ifsc_code);
      }
    }
  }, [paymentBy]);

  // Format number with commas for display
  const formatNumberWithCommas = (value: string) => {
    if (!value) return '';
    const number = value.replace(/,/g, '');
    if (isNaN(Number(number))) return value;
    return Number(number).toLocaleString('en-IN');
  };

  // Remove commas for actual value
  const removeCommas = (value: string) => {
    return value.replace(/,/g, '');
  };

  // Validate IFSC code format (4 letters + 0 + 6 alphanumeric characters)
  const validateIfscCode = (ifsc: string) => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifsc) {
      setIfscError('');
      return false;
    }
    if (ifsc.length !== 11) {
      setIfscError('IFSC code must be 11 characters');
      return false;
    }
    if (!ifscRegex.test(ifsc)) {
      setIfscError('Invalid IFSC format (e.g., SBIN0001234)');
      return false;
    }
    setIfscError('');
    return true;
  };

  // Validate account number (9-18 characters)
  const validateAccountNumber = (account: string) => {
    if (!account) {
      setAccountError('');
      return false;
    }
    if (!/^[a-zA-Z0-9]+$/.test(account)) {
      setAccountError('Account number must be alphanumeric');
      return false;
    }
    if (account.length < 9 || account.length > 18) {
      setAccountError('Account number must be 9-18 characters');
      return false;
    }
    setAccountError('');
    return true;
  };

  // Mutation to raise bill mapping request
  const raiseBillMapRequest = useMutation({
    mutationFn: async () => {
      if (billMappingFiles.length === 0) {
        throw new Error('File upload is mandatory. Please select a supporting document.');
      }
      const formData = new FormData();
      formData.append('loan_id', id || '');
      formData.append('amount', '0');
      formData.append('purpose', 'REQUEST RAISED FOR BILL MAPPING');
      formData.append('utr_no', '');
      formData.append('bill_number', '');
      formData.append('remarks', billMappingRemarks || '');
      formData.append('credit_debit', 'debit');
      formData.append('payment_date', new Date().toISOString());

      // Add document if present
      if (billMappingFiles.length > 0) {
        formData.append('document', billMappingFiles[0]);
      }

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/payments/request`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to raise bill mapping request');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loan-payments', id] });
      queryClient.invalidateQueries({ queryKey: ['pending-bill-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['account-payments'] });
      queryClient.invalidateQueries({ queryKey: ['accountant-dashboard'] });
      setShowBillMappingUploadModal(false);
      setBillMappingFiles([]);
      setBillMappingRemarks('');
      const nextApprover = user?.role === 'branch_manager' || user?.role === 'dsa' ? 'Sales Manager' : 'Accountant';
      toast.success(`✅ ${data.message || `Bill mapping request sent to ${nextApprover} successfully!`}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to raise bill mapping request');
    }
  });

  const createRequest = useMutation({
    mutationFn: async (payload: {
      amount: string;
      purpose: string;
      accountNumber: string;
      ifscCode: string;
      fcAmount?: string;
      supportingDocs?: File[];
      paymentBy?: string;
      paymentProofs?: File[];
      qrUpload?: File | null;
      upiLink?: string;
      bankInfoDoc?: File | null;
    }) => {
      const formData = new FormData();
      formData.append('loan_id', id || '');
      formData.append('amount', Number(payload.amount).toString());
      formData.append('purpose', payload.purpose);
      formData.append('utr_no', '');
      formData.append('bill_number', billNumber || '');
      formData.append('remarks', payload.fcAmount ? `FC Amount: ${payload.fcAmount}` : '');
      formData.append('credit_debit', 'debit');
      formData.append('payment_date', new Date().toISOString());
      formData.append('account_number', payload.accountNumber || '');
      formData.append('ifsc_code', payload.ifscCode || '');
      if (payload.paymentBy) formData.append('payment_by', payload.paymentBy);
      if (payload.upiLink) formData.append('upi_link', payload.upiLink);
      if (payload.qrUpload) formData.append('qr_upload', payload.qrUpload);
      if (payload.bankInfoDoc) formData.append('bank_info_doc', payload.bankInfoDoc);
      if (payload.supportingDocs?.length) {
        payload.supportingDocs.forEach((f, i) => formData.append(`documents`, f));
      }
      if (payload.paymentProofs?.length) {
        payload.paymentProofs.forEach((f, i) => formData.append(`documents`, f));
      }
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/payments/request`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit payment request');
      }
      return response.json();
    },

    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['payment-case-details', id] });
      queryClient.invalidateQueries({ queryKey: ['loan-payments', id] });
      setShowForm(false);
      setAmount('');
      setPurpose('');
      setAccountNumber('');
      setIfscCode('');
      setAccountError('');
      setIfscError('');
      setFcAmount('');
      setSupportingDocs([]);
      setPaymentBy('');
      setQrUpload(null);
      setPaymentProofs([]);
      setBankInfoDoc(null);
      setUpiLink('');
      setFinonestTab('bank');
      toast.success(data?.message || 'Payment request sent successfully!');
    },

    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit payment request');
    }
  });

  if (loanLoading) {
    return <div className="py-20 text-center text-muted-foreground">Loadingâ€¦</div>;
  }
  if (!loan) {
    return <div className="py-20 text-center text-muted-foreground">Loan not found</div>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (Number(amount) > Number(loan.loan_amount)) {
      toast.error('Amount cannot exceed loan amount');
      return;
    }

    const needsAcIfsc = (paymentBy === 'FINONEST' || paymentBy === 'SELF' || purpose === 'LOAN CLOSURE' || purpose === 'CUSTOMER PAYMENT') && finonestTab === 'bank';

    if (needsAcIfsc) {
      if (!validateAccountNumber(accountNumber)) return;
      if (!validateIfscCode(ifscCode)) return;
    }

    if (purpose && amount) {
      createRequest.mutate({
        amount,
        purpose,
        accountNumber: needsAcIfsc ? accountNumber : '',
        ifscCode: needsAcIfsc ? ifscCode : '',
        fcAmount,
        supportingDocs,
        paymentBy,
        paymentProofs,
        qrUpload: (paymentBy === 'FINONEST' || paymentBy === 'SELF' || purpose === 'LOAN CLOSURE' || purpose === 'CUSTOMER PAYMENT') && finonestTab === 'qr' ? qrUpload : null,
        upiLink: (paymentBy === 'FINONEST' || paymentBy === 'SELF' || purpose === 'LOAN CLOSURE' || purpose === 'CUSTOMER PAYMENT') && finonestTab === 'upi' ? upiLink : '',
        bankInfoDoc: !bankVerifiedData ? bankInfoDoc : null,
      });
    }
  };

  return (

    <section className="max-w-6xl mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        {/* Bill Number Banner */}
        {billNumber && (
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg px-3 py-2 text-sm font-semibold border border-blue-200 dark:border-blue-700 max-w-max">
            Bill No.: {billNumber}
          </div>
        )}
        <div className="flex gap-3 items-center">
          {!billNumber && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 rounded-lg text-xs font-semibold">
                <AlertCircle size={14} />
                Bill number not mapped
              </div>

              <button
                onClick={() => {
                  setShowBillMappingUploadModal(true);
                }}
                disabled={raiseBillMapRequest.isPending || hasPendingBillMapping}
                className="flex items-center gap-1 sm:gap-2 text-[11px] sm:text-xs bg-blue-600 text-white border border-blue-600 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 hover:bg-blue-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                title={hasPendingBillMapping ? 'A bill mapping request is already pending for this loan' : ''}
              >
                <FileText size={14} className="sm:size-4" />
                <span>{raiseBillMapRequest.isPending ? 'Sending...' : hasPendingBillMapping ? 'Bill Mapping Pending' : 'Raise Bill Mapping Request'}</span>
              </button>
            </div>
          )}

          {billNumber && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 sm:gap-2 text-[11px] sm:text-sm bg-primary text-primary-foreground border border-primary rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 hover:opacity-90 transition-all font-semibold shadow-sm cursor-pointer"
            >
              <PlusCircle size={14} className="sm:size-4" />
              <span>Raise Payment Request</span>
            </button>
          )}
        </div>
      </div>



      {/* Mobile: Two Section Card Layout */}
      <div className="lg:hidden grid grid-cols-1 gap-2 sm:gap-3">
        <div className="bg-card p-3 rounded-lg border border-border shadow-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">Customer Name</p>
              <p className="font-semibold text-foreground text-sm truncate">{displayCustomerName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">Mobile Number</p>
              <p className="font-semibold text-foreground text-sm">{displayMobile}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">Vehicle Number</p>
              <p className="font-mono font-semibold text-foreground text-sm truncate">{displayVehicleNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">Vehicle Model</p>
              <p className="font-semibold text-foreground text-sm truncate">{displayVehicleModel}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">Disbursed Date</p>
              <p className="font-semibold text-foreground text-sm">
                {displayDisbursementDate ? new Date(displayDisbursementDate).toLocaleDateString('en-IN') : '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">PDD Days</p>
              <p className="font-semibold text-foreground text-sm">
                {displayDisbursementDate
                  ? (() => {
                    const days = Math.floor((Date.now() - new Date(displayDisbursementDate).getTime()) / 86400000);
                    return days >= 0 ? `${days} days` : '-';
                  })()
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">Lender/Bank</p>
              <p className="font-semibold text-foreground text-sm truncate">{displayLenderBank}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">PDD Status</p>
              <span className={`inline-block px-2 py-1 rounded-md text-xs font-bold ${displayPddStatus === 'yes' || displayPddStatus === 'COMPLETED'
                ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                : displayPddStatus === 'no' || displayPddStatus === 'PENDING'
                  ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                  : 'bg-gray-500/10 text-gray-600 border border-gray-500/20'
                }`}>
                {displayPddStatus === 'yes' || displayPddStatus === 'COMPLETED' ? 'COMPLETED' : displayPddStatus === 'no' || displayPddStatus === 'PENDING' ? 'PENDING' : displayPddStatus || '-'}
              </span>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground text-[10px] uppercase font-semibold mb-0.5">Sanctioned Amount</p>
              <p className="font-bold text-green-700 dark:text-green-300 text-sm">{Number(displayLoanAmount || 0).toLocaleString('en-IN')}</p>
              {displayRoi && <p className="text-muted-foreground text-[13px]">{displayRoi}% / {displayTenure || '-'}</p>}
            </div>
          </div>
        </div>
        <div className="bg-card p-3 rounded-lg border border-border shadow-sm">
          <div className="space-y-2">
            <div>
              {hierarchy.length > 0 ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  {hierarchy.map((person, i) => (
                    <div key={i} className="flex items-center text-[10px]">
                      <span className="text-muted-foreground text-[8px] uppercase font-semibold w-[80px] shrink-0 truncate">{person.role}</span>
                      <span className="text-muted-foreground text-[8px] w-[12px] shrink-0 text-center">:</span>
                      <span className="font-medium text-foreground truncate text-[10px]">{person.name}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-[10px]">No data</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: Three Section Card Layout */}
      <div className="hidden lg:block">
          <FolioCards
            customerName={displayCustomerName}
            mobile={displayMobile}
            disbursementDate={displayDisbursementDate ? new Date(displayDisbursementDate).toLocaleDateString('en-IN') : '-'}
            pddDays={displayDisbursementDate
              ? (() => { const days = Math.floor((Date.now() - new Date(displayDisbursementDate).getTime()) / 86400000); return days >= 0 ? `${days} days` : '-'; })()
              : '-'}
            pddStatus={displayPddStatus}
            vehicleNumber={displayVehicleNumber}
            vehicleModel={displayVehicleModel}
            lenderBank={displayLenderBank}
            loanAmount={'' + Number(displayLoanAmount || 0).toLocaleString('en-IN')}
            roi={displayRoi}
            tenure={displayTenure}
            hierarchy={hierarchy}
          />
      </div>

      {/* Raise Request Modal */}
      {showForm && (
        <PaymentRequestModal
          loanId={id!}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['loan-payments', id] });
            queryClient.invalidateQueries({ queryKey: ['account-payments'] });
          }}
        />
      )}

      {/* Folio Account Section / Completed Payments Ledger */}
      {linkedFolio ? (
        <FolioAccountCard
          folio={linkedFolio}
          extraEntries={approvedPayments}
          customerName={loan?.customer_name || loan?.applicant_name}
          loanAccountNumber={loan?.loan_account_number}
          onOpenViewer={handleOpenViewer}
        />
      ) : approvedPayments.length > 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-lg p-3 sm:p-4">
          <FolioLedger
            folioId={null}
            extraEntries={approvedPayments}
            customerName={displayCustomerName}
            customerPhone={displayMobile}
            loanAccountNumber={loan?.loan_account_number || '-'}
            lenderName={displayLenderBank}
            hideReceivePayment={true}
            onOpenViewer={handleOpenViewer}
          />
        </div>
      ) : null}




      {/* Bill Mapping Document Upload Modal */}
      {showBillMappingUploadModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-900 backdrop-blur-xl rounded-2xl shadow-2xl p-5 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-gray-100">Raise Bill Mapping Request</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">Upload supporting document and enter remarks/password</p>

            <div className="space-y-4">
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
                        <p className="text-xs text-gray-500 dark:text-gray-400">{billMappingFiles[0].size >= 1024 * 1024 ? `${(billMappingFiles[0].size / (1024 * 1024)).toFixed(2)} MB` : `${(billMappingFiles[0].size / 1024).toFixed(1)} KB`}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBillMappingFiles([])}
                      className="text-red-600 hover:text-red-700 flex-shrink-0 ml-2"
                    >
                      x
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
                    setShowBillMappingUploadModal(false);
                    setBillMappingFiles([]);
                    setBillMappingRemarks('');
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (billMappingFiles.length === 0) {
                      toast.error('File upload is mandatory. Please select a document before raising request.');
                      return;
                    }
                    raiseBillMapRequest.mutate();
                  }}
                  disabled={raiseBillMapRequest.isPending || billMappingFiles.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {raiseBillMapRequest.isPending ? 'Raising...' : 'Raise Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Requests */}
      {payments && payments.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-4 py-2 border-b  border-border">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">All Requests</h3>
          </div>
          <div className="overflow-x-auto">
            <RequestsTable requests={payments} onOpenViewer={handleOpenViewer} />
          </div>
        </div>
      )}

      {viewers.map(v => createPortal(
        <DraggableDocumentViewer key={v.id} url={v.url} onClose={() => setViewers(prev => prev.filter(x => x.id !== v.id))} />,
        document.body
      ))}
    </section>
  );
}



