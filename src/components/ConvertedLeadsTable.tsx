import { FileText } from 'lucide-react';

interface ConvertedLead {
  id: number;
  leadName: string;
  loanId: string;
  loanAmount: number;
  status: 'APPROVED' | 'DISBURSED' | 'IN_PROCESS';
  bankName: string;
  createdAt: string;
}

interface ConvertedLeadsTableProps {
  leads: ConvertedLead[];
  headerClass: string;
  chartCardClass: string;
}

export function ConvertedLeadsTable({ leads, headerClass, chartCardClass }: ConvertedLeadsTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DISBURSED':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'IN_PROCESS':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  return (
    <div className={chartCardClass}>
      <div className={headerClass}>
        <div className="flex items-center gap-1">
          <FileText size={13} className="text-primary" />
          <h3 className="font-bold text-xs text-foreground">Leads Converted to Loans</h3>
        </div>
      </div>
      <div className="flex flex-col h-[500px]">
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {leads && leads.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/50 dark:bg-muted/30 z-10">
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-3 font-semibold text-foreground text-xs whitespace-nowrap">Lead Name</th>
                  <th className="text-left py-3 px-3 font-semibold text-foreground text-xs whitespace-nowrap">Loan ID</th>
                  <th className="text-left py-3 px-3 font-semibold text-foreground text-xs whitespace-nowrap">Amount</th>
                  <th className="text-left py-3 px-3 font-semibold text-foreground text-xs whitespace-nowrap">Bank</th>
                  <th className="text-left py-3 px-3 font-semibold text-foreground text-xs whitespace-nowrap">Status</th>
                  <th className="text-left py-3 px-3 font-semibold text-foreground text-xs whitespace-nowrap">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-3 text-foreground whitespace-nowrap text-sm">{lead.leadName}</td>
                    <td className="py-3 px-3 text-foreground font-medium whitespace-nowrap text-sm">{lead.loanId}</td>
                    <td className="py-3 px-3 text-foreground whitespace-nowrap text-sm">₹{(lead.loanAmount / 100000).toFixed(1)}L</td>
                    <td className="py-3 px-3 text-muted-foreground text-xs whitespace-nowrap">{lead.bankName}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground text-xs whitespace-nowrap">{new Date(lead.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex items-center justify-center opacity-20 text-[10px]">No converted leads</div>
          )}
        </div>
      </div>
    </div>
  );
}
