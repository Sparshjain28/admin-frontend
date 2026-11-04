import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface RoleAssignModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: any;
  defaultBranchId?: number | string;
}

export function RoleAssignModal({ open, onClose, onSuccess, user: targetUser, defaultBranchId }: RoleAssignModalProps) {
  const { user } = useAuth();
  const [role, setRole] = useState(targetUser?.role || 'executive');
  const [branchId, setBranchId] = useState(targetUser?.branch_id || '');
  const [reportingTo, setReportingTo] = useState(targetUser?.reporting_to || '');
  const [dsaId, setDsaId] = useState(targetUser?.dsa_id || '');
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(targetUser?.full_name || '');
  const [phone, setPhone] = useState(targetUser?.phone || '');
  const [mpin, setMpin] = useState('');
  const [error, setError] = useState('');
  const [branchSearch, setBranchSearch] = useState('');

  // Determine allowed roles based on current user role
  const getAllowedRoles = () => {
    switch (user?.role) {
      case 'admin':
        return {
          admin: ROLE_LABELS.admin,
          operation_team: ROLE_LABELS.operation_team,
          loan_operations: ROLE_LABELS.loan_operations,
          sales_manager: ROLE_LABELS.sales_manager,
          accountant: ROLE_LABELS.accountant,
          branch_manager: ROLE_LABELS.branch_manager,
          dsa: ROLE_LABELS.dsa,
          team_leader: ROLE_LABELS.team_leader,
          executive: ROLE_LABELS.executive
        };
      case 'operation_team':
        return {
          loan_operations: ROLE_LABELS.loan_operations,
          sales_manager: ROLE_LABELS.sales_manager,
          branch_manager: ROLE_LABELS.branch_manager,
          dsa: ROLE_LABELS.dsa,
          team_leader: ROLE_LABELS.team_leader,
          executive: ROLE_LABELS.executive,
          accountant: ROLE_LABELS.accountant,
        };
      case 'loan_operations':
        return {
          executive: ROLE_LABELS.executive,
          dsa: ROLE_LABELS.dsa
        };
      case 'sales_manager':
        return {
          branch_manager: ROLE_LABELS.branch_manager,
          dsa: ROLE_LABELS.dsa,
          team_leader: ROLE_LABELS.team_leader,
          executive: ROLE_LABELS.executive
        };
      case 'branch_manager':
        return {
          team_leader: ROLE_LABELS.team_leader,
          executive: ROLE_LABELS.executive
        };
      case 'dsa':
        return {
          team_leader: ROLE_LABELS.team_leader,
          executive: ROLE_LABELS.executive
        };
      case 'team_leader':
        return { executive: ROLE_LABELS.executive };
      default:
        return {};
    }
  };

  const allowedRoles = getAllowedRoles();

  const { data: branchesData } = useQuery({
    queryKey: ['branches', branchSearch],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/branches?limit=50&search=${branchSearch}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch branches');
      return res.json();
    },
  });

  const branches = branchesData?.data || [];

  const { data: managers = [] } = useQuery({
    queryKey: ['managers', role],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const users = await res.json();

      // Filter based on selected role
      if (role === 'sales_manager') {
        return users.filter((u: any) => ['operation_team', 'loan_operations', 'sales_manager'].includes(u.role) && u.id !== targetUser?.id);
      } else if (role === 'branch_manager' || role === 'dsa') {
        return users.filter((u: any) => u.role === 'sales_manager');
      } else if (role === 'team_leader') {
        return users.filter((u: any) => ['branch_manager', 'dsa'].includes(u.role));
      } else if (role === 'executive') {
        // Executive can report to Team Leader, BM, DSA, or Sales Manager
        return users.filter((u: any) => ['team_leader', 'branch_manager', 'dsa', 'sales_manager'].includes(u.role));
      }
      return users.filter((u: any) => ['admin', 'operation_team', 'loan_operations'].includes(u.role));
    },
    enabled: open,
  });

  const { data: dsas = [] } = useQuery({
    queryKey: ['dsas'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const users = await res.json();
      return users.filter((u: any) => u.role === 'dsa');
    },
    enabled: open && role === 'team_leader',
  });

  useEffect(() => {
    if (targetUser) {
      setRole(targetUser.role || 'executive');
      setBranchId(targetUser.branch_id || '');
      setReportingTo(targetUser.reporting_to || '');
      setDsaId(targetUser.dsa_id || '');
      setFullName(targetUser.full_name || '');
      setPhone(targetUser.phone || '');
    } else {
      setRole('executive');
      setBranchId(defaultBranchId || (user?.role === 'branch_manager' ? (user?.branch_id || '') : ''));
      setDsaId('');
      setReportingTo(user?.role === 'team_leader' ? user.id : (user?.role === 'branch_manager' ? user.id : ''));
      setFullName('');
      setPhone('');
      setMpin('');
    }
    setError('');
  }, [targetUser, user]);

  useEffect(() => {
    if (!targetUser && role === 'team_leader' && user?.role === 'branch_manager') {
      setBranchId(user?.branch_id || '');
      setReportingTo(user.id);
    }
  }, [role, targetUser, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate full name
    if (!fullName || !fullName.trim()) {
      setError('Full name is required');
      return;
    }

    // Validate mobile number if provided
    if (!phone || phone.length !== 10) {
      setError('Mobile number is required and must be exactly 10 digits');
      return;
    }

    // Validate mobile number contains only digits
    if (phone && !/^\d{10}$/.test(phone)) {
      setError('Mobile number must contain only digits');
      return;
    }

    // Validate MPIN for new users
    if (!targetUser) {
      if (!mpin || mpin.length !== 4) {
        setError('MPIN is required and must be exactly 4 digits');
        return;
      }

      if (!/^\d{4}$/.test(mpin)) {
        setError('MPIN must contain only digits');
        return;
      }
    }

    setLoading(true);
    try {
      if (targetUser) {
        // Update existing user
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/${targetUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify({
            full_name: fullName,
            phone,
            role,
            branch_id: branchId || null,
            reporting_to: reportingTo || null,
            dsa_id: dsaId || null
          }),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to update user');
        }
        const updated = await res.json().catch(() => ({}));
        if (updated?.dsa_invite) {
          toast.success('DSA invite sent. The role changes to DSA only after the application is completed and approved.');
        } else {
          toast.success('User updated successfully!');
        }
      } else {
        // Create new user
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify({
            full_name: fullName,
            phone,
            mpin,
            role,
            branch_id: branchId || null,
            reporting_to: reportingTo || null,
            dsa_id: dsaId || null
          }),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to create user');
        }
        const created = await res.json().catch(() => ({}));
        if (created?.dsa_invite) {
          toast.success('User created as an executive and a DSA invite was sent. The role changes to DSA only after approval.');
        } else {
          toast.success('User created successfully!');
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMsg = err.message || (targetUser ? 'Failed to update user' : 'Failed to create user');
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden sm:p-6">
        <DialogHeader className="p-6 pb-2 sm:p-0">
          <DialogTitle>{targetUser ? `Edit User — ${targetUser?.full_name || targetUser?.user_id}` : 'Add New User with Mobile & MPIN'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6 overflow-y-auto max-h-[70dvh] sm:max-h-full sm:px-0 sm:pb-0">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Full Name {!targetUser && '*'}</label>
            <input
              type="text"
              required={!targetUser}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Mobile Number *</label>
            <input
              type="tel"
              required
              className={`w-full px-3 py-2 rounded-lg border bg-background ${phone && phone.length > 0
                ? phone.length === 10 && /^\d{10}$/.test(phone)
                  ? 'border-green-500 focus:border-green-500'
                  : 'border-red-500 focus:border-red-500'
                : 'border-border'
              }`}
              value={phone}
              onChange={e => {
                const value = e.target.value;
                if (/^\d{0,10}$/.test(value)) {
                  setPhone(value);
                }
              }}
              onKeyPress={e => {
                if (!/\d/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              placeholder="Enter 10-digit mobile number"
              maxLength={10}
              pattern="[0-9]{10}"
              title="Please enter a valid 10-digit mobile number"
            />
            {phone && phone.length > 0 && (
              <div className="mt-1 text-xs">
                {phone.length === 10 && /^\d{10}$/.test(phone) ? (
                  <span className="text-green-600">✓ Valid mobile number</span>
                ) : (
                  <span className="text-red-600">⚠ Mobile number must be exactly 10 digits</span>
                )}
              </div>
            )}
          </div>
          {!targetUser && (
            <div>
              <label className="block text-sm font-medium mb-1.5">MPIN *</label>
              <input
                type="password"
                required
                className={`w-full px-3 py-2 rounded-lg border bg-background ${mpin && mpin.length > 0
                  ? mpin.length === 4 && /^\d{4}$/.test(mpin)
                    ? 'border-green-500 focus:border-green-500'
                    : 'border-red-500 focus:border-red-500'
                  : 'border-border'
                }`}
                value={mpin}
                onChange={e => {
                  const value = e.target.value;
                  if (/^\d{0,4}$/.test(value)) {
                    setMpin(value);
                  }
                }}
                onKeyPress={e => {
                  if (!/\d/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                placeholder="Enter 4-digit MPIN"
                maxLength={4}
                pattern="[0-9]{4}"
                title="Please enter a valid 4-digit MPIN"
              />
              {mpin && mpin.length > 0 && (
                <div className="mt-1 text-xs">
                  {mpin.length === 4 && /^\d{4}$/.test(mpin) ? (
                    <span className="text-green-600">✓ Valid MPIN</span>
                  ) : (
                    <span className="text-red-600">⚠ MPIN must be exactly 4 digits</span>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">4-digit Mobile PIN for secure access</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">Select Role *</label>
            <select required className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={role} onChange={e => setRole(e.target.value)}>
              {Object.entries(allowedRoles).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {(role === 'branch_manager') && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Select Branch *</label>
              <input
                type="text"
                placeholder="Search branches..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background mb-2"
                value={branchSearch}
                onChange={e => setBranchSearch(e.target.value)}
              />
              <select required className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={branchId} onChange={e => setBranchId(e.target.value)}>
                <option value="">Select a branch</option>
                {branches.map((branch: any) => (
                  <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>
                ))}
              </select>
            </div>
          )}

          {role === 'sales_manager' && managers.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Reporting To (Sales Manager / Operation Team)</label>
              <select className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={reportingTo} onChange={e => setReportingTo(e.target.value)}>
                <option value="">Select reporting person</option>
                {managers.map((manager: any) => (
                  <option key={manager.id} value={manager.id}>{manager.full_name} ({ROLE_LABELS[manager.role as keyof typeof ROLE_LABELS] || manager.role})</option>
                ))}
              </select>
            </div>
          )}

          {(role === 'branch_manager' || role === 'dsa') && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Reporting To (Sales Manager)</label>
              <select className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={reportingTo} onChange={e => setReportingTo(e.target.value)}>
                <option value="">Select a sales manager</option>
                {managers.map((manager: any) => (
                  <option key={manager.id} value={manager.id}>{manager.full_name}</option>
                ))}
              </select>
            </div>
          )}

          {role === 'team_leader' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Reporting To (Branch Manager / DSA) *</label>
                <select className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={reportingTo} onChange={e => setReportingTo(e.target.value)}>
                  <option value="">Select a manager</option>
                  {managers.map((manager: any) => (
                    <option key={manager.id} value={manager.id}>{manager.full_name} ({ROLE_LABELS[manager.role as keyof typeof ROLE_LABELS] || manager.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Select Branch *</label>
                <input
                  type="text"
                  placeholder="Search branches..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background mb-2"
                  value={branchSearch}
                  onChange={e => setBranchSearch(e.target.value)}
                />
                <select required className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={branchId} onChange={e => setBranchId(e.target.value)}>
                  <option value="">Select a branch</option>
                  {branches.map((branch: any) => (
                    <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>
                  ))}
                </select>
              </div>
              {user?.role === 'dsa' && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Associated DSA</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={dsaId} onChange={e => setDsaId(e.target.value)}>
                    <option value="">No DSA</option>
                    {dsas.map((dsa: any) => (
                      <option key={dsa.id} value={dsa.id}>{dsa.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {role === 'executive' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Reporting To (Team Leader / BM / DSA / Sales Manager)</label>
              <select className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={reportingTo} onChange={e => setReportingTo(e.target.value)}>
                <option value="">Select reporting person</option>
                {managers.map((manager: any) => (
                  <option key={manager.id} value={manager.id}>{manager.full_name} ({ROLE_LABELS[manager.role as keyof typeof ROLE_LABELS] || manager.role})</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold disabled:opacity-60">{loading ? 'Saving...' : (targetUser ? 'Save Changes' : 'Create User')}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
