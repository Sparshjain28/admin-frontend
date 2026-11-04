import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function RCLimitPage() {
  const { user } = useAuth();
  const [view, setView] = useState<'dsa' | 'accountant' | 'admin'>(
    user?.role === 'dsa' ? 'dsa' : user?.role === 'ops_team' ? 'accountant' : 'admin'
  );

  return (
    <div className="p-4 lg:p-8 flex-1 overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-foreground"><Wallet size={24} className="text-primary" /> RC Limit Module</h1>
      
      <div className="flex gap-3 mb-6 bg-card p-2 rounded-xl border border-border w-max">
        {['dsa', 'accountant', 'admin'].map(v => (
          <button
            key={v}
            onClick={() => setView(v as any)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${view === v ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted text-muted-foreground'}`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)} View
          </button>
        ))}
      </div>

      <div className="max-w-6xl">
        {view === 'dsa' && <DSAView />}
        {view === 'accountant' && <AccountantView />}
        {view === 'admin' && <AdminView />}
      </div>
    </div>
  );
}

function DSAView() {
  const { data: folios = [] } = useQuery({
    queryKey: ['rc-folios'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rc-limits/folios`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.ok ? await response.json() : [];
    },
  });

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30">
        <h2 className="text-lg font-bold text-foreground">My Folio Accounts</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left py-3 px-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Loan ID</th>
              <th className="text-left py-3 px-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Opening Balance</th>
              <th className="text-left py-3 px-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Current Balance</th>
              <th className="text-left py-3 px-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {folios.map((folio: any) => (
              <tr key={folio.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 font-semibold text-foreground">#{folio.loan_id}</td>
                <td className="py-3 px-4 font-medium text-foreground">₹{Number(folio.opening_balance).toLocaleString()}</td>
                <td className="py-3 px-4 font-bold text-foreground">₹{Number(folio.current_balance).toLocaleString()}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                    folio.status === 'active' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-muted text-muted-foreground border-border'
                  }`}>
                    {folio.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccountantView() {
  const [showImport, setShowImport] = useState(false);
  const queryClient = useQueryClient();

  const { data: entries = [] } = useQuery({
    queryKey: ['rc-entries'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rc-limits/entries`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.ok ? await response.json() : [];
    },
  });

  const importStatement = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rc-limits/import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: formData
      });
      if (!response.ok) throw new Error('Failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rc-entries'] });
      toast.success('Statement imported');
      setShowImport(false);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity">
          <Upload size={16} /> Import Bank Statement
        </button>
      </div>

      {showImport && (
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm max-w-md">
          <h3 className="font-bold text-foreground mb-4">Upload Bank Statement</h3>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => e.target.files?.[0] && importStatement.mutate(e.target.files[0])}
            className="w-full px-4 py-2 border border-border rounded-xl bg-background text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
          />
        </div>
      )}

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold text-foreground">Ledger Entries</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-left py-3 px-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="text-left py-3 px-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">UTR</th>
                <th className="text-left py-3 px-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry: any) => (
                <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground">{new Date(entry.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-foreground">{entry.entry_type}</td>
                  <td className="py-3 px-4 font-bold text-foreground">₹{Number(entry.amount).toLocaleString()}</td>
                  <td className="py-3 px-4 font-mono text-muted-foreground">{entry.utr_number || '-'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminView() {
  const { data: folios = [] } = useQuery({
    queryKey: ['all-folios'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rc-limits/admin/folios`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.ok ? await response.json() : [];
    },
  });

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30">
        <h2 className="text-lg font-bold text-foreground">All Folio Accounts</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left py-3 px-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Folio ID</th>
              <th className="text-left py-3 px-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">DSA</th>
              <th className="text-left py-3 px-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Loan ID</th>
              <th className="text-left py-3 px-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Balance</th>
              <th className="text-left py-3 px-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {folios.map((folio: any) => (
              <tr key={folio.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 font-semibold text-foreground">#{folio.id}</td>
                <td className="py-3 px-4 text-foreground">{folio.dsa_name}</td>
                <td className="py-3 px-4 font-mono text-muted-foreground">#{folio.loan_id}</td>
                <td className="py-3 px-4 font-bold text-foreground">₹{Number(folio.current_balance).toLocaleString()}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                    folio.status === 'active' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-muted text-muted-foreground border-border'
                  }`}>
                    {folio.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
