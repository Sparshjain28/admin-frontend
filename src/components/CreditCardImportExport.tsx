import { useState, useRef } from 'react';
import { Download, Upload, FileText, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import * as XLSX from 'xlsx';
import { api } from '@/services/api';

interface CreditCardImportExportProps {
  cards: any[];
  productType?: 'credit_card' | 'personal_loan';
  onImportSuccess?: () => void;
}

export const CreditCardImportExport = ({ cards, productType = 'credit_card', onImportSuccess }: CreditCardImportExportProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importedCards, setImportedCards] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle template download
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        {
          'bank': 'HDFC Bank',
          'name': 'HDFC Regalia Credit Card',
          'type': productType,
          'dsa_commission': '2500',
          'reward_points': 'Travel, Shopping, Dining',
          'redirect_url': 'https://bank.com/apply',
          'payout_source': 'Direct',
          'status': 'active',
          'badge_text': 'High Approval',
          'badge_color': '#28A745',
          'features': 'Reward points on every purchase, Complimentary lounge access, Fuel surcharge waiver',
          'joining_fee': 'Zero',
          'renewal_fee': '₹2500 + GST',
          'terms': 'Terms and conditions apply',
          'pincodes': 'ALL',
        },
      ];

      for (let i = 2; i <= 10; i++) {
        templateData.push({
          'bank': '',
          'name': '',
          'type': productType,
          'dsa_commission': '',
          'reward_points': '',
          'redirect_url': '',
          'payout_source': '',
          'status': 'active',
          'badge_text': '',
          'badge_color': '',
          'features': '',
          'joining_fee': '',
          'renewal_fee': '',
          'terms': '',
          'pincodes': '',
        });
      }

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');

      const colWidths = [15, 30, 15, 15, 25, 30, 15, 12, 20, 15, 50, 15, 20, 30, 15];
      ws['!cols'] = colWidths.map(width => ({ wch: width }));

      const fileName = productType === 'credit_card' ? 'credit_cards_template.xlsx' : 'personal_loans_template.xlsx';
      XLSX.writeFile(wb, fileName);

      toast({
        title: 'Template Downloaded',
        description: `The ${productType === 'credit_card' ? 'credit cards' : 'personal loans'} template has been downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to download template',
        variant: 'destructive',
      });
    }
  };

  // Handle export
  const handleExport = () => {
    try {
      const data = cards.map(card => ({
        'bank': card.bank || '',
        'name': card.name || '',
        'type': card.type || productType,
        'dsa_commission': card.dsa_commission || card.dsaCommission || '',
        'reward_points': card.reward_points || card.rewardPoints || '',
        'redirect_url': card.redirect_url || '',
        'payout_source': card.payout_source || '',
        'status': card.status || 'active',
        'badge_text': card.badge_text || card.badgeText || '',
        'badge_color': card.badge_color || card.badgeColor || '',
        'features': card.features || '',
        'joining_fee': card.joining_fee || card.joiningFee || '',
        'renewal_fee': card.renewal_fee || card.renewalFee || '',
        'terms': card.terms || '',
        'pincodes': card.pincodes || '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, productType === 'credit_card' ? 'Credit Cards' : 'Personal Loans');

      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = productType === 'credit_card'
        ? `credit_cards_export_${timestamp}.xlsx`
        : `personal_loans_export_${timestamp}.xlsx`;

      XLSX.writeFile(wb, fileName);

      toast({
        title: 'Export Successful',
        description: `${cards.length} ${productType === 'credit_card' ? 'credit cards' : 'personal loans'} exported to Excel`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export',
        variant: 'destructive',
      });
    }
  };

  // Handle file selection for import
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

      const cards = jsonData.map((row: any) => ({
        bank: row['bank'] || '',
        name: row['name'] || '',
        type: row['type'] || productType,
        dsa_commission: row['dsa_commission'] || '0',
        reward_points: row['reward_points'] || '',
        redirect_url: row['redirect_url'] || '',
        payout_source: row['payout_source'] || '',
        status: row['status'] || 'active',
        badge_text: row['badge_text'] || '',
        badge_color: row['badge_color'] || '#28A745',
        features: row['features'] || '',
        joining_fee: row['joining_fee'] || '',
        renewal_fee: row['renewal_fee'] || '',
        terms: row['terms'] || '',
        pincodes: row['pincodes'] || 'ALL',
      })).filter((card: any) => {
        const hasAnyData = card.name && card.bank;
        return hasAnyData;
      });

      setImportedCards(cards);
      setShowImportDialog(true);

      toast({
        title: 'File Loaded',
        description: `${cards.length} ${productType === 'credit_card' ? 'credit cards' : 'personal loans'} ready to import`,
      });
    } catch (error) {
      toast({
        title: 'Import Error',
        description: error instanceof Error ? error.message : 'Failed to parse file',
        variant: 'destructive',
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle bulk import submission
  const handleImportSubmit = async () => {
    if (importedCards.length === 0) return;

    setIsSubmitting(true);

    try {
      // Process in batches to avoid overwhelming the server
      const BATCH_SIZE = 10;
      let successful = 0;
      let failed = 0;

      for (let i = 0; i < importedCards.length; i += BATCH_SIZE) {
        const batch = importedCards.slice(i, i + BATCH_SIZE);

        const results = await Promise.allSettled(
          batch.map(card =>
            api.createCreditCard({
              name: card.name,
              bank: card.bank,
              type: card.type,
              dsa_commission: Number(card.dsa_commission),
              reward_points: card.reward_points,
              redirect_url: card.redirect_url,
              payout_source: card.payout_source,
              status: card.status,
              badge_text: card.badge_text,
              badge_color: card.badge_color,
              features: card.features,
              joining_fee: card.joining_fee,
              renewal_fee: card.renewal_fee,
              terms: card.terms,
              pincodes: card.pincodes,
            })
          )
        );

        successful += results.filter(r => r.status === 'fulfilled').length;
        failed += results.filter(r => r.status === 'rejected').length;

        // Small delay between batches
        if (i + BATCH_SIZE < importedCards.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      toast({
        title: 'Import Complete',
        description: `${successful} ${productType === 'credit_card' ? 'credit cards' : 'personal loans'} imported successfully${failed > 0 ? `, ${failed} failed` : ''}`,
      });

      if (onImportSuccess) {
        onImportSuccess();
      }

      setShowImportDialog(false);
      setImportedCards([]);
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            <span>Import/Export</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover border border-border z-50">
          <DropdownMenuItem onClick={handleDownloadTemplate} className="cursor-pointer gap-2">
            <FileText className="w-4 h-4" />
            <span>Download Template</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExport} className="cursor-pointer gap-2">
            <Download className="w-4 h-4" />
            <span>Export to Excel</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer gap-2">
            <Upload className="w-4 h-4" />
            <span>Import from Excel</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Import Preview Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              Review the {importedCards.length} {productType === 'credit_card' ? 'credit cards' : 'personal loans'} below before importing.
            </DialogDescription>
          </DialogHeader>

          <div className="border border-border rounded-lg overflow-x-auto bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-[11px]">Row</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px]">Bank</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px]">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px]">Commission</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {importedCards.map((card, index) => (
                  <tr key={index} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 text-[10px] font-mono text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2 text-[11px]">{card.bank}</td>
                    <td className="px-3 py-2 text-[11px]">{card.name}</td>
                    <td className="px-3 py-2 text-[11px]">₹{card.dsa_commission}</td>
                    <td className="px-3 py-2 text-[11px]">{card.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportSubmit}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import {importedCards.length} {productType === 'credit_card' ? 'Cards' : 'Loans'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreditCardImportExport;
