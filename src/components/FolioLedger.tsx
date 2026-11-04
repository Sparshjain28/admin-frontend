import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TrendingDown } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface FolioLedgerProps {
  folioId?: string | null;
  folioAmount?: number;
  customerName?: string;
  customerPhone?: string;
  loanAccountNumber?: string;
  lenderName?: string;
  extraEntries?: any[];
  activeRequestId?: number | string;
  activePurpose?: string;
  userRole?: string;
  onApprove?: (paymentId: number, options?: { accountant_remarks?: string; utr_no?: string; admin_remarks?: string; sales_manager_remarks?: string }) => void;
  onReject?: (paymentId: number, remarks: string) => void;
  onClose?: () => void;
  hideReceivePayment?: boolean;
  viewers?: { url: string; id: number }[];
  onOpenViewer?: (url: string, id: number) => void;
  onCloseViewer?: (id: number) => void;
}

export default function FolioLedger({
  folioId,
  folioAmount = 0,
  customerName = "N/A",
  customerPhone = "-",
  loanAccountNumber = "-",
  lenderName = "-",
  extraEntries = [],
  activeRequestId,
  activePurpose,
  userRole,
  onApprove,
  onReject,
  onClose,
  hideReceivePayment,
  viewers = [],
  onOpenViewer,
  onCloseViewer,
}: FolioLedgerProps) {
  const handleOpenDoc = (filePath: string, docId: number) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const url = filePath.startsWith('http') ? filePath : `${baseUrl}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
    if (onOpenViewer) {
      onOpenViewer(url, docId);
    } else {
      window.open(url, '_blank');
    }
  };

  const queryClient = useQueryClient();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const handleReceivePayment = async () => {
    if (!paymentAmount || isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setIsSubmittingPayment(true);
    try {
      const url = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/accountant/folio-accounts/${folioId}/payment-received`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({ amount: parseFloat(paymentAmount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit payment");
      }
      toast.success(data.message || "Payment processed successfully");
      setPaymentAmount("");
      queryClient.invalidateQueries({ queryKey: ["folio-ledger", folioId] });
      queryClient.invalidateQueries({ queryKey: ["folio-detail"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const [inlineRemarks, setInlineRemarks] = useState<Record<string, string>>({});
  const [inlineUtr, setInlineUtr] = useState<Record<string, string>>({});
  const [remarksDialogRow, setRemarksDialogRow] = useState<string | null>(null);
  // Initialize inlineUtr/inlineRemarks from entry data (semi-approved UTR/remarks)
  useEffect(() => {
    const utrInit: Record<string, string> = {};
    const remarksInit: Record<string, string> = {};
    const isAdmin = userRole === 'admin';
    extraEntries.forEach((entry: any, idx: number) => {
      const rowKey = String(entry.id || 'idx-' + idx);
      if (entry.utr_reference) utrInit[rowKey] = entry.utr_reference;
      if (isAdmin && entry.admin_remarks) remarksInit[rowKey] = entry.admin_remarks;
      else if (!isAdmin && entry.accountant_remarks) remarksInit[rowKey] = entry.accountant_remarks;
    });
    if (Object.keys(utrInit).length) setInlineUtr(prev => ({ ...prev, ...utrInit }));
    if (Object.keys(remarksInit).length) setInlineRemarks(prev => ({ ...prev, ...remarksInit }));
  }, [extraEntries, userRole]);

  const {
    data: ledgerEntries = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["folio-ledger", folioId],
    queryFn: async () => {
      if (!folioId) {
        return [];
      }
      const url = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/accountant/folio-ledger/${folioId}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      if (!res.ok) {
        return [];
      }
      const data = await res.json();
      return data;
    },
    enabled: !!folioId,
  });

const isReceivedPayment = (purpose?: string, txnType?: string, creditDebit?: string, entryType?: string) => {
  const p = (purpose || '').toLowerCase();
  const t = (txnType || '').toLowerCase();
  const cd = (creditDebit || '').toLowerCase();
  const et = (entryType || '').toLowerCase();

  if (cd === 'credit' || t === 'credit' || et === 'credit') return true;
  if (p.includes('payment received') || p.includes('payment_received') || p.includes('customer payment') || p.includes('receive payment')) {
    return true;
  }
  if (t.includes('payment_received') || t.includes('folio_payment') || t.includes('receive_payment')) {
    return true;
  }
  return false;
};

const isEntryCredit = (entry: any) =>
  entry.transaction_type === "credit" ||
  isReceivedPayment(
    entry.payment_purpose || entry.purpose || entry.description,
    entry.txn_type,
    entry.credit_debit || entry.transaction_type,
    entry.entry_type
  );

  const formattedExtraEntries = extraEntries
    .filter((e: any) => {
      if (e.status && e.status !== 'completed' && e.status !== 'rejected') {
        return true; // Keep pending requests
      }
      // Deduplicate completed entries already present in ledgerEntries
      const isDuplicate = ledgerEntries.some((le: any) => {
        const utrMatch = le.utr_reference && e.utr_reference && String(le.utr_reference).trim() === String(e.utr_reference).trim();
        const amtMatch = Math.abs(Number(le.amount || 0) - Number(e.payout_amount || e.amount || 0)) < 0.01;
        const purposeMatch = (le.payment_purpose || le.purpose || '').trim().toLowerCase() === (e.purpose || e.txn_type || '').trim().toLowerCase();
        return utrMatch || (amtMatch && purposeMatch);
      });
      return !isDuplicate;
    })
    .map((e: any) => {
      const isCr = isReceivedPayment(e.purpose, e.txn_type, e.credit_debit, e.entry_type);
      return {
        created_at: e.created_at || e.payment_date,
        transaction_type: isCr ? 'credit' : (e.credit_debit || 'debit'),
        amount: e.payout_amount || e.amount || 0,
        payment_purpose: e.purpose || e.txn_type?.replace(/_/g, ' ') || e.remarks || '',
        isBillMapping: e.txn_type === 'BILL_MAPPING_REQUEST' || e.purpose === 'REQUEST RAISED FOR BILL MAPPING',
        payment_account_number: e.account_number || loanAccountNumber,
        ifsc_code: e.ifsc_code || '',
        account_holder_name: e.account_holder_name || '',
        account_bank_name: e.account_bank_name || '',
        loan_account_number: e.loan_account_number || '',
        customer_name: e.customer_name || '',
        bank_nbfc: e.bank_nbfc || '',
        rc_lender_name: e.rc_lender_name || '',
        utr_reference: e.utr_reference,
        admin_remarks: e.admin_remarks,
        accountant_remarks: e.accountant_remarks,
        sm_remarks: e.sm_remarks,
        sales_manager_remarks: e.sales_manager_remarks,
        description: '',
        documents: e.documents || [],
        upi_link: e.upi_link || '',
        _isPendingRequest: e.status ? (e.status !== 'completed' && e.status !== 'rejected') : false,
        id: e.id,
      };
    });

  const rawAllEntries = [...ledgerEntries, ...formattedExtraEntries];

  const normalizePurposeStr = (str: string) => {
    return String(str || '')
      .toLowerCase()
      .replace(/^folio:\s*/i, '')
      .replace(/^folio_creation_request/i, '')
      .replace(/charges|charge|fee|fees|payment|request/g, '')
      .replace(/_/g, ' ')
      .trim();
  };

  const isFolioPlaceholderEntry = (entry: any) => {
    const raw = String(entry.payment_purpose || entry.folio_purpose || entry.purpose || entry.entry_type || entry.txn_type || '').trim();
    if (isReceivedPayment(raw, entry.txn_type, entry.credit_debit || entry.transaction_type, entry.entry_type)) {
      return false;
    }
    return /^folio:\s*/i.test(raw) || raw.toUpperCase() === 'FOLIO_CREATION_REQUEST';
  };

  const isTallySyncEntry = (entry: any) => {
    const raw = String(entry.payment_purpose || entry.folio_purpose || entry.purpose || entry.entry_type || entry.txn_type || '').trim().toLowerCase();
    return raw.includes('tally voucher import') || raw.includes('tally_import') || raw.includes('tally sync');
  };

  const purposesMatch = (p1: string, p2: string) => {
    const n1 = normalizePurposeStr(p1);
    const n2 = normalizePurposeStr(p2);
    if (!n1 || !n2) return false;
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
  };

  const allEntries = rawAllEntries
    .filter((entry: any) => !isFolioPlaceholderEntry(entry) && !isTallySyncEntry(entry))
    .map((entry: any) => {
      const entryPurpose = String(entry.payment_purpose || entry.folio_purpose || entry.purpose || entry.entry_type || entry.txn_type || '');
      const entryAmt = parseFloat(entry.amount || entry.payout_amount || 0);

      const hadPlaceholder = rawAllEntries.some((other: any) => {
        if (!isFolioPlaceholderEntry(other)) return false;
        const otherPurpose = String(other.payment_purpose || other.folio_purpose || other.purpose || other.entry_type || other.txn_type || '');
        const otherAmt = parseFloat(other.amount || other.payout_amount || 0);

        const purposeOk = purposesMatch(entryPurpose, otherPurpose);
        const amountOk = entryAmt <= 0 || otherAmt <= 0 || Math.abs(entryAmt - otherAmt) < 1.0;
        return purposeOk && amountOk;
      });

      const isMapped = Boolean(
        hadPlaceholder ||
        entry.bill_number ||
        (folioId && entry.isBillMapping) ||
        (entry.isBillMapping && entry.status === 'completed')
      );
      return {
        ...entry,
        isMapped,
      };
    });

  const totalDebits = allEntries
    .filter((entry: any) => !isEntryCredit(entry))
    .reduce(
      (sum: number, entry: any) => sum + parseFloat(entry.amount || 0),
      0,
    );

  const totalCredits = allEntries
    .filter((entry: any) => isEntryCredit(entry))
    .reduce(
      (sum: number, entry: any) => sum + parseFloat(entry.amount || 0),
      0,
    );

  const balance = totalCredits - totalDebits;

  const mobilePendingEntry = allEntries.find((entry: any) => entry._isPendingRequest) || allEntries[0];
  const mobileActionRowKey = String(mobilePendingEntry?.id || 'mobile-row');

  const onMobileApprove = () => {
    if (!mobilePendingEntry || !onApprove) return;
    const approvePayload: any = {};
    if (userRole === 'admin' && !mobilePendingEntry.isBillMapping) {
      approvePayload.utr_no = inlineUtr[mobileActionRowKey] || '';
      approvePayload.admin_remarks = inlineRemarks[mobileActionRowKey] || '';
    }
    if (userRole === 'admin' && mobilePendingEntry.isBillMapping) {
      approvePayload.admin_remarks = inlineRemarks[mobileActionRowKey] || '';
    }
    if (userRole !== 'admin' && inlineRemarks[mobileActionRowKey]) {
      approvePayload.accountant_remarks = inlineRemarks[mobileActionRowKey];
    }
    if (userRole === 'sales_manager' || userRole === 'branch_manager' || userRole === 'dsa') {
      approvePayload.sales_manager_remarks = inlineRemarks[mobileActionRowKey] || '';
    }
    if (Object.keys(approvePayload).length > 0 || !mobilePendingEntry.isBillMapping) {
      onApprove(mobilePendingEntry.id, approvePayload);
    }
  };

  const onMobileReject = () => {
    if (!mobilePendingEntry || !onReject) return;
    onReject(mobilePendingEntry.id, inlineRemarks[mobileActionRowKey] || '');
    if (onClose) onClose();
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading ledger entries...
      </div>
    );
  }

  return (
    <div>
      {!hideReceivePayment && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-border mb-4">
          <div className="flex items-center sm:w-auto">
            <div>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Folio Ledger</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Recorded transactions and balances</p>
            </div>
          </div>
          <div className="relative flex-1 sm:flex-none">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">₹</span>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Amount Received"
              className="w-full sm:w-48 pl-6 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-medium"
              disabled={isSubmittingPayment}
            />
          </div>
          <button
            onClick={handleReceivePayment}
            disabled={isSubmittingPayment}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 text-xs font-bold rounded-lg shadow transition disabled:opacity-50 min-h-[32px] shrink-0"
          >
            {isSubmittingPayment ? "Processing..." : "Receive Payment"}
          </button>
        </div>
      )}

      {/* Mobile: Cards */}
      <div className="block lg:hidden">
        <div className="rounded-lg border border-border bg-card shadow-xl overflow-hidden">
          <div className=" space-y-3">
            {allEntries.length > 0 ? (
              <div className=" space-y-2">
                {allEntries.map((entry: any, idx: number) => {
                  let runningBalance = 0;
                  for (let i = 0; i <= idx; i++) {
                    const e = allEntries[i];
                    const isCr = isEntryCredit(e);
                    runningBalance += isCr
                      ? parseFloat(e.amount || 0)
                      : -parseFloat(e.amount || 0);
                  }
                  const rowKey = String(entry.id || 'idx-' + idx);
                  const entryPurposeStr = String(entry.payment_purpose || entry.folio_purpose || entry.purpose || entry.txn_type || '').toLowerCase();
                  const targetPurposeStr = String(activePurpose || '').toLowerCase().replace(/_/g, ' ');
                  const isTargetRow = Boolean(
                    (activeRequestId && entry.id && String(entry.id) === String(activeRequestId)) ||
                    (targetPurposeStr && entryPurposeStr && (entryPurposeStr === targetPurposeStr || entryPurposeStr.includes(targetPurposeStr)))
                  );
                  return (
                    <div key={idx} className={`rounded-lg border p-2.5 transition-all ${isTargetRow ? 'border-2 border-blue-600 bg-blue-100/90 dark:bg-blue-950/50 shadow-md ring-2 ring-blue-500' : entry._isPendingRequest ? 'bg-amber-100 dark:bg-amber-900/30 border-border' : 'bg-muted/30 border-border'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold text-muted-foreground">{entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-IN') : '-'}</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold ${isTargetRow ? 'text-blue-900 dark:text-blue-200 font-extrabold' : 'text-foreground'}`}>{entry.payment_purpose || 'Transaction'}</span>
                          {isTargetRow && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-blue-600 text-white shadow-sm animate-pulse">ACTIVE REQUEST</span>
                          )}
                          {entry.isMapped && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-emerald-600 text-white shadow-xs uppercase">✓ MAPPED</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-1.5 flex items-start justify-between gap-2">
                        <div className="text-[10px] text-foreground space-y-0.5 min-w-0 flex-1">
                          {!entry.isBillMapping && idx === 0 && folioId && (
                            <div className="leading-tight">
                              {customerName && customerName !== 'N/A' && <div><span className="font-bold">Customer:</span> {customerName}</div>}
                              {lenderName && lenderName !== '-' && lenderName !== 'N/A' && <div><span className="font-bold">Lender:</span> {lenderName}</div>}
                            </div>
                          )}
                          {entry.isBillMapping && (
                            <div>
                              {entry.customer_name && <span><span className="font-medium">Customer:</span> {entry.customer_name}</span>}
                              {entry.bank_nbfc && entry.bank_nbfc !== 'N/A' && <span> | <span className="font-medium">Lender:</span> {entry.bank_nbfc}</span>}
                            </div>
                          )}
                          {!entry.isBillMapping && !(!entry._isPendingRequest && idx === 0 && folioId) && !entry.upi_link && (entry.payment_account_number || entry.ifsc_code || entry.account_bank_name || entry.account_holder_name) && (
                            <div>
                              {entry.payment_account_number && <span><span className="font-bold">A/C No:</span> {entry.payment_account_number}{entry.ifsc_code ? ' | ' : ''}</span>}
                              {entry.ifsc_code && <span><span className="font-bold">IFSC:</span> {entry.ifsc_code}</span>}
                              {entry.account_bank_name && <span> | <span className="font-bold">Bank:</span> {entry.account_bank_name}{entry.account_holder_name ? ' | ' : ''}</span>}
                              {entry.account_holder_name && <span><span className="font-bold">Holder:</span> {entry.account_holder_name}</span>}
                            </div>
                          )}
                          {entry.upi_link && (
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="font-bold text-foreground">Pay by Self:</span>
                              <button onClick={() => { navigator.clipboard.writeText(entry.upi_link); }} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[8px] font-semibold rounded border border-blue-600/20 transition-colors">
                                Copy UPI Link
                              </button>
                            </div>
                          )}
                          {!entry._isPendingRequest && (entry.utr_reference || entry.accountant_remarks || entry.sales_manager_remarks || entry.admin_remarks) && (
                            <div className="leading-tight space-y-0.5 pt-0.5">
                              {entry.utr_reference && <div><span className="font-bold">UTR:</span> {entry.utr_reference}</div>}
                              {entry.accountant_remarks && <div><span className="font-bold">Acct:</span> {entry.accountant_remarks}</div>}
                              {entry.sales_manager_remarks && <div><span className="font-bold">SM:</span> {entry.sales_manager_remarks}</div>}
                              {entry.admin_remarks && <div><span className="font-bold">Admin:</span> {entry.admin_remarks}</div>}
                            </div>
                          )}
                          {entry.documents?.length > 0 && (
                            <div className="flex flex-wrap gap-1 items-center pt-0.5">
                              {entry.documents?.filter((d: any) => d.field_name === 'qr_upload').map((doc: any) => (
                                <button
                                  key={doc.id}
                                  onClick={() => handleOpenDoc(doc.file_path, doc.id)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[9px] font-semibold rounded border border-blue-600/20 transition-colors"
                                >
                                  Uploaded QR
                                </button>
                              ))}
                              {entry.documents?.filter((d: any) => d.field_name !== 'qr_upload').map((doc: any) => (
                                <button
                                  key={doc.id}
                                  onClick={() => handleOpenDoc(doc.file_path, doc.id)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[9px] font-semibold rounded border border-blue-600/20 transition-colors"
                                >
                                  {entry.isBillMapping ? 'View Document' : (entry.payment_purpose || entry.folio_purpose || entry.entry_type) === 'LOAN CLOSURE' ? 'View Docs' : 'Payment Proof'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-bold text-foreground">₹{Number(entry.amount || 0).toLocaleString('en-IN')}</p>
                          <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">₹{Number(runningBalance).toLocaleString('en-IN')}</p>
                        </div>
                      </div>

                      {entry._isPendingRequest && (
                        <div className="mt-2 pt-2 border-t border-border space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-1">
                              {(entry.utr_reference || entry.accountant_remarks || entry.sales_manager_remarks || entry.admin_remarks) && (
                                <div className="relative group shrink-0">
                                  <span className="w-4 h-4 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-bold cursor-help">i</span>
                                  <div className="absolute left-0 bottom-full mb-1 z-[9999] hidden group-hover:block bg-popover text-popover-foreground text-[10px] px-2 py-1.5 rounded-md border shadow-lg whitespace-nowrap min-w-[180px]">
                                    {entry.utr_reference && <div><b>UTR:</b> {entry.utr_reference}</div>}
                                    {entry.accountant_remarks && <div><b>Acct:</b> {entry.accountant_remarks}</div>}
                                    {entry.sales_manager_remarks && <div><b>SM:</b> {entry.sales_manager_remarks}</div>}
                                    {entry.admin_remarks && <div><b>Admin:</b> {entry.admin_remarks}</div>}
                                  </div>
                                </div>
                              )}
                              {/* UTR input removed */}
                              <input
                                value={inlineRemarks[rowKey] || ''}
                                onChange={(e) => {
                                  setInlineRemarks(prev => ({ ...prev, [rowKey]: e.target.value }));
                                  if (remarksDialogRow === rowKey) setRemarksDialogRow(null);
                                }}
                                placeholder="Remarks..."
                                className="flex-1 min-w-0 px-1.5 py-1 text-[10px] bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground"
                              />
                              {remarksDialogRow === rowKey && (
                                <div className="absolute bottom-full left-0 mb-1 z-[9999] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg px-3 py-2 whitespace-nowrap">
                                  <p className="text-[10px]">Please enter remarks first</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                if (!inlineRemarks[rowKey]?.trim()) {
                                  setRemarksDialogRow(rowKey);
                                  return;
                                }
                                if (onReject) {
                                  onReject(entry.id || idx, inlineRemarks[rowKey]);
                                  if (onClose) onClose();
                                }
                              }}
                              className={`px-3 py-2 rounded-lg bg-red-500 text-white text-[11px] font-bold hover:bg-red-600 transition-colors ${!inlineRemarks[rowKey]?.trim() ? 'opacity-50' : ''}`}
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => {
                                if (!inlineRemarks[rowKey]?.trim()) {
                                  setRemarksDialogRow(rowKey);
                                  return;
                                }
                                if (onApprove) {
                                  onApprove(entry.id || idx, {
                                    ...(userRole === 'admin' && !entry.isBillMapping ? { utr_no: inlineUtr[rowKey], admin_remarks: inlineRemarks[rowKey] } : {}),
                                    ...(userRole === 'admin' && entry.isBillMapping ? { admin_remarks: inlineRemarks[rowKey] } : {}),
                                    ...(userRole !== 'admin' && inlineRemarks[rowKey] ? { accountant_remarks: inlineRemarks[rowKey] } : {}),
                                  });
                                }
                              }}
                              className={`px-3 py-2 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-colors ${!inlineRemarks[rowKey]?.trim() ? 'opacity-50' : ''}`}
                            >
                              Approve Payment
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2 text-center py-4 text-muted-foreground text-[11px]">No ledger entries found</div>
            )}
          </div>
        </div>
      </div>

      {/* Ledger Entries Table */}
      {allEntries.length > 0 ? (
        <div className="hidden lg:block border border-black rounded-lg max-h-55 overflow-x-auto overflow-y-auto">
          <table className="w-full text-[10px] sm:text-xs border-collapse min-w-[650px]">
            <colgroup>
              <col style={{ width: "10%" }} />
              <col style={{ width: "34%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "21%" }} />
            </colgroup>
            <thead className="bg-muted border-b border-black">
              <tr>
                <th className="px-3 py-1.5 sm:px-2 lg:px-1.5 text-left text-[10px] font-bold text-foreground uppercase border-r border-black">
                  Date
                </th>
                <th className="px-3 py-1.5 sm:px-2 lg:px-1.5 text-left text-[10px] font-bold text-foreground uppercase border-r border-black">
                  Particular
                </th>
                <th className="px-3 py-1.5 sm:px-2 lg:px-1.5 text-right text-[10px] font-bold text-foreground uppercase border-r border-black">
                  DR
                </th>
                <th className="px-3 py-1.5 sm:px-2 lg:px-1.5 text-right text-[10px] font-bold text-foreground uppercase border-r border-black">
                  CR
                </th>
                <th className="px-3 py-1.5 sm:px-2 lg:px-1.5 text-right text-[10px] font-bold text-foreground uppercase border-r border-black">
                  Bal
                </th>
                <th className="px-3 py-1.5 sm:px-2 lg:px-1.5 text-left text-[10px] font-bold text-foreground uppercase">
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allEntries.map((entry: any, idx: number) => {
                const isCredit = isEntryCredit(entry);
                const crAmount = isCredit ? entry.amount : 0;
                const drAmount = !isCredit ? entry.amount : 0;

                // Calculate running balance from start
                let runningBalance = 0;
                for (let i = 0; i <= idx; i++) {
                  const e = allEntries[i];
                  const isCr = isEntryCredit(e);
                  runningBalance += isCr
                    ? parseFloat(e.amount || 0)
                    : -parseFloat(e.amount || 0);
                }

                const showDRActions = entry._isPendingRequest && (userRole === 'accountant' || userRole === 'admin');
                const showSMActions = entry._isPendingRequest && (userRole === 'sales_manager' || userRole === 'branch_manager' || userRole === 'dsa');
                const rowKey = String(entry.id || 'idx-' + idx);

                const entryPurposeStr = String(entry.payment_purpose || entry.folio_purpose || entry.purpose || entry.txn_type || '').toLowerCase();
                const targetPurposeStr = String(activePurpose || '').toLowerCase().replace(/_/g, ' ');
                const isTargetRow = Boolean(
                  (activeRequestId && entry.id && String(entry.id) === String(activeRequestId)) ||
                  (targetPurposeStr && entryPurposeStr && (entryPurposeStr === targetPurposeStr || entryPurposeStr.includes(targetPurposeStr)))
                );

                return (
                  <tr key={idx} className={`transition-colors ${isTargetRow ? 'bg-blue-100/90 dark:bg-blue-950/50 ring-2 ring-blue-600 ring-inset shadow-md font-semibold' : entry._isPendingRequest ? 'bg-amber-100 hover:bg-amber-200' : ''}`}>
                    <td className="px-3 py-1 sm:px-2 lg:px-1.5 text-foreground font-medium text-[10px] border-r border-b border-black">
                      {entry.created_at
                        ? new Date(entry.created_at).toLocaleDateString("en-IN")
                        : "-"}
                    </td>
                    <td className="px-3 py-1 sm:px-2 lg:px-1.5 text-foreground text-[10px] border-r border-b border-black">
                      <div className="flex justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-medium ${isTargetRow ? 'text-blue-950 dark:text-blue-200 font-extrabold text-[11px]' : ''}`}>
                              Purpose : {(entry.payment_purpose || entry.folio_purpose || entry.entry_type || "—").replace(/_/g, " ")}
                            </span>
                            {isTargetRow && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold bg-blue-600 text-white shadow-sm tracking-wide uppercase animate-pulse">
                                ★ ACTIVE REQUEST
                              </span>
                            )}
                            {entry.isMapped && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold bg-emerald-600 text-white shadow-sm tracking-wide uppercase">
                                ✓ MAPPED
                              </span>
                            )}
                          </div>
                          {(entry.payment_purpose || entry.folio_purpose || entry.entry_type) === 'LOAN CLOSURE' && (entry.rc_lender_name || entry.bank_nbfc || (lenderName && lenderName !== '-' && lenderName !== 'N/A')) && <div className="text-foreground/80 leading-tight mt-0.5"><span className="font-medium">Existing Financer:</span> {entry.rc_lender_name || entry.bank_nbfc || lenderName}</div>}
                          {!entry._isPendingRequest && idx === 0 && (
                            <div className="leading-tight mt-0.5">
                              {customerName && customerName !== 'N/A' && <span><span className="font-bold">Customer:</span> {customerName}{!entry.upi_link && loanAccountNumber && loanAccountNumber !== '-' ? ' | ' : ''}</span>}
                              {!entry.upi_link && loanAccountNumber && loanAccountNumber !== '-' && <span><span className="font-bold">Loan A/c:</span> {loanAccountNumber}</span>}
                              {lenderName && lenderName !== '-' && lenderName !== 'N/A' && <div><span className="font-bold">Lender:</span> {lenderName}</div>}
                            </div>
                          )}
                          {!entry.isBillMapping && !(!entry._isPendingRequest && idx === 0 && folioId) && !entry.upi_link && (entry.payment_account_number || entry.ifsc_code || entry.account_bank_name || entry.account_holder_name) && (
                            <div className="leading-tight mt-0.5 space-y-0.5">
                              <div>
                                {entry.payment_account_number && <span><span className="font-bold">A/C No:</span> {entry.payment_account_number}{entry.ifsc_code ? ' | ' : ''}</span>}
                                {entry.ifsc_code && <span><span className="font-bold">IFSC:</span> {entry.ifsc_code}</span>}
                              </div>
                              <div>
                                {entry.account_bank_name && <span><span className="font-bold">Bank:</span> {entry.account_bank_name}{entry.account_holder_name ? ' | ' : ''}</span>}
                                {entry.account_holder_name && <span><span className="font-bold">A/C Holder:</span> {entry.account_holder_name}</span>}
                              </div>
                            </div>
                          )}
                          {entry.isBillMapping && (
                            <div className="text-muted-foreground leading-tight mt-0.5 space-y-0.5">
                              {entry.customer_name && <div className="text-foreground/80"><span className="font-medium">Customer:</span> {entry.customer_name}</div>}
                              {entry.bank_nbfc && entry.bank_nbfc !== 'N/A' && <div><span className="font-medium">Lender:</span> {entry.bank_nbfc}</div>}
                            </div>
                          )}
                          {!entry.isBillMapping && !(!entry._isPendingRequest && idx === 0 && folioId) && !entry.upi_link && (!entry.documents?.length || (entry._isPendingRequest && idx === 0 && folioId)) && !(entry.payment_account_number || entry.ifsc_code || entry.account_bank_name || entry.account_holder_name) && <div className="text-muted-foreground">-</div>}
                          {entry.upi_link && (
                            <div className="mt-0.5 flex items-center gap-1 flex-wrap">
                              <span className="font-bold text-foreground">Pay by Self:</span>
                              <button onClick={() => { navigator.clipboard.writeText(entry.upi_link); }} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[8px] font-semibold rounded border border-blue-600/20 transition-colors">
                                Copy UPI Link
                              </button>
                            </div>
                          )}
                        </div>
                        {entry.documents?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5 items-center">
                            {entry.documents?.filter((d: any) => d.field_name === 'qr_upload').map((doc: any) => (
                              <button
                                key={doc.id}
                                onClick={() => handleOpenDoc(doc.file_path, doc.id)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[9px] font-semibold rounded border border-blue-600/20 transition-colors"
                              >
                                Uploaded QR
                              </button>
                            ))}
                            {entry.documents?.filter((d: any) => d.field_name !== 'qr_upload').map((doc: any) => (
                              <button
                                key={doc.id}
                                onClick={() => handleOpenDoc(doc.file_path, doc.id)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[9px] font-semibold rounded border border-blue-600/20 transition-colors"
                              >
                                {entry.isBillMapping ? 'View Document' : (entry.payment_purpose || entry.folio_purpose || entry.entry_type) === 'LOAN CLOSURE' ? 'View Docs' : 'Payment Proof'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-1 sm:px-2 lg:px-1.5 text-right font-semibold text-red-600 dark:text-red-400 text-[10px] border-r border-b border-black">
                      {showDRActions ? (
                        <div className="flex flex-col items-end gap-1">
                          <span>{drAmount > 0 ? `₹${Number(drAmount).toLocaleString("en-IN")}` : "-"}</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                const isAccountantRole = userRole === 'accountant' || (userRole || '').toLowerCase().includes('account');
                                if (isAccountantRole && !inlineRemarks[rowKey]?.trim()) {
                                  setRemarksDialogRow(rowKey);
                                  return;
                                }
                                if (onApprove) {
                                  onApprove(entry.id || idx, {
                                    ...(userRole === 'admin' && !entry.isBillMapping ? { utr_no: inlineUtr[rowKey], admin_remarks: inlineRemarks[rowKey] } : {}),
                                    ...(userRole === 'admin' && entry.isBillMapping ? { admin_remarks: inlineRemarks[rowKey] } : {}),
                                    ...(userRole !== 'admin' && inlineRemarks[rowKey] ? { accountant_remarks: inlineRemarks[rowKey] } : {}),
                                  });
                                }
                              }}
                              className="px-1.5 py-0.5 bg-green-600 text-white text-[10px] font-bold rounded hover:bg-green-700 cursor-pointer"
                              title={(userRole === 'accountant' || (userRole || '').toLowerCase().includes('account')) && !inlineRemarks[rowKey]?.trim() ? "Enter remarks first" : "Approve"}
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                if (!inlineRemarks[rowKey]?.trim()) {
                                  setRemarksDialogRow(rowKey);
                                  return;
                                }
                                if (onReject) {
                                  onReject(entry.id || idx, inlineRemarks[rowKey]);
                                  if (onClose) onClose();
                                }
                              }}
                              className={`px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 ${!inlineRemarks[rowKey]?.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title={!inlineRemarks[rowKey]?.trim() ? "Enter remarks first" : "Reject"}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (drAmount > 0 ? `₹${Number(drAmount).toLocaleString("en-IN")}` : "-")}
                    </td>
                    <td className="px-3 py-1 sm:px-2 lg:px-1.5 text-right font-semibold text-green-600 dark:text-green-400 text-[10px] border-r border-b border-black">
                      {crAmount > 0
                        ? `₹${Number(crAmount).toLocaleString("en-IN")}`
                        : "-"}
                    </td>
                    <td className="px-3 py-1 sm:px-2 lg:px-1.5 text-right font-semibold text-blue-600 dark:text-blue-400 text-[10px] border-r border-b border-black">
                      ₹{Number(runningBalance).toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-1 sm:px-2 lg:px-1.5 text-foreground text-[10px] break-words border-b border-black relative">
                      {showSMActions ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <input
                              value={inlineRemarks[rowKey] || ''}
                              onChange={(e) => {
                                setInlineRemarks(prev => ({ ...prev, [rowKey]: e.target.value }));
                                if (remarksDialogRow === rowKey) setRemarksDialogRow(null);
                              }}
                              placeholder="Remarks..."
                              className="flex-1 min-w-0 px-1.5 py-1 text-[10px] bg-background border border-black rounded-md focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-black"
                            />
                            {remarksDialogRow === rowKey && (
                              <div className="absolute bottom-full left-0 mb-1 z-[9999] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg px-3 py-2 whitespace-nowrap">
                                <p className="text-[10px]">Please enter remarks first</p>
                              </div>
                            )}
                            <button
                              onClick={() => {
                                if (onApprove) {
                                  onApprove(entry.id || idx, { sales_manager_remarks: inlineRemarks[rowKey] || '' });
                                }
                              }}
                              className="px-1.5 py-0.5 bg-green-600 text-white text-[10px] font-bold rounded hover:bg-green-700 shrink-0 cursor-pointer"
                              title="Approve"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                if (!inlineRemarks[rowKey]?.trim()) {
                                  setRemarksDialogRow(rowKey);
                                  return;
                                }
                                if (onReject) {
                                  onReject(entry.id || idx, inlineRemarks[rowKey] || '');
                                  if (onClose) onClose();
                                }
                              }}
                              className={`px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 shrink-0 ${!inlineRemarks[rowKey]?.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title={!inlineRemarks[rowKey]?.trim() ? "Enter remarks first" : "Reject"}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : showDRActions ? (
                        <div className="flex flex-col gap-1">
                          {/* UTR input removed */}
                          <div className="flex items-center gap-1 relative">
                            <input
                              value={inlineRemarks[rowKey] || ''}
                              onChange={(e) => {
                                setInlineRemarks(prev => ({ ...prev, [rowKey]: e.target.value }));
                                if (remarksDialogRow === rowKey) setRemarksDialogRow(null);
                              }}
                              required
                              placeholder="Remarks..."
                              className="flex-1 min-w-0 px-1.5 py-1 text-[10px] bg-background border border-black rounded-md focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-black"
                            />
                            {remarksDialogRow === rowKey && (
                              <div className="absolute bottom-full left-0 mb-1 z-[9999] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg px-3 py-2 whitespace-nowrap">
                                <p className="text-[10px]">Please enter remarks first</p>
                              </div>
                            )}
                            {(entry.accountant_remarks || entry.sm_remarks || entry.sales_manager_remarks) && (
                              <div className="relative group shrink-0">
                                <button
                                  className="w-5 h-5 flex items-center justify-center bg-white hover:bg-primary/20 text-primary text-[10px] font-bold rounded-full border border-primary/30 transition-colors"
                                  title="View remarks"
                                >
                                  i
                                </button>
                                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 z-[9999] bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded-md border shadow-md shadow-black dark:shadow-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  {entry.accountant_remarks && <span><b>Accountant remarks:</b> {entry.accountant_remarks}<br /></span>}
                                  {entry.sm_remarks && <span><b>BM/DSA remarks:</b> {entry.sm_remarks}<br /></span>}
                                  {entry.sales_manager_remarks && <span><b>SM remarks:</b> {entry.sales_manager_remarks}<br /></span>}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-0.5 leading-tight">
                          {/* Reason / Remarks text */}
                          {(entry.accountant_remarks || entry.admin_remarks || entry.description) && (
                            <div className="font-semibold text-foreground">
                              {entry.accountant_remarks || entry.admin_remarks || entry.description}
                            </div>
                          )}

                          {/* UTR / Transaction Reference */}
                          {entry.utr_reference && (
                            <div className="text-[9px] text-muted-foreground">
                              <span className="font-medium">UTR/Txn:</span> {entry.utr_reference}
                            </div>
                          )}

                          {/* Accountant Approval */}
                          {(entry.accountant_remarks || (entry.created_by_role === 'accountant' && entry.created_by_name)) && (
                            <div className="text-[9px] text-emerald-700 dark:text-emerald-400 font-medium">
                              <span className="font-bold">Acct Approved:</span> {entry.created_by_name || 'Accountant'} {entry.accountant_remarks ? `(${entry.accountant_remarks})` : ''}
                            </div>
                          )}

                          {/* Admin Approval */}
                          {(entry.admin_remarks || (entry.created_by_role === 'admin' && entry.created_by_name)) && (
                            <div className="text-[9px] text-blue-700 dark:text-blue-400 font-medium">
                              <span className="font-bold">Admin Approved:</span> {entry.created_by_name || 'Admin'} {entry.admin_remarks ? `(${entry.admin_remarks})` : ''}
                            </div>
                          )}

                          {/* Fallback User Info */}
                          {!entry.accountant_remarks && !entry.admin_remarks && entry.created_by_name && entry.created_by_role !== 'accountant' && entry.created_by_role !== 'admin' && (
                            <div className="text-[9px] text-muted-foreground">
                              <span className="font-medium">Entered by:</span> {entry.created_by_name} ({entry.created_by_role})
                            </div>
                          )}

                          {!entry.utr_reference && !entry.admin_remarks && !entry.accountant_remarks && !entry.description && !entry.created_by_name && '-'}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-muted font-semibold border-t-2 border-black">
                <td
                  colSpan={2}
                  className="px-3 py-1 sm:px-2 lg:px-1.5 text-foreground text-[10px] border-r border-black"
                >
                  TOTAL
                </td>
                <td className="px-3 py-1 sm:px-2 lg:px-1.5 text-right font-semibold text-red-600 dark:text-red-400 text-[10px] border-r border-black">
                  {totalDebits > 0
                    ? `₹${Number(totalDebits).toLocaleString("en-IN")}`
                    : "-"}
                </td>
                <td className="px-3 py-1 sm:px-2 lg:px-1.5 text-right font-semibold text-green-600 dark:text-green-400 text-[10px] border-r border-black">
                  {totalCredits > 0
                    ? `₹${Number(totalCredits).toLocaleString("en-IN")}`
                    : "-"}
                </td>
                <td className="px-3 py-1 sm:px-2 lg:px-1.5 text-right font-semibold text-blue-600 dark:text-blue-400 text-[10px] border-r border-black">
                  ₹{Number(balance).toLocaleString("en-IN")}
                </td>
                <td className="px-3 py-1 sm:px-2 lg:px-1.5 text-foreground text-[10px]">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground ">
          <TrendingDown className="mx-auto mb-2 opacity-30" size={24} />
          <p className="font-medium text-xs">No ledger entries found</p>
          <p className="text-xs">Transactions will appear here</p>
        </div>
      )}

    </div>
  );
}
