import React from 'react';
import { Edit2 } from 'lucide-react';

export type EditModalState = 'none' | 'applicant' | 'loan' | 'income';

export interface EditProps {
  canEditLoanFromCard: boolean;
  isLoanOperations?: boolean;
  editModalState: EditModalState;
  editForm: any;
  setEditForm: (updater: any) => void;
  isSavingEdit: boolean;
  handleSavePartial: () => void;
  openEditModal: (type: 'applicant' | 'loan' | 'income') => void;
}

export interface SharedTabProps {
  loan: any;
  onRefresh?: () => void;
}

export const Card = ({
  title, icon, iconBg = 'bg-primary/10', iconColor = 'text-primary', accent = 'border-primary/20', onEdit, children
}: {
  title: string; icon: React.ReactNode; iconBg?: string; iconColor?: string; accent?: string; onEdit?: () => void; children: React.ReactNode;
}) => (
  <div className={`bg-card border ${accent} shadow-sm rounded-2xl overflow-hidden self-start`}>
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>
      </div>
      {onEdit && (
        <button onClick={onEdit} className="p-1.5 rounded-md text-muted-foreground/80 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer" title="Edit">
          <Edit2 size={14} />
        </button>
      )}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

export const Field = ({ label, value, span = 1 }: { label: string; value: string; span?: number }) => (
  <div className={`min-w-0 ${span === 2 ? 'col-span-2' : ''}`}>
    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
    <p className="text-sm font-semibold text-foreground break-words">{value || 'NA'}</p>
  </div>
);

export const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <Card title={title} icon={icon}>{children}</Card>
);

export const renderChallanDetails = (rawChallanDetails: any) => {
  if (!rawChallanDetails) return <p className="text-xs text-muted-foreground mt-2">No challan details available</p>;
  let parsed: any = null;
  try {
    parsed = typeof rawChallanDetails === 'string' ? JSON.parse(rawChallanDetails) : rawChallanDetails;
  } catch (e) {
    return <p className="text-xs text-red-500 mt-2">Failed to parse challan details</p>;
  }

  if (!parsed) return <p className="text-xs text-muted-foreground mt-2">No challan details available</p>;

  let status = parsed.status || 'No';
  let count = parsed.count || 0;
  let challans = parsed.challans || [];

  if (Array.isArray(parsed)) {
    challans = parsed;
    count = parsed.length;
    status = parsed.length > 0 ? 'Yes' : 'No';
  }

  const isPending = status === 'Yes' || count > 0 || challans.length > 0;
  const totalAmount = challans.reduce((sum: number, c: any) => sum + Number(c.amount || c.fine_amount || c.challan_amount || 0), 0);

  return (
    <div className="space-y-3 mt-3 w-full">
      <div className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${isPending
        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-400'
        : 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50 text-green-800 dark:text-green-400'
        }`}>
        <span className="text-sm shrink-0">{isPending ? '⚠️' : '✅'}</span>
        <div className="min-w-0">
          <p className="text-xs font-bold leading-tight">
            {isPending ? `${count || challans.length} Pending Challan(s) Found (Total: ₹${totalAmount.toLocaleString('en-IN')})` : 'No Pending Challans'}
          </p>
        </div>
      </div>

      {isPending && challans.length > 0 && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {challans.map((c: any, index: number) => (
            <div key={index} className="bg-background border border-border/80 shadow-sm rounded-xl p-3 text-xs space-y-2">
              <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-1.5 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Challan No</p>
                  <p className="font-bold text-foreground font-mono select-all truncate">{c.challan_number || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Amount</p>
                  <p className="font-extrabold text-red-600 dark:text-red-400">
                    ₹{Number(c.amount || c.fine_amount || c.challan_amount || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground font-medium">Date: </span>
                  <span className="font-semibold text-foreground">{c.challan_date || '—'}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground font-medium">State: </span>
                  <span className="font-semibold text-foreground">{c.state || '—'}</span>
                </div>
              </div>

              {c.offense_details && (
                <div className="bg-muted/40 p-2 rounded-lg border border-border/30">
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide leading-none mb-1">Offense Description</p>
                  <p className="text-[11px] font-medium text-foreground leading-normal">{c.offense_details}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const getVehicleAge = (mfgDateStr: string | null) => {
  if (!mfgDateStr) return 'NA';
  const mfgDate = new Date(mfgDateStr);
  if (isNaN(mfgDate.getTime())) return 'NA';
  const now = new Date();
  let months = (now.getFullYear() - mfgDate.getFullYear()) * 12;
  months -= mfgDate.getMonth();
  months += now.getMonth();
  if (months < 0) months = 0;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y} yr ${m} m`;
};

export const getTentativeValue = (data: any) => {
  if (!data) return 'NA';
  const searchObj = (obj: any): number | null => {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.fair_market_retail_value || obj.book_value || obj.dealer_purchase_price || obj.idv || obj.idv_value || obj.tentative_idv || obj.vehicle_value) {
      return Number(obj.fair_market_retail_value || obj.book_value || obj.dealer_purchase_price || obj.idv || obj.idv_value || obj.tentative_idv || obj.vehicle_value);
    }
    for (const key in obj) {
      if (typeof obj[key] === 'number' && (key.toLowerCase().includes('idv') || key.toLowerCase().includes('value'))) return obj[key];
      const res = searchObj(obj[key]);
      if (res) return res;
    }
    return null;
  };
  const val = searchObj(data);
  return val ? `₹${val.toLocaleString('en-IN')}` : 'NA';
};

// PDD status chip — same wording and colours as the PDD Management page.
export const PddStatusField = ({ status }: { status?: string | null }) => {
  const value = String(status || 'Pending').toLowerCase() === 'in progress' ? 'WIP' : (status || 'Pending');
  const lower = value.toLowerCase();
  const cls = lower === 'completed' ? 'bg-green-100 text-green-700'
    : lower === 'wip' ? 'bg-blue-100 text-blue-700'
    : 'bg-amber-100 text-amber-700';
  return (
    <div className="min-w-0" data-testid="pdd-status-field">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">PDD Status</p>
      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${cls}`}>{value}</span>
    </div>
  );
};
