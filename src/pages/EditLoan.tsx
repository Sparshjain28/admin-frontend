import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { CAR_MAKES, calculateEMI, formatCurrency } from '@/lib/mock-data';
import { FINANCIERS } from '@/lib/financiers';
import { ArrowLeft, Calculator, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { toast } from 'sonner';
import { FloatingLabelInput, FloatingLabelTextarea, FloatingLabelSelect } from '@/components/FloatingLabelInput';
import { resolveImageUrl } from '@/services/api';
import '@/styles/floating-labels.css';

export default function EditLoan() {
  const navigate = useNavigate(); 
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showExistingDetails, setShowExistingDetails] = useState(false);

  const [showOptionalFields, setShowOptionalFields] = useState({
    coApplicant: false,
    guarantor: false,
  });
  const [fetchingVehicleData, setFetchingVehicleData] = useState(false);
  const [challanInfo, setChallanInfo] = useState<{ status: string; count: number; challans: any[] } | null>(null);
  const [rcFetchCount, setRcFetchCount] = useState(0);

  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    ledgerSelection: '',
    selectedBankId: '',
    selectedBranchId: '',
    selectedBranchName: '',
    salesManagerName: '',
    salesManagerMobile: '',
    areaManagerName: '',
    areaManagerMobile: '',
    assignedTo: '',
    assignedToRole: '',
    remarks: ''
  });
  const [branchOptions, setBranchOptions] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [selectedBankRates, setSelectedBankRates] = useState<any[]>([]);

  // When lender is selected, find matching bank and fetch its branches and rates
  const handleLenderChange = async (lenderName: string) => {
    setAssignmentForm(f => ({
      ...f,
      ledgerSelection: lenderName,
      selectedBankId: '',
      selectedBranchId: '',
      selectedBranchName: '',
      salesManagerName: '',
      salesManagerMobile: '',
      areaManagerName: '',
      areaManagerMobile: '',
    }));
    setBranchOptions([]);
    if (!lenderName || lenderName === 'Others') return;
    const matchedBank = (banks as any[]).find(b => b.name.toLowerCase() === lenderName.toLowerCase());
    if (!matchedBank) return;
    setLoadingBranches(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banks/${matchedBank.id}/branches`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBranchOptions(data);
        setAssignmentForm(f => ({ ...f, selectedBankId: String(matchedBank.id) }));
      }

      const ratesRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banks/${matchedBank.id}/product-rates`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        setSelectedBankRates(ratesData);
        // Pre-fetch IDV if it is completely missing so that we have it before updating form state
        let liveIdv: number | null = null;
        let parsedLeadStageData = loanData?.lead_stage_data;
        if (typeof parsedLeadStageData === 'string') {
          try { parsedLeadStageData = JSON.parse(parsedLeadStageData); } catch(e) {}
        }
        const idvDataRaw = loanData?.stage_data?.idv_data || 
                       parsedLeadStageData?.idvData ||
                       loanData?.link_loan_data || 
                       loanData?.stage_data ||
                       loanData?.rc_data;
        
        const searchObj = (obj: any): number | null => {
          if (!obj || typeof obj !== 'object') return null;
          if (obj.fair_market_retail_value || obj.book_value || obj.dealer_purchase_price || obj.idv || obj.idv_value || obj.tentative_idv || obj.vehicle_value) {
            return Number(obj.fair_market_retail_value || obj.book_value || obj.dealer_purchase_price || obj.idv || obj.idv_value || obj.tentative_idv || obj.vehicle_value);
          }
          for (const key in obj) {
            if (typeof obj[key] === 'number' && (key.toLowerCase().includes('idv') || key.toLowerCase().includes('value'))) return obj[key];
            const res = searchObj(obj[key]);
            if (res) return res;
          }
          return null;
        };

        liveIdv = searchObj(idvDataRaw);

        if (!liveIdv && loanData?.vehicle_number) {
          try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/find-lender/idv`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              },
              body: JSON.stringify({ vehicle_number: loanData.vehicle_number })
            });
            if (res.ok) {
              const freshIdvData = await res.json();
              liveIdv = searchObj(freshIdvData);
              if (liveIdv) setLiveFetchedIdv(liveIdv);
            }
          } catch (err) {}
        }

        setForm(prev => {
          const ct = (prev.caseType || '').toLowerCase();
          let productName = 'Used Car Purchase'; // default
          if (ct.includes('new')) productName = 'New Car Purchase';
          else if (ct.includes('refinance')) productName = 'Used Car Refinance Up';
          else if (ct.includes('bt') || ct.includes('top')) productName = 'Used Car BT/Top Up';

          const matchedRate = ratesData.find((r: any) => r.product_name === productName);
          
          let rateVal = null, tenureVal = null, tentativeAmount = '';
          const activeRate = matchedRate || (ratesData && ratesData.length > 0 ? ratesData[0] : null);
          
          if (activeRate) {
            rateVal = activeRate.racc_rate !== null ? activeRate.racc_rate : activeRate.min_rate;
            tenureVal = activeRate.max_tenure !== null ? activeRate.max_tenure : activeRate.min_tenure;
          }

          const hasNewRates = rateVal !== null || tenureVal !== null;
          const newIrr = rateVal !== null ? String(rateVal) : prev.irr;
          const newTenure = tenureVal !== null ? String(tenureVal) : prev.tenure;
            
          if (liveIdv) {
            let maxPct = 90;
            if (productName.includes('Refinance')) maxPct = 120;
            else if (productName.includes('BT')) maxPct = 160;
            else if (productName.includes('Top')) maxPct = 120;
            tentativeAmount = String(Math.round(liveIdv * (maxPct / 100)));
          }

          // Fallbacks if IDV fails
          if (!tentativeAmount && activeRate?.max_loan_amount) {
            tentativeAmount = String(activeRate.max_loan_amount);
          }
          if (!tentativeAmount && loanData?.lead_loan_amount && Number(loanData.lead_loan_amount) > 0) {
              tentativeAmount = String(loanData.lead_loan_amount);
          }

          // The user explicitly requested to show the tentative value EVERY time the lender changes,
          // EXCEPT if the loan is already DISBURSED (because amounts are finalized then)
          const isDisbursed = loanData?.application_stage === 'DISBURSED';
          const newLoanAmount = (tentativeAmount && !isDisbursed) ? tentativeAmount : prev.loanAmount;

          return {
            ...prev,
            irr: newIrr,
            tenure: newTenure,
            loanAmount: newLoanAmount,
            emiAmount: hasNewRates ? '' : prev.emiAmount // clear manual EMI so it recalculates
          };
        });
      }
    } catch { /* ignore */ }
    finally { setLoadingBranches(false); }
  };

  const handleBranchChange = (branchId: string) => {
    const branch = branchOptions.find(b => String(b.id) === branchId);
    setAssignmentForm(f => ({
      ...f,
      selectedBranchId: branchId,
      selectedBranchName: branch?.branch_name || '',
      salesManagerName: branch?.sales_manager_name || '',
      salesManagerMobile: branch?.sales_manager_mobile || '',
      areaManagerName: branch?.area_sales_manager_name || '',
      areaManagerMobile: branch?.area_sales_manager_mobile || '',
    }));
  };

  const fetchVehicleDetails = async (rcNumber: string) => {
    if (!rcNumber || rcNumber.length < 8) {
      toast.error('Please enter a valid vehicle number (minimum 8 characters)');
      return;
    }
    setChallanInfo(null);
    setFetchingVehicleData(true);
    const isSecondClick = rcFetchCount > 0;
    setRcFetchCount(c => c + 1);

    const applyRCData = (rc: any) => {
      const convertDate = (dateStr: string) => {
        if (!dateStr) return '';
        if (dateStr.includes('/') && dateStr.split('/').length === 2) {
          const [month, year] = dateStr.split('/');
          return `${year}-${month.padStart(2, '0')}-01`;
        }
        if (dateStr.includes('/') && dateStr.split('/').length === 3) {
          const [day, month, year] = dateStr.split('/');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        if (dateStr.includes('-') && dateStr.split('-')[0].length <= 2) {
          const [day, month, year] = dateStr.split('-');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return dateStr;
      };
      setForm(f => ({
        ...f,
        engineNumber: rc.vehicle_engine_number || '',
        chassisNumber: rc.vehicle_chasi_number || '',
        ownerName: rc.owner_name || '',
        rcOwnerName: rc.owner_name || '',
        makerName: rc.maker_description || '',
        makerModel: rc.maker_model || '',
        fuelType: rc.fuel_type || '',
        manufacturingDate: convertDate(rc.manufacturing_date || rc.manufacturing_date_formatted || ''),
        insuranceCompany: rc.insurance_company || '',
        insuranceValidUpto: convertDate(rc.insurance_upto || rc.insurance_valid_upto || rc.insurance_expiry || ''),
        puccValidUpto: convertDate(rc.pucc_upto || rc.pucc_valid_upto || rc.pucc_expiry || ''),
        registeredAt: rc.registered_at || '',
        financer: rc.financer || '',
        new_hpn: rc.financer || f.new_hpn || '',
        financeStatus: rc.financed ? 'Financed' : 'Not Financed',
        ...(rc.financed ? { loanStatus: 'Active' } : {}),
        ownershipType: rc.owner_number === '1' ? 'First Owner' : rc.owner_number === '2' ? 'Second Owner' : rc.owner_number === '3' ? 'Third Owner' : rc.owner_number === '4' ? 'Fourth Owner' : '',
      }));
    };

    try {
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rc-verification/lookup`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ rc_number: rcNumber, _source: 'loan-application', force_fresh: isSecondClick }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        let rcData = data.data.rc_details || data.data;
        rcData = rcData.data ? rcData.data : rcData; // Unwrap .data if nested
        applyRCData(rcData);
        const ci = data.data.challan_info || { status: 'No', count: 0, challans: [] };
        setChallanInfo(ci);
        setForm(f => ({
          ...f,
          challan: ci.status === 'Yes' ? 'Yes' : 'No',
          challan_details: ci
        }));
        toast.success(data.from_cache ? '📦 Loaded from database' : '✅ Fetched from API');
      } else {
        toast.error(data.error || 'Could not fetch vehicle details');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch vehicle details');
    } finally {
      setFetchingVehicleData(false);
    }
  };

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

  const { data: banks = [] } = useQuery({
    queryKey: ['banks-list'],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banks?product=used_car_loan`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data.filter(isLoanAllowedBank) : [];
      } catch {
        return [];
      }
    },
  });

  const { data: brokers = [] } = useQuery({
    queryKey: ['brokers-list'],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/brokers`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return [];
        return await response.json();
      } catch {
        return [];
      }
    },
  });

  const { data: lenders = [] } = useQuery({
    queryKey: ['lenders-from-banks'],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banks?product=used_car_loan`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) {
          return ['Others']; // Fallback
        }
        const banksData = await response.json();
        const validBanks = Array.isArray(banksData) ? banksData.filter(isLoanAllowedBank) : [];
        const bankNames = validBanks.map((bank: any) => bank.name).filter(Boolean);
        return [...bankNames, 'Others'];
      } catch {
        return ['Others']; // Fallback if fetch fails
      }
    },
  });

  const { data: assignableUsers = [] } = useQuery({
    queryKey: ['assignable-users-edit-loan'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/hierarchy`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) return [];
      const hierarchyData = await res.json();
      
      const flattenTeam = (data: any[]): any[] => {
        let flat: any[] = [];
        data.forEach(item => {
          flat.push(item);
          if (item.team_members) flat = flat.concat(flattenTeam(item.team_members));
        });
        return flat;
      };
      
      return flattenTeam(hierarchyData);
    },
    enabled: ['admin', 'manager', 'sales_manager', 'branch_manager', 'team_leader', 'dsa'].includes(user?.role || '')
  });

  const { data: loanData, isLoading } = useQuery({
    queryKey: ['loan', id],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch loan');
      return await response.json();
    },
    enabled: !!id,
  });

  // Fetch existing documents for this loan
  const { data: existingDocuments = [] } = useQuery({
    queryKey: ['loan-documents-edit', id],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${id}/documents`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return [];
        const docs = await response.json();
        // Deduplicate by document_type
        const uniqueDocs = docs.filter((doc: any, index: number, self: any[]) => {
          const firstIndex = self.findIndex((d: any) => d.document_type === doc.document_type && d.file_name === doc.file_name);
          return index === firstIndex;
        });
        return uniqueDocs;
      } catch { return []; }
    },
    enabled: !!id,
  });  const [form, setForm] = useState({
    // Customer Details
    customerId: '', customerName: '', mobile: '', panNumber: '', coApplicantName: '', coApplicantMobile: '',
    guarantorName: '', guarantorMobile: '', ourBranch: '',
    currentAddress: '', currentLandmark: '', currentDistrict: '', currentState: '', currentPincode: '',
    // Loan & Vehicle Details
    loanNumber: '', purposeLoanAmount: '', loanAmount: '', ltv: '', loanTypeVehicle: '',
    vehicleNumber: '', engineNumber: '', chassisNumber: '', ownerName: '', makerName: '',
    makerModel: '', modelVariantName: '', fuelType: '', manufacturingDate: '', registeredAt: '',
    ownershipType: '', financer: '', financeStatus: '', insuranceCompany: '', insuranceValidUpto: '',
    puccValidUpto: '', caseType: '', new_hpn: '', challan_details: null as any,
    // Income Details
    incomeSource: '', monthlyIncome: '',
    // Salaried Income Details
    companyName: '', designation: '', workExperience: '', currentJobYears: '', totalWorkExp: '',
    netMonthlySalary: '', salaryCreditMode: '', salarySlipAvailable: '',
    // Self Employed Details
    profile: '',  businessName: '', businessType: '', businessVintage: '', hasOfficeSetup: '', professionalSubtype: '', practiceExperience: '',itrAvailable: '', annualIncomeItr: '',
    // Farmer Details
    agricultureLandOwnership: '', dairyIncome: '', numberOfCattles: '', jamabandhiAvailable: '',
    // Freelancer/Agent Details
    freelancerSubtype: '',
    // Other Income Details
    otherIncomeType: '',
    // Financier Name
    financierName: '', otherFinancierName: '', financierLocation: '',
    // RTO Details
    rcOwnerName: '', rcMfgDate: '', rcExpiryDate: '', hpnAtLogin: '', isFinanced: '', newFinancier: '', rtoDocsHandoverDate: '',
    rtoAgentName: '', agentMobileNo: '', dtoLocation: '', rtoWorkDescription: '', challan: 'No', fc: 'No', rtoPapers: '',
    // RTO Papers Checkboxes
    rtoRC: false, rtoNOC: false, rtoPermit: false, rtoPollution: false, rto2930Form: false,
    rtoSellAgreement: false, rtoRCOwnerKYC: false, rtoStampPapers: false,
    // Bouncing Details
    bouncingLast3m: '', bouncingLast6m: '',
    // Existing Loan Details
    loanStatus: '', existingLoanAmount: '', existingTenure: '', existingEmi: '', noOfEmiPaid: '',
    // EMI Details
    irr: '', tenure: '60', emiMode: 'Monthly', emiStartDate: '', emiEndDate: '', emiAmount: '',
    // Financier Details
    assignedBankId: '', assignedBrokerId: '', financierExecutiveName: '', financierTeamVertical: '', disburseBranchName: '', sanctionAmount: '', sanctionDate: '',
    // Insurance Details
    insuranceCompanyName: '', premiumAmount: '', insuranceDate: '', insurancePolicyNumber: '',
    // Deductions & Disbursement Details
    processingFee: '', totalDeduction: '', netDisbursementAmount: '', paymentReceivedDate: '',
    // Application Stages
    appStage: 'submitted', appScore: '', creditScore: '', tags: '', rejectedRemarks: '',
    approvedLoanAmount: '', approvedRoi: '', approvedTenure: '',
    disbursedLoanAmount: '', disbursedRoi: '', disbursedTenure: '', loanAccountNumber: '',
    rcStatus: '', rcType: '', rcCollectedBy: '', rtoAgentNameStage: '', rtoAgentMobileStage: '',
    bankerName: '', bankerMobile: '', cancelledRemarks: '',
    // Others
    loginDate: '', approvalDate: '', sourcingPersonName: '', remark: '', fileStatus: 'submitted', assignedTo: '', disbursementDate: '',
  });

  // Document files state
  const [documentShareBundleLoading, setDocumentShareBundleLoading] = useState(false);
  const [liveFetchedIdv, setLiveFetchedIdv] = useState<number | null>(null);
  const [documentFiles, setDocumentFiles] = useState<{ [key: string]: File }>({});
  const [uploadingDocs, setUploadingDocs] = useState(false);

  // Populate form when loan data is loaded
  useEffect(() => {
    if (loanData) {
      // Pre-populate assignment form with existing loan data
      setAssignmentForm(f => ({
        ...f,
        ledgerSelection: loanData.financier_name || '',
        selectedBranchName: loanData.financier_branch_name || '',
        salesManagerName: loanData.financier_executive_name || '',
        salesManagerMobile: loanData.financier_executive_mobile || '',
        areaManagerName: loanData.financier_area_manager_name || '',
        areaManagerMobile: loanData.financier_area_manager_mobile || '',
      }));
      
      // If there's a financier name, try to load its branches
      if (loanData.financier_name && loanData.financier_name !== 'Others') {
        handleLenderChange(loanData.financier_name);
      }
      setForm({
        ...form,
        customerId: loanData.customer_id || '',
        customerName: loanData.applicant_name || loanData.customer_name || '',
        mobile: loanData.mobile || loanData.phone || '',
        panNumber: loanData.pan_number || '',
        coApplicantName: loanData.co_applicant_name || '',
        coApplicantMobile: loanData.co_applicant_mobile || '',
        guarantorName: loanData.guarantor_name || '',
        guarantorMobile: loanData.guarantor_mobile || '',
        ourBranch: loanData.our_branch || '',
        currentAddress: loanData.current_address || '',
        currentLandmark: loanData.current_landmark || '',
        currentDistrict: loanData.current_district || '',
        currentState: loanData.current_state || '',
        currentPincode: loanData.current_pincode || '',
        loanNumber: loanData.loan_number || '',
        purposeLoanAmount: loanData.lead_loan_amount || '',
        loanAmount: (loanData.loan_amount && Number(loanData.loan_amount) > 0) ? loanData.loan_amount.toString() : (loanData.lead_loan_amount?.toString() || ''),
        ltv: loanData.ltv?.toString() || '',
        loanTypeVehicle: loanData.loan_type_vehicle || '',
        vehicleNumber: loanData.vehicle_number || '',
        engineNumber: loanData.engine_number || '',
        chassisNumber: loanData.chassis_number || '',
        ownerName: loanData.owner_name || '',
        makerName: loanData.maker_name || '',
        makerModel: loanData.maker_model || '',
        modelVariantName: loanData.model_variant_name || '',
        fuelType: loanData.fuel_type || '',
        manufacturingDate: loanData.manufacturing_date ? loanData.manufacturing_date.split('T')[0] : '',
        registeredAt: loanData.registered_at || '',
        ownershipType: loanData.ownership_type || '',
        financer: loanData.financer || '',
        financeStatus: loanData.finance_status || '',
        insuranceCompany: loanData.insurance_company || '',
        insuranceValidUpto: loanData.insurance_valid_upto ? loanData.insurance_valid_upto.split('T')[0] : '',
        puccValidUpto: loanData.pucc_valid_upto ? loanData.pucc_valid_upto.split('T')[0] : '',
        caseType: loanData.case_type || '',
        incomeSource: loanData.income_source || '',
        monthlyIncome: loanData.monthly_income?.toString() || '',
        companyName: loanData.company_name || '',
        designation: loanData.designation || '',
        workExperience: loanData.work_experience || '',
        currentJobYears: loanData.current_job_years?.toString() || '',
        totalWorkExp: loanData.total_work_exp?.toString() || '',
        netMonthlySalary: loanData.net_monthly_salary?.toString() || '',
        salaryCreditMode: loanData.salary_credit_mode || '',
        salarySlipAvailable: loanData.salary_slip_available || '',
        profile: loanData.profile || '',
        itrAvailable: loanData.itr_available || '',
        annualIncomeItr: loanData.annual_income_itr?.toString() || '',
        businessName: loanData.business_name || '',
        businessType: loanData.business_type || '',
        businessVintage: loanData.business_vintage?.toString() || '',
        hasOfficeSetup: loanData.has_office_setup || loanData.stage_data?.hasOfficeSetup || '',
        agricultureLandOwnership: loanData.stage_data?.agricultureLandOwnership || '',
        dairyIncome: loanData.stage_data?.dairyIncome || '',
        numberOfCattles: loanData.stage_data?.numberOfCattles?.toString() || '',
        jamabandhiAvailable: loanData.stage_data?.jamabandhiAvailable || '',
        professionalSubtype: loanData.professional_subtype || '',
        practiceExperience: loanData.practice_experience?.toString() || '',
        freelancerSubtype: loanData.freelancer_subtype || '',
        otherIncomeType: loanData.other_income_type || '',
        financierName: loanData.financier_name || '',
        otherFinancierName: loanData.financier_name && !FINANCIERS.includes(loanData.financier_name) ? loanData.financier_name : '',
        financierLocation: loanData.financier_location || '',
        bouncingLast3m: loanData.bouncing_last_3m ? String(loanData.bouncing_last_3m) : loanData.bouncing_3_months ? String(loanData.bouncing_3_months) : '',
        bouncingLast6m: loanData.bouncing_last_6m ? String(loanData.bouncing_last_6m) : loanData.bouncing_6_months ? String(loanData.bouncing_6_months) : '',
        loanStatus: loanData.existing_loan_status || '',
        existingLoanAmount: loanData.existing_loan_amount ? String(loanData.existing_loan_amount) : '',
        existingTenure: loanData.existing_tenure ? String(loanData.existing_tenure) : '',
        existingEmi: loanData.existing_emi ? String(loanData.existing_emi) : '',
        noOfEmiPaid: loanData.no_of_emi_paid ? String(loanData.no_of_emi_paid) : '',
        irr: loanData.irr?.toString() || loanData.interest_rate?.toString() || '',
        tenure: loanData.tenure?.toString() || '60',
        emiAmount: loanData.emi_amount?.toString() || loanData.emi?.toString() || '',
        emiMode: loanData.emi_mode || 'Monthly',
        emiStartDate: loanData.emi_start_date || '',
        emiEndDate: loanData.emi_end_date || '',
        assignedBankId: loanData.assigned_bank_id?.toString() || loanData.bank_id?.toString() || '',
        assignedBrokerId: loanData.assigned_broker_id?.toString() || loanData.broker_id?.toString() || '',
        processingFee: loanData.processing_fee?.toString() || '',
        loginDate: loanData.login_date ? loanData.login_date.split('T')[0] : '',
        sourcingPersonName: loanData.sourcing_person_name || '',
        remark: loanData.remark || '',
        fileStatus: loanData.status || 'submitted',
        assignedTo: loanData.assigned_to ? String(loanData.assigned_to) : '',
        disbursementDate: loanData.disbursement_date ? loanData.disbursement_date.split('T')[0] : '',
        new_hpn: loanData.new_hpn || '',
        challan: loanData.challan || 'No',
        challan_details: loanData.challan_details || null,
      });

      if (loanData.challan_details) {
        try {
          const parsed = typeof loanData.challan_details === 'string'
            ? JSON.parse(loanData.challan_details)
            : loanData.challan_details;
          setChallanInfo(parsed);
        } catch (e) {
}
      }
      
      // Set optional fields visibility based on data
      if (loanData.co_applicant_name || loanData.co_applicant_mobile) {
        setShowOptionalFields(prev => ({ ...prev, coApplicant: true }));
      }
      if (loanData.guarantor_name || loanData.guarantor_mobile) {
        setShowOptionalFields(prev => ({ ...prev, guarantor: true }));
      }
    }
  }, [loanData]);

  const update = (key: string, val: string | File | null) => {
    if (val instanceof File) {
      // Handle file uploads separately
      setDocumentFiles(prev => ({ ...prev, [key]: val }));
      return;
    }
    
    setForm(f => {
      const newForm = { ...f, [key]: val };
      
      // When income source changes, clear all income-related fields
      if (key === 'incomeSource') {
        // Clear Salaried fields
        newForm.companyName = '';
        newForm.designation = '';
        newForm.workExperience = '';
        newForm.currentJobYears = '';
        newForm.totalWorkExp = '';
        newForm.netMonthlySalary = '';
        newForm.salaryCreditMode = '';
        newForm.salarySlipAvailable = '';
        
        // Clear Self Employed fields
        newForm.profile = '';
        newForm.businessName = '';
        newForm.businessType = '';
        newForm.businessVintage = '';
        newForm.professionalSubtype = '';
        newForm.practiceExperience = '';
        newForm.freelancerSubtype = '';
        newForm.otherIncomeType = '';
        newForm.itrAvailable = '';
        newForm.annualIncomeItr = '';
      }
      
      // When profile changes within Self Employed, clear profile-specific fields
      if (key === 'profile') {
        newForm.businessName = '';
        newForm.businessType = '';
        newForm.businessVintage = '';
        newForm.professionalSubtype = '';
        newForm.practiceExperience = '';
        newForm.freelancerSubtype = '';
        newForm.otherIncomeType = '';
      }
      
      if (key === 'totalWorkExp' && val && !f.salaryCreditMode) {
        newForm.salaryCreditMode = 'Account Transfer';
      }
      if (key === 'financeStatus' && val === 'Financed') {
        newForm.loanStatus = 'Active';
      }
      return newForm;
    });
  };

  // Upload documents function
  const uploadDocuments = async () => {
    if (Object.keys(documentFiles).length === 0) return;
    
    setUploadingDocs(true);
    let successCount = 0;
    let errorCount = 0;

    for (const [docType, file] of Object.entries(documentFiles)) {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('loan_id', id!);
      formData.append('document_type', docType);

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: formData
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
}
    }

    if (successCount > 0) {
      toast.success(`${successCount} document(s) uploaded successfully`);
      setDocumentFiles({});
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} document(s) failed to upload`);
    }

    setUploadingDocs(false);
  };
  const extractIdvAmount = useCallback(() => {
    if (liveFetchedIdv) return liveFetchedIdv;
    if (!loanData) return null;
    // Check directly saved tentative_value first
    if (loanData.tentative_value && Number(loanData.tentative_value) > 0) {
      return Number(loanData.tentative_value);
    }
    let parsedLeadStageData = loanData?.lead_stage_data;
    if (typeof parsedLeadStageData === 'string') {
      try { parsedLeadStageData = JSON.parse(parsedLeadStageData); } catch(e) {}
    }
    const idvData = loanData.stage_data?.idv_data || 
                   parsedLeadStageData?.idvData ||
                   loanData.link_loan_data || 
                   loanData.stage_data || 
                   loanData.rc_data;
    if (!idvData) return null;
    const searchObj = (obj: any): number | null => {
      if (!obj || typeof obj !== 'object') return null;
      if (obj.idv || obj.idv_value || obj.tentative_idv || obj.vehicle_value) {
        return Number(obj.idv || obj.idv_value || obj.tentative_idv || obj.vehicle_value);
      }
      for (const key in obj) {
        if (typeof obj[key] === 'number' && (key.toLowerCase().includes('idv') || key.toLowerCase().includes('value'))) return obj[key];
        const res = searchObj(obj[key]);
        if (res) return res;
      }
      return null;
    };
    return searchObj(idvData);
  }, [liveFetchedIdv, loanData]);

  const tentativeAmount = useMemo(() => {
    const idv = extractIdvAmount();
    if (!idv) return null;
    const ltv = Number(form.ltv || 0);
    const maxPct = ltv > 0 ? ltv : 80;
    return idv * (maxPct / 100);
  }, [extractIdvAmount, form.ltv]);
  const emi = useMemo(() => {
    const p = Number(form.loanAmount);
    const r = Number(form.irr);
    const t = Number(form.tenure);
    if (p > 0 && r >= 0 && t > 0) return calculateEMI(p, r, t);
    return 0;
  }, [form.loanAmount, form.irr, form.tenure]);

  const totalPayable = emi * Number(form.tenure);

  // Auto-fill loanAmount with tentativeAmount if it's currently empty or 0 and not disbursed
  useEffect(() => {
    const isDisbursed = loanData?.application_stage === 'DISBURSED';
    if (!isDisbursed && (!form.loanAmount || Number(form.loanAmount) === 0) && tentativeAmount) {
      setForm(prev => ({ ...prev, loanAmount: Math.round(tentativeAmount).toString() }));
    }
  }, [tentativeAmount, form.loanAmount, loanData?.application_stage]);
  const totalInterest = totalPayable - Number(form.loanAmount);

  const updateLoan = useMutation({
    mutationFn: async () => {
      // Prepare data based on income source - explicitly null out unused fields
      const baseData: Record<string, any> = {
        customer_id: form.customerId || null,
        applicant_name: form.customerName,
        mobile: form.mobile,
        co_applicant_name: form.coApplicantName || null,
        co_applicant_mobile: form.coApplicantMobile || null,
        guarantor_name: form.guarantorName || null,
        guarantor_mobile: form.guarantorMobile || null,
        current_address: form.currentAddress || null,
        current_landmark: form.currentLandmark || null,
        landmark: form.currentLandmark || null,
        current_district: form.currentDistrict || null,
        current_state: form.currentState || null,
        current_pincode: form.currentPincode || null,
        our_branch: form.ourBranch || null,
        income_source: form.incomeSource || null,
        monthly_income: form.monthlyIncome ? Number(form.monthlyIncome) : null,
        selected_financier: form.financierName === 'Others' ? form.otherFinancierName : form.financierName,
        financier_location: form.financierLocation || null,
        loan_amount: Number(form.loanAmount) || 0,
        ltv: Number(form.ltv) || null,
        loan_type_vehicle: form.loanTypeVehicle || null,
        vehicle_number: form.vehicleNumber || null,
        engine_number: form.engineNumber || null,
        chassis_number: form.chassisNumber || null,
        owner_name: form.ownerName || null,
        maker_name: form.makerName || null,
        maker_model: form.makerModel || null,
        model_variant_name: form.modelVariantName || null,
        fuel_type: form.fuelType || null,
        manufacturing_date: form.manufacturingDate || null,
        registered_at: form.registeredAt || null,
        ownership_type: form.ownershipType || null,
        financer: form.financer || null,
        finance_status: form.financeStatus || null,
        new_hpn: form.new_hpn || null,
        challan: form.challan || 'No',
        challan_details: form.challan_details || null,
        // Store farmer fields and business setup in stage_data
        stage_data: {
          ...(typeof loanData?.stage_data === 'object' ? loanData.stage_data : {}),
          ...form.challan_details,
          hasOfficeSetup: form.hasOfficeSetup || undefined,
          agricultureLandOwnership: form.agricultureLandOwnership || undefined,
          dairyIncome: form.dairyIncome || undefined,
          numberOfCattles: form.numberOfCattles || undefined,
          jamabandhiAvailable: form.jamabandhiAvailable || undefined
        },
        insurance_company: form.insuranceCompany || null,
        insurance_valid_upto: form.insuranceValidUpto || null,
        pucc_valid_upto: form.puccValidUpto || null,
        case_type: form.caseType === 'new_car_purchase' ? 'Purchase' : 
                   form.caseType === 'used_car_purchase' ? 'Purchase' :
                   form.caseType === 'used_car_refinance' ? 'Refinance' : 
                   form.caseType === 'used_car_bt' ? 'BT' :
                   form.caseType === 'used_car_topup' ? 'Top-up' : (form.caseType || null),
        emi_amount: form.emiAmount ? Number(form.emiAmount) : (emi || null),
        total_emi: Number(form.tenure) || null,
        total_interest: (totalInterest > 0 ? totalInterest : null),
        irr: Number(form.irr) || null,
        tenure: Number(form.tenure) || 60,
        emi_start_date: form.emiStartDate || null,
        emi_end_date: form.emiEndDate || null,
        processing_fee: Number(form.processingFee) || null,
        emi: form.emiAmount ? Number(form.emiAmount) : (emi || null),
        interest_rate: Number(form.irr) || null,
        assigned_bank_id: assignmentForm.selectedBankId || form.assignedBankId || null,
        assigned_broker_id: form.assignedBrokerId || null,
        financier_name: assignmentForm.ledgerSelection || null,
        financier_branch_name: assignmentForm.selectedBranchName || null,
        financier_executive_name: assignmentForm.salesManagerName || null,
        financier_executive_mobile: assignmentForm.salesManagerMobile || null,
        financier_area_manager_name: assignmentForm.areaManagerName || null,
        financier_area_manager_mobile: assignmentForm.areaManagerMobile || null,
        assigned_to: form.assignedTo ? Number(form.assignedTo) : null,
        bouncing_last_3m: form.bouncingLast3m ? Number(form.bouncingLast3m) : null,
        bouncing_last_6m: form.bouncingLast6m ? Number(form.bouncingLast6m) : null,
        existing_loan_status: form.loanStatus || null,
        existing_loan_amount: form.existingLoanAmount ? Number(form.existingLoanAmount) : null,
        existing_tenure: form.existingTenure ? Number(form.existingTenure) : null,
        existing_emi: form.existingEmi ? Number(form.existingEmi) : null,
        no_of_emi_paid: form.noOfEmiPaid ? Number(form.noOfEmiPaid) : null,
        login_date: form.loginDate || null,
        sourcing_person_name: form.sourcingPersonName || null,
        remark: form.remark || null,
        pan_number: form.panNumber || null,
        status: form.fileStatus || 'submitted',
        disbursement_date: form.disbursementDate || null,
        created_by: user?.id,
      };

      // Add income-specific fields based on income source
      if (form.incomeSource === 'Salaried') {
        // Add Salaried fields
        baseData.company_name = form.companyName || null;
        baseData.designation = form.designation || null;
        baseData.work_experience = form.workExperience || null;
        baseData.current_job_years = form.currentJobYears || null;
        baseData.total_work_exp = form.totalWorkExp || null;
        baseData.net_monthly_salary = Number(form.netMonthlySalary) || null;
        baseData.salary_credit_mode = form.salaryCreditMode || null;
        baseData.salary_slip_available = form.salarySlipAvailable || null;
        baseData.itr_available = form.itrAvailable || null;
        baseData.annual_income_itr = Number(form.annualIncomeItr) || null;
        
        // Explicitly NULL out Self Employed fields
        baseData.profile = null;
        baseData.business_name = null;
        baseData.business_type = null;
        baseData.business_vintage = null;
        baseData.professional_subtype = null;
        baseData.practice_experience = null;
        baseData.freelancer_subtype = null;
        baseData.other_income_type = null;
      } else if (form.incomeSource === 'Self Employed') {
        // Add Self Employed fields
        baseData.profile = form.profile || null;
        baseData.itr_available = form.itrAvailable || null;
        baseData.annual_income_itr = Number(form.annualIncomeItr) || null;
        
        // Add profile-specific fields
        if (form.profile === 'Business') {
          baseData.business_name = form.businessName || null;
          baseData.business_type = form.businessType || null;
          baseData.business_vintage = form.businessVintage || null;
          baseData.has_office_setup = form.hasOfficeSetup || null;
          baseData.professional_subtype = null;
          baseData.practice_experience = null;
          baseData.freelancer_subtype = null;
          baseData.other_income_type = null;
        } else if (form.profile === 'Professional') {
          baseData.professional_subtype = form.professionalSubtype || null;
          baseData.practice_experience = form.practiceExperience || null;
          baseData.business_name = null;
          baseData.business_type = null;
          baseData.business_vintage = null;
          baseData.freelancer_subtype = null;
          baseData.other_income_type = null;
        } else if (form.profile === 'Freelancer/Agent') {
          baseData.freelancer_subtype = form.freelancerSubtype || null;
          baseData.business_name = null;
          baseData.business_type = null;
          baseData.business_vintage = null;
          baseData.professional_subtype = null;
          baseData.practice_experience = null;
          baseData.other_income_type = null;
        } else if (form.profile === 'Other Income') {
          baseData.other_income_type = form.otherIncomeType || null;
          baseData.business_name = null;
          baseData.business_type = null;
          baseData.business_vintage = null;
          baseData.professional_subtype = null;
          baseData.practice_experience = null;
          baseData.freelancer_subtype = null;
        } else {
          // No profile selected, null all
          baseData.business_name = null;
          baseData.business_type = null;
          baseData.business_vintage = null;
          baseData.professional_subtype = null;
          baseData.practice_experience = null;
          baseData.freelancer_subtype = null;
          baseData.other_income_type = null;
        }
        
        // Explicitly NULL out Salaried fields
        baseData.company_name = null;
        baseData.designation = null;
        baseData.work_experience = null;
        baseData.current_job_years = null;
        baseData.total_work_exp = null;
        baseData.net_monthly_salary = null;
        baseData.salary_credit_mode = null;
        baseData.salary_slip_available = null;
      } else {
        // No income source selected, null all income fields
        baseData.company_name = null;
        baseData.designation = null;
        baseData.work_experience = null;
        baseData.current_job_years = null;
        baseData.total_work_exp = null;
        baseData.net_monthly_salary = null;
        baseData.salary_credit_mode = null;
        baseData.salary_slip_available = null;
        baseData.profile = null;
        baseData.business_name = null;
        baseData.business_type = null;
        baseData.business_vintage = null;
        baseData.professional_subtype = null;
        baseData.practice_experience = null;
        baseData.freelancer_subtype = null;
        baseData.other_income_type = null;
        baseData.itr_available = null;
        baseData.annual_income_itr = null;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(baseData),
      });
      if (!res.ok) throw new Error('Failed to update loan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan', id] });
      toast.success('Loan updated successfully!');
      navigate('/loans');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update loan');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.mobile.trim()) {
      toast.error('Customer Name and Mobile are required');
      return;
    }
    
    // First upload documents if any
    if (Object.keys(documentFiles).length > 0) {
      await uploadDocuments();
    }
    
    // Then update the loan
    updateLoan.mutate();
  };

  // Check if mandatory documents are uploaded (for executive and team_leader roles)
  const isExecutive = user?.role === 'executive';
  const isTeamLeader = user?.role === 'team_leader';
  const mandatoryDocTypes = ['aadharFront', 'aadharBack', 'panCard', 'rcFront', 'rcBack'];
  
  // Helper to check if a doc type has an existing uploaded document
  // Map between camelCase keys (used in EditLoan) and snake_case (used in AddLead/DB)
  const docTypeMap: { [key: string]: string } = {
    aadharFront: 'aadhar_front', aadharBack: 'aadhar_back', panCard: 'pan_card',
    rcFront: 'rc_front', rcBack: 'rc_back', customerPhoto: 'customer_photo',
    drivingLicence: 'driving_licence', lightBill: 'light_bill', bankStatement: 'bank_statement',
    cheque: 'cheque', incomeProof: 'income_proof', rentAgreement: 'rent_agreement',
    disbursementMemo: 'disbursement_memo', insurance: 'insurance', customerLedger: 'customer_ledger'
  };
  const getExistingDoc = (docType: string) => {
    const snakeType = docTypeMap[docType] || docType;
    return existingDocuments.find((d: any) => d.document_type === docType || d.document_type === snakeType);
  };
  const hasDoc = (docType: string) => !!documentFiles[docType] || !!getExistingDoc(docType);
  
  const mandatoryDocsUploaded = mandatoryDocTypes.every(docType => hasDoc(docType));
  const showOtherDocs = (!isExecutive && !isTeamLeader) || mandatoryDocsUploaded;

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground text-sm">Loading loan details…</div>;
  }

  const inputClass = "w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all";
  const labelClass = "block text-[10px] font-medium text-foreground/70 mb-1";

  return (
    <div className="w-full max-w-full">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground mb-2">Edit Loan Application</h1>
        <p className="text-sm text-muted-foreground">Loan ID: {form.loanNumber}</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-full">
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm mb-4 space-y-6 w-full">
          {/* Customer Details */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Customer Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="floating-input-wrapper"><input className={inputClass} value={form.customerId} onChange={e => update('customerId', e.target.value)} placeholder=" " /><label className={labelClass}>Customer ID</label></div>
                <div className="floating-input-wrapper"><input required className={inputClass} value={form.customerName} onChange={e => update('customerName', e.target.value)} placeholder=" " /><label className={labelClass}>Customer Name *</label></div>
                <div className="floating-input-wrapper"><input required className={inputClass} value={form.mobile} onChange={e => update('mobile', e.target.value)} maxLength={10} placeholder=" " /><label className={labelClass}>Mobile No *</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.panNumber} onChange={e => update('panNumber', e.target.value.toUpperCase())} maxLength={10} placeholder=" " /><label className={labelClass}>PAN Number</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.sourcingPersonName} onChange={e => update('sourcingPersonName', e.target.value)} placeholder=" " /><label className={labelClass}>Sourcing Person</label></div>
                <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.loginDate} onChange={e => update('loginDate', e.target.value)} placeholder=" " /><label className={labelClass}>Login Date</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.financierName} onChange={e => update('financierName', e.target.value)} placeholder=" " /><label className={labelClass}>Financier Name</label></div>
                
                {assignableUsers.length > 0 && (
                  <div className="floating-input-wrapper">
                    <select className={inputClass} value={form.assignedTo || ''} onChange={e => update('assignedTo', e.target.value)}>
                      <option value="">Self (Unassigned) - Optional</option>
                      {assignableUsers.map((user: any) => (
                        <option key={user.id} value={user.id}>{user.full_name || user.user_id} ({user.role})</option>
                      ))}
                    </select>
                    <label className={labelClass}>Assign To (Optional)</label>
                  </div>
                )}
                
                {/* Co-Applicant Section */}
                <div className="col-span-2 md:col-span-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowOptionalFields(s => ({ ...s, coApplicant: !s.coApplicant }))}
                    className="flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
                  >
                    {showOptionalFields.coApplicant ? '−' : '+'} Add Co-Applicant Details
                  </button>
                  {showOptionalFields.coApplicant && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                      <div className="floating-input-wrapper"><input className={inputClass} value={form.coApplicantName} onChange={e => update('coApplicantName', e.target.value)} placeholder=" " /><label className={labelClass}>Co-Applicant Name</label></div>
                      <div className="floating-input-wrapper"><input className={inputClass} value={form.coApplicantMobile} onChange={e => { const value = e.target.value.replace(/\D/g, ''); update('coApplicantMobile', value); }} maxLength={10} inputMode='numeric' placeholder=" " /><label className={labelClass}>Co-Applicant Mobile</label></div>
                    </div>
                  )}
                </div>
                
                {/* Guarantor Section */}
                <div className="col-span-2 md:col-span-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowOptionalFields(s => ({ ...s, guarantor: !s.guarantor }))}
                    className="flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
                  >
                    {showOptionalFields.guarantor ? '−' : '+'} Add Guarantor Details
                  </button>
                  {showOptionalFields.guarantor && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                      <div className="floating-input-wrapper"><input className={inputClass} value={form.guarantorName} onChange={e => update('guarantorName', e.target.value)} placeholder=" " /><label className={labelClass}>Guarantor Name</label></div>
                      <div className="floating-input-wrapper"><input className={inputClass} value={form.guarantorMobile} onChange={e => { const value = e.target.value.replace(/\D/g, ''); update('guarantorMobile', value); }} maxLength={10} inputMode='numeric' placeholder=" " /><label className={labelClass}>Guarantor Mobile</label></div>
                    </div>
                  )}
                </div>
                
                <div className="md:col-span-3 mt-3"><h3 className="font-semibold text-foreground mb-2 text-sm">Current Address</h3></div>
                <div className="col-span-2 md:col-span-3 floating-input-wrapper"><textarea className={inputClass} rows={2} value={form.currentAddress} onChange={e => update('currentAddress', e.target.value)} placeholder=" " /><label className={labelClass}>Address</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.currentLandmark} onChange={e => update('currentLandmark', e.target.value)} placeholder=" " /><label className={labelClass}>Landmark</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.currentDistrict} onChange={e => update('currentDistrict', e.target.value)} placeholder=" " /><label className={labelClass}>District</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.currentState} onChange={e => update('currentState', e.target.value)} placeholder=" " /><label className={labelClass}>State</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.currentPincode} onChange={e => update('currentPincode', e.target.value)} maxLength={6} placeholder=" " /><label className={labelClass}>Pincode</label></div>
              </div>
            </div>

          {/* Vehicle & Loan */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Vehicle & Loan Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="relative floating-input-wrapper">
                  <input 
                    className="w-full px-3 py-2 pr-28 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all" 
                    value={form.vehicleNumber} 
                    onChange={e => { update('vehicleNumber', e.target.value.toUpperCase()); setRcFetchCount(0); setChallanInfo(null); }}
                    placeholder=" "
                  />
                  <label className={labelClass}>Vehicle Reg. No</label>
                  <button
                    type="button"
                    onClick={() => fetchVehicleDetails(form.vehicleNumber)}
                    disabled={!form.vehicleNumber || form.vehicleNumber.length < 8 || fetchingVehicleData}
                    className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded bg-accent text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {fetchingVehicleData ? (
                      <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Fetching...</span></>
                    ) : rcFetchCount === 0 ? (
                      <><Search size={11} /><span>Load DB</span></>
                    ) : (
                      <><Search size={11} /><span>Fresh API</span></>
                    )}
                  </button>
                </div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.makerName} onChange={e => update('makerName', e.target.value)} placeholder=" " /><label className={labelClass}>Vehicle Company Name</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.makerModel} onChange={e => update('makerModel', e.target.value)} placeholder=" " /><label className={labelClass}>Vehicle Model</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.engineNumber} onChange={e => update('engineNumber', e.target.value)} placeholder=" " /><label className={labelClass}>Engine Number</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.chassisNumber} onChange={e => update('chassisNumber', e.target.value)} placeholder=" " /><label className={labelClass}>Chassis Number</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.ownerName} onChange={e => update('ownerName', e.target.value)} placeholder=" " /><label className={labelClass}>Owner Name</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.fuelType} onChange={e => update('fuelType', e.target.value)} placeholder=" " /><label className={labelClass}>Fuel Type</label></div>
                <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.manufacturingDate} onChange={e => update('manufacturingDate', e.target.value)} placeholder=" " /><label className={labelClass}>Manufacturing Date</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.registeredAt} onChange={e => update('registeredAt', e.target.value)} placeholder=" " /><label className={labelClass}>Registered At</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.ownershipType} onChange={e => update('ownershipType', e.target.value)} placeholder=" " /><label className={labelClass}>Ownership Type</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.financer} onChange={e => update('financer', e.target.value)} placeholder=" " /><label className={labelClass}>Financer</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.financeStatus} onChange={e => update('financeStatus', e.target.value)} placeholder=" " /><label className={labelClass}>Finance Status</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.insuranceCompany} onChange={e => update('insuranceCompany', e.target.value)} placeholder=" " /><label className={labelClass}>Insurance Company</label></div>
                <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.insuranceValidUpto} onChange={e => update('insuranceValidUpto', e.target.value)} placeholder=" " /><label className={labelClass}>Insurance Valid Upto</label></div>
                <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.puccValidUpto} onChange={e => update('puccValidUpto', e.target.value)} placeholder=" " /><label className={labelClass}>PUCC Valid Upto</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.caseType} onChange={e => update('caseType', e.target.value)} placeholder=" " /><label className={labelClass}>Case Type</label></div>

                {/* Challan Info — shown after RC fetch */}
                {challanInfo && (
                  <div className={`col-span-2 md:col-span-3 rounded-lg border-2 p-3 ${
                    challanInfo.status === 'Yes'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-700'
                      : 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-700'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{challanInfo.status === 'Yes' ? '⚠️' : '✅'}</span>
                      <span className={`text-xs font-bold ${
                        challanInfo.status === 'Yes' ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'
                      }`}>
                        Challan Status: {challanInfo.status === 'Yes' ? `${challanInfo.count} Pending Challan${challanInfo.count > 1 ? 's' : ''} Found (Total Amount: ₹${(challanInfo.challans || []).reduce((sum: number, c: any) => sum + Number(c.amount || c.fine_amount || c.challan_amount || 0), 0).toLocaleString('en-IN')})` : 'No Pending Challans'}
                      </span>
                    </div>
                    {challanInfo.challans.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {challanInfo.challans.map((c: any, i: number) => (
                          <div key={i} className="bg-white/70 dark:bg-black/20 rounded p-2 text-[10px] grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-0.5">
                            {c.challan_number && <div><span className="text-muted-foreground">No: </span><span className="font-semibold">{c.challan_number}</span></div>}
                            {c.challan_date && <div><span className="text-muted-foreground">Date: </span><span className="font-semibold">{c.challan_date}</span></div>}
                            {(c.amount || c.fine_amount || c.challan_amount) && <div><span className="text-muted-foreground">Fine: </span><span className="font-semibold text-red-600">₹{c.amount || c.fine_amount || c.challan_amount}</span></div>}
                            {c.state && <div><span className="text-muted-foreground">State: </span><span className="font-semibold">{c.state}</span></div>}
                            {c.offense_details && <div className="col-span-2 md:col-span-3"><span className="text-muted-foreground">Offense: </span><span className="font-semibold">{c.offense_details}</span></div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          {/* Income Details */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Income Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="floating-input-wrapper">
                <select className={inputClass} value={form.incomeSource} onChange={e => update('incomeSource', e.target.value)}>
                  <option value="" disabled hidden></option>
                  <option value="Salaried">Salaried</option>
                  <option value="Self Employed">Self Employed</option>
                </select>
                <label className={labelClass}>Income Source</label>
              </div>
            </div>

            {/* Salaried Income Fields */}
            {form.incomeSource === 'Salaried' && (
              <div className="mt-4 p-4 rounded-lg bg-muted/20 border border-muted">
                <h3 className="text-sm font-semibold text-foreground mb-3">Salaried Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="floating-input-wrapper">
                    <input className={inputClass} value={form.companyName} onChange={e => update('companyName', e.target.value)} placeholder=" " />
                    <label className={labelClass}>Company Name</label>
                  </div>
                  {form.companyName && (
                    <div className="floating-input-wrapper">
                      <input className={inputClass} value={form.designation} onChange={e => update('designation', e.target.value)} placeholder=" " />
                      <label className={labelClass}>Designation</label>
                    </div>
                  )}
                  {form.designation && (
                    <div className="floating-input-wrapper">
                      <input type="number" className={inputClass} value={form.netMonthlySalary} onChange={e => update('netMonthlySalary', e.target.value)} placeholder=" " />
                      <label className={labelClass}>Net Monthly Salary</label>
                    </div>
                  )}
                  {form.netMonthlySalary && (
                    <>
                      <div className="floating-input-wrapper">
                        <select className={inputClass} value={form.salarySlipAvailable} onChange={e => update('salarySlipAvailable', e.target.value)}>
                          <option value="" disabled hidden></option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                        <label className={labelClass}>Salary Slip Available</label>
                      </div>
                      <div className="floating-input-wrapper">
                        <input type="number" className={inputClass} value={form.currentJobYears} onChange={e => update('currentJobYears', e.target.value)} placeholder=" " />
                        <label className={labelClass}>Current Job (In Yrs)</label>
                      </div>
                      <div className="floating-input-wrapper">
                        <input type="number" className={inputClass} value={form.totalWorkExp} onChange={e => update('totalWorkExp', e.target.value)} placeholder=" " />
                        <label className={labelClass}>Total Work Exp. (In Yrs)</label>
                      </div>
                      <div className="floating-input-wrapper">
                        <select className={inputClass} value={form.salaryCreditMode} onChange={e => update('salaryCreditMode', e.target.value)}>
                          <option value="" disabled hidden></option>
                          <option value="Account Transfer">Account Transfer</option>
                          <option value="Cash">Cash</option>
                        </select>
                        <label className={labelClass}>Salary Credit Mode</label>
                      </div>
                      <div className="floating-input-wrapper">
                        <select className={inputClass} value={form.itrAvailable} onChange={e => update('itrAvailable', e.target.value)}>
                          <option value="" disabled hidden></option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                        <label className={labelClass}>ITR Available</label>
                      </div>
                      {form.itrAvailable === 'Yes' && (
                        <div className="floating-input-wrapper col-span-2">
                          <input type="number" className={inputClass} value={form.annualIncomeItr} onChange={e => update('annualIncomeItr', e.target.value)} placeholder=" " />
                          <label className={labelClass}>Annual Income (ITR)</label>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Self Employed Fields */}
            {form.incomeSource === 'Self Employed' && (
              <div className="mt-4 p-4 rounded-lg bg-muted/20 border border-muted">
                <h3 className="text-sm font-semibold text-foreground mb-3">Self Employed Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="floating-input-wrapper">
                    <select className={inputClass} value={form.profile} onChange={e => update('profile', e.target.value)}>
                      <option value="" disabled hidden></option>
                      <option value="Business">Business</option>
                      <option value="Professional">Professional</option>
                      <option value="Freelancer/Agent">Freelancer/Agent</option>
                      <option value="Farmer">Farmer</option>
                      <option value="Other Income">Other Income</option>
                    </select>
                    <label className={labelClass}>Profile</label>
                  </div>

                  {form.profile !== 'Farmer' && (
                    <div className="floating-input-wrapper">
                      <select className={inputClass} value={form.hasOfficeSetup || ''} onChange={e => update('hasOfficeSetup', e.target.value)}>
                        <option value="" disabled hidden></option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                      <label className={labelClass}>Office Setup</label>
                    </div>
                  )}

                  {form.profile === 'Business' && (
                    <>
                      <div className="floating-input-wrapper"><input className={inputClass} value={form.businessName} onChange={e => update('businessName', e.target.value)} placeholder=" " /><label className={labelClass}>Business Name</label></div>
                      <div className="floating-input-wrapper"><input className={inputClass} value={form.businessType} onChange={e => update('businessType', e.target.value)} placeholder=" " /><label className={labelClass}>Business Type</label></div>
                      <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.businessVintage} onChange={e => update('businessVintage', e.target.value)} placeholder=" " /><label className={labelClass}>Business Vintage (Years)</label></div>
                    </>
                  )}

                  {form.profile === 'Professional' && (
                    <>
                      <div className="floating-input-wrapper">
                        <select className={inputClass} value={form.professionalSubtype} onChange={e => update('professionalSubtype', e.target.value)}>
                          <option value="" disabled hidden></option>
                          <option value="CA">CA</option>
                          <option value="Doctor">Doctor</option>
                          <option value="Engineer">Engineer</option>
                          <option value="Architect">Architect</option>
                        </select>
                        <label className={labelClass}>Professional Subtype</label>
                      </div>
                      <div className="floating-input-wrapper">
                        <input type="number" className={inputClass} value={form.practiceExperience} onChange={e => update('practiceExperience', e.target.value)} placeholder=" " />
                        <label className={labelClass}>Practice Experience (In Yrs)</label>
                      </div>
                    </>
                  )}

                  {form.profile === 'Freelancer/Agent' && (
                    <div className="floating-input-wrapper">
                      <select className={inputClass} value={form.freelancerSubtype} onChange={e => update('freelancerSubtype', e.target.value)}>
                        <option value="" disabled hidden></option>
                        <option value="IT Freelancer">IT Freelancer</option>
                        <option value="LIC Agent">LIC Agent</option>
                        <option value="Property Broker">Property Broker</option>
                        <option value="Gig Worker">Gig Worker</option>
                      </select>
                      <label className={labelClass}>Subtype</label>
                    </div>
                  )}

                  {form.profile === 'Other Income' && (
                    <div className="floating-input-wrapper">
                      <input className={inputClass} value={form.otherIncomeType} onChange={e => update('otherIncomeType', e.target.value)} placeholder=" " />
                      <label className={labelClass}>Profession</label>
                    </div>
                  )}

                  {form.profile === 'Farmer' && (
                    <>
                      <div className="floating-input-wrapper">
                        <input className={inputClass} value={form.agricultureLandOwnership || ''} onChange={e => update('agricultureLandOwnership', e.target.value)} placeholder=" " />
                        <label className={labelClass}>Agriculture Land Ownership (Self)</label>
                      </div>
                      <div className="floating-input-wrapper">
                        <select className={inputClass} value={form.dairyIncome || ''} onChange={e => update('dairyIncome', e.target.value)}>
                          <option value="" disabled hidden></option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                        <label className={labelClass}>Dairy Income</label>
                      </div>
                      {form.dairyIncome === 'Yes' && (
                        <div className="floating-input-wrapper">
                          <input type="number" className={inputClass} value={form.numberOfCattles || ''} onChange={e => update('numberOfCattles', e.target.value)} placeholder=" " />
                          <label className={labelClass}>Number of Cattles</label>
                        </div>
                      )}
                      <div className="floating-input-wrapper">
                        <select className={inputClass} value={form.jamabandhiAvailable || ''} onChange={e => update('jamabandhiAvailable', e.target.value)}>
                          <option value="" disabled hidden></option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                        <label className={labelClass}>Jamabandhi Available</label>
                      </div>
                    </>
                  )}

                  {(form.profile === 'Business' || form.profile === 'Professional' || form.profile === 'Freelancer/Agent' || form.profile === 'Other Income') && (
                    <>
                      <div className="floating-input-wrapper">
                        <select className={inputClass} value={form.itrAvailable} onChange={e => update('itrAvailable', e.target.value)}>
                          <option value="" disabled hidden></option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                        <label className={labelClass}>ITR Available</label>
                      </div>
                      {form.itrAvailable === 'Yes' && (
                        <div className="floating-input-wrapper col-span-2">
                          <input type="number" className={inputClass} value={form.annualIncomeItr} onChange={e => update('annualIncomeItr', e.target.value)} placeholder=" " />
                          <label className={labelClass}>Annual Income (ITR)</label>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Documents */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Documents</h2>
              
              {/* Customer Documents */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Customer Documents {(isExecutive || isTeamLeader) && <span className="text-xs text-red-500">(Upload mandatory documents first)</span>}</h3>
                
                {/* Mandatory Documents for Executive */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className={labelClass}>Aadhar Card Front {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    {documentFiles.aadharFront ? (
                      <p className="text-xs text-green-600 mt-1">✓ {documentFiles.aadharFront.name} (new)</p>
                    ) : getExistingDoc('aadharFront') ? (
                      <p className="text-xs text-blue-600 mt-1">✓ {getExistingDoc('aadharFront').file_name} (uploaded)</p>
                    ) : (
                      <input type="file" className={inputClass} onChange={e => update('aadharFront', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Aadhar Card Back {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    {documentFiles.aadharBack ? (
                      <p className="text-xs text-green-600 mt-1">✓ {documentFiles.aadharBack.name} (new)</p>
                    ) : getExistingDoc('aadharBack') ? (
                      <p className="text-xs text-blue-600 mt-1">✓ {getExistingDoc('aadharBack').file_name} (uploaded)</p>
                    ) : (
                      <input type="file" className={inputClass} onChange={e => update('aadharBack', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Pan Card {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    {documentFiles.panCard ? (
                      <p className="text-xs text-green-600 mt-1">✓ {documentFiles.panCard.name} (new)</p>
                    ) : getExistingDoc('panCard') ? (
                      <p className="text-xs text-blue-600 mt-1">✓ {getExistingDoc('panCard').file_name} (uploaded)</p>
                    ) : (
                      <input type="file" className={inputClass} onChange={e => update('panCard', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>RC (Front) {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    {documentFiles.rcFront ? (
                      <p className="text-xs text-green-600 mt-1">✓ {documentFiles.rcFront.name} (new)</p>
                    ) : getExistingDoc('rcFront') ? (
                      <p className="text-xs text-blue-600 mt-1">✓ {getExistingDoc('rcFront').file_name} (uploaded)</p>
                    ) : (
                      <input type="file" className={inputClass} onChange={e => update('rcFront', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>RC (Back) {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    {documentFiles.rcBack ? (
                      <p className="text-xs text-green-600 mt-1">✓ {documentFiles.rcBack.name} (new)</p>
                    ) : getExistingDoc('rcBack') ? (
                      <p className="text-xs text-blue-600 mt-1">✓ {getExistingDoc('rcBack').file_name} (uploaded)</p>
                    ) : (
                      <input type="file" className={inputClass} onChange={e => update('rcBack', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />
                    )}
                  </div>
                </div>

                {/* Other Documents - Show only after mandatory docs are uploaded */}
                {showOtherDocs ? (
                  <>
                    {(isExecutive || isTeamLeader) && <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs text-green-700 dark:text-green-300">✓ Mandatory documents uploaded. You can now upload additional documents.</div>}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Driving Licence</label>
                        {documentFiles.drivingLicence ? (
                          <p className="text-xs text-green-600 mt-1">✓ {documentFiles.drivingLicence.name} (new)</p>
                        ) : getExistingDoc('drivingLicence') ? (
                          <p className="text-xs text-blue-600 mt-1">✓ {getExistingDoc('drivingLicence').file_name} (uploaded)</p>
                        ) : (
                          <input type="file" className={inputClass} onChange={e => update('drivingLicence', e.target.files?.[0] || null)} accept="image/*,.pdf" />
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Light Bill</label>
                        {documentFiles.lightBill ? (
                          <p className="text-xs text-green-600 mt-1">✓ {documentFiles.lightBill.name} (new)</p>
                        ) : getExistingDoc('lightBill') ? (
                          <p className="text-xs text-blue-600 mt-1">✓ {getExistingDoc('lightBill').file_name} (uploaded)</p>
                        ) : (
                          <input type="file" className={inputClass} onChange={e => update('lightBill', e.target.files?.[0] || null)} accept="image/*,.pdf" />
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Last 6 Month Bank Statement</label>
                        {documentFiles.bankStatement ? (
                          <p className="text-xs text-green-600 mt-1">✓ {documentFiles.bankStatement.name} (new)</p>
                        ) : getExistingDoc('bankStatement') ? (
                          <p className="text-xs text-blue-600 mt-1">✓ {getExistingDoc('bankStatement').file_name} (uploaded)</p>
                        ) : (
                          <input type="file" className={inputClass} onChange={e => update('bankStatement', e.target.files?.[0] || null)} accept="image/*,.pdf" />
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Cheque</label>
                        {documentFiles.cheque ? (
                          <p className="text-xs text-green-600 mt-1">✓ {documentFiles.cheque.name} (new)</p>
                        ) : getExistingDoc('cheque') ? (
                          <p className="text-xs text-blue-600 mt-1">✓ {getExistingDoc('cheque').file_name} (uploaded)</p>
                        ) : (
                          <input type="file" className={inputClass} onChange={e => update('cheque', e.target.files?.[0] || null)} accept="image/*,.pdf" />
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Income Proof</label>
                        {documentFiles.incomeProof ? (
                          <p className="text-xs text-green-600 mt-1">✓ {documentFiles.incomeProof.name} (new)</p>
                        ) : getExistingDoc('incomeProof') ? (
                          <p className="text-xs text-blue-600 mt-1">✓ {getExistingDoc('incomeProof').file_name} (uploaded)</p>
                        ) : (
                          <input type="file" className={inputClass} onChange={e => update('incomeProof', e.target.files?.[0] || null)} accept="image/*,.pdf" />
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Rent Agreement</label>
                        {documentFiles.rentAgreement ? (
                          <p className="text-xs text-green-600 mt-1">✓ {documentFiles.rentAgreement.name} (new)</p>
                        ) : getExistingDoc('rentAgreement') ? (
                          <p className="text-xs text-blue-600 mt-1">✓ {getExistingDoc('rentAgreement').file_name} (uploaded)</p>
                        ) : (
                          <input type="file" className={inputClass} onChange={e => update('rentAgreement', e.target.files?.[0] || null)} accept="image/*,.pdf" />
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Customer Photo</label>
                        {documentFiles.customerPhoto ? (
                          <p className="text-xs text-green-600 mt-1">✓ {documentFiles.customerPhoto.name} (new)</p>
                        ) : getExistingDoc('customerPhoto') ? (
                          <p className="text-xs text-blue-600 mt-1">✓ {getExistingDoc('customerPhoto').file_name} (uploaded)</p>
                        ) : (
                          <input type="file" className={inputClass} onChange={e => update('customerPhoto', e.target.files?.[0] || null)} accept="image/*" />
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Disbursement Memo</label>
                        {documentFiles.disbursementMemo ? (
                          <p className="text-xs text-green-600 mt-1">✓ {documentFiles.disbursementMemo.name} (new)</p>
                        ) : getExistingDoc('disbursementMemo') ? (
                          <p className="text-xs text-blue-600 mt-1">✓ {getExistingDoc('disbursementMemo').file_name} (uploaded)</p>
                        ) : (
                          <input type="file" className={inputClass} onChange={e => update('disbursementMemo', e.target.files?.[0] || null)} accept="image/*,.pdf" />
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Insurance</label>
                        {documentFiles.insurance ? (
                          <p className="text-xs text-green-600 mt-1">✓ {documentFiles.insurance.name} (new)</p>
                        ) : getExistingDoc('insurance') ? (
                          <p className="text-xs text-blue-600 mt-1">✓ {getExistingDoc('insurance').file_name} (uploaded)</p>
                        ) : (
                          <input type="file" className={inputClass} onChange={e => update('insurance', e.target.files?.[0] || null)} accept="image/*,.pdf" />
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Customer Ledger</label>
                        {documentFiles.customerLedger ? (
                          <p className="text-xs text-green-600 mt-1">✓ {documentFiles.customerLedger.name} (new)</p>
                        ) : getExistingDoc('customerLedger') ? (
                          <p className="text-xs text-blue-600 mt-1">✓ {getExistingDoc('customerLedger').file_name} (uploaded)</p>
                        ) : (
                          <input type="file" className={inputClass} onChange={e => update('customerLedger', e.target.files?.[0] || null)} accept="image/*,.pdf" />
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs text-yellow-700 dark:text-yellow-300">
                    ⚠️ Please upload all 5 mandatory documents (Aadhar Front, Aadhar Back, PAN Card, RC Front, RC Back) to unlock additional document uploads.
                  </div>
                )}
              </div>

              {/* Show all existing uploaded documents */}
              {existingDocuments.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-2">
                    Uploaded Documents ({existingDocuments.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {existingDocuments.map((doc: any, i: number) => (
                      <div key={doc.id || i} className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 rounded px-2 py-1.5 border border-blue-100 dark:border-blue-800">
                        <span className="text-green-500">✓</span>
                        <span className="truncate flex-1" title={doc.file_name}>{doc.document_type?.replace(/_/g, ' ') || doc.file_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          {/* Assignment Details */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Assignment Details</h2>
            
            {/* Step-4 Style Lender Recommendation Card */}
            {assignmentForm.ledgerSelection && assignmentForm.ledgerSelection !== 'Others' && banks.find((b: any) => b.name === assignmentForm.ledgerSelection) && (
              <div className="mb-6">
                {(() => {
                  const bank = banks.find((b: any) => b.name === assignmentForm.ledgerSelection);
                  if (!bank) return null;
                  
                  const ct = (form.caseType || '').toLowerCase();
                  let productName = 'Used Car Purchase';
                  if (ct.includes('new')) productName = 'New Car Purchase';
                  else if (ct.includes('refinance')) productName = 'Used Car Refinance Up';
                  else if (ct.includes('bt') || ct.includes('top')) productName = 'Used Car BT/Top Up';
                  
                  const exactRate = selectedBankRates.find((r: any) => r.product_name === productName);
                  const rate = exactRate || (selectedBankRates && selectedBankRates.length > 0 ? selectedBankRates[0] : null);
                  const interestRate = rate?.racc_rate ? `${rate.racc_rate}% p.a.` : (rate?.min_rate ? `${rate.min_rate}% p.a.` : 'N/A');
                  const tenure = rate?.max_tenure ? `${rate.max_tenure} months` : (rate?.min_tenure ? `${rate.min_tenure} months` : 'N/A');

                  let maxLoan = 'N/A';
                  const idv = extractIdvAmount();
                  if (idv) {
                    let minPct = 80, maxPct = 90;
                    if (productName.includes('Refinance')) { minPct = 80; maxPct = 120; }
                    else if (productName.includes('BT')) { minPct = 120; maxPct = 160; }
                    else if (productName.includes('Top')) { minPct = 100; maxPct = 120; }
                    const minL = idv * (minPct / 100);
                    const maxL = idv * (maxPct / 100);
                    const fmt = (v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(2)}L` : `₹${Math.round(v).toLocaleString('en-IN')}`;
                    maxLoan = `${fmt(minL)} - ${fmt(maxL)}`;
                  } else if (rate?.max_loan_amount) {
                    maxLoan = `Up to ₹${(Number(rate.max_loan_amount)/100000).toFixed(2)}L`;
                  } else if (form.loanAmount && Number(form.loanAmount) > 0) {
                    maxLoan = `₹${Number(form.loanAmount).toLocaleString('en-IN')}`;
                  }

                  const tentativeDisplay = idv ? (idv >= 100000 ? `₹${(idv / 100000).toFixed(2)} lacs` : `₹${idv.toLocaleString('en-IN')}`) : 'N/A';
                  
                  // Calculate EMI range
                  let emiDisplay = '---';
                  if (idv && rate) {
                    const r = rate.racc_rate ? parseFloat(rate.racc_rate) : (rate.min_rate ? parseFloat(rate.min_rate) : null);
                    const t = rate.max_tenure ? parseInt(rate.max_tenure) : (rate.min_tenure ? parseInt(rate.min_tenure) : null);
                    if (r && t) {
                      let minPct = 80, maxPct = 90;
                      if (productName.includes('Refinance')) { minPct = 80; maxPct = 120; }
                      else if (productName.includes('BT')) { minPct = 120; maxPct = 160; }
                      else if (productName.includes('Top')) { minPct = 100; maxPct = 120; }
                      const minP = idv * (minPct / 100);
                      const maxP = idv * (maxPct / 100);
                      const calcE = (p: number, ann: number, m: number) => { const mr = (ann / 12) / 100; return Math.round(p * mr * Math.pow(1 + mr, m) / (Math.pow(1 + mr, m) - 1)); };
                      const minEmi = calcE(minP, r, t);
                      const maxEmi = calcE(maxP, r, t);
                      emiDisplay = `₹${minEmi.toLocaleString('en-IN')} - ₹${maxEmi.toLocaleString('en-IN')}`;
                    }
                  }
                  
                  return (
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[20px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                      <div className="absolute top-0 right-6 bg-[#fde68a] text-[#92400e] text-[10px] font-bold px-3 py-1 rounded-b-md">
                        Selected Lender
                      </div>
                      
                      <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pt-1">
                        <div className="flex gap-4 items-center">
                          <div className="w-[60px] h-[48px] bg-white border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl flex items-center justify-center p-1.5 shadow-sm overflow-hidden">
                            {bank.logo_url ? (
                              <img src={resolveImageUrl(bank.logo_url)} alt={bank.name} className="w-full h-full object-contain" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                            ) : (
                              <span className="text-slate-700 dark:text-slate-200 font-bold tracking-tight text-base">{bank.name.substring(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex flex-col justify-center">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[15px] leading-tight mb-1">{bank.name}</h3>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 pt-5 border-t border-slate-100 dark:border-slate-800/50">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Tentative Value</span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{tentativeDisplay}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Loan Amount Range</span>
                          <span className="text-sm font-bold text-[#c2410c] dark:text-orange-400">{maxLoan}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">ROI / IRR</span>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{interestRate}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Max Tenure</span>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{tenure}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">EMI Range</span>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{emiDisplay}/Mo</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Final EMI</span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {form.emiAmount ? `₹${Number(form.emiAmount).toLocaleString('en-IN')}` : (emi ? `₹${Math.round(emi).toLocaleString('en-IN')}` : '---')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <div className="floating-input-wrapper"><input required type="number" className={inputClass} value={form.loanAmount} onChange={e => { update('loanAmount', e.target.value); update('emiAmount', ''); }} placeholder=" " /><label className={labelClass}>Loan Amount (₹) *</label></div>
              <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.tenure} onChange={e => { update('tenure', e.target.value); update('emiAmount', ''); }} placeholder=" " /><label className={labelClass}>Tenure (Months)</label></div>
              <div className="floating-input-wrapper"><input type="number" step="0.01" className={inputClass} value={form.irr} onChange={e => { update('irr', e.target.value); update('emiAmount', ''); }} placeholder=" " /><label className={labelClass}>ROI / IRR (%)</label></div>
              <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.emiAmount || (emi ? Math.round(emi) : '')} onChange={e => update('emiAmount', e.target.value)} placeholder=" " /><label className={labelClass}>Calculated EMI (₹)</label></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Lender */}
              <div className="floating-input-wrapper">
                <select 
                  className={inputClass}
                  value={assignmentForm.ledgerSelection}
                  onChange={e => handleLenderChange(e.target.value)}
                >
                  <option value="">Choose lender</option>
                  {lenders.map((lender) => (
                    <option key={lender} value={lender}>{lender}</option>
                  ))}
                </select>
                <label className={labelClass}>Select Lender</label>
              </div>

              {/* Branch dropdown — shown when branches exist */}
              {assignmentForm.ledgerSelection && assignmentForm.ledgerSelection !== 'Others' && (
                <div className="floating-input-wrapper">
                  <select
                    className={inputClass}
                    value={assignmentForm.selectedBranchId}
                    onChange={e => handleBranchChange(e.target.value)}
                    disabled={loadingBranches || branchOptions.length === 0}
                  >
                    <option value="">{branchOptions.length === 0 ? '— No branches added —' : '— Select branch —'}</option>
                    {branchOptions.map((b: any) => (
                      <option key={b.id} value={String(b.id)}>{b.branch_name}{b.location ? ` (${b.location})` : ''}</option>
                    ))}
                  </select>
                  <label className={labelClass}>Select Branch {loadingBranches && <span className="text-muted-foreground">(loading...)</span>}</label>
                </div>
              )}

              {/* Sales Manager */}
              {assignmentForm.selectedBranchId && (
                <>
                  <div className="floating-input-wrapper">
                    <input className={inputClass} value={assignmentForm.salesManagerName} readOnly placeholder=" " />
                    <label className={labelClass}>Sales Manager</label>
                  </div>

                  <div className="floating-input-wrapper">
                    <input className={inputClass} value={assignmentForm.salesManagerMobile} readOnly placeholder=" " />
                    <label className={labelClass}>Sales Manager Mobile</label>
                  </div>

                  <div className="floating-input-wrapper">
                    <input className={inputClass} value={assignmentForm.areaManagerName} readOnly placeholder=" " />
                    <label className={labelClass}>Area Manager</label>
                  </div>

                  <div className="floating-input-wrapper">
                    <input className={inputClass} value={assignmentForm.areaManagerMobile} readOnly placeholder=" " />
                    <label className={labelClass}>Area Manager Mobile</label>
                  </div>
                </>
              )}
              
              {/* Remarks */}
              <div className="col-span-2 md:col-span-3 floating-input-wrapper">
                <textarea 
                  className={inputClass}
                  rows={2}
                  value={assignmentForm.remarks}
                  onChange={e => setAssignmentForm(f => ({ ...f, remarks: e.target.value }))}
                  placeholder=" "
                />
                <label className={labelClass}>Assignment Remarks (Optional)</label>
              </div>
            </div>
          </div>

          {/* Other Details */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Other Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.loginDate} onChange={e => update('loginDate', e.target.value)} placeholder=" " /><label className={labelClass}>Login Date</label></div>
              <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.disbursementDate} onChange={e => update('disbursementDate', e.target.value)} placeholder=" " /><label className={labelClass}>Disbursement Date</label></div>
              <div className="floating-input-wrapper"><input className={inputClass} value={form.sourcingPersonName} onChange={e => update('sourcingPersonName', e.target.value)} placeholder=" " /><label className={labelClass}>Sourcing Person</label></div>
              <div className="md:col-span-3 floating-input-wrapper"><textarea className={inputClass} rows={3} value={form.remark} onChange={e => update('remark', e.target.value)} placeholder=" " /><label className={labelClass}>Remark</label></div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pb-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 rounded-xl border-2 border-border font-semibold hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateLoan.isPending || uploadingDocs}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-60 disabled:hover:scale-100"
            >
              {updateLoan.isPending || uploadingDocs ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {uploadingDocs ? 'Uploading Documents...' : 'Updating...'}
                </span>
              ) : '✓ Update Application'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

