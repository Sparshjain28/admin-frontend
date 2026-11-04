import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users, Search, Shield, ChevronDown, ChevronRight,
  UserPlus, X, Phone, Copy, UserMinus, User, RotateCcw,
  Link2, Share2, Clock, Ban, CheckCircle2
} from 'lucide-react';
import { ROLE_LABELS, UserRole } from '@/lib/auth';
import { toast } from 'sonner';
import { api } from '@/lib/api';

// ─── Role badge colours ───────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  operation_team: 'bg-orange-100 text-orange-700',
  ops_team: 'bg-orange-100 text-orange-700',
  loan_operations: 'bg-emerald-100 text-emerald-700',
  sales_manager: 'bg-blue-100 text-blue-700',
  branch_manager: 'bg-indigo-100 text-indigo-700',
  dsa: 'bg-cyan-100 text-cyan-700',
  team_leader: 'bg-amber-100 text-amber-700',
  executive: 'bg-green-100 text-green-700',
  accountant: 'bg-rose-100 text-rose-700',
};

// ─── Avatar initials ──────────────────────────────────────────────────────────
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = (name || '?')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const cls = size === 'sm'
    ? 'w-7 h-7 text-[10px]'
    : 'w-9 h-9 text-xs';
  return (
    <div className={`${cls} rounded-full bg-accent/20 text-accent-foreground font-bold flex items-center justify-center shrink-0`}>
      {initials}
    </div>
  );
}

