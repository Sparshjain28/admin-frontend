import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { FloatingLabelInput, FloatingLabelSelect } from '@/components/FloatingLabelInput';
import { toast } from 'sonner';
import { X } from 'lucide-react';

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

function formatNumberWithCommas(num: string): string {
  if (!num) return '';
  const n = Number(num);
  if (isNaN(n)) return num;
  return n.toLocaleString('en-IN');
}

function removeCommas(str: string): string {
  return str.replace(/,/g, '');
}

interface PaymentRequestModalProps {
  loanId?: string | number;
  folio?: any;
  initialPurpose?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PaymentRequestModal({ loanId: propLoanId, folio, initialPurpose, onClose, onSuccess }: PaymentRequestModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isValidLoanId = Boolean(propLoanId && String(propLoanId) !== 'undefined' && String(propLoanId) !== 'null' && String(propLoanId) !== '0' && String(propLoanId).trim() !== '');
  const [selectedLoanId, setSelectedLoanId] = useState<string | number>(isValidLoanId ? propLoanId! : '');
  const activeLoanId = isValidLoanId ? propLoanId : selectedLoanId;

  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState(initialPurpose || '');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountError, setAccountError] = useState('');
  const [ifscError, setIfscError] = useState('');
  const [fcAmount, setFcAmount] = useState('');
  const [supportingDocs, setSupportingDocs] = useState<File[]>([]);
  const [paymentBy, setPaymentBy] = useState('FINONEST');
  const [qrUpload, setQrUpload] = useState<File | null>(null);
  const [paymentProofs, setPaymentProofs] = useState<File[]>([]);
  const [bankInfoDoc, setBankInfoDoc] = useState<File | null>(null);
  const [upiLink, setUpiLink] = useState('');
  const [finonestTab, setFinonestTab] = useState<'bank' | 'qr' | 'upi'>('bank');
  const [verifyingBank, setVerifyingBank] = useState(false);
  const [bankVerifiedData, setBankVerifiedData] = useState<any>(null);
  const [bankVerifyError, setBankVerifyError] = useState('');
  const [bankVerifyAttempted, setBankVerifyAttempted] = useState(false);

  // Sync purpose if initialPurpose prop changes
  useEffect(() => {
    if (initialPurpose) setPurpose(initialPurpose);
  }, [initialPurpose]);

  // Sync selected loan id if propLoanId changes
  useEffect(() => {
    if (isValidLoanId) setSelectedLoanId(propLoanId!);
  }, [propLoanId, isValidLoanId]);

