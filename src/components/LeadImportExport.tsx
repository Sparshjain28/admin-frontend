import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import {
  exportLeadsToExcel,
  downloadTemplate,
  parseExcelFile,
  validateLeadData,
  FILTERED_LEAD_COLUMNS,
  FULL_LEAD_COLUMNS,
  downloadOfflineTemplate,
  parseOfflineLeadsFile,
} from '@/lib/excelUtils';
import { Lead } from '@/types/lead';
import { api } from '@/services/api';

interface LeadImportExportProps {
  leads: Lead[];
  onImportSuccess?: () => void;
  onDeleteAll?: () => void;
  filters?: any;
}

const coalesceImportValue = (uploadVal: unknown, existingVal: unknown) => {
  if (uploadVal !== undefined && uploadVal !== null && String(uploadVal).trim() !== '') {
    return uploadVal;
  }
  return existingVal;
};

const isApprovedAndActive = (status?: string, activation?: string) => {
  const normalizedStatus = (status || '').trim().toLowerCase();
  const normalizedActivation = (activation || '').trim().toLowerCase();
  return normalizedStatus === 'approved' && normalizedActivation === 'active';
};

const isDbLeadLocked = (lead: { _dbStatus?: string; _dbActivation?: string }) =>
  isApprovedAndActive(lead._dbStatus, lead._dbActivation);

