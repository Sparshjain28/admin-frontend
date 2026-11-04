import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/mock-data';
import { Building2, Search, Plus, TrendingUp, FileText, Edit, ChevronDown, ChevronUp, MapPin, Phone, User, X, Pencil, Upload, Download, Save } from 'lucide-react';
import { BankFormModal } from '@/components/BankFormModal';
import { BankImportModal } from '@/components/BankImportModal';
import { BranchFormTable } from '@/components/BranchFormTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_BASE = API.replace('/api', '');
const authHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` });

interface BranchData {
  id?: number;
  sr_no: number;
  branch_name: string;
  state?: string;
  location: string;
  geo_limit: string;
  sm_name: string;
  sm_number: string;
  asm_name: string;
  asm_number: string;
  new_car_loan: boolean;
  used_car_loan: boolean;
  used_car_purchase: boolean;
  used_refinance: boolean;
  used_bt: boolean;
  bank_name: string;
  bank_id: number;
  status: 'active' | 'inactive';
  isEditing?: boolean;
}

// Branch Dialog Component - Uses tabular form
function BranchDialog({ branch, onClose, onSuccess, banks }: { branch: any; onClose: () => void; onSuccess: () => void; banks: any[] }) {
  return (
    <BranchFormTable
      branch={branch}
      banks={banks}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

// Branches List Dialog Component
function BranchesListDialog({ bankId, onClose, banks }: { bankId: number; onClose: () => void; banks: any[] }) {
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');

  const { data: branches = [], isLoading, refetch } = useQuery({
    queryKey: ['bank-branches', bankId],
    queryFn: async () => {
      const res = await fetch(`${API}/banks/${bankId}/branches`, { headers: authHeader() });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const currentBank = useMemo(() => {
    return banks?.find((b: any) => Number(b.id) === Number(bankId)) || null;
  }, [banks, bankId]);

  const availableCategories = useMemo(() => {
    const catsSet = new Set<string>();
    if (currentBank?.category) {
      const bCats = Array.isArray(currentBank.category) ? currentBank.category : [currentBank.category];
      bCats.forEach((c: any) => {
        const cStr = String(c).trim();
        if (cStr) {
          if (cStr.toLowerCase() === 'loan') catsSet.add('Loan');
          else if (cStr.toLowerCase().includes('credit')) catsSet.add('Credit Card');
          else catsSet.add(cStr);
        }
      });
    }

    branches.forEach((b: any) => {
      const prod = (b.product || '').toLowerCase();
      if (prod.includes('credit card') || prod.includes('cc')) {
        catsSet.add('Credit Card');
      }
      if (
        b.new_car_purchase || b.used_car_purchase || b.used_car_refinance_up || b.used_car_bt_top_up ||
        prod.includes('car') || prod.includes('loan') || prod.includes('ucl')
      ) {
        catsSet.add('Loan');
      }
    });

    if (catsSet.size === 0) {
      catsSet.add('Loan');
      catsSet.add('Credit Card');
    }
    return Array.from(catsSet);
  }, [currentBank, branches]);

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
    }

    branches.forEach((b: any) => {
      if (b.product) {
        const prods = b.product.split(',').map((p: string) => p.trim());
        prods.forEach((p: string) => {
          if (p) {
            if (p.toLowerCase().includes('used car')) subSet.add('Used Car Loan');
            else if (p.toLowerCase().includes('new car')) subSet.add('New Car Loan');
            else subSet.add(p);
          }
        });
      }
    });

    return Array.from(subSet);
  }, [selectedCategory, currentBank, branches]);

  const filteredBranches = useMemo(() => {
    return branches.filter((b: any) => {
      if (selectedCategory && selectedCategory !== 'all') {
        const catLower = selectedCategory.toLowerCase();
        const prodLower = (b.product || '').toLowerCase();
        if (catLower === 'loan') {
          if (prodLower === 'credit card' || prodLower === 'cc') return false;
        } else if (catLower === 'credit card' || catLower === 'credit_card') {
          if (!prodLower.includes('credit card') && !prodLower.includes('credit_card') && !prodLower.includes('cc')) return false;
        } else {
          if (!prodLower.includes(catLower)) return false;
        }
      }

      if (selectedSubcategory && selectedSubcategory !== 'all') {
        const subLower = selectedSubcategory.toLowerCase();
        const prodLower = (b.product || '').toLowerCase();
        if (subLower.includes('used car')) {
          const matches = prodLower.includes('used car') || prodLower.includes('ucl') || b.used_car_purchase || b.used_car_refinance_up || b.used_car_bt_top_up;
          if (!matches) return false;
        } else if (subLower.includes('new car')) {
          const matches = prodLower.includes('new car') || b.new_car_purchase;
          if (!matches) return false;
        } else {
          if (!prodLower.includes(subLower)) return false;
        }
      }

      return true;
    });
  }, [branches, selectedCategory, selectedSubcategory]);

  if (isLoading) return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl p-6">
        <p className="text-muted-foreground">Loading branches...</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-[10000]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between p-6 border-b border-border sticky top-0 bg-background gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-xl font-bold text-foreground">Bank Branches</h2>
            
            {/* Category & Subcategory Filter */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-muted/50 border border-border rounded px-2 py-1 text-xs">
                <span className="font-semibold text-muted-foreground">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubcategory('all');
                  }}
                  className="bg-transparent font-medium text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className={`flex items-center gap-1.5 bg-muted/50 border border-border rounded px-2 py-1 text-xs ${(!selectedCategory || selectedCategory === 'all') ? 'opacity-50' : ''}`}>
                <span className="font-semibold text-muted-foreground">Subcategory:</span>
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  disabled={!selectedCategory || selectedCategory === 'all'}
                  className="bg-transparent font-medium text-foreground focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                >
                  <option value="all">All Subcategories</option>
                  {availableSubcategories.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {filteredBranches.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {branches.length === 0 ? "No branches added yet." : "No branches found matching the selected Category / Subcategory."}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredBranches.map((b: any) => (
                <div
                  key={b.id}
                  className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-foreground">{b.branch_name}</span>
                        <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${b.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
                          }`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                        {b.location && <span className="flex items-center gap-1"><MapPin size={10} />{b.location}</span>}
                        {b.geo_limit && <span>Geo: {b.geo_limit} km</span>}
                        {b.product && <span className="col-span-2">Product: {b.product}</span>}
                        {b.sales_manager_name && (
                          <span className="flex items-center gap-1 col-span-2">
                            <User size={10} /> SM: {b.sales_manager_name}
                            {b.sales_manager_mobile && <span className="flex items-center gap-1 ml-2"><Phone size={10} />{b.sales_manager_mobile}</span>}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border sticky bottom-0 bg-background">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted text-sm font-medium">
            Close
          </button>
        </div>
      </div>

      {selectedBranch && (
        <BranchDialog
          branch={selectedBranch}
          onClose={() => setSelectedBranch(null)}
          onSuccess={refetch}
          banks={banks}
        />
      )}
    </div>
  );
}

