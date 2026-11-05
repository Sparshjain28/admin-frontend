import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Plus, X, Upload, Trash2, ChevronDown, PackageSearch, CheckCircle, AlertCircle, Shield, Lock, Download, Eye, EyeOff, Gift, Building2, Pencil, LayoutList, LayoutGrid } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { BranchFormTable } from '@/components/BranchFormTable';

const API = import.meta.env.VITE_API_URL;
const API_BASE = API.replace('/api', '');
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('auth_token')}` });

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-accent transition-colors';
const labelClass = 'block text-xs font-medium text-muted-foreground mb-1';

interface Bank {
  id: number;
  name: string;
  logo_url?: string | null;
  category?: string[] | string | null;
  subcategory?: string[] | null;
}

interface LoanBanker {
  id: string;
  name: string;
  contact?: string;
  region?: string;
  territory?: string;
  geoLimit?: string;
}

interface AddProductForm {
  category: 'Loan' | '';
  subcategory: string;
  bankId: string;
  branchId: string;
  cardVariantImage: File | null;
  cardVariantPreview: string;
  productName: string;
  processType: 'digital' | 'offline' | '';
  uclDocuments: { [key: string]: File | boolean };
  bankRedirectUrl: string;
  payoutSource: string;
  // Credit Card specific
  pinCodes: string;           // comma-separated pin codes
  pinInputMode: 'excel' | 'paste';
  companyCategories: string[];
  companyCategoryInput: string;
  features: string[];
  featureInput: string;
  tags: string[];
  tagInput: string;
  // Fee type
  feeType: 'paid' | 'lifetime_free' | '';
  joiningFee: string;
  annualFee: string;
  feeWaiverCondition: string;
  // T&C and policy
  rewardTerms: string;
  recommendationPolicy: string;
  loginProcess: string;
  // Loan Login Process UI
  centralBanker: LoanBanker | null;
  centralBankerNameInput: string;
  centralBankerContactInput: string;
  regionBankers: LoanBanker[];
  regionNameInput: string;
  regionBankerNameInput: string;
  regionBankerContactInput: string;
  territoryBankers: LoanBanker[];
  territoryNameInput: string;
  territoryGeoLimitInput: string;
  territoryBankerNameInput: string;
  territoryBankerContactInput: string;
}

const emptyForm = (): AddProductForm => ({
  category: 'Loan', subcategory: '',
  bankId: '',
  branchId: '',
  cardVariantImage: null,
  cardVariantPreview: '',
  productName: '',
  processType: '',
  uclDocuments: {},
  bankRedirectUrl: '',
  payoutSource: '',
  pinCodes: '',
  pinInputMode: 'paste',
  companyCategories: [],
  companyCategoryInput: '',
  features: [],
  featureInput: '',
  tags: [],
  tagInput: '',
  feeType: '',
  joiningFee: '',
  annualFee: '',
  feeWaiverCondition: '',
  rewardTerms: '',
  recommendationPolicy: '',
  loginProcess: '',
  centralBanker: null,
  centralBankerNameInput: '',
  centralBankerContactInput: '',
  regionBankers: [],
  regionNameInput: '',
  regionBankerNameInput: '',
  regionBankerContactInput: '',
  territoryBankers: [],
  territoryNameInput: '',
  territoryGeoLimitInput: '',
  territoryBankerNameInput: '',
  territoryBankerContactInput: '',
});

const fld = 'w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white text-foreground focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-400';
const sel = `${fld} appearance-none`;

const parseJson = (val: any, defaultVal: any = []) => {
  if (!val) return defaultVal;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return defaultVal;
  }
};

const formatFeeWaiverSentence = (amount: string) => {
  if (!amount || !amount.trim()) return '';
  const cleanAmount = amount.replace(/[^0-9.]/g, '');
  if (!cleanAmount) return amount.trim();
  const num = Number(cleanAmount);
  const formattedNum = isNaN(num) ? cleanAmount : num.toLocaleString('en-IN');
  return `ANNUAL FEE WILL BE WAIVED OFF ON SPEND OF ₹${formattedNum} IN A YEAR.`;
};

const extractFeeWaiverAmount = (sentence: string) => {
  if (!sentence) return '';
  const match = sentence.match(/SPEND OF ₹\s*([0-9,.]+)/i);
  if (match && match[1]) {
    return match[1].replace(/,/g, '');
  }
  return sentence;
};

const formatFeeDisplay = (amount: number | string | undefined | null, feeType?: string) => {
  const normalizedFeeType = (feeType || '').toLowerCase().trim();
  const isLifetimeFree = normalizedFeeType === 'lifetime_free' || normalizedFeeType === 'life_time_free' || normalizedFeeType === 'lifetime free' || normalizedFeeType === 'life time free';

  if (isLifetimeFree) {
    return 'NIL + GST';
  }

  if (amount === undefined || amount === null || amount === '' || Number(amount) === 0) {
    return '₹0 + GST';
  }

  const numericStr = String(amount).replace(/[^0-9.]/g, '');
  if (numericStr) {
    return `₹${numericStr} + GST`;
  }

  return 'NIL + GST';
};

// Numbered row layout — defined outside the component to prevent remount on every render
function Row({ n: _n, label, children, alignTop = false }: { n: number; label: string; children: React.ReactNode; alignTop?: boolean }) {
  return (
    <div className={`flex flex-col sm:flex-row gap-1.5 sm:gap-3 ${alignTop ? 'items-start sm:items-start' : 'items-start sm:items-center'}`}>
      <div className="w-full sm:w-36 flex-shrink-0 pt-0 sm:pt-1">
        <span className="text-xs sm:text-sm font-semibold text-foreground leading-snug whitespace-pre-line">{label}</span>
      </div>
      <div className="w-full sm:flex-1 min-w-0">{children}</div>
    </div>
  );
}

interface CustomDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
  searchable?: boolean;
}

function CustomDropdown({ value, onChange, options, placeholder, disabled = false, searchable = true }: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (open && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!open) {
      setSearchQuery('');
    }
  }, [open, searchable]);

  const selectedOption = options.find(o => o.value === value);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(prev => !prev)}
        className={`w-full px-3 py-2 text-sm rounded-md border text-foreground transition-colors flex items-center justify-between text-left shadow-xs ${disabled
          ? 'bg-gray-100/90 border-gray-200 cursor-not-allowed opacity-90'
          : 'bg-white border-gray-300 focus:outline-none focus:border-blue-500 cursor-pointer'
          }`}
      >
        <span className="flex items-center gap-2 font-semibold">
          <span className={selectedOption ? 'text-foreground' : 'text-gray-400'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {disabled && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300/80 shadow-2xs">
              <Lock size={10} className="text-amber-700" />
              Locked
            </span>
          )}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180 text-blue-500' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-60 animate-in fade-in duration-150">
          {searchable && (
            <div className="p-2 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full h-8 pl-8 pr-2.5 bg-white border border-gray-200 rounded-lg text-xs text-foreground placeholder:text-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto max-h-48 divide-y divide-gray-100 py-1 scrollbar-thin">
            <div
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="px-3.5 py-2 text-xs text-gray-400 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              {placeholder}
            </div>
            {filteredOptions.length === 0 ? (
              <div className="px-3.5 py-3 text-xs text-gray-400 text-center italic">
                No matching results
              </div>
            ) : (
              filteredOptions.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${value === opt.value
                    ? 'bg-blue-50 text-blue-600 font-bold'
                    : 'text-foreground hover:bg-blue-50/60'
                    }`}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatBullets(value: string): string {
  if (!value) return '';

  const lines = value.split('\n');
  const formatted = lines.map((line, idx) => {
    const cleanText = line.replace(/^[•\s\-\*]+/, '');

    if (cleanText.length > 0) {
      return `• ${cleanText}`;
    }
    if (idx < lines.length - 1 || line.startsWith('•')) {
      return '• ';
    }
    return '';
  });

  return formatted.join('\n');
}

