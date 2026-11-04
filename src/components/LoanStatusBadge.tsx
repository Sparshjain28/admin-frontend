import { LeadStatus, ApplicationStage, LEAD_STATUSES, APPLICATION_STAGES } from '@/lib/mock-data';

interface LoanStatusBadgeProps {
  status?: LeadStatus;
  applicationStage?: ApplicationStage;
  applicationStageLabel?: string;
}

export default function LoanStatusBadge({ status, applicationStage, applicationStageLabel }: LoanStatusBadgeProps) {
  // Prioritize application stage over old status
  if (applicationStage) {
    const stage = APPLICATION_STAGES.find(s => s.value === applicationStage);
    if (stage) {
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${stage.color}`}>
          {applicationStageLabel || stage.label}
        </span>
      );
    }
  }
  
  // Fallback to old status system
  if (status) {
    const s = LEAD_STATUSES.find(ls => ls.value === status);
    if (s) {
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${s.color}`}>
          {s.label}
        </span>
      );
    }
  }
  
  return null;
}