export default function BankManagement() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editBank, setEditBank] = useState<any>(null);
  const [branchesDialogOpen, setBranchesDialogOpen] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [editingRow, setEditingRow] = useState<number | null>(null);

  const { data: banks = [], isLoading, refetch } = useQuery({
    queryKey: ['banks'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banks`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch banks');
      return res.json();
    },
  });

  // Fetch all branches for Excel view
  const { data: allBranches = [], refetch: refetchBranches } = useQuery({
    queryKey: ['all-branches'],
    queryFn: async () => {
      const allBranchesData = [];
      for (const bank of banks) {
        try {
          const res = await fetch(`${API}/banks/${bank.id}/branches`, { headers: authHeader() });
          if (res.ok) {
            const bankBranches = await res.json();
            allBranchesData.push(...bankBranches.map(branch => ({ ...branch, bank_id: bank.id, bank_name: bank.name })));
          }
        } catch (error) {
        }
      }
      return allBranchesData;
    },
    enabled: banks.length > 0
  });

  // Format branches data for Excel view
  useEffect(() => {
    if (allBranches.length > 0) {
      const formattedBranches: BranchData[] = allBranches.map((branch: any, index: number) => {
        const products = branch.product ? branch.product.split(', ') : [];
        const stateName = branch.state || branch.state_name || '';

        return {
          id: branch.id,
          sr_no: index + 1,
          branch_name: branch.branch_name || '',
          state: stateName,
          location: branch.location || '',
          geo_limit: branch.geo_limit || '',
          sm_name: branch.sales_manager_name || '',
          sm_number: branch.sales_manager_mobile || '',
          asm_name: branch.area_sales_manager_name || '',
          asm_number: branch.area_sales_manager_mobile || '',
          new_car_loan: products.includes('New Car Purchase'),
          used_car_loan: products.includes('Used Car Purchase'),
          used_car_purchase: products.includes('Used Car Purchase'),
          used_refinance: products.includes('Used Car Refinance Up'),
          used_bt: products.includes('Used Car BT/Top Up'),
          bank_name: branch.bank_name || '',
          bank_id: branch.bank_id,
          status: branch.status || 'active',
          isEditing: false
        };
      });
      setBranches(formattedBranches);
    }
  }, [allBranches]);

  const { data: loans = [] } = useQuery({
    queryKey: ['loans-for-banks'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch loans');
      return res.json();
    },
  });

  const handleEdit = (index: number) => {
    setEditingRow(index);
    setBranches(prev => prev.map((branch, i) =>
      i === index ? { ...branch, isEditing: true } : { ...branch, isEditing: false }
    ));
  };

  const handleSave = async (index: number) => {
    const branch = branches[index];
    try {
      const products = [];
      if (branch.new_car_loan) products.push('New Car Purchase');
      if (branch.used_car_loan) products.push('Used Car Purchase');
      if (branch.used_refinance) products.push('Used Car Refinance Up');
      if (branch.used_bt) products.push('Used Car BT/Top Up');

      const updateData = {
        branch_name: branch.branch_name,
        location: branch.location,
        geo_limit: branch.geo_limit,
        sales_manager_name: branch.sm_name,
        sales_manager_mobile: branch.sm_number,
        area_sales_manager_name: branch.asm_name,
        area_sales_manager_mobile: branch.asm_number,
        product: products.join(', '),
        status: branch.status
      };

      let res;
      if (branch.id) {
        res = await fetch(`${API}/banks/${branch.bank_id}/branches/${branch.id}`, {
          method: 'PUT',
          headers: { ...authHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });
      } else {
        res = await fetch(`${API}/banks/${branch.bank_id}/branches`, {
          method: 'POST',
          headers: { ...authHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });
      }

      if (!res.ok) throw new Error('Failed to save branch');

      toast.success(branch.id ? 'Branch updated successfully' : 'Branch created successfully');

      setEditingRow(null);
      setBranches(prev => prev.map((b, i) =>
        i === index ? { ...b, isEditing: false } : b
      ));
      refetchBranches();
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCancel = (index: number) => {
    setEditingRow(null);
    setBranches(prev => prev.map((branch, i) =>
      i === index ? { ...branch, isEditing: false } : branch
    ));
    refetchBranches();
  };

  const handleInputChange = (index: number, field: keyof BranchData, value: any) => {
    setBranches(prev => prev.map((branch, i) =>
      i === index ? { ...branch, [field]: value } : branch
    ));
  };

  const handleAddNew = () => {
    const newBranch: BranchData = {
      sr_no: branches.length + 1,
      branch_name: '',
      location: '',
      geo_limit: '',
      sm_name: '',
      sm_number: '',
      asm_name: '',
      asm_number: '',
      new_car_loan: false,
      used_car_loan: false,
      used_car_purchase: false,
      used_refinance: false,
      used_bt: false,
      bank_name: '',
      bank_id: 0,
      status: 'active',
      isEditing: true
    };
    setBranches(prev => [...prev, newBranch]);
    setEditingRow(branches.length);
  };

  const downloadTemplate = () => {
    const headers = [
      'Sr No.', 'Branch Name', 'State Name', 'Location', 'Geo Limit',
      'SM Name', 'SM Number', 'ASM Name', 'ASM Number',
      'New Car Purchase', 'Used Car Purchase', 'Used Car Refinance Up', 'Used Car BT/Top Up',
      'Bank Name', 'Status'
    ];

    const sampleRows = [
      [
        1, 'Mumbai Main Branch', 'Mumbai, Maharashtra', 50,
        'John Doe', '9876543210', 'Jane Smith', '9876543211',
        'Yes', 'Yes', 'No', 'No',
        'HDFC Bank', 'active'
      ],
      [
        2, 'Delhi Central Branch', 'Delhi, New Delhi', 75,
        'Mike Johnson', '9876543212', 'Sarah Williams', '9876543213',
        'Yes', 'Yes', 'Yes', 'Yes',
        'ICICI Bank', 'active'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

    // Column widths
    ws['!cols'] = [
      { wch: 7 },  // Sr No.
      { wch: 22 }, // Branch Name
      { wch: 22 }, // Location
      { wch: 10 }, // Geo Limit
      { wch: 18 }, // SM Name
      { wch: 14 }, // SM Number
      { wch: 18 }, // ASM Name
      { wch: 14 }, // ASM Number
      { wch: 16 }, // New Car Purchase
      { wch: 16 }, // Used Car Purchase
      { wch: 20 }, // Used Car Refinance Up
      { wch: 18 }, // Used Car BT/Top Up
      { wch: 18 }, // Bank Name
      { wch: 10 }  // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Branch Import Template');
    XLSX.writeFile(wb, 'bank_branch_import_template.xlsx');
    toast.success('Template downloaded successfully');
  };

  const exportToExcel = () => {
    const exportData = branches.map(branch => ({
      'Sr No.': branch.sr_no,
      'Branch Name': branch.branch_name,
      'State Name': branch.state || '',
      'Location': branch.location,
      'Geo Limit': branch.geo_limit,
      'SM Name': branch.sm_name,
      'SM Number': branch.sm_number,
      'ASM Name': branch.asm_name,
      'ASM Number': branch.asm_number,
      'New Car Purchase': branch.new_car_loan ? 'Yes' : 'No',
      'Used Car Purchase': branch.used_car_loan ? 'Yes' : 'No',
      'Used Car Refinance Up': branch.used_refinance ? 'Yes' : 'No',
      'Used Car BT/Top Up': branch.used_bt ? 'Yes' : 'No',
      'Bank Name': branch.bank_name,
      'Status': branch.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Branches');
    XLSX.writeFile(wb, `bank_branches_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast.success('Excel file exported successfully');
  };

  const handleAddBank = () => {
    setEditBank(null);
    setModalOpen(true);
  };

  const handleEditBank = (bank: any) => {
    setEditBank(bank);
    setModalOpen(true);
  };

  const handleAddBranch = (bankId: number) => {
    const newBranch = {
      branch_name: '',
      location: '',
      geo_limit: '',
      sales_manager_name: '',
      sales_manager_mobile: '',
      area_sales_manager_name: '',
      area_sales_manager_mobile: '',
      product: '',
      status: 'active',
      bank_id: bankId
    };
    setBranchesDialogOpen(bankId);
    setTimeout(() => {
      // This will be handled by the dialog state
    }, 100);
  };

  const filtered = (banks as any[]).filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
  const filteredBranches = branches.filter(branch =>
    branch.branch_name.toLowerCase().includes(search.toLowerCase()) ||
    branch.bank_name.toLowerCase().includes(search.toLowerCase()) ||
    branch.location.toLowerCase().includes(search.toLowerCase())
  );
  const totalVolume = (loans as any[]).reduce((s, l) => s + Number(l.loan_amount), 0);
  const totalCases = loans.length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lender Management</h1>
          {/* <p className="text-muted-foreground text-sm mt-1">Manage lending partners and track performance</p> */}
        </div>
        <div className="flex gap-2">
          {/* <button onClick={downloadTemplate} className="flex items-center gap-2 bg-muted text-foreground font-semibold py-2.5 px-4 rounded-xl hover:bg-muted/80 transition-colors text-sm">
            <FileText size={16} /> Template
          </button> */}
          {/* <button onClick={exportToExcel} className="flex items-center gap-2 bg-muted text-foreground font-semibold py-2.5 px-4 rounded-xl hover:bg-muted/80 transition-colors text-sm">
            <Download size={16} /> Export Excel
          </button> */}
          {/* <button onClick={() => setImportModalOpen(true)} className="flex items-center gap-2 bg-muted text-foreground font-semibold py-2.5 px-4 rounded-xl hover:bg-muted/80 transition-colors text-sm">
            <Upload size={16} /> Import
          </button> */}
          <button onClick={handleAddBank} className="flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm">
            <Plus size={16} /> Add Lender
          </button>
        </div>
      </div>

      {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><Building2 size={20} className="text-accent" /></div>
          <div><p className="text-2xl font-bold text-foreground">{banks.length}</p><p className="text-xs text-muted-foreground">Active Banks</p></div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><FileText size={20} className="text-accent" /></div>
          <div><p className="text-2xl font-bold text-foreground">{totalCases}</p><p className="text-xs text-muted-foreground">Total Cases</p></div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><TrendingUp size={20} className="text-accent" /></div>
          <div><p className="text-2xl font-bold text-foreground">{formatCurrency(totalVolume)}</p><p className="text-xs text-muted-foreground">Total Volume</p></div>
        </div>
      </div> */}

      <div className="stat-card mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search banks..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent" />
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground text-sm">Loading banks…</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bank: any) => {
            const bankLoans = (loans as any[]).filter(l => l.assigned_bank_id === bank.id);
            const disbursed = bankLoans.filter(l => l.status === 'disbursed').length;
            const branchCount = bank.branches ? bank.branches.length : 0;
            const logoUrl = bank.logo_url
              ? (bank.logo_url.startsWith('http') ? bank.logo_url : `${API_BASE}/${bank.logo_url.replace(/^\//, '')}`)
              : '';
            const isActive = bank.status === 'active';

            return (
              <div
                key={bank.id}
                onClick={() => navigate('/product-management', { state: { bankId: bank.id, bankName: bank.name } })}
                className="flex items-center justify-between p-4 bg-card border border-border/80 rounded-xl hover:border-accent/50 transition-colors cursor-pointer shadow-xs gap-4 flex-wrap sm:flex-nowrap"
              >
                {/* Left Section: Logo, Name & Active Badge */}
                <div className="flex items-center gap-3 min-w-[240px]">
                  <div className="w-12 h-12 rounded-full border border-border bg-background p-1 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={bank.name}
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-bold text-foreground text-base leading-tight">
                      {bank.name}
                    </h3>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${isActive ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Right-aligned Metrics (Cases, Disbursed, Branches) */}
                <div className="flex items-center gap-8 sm:gap-12 text-center my-2 sm:my-0 sm:ml-auto sm:mr-6">
                  <div>
                    <p className="text-sm font-bold text-foreground">{bankLoans.length}</p>
                    <p className="text-[11px] text-muted-foreground font-medium">Cases</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{disbursed}</p>
                    <p className="text-[11px] text-muted-foreground font-medium">Disbursed</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{branchCount}</p>
                    <p className="text-[11px] text-muted-foreground font-medium">Branches</p>
                  </div>
                </div>

                {/* Far Right Section: View Product Button & Edit Icon */}
                <div className="flex items-center gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => navigate('/product-management', { state: { bankId: bank.id, bankName: bank.name } })}
                    className="px-4 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
                  >
                    View Product
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditBank(bank)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-foreground"
                    title="Edit Lender"
                  >
                    <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No banks found</p>}
        </div>
      )}

      <BankFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={refetch} bank={editBank} />
      {branchesDialogOpen && (
        <BranchesListDialog
          bankId={branchesDialogOpen}
          onClose={() => setBranchesDialogOpen(null)}
          banks={banks}
        />
      )}
      <BankImportModal open={importModalOpen} onClose={() => setImportModalOpen(false)} onSuccess={refetch} />
    </div>
  );
}

