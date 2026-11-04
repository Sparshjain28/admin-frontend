import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCheck,
  Search,
  Phone,
  Copy,
  ShieldCheck,
  Wallet,
  Settings2,
  FileText,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  X,
  Edit3,
  Users,
  CheckSquare,
  Square,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface DsaUser {
  id: number;
  user_id: string;
  full_name: string;
  phone: string;
  status: string;
  refer_code: string;
  created_at: string;
  branch_name: string | null;
  assigned_loan_ops_id: number | null;
  loan_ops_name: string | null;
  loan_ops_phone: string | null;
  assigned_accountant_id: number | null;
  accountant_name: string | null;
  accountant_phone: string | null;
  assigned_operations_id: number | null;
  operations_name: string | null;
  operations_phone: string | null;
  total_cases: string | number;
  disbursed_cases: string | number;
}

interface AssignableStaff {
  loanOperations: Array<{ id: number; full_name: string; phone: string }>;
  accountants: Array<{ id: number; full_name: string; phone: string }>;
  operations: Array<{ id: number; full_name: string; phone: string }>;
}

export default function BrokerManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all');

  const [selectedDsa, setSelectedDsa] = useState<DsaUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoanOpsId, setFormLoanOpsId] = useState<string>('');
  const [formAccountantId, setFormAccountantId] = useState<string>('');
  const [formOperationsId, setFormOperationsId] = useState<string>('');

  const [selectedDsaIds, setSelectedDsaIds] = useState<Set<number>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkUpdateLoanOps, setBulkUpdateLoanOps] = useState(true);
  const [bulkLoanOpsId, setBulkLoanOpsId] = useState<string>('');
  const [bulkUpdateAccountant, setBulkUpdateAccountant] = useState(true);
  const [bulkAccountantId, setBulkAccountantId] = useState<string>('');
  const [bulkUpdateOperations, setBulkUpdateOperations] = useState(true);
  const [bulkOperationsId, setBulkOperationsId] = useState<string>('');

  const { data: dsaList = [], isLoading } = useQuery<DsaUser[]>({
    queryKey: ['dsa-team-list'],
    queryFn: () => api.get('/brokers/dsa-team'),
  });

  const { data: staff } = useQuery<AssignableStaff>({
    queryKey: ['assignable-staff'],
    queryFn: () => api.get('/brokers/assignable-staff'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ dsaId, payload }: { dsaId: number; payload: any }) =>
      api.put(`/brokers/dsa/${dsaId}/assign-team`, payload),
    onSuccess: () => {
      toast.success('Team mapping updated successfully');
      queryClient.invalidateQueries({ queryKey: ['dsa-team-list'] });
      setIsModalOpen(false);
      setSelectedDsa(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update team assignment');
    },
  });

  const bulkAssignMutation = useMutation({
    mutationFn: (payload: any) => api.post('/brokers/bulk-assign-team', payload),
    onSuccess: (res: any) => {
      toast.success(res.message || 'Bulk team mapping applied successfully!');
      queryClient.invalidateQueries({ queryKey: ['dsa-team-list'] });
      setIsBulkModalOpen(false);
      setSelectedDsaIds(new Set());
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to bulk assign team');
    },
  });

  const openAssignModal = (dsa: DsaUser) => {
    setSelectedDsa(dsa);
    setFormLoanOpsId(dsa.assigned_loan_ops_id ? String(dsa.assigned_loan_ops_id) : '');
    setFormAccountantId(dsa.assigned_accountant_id ? String(dsa.assigned_accountant_id) : '');
    setFormOperationsId(dsa.assigned_operations_id ? String(dsa.assigned_operations_id) : '');
    setIsModalOpen(true);
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDsa) return;
    assignMutation.mutate({
      dsaId: selectedDsa.id,
      payload: {
        assigned_loan_ops_id: formLoanOpsId ? Number(formLoanOpsId) : null,
        assigned_accountant_id: formAccountantId ? Number(formAccountantId) : null,
        assigned_operations_id: formOperationsId ? Number(formOperationsId) : null,
      },
    });
  };

  const handleSaveBulkAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDsaIds.size === 0) return;
    if (!bulkUpdateLoanOps && !bulkUpdateAccountant && !bulkUpdateOperations) {
      toast.error('Please select at least one role to update');
      return;
    }
    bulkAssignMutation.mutate({
      dsaIds: Array.from(selectedDsaIds),
      update_loan_ops: bulkUpdateLoanOps,
      assigned_loan_ops_id: bulkLoanOpsId ? Number(bulkLoanOpsId) : null,
      update_accountant: bulkUpdateAccountant,
      assigned_accountant_id: bulkAccountantId ? Number(bulkAccountantId) : null,
      update_operations: bulkUpdateOperations,
      assigned_operations_id: bulkOperationsId ? Number(bulkOperationsId) : null,
    });
  };

  const filteredDsa = useMemo(() => {
    return dsaList.filter((dsa) => {
      const q = search.toLowerCase();
      const matchesSearch =
        dsa.full_name?.toLowerCase().includes(q) ||
        dsa.phone?.includes(q) ||
        dsa.user_id?.toLowerCase().includes(q) ||
        dsa.refer_code?.toLowerCase().includes(q) ||
        dsa.loan_ops_name?.toLowerCase().includes(q) ||
        dsa.accountant_name?.toLowerCase().includes(q) ||
        dsa.operations_name?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      const isFullyAssigned = !!(
        dsa.assigned_loan_ops_id &&
        dsa.assigned_accountant_id &&
        dsa.assigned_operations_id
      );
      if (filterStatus === 'assigned') return isFullyAssigned;
      if (filterStatus === 'unassigned') return !isFullyAssigned;
      return true;
    });
  }, [dsaList, search, filterStatus]);

  const allFilteredSelected =
    filteredDsa.length > 0 && filteredDsa.every((d) => selectedDsaIds.has(d.id));

  const toggleSelectAll = () => {
    const next = new Set(selectedDsaIds);
    if (allFilteredSelected) {
      filteredDsa.forEach((d) => next.delete(d.id));
    } else {
      filteredDsa.forEach((d) => next.add(d.id));
    }
    setSelectedDsaIds(next);
  };

  const toggleSelectDsa = (id: number) => {
    const next = new Set(selectedDsaIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedDsaIds(next);
  };

  const totalDsas = dsaList.length;
  const fullyAssignedCount = dsaList.filter(
    (d) => d.assigned_loan_ops_id && d.assigned_accountant_id && d.assigned_operations_id
  ).length;
  const unassignedCount = totalDsas - fullyAssignedCount;
  const totalCasesSum = dsaList.reduce((sum, d) => sum + Number(d.total_cases || 0), 0);

  const getInitials = (name: string) =>
    name ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'DS';

  /* ─── Shared style atoms ─── */
  // Assigned badge
  const assignedBadge =
    'inline-flex items-center gap-1.5 bg-muted text-foreground px-2.5 py-1.5 rounded-lg border border-border text-[12px] max-w-[190px]';
  // Unassigned button
  const unassignedBtn =
    'inline-flex items-center gap-1 text-[12px] text-muted-foreground bg-transparent hover:bg-muted px-2.5 py-1.5 rounded-lg border border-dashed border-border font-medium transition-colors';

  return (
    <div className="space-y-5 pb-36 lg:pb-20">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <UserCheck size={22} className="text-muted-foreground" />
            DSA Management
          </h1>
          <p className="text-muted-foreground text-[13px] mt-0.5">
            Map Loan Operations, Accountant &amp; Operations team members to each DSA
          </p>
        </div>
        {selectedDsaIds.size > 0 && (
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background font-semibold rounded-xl text-sm hover:opacity-85 transition-opacity animate-in fade-in"
          >
            <Layers size={15} />
            Bulk Assign ({selectedDsaIds.size})
          </button>
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Total Registered DSAs', value: totalDsas },
          { icon: CheckCircle2, label: 'Fully Mapped DSAs', value: fullyAssignedCount },
          { icon: AlertCircle, label: 'Pending Assignment', value: unassignedCount },
          { icon: FileText, label: 'Total Files Tracked', value: totalCasesSum },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
              <Icon size={19} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + Filter ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search DSA by name, phone, refer code, or assigned officer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 transition-all placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl shrink-0">
          {(
            [
              { key: 'all', label: `All DSAs (${totalDsas})` },
              { key: 'assigned', label: `Fully Mapped (${fullyAssignedCount})` },
              { key: 'unassigned', label: `Needs Mapping (${unassignedCount})` },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Desktop Table ── */}
      <div className="hidden lg:block bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <div className="w-7 h-7 border-2 border-foreground/20 border-t-foreground/60 rounded-full animate-spin mx-auto mb-3" />
            Loading DSA records and team mappings…
          </div>
        ) : filteredDsa.length === 0 ? (
          <div className="py-16 text-center">
            <UserCheck size={34} className="mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-sm font-semibold text-foreground">No DSA users found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <th className="py-3 px-4 w-10 text-center">
                    <button
                      onClick={toggleSelectAll}
                      className="p-1 hover:text-foreground transition-colors"
                      title={allFilteredSelected ? 'Deselect all' : 'Select all'}
                    >
                      {allFilteredSelected ? (
                        <CheckSquare size={15} className="text-foreground" />
                      ) : (
                        <Square size={15} />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-9">DSA Partner</th>
                  <th className="py-3 px-9">Contact</th>
                  <th className="py-3 px-3 text-center">Files</th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={12} /> Loan Operations
                    </span>
                  </th>
                  <th className="py-3 px-8">
                    <span className="flex items-center gap-1.5">
                      <Wallet size={12} /> Accountant
                    </span>
                  </th>
                  <th className="py-3 px-8">
                    <span className="flex items-center gap-1.5">
                      <Settings2 size={12} /> Operations
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredDsa.map((dsa) => {
                  const isSelected = selectedDsaIds.has(dsa.id);
                  return (
                    <tr
                      key={dsa.id}
                      className={`hover:bg-muted/20 transition-colors ${isSelected ? 'bg-muted/30' : ''
                        }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSelectDsa(dsa.id)}
                          className="p-1 hover:text-foreground transition-colors text-muted-foreground"
                        >
                          {isSelected ? (
                            <CheckSquare size={15} className="text-foreground" />
                          ) : (
                            <Square size={15} />
                          )}
                        </button>
                      </td>

                      {/* DSA Info (Clickable -> Opens Performance Page) */}
                      <td 
                        className="py-3.5 px-4 cursor-pointer group"
                        onClick={() => navigate(`/brokers/${dsa.id}/performance`)}
                        title="Click to view DSA performance analytics"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-muted text-foreground font-bold flex items-center justify-center text-[11px] shrink-0 border border-border group-hover:border-primary/50 group-hover:bg-primary/10 transition-colors">
                            {getInitials(dsa.full_name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-foreground text-[13px] truncate group-hover:text-primary transition-colors">
                                {dsa.full_name || '(No name)'}
                              </p>
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-primary flex items-center gap-0.5 font-bold">
                                <TrendingUp size={11} />
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              View Stats <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <span className="flex items-center gap-1.5 text-[12px] text-foreground font-medium">
                          <Phone size={11} className="text-muted-foreground shrink-0" />
                          {dsa.phone || '—'}
                        </span>
                      </td>

                      {/* Files (Clickable -> Opens Performance Page) */}
                      <td 
                        className="py-3.5 px-3 text-center cursor-pointer group"
                        onClick={() => navigate(`/brokers/${dsa.id}/performance`)}
                        title="Click to view performance"
                      >
                        <span className="inline-flex flex-col items-center group-hover:scale-105 transition-transform">
                          <span className="font-bold text-foreground text-[13px] group-hover:text-primary">
                            {dsa.total_cases}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({dsa.disbursed_cases} done)
                          </span>
                        </span>
                      </td>

                      {/* Loan Operations */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        {dsa.assigned_loan_ops_id ? (
                          <div className={assignedBadge}>
                            <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 shrink-0" />
                            <p className="font-semibold truncate min-w-0">{dsa.loan_ops_name}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAssignModal(dsa);
                              }}
                              className="ml-auto p-0.5 hover:text-foreground text-muted-foreground transition-colors shrink-0"
                              title="Change"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openAssignModal(dsa);
                            }} 
                            className={unassignedBtn}
                          >
                            <UserPlus size={11} /> Assign Loan Ops
                          </button>
                        )}
                      </td>

                      {/* Accountant */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        {dsa.assigned_accountant_id ? (
                          <div className={assignedBadge}>
                            <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 shrink-0" />
                            <p className="font-semibold truncate min-w-0">{dsa.accountant_name}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAssignModal(dsa);
                              }}
                              className="ml-auto p-0.5 hover:text-foreground text-muted-foreground transition-colors shrink-0"
                              title="Change"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openAssignModal(dsa);
                            }} 
                            className={unassignedBtn}
                          >
                            <UserPlus size={11} /> Assign Accountant
                          </button>
                        )}
                      </td>

                      {/* Operations */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        {dsa.assigned_operations_id ? (
                          <div className={assignedBadge}>
                            <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 shrink-0" />
                            <p className="font-semibold truncate min-w-0">{dsa.operations_name}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAssignModal(dsa);
                              }}
                              className="ml-auto p-0.5 hover:text-foreground text-muted-foreground transition-colors shrink-0"
                              title="Change"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openAssignModal(dsa);
                            }} 
                            className={unassignedBtn}
                          >
                            <UserPlus size={11} /> Assign Operations
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Mobile Cards ── */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Loading DSA team mappings…
          </div>
        ) : filteredDsa.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">No DSA users found</p>
        ) : (
          filteredDsa.map((dsa) => {
            const isSelected = selectedDsaIds.has(dsa.id);
            return (
              <div
                key={dsa.id}
                className={`bg-card p-4 rounded-xl border transition-all space-y-3 ${isSelected ? 'border-foreground/40 bg-muted/20' : 'border-border'
                  }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div 
                    className="flex items-center gap-2.5 cursor-pointer group min-w-0"
                    onClick={() => navigate(`/brokers/${dsa.id}/performance`)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectDsa(dsa.id);
                      }}
                      className="p-1 text-muted-foreground"
                    >
                      {isSelected ? (
                        <CheckSquare size={17} className="text-foreground" />
                      ) : (
                        <Square size={17} />
                      )}
                    </button>
                    <div className="w-9 h-9 rounded-xl bg-muted text-foreground font-bold flex items-center justify-center text-[11px] shrink-0 border border-border group-hover:border-primary/50 group-hover:bg-primary/10 transition-colors">
                      {getInitials(dsa.full_name)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground text-[13px] truncate group-hover:text-primary transition-colors flex items-center gap-1">
                        {dsa.full_name} <TrendingUp size={11} />
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                        <span>#{dsa.user_id || dsa.id}</span>
                        <span>•</span>
                        <span className="text-primary font-semibold">View Stats →</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openAssignModal(dsa);
                    }}
                    className="px-3 py-1.5 bg-muted hover:bg-foreground hover:text-background text-foreground text-[12px] font-semibold rounded-lg transition-colors flex items-center gap-1 shrink-0 border border-border"
                  >
                    <Settings2 size={12} /> Assign
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-1.5 pt-2.5 border-t border-border/60">
                  {[
                    { icon: ShieldCheck, label: 'Loan Operations', value: dsa.loan_ops_name },
                    { icon: Wallet, label: 'Accountant', value: dsa.accountant_name },
                    { icon: Settings2, label: 'Operations Team', value: dsa.operations_name },
                  ].map(({ icon: Icon, label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-[12px]"
                    >
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Icon size={13} /> {label}
                      </span>
                      <span
                        className={
                          value
                            ? 'font-semibold text-foreground'
                            : 'italic text-muted-foreground font-normal'
                        }
                      >
                        {value || 'Not Assigned'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Floating Bulk Bar ── */}
      {selectedDsaIds.size > 0 && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-foreground text-background px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-2xl flex items-center justify-between sm:justify-start gap-2.5 sm:gap-4 max-w-[calc(100vw-1.5rem)] w-auto whitespace-nowrap animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-background/60 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold">
              {selectedDsaIds.size} {selectedDsaIds.size === 1 ? 'DSA' : 'DSAs'} Selected
            </span>
          </div>
          <div className="h-4 w-px bg-background/20 shrink-0" />
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 bg-background text-foreground text-xs font-bold rounded-xl hover:opacity-85 transition-opacity shrink-0 cursor-pointer shadow-sm"
          >
            <Layers size={13} /> Bulk Assign Team
          </button>
          <button
            onClick={() => setSelectedDsaIds(new Set())}
            className="text-xs opacity-60 hover:opacity-100 underline transition-opacity shrink-0 cursor-pointer px-1"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Single Assign Modal ── */}
      {isModalOpen && selectedDsa && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
              <div>
                <h2 className="text-[15px] font-bold text-foreground flex items-center gap-2">
                  <Settings2 size={17} className="text-muted-foreground" />
                  Map Team — {selectedDsa.full_name}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  DSA ID: #{selectedDsa.user_id || selectedDsa.id} &bull; Phone:{' '}
                  {selectedDsa.phone || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="p-5 space-y-4">
              {[
                {
                  icon: ShieldCheck,
                  label: 'Loan Operations Officer',
                  hint: 'Responsible for reviewing and advancing loan application stages.',
                  value: formLoanOpsId,
                  onChange: setFormLoanOpsId,
                  options: staff?.loanOperations || [],
                  placeholder: '— No Loan Operations Assigned —',
                },
                {
                  icon: Wallet,
                  label: 'Assigned Accountant',
                  hint: 'Handles disbursement ledger, billing, and payout calculations.',
                  value: formAccountantId,
                  onChange: setFormAccountantId,
                  options: staff?.accountants || [],
                  placeholder: '— No Accountant Assigned —',
                },
                {
                  icon: Settings2,
                  label: 'Operations Team Member',
                  hint: 'Oversees PDD collection, verification calls, and general operations.',
                  value: formOperationsId,
                  onChange: setFormOperationsId,
                  options: staff?.operations || [],
                  placeholder: '— No Operations Team Assigned —',
                },
              ].map(({ icon: Icon, label, hint, value, onChange, options, placeholder }) => (
                <div key={label}>
                  <label className="block text-[12px] font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Icon size={13} className="text-muted-foreground" />
                    {label}
                  </label>
                  <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 transition-all"
                  >
                    <option value="">{placeholder}</option>
                    {options.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} {u.phone ? `(${u.phone})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
                </div>
              ))}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-85 transition-opacity disabled:opacity-40"
                >
                  {assignMutation.isPending ? 'Saving…' : 'Save Team Mapping'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Assign Modal ── */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
              <div>
                <h2 className="text-[15px] font-bold text-foreground flex items-center gap-2">
                  <Layers size={17} className="text-muted-foreground" />
                  Bulk Assign — {selectedDsaIds.size} DSAs Selected
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Select which roles to update across all chosen DSAs
                </p>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSaveBulkAssignment} className="p-5 space-y-4">
              {/* DSA preview */}
              <div className="p-3 bg-muted/40 rounded-xl text-[12px] space-y-1 border border-border">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles size={12} className="text-muted-foreground" />
                  Selected DSAs ({selectedDsaIds.size})
                </p>
                <p className="text-muted-foreground truncate">
                  {dsaList
                    .filter((d) => selectedDsaIds.has(d.id))
                    .map((d) => d.full_name)
                    .join(', ')}
                </p>
              </div>

              {[
                {
                  icon: ShieldCheck,
                  label: 'Update Loan Operations',
                  checked: bulkUpdateLoanOps,
                  onCheck: setBulkUpdateLoanOps,
                  value: bulkLoanOpsId,
                  onChange: setBulkLoanOpsId,
                  options: staff?.loanOperations || [],
                  placeholder: '— Remove / Clear Loan Operations —',
                },
                {
                  icon: Wallet,
                  label: 'Update Accountant',
                  checked: bulkUpdateAccountant,
                  onCheck: setBulkUpdateAccountant,
                  value: bulkAccountantId,
                  onChange: setBulkAccountantId,
                  options: staff?.accountants || [],
                  placeholder: '— Remove / Clear Accountant —',
                },
                {
                  icon: Settings2,
                  label: 'Update Operations Team',
                  checked: bulkUpdateOperations,
                  onCheck: setBulkUpdateOperations,
                  value: bulkOperationsId,
                  onChange: setBulkOperationsId,
                  options: staff?.operations || [],
                  placeholder: '— Remove / Clear Operations Team —',
                },
              ].map(({ icon: Icon, label, checked, onCheck, value, onChange, options, placeholder }) => (
                <div key={label} className="p-3.5 rounded-xl border border-border bg-muted/10 space-y-2.5">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-[12px] font-bold text-foreground flex items-center gap-2">
                      <Icon size={14} className="text-muted-foreground" />
                      {label}
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => onCheck(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                  </label>
                  {checked && (
                    <select
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[12px] focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 transition-all"
                    >
                      <option value="">{placeholder}</option>
                      {options.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name} {u.phone ? `(${u.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkAssignMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-85 transition-opacity disabled:opacity-40"
                >
                  {bulkAssignMutation.isPending
                    ? 'Updating DSAs…'
                    : `Apply to ${selectedDsaIds.size} DSAs`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
