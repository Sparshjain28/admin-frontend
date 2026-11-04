import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { toast } from '@/hooks/use-toast';
import { useRole } from '@/contexts/RoleContext';
import { ROLE_LABELS, UserRole } from '@/types';

const ROLES: UserRole[] = ['super_admin', 'manager', 'branch_manager', 'dsa_partner', 'team_leader', 'employee'];

const ROLE_RANK: Record<string, number> = {
  super_admin: 5, manager: 4, branch_manager: 3, dsa_partner: 2, team_leader: 1, employee: 0,
};

interface AddUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  allUsers: any[];
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({ isOpen, onClose, onSuccess, allUsers }) => {
  const { role: currentUserRole, authUser } = useRole();
  const [addForm, setAddForm] = useState({
    userId: '', name: '', mobile: '', email: '', mpin: '', confirmMpin: '',
    role: 'employee', pan: '',
    bankAccount: '', ifsc: '',
    managerId: '',
  });

  // Filter roles based on current user's role
  const availableRoles = ROLES.filter(r =>
    currentUserRole === 'super_admin' ||
    ROLE_RANK[r] < ROLE_RANK[currentUserRole as keyof typeof ROLE_RANK]
  );
  const [addLoading, setAddLoading] = useState(false);
  const [panVerifying, setPanVerifying] = useState(false);
  const [panVerified, setPanVerified] = useState(false);
  const [panData, setPanData] = useState<any>(null);
  const [panExists, setPanExists] = useState(false);
  const [existingUser, setExistingUser] = useState<any>(null);
  const [bankVerifying, setBankVerifying] = useState(false);
  const [bankVerified, setBankVerified] = useState(false);
  const [bankData, setBankData] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState({
    pan: '', bankAccount: '', ifsc: '',
  });
  const [managerSearchQuery, setManagerSearchQuery] = useState('');
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const managerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (managerDropdownRef.current && !managerDropdownRef.current.contains(event.target as Node)) {
        setShowManagerDropdown(false);
      }
    };
    if (showManagerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showManagerDropdown]);

  const filteredManagers = allUsers.filter(user => {
    if (!managerSearchQuery) return false;
    // DSA can refer to team_leader or employee only
    if (currentUserRole === 'dsa_partner' && !['team_leader', 'employee'].includes(user.role)) {
      return false;
    }
    const query = managerSearchQuery.toLowerCase();
    return (
      user.id.toLowerCase().includes(query) ||
      user.name.toLowerCase().includes(query) ||
      (user.mobile && user.mobile.includes(query))
    );
  }).slice(0, 10);

  const handlePanVerify = async () => {
    if (!addForm.pan || addForm.pan.length !== 10) {
      toast({ title: 'Error', description: 'Enter valid 10-character PAN', variant: 'destructive' });
      return;
    }

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(addForm.pan)) {
      toast({ title: 'Error', description: 'Invalid PAN format', variant: 'destructive' });
      return;
    }

    setPanVerifying(true);

    try {
      const BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000').replace(/\/$/, '');
      const token = localStorage.getItem('auth_token');

      const checkRes = await fetch(`${BASE}/api/auth/check-pan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pan: addForm.pan }),
      });

      if (!checkRes.ok) {
        throw new Error('Failed to check PAN in database');
      }

      const checkData = await checkRes.json();

      if (checkData.exists && checkData.user) {
        setPanExists(true);
        setExistingUser(checkData.user);
        setPanVerifying(false);
        toast({
          title: '⚠️ User Already Exists',
          description: `${checkData.user.name} (${checkData.user.mobile}) is already registered with this PAN`,
          variant: 'destructive',
          duration: 6000,
        });
        return;
      }

      const res = await fetch(`${BASE}/api/pan/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_number: addForm.pan }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        setPanVerified(true);
        setPanData(data.data);
        setPanExists(false);
        setExistingUser(null);

        if (data.data.full_name && !addForm.name) {
          setAddForm(p => ({ ...p, name: data.data.full_name }));
        }

        toast({
          title: '✓ PAN Verified Successfully',
          description: `Name: ${data.data.full_name}`,
          duration: 4000,
        });
      } else {
        toast({
          title: 'Verification Failed',
          description: data.message || 'PAN verification failed',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('PAN verification error:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify PAN. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setPanVerifying(false);
    }
  };

  const handleBankVerify = async () => {
    if (!addForm.bankAccount || !addForm.ifsc) {
      toast({ title: 'Error', description: 'Enter both account number and IFSC', variant: 'destructive' });
      return;
    }

    const bankAccountRegex = /^[0-9]{9,18}$/;
    if (!bankAccountRegex.test(addForm.bankAccount.trim())) {
      toast({ title: 'Error', description: 'Invalid bank account number', variant: 'destructive' });
      return;
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(addForm.ifsc.trim())) {
      toast({ title: 'Error', description: 'Invalid IFSC code', variant: 'destructive' });
      return;
    }

    setBankVerifying(true);
    try {
      const BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000').replace(/\/$/, '');
      const res = await fetch(`${BASE}/api/bank/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_number: addForm.bankAccount,
          ifsc: addForm.ifsc
        }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        setBankVerified(true);
        setBankData(data.data);

        toast({
          title: 'Bank Verified ✓',
          description: `Account holder: ${data.data.name_at_bank || 'Verified'}`,
        });
      } else {
        toast({
          title: 'Verification Failed',
          description: data.message || 'Bank verification failed',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify bank account',
        variant: 'destructive'
      });
    } finally {
      setBankVerifying(false);
    }
  };

  const handleAddUser = async () => {
    if (!addForm.name || !addForm.mobile || !addForm.mpin) {
      toast({ title: 'Error', description: 'Name, mobile and MPIN are required', variant: 'destructive' }); return;
    }
    if (addForm.mpin.length !== 4) {
      toast({ title: 'Error', description: 'MPIN must be 4 digits', variant: 'destructive' }); return;
    }
    if (addForm.mpin !== addForm.confirmMpin) {
      toast({ title: 'Error', description: 'MPINs do not match', variant: 'destructive' }); return;
    }
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (addForm.pan && !panRegex.test(addForm.pan)) {
      toast({ title: 'Error', description: 'Invalid PAN format. Format should be like ABCDE1234F.', variant: 'destructive' }); return;
    }
    if (addForm.bankAccount) {
      const bankAccountRegex = /^[0-9]{9,18}$/;
      if (!bankAccountRegex.test(addForm.bankAccount.trim())) {
        toast({ title: 'Error', description: 'Bank account must contain 9-18 digits only.', variant: 'destructive' }); return;
      }
    }
    if (addForm.ifsc) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(addForm.ifsc.trim())) {
        toast({ title: 'Error', description: 'Invalid IFSC format. Format should be like SBIN0001234.', variant: 'destructive' }); return;
      }
    }
    setAddLoading(true);
    try {
      const BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000').replace(/\/$/, '');
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: addForm.name, mobile: addForm.mobile,
          email: addForm.email || `${addForm.mobile}@example.com`,
          mpin: addForm.mpin, role: addForm.role,
          userId: addForm.userId || undefined,
          pan: addForm.pan,
          bank_account: addForm.bankAccount, ifsc: addForm.ifsc,
          manager_id: addForm.managerId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'User Added', description: `${addForm.name} created successfully` });
        resetForm();
        onSuccess();
        onClose();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to add user', variant: 'destructive' });
    } finally {
      setAddLoading(false);
    }
  };

  const resetForm = () => {
    setAddForm({
      userId: '', name: '', mobile: '', email: '', mpin: '', confirmMpin: '',
      role: availableRoles[0] || 'employee',
      pan: '', bankAccount: '', ifsc: '',
      managerId: '' // Don't auto-populate with current user
    });
    setValidationErrors({ pan: '', bankAccount: '', ifsc: '' });
    setPanVerified(false);
    setPanData(null);
    setPanExists(false);
    setExistingUser(null);
    setBankVerified(false);
    setBankData(null);
    setManagerSearchQuery('');
    setShowManagerDropdown(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, currentUserRole, authUser]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl shadow-xl border border-border w-full max-w-lg mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-foreground">Add User</h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <FloatingLabelInput
              label="Full Name *"
              value={addForm.name}
              onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
              disabled={panExists}
            />
          </div>
          <div>
            <FloatingLabelInput
              label="Mobile *"
              value={addForm.mobile}
              onChange={e => setAddForm(p => ({ ...p, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              maxLength={10}
              disabled={panExists}
            />
          </div>
          <div>
            <FloatingLabelInput
              label="Email"
              value={addForm.email}
              onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
              disabled={panExists}
            />
          </div>
          <div>
            <select
              value={addForm.role}
              onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))}
              className="mt-1 h-9 w-full text-sm px-2 rounded-lg border border-border bg-background text-card-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={panExists}
            >
              {availableRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r as keyof typeof ROLE_LABELS] || r}</option>)}
            </select>
          </div>
          <div>
            <FloatingLabelInput
              label="MPIN (4 digits) *"
              value={addForm.mpin}
              onChange={e => setAddForm(p => ({ ...p, mpin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              type="password"
              maxLength={4}
              disabled={panExists}
            />
          </div>
          <div>
            <FloatingLabelInput
              label="Confirm MPIN *"
              value={addForm.confirmMpin}
              onChange={e => setAddForm(p => ({ ...p, confirmMpin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              type="password"
              maxLength={4}
              disabled={panExists}
            />
          </div>
          <div className="md:col-span-2">
            <div className="flex gap-2 mt-1">
              <div className="flex-1">
                <FloatingLabelInput
                  label="PAN (Optional)"
                  value={addForm.pan}
                  onChange={e => {
                    const value = e.target.value.toUpperCase();
                    let formatted = '';
                    for (let i = 0; i < value.length && i < 10; i++) {
                      if (i < 5) {
                        if (/[A-Z]/.test(value[i])) formatted += value[i];
                      } else if (i < 9) {
                        if (/[0-9]/.test(value[i])) formatted += value[i];
                      } else {
                        if (/[A-Z]/.test(value[i])) formatted += value[i];
                      }
                    }
                    setAddForm(p => ({ ...p, pan: formatted }));
                    setPanVerified(false);
                    setPanData(null);
                    setPanExists(false);
                    setExistingUser(null);

                    if (formatted && formatted.length < 10) {
                      setValidationErrors(prev => ({ ...prev, pan: 'PAN must be 10 characters (e.g., ABCDE1234F)' }));
                    } else if (formatted && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formatted)) {
                      setValidationErrors(prev => ({ ...prev, pan: 'Invalid PAN format' }));
                    } else {
                      setValidationErrors(prev => ({ ...prev, pan: '' }));
                    }
                  }}
                  maxLength={10}
                  disabled={panVerified || panExists}
                />
              </div>
              <Button
                type="button"
                onClick={handlePanVerify}
                disabled={panVerifying || !addForm.pan || addForm.pan.length !== 10 || panVerified || panExists}
                variant={panVerified ? "default" : "outline"}
                className={`h-9 px-4 ${panVerified ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
              >
                {panVerifying ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : panVerified ? (
                  <Check className="w-4 h-4" />
                ) : (
                  'Verify'
                )}
              </Button>
            </div>
            {validationErrors.pan && (
              <p className="text-xs text-destructive mt-1">{validationErrors.pan}</p>
            )}
            {panExists && existingUser && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700 font-semibold mb-1">
                  ⚠️ User Already Exists
                </p>
                <p className="text-xs text-red-600">
                  <strong>Name:</strong> {existingUser.name}<br />
                  <strong>Mobile:</strong> {existingUser.mobile}<br />
                  <strong>Email:</strong> {existingUser.email}<br />
                  <strong>Role:</strong> {ROLE_LABELS[existingUser.role as keyof typeof ROLE_LABELS] || existingUser.role}
                </p>
              </div>
            )}
            {panVerified && panData && !panExists && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-700">
                  <strong>✓ Verified:</strong> {panData.full_name}
                  {panData.aadhaar_linked && <span className="ml-2 text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded">Aadhaar Linked</span>}
                </p>
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <div className="flex gap-2 mt-1">
              <div className="flex-1">
                <FloatingLabelInput
                  label="Bank Account (Optional)"
                  value={addForm.bankAccount}
                  onChange={e => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 18);
                    setAddForm(p => ({ ...p, bankAccount: value }));
                    setBankVerified(false);
                    setBankData(null);

                    if (value && (value.length < 9 || value.length > 18)) {
                      setValidationErrors(prev => ({ ...prev, bankAccount: 'Account number must be 9-18 digits' }));
                    } else {
                      setValidationErrors(prev => ({ ...prev, bankAccount: '' }));
                    }
                  }}
                  maxLength={18}
                  disabled={bankVerified || panExists}
                />
              </div>
            </div>
            {validationErrors.bankAccount && (
              <p className="text-xs text-destructive mt-1">{validationErrors.bankAccount}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <div className="flex gap-2 mt-1">
              <div className="flex-1">
                <FloatingLabelInput
                  label="IFSC Code (Optional)"
                  value={addForm.ifsc}
                  onChange={e => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
                    setAddForm(p => ({ ...p, ifsc: value }));
                    setBankVerified(false);
                    setBankData(null);

                    if (value && value.length < 11) {
                      setValidationErrors(prev => ({ ...prev, ifsc: 'IFSC must be 11 characters (e.g., SBIN0001234)' }));
                    } else if (value && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value)) {
                      setValidationErrors(prev => ({ ...prev, ifsc: 'Invalid IFSC format (e.g., SBIN0001234)' }));
                    } else {
                      setValidationErrors(prev => ({ ...prev, ifsc: '' }));
                    }
                  }}
                  maxLength={11}
                  disabled={bankVerified || panExists}
                />
              </div>
              <Button
                type="button"
                onClick={handleBankVerify}
                disabled={bankVerifying || !addForm.bankAccount || !addForm.ifsc || addForm.ifsc.length !== 11 || bankVerified || panExists}
                variant={bankVerified ? "default" : "outline"}
                className={`h-9 px-4 ${bankVerified ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
              >
                {bankVerifying ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : bankVerified ? (
                  <Check className="w-4 h-4" />
                ) : (
                  'Verify'
                )}
              </Button>
            </div>
            {validationErrors.ifsc && (
              <p className="text-xs text-destructive mt-1">{validationErrors.ifsc}</p>
            )}
            {bankVerified && bankData && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-700">
                  <strong>✓ Verified:</strong> {bankData.name_at_bank || 'Account verified'}
                  {bankData.bank_name && <span className="ml-2">• {bankData.bank_name}</span>}
                </p>
                {bankData.branch && (
                  <p className="text-xs text-green-600 mt-1">Branch: {bankData.branch}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleAddUser} disabled={addLoading || panExists} className="flex-1 gradient-accent text-accent-foreground border-0">
            {addLoading ? 'Adding...' : 'Add User'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddUserDialog;
