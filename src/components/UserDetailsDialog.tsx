import React from 'react';
import { X, Copy, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ROLE_LABELS } from '@/types';

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  dsa_partner: 'bg-orange-100 text-orange-700',
  team_leader: 'bg-green-100 text-green-700',
  employee: 'bg-gray-100 text-gray-600',
};

interface UserDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  user: any;
}

const UserDetailsDialog: React.FC<UserDetailsDialogProps> = ({ isOpen, onClose, onEdit, user }) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl shadow-xl border border-border w-full max-w-2xl mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-foreground">User Details</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full gradient-accent flex items-center justify-center text-2xl font-bold text-accent-foreground">
                {user.name?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-card-foreground">{user.name}</h3>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_BADGE[user.role] || 'bg-gray-100 text-gray-600'}`}>
                  {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                </span>
              </div>
            </div>
            {onEdit && (
              <Button
                onClick={onEdit}
                size="sm"
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">User ID</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-mono text-accent">{user.id}</p>
                <button onClick={() => { navigator.clipboard.writeText(user.id); toast({ title: 'Copied', description: 'User ID copied to clipboard' }); }} className="text-muted-foreground hover:text-accent">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Mobile</p>
              <p className="text-sm font-medium text-card-foreground">{user.mobile || 'N/A'}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium text-card-foreground break-all">{user.email || 'N/A'}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Reports To</p>
              <p className="text-sm font-medium text-card-foreground">{user.manager?.name || 'None'}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last Login</p>
              <p className="text-sm font-medium text-card-foreground">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Created At</p>
              <p className="text-sm font-medium text-card-foreground">
                {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-semibold text-card-foreground mb-3">KYC Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">PAN Number</p>
                {user.pan || (user.userPAN && user.userPAN.panNumber) ? (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-card-foreground">{user.pan || user.userPAN?.panNumber}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Verified</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not provided</p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Bank Account</p>
                {user.bankAccount || (user.userBank && user.userBank.bankAccount) ? (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-card-foreground">{user.bankAccount || user.userBank?.bankAccount}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Verified</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not provided</p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">IFSC Code</p>
                <p className="text-sm font-mono text-card-foreground">{user.ifsc || user.userBank?.ifsc || 'Not provided'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Bank Name</p>
                <p className="text-sm font-medium text-card-foreground">{user.userBank?.bankName || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Bank Branch</p>
                <p className="text-sm font-medium text-card-foreground">{user.userBank?.bankBranch || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Name at Bank</p>
                <p className="text-sm font-medium text-card-foreground">{user.userBank?.nameAtBank || 'N/A'}</p>
              </div>

              {user.userBank?.bankCity && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Bank City</p>
                  <p className="text-sm font-medium text-card-foreground">{user.userBank.bankCity}</p>
                </div>
              )}

              {user.userBank?.bankState && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Bank State</p>
                  <p className="text-sm font-medium text-card-foreground">{user.userBank.bankState}</p>
                </div>
              )}

              {user.userBank?.bankAddress && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Bank Address</p>
                  <p className="text-sm font-medium text-card-foreground">{user.userBank.bankAddress}</p>
                </div>
              )}

              {user.userBank?.bankContact && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Bank Contact</p>
                  <p className="text-sm font-medium text-card-foreground">{user.userBank.bankContact}</p>
                </div>
              )}
            </div>
          </div>

          {user.referralCode && (
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-card-foreground mb-3">Referral Information</h4>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Referral Code</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono text-accent">{user.referralCode}</p>
                  <button onClick={() => { navigator.clipboard.writeText(user.referralCode); toast({ title: 'Copied', description: 'Referral code copied' }); }} className="text-muted-foreground hover:text-accent">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose} className="gradient-accent text-accent-foreground border-0">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsDialog;
