import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: ReactNode;
}

export default function StatCard({ label, value, change, changeType = 'neutral', icon }: StatCardProps) {
  const changeColor = changeType === 'positive' ? 'text-success' : changeType === 'negative' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      {change && <p className={`text-xs mt-1 font-medium ${changeColor}`}>{change}</p>}
    </div>
  );
}
