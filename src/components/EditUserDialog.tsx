import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Loader2, CheckCircle, Shield, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FloatingLabelInput from '@/components/FloatingLabelInput';
import { toast } from '@/hooks/use-toast';
import { useRole } from '@/contexts/RoleContext';
import { ROLE_LABELS, UserRole } from '@/types';
import { api } from '@/services/api';

const ROLES: UserRole[] = ['super_admin', 'manager', 'branch_manager', 'dsa_partner', 'team_leader', 'employee'];

const ROLE_RANK: Record<string, number> = {
  super_admin: 5, manager: 4, branch_manager: 3, dsa_partner: 2, team_leader: 1, employee: 0,
};

interface EditUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: any;
  allUsers: any[];
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({ isOpen, onClose, onSuccess, user, allUsers }) => {
  const { role: currentUserRole } = useRole();
  const [editForm, setEditForm] = useState({
    name: '', mobile: '', email: '', pan: '',
    role: 'employee', managerId: '', referredById: '', dob: '', bankAccount: '', ifsc: '',
  });

  const [editLoading, setEditLoading] = useState(false);
  const [managerSearchQuery, setManagerSearchQuery] = useState('');
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const [referredBySearchQuery, setReferredBySearchQuery] = useState('');
  const [showReferredByDropdown, setShowReferredByDropdown] = useState(false);
  const [allUsersFromBackend, setAllUsersFromBackend] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const managerDropdownRef = useRef<HTMLDivElement>(null);
  const referredByDropdownRef = useRef<HTMLDivElement>(null);

  // PAN Verification state
  const [panVerifying, setPanVerifying] = useState(false);
  const [panVerified, setPanVerified] = useState(false);
  const [panResult, setPanResult] = useState<any>(null);

  // Bank Verification state
  const [bankVerifying, setBankVerifying] = useState(false);
  const [bankVerified, setBankVerified] = useState(false);
  const [bankResult, setBankResult] = useState<any>(null);

  // Filter roles based on current user's role
  const availableRoles = ROLES.filter(r => 
    currentUserRole === 'super_admin' || 
    ROLE_RANK[r] < ROLE_RANK[currentUserRole as keyof typeof ROLE_RANK]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (managerDropdownRef.current && !managerDropdownRef.current.contains(event.target as Node)) {
        setShowManagerDropdown(false);
      }
      if (referredByDropdownRef.current && !referredByDropdownRef.current.contains(event.target as Node)) {
        setShowReferredByDropdown(false);
      }
    };
    if (showManagerDropdown || showReferredByDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showManagerDropdown, showReferredByDropdown]);

  const filteredManagers = managerSearchQuery.trim() 
    ? allUsers.filter(u => {
        if (u.id === user?.id) return false;
        const query = managerSearchQuery.toLowerCase();
        return (
          u.id.toLowerCase().includes(query) ||
          u.name.toLowerCase().includes(query) ||
          (u.mobile && u.mobile.includes(query))
        );
      }).slice(0, 10)
    : [];

  const filteredReferredBy = referredBySearchQuery.trim() 
    ? allUsersFromBackend.filter(u => {
        if (u.id === user?.id) return false;
        if (u.role !== 'dsa_partner') return false;
        const query = referredBySearchQuery.toLowerCase();
        return (
          u.id.toLowerCase().includes(query) ||
          u.name.toLowerCase().includes(query) ||
          (u.mobile && u.mobile.includes(query))
        );
      })
    : allUsersFromBackend.filter(u => u.id !== user?.id && u.role === 'dsa_partner').slice(0, 20);

  useEffect(() => {
    if (isOpen && user) {
      setEditForm({
        name: user.name || '',
        mobile: user.mobile || '',
        email: user.email || '',
        pan: user.pan || '',
        dob: user.dob || '',
        bankAccount: user.bankAccount || '',
        ifsc: user.ifsc || '',
        role: user.role || 'employee',
        managerId: user.manager?.id || '',
        referredById: user.referredById || '',
      });
      setManagerSearchQuery('');
      setReferredBySearchQuery('');
      setShowManagerDropdown(false);
      setShowReferredByDropdown(false);
      
      // Fetch all users from backend
      fetchAllUsers();
    }
  }, [isOpen, user]);

  const fetchAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const token = localStorage.getItem('auth_token');
      const BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000').replace(/\/$/, '');
      const response = await fetch(`${BASE}/api/users?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.users) {
          setAllUsersFromBackend(data.users);
        }
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editForm.name || !editForm.mobile) {
      toast({ title: 'Error', description: 'Name and mobile are required', variant: 'destructive' });
      return;
    }

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (editForm.pan && !panRegex.test(editForm.pan)) {
      toast({ title: 'Error', description: 'Invalid PAN format. Format should be like ABCDE1234F.', variant: 'destructive' });
      return;
    }

    if (editForm.bankAccount) {
      const bankAccountRegex = /^[0-9]{9,18}$/;
      if (!bankAccountRegex.test(editForm.bankAccount.trim())) {
        toast({ title: 'Error', description: 'Bank account must contain 9-18 digits only.', variant: 'destructive' });
        return;
      }
    }

    if (editForm.ifsc) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(editForm.ifsc.trim())) {
        toast({ title: 'Error', description: 'Invalid IFSC format. Format should be like SBIN0001234.', variant: 'destructive' });
        return;
      }
    }

    setEditLoading(true);
    try {
      const updateData = {
        name: editForm.name,
        mobile: editForm.mobile,
        email: editForm.email,
        pan: editForm.pan,
        dob: editForm.dob,
        bankAccount: editForm.bankAccount,
        ifsc: editForm.ifsc,
      };

      // Only super_admin can update role and manager
      if (currentUserRole === 'super_admin') {
        (updateData as any).role = editForm.role;
        (updateData as any).managerId = editForm.managerId || undefined;
        (updateData as any).referredById = editForm.referredById || undefined;
      }

      const response = await api.updateUser(user.id, updateData);

      if (response.success) {
        toast({ title: 'Success', description: `${editForm.name} updated successfully` });
        onSuccess();
        onClose();
      } else {
        toast({ title: 'Error', description: response.error || 'Failed to update user', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update user', variant: 'destructive' });
    } finally {
      setEditLoading(false);
    }
  };

  const handlePanVerify = async () => {
    if (editForm.pan.length !== 10) {
      toast({ title: 'Error', description: 'Enter valid 10-char PAN', variant: 'destructive' });
      return;
    }
    setPanVerifying(true);
    try {
      const BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000').replace(/\/$/, '');
      
      // First check if PAN already exists in database
      const checkRes = await fetch(`${BASE}/api/auth/check-pan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pan: editForm.pan }),
      });
      const checkData = await checkRes.json();

      if (checkData.exists) {
        toast({
          title: 'PAN Already Exists',
          description: 'This PAN is already registered in the system.',
          variant: 'destructive'
        });
        setPanVerifying(false);
        return;
      }

      // If PAN doesn't exist, proceed with verification
      const res = await fetch(`${BASE}/api/pan/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_number: editForm.pan }),
      });
      const data = await res.json();
      if (data.success) {
        setPanResult(data.data);
        setPanVerified(true);
        // Automatically update user name with verified PAN name
        setEditForm(prev => ({
          ...prev,
          name: data.data?.full_name || prev.name
        }));
        
        // Save PAN details to database immediately after verification using the user's ID
        const token = localStorage.getItem('auth_token');
        const saveRes = await fetch(`${BASE}/api/users/${user.id}/update-pan`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            panNumber: editForm.pan,
            fullName: data.data?.full_name,
            firstName: data.data?.first_name,
            middleName: data.data?.middle_name,
            lastName: data.data?.last_name,
            dob: data.data?.dob,
            gender: data.data?.gender,
            email: data.data?.email,
            phoneNumber: data.data?.phone_number,
            maskedAadhaar: data.data?.masked_aadhaar,
            aadhaarLinked: data.data?.aadhaar_linked,
            category: data.data?.category,
            addressLine1: data.data?.address_line1,
            addressLine2: data.data?.address_line2,
            streetName: data.data?.street_name,
            zip: data.data?.zip,
            city: data.data?.city,
            state: data.data?.state,
            country: data.data?.country,
            fullAddress: data.data?.full_address,
          }),
        });

        if (saveRes.ok) {
          toast({ title: 'PAN Verified & Saved', description: `Name: ${data.data?.full_name}` });
        } else {
          toast({ title: 'PAN Verified', description: `Name: ${data.data?.full_name}, but couldn't save details` });
        }
      } else {
        toast({ title: 'Failed', description: data.message || 'PAN verification failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'PAN verification failed', variant: 'destructive' });
    } finally {
      setPanVerifying(false);
    }
  };

  const handleBankVerify = async () => {
    if (!editForm.bankAccount || !editForm.ifsc) {
      toast({ title: 'Error', description: 'Enter account number and IFSC', variant: 'destructive' });
      return;
    }
    const bankAccountRegex = /^[0-9]{9,18}$/;
    if (!bankAccountRegex.test(editForm.bankAccount.trim())) {
      toast({ title: 'Error', description: 'Invalid bank account number', variant: 'destructive' });
      return;
    }
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(editForm.ifsc.trim())) {
      toast({ title: 'Error', description: 'Invalid IFSC format', variant: 'destructive' });
      return;
    }

    setBankVerifying(true);
    try {
      const token = localStorage.getItem('auth_token');
      const BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000').replace(/\/$/, '');
      
      // First check if bank account already exists in database
      const checkRes = await fetch(`${BASE}/api/auth/check-bank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bankAccount: editForm.bankAccount, ifsc: editForm.ifsc }),
      });
      const checkData = await checkRes.json();

      if (checkData.exists) {
        toast({
          title: 'Bank Account Already Exists',
          description: 'This bank account is already registered in the system.',
          variant: 'destructive'
        });
        setBankVerifying(false);
        return;
      }

      // If bank account doesn't exist, proceed with verification
      const res = await fetch(`${BASE}/api/bank/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_number: editForm.bankAccount, ifsc: editForm.ifsc }),
      });
      const data = await res.json();

      if (data.success) {
        setBankResult(data.data);
        setBankVerified(true);
        
        // Save bank details to database immediately after verification using the user's ID
        const saveRes = await fetch(`${BASE}/api/users/${user.id}/update-bank`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            bankAccount: editForm.bankAccount,
            ifsc: editForm.ifsc,
            nameAtBank: data.data?.name_at_bank,
            bankName: data.data?.bank_name,
            bankBranch: data.data?.branch,
            bankCity: data.data?.city,
            bankState: data.data?.state,
            bankAddress: data.data?.address,
            bankContact: data.data?.contact,
          }),
        });

        if (saveRes.ok) {
          toast({ title: 'Bank Verified & Saved', description: `Account holder: ${data.data?.name_at_bank}, Bank: ${data.data?.bank_name}` });
        } else {
          toast({ title: 'Bank Verified', description: `Account holder: ${data.data?.name_at_bank}` });
        }
      } else {
        toast({ title: 'Failed', description: data.message || 'Bank verification failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Bank verification failed', variant: 'destructive' });
    } finally {
      setBankVerifying(false);
    }
  };

  if (!isOpen || !user) return null;

  const selectedManager = editForm.managerId 
    ? allUsers.find(u => u.id === editForm.managerId)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl shadow-xl border border-border w-full max-w-2xl mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-foreground">Edit User: {user.name}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Basic Information */}
          <div className="border-b border-border pb-4">
            <h3 className="text-sm font-semibold text-card-foreground mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FloatingLabelInput
                label="Full Name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <FloatingLabelInput
                label="Mobile Number"
                value={editForm.mobile}
                onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
              />
              <FloatingLabelInput
                label="Email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
              <FloatingLabelInput
                label="PAN Number"
                value={editForm.pan}
                onChange={(e) => setEditForm({ ...editForm, pan: e.target.value.toUpperCase() })}
                placeholder=""
              />
              <FloatingLabelInput
                type="date"
                value={editForm.dob}
                onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
              />
            </div>
          </div>

          {/* Bank Information */}
          <div className="border-b border-border pb-4">
            <h3 className="text-sm font-semibold text-card-foreground mb-3">Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FloatingLabelInput
                label="Account Number"
                value={editForm.bankAccount}
                onChange={(e) => setEditForm({ ...editForm, bankAccount: e.target.value })}
              />
              <FloatingLabelInput
                label="IFSC Code"
                value={editForm.ifsc}
                onChange={(e) => setEditForm({ ...editForm, ifsc: e.target.value.toUpperCase() })}
                placeholder=""
              />
            </div>
            <Button
              onClick={handleBankVerify}
              disabled={bankVerifying}
              className="w-full mt-3 h-9 text-sm flex items-center justify-center gap-2"
            >
              {bankVerifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Verifying...
                </>
              ) : bankVerified ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Bank Verified
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  Verify Bank
                </>
              )}
            </Button>
            {bankVerified && bankResult && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200 space-y-2 text-xs">
                <p className="font-semibold text-green-700">✓ Bank Verified</p>
                <div>
                  <p className="text-muted-foreground">Account Holder</p>
                  <p className="font-medium">{bankResult.name_at_bank}</p>
                </div>
                {bankResult.bank_name && (
                  <div>
                    <p className="text-muted-foreground">Bank Name</p>
                    <p className="font-medium">{bankResult.bank_name}</p>
                  </div>
                )}
                {bankResult.branch && (
                  <div>
                    <p className="text-muted-foreground">Branch</p>
                    <p className="font-medium">{bankResult.branch}</p>
                  </div>
                )}
                {bankResult.city && (
                  <div>
                    <p className="text-muted-foreground">City</p>
                    <p className="font-medium">{bankResult.city}</p>
                  </div>
                )}
                {bankResult.state && (
                  <div>
                    <p className="text-muted-foreground">State</p>
                    <p className="font-medium">{bankResult.state}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PAN Verification */}
          <div className="border-b border-border pb-4">
            <h3 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              PAN Verification
            </h3>
            <Button
              onClick={handlePanVerify}
              disabled={panVerifying || editForm.pan.length !== 10}
              className="w-full h-9 text-sm flex items-center justify-center gap-2"
            >
              {panVerifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Verifying...
                </>
              ) : panVerified ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  PAN Verified
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Verify PAN
                </>
              )}
            </Button>
            {panVerified && panResult && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200 space-y-2 text-xs">
                <p className="font-semibold text-green-700">✓ PAN Verified</p>
                <div>
                  <p className="text-muted-foreground">Full Name</p>
                  <p className="font-medium">{panResult.full_name}</p>
                </div>
                {panResult.dob && panResult.dob !== '0001-07-00' && (
                  <div>
                    <p className="text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">{panResult.dob}</p>
                  </div>
                )}
                {panResult.gender && (
                  <div>
                    <p className="text-muted-foreground">Gender</p>
                    <p className="font-medium">{panResult.gender === 'M' ? 'Male' : panResult.gender === 'F' ? 'Female' : panResult.gender}</p>
                  </div>
                )}
                {panResult.email && (
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{panResult.email}</p>
                  </div>
                )}
                {panResult.phone_number && (
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{panResult.phone_number}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Role and Manager (only for super_admin) */}
          {currentUserRole === 'super_admin' && (
            <div className="border-b border-border pb-4">
              <h3 className="text-sm font-semibold text-card-foreground mb-3">Role & Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-card-foreground text-sm"
                  >
                    {availableRoles.map(r => (
                      <option key={r} value={r}>{ROLE_LABELS[r as keyof typeof ROLE_LABELS] || r}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 relative" ref={managerDropdownRef}>
                  <label className="text-xs text-muted-foreground">Reports To</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search manager..."
                      value={managerSearchQuery}
                      onChange={(e) => {
                        setManagerSearchQuery(e.target.value);
                        setShowManagerDropdown(true);
                      }}
                      onFocus={() => setShowManagerDropdown(true)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-card-foreground text-sm"
                    />
                    {editForm.managerId && !managerSearchQuery && (
                      <div className="absolute inset-0 flex items-center px-3 text-sm text-card-foreground pointer-events-none">
                        {allUsers.find(u => u.id === editForm.managerId)?.name}
                      </div>
                    )}
                    {showManagerDropdown && filteredManagers.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        {filteredManagers.map(u => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setEditForm({ ...editForm, managerId: u.id });
                              setManagerSearchQuery('');
                              setShowManagerDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-card-foreground border-b border-border last:border-b-0"
                          >
                            <div className="font-medium">{u.name}</div>
                            <div className="text-xs text-muted-foreground">{u.id}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {editForm.managerId && (
                    <button
                      onClick={() => setEditForm({ ...editForm, managerId: '' })}
                      className="text-xs text-muted-foreground hover:text-accent mt-1"
                    >
                      Clear manager
                    </button>
                  )}
                </div>

                <div className="space-y-2 relative" ref={referredByDropdownRef}>
                  <label className="text-xs text-muted-foreground">Referred By</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search referrer..."
                      value={referredBySearchQuery}
                      onChange={(e) => {
                        setReferredBySearchQuery(e.target.value);
                        setShowReferredByDropdown(true);
                      }}
                      onFocus={() => setShowReferredByDropdown(true)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-card-foreground text-sm"
                    />
                    {editForm.referredById && !referredBySearchQuery && (
                      <div className="absolute inset-0 flex items-center px-3 text-sm text-card-foreground pointer-events-none">
                        {allUsersFromBackend.find(u => u.id === editForm.referredById)?.name}
                      </div>
                    )}
                    {showReferredByDropdown && filteredReferredBy.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                        {loadingUsers ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">Loading users...</div>
                        ) : (
                          <>
                            {filteredReferredBy.map(u => (
                              <button
                                key={u.id}
                                onClick={() => {
                                  setEditForm({ ...editForm, referredById: u.id });
                                  setReferredBySearchQuery('');
                                  setShowReferredByDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-card-foreground border-b border-border last:border-b-0"
                              >
                                <div className="font-medium">{u.name}</div>
                                <div className="text-xs text-muted-foreground">{u.id}</div>
                              </button>
                            ))}
                            {filteredReferredBy.length > 20 && (
                              <div className="px-3 py-1 text-xs text-muted-foreground text-center bg-muted/20">
                                Showing {filteredReferredBy.length} results
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {editForm.referredById && (
                    <button
                      onClick={async () => {
                        setEditLoading(true);
                        try {
                          const updateData: any = { referredById: '' };
                          const response = await api.updateUser(user.id, updateData);
                          if (response.success) {
                            toast({ title: 'Success', description: 'Referrer removed successfully' });
                            onSuccess();
                            onClose();
                          } else {
                            toast({ title: 'Error', description: response.error || 'Failed to remove referrer', variant: 'destructive' });
                            setEditLoading(false);
                          }
                        } catch (error) {
                          toast({ title: 'Error', description: 'Failed to remove referrer', variant: 'destructive' });
                          setEditLoading(false);
                        }
                      }}
                      disabled={editLoading}
                      className="text-xs text-muted-foreground hover:text-accent mt-1 disabled:opacity-50"
                    >
                      Clear referrer
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button 
            onClick={onClose} 
            variant="outline"
            className="border-border"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateUser}
            disabled={editLoading}
            className="gradient-accent text-accent-foreground border-0"
          >
            {editLoading ? '⏳ Updating...' : '✓ Update User'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditUserDialog;
