import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Lead } from '@/types/lead';
import LeadDetailsContent from '@/components/LeadDetailsContent';

interface LeadDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export default function LeadDetailsDialog({ isOpen, onClose, lead }: LeadDetailsDialogProps) {
  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Lead Details</DialogTitle>
        </DialogHeader>

        <LeadDetailsContent lead={lead} />
      </DialogContent>
    </Dialog>
  );
}
