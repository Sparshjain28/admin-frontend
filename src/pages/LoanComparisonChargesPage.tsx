import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  BankCompareChargesConfig,
  LenderCharges,
  DEFAULT_BANK_COMPARE_CHARGES,
  fetchBankCompareCharges,
  saveBankCompareCharges
} from '@/services/loanComparisonSettingsService';
import { BANKS_DATA, BankCategory } from '@/constants/banks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  Trash2,
  Search,
  Building2,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Check,
  ShieldCheck,
  FileText,
  BadgePercent,
  Coins
} from 'lucide-react';

import { resolveImageUrl } from '@/services/api';

// Case Types supported in Finonest Auto Loans: Purchase and Refinance/BT
export type CaseType = 'purchase' | 'refinance_bt';

interface CaseTypeDefinition {
  id: CaseType;
  label: string;
  shortLabel: string;
  defaultFinanced: number;
  defaultNotFinanced: number;
  financedField: 'rto_purchase_financed' | 'rto_refinance_financed';
  notFinancedField: 'rto_purchase_not_financed' | 'rto_refinance_not_financed';
}

const CASE_TYPE_OPTIONS: CaseTypeDefinition[] = [
  {
    id: 'purchase',
    label: 'Purchase',
    shortLabel: 'Purchase',
    defaultFinanced: 6000,
    defaultNotFinanced: 4000,
    financedField: 'rto_purchase_financed',
    notFinancedField: 'rto_purchase_not_financed'
  },
  {
    id: 'refinance_bt',
    label: 'Refinance / BT',
    shortLabel: 'Refinance / BT',
    defaultFinanced: 4000,
    defaultNotFinanced: 2000,
    financedField: 'rto_refinance_financed',
    notFinancedField: 'rto_refinance_not_financed'
  }
];

interface BankAvatarProps {
  name: string;
  logoUrl?: string;
  logoLetter: string;
  bgColor: string;
  textColor: string;
}

