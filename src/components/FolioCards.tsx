import { Eye } from 'lucide-react';

interface FolioCardsProps {
  customerName: string;
  mobile: string;
  disbursementDate: string;
  pddDays: string | number;
  pddStatus: string;
  vehicleNumber: string;
  vehicleModel: string;
  lenderBank: string;
  loanAmount: string;
  roi?: string | number;
  tenure?: string | number;
  hierarchy: Array<{ role: string; name: string }>;
  className?: string;
  documentUrl?: string;
  isTwoColumn?: boolean;
}

export default function FolioCards({
  customerName,
  mobile,
  disbursementDate,
  pddDays,
  pddStatus,
  vehicleNumber,
  vehicleModel,
  lenderBank,
  loanAmount,
  roi,
  tenure,
  hierarchy,
  className,
  documentUrl,
  isTwoColumn = false,
}: FolioCardsProps) {
  const pddCompleted = ['yes', 'completed'].includes(pddStatus?.toLowerCase());
  const pddPending = ['no', 'pending'].includes(pddStatus?.toLowerCase());
  const pddDisplay = pddCompleted ? 'COMPLETED' : pddPending ? 'PENDING' : pddStatus?.toUpperCase() || '-';

  // Responsive layouts:
  // - On lg viewports: We render standard 3 columns side-by-side (Customer, Vehicle, Hierarchy).
  // - On mobile/tablet viewports (<lg): We merge Customer & Vehicle into a unified card, and place Hierarchy below it.
  return (
    <div className="flex flex-col gap-2 lg:grid lg:grid-cols-3 lg:gap-2">
      {/* Wrapper for Customer and Vehicle (behaves as contents on lg viewports to slide into grid) */}
      <div className="bg-card p-3 px-4 rounded-lg border border-border shadow-sm flex flex-col sm:flex-row gap-4 sm:gap-6 min-h-[120px] items-stretch lg:contents">
        {/* Card 1 - Customer Info */}
        <div className="flex-1 space-y-2 flex flex-col justify-center lg:bg-card lg:p-1.5 lg:rounded-lg lg:border lg:border-border lg:shadow-sm lg:space-y-[1px] lg:justify-start lg:min-h-0 lg:w-full lg:h-full">
          <div className="flex items-center text-[10px]">
            <span className="text-muted-foreground text-[8px] uppercase font-semibold shrink-0 w-[70px] lg:w-[80px]">Customer</span>
            <span className="text-muted-foreground text-[8px] w-[12px] shrink-0 text-center">:</span>
            <span className="font-semibold text-foreground truncate text-[10px]">{customerName}</span>
          </div>
          <div className="flex items-center text-[10px]">
            <span className="text-muted-foreground text-[8px] uppercase font-semibold shrink-0 w-[70px] lg:w-[80px]">Mobile</span>
            <span className="text-muted-foreground text-[8px] w-[12px] shrink-0 text-center">:</span>
            <span className="font-semibold text-foreground truncate text-[10px]">{mobile}</span>
          </div>
          <div className="flex items-center text-[10px]">
            <span className="text-muted-foreground text-[8px] uppercase font-semibold shrink-0 w-[70px] lg:w-[80px]">Disbursed</span>
            <span className="text-muted-foreground text-[8px] w-[12px] shrink-0 text-center">:</span>
            <span className="font-semibold text-foreground truncate text-[10px]">{disbursementDate}</span>
          </div>
          <div className="flex items-center text-[10px]">
            <span className="text-muted-foreground text-[8px] uppercase font-semibold shrink-0 w-[70px] lg:w-[80px]">PDD</span>
            <span className="text-muted-foreground text-[8px] w-[12px] shrink-0 text-center">:</span>
            <span className="font-semibold text-foreground truncate text-[10px]">{pddDays}</span>
            <span className={`ml-1 inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
              pddCompleted
                ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                : pddPending
                ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                : 'bg-gray-500/10 text-gray-600 border border-gray-500/20'
            }`}>
              {pddDisplay}
            </span>
          </div>
        </div>

        {/* Divider line on tablet/mobile screens (hidden on desktop) */}
        <div className="hidden sm:block lg:hidden w-[1px] bg-border/50 self-stretch my-0.5" />

        {/* Card 2 - Vehicle & Loan Info */}
        <div className="flex-1 space-y-2 flex flex-col justify-center sm:pl-2 lg:pl-0 lg:bg-card lg:p-1.5 lg:rounded-lg lg:border lg:border-border lg:shadow-sm lg:space-y-[1px] lg:justify-start lg:min-h-0 lg:w-full lg:h-full">
          <div className="flex items-center text-[10px]">
            <span className="text-muted-foreground text-[8px] uppercase font-semibold shrink-0 w-[70px] lg:w-[80px]">Vehicle No</span>
            <span className="text-muted-foreground text-[8px] w-[12px] shrink-0 text-center">:</span>
            <span className="font-mono font-semibold text-foreground truncate text-[10px]">{vehicleNumber}</span>
          </div>
          <div className="flex items-center text-[10px]">
            <span className="text-muted-foreground text-[8px] uppercase font-semibold shrink-0 w-[70px] lg:w-[80px]">Model</span>
            <span className="text-muted-foreground text-[8px] w-[12px] shrink-0 text-center">:</span>
            <span className="font-semibold text-foreground truncate text-[10px]">{vehicleModel}</span>
          </div>
          <div className="flex items-center text-[10px]">
            <span className="text-muted-foreground text-[8px] uppercase font-semibold shrink-0 w-[70px] lg:w-[80px]">Lender</span>
            <span className="text-muted-foreground text-[8px] w-[12px] shrink-0 text-center">:</span>
            <span className="font-semibold text-foreground truncate text-[10px]">{lenderBank}</span>
          </div>
          <div className="flex items-center text-[10px]">
            <span className="text-muted-foreground text-[8px] uppercase font-semibold shrink-0 w-[70px] lg:w-[80px]">Loan Amt</span>
            <span className="text-muted-foreground text-[8px] w-[12px] shrink-0 text-center">:</span>
            <span className="font-bold text-green-700 dark:text-green-300 truncate text-[10px]">{loanAmount}</span>
            {roi && <span className="text-muted-foreground text-[9px] truncate">({roi}%/{tenure || '-'})</span>}
          </div>
        </div>
      </div>

      {/* Card 3 - Hierarchy */}
      <div className="col-span-1 bg-card p-1.5 rounded-lg border border-border shadow-sm flex flex-col justify-center min-h-[50px] lg:min-h-0 lg:h-full lg:w-full">
        {hierarchy.length > 0 ? (
          <div className="space-y-1">
            {hierarchy.map((person, i) => (
              <div key={i} className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-2 text-[10px] min-w-0">
                <span className="text-muted-foreground text-[8px] uppercase font-semibold truncate">{person.role}</span>
                <span className="font-medium text-foreground truncate text-[10px]">{person.name}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-muted-foreground text-[9px]">-</p>}
      </div>
    </div>
  );
}