export const LeadImportExport = ({ leads, onImportSuccess, onDeleteAll, filters }: LeadImportExportProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const offlineFileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importedLeads, setImportedLeads] = useState<Partial<Lead>[]>([]);
  const [newImportLeads, setNewImportLeads] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<Record<number, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOfflineDialog, setShowOfflineDialog] = useState(false);
  const [offlineLeads, setOfflineLeads] = useState<any[]>([]);
  const [isSubmittingOffline, setIsSubmittingOffline] = useState(false);
  const [skippedSummary, setSkippedSummary] = useState<{ leadId: string; reason: string }[]>([]);
  const [advisorNameMap, setAdvisorNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    api.searchUsers('', 1, 500).then(res => {
      if (res?.success && Array.isArray(res.users)) {
        const map: Record<string, string> = {};
        for (const u of res.users) map[u.id] = u.name;
        map['INHOUSE'] = 'In-House';
        setAdvisorNameMap(map);
      }
    }).catch(() => {});
  }, []);

  const getAdvisorName = useCallback((id: string | undefined | null) => {
    if (!id) return '-';
    return advisorNameMap[id] || id;
  }, [advisorNameMap]);

  // Memoize expensive calculations
  const importableOfflineCount = useMemo(() => offlineLeads.filter(l => !l?._skipped).length, [offlineLeads]);
  const skippedOfflineCount = useMemo(() => offlineLeads.filter(l => l?._skipped).length, [offlineLeads]);

  // Memoize card matching function
  const findCard = useCallback((bankInput: string, productInput: string, allCards: any[]) => {
    if (!productInput) return null;
    const inputLower = productInput.toLowerCase().trim();
    const inputWords = inputLower.split(/\s+/).filter(w => w.length > 2);
    const bankWords = bankInput.toLowerCase().trim().split(/\s+/).filter(w => w.length > 2);

    let best: any = null;
    let bestScore = 0;

    for (const card of allCards) {
      const cardName = (card.name || '').toLowerCase();
      const cardWords = cardName.split(/\s+/).filter((w: string) => w.length > 2);
      const bankName = (typeof card.bank === 'string' ? card.bank : card.bank?.name || card.bank_name || card.bankName || '').toLowerCase();

      let score = 0;
      for (const w of inputWords) {
        if (cardName.includes(w)) score += 2;
      }
      for (const w of cardWords) {
        if (inputLower.includes(w)) score += 2;
      }
      for (const w of bankWords) {
        if (bankName.includes(w)) score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        best = card;
      }
    }
    return bestScore > 0 ? best : null;
  }, []);

  // Handle template download
  const handleDownloadTemplate = () => {
    try {
      downloadTemplate();
      toast({
        title: 'Template Downloaded',
        description: 'The leads template has been downloaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to download template',
        variant: 'destructive',
      });
    }
  };

  // Handle leads export - fetch ALL leads
  const handleExport = async () => {
    try {
      toast({
        title: 'Exporting...',
        description: 'Fetching all leads for export',
      });

      // Fetch filtered leads from API
      // Request ALL leads from the server explicitly (ignore current filters)
      // includeArchived=true ensures archived Generated leads (>30 days) are returned too
      const response = await api.getAllLeads({ includeArchived: 'true' });
      let allLeads = response.success ? response.records : [];

      // Normalize created_at to date-only for export
      allLeads = allLeads.map((l: any) => ({ 
        ...l, 
        created_at: l.created_at ? String(l.created_at).split(' ')[0] : '',
        card_issued_date: l.card_issued_date ? String(l.card_issued_date).split('T')[0].split(' ')[0] : ''
      }));

      if (allLeads.length === 0) {
        toast({
          title: 'No Leads',
          description: 'There are no leads to export',
          variant: 'destructive',
        });
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      
      // Determine columns based on filters
      // If any major filter is applied (except defaults like 'all'), use filtered columns
      const hasFilters = filters && Object.entries(filters).some(([key, value]) => {
        if (!value) return false;
        if (value === 'all') return false;
        if (key === 'limit' || key === 'page') return false;
        return true;
      });

      const columns = hasFilters ? FILTERED_LEAD_COLUMNS : FULL_LEAD_COLUMNS;
      
      exportLeadsToExcel(allLeads, `leads_export_${timestamp}.xlsx`, columns);
      toast({
        title: 'Export Successful',
        description: `${allLeads.length} leads exported to Excel`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description:
          error instanceof Error ? error.message : 'Failed to export leads',
        variant: 'destructive',
      });
    }
  };

  // Handle file selection for import
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
        const parsedLeads = await parseExcelFile(file);

        // ── FIN code → Advisor ID mapping ─────────────────────────────────────
        const FIN_ADVISOR_MAP: Record<string, string> = {
          'FIN004': 'CH5BFAAC1B',
          'FIN005': 'CHEDA7903C',
          'FIN007': 'CHSH57015',
          'FIN008': 'CH0307B6F1',
          'FIN009': 'E289FFB3',
          'FIN010': 'CHA1F8C80F',
          'FIN011': 'CHUD40336',
        };

        for (const lead of parsedLeads) {
          const advId = (lead.advisor_id || '').toString().trim().toUpperCase();
          const finMatch = advId.match(/^FIN\d{3}$/);
          if (finMatch && FIN_ADVISOR_MAP[advId]) {
            lead.advisor_id = FIN_ADVISOR_MAP[advId];
          }
        }

        // Immediately show a preview of parsed rows while lookup runs
        const previewRows = parsedLeads.map((lead: any) => ({
          lead_id: lead.lead_id || '',
          applicant_name: lead.applicant_name || '',
          applicant_phone: lead.applicant_phone || '',
          applicant_email: lead.applicant_email || '',
          bank_name: lead.bank_name || '',
          card_name: lead.card_name || '',
          status: lead.status || '',
          remark: lead.remark || '',
          application_no: lead.application_no || '',
          cust_type: lead.cust_type || '',
          card_variant: lead.card_variant || '',
          vkyc_status: lead.vkyc_status || '',
          bkyc_status: lead.bkyc_status || '',
          card_issued_date: lead.card_issued_date ? String(lead.card_issued_date).split('T')[0].split(' ')[0] : '',
          activation_status: lead.activation_status || '',
          disbursed_amount: lead.disbursed_amount || '',
          _resolvedId: null,
          _matchedBy: 'Searching...',
        }));

        setImportedLeads(previewRows);
        setImportErrors({});
        setSkippedSummary([]);
        setShowImportDialog(true);

        toast({ title: 'Preview ready', description: `${previewRows.length} rows loaded. Looking up matches...` });

        // Bulk lookup: collect unique lead IDs and application numbers, call backend once
        const leadIds = Array.from(new Set(parsedLeads.map((r: any) => (r.lead_id || '').toString().trim()).filter(Boolean)));
        const applicationNumbers = Array.from(new Set(parsedLeads.map((r: any) => (r.application_no || '').toString().trim()).filter(Boolean)));

        let lookupMap: Record<string, any> = {};
        if (leadIds.length > 0 || applicationNumbers.length > 0) {
          try {
            const res = await api.bulkLookupLeads(leadIds, applicationNumbers);
            if (res && res.success && res.map) lookupMap = res.map;
          } catch (err) {
            console.error('Bulk lookup failed', err);
          }
        }

        // Merge parsed rows with DB results using lookupMap and update preview
        const enriched: any[] = [];
        const newLeadRows: any[] = [];
        const skipped: { leadId: string; reason: string }[] = [];

        for (const lead of parsedLeads) {
          let existingLead: any | undefined;
          let matchedBy = '';

          if (lead.lead_id && lookupMap[lead.lead_id]) {
            existingLead = lookupMap[lead.lead_id];
            matchedBy = 'Lead ID';
          } else if (lead.application_no && lookupMap[lead.application_no]) {
            existingLead = lookupMap[lead.application_no];
            matchedBy = 'App No';
          }

          if (existingLead) {
            enriched.push({
              lead_id: coalesceImportValue(lead.lead_id, existingLead.lead_id),
              applicant_name: coalesceImportValue(lead.applicant_name, existingLead.applicant_name),
              applicant_phone: coalesceImportValue(lead.applicant_phone, existingLead.applicant_phone),
              applicant_email: coalesceImportValue(lead.applicant_email, existingLead.applicant_email),
              bank_name: coalesceImportValue(lead.bank_name, existingLead.bank_name),
              card_name: coalesceImportValue(lead.card_name, existingLead.card_name),
              status: coalesceImportValue(lead.status, existingLead.status),
              remark: coalesceImportValue(lead.remark, existingLead.remark),
              application_no: coalesceImportValue(lead.application_no, existingLead.application_no),
              cust_type: coalesceImportValue(lead.cust_type, existingLead.cust_type),
              card_variant: coalesceImportValue(lead.card_variant, existingLead.card_variant),
              vkyc_status: coalesceImportValue(lead.vkyc_status, existingLead.vkyc_status),
              bkyc_status: coalesceImportValue(lead.bkyc_status, existingLead.bkyc_status),
              card_issued_date: coalesceImportValue(lead.card_issued_date, existingLead.card_issued_date),
              activation_status: coalesceImportValue(lead.activation_status, existingLead.activation_status),
              disbursed_amount: coalesceImportValue(lead.disbursed_amount, existingLead.disbursed_amount),
              advisor_id: coalesceImportValue(lead.advisor_id, existingLead.advisor_id),
              _resolvedId: existingLead.id,
              _matchedBy: matchedBy,
              _dbStatus: existingLead.status,
              _dbActivation: existingLead.activation_status,
            });
          } else {
            const rawId = (lead.lead_id || '').toString().trim();
            newLeadRows.push({
              lead_id: rawId,
              applicant_name: lead.applicant_name || '',
              applicant_phone: lead.applicant_phone || '',
              applicant_email: lead.applicant_email || '',
              bank_name: lead.bank_name || '',
              card_name: lead.card_name || '',
              status: lead.status || 'In_Process',
              remark: lead.remark || '',
              application_no: lead.application_no || '',
              cust_type: lead.cust_type || '',
              card_variant: lead.card_variant || '',
              vkyc_status: lead.vkyc_status || '',
              bkyc_status: lead.bkyc_status || '',
              card_issued_date: lead.card_issued_date ? String(lead.card_issued_date).split('T')[0].split(' ')[0] : '',
              activation_status: lead.activation_status || '',
              disbursed_amount: lead.disbursed_amount || '',
              advisor_id: lead.advisor_id || 'INHOUSE',
              created_at: lead.created_at ? String(lead.created_at).split('T')[0].split(' ')[0] : '',
            });
          }
        }

        // Update the preview with enriched results
        setImportedLeads(enriched);
        setNewImportLeads(newLeadRows);
        setImportErrors({});
        setSkippedSummary(skipped);

      toast({
        title: 'Ready to Update',
        description: `${enriched.length} leads to update, ${newLeadRows.length} new leads to import`,
      });

      setShowImportDialog(true);
    } catch (error) {
      toast({
        title: 'Import Error',
        description: error instanceof Error ? error.message : 'Failed to parse file',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle bulk import submission with optimized batch processing
  const handleImportSubmit = async () => {
    if (importedLeads.length === 0) return;

    setIsSubmitting(true);
    try {
      const BATCH_SIZE = 10; // Process 10 leads at a time
      let successful = 0;
      let failed = 0;
      let skipped = 0;
      const failedLeads: { leadId: string; error: string }[] = [];

      toast({ title: 'Processing...', description: `Updating ${importedLeads.length} leads in batches...` });

      // Create batches of leads to process
      const batches = [];
      for (let i = 0; i < importedLeads.length; i += BATCH_SIZE) {
        batches.push(importedLeads.slice(i, i + BATCH_SIZE));
      }

      // Process batches sequentially to avoid overwhelming the database
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const lockedInBatch = batch.filter((lead: any) => isDbLeadLocked(lead));
        const lockedWithDate = lockedInBatch.filter((lead: any) => lead.card_issued_date && String(lead.card_issued_date).trim() !== '');
        const lockedNoDate = lockedInBatch.filter((lead: any) => !lead.card_issued_date || String(lead.card_issued_date).trim() === '');
        const updatableBatch = batch.filter((lead: any) => !isDbLeadLocked(lead));

        skipped += lockedNoDate.length;

        let batchPromises: Promise<any>[] = [];

        // Process non-locked leads with full update
        if (updatableBatch.length > 0) {
          const fullUpdates = updatableBatch.map((lead: any) =>
            api.updateLead(lead._resolvedId, {
              applicant_name: lead.applicant_name,
              applicant_phone: lead.applicant_phone,
              applicant_email: lead.applicant_email,
              card_name: lead.card_name,
              bank_name: lead.bank_name,
              card_variant: lead.card_variant,
              status: lead.status,
              activation_status: lead.activation_status,
              application_no: lead.application_no,
              cust_type: lead.cust_type,
              vkyc_status: lead.vkyc_status,
              bkyc_status: lead.bkyc_status,
              card_issued_date: lead.card_issued_date,
              remark: lead.remark,
              disbursed_amount: lead.disbursed_amount,
              advisor_id: lead.advisor_id,
            })
          );
          batchPromises = batchPromises.concat(fullUpdates.map(p => p.then(r => ({ ...r, _leadType: 'full' }))));
        }

        // Process locked leads that have a card_issued_date — only update that field
        if (lockedWithDate.length > 0) {
          const dateOnlyUpdates = lockedWithDate.map((lead: any) =>
            api.updateLead(lead._resolvedId, {
              card_issued_date: lead.card_issued_date,
            })
          );
          batchPromises = batchPromises.concat(dateOnlyUpdates.map(p => p.then(r => ({ ...r, _leadType: 'date-only' }))));
        }

        if (batchPromises.length === 0) continue;

        // Wait for all promises in this batch to complete
        const results = await Promise.allSettled(batchPromises);

        // Process results
        results.forEach((result, index) => {
          const allBatchLeads = [...updatableBatch, ...lockedWithDate];
          const leadId = allBatchLeads[index]?.lead_id || `Row ${batchIndex * BATCH_SIZE + index + 1}`;
          if (result.status === 'fulfilled') {
            const val = result.value;
            if (val?.success !== false) {
              successful++;
            } else {
              failed++;
              failedLeads.push({
                leadId,
                error: val?.error || val?.message || 'Unknown error',
              });
            }
          } else {
            failed++;
            failedLeads.push({
              leadId,
              error: result.reason?.message || 'Unknown error',
            });
          }
        });

        // Add delay between batches to prevent overwhelming the server
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      let description = `${successful} leads updated successfully`;
      if (skipped > 0) description += `, ${skipped} locked (no date to update)`;
      if (failed > 0) description += `, ${failed} failed`;

      toast({ title: 'Update Complete', description });
      if (onImportSuccess) onImportSuccess();

      setShowImportDialog(false);
      setImportedLeads([]);
      setImportErrors({});
      setSkippedSummary([]);
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import leads',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle importing new leads (not found in DB) into the system
  const handleNewLeadImport = async () => {
    if (newImportLeads.length === 0) return;

    setIsSubmitting(true);
    try {
      const BATCH_SIZE = 10;
      let successful = 0;
      let failed = 0;
      const failedLeads: { leadId: string; error: string }[] = [];

      toast({ title: 'Processing...', description: `Importing ${newImportLeads.length} new leads...` });

      const batches = [];
      for (let i = 0; i < newImportLeads.length; i += BATCH_SIZE) {
        batches.push(newImportLeads.slice(i, i + BATCH_SIZE));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        const batchPromises = batch.map((lead: any) =>
          api.createLead({
            applicant_name: lead.applicant_name,
            applicant_phone: lead.applicant_phone,
            applicant_email: lead.applicant_email,
            card_name: lead.card_name,
            bank_name: lead.bank_name,
            card_variant: lead.card_variant,
            status: lead.status === 'Declined' ? 'Rejected' : lead.status,
            activation_status: lead.activation_status,
            application_no: lead.application_no,
            cust_type: lead.cust_type,
            vkyc_status: lead.vkyc_status,
            bkyc_status: lead.bkyc_status,
            card_issued_date: lead.card_issued_date,
            remark: lead.remark,
            disbursed_amount: lead.disbursed_amount,
            advisor_id: lead.advisor_id || undefined,
            created_at: lead.created_at || undefined,
          })
        );

        const results = await Promise.allSettled(batchPromises);

        results.forEach((result, index) => {
          const leadId = batch[index].lead_id || `Row ${batchIndex * BATCH_SIZE + index + 1}`;
          if (result.status === 'fulfilled') {
            if (result.value?.success !== false) {
              successful++;
            } else {
              failed++;
              failedLeads.push({ leadId, error: result.value?.error || 'Unknown error' });
            }
          } else {
            failed++;
            failedLeads.push({ leadId, error: result.reason?.message || 'Unknown error' });
          }
        });

        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      toast({
        title: 'Import Complete',
        description: `${successful} new leads created${failed > 0 ? `, ${failed} failed` : ''}`,
      });

      setShowImportDialog(false);
      setNewImportLeads([]);
      setImportedLeads([]);
      setImportErrors({});
      setSkippedSummary([]);
      if (onImportSuccess) onImportSuccess();
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import leads',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <>
      {(isImporting || isSubmitting || isSubmittingOffline) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
          <div className="text-center space-y-3">
            <div className="inline-block w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-white text-lg font-medium">{isImporting ? 'Looking up leads...' : 'Processing leads...'}</p>
          </div>
        </div>
      )}
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
            <span>Export All Leads to Excel</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer gap-2">
            <Upload className="w-4 h-4" />
            <span>Update Leads from Excel</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={async () => {
            try {
              const [cardsRes, usersRes] = await Promise.all([
                api.getCreditCards(),
                api.getUsers(1, 1000),
              ]);
              const cards = Array.isArray(cardsRes) ? cardsRes : (cardsRes.records || cardsRes.cards || cardsRes.data || []);
              const users = usersRes.users || [];
              await downloadOfflineTemplate('offline_leads_template.xlsx', users, cards);
              toast({ title: 'Template Downloaded', description: 'Offline leads template downloaded.' });
            } catch {
              toast({ title: 'Error', description: 'Failed to download template', variant: 'destructive' });
            }
          }} className="cursor-pointer gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            <span>Download Offline Template</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => offlineFileInputRef.current?.click()} className="cursor-pointer gap-2">
            <Upload className="w-4 h-4 text-blue-500" />
            <span>Import Offline Leads</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={offlineFileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          
          setIsImporting(true);
          try {
            const parsed = await parseOfflineLeadsFile(file);
            
            // Show preview first
            toast({ title: 'Processing file...', description: 'Looking up duplicates and matching cards...' });

            // Fetch all cards once for matching
            const cardsRes = await api.getCreditCards();
            const allCards: any[] = Array.isArray(cardsRes) ? cardsRes : (cardsRes.records || cardsRes.cards || cardsRes.data || []);

            // Helper: find best matching card by partial bank + product name
            const cardMatcher = (bankInput: string, productInput: string) => findCard(bankInput, productInput, allCards);

            const skippedLocal: { leadId: string; reason: string }[] = [];
            const combinedList: any[] = [];

            // Use bulk lookup to check for duplicates by Lead ID and Application Number
            const leadIds = Array.from(new Set(parsed.map((r: any) => (r.lead_id || '').toString().trim()).filter(Boolean)));
            const applicationNumbers = Array.from(new Set(parsed.map((r: any) => (r.application_no || r.application_no_mis || '').toString().trim()).filter(Boolean)));

            let duplicateMap: Record<string, any> = {};
            if (leadIds.length > 0 || applicationNumbers.length > 0) {
              try {
                const res = await api.bulkLookupLeads(leadIds, applicationNumbers);
                if (res && res.success && res.map) duplicateMap = res.map;
              } catch (err) {
                console.error('Bulk lookup failed for offline import', err);
              }
            }

            // Process leads in chunks to prevent UI blocking
            const CHUNK_SIZE = 100;
            for (let i = 0; i < parsed.length; i += CHUNK_SIZE) {
              const chunk = parsed.slice(i, i + CHUNK_SIZE);
              
              // Allow UI to update between chunks
              if (i > 0) await new Promise(resolve => setTimeout(resolve, 10));
              
              for (const lead of chunk) {
              const leadId = (lead.lead_id || '').toString().trim();
              const appNo = (lead.application_no || lead.application_no_mis || '').toString().trim();
              
              // Check for duplicates using lookup map
              let isDuplicate = false;
              if (leadId && duplicateMap[leadId]) {
                isDuplicate = true;
                skippedLocal.push({ leadId: leadId || appNo || 'Unknown', reason: 'Duplicate Lead ID found' });
              } else if (appNo && duplicateMap[appNo]) {
                isDuplicate = true;
                skippedLocal.push({ leadId: leadId || appNo || 'Unknown', reason: 'Duplicate Application No found' });
              }

              if (isDuplicate) {
                combinedList.push({
                  ...lead,
                  applicant_name: lead.applicant_name || lead.customer_name || '',
                  applicant_phone: lead.applicant_phone || lead.customer_number || '',
                  applicant_email: lead.applicant_email || '',
                  bank_name: lead.bank_name || '',
                  card_name: lead.card_name || '',
                  application_no: appNo,
                  cust_type: lead.cust_type || '',
                  card_variant: lead.card_variant || lead.card_variant_mis || '',
                  vkyc_status: lead.vkyc_status || '',
                  bkyc_status: lead.bkyc_status || '',
                  card_issued_date: lead.card_issued_date || '',
                  activation_status: lead.activation_status || '',
                  status: lead.status === 'Declined' ? 'Rejected' : lead.status,
                  remark: lead.remark || '',
                  _skipped: true,
                  _skipReason: isDuplicate ? 'Duplicate found' : 'Unknown',
                });
                continue;
              }

              // If advisor/user id is missing, mark this row as skipped
              if (!lead.advisor_id) {
                skippedLocal.push({ leadId: leadId || appNo || 'Unknown', reason: 'Missing user_id' });
                combinedList.push({
                  ...lead,
                  applicant_name: lead.applicant_name || lead.customer_name || '',
                  applicant_phone: lead.applicant_phone || lead.customer_number || '',
                  applicant_email: lead.applicant_email || '',
                  bank_name: lead.bank_name || '',
                  card_name: lead.card_name || '',
                  application_no: appNo,
                  cust_type: lead.cust_type || '',
                  card_variant: lead.card_variant || lead.card_variant_mis || '',
                  vkyc_status: lead.vkyc_status || '',
                  bkyc_status: lead.bkyc_status || '',
                  card_issued_date: lead.card_issued_date || '',
                  activation_status: lead.activation_status || '',
                  status: lead.status === 'Declined' ? 'Rejected' : lead.status,
                  remark: lead.remark || '',
                  _skipped: true,
                  _skipReason: 'Missing user_id',
                });
                continue;
              }
              
              // Skip advisor resolution for performance
              const advisorName = lead.advisor_id || '';

              // Match card
              const matchedCard = cardMatcher(lead.bank_name || '', lead.card_name || '');

              const resolvedBank = matchedCard
                ? (typeof matchedCard.bank === 'string' ? matchedCard.bank : matchedCard.bank?.name || matchedCard.bank_name || matchedCard.bankName || '')
                : '';

              combinedList.push({
                ...lead,
                _advisorName: advisorName,
                _matchedCard: matchedCard ? matchedCard.name : '',
                _matchedBank: resolvedBank,
                _matchedCardId: matchedCard ? matchedCard.id : '',
                card_name: matchedCard ? matchedCard.name : lead.card_name,
                bank_name: resolvedBank || lead.bank_name,
                status: lead.status === 'Declined' ? 'Rejected' : lead.status,
                _skipped: false,
              });
              }
            }

            setOfflineLeads(combinedList);
            setSkippedSummary(skippedLocal);
            setShowOfflineDialog(true);
            toast({ title: 'File Processed', description: `${combinedList.length} rows loaded, ${skippedLocal.length} already updated` });
          } catch (err) {
            toast({ title: 'Parse Error', description: err instanceof Error ? err.message : 'Failed to parse file', variant: 'destructive' });
          } finally {
            setIsImporting(false);
            if (offlineFileInputRef.current) offlineFileInputRef.current.value = '';
          }
        }}
        className="hidden"
      />

      {/* Import Preview Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Leads from Excel</DialogTitle>
            <DialogDescription>
              Review the {importedLeads.length} leads to update — matched from DB. {newImportLeads.length > 0 ? `${newImportLeads.length} new leads below ready to import into the system.` : ''}
            </DialogDescription>
          </DialogHeader>

          {/* Import preview table */}
          <div className="border border-border rounded-lg overflow-x-auto bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Import</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Row</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Matched By</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Lead ID</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Remark</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">App No.</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Type</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Variant</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">VKYC</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">BKYC</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Issued</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Activation</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Disbursed</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Bank</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Card</th>
                </tr>
              </thead>
              <tbody>
                {importedLeads.map((lead, index) => {
                  const hasError = importErrors[index] && importErrors[index].length > 0;
                  const isLocked = isDbLeadLocked(lead as any);
                  const hasDateToUpdate = isLocked && lead.card_issued_date && String(lead.card_issued_date).trim() !== '';
                  return (
                    <tr
                      key={index}
                      className={`border-t border-border hover:bg-muted/30 ${
                        hasError ? 'bg-red-50/50' : hasDateToUpdate ? 'bg-blue-50/40' : isLocked ? 'bg-orange-50/40' : ''
                      }`}
                    >
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap">
                          {hasError ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-red-100 text-red-700 font-semibold">Error</span>
                          ) : hasDateToUpdate ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-blue-100 text-blue-700 font-semibold" title="Only card issued date will be updated — Approved & Active">📅 Date Only</span>
                          ) : isLocked ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-orange-100 text-orange-700 font-semibold" title="No updates — Approved & Active, no date to update">🔒 Locked</span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-green-50 text-green-700 font-semibold">Ready</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[10px] font-mono text-muted-foreground">{index + 1}</td>
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${(lead as any)._matchedBy === 'App No' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                            {(lead as any)._matchedBy || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap font-mono text-accent">{lead.lead_id}</td>
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.applicant_name}</td>
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.status}</td>
                        <td className="px-3 py-2 text-[11px] max-w-[150px] truncate">{lead.remark}</td>
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.application_no}</td>
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.cust_type}</td>
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.card_variant}</td>
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.vkyc_status}</td>
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.bkyc_status}</td>
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.card_issued_date ? String(lead.card_issued_date).split('T')[0].split(' ')[0] : '-'}</td>
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.activation_status}</td>
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.disbursed_amount}</td>
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.bank_name}</td>
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.card_name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {skippedSummary.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mt-3">
              <p className="text-sm font-medium text-yellow-900 mb-2">⚠ Already Updated Leads ({skippedSummary.length})</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {skippedSummary.map((s, i) => (
                  <div key={i} className="text-xs text-yellow-800 flex gap-2">
                    <span className="font-mono font-bold shrink-0">{s.leadId}</span>
                    <span className="text-yellow-700">— {s.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error summary */}
          {Object.keys(importErrors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-medium text-red-900 mb-2">Validation Errors:</p>
              <div className="space-y-1">
                {Object.entries(importErrors).map(([rowIndex, errors]) => (
                  <div key={rowIndex} className="text-xs text-red-700">
                    <strong>Row {parseInt(rowIndex) + 1}:</strong> {errors.join(', ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skipped leads summary */}
          {skippedSummary.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
              <p className="text-sm font-medium text-yellow-900 mb-2">⚠ Already Updated Leads ({skippedSummary.length})</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {skippedSummary.map((s, i) => (
                  <div key={i} className="text-xs text-yellow-800 flex gap-2">
                    <span className="font-mono font-bold shrink-0">{s.leadId}</span>
                    <span className="text-yellow-700">— {s.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Leads section — leads not found in DB, ready for import */}
          {newImportLeads.length > 0 && (
            <div className="mt-3 border border-blue-300 rounded-lg overflow-x-auto bg-blue-50/30">
              <div className="px-3 py-2 bg-blue-100 border-b border-blue-200">
                <p className="text-sm font-medium text-blue-900">🆕 New Leads to Import ({newImportLeads.length})</p>
                <p className="text-xs text-blue-700">These leads were not found in the system. They will be created as new leads.</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-blue-50/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Lead ID</th>
                    <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Created</th>
                    <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Remark</th>
                    <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">App No.</th>
                    <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Type</th>
                    <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Variant</th>
                    <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">VKYC</th>
                    <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">BKYC</th>
                    <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Issued</th>
                    <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Activation</th>
                    <th className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">Advisor</th>
                  </tr>
                </thead>
                <tbody>
                  {newImportLeads.map((lead, index) => (
                    <tr key={index} className="border-t border-blue-200 hover:bg-blue-50/50">
                      <td className="px-3 py-2 text-[11px] font-mono text-accent">{lead.lead_id}</td>
                      <td className="px-3 py-2 text-[11px]">{lead.created_at || '-'}</td>
                      <td className="px-3 py-2 text-[11px]">{lead.applicant_name}</td>
                      <td className="px-3 py-2 text-[11px]">{lead.status}</td>
                      <td className="px-3 py-2 text-[11px] max-w-[150px] truncate">{lead.remark}</td>
                      <td className="px-3 py-2 text-[11px]">{lead.application_no}</td>
                      <td className="px-3 py-2 text-[11px]">{lead.cust_type}</td>
                      <td className="px-3 py-2 text-[11px]">{lead.card_variant}</td>
                      <td className="px-3 py-2 text-[11px]">{lead.vkyc_status}</td>
                      <td className="px-3 py-2 text-[11px]">{lead.bkyc_status}</td>
                      <td className="px-3 py-2 text-[11px]">{lead.card_issued_date || '-'}</td>
                      <td className="px-3 py-2 text-[11px]">{lead.activation_status}</td>
                      <td className="px-3 py-2 text-[11px]">{getAdvisorName(lead.advisor_id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowImportDialog(false); setSkippedSummary([]); setNewImportLeads([]); }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              {newImportLeads.length > 0 && (
                <Button
                  onClick={handleNewLeadImport}
                  disabled={isSubmitting}
                  variant="secondary"
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>➕ Import {newImportLeads.length} New Leads</span>
                  )}
                </Button>
              )}
              <Button
                onClick={handleImportSubmit}
                disabled={
                  isSubmitting ||
                  Object.keys(importErrors).length === importedLeads.length ||
                  importedLeads.length === 0
                }
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Update {importedLeads.length - Object.keys(importErrors).length} Leads
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offline Import Dialog */}
      <Dialog open={showOfflineDialog} onOpenChange={setShowOfflineDialog}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Offline Leads</DialogTitle>
            <DialogDescription>
              {offlineLeads.length} new leads will be created. Status will be taken from the file (defaults to <strong>Generated</strong>).
            </DialogDescription>
          </DialogHeader>

          <div className="border border-border rounded-lg overflow-x-auto bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  {['Import','#','Name','Phone','Email','Bank','Product','Advisor','App No','Cust Type','Variant','VKYC','BKYC','Issued','Status','Remarks','Activation'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-[11px] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {offlineLeads.map((lead, i) => (
                  <tr key={i} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 text-[11px] whitespace-nowrap">
                      {lead._skipped ? (
                        <div className="flex flex-col">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-yellow-100 text-yellow-800 font-semibold">Already Updated</span>
                          {lead._skipReason && <span className="text-[10px] text-muted-foreground">{lead._skipReason}</span>}
                        </div>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-green-50 text-green-700 font-semibold">Ready</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.applicant_name}</td>
                    <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.applicant_phone}</td>
                    <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.applicant_email || '-'}</td>
                    <td className="px-3 py-2 text-[11px] whitespace-nowrap">
                      {lead._matchedBank || <span className="text-[9px] text-red-500">No bank</span>}
                    </td>
                    <td className="px-3 py-2 text-[11px] whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium text-green-700">{lead._matchedCard || lead.card_name}</span>
                        {lead._matchedCard && lead._matchedCard.toLowerCase() !== (lead.card_name || '').toLowerCase() && (
                          <span className="text-[9px] text-muted-foreground line-through">{lead.card_name}</span>
                        )}
                        {!lead._matchedCard && (
                          <span className="text-[9px] text-red-500">No match found</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[11px] whitespace-nowrap font-mono text-accent">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-card-foreground">{lead._advisorName || lead.advisor_id || '-'}</span>
                        {lead._advisorName && lead._advisorName !== lead.advisor_id && (
                          <span className="text-[9px] text-muted-foreground font-mono">{lead.advisor_id}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.application_no || '-'}</td>
                    <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.cust_type || '-'}</td>
                    <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.card_variant || '-'}</td>
                    <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.vkyc_status || '-'}</td>
                    <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.bkyc_status || '-'}</td>
                    <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.card_issued_date ? String(lead.card_issued_date).split('T')[0].split(' ')[0] : '-'}</td>
                    <td className="px-3 py-2 text-[11px] whitespace-nowrap">{(lead.status || '-').toString().replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 text-[11px] max-w-[220px] truncate">{lead.remark || '-'}</td>
                    <td className="px-3 py-2 text-[11px] whitespace-nowrap">{lead.activation_status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowOfflineDialog(false); setOfflineLeads([]); }}
              disabled={isSubmittingOffline}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setIsSubmittingOffline(true);
                
                try {
                  let success = 0, failed = 0;
                  const failedLeads: { leadId: string; error: string }[] = [];
                  const BATCH_SIZE = 20; // Increased batch size for creation
                  const importList = offlineLeads.filter(l => !l._skipped);
                  
                  console.log('[OfflineLeadImport] Starting optimized import of', importList.length, 'leads');
                  
                  // Create batches
                  const batches = [];
                  for (let i = 0; i < importList.length; i += BATCH_SIZE) {
                    batches.push(importList.slice(i, i + BATCH_SIZE));
                  }
                  
                  // Process batches
                  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                    const batch = batches[batchIndex];
                    
                    // Show progress
                    toast({
                      title: 'Creating leads...',
                      description: `Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} leads)`
                    });
                    
                    // Process batch in parallel
                    const results = await Promise.allSettled(batch.map(lead => {
                      const leadToCreate = {
                        ...lead,
                        creditCardId: lead._matchedCardId || lead.creditCardId || undefined,
            advisor_id: lead.advisor_id || 'INHOUSE',
                        status: lead.status === 'Declined' ? 'Rejected' : lead.status, // Convert Declined to Rejected
                      };
                      
                      if (leadToCreate.status === 'Rejected') {
                        console.log('[OfflineLeadImport] Creating lead with status converted from Declined to Rejected:', {
                          leadId: lead.lead_id,
                          originalStatus: lead.status,
                          convertedStatus: leadToCreate.status
                        });
                      } else if (lead.status === 'Approved') {
                        console.log('[OfflineLeadImport] Creating APPROVED lead with payout generation:', {
                          leadId: lead.lead_id,
                          cardId: leadToCreate.creditCardId,
                          status: lead.status
                        });
                      }
                      
                      return api.createLead(leadToCreate);
                    }));
                    
                    // Process results
                    results.forEach((r, idx) => {
                      const leadData = batch[idx];
                      const leadId = leadData.lead_id || leadData.application_no || 'Unknown';
                      const isApproved = leadData.status === 'Approved';
                      
                      if (r.status === 'fulfilled') {
                        const val = r.value;
                        if (val?.success !== false) {
                          success++;
                          console.log('[OfflineLeadImport] ✓ Lead imported:', leadId, {
                            status: leadData.status,
                            payoutGenerated: isApproved ? '✓ YES (Approved status)' : '✗ No',
                            cardId: leadData._matchedCardId
                          });
                        } else {
                          failed++;
                          const errorMsg = val?.error || 'Unknown error';
                          failedLeads.push({ leadId, error: errorMsg });
                          console.error('[OfflineLeadImport] ✗ Lead import failed (success:false):', {
                            leadId,
                            status: leadData.status,
                            error: errorMsg,
                            response: val
                          });
                        }
                      } else {
                        failed++;
                        const errorMsg = r.reason?.message || 'Unknown error';
                        failedLeads.push({ leadId, error: errorMsg });
                        console.error('[OfflineLeadImport] ✗ Lead import failed (rejected):', {
                          leadId,
                          status: leadData.status,
                          error: errorMsg,
                          reason: r.reason
                        });
                      }
                    });
                    
                    // Short delay between batches
                    if (batchIndex < batches.length - 1) {
                      await new Promise(res => setTimeout(res, 200));
                    }
                  }
                  
                  console.log('[OfflineLeadImport] Import complete:', { success, failed, failedLeads });
                  
                  toast({
                    title: 'Import Complete',
                    description: `${success} leads created${failed > 0 ? `, ${failed} failed` : ''}`,
                    variant: failed > 0 ? 'destructive' : 'default',
                  });
                  
                } catch (error) {
                  toast({
                    title: 'Import Failed',
                    description: error instanceof Error ? error.message : 'Failed to import leads',
                    variant: 'destructive',
                  });
                } finally {
                  setIsSubmittingOffline(false);
                  setShowOfflineDialog(false);
                  setOfflineLeads([]);
                  if (onImportSuccess) onImportSuccess();
                }
              }}
              disabled={isSubmittingOffline || importableOfflineCount === 0}
              className="gap-2"
            >
              {isSubmittingOffline ? (
                <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importing...</>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Create {importableOfflineCount} Leads{skippedOfflineCount > 0 ? ` (${skippedOfflineCount} already updated)` : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
};

export default LeadImportExport;
