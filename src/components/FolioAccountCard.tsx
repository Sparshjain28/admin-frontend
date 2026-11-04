import { useState } from 'react';
import { Landmark, Pencil } from 'lucide-react';
import FolioLedger from '@/components/FolioLedger';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface FolioAccountCardProps {
  folio: any;
  extraEntries?: any[];
  customerName?: string;
  loanAccountNumber?: string;
  onOpenViewer?: (url: string, id: number) => void;
}

export default function FolioAccountCard({ folio, extraEntries = [], customerName, loanAccountNumber, onOpenViewer }: FolioAccountCardProps) {
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({
    lender_name: folio?.lender_name || '',
    bill_number: folio?.bill_number || '',
    purpose: folio?.purpose || '',
    amount: folio?.folio_amount || folio?.amount || '',
    customer_name: folio?.customer_name || folio?.mapped_customer_name || '',
    loan_account_number: folio?.loan_account_number || '',
    opening_balance: folio?.opening_balance || '',
    current_balance: folio?.current_balance || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!folio?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/folio-accounts/${folio.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          lender_name: editData.lender_name,
          bill_number: editData.bill_number,
          purpose: editData.purpose,
          amount: editData.amount ? Number(editData.amount) : undefined,
          customer_name: editData.customer_name,
          loan_account_number: editData.loan_account_number,
          opening_balance: editData.opening_balance ? Number(editData.opening_balance) : undefined,
          current_balance: editData.current_balance ? Number(editData.current_balance) : undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
      queryClient.invalidateQueries({ queryKey: ['folio-accounts'] });
      toast.success('Folio account updated');
      setShowEdit(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update folio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-lg ">


      {/* Folio Ledger */}
      {folio?.id && (
        <div className="">
          <FolioLedger
            folioId={folio.id?.toString()}
            extraEntries={extraEntries}
            folioAmount={folio.folio_amount || folio.amount}
            customerName={customerName || folio.mapped_customer_name || folio.customer_name || 'N/A'}
            loanAccountNumber={loanAccountNumber || folio.loan_account_number || '-'}
            hideReceivePayment={true}
            onOpenViewer={onOpenViewer}
          />
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-foreground mb-4">Edit Folio Account</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Bill Number</label>
                <input type="text" value={editData.bill_number} onChange={(e) => setEditData({ ...editData, bill_number: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Lender Name</label>
                <input type="text" value={editData.lender_name} onChange={(e) => setEditData({ ...editData, lender_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Customer Name</label>
                <input type="text" value={editData.customer_name} onChange={(e) => setEditData({ ...editData, customer_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Loan Account Number</label>
                <input type="text" value={editData.loan_account_number} onChange={(e) => setEditData({ ...editData, loan_account_number: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Purpose</label>
                <input type="text" value={editData.purpose} onChange={(e) => setEditData({ ...editData, purpose: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label>
                <input type="number" value={editData.amount} onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Opening Balance</label>
                <input type="number" value={editData.opening_balance} onChange={(e) => setEditData({ ...editData, opening_balance: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Current Balance</label>
                <input type="number" value={editData.current_balance} onChange={(e) => setEditData({ ...editData, current_balance: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowEdit(false)}
                className="px-4 py-2 bg-muted text-foreground text-sm font-semibold rounded-lg hover:bg-muted/80 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
