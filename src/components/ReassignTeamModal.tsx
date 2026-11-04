import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/auth';

interface ReassignTeamModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newManagerId: string) => void;
  user: any;
  action: 'archive' | 'inactivate';
  subordinatesCount: number;
}

export function ReassignTeamModal({ open, onClose, onConfirm, user: targetUser, action, subordinatesCount }: ReassignTeamModalProps) {
  const [newManagerId, setNewManagerId] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: managers = [], isLoading } = useQuery({
    queryKey: ['active-managers'],
    queryFn: async () => {
      const res = await api.get('/users');
      // Filter active users who are leaders/managers
      return res.filter((u: any) => 
        ['admin', 'operation_team', 'sales_manager', 'branch_manager', 'dsa', 'team_leader'].includes(u.role) && 
        u.status === 'active' && 
        u.id !== targetUser?.id
      );
    },
    enabled: open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManagerId) return;
    
    setLoading(true);
    try {
      await onConfirm(newManagerId);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden sm:p-6">
        <DialogHeader className="p-6 pb-2 sm:p-0">
          <DialogTitle>Reassign Team Members</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-0 px-6 pb-6 overflow-y-auto max-h-[70dvh] sm:max-h-full sm:px-0 sm:pb-0">
          <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm mt-4 sm:mt-0">
            <strong>{targetUser?.full_name}</strong> has {subordinatesCount} active team member{subordinatesCount !== 1 ? 's' : ''}. 
            You must reassign them to another manager before you can {action} this user.
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Select New Manager *</label>
            <select 
              required 
              className="w-full px-3 py-2 rounded-lg border border-border bg-background" 
              value={newManagerId} 
              onChange={e => setNewManagerId(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Select a new manager...</option>
              {managers.map((manager: any) => (
                <option key={manager.id} value={manager.id}>
                  {manager.full_name} ({ROLE_LABELS[manager.role as keyof typeof ROLE_LABELS] || manager.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium" disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !newManagerId} className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold disabled:opacity-60">
              {loading ? 'Processing...' : 'Reassign & Proceed'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
