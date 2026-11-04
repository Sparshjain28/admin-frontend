import React, { useState, useEffect } from 'react';
import { Search, Save, Car, FileText, User, AlertTriangle, Loader2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { HierarchyDropdown } from '@/components/HierarchyDropdown';

export default function OfflineDisbursement() {
  const [formData, setFormData] = useState({
    // Customer Details
    disbursementDate: '',
    createdDate: '',
    sourcingPersonName: '',
    puccValidUpto: '',
    registeredAt: '',
    customerName: '',
    mobileNumber: '',

    // Vehicle Details
    rcNumber: '',
    engineNumber: '',
    chassisNumber: '',
    ownerName: '',
    makerDescription: '',
    makerModel: '',
    fuelType: '',
    insuranceCompany: '',
    insuranceValidDate: '',
    manufacturingDate: '',
    rtoValidUpto: '',
    financier: '',
    financedStatus: '',
    ownershipType: '',

    // Loan Details
    caseType: '',
    financeName: '',
    loanAmount: '',
    loanAccountNumber: '',
    roi: '',
    tenure: '',

    // RC Collection 
    rcCollectionMethod: 'Self',
    rcCollectionName: '',
    rcCollectionNumber: '',
    rcType: 'Physical', // Physical or Digital
  });

  const [loadingSearch, setLoadingSearch] = useState(false);
  const [isVehicleFetched, setIsVehicleFetched] = useState(false);
  const [challans, setChallans] = useState<any[]>([]);
  const [lastSearchedRc, setLastSearchedRc] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const auth = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` });

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    toast.info('Starting import process...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/loans/import-offline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      let result;
      try {
        result = await response.json();
      } catch (e) {
        result = { error: 'Invalid response from server' };
      }

      if (!response.ok) {
        toast.error(result.error || 'Failed to import loans');
        return;
      }

      toast.success(`Successfully imported ${result.successCount} loans!`);
      if (result.errors && result.errors.length > 0) {
        const duplicates = result.errors.filter((e: string) => e.includes('DUPLICATE'));
        const failures = result.errors.filter((e: string) => !e.includes('DUPLICATE'));
        if (duplicates.length > 0) {
          toast.warning(`${duplicates.length} duplicate(s) skipped:`);
          duplicates.forEach((e: string) => toast.info(e, { duration: 8000 }));
        }
        if (failures.length > 0) {
          toast.error(`${failures.length} row(s) failed to import`);
          failures.forEach((e: string) => toast.error(e, { duration: 8000 }));
        }
      }

      // Optionally reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      // Fetch users for Channel Codes
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const usersRes = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const usersData = await usersRes.json();
      const usersList = Array.isArray(usersData) ? usersData : (usersData.data || []);

      const ws = XLSX.utils.aoa_to_sheet([
        [
          'Disbursed Date',
          'Channel Code',
          'Customer Name',
          'Mobile Number',
          'RC Number',
          'Case Type',
          'Financer Name',
          'Loan Amount',
          'Interest Rate',
          'Tenure (Months)',
          'RC Collection Method',
          'Channel Name',
          'Channel Number',
          'PDD Status'
        ]
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");

      // Prepare Reference Data Sheet
      const referenceData = [
        ['--- USERS (CHANNEL CODES) ---', '', '--- CASE TYPES ---', '', '--- LENDERS (FINANCERS) ---'],
        ['Name', 'Channel Code', 'Case Type', '', 'Lender Name']
      ];

      const caseTypes = [
        'New Car Purchase',
        'Used Car Purchase',
        'Used Car Refinance',
        'Used Car BT',
        'Used Car Top-up',
        'Commercial Vehicle'
      ];

      const lendersList = (banks || []).map((b: any) => b.name).filter(Boolean);
      lendersList.push('Others');

      const maxRows = Math.max(usersList.length, caseTypes.length, lendersList.length);

      for (let i = 0; i < maxRows; i++) {
        const user = usersList[i];
        const caseType = caseTypes[i] || '';
        const lender = lendersList[i] || '';

        referenceData.push([
          user ? user.full_name : '',
          user ? user.user_id : '',
          caseType,
          '',
          lender
        ]);
      }

      const wsRef = XLSX.utils.aoa_to_sheet(referenceData);

      // Adjust column widths for reference sheet
      wsRef['!cols'] = [
        { wch: 30 }, // Name
        { wch: 20 }, // Channel Code
        { wch: 25 }, // Case Type
        { wch: 5 },  // Gap
        { wch: 30 }  // Lender Name
      ];

      XLSX.utils.book_append_sheet(wb, wsRef, "Reference Data");

      // Generate buffer and trigger download
      XLSX.writeFile(wb, "offline_disbursement_template.xlsx");
      toast.success('Template downloaded with reference data!');
    } catch (error: any) {
      toast.error('Failed to download template: ' + error.message);
    }
  };

  const [sourcingHierarchy, setSourcingHierarchy] = useState<any[]>([]);

  useEffect(() => {
    if (user?.name) {
      if (!formData.sourcingPersonName) {
        setFormData(prev => ({ ...prev, sourcingPersonName: user.name }));
      }

      const defaultOption = [{ id: user.id || -1, full_name: user.name }];
      if (user.role && ['admin', 'ops_team', 'sales_manager', 'manager', 'branch_manager', 'dsa', 'team_leader'].includes(user.role)) {
        const isGlobal = user.role === 'admin' || user.role === 'ops_team';
        const endpoint = isGlobal ? '/users/hierarchy' : '/users/my-team/hierarchy';

        fetch(`${API_URL}${endpoint}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } })
          .then(res => res.json())
          .then(data => {
            const ROLE_PRIORITY: Record<string, number> = {
              'admin': 0,
              'ops_team': 0,
              'sales_manager': 1,
              'branch_manager': 2,
              'team_leader': 3,
              'executive': 4,
              'dsa': 5,
              'advisor': 6,
            };
            const getPriority = (role?: string) => ROLE_PRIORITY[role?.toLowerCase() || ''] || 99;
            const sortTree = (nodes: any[]) => {
              nodes.sort((a, b) => getPriority(a.role) - getPriority(b.role));
              nodes.forEach(n => {
                if (n.team_members && n.team_members.length > 0) {
                  sortTree(n.team_members);
                }
              });
            };

            if (isGlobal) {
              const idMap: any = {};
              const roots: any[] = [];
              const flatData = Array.isArray(data) ? data : (data.data || []);

              flatData.forEach((u: any) => { idMap[u.id] = { ...u, team_members: [] }; });
              flatData.forEach((u: any) => {
                if (u.reporting_to && idMap[u.reporting_to]) {
                  idMap[u.reporting_to].team_members.push(idMap[u.id]);
                } else {
                  roots.push(idMap[u.id]);
                }
              });
              sortTree(roots);
              setSourcingHierarchy(roots);
            } else {
              const nodes = Array.isArray(data) ? data : [];
              sortTree(nodes);
              setSourcingHierarchy(nodes);
            }
          })
          .catch(e => console.error('Error fetching hierarchy:', e));
      } else {
        setSourcingHierarchy(defaultOption);
      }
    }
  }, [user]);

  const isLoanAllowedBank = (bank: any) => {
    if (!bank) return false;
    let cats: string[] = [];
    try {
      if (Array.isArray(bank.category)) cats = bank.category;
      else if (typeof bank.category === 'string') {
        const t = bank.category.trim();
        cats = t.startsWith('[') ? JSON.parse(t) : [t];
      }
    } catch {}
    const catLower = cats.map(c => String(c).toLowerCase().trim()).filter(Boolean);
    const hasLoan = catLower.some(c => c === 'loan' || c.includes('loan') || c.includes('auto') || c.includes('vehicle'));
    const hasCC = catLower.some(c => c.includes('credit') || c === 'cc');
    if (hasCC && !hasLoan) return false;
    if (catLower.length > 0 && !hasLoan) return false;

    let subs: string[] = [];
    try {
      if (Array.isArray(bank.subcategory)) subs = bank.subcategory;
      else if (typeof bank.subcategory === 'string') {
        const t = bank.subcategory.trim();
        subs = t.startsWith('[') ? JSON.parse(t) : [t];
      }
    } catch {}
    const subLower = subs.map(s => String(s).toLowerCase().trim()).filter(Boolean);
    if (subLower.length > 0) {
      const hasUsedCar = subLower.some(s => 
        s.includes('used car') || s.includes('used_car') || s.includes('pre-owned') || 
        s.includes('refinance') || s.includes('bt') || s === 'auto loan' || 
        s === 'vehicle loan' || s === 'car loan' || s === 'loan'
      );
      if (!hasUsedCar) return false;
    }
    return true;
  };

  // Fetch Banks
  const { data: banks = [] } = useQuery({
    queryKey: ['banks-list'],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_URL}/banks?product=used_car_loan`, { headers: auth() });
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data.filter(isLoanAllowedBank) : [];
      } catch {
        return [];
      }
    },
  });

  const { data: recentDisbursements = [] } = useQuery({
    queryKey: ['recent-disbursements', user?.role],
    enabled: user?.role === 'sales_manager',
    queryFn: async () => {
      const res = await fetch(`${API_URL}/loans?limit=5`, { headers: auth() });
      return res.ok ? (await res.json()).data : [];
    }
  });

  // Handle Form Change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };

      if (name === 'rcCollectionMethod') {
        if (value === 'Self') {
          next.rcCollectionName = user?.name || '';
          next.rcCollectionNumber = user?.phone || '';
        } else {
          // Clear the fields when switching to RTO Agent or Banker
          next.rcCollectionName = '';
          next.rcCollectionNumber = '';
        }
      }

      return next;
    });
  };

  const convertDate = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('/') && dateStr.split('/').length === 2) {
      let [month, year] = dateStr.split('/');
      if (month === '00' || month === '0') month = '01';
      return `${year}-${month.padStart(2, '0')}-01`;
    }
    if (dateStr.includes('/') && dateStr.split('/').length === 3) {
      let [day, month, year] = dateStr.split('/');
      if (month === '00' || month === '0') month = '01';
      if (day === '00' || day === '0') day = '01';
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    if (dateStr.includes('-') && dateStr.split('-')[0].length <= 2) {
      let [day, month, year] = dateStr.split('-');
      if (month === '00' || month === '0') month = '01';
      if (day === '00' || day === '0') day = '01';
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      let [year, month, day] = dateStr.split('-');
      if (month === '00' || month === '0') month = '01';
      if (day === '00' || day === '0') day = '01';
      return `${year}-${month}-${day}`;
    }
    if (dateStr.match(/^\d{4}$/)) {
      return `${dateStr}-01-01`;
    }
    return dateStr;
  };

  const updateVehicleData = (d: any) => {
    setFormData(prev => ({
      ...prev,
      ownerName: d.owner_name || prev.ownerName,
      makerDescription: d.maker_description || prev.makerDescription,
      makerModel: d.maker_model || prev.makerModel,
      fuelType: d.fuel_type || prev.fuelType,
      insuranceCompany: d.insurance_company || prev.insuranceCompany,
      insuranceValidDate: convertDate(d.insurance_upto || d.insurance_valid_upto || d.insurance_expiry || prev.insuranceValidDate),
      manufacturingDate: convertDate(d.manufacturing_date || d.manufacturing_date_formatted || prev.manufacturingDate),
      rtoValidUpto: convertDate(d.fit_up_to || prev.rtoValidUpto),
      puccValidUpto: convertDate(d.pucc_upto || d.pucc_valid_upto || d.pucc_expiry || prev.puccValidUpto),
      registeredAt: d.registered_at || prev.registeredAt,
      engineNumber: d.vehicle_engine_number || prev.engineNumber,
      chassisNumber: d.vehicle_chasi_number || prev.chassisNumber,
      financier: d.financer || prev.financier,
      financedStatus: d.financed ? 'Financed' : (d.financer ? 'Financed' : 'Non-Financed'),
      ownershipType: d.owner_number === '1' ? 'First Owner' : d.owner_number === '2' ? 'Second Owner' : d.owner_number === '3' ? 'Third Owner' : d.owner_number === '4' ? 'Fourth Owner' : prev.ownershipType,
    }));
    setIsVehicleFetched(true);
  };

  const autoFetchChallan = async (rcNumber: string) => {
    try {
      let challanRes = await fetch(`${API_URL}/rc-verification/cache/challan/${encodeURIComponent(rcNumber)}`, { headers: auth() });
      let challanJson = await challanRes.json();

      if (!challanJson.success || !challanJson.data?.challan_details) {
        challanRes = await fetch(`${API_URL}/rc-verification/challan`, {
          method: 'POST', headers: auth(),
          body: JSON.stringify({ rc_number: rcNumber.trim().toUpperCase() })
        });
        challanJson = await challanRes.json();
      }

      if (challanJson.success && challanJson.data?.challan_details) {
        setChallans(challanJson.data.challan_details);
      } else {
        setChallans([]);
      }
    } catch (e) {
    }
  };

  const handleRcSearch = async () => {
    if (!formData.rcNumber) return toast.error('Enter RC Number');
    setLoadingSearch(true);
    let vehicleFound = false;

    const isSecondClick = formData.rcNumber === lastSearchedRc;
    setLastSearchedRc(formData.rcNumber);

    if (isSecondClick) {
      toast.info('Forcing live pull from API...');
    }

    try {
      const liveRes = await fetch(`${API_URL}/rc-verification/verify`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify({ rc_number: formData.rcNumber.trim().toUpperCase(), _source: 'offline-disbursement', force_fresh: isSecondClick })
      });
      const liveJson = await liveRes.json();

      if (liveJson.success && liveJson.data) {
        if (liveJson.from_cache) {
          toast.success('RC Details loaded from DB. Click again for Live Pull.');
        } else {
          toast.success('Live Pull Successful');
        }
        updateVehicleData(liveJson.data.rc_details || liveJson.data);
        vehicleFound = true;

        if (liveJson.data.challan_info?.challans) {
          setChallans(liveJson.data.challan_info.challans);
        } else {
          toast.info('Fetching Challan details...');
          await autoFetchChallan(formData.rcNumber);
        }
      } else {
        toast.error(liveJson.error || liveJson.message || 'RC Details not found');
      }
    } catch (e: any) {
      toast.error('Failed to fetch RC details');
    }

    setLoadingSearch(false);
  };

  const generateLoanId = () => {
    const year = new Date().getFullYear();
    const num = Math.floor(Math.random() * 9000) + 1000;
    return `CL-${year}-${num}`;
  };

  const submitLoan = useMutation({
    mutationFn: async () => {
      const loanId = generateLoanId();

      const payload = {
        id: loanId,
        loan_number: loanId,
        applicant_name: formData.customerName,
        mobile: formData.mobileNumber,
        sourcing_person_name: formData.sourcingPersonName,
        vehicle_number: formData.rcNumber,
        engine_number: formData.engineNumber,
        chassis_number: formData.chassisNumber,
        owner_name: formData.ownerName,
        maker_name: formData.makerDescription,
        maker_model: formData.makerModel,
        fuel_type: formData.fuelType,
        insurance_company: formData.insuranceCompany,
        insurance_valid_upto: formData.insuranceValidDate,
        insurance_upto: formData.insuranceValidDate,
        pucc_valid_upto: formData.puccValidUpto,
        registered_at: formData.registeredAt,
        manufacturing_date: formData.manufacturingDate,
        rto_valid_upto: formData.rtoValidUpto,
        financer: formData.financier,
        finance_status: formData.financedStatus,
        ownership_type: formData.ownershipType || null,
        case_type: formData.caseType === 'new_car_purchase' ? 'New Car Purchase' :
          formData.caseType === 'used_car_purchase' ? 'Used Car-purchase' :
            formData.caseType === 'used_car_refinance' ? 'Used Car-Refinance' :
              formData.caseType === 'used_car_bt' ? 'Used Car BT' :
                formData.caseType === 'used_car_topup' ? 'Used Car Top-up' : formData.caseType,
        financier_name: formData.financeName,
        loan_amount: Number(formData.loanAmount) || null,
        loan_account_number: formData.loanAccountNumber || null,
        irr: Number(formData.roi) || null,
        tenure: Number(formData.tenure) || null,
        application_stage: 'DISBURSED', // Default to disbursed
        disbursement_date: formData.disbursementDate,
        created_at: formData.createdDate || formData.disbursementDate,
        rc_collection_method: formData.rcCollectionMethod,
        rc_collection_name: formData.rcCollectionName,
        rc_collection_number: formData.rcCollectionNumber,
        rc_type: formData.rcType, // Physical or Digital
        challan: challans && challans.length > 0 ? 'Yes' : 'No',
        challan_details: {
          status: challans && challans.length > 0 ? 'Yes' : 'No',
          count: challans?.length || 0,
          challans: challans || []
        },
      };

      const res = await fetch(`${API_URL}/loans`, {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to submit loan');
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast.success(`Disbursement successful! Loan ID: ${data.loan_number}`);
      navigate(`/loans/${data.id}`);
    },
    onError: (err: any) => {
      toast.error(`Error: ${err.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let requiredFields = [
      { key: 'createdDate', label: 'Disbursement Date' },
      { key: 'sourcingPersonName', label: 'Sourcing Person Name' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'mobileNumber', label: 'Mobile Number' },
      { key: 'rcNumber', label: 'RC Number' },
      { key: 'engineNumber', label: 'Engine Number' },
      { key: 'chassisNumber', label: 'Chassis Number' },
      { key: 'ownerName', label: 'Owner Name' },
      { key: 'makerDescription', label: 'Maker Description' },
      { key: 'makerModel', label: 'Maker Model' },
      { key: 'fuelType', label: 'Fuel Type' },
      { key: 'insuranceCompany', label: 'Insurance Company' },
      { key: 'insuranceValidDate', label: 'Insurance Valid Date' },
      { key: 'manufacturingDate', label: 'Manufacturing Date' },
      { key: 'rtoValidUpto', label: 'Fitness Valid Upto' },
      { key: 'puccValidUpto', label: 'PUCC Valid Upto' },
      { key: 'registeredAt', label: 'Registered At' },
      { key: 'financedStatus', label: 'Financed Status' },
      { key: 'ownershipType', label: 'Ownership Type' },
      { key: 'caseType', label: 'Case Type' }
    ];

    if (formData.financedStatus === 'Financed') {
      requiredFields = requiredFields.concat([
        { key: 'financier', label: 'Financier' },
        { key: 'financeName', label: 'Finance Name' },
        { key: 'loanAmount', label: 'Loan Amount' },
        { key: 'loanAccountNumber', label: 'Loan Account Number' },
        { key: 'roi', label: 'ROI (%)' },
        { key: 'tenure', label: 'Tenure' }
      ]);
    }

    for (const field of requiredFields) {
      if (!formData[field.key as keyof typeof formData]) {
        toast.error(`Please fill out the ${field.label} field.`);
        return;
      }
    }
    if (formData.rcCollectionMethod !== 'Self') {
      if (!formData.rcCollectionName) {
        toast.error('Please fill out the Receiver Name field.');
        return;
      }
      if (!formData.rcCollectionNumber) {
        toast.error('Please fill out the Receiver Contact field.');
        return;
      }
    }
    submitLoan.mutate();
  };

  const inputClass = "w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";
  const labelClass = "text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-1";

  const getDisabledClass = (isDisabled: boolean) =>
    isDisabled ? `${inputClass} bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-80 pointer-events-none` : inputClass;

  const pendingChallans = challans.filter(c => c.challan_status === 'Pending');
  const disposedChallans = challans.filter(c => c.challan_status !== 'Pending');

  return (
    <div className="w-full p-2 sm:p-4 space-y-4">
      <div className="sticky top-0 z-40 bg-background -mt-2 -mx-2 sm:-mt-4 sm:-mx-4 p-2 sm:p-4 pb-2">
        <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Car className="text-primary" />
              Submit Application
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Offline Disbursement Form
            </p>
          </div>
          {user?.role === 'admin' && (
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors text-xs sm:text-sm font-bold flex-1 sm:flex-initial"
              >
                <Download size={16} />
                Template
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
              />
              <button
                type="button"
                onClick={handleImportClick}
                disabled={isImporting}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 border border-blue-100 dark:border-blue-800 rounded-lg transition-colors text-xs sm:text-sm font-bold disabled:opacity-50 flex-1 sm:flex-initial"
              >
                {isImporting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                {isImporting ? 'Importing...' : 'Import Excel'}
              </button>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Customer Details */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <User className="text-primary" size={16} />
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">Customer Details</h2>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            <div>
              <label className={labelClass}>Disbursement Date</label>
              <input type="date" name="createdDate" max={new Date().toISOString().split('T')[0]} value={formData.createdDate} onChange={handleChange} className={inputClass} />
            </div>
            <div className="z-10 relative">
              <label className={labelClass}>Sourcing Person Name</label>
              <HierarchyDropdown
                value={formData.sourcingPersonName}
                onChange={(val) => setFormData(prev => ({ ...prev, sourcingPersonName: val }))}
                options={sourcingHierarchy}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Customer Name</label>
              <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} placeholder="Customer Name" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Mobile Number</label>
              <input type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} placeholder="Mobile" className={inputClass} />
            </div>
          </div>
        </section>

        {/* Vehicle Details */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Car className="text-primary" size={16} />
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">Vehicle Details</h2>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">

            {/* RC Lookup Section */}
            <div className="col-span-1 sm:col-span-2 md:col-span-4 lg:col-span-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="col-span-1 md:col-span-2">
                <label className={labelClass}>RC Number Lookup</label>
                <div className="flex flex-wrap gap-2">
                  <input type="text" name="rcNumber" value={formData.rcNumber} onChange={handleChange} placeholder="Enter RC Number" className={`${inputClass} max-w-[250px] uppercase font-mono font-bold text-base py-2`} />
                  <button type="button" onClick={handleRcSearch} disabled={loadingSearch || !formData.rcNumber} className="px-4 py-2 bg-gray-900 dark:bg-gray-600 text-white hover:bg-gray-800 dark:hover:bg-gray-500 rounded-lg transition-colors flex items-center gap-2 text-[13px] font-bold">
                    {loadingSearch ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    Search Vehicle & Challan
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Checks DB first. Click again to force a live API pull.</p>
              </div>
            </div>

            <div>
              <label className={labelClass}>Engine Number</label>
              <input type="text" name="engineNumber" value={formData.engineNumber} onChange={handleChange} placeholder="Engine no" className={getDisabledClass(isVehicleFetched && !!formData.engineNumber)} readOnly={isVehicleFetched && !!formData.engineNumber} />
            </div>
            <div>
              <label className={labelClass}>Chassis Number</label>
              <input type="text" name="chassisNumber" value={formData.chassisNumber} onChange={handleChange} placeholder="Chassis no" className={getDisabledClass(isVehicleFetched && !!formData.chassisNumber)} readOnly={isVehicleFetched && !!formData.chassisNumber} />
            </div>
            <div>
              <label className={labelClass}>Owner Name</label>
              <input type="text" name="ownerName" value={formData.ownerName} onChange={handleChange} placeholder="Owner" className={getDisabledClass(isVehicleFetched && !!formData.ownerName)} readOnly={isVehicleFetched && !!formData.ownerName} />
            </div>
            <div>
              <label className={labelClass}>Maker Description</label>
              <input type="text" name="makerDescription" value={formData.makerDescription} onChange={handleChange} placeholder="Maruti Suzuki" className={getDisabledClass(isVehicleFetched && !!formData.makerDescription)} readOnly={isVehicleFetched && !!formData.makerDescription} />
            </div>
            <div>
              <label className={labelClass}>Maker Model</label>
              <input type="text" name="makerModel" value={formData.makerModel} onChange={handleChange} placeholder="Swift" className={getDisabledClass(isVehicleFetched && !!formData.makerModel)} readOnly={isVehicleFetched && !!formData.makerModel} />
            </div>
            <div>
              <label className={labelClass}>Fuel Type</label>
              <select name="fuelType" value={formData.fuelType} onChange={handleChange} className={getDisabledClass(isVehicleFetched && !!formData.fuelType)} disabled={isVehicleFetched && !!formData.fuelType}>
                <option value="">Select</option>
                <option value="PETROL">Petrol</option>
                <option value="DIESEL">Diesel</option>
                <option value="CNG">CNG</option>
                <option value="ELECTRIC">Electric</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Insurance Company</label>
              <input type="text" name="insuranceCompany" value={formData.insuranceCompany} onChange={handleChange} placeholder="Company" className={getDisabledClass(isVehicleFetched && !!formData.insuranceCompany)} readOnly={isVehicleFetched && !!formData.insuranceCompany} />
            </div>
            <div>
              <label className={labelClass}>Insurance Valid Date</label>
              <input type="date" name="insuranceValidDate" value={formData.insuranceValidDate} onChange={handleChange} className={getDisabledClass(isVehicleFetched && !!formData.insuranceValidDate)} readOnly={isVehicleFetched && !!formData.insuranceValidDate} />
            </div>
            <div>
              <label className={labelClass}>Manufacturing Date</label>
              <input type="date" name="manufacturingDate" value={formData.manufacturingDate} onChange={handleChange} className={getDisabledClass(isVehicleFetched && !!formData.manufacturingDate)} readOnly={isVehicleFetched && !!formData.manufacturingDate} />
            </div>
            <div>
              <label className={labelClass}>Fitness Valid Upto</label>
              <input type="date" name="rtoValidUpto" value={formData.rtoValidUpto} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>PUCC Valid Upto</label>
              <input type="date" name="puccValidUpto" value={formData.puccValidUpto} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Registered At</label>
              <input type="text" name="registeredAt" value={formData.registeredAt} onChange={handleChange} placeholder="RTO Name" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Financier</label>
              <input type="text" name="financier" value={formData.financier} onChange={handleChange} placeholder="Financier" className={getDisabledClass(isVehicleFetched && !!formData.financier)} readOnly={isVehicleFetched && !!formData.financier} />
            </div>
            <div>
              <label className={labelClass}>Financed Status</label>
              <select name="financedStatus" value={formData.financedStatus} onChange={handleChange} className={getDisabledClass(isVehicleFetched && !!formData.financedStatus)} disabled={isVehicleFetched && !!formData.financedStatus}>
                <option value="">Select</option>
                <option value="Financed">Financed</option>
                <option value="Non-Financed">Non-Financed</option>
                <option value="NOC Issued">NOC Issued</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Ownership Type</label>
              <select name="ownershipType" value={formData.ownershipType} onChange={handleChange} className={getDisabledClass(isVehicleFetched && !!formData.ownershipType)} disabled={isVehicleFetched && !!formData.ownershipType}>
                <option value="">Select</option>
                <option value="First Owner">First Owner</option>
                <option value="Second Owner">Second Owner</option>
                <option value="Third Owner">Third Owner</option>
                <option value="Fourth Owner">Fourth Owner</option>
              </select>
            </div>
          </div>

          {/* Challan Display */}
          {challans.length > 0 && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Challan Details</h3>
                <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold">
                  {pendingChallans.length} Pending
                </span>
                <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold">
                  {disposedChallans.length} Disposed
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {challans.map((c, i) => (
                  <div key={i} className={`p-3 rounded-xl border ${c.challan_status === 'Pending' ? 'border-red-200 bg-red-50/50' : 'border-green-200 bg-green-50/50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-[11px] font-bold text-gray-900">{c.offense_details || 'Traffic Violation'}</p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{c.challan_number}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${c.challan_status === 'Pending' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {c.challan_status}
                        </span>
                        <p className="text-xs font-bold text-gray-900 mt-1">₹{c.amount}</p>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-600 flex justify-between">
                      <span>Date: {c.challan_date}</span>
                      <span>State: {c.state}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Loan Details & RC Method */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <FileText className="text-primary" size={16} />
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">Loan Details</h2>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Case Type <span className="text-red-500">*</span></label>
                <select name="caseType" value={formData.caseType} onChange={handleChange} className={inputClass} required>
                  <option value="">Select Case Type</option>
                  <option value="new_car_purchase">New Car - Purchase</option>
                  <option value="used_car_purchase">Used Car - Purchase</option>
                  <option value="used_car_refinance">Used Car - Refinance</option>
                  <option value="used_car_topup">Used Car - Top-up</option>
                  <option value="used_car_bt">Used Car - BT</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Finance Name {formData.financedStatus === 'Financed' && <span className="text-red-500">*</span>}</label>
                <select name="financeName" value={formData.financeName} onChange={handleChange} className={inputClass} required={formData.financedStatus === 'Financed'}>
                  <option value="">Select Finance Name</option>
                  {banks.map((b: any) => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Loan Amount {formData.financedStatus === 'Financed' && <span className="text-red-500">*</span>}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₹</span>
                  <input type="number" name="loanAmount" value={formData.loanAmount} onChange={handleChange} placeholder="0" className={`${inputClass} pl-7`} required={formData.financedStatus === 'Financed'} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Loan Account Number</label>
                <input type="text" name="loanAccountNumber" value={formData.loanAccountNumber} onChange={handleChange} placeholder="Enter account number" className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>ROI (%) {formData.financedStatus === 'Financed' && <span className="text-red-500">*</span>}</label>
                  <input type="number" step="0.01" name="roi" value={formData.roi} onChange={handleChange} placeholder="0.0" className={inputClass} required={formData.financedStatus === 'Financed'} />
                </div>
                <div>
                  <label className={labelClass}>Tenure {formData.financedStatus === 'Financed' && <span className="text-red-500">*</span>}</label>
                  <input type="number" name="tenure" value={formData.tenure} onChange={handleChange} placeholder="mths" className={inputClass} required={formData.financedStatus === 'Financed'} />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <FileText className="text-primary" size={16} />
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">RC COLLECTION</h2>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-5">

              {/* RC Type */}
              <div>
                <label className={labelClass}>RC Type</label>
                <div className="flex gap-4">
                  {['Physical', 'Digital'].map(type => (
                    <label key={type} className={`flex items-center gap-2 p-2 px-4 rounded-lg border cursor-pointer transition-all ${formData.rcType === type ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/30'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${formData.rcType === type ? 'border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
                        {formData.rcType === type && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </div>
                      <span className={`text-xs font-bold ${formData.rcType === type ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>{type}</span>
                      <input type="radio" name="rcType" value={type} checked={formData.rcType === type} onChange={handleChange} className="hidden" />
                    </label>
                  ))}
                </div>
              </div>

              {/* RC Collection Method */}
              <div>
                <label className={labelClass}>RC Collected By</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  {['Self', 'RTO Agent', 'Banker'].map(method => (
                    <label key={method} className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${formData.rcCollectionMethod === method ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/30'}`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${formData.rcCollectionMethod === method ? 'border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
                        {formData.rcCollectionMethod === method && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <span className={`text-xs font-bold ${formData.rcCollectionMethod === method ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>{method}</span>
                      <input type="radio" name="rcCollectionMethod" value={method} checked={formData.rcCollectionMethod === method} onChange={handleChange} className="hidden" />
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 transition-all duration-300">
                  <div>
                    <label className={labelClass}>Receiver Name</label>
                    <input type="text" name="rcCollectionName" value={formData.rcCollectionName} onChange={handleChange} placeholder="Enter name" className={inputClass} readOnly={formData.rcCollectionMethod === 'Self'} />
                  </div>
                  <div>
                    <label className={labelClass}>Receiver Contact</label>
                    <input type="tel" name="rcCollectionNumber" value={formData.rcCollectionNumber} onChange={handleChange} placeholder="Enter contact number" className={inputClass} readOnly={formData.rcCollectionMethod === 'Self'} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Submit Button (At the end of form) */}
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitLoan.isPending}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50"
          >
            {submitLoan.isPending ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {submitLoan.isPending ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
}

