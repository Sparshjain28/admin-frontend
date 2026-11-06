import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, ArrowRight, Copy, Check, Eye, Trash2, X, Edit, Filter, Users, ClipboardCheck, TrendingUp, Clock, UserX, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import ApplicationStageModal from '@/components/ApplicationStageModal';
import { ApplicationStage, ApplicationStageData, STAGE_LABELS, STAGE_COLORS } from '@/types/applicationStages';
import MobileLeadsWorkflow from '@/components/MobileLeadsWorkflow';

// Timer Component (Disabled permanently - TIME UP removed)
const LeadTimer = (_props: { createdAt?: string; timerEnabled?: boolean }) => {
  return null;
};

// Helper function to check if timer is expired (Disabled - never expire)
const isTimerExpired = (_createdAt?: string): boolean => {
  return false;
};

// Lead stage colors and labels (simplified)
const LEAD_STAGE_COLORS: { [key: string]: string } = {
  'SUBMITTED': 'bg-blue-100 text-blue-700 border-blue-200',
  'CONVERTED': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const LEAD_STAGE_LABELS: { [key: string]: string } = {
  'SUBMITTED': 'Draft',
  'CONVERTED': 'Converted',
};

// Loan application stage colors and labels
const LOAN_STAGE_COLORS: { [key: string]: string } = {
  'SUBMITTED': 'bg-blue-100 text-blue-700 border-blue-200',
  'LOGIN': 'bg-purple-100 text-purple-700 border-purple-200',
  'IN_PROCESS': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'APPROVED': 'bg-green-100 text-green-700 border-green-200',
  'REJECTED': 'bg-red-100 text-red-700 border-red-200',
  'DISBURSED': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'CANCELLED': 'bg-gray-100 text-gray-700 border-gray-200',
};

const LOAN_STAGE_LABELS: { [key: string]: string } = {
  'SUBMITTED': 'Draft',
  'LOGIN': 'Login',
  'IN_PROCESS': 'In Process',
  'APPROVED': 'Approved',
  'REJECTED': 'Rejected',
  'DISBURSED': 'Disbursed',
  'CANCELLED': 'Cancelled',
};

const getLeadStageColor = (stage: string) => {
  return LEAD_STAGE_COLORS[stage] || 'bg-blue-100 text-blue-700 border-blue-200';
};

const getLeadStageLabel = (stage: string) => {
  return LEAD_STAGE_LABELS[stage] || 'Draft';
};

const getLoanStageColor = (stage: string) => {
  return LOAN_STAGE_COLORS[stage?.toUpperCase()] || 'bg-gray-100 text-gray-700 border-gray-200';
};

const getLoanStageLabel = (stage: string) => {
  return LOAN_STAGE_LABELS[stage?.toUpperCase()] || stage;
};

export default function LeadsList() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mobile layout detector hook
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return <MobileLeadsWorkflow />;
  }
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [stageModal, setStageModal] = useState<{ leadId: number; currentStage: ApplicationStage } | null>(null);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sourcingPersonName, setSourcingPersonName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLeadsData, setDeleteLeadsData] = useState<any>(null);

  const [visibleCount, setVisibleCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  const handleStageUpdate = (leadId: number, stageData: ApplicationStageData) => {
    // Update the lead in the cache
    queryClient.setQueryData(['leads'], (oldData: any) => {
      if (!oldData) return oldData;
      return oldData.map((lead: any) =>
        lead.id === leadId
          ? { ...lead, application_stage: stageData.stage, stage_data: stageData }
          : lead
      );
    });
    setStageModal(null);
  };

  const deleteLead = useMutation({
    mutationFn: (id: number) => api.delete(`/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead deleted successfully!');
    },
    onError: () => {
      toast.error('Failed to delete lead');
    },
  });

  const deleteLeadsBySourcingPerson = useMutation({
    mutationFn: async (sourcingPersonName: string) => {
const response = await api.post('/leads/delete-by-sourcing-person', {
        sourcing_person_name: sourcingPersonName
      });
return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`Successfully deleted ${data.deletedCount} leads!`);
      setSourcingPersonName('');
      setShowDeleteModal(false);
      setDeleteLeadsData(null);
    },
    onError: (error: any) => {
toast.error(error.message || 'Failed to delete leads');
    },
  });

  const searchLeadsBySourcingPerson = async (name: string) => {
    if (!name.trim()) {
      toast.error('Please enter a sourcing person name');
      return;
    }

    try {
console.log('🌐 API URL:', import.meta.env.VITE_API_URL || 'http://localhost:5000/api');
      
      const response = await api.post('/leads/search-by-sourcing-person', {
        sourcing_person_name: name.trim()
      });
if (response.leads.length === 0) {
        toast.error(`No leads found for sourcing person: ${name}`);
        return;
      }

      setDeleteLeadsData(response);
      setShowDeleteModal(true);
      toast.success(`Found ${response.leads.length} leads by ${name}`);
    } catch (error: any) {
toast.error(error.message || 'Failed to search leads');
    }
  };

  const { data: leads = [], isLoading, error: leadsError } = useQuery<any[]>({
    queryKey: ['leads'],
    queryFn: async () => {
      const leadsData = await api.get('/leads');

      // Remove debug logging and complex processing for faster loading
      return leadsData;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // cacheTime removed as it's not valid for this version of react-query
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/config`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.ok ? await response.json() : [];
    },
  });

  const isLeadStageEnabled = () => {
    const config = configs.find((c: any) => c.config_key === 'lead_stage_enabled');
    if (!config) return true;
    return config.config_value === 'true';
  };

  // Was recomputing on every render (not just when leads/filters/search
  // actually change) — every keystroke in the search box, every unrelated
  // state update elsewhere on the page, re-ran this filter over the full
  // leads list.
  const filtered = useMemo(() => leads.filter((l: any) => {
    // Show only pending leads (not converted) for all roles
    if (l.converted_to_loan) return false;

    // Branch filter
    if (filterBranch !== 'all' && l.our_branch !== filterBranch) return false;

    // Stage filter
    if (filterStage !== 'all' && l.application_stage !== filterStage) return false;

    // Executives can only see their own leads
    if (user?.role === 'executive' && l.created_by !== user?.id) return false;

    return !search ||
      l.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.includes(search) ||
      l.customer_id?.toLowerCase().includes(search.toLowerCase());
  }), [leads, filterBranch, filterStage, user?.role, user?.id, search]);

  // Virtualization: Show only visible items
  const visibleLeads = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  // Auto load more function with better mobile support
  const loadMore = useCallback(() => {
    if (visibleCount < filtered.length && !isLoadingMore) {
      setIsLoadingMore(true);
      // Reduced delay for faster loading
      setTimeout(() => {
        setVisibleCount(prev => Math.min(prev + 10, filtered.length));
        setIsLoadingMore(false);
      }, 100);
    }
  }, [visibleCount, filtered.length, isLoadingMore]);

  // Enhanced Intersection Observer for mobile with scroll fallback
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !isLoadingMore) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '300px' // Increased for better mobile detection
      }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    // Fallback scroll listener for mobile
    const handleScroll = () => {
      if (isLoadingMore || visibleCount >= filtered.length) return;
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Trigger when user is 300px from bottom
      if (scrollTop + windowHeight >= documentHeight - 300) {
        loadMore();
      }
    };

    // Add scroll listener with throttling
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    window.addEventListener('touchmove', throttledScroll, { passive: true });

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
      window.removeEventListener('scroll', throttledScroll);
      window.removeEventListener('touchmove', throttledScroll);
    };
  }, [loadMore, isLoadingMore, visibleCount, filtered.length]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(10);
    setIsLoadingMore(false);
  }, [search, filterStage, filterBranch]);

  const stats = {
    total: filtered.length,
    pending: filtered.filter((l: any) => !['DISBURSED', 'REJECTED', 'CANCELLED'].includes(l.application_stage)).length,
    // Remove converted count since we're only showing pending leads
  };

  const branches = Array.from(new Set(leads.map((l: any) => l.our_branch).filter(Boolean))) as string[];

  return (
    <div className="pb-24 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pending Leads</h1>
        </div>
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate('/add-lead');
          }}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold py-2.5 px-6 rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-xl active:scale-95 text-sm"
        >
          <Plus size={18} /> Add New Lead
        </button>
      </div>

      <div className="grid gap-2 lg:gap-6 mb-6 grid-cols-2">
        <div className="stat-card p-2 md:p-4 border-none bg-blue-50 hover:-translate-y-1 transition-transform flex flex-col items-center justify-center text-center">
          <div className="flex flex-col items-center gap-1 md:gap-2 mb-1">
            <Users size={16} className="text-blue-600 md:size-5" />
            <p className="text-[10px] md:text-sm font-semibold text-blue-800/70 leading-tight">Pending<br className="md:hidden" /> Leads</p>
          </div>
          <h3 className="text-lg md:text-2xl font-bold text-blue-900 tracking-tight leading-none">{stats.total}</h3>
        </div>

        <div className="stat-card p-2 md:p-4 border-none bg-orange-50 hover:-translate-y-1 transition-transform flex flex-col items-center justify-center text-center">
          <div className="flex flex-col items-center gap-1 md:gap-2 mb-1">
            <ClipboardCheck size={16} className="text-orange-600 md:size-5" />
            <p className="text-[10px] md:text-sm font-semibold text-orange-800/70 leading-tight">Needs<br className="md:hidden" /> Action</p>
          </div>
          <h3 className="text-lg md:text-2xl font-bold text-orange-900 tracking-tight leading-none">{stats.pending}</h3>
        </div>
      </div>

      <div className="glass-panel p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, phone or lead ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all ${isFilterOpen || filterBranch !== 'all' || filterStage !== 'all'
                  ? 'bg-accent/10 border-accent/20 text-accent'
                  : 'border-border bg-background/50 text-muted-foreground hover:bg-muted'
                }`}
            >
              <Filter size={18} />
              Filters
              {(filterBranch !== 'all' || filterStage !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
              )}
            </button>
            {(search || filterBranch !== 'all' || filterStage !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterBranch('all');
                  setFilterStage('all');
                }}
                className="p-2.5 rounded-xl border border-border bg-background/50 text-muted-foreground hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                title="Clear all filters"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {isFilterOpen && (
          <div className="space-y-4 mt-4 pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Branch</label>
                <select
                  value={filterBranch}
                  onChange={e => setFilterBranch(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary transition-all"
                >
                  <option value="all">All Branches</option>
                  {branches.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Application Stage</label>
                <select
                  value={filterStage}
                  onChange={e => setFilterStage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary transition-all"
                >
                  <option value="all">All Stages</option>
                  {Object.entries(STAGE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Admin Only: Delete Leads by Sourcing Person */}
            {user?.role === 'admin' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <UserX size={16} className="text-red-600" />
                  <h3 className="text-sm font-bold text-red-800">Delete Leads by Sourcing Person</h3>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Enter sourcing person name (e.g., HARSH VARDHAN)"
                      value={sourcingPersonName}
                      onChange={e => setSourcingPersonName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-red-200 bg-white text-sm focus:outline-none focus:border-red-400 transition-all"
                    />
                  </div>
                  <button
                    onClick={() => searchLeadsBySourcingPerson(sourcingPersonName)}
                    disabled={!sourcingPersonName.trim() || deleteLeadsBySourcingPerson.isPending}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all flex items-center gap-2"
                  >
                    {deleteLeadsBySourcingPerson.isPending ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    Search & Delete
                  </button>
                </div>
                <p className="text-xs text-red-600 mt-2">
                  ⚠️ This will permanently delete all leads created by the specified sourcing person. Use with caution!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {leadsError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          Error loading leads: {(leadsError as Error).message}
        </div>
      )}

      {/* Mobile Card View - No Virtualization */}
      <div className="lg:hidden space-y-4">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm text-muted-foreground animate-pulse">Loading leads...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center glass-panel">
            <div className="mb-4 flex justify-center text-muted-foreground/30">
              <Users size={48} />
            </div>
            <p className="text-foreground font-semibold">No leads found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          filtered.map((lead: any) => (
            <div
              key={lead.id}
              className="bg-card w-full shadow-sm hover:shadow-md border border-border/50 rounded-2xl overflow-hidden active:scale-[0.99] transition-all duration-200"
              onClick={() => navigate(`/leads/${lead.id}`)}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/10">{lead.customer_id || 'NO-ID'}</span>
                      <LeadTimer createdAt={lead.created_at} timerEnabled={lead.timer_enabled} />
                    </div>
                    <p className="font-bold text-foreground text-lg tracking-tight mb-1 truncate">{lead.customer_name}</p>
                    <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
                      <span>{lead.phone}</span>
                      {lead.city && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                          <span className="opacity-80">{lead.city}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`shrink-0 text-xs px-3 py-1 rounded-full font-semibold shadow-sm border ${getLeadStageColor('SUBMITTED')}`}>
                      {getLeadStageLabel('SUBMITTED')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-border">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Req. Amount</p>
                    <p className="font-bold text-foreground text-base">₹{Number(lead.loan_amount_required || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Reg. Number</p>
                    <p className="font-bold text-foreground text-base truncate uppercase">{lead.vehicle_number || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Sourcing Person</p>
                    <p className="font-bold text-foreground text-base truncate">{lead.sourcing_person_name || lead.created_by_name || '—'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className="text-muted-foreground font-medium">{lead.our_branch || 'Direct Branch'}</span>
                  <span className="text-muted-foreground font-medium">{new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </div>
                {lead.stage_data?.saved_by && (
                  <div className="mt-2 px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-[10px] font-medium text-green-700 dark:text-green-300">
                    Saved by: {lead.stage_data.saved_by}
                  </div>
                )}
                {!lead.stage_data?.saved_by && lead.created_by_name && (
                  <div className="mt-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded text-[10px] font-medium text-gray-600 dark:text-gray-400">
                    Created by: {lead.created_by_name}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 divide-x divide-border/30 bg-muted/30 border-t border-border/30" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className="py-3 flex items-center justify-center gap-2 text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
                >
                  <Eye size={14} /> View
                </button>
                <button
                  onClick={() => navigate(`/add-lead?leadId=${lead.id}&step=4`)}
                  className="py-3 flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors"
                >
                  <ArrowRight size={14} /> Continue
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="glass-panel overflow-hidden max-lg:hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm text-muted-foreground animate-pulse">Loading leads...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-4 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Lead ID</th>
                  <th className="text-left py-4 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Timer</th>
                  <th className="text-left py-4 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Customer Info</th>
                  <th className="text-left py-4 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Vehicle No.</th>
                  <th className="text-right py-4 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Loan Amount</th>
                  <th className="text-left py-4 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Branch</th>
                  <th className="text-left py-4 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Sourcing Person</th>
                  <th className="text-center py-4 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="py-4 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {visibleLeads.map((lead: any, idx: number) => (
                  <tr key={lead.id} className={`${idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'} hover:bg-accent/5 transition-all group`}>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => {
                          if (lead.customer_id) {
                            navigator.clipboard.writeText(lead.customer_id);
                            setCopiedId(lead.customer_id);
                            toast.success('Lead ID copied!');
                            setTimeout(() => setCopiedId(null), 2000);
                          }
                        }}
                        className="flex items-center gap-2 text-[11px] font-mono text-primary font-semibold hover:text-accent transition-colors bg-muted/50 px-2 py-1 rounded"
                      >
                        <span>{lead.customer_id || '—'}</span>
                        {lead.customer_id && (copiedId === lead.customer_id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="opacity-0 group-hover:opacity-100" />)}
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <LeadTimer createdAt={lead.created_at} timerEnabled={lead.timer_enabled} />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">{lead.customer_name}</span>
                        <span className="text-xs text-muted-foreground mt-0.5">{lead.phone} {lead.city ? `· ${lead.city}` : ''}</span>
                        {lead.stage_data?.saved_by ? (
                          <span className="text-[10px] font-medium text-green-600 dark:text-green-400 mt-0.5">Saved by: {lead.stage_data.saved_by}</span>
                        ) : lead.created_by_name ? (
                          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">Created by: {lead.created_by_name}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-xs font-semibold text-foreground bg-muted/30 px-2 py-1 rounded border border-border/50 uppercase">{lead.vehicle_number || '—'}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-bold text-foreground">₹{Number(lead.loan_amount_required || 0).toLocaleString('en-IN')}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-xs text-muted-foreground font-medium">{lead.our_branch || 'Direct'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-xs text-muted-foreground font-medium">{lead.sourcing_person_name || '—'}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-block text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shadow-sm border ${getLeadStageColor('SUBMITTED')}`}>
                        {getLeadStageLabel('SUBMITTED')}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-1 px-1">
                        <button
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-all hover:scale-110"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                            onClick={() => navigate(`/add-lead?leadId=${lead.id}&step=4`)}
                            className="p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-600 transition-all hover:scale-110 flex items-center gap-1 text-xs font-bold pr-3"
                            title="Continue Application"
                          >
                            <ArrowRight size={16} /> Continue
                          </button>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => setDeleteConfirm(lead.id)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-all hover:scale-110"
                            title="Delete Lead"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleLeads.length === 0 && !isLoading && (
              <div className="py-20 text-center text-muted-foreground bg-muted/5">
                <Users size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-medium">No leads match your search criteria</p>
              </div>
            )}
            
            {/* Infinite Scroll Trigger for Desktop - Mobile Optimized with better visibility */}
            {visibleCount < filtered.length && (
              <div 
                ref={observerRef} 
                className="flex justify-center p-8 border-t border-border min-h-[120px] w-full"
                style={{ minHeight: '120px', width: '100%' }}
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">Loading more...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stage Update Modal */}
      {stageModal && (
        <ApplicationStageModal
          isOpen={true}
          onClose={() => setStageModal(null)}
          currentStage={stageModal.currentStage}
          leadId={stageModal.leadId}
          onStageUpdate={(stageData) => handleStageUpdate(stageModal.leadId, stageData)}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Delete Lead</h3>
                <p className="text-sm text-muted-foreground mt-1">Are you sure you want to delete this lead?</p>
              </div>
              <button onClick={() => setDeleteConfirm(null)} className="p-1 rounded-lg hover:bg-muted">
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteLead.mutate(deleteConfirm);
                  setDeleteConfirm(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteModal && deleteLeadsData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Confirm Bulk Delete</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Found {deleteLeadsData.leads.length} leads by "{deleteLeadsData.sourcingPersonName}"
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteLeadsData(null);
                }} 
                className="p-1 rounded-lg hover:bg-muted"
              >
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            {deleteLeadsData.nonDeletableLeads.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 mb-2">
                  ⚠️ {deleteLeadsData.nonDeletableLeads.length} leads cannot be deleted (converted to loans):
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {deleteLeadsData.nonDeletableLeads.map((lead: any) => (
                    <div key={lead.id} className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                      {lead.customer_name} ({lead.phone}) → Loan: {lead.loan_number}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deleteLeadsData.deletableLeads.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-foreground mb-2">
                  ✅ {deleteLeadsData.deletableLeads.length} leads will be deleted:
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-muted/30 p-3 rounded-lg">
                  {deleteLeadsData.deletableLeads.slice(0, 10).map((lead: any) => (
                    <div key={lead.id} className="text-xs text-muted-foreground">
                      • {lead.customer_name} ({lead.phone}) - {lead.customer_id}
                    </div>
                  ))}
                  {deleteLeadsData.deletableLeads.length > 10 && (
                    <div className="text-xs text-muted-foreground font-medium">
                      ... and {deleteLeadsData.deletableLeads.length - 10} more leads
                    </div>
                  )}
                </div>
              </div>
            )}

            {deleteLeadsData.deletableLeads.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No leads can be deleted safely.</p>
              </div>
            ) : (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteLeadsData(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteLeadsBySourcingPerson.mutate(deleteLeadsData.sourcingPersonName)}
                  disabled={deleteLeadsBySourcingPerson.isPending}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteLeadsBySourcingPerson.isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Delete {deleteLeadsData.deletableLeads.length} Leads
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

