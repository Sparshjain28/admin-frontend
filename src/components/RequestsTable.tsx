import { useMemo } from 'react';
import { Eye, XCircle } from 'lucide-react';

const getStatusBadge = (status: string, txnType?: string, purpose?: string) => {
  const isBillMapping = txnType === 'BILL_MAPPING_REQUEST' || purpose === 'REQUEST RAISED FOR BILL MAPPING';
  if (isBillMapping) {
    switch (status) {
      case 'pending':
      case 'sales_manager_approval':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">Bill Map Pending (Accountant)</span>;
      case 'accountant_approval':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">Bill Map Pending (Admin)</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">Bill Map Completed</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">Bill Map Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">{status}</span>;
    }
  }
  switch (status) {
    case 'bm_dsa_pending':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">BM/DSA Pending</span>;
    case 'pending':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"> SM Pending</span>;
    case 'sales_manager_approval':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300"> Accountant Pending</span>;
    case 'accountant_approval':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300"> Accountant Pending</span>;
    case 'admin_approval':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300"> Admin Pending</span>;
    case 'completed':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">Completed ✓</span>;
    case 'rejected':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">Rejected</span>;
    default:
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300">{status}</span>;
  }
};

interface RequestsTableProps {
  requests: any[];
  showActions?: boolean;
  onViewLedger?: (req: any) => void;
  onReject?: (req: any) => void;
  onOpenViewer?: (url: string, id: number) => void;
}

const getStatusLabel = (status: string, txnType?: string, purpose?: string) => {
  const isBillMapping = txnType === 'BILL_MAPPING_REQUEST' || purpose === 'REQUEST RAISED FOR BILL MAPPING';
  if (isBillMapping) return 'Bill Mapping';
  switch (status) {
    case 'bm_dsa_pending': return 'BM/DSA Pending';
    case 'pending': return 'SM Pending';
    case 'sales_manager_approval': return 'Accountant Pending';
    case 'accountant_approval': return 'Accountant Pending';
    case 'admin_approval': return 'Admin Pending';
    case 'completed': return 'Completed';
    case 'rejected': return 'Rejected';
    default: return status || '-';
  }
};

