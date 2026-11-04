import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface StatItem {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
}

export default function MobileStatCarousel({ items }: { items: StatItem[] }) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {items.map((item, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-accent">{item.icon}</span>
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{item.value}</p>
            {item.sub && <p className={`text-xs mt-1 ${item.subColor || 'text-muted-foreground'}`}>{item.sub}</p>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 pb-2 -mx-4 px-4 flex-wrap">
      {items.map((item, i) => (
        <div key={i} className="stat-card min-w-[160px] shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-accent">{item.icon}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{item.label}</span>
          </div>
          <p className="text-lg font-bold text-foreground">{item.value}</p>
          {item.sub && <p className={`text-[10px] mt-1 ${item.subColor || 'text-muted-foreground'}`}>{item.sub}</p>}
        </div>
      ))}
    </div>
  );
}
