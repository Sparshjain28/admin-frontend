import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Search, Loader2, AlertCircle, X } from 'lucide-react';
import RequestsTable from '@/components/RequestsTable';
import DraggableDocumentViewer from '@/components/DraggableDocumentViewer';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function RCLimitPayments() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'in_progress' | 'approved'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewers, setViewers] = useState<{ url: string; id: number }[]>([]);

  const handleOpenViewer = (url: string, id: number) => {
    setViewers(prev => [...prev, { url, id }]);
  };

  // Fetch only payout module withdrawal requests
  const { data: rawWithdrawals = [], isLoading } = useQuery({
    queryKey: ['rc-limit-payout-withdrawals', user?.id],
    queryFn: async () => {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${baseUrl}/payouts/withdrawals`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!user,
  });

  // Map payout withdrawal requests into format for display table
  const mappedWithdrawals = useMemo(() => {
    return rawWithdrawals.map((w: any) => ({
      ...w,
      id: w.id,
      request_id: w.request_id || `WR-${w.id}`,
      customer_name: w.partner_name || w.user_name || 'Partner',
      created_by_name: `${w.partner_name || 'Partner'}${w.partner_role ? ` (${w.partner_role.toUpperCase()})` : ''}`,
      amount: w.requested_amount || w.amount || w.payout_amount || 0,
      purpose: w.purpose || 'PAYOUT WITHDRAWAL',
      status:
        w.withdrawal_status === 'withdrawal_pending'
          ? (w.accountant_approved_by ? 'accountant_approval' : 'pending')
          : w.withdrawal_status === 'accountant_approved'
          ? 'admin_approval'
          : w.withdrawal_status === 'withdrawal_paid'
          ? 'completed'
          : w.withdrawal_status === 'withdrawal_rejected'
          ? 'rejected'
          : w.withdrawal_status || 'pending',
      raw_status: w.withdrawal_status,
    }));
  }, [rawWithdrawals]);

  // Categorize mapped payouts into Pending Payment, In Progress, Approved
  const { pendingPayments, inProgressPayments, approvedPayments } = useMemo(() => {
    const pending: any[] = [];
    const inProgress: any[] = [];
    const approved: any[] = [];

    mappedWithdrawals.forEach((w: any) => {
      const status = w.raw_status || '';
      if (status === 'withdrawal_pending' && !w.accountant_approved_by) {
        pending.push(w);
      } else if (status === 'accountant_approved' || (status === 'withdrawal_pending' && !!w.accountant_approved_by)) {
        inProgress.push(w);
      } else if (status === 'withdrawal_paid') {
        approved.push(w);
      }
    });

    return {
      pendingPayments: pending,
      inProgressPayments: inProgress,
      approvedPayments: approved,
    };
  }, [mappedWithdrawals]);

  // Filter based on search query
  const filterList = (list: any[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((item: any) => {
      return (
        item.customer_name?.toLowerCase().includes(q) ||
        item.created_by_name?.toLowerCase().includes(q) ||
        item.partner_name?.toLowerCase().includes(q) ||
        item.request_id?.toString().toLowerCase().includes(q) ||
        item.account_number?.toString().toLowerCase().includes(q) ||
        item.purpose?.toLowerCase().includes(q) ||
        item.remarks?.toLowerCase().includes(q) ||
        item.amount?.toString().includes(q)
      );
    });
  };

  const displayedList = useMemo(() => {
    if (activeTab === 'pending') return filterList(pendingPayments);
    if (activeTab === 'in_progress') return filterList(inProgressPayments);
    return filterList(approvedPayments);
  }, [activeTab, searchQuery, pendingPayments, inProgressPayments, approvedPayments]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in max-w-7xl mx-auto p-2 sm:p-4">
      {/* Tabs & Search Header Row (Image 2 style) */}
      <div className="flex items-center justify-between gap-2 px-1 mb-4 border-b border-border mt-1">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 min-w-0">
          <div className="flex gap-0.5 shrink-0">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'pending'
                  ? 'bg-blue-100/70 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Pending Payment
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'pending' ? 'bg-blue-200/80 dark:bg-blue-800 text-blue-950 dark:text-blue-100' : 'bg-muted text-muted-foreground'
              }`}>
                {pendingPayments.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('in_progress')}
              className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'in_progress'
                  ? 'bg-blue-100/70 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              In Progress
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'in_progress' ? 'bg-blue-200/80 dark:bg-blue-800 text-blue-950 dark:text-blue-100' : 'bg-muted text-muted-foreground'
              }`}>
                {inProgressPayments.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('approved')}
              className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'approved'
                  ? 'bg-blue-100/70 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Approved
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'approved' ? 'bg-blue-200/80 dark:bg-blue-800 text-blue-950 dark:text-blue-100' : 'bg-muted text-muted-foreground'
              }`}>
                {approvedPayments.length}
              </span>
            </button>
          </div>

          {/* Search Input - placed directly after tabs with highlighted dark border */}
          <div className="relative w-36 sm:w-60 shrink-0 mb-1 ml-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-xs font-semibold">Loading payout requests...</p>
          </div>
        ) : displayedList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-2">
            <AlertCircle size={40} className="text-muted-foreground/50" />
            <p className="text-sm font-semibold text-foreground">
              No {activeTab === 'pending' ? 'Pending Payment' : activeTab === 'in_progress' ? 'In Progress' : 'Approved'} payout requests found
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {searchQuery ? 'Try adjusting your search filter.' : 'There are currently no payout module withdrawal requests in this section.'}
            </p>
          </div>
        ) : (
          <RequestsTable requests={displayedList} onOpenViewer={handleOpenViewer} />
        )}
      </div>

      {/* Document Viewer Modal Portal */}
      {viewers.map(v => createPortal(
        <DraggableDocumentViewer key={v.id} url={v.url} onClose={() => setViewers(prev => prev.filter(x => x.id !== v.id))} />,
        document.body
      ))}
    </div>
  );
}


