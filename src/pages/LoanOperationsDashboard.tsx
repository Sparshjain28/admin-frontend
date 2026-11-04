import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Search, RefreshCw, Layers, Clock, AlertCircle,
  Filter, Sparkles
} from 'lucide-react';
import { ScrollSection } from '@/components/ScrollSection';

export default function LoanOperationsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [burstTableData, setBurstTableData] = useState<{
    SUBMITTED: any[];
    LOGIN: any[];
    IN_PROCESS: any[];
  }>({
    SUBMITTED: [],
    LOGIN: [],
    IN_PROCESS: []
  });

  const [viewedLeadIds, setViewedLeadIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(`loan_ops_viewed_leads_${user?.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [caseTypeFilter, setCaseTypeFilter] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timerEnabled, setTimerEnabled] = useState(true);

  // Real-time clock for SLA timers
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch timer system config
  useEffect(() => {
    const fetchTimerConfig = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/config/key/login_stage_enabled`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
          }
        );
        if (response.ok) {
          const config = await response.json();
          setTimerEnabled(config.config_value === 'true' || config.config_value === true);
        }
      } catch {
        setTimerEnabled(true);
      }
    };
    fetchTimerConfig();
  }, []);

  // Fetch burst-table data for loan operations
  const fetchBurstTable = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/burst-table`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        }
      );
      if (response.ok) {
        const data = await response.json();
        const grouped = {
          SUBMITTED: data.filter((loan: any) => loan.application_stage === 'SUBMITTED'),
          LOGIN: data.filter((loan: any) => loan.application_stage === 'LOGIN'),
          IN_PROCESS: data.filter((loan: any) => loan.application_stage === 'IN_PROCESS')
        };
        setBurstTableData(grouped);
      }
    } catch (error) {
      console.error('Error fetching loan ops burst table:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBurstTable();
  }, []);

  // Mark lead as viewed and navigate to details
  const handleLeadClick = (loan: any) => {
    setViewedLeadIds(prev => {
      if (prev.includes(loan.id)) return prev;
      const updated = [...prev, loan.id];
      try {
        localStorage.setItem(`loan_ops_viewed_leads_${user?.id}`, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save viewed lead state:', e);
      }
      return updated;
    });
    navigate(`/loans/${loan.id}`);
  };

  // Timer elapsed display
  const getTimeElapsed = (createdAt: string, stage: string) => {
    if (stage === 'IN_PROCESS' || !timerEnabled) return '';
    const created = new Date(createdAt);
    const diff = currentTime.getTime() - created.getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const remaining = twentyFourHours - diff;

    if (remaining <= 0) return '00:00:00';

    const remainingHours = Math.floor(remaining / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const remainingSeconds = Math.floor((remaining % (1000 * 60)) / 1000);

    return `${remainingHours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (createdAt: string, stage: string) => {
    if (stage === 'IN_PROCESS' || !timerEnabled) return 'text-muted-foreground';
    const created = new Date(createdAt);
    const diff = currentTime.getTime() - created.getTime();
    const totalHours = diff / (1000 * 60 * 60);
    const remaining = 24 - totalHours;

    if (remaining <= 0) return 'text-red-700 dark:text-red-500 font-bold animate-pulse';
    if (remaining <= 4) return 'text-red-600 dark:text-red-400 font-semibold';
    if (remaining <= 8) return 'text-orange-600 dark:text-orange-400 font-semibold';
    if (remaining <= 16) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  // Filtered lists based on search & case type
  const filterList = (list: any[]) => {
    return list.filter((loan: any) => {
      const matchesSearch =
        !searchTerm ||
        (loan.loan_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (loan.applicant_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (loan.vehicle_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (loan.case_type || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCaseType =
        caseTypeFilter === 'all' ||
        (loan.case_type || '').toLowerCase().replace(/[\s-_]/g, '') === caseTypeFilter.toLowerCase().replace(/[\s-_]/g, '');

      return matchesSearch && matchesCaseType;
    });
  };

  // New Leads are converted leads in SUBMITTED stage that have not yet been clicked/viewed
  const newLeads = useMemo(() => {
    return burstTableData.SUBMITTED.filter((loan: any) => !viewedLeadIds.includes(loan.id));
  }, [burstTableData.SUBMITTED, viewedLeadIds]);

  const filteredNewLeads = useMemo(() => filterList(newLeads), [newLeads, searchTerm, caseTypeFilter]);
  const filteredSubmitted = useMemo(() => filterList(burstTableData.SUBMITTED), [burstTableData.SUBMITTED, searchTerm, caseTypeFilter]);
  const filteredLogin = useMemo(() => filterList(burstTableData.LOGIN), [burstTableData.LOGIN, searchTerm, caseTypeFilter]);
  const filteredInProcess = useMemo(() => filterList(burstTableData.IN_PROCESS), [burstTableData.IN_PROCESS, searchTerm, caseTypeFilter]);

  const totalFiltered = filteredNewLeads.length + filteredSubmitted.length + filteredLogin.length + filteredInProcess.length;

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Loan Operations Dashboard</h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                Active pipeline tracking — Submitted, Login, and In-Process stages
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBurstTable}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-background border border-border/80 hover:bg-muted text-foreground text-xs font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
            title="Refresh pipeline data"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>


      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by loan no, applicant name, or RC number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-44">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select
              value={caseTypeFilter}
              onChange={(e) => setCaseTypeFilter(e.target.value)}
              className="w-full appearance-none pl-8 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Case Types</option>
              <option value="used_car_purchase">Used Car Purchase</option>
              <option value="refinance">Refinance</option>
              <option value="bt">BT</option>
              <option value="top_up">Top Up</option>
            </select>
          </div>

          {(searchTerm || caseTypeFilter !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setCaseTypeFilter('all'); }}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold px-2 hover:underline whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Block: Loans by Stage */}
      <ScrollSection delay={0.1} className="w-full">
        <div className="bg-white dark:bg-gray-900/40 rounded-xl border border-border/50 shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="px-4 py-3 border-b border-border/50 bg-gray-50/30 dark:bg-gray-800/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              <h3 className="font-bold text-sm text-foreground">Loans by Stage</h3>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
              {totalFiltered} cases showing
            </span>
          </div>

          {/* Burst Table Columns Grid — 4 Columns */}
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 md:gap-4">
              
              {/* 1. NEW LEADS Column (Only unviewed converted leads) */}
              <div>
                <div className="bg-emerald-100 dark:bg-emerald-900/30 px-4 h-12 flex items-center justify-between font-semibold text-xs text-emerald-800 dark:text-emerald-300 border-b">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span>NEW LEADS ({newLeads.length})</span>
                  </div>
                  {filteredNewLeads.length !== newLeads.length && (
                    <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">({filteredNewLeads.length} filtered)</span>
                  )}
                </div>
                <div className="max-h-[520px] overflow-y-auto">
                  {isLoading ? (
                    <div className="py-8 px-4 text-center text-muted-foreground text-xs">Loading cases...</div>
                  ) : filteredNewLeads.length === 0 ? (
                    <div className="py-8 px-4 text-center text-muted-foreground text-xs">No unread new leads</div>
                  ) : (
                    filteredNewLeads.map((loan: any) => (
                      <div
                        key={loan.id}
                        onClick={() => handleLeadClick(loan)}
                        className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer p-3 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-foreground font-mono text-xs font-semibold group-hover:text-emerald-600 transition-colors">
                              {loan.loan_number || `LOAN-${loan.id}`}
                            </span>
                          </div>
                          {timerEnabled && (
                            <div className={`text-xs font-mono font-semibold ${getTimerColor(loan.created_at, 'SUBMITTED')}`}>
                              {getTimeElapsed(loan.created_at, 'SUBMITTED')}
                            </div>
                          )}
                        </div>
                        <div className="text-muted-foreground text-xs mt-1">
                          {loan.applicant_name || 'N/A'}
                        </div>
                        <div className="text-muted-foreground text-xs mt-0.5">
                          RC: {loan.vehicle_number || 'N/A'} • {loan.case_type || 'N/A'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 2. SUBMITTED Column (Always has all submitted files) */}
              <div>
                <div className="bg-gray-100 dark:bg-gray-800 px-4 h-12 flex items-center justify-between font-semibold text-xs text-gray-700 dark:text-gray-300 border-b">
                  <span>SUBMITTED ({burstTableData.SUBMITTED.length})</span>
                  {filteredSubmitted.length !== burstTableData.SUBMITTED.length && (
                    <span className="text-[10px] font-normal text-muted-foreground">({filteredSubmitted.length} filtered)</span>
                  )}
                </div>
                <div className="max-h-[520px] overflow-y-auto">
                  {isLoading ? (
                    <div className="py-8 px-4 text-center text-muted-foreground text-xs">Loading cases...</div>
                  ) : filteredSubmitted.length === 0 ? (
                    <div className="py-8 px-4 text-center text-muted-foreground text-xs">No submitted loans</div>
                  ) : (
                    filteredSubmitted.map((loan: any) => (
                      <div
                        key={loan.id}
                        onClick={() => handleLeadClick(loan)}
                        className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer p-3 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-foreground font-mono text-xs font-semibold group-hover:text-blue-600 transition-colors">
                              {loan.loan_number || `LOAN-${loan.id}`}
                            </span>
                            {!viewedLeadIds.includes(loan.id) && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                                NEW
                              </span>
                            )}
                          </div>
                          {timerEnabled && (
                            <div className={`text-xs font-mono font-semibold ${getTimerColor(loan.created_at, 'SUBMITTED')}`}>
                              {getTimeElapsed(loan.created_at, 'SUBMITTED')}
                            </div>
                          )}
                        </div>
                        <div className="text-muted-foreground text-xs mt-1">
                          {loan.applicant_name || 'N/A'}
                        </div>
                        <div className="text-muted-foreground text-xs mt-0.5">
                          RC: {loan.vehicle_number || 'N/A'} • {loan.case_type || 'N/A'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 3. LOGIN Column */}
              <div>
                <div className="bg-blue-100 dark:bg-blue-900/30 px-4 h-12 flex items-center justify-between font-semibold text-xs text-blue-700 dark:text-blue-300 border-b">
                  <span>LOGIN ({burstTableData.LOGIN.length})</span>
                  {filteredLogin.length !== burstTableData.LOGIN.length && (
                    <span className="text-[10px] font-normal text-blue-500 dark:text-blue-400">({filteredLogin.length} filtered)</span>
                  )}
                </div>
                <div className="max-h-[520px] overflow-y-auto">
                  {isLoading ? (
                    <div className="py-8 px-4 text-center text-muted-foreground text-xs">Loading cases...</div>
                  ) : filteredLogin.length === 0 ? (
                    <div className="py-8 px-4 text-center text-muted-foreground text-xs">No login cases</div>
                  ) : (
                    filteredLogin.map((loan: any) => (
                      <div
                        key={loan.id}
                        onClick={() => navigate(`/loans/${loan.id}`)}
                        className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer p-3 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-foreground font-mono text-xs font-semibold group-hover:text-blue-600 transition-colors">
                            {loan.loan_number || `LOAN-${loan.id}`}
                          </span>
                          {timerEnabled && (
                            <div className={`text-xs font-mono font-semibold ${getTimerColor(loan.created_at, 'LOGIN')}`}>
                              {getTimeElapsed(loan.created_at, 'LOGIN')}
                            </div>
                          )}
                        </div>
                        <div className="text-muted-foreground text-xs mt-1">
                          {loan.applicant_name || 'N/A'}
                        </div>
                        <div className="text-muted-foreground text-xs mt-0.5">
                          RC: {loan.vehicle_number || 'N/A'} • {loan.case_type || 'N/A'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 4. IN PROCESS Column */}
              <div>
                <div className="bg-yellow-100 dark:bg-yellow-900/30 px-4 h-12 flex items-center justify-between font-semibold text-xs text-yellow-700 dark:text-yellow-300 border-b">
                  <span>IN PROCESS ({burstTableData.IN_PROCESS.length})</span>
                  {filteredInProcess.length !== burstTableData.IN_PROCESS.length && (
                    <span className="text-[10px] font-normal text-yellow-600 dark:text-yellow-400">({filteredInProcess.length} filtered)</span>
                  )}
                </div>
                <div className="max-h-[520px] overflow-y-auto">
                  {isLoading ? (
                    <div className="py-8 px-4 text-center text-muted-foreground text-xs">Loading cases...</div>
                  ) : filteredInProcess.length === 0 ? (
                    <div className="py-8 px-4 text-center text-muted-foreground text-xs">No in-process cases</div>
                  ) : (
                    filteredInProcess.map((loan: any) => (
                      <div
                        key={loan.id}
                        onClick={() => navigate(`/loans/${loan.id}`)}
                        className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer p-3 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-foreground font-mono text-xs font-semibold group-hover:text-amber-600 transition-colors">
                            {loan.loan_number || `LOAN-${loan.id}`}
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs mt-1">
                          {loan.applicant_name || 'N/A'}
                        </div>
                        <div className="text-muted-foreground text-xs mt-0.5">
                          RC: {loan.vehicle_number || 'N/A'} • {loan.case_type || 'N/A'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </ScrollSection>
    </div>
  );
}
