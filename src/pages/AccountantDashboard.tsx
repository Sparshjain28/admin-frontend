import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { IndianRupee, TrendingUp, AlertCircle, CheckCircle2, Clock, FileText, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

export default function AccountantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['accountant-dashboard', user?.id],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/dashboard`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) return null;
      return await response.json();
    },
    enabled: !!user,
  });

  const { data: pendingPayments } = useQuery({
    queryKey: ['account-payments-pending', user?.id],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/payments?status=pending`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!user,
  });

  const { data: pendingBillMappings = [] } = useQuery({
    queryKey: ['pending-bill-mappings', user?.id],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/bill-mapping/pending`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!user,
  });

  const dashboardData = stats || {
    totalDisbursed: 0,
    totalPayouts: 0,
    pendingPayments: 0,
    totalExpenses: 0,
    monthlyData: [],
    paymentStatus: { pending: 0, completed: 0, failed: 0 }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Accountant Dashboard</h1>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Disbursed</p>
              <div className="bg-primary/10 p-1.5 rounded-lg">
                <IndianRupee size={16} className="text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">
              ₹{(dashboardData.totalDisbursed / 100000).toFixed(2)}L
            </p>
          </div>

          <div className="bg-card rounded-xl p-4 shadow-sm border border-border flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Payouts</p>
              <div className="bg-green-500/10 p-1.5 rounded-lg">
                <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">
              ₹{(dashboardData.totalPayouts / 100000).toFixed(2)}L
            </p>
          </div>

          <div className="bg-card rounded-xl p-4 shadow-sm border border-border flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Pending Payments</p>
              <div className="bg-yellow-500/10 p-1.5 rounded-lg">
                <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">
              ₹{(dashboardData.pendingPayments / 100000).toFixed(2)}L
            </p>
          </div>

          <div className="bg-card rounded-xl p-4 shadow-sm border border-border flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Expenses</p>
              <div className="bg-purple-500/10 p-1.5 rounded-lg">
                <CheckCircle2 size={16} className="text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">
              ₹{(dashboardData.totalExpenses / 100000).toFixed(2)}L
            </p>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border mb-6">
          <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Monthly Disbursement Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" tick={{fill: 'currentColor', opacity: 0.5}} tickLine={false} axisLine={false} />
              <YAxis tick={{fill: 'currentColor', opacity: 0.5}} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value: any) => `₹${(Number(value) / 100000).toFixed(2)}L`} cursor={{fill: 'var(--muted)'}} contentStyle={{backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)'}} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <p className="text-yellow-600 dark:text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-1">Pending</p>
            <p className="text-2xl font-bold text-foreground">{dashboardData.paymentStatus.pending}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <p className="text-green-600 dark:text-green-400 text-xs font-semibold uppercase tracking-wider mb-1">Completed</p>
            <p className="text-2xl font-bold text-foreground">{dashboardData.paymentStatus.completed}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <p className="text-red-600 dark:text-red-400 text-xs font-semibold uppercase tracking-wider mb-1">Failed</p>
            <p className="text-2xl font-bold text-foreground">{dashboardData.paymentStatus.failed}</p>
          </div>
        </div>

        {/* Action Links & Ledgers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div 
            onClick={() => navigate('/accountant/disbursement-ledger')}
            className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow transition-shadow cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Disbursement Ledger</h3>
                <p className="text-muted-foreground text-xs">View full case-wise disbursement records</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-muted-foreground transform group-hover:translate-x-1 transition-transform" />
          </div>

          <div 
            onClick={() => navigate('/rc-limits/bills')}
            className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow transition-shadow cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-600 dark:text-yellow-400">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Pending Approvals</h3>
                <p className="text-muted-foreground text-xs">Review and approve payment requests</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-muted-foreground transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Pending Bill Mapping Requests */}
        {pendingBillMappings && pendingBillMappings.length > 0 && (
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden mb-6">
            <div className="px-4 py-4 border-b border-border flex justify-between items-center bg-blue-50 dark:bg-blue-900/20">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                <FileText size={16} className="text-blue-600 dark:text-blue-400" /> Pending Bill Mapping Requests
              </h2>
              <button onClick={() => navigate('/rc-limits/bills')} className="text-xs text-primary hover:opacity-80 font-bold uppercase tracking-wider">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Request ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Loan ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Raised By</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingBillMappings.slice(0, 5).map((request: any) => (
                    <tr key={request.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4 text-sm font-bold text-blue-600 dark:text-blue-400">
                        {request.request_id || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        #{request.loan_id || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{request.customer_name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{request.raised_by_name || request.raised_by_user_name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {request.document_count > 0 ? (
                          <span className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-semibold">
                            {request.document_count} file(s)
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">No document</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pending Requests Preview */}
        {pendingPayments && pendingPayments.length > 0 && (
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden mb-6">
            <div className="px-4 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                <Clock size={16} className="text-yellow-600 dark:text-yellow-400" /> Recent Pending Requests
              </h2>
              <button onClick={() => navigate('/rc-limits/bills')} className="text-xs text-primary hover:opacity-80 font-bold uppercase tracking-wider">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Purpose</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Bill No</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Draft By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingPayments.slice(0, 5).map((payment: any) => (
                    <tr key={payment.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{payment.txn_type}</td>
                      <td className="px-6 py-4 text-sm font-bold text-foreground">
                        ₹{((payment.amount || payment.payout_amount || 0) / 100000).toFixed(2)}L
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{payment.bill_number || '—'}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{payment.user_name || payment.submitted_by || 'Unknown'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
