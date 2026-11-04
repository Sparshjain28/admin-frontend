import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save, Lock, Users, UsersRound, Eye, Edit, Trash2, ChevronDown, ChevronUp, ChevronRight, RotateCcw, AlertCircle, Power, PowerOff, Plus, UserCheck, Download, ArrowLeftRight, LayoutDashboard, LayoutGrid, FileBarChart, Settings2, ShieldCheck, ShieldAlert, Calculator, Plug, Banknote, Phone, FileClock, Gauge, Receipt, Link2, Database, Search, Car, Building2, Handshake, GitBranch, ScrollText, BookOpen, Activity, ClipboardList, X, } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ROLES, MODULES } from '@/config/permissions';

// ---------------------------------------------------------------------------
// Presentation helpers (visual only)
// ---------------------------------------------------------------------------
const PERMISSION_ICONS: Record<string, any> = {
  create: Plus,
  read: Eye,
  view: Eye,
  update: Edit,
  delete: Trash2,
  assign: UserCheck,
  viewAll: Users,
  updateStage: ArrowLeftRight,
  export: Download,
};

// Maps a module key to a representative icon shown in the accordion header.
const MODULE_ICONS: Record<string, any> = {
  dashboard: LayoutDashboard,
  leads: UsersRound,
  loans: Banknote,
  users: Users,
  reports: FileBarChart,
  settings: Settings2,
  permissions: ShieldCheck,
  accountant: Calculator,
  api_tools: Plug,
  team: UsersRound,
  offline_disbursement: Banknote,
  calling: Phone,
  credit_reports: FileClock,
  rc_limits: Gauge,
  expenses: Receipt,
  insurance: ShieldAlert,
  link_loan_finder: Link2,
  account_aggregator: Database,
  find_lender: Search,
  find_car_value: Car,
  payouts: Banknote,
  banks: Building2,
  brokers: Handshake,
  branches: GitBranch,
  audit_logs: ScrollText,
  policy_maker: BookOpen,
  api_usage: Activity,
  api_usage_logs: FileClock,
  api_integrations: Plug,
  db_view: Database,
  operations_leads: ClipboardList,
};

// Palette used to give each role a consistent, distinguishable avatar color.
const ROLE_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-teal-500',
  'bg-orange-500',
];

function colorForKey(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return ROLE_COLORS[Math.abs(hash) % ROLE_COLORS.length];
}