// ─── Single hierarchy node ────────────────────────────────────────────────────
const UserHierarchyNode = ({ user, level = 0, onRemoveFromTeam, onRestore, isInactive }: any) => {
  const [expanded, setExpanded] = useState(true);
  const children: any[] = user.team_members || [];
  const hasChildren = children.length > 0;
  const roleColor = ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600';

  return (
    <div className="w-full">
      {/* Row */}
      <div
        className={`
          flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3
          border-b border-border/40 hover:bg-muted/30 transition-colors
          ${level > 0 ? 'border-l-2 border-l-accent/50' : ''}
        `}
        style={{ paddingLeft: `${0.75 + level * 1.25}rem` }}
      >
        {/* Expand toggle */}
        <button
          onClick={() => hasChildren && setExpanded(e => !e)}
          className={`shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors
            ${hasChildren ? 'text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer' : 'cursor-default opacity-0 pointer-events-none'}`}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Avatar */}
        <Avatar name={user.full_name || user.phone} />

        {/* Info — grows */}
        <div className="flex-1 min-w-0">
          {/* Name + ID row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-foreground text-sm leading-tight truncate">
              {user.full_name || '(No name)'}
            </span>
            {user.user_id && (
              <span className="text-[11px] text-muted-foreground shrink-0">#{user.user_id}</span>
            )}
          </div>

          {/* Phone + role row */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone size={11} className="shrink-0" />
              {user.phone}
            </span>
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md ${roleColor}`}>
              {ROLE_LABELS[user.role as UserRole] || user.role}
            </span>
          </div>

          {/* Refer code — only on mobile (desktop shows in its own column) */}
          {user.refer_code && (
            <div className="sm:hidden flex items-center gap-1.5 mt-1.5">
              <span className="text-[11px] text-green-600 font-semibold">Ref:</span>
              <code className="text-[11px] font-mono font-bold text-green-700 tracking-wider">
                {user.refer_code}
              </code>
              <button
                onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(user.refer_code); toast.success('Copied!'); }}
                className="p-0.5 rounded hover:bg-green-100 text-green-600 transition-colors"
              >
                <Copy size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Refer code — desktop only */}
        {user.refer_code ? (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <code className="text-xs font-mono font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
              {user.refer_code}
            </code>
            <button
              onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(user.refer_code); toast.success('Copied!'); }}
              className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors"
              title="Copy refer code"
            >
              <Copy size={12} />
            </button>
          </div>
        ) : (
          <div className="hidden sm:block w-24 shrink-0" />
        )}

        {/* Member count badge */}
        {hasChildren && (
          <span className="hidden sm:inline-flex shrink-0 text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full font-medium">
            {children.length} {children.length === 1 ? 'member' : 'members'}
          </span>
        )}

        {/* Remove button */}
        {!isInactive && (
          <button
            onClick={e => {
              e.stopPropagation();
              onRemoveFromTeam(user);
            }}
            className="shrink-0 p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
            title="Remove from team"
          >
            <UserMinus size={15} />
          </button>
        )}

        {/* Restore button */}
        {isInactive && (
          <button
            onClick={e => {
              e.stopPropagation();
              if (confirm(`Restore ${user.full_name || user.phone} to your team?`)) {
                onRestore(user.id);
              }
            }}
            className="shrink-0 p-1.5 rounded-lg hover:bg-green-50 text-muted-foreground hover:text-green-600 transition-colors"
            title="Restore to team"
          >
            <RotateCcw size={15} />
          </button>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {children.map((child: any) => (
            <UserHierarchyNode
              key={child.id}
              user={child}
              level={level + 1}
              onRemoveFromTeam={onRemoveFromTeam}
              onRestore={onRestore}
              isInactive={isInactive}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TeamUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewTab, setViewTab] = useState<'active' | 'inactive'>('active');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [userToRemove, setUserToRemove] = useState<any>(null);
  const [reassignTo, setReassignTo] = useState<number | null>(null);
  const [subordinatesCount, setSubordinatesCount] = useState(0);
  const [newUser, setNewUser] = useState({
    full_name: '',
    phone: '',
    mpin: '',
    role: 'executive' as string,
    reporting_to: user?.id || null,
    branch_id: user?.role === 'branch_manager' ? user?.branch_id : null,
  });

  // Only admin gets a choice between manual entry and an invite link —
  // every other role only ever invites via link, so their tab is fixed.
  const [addMode, setAddMode] = useState<'manual' | 'invite'>(user?.role === 'admin' ? 'manual' : 'invite');
  const [inviteRole, setInviteRole] = useState('');
  const [inviteBranchId, setInviteBranchId] = useState<number | null>(null);
  const [generatedInvite, setGeneratedInvite] = useState<{ invite_url: string; role_label: string; expires_at: string } | null>(null);
  const [showInvitesList, setShowInvitesList] = useState(false);

  const isHierarchyRole = (role: string) =>
    ['admin', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'operation_team', 'loan_operations'].includes(role);
  const isManager = isHierarchyRole(user?.role || '');

  // Roles a user is allowed to create, based on where they sit in the hierarchy.
  // Admin is intentionally never offered here — creating another admin isn't done from this modal.
  const allowedRoles = useMemo((): string[] => {
    switch (user?.role) {
      case 'admin':
        return ['operation_team', 'loan_operations', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'];
      case 'operation_team':
        return ['loan_operations', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'];
      case 'loan_operations':
        return ['executive', 'dsa'];
      case 'sales_manager':
        return ['branch_manager', 'dsa', 'team_leader', 'executive'];
      case 'branch_manager':
      case 'dsa':
        return ['team_leader', 'executive'];
      case 'team_leader':
        return ['executive'];
      default:
        return [];
    }
  }, [user?.role]);

  const needsBranch = (role: string) => (role === 'team_leader' || role === 'branch_manager') && user?.role === 'branch_manager';

  const { data: rawTeamData = [], isLoading, error } = useQuery({
    queryKey: ['team-hierarchy', user?.id, viewTab],
    queryFn: () =>
      viewTab === 'inactive'
        ? api.get('/users/archived?status=inactive')
        : api.get(isManager ? '/users/my-team/hierarchy' : `/users/team/${user?.id}`),
    enabled: !!user?.id,
  });

  // Sort team data by hierarchy: branch_manager > team_leader > executive
  const teamData = useMemo(() => {
    if (!rawTeamData || rawTeamData.length === 0) return [];

    const roleOrder: Record<string, number> = {
      'operation_team': 1,
      'loan_operations': 1,
      'sales_manager': 2,
      'branch_manager': 3,
      'team_leader': 4,
      'executive': 5,
      'dsa': 6,
    };

    const sortByRole = (a: any, b: any): number => {
      const orderA = roleOrder[a.role] || 999;
      const orderB = roleOrder[b.role] || 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.full_name || '').localeCompare(b.full_name || '');
    };

    const sortHierarchy = (nodes: any[]): any[] => {
      return nodes
        .map(node => ({
          ...node,
          team_members: node.team_members ? sortHierarchy(node.team_members) : []
        }))
        .sort(sortByRole);
    };

    return sortHierarchy(rawTeamData);
  }, [rawTeamData]);

  const removeFromTeam = useMutation({
    mutationFn: ({ userId, reassign_to }: { userId: number; reassign_to?: number }) =>
      api.put(`/users/${userId}/remove-from-team`, reassign_to ? { reassign_to } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy'] });
      toast.success('User removed from team!');
      setShowReassignModal(false);
      setUserToRemove(null);
      setReassignTo(null);
    },
    onError: (e: any) => {
      if (e.response?.data?.requiresReassignment) {
        setSubordinatesCount(e.response.data.subordinatesCount);
        setShowReassignModal(true);
      } else {
        toast.error(e.response?.data?.error || e.message || 'Failed to remove user');
      }
    },
  });

  const restoreUser = useMutation({
    mutationFn: (userId: number) => api.put(`/users/${userId}/restore`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy'] });
      toast.success('User restored to your team!');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to restore user'),
  });

  const createUser = useMutation({
    mutationFn: () =>
      api.post('/users', {
        full_name: newUser.full_name,
        phone: newUser.phone,
        mpin: newUser.mpin,
        role: newUser.role,
        reporting_to: newUser.reporting_to,
        branch_id: newUser.branch_id,
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy'] });
      if (data?.dsa_invite) {
        toast.success('User created as an executive and a DSA invite was sent. The role changes to DSA only after approval.');
      } else {
        toast.success('User created successfully!');
      }
      setShowAddModal(false);
      setNewUser({
        full_name: '', phone: '', mpin: '', role: allowedRoles[0] || 'executive',
        reporting_to: user?.id || null,
        branch_id: user?.role === 'branch_manager' ? user?.branch_id : null,
      });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create user'),
  });

  const { data: myInvites = [], refetch: refetchInvites } = useQuery({
    queryKey: ['my-invites'],
    queryFn: () => api.get('/invites'),
    enabled: showAddModal && addMode === 'invite',
  });

  // Only matters when inviting an Executive — lets the inviter place them
  // under one of their own team leaders instead of always reporting
  // directly to the inviter. Empty for team leaders themselves (they have
  // Query eligible managers:
  // - When creating or inviting a DSA (non-sales_manager creator), gets active Sales Managers.
  // - When inviting an Executive, gets creator's direct team leaders.
  const targetSubordinateRole = addMode === 'invite' ? inviteRole : newUser.role;
  const { data: eligibleManagers = [] } = useQuery({
    queryKey: ['invite-eligible-managers', targetSubordinateRole, addMode],
    queryFn: () => api.get(`/invites/eligible-managers${targetSubordinateRole === 'dsa' ? '?role=dsa' : ''}`),
    enabled: showAddModal && (
      (addMode === 'invite' && (inviteRole === 'executive' || (inviteRole === 'dsa' && user?.role !== 'sales_manager'))) ||
      (addMode === 'manual' && newUser.role === 'dsa' && user?.role !== 'sales_manager')
    ),
  });
  const [assignUnder, setAssignUnder] = useState<number | ''>('');

  const generateInvite = useMutation({
    mutationFn: () => api.post('/invites', {
      role: inviteRole,
      ...(inviteBranchId ? { branch_id: inviteBranchId } : {}),
      ...(assignUnder ? { reporting_to: assignUnder } : {}),
    }),
    onSuccess: (data: any) => {
      setGeneratedInvite(data);
      refetchInvites();
      toast.success('Invite link generated!');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to generate invite link'),
  });

  const revokeInvite = useMutation({
    mutationFn: (id: number) => api.post(`/invites/${id}/revoke`, {}),
    onSuccess: () => {
      refetchInvites();
      toast.success('Invite revoked');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to revoke invite'),
  });

  const handleRemoveClick = async (targetUser: any) => {
    // Check if user has leadership role
    if (['team_leader', 'branch_manager', 'sales_manager'].includes(targetUser.role)) {
      // Check subordinates count
      try {
        const response = await api.get(`/users/${targetUser.id}/subordinates-count`);
        const count = response.subordinatesCount;
        if (count > 0) {
          // Show reassignment modal
          setUserToRemove(targetUser);
          setSubordinatesCount(count);
          setShowReassignModal(true);
          return;
        }
      } catch (error) {
      }
    }

    // No subordinates or not a leader, proceed with removal
    if (confirm(`Remove ${targetUser.full_name || targetUser.phone} from your team?`)) {
      removeFromTeam.mutate({ userId: targetUser.id });
    }
  };

  const handleReassignAndRemove = () => {
    if (!reassignTo) {
      toast.error('Please select a user to reassign the team to');
      return;
    }
    removeFromTeam.mutate({ userId: userToRemove.id, reassign_to: reassignTo });
  };

  // Flatten tree for counts / search
  const flattenTeam = (data: any[]): any[] => {
    let flat: any[] = [];
    data.forEach(item => {
      flat.push(item);
      if (item.team_members) flat = flat.concat(flattenTeam(item.team_members));
    });
    return flat;
  };

  const flatTeam = useMemo(() => flattenTeam(teamData), [teamData]);

  // Get eligible leaders for reassignment (any active team member except the one being removed)
  const eligibleLeaders = useMemo(() => {
    if (!userToRemove) return [];

    // For active tab, use flatTeam; for inactive tab, fetch active users separately
    const activeMembers = viewTab === 'active' ? flatTeam : flatTeam;

    const eligible = activeMembers.filter((u: any) =>
      u.id !== userToRemove.id &&
      (u.status === 'active' || !u.status) // Include users without status field or with active status
    );
    console.log('Flat team:', flatTeam);
    return eligible;
  }, [flatTeam, userToRemove, viewTab]);

  const { filteredHierarchy, roleCounts, totalCount } = useMemo(() => {
    const filtered = flatTeam.filter((u: any) => {
      const q = search.toLowerCase();
      const matchSearch =
        u.full_name?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.user_id?.toLowerCase().includes(q);
      return matchSearch && (roleFilter === 'all' || u.role === roleFilter);
    });

    const counts = filtered.reduce((acc: Record<string, number>, u: any) => {
      if (u.role) acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});

    const filteredSet = new Set(filtered.map((u: any) => u.id));

    const roleOrder: Record<string, number> = {
      'sales_manager': 1,
      'branch_manager': 2,
      'team_leader': 3,
      'executive': 4,
      'dsa': 5,
    };

    const sortByRole = (a: any, b: any): number => {
      const orderA = roleOrder[a.role] || 999;
      const orderB = roleOrder[b.role] || 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.full_name || '').localeCompare(b.full_name || '');
    };

    const filterTree = (nodes: any[]): any[] =>
      nodes
        .filter((n: any) => {
          const hasMatch = (x: any): boolean =>
            filteredSet.has(x.id) ||
            (x.team_members || []).some((m: any) => hasMatch(m));
          return hasMatch(n);
        })
        .map((n: any) => ({ ...n, team_members: filterTree(n.team_members || []) }))
        .sort(sortByRole);

    return {
      filteredHierarchy: isManager ? filterTree(teamData) : filtered.sort(sortByRole),
      roleCounts: counts,
      totalCount: filtered.length,
    };
  }, [teamData, flatTeam, search, roleFilter, isManager]);

  const roleEntries = Object.entries(ROLE_LABELS).filter(([role]) => roleCounts[role] > 0);

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Team</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isManager
              ? 'View your team hierarchy and manage members'
              : 'View and manage your team members'}
          </p>
          {/* Refer code chip */}
          {user?.refer_code &&
            ['team_leader', 'branch_manager', 'dsa', 'sales_manager'].includes(user?.role || '') && (
              <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-xs">
                <span className="text-green-600 font-semibold">Your Ref Code:</span>
                <code className="font-mono font-bold text-green-700 tracking-wider">{user.refer_code}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(user.refer_code); toast.success('Copied!'); }}
                  className="p-0.5 rounded hover:bg-green-200 text-green-600 transition-colors"
                >
                  <Copy size={12} />
                </button>
              </div>
            )}
        </div>
        {isManager && viewTab === 'active' && (
          <button
            onClick={() => {
              setNewUser(u => ({ ...u, role: allowedRoles[0] || 'executive' }));
              setInviteRole(allowedRoles[0] || '');
              setInviteBranchId(null);
              setAssignUnder('');
              setGeneratedInvite(null);
              setAddMode(user?.role === 'admin' ? 'manual' : 'invite');
              setShowAddModal(true);
            }}
            className="flex sm:inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm shrink-0 w-full sm:w-auto"
          >
            <UserPlus size={16} /> Add User
          </button>
        )}
      </div>



      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setViewTab('active')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewTab === 'active'
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
        >
          Active Team
        </button>
        <button
          onClick={() => setViewTab('inactive')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewTab === 'inactive'
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
        >
          Inactive Users
        </button>
      </div>

      {/* ── Role stat cards ── */}
      {roleEntries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
          {roleEntries.map(([role, label]) => (
            <div
              key={role}
              onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
              className={`stat-card cursor-pointer text-center select-none transition-all
                ${roleFilter === role ? 'ring-2 ring-accent bg-accent/5' : 'hover:bg-muted/50'}`}
            >
              <p className="text-xl font-bold text-foreground">{roleCounts[role]}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Search ── */}
      <div className="stat-card mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone or ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted transition-colors"
            >
              <X size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* ── Team hierarchy card ── */}
      <div className="stat-card overflow-hidden p-0">
        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield size={16} className="text-accent" />
            Team Structure
          </h3>
          {totalCount > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
              {totalCount} {totalCount === 1 ? 'member' : 'members'}
            </span>
          )}
        </div>

        {/* Column headers — desktop only */}
        <div className="hidden sm:flex items-center gap-3 px-4 py-2 border-b border-border/50 bg-muted/20 text-xs font-semibold text-muted-foreground">
          <div className="w-6 shrink-0" />
          <div className="w-9 shrink-0" />
          <div className="flex-1">Name / Phone</div>
          <div className="w-28 shrink-0">Refer Code</div>
          <div className="w-24 shrink-0 text-center">Members</div>
          <div className="w-8 shrink-0" />
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Loading team hierarchy…
          </div>
        ) : error ? (
          <div className="py-12 text-center text-destructive text-sm">
            Error loading team structure.
          </div>
        ) : filteredHierarchy.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Users size={22} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">No team members found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search || roleFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Add users to get started'}
            </p>
          </div>
        ) : (
          <div>
            {filteredHierarchy.map((member: any) => (
              <UserHierarchyNode
                key={member.id}
                user={member}
                onRemoveFromTeam={handleRemoveClick}
                onRestore={(id: number) => restoreUser.mutate(id)}
                isInactive={viewTab === 'inactive'}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Add User Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 pb-24 sm:pb-4">
          <div className="bg-card w-full sm:max-w-md rounded-2xl shadow-2xl max-h-[75dvh] sm:max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="text-base font-bold text-foreground">Add New User</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {addMode === 'invite' ? 'Share a link — they fill in their own details' : 'Create a member of your team'}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            {/* Mode tabs — admin only; everyone else only ever has the invite link */}
            {user?.role === 'admin' && (
              <div className="flex gap-1 px-5 pt-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setAddMode('manual')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${addMode === 'manual' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  Manual Entry
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('invite')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${addMode === 'invite' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  Invite Link
                </button>
              </div>
            )}

            {/* ── Manual Entry (admin only) ── */}
            {addMode === 'manual' && (
              <form
                onSubmit={e => { e.preventDefault(); createUser.mutate(); }}
                className="flex-1 overflow-y-auto px-5 py-5 space-y-4"
              >
                {[
                  { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'Enter full name', icon: User },
                  { label: 'Phone Number', key: 'phone', type: 'tel', placeholder: '10-digit number', icon: Phone, maxLength: 10 },
                  { label: 'MPIN', key: 'mpin', type: 'password', placeholder: '4-digit MPIN', icon: Shield, maxLength: 4 },
                ].map(({ label, key, type, placeholder, icon: Icon, maxLength }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      {label} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type={type}
                        required
                        value={(newUser as any)[key]}
                        onChange={e => setNewUser({ ...newUser, [key]: e.target.value })}
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                        placeholder={placeholder}
                        maxLength={maxLength}
                      />
                    </div>
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                  >
                    {allowedRoles.map(role => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role as UserRole] || role}
                      </option>
                    ))}
                  </select>
                </div>

                {needsBranch(newUser.role) && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Branch</label>
                    <input
                      disabled
                      value={newUser.branch_id ? `Branch ID: ${newUser.branch_id}` : 'No branch assigned'}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted text-muted-foreground text-sm"
                    />
                  </div>
                )}

                {newUser.role === 'dsa' && user?.role !== 'sales_manager' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Reports to (Sales Manager) <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={newUser.reporting_to || ''}
                      onChange={e => setNewUser({ ...newUser, reporting_to: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                    >
                      <option value="">Select Sales Manager</option>
                      {eligibleManagers.map((sm: any) => (
                        <option key={sm.id} value={sm.id}>
                          {sm.full_name} {sm.phone ? `(${sm.phone})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      DSAs must report directly to an active Sales Manager.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      createUser.isPending ||
                      (needsBranch(newUser.role) && !newUser.branch_id) ||
                      (newUser.role === 'dsa' && user?.role !== 'sales_manager' && !newUser.reporting_to) ||
                      !newUser.full_name || !newUser.phone || !newUser.mpin
                    }
                    className="flex-1 py-2.5 rounded-xl bg-accent text-accent-foreground hover:opacity-90 transition-opacity text-sm font-semibold disabled:opacity-50"
                  >
                    {createUser.isPending ? 'Creating…' : 'Create User'}
                  </button>
                </div>
              </form>
            )}

            {/* ── Invite Link (everyone) ── */}
            {addMode === 'invite' && (
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={inviteRole}
                    onChange={e => { setInviteRole(e.target.value); setAssignUnder(''); setGeneratedInvite(null); }}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                  >
                    {allowedRoles.map(role => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role as UserRole] || role}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    They'll fill in their own name, phone and PIN — this just fixes their role and reports to you.
                  </p>
                </div>

                {inviteRole === 'executive' && eligibleManagers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Assign under (optional)</label>
                    <select
                      value={assignUnder}
                      onChange={e => { setAssignUnder(e.target.value ? Number(e.target.value) : ''); setGeneratedInvite(null); }}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                    >
                      <option value="">Report directly to me</option>
                      {eligibleManagers.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Place this executive under one of your own team leaders instead of yourself.
                    </p>
                  </div>
                )}

                {inviteRole === 'dsa' && user?.role !== 'sales_manager' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Assign under (Sales Manager) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={assignUnder}
                      onChange={e => { setAssignUnder(e.target.value ? Number(e.target.value) : ''); setGeneratedInvite(null); }}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                    >
                      <option value="">Select Sales Manager</option>
                      {eligibleManagers.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.full_name} {m.phone ? `(${m.phone})` : ''}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      DSAs must report directly to an active Sales Manager.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => generateInvite.mutate()}
                  disabled={
                    generateInvite.isPending ||
                    !inviteRole ||
                    (inviteRole === 'dsa' && user?.role !== 'sales_manager' && !assignUnder)
                  }
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-accent-foreground hover:opacity-90 transition-opacity text-sm font-semibold disabled:opacity-50"
                >
                  <Link2 size={15} />
                  {generateInvite.isPending ? 'Generating…' : 'Generate Invite Link'}
                </button>

                {generatedInvite && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3.5 space-y-2.5">
                    <p className="text-xs font-semibold text-green-700">
                      Link ready for {generatedInvite.role_label} — expires {new Date(generatedInvite.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                    <div className="flex items-center gap-2 bg-white border border-green-200 rounded-lg px-3 py-2">
                      <code className="flex-1 text-xs text-foreground truncate">{generatedInvite.invite_url}</code>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(generatedInvite.invite_url); toast.success('Copied!'); }}
                        className="shrink-0 p-1 rounded hover:bg-green-100 text-green-700"
                        title="Copy link"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Join our team as a ${generatedInvite.role_label} — ${generatedInvite.invite_url}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors"
                    >
                      <Share2 size={14} /> Share via WhatsApp
                    </a>
                  </div>
                )}

                {/* Pending invites — revoked ones are hidden once actioned, not kept around */}
                <div className="pt-2 border-t border-border">
                  {(() => {
                    // Only invites still worth looking at: pending (still actionable —
                    // can be revoked) or used (fully successful). Revoked and expired
                    // ones are dead ends and just clutter the list.
                    const visibleInvites = myInvites.filter((inv: any) => inv.status === 'pending' || inv.status === 'used');
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowInvitesList(v => !v)}
                          className="w-full flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground mb-2"
                        >
                          <span>Invites you've sent {visibleInvites.length > 0 && `(${visibleInvites.length})`}</span>
                          <ChevronDown size={14} className={`transition-transform ${showInvitesList ? 'rotate-180' : ''}`} />
                        </button>
                        {showInvitesList && (visibleInvites.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">None yet.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {visibleInvites.map((inv: any) => (
                              <div key={inv.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40 text-xs">
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate">{inv.role_label}</p>
                                  <p className="text-muted-foreground flex items-center gap-1">
                                    {inv.status === 'pending' && <><Clock size={11} /> Expires {new Date(inv.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</>}
                                    {inv.status === 'used' && <><CheckCircle2 size={11} className="text-green-600" /> Joined as {inv.used_by_name}</>}
                                  </p>
                                </div>
                                {inv.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() => revokeInvite.mutate(inv.id)}
                                    className="shrink-0 text-red-600 hover:text-red-700 font-semibold"
                                  >
                                    Revoke
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reassignment Modal ── */}
      {showReassignModal && userToRemove && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="text-base font-bold text-foreground">Reassign Team Members</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {userToRemove.full_name} has {subordinatesCount} active team member{subordinatesCount !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReassignModal(false);
                  setUserToRemove(null);
                  setReassignTo(null);
                }}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Before removing {userToRemove.full_name},
                  you must reassign their {subordinatesCount} team member{subordinatesCount !== 1 ? 's' : ''} to another team member.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select Team Member to Assign <span className="text-red-500">*</span>
                </label>

                <p className="text-xs text-muted-foreground mb-2">
                  Found {eligibleLeaders.length} eligible team member{eligibleLeaders.length !== 1 ? 's' : ''}
                </p>

                {eligibleLeaders.length === 0 ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-red-800 font-medium">
                      No other team members available
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      You need to have other team members before removing this user.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded-lg">
                    {eligibleLeaders.map((leader: any) => {
                      const roleColor = ROLE_COLORS[leader.role] || 'bg-gray-100 text-gray-600';
                      return (
                        <label
                          key={leader.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${reassignTo === leader.id ? 'bg-accent/10 border-l-4 border-l-accent' : ''
                            }`}
                        >
                          <input
                            type="radio"
                            name="reassign"
                            value={leader.id}
                            checked={reassignTo === leader.id}
                            onChange={() => setReassignTo(leader.id)}
                            className="w-4 h-4 text-accent"
                          />
                          <Avatar name={leader.full_name || leader.phone} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {leader.full_name || '(No name)'}
                              </p>
                              <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ${roleColor}`}>
                                {ROLE_LABELS[leader.role as UserRole] || leader.role}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {leader.phone} • #{leader.user_id}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReassignModal(false);
                    setUserToRemove(null);
                    setReassignTo(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReassignAndRemove}
                  disabled={!reassignTo || removeFromTeam.isPending || eligibleLeaders.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {removeFromTeam.isPending ? 'Removing…' : 'Reassign & Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

