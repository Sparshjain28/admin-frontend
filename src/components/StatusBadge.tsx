interface StatusBadgeProps {
  status: string;
}

const statusStyles: Record<string, string> = {
  active: 'bg-success/10 text-success',
  inactive: 'bg-muted text-muted-foreground',
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-info/10 text-info',
  disbursed: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusStyles[status] || 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