function BankAvatar({ name, logoUrl, logoLetter, bgColor, textColor }: BankAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const resolvedUrl = resolveImageUrl(logoUrl) || logoUrl;

  if (resolvedUrl && !hasError) {
    return (
      <img
        src={resolvedUrl}
        alt={name}
        className="w-7 h-7 rounded-md object-contain p-0.5 border border-slate-200 dark:border-slate-700 bg-white shrink-0 shadow-2xs"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div
      className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-[10px] ${bgColor} ${textColor} shrink-0 shadow-2xs`}
    >
      {logoLetter}
    </div>
  );
}

// Category badge color helper
function getCategoryBadgeClass(category?: BankCategory): string {
  switch (category) {
    case 'Private Bank':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    case 'NBFC':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    case 'Small Finance Bank':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
    case 'Co-operative Bank':
      return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
}

export default function LoanComparisonChargesPage() {
  // Case Type selected via dropdown
  const [selectedCaseType, setSelectedCaseType] = useState<CaseType>('purchase');

  const [config, setConfig] = useState<BankCompareChargesConfig>(DEFAULT_BANK_COMPARE_CHARGES);
  const [initialConfig, setInitialConfig] = useState<BankCompareChargesConfig>(DEFAULT_BANK_COMPARE_CHARGES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchBankQuery, setSearchBankQuery] = useState('');

  // Local draft inputs so users can type decimals and edit freely across multiple rows
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});

  // Multi-bank selection for bulk editing
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [bulkField, setBulkField] = useState<keyof LenderCharges>('processing_fee');
  const [bulkValue, setBulkValue] = useState<string>('');

  const activeCase = useMemo(() => {
    return CASE_TYPE_OPTIONS.find(c => c.id === selectedCaseType) || CASE_TYPE_OPTIONS[0];
  }, [selectedCaseType]);

  // Track if changes are unsaved
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(config) !== JSON.stringify(initialConfig) || Object.keys(drafts).length > 0;
  }, [config, initialConfig, drafts]);

  // Load configuration from API
  const loadSettings = async (showToast = false) => {
    setLoading(true);
    try {
      const result = await fetchBankCompareCharges();
      setConfig(result.config);
      setInitialConfig(result.config);
      setDrafts({});
      setSelectedBanks([]);
      if (showToast) {
        toast.success('Settings refreshed');
      }
    } catch (err: any) {
      console.error('Failed to fetch settings:', err);
      toast.error(err.message || 'Failed to load comparison charges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // When switching case type, auto-update default bulk field if it was an RTO field
  const handleSelectCaseType = (caseId: CaseType) => {
    setSelectedCaseType(caseId);
    const targetCase = CASE_TYPE_OPTIONS.find(c => c.id === caseId);
    if (
      targetCase &&
      (bulkField === 'rto_purchase_financed' ||
        bulkField === 'rto_purchase_not_financed' ||
        bulkField === 'rto_refinance_financed' ||
        bulkField === 'rto_refinance_not_financed' ||
        bulkField === 'rto_purchase' ||
        bulkField === 'rto_refinance')
    ) {
      setBulkField(targetCase.financedField);
    }
  };

  // Handle Save (saves all bank changes in one request)
  const handleSave = async () => {
    setSaving(true);
    try {
      // Reconcile any pending drafts into config before saving
      let finalConfig = { ...config };
      const updatedCharges = { ...(finalConfig.bank_charges || {}) };
      const updatedFees = { ...(finalConfig.bank_processing_fees || {}) };

      for (const [bankKey, fields] of Object.entries(drafts)) {
        const existing = updatedCharges[bankKey] || {
          stamp_duty: finalConfig.stamp_duty_percentage ?? 0.35,
          processing_fee: finalConfig.bank_processing_fees?.[bankKey] ?? 1.5,
          valuation: finalConfig.valuation_charges_base ?? 1000,
          pdd: finalConfig.pdd_charges_base ?? 1000,
          foreclosure: finalConfig.foreclosure_percentage ?? 5,
          rto_purchase_financed: finalConfig.rto_purchase_financed ?? 6000,
          rto_purchase_not_financed: finalConfig.rto_purchase_not_financed ?? 4000,
          rto_refinance_financed: finalConfig.rto_refinance_financed ?? 4000,
          rto_refinance_not_financed: finalConfig.rto_refinance_not_financed ?? 2000,
          other_mandatory_below_5l: finalConfig.other_mandatory_below_5l ?? 4000,
          other_mandatory_above_5l: finalConfig.other_mandatory_above_5l ?? 6000
        };

        const merged: LenderCharges = { ...existing };
        for (const [f, valStr] of Object.entries(fields)) {
          const num = parseFloat(valStr);
          if (!isNaN(num) && num >= 0) {
            (merged as any)[f] = num;
          }
        }
        updatedCharges[bankKey] = merged;
        updatedFees[bankKey] = merged.processing_fee;
      }

      finalConfig.bank_charges = updatedCharges;
      finalConfig.bank_processing_fees = updatedFees;

      const response = await saveBankCompareCharges(finalConfig);
      setConfig(finalConfig);
      setInitialConfig(finalConfig);
      setDrafts({});
      toast.success(response.message || 'All comparison charges saved successfully');
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      toast.error(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Save an individual bank row immediately
  const handleSaveSingleBank = async (bankKey: string) => {
    setSaving(true);
    try {
      let finalConfig = { ...config };
      const updatedCharges = { ...(finalConfig.bank_charges || {}) };
      const updatedFees = { ...(finalConfig.bank_processing_fees || {}) };

      const fields = drafts[bankKey];
      const existing = updatedCharges[bankKey] || {
        stamp_duty: finalConfig.stamp_duty_percentage ?? 0.35,
        processing_fee: finalConfig.bank_processing_fees?.[bankKey] ?? 1.5,
        valuation: finalConfig.valuation_charges_base ?? 1000,
        pdd: finalConfig.pdd_charges_base ?? 1000,
        foreclosure: finalConfig.foreclosure_percentage ?? 5,
        rto_purchase_financed: finalConfig.rto_purchase_financed ?? 6000,
        rto_purchase_not_financed: finalConfig.rto_purchase_not_financed ?? 4000,
        rto_refinance_financed: finalConfig.rto_refinance_financed ?? 4000,
        rto_refinance_not_financed: finalConfig.rto_refinance_not_financed ?? 2000,
        other_mandatory_below_5l: finalConfig.other_mandatory_below_5l ?? 4000,
        other_mandatory_above_5l: finalConfig.other_mandatory_above_5l ?? 6000
      };

      const merged: LenderCharges = { ...existing };
      if (fields) {
        for (const [f, valStr] of Object.entries(fields)) {
          const num = parseFloat(valStr);
          if (!isNaN(num) && num >= 0) {
            (merged as any)[f] = num;
          }
        }
      }

      updatedCharges[bankKey] = merged;
      updatedFees[bankKey] = merged.processing_fee;
      finalConfig.bank_charges = updatedCharges;
      finalConfig.bank_processing_fees = updatedFees;

      const response = await saveBankCompareCharges(finalConfig);
      setConfig(finalConfig);
      setInitialConfig(finalConfig);

      // Clear draft for this bank
      setDrafts(prev => {
        const next = { ...prev };
        delete next[bankKey];
        return next;
      });

      const bankName = BANKS_DATA.find(b => b.id.toLowerCase() === bankKey.toLowerCase())?.name || bankKey.toUpperCase();
      toast.success(response.message ? `Saved charges for ${bankName}` : `Saved charges for ${bankName}`);
    } catch (err: any) {
      console.error('Failed to save bank charges:', err);
      toast.error(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Get current displayed value for an input (draft or saved config)
  const getFieldValue = (bankKey: string, field: keyof LenderCharges, fallback: number): string => {
    if (drafts[bankKey]?.[field] !== undefined) {
      return drafts[bankKey][field];
    }
    return String(fallback);
  };

  // Handle live inline editing of multiple banks simultaneously
  const handleFieldChange = (
    bankKey: string,
    field: keyof LenderCharges,
    rawText: string
  ) => {
    // 1. Keep draft text so user can freely type decimals like '0.' or clear values
    setDrafts(prev => ({
      ...prev,
      [bankKey]: {
        ...(prev[bankKey] || {}),
        [field]: rawText
      }
    }));

    // 2. If valid number, also update config state in real-time
    const num = parseFloat(rawText);
    if (!isNaN(num) && num >= 0) {
      setConfig(prev => {
        const existing = prev.bank_charges?.[bankKey] || {
          stamp_duty: prev.stamp_duty_percentage ?? 0.35,
          processing_fee: prev.bank_processing_fees?.[bankKey] ?? 1.5,
          valuation: prev.valuation_charges_base ?? 1000,
          pdd: prev.pdd_charges_base ?? 1000,
          foreclosure: prev.foreclosure_percentage ?? 5,
          rto_purchase_financed: prev.rto_purchase_financed ?? 6000,
          rto_purchase_not_financed: prev.rto_purchase_not_financed ?? 4000,
          rto_refinance_financed: prev.rto_refinance_financed ?? 4000,
          rto_refinance_not_financed: prev.rto_refinance_not_financed ?? 2000,
          other_mandatory_below_5l: prev.other_mandatory_below_5l ?? 4000,
          other_mandatory_above_5l: prev.other_mandatory_above_5l ?? 6000
        };

        const updatedCharges: LenderCharges = {
          ...existing,
          [field]: num
        };

        const nextBankCharges = {
          ...(prev.bank_charges || {}),
          [bankKey]: updatedCharges
        };

        const nextBankFees = {
          ...prev.bank_processing_fees,
          [bankKey]: updatedCharges.processing_fee
        };

        return {
          ...prev,
          bank_processing_fees: nextBankFees,
          bank_charges: nextBankCharges
        };
      });
    }
  };

  // Select/Deselect all banks currently visible
  const handleToggleSelectAll = () => {
    if (selectedBanks.length === filteredBankEntries.length) {
      setSelectedBanks([]);
    } else {
      setSelectedBanks(filteredBankEntries.map(b => b.key));
    }
  };

  // Select/Deselect single bank
  const handleToggleSelectBank = (bankKey: string) => {
    setSelectedBanks(prev =>
      prev.includes(bankKey) ? prev.filter(k => k !== bankKey) : [...prev, bankKey]
    );
  };

  // Bulk update all selected banks simultaneously
  const handleApplyBulkUpdate = () => {
    const num = parseFloat(bulkValue);
    if (isNaN(num) || num < 0) {
      toast.error('Please enter a valid non-negative number');
      return;
    }

    if (selectedBanks.length === 0) {
      toast.error('Please select one or more lenders first');
      return;
    }

    setConfig(prev => {
      const updatedCharges = { ...(prev.bank_charges || {}) };
      const updatedFees = { ...prev.bank_processing_fees };

      for (const key of selectedBanks) {
        const existing = updatedCharges[key] || {
          stamp_duty: prev.stamp_duty_percentage ?? 0.35,
          processing_fee: prev.bank_processing_fees?.[key] ?? 1.5,
          valuation: prev.valuation_charges_base ?? 1000,
          pdd: prev.pdd_charges_base ?? 1000,
          foreclosure: prev.foreclosure_percentage ?? 5,
          rto_purchase_financed: prev.rto_purchase_financed ?? 6000,
          rto_purchase_not_financed: prev.rto_purchase_not_financed ?? 4000,
          rto_refinance_financed: prev.rto_refinance_financed ?? 4000,
          rto_refinance_not_financed: prev.rto_refinance_not_financed ?? 2000,
          other_mandatory_below_5l: prev.other_mandatory_below_5l ?? 4000,
          other_mandatory_above_5l: prev.other_mandatory_above_5l ?? 6000
        };

        updatedCharges[key] = {
          ...existing,
          [bulkField]: num
        };

        if (bulkField === 'processing_fee') {
          updatedFees[key] = num;
        }
      }

      return {
        ...prev,
        bank_processing_fees: updatedFees,
        bank_charges: updatedCharges
      };
    });

    // Clear drafts for selected banks for this field so new value renders immediately
    setDrafts(prev => {
      const next = { ...prev };
      for (const key of selectedBanks) {
        if (next[key]) {
          const { [bulkField]: _, ...rest } = next[key];
          next[key] = rest;
        }
      }
      return next;
    });

    toast.success(`Updated ${bulkField.replace(/_/g, ' ')} for ${selectedBanks.length} selected lenders`);
    setBulkValue('');
  };

  // Remove a lender
  const handleRemoveBank = (bankKey: string) => {
    setConfig(prev => {
      const updatedFees = { ...prev.bank_processing_fees };
      delete updatedFees[bankKey];

      const updatedCharges = { ...(prev.bank_charges || {}) };
      delete updatedCharges[bankKey];

      return {
        ...prev,
        bank_processing_fees: updatedFees,
        bank_charges: updatedCharges
      };
    });
    setSelectedBanks(prev => prev.filter(k => k !== bankKey));
    toast.info(`Removed ${bankKey}`);
  };

  // Display all auto-loan lenders present during lead creation
  const allBankEntries = useMemo(() => {
    return BANKS_DATA.map(known => {
      const key = known.id;
      const charges = config.bank_charges?.[key] || {
        stamp_duty: config.stamp_duty_percentage ?? 0.35,
        processing_fee: config.bank_processing_fees?.[key] ?? 1.5,
        valuation: config.valuation_charges_base ?? 1000,
        pdd: config.pdd_charges_base ?? 1000,
        foreclosure: config.foreclosure_percentage ?? 5,
        rto_purchase_financed: config.rto_purchase_financed ?? 6000,
        rto_purchase_not_financed: config.rto_purchase_not_financed ?? 4000,
        rto_refinance_financed: config.rto_refinance_financed ?? 4000,
        rto_refinance_not_financed: config.rto_refinance_not_financed ?? 2000,
        other_mandatory_below_5l: config.other_mandatory_below_5l ?? 4000,
        other_mandatory_above_5l: config.other_mandatory_above_5l ?? 6000
      };

      return {
        key,
        name: known.name,
        category: known.category || 'NBFC',
        logoUrl: known.logoUrl,
        logoLetter: known.logoLetter,
        bgColor: known.bgColor || 'bg-slate-700',
        textColor: known.textColor || 'text-white',
        stampDuty: charges.stamp_duty ?? 0.35,
        processingFee: charges.processing_fee ?? 1.5,
        valuation: charges.valuation ?? 1000,
        pdd: charges.pdd ?? 1000,
        foreclosure: charges.foreclosure ?? 5,
        rtoPurchaseFinanced: charges.rto_purchase_financed ?? config.rto_purchase_financed ?? 6000,
        rtoPurchaseNotFinanced: charges.rto_purchase_not_financed ?? config.rto_purchase_not_financed ?? 4000,
        rtoRefinanceFinanced: charges.rto_refinance_financed ?? config.rto_refinance_financed ?? 4000,
        rtoRefinanceNotFinanced: charges.rto_refinance_not_financed ?? config.rto_refinance_not_financed ?? 2000,
        otherMandatoryBelow5l: charges.other_mandatory_below_5l ?? config.other_mandatory_below_5l ?? 4000,
        otherMandatoryAbove5l: charges.other_mandatory_above_5l ?? config.other_mandatory_above_5l ?? 6000
      };
    });
  }, [config]);

  // Filtered lenders list by search
  const filteredBankEntries = useMemo(() => {
    return allBankEntries
      .filter(item => {
        if (!searchBankQuery.trim()) return true;
        const q = searchBankQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.key.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allBankEntries, searchBankQuery]);

  const isAllSelected = filteredBankEntries.length > 0 && selectedBanks.length === filteredBankEntries.length;

  return (
    <div className="w-full space-y-3 text-slate-900 dark:text-slate-100 pb-10">
      
      {/* Consolidated Table Card */}
      <Card className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden rounded-xl">
        
        {/* Header Controls: Case Type Dropdown + Search + Save */}
        <CardHeader className="py-3 px-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 space-y-2.5">
          
          {/* Main Controls Row: Title, Badges, Case Type Dropdown, Search, Save */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Left: Title + Badges + Case Type Dropdown */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Loan Comparison Charges
                </CardTitle>
              </div>

              <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 py-0.5 px-2">
                Sync Active
              </Badge>

              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-mono text-slate-600 dark:text-slate-300">
                {filteredBankEntries.length} lenders
              </Badge>

              {hasUnsavedChanges && (
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-semibold px-2 py-0.5 animate-pulse">
                  Unsaved Changes
                </Badge>
              )}

              {/* Clean Case Type Dropdown */}
              <div className="flex items-center gap-2 ml-1 pl-2.5 border-l border-slate-300 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Case Type:
                </span>
                <select
                  value={selectedCaseType}
                  onChange={e => handleSelectCaseType(e.target.value as CaseType)}
                  className="h-8 text-xs font-bold rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-indigo-900 dark:text-indigo-200 px-3 py-1 shadow-2xs cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="purchase">Purchase</option>
                  <option value="refinance_bt">Refinance / BT</option>
                </select>
              </div>
            </div>

            {/* Right: Search + Save All Changes */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative w-44 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Filter lenders..."
                  value={searchBankQuery}
                  onChange={e => setSearchBankQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                />
              </div>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={loading || saving}
                className={`h-8 px-4 text-xs font-semibold shrink-0 transition-all ${
                  hasUnsavedChanges
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md ring-2 ring-blue-400/30'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                }`}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {/* Bulk Update Bar (Appears when 1 or more lenders are selected) */}
          {selectedBanks.length > 0 && (
            <div className="p-2.5 rounded-lg bg-indigo-50/90 dark:bg-slate-800/90 border border-indigo-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  {selectedBanks.length} {selectedBanks.length === 1 ? 'lender' : 'lenders'} selected
                </span>
                <span className="text-[11px] text-slate-500">
                  (Bulk edit for active case: <strong className="text-indigo-600 dark:text-indigo-400">{activeCase.shortLabel}</strong>)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={bulkField}
                  onChange={e => setBulkField(e.target.value as keyof LenderCharges)}
                  className="h-7 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-0.5 font-medium text-slate-700 dark:text-slate-200"
                >
                  <option value={activeCase.financedField}>Set {activeCase.shortLabel} RTO (Financed) (₹)</option>
                  <option value={activeCase.notFinancedField}>Set {activeCase.shortLabel} RTO (Not Financed) (₹)</option>
                  <option value="processing_fee">Set Processing Fee (%)</option>
                  <option value="stamp_duty">Set Stamp Duty (%)</option>
                  <option value="valuation">Set Valuation Charges (₹)</option>
                  <option value="pdd">Set PDN Charges (₹)</option>
                  <option value="foreclosure">Set Foreclosure Charges (% + GST)</option>
                  <option value="other_mandatory_below_5l">Set Other Mandatory &lt; 5L (₹)</option>
                  <option value="other_mandatory_above_5l">Set Other Mandatory ≥ 5L (₹)</option>
                </select>

                <Input
                  type="number"
                  step="0.05"
                  placeholder="Enter value"
                  value={bulkValue}
                  onChange={e => setBulkValue(e.target.value)}
                  className="h-7 w-28 text-xs font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-right"
                />

                <Button
                  size="sm"
                  onClick={handleApplyBulkUpdate}
                  className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  Apply to Selected
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedBanks([])}
                  className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        {/* Multi-bank Editable Table */}
        <CardContent className="p-0">
          <div className="w-full overflow-hidden">
            <table className="w-full table-fixed text-xs text-left">
              <colgroup>
                <col style={{ width: '3.5%' }} />
                <col style={{ width: '19%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '11.5%' }} />
                <col style={{ width: '6%' }} />
              </colgroup>
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-1 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-slate-400 hover:text-indigo-600 transition-colors"
                      title={isAllSelected ? 'Deselect all' : 'Select all visible'}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-2 font-semibold">Lender</th>
                  <th className="py-2.5 px-1 font-semibold text-center">Stamp Duty (%)</th>
                  <th className="py-2.5 px-1 font-semibold text-center">Proc. Fees (%)</th>
                  <th className="py-2.5 px-1 font-semibold text-center">Valuation (₹)</th>
                  <th className="py-2.5 px-1 font-semibold text-center">PDN Charges (₹)</th>
                  <th className="py-2.5 px-1 font-semibold text-center">Foreclosure (%+GST)</th>
                  <th className="py-2 px-1 font-semibold text-center">
                    <div>{activeCase.shortLabel} RTO (₹)</div>
                    {selectedCaseType === 'purchase' && (
                      <div className="text-[9px] font-normal text-indigo-600 dark:text-indigo-400 font-sans leading-none mt-0.5">
                        + Road Tax
                      </div>
                    )}
                  </th>
                  <th className="py-2.5 px-1 font-semibold text-center">Other Mandatory (₹)</th>
                  <th className="py-2.5 px-1 font-semibold text-center">Action</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBankEntries.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No lenders found matching "{searchBankQuery}"
                    </td>
                  </tr>
                ) : (
                  filteredBankEntries.map(bank => {
                    const isSelected = selectedBanks.includes(bank.key);
                    const stampDutyVal = getFieldValue(bank.key, 'stamp_duty', bank.stampDuty);
                    const procFeeVal = getFieldValue(bank.key, 'processing_fee', bank.processingFee);
                    const valVal = getFieldValue(bank.key, 'valuation', bank.valuation);
                    const pddVal = getFieldValue(bank.key, 'pdd', bank.pdd);
                    const foreVal = getFieldValue(bank.key, 'foreclosure', bank.foreclosure);

                    // Dynamic RTO values (Financed & Not Financed) tied to the active case type!
                    const activeRtoFinancedFallback =
                      selectedCaseType === 'purchase'
                        ? bank.rtoPurchaseFinanced
                        : bank.rtoRefinanceFinanced;

                    const activeRtoNotFinancedFallback =
                      selectedCaseType === 'purchase'
                        ? bank.rtoPurchaseNotFinanced
                        : bank.rtoRefinanceNotFinanced;

                    const activeRtoFinancedVal = getFieldValue(bank.key, activeCase.financedField, activeRtoFinancedFallback);
                    const activeRtoNotFinancedVal = getFieldValue(bank.key, activeCase.notFinancedField, activeRtoNotFinancedFallback);

                    // Other Mandatory charges (< 5L and >= 5L)
                    const otherBelow5lVal = getFieldValue(bank.key, 'other_mandatory_below_5l', bank.otherMandatoryBelow5l);
                    const otherAbove5lVal = getFieldValue(bank.key, 'other_mandatory_above_5l', bank.otherMandatoryAbove5l);

                    const isRowModified = drafts[bank.key] && Object.keys(drafts[bank.key]).length > 0;

                    return (
                      <tr
                        key={bank.key}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/30'
                            : isRowModified
                            ? 'bg-amber-50/30 dark:bg-amber-950/20'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Checkbox for selection */}
                        <td className="py-2.5 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectBank(bank.key)}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Lender Details with Logo + Name */}
                        <td className="py-2.5 px-2 overflow-hidden">
                          <div className="flex items-center gap-2 min-w-0">
                            <BankAvatar
                              name={bank.name}
                              logoUrl={bank.logoUrl}
                              logoLetter={bank.logoLetter}
                              bgColor={bank.bgColor}
                              textColor={bank.textColor}
                            />
                            <span className="font-semibold text-slate-800 dark:text-slate-200 leading-tight truncate" title={bank.name}>
                              {bank.name}
                            </span>
                          </div>
                        </td>

                        {/* Stamp Duty (%) */}
                        <td className="py-2.5 px-1 text-center">
                          <div className="relative flex items-center justify-center w-full max-w-[80px] mx-auto">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={stampDutyVal}
                              onChange={e => handleFieldChange(bank.key, 'stamp_duty', e.target.value)}
                              className="h-7 w-full text-xs font-mono font-bold text-right pr-4 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 shadow-none focus:ring-1 focus:ring-blue-500 rounded-md"
                            />
                            <span className="absolute right-1 text-slate-400 font-mono text-[10px] pointer-events-none">%</span>
                          </div>
                        </td>

                        {/* Processing Fees (%) */}
                        <td className="py-2.5 px-1 text-center">
                          <div className="relative flex items-center justify-center w-full max-w-[80px] mx-auto">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={procFeeVal}
                              onChange={e => handleFieldChange(bank.key, 'processing_fee', e.target.value)}
                              className="h-7 w-full text-xs font-mono font-bold text-right pr-4 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 shadow-none focus:ring-1 focus:ring-blue-500 rounded-md"
                            />
                            <span className="absolute right-1 text-slate-400 font-mono text-[10px] pointer-events-none">%</span>
                          </div>
                        </td>

                        {/* Valuation Charges (₹) */}
                        <td className="py-2.5 px-1 text-center">
                          <div className="relative flex items-center justify-center w-full max-w-[85px] mx-auto">
                            <span className="absolute left-1.5 text-slate-400 font-mono text-[10px] pointer-events-none">₹</span>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={valVal}
                              onChange={e => handleFieldChange(bank.key, 'valuation', e.target.value)}
                              className="h-7 w-full text-xs font-mono font-bold text-right pl-3.5 pr-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 shadow-none focus:ring-1 focus:ring-blue-500 rounded-md"
                            />
                          </div>
                        </td>

                        {/* PDN Charges (₹) */}
                        <td className="py-2.5 px-1 text-center">
                          <div className="relative flex items-center justify-center w-full max-w-[85px] mx-auto">
                            <span className="absolute left-1.5 text-slate-400 font-mono text-[10px] pointer-events-none">₹</span>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={pddVal}
                              onChange={e => handleFieldChange(bank.key, 'pdd', e.target.value)}
                              className="h-7 w-full text-xs font-mono font-bold text-right pl-3.5 pr-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 shadow-none focus:ring-1 focus:ring-blue-500 rounded-md"
                            />
                          </div>
                        </td>

                        {/* Foreclosure Charges (% + GST) */}
                        <td className="py-2.5 px-1 text-center">
                          <div className="relative flex items-center justify-center w-full max-w-[85px] mx-auto">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={foreVal}
                              onChange={e => handleFieldChange(bank.key, 'foreclosure', e.target.value)}
                              className="h-7 w-full text-xs font-mono font-bold text-right pr-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 shadow-none focus:ring-1 focus:ring-blue-500 rounded-md"
                            />
                            <span className="absolute right-1 text-slate-400 font-mono text-[9px] pointer-events-none whitespace-nowrap">%+GST</span>
                          </div>
                        </td>

                        {/* Dynamic Case Type RTO Charges (₹) - Financed & Not Financed */}
                        <td className="py-1.5 px-1 text-center">
                          <div className="flex flex-col items-center gap-0.5 w-full max-w-[95px] mx-auto">
                            {/* Financed Vehicle */}
                            <div className="flex items-center gap-0.5 w-full">
                              <span className="text-[9px] font-semibold text-slate-500 w-6.5 text-right shrink-0" title="Financed Vehicle">
                                Fin:
                              </span>
                              <div className="relative flex-1 flex items-center">
                                <span className="absolute left-1 text-slate-400 font-mono text-[8px] pointer-events-none">₹</span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  value={activeRtoFinancedVal}
                                  onChange={e => handleFieldChange(bank.key, activeCase.financedField, e.target.value)}
                                  placeholder={String(activeCase.defaultFinanced)}
                                  className="h-5 w-full text-[10px] font-mono font-bold text-right pl-3 pr-0.5 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 shadow-none focus:ring-1 focus:ring-blue-500 rounded"
                                />
                              </div>
                            </div>

                            {/* Not Financed Vehicle */}
                            <div className="flex items-center gap-0.5 w-full">
                              <span className="text-[9px] font-semibold text-slate-500 w-6.5 text-right shrink-0" title="Not Financed Vehicle">
                                Not Fin:
                              </span>
                              <div className="relative flex-1 flex items-center">
                                <span className="absolute left-1 text-slate-400 font-mono text-[8px] pointer-events-none">₹</span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  value={activeRtoNotFinancedVal}
                                  onChange={e => handleFieldChange(bank.key, activeCase.notFinancedField, e.target.value)}
                                  placeholder={String(activeCase.defaultNotFinanced)}
                                  className="h-5 w-full text-[10px] font-mono font-bold text-right pl-3 pr-0.5 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 shadow-none focus:ring-1 focus:ring-blue-500 rounded"
                                />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Other Mandatory Charges (₹) (< 5L and >= 5L) */}
                        <td className="py-1.5 px-1 text-center">
                          <div className="flex flex-col items-center gap-0.5 w-full max-w-[90px] mx-auto">
                            {/* Slab < 5L */}
                            <div className="flex items-center gap-0.5 w-full">
                              <span className="text-[9px] font-semibold text-slate-500 w-5.5 text-right shrink-0">&lt;5L:</span>
                              <div className="relative flex-1 flex items-center">
                                <span className="absolute left-1 text-slate-400 font-mono text-[8px] pointer-events-none">₹</span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  value={otherBelow5lVal}
                                  onChange={e => handleFieldChange(bank.key, 'other_mandatory_below_5l', e.target.value)}
                                  className="h-5 w-full text-[10px] font-mono font-bold text-right pl-2.5 pr-0.5 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 shadow-none focus:ring-1 focus:ring-blue-500 rounded"
                                />
                              </div>
                            </div>

                            {/* Slab >= 5L */}
                            <div className="flex items-center gap-0.5 w-full">
                              <span className="text-[9px] font-semibold text-slate-500 w-5.5 text-right shrink-0">≥5L:</span>
                              <div className="relative flex-1 flex items-center">
                                <span className="absolute left-1 text-slate-400 font-mono text-[8px] pointer-events-none">₹</span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  value={otherAbove5lVal}
                                  onChange={e => handleFieldChange(bank.key, 'other_mandatory_above_5l', e.target.value)}
                                  className="h-5 w-full text-[10px] font-mono font-bold text-right pl-2.5 pr-0.5 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 shadow-none focus:ring-1 focus:ring-blue-500 rounded"
                                />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-1 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSaveSingleBank(bank.key)}
                              disabled={saving}
                              className={`h-7 w-7 transition-all ${
                                isRowModified
                                  ? 'text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 ring-1 ring-emerald-500/40 font-bold'
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              }`}
                              title={
                                isRowModified
                                  ? `Save modified charges for ${bank.name}`
                                  : `Save / Confirm ${bank.name}`
                              }
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveBank(bank.key)}
                              disabled={saving}
                              className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              title={`Remove ${bank.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

