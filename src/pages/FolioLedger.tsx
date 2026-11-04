import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import LoanPayments from '@/components/LoanPayments';
import { Car, Hash, User, FileText } from 'lucide-react';

export default function FolioLedger() {
  const [searchParams] = useSearchParams();
  const loanId = searchParams.get('loan_id');
  const navigate = useNavigate();

  const { data: caseDetails, isLoading: caseLoading } = useQuery({
    queryKey: ['payment-case-details', loanId],
    queryFn: async () => {
      if (!loanId) return null;
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/payments/case-details/${loanId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) return null;
      return await res.json();
    },
    enabled: !!loanId,
  });

  const { data: loan, isLoading: loanLoading } = useQuery({
    queryKey: ['loan', loanId],
    queryFn: async () => {
      if (!loanId) return null;
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${loanId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) return null;
      return await res.json();
    },
    enabled: !!loanId,
  });

  const { data: payments } = useQuery({
    queryKey: ['loan-payments', loanId],
    queryFn: async () => {
      if (!loanId) return [];
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/payments?loanId=${loanId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!loanId,
  });

  if (caseLoading || loanLoading) {
    return <div className="py-20 text-center text-muted-foreground">Loading...</div>;
  }

  if (!loan) {
    return <div className="py-20 text-center text-muted-foreground">Loan not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          Folio Ledger – {loan.loan_number ? `App ID: ${loan.loan_number}` : `Loan #${loan.id}`}
        </h1>
        <button onClick={() => navigate(-1)} className="px-3 py-1.5 bg-muted rounded-lg text-foreground hover:bg-muted/80 transition">
          Back
        </button>
      </div>

      {/* Loan Summary Card */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-foreground font-bold">
          <User size={18} className="text-primary" />
          <h3>Loan Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground font-medium text-xs uppercase mb-1">Loan Application ID</p>
            <p className="font-semibold text-foreground">{loan.loan_number || loan.id}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium text-xs uppercase mb-1">Customer Name</p>
            <p className="font-semibold text-foreground">{loan.customer_name || loan.applicant_name || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium text-xs uppercase mb-1">Sanctioned Amount</p>
            <p className="font-semibold text-foreground">₹{Number(loan.loan_amount || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Vehicle Details */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-foreground font-bold">
          <Car size={18} className="text-primary" />
          <h3>Vehicle Information</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground font-medium text-xs uppercase mb-1">Make & Model</p>
            <p className="font-semibold text-foreground">{loan.maker_name || '-'} {loan.maker_model || ''}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium text-xs uppercase mb-1">Registration</p>
            <p className="font-mono font-semibold text-foreground">{loan.vehicle_number || '-'}</p>
          </div>
        </div>
      </div>

      {/* Applicant Information */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-foreground font-bold">
            <User size={18} className="text-primary" />
            <h3>Applicant Information</h3>
          </div>
          {caseDetails && (
            <span
              className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded border ${
                caseDetails.pdd_status === 'COMPLETED'
                  ? 'bg-green-500/10 text-green-600 border-green-500/20'
                  : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
              }`}
            >
              PDD: {caseDetails.pdd_status || 'PENDING'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground font-medium text-xs uppercase mb-1">Customer Name</p>
            <p className="font-semibold text-foreground">{loan.customer_name || loan.applicant_name || '-'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium text-xs uppercase mb-1">Bank / NBFC</p>
            <p className="font-semibold text-foreground">{loan.bank_nbfc || '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Small Ledger */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm max-h-96 overflow-y-auto">
        <h2 className="text-lg font-semibold text-foreground mb-3">Ledger</h2>
        <LoanPayments loanId={loan.id} loanAmount={loan.loan_amount} />
        {(!payments || payments.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm font-medium">No ledger entries yet</p>
            <p className="text-xs mt-2">Payment entries will appear here once approved</p>
          </div>
        )}
      </div>
    </div>
  );
}