  const { data: userLoans = [] } = useQuery({
    queryKey: ['user-loans-modal'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/user-loans`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !isValidLoanId,
  });

  const { data: loan, isLoading: loanLoading } = useQuery({
    queryKey: ['loan', activeLoanId],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${activeLoanId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch loan');
      return res.json();
    },
    enabled: !!activeLoanId,
  });

  const handleAccountNumberChange = (value: string) => {
    setAccountError('');
    setBankVerifiedData(null);
    setBankVerifyError('');
  };

  const validateAccountNumber = (accNo: string): boolean => {
    if (!accNo) { setAccountError('Account number is required'); return false; }
    if (!/^\d+$/.test(accNo)) { setAccountError('Only digits allowed'); return false; }
    if (accNo.length < 9 || accNo.length > 18) { setAccountError('Must be 9-18 digits'); return false; }
    setAccountError('');
    return true;
  };

  const handleIfscCodeChange = (value: string) => {
    setIfscError('');
    setBankVerifiedData(null);
    setBankVerifyError('');
  };

  const validateIfscCode = (ifsc: string): boolean => {
    if (!ifsc) { setIfscError('IFSC is required'); return false; }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) { setIfscError('Invalid IFSC format'); return false; }
    setIfscError('');
    return true;
  };

  const handleVerifyBank = async () => {
    if (!validateAccountNumber(accountNumber)) return;
    if (!validateIfscCode(ifscCode)) return;
    setVerifyingBank(true);
    setBankVerifyError('');
    setBankVerifyAttempted(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/kyc/verify-bank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ id_number: accountNumber, ifsc: ifscCode, loan_id: activeLoanId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setBankVerifiedData(json.data);
          setBankVerifyError('');
        } else if (json.full_name || json.name || json.account_holder_name) {
          setBankVerifiedData(json);
          setBankVerifyError('');
        } else {
          setBankVerifyError(json.error || 'Bank verification failed or account does not exist');
          setBankVerifiedData(null);
        }
      } else {
        const errorJson = await res.json().catch(() => null);
        setBankVerifyError(errorJson?.error || 'Bank verification failed');
        setBankVerifiedData(null);
      }
    } catch (err: any) {
      setBankVerifyError(err.message || 'Network error during verification');
      setBankVerifiedData(null);
    } finally {
      setVerifyingBank(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setPurpose('');
    setAccountNumber('');
    setIfscCode('');
    setAccountError('');
    setIfscError('');
    setFcAmount('');
    setSupportingDocs([]);
    setPaymentBy('FINONEST');
    setQrUpload(null);
    setPaymentProofs([]);
    setBankInfoDoc(null);
    setUpiLink('');
    setFinonestTab('bank');
    setVerifyingBank(false);
    setBankVerifiedData(null);
    setBankVerifyError('');
    setBankVerifyAttempted(false);
  };

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
      formData.append('loan_id', String(activeLoanId));
      formData.append('amount', payload.amount);
      formData.append('purpose', payload.purpose);
      formData.append('account_number', payload.accountNumber);
      formData.append('ifsc_code', payload.ifscCode);
      if (payload.fcAmount) formData.append('fc_amount', payload.fcAmount);
      if (payload.paymentBy) formData.append('payment_by', payload.paymentBy);
      if (payload.upiLink) formData.append('upi_link', payload.upiLink);
      if (payload.qrUpload) formData.append('qr_upload', payload.qrUpload);
      if (payload.bankInfoDoc) formData.append('bank_info_doc', payload.bankInfoDoc);
      if (payload.supportingDocs) {
        payload.supportingDocs.forEach((doc, i) => formData.append(`documents`, doc));
      }
      if (payload.paymentProofs) {
        payload.paymentProofs.forEach((proof, i) => formData.append(`payment_proofs`, proof));
      }
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/payments/request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create request');
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['loan-payments', activeLoanId] });
      queryClient.invalidateQueries({ queryKey: ['payment-case-details', activeLoanId] });
      queryClient.invalidateQueries({ queryKey: ['account-payments'] });
      queryClient.invalidateQueries({ queryKey: ['accountant-dashboard'] });
      toast.success(data.message || 'Payment request submitted successfully');
      resetForm();
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create payment request');
    },
  });

  const paymentByOptions = useMemo(() => [
    { value: 'SELF', label: 'Self' },
    { value: 'FINONEST', label: 'Finonest' },
  ], []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoanId) {
      toast.error('Please select a lead/loan first');
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

  const needsAcIfscSection = purpose === 'LOAN CLOSURE' || purpose === 'CUSTOMER PAYMENT';

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 p-3 sm:p-4">
      <div className="bg-card rounded-xl shadow-xl p-4 sm:p-5 w-full max-w-sm sm:max-w-md border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Payment Request</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer shrink-0">
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {!propLoanId && (
            <div>
              <label className="block text-[11px] font-medium text-foreground/70 mb-1">Select Lead / Loan *</label>
              <select
                value={selectedLoanId}
                onChange={e => setSelectedLoanId(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">-- Choose Lead / Loan --</option>
                {userLoans.map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.applicant_name || l.customer_name} - {l.vehicle_number || l.loan_number || `ID #${l.id}`} ({l.maker_name || ''} {l.maker_model || ''})
                  </option>
                ))}
              </select>
            </div>
          )}

          <FloatingLabelSelect label="" value={purpose} onChange={e => setPurpose(e.target.value)} required>
            <option value="">Select purpose *</option>
            <option value="REQUEST RAISED FOR BILL MAPPING">Bill Mapping Request</option>
            <option value="LOAN CLOSURE">LOAN CLOSURE</option>
            <option value="CUSTOMER PAYMENT">CUSTOMER PAYMENT</option>
            <option value="RTO CHARGES">RTO CHARGES</option>
            <option value="INSURANCE">INSURANCE</option>
            <option value="PUC">PUC</option>
            <option value="CHALLAN">CHALLAN</option>
            <option value="SOA/BANKING">SOA/BANKING</option>
          </FloatingLabelSelect>

          {purpose && (
            <>
              <div className="relative">
                <FloatingLabelInput
                  label="Amount *"
                  type="text"
                  required
                  value={formatNumberWithCommas(amount)}
                  onChange={e => {
                    const rawValue = removeCommas(e.target.value);
                    if (rawValue === '' || /^\d+$/.test(rawValue)) {
                      const numValue = Number(rawValue);
                      if (numValue <= Number(loan?.loan_amount || Infinity)) {
                        setAmount(rawValue);
                      }
                    }
                  }}
                />
              </div>

              {purpose === 'LOAN CLOSURE' && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-foreground/70 mb-0.5">Existing Financer</label>
                    <input type="text" readOnly value={loan?.financer || '-'} className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground/60" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-foreground/70 mb-0.5">Supporting Documents (multiple) *</label>
                    <input type="file" multiple required accept=".pdf,.jpg,.jpeg,.png" onChange={async e => {
                      const files = e.target.files;
                      if (files) {
                        const compressed = await Promise.all(Array.from(files).map(f => compressImage(f)));
                        setSupportingDocs(prev => [...prev, ...compressed]);
                      }
                    }} className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:border file:border-border file:rounded-lg file:text-[10px] file:bg-background file:text-foreground hover:file:bg-accent/50" />
                    {supportingDocs.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {supportingDocs.map((f, i) => (
                          <li key={i} className="flex items-center justify-between text-[10px] text-green-600">
                            <span className="truncate flex-1">{f.name}</span>
                            <button type="button" onClick={() => setSupportingDocs(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700 ml-1 shrink-0"><X size={14} /></button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}

              {needsAcIfscSection && (
                <div>
                  <div className="flex border border-gray-200 rounded overflow-hidden text-xs mb-2">
                    {(['bank', 'qr', 'upi'] as const).map(tab => (
                      <button key={tab} type="button" onClick={() => setFinonestTab(tab)}
                        className={`flex-1 py-1.5 text-center text-xs font-medium transition-all ${finonestTab === tab ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground/70 hover:bg-accent/50'}`}>
                        {tab === 'bank' ? 'Bank Ac' : tab === 'qr' ? 'QR Upload' : 'Payment Link'}
                      </button>
                    ))}
                  </div>
                  {finonestTab === 'bank' && (
                    <div className="space-y-2">
                      <FloatingLabelInput label="Account number *" type="text" required value={accountNumber}
                        onChange={e => { const value = e.target.value.replace(/\D/g, ''); setAccountNumber(value); handleAccountNumberChange(value); validateAccountNumber(value); }}
                        onBlur={() => validateAccountNumber(accountNumber)} maxLength={18} />
                      {accountError && <p className="text-[10px] text-red-600 mt-0.5">{accountError}</p>}
                      <div className="flex gap-2 items-start">
                        <div className="flex-1">
                          <FloatingLabelInput label="IFSC *" type="text" required value={ifscCode}
                            onChange={e => { const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); setIfscCode(value); handleIfscCodeChange(value); if (value.length === 11) { validateIfscCode(value); } else { setIfscError(''); } }}
                            onBlur={() => validateIfscCode(ifscCode)} maxLength={11} className="uppercase" />
                        </div>
                        {!bankVerifiedData && (
                          <button type="button" onClick={handleVerifyBank} disabled={verifyingBank}
                            className="mt-1 px-3 py-2 text-[10px] font-semibold rounded-md border transition-colors bg-green-600/10 hover:bg-green-600/20 text-green-600 border-green-600/20 hover:border-green-600/30 disabled:opacity-50 shrink-0">
                            {verifyingBank ? '...' : 'Verify'}
                          </button>
                        )}
                      </div>
                      {ifscError && <p className="text-[10px] text-red-600 mt-0.5">{ifscError}</p>}
                      {!bankVerifiedData && bankVerifyAttempted && (
                        <div className="mt-2 pt-2 border-t border-dashed border-gray-300">
                          <p className="text-[10px] text-gray-500 mb-1">OR upload cancelled cheque / bank statement</p>
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={async e => { const file = e.target.files?.[0] || null; setBankInfoDoc(file ? await compressImage(file) : null); }} className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:border file:border-border file:rounded-lg file:text-[10px] file:bg-background file:text-foreground hover:file:bg-accent/50" />
                        </div>
                      )}
                      {bankVerifiedData && (
                        <div className="mt-2 p-2.5 bg-green-50 dark:bg-green-950/40 border border-green-300 dark:border-green-800 rounded-lg flex items-center justify-between shadow-xs">
                          <div>
                            <span className="text-[10px] font-bold text-green-700 dark:text-green-400 block uppercase tracking-wider">Account Holder</span>
                            <span className="text-xs font-bold text-green-900 dark:text-green-100 block">
                              {bankVerifiedData.full_name || bankVerifiedData.name || bankVerifiedData.account_holder_name || bankVerifiedData.data?.full_name || 'Account Verified'}
                            </span>
                            {(bankVerifiedData.bank_name || bankVerifiedData.data?.bank_name) && (
                              <span className="text-[10px] text-green-700/80 dark:text-green-300/80 block font-medium mt-0.5">
                                {bankVerifiedData.bank_name || bankVerifiedData.data?.bank_name}
                              </span>
                            )}
                          </div>
                          <span className="px-2 py-1 bg-green-600 text-white text-[9px] font-bold rounded-md uppercase tracking-wider shrink-0 ml-2 shadow-xs">
                            Verified ✓
                          </span>
                        </div>
                      )}
                      {bankVerifyError && <p className="text-[10px] text-red-600 mt-1">{bankVerifyError}</p>}
                    </div>
                  )}
                  {finonestTab === 'qr' && (
                    <div>
                      <label className="block text-[11px] font-medium text-foreground/70 mb-0.5">QR Upload *</label>
                      <input type="file" required accept=".pdf,.jpg,.jpeg,.png" onChange={async e => { const file = e.target.files?.[0] || null; setQrUpload(file ? await compressImage(file) : null); }} className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:border file:border-border file:rounded-lg file:text-[10px] file:bg-background file:text-foreground hover:file:bg-accent/50" />
                    </div>
                  )}
                  {finonestTab === 'upi' && (
                    <FloatingLabelInput label="Payment Link *" type="text" required value={upiLink} onChange={e => setUpiLink(e.target.value)} placeholder="upi@paytm / upi@googlepay" />
                  )}
                </div>
              )}

              {purpose && !needsAcIfscSection && (
                <div>
                  <FloatingLabelSelect label="" value={paymentBy} onChange={e => setPaymentBy(e.target.value)} required>
                    <option value="">Payment by *</option>
                    {paymentByOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </FloatingLabelSelect>
                  {paymentBy === 'SELF' && (
                    <div className="space-y-3 mt-2">
                      <div>
                        <label className="block text-[11px] font-medium text-foreground/70 mb-0.5">Payment Proof *</label>
                        <input type="file" required accept=".pdf,.jpg,.jpeg,.png" onChange={async e => { const file = e.target.files?.[0]; if (file) setPaymentProofs([await compressImage(file)]); }} className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:border file:border-border file:rounded-lg file:text-[10px] file:bg-background file:text-foreground hover:file:bg-accent/50" />
                        {paymentProofs.length > 0 && (
                          <div className="mt-1 flex items-center justify-between text-[10px] text-green-600">
                            <span className="truncate flex-1">{paymentProofs[0].name}</span>
                            <button type="button" onClick={() => setPaymentProofs([])} className="text-red-500 hover:text-red-700 ml-1 shrink-0"><X size={14} /></button>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex border border-border rounded-lg overflow-hidden text-xs mb-2">
                          {(['bank', 'qr', 'upi'] as const).map(tab => (
                            <button key={tab} type="button" onClick={() => setFinonestTab(tab)}
                              className={`flex-1 py-1.5 text-center text-xs font-medium transition-all ${finonestTab === tab ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground/70 hover:bg-accent/50'}`}>
                              {tab === 'bank' ? 'Bank Ac' : tab === 'qr' ? 'QR Upload' : 'UPI Link'}
                            </button>
                          ))}
                        </div>
                        {finonestTab === 'bank' && (
                          <div className="space-y-2">
                            <FloatingLabelInput label="Account number *" type="text" required value={accountNumber}
                              onChange={e => { const value = e.target.value.replace(/\D/g, ''); setAccountNumber(value); handleAccountNumberChange(value); validateAccountNumber(value); }}
                              onBlur={() => validateAccountNumber(accountNumber)} maxLength={18} />
                            {accountError && <p className="text-[10px] text-red-600 mt-0.5">{accountError}</p>}
                            <div className="flex gap-2 items-start">
                              <div className="flex-1">
                                <FloatingLabelInput label="IFSC *" type="text" required value={ifscCode}
                                  onChange={e => { const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); setIfscCode(value); handleIfscCodeChange(value); if (value.length === 11) { validateIfscCode(value); } else { setIfscError(''); } }}
                                  onBlur={() => validateIfscCode(ifscCode)} maxLength={11} className="uppercase" />
                              </div>
                              {!bankVerifiedData && (
                                <button type="button" onClick={handleVerifyBank} disabled={verifyingBank}
                                  className="mt-1 px-3 py-2 text-[10px] font-semibold rounded-md border transition-colors bg-green-600/10 hover:bg-green-600/20 text-green-600 border-green-600/20 hover:border-green-600/30 disabled:opacity-50 shrink-0">
                                  {verifyingBank ? '...' : 'Verify'}
                                </button>
                              )}
                            </div>
                            {ifscError && <p className="text-[10px] text-red-600 mt-0.5">{ifscError}</p>}
                            {!bankVerifiedData && bankVerifyAttempted && (
                              <div className="mt-2 pt-2 border-t border-dashed border-gray-300">
                                <p className="text-[10px] text-gray-500 mb-1">OR upload cancelled cheque / bank statement</p>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={async e => { const file = e.target.files?.[0] || null; setBankInfoDoc(file ? await compressImage(file) : null); }} className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:border file:border-border file:rounded-lg file:text-[10px] file:bg-background file:text-foreground hover:file:bg-accent/50" />
                              </div>
                            )}
                            {bankVerifiedData && (
                              <div className="mt-2 p-2.5 bg-green-50 dark:bg-green-950/40 border border-green-300 dark:border-green-800 rounded-lg flex items-center justify-between shadow-xs">
                                <div>
                                  <span className="text-[10px] font-bold text-green-700 dark:text-green-400 block uppercase tracking-wider">Account Holder</span>
                                  <span className="text-xs font-bold text-green-900 dark:text-green-100 block">
                                    {bankVerifiedData.full_name || bankVerifiedData.name || bankVerifiedData.account_holder_name || bankVerifiedData.data?.full_name || 'Account Verified'}
                                  </span>
                                  {(bankVerifiedData.bank_name || bankVerifiedData.data?.bank_name) && (
                                    <span className="text-[10px] text-green-700/80 dark:text-green-300/80 block font-medium mt-0.5">
                                      {bankVerifiedData.bank_name || bankVerifiedData.data?.bank_name}
                                    </span>
                                  )}
                                </div>
                                <span className="px-2 py-1 bg-green-600 text-white text-[9px] font-bold rounded-md uppercase tracking-wider shrink-0 ml-2 shadow-xs">
                                  Verified ✓
                                </span>
                              </div>
                            )}
                            {bankVerifyError && <p className="text-[10px] text-red-600 mt-1">{bankVerifyError}</p>}
                          </div>
                        )}
                        {finonestTab === 'qr' && (
                          <div>
                            <label className="block text-[11px] font-medium text-foreground/70 mb-0.5">QR Upload *</label>
                            <input type="file" required accept=".pdf,.jpg,.jpeg,.png" onChange={async e => { const file = e.target.files?.[0] || null; setQrUpload(file ? await compressImage(file) : null); }} className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:border file:border-border file:rounded-lg file:text-[10px] file:bg-background file:text-foreground hover:file:bg-accent/50" />
                          </div>
                        )}
                        {finonestTab === 'upi' && (
                          <FloatingLabelInput label="Payment Link *" type="text" required value={upiLink} onChange={e => setUpiLink(e.target.value)} placeholder="upi@paytm / upi@googlepay" />
                        )}
                      </div>
                    </div>
                  )}
                  {paymentBy === 'FINONEST' && (
                    <div className="mt-2">
                      <div className="flex border border-border rounded-lg overflow-hidden text-xs mb-2">
                        {(['bank', 'qr', 'upi'] as const).map(tab => (
                          <button key={tab} type="button" onClick={() => setFinonestTab(tab)}
                            className={`flex-1 py-1.5 text-center text-xs font-medium transition-all ${finonestTab === tab ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground/70 hover:bg-accent/50'}`}>
                            {tab === 'bank' ? 'Bank Ac' : tab === 'qr' ? 'QR Upload' : 'UPI Link'}
                          </button>
                        ))}
                      </div>
                      {finonestTab === 'bank' && (
                        <div className="space-y-2">
                          <FloatingLabelInput label="Account number *" type="text" required value={accountNumber}
                            onChange={e => { const value = e.target.value.replace(/\D/g, ''); setAccountNumber(value); handleAccountNumberChange(value); validateAccountNumber(value); }}
                            onBlur={() => validateAccountNumber(accountNumber)} maxLength={18} />
                          {accountError && <p className="text-[10px] text-red-600 mt-0.5">{accountError}</p>}
                          <div className="flex gap-2 items-start">
                            <div className="flex-1">
                              <FloatingLabelInput label="IFSC *" type="text" required value={ifscCode}
                                onChange={e => { const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); setIfscCode(value); handleIfscCodeChange(value); if (value.length === 11) { validateIfscCode(value); } else { setIfscError(''); } }}
                                onBlur={() => validateIfscCode(ifscCode)} maxLength={11} className="uppercase" />
                            </div>
                            {!bankVerifiedData && (
                              <button type="button" onClick={handleVerifyBank} disabled={verifyingBank}
                                className="mt-1 px-3 py-2 text-[10px] font-semibold rounded-md border transition-colors bg-green-600/10 hover:bg-green-600/20 text-green-600 border-green-600/20 hover:border-green-600/30 disabled:opacity-50 shrink-0">
                                {verifyingBank ? '...' : 'Verify'}
                              </button>
                            )}
                          </div>
                          {ifscError && <p className="text-[10px] text-red-600 mt-0.5">{ifscError}</p>}
                          {!bankVerifiedData && bankVerifyAttempted && (
                            <div className="mt-2 pt-2 border-t border-dashed border-gray-300">
                              <p className="text-[10px] text-gray-500 mb-1">OR upload cancelled cheque / bank statement</p>
                              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={async e => { const file = e.target.files?.[0] || null; setBankInfoDoc(file ? await compressImage(file) : null); }} className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:border file:border-border file:rounded-lg file:text-[10px] file:bg-background file:text-foreground hover:file:bg-accent/50" />
                            </div>
                          )}
                          {bankVerifiedData && (
                            <div className="mt-2 p-2.5 bg-green-50 dark:bg-green-950/40 border border-green-300 dark:border-green-800 rounded-lg flex items-center justify-between shadow-xs">
                              <div>
                                <span className="text-[10px] font-bold text-green-700 dark:text-green-400 block uppercase tracking-wider">Account Holder</span>
                                <span className="text-xs font-bold text-green-900 dark:text-green-100 block">
                                  {bankVerifiedData.full_name || bankVerifiedData.name || bankVerifiedData.account_holder_name || bankVerifiedData.data?.full_name || 'Account Verified'}
                                </span>
                                {(bankVerifiedData.bank_name || bankVerifiedData.data?.bank_name) && (
                                  <span className="text-[10px] text-green-700/80 dark:text-green-300/80 block font-medium mt-0.5">
                                    {bankVerifiedData.bank_name || bankVerifiedData.data?.bank_name}
                                  </span>
                                )}
                              </div>
                              <span className="px-2 py-1 bg-green-600 text-white text-[9px] font-bold rounded-md uppercase tracking-wider shrink-0 ml-2 shadow-xs">
                                Verified ✓
                              </span>
                            </div>
                          )}
                          {bankVerifyError && <p className="text-[10px] text-red-600 mt-1">{bankVerifyError}</p>}
                        </div>
                      )}
                      {finonestTab === 'qr' && (
                        <div>
                          <label className="block text-[11px] font-medium text-foreground/70 mb-0.5">QR Upload *</label>
                          <input type="file" required accept=".pdf,.jpg,.jpeg,.png" onChange={async e => { const file = e.target.files?.[0] || null; setQrUpload(file ? await compressImage(file) : null); }} className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:border file:border-border file:rounded-lg file:text-[10px] file:bg-background file:text-foreground hover:file:bg-accent/50" />
                        </div>
                      )}
                      {finonestTab === 'upi' && (
                        <FloatingLabelInput label="Payment Link *" type="text" required value={upiLink} onChange={e => setUpiLink(e.target.value)} placeholder="upi@paytm / upi@googlepay" />
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-background text-foreground border border-border rounded-xl hover:bg-accent/50 transition text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={createRequest.isPending || !amount}
                  className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {createRequest.isPending ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
