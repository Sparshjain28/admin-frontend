import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function BankAccounts() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ account_number: '', bank_name: '', balance: '' });

  const { data: accounts, refetch } = useQuery({
    queryKey: ['bank-accounts', user?.id],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/bank-accounts`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!user,
  });

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/bank-accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        toast.success('Bank account added');
        setShowForm(false);
        setFormData({ account_number: '', bank_name: '', balance: '' });
        refetch();
      }
    } catch (error) {
      toast.error('Failed to add bank account');
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!confirm('Are you sure?')) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/bank-accounts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (response.ok) {
        toast.success('Bank account deleted');
        refetch();
      }
    } catch (error) {
      toast.error('Failed to delete bank account');
    }
  };

  const totalBalance = accounts?.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0) || 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-foreground">Bank Accounts</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary hover:opacity-90 text-primary-foreground font-bold px-4 py-2 rounded-lg transition-opacity shadow-sm"
          >
            <Plus size={18} />
            Add Account
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border mb-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Add Bank Account</h2>
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    Balance (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 bg-muted text-foreground text-sm font-bold rounded-xl hover:bg-muted/80 transition-colors border border-border"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:opacity-90 transition-opacity shadow-sm">
                  Save Account
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border flex flex-col justify-between">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Total Accounts</p>
            <p className="text-2xl font-bold text-foreground">{accounts?.length || 0}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border flex flex-col justify-between">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Total Balance</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{(totalBalance / 100000).toFixed(2)}L</p>
          </div>
        </div>

        {/* Accounts Table */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-xs text-muted-foreground uppercase tracking-wider">Bank Name</th>
                  <th className="px-6 py-4 text-left font-bold text-xs text-muted-foreground uppercase tracking-wider">Account Number</th>
                  <th className="px-6 py-4 text-left font-bold text-xs text-muted-foreground uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-4 text-left font-bold text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left font-bold text-xs text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts?.map((account: any) => (
                  <tr key={account.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-foreground">{account.bank_name}</td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">****{account.account_number?.slice(-4)}</td>
                    <td className="px-6 py-4 font-bold text-foreground">₹{(account.balance / 100000).toFixed(2)}L</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 flex gap-3">
                      <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors" title="Export">
                        <Upload size={16} />
                      </button>
                      <button className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 transition-colors" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteAccount(account.id)} className="text-red-600 hover:text-red-700 dark:text-red-400 transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
