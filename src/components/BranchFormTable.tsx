import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Save, Edit, Check, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` });

declare global {
  interface Window {
    google: any;
  }
}

interface BranchFormTableProps {
  branch: any;
  banks: any[];
  onClose: () => void;
  onSuccess: () => void;
  selectedSubcategory?: string;
  showExcelActions?: boolean;
  productId?: number;
}

// ─── Location Input with Google Places Autocomplete ─────────────────────────
function LocationAutocompleteInput({
  value,
  onChange,
  placeholder,
  className
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    // Initialize Google Places Autocomplete if window.google is available
    if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
      try {
        autocompleteRef.current = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
          types: ['geocode', 'establishment'],
          componentRestrictions: { country: 'in' } // restrict to India
        });

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace();
          if (place && place.formatted_address) {
            onChange(place.formatted_address);
          } else if (place && place.name) {
            onChange(place.name);
          }
        });
      } catch (err) {
        console.warn('Google Places Autocomplete init error:', err);
      }
    }
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || 'Search city, state, or location...'}
      className={className}
    />
  );
}

function LocationInput({ value, onChange, placeholder, tabIndex }: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder?: string;
  tabIndex?: number;
}) {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const serviceRef = useRef<any>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPredictions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      serviceRef.current = new window.google.maps.places.AutocompleteService();
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (val.length > 2 && serviceRef.current) {
      serviceRef.current.getPlacePredictions(
        { input: val, componentRestrictions: { country: 'in' } },
        (results: any[], status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results);
            setShowPredictions(true);
          } else {
            setPredictions([]);
            setShowPredictions(false);
          }
        }
      );
    } else {
      setPredictions([]);
      setShowPredictions(false);
    }
  };

  const handleSelectPrediction = (description: string) => {
    onChange(description);
    setPredictions([]);
    setShowPredictions(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        className="w-full h-7 border border-gray-300 px-1 bg-white focus:outline-blue-500 text-xs"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder || "Location"}
        tabIndex={tabIndex}
      />
      {showPredictions && predictions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-40 overflow-y-auto">
          {predictions.map((p: any, i: number) => (
            <div
              key={p.place_id || i}
              className="px-2 py-1 hover:bg-blue-50 cursor-pointer text-[11px] truncate text-gray-700"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectPrediction(p.description);
              }}
            >
              {p.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const normalizeBranchName = (name: string) => {
  if (!name) return '';
  const cleaned = String(name).trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      if (word.length <= 5 && word === word.toUpperCase() && /^[A-Z0-9]+$/.test(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

export function BranchFormTable({ branch, banks, onClose, onSuccess, selectedSubcategory: passedSubcategory, showExcelActions = false, productId }: BranchFormTableProps) {
  const syncBranchIdsToProduct = async (newBranchIds: number[]) => {
    if (!productId || newBranchIds.length === 0) return;
    try {
      const prodRes = await fetch(`${API}/products/${productId}`, { headers: authHeader() });
      if (!prodRes.ok) return;
      const prodData = await prodRes.json();
      const prod = prodData.data || prodData;
      let existingIds: number[] = [];
      if (prod.branch_ids) {
        if (Array.isArray(prod.branch_ids)) existingIds = prod.branch_ids.map(Number);
        else try { existingIds = JSON.parse(prod.branch_ids).map(Number); } catch {}
      }
      const mergedIds = Array.from(new Set([...existingIds, ...newBranchIds]));
      await fetch(`${API}/products/${productId}`, {
        method: 'PUT',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch_ids: JSON.stringify(mergedIds) })
      });
    } catch (err) {
      console.error('Failed to sync branch_ids to product:', err);
    }
  };
  const [existingBranches, setExistingBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [branchesToSave, setBranchesToSave] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // States for Filter
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(() => passedSubcategory || 'all');

  useEffect(() => {
    if (passedSubcategory) {
      setSelectedSubcategory(passedSubcategory);
    }
  }, [passedSubcategory]);

  const subCat = (selectedSubcategory || passedSubcategory || '').trim().toLowerCase();
  const isPersonalOrBusiness = subCat.includes('personal') || subCat.includes('business');
  const isUsedCar = (subCat.includes('used car') || subCat.includes('ucl')) && !subCat.includes('new car');

  const currentBank = useMemo(() => {
    if (!banks || banks.length === 0) return null;
    return banks.find((b: any) => Number(b.id) === Number(branch?.bank_id)) || banks[0];
  }, [banks, branch?.bank_id]);

  // Dynamically compute available categories
  const availableCategories = useMemo(() => {
    const catsSet = new Set<string>();

    if (currentBank?.category) {
      const bCats = Array.isArray(currentBank.category) ? currentBank.category : [currentBank.category];
      bCats.forEach((c: any) => {
        const cStr = String(c).trim();
        if (cStr) {
          if (cStr.toLowerCase() === 'loan') catsSet.add('Loan');
          // credit card removed
          else catsSet.add(cStr);
        }
      });
    }

    existingBranches.forEach((b: any) => {
      const prod = (b.product || '').toLowerCase();
      // credit card removed
      if (
        b.new_car_purchase || b.used_car_purchase || b.used_car_refinance_up || b.used_car_bt_top_up ||
        prod.includes('car') || prod.includes('loan') || prod.includes('ucl')
      ) {
        catsSet.add('Loan');
      }
    });

    if (catsSet.size === 0) {
      catsSet.add('Loan');
      // credit card removed
    }

    return Array.from(catsSet);
  }, [currentBank, existingBranches]);

  // Dynamically compute available subcategories based on selectedCategory
  const availableSubcategories = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') return [];

    const subSet = new Set<string>();

    if (currentBank?.subcategory) {
      const bSubs = Array.isArray(currentBank.subcategory) ? currentBank.subcategory : [currentBank.subcategory];
      bSubs.forEach((s: any) => {
        const sStr = String(s).trim();
        if (sStr) subSet.add(sStr);
      });
    }

    if (selectedCategory.toLowerCase() === 'loan') {
      subSet.add('Used Car Loan');
      subSet.add('New Car Loan');
      subSet.add('Personal Loan');
      subSet.add('Business Loan');
    }

    existingBranches.forEach((b: any) => {
      if (b.product) {
        const prods = b.product.split(',').map((p: string) => p.trim());
        prods.forEach((p: string) => {
          if (p) {
            if (p.toLowerCase().includes('used car')) subSet.add('Used Car Loan');
            else if (p.toLowerCase().includes('new car')) subSet.add('New Car Loan');
            else if (p.toLowerCase().includes('personal')) subSet.add('Personal Loan');
            else if (p.toLowerCase().includes('business')) subSet.add('Business Loan');
            else subSet.add(p);
          }
        });
      }
      if (b.used_car_purchase || b.used_car_refinance_up || b.used_car_bt_top_up) {
        subSet.add('Used Car Loan');
      }
      if (b.new_car_purchase) {
        subSet.add('New Car Loan');
      }
    });

    return Array.from(subSet);
  }, [selectedCategory, currentBank, existingBranches]);

  const [productBranchIds, setProductBranchIds] = useState<number[] | null>(null);

  useEffect(() => {
    if (productId) {
      fetch(`${API}/products/${productId}`, { headers: authHeader() })
        .then(r => r.json())
        .then(data => {
          const prod = data.data || data;
          let ids: number[] = [];
          if (prod && prod.branch_ids) {
            if (Array.isArray(prod.branch_ids)) ids = prod.branch_ids.map(Number);
            else try { ids = JSON.parse(prod.branch_ids).map(Number); } catch {}
          }
          setProductBranchIds(ids);
        })
        .catch(() => setProductBranchIds([]));
    }
  }, [productId]);

  // Filtered branches list based on Category, Subcategory, and Product Branch IDs
  const filteredBranches = useMemo(() => {
    return existingBranches.filter((b: any) => {
      // 0. Product Specific Filter (only show branches linked to this product)
      if (productId && productBranchIds !== null) {
        return productBranchIds.includes(Number(b.id));
      }

      // 1. Category Filter
      if (selectedCategory && selectedCategory !== 'all') {
        const catLower = selectedCategory.toLowerCase();
        const prodLower = (b.product || '').toLowerCase();

        if (catLower === 'loan') {
          if (prodLower === 'credit card' || prodLower === 'cc') return false;
        } else {
          if (!prodLower.includes(catLower)) return false;
        }
      }

      // 2. Subcategory Filter
      if (selectedSubcategory && selectedSubcategory !== 'all') {
        const subLower = selectedSubcategory.toLowerCase();
        const prodLower = (b.product || '').toLowerCase();

        if (subLower.includes('used car')) {
          const matches = prodLower.includes('used car') || prodLower.includes('ucl') || b.used_car_purchase || b.used_car_refinance_up || b.used_car_bt_top_up;
          if (!matches) return false;
        } else if (subLower.includes('new car')) {
          const matches = prodLower.includes('new car') || b.new_car_purchase;
          if (!matches) return false;
        } else if (subLower.includes('personal loan') || subLower.includes('personal')) {
          const matches = prodLower.includes('personal loan') || prodLower.includes('personal');
          if (!matches) return false;
        } else if (subLower.includes('business loan') || subLower.includes('business')) {
          const matches = prodLower.includes('business loan') || prodLower.includes('business');
          if (!matches) return false;
        } else {
          const matchInsideParen = subLower.match(/\(([^)]+)\)/);
          const cleanSub = matchInsideParen ? matchInsideParen[1].trim() : subLower;
          if (!prodLower.includes(cleanSub) && !prodLower.includes(subLower)) return false;
        }
      }

      return true;
    });
  }, [existingBranches, selectedCategory, selectedSubcategory, productId, productBranchIds]);

  // States for Editing existing branches
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>(null);

  useEffect(() => {
    fetchExistingBranches();
  }, []);

  const fetchExistingBranches = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/banks/${branch.bank_id}/branches`, {
        headers: authHeader()
      });
      if (res.ok) {
        const data = await res.json();
        setExistingBranches(data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const createEmptyBranch = () => ({
    branch_name: '',
    state: '',
    location: '',
    geo_limit: '',
    sales_manager_name: '',
    sales_manager_mobile: '',
    area_sales_manager_name: '',
    area_sales_manager_mobile: '',
    status: 'active',
    new_car_purchase: false,
    used_car_purchase: false,
    used_car_refinance_up: false,
    used_car_bt_top_up: false,
    fresh: false,
    bt_top_up: false
  });

  const handleStartAdding = () => {
    setIsAdding(true);
    setBranchesToSave([createEmptyBranch()]);
  };

  const handleAddMoreRow = () => {
    setBranchesToSave(prev => [...prev, createEmptyBranch()]);
  };

  const updateField = (index: number, field: string, value: any) => {
    setBranchesToSave(prev => {
      const draft = [...prev];
      draft[index] = { ...draft[index], [field]: value };
      return draft;
    });
  };

  // ─── Edit Handlers ─────────────────────────────────────────────────────────
  const startEditing = (b: any) => {
    setEditingId(b.id);
    setEditData({
      branch_name: b.branch_name || '',
      state: b.state || b.state_name || '',
      location: b.location || '',
      geo_limit: b.geo_limit || '',
      sales_manager_name: b.sales_manager_name || '',
      sales_manager_mobile: b.sales_manager_mobile || '',
      area_sales_manager_name: b.area_sales_manager_name || '',
      area_sales_manager_mobile: b.area_sales_manager_mobile || '',
      status: b.status || 'active',
      new_car_purchase: b.product?.includes('New Car Purchase') || false,
      used_car_purchase: b.product?.includes('Used Car Purchase') || false,
      used_car_refinance_up: b.product?.includes('Used Car Refinance Up') || b.product?.includes('Used Car Refinanced') || false,
      used_car_bt_top_up: b.product?.includes('Used Car BT/Top Up') || false,
      fresh: b.product?.includes('Fresh') || false,
      bt_top_up: b.product?.includes('BT/Top Up') || b.product?.includes('BT / Top Up') || false
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  const updateEditField = (field: string, value: any) => {
    setEditData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleUpdateSave = async (id: number) => {
    if (!editData.branch_name) {
      toast.error('Branch name required');
      return;
    }

    const selectedProducts = [];
    if (isPersonalOrBusiness) {
      if (editData.fresh) selectedProducts.push('Fresh');
      if (editData.bt_top_up) selectedProducts.push('BT/Top Up');
    } else if (isUsedCar) {
      if (editData.new_car_purchase) selectedProducts.push('New Car Purchase');
      if (editData.used_car_purchase) selectedProducts.push('Used Car Purchase');
      if (editData.used_car_refinance_up) selectedProducts.push('Used Car Refinance Up');
      if (editData.used_car_bt_top_up) selectedProducts.push('Used Car BT/Top Up');
    }

    const productTags = [];
    if (selectedSubcategory && selectedSubcategory !== 'all') {
      productTags.push(selectedSubcategory);
    }
    if (selectedProducts.length > 0) {
      productTags.push(selectedProducts.join(', '));
    }

    const payload = {
      ...editData,
      branch_name: normalizeBranchName(editData.branch_name),
      product: productTags.join(' - ')
    };

    try {
      const res = await fetch(`${API}/banks/${branch.bank_id}/branches/${id}`, {
        method: 'PUT',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success('Branch updated');
        cancelEdit();
        fetchExistingBranches();
        onSuccess();
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      toast.error('Error saving changes');
    }
  };

  // ─── Save All New Rows Handlers ──────────────────────────────────────────────
  const handleSaveAll = async () => {
    const promises = branchesToSave.map(b => {
      if (!b.branch_name) return null;
      const selectedProducts = [];
      if (isPersonalOrBusiness) {
        if (b.fresh) selectedProducts.push('Fresh');
        if (b.bt_top_up) selectedProducts.push('BT/Top Up');
      } else if (isUsedCar) {
        if (b.new_car_purchase) selectedProducts.push('New Car Purchase');
        if (b.used_car_purchase) selectedProducts.push('Used Car Purchase');
        if (b.used_car_refinance_up) selectedProducts.push('Used Car Refinance Up');
        if (b.used_car_bt_top_up) selectedProducts.push('Used Car BT/Top Up');
      }

      const productTags = [];
      if (selectedSubcategory && selectedSubcategory !== 'all') {
        productTags.push(selectedSubcategory);
      }
      if (selectedProducts.length > 0) {
        productTags.push(selectedProducts.join(', '));
      }

      const payload = {
        branch_name: normalizeBranchName(b.branch_name),
        state: b.state || b.state_name || '',
        location: b.location,
        geo_limit: b.geo_limit,
        sales_manager_name: b.sales_manager_name,
        sales_manager_mobile: b.sales_manager_mobile,
        area_sales_manager_name: b.area_sales_manager_name,
        area_sales_manager_mobile: b.area_sales_manager_mobile,
        status: b.status,
        product: productTags.join(' - '),
        product_id: productId
      };

      return fetch(`${API}/banks/${branch.bank_id}/branches`, {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }).filter(p => p !== null);

    if (promises.length === 0) {
      setIsAdding(false);
      return;
    }

    try {
      const results = await Promise.all(promises);
      if (results.every(r => r?.ok)) {
        try {
          const jsonList = await Promise.all(results.map(r => r?.json()));
          const bIds = jsonList.map((j: any) => j?.id || j?.data?.id).filter(Boolean);
          if (bIds.length > 0) {
            setProductBranchIds(prev => Array.from(new Set([...(prev || []), ...bIds])));
            await syncBranchIdsToProduct(bIds);
          }
        } catch (e) {}

        toast.success('Saved all branches');
        setIsAdding(false);
        fetchExistingBranches();
        onSuccess();
      } else {
        throw new Error('Some failed');
      }
    } catch (error) {
      toast.error('Bulk save error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this branch?')) return;
    try {
      const deleteUrl = productId 
        ? `${API}/banks/${branch.bank_id}/branches/${id}?product_id=${productId}`
        : `${API}/banks/${branch.bank_id}/branches/${id}`;

      const res = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: authHeader()
      });
      if (res.ok) {
        if (productId) {
          setProductBranchIds(prev => (prev || []).filter(bId => bId !== Number(id)));
        }
        toast.success('Branch deleted');
        fetchExistingBranches();
        onSuccess();
      }
    } catch (error) {
      toast.error('Deletion failed');
    }
  };

  const importExcelRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    let headers: string[];
    let sampleRow: any[];

    if (isPersonalOrBusiness) {
      headers = [
        'Branch Name', 'State Name', 'Location', 'Geo Limit', 
        'SM Name', 'SM Mobile', 'ASM Name', 'ASM Mobile', 
        'Fresh', 'BT/Top Up', 'Status'
      ];
      sampleRow = [
        'Connaught Place Branch', 'Delhi', 'Connaught Place, New Delhi', '50km',
        'Rajesh Sharma', '9876543210', 'Vikas Gupta', '9876543211',
        'Yes', 'Yes', 'active'
      ];
    } else if (isUsedCar) {
      headers = [
        'Branch Name', 'State Name', 'Location', 'Geo Limit', 
        'SM Name', 'SM Mobile', 'ASM Name', 'ASM Mobile', 
        'New Car Purchase', 'Used Car Purchase', 'Used Car Refinance Up', 'Used Car BT/Top Up', 'Status'
      ];
      sampleRow = [
        'Connaught Place Branch', 'Delhi', 'Connaught Place, New Delhi', '50km',
        'Rajesh Sharma', '9876543210', 'Vikas Gupta', '9876543211',
        'Yes', 'Yes', 'No', 'Yes', 'active'
      ];
    } else {
      headers = [
        'Branch Name', 'State Name', 'Location', 'Geo Limit', 
        'SM Name', 'SM Mobile', 'ASM Name', 'ASM Mobile', 
        'Status'
      ];
      sampleRow = [
        'Connaught Place Branch', 'Delhi', 'Connaught Place, New Delhi', '50km',
        'Rajesh Sharma', '9876543210', 'Vikas Gupta', '9876543211',
        'active'
      ];
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Branch Template');
    XLSX.writeFile(wb, `branch_template_${selectedSubcategory ? selectedSubcategory.replace(/[^a-zA-Z0-9]/g, '_') : 'import'}.xlsx`);
    toast.success('Import template downloaded');
  };

  const handleExportExcel = () => {
    if (!filteredBranches || filteredBranches.length === 0) {
      toast.error('No branches available to export');
      return;
    }

    const exportRows = filteredBranches.map((b: any, idx: number) => {
      const prodLower = (b.product || '').toLowerCase();
      const baseObj: any = {
        'Sr No.': idx + 1,
        'Branch Name': b.branch_name || '',
        'State Name': b.state || b.state_name || '',
        'Location': b.location || '',
        'Geo Limit': b.geo_limit || '',
        'SM Name': b.sales_manager_name || '',
        'SM Mobile': b.sales_manager_mobile || '',
        'ASM Name': b.area_sales_manager_name || '',
        'ASM Mobile': b.area_sales_manager_mobile || '',
      };

      if (isPersonalOrBusiness) {
        baseObj['Fresh'] = prodLower.includes('fresh') || b.fresh ? 'Yes' : 'No';
        baseObj['BT/Top Up'] = prodLower.includes('bt/top up') || prodLower.includes('bt / top up') || b.bt_top_up ? 'Yes' : 'No';
      } else if (isUsedCar) {
        baseObj['New Car Purchase'] = prodLower.includes('new car purchase') || b.new_car_purchase ? 'Yes' : 'No';
        baseObj['Used Car Purchase'] = prodLower.includes('used car purchase') || b.used_car_purchase ? 'Yes' : 'No';
        baseObj['Used Car Refinance Up'] = prodLower.includes('used car refinance') || prodLower.includes('used car refinanced') || b.used_car_refinance_up ? 'Yes' : 'No';
        baseObj['Used Car BT/Top Up'] = prodLower.includes('used car bt/top up') || b.used_car_bt_top_up ? 'Yes' : 'No';
      }

      baseObj['Status'] = b.status || 'active';
      return baseObj;
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Branches');
    const fileName = `branches_${selectedSubcategory ? selectedSubcategory.replace(/[^a-zA-Z0-9]/g, '_') : 'list'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Branches exported to Excel successfully!');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json<any>(ws);

        if (!rows || rows.length === 0) {
          toast.error('No data found in Excel file');
          return;
        }

        const isYes = (val: any) => {
          if (!val) return false;
          const s = String(val).trim().toLowerCase();
          return s === 'yes' || s === 'true' || s === '1' || s === 'y';
        };

        const existingMap = new Map<string, any>();
        existingBranches.forEach((eb: any) => {
          if (eb.branch_name) {
            existingMap.set(String(eb.branch_name).trim().toLowerCase(), eb);
          }
        });

        let updatedCount = 0;
        let createdCount = 0;

        const promises = rows.map((r: any) => {
          const rawName = r['Branch Name'] || r['branch_name'] || r['Branch'];
          if (!rawName) return null;
          const cleanName = String(rawName).trim();

          const selectedProducts: string[] = [];
          if (isPersonalOrBusiness) {
            if (isYes(r['Fresh']) || isYes(r['fresh'])) selectedProducts.push('Fresh');
            if (isYes(r['BT/Top Up']) || isYes(r['BT / Top Up']) || isYes(r['bt_top_up'])) selectedProducts.push('BT/Top Up');
          } else if (isUsedCar) {
            if (isYes(r['New Car Purchase']) || isYes(r['new_car_purchase'])) selectedProducts.push('New Car Purchase');
            if (isYes(r['Used Car Purchase']) || isYes(r['used_car_purchase'])) selectedProducts.push('Used Car Purchase');
            if (isYes(r['Used Car Refinance Up']) || isYes(r['Used Car Refinanced']) || isYes(r['used_car_refinance_up'])) selectedProducts.push('Used Car Refinance Up');
            if (isYes(r['Used Car BT/Top Up']) || isYes(r['Used Car BT / Top Up']) || isYes(r['used_car_bt_top_up'])) selectedProducts.push('Used Car BT/Top Up');
          }

          const productTags = [];
          if (selectedSubcategory && selectedSubcategory !== 'all') {
            productTags.push(selectedSubcategory);
          }
          if (selectedProducts.length > 0) {
            productTags.push(selectedProducts.join(', '));
          } else if (r['Product'] || r['product']) {
            productTags.push(r['Product'] || r['product']);
          }

          const existingBranch = existingMap.get(cleanName.toLowerCase());
          const newProdStr = productTags.join(' - ');
          let finalProduct = newProdStr;

          if (existingBranch && existingBranch.product) {
            if (selectedSubcategory && selectedSubcategory !== 'all' && !existingBranch.product.toLowerCase().includes(selectedSubcategory.toLowerCase())) {
              finalProduct = `${existingBranch.product}, ${newProdStr}`;
            }
          }

          const payload = {
            branch_name: cleanName,
            state: r['State Name'] || r['state'] || r['State'] || (existingBranch?.state || ''),
            location: r['Location'] || r['location'] || (existingBranch?.location || ''),
            geo_limit: r['Geo Limit'] || r['geo_limit'] || (existingBranch?.geo_limit || ''),
            sales_manager_name: r['SM Name'] || r['sales_manager_name'] || r['SM'] || (existingBranch?.sales_manager_name || ''),
            sales_manager_mobile: r['SM Mobile'] || r['sales_manager_mobile'] || r['SM Number'] || (existingBranch?.sales_manager_mobile || ''),
            area_sales_manager_name: r['ASM Name'] || r['area_sales_manager_name'] || r['ASM'] || (existingBranch?.area_sales_manager_name || ''),
            area_sales_manager_mobile: r['ASM Mobile'] || r['area_sales_manager_mobile'] || r['ASM Number'] || (existingBranch?.area_sales_manager_mobile || ''),
            product: finalProduct || (existingBranch?.product || ''),
            status: r['Status'] || r['status'] || (existingBranch?.status || 'active'),
            product_id: productId
          };

          if (existingBranch) {
            updatedCount++;
            return fetch(`${API}/banks/${branch.bank_id}/branches/${existingBranch.id}`, {
              method: 'PUT',
              headers: { ...authHeader(), 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          } else {
            createdCount++;
            return fetch(`${API}/banks/${branch.bank_id}/branches`, {
              method: 'POST',
              headers: { ...authHeader(), 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          }
        }).filter(p => p !== null);

        const results = await Promise.all(promises);
        const successResults = results.filter(res => res?.ok);
        if (successResults.length > 0) {
          try {
            const jsonList = await Promise.all(successResults.map(r => r?.json()));
            const bIds = jsonList.map((j: any) => j?.id || j?.data?.id).filter(Boolean);
            if (bIds.length > 0) {
              setProductBranchIds(prev => Array.from(new Set([...(prev || []), ...bIds])));
              await syncBranchIdsToProduct(bIds);
            }
          } catch (e) {}

          const msgParts = [];
          if (createdCount > 0) msgParts.push(`${createdCount} new created`);
          if (updatedCount > 0) msgParts.push(`${updatedCount} existing updated`);
          toast.success(`Import complete: ${msgParts.join(', ')}`);
          fetchExistingBranches();
          onSuccess();
        } else {
          toast.error('Failed to import branches from Excel');
        }
      } catch (err: any) {
        console.error('Import error:', err);
        toast.error('Error parsing Excel file');
      } finally {
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const getStateName = (b: any) => {
    const val = b?.state || b?.state_name;
    if (val && typeof val === 'string' && val.trim() !== '') {
      return val.trim();
    }
    return '—';
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-3 sm:p-5">
      {/* Ensure Google Maps autocomplete is visible above the modal */}
      <style>{`
        .pac-container {
          z-index: 9999 !important;
          width: 400px !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
          border: 1px solid #e2e8f0 !important;
          margin-top: 4px !important;
          padding: 4px 0 !important;
          font-family: inherit !important;
        }
        .pac-container:after {
          /* Remove Powered by Google text */
          content: none !important;
          display: none !important;
          height: 0 !important;
          padding: 0 !important;
        }
        .pac-item {
          padding: 8px 12px !important;
          cursor: pointer !important;
          border-top: 1px solid #f1f5f9 !important;
          color: #475569 !important;
        }
        .pac-item:first-child {
          border-top: none !important;
        }
        .pac-item:hover {
          background-color: #f1f5f9 !important;
        }
        .pac-item-query {
          color: #0f172a !important;
          font-size: 13px !important;
        }
      `}</style>
      <div ref={containerRef} className="bg-white rounded-lg shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden border-2 border-gray-300">
        <div className="px-4 py-2 border-b flex flex-wrap justify-between items-center bg-[#f8f9fa] gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-xs font-black uppercase tracking-tight text-gray-700">Bank Branch Master - Excel Layout</h2>
            {selectedSubcategory && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                Filtered for: {selectedSubcategory}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showExcelActions && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-xs font-semibold bg-white hover:bg-gray-100 transition-colors shadow-2xs cursor-pointer"
                  title="Download Excel Import Template"
                >
                  <Download size={13} className="text-gray-500" />
                  <span>Template</span>
                </button>

                <label
                  htmlFor="branch-excel-import"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-500 text-blue-600 text-xs font-bold bg-white hover:bg-blue-50 transition-colors cursor-pointer shadow-2xs"
                  title="Import Branches from Excel"
                >
                  <Upload size={13} />
                  <span>Import Excel</span>
                  <input
                    ref={importExcelRef}
                    id="branch-excel-import"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleImportExcel}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
                  title="Export Branches to Excel"
                >
                  <Download size={13} />
                  <span>Export Excel</span>
                </button>
              </>
            )}

            <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors ml-2 cursor-pointer">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white p-0">
          <Table className="border-collapse w-full text-[11px]">
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-[#e9ecef] hover:bg-[#e9ecef]">
                <TableHead className="w-10 border-r border-b border-gray-300 text-black font-black text-center p-1">Sr.</TableHead>
                <TableHead className="w-40 border-r border-b border-gray-300 text-black font-black p-1">Branch Name</TableHead>
                <TableHead className="w-32 border-r border-b border-gray-300 text-black font-black p-1">State Name</TableHead>
                <TableHead className="w-40 border-r border-b border-gray-300 text-black font-black p-1">Location</TableHead>
                <TableHead className="w-16 border-r border-b border-gray-300 text-black font-black p-1 text-center">Geo</TableHead>
                <TableHead className="w-32 border-r border-b border-gray-300 text-black font-black p-1">SM Name</TableHead>
                <TableHead className="w-24 border-r border-b border-gray-300 text-black font-black p-1">SM Mobile</TableHead>
                <TableHead className="w-32 border-r border-b border-gray-300 text-black font-black p-1">ASM Name</TableHead>
                <TableHead className="w-24 border-r border-b border-gray-300 text-black font-black p-1">ASM Mobile</TableHead>
                {isPersonalOrBusiness ? (
                  <>
                    <TableHead className="w-24 border-r border-b border-gray-300 text-black font-black p-1 text-center bg-blue-50">Fresh</TableHead>
                    <TableHead className="w-28 border-r border-b border-gray-300 text-black font-black p-1 text-center bg-blue-50">BT/Top Up</TableHead>
                  </>
                ) : isUsedCar ? (
                  <>
                    <TableHead className="w-24 border-r border-b border-gray-300 text-black font-black p-1 text-center bg-blue-50">New Car Purchase</TableHead>
                    <TableHead className="w-24 border-r border-b border-gray-300 text-black font-black p-1 text-center bg-blue-50">Used Car Purchase</TableHead>
                    <TableHead className="w-28 border-r border-b border-gray-300 text-black font-black p-1 text-center bg-blue-50">Used Car Refinanced</TableHead>
                    <TableHead className="w-28 border-r border-b border-gray-300 text-black font-black p-1 text-center bg-blue-50">Used Car BT/Top Up</TableHead>
                  </>
                ) : null}
                <TableHead className="w-20 border-r border-b border-gray-300 text-black font-black p-1 text-center">Status</TableHead>
                <TableHead className="w-20 border-b border-gray-300 text-black font-black p-1 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBranches.length === 0 && existingBranches.length > 0 ? (
                <TableRow>
                  <TableCell colSpan={isPersonalOrBusiness ? 13 : isUsedCar ? 15 : 11} className="text-center py-8 text-gray-400 font-semibold text-xs">
                    No branches found matching the selected Category / Subcategory.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBranches.map((b, i) =>
                  editingId === b.id ? (
                    /* EDITING ROW */
                    <TableRow key={b.id} className="bg-green-50 border-b border-gray-300 h-10">
                      <TableCell className="border-r border-gray-300 text-center p-1 bg-green-100/50 font-bold">{i + 1}</TableCell>
                      <TableCell className="border-r border-gray-300 p-1">
                        <input 
                          className="w-full h-7 border border-gray-300 px-1 bg-white focus:outline-blue-500" 
                          value={editData.branch_name} 
                          onChange={(e) => updateEditField('branch_name', e.target.value)}
                          tabIndex={editData.branch_name ? -1 : 0}
                        />
                      </TableCell>
                      <TableCell className="border-r border-gray-300 p-1">
                        <input 
                          className="w-full h-7 border border-gray-300 px-1 bg-white focus:outline-blue-500" 
                          value={editData.state || editData.state_name || ''} 
                          onChange={(e) => updateEditField('state', e.target.value)}
                          placeholder="State Name"
                          tabIndex={editData.state || editData.state_name ? -1 : 0}
                        />
                      </TableCell>
                      <TableCell className="border-r border-gray-300 p-1">
                        <LocationInput 
                          value={editData.location} 
                          onChange={(val) => updateEditField('location', val)}
                          tabIndex={editData.location ? -1 : 0}
                        />
                      </TableCell>
                      <TableCell className="border-r border-gray-300 p-1">
                        <input 
                          className="w-full h-7 border border-gray-300 px-1 bg-white text-center focus:outline-blue-500" 
                          value={editData.geo_limit} 
                          onChange={(e) => updateEditField('geo_limit', e.target.value)}
                          tabIndex={editData.geo_limit ? -1 : 0}
                        />
                      </TableCell>
                      <TableCell className="border-r border-gray-300 p-1">
                        <input 
                          className="w-full h-7 border border-gray-300 px-1 bg-white focus:outline-blue-500" 
                          value={editData.sales_manager_name} 
                          onChange={(e) => updateEditField('sales_manager_name', e.target.value)}
                          tabIndex={editData.sales_manager_name ? -1 : 0}
                        />
                      </TableCell>
                      <TableCell className="border-r border-gray-300 p-1">
                        <input 
                          className="w-full h-7 border border-gray-300 px-1 bg-white focus:outline-blue-500" 
                          value={editData.sales_manager_mobile} 
                          onChange={(e) => updateEditField('sales_manager_mobile', e.target.value)} 
                          maxLength={10}
                          tabIndex={editData.sales_manager_mobile ? -1 : 0}
                        />
                      </TableCell>
                      <TableCell className="border-r border-gray-300 p-1">
                        <input 
                          className="w-full h-7 border border-gray-300 px-1 bg-white focus:outline-blue-500" 
                          value={editData.area_sales_manager_name} 
                          onChange={(e) => updateEditField('area_sales_manager_name', e.target.value)}
                          tabIndex={editData.area_sales_manager_name ? -1 : 0}
                        />
                      </TableCell>
                      <TableCell className="border-r border-gray-300 p-1">
                        <input 
                          className="w-full h-7 border border-gray-300 px-1 bg-white focus:outline-blue-500" 
                          value={editData.area_sales_manager_mobile} 
                          onChange={(e) => updateEditField('area_sales_manager_mobile', e.target.value)} 
                          maxLength={10}
                          tabIndex={editData.area_sales_manager_mobile ? -1 : 0}
                        />
                      </TableCell>
                      {isPersonalOrBusiness ? (
                        <>
                          <TableCell className="border-r border-gray-300 p-1 text-center bg-blue-100/20"><input type="checkbox" checked={editData.fresh || false} onChange={(e) => updateEditField('fresh', e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" /></TableCell>
                          <TableCell className="border-r border-gray-300 p-1 text-center bg-blue-100/20"><input type="checkbox" checked={editData.bt_top_up || false} onChange={(e) => updateEditField('bt_top_up', e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" /></TableCell>
                        </>
                      ) : isUsedCar ? (
                        <>
                          <TableCell className="border-r border-gray-300 p-1 text-center bg-blue-100/20"><input type="checkbox" checked={editData.new_car_purchase} onChange={(e) => updateEditField('new_car_purchase', e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" /></TableCell>
                          <TableCell className="border-r border-gray-300 p-1 text-center bg-blue-100/20"><input type="checkbox" checked={editData.used_car_purchase} onChange={(e) => updateEditField('used_car_purchase', e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" /></TableCell>
                          <TableCell className="border-r border-gray-300 p-1 text-center bg-blue-100/20"><input type="checkbox" checked={editData.used_car_refinance_up} onChange={(e) => updateEditField('used_car_refinance_up', e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" /></TableCell>
                          <TableCell className="border-r border-gray-300 p-1 text-center bg-blue-100/20"><input type="checkbox" checked={editData.used_car_bt_top_up} onChange={(e) => updateEditField('used_car_bt_top_up', e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" /></TableCell>
                        </>
                      ) : null}
                      <TableCell className="border-r border-gray-300 p-1">
                        <select className="w-full h-7 border border-gray-300 bg-white" value={editData.status} onChange={(e) => updateEditField('status', e.target.value)}>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </TableCell>
                      <TableCell className="p-1 text-center">
                        <div className="flex justify-center gap-1">
                          <button tabIndex={-1} onClick={() => handleUpdateSave(b.id)} className="text-green-600 hover:text-green-800"><Check size={16} /></button>
                          <button tabIndex={-1} onClick={cancelEdit} className="text-red-500 hover:text-red-700"><X size={16} /></button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    /* VIEWING ROW */
                    <TableRow key={b.id} className="hover:bg-gray-100/50 border-b border-gray-200 h-8 select-text">
                      <TableCell className="border-r border-gray-200 text-center p-1 bg-[#f8f9fa]">{i + 1}</TableCell>
                      <TableCell className="border-r border-gray-200 p-1 font-bold">{b.branch_name}</TableCell>
                      <TableCell className="border-r border-gray-200 p-1 font-medium">{getStateName(b)}</TableCell>
                      <TableCell className="border-r border-gray-200 p-1 truncate max-w-[150px]">{b.location}</TableCell>
                      <TableCell className="border-r border-gray-200 p-1 text-center">{b.geo_limit || '-'}</TableCell>
                      <TableCell className="border-r border-gray-200 p-1">{b.sales_manager_name}</TableCell>
                      <TableCell className="border-r border-gray-200 p-1">{b.sales_manager_mobile}</TableCell>
                      <TableCell className="border-r border-gray-200 p-1">{b.area_sales_manager_name}</TableCell>
                      <TableCell className="border-r border-gray-200 p-1">{b.area_sales_manager_mobile}</TableCell>
                      {isPersonalOrBusiness ? (
                        <>
                          <TableCell className="border-r border-gray-200 p-1 text-center">
                            <input type="checkbox" readOnly tabIndex={-1}
                              checked={b.product?.includes('Fresh') || false}
                              className={`w-4 h-4 accent-blue-600 cursor-default ${b.product?.includes('Fresh') ? 'opacity-100' : 'opacity-40'}`} />
                          </TableCell>
                          <TableCell className="border-r border-gray-200 p-1 text-center">
                            <input type="checkbox" readOnly tabIndex={-1}
                              checked={b.product?.includes('BT/Top Up') || b.product?.includes('BT / Top Up') || false}
                              className={`w-4 h-4 accent-blue-600 cursor-default ${(b.product?.includes('BT/Top Up') || b.product?.includes('BT / Top Up')) ? 'opacity-100' : 'opacity-40'}`} />
                          </TableCell>
                        </>
                      ) : isUsedCar ? (
                        <>
                          <TableCell className="border-r border-gray-200 p-1 text-center">
                            <input type="checkbox" readOnly tabIndex={-1}
                              checked={b.product?.includes('New Car Purchase') || false}
                              className={`w-4 h-4 accent-blue-600 cursor-default ${b.product?.includes('New Car Purchase') ? 'opacity-100' : 'opacity-40'}`} />
                          </TableCell>
                          <TableCell className="border-r border-gray-200 p-1 text-center">
                            <input type="checkbox" readOnly tabIndex={-1}
                              checked={b.product?.includes('Used Car Purchase') || false}
                              className={`w-4 h-4 accent-blue-600 cursor-default ${b.product?.includes('Used Car Purchase') ? 'opacity-100' : 'opacity-40'}`} />
                          </TableCell>
                          <TableCell className="border-r border-gray-200 p-1 text-center">
                            <input type="checkbox" readOnly tabIndex={-1}
                              checked={b.product?.includes('Used Car Refinance Up') || b.product?.includes('Used Car Refinanced') || false}
                              className={`w-4 h-4 accent-blue-600 cursor-default ${(b.product?.includes('Used Car Refinance Up') || b.product?.includes('Used Car Refinanced')) ? 'opacity-100' : 'opacity-40'}`} />
                          </TableCell>
                          <TableCell className="border-r border-gray-200 p-1 text-center">
                            <input type="checkbox" readOnly tabIndex={-1}
                              checked={b.product?.includes('Used Car BT/Top Up') || false}
                              className={`w-4 h-4 accent-blue-600 cursor-default ${b.product?.includes('Used Car BT/Top Up') ? 'opacity-100' : 'opacity-40'}`} />
                          </TableCell>
                        </>
                      ) : null}
                      <TableCell className="border-r border-gray-200 p-1 text-center">
                        <span className={`text-[9px] px-1 rounded font-black uppercase ${b.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>{b.status}</span>
                      </TableCell>
                      <TableCell className="p-1 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => startEditing(b)} tabIndex={-1} className="text-blue-400 hover:text-blue-600"><Edit size={14} /></button>
                          <button onClick={() => handleDelete(b.id)} tabIndex={-1} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )
              )}

              {/* Input Rows at the bottom */}
              {isAdding && branchesToSave.map((b, idx) => (
                <TableRow key={idx} className="bg-yellow-50/50 border-b border-gray-300 h-10">
                  <TableCell className="border-r border-gray-300 text-center p-1 bg-yellow-100/50 font-bold">{filteredBranches.length + idx + 1}</TableCell>
                  <TableCell className="border-r border-gray-300 p-1">
                    <input 
                      className="w-full h-7 border border-gray-300 px-1 bg-white focus:outline-blue-500" 
                      value={b.branch_name} 
                      onChange={(e) => updateField(idx, 'branch_name', e.target.value)} 
                      placeholder="Enter Name"
                      tabIndex={b.branch_name ? -1 : 0}
                    />
                  </TableCell>
                  <TableCell className="border-r border-gray-300 p-1">
                    <input 
                      className="w-full h-7 border border-gray-300 px-1 bg-white focus:outline-blue-500" 
                      value={b.state || b.state_name || ''} 
                      onChange={(e) => updateField(idx, 'state', e.target.value)} 
                      placeholder="State Name"
                      tabIndex={b.state || b.state_name ? -1 : 0}
                    />
                  </TableCell>
                  <TableCell className="border-r border-gray-300 p-1">
                    <LocationInput 
                      value={b.location} 
                      onChange={(val) => updateField(idx, 'location', val)} 
                      placeholder="Entry"
                      tabIndex={b.location ? -1 : 0}
                    />
                  </TableCell>
                  <TableCell className="border-r border-gray-300 p-1">
                    <input 
                      className="w-full h-7 border border-gray-300 px-1 bg-white text-center focus:outline-blue-500" 
                      value={b.geo_limit} 
                      onChange={(e) => updateField(idx, 'geo_limit', e.target.value)} 
                      placeholder="KM"
                      tabIndex={b.geo_limit ? -1 : 0}
                    />
                  </TableCell>
                  <TableCell className="border-r border-gray-300 p-1">
                    <input 
                      className="w-full h-7 border border-gray-300 px-1 bg-white focus:outline-blue-500" 
                      value={b.sales_manager_name} 
                      onChange={(e) => updateField(idx, 'sales_manager_name', e.target.value)} 
                      placeholder="Name"
                      tabIndex={b.sales_manager_name ? -1 : 0}
                    />
                  </TableCell>
                  <TableCell className="border-r border-gray-300 p-1">
                    <input 
                      className="w-full h-7 border border-gray-300 px-1 bg-white focus:outline-blue-500" 
                      value={b.sales_manager_mobile} 
                      onChange={(e) => updateField(idx, 'sales_manager_mobile', e.target.value)} 
                      placeholder="99XXXX" 
                      maxLength={10}
                      tabIndex={b.sales_manager_mobile ? -1 : 0}
                    />
                  </TableCell>
                  <TableCell className="border-r border-gray-300 p-1">
                    <input 
                      className="w-full h-7 border border-gray-300 px-1 bg-white focus:outline-blue-500" 
                      value={b.area_sales_manager_name} 
                      onChange={(e) => updateField(idx, 'area_sales_manager_name', e.target.value)} 
                      placeholder="Name"
                      tabIndex={b.area_sales_manager_name ? -1 : 0}
                    />
                  </TableCell>
                  <TableCell className="border-r border-gray-300 p-1">
                    <input 
                      className="w-full h-7 border border-gray-300 px-1 bg-white focus:outline-blue-500" 
                      value={b.area_sales_manager_mobile} 
                      onChange={(e) => updateField(idx, 'area_sales_manager_mobile', e.target.value)} 
                      placeholder="99XXXX" 
                      maxLength={10}
                      tabIndex={b.area_sales_manager_mobile ? -1 : 0}
                    />
                  </TableCell>
                  {isPersonalOrBusiness ? (
                    <>
                      <TableCell className="border-r border-gray-300 p-1 text-center bg-blue-100/20"><input type="checkbox" checked={b.fresh || false} onChange={(e) => updateField(idx, 'fresh', e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" /></TableCell>
                      <TableCell className="border-r border-gray-300 p-1 text-center bg-blue-100/20"><input type="checkbox" checked={b.bt_top_up || false} onChange={(e) => updateField(idx, 'bt_top_up', e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" /></TableCell>
                    </>
                  ) : isUsedCar ? (
                    <>
                      <TableCell className="border-r border-gray-300 p-1 text-center bg-blue-100/20"><input type="checkbox" checked={b.new_car_purchase} onChange={(e) => updateField(idx, 'new_car_purchase', e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" /></TableCell>
                      <TableCell className="border-r border-gray-300 p-1 text-center bg-blue-100/20"><input type="checkbox" checked={b.used_car_purchase} onChange={(e) => updateField(idx, 'used_car_purchase', e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" /></TableCell>
                      <TableCell className="border-r border-gray-300 p-1 text-center bg-blue-100/20"><input type="checkbox" checked={b.used_car_refinance_up} onChange={(e) => updateField(idx, 'used_car_refinance_up', e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" /></TableCell>
                      <TableCell className="border-r border-gray-300 p-1 text-center bg-blue-100/20"><input type="checkbox" checked={b.used_car_bt_top_up} onChange={(e) => updateField(idx, 'used_car_bt_top_up', e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" /></TableCell>
                    </>
                  ) : null}
                  <TableCell className="border-r border-gray-300 p-1">
                    <select className="w-full h-7 border border-gray-300 bg-white" value={b.status} onChange={(e) => updateField(idx, 'status', e.target.value)}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </TableCell>
                  <TableCell className="p-1 text-center">
                    <button tabIndex={-1} onClick={() => setBranchesToSave(prev => prev.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="p-2 border-t bg-[#f1f3f5] flex justify-between items-center h-12">
          {!isAdding ? (
            <div className="flex gap-2">
              <Button onClick={handleStartAdding} size="sm" className="bg-[#1a73e8] text-[11px] font-bold h-8 px-4 rounded-none shadow-sm hover:bg-blue-700"><Plus size={14} className="mr-1" /> CREATE NEW BRANCH(ES)</Button>
              <Button onClick={onClose} variant="outline" size="sm" className="text-[11px] font-bold h-8 px-4 rounded-none border-gray-400">CLOSE MANAGER</Button>
            </div>
          ) : (
            <div className="flex gap-2 w-full justify-between">
              <div className="flex gap-2">
                <Button onClick={handleAddMoreRow} size="sm" variant="outline" className="text-[11px] font-bold h-8 px-4 rounded-none border-blue-500 text-blue-600 hover:bg-blue-50">ADD NEW ROW (+)</Button>
                <Button onClick={() => setIsAdding(false)} size="sm" variant="ghost" className="text-[11px] font-bold h-8 px-4 text-gray-500">DISCARD INPUTS</Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveAll} size="sm" className="bg-green-600 text-white text-[11px] font-bold h-8 px-6 rounded-none border border-green-700 shadow-sm hover:bg-green-700">SAVE ALL NEW ENTRIES</Button>
                <Button onClick={onClose} variant="outline" size="sm" className="text-[11px] font-bold h-8 px-4 rounded-none border-gray-400 text-red-500">STOP ADDING</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