function handleBulletKeyDown(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  currentVal: string,
  setVal: (v: string) => void
) {
  if (e.key === 'Backspace') {
    const target = e.currentTarget;
    const { selectionStart, selectionEnd } = target;
    if (selectionStart === selectionEnd) {
      const textBeforeCursor = currentVal.substring(0, selectionStart);
      if (textBeforeCursor.endsWith('\n• ') || textBeforeCursor === '• ') {
        e.preventDefault();
        const textAfterCursor = currentVal.substring(selectionEnd);
        const charsToRemove = textBeforeCursor.endsWith('\n• ') ? 3 : 2;
        const newText = textBeforeCursor.slice(0, -charsToRemove) + textAfterCursor;
        const newCursorPos = selectionStart - charsToRemove;
        setVal(newText);
        setTimeout(() => {
          target.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      }
    }
  }
}

function AddProductModal({ onClose, onSuccess, initialBankId, productToEdit, banks: externalBanks }: { onClose: () => void; onSuccess?: () => void; initialBankId?: string; productToEdit?: any; banks?: Bank[] }) {
  const [form, setForm] = useState<AddProductForm>(() => {
    if (productToEdit) {
      const parseJson = (val: any, def: any = []) => {
        if (!val) return def;
        if (typeof val === 'object') return val;
        try { return JSON.parse(val); } catch { return def; }
      };

      const bankers = parseJson(productToEdit.bankers_data, {});
      const companyCats = parseJson(productToEdit.company_categories, []);
      const features = parseJson(productToEdit.features, []);
      const tags = parseJson(productToEdit.tags, []);

      const variantImg = productToEdit.card_variant_image
        ? (productToEdit.card_variant_image.startsWith('http') ? productToEdit.card_variant_image : `${API_BASE}${productToEdit.card_variant_image.startsWith('/') ? '' : '/'}${productToEdit.card_variant_image}`)
        : '';

      return {
        ...emptyForm(),
        category: productToEdit.category || '',
        subcategory: productToEdit.subcategory || '',
        bankId: productToEdit.bank_id ? String(productToEdit.bank_id) : (initialBankId ?? ''),
        branchId: productToEdit.branch_id ? String(productToEdit.branch_id) : '',
        cardVariantPreview: variantImg,
        productName: productToEdit.product_name || '',
        bankRedirectUrl: productToEdit.bank_redirect_url || '',
        payoutSource: productToEdit.payout_source || '',
        pinCodes: productToEdit.pin_codes || '',
        companyCategories: companyCats,
        features: features,
        tags: tags,
        feeType: productToEdit.fee_type || '',
        joiningFee: productToEdit.joining_fee ? String(productToEdit.joining_fee) : '',
        annualFee: productToEdit.annual_fee ? String(productToEdit.annual_fee) : '',
        feeWaiverCondition: extractFeeWaiverAmount(productToEdit.fee_waiver_condition || ''),
        rewardTerms: productToEdit.reward_terms || '',
        recommendationPolicy: productToEdit.current_bre_policy || '',
        loginProcess: productToEdit.login_process || '',
        centralBanker: bankers.centralBanker || null,
        regionBankers: bankers.regionBankers || [],
        territoryBankers: bankers.territoryBankers || [],
      };
    }
    return {
      ...emptyForm(),
      bankId: initialBankId ?? '',
    };
  });

  const [banks, setBanks] = useState<Bank[]>(() => (externalBanks && externalBanks.length > 0 ? externalBanks : []));
  const [banksLoading, setBanksLoading] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [showViewBranchModal, setShowViewBranchModal] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pinExcelRef = useRef<HTMLInputElement>(null);
  const companyExcelRef = useRef<HTMLInputElement>(null);
  const breJsonRef = useRef<HTMLInputElement>(null);

  const handleSaveProduct = async () => {
    if (!form.category) {
      toast.error('Please select Category.');
      return;
    }
    if (form.category === 'Loan' && !form.subcategory) {
      toast.error('Please select Subcategory.');
      return;
    }
    if (!form.bankId) {
      toast.error('Please select Bank.');
      return;
    }
    if (!form.productName.trim()) {
      toast.error('Please enter Product Name.');
      return;
    }

    setSavingProduct(true);
    try {
      const formData = new FormData();
      formData.append('category', form.category);
      formData.append('subcategory', form.category === 'Credit Card' ? '' : (form.subcategory || ''));
      formData.append('bank_id', form.bankId);
      if (form.branchId) formData.append('branch_id', form.branchId);
      formData.append('product_name', form.productName);
      if (form.bankRedirectUrl) formData.append('bank_redirect_url', form.bankRedirectUrl);
      if (form.payoutSource) formData.append('payout_source', form.payoutSource);
      if (form.pinCodes) formData.append('pin_codes', form.pinCodes);
      if (form.companyCategories && form.companyCategories.length > 0) {
        formData.append('company_categories', JSON.stringify(form.companyCategories));
      }
      if (form.features && form.features.length > 0) {
        formData.append('features', JSON.stringify(form.features));
      }
      if (form.tags && form.tags.length > 0) {
        formData.append('tags', JSON.stringify(form.tags));
      }
      if (form.feeType) formData.append('fee_type', form.feeType);
      if (form.joiningFee) formData.append('joining_fee', form.joiningFee);
      if (form.annualFee) formData.append('annual_fee', form.annualFee);
      if (form.feeWaiverCondition) {
        formData.append('fee_waiver_condition', formatFeeWaiverSentence(form.feeWaiverCondition));
      }
      if (form.rewardTerms) formData.append('reward_terms', form.rewardTerms);
      if (form.recommendationPolicy) formData.append('current_bre_policy', form.recommendationPolicy);
      if (form.loginProcess) formData.append('login_process', form.loginProcess);

      const bankersData = {
        centralBanker: form.centralBanker,
        regionBankers: form.regionBankers,
        territoryBankers: form.territoryBankers
      };
      formData.append('bankers_data', JSON.stringify(bankersData));

      if (form.cardVariantImage) {
        formData.append('cardVariantImage', form.cardVariantImage);
      }

      const isEditing = Boolean(productToEdit?.id);
      const url = isEditing ? `${API}/products/${productToEdit.id}` : `${API}/products`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: authHeader().Authorization
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(isEditing ? 'Product updated successfully!' : 'Product saved successfully!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        throw new Error(data.error || (isEditing ? 'Failed to update product' : 'Failed to save product'));
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || 'Error saving product');
    } finally {
      setSavingProduct(false);
    }
  };

  const fetchBranches = useCallback(() => {
    if (!form.bankId) {
      setBranches([]);
      return;
    }
    setBranchesLoading(true);
    fetch(`${API}/banks/${form.bankId}/branches`, { headers: authHeader() })
      .then(r => r.json())
      .then(data => setBranches(Array.isArray(data) ? data : []))
      .catch(() => setBranches([]))
      .finally(() => setBranchesLoading(false));
  }, [form.bankId]);

  useEffect(() => {
    if (showViewBranchModal) {
      fetchBranches();
    }
  }, [showViewBranchModal, fetchBranches]);

  const downloadCompanyCategoryTemplate = () => {
    const data = [
      { 'CAT SA': 'TCS', 'CAT A': 'Infosys', 'CAT B': 'Wipro', 'CAT C': 'HCL', 'CAT D': 'Tech Mahindra', 'CAT G': 'Government' }
    ];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'CompanyCategories');
    XLSX.writeFile(workbook, 'Company_Category_Template.xlsx');
  };

  const handleCompanyExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);
        const categories: string[] = [];
        data.forEach(row => {
          Object.entries(row).forEach(([key, val]) => {
            if (val !== undefined && val !== null) {
              const strVal = String(val).trim();
              if (strVal) {
                const headerKey = key.trim();
                if (headerKey.toUpperCase().startsWith('CAT') || headerKey.toLowerCase().includes('category') || headerKey.toLowerCase().includes('company')) {
                  categories.push(`${headerKey}: ${strVal}`);
                } else {
                  categories.push(strVal);
                }
              }
            }
          });
        });
        if (categories.length > 0) {
          setForm(prev => ({
            ...prev,
            companyCategories: Array.from(new Set([...prev.companyCategories, ...categories])),
          }));
          toast.success(`Loaded ${categories.length} company categories from Excel.`);
        } else {
          toast.error('No company categories found in the uploaded file.');
        }
      } catch {
        toast.error('Failed to parse Excel file.');
      }
    };
    reader.readAsBinaryString(file);
    if (companyExcelRef.current) companyExcelRef.current.value = '';
  };

  const handleBreJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);
        const formatted = JSON.stringify(parsed, null, 2);
        setForm(prev => ({ ...prev, recommendationPolicy: formatted }));
      } catch {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
    if (breJsonRef.current) breJsonRef.current.value = '';
  };

  useEffect(() => {
    if (externalBanks && externalBanks.length > 0) {
      setBanks(externalBanks);
      return;
    }
    setBanksLoading(true);
    fetch(`${API}/banks`, { headers: authHeader() })
      .then(r => r.json())
      .then(data => setBanks(Array.isArray(data) ? data : []))
      .catch(() => setBanks([]))
      .finally(() => setBanksLoading(false));
  }, [externalBanks]);

  const isLenderLocked = Boolean(initialBankId && String(initialBankId).trim() !== '');

  useEffect(() => {
    if (initialBankId && banks.length > 0) {
      const matchedBank = banks.find(b => String(b.id) === String(initialBankId));
      if (matchedBank) {
        setForm(prev => ({
          ...prev,
          bankId: String(matchedBank.id),
        }));
      }
    }
  }, [initialBankId, banks]);

  // Helper: normalise category field to lowercase string array
  const getBankCats = (bank: Bank): string[] => {
    if (Array.isArray(bank.category)) return bank.category.map(c => c.toLowerCase());
    if (bank.category) return [bank.category.toLowerCase()];
    return [];
  };

  const selectedBank = banks.find(b => String(b.id) === form.bankId) ?? null;

  // Dynamically compute available categories strictly from selected lender data
  const availableCategories = useMemo(() => {
    if (!selectedBank) return [];
    const cats = getBankCats(selectedBank);
    const result: ('Loan')[] = [];
    if (cats.some(c => c === 'loan') || cats.length === 0) result.push('Loan');
    return result;
  }, [selectedBank]);

  const ALL_LOAN_SUBCATEGORIES = useMemo(() => [
    { value: 'Personal Loan', label: 'Personal Loan' },
    { value: 'Business Loan', label: 'Business Loan' },
    { value: 'New Car Loan', label: 'New Car Loan' },
  ], []);

  // Dynamically compute available subcategories strictly from selected lender data
  const availableSubcategories = useMemo(() => {
    if (!selectedBank || form.category !== 'Loan') return [];

    let bankSubs: string[] = [];
    if (Array.isArray(selectedBank.subcategory)) {
      bankSubs = selectedBank.subcategory.map(s => String(s).trim().toLowerCase()).filter(Boolean);
    } else if (selectedBank.subcategory && typeof selectedBank.subcategory === 'string') {
      bankSubs = [String(selectedBank.subcategory).trim().toLowerCase()].filter(Boolean);
    }

    if (bankSubs.length === 0) {
      return [];
    }

    const result: { value: string; label: string }[] = [];

    for (const bs of bankSubs) {
      const match = ALL_LOAN_SUBCATEGORIES.find(sub => {
        const valLower = sub.value.toLowerCase();
        if (bs === valLower) return true;
        if (valLower === 'used car loan' && (bs === 'ucl' || bs.includes('used car'))) return true;
        if (valLower === 'loan against property' && (bs === 'lap' || bs.includes('property'))) return true;
        return bs.includes(valLower) || valLower.includes(bs);
      });

      if (match) {
        if (!result.some(r => r.value === match.value)) {
          result.push(match);
        }
      } else {
        const capitalized = bs.charAt(0).toUpperCase() + bs.slice(1);
        if (!result.some(r => r.value === capitalized)) {
          result.push({ value: capitalized, label: capitalized });
        }
      }
    }

    return result;
  }, [selectedBank, form.category, ALL_LOAN_SUBCATEGORIES]);

  const handleBankChange = (val: string) => {
    setForm(prev => {
      if (prev.bankId === val) return prev;
      return {
        ...prev,
        bankId: val,
        category: 'Loan', subcategory: '',
      };
    });
  };

  const handleCategoryChange = (val: 'Loan' | 'Credit Card' | '') => {
    setForm(prev => ({
      ...prev,
      category: val,
      subcategory: '',
    }));
  };

  const handleSubcategoryChange = (val: string) => {
    setForm(prev => ({
      ...prev,
      subcategory: val,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm(prev => ({ ...prev, cardVariantImage: file, cardVariantPreview: URL.createObjectURL(file) }));
  };

  const clearImage = () => {
    if (form.cardVariantPreview) URL.revokeObjectURL(form.cardVariantPreview);
    setForm(prev => ({ ...prev, cardVariantImage: null, cardVariantPreview: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // PIN codes — automatic 6-digit comma separation when pasting or typing
  const handlePinCodesChange = (raw: string) => {
    const isTrailingDelimiter = /[\s,]$/.test(raw);
    const cleaned = raw.replace(/,/g, ' ');
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const result: string[] = [];

    for (let part of parts) {
      while (part.length >= 6) {
        result.push(part.slice(0, 6));
        part = part.slice(6);
      }
      if (part.length > 0) {
        result.push(part);
      }
    }

    let formatted = result.join(', ');
    if (isTrailingDelimiter && formatted && !formatted.endsWith(', ')) {
      formatted += ', ';
    }

    setForm(prev => ({ ...prev, pinCodes: formatted }));
  };

  // Company categories
  const addCompanyCategory = () => {
    const val = form.companyCategoryInput.trim();
    if (!val) return;
    setForm(prev => ({
      ...prev,
      companyCategories: [...prev.companyCategories, val],
      companyCategoryInput: '',
    }));
  };

  const removeCompanyCategory = (idx: number) =>
    setForm(prev => ({ ...prev, companyCategories: prev.companyCategories.filter((_, i) => i !== idx) }));

  // Features
  const addFeature = () => {
    const val = form.featureInput.trim();
    if (!val) return;
    setForm(prev => ({ ...prev, features: [...prev.features, val], featureInput: '' }));
  };

  const removeFeature = (idx: number) =>
    setForm(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }));

  const isCreditCard = form.category === 'Credit Card';
  const isLoan = form.category === 'Loan';
  const isNewCarLoan = isLoan && form.subcategory === 'New Car Loan';

  const hasCategoryOptions = availableCategories.length > 0;
  const isCategoryComplete = hasCategoryOptions && form.category !== '';

  const hasSubcategoryOptions = availableSubcategories.length > 0;
  const isSubcategoryComplete = isCreditCard || (isLoan && hasSubcategoryOptions && form.subcategory !== '');

  // Step 0: Lender selection complete (requires valid Category & Subcategory selection)
  const step0_LenderSelected = form.bankId !== '' && isCategoryComplete && isSubcategoryComplete;

  // Show all remaining applicable product fields together at once after step0_LenderSelected is true
  const showCardVariantImage = step0_LenderSelected && isCreditCard;
  const showProductName = step0_LenderSelected;

  const showProcessType = false;

  const showBankRedirectUrl = step0_LenderSelected && (isCreditCard || (isLoan && !isNewCarLoan && form.processType === 'digital'));
  const showUclDocumentFlow = step0_LenderSelected && isLoan && !isNewCarLoan && form.processType === 'offline';

  // UCL Required Document list
  const uclDocList = [
    { key: 'aadhar_front', label: 'Aadhar Front', required: true },
    { key: 'aadhar_back', label: 'Aadhar Back', required: true },
    { key: 'pan_card', label: 'PAN Card', required: true },
    { key: 'rc_front', label: 'RC (Registration Certificate) Front', required: true },
    { key: 'rc_back', label: 'RC Back', required: true },
    { key: 'bank_statement', label: 'Bank Statement (6 Months)', required: false },
    { key: 'loan_statement', label: 'Loan Account Statement (1 Year)', required: false },
    { key: 'valuation_report', label: 'Vehicle Valuation Report', required: false },
    { key: 'insurance_copy', label: 'Insurance Policy Copy', required: false },
    { key: 'noc_form', label: 'Form 29 / Form 30 / NOC', required: false },
  ];

  const requiredUclDocs = uclDocList.filter(doc => doc.required);
  const isUclDocsCompleted = requiredUclDocs.every(doc => Boolean(form.uclDocuments[doc.key]));

  const showPayoutAndPincodes = step0_LenderSelected;
  const showLoanLoginProcess = step0_LenderSelected && isLoan && !isNewCarLoan;

  const showProductFeatures = step0_LenderSelected && isCreditCard;
  const showFeeType = step0_LenderSelected && isCreditCard;

  const showFinalPolicyFields = step0_LenderSelected;



  const handleAddCentralBanker = () => {
    if (!form.centralBankerNameInput.trim()) return;
    setForm(prev => ({
      ...prev,
      centralBanker: {
        id: String(Date.now()),
        name: prev.centralBankerNameInput.trim(),
        contact: prev.centralBankerContactInput.trim(),
      },
      centralBankerNameInput: '',
      centralBankerContactInput: '',
    }));
  };

  const handleAddRegionBanker = () => {
    if (!form.regionBankerNameInput.trim() || !form.regionNameInput.trim()) return;
    setForm(prev => ({
      ...prev,
      regionBankers: [
        ...prev.regionBankers,
        {
          id: String(Date.now()),
          name: prev.regionBankerNameInput.trim(),
          contact: prev.regionBankerContactInput.trim(),
          region: prev.regionNameInput.trim(),
        },
      ],
      regionBankerNameInput: '',
      regionBankerContactInput: '',
      regionNameInput: '',
    }));
  };

  const handleAddTerritoryBanker = () => {
    if (!form.territoryBankerNameInput.trim() || !form.territoryNameInput.trim()) return;
    setForm(prev => ({
      ...prev,
      territoryBankers: [
        ...prev.territoryBankers,
        {
          id: String(Date.now()),
          name: prev.territoryBankerNameInput.trim(),
          contact: prev.territoryBankerContactInput.trim(),
          territory: prev.territoryNameInput.trim(),
          geoLimit: prev.territoryGeoLimitInput.trim(),
        },
      ],
      territoryBankerNameInput: '',
      territoryBankerContactInput: '',
      territoryNameInput: '',
      territoryGeoLimitInput: '',
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 pb-20 sm:pb-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-50 border border-gray-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh] sm:max-h-[92vh] min-h-0 sm:min-h-[460px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-200 bg-white shrink-0">
          <h2 className="text-base font-bold text-foreground">{productToEdit ? 'Edit Product' : 'Add Product'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1"><X size={18} /></button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
          {/* Step 1: Select Lender / Bank — First Field */}
          <Row n={1} label="Select Bank">
            <div className="flex items-center gap-2 sm:gap-3 w-full">
              <div className="flex-1 min-w-0">
                {banksLoading ? (
                  <p className="text-xs text-gray-400">Loading…</p>
                ) : banks.length === 0 ? (
                  <p className="text-xs text-gray-400">No lenders found.</p>
                ) : (
                  <CustomDropdown
                    value={form.bankId}
                    onChange={handleBankChange}
                    options={banks.map(b => ({ value: String(b.id), label: b.name }))}
                    placeholder="Select Bank"
                    disabled={isLenderLocked}
                  />
                )}
              </div>
              <span className="hidden sm:inline text-xs text-blue-500 font-medium whitespace-nowrap flex-shrink-0">(Logo &amp; Icon Auto)</span>
              {selectedBank?.logo_url ? (
                <img src={`${API_BASE}${selectedBank.logo_url.startsWith('/') ? '' : '/'}${selectedBank.logo_url}`} alt={selectedBank.name} className="w-9 h-9 rounded-lg object-contain border border-gray-200 bg-white p-0.5 flex-shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="w-9 h-9 rounded-lg border-2 border-red-400 flex items-center justify-center bg-white flex-shrink-0"><div className="w-5 h-5 border-2 border-red-400 rounded-sm" /></div>
              )}
            </div>
            <p className="sm:hidden text-[11px] text-blue-500 font-medium mt-1">Logo &amp; icon auto-attached</p>
          </Row>

          {/* Step 2: Select Category */}
          {form.bankId !== '' && (
            <Row n={2} label="Select Category">
              {availableCategories.length > 0 ? (
                <CustomDropdown
                  value={form.category}
                  onChange={val => handleCategoryChange(val as 'Loan' | 'Credit Card' | '')}
                  options={availableCategories.map(cat => ({ value: cat, label: cat }))}
                  placeholder="Select Category"
                  searchable={false}
                />
              ) : (
                <div className="px-3.5 py-2 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0 text-red-500" />
                  <span>No Category Available</span>
                </div>
              )}
            </Row>
          )}

          {/* Step 3: Subcategory — Loan only */}
          {form.bankId !== '' && availableCategories.length > 0 && form.category === 'Loan' && (
            <Row n={3} label="Subcategory">
              {availableSubcategories.length > 0 ? (
                <CustomDropdown
                  value={form.subcategory}
                  onChange={handleSubcategoryChange}
                  options={availableSubcategories}
                  placeholder="Select Subcategory"
                  searchable={false}
                />
              ) : (
                <div className="px-3.5 py-2 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0 text-red-500" />
                  <span>No Subcategory Available</span>
                </div>
              )}
            </Row>
          )}

          {/* Step 1: Card Variant Image — Credit Card only */}
          {showCardVariantImage && (
            <Row n={3} label="Card Variant Image" alignTop>
              <div className="flex items-start gap-4">
                <label htmlFor="card-variant-upload" className="flex-shrink-0 w-28 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors bg-white">
                  <Upload size={18} className="text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500 font-medium">Upload Image</span>
                </label>
                <input ref={fileInputRef} id="card-variant-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                {form.cardVariantPreview && (
                  <div className="relative">
                    <img src={form.cardVariantPreview} alt="Card preview" className="h-20 rounded-xl object-cover border border-gray-200 shadow-sm" />
                    <button type="button" onClick={clearImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"><X size={9} /></button>
                  </div>
                )}
              </div>
            </Row>
          )}

          {/* Step 2: Product Name */}
          {showProductName && (
            <Row n={4} label="Product Name">
              <input type="text" className={fld} placeholder="Enter Product Name" value={form.productName} onChange={e => setForm(prev => ({ ...prev, productName: e.target.value }))} />
            </Row>
          )}

          {/* Step 5 (Loan): Process Type */}
          {showProcessType && (
            <Row n={5} label="Process Type">
              <div className="flex items-center gap-6">
                {(['digital', 'offline'] as const).map(type => (
                  <label key={type} className="flex items-center gap-1.5 cursor-pointer text-sm text-foreground select-none">
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${form.processType === type ? 'border-blue-500' : 'border-gray-300'}`}>
                      {form.processType === type && <span className="w-2 h-2 rounded-full bg-blue-500 block" />}
                    </span>
                    <input type="radio" className="sr-only" name="processType" value={type} checked={form.processType === type} onChange={() => setForm(prev => ({ ...prev, processType: type }))} />
                    {type === 'digital' ? 'Digital Process' : 'Offline Process'}
                  </label>
                ))}
              </div>
            </Row>
          )}

          {/* Bank Redirect URL (Digital Process) */}
          {showBankRedirectUrl && (
            <Row n={6} label="Bank Redirect URL" alignTop>
              <div className="space-y-1">
                <input type="url" className={fld} placeholder="https://bank.com/apply?lead_id={LEAD_ID}" value={form.bankRedirectUrl} onChange={e => setForm(prev => ({ ...prev, bankRedirectUrl: e.target.value }))} />
                <p className="text-xs text-blue-500">(Lead ID placement in link is preset)</p>
              </div>
            </Row>
          )}

          {/* UCL Document Flow UI (Offline Process) */}
          {showUclDocumentFlow && (
            <Row n={6} label={"Used Car Loan (UCL)\nDocument Flow"} alignTop>
              <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-4 shadow-xs">
                {/* Header status bar */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-blue-600" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      UCL Document Checklist
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${isUclDocsCompleted
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}
                  >
                    {isUclDocsCompleted ? (
                      <>
                        <CheckCircle size={12} />
                        Completed ({requiredUclDocs.filter(d => Boolean(form.uclDocuments[d.key])).length}/{requiredUclDocs.length} Required)
                      </>
                    ) : (
                      <>
                        <AlertCircle size={12} />
                        Incomplete ({requiredUclDocs.filter(d => Boolean(form.uclDocuments[d.key])).length}/{requiredUclDocs.length} Required)
                      </>
                    )}
                  </span>
                </div>

                {!isUclDocsCompleted && (
                  <p className="text-[11px] text-amber-700 font-medium bg-amber-50 border border-amber-200/80 rounded-lg p-2.5 flex items-center gap-1.5 leading-snug">
                    <AlertCircle size={14} className="shrink-0 text-amber-600" />
                    Upload all mandatory documents marked with (<span className="text-red-500 font-bold">*</span>) to complete the flow.
                  </p>
                )}

                {/* Section 1: Required Documents */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-red-600 flex items-center gap-1 uppercase tracking-wide">
                      <span>Required Documents</span>
                      <span className="text-red-500 font-bold">*</span>
                    </h4>
                    <span className="text-[10px] text-gray-500 font-semibold">
                      {requiredUclDocs.filter(d => Boolean(form.uclDocuments[d.key])).length} of {requiredUclDocs.length} uploaded
                    </span>
                  </div>
                  <div className="bg-red-50/20 border border-red-100 rounded-xl divide-y divide-red-100/60 px-3">
                    {requiredUclDocs.map((doc, idx) => {
                      const docVal = form.uclDocuments[doc.key];
                      const isUploaded = Boolean(docVal);
                      const fileName = docVal instanceof File ? docVal.name : null;

                      return (
                        <div key={doc.key} className="flex items-center justify-between py-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="font-semibold text-gray-400 shrink-0">{idx + 1}.</span>
                            <span className="font-semibold text-foreground truncate">
                              {doc.label} <span className="text-red-500 font-bold ml-0.5">*</span>
                            </span>
                            {fileName && (
                              <span className="text-[10px] text-emerald-600 font-semibold truncate max-w-[150px]">
                                ({fileName})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isUploaded && (
                              <button
                                type="button"
                                onClick={() => {
                                  setForm(prev => {
                                    const updatedDocs = { ...prev.uclDocuments };
                                    delete updatedDocs[doc.key];
                                    return { ...prev, uclDocuments: updatedDocs };
                                  });
                                }}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                                title="Remove File"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                            <label
                              className={`cursor-pointer px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${isUploaded
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50 shadow-xs'
                                }`}
                            >
                              <Upload size={11} />
                              {isUploaded ? 'Uploaded ✓' : 'Upload File'}
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*,.pdf"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setForm(prev => ({
                                      ...prev,
                                      uclDocuments: { ...prev.uclDocuments, [doc.key]: file },
                                    }));
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: Optional Documents */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-600 flex items-center gap-1 uppercase tracking-wide">
                      <span>Optional Documents</span>
                      <span className="text-[10px] text-gray-400 font-normal normal-case">(Optional)</span>
                    </h4>
                  </div>
                  <div className="bg-gray-50/40 border border-gray-200 rounded-xl divide-y divide-gray-100 px-3">
                    {uclDocList
                      .filter(doc => !doc.required)
                      .map((doc, idx) => {
                        const docVal = form.uclDocuments[doc.key];
                        const isUploaded = Boolean(docVal);
                        const fileName = docVal instanceof File ? docVal.name : null;

                        return (
                          <div key={doc.key} className="flex items-center justify-between py-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className="font-semibold text-gray-400 shrink-0">{idx + 1}.</span>
                              <span className="font-medium text-foreground truncate">{doc.label}</span>
                              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                                Optional
                              </span>
                              {fileName && (
                                <span className="text-[10px] text-emerald-600 font-semibold truncate max-w-[150px]">
                                  ({fileName})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isUploaded && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setForm(prev => {
                                      const updatedDocs = { ...prev.uclDocuments };
                                      delete updatedDocs[doc.key];
                                      return { ...prev, uclDocuments: updatedDocs };
                                    });
                                  }}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                                  title="Remove File"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                              <label
                                className={`cursor-pointer px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${isUploaded
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 shadow-xs'
                                  }`}
                              >
                                <Upload size={11} />
                                {isUploaded ? 'Uploaded ✓' : 'Upload File'}
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*,.pdf"
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setForm(prev => ({
                                        ...prev,
                                        uclDocuments: { ...prev.uclDocuments, [doc.key]: file },
                                      }));
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </Row>
          )}

          {/* Payout Source, Serviceable PIN Codes & Company Category */}
          {showPayoutAndPincodes && (
            <>
              {/* Payout Source (DSA Code) */}
              <Row n={7} label="Payout Source (DSA Code)">
                <input
                  type="text"
                  className={fld}
                  placeholder="Enter DSA Code / Payout Source"
                  value={form.payoutSource}
                  onChange={e => setForm(prev => ({ ...prev, payoutSource: e.target.value }))}
                />
              </Row>

              {/* Serviceable Pin Code List */}
              <Row n={8} label={"Serviceable Pin Code\nList (Optional)"} alignTop>
                <div className="space-y-2">
                  <label htmlFor="pincode-excel-upload" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-400 text-blue-600 text-xs font-semibold bg-white cursor-pointer hover:bg-blue-50 transition-colors w-fit">
                    <Upload size={12} /> Import in Excel
                  </label>
                  <input ref={pinExcelRef} id="pincode-excel-upload" type="file" accept=".xlsx,.xls,.csv" className="hidden" />
                  <textarea
                    className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:border-blue-500 resize-none placeholder:text-gray-400"
                    rows={3}
                    placeholder={"Paste or type pincodes here...\n(Pressing Space or typing 6 digits auto adds comma)"}
                    value={form.pinCodes}
                    onChange={e => handlePinCodesChange(e.target.value)}
                  />
                </div>
              </Row>

              {/* Company Category List */}
              {!(isLoan && (form.subcategory === 'Business Loan' || isNewCarLoan)) && (
                <Row n={9} label={"Company Category\nList (Optional)"} alignTop>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label htmlFor="company-excel-upload" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-400 text-blue-600 text-xs font-semibold bg-white cursor-pointer hover:bg-blue-50 transition-colors shadow-2xs">
                        <Upload size={12} /> Upload Excel
                      </label>
                      <input
                        ref={companyExcelRef}
                        id="company-excel-upload"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={handleCompanyExcelUpload}
                      />
                      <button
                        type="button"
                        onClick={downloadCompanyCategoryTemplate}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-xs font-semibold bg-white hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
                      >
                        <Download size={12} className="text-gray-500" /> Template
                      </button>
                    </div>
                    {form.companyCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 max-h-36 overflow-y-auto p-1 border border-gray-100 rounded-md bg-gray-50/50">
                        {form.companyCategories.slice(0, 100).map((cat, i) => (
                          <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-700 font-medium">
                            {cat}
                            <button type="button" onClick={() => removeCompanyCategory(i)} className="hover:text-red-500 ml-0.5 transition-colors cursor-pointer">
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                        {form.companyCategories.length > 100 && (
                          <span className="flex items-center px-2.5 py-1 rounded-full bg-gray-200 border border-gray-300 text-xs text-gray-700 font-semibold">
                            +{form.companyCategories.length - 100} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Row>
              )}
            </>
          )}

          {/* Loan Login Process Section */}
          {showLoanLoginProcess && (
            <Row n={10} label="Login Process">
              <CustomDropdown
                value={form.loginProcess}
                onChange={val => setForm(prev => ({ ...prev, loginProcess: val }))}
                options={[
                  { value: 'centrally', label: 'Centrally' },
                  { value: 'region', label: 'Region' },
                  { value: 'territory', label: 'Territory' },
                ]}
                placeholder="Select Login Process"
                searchable={false}
              />
            </Row>
          )}

          {/* Credit Card Features & Fee Type */}
          {showProductFeatures && (
            <>
              <Row n={9} label={"Product Features\n(Benefits of a Card)"} alignTop>
                <textarea
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:border-blue-500 resize-none placeholder:text-gray-400 font-medium"
                  rows={5}
                  placeholder={"• Lifetime free card\n• Cashback on purchases\n• Reward points\n• Airport lounge access"}
                  value={form.features.join('\n')}
                  onKeyDown={e => handleBulletKeyDown(e, form.features.join('\n'), val => setForm(prev => ({ ...prev, features: val.split('\n') })))}
                  onChange={e => {
                    const formatted = formatBullets(e.target.value);
                    setForm(prev => ({ ...prev, features: formatted.split('\n') }));
                  }}
                />
              </Row>

              <Row n={10} label={"Product Tags\n(Highlights/Badges)"} alignTop>
                <textarea
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:border-blue-500 resize-none placeholder:text-gray-400 font-medium"
                  rows={4}
                  placeholder={"• Best for Shopping\n• 5% Cashback\n• Zero Joining Fee"}
                  value={form.tags.join('\n')}
                  onKeyDown={e => handleBulletKeyDown(e, form.tags.join('\n'), val => setForm(prev => ({ ...prev, tags: val.split('\n') })))}
                  onChange={e => {
                    const formatted = formatBullets(e.target.value);
                    setForm(prev => ({ ...prev, tags: formatted.split('\n') }));
                  }}
                />
              </Row>
            </>
          )}

          {showFeeType && (
            <>
              <Row n={10} label="Fee Type">
                <div className="flex items-center gap-6">
                  {(['paid', 'lifetime_free'] as const).map(type => (
                    <label key={type} className="flex items-center gap-1.5 cursor-pointer text-sm text-foreground select-none">
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${form.feeType === type ? 'border-blue-500' : 'border-gray-300'}`}>
                        {form.feeType === type && <span className="w-2 h-2 rounded-full bg-blue-500 block" />}
                      </span>
                      <input type="radio" className="sr-only" name="feeType" value={type} checked={form.feeType === type} onChange={() => setForm(prev => ({ ...prev, feeType: type, joiningFee: '', annualFee: '', feeWaiverCondition: '' }))} />
                      {type === 'paid' ? 'Paid' : 'Life Time Free'}
                    </label>
                  ))}
                </div>
              </Row>

              {form.feeType === 'paid' && (
                <Row n={11} label="If Paid" alignTop>
                  <div className="w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-foreground h-auto sm:h-8 flex items-end pb-1">Joining Fee</label>
                        <input type="text" className={fld} placeholder="₹ Enter Amount" value={form.joiningFee} onChange={e => setForm(prev => ({ ...prev, joiningFee: e.target.value }))} />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-foreground h-auto sm:h-8 flex items-end pb-1">Annual Fee</label>
                        <input type="text" className={fld} placeholder="₹ Enter Amount" value={form.annualFee} onChange={e => setForm(prev => ({ ...prev, annualFee: e.target.value }))} />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-foreground h-auto sm:h-8 flex items-end pb-1 leading-tight">Fee Waiver Amount (₹)</label>
                        <input
                          type="text"
                          className={fld}
                          placeholder="e.g. 100000"
                          value={form.feeWaiverCondition}
                          onChange={e => setForm(prev => ({ ...prev, feeWaiverCondition: e.target.value }))}
                        />
                      </div>
                    </div>
                    {form.feeWaiverCondition && (
                      <p className="text-[11px] text-blue-600 font-medium mt-1.5 leading-tight">
                        <span className="font-bold">Preview:</span> {formatFeeWaiverSentence(form.feeWaiverCondition)}
                      </p>
                    )}
                  </div>
                </Row>
              )}
            </>
          )}

          {/* Final Fields: Reward Terms & Conditions | BRE Policy side-by-side */}
          {showFinalPolicyFields && (
            <div className="pt-3 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column: Reward Terms & Conditions */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Reward Terms &amp; Conditions</label>
                  <div className="relative">
                    <textarea
                      className="w-full px-3 py-2 pr-8 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:border-blue-500 resize-none placeholder:text-gray-400 font-medium"
                      rows={4}
                      placeholder={"• Reward terms\n• Rewards conditions"}
                      value={form.rewardTerms}
                      onKeyDown={e => handleBulletKeyDown(e, form.rewardTerms, val => setForm(prev => ({ ...prev, rewardTerms: val })))}
                      onChange={e => {
                        const formatted = formatBullets(e.target.value);
                        setForm(prev => ({ ...prev, rewardTerms: formatted }));
                      }}
                    />
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold select-none">i</span>
                  </div>
                </div>

                {/* Right Column: BRE Policy */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-foreground">BRE Policy</label>
                    <label htmlFor="bre-json-upload" className="flex items-center gap-1 px-2.5 py-1 rounded border border-blue-400 text-blue-600 text-xs font-semibold bg-white cursor-pointer hover:bg-blue-50 transition-colors">
                      <Upload size={11} /> Upload JSON
                    </label>
                    <input ref={breJsonRef} id="bre-json-upload" type="file" accept=".json" className="hidden" onChange={handleBreJsonUpload} />
                  </div>
                  <div className="relative">
                    <textarea
                      className="w-full px-3 py-2 pr-8 text-sm rounded-md border border-gray-300 bg-white font-mono text-xs focus:outline-none focus:border-blue-500 resize-none placeholder:text-gray-400"
                      rows={4}
                      placeholder={'{\n  "rule": "value"\n}'}
                      value={form.recommendationPolicy}
                      onChange={e => setForm(prev => ({ ...prev, recommendationPolicy: e.target.value }))}
                    />
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold select-none">i</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-20 shrink-0 flex items-center justify-end gap-2.5 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-white">
          <button type="button" onClick={onClose} className="px-4 sm:px-5 py-2 text-sm font-semibold rounded-lg border border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            disabled={savingProduct}
            onClick={handleSaveProduct}
            className="px-5 sm:px-6 py-2 text-sm font-bold rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
          >
            {savingProduct ? (productToEdit ? 'Updating...' : 'Saving...') : (productToEdit ? 'Update Product' : 'Save Product')}
          </button>
        </div>
      </div>

      {showViewBranchModal && form.bankId && (
        <BranchFormTable
          branch={{ bank_id: Number(form.bankId) }}
          banks={banks}
          onClose={() => setShowViewBranchModal(false)}
          onSuccess={() => {
            setShowViewBranchModal(false);
            fetchBranches();
          }}
          selectedSubcategory={form.productName ? `${form.productName} (${form.subcategory || form.category})` : (form.subcategory || form.category)}
          showExcelActions={true}
        />
      )}
    </div>
  );
}

function ViewProductModal({ product, banks, onClose, onToggleStatus, onEditProduct }: { product: any; banks: Bank[]; onClose: () => void; onToggleStatus?: (p: any) => void; onEditProduct?: (p: any) => void }) {
  if (!product) return null;

  const [showBranchTable, setShowBranchTable] = useState(false);

  const bankLogo = product.bank_logo_url
    ? (product.bank_logo_url.startsWith('http') ? product.bank_logo_url : `${API_BASE}${product.bank_logo_url.startsWith('/') ? '' : '/'}${product.bank_logo_url}`)
    : '';
  const variantImg = product.card_variant_image
    ? (product.card_variant_image.startsWith('http') ? product.card_variant_image : `${API_BASE}${product.card_variant_image.startsWith('/') ? '' : '/'}${product.card_variant_image}`)
    : '';

  // Parse JSON fields safely
  const parseJson = (val: any, defaultVal: any = []) => {
    if (!val) return defaultVal;
    if (typeof val === 'object') return val;
    try {
      return JSON.parse(val);
    } catch {
      return defaultVal;
    }
  };

  const companyCats = parseJson(product.company_categories, []);
  const features = parseJson(product.features, []);
  const tags = parseJson(product.tags, []);
  const bankersData = parseJson(product.bankers_data, {});
  const policyHistory = parseJson(product.bre_policy_history, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 pb-20 sm:pb-4 z-[99999]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl md:max-w-3xl max-h-[82vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-5 border-b border-gray-200/90 bg-gray-50/80 shrink-0">
          {/* Top row: Logo + Bank (mobile) or Logo + Title (desktop) and Actions */}
          <div className="flex items-start justify-between gap-2 sm:gap-4">
            <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0 flex-1">
              {bankLogo ? (
                <img src={bankLogo} alt={product.bank_name} className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-contain border border-gray-200 bg-white p-1 shrink-0 mt-0.5 shadow-2xs" />
              ) : (
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0 mt-0.5 shadow-2xs">
                  {product.bank_name?.substring(0, 2)?.toUpperCase() || 'BK'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                {/* Desktop: Title & Status inline */}
                <div className="hidden sm:flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug tracking-tight break-words">
                    {product.product_name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => onToggleStatus && onToggleStatus(product)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 ${product.status === 'active' || !product.status
                      ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                      : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                      }`}
                    title="Click to toggle status (Active / Inactive)"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${product.status === 'active' || !product.status ? 'bg-green-600' : 'bg-red-600'}`} />
                    <span>{product.status || 'active'}</span>
                  </button>
                </div>
                <p className="hidden sm:block text-xs font-semibold text-gray-500 mt-1">{product.bank_name}</p>

                {/* Mobile: Bank name directly next to logo */}
                <div className="sm:hidden min-w-0 pt-0.5">
                  <p className="text-xs font-bold text-gray-600 truncate">{product.bank_name || 'Bank'}</p>
                </div>
              </div>
            </div>

            {/* Actions: Edit, View Branch, Close */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0 pt-0.5">
              {onEditProduct && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditProduct(product);
                  }}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-300 text-xs font-bold hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
                >
                  <Pencil size={13} />
                  <span>Edit</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowBranchTable(true)}
                className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 transition-colors shadow-2xs cursor-pointer"
              >
                <Building2 size={13} />
                <span className="hidden xs:inline sm:inline">View Branch</span>
                <span className="xs:hidden sm:hidden">Branch</span>
              </button>

              <button type="button" onClick={onClose} className="p-1 sm:p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Mobile Only: Full width Product Title & Status Row */}
          <div className="sm:hidden mt-2.5 pt-2 border-t border-gray-200/60">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-extrabold text-gray-900 leading-snug break-words flex-1">
                {product.product_name}
              </h3>
              <button
                type="button"
                onClick={() => onToggleStatus && onToggleStatus(product)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 ${product.status === 'active' || !product.status
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-red-100 text-red-700 border border-red-300'
                  }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${product.status === 'active' || !product.status ? 'bg-green-600' : 'bg-red-600'}`} />
                <span>{product.status || 'active'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-sm overscroll-contain">
          {/* Category & Variant Image */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl bg-blue-50/40 border border-blue-100/60 w-full overflow-hidden">
            <div className="min-w-0 w-full flex-1">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-md bg-blue-600 text-white text-xs font-bold shadow-2xs">
                  {product.category}
                </span>
                {product.subcategory && product.subcategory.trim().toLowerCase() !== (product.category || '').trim().toLowerCase() && (
                  <span className="px-2.5 py-1 rounded-md bg-purple-600 text-white text-xs font-bold shadow-2xs">
                    {product.subcategory}
                  </span>
                )}
              </div>
              {product.bank_redirect_url && (
                <p className="text-xs text-gray-600 mt-2 break-all">
                  <span className="font-bold text-gray-700">Redirect URL: </span>
                  <a href={product.bank_redirect_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                    {product.bank_redirect_url}
                  </a>
                </p>
              )}
              {product.payout_source && (
                <p className="text-xs text-gray-600 mt-1 break-words">
                  <span className="font-bold text-gray-700">Payout Source: </span>{product.payout_source}
                </p>
              )}
            </div>

            {variantImg && (
              <img src={variantImg} alt="Card Variant" className="h-20 sm:h-24 object-contain rounded-lg border border-gray-200 bg-white p-1 shadow-xs shrink-0 self-center sm:self-start" />
            )}
          </div>

          {/* Reward Terms & Conditions Section */}
          {product.reward_terms && (
            <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80 text-xs">
              <span className="font-bold text-purple-900 block mb-1 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Gift size={15} className="text-purple-700" />
                Reward Terms & Points Conditions
              </span>
              <p className="text-purple-950 font-medium whitespace-pre-wrap leading-relaxed break-words">
                {product.reward_terms}
              </p>
            </div>
          )}

          {/* Credit Card Specific Details */}
          {product.category === 'Credit Card' && (
            <div className="space-y-4">
              {/* Pricing & Fees */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                <div>
                  <span className="text-gray-500 block text-[10px] sm:text-[11px] font-medium truncate">Fee Type</span>
                  <span className="font-bold text-gray-900 capitalize text-xs sm:text-sm">{product.fee_type?.replace('_', ' ') || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] sm:text-[11px] font-medium truncate">Joining Fee</span>
                  <span className="font-bold text-gray-900 text-xs sm:text-sm">{formatFeeDisplay(product.joining_fee, product.fee_type)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] sm:text-[11px] font-medium truncate">Annual Fee</span>
                  <span className="font-bold text-gray-900 text-xs sm:text-sm">{formatFeeDisplay(product.annual_fee, product.fee_type)}</span>
                </div>
              </div>

              {product.fee_waiver_condition && (
                <div className="p-3 rounded-lg bg-yellow-50/60 border border-yellow-200/60 text-xs">
                  <span className="font-bold text-yellow-900 block mb-1">Fee Waiver Condition</span>
                  <p className="text-yellow-800 leading-relaxed break-words">{product.fee_waiver_condition}</p>
                </div>
              )}

              {/* Serviceable Pin Codes */}
              {product.pin_codes && (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs">
                  <span className="font-bold text-gray-800 block mb-1">Serviceable PIN Codes</span>
                  <p className="text-gray-600 font-mono text-[11px] leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap break-all">
                    {product.pin_codes}
                  </p>
                </div>
              )}

              {/* Company Categories */}
              {companyCats.length > 0 && (
                <div>
                  <span className="font-bold text-gray-800 text-xs block mb-1.5">Allowed Company Categories</span>
                  <div className="flex flex-wrap gap-1.5">
                    {companyCats.map((cat: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-gray-200 text-gray-800 text-xs font-semibold">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Features & Benefits */}
              {features.length > 0 && (
                <div>
                  <span className="font-bold text-gray-800 text-xs block mb-1.5">Card Benefits & Features</span>
                  <ul className="space-y-1 pl-1 text-xs text-gray-700">
                    {features.map((feat: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span className="break-words">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Product Tags */}
              {tags.length > 0 && (
                <div>
                  <span className="font-bold text-gray-800 text-xs block mb-1.5">Product Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loan Login Process & Bankers Info */}
          {product.category === 'Loan' && (
            <div className="space-y-3">
              {product.login_process && (
                <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 text-xs">
                  <span className="font-bold text-indigo-900 block mb-1">Login Process Level</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold capitalize text-[11px]">
                    {product.login_process}
                  </span>
                </div>
              )}

              {/* Central Banker */}
              {bankersData.centralBanker && bankersData.centralBanker.name && (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs">
                  <span className="font-bold text-gray-900 block mb-1">Central Banker</span>
                  <p className="text-gray-700 break-words">
                    <span className="font-semibold">{bankersData.centralBanker.name}</span>
                    {bankersData.centralBanker.contact && ` (${bankersData.centralBanker.contact})`}
                  </p>
                </div>
              )}

              {/* Region Bankers */}
              {bankersData.regionBankers && bankersData.regionBankers.length > 0 && (
                <div>
                  <span className="font-bold text-gray-800 text-xs block mb-1.5">Region Bankers</span>
                  <div className="space-y-1.5">
                    {bankersData.regionBankers.map((b: any, i: number) => (
                      <div key={i} className="p-2 rounded border border-gray-200 bg-gray-50 text-xs flex justify-between gap-2">
                        <span className="font-medium text-gray-800 break-words">{b.name} {b.contact && `(${b.contact})`}</span>
                        <span className="text-gray-500 font-semibold shrink-0">{b.region}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Territory Bankers */}
              {bankersData.territoryBankers && bankersData.territoryBankers.length > 0 && (
                <div>
                  <span className="font-bold text-gray-800 text-xs block mb-1.5">Territory Bankers</span>
                  <div className="space-y-1.5">
                    {bankersData.territoryBankers.map((b: any, i: number) => (
                      <div key={i} className="p-2 rounded border border-gray-200 bg-gray-50 text-xs flex justify-between gap-2">
                        <span className="font-medium text-gray-800 break-words">{b.name} {b.contact && `(${b.contact})`}</span>
                        <span className="text-gray-500 font-semibold shrink-0">{b.territory} {b.geoLimit && `[Limit: ${b.geoLimit} KM]`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BRE Recommendation Policy & History */}
          {product.current_bre_policy && (
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs">
              <span className="font-bold text-blue-900 block mb-1 text-[11px] uppercase tracking-wider">
                BRE Policy
              </span>
              <p className="text-blue-950 font-medium whitespace-pre-wrap leading-relaxed break-words">
                {product.current_bre_policy}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-20 shrink-0 px-4 sm:px-6 py-3 border-t border-gray-200 bg-white sm:bg-gray-50 flex justify-between items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleStatus && onToggleStatus(product)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 truncate ${product.status === 'active' || !product.status
              ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
              : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
              }`}
          >
            <span>Set Status to {product.status === 'active' || !product.status ? 'Inactive' : 'Active'}</span>
          </button>
          <button type="button" onClick={onClose} className="px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors cursor-pointer shrink-0">
            Close
          </button>
        </div>
      </div>

      {showBranchTable && (
        <BranchFormTable
          branch={{ bank_id: Number(product.bank_id) }}
          banks={banks}
          onClose={() => setShowBranchTable(false)}
          onSuccess={() => {
            setShowBranchTable(false);
            toast.success('Branch details updated');
          }}
          selectedSubcategory={product.subcategory}
          showExcelActions={true}
          productId={product.id}
        />
      )}
    </div>
  );
}

export default function ProductManagement() {
  const location = useLocation();
  const incomingBankId = (location.state as any)?.bankId ? String((location.state as any).bankId) : '';
  const [lenderName, setLenderName] = useState<string>(() => (location.state as any)?.bankName ? String((location.state as any).bankName) : '');

  const [banks, setBanks] = useState<Bank[]>([]);

  useEffect(() => {
    fetch(`${API}/banks`, { headers: authHeader() })
      .then(r => r.json())
      .then(data => setBanks(Array.isArray(data) ? data : []))
      .catch(() => setBanks([]));
  }, []);

  useEffect(() => {
    if (incomingBankId && !lenderName) {
      fetch(`${API}/banks`, { headers: authHeader() })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            const found = data.find((b: any) => String(b.id) === incomingBankId);
            if (found?.name) setLenderName(found.name);
          }
        })
        .catch(() => { });
    }
  }, [incomingBankId, lenderName]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterLender, setFilterLender] = useState<string>(() => incomingBankId || 'all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProductForView, setSelectedProductForView] = useState<any | null>(null);
  const [productToEdit, setProductToEdit] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const formatCreatedDate = (dateVal: any) => {
    if (!dateVal) return 'N/A';
    try {
      if (typeof dateVal === 'number') {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      let str = String(dateVal).trim();
      if (str.includes(' ') && !str.includes('T')) {
        str = str.replace(' ', 'T');
      }
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return 'N/A';
    } catch {
      return 'N/A';
    }
  };

  const getDisplayCommission = (p: any) => {
    const payout = p.payout_amount ?? p.dsa_payout ?? p.base_payout ?? p.commission ?? p.dsa_commission;
    if (payout !== undefined && payout !== null && payout !== '') {
      const num = Number(payout);
      if (!isNaN(num) && num > 0) {
        return `₹${num.toLocaleString('en-IN')}`;
      }
      if (String(payout).startsWith('₹')) return String(payout);
      return `₹${payout}`;
    }
    return '₹0';
  };

  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const fetchProducts = useCallback((showLoader = true) => {
    if (showLoader) setLoadingProducts(true);
    fetch(`${API}/products`, { headers: authHeader() })
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setProducts(data.data);
        } else if (Array.isArray(data)) {
          setProducts(data);
        } else {
          setProducts([]);
        }
      })
      .catch(() => setProducts([]))
      .finally(() => {
        if (showLoader) setLoadingProducts(false);
      });
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleToggleStatus = async (product: any) => {
    const currentStatus = product.status || 'active';
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    // Optimistic UI update: instantly update state without screen loading flicker
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: newStatus } : p));
    if (selectedProductForView && selectedProductForView.id === product.id) {
      setSelectedProductForView({ ...selectedProductForView, status: newStatus });
    }

    try {
      const res = await fetch(`${API}/products/${product.id}`, {
        method: 'PUT',
        headers: {
          ...authHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Product status updated to ${newStatus}`);
        // Silent background sync without showing full-page loader
        fetchProducts(false);
      } else {
        // Rollback on failure
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: currentStatus } : p));
        if (selectedProductForView && selectedProductForView.id === product.id) {
          setSelectedProductForView({ ...selectedProductForView, status: currentStatus });
        }
        throw new Error(data.error || 'Failed to update status');
      }
    } catch (err: any) {
      // Rollback on error
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: currentStatus } : p));
      if (selectedProductForView && selectedProductForView.id === product.id) {
        setSelectedProductForView({ ...selectedProductForView, status: currentStatus });
      }
      toast.error(err.message || 'Error updating product status');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`${API}/products/${id}`, {
        method: 'DELETE',
        headers: authHeader()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Product deleted successfully');
        fetchProducts();
      } else {
        throw new Error(data.error || 'Delete failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete product');
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      const matchesSearch = searchQuery === '' ||
        (p.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.bank_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.subcategory || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = filterType === 'all' ||
        (filterType === 'credit_card' && p.category === 'Credit Card') ||
        (filterType === 'loan' && p.category === 'Loan') ||
        (p.subcategory || '').toLowerCase().replace(/\s+/g, '_').includes(filterType.toLowerCase());

      const matchesStatus = filterStatus === 'all' || (p.status || 'active') === filterStatus;

      const matchesLender = filterLender === 'all' || String(p.bank_id) === String(filterLender);

      return matchesSearch && matchesType && matchesStatus && matchesLender;
    });
  }, [products, searchQuery, filterType, filterStatus, filterLender]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 flex-wrap">
          Product Management
          {lenderName && (
            <span className="text-muted-foreground font-normal text-xl">
              — <span className="text-foreground font-bold">{lenderName}</span>
            </span>
          )}
        </h1>
      </div>

      {/* Control Bar: Search Bar, Compact Filters, View Switcher & Add Product Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Filters Group: 3 columns on mobile, inline on desktop */}
        <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* All Lenders Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={filterLender}
              onChange={e => {
                const val = e.target.value;
                setFilterLender(val);
                if (val === 'all') {
                  setLenderName('');
                } else {
                  const found = banks.find(b => String(b.id) === String(val));
                  if (found) setLenderName(found.name);
                }
              }}
              className="w-full sm:w-auto h-9 appearance-none bg-background border border-blue-500 text-foreground text-xs sm:text-sm font-medium px-2 sm:px-3 pr-6 sm:pr-8 rounded-lg shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer sm:max-w-[180px] md:max-w-[200px] truncate"
            >
              <option value="all">All Lenders</option>
              {banks.map(b => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none" />
          </div>

          {/* All Types Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full sm:w-auto h-9 appearance-none bg-background border border-cyan-500 text-foreground text-xs sm:text-sm font-medium px-2 sm:px-3 pr-6 sm:pr-8 rounded-lg shadow-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer truncate"
            >
              <option value="all">All Types</option>
              <option value="loan">Loan</option>
              <option value="personal_loan">Personal Loan</option>
              <option value="business_loan">Business Loan</option>
              <option value="new_car_loan">New Car Loan</option>
            </select>
            <ChevronDown size={14} className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 text-cyan-600 pointer-events-none" />
          </div>

          {/* All Status Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto h-9 appearance-none bg-background border border-border text-foreground text-xs sm:text-sm font-medium px-2 sm:px-3 pr-6 sm:pr-8 rounded-lg shadow-xs focus:outline-none cursor-pointer truncate"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown size={14} className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* View Mode Toggle + Add Product Button */}
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto sm:ml-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Horizontal List View"
            >
              <LayoutList size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          {/* Add Product Button */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 h-9 px-3.5 sm:px-4 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer shadow-xs"
          >
            <Plus size={15} />
            Add Product
          </button>
        </div>
      </div>

      {/* Product Content Display */}
      {loadingProducts ? (
        <div className="py-16 text-center text-muted-foreground font-semibold text-sm">
          Loading products...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-background border border-dashed border-border rounded-2xl text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4 text-accent">
            <PackageSearch size={32} />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">No Products Found</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
            {searchQuery || filterType !== 'all' || filterStatus !== 'all'
              ? 'No products match your selected filters or search query.'
              : 'There are no products added yet. Click the button below to add a new product.'}
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="flex flex-col gap-3">
          {filteredProducts.map((p: any) => {
            const bankLogo = p.bank_logo_url
              ? (p.bank_logo_url.startsWith('http') ? p.bank_logo_url : `${API_BASE}${p.bank_logo_url.startsWith('/') ? '' : '/'}${p.bank_logo_url}`)
              : '';
            const variantImg = p.card_variant_image
              ? (p.card_variant_image.startsWith('http') ? p.card_variant_image : `${API_BASE}${p.card_variant_image.startsWith('/') ? '' : '/'}${p.card_variant_image}`)
              : '';
            const displayImg = variantImg || bankLogo;

            return (
              <div
                key={p.id}
                className="bg-white border border-gray-200 rounded-xl p-3 sm:p-3.5 shadow-2xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
              >
                {/* Left: Product Image & Details */}
                <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 mt-0.5 sm:mt-0">
                    {displayImg ? (
                      <img
                        src={displayImg}
                        alt={p.product_name}
                        className="w-full h-full object-contain p-0.5"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/cards/card_1758966564_4428.png';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs">
                        {p.bank_name?.substring(0, 2)?.toUpperCase() || 'CC'}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Title and Top-Right Mobile Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-extrabold text-gray-900 text-sm sm:text-base leading-snug break-words sm:truncate">
                        {p.product_name}
                      </h4>

                      {/* Mobile Actions: Compact on top-right */}
                      <div className="flex sm:hidden items-center gap-0.5 shrink-0 -mt-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(p);
                          }}
                          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                            p.status === 'active' || !p.status
                              ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                              : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                          }`}
                          title={p.status === 'active' || !p.status ? 'Active (Click to Inactivate)' : 'Inactive (Click to Activate)'}
                        >
                          {p.status === 'active' || !p.status ? <Eye size={17} /> : <EyeOff size={17} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductToEdit(p)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          title="Edit Product"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 text-rose-500 hover:text-red-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>

                    {/* Status & Category Badges */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mt-1.5 sm:mt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(p);
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                          p.status === 'active' || !p.status
                            ? 'bg-[#1e3a5f] text-white hover:bg-[#152e4d]'
                            : 'bg-red-700 text-white hover:bg-red-800'
                        }`}
                        title="Click to toggle status"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'active' || !p.status ? 'bg-emerald-400' : 'bg-red-300'}`} />
                        <span className="capitalize">{p.status || 'active'}</span>
                      </button>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        {p.category}
                      </span>
                      {p.subcategory && p.subcategory.trim().toLowerCase() !== (p.category || '').trim().toLowerCase() && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          {p.subcategory}
                        </span>
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-x-3.5 gap-y-1 text-xs text-gray-500 mt-1.5 sm:mt-1 flex-wrap">
                      <span>Bank: <span className="font-medium text-gray-700">{p.bank_name || 'N/A'}</span></span>
                      <span>Commission: <span className="font-semibold text-emerald-700">{getDisplayCommission(p)}</span></span>
                      <span>Created: <span className="font-medium text-gray-700">{formatCreatedDate(p.created_at)}</span></span>
                    </div>
                  </div>
                </div>

                {/* Right: Desktop Actions */}
                <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(p);
                    }}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      p.status === 'active' || !p.status
                        ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                        : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                    }`}
                    title={p.status === 'active' || !p.status ? 'Active (Click to Inactivate)' : 'Inactive (Click to Activate)'}
                  >
                    {p.status === 'active' || !p.status ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductToEdit(p)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit Product"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(p.id)}
                    className="p-1.5 text-rose-500 hover:text-red-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete Product"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((p: any) => {
            const bankLogo = p.bank_logo_url
              ? (p.bank_logo_url.startsWith('http') ? p.bank_logo_url : `${API_BASE}${p.bank_logo_url.startsWith('/') ? '' : '/'}${p.bank_logo_url}`)
              : '';
            const variantImg = p.card_variant_image
              ? (p.card_variant_image.startsWith('http') ? p.card_variant_image : `${API_BASE}${p.card_variant_image.startsWith('/') ? '' : '/'}${p.card_variant_image}`)
              : '';

            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {bankLogo ? (
                        <img src={bankLogo} alt={p.bank_name} className="w-10 h-10 rounded-lg object-contain border border-gray-100 bg-white p-0.5" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs">
                          {p.bank_name?.substring(0, 2)?.toUpperCase() || 'BK'}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-gray-900 text-base leading-snug">{p.product_name}</h4>
                        <p className="text-xs font-semibold text-gray-500">{p.bank_name}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(p);
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase transition-all cursor-pointer flex items-center gap-1 ${p.status === 'active' || !p.status
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                        : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                        }`}
                      title="Click to toggle status (Active / Inactive)"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'active' || !p.status ? 'bg-green-600' : 'bg-red-600'}`} />
                      <span className="capitalize">{p.status || 'active'}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 my-2.5">
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-extrabold border border-amber-200">
                      v{p.version || 1}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold">
                      {p.category}
                    </span>
                    {p.subcategory && p.subcategory.trim().toLowerCase() !== (p.category || '').trim().toLowerCase() && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold">
                        {p.subcategory}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1">
                      <Building2 size={12} />
                      {p.branch_name ? (
                        <span>{p.branch_name}</span>
                      ) : (
                        <span>{Number(p.branch_count || 0)} {Number(p.branch_count || 0) === 1 ? 'Branch' : 'Branches'}</span>
                      )}
                    </span>
                  </div>

                  {p.category === 'Credit Card' && (
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-gray-50 text-xs my-2 border border-gray-100">
                      <div>
                        <span className="text-gray-400 block text-[10px]">Joining Fee</span>
                        <span className="font-bold text-gray-800">{formatFeeDisplay(p.joining_fee, p.fee_type)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">Annual Fee</span>
                        <span className="font-bold text-gray-800">{formatFeeDisplay(p.annual_fee, p.fee_type)}</span>
                      </div>
                    </div>
                  )}

                  {(() => {
                    const cardTags = parseJson(p.tags, []);
                    return cardTags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 my-2">
                        {cardTags.map((tag: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-semibold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null;
                  })()}

                  {p.current_bre_policy && (
                    <div className="mt-2 text-xs text-gray-600 bg-blue-50/50 p-2 rounded-lg border border-blue-100/50 line-clamp-2">
                      <span className="font-bold text-blue-800 block text-[10px] uppercase tracking-wide">BRE Policy</span>
                      {p.current_bre_policy}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                  <span className="text-[11px] text-gray-400 font-medium">
                    Added: {new Date(p.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(p);
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                        p.status === 'active' || !p.status
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                          : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                      }`}
                      title={p.status === 'active' || !p.status ? 'Active (Click to Inactivate)' : 'Inactive (Click to Activate)'}
                    >
                      {p.status === 'active' || !p.status ? <Eye size={14} /> : <EyeOff size={14} />}
                      <span>{p.status === 'active' || !p.status ? 'Active' : 'Inactive'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductToEdit(p)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors cursor-pointer"
                      title="Edit Product"
                    >
                      <Pencil size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      title="Delete Product"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchProducts}
          initialBankId={filterLender !== 'all' ? filterLender : incomingBankId}
          banks={banks}
        />
      )}

      {productToEdit && (
        <AddProductModal
          productToEdit={productToEdit}
          onClose={() => setProductToEdit(null)}
          onSuccess={fetchProducts}
          initialBankId={incomingBankId}
          banks={banks}
        />
      )}

      {selectedProductForView && (
        <ViewProductModal
          product={selectedProductForView}
          banks={banks}
          onClose={() => setSelectedProductForView(null)}
          onToggleStatus={handleToggleStatus}
          onEditProduct={(p) => {
            setSelectedProductForView(null);
            setProductToEdit(p);
          }}
        />
      )}
    </div>
  );
}
