import { useState, useRef } from 'react';
import { Download, Upload, MoreHorizontal, ChevronDown, FileDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { parsePayoutExcelFile, type PayoutImportRow } from '@/lib/excelUtils';
import { api } from '@/services/api';

interface PayoutImportExportProps {
  onImportSuccess?: () => void;
  isAdmin?: boolean;
  isManager?: boolean;
}

export const PayoutImportExport = ({ onImportSuccess, isAdmin, isManager }: PayoutImportExportProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importedPayouts, setImportedPayouts] = useState<PayoutImportRow[]>([]);
  const [importErrors, setImportErrors] = useState<Record<number, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const parsed = await parsePayoutExcelFile(file);

      setImportedPayouts(parsed);
      setImportErrors({});
      setShowImportDialog(true);

      toast({
        title: 'File loaded',
        description: `${parsed.length} row(s) ready to import (empty rows included)`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to parse Excel file',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImportSubmit = async () => {
    if (importedPayouts.length === 0) {
      toast({
        title: 'Error',
        description: 'No payouts to import',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.importPayouts(importedPayouts);
      if (result.success) {
        const imported = result.imported || 0;
        const skipped = result.skipped || 0;
        const total = result.total || importedPayouts.length;
        const errors = result.errors || [];

        let description = `${imported} of ${total} payouts imported successfully`;
        if (skipped > 0) {
          description += `, ${skipped} empty rows skipped`;
        }
        if (errors.length > 0) {
          description += `, ${errors.length} errors occurred`;
        }

        toast({
          title: 'Import Complete',
          description,
        });

        // Show errors if any
        if (errors.length > 0) {
          console.error('Import errors:', errors);
        }

        setShowImportDialog(false);
        setImportedPayouts([]);
        setImportErrors({});
        onImportSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to import payouts',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to import payouts',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      import('xlsx').then((XLSX) => {
        const templateData = [
          {
            user: 'John Advisor',
            bank_account: '1234567890',
            ifsc: 'HDFC0000001',
            pan: 'ABCDE1234F',
            lead_id: 'LEAD001',
            customer_name: 'John Smith',
            bank_name: 'HDFC Bank',
            product_name: 'Credit Card',
            application_no: 'APP001',
            cust_type: 'Individual',
            lead_status: 'Approved',
            commission: 5000,
            team_earning: 0,
            deduction: 0,
            net_payout: 5000,
            remark: '',
            payout_status: 'pending',
            payout_date: '',
          },
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Payouts');
        XLSX.writeFile(wb, 'payout_import_template.xlsx');
        toast({
          title: 'Template Downloaded',
          description: 'Payout import template matches the payouts table format',
        });
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to download template',
        variant: 'destructive',
      });
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Determine which endpoint to use
      let endpoint = '/payouts/export/all';
      let filename = `payouts_${new Date().toISOString().split('T')[0]}.csv`;

      if (isManager && !isAdmin) {
        endpoint = '/payouts/export/team';
        filename = `team_payouts_${new Date().toISOString().split('T')[0]}.csv`;
      }

      const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
      const fullUrl = `${apiUrl}/api${endpoint}`;

      const token = localStorage.getItem('auth_token');

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'text/csv',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();

        if (response.status === 401) {
          toast({
            title: 'Error',
            description: 'Unauthorized. Please login again.',
            variant: 'destructive',
          });
        } else if (response.status === 403) {
          toast({
            title: 'Error',
            description: 'You do not have permission to export payouts.',
            variant: 'destructive',
          });
        } else if (response.status === 400) {
          toast({
            title: 'Error',
            description: 'No payouts to export.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: `Export failed: ${response.statusText}`,
            variant: 'destructive',
          });
        }
        return;
      }

      // Get the CSV content
      const csvContent = await response.text();

      // Create a blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Success',
        description: `Payouts exported successfully as ${filename}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to export payouts',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-1.5 border-border text-foreground hover:bg-muted/60">
            <Download className="w-4 h-4" />
            <span>import/export</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleDownloadTemplate} className="cursor-pointer">
            <Download className="w-4 h-4 mr-2 text-blue-600" />
            <span>Template Download</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="cursor-pointer">
            <Upload className="w-4 h-4 mr-2 text-violet-600" />
            <span>{isImporting ? 'Importing...' : 'Import'}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExport} disabled={isExporting} className="cursor-pointer">
            <FileDown className="w-4 h-4 mr-2 text-emerald-600" />
            <span>{isExporting ? 'Exporting...' : 'Export'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import Payouts Preview</DialogTitle>
            <DialogDescription>
              Review the payouts to be imported. {importedPayouts.length} payout(s) found.
              Supports leads export format and payouts table columns (user, lead_id, commission, etc.).
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {importedPayouts.map((payout, index) => (
                <div
                  key={index}
                  className="p-3 rounded border border-border bg-muted/30"
                >
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div>
                      <span className="font-semibold">Lead ID:</span> {payout.leadId || '—'}
                    </div>
                    <div>
                      <span className="font-semibold">Amount:</span> ₹
                      {(payout.leadAmount || 0).toLocaleString('en-IN')}
                    </div>
                    <div>
                      <span className="font-semibold">User:</span> {payout.advisorName || '—'}
                    </div>
                    <div>
                      <span className="font-semibold">Customer:</span> {payout.customerName || '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleImportSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