function initialsForLabel(label: string) {
  const parts = label.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatPermissionLabel(key: string) {
  const spaced = key.replace(/([A-Z])/g, ' $1');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function PermissionToggle({
  permKey,
  checked,
  onChange,
  icon,
}: {
  permKey: string;
  checked: boolean;
  onChange: () => void;
  icon?: any;
}) {
  const Icon = icon || PERMISSION_ICONS[permKey] || ShieldCheck;
  return (
    <label className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/40 cursor-pointer transition-colors">
      <span className="flex items-center gap-2.5 min-w-0">
        <span
          className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors ${
            checked ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          }`}
        >
          <Icon size={14} />
        </span>
        <span className="text-sm text-foreground truncate">{formatPermissionLabel(permKey)}</span>
      </span>
      <span className="relative inline-flex items-center shrink-0">
        <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
        <span className="w-9 h-5 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
        <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------

export default function FieldPermissions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState('sales_manager');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(Object.keys(MODULES))
  );
  const [permissions, setPermissions] = useState<any>({});
  const [initialPermissions, setInitialPermissions] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  // User selection and user overrides state
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userEditedPermissions, setUserEditedPermissions] = useState<any>(null);
  const [initialUserPermissions, setInitialUserPermissions] = useState<any>(null);

  // Clear user override selection when role changes
  useEffect(() => {
    setSelectedUserId(null);
  }, [selectedRole]);

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <Lock size={28} className="text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">Only administrators can manage permissions</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Fetch all roles' default permissions
  const { data: allPermissions, isLoading } = useQuery({
    queryKey: ['all-permissions'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/permissions/all`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch permissions');
      return await res.json();
    },
  });

  // Fetch users belonging to the currently selected role
  const { data: roleUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users-by-role', selectedRole],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/by-role?roles=${selectedRole}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      return await res.json();
    },
    enabled: !!selectedRole
  });

  // Fetch user-specific permissions when a user is selected
  const { data: selectedUserPerms, isLoading: isLoadingUserPerms } = useQuery({
    queryKey: ['user-permissions', selectedUserId],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/permissions/user/${selectedUserId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch user permissions');
      return await res.json();
    },
    enabled: !!selectedUserId
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

  // Sync role default permissions
  useEffect(() => {
    if (allPermissions) {
      setPermissions(allPermissions);
      setInitialPermissions(JSON.parse(JSON.stringify(allPermissions)));
    }
  }, [allPermissions]);

  // Sync user-specific override permissions
  useEffect(() => {
    if (selectedUserId && selectedUserPerms) {
      setUserEditedPermissions(selectedUserPerms.mergedPermissions);
      setInitialUserPermissions(JSON.parse(JSON.stringify(selectedUserPerms.mergedPermissions)));
    } else {
      setUserEditedPermissions(null);
      setInitialUserPermissions(null);
    }
  }, [selectedUserId, selectedUserPerms]);

  // Mutation to save role permissions
  const savePermissions = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ role: selectedRole, permissions: permissions[selectedRole] }),
      });
      if (!res.ok) throw new Error('Failed to save permissions');
      return res.json();
    },
    onSuccess: () => {
      setInitialPermissions(JSON.parse(JSON.stringify(permissions)));
      queryClient.invalidateQueries({ queryKey: ['all-permissions'] });
      toast.success('Role permissions saved successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save permissions');
    },
  });

  // Mutation to save user-specific permission overrides
  const saveUserPermissions = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/permissions/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ userId: selectedUserId, permissions: userEditedPermissions }),
      });
      if (!res.ok) throw new Error('Failed to save user permissions');
      return res.json();
    },
    onSuccess: () => {
      setInitialUserPermissions(JSON.parse(JSON.stringify(userEditedPermissions)));
      queryClient.invalidateQueries({ queryKey: ['user-permissions', selectedUserId] });
      toast.success('User permission overrides saved successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save user permissions');
    },
  });

  // Mutation to reset role permissions to defaults
  const resetPermissions = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/permissions/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ role: selectedRole }),
      });
      if (!res.ok) throw new Error('Failed to reset permissions');
      return res.json();
    },
    onSuccess: (data) => {
      setPermissions(prev => ({ ...prev, [selectedRole]: data.permissions }));
      setInitialPermissions(prev => ({ ...prev, [selectedRole]: data.permissions }));
      queryClient.invalidateQueries({ queryKey: ['all-permissions'] });
      toast.success('Role permissions reset to defaults');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reset permissions');
    },
  });

  // Mutation to reset user permissions (removes all override rows)
  const resetUserPermissions = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/permissions/user/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      if (!res.ok) throw new Error('Failed to reset user permissions');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', selectedUserId] });
      toast.success('User permission overrides reset successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reset user permissions');
    },
  });

  const toggleStage = useMutation({
    mutationFn: async ({ stage_type, enabled }: any) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/config/toggle-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ stage_type, enabled })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle stage');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to toggle stage');
    },
  });

  // Toggle handlers that differentiate between role defaults and user overrides
  const toggleModulePermission = (module: string, permission: string) => {
    if (selectedUserId) {
      setUserEditedPermissions((prev: any) => ({
        ...prev,
        [module]: {
          ...prev?.[module],
          [permission]: !prev?.[module]?.[permission]
        }
      }));
    } else {
      setPermissions((prev: any) => ({
        ...prev,
        [selectedRole]: {
          ...prev[selectedRole],
          [module]: {
            ...prev[selectedRole]?.[module],
            [permission]: !prev[selectedRole]?.[module]?.[permission]
          }
        }
      }));
    }
  };

  const toggleNestedPermission = (module: string, section: string, permission: string) => {
    if (selectedUserId) {
      setUserEditedPermissions((prev: any) => ({
        ...prev,
        [module]: {
          ...prev?.[module],
          [section]: {
            ...prev?.[module]?.[section],
            [permission]: !prev?.[module]?.[section]?.[permission]
          }
        }
      }));
    } else {
      setPermissions((prev: any) => ({
        ...prev,
        [selectedRole]: {
          ...prev[selectedRole],
          [module]: {
            ...prev[selectedRole]?.[module],
            [section]: {
              ...prev[selectedRole]?.[module]?.[section],
              [permission]: !prev[selectedRole]?.[module]?.[section]?.[permission]
            }
          }
        }
      }));
    }
  };

  const toggleModule = (module: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(module)) {
      newExpanded.delete(module);
    } else {
      newExpanded.add(module);
    }
    setExpandedModules(newExpanded);
  };

  // Resolve current active permission tree to show
  const currentRolePermissions = selectedUserId ? (userEditedPermissions || {}) : (permissions[selectedRole] || {});
  const isChanged = JSON.stringify(permissions[selectedRole]) !== JSON.stringify(initialPermissions[selectedRole]);
  const isUserChanged = JSON.stringify(userEditedPermissions) !== JSON.stringify(initialUserPermissions);
  const hasUnsavedChanges = selectedUserId ? isUserChanged : isChanged;

  const handleToggleStage = (stage_type: string, enabled: boolean) => {
    toggleStage.mutate({ stage_type, enabled });
  };

  const isStageEnabled = (stage: string) => {
    const config = configs.find((c: any) => c.config_key === `${stage}_stage_enabled`);
    // Default to true (enabled) if config not found
    if (!config) return true;
    return config.config_value === 'true';
  };

  useEffect(() => {
  console.log(`========== ${selectedRole} ==========`);

  if (roleUsers.length === 0) {
    console.log("No users found.");
  } else {
    console.log(`Total Users : ${roleUsers.length}`);

    roleUsers.forEach((user, index) => {
      console.log(
        `${index + 1}. ${user.full_name} (${user.user_id})`
      );
    });
  }
}, [selectedRole, roleUsers]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <div className="mb-6 rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary shrink-0">
              <ShieldCheck size={22} />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                {selectedUserId ? 'User Permissions Override' : 'Role Permissions'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedUserId ? (
                  <>
                    Modifying overrides for <span className="font-semibold text-primary">{selectedUserPerms?.userName || 'Loading...'}</span>{' '}
                    <span className="text-muted-foreground">({selectedUserPerms?.userEmail})</span>
                  </>
                ) : (
                  'Manage access control for all modules and features (Admin has full access)'
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                if (selectedUserId) {
                  resetUserPermissions.mutate();
                } else {
                  resetPermissions.mutate();
                }
              }}
              disabled={selectedUserId ? resetUserPermissions.isPending : resetPermissions.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 disabled:cursor-not-allowed text-white text-sm font-medium shadow-sm transition-colors"
            >
              <RotateCcw size={16} />
              {selectedUserId ? (resetUserPermissions.isPending ? 'Resetting...' : 'Reset User Overrides') : 'Reset Role Defaults'}
            </button>
            <button
              onClick={() => {
                if (selectedUserId) {
                  saveUserPermissions.mutate();
                } else {
                  savePermissions.mutate();
                }
              }}
              disabled={selectedUserId ? (saveUserPermissions.isPending || !isUserChanged) : (savePermissions.isPending || !isChanged)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white text-sm font-medium shadow-sm transition-colors"
            >
              <Save size={16} />
              {selectedUserId ? (saveUserPermissions.isPending ? 'Saving...' : 'Save User Overrides') : (savePermissions.isPending ? 'Saving...' : 'Save Changes')}
            </button>
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span className="text-sm text-amber-700 dark:text-amber-300">You have unsaved changes</span>
          </div>
        )}
      </div>

      {/* Stage Access Control Section */}
      <div className="mb-6 bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 bg-muted/30 border-b border-border flex items-center gap-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
            <Lock size={16} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground leading-tight">Stage Access Control</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Enable or disable Lead and Login stages for 24 hours</p>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-xl p-4 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${isStageEnabled('lead') ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                    {isStageEnabled('lead') ? <Power size={18} /> : <PowerOff size={18} />}
                  </span>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">Lead Stage</h3>
                    <p className="text-xs text-muted-foreground">Control lead creation and access</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${isStageEnabled('lead') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                  {isStageEnabled('lead') ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleStage('lead', true)}
                  disabled={isStageEnabled('lead')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  <Power size={14} /> Enable
                </button>
                <button
                  onClick={() => handleToggleStage('lead', false)}
                  disabled={!isStageEnabled('lead')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  <PowerOff size={14} /> Disable 24hrs
                </button>
              </div>
            </div>

            <div className="border rounded-xl p-4 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${isStageEnabled('login') ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                    {isStageEnabled('login') ? <Power size={18} /> : <PowerOff size={18} />}
                  </span>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">Login Stage</h3>
                    <p className="text-xs text-muted-foreground">Control login stage access</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${isStageEnabled('login') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                  {isStageEnabled('login') ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleStage('login', true)}
                  disabled={isStageEnabled('login')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  <Power size={14} /> Enable
                </button>
                <button
                  onClick={() => handleToggleStage('login', false)}
                  disabled={!isStageEnabled('login')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  <PowerOff size={14} /> Disable 24hrs
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Roles */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-2xl border border-border overflow-hidden sticky top-4">
            <div className="p-4 bg-muted/30 border-b border-border flex items-center gap-2">
              <Users size={14} className="text-muted-foreground" />
              <h3 className="font-semibold text-foreground text-sm">Select Role</h3>
            </div>
                <div className="divide-y divide-border border-l-4 border-border">
                  {Object.entries(ROLES).map(([roleKey, roleData]: any) => (
                    <button
                      key={roleKey}
                      onClick={() => setSelectedRole(roleKey)}
                      className={`w-full flex items-center justify-between gap-2 text-left px-4 py-3 transition-colors ${
                        selectedRole === roleKey
                          ? "bg-primary/10"
                          : "hover:bg-muted/50"
                      }`}
                    >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className={`flex items-center justify-center w-8 h-8 rounded-full text-white text-[11px] font-semibold shrink-0 ${colorForKey(roleKey)}`}>
                      {initialsForLabel(roleData.label)}
                    </span>
                    <span className="font-medium text-foreground text-sm truncate">{roleData.label}</span>
                  </span>
                  {selectedRole === roleKey && <ChevronRight size={16} className="text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content - Permissions */}
        <div className="lg:col-span-3 space-y-4">
          {/* User selection card */}
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm bg-gradient-to-br from-card to-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
                  <UserCheck size={16} />
                </span>
                <div>
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 flex-wrap">
                    User Override (Optional)
                    {!isLoadingUsers && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {roleUsers.length} Users
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select a user of this role to customize specific override permissions.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {isLoadingUsers ? (
                  <span className="text-xs text-muted-foreground">Loading users...</span>
                ) : (
                  <select
                    value={selectedUserId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedUserId(val ? parseInt(val) : null);
                    }}
                    className="bg-background text-foreground border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary min-w-[220px] transition-colors"
                  >
                    <option value="">-- Apply to Role Defaults --</option>
                    {roleUsers.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.user_id})
                      </option>
                    ))}
                  </select>
                )}
                {selectedUserId && (
                  <button
                    onClick={() => setSelectedUserId(null)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border"
                  >
                    <X size={12} /> Clear Override
                  </button>
                )}
              </div>
            </div>
          </div>

          {isLoading || (selectedUserId && isLoadingUserPerms) ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                {isLoading ? 'Loading system permissions...' : 'Loading user override permissions...'}
              </p>
            </div>
          ) : (
            Object.entries(MODULES).map(([moduleKey, moduleData]: any) => {
              const ModuleIcon = MODULE_ICONS[moduleKey] || LayoutGrid;
              return (
              <div key={moduleKey} className="bg-card rounded-2xl border border-border overflow-hidden">
                <button
                  onClick={() => toggleModule(moduleKey)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
                      <ModuleIcon size={17} />
                    </span>
                    <h3 className="font-semibold text-foreground">{moduleData.label}</h3>
                  </div>
                  {expandedModules.has(moduleKey) ? (
                    <ChevronUp size={18} className="text-primary" />
                  ) : (
                    // <ChevronDown size={18} className="text-muted-foreground" />
                    <ChevronDown
                      size={18}
                      className={`transition-transform duration-500 ${
                        expandedModules.has(moduleKey) ? "rotate-180" : ""
                      }`}
                      style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
                    />
                  )}
                </button>

                {/* {expandedModules.has(moduleKey) && (
                  <div className="border-t border-border p-4 space-y-3">
                  </div>
                )} */}

              <div
                className={`
                  grid transition-all duration-500 ease-in-out
                  ${
                    expandedModules.has(moduleKey)
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }
                `}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-border p-4 space-y-3">
                    {moduleKey === 'dashboard' && (
                      <>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-2">Dashboard Access</p>
                          <PermissionToggle
                            permKey="view"
                            checked={currentRolePermissions.dashboard?.view || false}
                            onChange={() => toggleModulePermission('dashboard', 'view')}
                          />
                          <PermissionToggle
                            permKey="export"
                            checked={currentRolePermissions.dashboard?.export || false}
                            onChange={() => toggleModulePermission('dashboard', 'export')}
                          />
                        </div>
                        <div className="space-y-1 pt-3 border-t border-border/50">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-2">Dashboard Components</p>
                          {[
                            { key: 'loginVolume', label: 'Login Volume Chart', icon: Activity },
                            { key: 'disbursement', label: 'Disbursement Chart', icon: Banknote },
                            { key: 'approvedLoans', label: 'Approved Loans Card', icon: ShieldCheck },
                            { key: 'performanceChart', label: 'Performance Chart', icon: FileBarChart },
                            { key: 'stageDistribution', label: 'Stage Distribution Pie', icon: Gauge },
                            { key: 'bankDistribution', label: 'Bank Distribution Pie', icon: Building2 },
                            { key: 'statusDistribution', label: 'Status Distribution Pie', icon: FileBarChart },
                            { key: 'timer', label: 'Timer', icon: FileClock },
                          ].map(comp => (
                            <label key={comp.key} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/40 cursor-pointer transition-colors">
                              <span className="flex items-center gap-2.5 min-w-0">
                                <span className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors ${currentRolePermissions.dashboard?.components?.[comp.key] ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                  <comp.icon size={14} />
                                </span>
                                <span className="text-sm text-foreground truncate">{comp.label}</span>
                              </span>
                              <span className="relative inline-flex items-center shrink-0">
                                <input
                                  type="checkbox"
                                  checked={currentRolePermissions.dashboard?.components?.[comp.key] || false}
                                  onChange={() => toggleNestedPermission('dashboard', 'components', comp.key)}
                                  className="peer sr-only"
                                />
                                <span className="w-9 h-5 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
                                <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                              </span>
                            </label>
                          ))}
                        </div>
                      </>
                    )}

                    {moduleKey === "leads" && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-2">Lead Permissions</p>
                        {["create", "read", "update", "delete", "assign", "viewAll"].map((perm) => (
                          <PermissionToggle
                            key={perm}
                            permKey={perm}
                            checked={currentRolePermissions.leads?.[perm] || false}
                            onChange={() => toggleModulePermission("leads", perm)}
                          />
                        ))}
                      </div>
                    )}

                    {moduleKey === "loans" && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-2">Loan Permissions</p>
                        {["create", "read", "update", "delete", "updateStage", "viewAll"].map((perm) => (
                          <PermissionToggle
                            key={perm}
                            permKey={perm}
                            checked={currentRolePermissions.loans?.[perm] || false}
                            onChange={() => toggleModulePermission("loans", perm)}
                          />
                        ))}
                      </div>
                    )}

                    {moduleKey === "users" && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-2">Users Permissions</p>
                        {["create", "read", "update", "delete", "viewAll"].map((perm) => (
                          <PermissionToggle
                            key={perm}
                            permKey={perm}
                            checked={currentRolePermissions.users?.[perm] || false}
                            onChange={() => toggleModulePermission("users", perm)}
                          />
                        ))}
                      </div>
                    )}

                    {moduleKey === "reports" && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-2">reports Permissions</p>
                        {["view", "export", "viewAll"].map((perm) => (
                          <PermissionToggle
                            key={perm}
                            permKey={perm}
                            checked={currentRolePermissions.reports?.[perm] || false}
                            onChange={() => toggleModulePermission("reports", perm)}
                          />
                        ))}
                      </div>
                    )}

                    {moduleKey === "settings" && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-2">settings Permissions</p>

                        {["view", "update"].map((perm) => (
                          <PermissionToggle
                            key={perm}
                            permKey={perm}
                            checked={currentRolePermissions.settings?.[perm] || false}
                            onChange={() => toggleModulePermission("settings", perm)}
                          />
                        ))}
                      </div>
                    )}

                    {moduleKey === "permissions" && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-2">Users Permissions</p>

                        {["view", "update"].map((perm) => (
                          <PermissionToggle
                            key={perm}
                            permKey={perm}
                            checked={currentRolePermissions.permissions?.[perm] || false}
                            onChange={() => toggleModulePermission("permissions", perm)}
                          />
                        ))}
                      </div>
                    )}

                    {moduleKey === "accountant" && (
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-2">Accountant Permissions</p>

                        {[
                          { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                          { key: "payments", label: "Payments", icon: Receipt },
                          { key: "disbursement", label: "Disbursement", icon: Banknote },
                          { key: "folio", label: "Folio", icon: BookOpen },
                          { key: "bank_accounts", label: "Bank Accounts", icon: Building2 },
                        ].map((section) => (
                          <div key={section.key} className="border rounded-xl p-3 bg-muted/20">
                            <p className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-2 text-muted-foreground">
                              <section.icon size={13} /> {section.label}
                            </p>
                            <PermissionToggle
                              permKey="view"
                              checked={currentRolePermissions.accountant?.[section.key]?.view || false}
                              onChange={() => toggleNestedPermission("accountant", section.key, "view")}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {[
                      "api_tools",
                      "team",
                      "offline_disbursement",
                      "calling",
                      "credit_reports",
                      "rc_limits",
                      "expenses",
                      "insurance",
                      "link_loan_finder",
                      "account_aggregator",
                      "find_lender",
                      "find_car_value",
                      "payouts",
                      "banks",
                      "brokers",
                      "branches",
                      "audit_logs",
                      "policy_maker",
                      "api_usage",
                      "api_usage_logs",
                      "api_integrations",
                      "db_view",
                      "operations_leads",
                    ].includes(moduleKey) && (
                      <PermissionToggle
                        permKey="view"
                        checked={currentRolePermissions[moduleKey]?.view || false}
                        onChange={() => toggleModulePermission(moduleKey, "view")}
                      />
                    )}
                  </div>
                </div>
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}