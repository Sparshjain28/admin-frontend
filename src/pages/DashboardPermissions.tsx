import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save, Lock, RotateCcw, AlertCircle, ChevronDown, ChevronUp, Shield, LayoutDashboard, FileText, Users, Settings, Phone, CreditCard, BarChart3, Wallet, Receipt, MapPin, Database, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const API = () => import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authH = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` });

import { ALL_ROLES, PAGES } from '@/config/permissions';


const DASHBOARD_COMPONENTS = [
  { key: 'loginVolume', label: '📊 Login Volume Chart', description: 'Shows login count by bank' },
  { key: 'disbursement', label: '💰 Disbursement Chart', description: 'Shows disbursement amount by bank' },
  { key: 'approvedLoans', label: '✅ Approved Loans Card', description: 'Displays approved loan statistics' },
  { key: 'performanceChart', label: '📈 Performance Chart', description: 'Shows performance trend over time' },
  { key: 'stageDistribution', label: '🎯 Stage Distribution Pie', description: 'Pie chart of application stages' },
  { key: 'bankDistribution', label: '🏢 Bank Distribution Pie', description: 'Pie chart of bank distribution' },
  { key: 'statusDistribution', label: '📊 Status Distribution Pie', description: 'Pie chart of status distribution' },
  { key: 'timer', label: '⏱️ 24-Hour Stage Timer', description: 'Shows countdown timer for stage transitions' },
];

const ROLES_FOR_DASHBOARD = [
  { key: 'sales_manager', label: 'Sales Manager' },
  { key: 'branch_manager', label: 'Branch Manager' },
  { key: 'team_leader', label: 'Team Leader' },
  { key: 'executive', label: 'Executive' },
  { key: 'dsa', label: 'DSA' },
];

type PagePerms = Record<string, Record<string, boolean>>; // pageKey -> roleKey -> bool

export default function DashboardPermissions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'pages' | 'dashboard'>('pages');
  const [selectedRole, setSelectedRole] = useState('sales_manager');
  const [expandedRole, setExpandedRole] = useState(true);

  // Dashboard component permissions
  const [permissions, setPermissions] = useState<any>({});
  const [initialPermissions, setInitialPermissions] = useState<any>({});
  const [globalTimerEnabled, setGlobalTimerEnabled] = useState(true);
  const [isTogglingTimer, setIsTogglingTimer] = useState(false);

  // Page access permissions
  const [pagePerms, setPagePerms] = useState<PagePerms>({});
  const [initialPagePerms, setInitialPagePerms] = useState<PagePerms>({});
  const [savingPagePerms, setSavingPagePerms] = useState(false);

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Lock size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-6">Only administrators can manage permissions</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90">Go Back</button>
      </div>
    );
  }

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: allPermissions, isLoading: loadingDash } = useQuery({
    queryKey: ['dashboard-permissions'],
    queryFn: async () => {
      const res = await fetch(`${API()}/permissions/dashboard`, { headers: authH() });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const res = await fetch(`${API()}/config`, { headers: authH() });
      return res.ok ? res.json() : [];
    },
  });

  // ── Init dashboard perms ─────────────────────────────────────────────────────
  useEffect(() => {
    if (allPermissions) {
      setPermissions(allPermissions);
      setInitialPermissions(JSON.parse(JSON.stringify(allPermissions)));
      const timerConfig = configs.find((c: any) => c.config_key === 'login_stage_enabled');
      const configEnabled = timerConfig ? timerConfig.config_value === 'true' : true;
      const anyTimerEnabled = Object.values(allPermissions).some((p: any) => p?.dashboard?.components?.timer === true);
      setGlobalTimerEnabled(configEnabled && anyTimerEnabled);
    }
  }, [allPermissions, configs]);

  // ── Init page perms from system config ───────────────────────────────────────
  useEffect(() => {
    if (!configs.length) return;
    const perms: PagePerms = {};
    PAGES.forEach(group => {
      group.items.forEach(page => {
        perms[page.key] = {};
        ALL_ROLES.forEach(role => {
          const configKey = `page_access_${page.key}_${role.key}`;
          const found = configs.find((c: any) => c.config_key === configKey);
          // If config exists use it, otherwise fall back to defaultRoles
          perms[page.key][role.key] = found
            ? found.config_value === 'true'
            : page.defaultRoles.includes(role.key);
        });
      });
    });
    setPagePerms(perms);
    setInitialPagePerms(JSON.parse(JSON.stringify(perms)));
  }, [configs]);

  // ── Save page perms ──────────────────────────────────────────────────────────
  const savePagePerms = async () => {
    setSavingPagePerms(true);
    try {
      const pairs: { key: string; value: string }[] = [];
      PAGES.forEach(group => {
        group.items.forEach(page => {
          ALL_ROLES.forEach(role => {
            pairs.push({
              key: `page_access_${page.key}_${role.key}`,
              value: (pagePerms[page.key]?.[role.key] ?? page.defaultRoles.includes(role.key)) ? 'true' : 'false',
            });
          });
        });
      });
      await Promise.all(pairs.map(p =>
        fetch(`${API()}/config/key/${p.key}`, {
          method: 'PATCH',
          headers: authH(),
          body: JSON.stringify({ config_value: p.value, config_type: 'page_permissions', description: `Page access: ${p.key}` }),
        })
      ));
      setInitialPagePerms(JSON.parse(JSON.stringify(pagePerms)));
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Page permissions saved');
    } catch {
      toast.error('Failed to save page permissions');
    } finally {
      setSavingPagePerms(false);
    }
  };

  const togglePageRole = (pageKey: string, roleKey: string) => {
    setPagePerms(prev => ({
      ...prev,
      [pageKey]: { ...prev[pageKey], [roleKey]: !prev[pageKey]?.[roleKey] },
    }));
  };

  const toggleAllForRole = (roleKey: string, value: boolean) => {
    setPagePerms(prev => {
      const next = { ...prev };
      PAGES.forEach(g => g.items.forEach(p => {
        next[p.key] = { ...next[p.key], [roleKey]: value };
      }));
      return next;
    });
  };

  // ── Dashboard component perms ────────────────────────────────────────────────
  const savePermissions = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API()}/permissions/dashboard`, {
        method: 'PUT', headers: authH(),
        body: JSON.stringify({ role: selectedRole, permissions: permissions[selectedRole] }),
      });
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: () => {
      setInitialPermissions(JSON.parse(JSON.stringify(permissions)));
      queryClient.invalidateQueries({ queryKey: ['dashboard-permissions'] });
      toast.success('Dashboard permissions saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetPermissions = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API()}/permissions/dashboard/reset`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ role: selectedRole }),
      });
      if (!res.ok) throw new Error('Failed to reset');
      return res.json();
    },
    onSuccess: (data) => {
      setPermissions((prev: any) => ({ ...prev, [selectedRole]: data.permissions }));
      setInitialPermissions((prev: any) => ({ ...prev, [selectedRole]: data.permissions }));
      queryClient.invalidateQueries({ queryKey: ['dashboard-permissions'] });
      toast.success('Reset to defaults');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleGlobalTimer = async () => {
    setIsTogglingTimer(true);
    try {
      const next = !globalTimerEnabled;
      await fetch(`${API()}/config/key/login_stage_enabled`, {
        method: 'PATCH', headers: authH(),
        body: JSON.stringify({ config_value: next ? 'true' : 'false' }),
      });
      const updated = { ...permissions };
      Object.keys(updated).forEach(role => {
        updated[role] = { ...updated[role], dashboard: { ...updated[role]?.dashboard, components: { ...updated[role]?.dashboard?.components, timer: next } } };
      });
      for (const role of Object.keys(updated)) {
        await fetch(`${API()}/permissions/dashboard`, {
          method: 'PUT', headers: authH(),
          body: JSON.stringify({ role, permissions: updated[role] }),
        });
      }
      setPermissions(updated);
      setInitialPermissions(JSON.parse(JSON.stringify(updated)));
      setGlobalTimerEnabled(next);
      queryClient.invalidateQueries({ queryKey: ['dashboard-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success(`Timer ${next ? 'enabled' : 'disabled'} for all roles`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsTogglingTimer(false);
    }
  };

  const toggleComponentPermission = (componentKey: string) => {
    setPermissions((prev: any) => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        components: { ...prev[selectedRole]?.components, [componentKey]: !prev[selectedRole]?.components?.[componentKey] },
      },
    }));
  };

  const currentRolePermissions = permissions[selectedRole] || {};
  const isDashChanged = JSON.stringify(permissions[selectedRole]) !== JSON.stringify(initialPermissions[selectedRole]);
  const isPageChanged = JSON.stringify(pagePerms) !== JSON.stringify(initialPagePerms);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-24 lg:pb-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Control page access and dashboard components per role</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-xl w-fit mb-6 border border-border">
        {[
          { key: 'pages', label: '🗂️ Page Access', desc: 'Who sees which pages' },
          { key: 'dashboard', label: '📊 Dashboard Components', desc: 'Widget visibility' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.key ? 'bg-background shadow-sm text-foreground border border-border' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── PAGE ACCESS TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'pages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">Check a role to grant access to that page. Admin always has full access.</p>
            <button
              onClick={savePagePerms}
              disabled={savingPagePerms || !isPageChanged}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
            >
              <Save size={15} />
              {savingPagePerms ? 'Saving...' : 'Save Page Permissions'}
            </button>
          </div>

          {isPageChanged && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
              <AlertCircle size={15} className="text-amber-600 shrink-0" />
              <span className="text-sm text-amber-700 dark:text-amber-300">You have unsaved changes</span>
            </div>
          )}

          {/* Role header row */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-muted/60 backdrop-blur border-b border-border">
              <div className="grid items-center px-4 py-3" style={{ gridTemplateColumns: '200px repeat(8, 1fr)' }}>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Page</p>
                {ALL_ROLES.map(role => (
                  <div key={role.key} className="flex flex-col items-center gap-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide text-center leading-tight">{role.label}</p>
                    <div className="flex gap-1">
                      <button onClick={() => toggleAllForRole(role.key, true)} className="text-[9px] text-emerald-600 hover:underline font-bold">All</button>
                      <span className="text-[9px] text-muted-foreground">/</span>
                      <button onClick={() => toggleAllForRole(role.key, false)} className="text-[9px] text-red-500 hover:underline font-bold">None</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Page rows grouped */}
            {PAGES.map((group, gi) => (
              <div key={group.group}>
                {/* Group label */}
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/20 border-b border-border/50">
                  <span className="text-muted-foreground">{group.icon}</span>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{group.group}</p>
                </div>
                {group.items.map((page, pi) => {
                  const isLast = gi === PAGES.length - 1 && pi === group.items.length - 1;
                  return (
                    <div
                      key={page.key}
                      className={`grid items-center px-4 py-3 hover:bg-muted/20 transition-colors ${!isLast ? 'border-b border-border/40' : ''}`}
                      style={{ gridTemplateColumns: '200px repeat(8, 1fr)' }}
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{page.label}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{page.path}</p>
                      </div>
                      {ALL_ROLES.map(role => {
                        const checked = pagePerms[page.key]?.[role.key] ?? page.defaultRoles.includes(role.key);
                        return (
                          <div key={role.key} className="flex justify-center">
                            <button
                              onClick={() => togglePageRole(page.key, role.key)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${checked ? 'bg-primary border-primary' : 'border-border hover:border-primary/50'}`}
                            >
                              {checked && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Note:</strong> Admin always has access to all pages. Changes here update the sidebar navigation and route access for each role in real time after saving.
            </p>
          </div>
        </div>
      )}

      {/* ── DASHBOARD COMPONENTS TAB ─────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left sidebar — roles */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border overflow-hidden sticky top-4">
              <div className="p-4 bg-muted/30 border-b border-border">
                <h3 className="font-semibold text-foreground text-sm">Select Role</h3>
              </div>
              <div className="divide-y divide-border">
                {ROLES_FOR_DASHBOARD.map(r => (
                  <button
                    key={r.key}
                    onClick={() => setSelectedRole(r.key)}
                    className={`w-full text-left px-4 py-3 transition-colors text-sm font-medium ${selectedRole === r.key ? 'bg-primary/10 border-l-4 border-primary text-primary' : 'text-foreground hover:bg-muted/50'}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right — components */}
          <div className="lg:col-span-3 space-y-4">
            {/* Actions */}
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={toggleGlobalTimer}
                disabled={isTogglingTimer}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${globalTimerEnabled ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-500 hover:bg-gray-600 text-white'} disabled:opacity-50`}
              >
                ⏱️ Timer: {isTogglingTimer ? 'Updating...' : globalTimerEnabled ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => resetPermissions.mutate()}
                disabled={resetPermissions.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium text-sm transition-colors"
              >
                <RotateCcw size={15} /> Reset
              </button>
              <button
                onClick={() => savePermissions.mutate()}
                disabled={savePermissions.isPending || !isDashChanged}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-sm transition-colors"
              >
                <Save size={15} />
                {savePermissions.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {isDashChanged && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-600 shrink-0" />
                <span className="text-sm text-amber-700 dark:text-amber-300">You have unsaved changes</span>
              </div>
            )}

            {loadingDash ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => setExpandedRole(!expandedRole)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📊</span>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">Dashboard Components</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Visible to <span className="font-bold text-foreground">{ROLES_FOR_DASHBOARD.find(r => r.key === selectedRole)?.label}</span>
                      </p>
                    </div>
                  </div>
                  {expandedRole ? <ChevronUp size={16} className="text-primary" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>

                {expandedRole && (
                  <div className="border-t border-border p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {DASHBOARD_COMPONENTS.map(comp => (
                        <label
                          key={comp.key}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 cursor-pointer border border-border/50 hover:border-primary/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={currentRolePermissions.components?.[comp.key] || false}
                            onChange={() => toggleComponentPermission(comp.key)}
                            className="w-4 h-4 rounded border-border cursor-pointer mt-0.5 shrink-0"
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">{comp.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{comp.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>Note:</strong> Admin always has access to all dashboard components.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
