import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, X, Plus, Trash2, MapPin, Loader2 } from 'lucide-react';
import { BranchFormTable } from '@/components/BranchFormTable';

interface Branch {
  id?: number;
  branch_name: string;
  location: string;
  geo_limit: string;
  product: string;
  sales_manager_name: string;
  sales_manager_mobile: string;
  area_sales_manager_name: string;
  area_sales_manager_mobile: string;
  status: string;
}

interface BankFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bank?: any;
}

const emptyBranch = (): Branch => ({
  branch_name: '', location: '', geo_limit: '', product: '',
  sales_manager_name: '', sales_manager_mobile: '',
  area_sales_manager_name: '', area_sales_manager_mobile: '',
  status: 'active',
});

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_BASE = API.replace('/api', '');
const authHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` });

interface AddressSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

async function getAddressSuggestions(input: string): Promise<AddressSuggestion[]> {
  const trimmedInput = input.trim();
  if (!trimmedInput || trimmedInput.length < 2) return [];
  
  try {
    const response = await fetch(`${API}/google-maps/autocomplete`, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    });
    
    if (!response.ok) return [];
    const data = await response.json();
    return data.predictions || [];
  } catch (error) {
return [];
  }
}

async function getPlaceDetails(placeId: string): Promise<{ lat: number; lng: number; address: string } | null> {
  try {
    const response = await fetch(`${API}/google-maps/place-details`, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ place_id: placeId })
    });
    
    const data = await response.json();
    if (response.ok) return data;
    return null;
  } catch (error) {
return null;
  }
}

export function BankFormModal({ open, onClose, onSuccess, bank }: BankFormModalProps) {
  const [form, setForm] = useState({ name: '', status: 'active' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [isNewBranch, setIsNewBranch] = useState(false);
  const [branchLoading, setBranchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [category, setCategory] = useState<string[]>([]);
  const [subcategory, setSubcategory] = useState<string[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<AddressSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showAddBranchForm, setShowAddBranchForm] = useState(false);
  const locationDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const locationSuggestionsRef = useRef<HTMLDivElement>(null);

  // Bank product rates state
  const [productRates, setProductRates] = useState<{
    product_name: string;
    min_rate: string;
    racc_rate: string;
    min_tenure: string;
    max_tenure: string;
    max_loan_amount: string;
    ltv_percent: string;
    min_cibil_score: string;
    max_foir_percent: string;
  }[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);

  const productOptions = [
    'New Car - Purchase',
    'Used Car - Purchase',
    'Used Car - Refinance',
    'Used Car - Top-up',
    'Used Car - BT'
  ];

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-accent';
  const labelClass = 'block text-xs font-medium text-muted-foreground mb-1';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationSuggestionsRef.current && !locationSuggestionsRef.current.contains(e.target as Node)) {
        setShowLocationSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (bank) {
      setForm({ name: bank.name || '', status: bank.status || 'active' });
      if (bank.logo_url) setLogoPreview(`${API}${bank.logo_url.startsWith('/') ? '' : '/'}${bank.logo_url}`);
      else setLogoPreview('');
      // Seed category and subcategory from existing bank data
      const rawCats = Array.isArray(bank.category) ? bank.category : (bank.category ? [bank.category] : []);
      const cleanCats = rawCats.filter((c: any) => String(c).toLowerCase() !== 'credit card' && String(c).toLowerCase() !== 'credit_card');
      setCategory(cleanCats.length > 0 ? cleanCats : ['Loan']);
      setSubcategory(Array.isArray(bank.subcategory) ? bank.subcategory : []);
      
      // Fetch branches
      fetch(`${API}/banks/${bank.id}/branches`, { headers: authHeader() })
        .then(r => r.json())
        .then(data => setBranches(Array.isArray(data) ? data : []))
        .catch(() => setBranches([]));

      // Fetch product rates
      setRatesLoading(true);
      fetch(`${API}/banks/${bank.id}/product-rates`, { headers: authHeader() })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setProductRates(data.map((r: any) => ({
              product_name: r.product_name,
              min_rate: r.min_rate !== null && r.min_rate !== undefined ? String(r.min_rate) : '',
              racc_rate: r.racc_rate !== null && r.racc_rate !== undefined ? String(r.racc_rate) : '',
              min_tenure: r.min_tenure !== null && r.min_tenure !== undefined ? String(r.min_tenure) : '',
              max_tenure: r.max_tenure !== null && r.max_tenure !== undefined ? String(r.max_tenure) : '',
              max_loan_amount: r.max_loan_amount !== null && r.max_loan_amount !== undefined ? String(r.max_loan_amount) : '',
              ltv_percent: r.ltv_percent !== null && r.ltv_percent !== undefined ? String(r.ltv_percent) : '',
              min_cibil_score: r.min_cibil_score !== null && r.min_cibil_score !== undefined ? String(r.min_cibil_score) : '',
              max_foir_percent: r.max_foir_percent !== null && r.max_foir_percent !== undefined ? String(r.max_foir_percent) : ''
            })));
          }
        })
        .catch(err => console.error('Error fetching rates:', err))
        .finally(() => setRatesLoading(false));
    } else {
      setForm({ name: '', status: 'active' });
      setLogoPreview('');
      setBranches([]);
      setProductRates([]);
      setCategory([]);
      setSubcategory([]);
    }
    setLogoFile(null);
    setSelectedBranchId('');
    setActiveBranch(null);
    setIsNewBranch(false);
    setShowAddBranchForm(false);
  }, [bank, open]);

  const handleBranchSelect = (id: string) => {
    setSelectedBranchId(id);
    setIsNewBranch(false);
    if (!id) { 
      setActiveBranch(null);
      setSelectedProducts([]);
      return; 
    }
    const found = branches.find(b => String(b.id) === id);
    if (found) {
      setActiveBranch({ ...found });
      setSelectedProducts(found.product ? found.product.split(', ').map(p => p.trim()) : []);
    } else {
      setActiveBranch(null);
      setSelectedProducts([]);
    }
  };

  const handleAddNewBranchClick = () => {
    setShowAddBranchForm(true);
  };

  const updateActiveBranch = (key: keyof Branch, val: string) => {
    setActiveBranch(prev => prev ? { ...prev, [key]: val } : null);
  };

  const handleProductToggle = (product: string) => {
    setSelectedProducts(prev => 
      prev.includes(product)
        ? prev.filter(p => p !== product)
        : [...prev, product]
    );
  };

  const handleLocationChange = (value: string) => {
    updateActiveBranch('location', value);
    
    if (locationDebounceTimer.current) {
      clearTimeout(locationDebounceTimer.current);
    }
    
    const trimmedValue = value.trim();
    if (trimmedValue.length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }
    
    const words = trimmedValue.split(/\s+/).filter(w => w.length > 0);
    const shouldCallApi = words.length >= 1 && value.endsWith(' ');
    
    if (!shouldCallApi) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }
    
    setLocationLoading(true);
    locationDebounceTimer.current = setTimeout(async () => {
      const results = await getAddressSuggestions(value);
      setLocationSuggestions(results);
      setShowLocationSuggestions(results.length > 0);
      setLocationLoading(false);
    }, 300);
  };

  const handleSelectLocationSuggestion = async (suggestion: AddressSuggestion) => {
    setLocationLoading(true);
    try {
      const details = await getPlaceDetails(suggestion.place_id);
      if (details) {
        updateActiveBranch('location', details.address);
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
        toast.success('Location selected');
      }
    } catch (error) {
      toast.error('Failed to get location details');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Logo must be less than 5MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = e => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const saveBranch = async (bankId: number) => {
    if (!activeBranch) return;
    if (!activeBranch.branch_name.trim()) { toast.error('Branch name is required'); return; }
    setBranchLoading(true);
    try {
      const { id, ...branchData } = activeBranch as any;
      branchData.product = selectedProducts.length > 0 ? selectedProducts.join(', ') : '';
      if (!isNewBranch && id) {
        const res = await fetch(`${API}/banks/${bankId}/branches/${id}`, {
          method: 'PUT',
          headers: { ...authHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify(branchData),
        });
        if (!res.ok) throw new Error();
        const updated = await res.json();
        setBranches(prev => prev.map(b => b.id === id ? { ...updated } : b));
        setActiveBranch({ ...updated });
        toast.success('Branch updated!');
      } else {
        const res = await fetch(`${API}/banks/${bankId}/branches`, {
          method: 'POST',
          headers: { ...authHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify(branchData),
        });
        if (!res.ok) throw new Error();
        const created = await res.json();
        setBranches(prev => [...prev, created]);
        setSelectedBranchId(String(created.id));
        setActiveBranch({ ...created });
        setIsNewBranch(false);
        toast.success('Branch added!');
      }
    } catch {
      toast.error('Failed to save branch');
    } finally {
      setBranchLoading(false);
    }
  };

  const deleteBranch = async (bankId: number) => {
    if (!activeBranch?.id) return;
    if (!confirm('Delete this branch?')) return;
    try {
      await fetch(`${API}/banks/${bankId}/branches/${activeBranch.id}`, { method: 'DELETE', headers: authHeader() });
      setBranches(prev => prev.filter(b => b.id !== activeBranch.id));
      setActiveBranch(null);
      setSelectedBranchId('');
      setIsNewBranch(false);
      toast.success('Branch deleted');
    } catch {
      toast.error('Failed to delete branch');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Bank name is required'); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('status', form.status);
      if (logoFile) formData.append('logo', logoFile);
      if (category.length > 0) formData.append('category', JSON.stringify(category));
      formData.append('subcategory', JSON.stringify(subcategory));

      const method = bank ? 'PUT' : 'POST';
      const url = bank ? `${API}/banks/${bank.id}` : `${API}/banks`;
      const res = await fetch(url, { method, headers: authHeader(), body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save bank');
      }

      // If editing bank, save product-wise rates
      if (bank) {
        const ratesPayload = productRates.map(r => ({
          product_name: r.product_name,
          min_rate: r.min_rate === '' ? null : parseFloat(r.min_rate),
          racc_rate: r.racc_rate === '' ? null : parseFloat(r.racc_rate),
          min_tenure: r.min_tenure === '' ? null : parseInt(r.min_tenure),
          max_tenure: r.max_tenure === '' ? null : parseInt(r.max_tenure),
          max_loan_amount: r.max_loan_amount === '' ? null : parseFloat(r.max_loan_amount),
          ltv_percent: r.ltv_percent === '' ? null : parseFloat(r.ltv_percent),
          min_cibil_score: r.min_cibil_score === '' ? null : parseInt(r.min_cibil_score),
          max_foir_percent: r.max_foir_percent === '' ? null : parseFloat(r.max_foir_percent)
        }));
        
        await fetch(`${API}/banks/${bank.id}/product-rates`, {
          method: 'PUT',
          headers: { ...authHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ rates: ratesPayload })
        });
      }

      toast.success(bank ? 'Bank updated!' : 'Bank added!');
      onSuccess();
      onClose();
    } catch (error: any) {
toast.error(error.message || 'Failed to save bank');
    } finally {
      setLoading(false);
    }
  };

  const bankId = bank?.id;

  return (
    <>
      {showAddBranchForm && bank ? (
        <BranchFormTable
          branch={{
            branch_name: '',
            state: '',
            location: '',
            geo_limit: '',
            sales_manager_name: '',
            sales_manager_mobile: '',
            area_sales_manager_name: '',
            area_sales_manager_mobile: '',
            product: '',
            status: 'active',
            bank_id: bank.id
          }}
          banks={[bank]}
          onClose={() => setShowAddBranchForm(false)}
          onSuccess={() => {
            setShowAddBranchForm(false);
            fetch(`${API}/banks/${bank.id}/branches`, { headers: authHeader() })
              .then(r => r.json())
              .then(data => setBranches(Array.isArray(data) ? data : []))
              .catch(() => setBranches([]));
            onSuccess();
          }}
        />
      ) : null}
      <Dialog open={open && !showAddBranchForm} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{bank ? 'Edit Bank / NBFC' : 'Add Bank / NBFC'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Bank Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className={labelClass}>Bank / NBFC Name *</label>
                <input required className={inputClass} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. HDFC Bank" />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select className={inputClass} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Logo & Branches side-by-side (only when editing) */}
            {bank ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                {/* Logo Column */}
                <div className="flex flex-col">
                  <label className={labelClass}>Bank Logo</label>
                  <div className="flex items-center gap-3 mt-1.5 h-14">
                    {logoPreview && (
                      <div className="relative">
                        <img src={logoPreview} alt="Logo" className="w-14 h-14 object-contain border border-border rounded-lg" />
                        <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(''); }} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                          <X size={10} />
                        </button>
                      </div>
                    )}
                    <div>
                      <input type="file" id="logo" accept="image/*" onChange={handleLogoChange} className="hidden" />
                      <label htmlFor="logo" className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted transition-colors text-sm">
                        <Upload size={14} /> Choose Logo
                      </label>
                      <p className="text-[10px] text-muted-foreground mt-1">Max 5MB, PNG/JPG</p>
                    </div>
                  </div>
                </div>

                {/* Branches Column */}
                <div className="flex flex-col">
                  <label className={labelClass}>Branches</label>
                  <div className="border border-border rounded-lg p-2.5 flex items-center justify-between mt-1.5 h-14 bg-muted/20">
                    <span className="text-xs text-foreground font-semibold">
                      {branches.length === 0 ? (
                        <span className="text-muted-foreground font-medium">No branches</span>
                      ) : (
                        `${branches.length} active branch${branches.length !== 1 ? 'es' : ''}`
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={handleAddNewBranchClick}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 transition-colors shadow-sm"
                    >
                      <Plus size={13} /> View Branches
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Logo only when creating new bank */
              <div>
                <label className={labelClass}>Bank Logo</label>
                <div className="flex items-center gap-3">
                  {logoPreview && (
                    <div className="relative">
                      <img src={logoPreview} alt="Logo" className="w-14 h-14 object-contain border border-border rounded-lg" />
                      <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(''); }} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                        <X size={10} />
                      </button>
                    </div>
                  )}
                  <div>
                    <input type="file" id="logo" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    <label htmlFor="logo" className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted transition-colors text-sm">
                      <Upload size={14} /> Choose Logo
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">Max 5MB, PNG/JPG</p>
                  </div>
                </div>
              </div>
            )}

            {/* Category & Subcategory */}
            <div className="space-y-3">
              {/* Category checkboxes */}
              <div>
                <label className={labelClass}>Category</label>
                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-1.5">
                  {['Loan'].map(cat => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer select-none text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={category.includes(cat)}
                        onChange={() =>
                          setCategory(prev =>
                            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                          )
                        }
                        className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>

              {/* Subcategory checkboxes — only when Loan is selected */}
              {category.includes('Loan') && (
                <div>
                  <label className={labelClass}>Subcategory</label>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 mt-1.5">
                    {[
                      'Gold Loan',
                      'New Car Loan',
                      'Used Car Loan',
                      'Business Loan',
                      'Home Loan',
                      'Loan Against Property',
                      'Personal Loan',
                    ].map(sub => (
                      <label key={sub} className="flex items-center gap-2 cursor-pointer select-none text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={subcategory.includes(sub)}
                          onChange={() =>
                            setSubcategory(prev =>
                              prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
                            )
                          }
                          className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
                        />
                        {sub}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Product Rates section — only when editing existing bank */}
            {bank && (
              <div className="border border-border rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-bold text-foreground">Product Rates & Tenures</h3>
                <p className="text-[11px] text-muted-foreground -mt-2">
                  LTV / Min CIBIL / Max FOIR are used by "Find My Eligibility" to decide eligible amount, ROI and tenure for banks without a built-in policy engine.
                </p>
                {ratesLoading ? (
                  <p className="text-xs text-muted-foreground">Loading rates...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="p-2 font-semibold text-muted-foreground w-1/4">Product</th>
                          <th className="p-2 font-semibold text-muted-foreground">Min Rate (%)</th>
                          <th className="p-2 font-semibold text-muted-foreground">RACC Rate (%)</th>
                          <th className="p-2 font-semibold text-muted-foreground">Min Tenure (M)</th>
                          <th className="p-2 font-semibold text-muted-foreground">Max Tenure (M)</th>
                          <th className="p-2 font-semibold text-muted-foreground">Loan Amt (Max)</th>
                          <th className="p-2 font-semibold text-muted-foreground border-l border-border">LTV (%)</th>
                          <th className="p-2 font-semibold text-muted-foreground">Min CIBIL</th>
                          <th className="p-2 font-semibold text-muted-foreground">Max FOIR (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productRates.map((rate, idx) => (
                          <tr key={rate.product_name} className="border-b border-border hover:bg-muted/10">
                            <td className="p-2 font-medium text-foreground">{rate.product_name}</td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                className="w-20 px-2 py-1 text-xs rounded border border-border bg-background"
                                value={rate.min_rate}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProductRates(prev => prev.map((item, i) => i === idx ? { ...item, min_rate: val } : item));
                                }}
                                placeholder="e.g. 8.5"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                className="w-20 px-2 py-1 text-xs rounded border border-border bg-background"
                                value={rate.racc_rate}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProductRates(prev => prev.map((item, i) => i === idx ? { ...item, racc_rate: val } : item));
                                }}
                                placeholder="e.g. 12"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                className="w-16 px-2 py-1 text-xs rounded border border-border bg-background"
                                value={rate.min_tenure}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProductRates(prev => prev.map((item, i) => i === idx ? { ...item, min_tenure: val } : item));
                                }}
                                placeholder="e.g. 12"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                className="w-16 px-2 py-1 text-xs rounded border border-border bg-background"
                                value={rate.max_tenure}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProductRates(prev => prev.map((item, i) => i === idx ? { ...item, max_tenure: val } : item));
                                }}
                                placeholder="e.g. 84"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                className="w-24 px-2 py-1 text-xs rounded border border-border bg-background"
                                value={rate.max_loan_amount}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProductRates(prev => prev.map((item, i) => i === idx ? { ...item, max_loan_amount: val } : item));
                                }}
                                placeholder="e.g. 5000000"
                              />
                            </td>
                            <td className="p-2 border-l border-border">
                              <input
                                type="number"
                                step="0.01"
                                className="w-16 px-2 py-1 text-xs rounded border border-border bg-background"
                                value={rate.ltv_percent}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProductRates(prev => prev.map((item, i) => i === idx ? { ...item, ltv_percent: val } : item));
                                }}
                                placeholder="e.g. 80"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                className="w-16 px-2 py-1 text-xs rounded border border-border bg-background"
                                value={rate.min_cibil_score}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProductRates(prev => prev.map((item, i) => i === idx ? { ...item, min_cibil_score: val } : item));
                                }}
                                placeholder="e.g. 650"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                className="w-16 px-2 py-1 text-xs rounded border border-border bg-background"
                                value={rate.max_foir_percent}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProductRates(prev => prev.map((item, i) => i === idx ? { ...item, max_foir_percent: val } : item));
                                }}
                                placeholder="e.g. 70"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}



            <div className="flex gap-3 justify-end pt-4 border-t">
              <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity">
                {loading ? 'Saving...' : bank ? 'Update Bank' : 'Add Bank'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