export default function RequestsTable({ requests, showActions, onViewLedger, onReject, onOpenViewer }: RequestsTableProps) {
  const handleOpenDoc = (filePath: string, docId: number) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const url = filePath.startsWith('http') ? filePath : `${baseUrl}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
    if (onOpenViewer) {
      onOpenViewer(url, docId);
    } else {
      window.open(url, '_blank');
    }
  };

  const getRowBg = (status: string) => {
    switch (status) {
      case 'pending':
      case 'bm_dsa_pending':
        return 'bg-yellow-100/60 dark:bg-yellow-900/15';
      case 'sales_manager_approval':
        return 'bg-orange-100/60 dark:bg-orange-900/15';
      case 'accountant_approval':
        return 'bg-blue-100/60 dark:bg-blue-900/15';
      case 'admin_approval':
        return 'bg-indigo-100/60 dark:bg-indigo-900/15';
      case 'completed':
        return 'bg-green-100/60 dark:bg-green-900/15';
      case 'rejected':
        return 'bg-red-100/60 dark:bg-red-900/15';
      default:
        return '';
    }
  };

  const uniqueRequests = useMemo(() => {
    if (!Array.isArray(requests)) return [];
    return requests.filter((req: any, idx: number, self: any[]) => {
      if (req.id && self.findIndex((r: any) => r.id === req.id) !== idx) return false;
      return true;
    });
  }, [requests]);

  return (
    <div className="w-full">
      {/* Mobile: Cards */}
      <div className="grid grid-cols-1 gap-2  sm:px-0 lg:hidden">
        {uniqueRequests.map((req: any) => {
          const rowBg = getRowBg(req.status);
          return (
            <div key={req.id || req.request_id} className={`bg-card rounded-xl border border-border shadow-sm p-3 ${rowBg}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] text-foreground truncate">
                  {req.created_at || req.payment_date ? new Date(req.created_at || req.payment_date).toLocaleDateString('en-IN') : '-'} | Requestid :- {req.request_id || '-'}
                </span>
                {getStatusBadge(req.status, req.txn_type, req.purpose)}
              </div>
              <div className="mt-1 flex justify-between">
                <span className="min-w-0">
                  <p className="text-[13px] font-bold text-foreground truncate">Customer name:- {req.customer_name || '-'}</p>
                  <p className="text-[12px] font-bold text-foreground truncate">Initiater:- {req.created_by_name || req.initiater_name || req.user_name || '-'}</p>
                </span>
                <span className="flex flex-col mr-2 shrink-0">
                  <span className="text-lg font-bold text-foreground">₹{Number(req.payout_amount || req.amount || 0).toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-foreground font-semibold text-right truncate max-w-[140px]">
                    {req.purpose || req.remarks || '-'}
                    {req.remarks && req.remarks !== req.purpose && (
                      <span className="block text-[9px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                        Remark/Pass: {req.remarks}
                      </span>
                    )}
                    {req.purpose === 'LOAN CLOSURE' && (req.rc_lender_name || req.bank_nbfc) && <span className="text-muted-foreground font-normal"> ({req.rc_lender_name || req.bank_nbfc})</span>}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                {((req.txn_type === 'BILL_MAPPING_REQUEST' || req.purpose === 'REQUEST RAISED FOR BILL MAPPING') ? req.loan_account_number : req.account_number) && (
                  <span className="text-[10px] font-semibold text-foreground truncate">A/c:- {(req.txn_type === 'BILL_MAPPING_REQUEST' || req.purpose === 'REQUEST RAISED FOR BILL MAPPING') ? (req.loan_account_number || '-') : (req.account_number || '-')}</span>
                )}
                {req.ifsc_code && <span className="text-[10px] font-semibold text-foreground truncate">IFSC:- {req.ifsc_code}</span>}
                {req.upi_link && <button onClick={() => navigator.clipboard.writeText(req.upi_link)} className="px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[8px] font-semibold rounded border border-blue-600/20">Copy UPI</button>}
                {req.documents?.filter((d: any) => d.field_name === 'qr_upload').map((doc: any) => (
                  <button key={doc.id} onClick={() => handleOpenDoc(doc.file_path, doc.id)} className="px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[8px] font-semibold rounded border border-blue-600/20">QR Upload</button>
                ))}
                {req.documents?.filter((d: any) => d.field_name !== 'qr_upload').map((doc: any) => (
                  <button key={doc.id} onClick={() => handleOpenDoc(doc.file_path, doc.id)} className="px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[8px] font-semibold rounded border border-blue-600/20">
                    {(req.txn_type === 'BILL_MAPPING_REQUEST' || req.purpose === 'REQUEST RAISED FOR BILL MAPPING') ? 'View Document' : req.purpose === 'LOAN CLOSURE' ? 'View Docs' : 'Payment Proof'}
                  </button>
                ))}
                {showActions && (
                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    {onViewLedger && (
                      <button onClick={() => onViewLedger(req)} className="px-2 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 rounded transition-colors text-[10px] font-semibold"><Eye size={12} className="inline mr-1" />Ledger</button>
                    )}
                    {onReject && (
                      <button onClick={() => onReject(req)} className="p-1 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 rounded transition-colors" title="Reject Request"><XCircle size={14} /></button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Table */}
      <div className="hidden lg:block overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full px-4 sm:px-0">
          <table className="w-full text-[10px] border-collapse border border-black/30">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[80px] border border-black/30">Date</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[90px] border border-black/30">Initiater Name</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[80px] border border-black/30">Request ID</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[90px] border border-black/30">Customer Name</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[100px] border border-black/30">A/c Number</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[80px] border border-black/30">IFSC</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[100px] border border-black/30">Purpose</th>
                <th className="px-3 py-2 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[80px] border border-black/30">Amount</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[130px] border border-black/30">Status</th>
                {showActions && <th className="px-3 py-2 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[120px] border border-black/30">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {uniqueRequests.map((req: any) => {
                const rowBg = getRowBg(req.status);
                return (
                  <tr key={req.id || req.request_id} className={`${rowBg} hover:bg-muted/50 transition-colors`}>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap border border-black/30">
                      {req.created_at || req.payment_date ? new Date(req.created_at || req.payment_date).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap border border-black/30">{req.created_by_name || req.initiater_name || req.user_name || '-'}</td>
                    <td className="px-3 py-2 font-mono text-foreground whitespace-nowrap border border-black/30">{req.request_id || '-'}</td>
                    <td className="px-3 py-2 text-foreground whitespace-nowrap border border-black/30">{req.customer_name || '-'}</td>
                    {(req.upi_link || req.documents?.length > 0) ? (
                      <td colSpan={2} className="px-3 py-2 whitespace-nowrap border border-black/30">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-foreground">{(req.txn_type === 'BILL_MAPPING_REQUEST' || req.purpose === 'REQUEST RAISED FOR BILL MAPPING') ? (req.loan_account_number || '-') : (req.account_number || '-')}</span>
                          {req.ifsc_code && <span className="font-mono text-muted-foreground">{req.ifsc_code}</span>}
                          {req.upi_link && (
                            <button onClick={() => { navigator.clipboard.writeText(req.upi_link); }} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[9px] font-semibold rounded border border-blue-600/20 transition-colors whitespace-nowrap">
                              Copy UPI Link
                            </button>
                          )}
                          {req.documents?.filter((d: any) => d.field_name === 'qr_upload').map((doc: any) => (
                            <button key={doc.id} onClick={() => handleOpenDoc(doc.file_path, doc.id)} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[9px] font-semibold rounded border border-blue-600/20 transition-colors">
                              Uploaded QR
                            </button>
                          ))}
                          {req.documents?.filter((d: any) => d.field_name !== 'qr_upload').map((doc: any) => (
                            <button key={doc.id} onClick={() => handleOpenDoc(doc.file_path, doc.id)} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[9px] font-semibold rounded border border-blue-600/20 transition-colors">
                              {(req.txn_type === 'BILL_MAPPING_REQUEST' || req.purpose === 'REQUEST RAISED FOR BILL MAPPING') ? 'View Document' : req.purpose === 'LOAN CLOSURE' ? 'View Docs' : 'Payment Proof'}
                            </button>
                          ))}
                        </div>
                      </td>
                    ) : (
                      <td className="px-3 py-2 font-mono text-foreground whitespace-nowrap border border-black/30">{(req.txn_type === 'BILL_MAPPING_REQUEST' || req.purpose === 'REQUEST RAISED FOR BILL MAPPING') ? (req.loan_account_number || '-') : (req.account_number || '-')}</td>
                    )}
                    {!req.upi_link && !req.documents?.length && <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap border border-black/30">{req.ifsc_code || '-'}</td>}
                    <td className="px-3 py-2 text-foreground border border-black/30 max-w-[200px]">
                      <div className="truncate font-semibold" title={req.purpose || req.remarks || '-'}>{req.purpose || req.remarks || '-'}</div>
                      {req.remarks && req.remarks !== req.purpose && (
                        <div className="text-[9px] text-blue-600 dark:text-blue-400 font-bold mt-0.5" title={req.remarks}>
                          Remark/Pass: {req.remarks}
                        </div>
                      )}
                      {req.purpose === 'LOAN CLOSURE' && (req.rc_lender_name || req.bank_nbfc) && <div className="text-[9px] text-muted-foreground mt-0.5">Existing Financer: {req.rc_lender_name || req.bank_nbfc}</div>}
                    </td>
                    <td className="px-3 py-2 font-bold text-right text-foreground whitespace-nowrap border border-black/30">₹{Number(req.payout_amount || req.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 whitespace-nowrap border border-black/30">
                      <div className="flex items-center gap-1">
                        {getStatusBadge(req.status, req.txn_type, req.purpose)}
                        {(req.accountant_remarks || req.sm_remarks || req.sales_manager_remarks || req.admin_remarks || req.remarks) && (
                          <div className="relative group shrink-0">
                            <button className="w-5 h-5 flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold rounded-full border border-primary/30 transition-colors">i</button>
                            <div className="absolute right-full top-3 -translate-y-1/2 mr-2 z-[9999] bg-popover text-popover-foreground text-[10px] px-2 py-1.5 rounded-md border shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              {req.accountant_remarks && <div><b>Accountant remarks:</b> {req.accountant_remarks}</div>}
                              {req.sm_remarks && <div><b>BM/DSA remarks:</b> {req.sm_remarks}</div>}
                              {req.sales_manager_remarks && <div><b>SM remarks:</b> {req.sales_manager_remarks}</div>}
                              {req.admin_remarks && <div><b>Admin remarks:</b> {req.admin_remarks}</div>}
                              {req.remarks && <div><b>Remarks:</b> {req.remarks}</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    {showActions && (
                      <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap border border-black/30">
                        {onViewLedger && (
                          <button onClick={() => onViewLedger(req)} className="px-2 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 rounded transition-colors text-[10px] font-semibold whitespace-nowrap">
                            <Eye size={12} className="inline mr-1" />
                            Ledger
                          </button>
                        )}
                        {onReject && (
                          <button onClick={() => onReject(req)} className="p-1 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 rounded transition-colors" title="Reject Request">
                            <XCircle size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
