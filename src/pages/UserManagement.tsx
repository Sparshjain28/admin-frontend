import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ROLE_LABELS, UserRole } from '@/lib/auth';
import { Users, Search, Shield, Edit, Archive, Check, X, RotateCcw, Ban, Trash2 } from 'lucide-react';
import { RoleAssignModal } from '@/components/RoleAssignModal';
import { ReassignTeamModal } from '@/components/ReassignTeamModal';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function UserManagement() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [viewTab, setViewTab] = useState<'active' | 'archived' | 'inactive'>('active');
  const [reassignState, setReassignState] = useState<{ action: 'archive' | 'inactivate', user: any, subordinatesCount: number } | null>(null);

  const handleAssignRole = (u: any) => {
    setSelectedUser(u);
    setModalOpen(true);
  };

  const { data: rawUsers = [], isLoading, refetch, error } = useQuery({
    queryKey: ['users-hierarchy', user?.branch_id],
    queryFn: async () => {
      const data = await api.get('/users/hierarchy');
      return data;
    },
    enabled: !!user && viewTab === 'active',
  });

  const { data: archivedUsers = [], isLoading: isLoadingArchived } = useQuery({
    queryKey: ['archived-users'],
    queryFn: async () => {
      const data = await api.get('/users/archived?status=archived');
      return data;
    },
    enabled: !!user && ['admin', 'sales_manager', 'branch_manager', 'dsa', 'team_leader'].includes(user.role) && viewTab === 'archived',
  });

  const { data: inactiveUsers = [], isLoading: isLoadingInactive } = useQuery({
    queryKey: ['inactive-users'],
    queryFn: async () => {
      const data = await api.get('/users/archived?status=inactive');
      return data;
    },
    enabled: !!user && ['admin', 'sales_manager', 'branch_manager', 'dsa', 'team_leader'].includes(user.role) && viewTab === 'inactive',
  });

  const archiveUserMutation = useMutation({
    mutationFn: async ({ userId, new_manager_id }: { userId: number, new_manager_id?: string }) => {
      const data = await api.put(`/users/${userId}/archive`, { reassign_to: new_manager_id });
      return data;
    },
    onSuccess: () => {
      toast.success('User archived successfully');
      refetch();
      setReassignState(null);
    },
    onError: (error: any) => {
      if (error.response?.data?.requiresReassignment) {
        setReassignState({
          action: 'archive',
          user: selectedUser,
          subordinatesCount: error.response.data.subordinatesCount
        });
      } else {
        toast.error(error.response?.data?.error || error.message || 'Failed to archive user');
      }
    }
  });

  const inactivateUserMutation = useMutation({
    mutationFn: async ({ userId, new_manager_id }: { userId: number, new_manager_id?: string }) => {
      const data = await api.put(`/users/${userId}/inactivate`, { reassign_to: new_manager_id });
      return data;
    },
    onSuccess: () => {
      toast.success('User marked as inactive');
      refetch();
      setReassignState(null);
    },
    onError: (error: any) => {
      if (error.response?.data?.requiresReassignment) {
        setReassignState({
          action: 'inactivate',
          user: selectedUser,
          subordinatesCount: error.response.data.subordinatesCount
        });
      } else {
        toast.error(error.response?.data?.error || error.message || 'Failed to inactivate user');
      }
    }
  });

  const restoreUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const data = await api.put(`/users/${userId}/restore`, {});
      return data;
    },
    onSuccess: () => {
      toast.success('User restored to active');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || error.message || 'Failed to restore user');
    }
  });

  const approveUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const data = await api.put(`/users/${userId}/approve`, {});
      return data;
    },
    onSuccess: () => {
      toast.success('User approved successfully');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || error.message || 'Failed to approve user');
    }
  });

  const rejectUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const data = await api.put(`/users/${userId}/reject`, {});
      return data;
    },
    onSuccess: () => {
      toast.success('User rejected successfully');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || error.message || 'Failed to reject user');
    }
  });

  const handleApproveUser = (u: any) => {
    if (confirm(`Are you sure you want to approve ${u.full_name}?`)) {
      approveUserMutation.mutate(u.id);
    }
  };

  const handleRejectUser = (u: any) => {
    if (confirm(`Are you sure you want to reject ${u.full_name}?`)) {
      rejectUserMutation.mutate(u.id);
    }
  };

  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId, reassignTo }: { userId: number; reassignTo?: number }) => {
      // Pass reassignTo as query param if provided
      const url = reassignTo ? `/users/${userId}?reassign_to=${reassignTo}` : `/users/${userId}`;
      const data = await api.delete(url);
      return data;
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || error.message || 'Failed to delete user');
    }
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [reassignTarget, setReassignTarget] = useState<number | undefined>(undefined);

  // Fetch active users for reassignment dropdown (excluding the one being deleted)
  const { data: activeUsers = [] as any[] } = useQuery({
    queryKey: ['activeUsers', userToDelete?.id],
    queryFn: async () => {
      const res = await api.get('/users?status=active');
      // Exclude the user being deleted
      return res.data.filter((u: any) => u.id !== userToDelete?.id);
    },
    enabled: !!userToDelete,
  });

  const handleDeleteUser = (u: any) => {
    setUserToDelete(u);
    setReassignTarget(undefined);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!userToDelete) return;
    deleteUserMutation.mutate({
      userId: userToDelete.id,
      reassignTo: reassignTarget,
    });
    setDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const bulkApproveUsers = useMutation({
    mutationFn: async (userIds: number[]) => {
      const promises = userIds.map(id => api.put(`/users/${id}/approve`, {}));
      const results = await Promise.all(promises);
      return results;
    },
    onSuccess: () => {
      toast.success(`Approved ${selectedUsers.length} users successfully`);
      setSelectedUsers([]);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || error.message || 'Failed to approve users');
    }
  });

  const handleBulkApprove = () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users to approve');
      return;
    }
    if (confirm(`Are you sure you want to approve ${selectedUsers.length} selected users?`)) {
      bulkApproveUsers.mutate(selectedUsers);
    }
  };

  const handleSelectUser = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = (users: any[]) => {
    const pendingUsers = users.filter(u => u.status !== 'active').map(u => u.id);
    if (selectedUsers.length === pendingUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(pendingUsers);
    }
  };

  const generateReferCodes = useMutation({
    mutationFn: async () => {
      const data = await api.put('/users/generate-refer-codes', {});
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Generated refer codes for ${data.updatedCount} users`);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || error.message || 'Failed to generate refer codes');
    }
  });

  const generateSalesManagerReferCodes = useMutation({
    mutationFn: async () => {
      const data = await api.put('/users/generate-sales-manager-refer-codes', {});
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Generated refer codes for ${data.updatedCount} sales managers`);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || error.message || 'Failed to generate refer codes');
    }
  });


  const handleArchiveUser = (u: any) => {
    setSelectedUser(u);
    if (confirm(`Archive ${u.full_name}? They will be moved to the Archived tab and can be restored later.`)) {
      archiveUserMutation.mutate({ userId: u.id });
    }
  };

  const handleInactivateUser = (u: any) => {
    setSelectedUser(u);
    if (confirm(`Mark ${u.full_name} as inactive? They will be moved to the Inactive tab.`)) {
      inactivateUserMutation.mutate({ userId: u.id });
    }
  };

  const handleRestoreUser = (u: any) => {
    if (confirm(`Restore ${u.full_name} to active status?`)) {
      restoreUserMutation.mutate(u.id);
    }
  };

  const isAdmin = user?.role === 'admin';
  const validRoles = isAdmin
    ? ['admin', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive', 'operation_team', 'ops_team', 'loan_operations', 'accountant']
    : ['branch_manager', 'dsa', 'team_leader', 'executive'];

  const currentUsers = viewTab === 'archived' ? archivedUsers : viewTab === 'inactive' ? inactiveUsers : rawUsers;
  const currentLoading = viewTab === 'archived' ? isLoadingArchived : viewTab === 'inactive' ? isLoadingInactive : isLoading;

  const allFiltered = useMemo(() => {
    return currentUsers.filter((u: any) => {
      const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'all' ||
        (roleFilter === 'branch_manager_dsa' && ['branch_manager', 'dsa'].includes(u.role)) ||
        (roleFilter === 'operation_team' && ['operation_team', 'ops_team'].includes(u.role)) ||
        u.role === roleFilter;
      return matchSearch && matchRole && validRoles.includes(u.role);
    });
  }, [currentUsers, search, roleFilter]);

  const usersByRole = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    allFiltered.forEach((u: any) => {
      if (!grouped[u.role]) grouped[u.role] = [];
      grouped[u.role].push(u);
    });
    return grouped;
  }, [allFiltered]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ['admin', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive', 'operation_team', 'ops_team', 'loan_operations', 'accountant'].forEach(role => {
      counts[role] = currentUsers.filter((u: any) => u.role === role).length;
    });
    return counts;
  }, [currentUsers]);

  const getManagerName = (managerId: number) => {
    const manager = currentUsers.find((u: any) => u.id === managerId) || rawUsers.find((u: any) => u.id === managerId);
    return manager ? manager.full_name || manager.phone : '—';
  };

  const UserTable = ({ users }: any) => {
const pendingUsers = users.filter((u: any) => u.status !== 'active');
    const allPendingSelected = pendingUsers.length > 0 && pendingUsers.every((u: any) => selectedUsers.includes(u.id));

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-center text-xs font-semibold text-foreground">
                {pendingUsers.length > 0 && (
                  <input
                    type="checkbox"
                    checked={allPendingSelected}
                    onChange={() => handleSelectAll(users)}
                    className="rounded border-border"
                  />
                )}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">User ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Reporting To</th>
              {viewTab === 'inactive' && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Previous Manager</th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Branch</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Refer Code</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-center">
                  {u.status !== 'active' && (
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(u.id)}
                      onChange={() => handleSelectUser(u.id)}
                      className="rounded border-border"
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">{u.full_name || '(No name)'}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground truncate">{u.phone || '—'}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{u.user_id}</td>
                <td className="px-4 py-3 text-sm text-blue-600 font-medium">{u.reporting_to ? getManagerName(u.reporting_to) : '—'}</td>
                {viewTab === 'inactive' && (
                  <td className="px-4 py-3 text-sm text-purple-600 font-medium">
                    {u.last_manager_name || '—'}
                    {u.relationship && (
                      <span className="ml-2 text-xs text-gray-500">({u.relationship})</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 text-sm text-green-600">{u.branch_name || '—'}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.status === 'active' ? 'bg-green-100 text-green-800' :
                    u.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                    {u.status === 'active' ? 'Approved' : u.status === 'rejected' ? 'Rejected' : 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {['team_leader', 'branch_manager', 'dsa', 'sales_manager'].includes(u.role) ? (
                    u.refer_code ? (
                      <code className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                        {u.refer_code}
                      </code>
                    ) : (
                      <span className="text-gray-400 text-xs">Not Generated</span>
                    )
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {viewTab === 'active' && (
                      <>
                        {u.status !== 'active' && (
                          <button
                            onClick={() => handleApproveUser(u)}
                            disabled={approveUserMutation.isPending}
                            className="p-1.5 rounded-lg hover:bg-green-100 transition-colors text-green-600 hover:text-green-700 disabled:opacity-50"
                            title="Approve User"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        {u.status !== 'rejected' && (
                          <button
                            onClick={() => handleRejectUser(u)}
                            disabled={rejectUserMutation.isPending}
                            className="p-1.5 rounded-lg hover:bg-red-100 transition-colors text-red-600 hover:text-red-700 disabled:opacity-50"
                            title="Reject User"
                          >
                            <X size={14} />
                          </button>
                        )}
                        <button onClick={() => handleAssignRole(u)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Edit User">
                          <Edit size={14} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleArchiveUser(u)}
                            disabled={archiveUserMutation.isPending}
                            className="p-1.5 rounded-lg hover:bg-orange-100 transition-colors text-orange-600 hover:text-orange-700 disabled:opacity-50"
                            title="Archive User"
                          >
                            <Archive size={14} />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={deleteUserMutation.isPending}
                            className="p-1.5 rounded-lg hover:bg-red-100 transition-colors text-red-600 hover:text-red-700 disabled:opacity-50"
                            title="Delete User Permanently"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {/* Delete Confirmation Modal */}
                        {deleteModalOpen && userToDelete && (
                          <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
                            <div className="bg-background rounded-lg shadow-lg p-6 w-96">
                              <h3 className="text-lg font-semibold mb-4">Reassign Team Before Deleting</h3>
                              <p className="mb-2">Select a manager to reassign {userToDelete.full_name}'s team (optional).</p>
                              <select
                                className="w-full border rounded p-2 mb-4"
                                value={reassignTarget ?? ''}
                                onChange={e => setReassignTarget(e.target.value ? Number(e.target.value) : undefined)}
                              >
                                <option value="">-- No Reassignment (will leave subordinates without a manager) --</option>
                                {(activeUsers || []).map((opt: any) => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.full_name} ({opt.role})
                                  </option>
                                ))}
                              </select>
                              <div className="flex justify-end space-x-2">
                                <button
                                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                                  onClick={() => setDeleteModalOpen(false)}
                                >
                                  Cancel
                                </button>
                                <button
                                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                                  onClick={confirmDelete}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        {(isAdmin || ['sales_manager', 'branch_manager', 'team_leader'].includes(user?.role || '')) && (
                          <button
                            onClick={() => handleInactivateUser(u)}
                            disabled={inactivateUserMutation.isPending}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-700 disabled:opacity-50"
                            title="Mark as Inactive"
                          >
                            <Ban size={14} />
                          </button>
                        )}
                      </>
                    )}
                    {(viewTab === 'archived' || viewTab === 'inactive') && (
                      <button
                        onClick={() => handleRestoreUser(u)}
                        disabled={restoreUserMutation.isPending}
                        className="p-1.5 rounded-lg hover:bg-green-100 transition-colors text-green-600 hover:text-green-700 disabled:opacity-50"
                        title="Restore to Active"
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage system users, roles, and reporting hierarchy</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'sales_manager' || user?.role === 'branch_manager' || user?.role === 'dsa' || user?.role === 'team_leader') && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                setSelectedUser(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm"
            >
              <Users size={16} /> Add New User
            </button>
            {selectedUsers.length > 0 && (
              <button
                onClick={handleBulkApprove}
                disabled={bulkApproveUsers.isPending}
                className="inline-flex items-center gap-2 bg-green-600 text-white font-semibold py-2.5 px-4 rounded-xl hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
              >
                <Check size={16} /> Approve Selected ({selectedUsers.length})
              </button>
            )}
            {/* Debug info */}
            <div className="text-xs text-gray-500 flex items-center">
              Selected: {selectedUsers.length}
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation - Admin and Managers */}
      {/* Always show tabs for debugging - remove this condition later */}
      <div className="flex items-center gap-2 mb-6">
        {/* Debug: Show current role */}
        <div className="text-xs text-gray-500 mr-4 px-2 py-1 bg-yellow-100 rounded">Role: {user?.role || 'undefined'}</div>
        <button
          onClick={() => setViewTab('active')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            viewTab === 'active'
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Active Users
        </button>
        <button
          onClick={() => setViewTab('archived')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            viewTab === 'archived'
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Archived
        </button>
        <button
          onClick={() => setViewTab('inactive')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            viewTab === 'inactive'
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Inactive
        </button>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {isAdmin && (
          <div
            onClick={() => setRoleFilter(roleFilter === 'admin' ? 'all' : 'admin')}
            className={`stat-card cursor-pointer text-center ${roleFilter === 'admin' ? 'ring-2 ring-accent' : ''}`}
          >
            <p className="text-lg font-bold text-foreground">{roleCounts['admin'] || 0}</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        )}

        {isAdmin && (
          <div
            onClick={() => setRoleFilter(roleFilter === 'sales_manager' ? 'all' : 'sales_manager')}
            className={`stat-card cursor-pointer text-center ${roleFilter === 'sales_manager' ? 'ring-2 ring-accent' : ''}`}
          >
            <p className="text-lg font-bold text-foreground">{roleCounts['sales_manager'] || 0}</p>
            <p className="text-xs text-muted-foreground">Sales Manager</p>
          </div>
        )}

        {isAdmin && (
          <div
            onClick={() => setRoleFilter(roleFilter === 'operation_team' ? 'all' : 'operation_team')}
            className={`stat-card cursor-pointer text-center ${roleFilter === 'operation_team' ? 'ring-2 ring-accent' : ''}`}
          >
            <p className="text-lg font-bold text-foreground">{(roleCounts['operation_team'] || 0) + (roleCounts['ops_team'] || 0)}</p>
            <p className="text-xs text-muted-foreground">Operations Team</p>
          </div>
        )}

        {isAdmin && (
          <div
            onClick={() => setRoleFilter(roleFilter === 'loan_operations' ? 'all' : 'loan_operations')}
            className={`stat-card cursor-pointer text-center ${roleFilter === 'loan_operations' ? 'ring-2 ring-accent' : ''}`}
          >
            <p className="text-lg font-bold text-foreground">{roleCounts['loan_operations'] || 0}</p>
            <p className="text-xs text-muted-foreground">Loan Operations</p>
          </div>
        )}

        <div
          onClick={() => setRoleFilter(roleFilter === 'branch_manager_dsa' ? 'all' : 'branch_manager_dsa')}
          className={`stat-card cursor-pointer text-center ${roleFilter === 'branch_manager_dsa' ? 'ring-2 ring-accent' : ''}`}
        >
          <p className="text-lg font-bold text-foreground">{(roleCounts['branch_manager'] || 0) + (roleCounts['dsa'] || 0)}</p>
          <p className="text-xs text-muted-foreground">BM / DSA</p>
        </div>

        <div
          onClick={() => setRoleFilter(roleFilter === 'team_leader' ? 'all' : 'team_leader')}
          className={`stat-card cursor-pointer text-center ${roleFilter === 'team_leader' ? 'ring-2 ring-accent' : ''}`}
        >
          <p className="text-lg font-bold text-foreground">{roleCounts['team_leader'] || 0}</p>
          <p className="text-xs text-muted-foreground">Team Leader</p>
        </div>

        <div
          onClick={() => setRoleFilter(roleFilter === 'executive' ? 'all' : 'executive')}
          className={`stat-card cursor-pointer text-center ${roleFilter === 'executive' ? 'ring-2 ring-accent' : ''}`}
        >
          <p className="text-lg font-bold text-foreground">{roleCounts['executive'] || 0}</p>
          <p className="text-xs text-muted-foreground">Executive</p>
        </div>

        {isAdmin && (
          <div
            onClick={() => setRoleFilter(roleFilter === 'accountant' ? 'all' : 'accountant')}
            className={`stat-card cursor-pointer text-center ${roleFilter === 'accountant' ? 'ring-2 ring-accent' : ''}`}
          >
            <p className="text-lg font-bold text-foreground">{roleCounts['accountant'] || 0}</p>
            <p className="text-xs text-muted-foreground">Accountant</p>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="stat-card mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Users by Role */}
      <div className="space-y-4">
        {currentLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading users…</div>
        ) : error ? (
          <div className="py-8 text-center text-destructive text-sm">Error loading users.</div>
        ) : allFiltered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No users found</p>
        ) : (
          <>
            {/* Admin Section */}
            {isAdmin && (roleFilter === 'all' || roleFilter === 'admin') && (usersByRole['admin']?.length > 0) && (
              <div className="stat-card">
                <h3 className="text-md font-semibold mb-3 text-foreground flex items-center gap-2">
                  <Shield size={18} className="text-accent" /> Admin ({usersByRole['admin']?.length || 0})
                </h3>
                <UserTable users={usersByRole['admin']} />
              </div>
            )}

            {/* Sales Manager Section */}
            {isAdmin && (roleFilter === 'all' || roleFilter === 'sales_manager') && (usersByRole['sales_manager']?.length > 0) && (
              <div className="stat-card">
                <h3 className="text-md font-semibold mb-3 text-foreground flex items-center gap-2">
                  <Shield size={18} className="text-accent" /> Sales Manager ({usersByRole['sales_manager']?.length || 0})
                </h3>
                <UserTable users={usersByRole['sales_manager']} />
              </div>
            )}

            {/* Operations Team Section */}
            {(roleFilter === 'all' || roleFilter === 'operation_team') && ((usersByRole['operation_team']?.length > 0) || (usersByRole['ops_team']?.length > 0)) && (
              <div className="stat-card">
                <h3 className="text-md font-semibold mb-3 text-foreground flex items-center gap-2">
                  <Shield size={18} className="text-accent" /> Operations Team ({(usersByRole['operation_team']?.length || 0) + (usersByRole['ops_team']?.length || 0)})
                </h3>
                <UserTable users={[...(usersByRole['operation_team'] || []), ...(usersByRole['ops_team'] || [])]} />
              </div>
            )}

            {/* Loan Operations Section */}
            {(roleFilter === 'all' || roleFilter === 'loan_operations') && (usersByRole['loan_operations']?.length > 0) && (
              <div className="stat-card">
                <h3 className="text-md font-semibold mb-3 text-foreground flex items-center gap-2">
                  <Shield size={18} className="text-accent" /> Loan Operations ({usersByRole['loan_operations']?.length || 0})
                </h3>
                <UserTable users={usersByRole['loan_operations']} />
              </div>
            )}

            {/* Branch Manager & DSA Section (Combined) */}
            {(roleFilter === 'all' || roleFilter === 'branch_manager_dsa') && ((usersByRole['branch_manager']?.length > 0) || (usersByRole['dsa']?.length > 0)) && (
              <div className="stat-card">
                <h3 className="text-md font-semibold mb-3 text-foreground flex items-center gap-2">
                  <Shield size={18} className="text-accent" /> Branch Manager & DSA ({(usersByRole['branch_manager']?.length || 0) + (usersByRole['dsa']?.length || 0)})
                </h3>
                <UserTable users={[...(usersByRole['branch_manager'] || []), ...(usersByRole['dsa'] || [])]} />
              </div>
            )}

            {/* Team Leader Section */}
            {(roleFilter === 'all' || roleFilter === 'team_leader') && (usersByRole['team_leader']?.length > 0) && (
              <div className="stat-card">
                <h3 className="text-md font-semibold mb-3 text-foreground flex items-center gap-2">
                  <Shield size={18} className="text-accent" /> Team Leader ({usersByRole['team_leader']?.length || 0})
                </h3>
                <UserTable users={usersByRole['team_leader']} />
              </div>
            )}

            {/* Executive Section */}
            {(roleFilter === 'all' || roleFilter === 'executive') && (usersByRole['executive']?.length > 0) && (
              <div className="stat-card">
                <h3 className="text-md font-semibold mb-3 text-foreground flex items-center gap-2">
                  <Shield size={18} className="text-accent" /> Executive ({usersByRole['executive']?.length || 0})
                </h3>
                <UserTable users={usersByRole['executive']} />
              </div>
            )}

            {/* Accountant Section */}
            {isAdmin && (roleFilter === 'all' || roleFilter === 'accountant') && (usersByRole['accountant']?.length > 0) && (
              <div className="stat-card">
                <h3 className="text-md font-semibold mb-3 text-foreground flex items-center gap-2">
                  <Shield size={18} className="text-accent" /> Accountant ({usersByRole['accountant']?.length || 0})
                </h3>
                <UserTable users={usersByRole['accountant']} />
              </div>
            )}
          </>
        )}
      </div>

      <RoleAssignModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={refetch} user={selectedUser} />
      {reassignState && (
        <ReassignTeamModal
          open={!!reassignState}
          onClose={() => setReassignState(null)}
          user={reassignState.user}
          action={reassignState.action}
          subordinatesCount={reassignState.subordinatesCount}
          onConfirm={(newManagerId) => {
            if (reassignState.action === 'archive') {
              archiveUserMutation.mutate({ userId: reassignState.user.id, new_manager_id: newManagerId });
            } else {
              inactivateUserMutation.mutate({ userId: reassignState.user.id, new_manager_id: newManagerId });
            }
          }}
        />
      )}
    </div>
  );
}

