import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronDown, Loader2, Link as LinkIcon, Car, CreditCard, User, Info, AlertTriangle, CheckCircle, Tag, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import CreditReportSummary from '@/components/CreditReportSummary';
import LinkLoanFinderStep from '@/components/LinkLoanFinderStep';
import ConsentModal from '@/components/ConsentModal';
import { useAuth } from '@/contexts/AuthContext';

const inputClass = "w-full px-4 py-3.5 text-sm font-medium rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] placeholder:text-[#94A3B8] placeholder:font-normal focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all shadow-2xs";
const selectClass = "w-full px-4 py-3.5 text-sm font-medium rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] appearance-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all shadow-2xs pr-10 cursor-pointer";
const labelClass = "block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide";

const FloatingInput = ({
  label,
  placeholder,
  value,
  onChange,
  required = false,
  type = 'text',
  maxLength,
  error = false,
  className = '',
  ...props
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  type?: string;
  maxLength?: number;
  error?: boolean;
  className?: string;
  [key: string]: any;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && String(value).trim().length > 0;
  const isFloating = isFocused || hasValue;

  return (
    <div className="relative w-full">
      <input
        type={type}
        required={required}
        maxLength={maxLength}
        value={value || ''}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={isFloating ? (placeholder || '') : ''}
        className={`w-full px-4 ${
          isFloating ? 'pt-5 pb-1.5 text-sm font-semibold text-[#0F172A]' : 'py-3.5 text-sm font-medium text-[#0F172A]'
        } rounded-[16px] border ${
          isFocused
            ? 'border-[#829CF8] ring-2 ring-[#829CF8]/20 bg-white'
            : error
            ? 'border-red-400 bg-red-50/40 text-[#0F172A]'
            : hasValue
            ? 'border-[#CBD5E1] bg-white text-[#0F172A]'
            : 'border-[#E2E8F0] bg-[#F8FAFC]'
        } focus:outline-none transition-all shadow-2xs ${className}`}
        {...props}
      />
      <label
        className={`absolute left-4 transition-all duration-200 pointer-events-none ${
          isFloating
            ? 'top-1.5 text-[10px] font-bold text-[#829CF8] tracking-wide'
            : 'top-3.5 text-sm font-medium text-[#8E9BAE]'
        }`}
      >
        {label}
      </label>
    </div>
  );
};

const FloatingSelect = ({
  label,
  value,
  onChange,
  required = false,
  children,
  className = '',
  ...props
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && String(value).trim().length > 0;
  const isFloating = isFocused || hasValue;

  return (
    <div className="relative w-full">
      <select
        required={required}
        value={value || ''}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full px-4 ${
          isFloating ? 'pt-5 pb-1.5 text-sm font-semibold text-[#0F172A]' : 'py-3.5 text-sm font-medium text-transparent'
        } rounded-[16px] border ${
          isFocused
            ? 'border-[#829CF8] ring-2 ring-[#829CF8]/20 bg-white text-[#0F172A]'
            : hasValue
            ? 'border-[#CBD5E1] bg-white text-[#0F172A]'
            : 'border-[#E2E8F0] bg-[#F8FAFC]'
        } appearance-none focus:outline-none transition-all shadow-2xs pr-10 cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
      <label
        className={`absolute left-4 transition-all duration-200 pointer-events-none ${
          isFloating
            ? 'top-1.5 text-[10px] font-bold text-[#829CF8] tracking-wide'
            : 'top-3.5 text-sm font-medium text-[#8E9BAE]'
        }`}
      >
        {label}
      </label>
      <ChevronDown className="w-4 h-4 text-[#8E9BAE] pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
    </div>
  );
};


// Maps a lead/loan's stored `case_type` (which can be any of several
// human-readable variants that have accumulated in the DB over time, e.g.
// "Used Car-purchase", "Used Car-Refine", "Used Car-Refinance", "Used Car
// BT/Top-up", "Purchase", "Refinance", "BT") back to this form's own
// dropdown value ('used_car_purchase' | 'used_car_refinance' |
// 'used_car_bt_topup' | 'new_car_purchase'). Substring-based (not an exact
// list) so it keeps working regardless of which exact spelling a given
// record was saved with — a strict exact-match list previously left every
// "Used Car-*" variant unmatched, falling through to the raw stored string,
// which the <select> below can't match against any of its option values,
// so a resumed draft would silently show the Case Type dropdown as blank.
const reverseCaseType = (ct: string): string => {
  const norm = (ct || '').toUpperCase();
  if (!norm) return 'used_car_bt_topup';
  if (norm.includes('REFIN')) return 'used_car_refinance';
  if (norm.includes('BT') || norm.includes('TOP-UP') || norm.includes('TOP UP') || norm.includes('TOPUP')) return 'used_car_bt_topup';
  if (norm.includes('NEW') && norm.includes('PURCHASE')) return 'new_car_purchase';
  if (norm.includes('PURCHASE')) return 'used_car_purchase';
  return ct;
};

// Self Employed "Profile" — a single flat list of real job/profession
// types, same pattern as Find My Eligibility's Profile field. Picking one
// auto-selects the broader category (profile) and, where applicable, the
// matching subtype field (professionalSubtype / freelancerSubtype) that
// the existing step 5 Income Source Details fields already read — so
// whatever's picked here at step 1 shows up already-selected there.
const PROFILE_SUBTYPES: { label: string; profile: string; professionalSubtype?: string; freelancerSubtype?: string }[] = [
  { label: 'Business', profile: 'Business' },
  { label: 'CA', profile: 'Professional', professionalSubtype: 'CA' },
  { label: 'Doctor', profile: 'Professional', professionalSubtype: 'Doctor' },
  { label: 'Engineer', profile: 'Professional', professionalSubtype: 'Engineer' },
  { label: 'Architect', profile: 'Professional', professionalSubtype: 'Architect' },
  { label: 'IT Freelancer', profile: 'Freelancer/Agent', freelancerSubtype: 'IT Freelancer' },
  { label: 'LIC Agent', profile: 'Freelancer/Agent', freelancerSubtype: 'LIC Agent' },
  { label: 'Property Broker', profile: 'Freelancer/Agent', freelancerSubtype: 'Property Broker' },
  { label: 'Gig Worker', profile: 'Freelancer/Agent', freelancerSubtype: 'Gig Worker' },
  { label: 'Farmer', profile: 'Farmer' },
  { label: 'Other Income', profile: 'Other Income' },
];

const DocumentPreview = ({ file, onRemove }: { file: File | null, onRemove?: () => void }) => {
  if (!file) return null;
  return (
    <div className="mt-2 relative inline-block rounded-md overflow-hidden border border-gray-200">
      {file.type?.startsWith('image/') ? (
        <img src={URL.createObjectURL(file)} alt="preview" className="h-16 w-auto object-cover" />
      ) : (
        <div className="h-16 w-16 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
          PDF/Doc
        </div>
      )}
      {onRemove && (
        <button type="button" onClick={onRemove} className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors shadow">
          <X size={12} />
        </button>
      )}
    </div>
  );
};


const FormSection = ({ title, children, icon: Icon, stretched = false }: { title?: string; children: React.ReactNode, icon?: any, stretched?: boolean }) => (
  <div className={`mb-6 last:mb-0 ${stretched ? 'pb-6 mb-6 border-b border-gray-200' : ''}`}>
    {title && (
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        {Icon && <Icon size={15} className="text-gray-400" />}
        {title}
      </h3>
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  </div>
);


type LeadFormData = {
  customer_name: string;
  mobile: string;
  vehicle_number: string;
  case_type: string;
  pan_number: string;
  car_make?: string;
  car_model?: string;
  car_variant?: string;
  city?: string;
  price?: string;
  ex_showroom_price?: string;

  // Income fields
  incomeSource: string;
  companyName: string;
  designation: string;
  currentJobYears: string;
  totalWorkExp: string;
  netMonthlySalary: string;
  salaryCreditMode: string;
  salarySlipAvailable: string;
  itrAvailable: string;
  annualIncomeItr: string;
  profile: string;
  businessName: string;
  businessType: string;
  businessVintage: string;
  professionalSubtype: string;
  practiceExperience: string;
  freelancerSubtype: string;
  otherIncomeType: string;
  hasOfficeSetup?: string;
  agricultureLandOwnership?: string;
  dairyIncome?: string;
  numberOfCattles?: string;
  jamabandhiAvailable?: string;

  // New Personal fields
  maritalStatus?: string;
  spouseName?: string;
  motherName?: string;
  assignedTo?: string;

  // KYC Documents
  aadharFront?: File | null;
  aadharBack?: File | null;
  panCard?: File | null;
  rcFront?: File | null;
  rcBack?: File | null;
  customerPhoto?: File[];
  drivingLicence?: File[];
  lightBill?: File[];
  bankStatement?: File[];
  cheque?: File[];
  incomeProof?: File[];
  rentAgreement?: File[];
  disbursementMemo?: File[];
  insurance?: File[];
  customerLedger?: File[];
  loanTrack?: File[];
  additionalDocs?: File[];
};

/**
 * Hides the last four characters of a bureau account number.
 *
 * Display only — the dropdown at the loan selector keys its value off the raw
 * number, and masking that would break which loan the lead is attached to.
 *
 * Left alone when masking would leave nothing to read: card numbers often
 * arrive already masked by the bureau (XXXXXXXX1234) or as just the last few
 * digits, and blanking those turns the field into nothing but X. Mirrors
 * _maskAccountNumber in the Flutter credit report screen.
 */
const maskAccountNumber = (raw: unknown): string => {
  const value = String(raw ?? '').trim();
  if (!value || value.toUpperCase() === 'N/A') return 'N/A';
  if (value.length <= 4) return value;

  const head = value.slice(0, -4);
  const readable = head.replace(/[Xx*\s-]/g, '').length;
  if (readable < 4) return value;

  return `${head}XXXX`;
};

/** Pending challans as "3 (₹4,500)", or "No" when the vehicle is clear. */
const formatPendingChallan = (challanInfo: unknown): { text: string; pending: boolean } | null => {
  if (!challanInfo || typeof challanInfo !== 'object') return null;
  const info = challanInfo as { count?: unknown; amount?: unknown };

  const count = Number(info.count) || 0;
  if (count <= 0) return { text: 'No', pending: false };

  const amount = Number(info.amount) || 0;
  if (amount <= 0) return { text: String(count), pending: true };

  return { text: `${count} (₹${amount.toLocaleString('en-IN')})`, pending: true };
};

/**
 * The scraped vehicle photo, if the valuation lookup returned one.
 *
 * n8n supplies it, and it lands on whichever object the caller passes, so the
 * same fallback chain the Flutter screen uses is applied here.
 */
const vehicleImageFrom = (...sources: unknown[]): string => {
  const keys = ['image_url', 'vehicle_image', 'car_image', 'image', 'vehicle_image_url', 'scraped_image'];
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    const outer = source as Record<string, unknown>;
    for (const holder of [outer, outer.data]) {
      if (!holder || typeof holder !== 'object') continue;
      const record = holder as Record<string, unknown>;
      for (const key of keys) {
        const url = record[key];
        if (typeof url === 'string' && url.startsWith('http')) return url;
      }
    }
  }
  return '';
};

export default function AddLeadWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');
  const reapplyLeadId = searchParams.get('reapply_lead_id');
  const loadId = leadId || reapplyLeadId;
  const initialStep = parseInt(searchParams.get('step') || '1');
  const isReapplyMode = !!reapplyLeadId || searchParams.get('reapply_loan') === 'true';
  const [step, setStep] = useState((loadId || isReapplyMode) ? initialStep : 1);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const hasLoadedLead = React.useRef(false);
  const [isReapplyLoading, setIsReapplyLoading] = useState(isReapplyMode);
  const [existingDocs, setExistingDocs] = useState<any[]>([]);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    const handleScroll = () => {
      setIsScrolled(mainEl.scrollTop > 20);
    };

    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => {
    const isReapplyLoan = searchParams.get('reapply_loan') === 'true';
    if (isReapplyLoan && !hasLoadedLead.current) {
      hasLoadedLead.current = true;
      if (loadId) { fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents/lead/${loadId}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } }).then(res => res.json()).then(data => { if (Array.isArray(data)) setExistingDocs(data); }).catch(() => { }); }
      try {
        const savedData = sessionStorage.getItem('reapply_loan_data');
        if (savedData) {
          const loanData = JSON.parse(savedData);
          // Fetch existing documents for the loan and prefill them as File objects (prefilled images)
          const docTypeMap: { [key: string]: string } = {
            aadhar_front: 'aadharFront', aadhar_back: 'aadharBack', aadhaar_front: 'aadharFront', aadhaar_back: 'aadharBack',
            aadhar: 'aadharFront', aadhaar: 'aadharFront', pan_card: 'panCard', pan: 'panCard',
            rc_front: 'rcFront', rc_back: 'rcBack', rc: 'rcFront',
            bank_statement: 'bankStatement', loan_statement: 'loanStatement',
            driving_licence: 'drivingLicence', driving_license: 'drivingLicence',
            light_bill: 'lightBill', cheque: 'cheque', income_proof: 'incomeProof',
            rent_agreement: 'rentAgreement', customer_photo: 'customerPhoto',
            disbursement_memo: 'disbursementMemo', insurance: 'insurance', customer_ledger: 'customerLedger',
          };
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${loanData.id}/documents`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } })
            .then(res => res.json())
            .then((data) => {
              if (Array.isArray(data)) {
                const docList = data.filter((d: any) => d.document_type && d.id != null);
                setExistingDocs(docList);
                const loaders: Promise<void>[] = [];
                docList.forEach((doc: any) => {
                  const formField = docTypeMap[String(doc.document_type).toLowerCase().trim()];
                  if (!formField) return;
                  loaders.push(
                    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents/${doc.id}/download`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } })
                      .then(r => { if (!r.ok) throw new Error('doc'); return r.blob(); })
                      .then(blob => {
                        const fileName = doc.file_name || `${doc.document_type}.pdf`;
                        const file = new File([blob], fileName, { type: blob.type });
                    setForm(f => {
                      const key = formField as keyof typeof f;
                      if (Array.isArray(f[key])) {
                        return { ...f, [key]: [...(f[key] as File[]), file] } as typeof f;
                      }
                      if (f[key]) return f;
                      return { ...f, [key]: file } as typeof f;
                    });
                      })
                      .catch(() => { })
                  );
                });
                void Promise.all(loaders).finally(() => setIsReapplyLoading(false));
              } else {
                setIsReapplyLoading(false);
              }
            }).catch(() => setIsReapplyLoading(false));;

          let stageData = null;
          try {
            if (loanData.stage_data) stageData = typeof loanData.stage_data === 'string' ? JSON.parse(loanData.stage_data) : loanData.stage_data;
            else if (loanData.lead_stage_data) stageData = typeof loanData.lead_stage_data === 'string' ? JSON.parse(loanData.lead_stage_data) : loanData.lead_stage_data;
          } catch (e) { }

          setForm(f => ({
            ...f,
            ...(stageData || {}),
            customer_name: loanData.applicant_name || loanData.customer_name || stageData?.customer_name || '',
            mobile: loanData.mobile || loanData.phone || stageData?.mobile || '',
            vehicle_number: loanData.vehicle_number || loanData.registration_number || stageData?.vehicle_number || '',
            case_type: loanData.case_type ? reverseCaseType(loanData.case_type) : reverseCaseType(stageData?.case_type || 'used_car_bt_topup'),
            pan_number: loanData.pan_number || stageData?.pan_number || '',
            assignedTo: loanData.assigned_to?.toString() || stageData?.assignedTo || '',
            netMonthlySalary: loanData.net_monthly_salary?.toString() || stageData?.netMonthlySalary || '',
            companyName: loanData.company_name || stageData?.companyName || '',

            incomeSource: loanData.income_source || stageData?.incomeSource || '',
            designation: loanData.designation || stageData?.designation || '',
            currentJobYears: loanData.current_job_years?.toString() || stageData?.currentJobYears || '',
            totalWorkExp: loanData.total_work_exp?.toString() || stageData?.totalWorkExp || '',
            salaryCreditMode: loanData.salary_credit_mode || stageData?.salaryCreditMode || '',
            salarySlipAvailable: loanData.salary_slip_available || stageData?.salarySlipAvailable || '',
            itrAvailable: loanData.itr_available || stageData?.itrAvailable || '',
            annualIncomeItr: loanData.annual_income_itr?.toString() || stageData?.annualIncomeItr || '',
            profile: loanData.profile || stageData?.profile || '',
            businessName: loanData.business_name || stageData?.businessName || '',
            businessType: loanData.business_type || stageData?.businessType || '',
            businessVintage: loanData.business_vintage?.toString() || stageData?.businessVintage || '',
            hasOfficeSetup: loanData.has_office_setup || stageData?.hasOfficeSetup || '',
            agricultureLandOwnership: loanData.agriculture_land_ownership || stageData?.agricultureLandOwnership || '',
            dairyIncome: loanData.dairy_income || stageData?.dairyIncome || '',
            numberOfCattles: loanData.number_of_cattles?.toString() || stageData?.numberOfCattles || '',
            jamabandhiAvailable: loanData.jamabandhi_available || stageData?.jamabandhiAvailable || '',
            professionalSubtype: loanData.professional_subtype || stageData?.professionalSubtype || '',
            practiceExperience: loanData.practice_experience?.toString() || stageData?.practiceExperience || '',
            freelancerSubtype: loanData.freelancer_subtype || stageData?.freelancerSubtype || '',
            otherIncomeType: loanData.other_income_type || stageData?.otherIncomeType || '',
            maritalStatus: loanData.marital_status || stageData?.maritalStatus || '',
            spouseName: loanData.spouse_name || stageData?.spouseName || '',
            motherName: loanData.mother_name || stageData?.motherName || ''
          }));

          if (stageData) {
            if (stageData.selectedLoanId) setSelectedLoanId(stageData.selectedLoanId);
            if (stageData.selectedBankDetails) setSelectedBankDetails(stageData.selectedBankDetails);
            if (stageData.presented_lenders) setPresentedLenders(stageData.presented_lenders);
            else if (stageData.selectedBankDetails?.presented_lenders) setPresentedLenders(stageData.selectedBankDetails.presented_lenders);
            if (stageData.loanStatus) setLoanStatusFilter(stageData.loanStatus);
            if (stageData.rc_data || stageData.rcData) setRcData(stageData.rc_data || stageData.rcData);
            if (stageData.vehicle_age || loanData.vehicle_age) setVehicleAge(stageData.vehicle_age || loanData.vehicle_age);
            if (stageData.finance_status || loanData.finance_status) setFinanceStatus(stageData.finance_status || loanData.finance_status);
            if (stageData.idvData || stageData.idv_data) setIdvData(stageData.idvData || stageData.idv_data);
            if (stageData.autoLoans || stageData.auto_loans) setAutoLoans(stageData.autoLoans || stageData.auto_loans);
            if (stageData.dropdowns) { setDropdowns(stageData.dropdowns); setShowDropdowns(true); }
            if (stageData.fullReport || stageData.full_report) setFullReport(stageData.fullReport || stageData.full_report);
            if (stageData.creditScore || stageData.credit_score || loanData.credit_score || loanData.bureau_score) setCreditScore(stageData.creditScore || stageData.credit_score || loanData.credit_score || loanData.bureau_score);
          } else {
            if (loanData.finance_status) setFinanceStatus(loanData.finance_status);
            if (loanData.vehicle_age) setVehicleAge(loanData.vehicle_age);
          }

          // Normalize email/address so the stored resolved value always displays on reapply
          const storedEmail = stageData?.selectedEmail || loanData.email || '';
          const storedAddress = stageData?.selectedAddress || loanData.current_address || loanData.city || '';
          const storedResidenceType = stageData?.residenceType || loanData.ownership_type || '';
          if (storedResidenceType) setResidenceType(storedResidenceType);
          
          if (storedEmail) {
            setSelectedEmail('other');
            setManualEmail(storedEmail);
          }
          if (storedAddress) {
            setSelectedAddress('other');
            setManualAddress(storedAddress);
          }
          if (stageData?.selectedAddress && !storedAddress) { setSelectedAddress(stageData.selectedAddress); }
          if (stageData?.selectedEmail && !storedEmail) { setSelectedEmail(stageData.selectedEmail); }

          if (!stageData?.selectedLoanId && loanData.financier_name) { setSelectedLoanId(loanData.financier_name); setSelectedBankDetails(loanData as any); }
        }
      } catch (e) {
      }
      return;
    }

    if (loadId && !hasLoadedLead.current) {
      hasLoadedLead.current = true;
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents/lead/${loadId}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } })
        .then(res => res.json())
        .then(data => { 
          if (Array.isArray(data)) {
            setExistingDocs(data);
            if (isReapplyMode) {
              const docTypeMap: { [key: string]: string } = {
                aadhar_front: 'aadharFront', aadhar_back: 'aadharBack', aadhaar_front: 'aadharFront', aadhaar_back: 'aadharBack',
                aadhar: 'aadharFront', aadhaar: 'aadharFront', pan_card: 'panCard', pan: 'panCard',
                rc_front: 'rcFront', rc_back: 'rcBack', rc: 'rcFront',
                bank_statement: 'bankStatement', loan_statement: 'loanStatement',
                driving_licence: 'drivingLicence', driving_license: 'drivingLicence',
                light_bill: 'lightBill', cheque: 'cheque', income_proof: 'incomeProof',
                rent_agreement: 'rentAgreement', customer_photo: 'customerPhoto',
                disbursement_memo: 'disbursementMemo', insurance: 'insurance', customer_ledger: 'customerLedger',
              };
              data.forEach((doc: any) => {
                const formField = docTypeMap[String(doc.document_type).toLowerCase().trim()];
                if (!formField) return;
                fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents/${doc.id}/download`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } })
                  .then(r => { if (!r.ok) throw new Error('doc'); return r.blob(); })
                  .then(blob => {
                    const fileName = doc.file_name || `${doc.document_type}.pdf`;
                    const file = new File([blob], fileName, { type: blob.type });
                    setForm(f => {
                      const key = formField as keyof typeof f;
                      if (Array.isArray(f[key])) {
                        return { ...f, [key]: [...(f[key] as File[]), file] } as typeof f;
                      }
                      if (f[key]) return f;
                      return { ...f, [key]: file } as typeof f;
                    });
                  })
                  .catch(() => { });
              });
            }
          } 
        }).catch(() => { });
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/leads/${loadId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      })
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            let stageData = null;
            if (data.stage_data) {
              try {
                stageData = typeof data.stage_data === 'string' ? JSON.parse(data.stage_data) : data.stage_data;
              } catch (e) {
              }
            }

            if (stageData) {
              // Restore Form
              setForm(f => ({
                ...f,
                ...stageData, // spread all saved form fields
                customer_name: stageData.customer_name || data.customer_name || '',
                mobile: stageData.mobile || data.phone || data.mobile || '',
                vehicle_number: stageData.vehicle_number || data.vehicle_number || '',
                case_type: reverseCaseType(stageData.case_type || data.case_type || 'used_car_bt_topup'),
                pan_number: stageData.pan_number || data.pan_number || '',
                assignedTo: stageData.assignedTo || data.assigned_to?.toString() || '',
              }));

              // Restore other state variables
              if (stageData.selectedAddress) setSelectedAddress(stageData.selectedAddress);
              if (stageData.residenceType) setResidenceType(stageData.residenceType);
              if (stageData.selectedEmail) setSelectedEmail(stageData.selectedEmail);
              if (stageData.selectedLoanId) setSelectedLoanId(stageData.selectedLoanId);
              if (stageData.selectedBankDetails) setSelectedBankDetails(stageData.selectedBankDetails);
              if (stageData.presented_lenders) setPresentedLenders(stageData.presented_lenders);
              else if (stageData.selectedBankDetails?.presented_lenders) setPresentedLenders(stageData.selectedBankDetails.presented_lenders);
              if (stageData.loanStatus) setLoanStatusFilter(stageData.loanStatus);
              if (stageData.rc_data) {
                console.log("[RC-SOURCE] from draft stage_data:", {
                  maker: stageData.rc_data.maker_name,
                  model: stageData.rc_data.model_name,
                  owner: stageData.rc_data.owner_name,
                  hasFullRc: !!stageData.rc_data.full_rc_data
                });
                setRcData(stageData.rc_data);
              }
              if (stageData.vehicle_age) setVehicleAge(stageData.vehicle_age);
              if (stageData.finance_status) setFinanceStatus(stageData.finance_status);
              if (stageData.idvData) setIdvData(stageData.idvData);
              if (stageData.autoLoans) setAutoLoans(stageData.autoLoans);
              if (stageData.dropdowns) {
                setDropdowns(stageData.dropdowns);
                setShowDropdowns(true);
              }
              if (stageData.fullReport) setFullReport(stageData.fullReport);
              if (stageData.creditScore) setCreditScore(stageData.creditScore);
              if (stageData.selectedBankDetails) setSelectedBankDetails(stageData.selectedBankDetails);
              if (stageData.saved_by) setLastSavedBy(stageData.saved_by);
              else if (data.created_by_name) setLastSavedBy(data.created_by_name);

              // The saved draft's stage_data snapshot doesn't always capture
              // every field (e.g. a lead saved mid-KYC may only have carried
              // dob/income at that point). Fall back to the lead's own
              // link_loan_data (the CIBIL/credit-report pull result) and a
              // fresh RC lookup so the Find Lender step never evaluates with
              // silently-blank vehicle/credit data just because this
              // particular draft's snapshot happened to be thin.
              if (!stageData.creditScore && data.link_loan_data?.credit_score) {
                setCreditScore(data.link_loan_data.credit_score);
              }
              if (!stageData.autoLoans && data.link_loan_data?.auto_loans) {
                setAutoLoans(data.link_loan_data.auto_loans);
              }
              if (!stageData.fullReport && data.link_loan_data?.full_report) {
                setFullReport(data.link_loan_data.full_report);
              }
              const vehicleNumberForRefetch = stageData.vehicle_number || data.vehicle_number;
              if (!stageData.rc_data && vehicleNumberForRefetch) {
                fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/add-lead/details`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
                  body: JSON.stringify({ rc_number: vehicleNumberForRefetch, mobile: stageData.mobile || data.phone || data.mobile || '' })
                })
                  .then(res => res.ok ? res.json() : null)
                  .then(rcResult => {
                    if (!rcResult) return;
                    if (rcResult.rcData) setRcData(rcResult.rcData);
                    if (rcResult.vehicleAge) setVehicleAge(rcResult.vehicleAge);
                    if (rcResult.financeStatus) setFinanceStatus(rcResult.financeStatus);
                    // Only fill autoLoans from the RC lookup if the credit
                    // report above didn't already supply the real tradelines.
                    if (!stageData.autoLoans && !data.link_loan_data?.auto_loans && rcResult.autoLoans?.length > 0) {
                      setAutoLoans(rcResult.autoLoans);
                    }
                  })
                  .catch(() => { });
              }
              // Restore step from saved draft
              if (!isReapplyMode && stageData.currentStep && stageData.currentStep > 1) {
                const targetStep = stageData.currentStep;
                if (targetStep >= 5 && !stageData.selectedLoanId) {
                  setStep(4);
                  const url = new URL(window.location.href);
                  url.searchParams.set('step', '4');
                  window.history.replaceState({}, '', url.toString());
                } else {
                  setStep(targetStep);
                  const url = new URL(window.location.href);
                  url.searchParams.set('step', String(targetStep));
                  window.history.replaceState({}, '', url.toString());
                }
              }
            } else {
              // Fallback for old leads
              setForm(f => ({
                ...f,
                customer_name: data.customer_name || '',
                mobile: data.phone || data.mobile || '',
                vehicle_number: data.vehicle_number || '',
                case_type: reverseCaseType(data.case_type || 'used_car_bt_topup'),
                pan_number: data.pan_number || '',
                assignedTo: data.assigned_to?.toString() || '',
                incomeSource: data.income_source || '',
                companyName: data.company_name || '',
                designation: data.designation || '',
                currentJobYears: data.current_job_years?.toString() || '',
                totalWorkExp: data.total_work_exp?.toString() || '',
                netMonthlySalary: data.net_monthly_salary?.toString() || '',
                maritalStatus: data.marital_status || '',
                spouseName: data.spouse_name || '',
                motherName: data.mother_name || ''
              }));
              if (data.city) setSelectedAddress(data.city);

              // Same rationale as the stage_data branch above: an old lead
              // with no stage_data snapshot at all still needs its
              // credit-report and vehicle data hydrated from what's actually
              // on record, not left blank.
              if (data.link_loan_data?.credit_score) setCreditScore(data.link_loan_data.credit_score);
              if (data.link_loan_data?.auto_loans) setAutoLoans(data.link_loan_data.auto_loans);
              if (data.link_loan_data?.full_report) setFullReport(data.link_loan_data.full_report);
              if (data.vehicle_number) {
                fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/add-lead/details`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
                  body: JSON.stringify({ rc_number: data.vehicle_number, mobile: data.phone || data.mobile || '' })
                })
                  .then(res => res.ok ? res.json() : null)
                  .then(rcResult => {
                    if (!rcResult) return;
                    if (rcResult.rcData) setRcData(rcResult.rcData);
                    if (rcResult.vehicleAge) setVehicleAge(rcResult.vehicleAge);
                    if (rcResult.financeStatus) setFinanceStatus(rcResult.financeStatus);
                    if (!data.link_loan_data?.auto_loans && rcResult.autoLoans?.length > 0) setAutoLoans(rcResult.autoLoans);
                  })
                  .catch(() => { });
              }
            }
          }
        }).finally(() => setIsReapplyLoading(false));
    }
  }, [loadId, searchParams]);

  const isMutatingRef = React.useRef(false);
  // Remembers the loan already created for this form, so retries never create a duplicate
  const createdLoanIdRef = React.useRef<string | null>(null);
  // Remembers the lead already created for this form, so subsequent Save Draft clicks UPDATE instead of creating new leads
  const createdLeadIdRef = React.useRef<string | null>(null);
  // Step 1 Form State
  const [lastSavedBy, setLastSavedBy] = useState<string>('');
  const [form, setForm] = useState<LeadFormData>({
    customer_name: '',
    mobile: '',
    vehicle_number: '',
    case_type: '',
    pan_number: '',
    assignedTo: '',
    car_make: '',
    car_model: '',
    car_variant: '',
    city: '',
    price: '',
    ex_showroom_price: '',
    // Income fields
    incomeSource: '',
    companyName: '', designation: '', currentJobYears: '', totalWorkExp: '',
    netMonthlySalary: '', salaryCreditMode: 'Account Transfer', salarySlipAvailable: '',
    itrAvailable: '', annualIncomeItr: '', jamabandhiAvailable: '',
    profile: '', businessName: '', businessType: '', businessVintage: '', hasOfficeSetup: '',
    professionalSubtype: '', practiceExperience: '', freelancerSubtype: '', otherIncomeType: '',
    agricultureLandOwnership: '', dairyIncome: '', numberOfCattles: '',
    // Document fields
    aadharFront: null as File | null, aadharBack: null as File | null, panCard: null as File | null,
    rcFront: null as File | null, rcBack: null as File | null, 
    customerPhoto: [] as File[], drivingLicence: [] as File[], 
    lightBill: [] as File[], bankStatement: [] as File[],
    cheque: [] as File[], incomeProof: [] as File[], rentAgreement: [] as File[],
    disbursementMemo: [] as File[], insurance: [] as File[], customerLedger: [] as File[],
    loanTrack: [] as File[],
    additionalDocs: [] as File[],
  });

  const update = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

  // Helper to update step + URL + auto-save
  const goToStep = (newStep: number, overrideSelectedLoanId?: string, overrideIsServiceable?: boolean) => {
    const activeLoanId = overrideSelectedLoanId !== undefined ? overrideSelectedLoanId : selectedLoanId;
    if (newStep >= 5) {
      if (!activeLoanId) {
        toast.error("Please select a bank to proceed.");
        return;
      }
    }
    setStep(newStep);
    const url = new URL(window.location.href);
    url.searchParams.set('step', String(newStep));
    window.history.replaceState({}, '', url.toString());
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
    window.scrollTo(0, 0);
  };


  React.useEffect(() => {
    window.history.pushState({ step }, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      if (step > 1) {
        e.preventDefault();
        window.history.pushState({ step }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [step]);


  // Dropdowns state
  const [dropdowns, setDropdowns] = useState({ emails: [], addresses: [] });
  const [showDropdowns, setShowDropdowns] = useState(false);

  // Assignment state
  const { data: assignableUsers = [] } = useQuery({
    queryKey: ['assignable-users-add-lead'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/hierarchy`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Selected / Manual values
  const [selectedEmail, setSelectedEmail] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [residenceType, setResidenceType] = useState('');
  const [manualAddress, setManualAddress] = useState('');

  // Step 2 State
  const [rcData, setRcData] = useState<any>(null);
  const [panData, setPanData] = useState<any>(null);
  const [kilometers, setKilometers] = useState('');
  const [vehicleAge, setVehicleAge] = useState('');
  const [financeStatus, setFinanceStatus] = useState('');

  // RC OCR fallback — set when the automated RC lookup (Surepass, via
  // /add-lead/details) came back without data, so the "upload RC front/back"
  // fallback UI can offer to extract the same fields via OCR instead.
  const [rcLookupFailed, setRcLookupFailed] = useState(false);
  const [rcOcrFront, setRcOcrFront] = useState<File | null>(null);
  const [rcOcrBack, setRcOcrBack] = useState<File | null>(null);
  // Kept separate from rcLookupFailed so the upload form can be reopened
  // manually (e.g. to retry with a clearer photo) even after a first
  // extraction already partially succeeded and set rcData.
  const [showRcOcrForm, setShowRcOcrForm] = useState(false);
  const [autoLoans, setAutoLoans] = useState<any[]>([]);
  const [loanStatusFilter, setLoanStatusFilter] = useState<'active' | 'closed'>('active');
  const [selectedLoanId, setSelectedLoanId] = useState('');

  // Step 3 State
  const [fullReport, setFullReport] = useState<any>(null);
  const [creditScore, setCreditScore] = useState<number>(0);

  // Bank Details State
  const [selectedBankDetails, setSelectedBankDetails] = useState<any>(null);
  const [presentedLenders, setPresentedLenders] = useState<any[]>([]);

  // New Car Dropdowns State from DB Price Cache
  const [carMakes, setCarMakes] = useState<string[]>([]);
  const [carModels, setCarModels] = useState<string[]>([]);
  const [carCities, setCarCities] = useState<string[]>([]);
  const [carVariants, setCarVariants] = useState<any[]>([]);
  const [carImageUrl, setCarImageUrl] = useState<string>('');

  // Fetch Makes
  useEffect(() => {
    if (step === 2 && form.case_type === 'new_car_purchase' && carMakes.length === 0) {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/add-lead/car-makes`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      })
        .then(res => res.json())
        .then(data => setCarMakes(Array.isArray(data) ? data : []))
        .catch(err => console.error(err));
    }
  }, [step, form.case_type]);

  // Fetch Models when Make changes
  useEffect(() => {
    if (form.car_make) {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/add-lead/car-models?make=${encodeURIComponent(form.car_make)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      })
        .then(res => res.json())
        .then(data => setCarModels(Array.isArray(data) ? data : []))
        .catch(err => console.error(err));
    } else {
      setCarModels([]);
      setCarCities([]);
      setCarVariants([]);
      setCarImageUrl('');
    }
  }, [form.car_make]);

  // Fetch Cities when Model changes
  useEffect(() => {
    if (form.car_make && form.car_model) {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/add-lead/car-cities?make=${encodeURIComponent(form.car_make)}&model=${encodeURIComponent(form.car_model)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      })
        .then(res => res.json())
        .then(data => setCarCities(Array.isArray(data) ? data : []))
        .catch(err => console.error(err));
    } else {
      setCarCities([]);
      setCarVariants([]);
      setCarImageUrl('');
    }
  }, [form.car_model]);

  // Fetch Variants when City changes
  useEffect(() => {
    if (form.car_make && form.car_model && form.city) {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/add-lead/car-variants?make=${encodeURIComponent(form.car_make)}&model=${encodeURIComponent(form.car_model)}&city=${encodeURIComponent(form.city)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data) {
            if (Array.isArray(data)) {
              setCarVariants(data);
              setCarImageUrl('');
            } else {
              setCarVariants(data.variants || []);
              setCarImageUrl(data.image_url || '');
            }
          }
        })
        .catch(err => console.error(err));
    } else {
      setCarVariants([]);
      setCarImageUrl('');
    }
  }, [form.city]);

  // Step 1 Mutation
  const step1Mutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = data.case_type === 'new_car_purchase' ? 'new-car-step1' : 'step1';
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/add-lead/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const text = await res.text();
        let errStr = text;
        try { errStr = JSON.parse(text).error || text; } catch (e) { }
        throw new Error(errStr);
      }
      return res.json();
    },
    onSuccess: (data) => {
      setDropdowns(data.dropdowns);
      setAutoLoans(data.autoLoans || []);
      if (data.fullReport) {
        setFullReport(data.fullReport);
      }
      if (data.creditScore) {
        setCreditScore(data.creditScore);
      }
      if (!data.dropdowns?.emails || data.dropdowns.emails.length === 0) {
        setSelectedEmail('other');
      }
      if (!data.dropdowns?.addresses || data.dropdowns.addresses.length === 0) {
        setSelectedAddress('other');
      }
      if (data.rcData) {
        console.log("[RC-SOURCE] from step1 response:", {
          maker: data.rcData.maker_name,
          model: data.rcData.model_name,
          owner: data.rcData.owner_name,
          hasFullRc: !!data.rcData.full_rc_data,
          fullRcKeys: data.rcData.full_rc_data ? Object.keys(data.rcData.full_rc_data).slice(0, 20) : []
        });
        setRcData(data.rcData);
        setRcLookupFailed(false);
      } else {
        console.log("[RC-SOURCE] step1 response has NO rcData");
        if (form.case_type !== 'new_car_purchase') setRcLookupFailed(true);
      }
      if (data.vehicleAge) {
        setVehicleAge(data.vehicleAge);
      }
      if (data.financeStatus) {
        setFinanceStatus(data.financeStatus);
      }
      setShowDropdowns(true);
      toast.success(data.fullReport ? 'Lead initialized. CIBIL & vehicle data fetched!' : 'Lead initialized. Vehicle data fetched!');

      setTimeout(() => {
        if (form.customer_name && form.mobile && (form.case_type === 'new_car_purchase' || form.vehicle_number) && form.case_type) {
          saveLeadMutation.mutate();
        }
      }, 500);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to initialize lead');
    }
  });

  // Fetch Step 2 Details
  const fetchDetails = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/add-lead/details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ rc_number: form.vehicle_number, mobile: form.mobile })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRcData(data.rcData);
      setVehicleAge(data.vehicleAge);
      setFinanceStatus(data.financeStatus);
      if (data.autoLoans && data.autoLoans.length > 0) {
        setAutoLoans(data.autoLoans);
      }

      goToStep(2);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load details');
    }
  };



  const saveLeadMutation = useMutation({
    mutationFn: async () => {
      if (!form.customer_name || !form.mobile || !form.case_type || (form.case_type !== 'new_car_purchase' && !form.vehicle_number)) {
        throw new Error('Please fill Customer Name, Mobile, Case Type, and Vehicle Number before saving the draft');
      }
      const payload = {
        ...form,
        leadId: isReapplyMode ? undefined : (leadId || createdLeadIdRef.current || undefined),
        reapply_from_lead_id: (isReapplyMode && loadId) ? loadId : undefined, // Support cloning from reapply
        reapply_from_loan_id: searchParams.get('reapply_loan') === 'true' ? (JSON.parse(sessionStorage.getItem('reapply_loan_data') || '{}').id) : undefined,
        selectedEmail: selectedEmail === 'other' ? manualEmail : selectedEmail,
        selectedAddress: selectedAddress === 'other' ? manualAddress : selectedAddress,
        residenceType,
        selectedLoanId,
        loanStatus: loanStatusFilter,
        rc_data: rcData,
        vehicle_age: vehicleAge,
        finance_status: financeStatus,
        idvData,
        autoLoans,
        dropdowns,
        fullReport,
        creditScore,
        selectedBankDetails,
        presented_lenders: (presentedLenders && presentedLenders.length > 0) ? presentedLenders : (selectedBankDetails?.presented_lenders || null),
        currentStep: step,
        saved_by: user?.name || user?.phone || 'Unknown',
        assigned_to: form.assignedTo || null,
        manufacture_date: rcData?.full_rc_data?.manufacturing_date_formatted || rcData?.full_rc_data?.manufacturing_date || rcData?.manufacture_date || rcData?.maker_year || null,
        maker_name: rcData?.maker_name || rcData?.maker_description || rcData?.full_rc_data?.maker_description || '',
        model_variant_name: rcData?.model_name || rcData?.maker_model || rcData?.full_rc_data?.maker_model || '',
      };
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/add-lead/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Draft saved by ${user?.name || user?.phone || 'you'}!`);
      setLastSavedBy(user?.name || user?.phone || 'Unknown');
      if (data?.id) createdLeadIdRef.current = String(data.id);
      // Update URL with leadId so refresh loads the draft
      if (data?.id && !leadId) {
        const url = new URL(window.location.href);
        url.searchParams.set('leadId', String(data.id));
        url.searchParams.set('step', String(step));
        window.history.replaceState({}, '', url.toString());
      }
    },
    onSettled: () => {
      isMutatingRef.current = false;
    }
  });

  const submitLeadMutation = useMutation({
    mutationFn: async () => {
      // 1. Map AddLead form to Loan Payload
      let rawMfgDate = rcData?.full_rc_data?.manufacturing_date_formatted || rcData?.full_rc_data?.manufacturing_date || rcData?.manufacture_date || rcData?.maker_year || null;
      if (rawMfgDate && typeof rawMfgDate === 'string') {
        if (rawMfgDate.match(/^\d{4}-\d{2}$/)) rawMfgDate += '-01';
        else if (rawMfgDate.match(/^\d{4}$/)) rawMfgDate += '-01-01';
      }

      const cleanDate = (d: any) => {
        if (!d || typeof d !== 'string') return null;
        const trimmed = d.trim();
        if (trimmed.includes('/') && trimmed.split('/').length === 3) {
          const [day, month, year] = trimmed.split('/');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        if (trimmed.includes('/') && trimmed.split('/').length === 2) {
          const [month, year] = trimmed.split('/');
          return `${year}-${month.padStart(2, '0')}-01`;
        }
        if (trimmed.includes('-') && trimmed.split('-')[0].length <= 2) {
          const [day, month, year] = trimmed.split('-');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return trimmed;
      };

      const payload = {
        lead_id: isReapplyMode ? undefined : leadId, // CRITICAL: Links the loan back to the draft lead
        reapply_from_lead_id: (isReapplyMode && loadId) ? loadId : undefined,
        reapply_from_loan_id: searchParams.get('reapply_loan') === 'true' ? (JSON.parse(sessionStorage.getItem('reapply_loan_data') || '{}').id) : undefined,
        applicant_name: form.customer_name,
        customer_name: form.customer_name,
        mobile: form.mobile,
        pan_number: form.pan_number,
        case_type: form.case_type === 'used_car_purchase' ? 'Used Car-purchase' :
          form.case_type === 'used_car_refinance' ? 'Used Car-Refinance' :
            form.case_type === 'used_car_bt_topup' ? 'Used Car BT/Top-up' : form.case_type,
        vehicle_number: form.vehicle_number,
        finance_status: financeStatus,
        vehicle_age: vehicleAge,
        manufacturing_date: rawMfgDate,

        // Address & Email Details
        current_address: selectedAddress === 'other' ? manualAddress : selectedAddress,
        email: selectedEmail === 'other' ? manualEmail : selectedEmail,

        // Vehicle Details from RC API
        engine_number: rcData?.vehicle_engine_number || rcData?.full_rc_data?.vehicle_engine_number || rcData?.full_rc_data?.engine_number || null,
        chassis_number: rcData?.vehicle_chasi_number || rcData?.full_rc_data?.vehicle_chasi_number || rcData?.full_rc_data?.chassis_number || null,
        owner_name: rcData?.owner_name || rcData?.full_rc_data?.owner_name || null,
        maker_name: rcData?.maker_name || rcData?.maker_description || rcData?.full_rc_data?.maker_description || '',
        maker_model: rcData?.model_name || rcData?.maker_model || rcData?.full_rc_data?.maker_model || '',
        model_variant_name: rcData?.model_name || rcData?.maker_model || rcData?.full_rc_data?.maker_model || '',
        fuel_type: rcData?.fuel_type || rcData?.full_rc_data?.fuel_type || null,
        ownership_type: rcData?.full_rc_data?.owner_number === '1' ? 'First Owner' :
          rcData?.full_rc_data?.owner_number === '2' ? 'Second Owner' :
            rcData?.full_rc_data?.owner_number === '3' ? 'Third Owner' :
              rcData?.full_rc_data?.owner_number === '4' ? 'Fourth Owner' : rcData?.full_rc_data?.owner_number || null,
        financer: rcData?.financer || rcData?.full_rc_data?.financer || null,
        registered_at: rcData?.registered_at || rcData?.full_rc_data?.registered_at || null,
        insurance_company: rcData?.insurance_company || rcData?.full_rc_data?.insurance_company || null,
        insurance_valid_upto: cleanDate(rcData?.insurance_upto || rcData?.insurance_valid_upto || rcData?.full_rc_data?.insurance_upto || rcData?.full_rc_data?.insurance_valid_upto),
        pucc_valid_upto: cleanDate(rcData?.pucc_upto || rcData?.pucc_valid_upto || rcData?.full_rc_data?.pucc_upto || rcData?.full_rc_data?.pucc_valid_upto),

        // Map Bank
        financier_name: selectedLoanId || selectedBankDetails?.bank_name || null,
        financier_branch_name: selectedBankDetails?.branchName || null,
        financier_executive_name: selectedBankDetails?.salesManagerName || null,
        financier_executive_mobile: selectedBankDetails?.salesManagerMobile || null,
        financier_area_manager_name: selectedBankDetails?.areaManagerName || null,
        financier_area_manager_mobile: selectedBankDetails?.areaManagerMobile || null,

        // Loan & EMI Details from selected lender
        loan_amount: selectedBankDetails?.maxLoanAmountNumeric || selectedBankDetails?.loanAmountNumeric || null,
        loan_amount_required: selectedBankDetails?.maxLoanAmountNumeric || selectedBankDetails?.loanAmountNumeric || null,
        lead_loan_amount: selectedBankDetails?.maxLoanAmountNumeric || selectedBankDetails?.loanAmountNumeric || null,
        min_loan_amount: selectedBankDetails?.minLoanAmountNumeric || null,
        max_loan_amount: selectedBankDetails?.maxLoanAmountNumeric || selectedBankDetails?.loanAmountNumeric || null,
        tentative_value: selectedBankDetails?.tentativeValue || null,
        roi: selectedBankDetails?.roiNumeric || null,
        irr: selectedBankDetails?.roiNumeric || null,
        interest_rate: selectedBankDetails?.roiNumeric || null,
        tenure: selectedBankDetails?.tenureNumeric || null,
        emi: selectedBankDetails?.maxEmiNumeric || selectedBankDetails?.emiNumeric || null,
        emi_amount: selectedBankDetails?.maxEmiNumeric || selectedBankDetails?.emiNumeric || null,
        min_emi: selectedBankDetails?.minEmiNumeric || null,
        max_emi: selectedBankDetails?.maxEmiNumeric || selectedBankDetails?.emiNumeric || null,

        stage_data: {
          selectedBankDetails: selectedBankDetails || null,
          presented_lenders: (presentedLenders && presentedLenders.length > 0) ? presentedLenders : (selectedBankDetails?.presented_lenders || null),
          idvData: idvData || null,
          rcData: rcData || null,
          residenceType,
          hasOfficeSetup: form.hasOfficeSetup || undefined,
          agricultureLandOwnership: form.agricultureLandOwnership || undefined,
          dairyIncome: form.dairyIncome || undefined,
          numberOfCattles: form.numberOfCattles || undefined,
          jamabandhiAvailable: form.jamabandhiAvailable || undefined
        },

        // Income Details
        income_source: form.incomeSource,
        company_name: form.companyName,
        designation: form.designation,
        current_job_years: form.currentJobYears,
        total_work_exp: form.totalWorkExp,
        net_monthly_salary: form.netMonthlySalary,
        salary_credit_mode: form.salaryCreditMode,
        salary_slip_available: form.salarySlipAvailable,
        itr_available: form.itrAvailable,
        annual_income_itr: form.annualIncomeItr,
        profile: form.profile,
        business_name: form.businessName,
        business_type: form.businessType,
        business_vintage: form.businessVintage,
        has_office_setup: form.hasOfficeSetup,
        professional_subtype: form.professionalSubtype,
        practice_experience: form.practiceExperience,
        freelancer_subtype: form.freelancerSubtype,
        other_income_type: form.otherIncomeType,

        // Personal Details
        marital_status: form.maritalStatus,
        spouse_name: form.spouseName,
        mother_name: form.motherName,

        // Set explicitly as submitted status
        application_stage: 'SUBMITTED',
        status: 'submitted',
        assigned_to: form.assignedTo || null,
        sourcing_person_name: form.assignedTo && assignableUsers.length ? (assignableUsers.find((u:any) => String(u.id) === String(form.assignedTo))?.full_name || null) : null
      };

      // 2. Create the Loan (only once — reuse it on retry so we never create duplicates)
      let loanId = createdLoanIdRef.current;
      let loanData;
      if (!loanId) {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const text = await res.text();
          let msg = text;
          try { msg = JSON.parse(text).error || text; } catch (e) { }
          throw new Error(msg);
        }
        loanData = await res.json();
        loanId = loanData.id;
        createdLoanIdRef.current = loanId;
      }

      // 3. Upload Documents
      const docFieldMap: { [key: string]: string } = {
        aadharFront: 'aadhar_front', aadharBack: 'aadhar_back', panCard: 'pan_card',
        rcFront: 'rc_front', rcBack: 'rc_back', customerPhoto: 'customer_photo',
        drivingLicence: 'driving_licence', lightBill: 'light_bill', bankStatement: 'bank_statement',
        cheque: 'cheque', incomeProof: 'income_proof', rentAgreement: 'rent_agreement',
        disbursementMemo: 'disbursement_memo', insurance: 'insurance', customerLedger: 'customer_ledger',
        loanTrack: 'loan_track'
      };

      const uploadResults = await Promise.all(
        Object.entries(docFieldMap)
          .flatMap(([field, docType]) => {
            const val = (form as any)[field];
            if (!val) return [];
            
            // If it's an array of files, map over them to create multiple promises
            if (Array.isArray(val)) {
              return val.map(async (file) => {
                const formData = new FormData();
                formData.append('document', file);
                formData.append('document_type', docType);
                formData.append('loan_id', String(loanId));
                const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
                  body: formData,
                });
                if (!resp.ok) {
                  const errText = await resp.text().catch(() => 'Upload failed');
                  throw new Error(`${docType}: ${resp.status} ${errText}`);
                }
                return resp.json();
              });
            }
            
            // Handle single files (aadharFront, etc.)
            return [
              (async () => {
                const formData = new FormData();
                formData.append('document', val);
                formData.append('document_type', docType);
                formData.append('loan_id', String(loanId));
                const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
                  body: formData,
                });
                if (!resp.ok) {
                  const errText = await resp.text().catch(() => 'Upload failed');
                  throw new Error(`${docType}: ${resp.status} ${errText}`);
                }
                return resp.json();
              })()
            ];
          })
      );
      return { id: loanId, loan_number: loanData?.loan_number };
    },
    onSuccess: () => {
      toast.success('Lead converted to Loan successfully!');
      navigate('/loans');
    },
    onError: (error: any) => {
      try {
        const parsed = JSON.parse(error.message);
        toast.error(parsed.error || parsed.message || 'Failed to convert lead to loan');
      } catch (e) {
        toast.error(error.message || 'Failed to convert lead to loan');
      }
    },
    onSettled: () => {
      isMutatingRef.current = false;
    }
  });


  // Pre-fetched IDV State
  const [idvData, setIdvData] = useState<any>(null);
  const [idvLoading, setIdvLoading] = useState<boolean>(false);

  // On Step 2, if RC details are missing (e.g. draft/reapply loaded directly to step 2),
  // fetch them from /add-lead/details so the vehicle section is never blank.
  React.useEffect(() => {
    console.log("[RC-SOURCE] Step 2 entered:", {
      rcDataPresent: !!rcData,
      maker: rcData?.maker_name,
      model: rcData?.model_name,
      owner: rcData?.owner_name,
      vehicle_number: form.vehicle_number,
      step
    });
    if (step === 2 && !rcData && form.vehicle_number) {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/add-lead/details`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ rc_number: form.vehicle_number, mobile: form.mobile })
      })
        .then(async res => {
          if (!res.ok) return null;
          return res.json();
        })
        .then(data => {
          console.log("[RC-SOURCE] from /add-lead/details response:", {
            hasRcData: !!data?.rcData,
            maker: data?.rcData?.maker_name,
            model: data?.rcData?.model_name,
            owner: data?.rcData?.owner_name
          });
          if (data?.rcData) {
            setRcData(data.rcData);
            setRcLookupFailed(false);
            if (data.vehicleAge) setVehicleAge(data.vehicleAge);
            if (data.financeStatus) setFinanceStatus(data.financeStatus);
          } else if (form.case_type !== 'new_car_purchase') {
            setRcLookupFailed(true);
          }
        })
        .catch(err => {
          console.error("Auto RC Fetch Error:", err);
          if (form.case_type !== 'new_car_purchase') setRcLookupFailed(true);
        });
    }
  }, [step, rcData]);

  // RC OCR fallback — only reachable once the automated lookup above has
  // actually failed (rcLookupFailed). Extracts the same fields from
  // uploaded RC front/back photos and persists them server-side (rc_cache),
  // overriding any stale/failed cache entry for this vehicle number, so the
  // rest of the app (vehicle age, BRE, loan conversion) sees it exactly as
  // if the automated lookup had succeeded.
  const extractRcOcrMutation = useMutation({
    mutationFn: async () => {
      if (!rcOcrFront && !rcOcrBack) throw new Error('Upload at least one RC image (front and/or back).');
      const formData = new FormData();
      if (rcOcrFront) formData.append('documents', rcOcrFront);
      if (rcOcrBack) formData.append('documents', rcOcrBack);
      formData.append('rc_number', form.vehicle_number);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/link-loan/rc-extract-ocr`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extract RC details');
      return data;
    },
    onSuccess: (data) => {
      setRcData(data.rcData);
      setRcLookupFailed(false);
      if (data.vehicleAge) setVehicleAge(data.vehicleAge);
      if (data.financeStatus) setFinanceStatus(data.financeStatus);
      // If the registration number OCR actually read off the document
      // differs from what was typed, that's a real correction (wrong photo,
      // typo, etc.) — propagate it into form.vehicle_number here so it's
      // the single source of truth everywhere downstream (draft save, lead
      // creation, convert-to-loan) instead of leaving the typed number and
      // the document's real number inconsistent across the app.
      const correctedVehicleNumber = data.rcData?.vehicle_number_mismatch
        ? data.rcData?.extracted_registration_number
        : null;
      // Same File objects also flow into the existing mandatory-document
      // upload step (Convert to Loan already uploads form.rcFront/rcBack as
      // rc_front/rc_back) — so the loan officer doesn't have to upload the
      // same RC photos a second time for the document checklist.
      setForm(f => ({ ...f, vehicle_number: correctedVehicleNumber || f.vehicle_number, rcFront: rcOcrFront || f.rcFront, rcBack: rcOcrBack || f.rcBack }));
      setShowRcOcrForm(false);
      if (correctedVehicleNumber) {
        toast.success(`Vehicle number corrected to ${correctedVehicleNumber} (matches the uploaded RC) — everything else has been updated to match.`, { duration: 6000 });
      } else {
        toast.success(data.rcData?.needsReview ? 'RC details extracted — please double-check (low confidence).' : 'RC details extracted successfully!');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to extract RC details from the uploaded image(s).');
    },
  });

  // Auto-run OCR extraction shortly after an RC image is chosen, instead of
  // requiring the "Extract & Fill" button. Debounced so picking front then
  // back a moment later triggers one extraction (with both images) rather
  // than two separate OCR calls.
  React.useEffect(() => {
    if (!rcOcrFront && !rcOcrBack) return;
    if (extractRcOcrMutation.isPending) return;
    const t = setTimeout(() => {
      extractRcOcrMutation.mutate();
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rcOcrFront, rcOcrBack]);

  React.useEffect(() => {
    if (step === 2 && !idvData && !idvLoading && (form.vehicle_number || rcData?.rc_number)) {
      setIdvLoading(true);
      const token = localStorage.getItem('auth_token');
      const rcNumber = form.vehicle_number || rcData?.rc_number || rcData?.full_rc_data?.rc_number;
      // The very first automatic IDV calculation never sent any kilometers
      // at all (undefined), so n8n valued the car with no mileage input and
      // the Kilometers box was left blank with nothing to show. Seed a
      // standard-assumption estimate (~12,000 km/year, matching Indian
      // used-car industry convention) from the vehicle's age, so the first
      // calculation already factors in a reasonable mileage and the input
      // isn't empty — the user can still override it and hit Send for a
      // precise, odometer-based value.
      const ageMatch = vehicleAge.match(/(\d+)\s*yr\s*(\d+)\s*m/i);
      const estimatedKm = ageMatch
        ? Math.round((Number(ageMatch[1]) + Number(ageMatch[2]) / 12) * 12000 / 1000) * 1000
        : null;
      if (estimatedKm && !kilometers) setKilometers(String(estimatedKm));
      fetch(`${import.meta.env.VITE_API_URL || '/api'}/find-lender/idv`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_number: rcNumber, kilometers: estimatedKm ? String(estimatedKm) : undefined })
      })
        .then(res => res.json())
        .then(rawData => {
          let data = rawData;
          if (Array.isArray(data) && data.length > 0) {
            const first = data[0];
            data = first?.json || first?.output || first?.data || first;
          }
          const val = data?.data?.fair_market_retail_value || data?.fair_market_retail_value || data?.data?.book_value || data?.book_value || data?.data?.dealer_purchase_price || data?.dealer_purchase_price || data?.data?.idv_value || data?.idv_value || data?.idv || data?.vehicle_value;
          if (val && Number(val) > 0) {
            setIdvData(data);
          } else if (data.error === 'IDV not found in both systems' || data.error?.includes('not found')) {
            setIdvData({ not_found_allowed: true });
          }
        })
        .catch(err => console.error("Auto IDV Fetch Error:", err))
        .finally(() => setIdvLoading(false));
    }
  }, [step]);

  const refreshIdv = () => {
    if (!form.vehicle_number && !rcData?.rc_number) {
      toast.error("Vehicle number not found");
      return;
    }
    setIdvLoading(true);
    const token = localStorage.getItem('auth_token');
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/find-lender/idv`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id_number: form.vehicle_number || rcData?.rc_number, kilometers })
    })
      .then(res => res.json())
      .then(rawData => {
        // n8n wraps the real payload in an array — [{ json: {...} }] — the
        // initial auto-fetch on step load already unwraps this; this manual
        // refresh (the Kilometers "Send" button) was missing the same step,
        // so a kilometers-adjusted IDV response never matched any of the
        // value lookups below and silently fell through to "not available".
        let data = rawData;
        if (Array.isArray(data) && data.length > 0) {
          const first = data[0];
          data = first?.json || first?.output || first?.data || first;
        }
        const val = data?.data?.fair_market_retail_value || data?.fair_market_retail_value || data?.data?.book_value || data?.book_value || data?.data?.dealer_purchase_price || data?.dealer_purchase_price || data?.data?.idv_value || data?.idv_value || data?.data?.idv || data?.idv || data?.vehicle_value;
        if (val && Number(val) > 0) {
          setIdvData(data);
          toast.success("Tentative IDV fetched successfully!");
        } else if (data.error === 'IDV not found in both systems' || data.error?.includes('not found')) {
          setIdvData({ not_found_allowed: true });
          toast.success("IDV not found in both systems. You may proceed without it.");
        } else {
          toast.error("IDV value not available for this vehicle");
        }
      })
      .catch(err => {
        toast.error("Failed to fetch IDV");
      })
      .finally(() => setIdvLoading(false));
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();


    if (!showDropdowns) {
      // Check if report is already cached to bypass OTP
      try {
        const cacheCheckRes = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/link-loan/credit-report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            name: form.customer_name,
            mobile: form.mobile,
            pan: form.pan_number,
            check_cache_only: true
          }),
        });
        if (cacheCheckRes.ok) {
          const cacheCheckData = await cacheCheckRes.json();
          if (!cacheCheckData.cache_miss) {
            toast.success('Found cached credit report! Bypassing OTP.');
            step1Mutation.mutate(form);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to check cache', err);
      }

      setShowConsentModal(true);
    } else {
      // Transition to step 2
      if (form.case_type === 'new_car_purchase' || rcData) {
        goToStep(2);
      } else {
        toast.info('Fetching vehicle details...');
        fetchDetails();
      }
    }
  };

  const filteredLoans = autoLoans.filter(l =>
    loanStatusFilter === 'active'
      ? (l.account_status?.toLowerCase().includes('active') || !l.close_date)
      : (l.account_status?.toLowerCase().includes('closed') || l.close_date)
  );

  const stepTitles = [
    'Customer Details',
    'Vehicle & CIBIL Accounts',
    'Credit Report',
    'Product Recommendation',
    'Income Details',
    'KYC Uploads',
    'Final Review'
  ];

  if (isReapplyLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto pb-4 lg:pb-20 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading previous details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 md:mx-auto md:mt-0 w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] md:w-full max-w-7xl pb-4 lg:pb-20 bg-gradient-to-br from-[#F5E6E3] via-[#E4ECFF] to-[#D3E1FF] min-h-screen relative overflow-hidden">
      {/* Ambient Blurred Orbs */}
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#829CF8]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-[#A5B7F9]/20 rounded-full blur-3xl pointer-events-none" />

      <ConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        mobile={form.mobile}
        customerName={form.customer_name}
        associateName={user?.name || user?.phone || 'Our Associate'}
        onSuccess={(skipped) => {
          setShowConsentModal(false);
          step1Mutation.mutate({ ...form, skipCibil: skipped });

          if (form.vehicle_number && !idvLoading && !idvData) {
            setIdvLoading(true);
            const token = localStorage.getItem('auth_token');
            fetch(`${import.meta.env.VITE_API_URL || '/api'}/find-lender/idv`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ id_number: form.vehicle_number })
            })
              .then(res => res.json())
              .then(data => {
                const val = data?.data?.fair_market_retail_value || data?.fair_market_retail_value || data?.data?.book_value || data?.book_value || data?.data?.dealer_purchase_price || data?.dealer_purchase_price || data?.data?.idv_value || data?.idv_value || data?.idv || data?.vehicle_value;
                if (val && Number(val) > 0) {
                  setIdvData(data);
                }
              })
              .catch(err => console.error("Background IDV Fetch Error:", err))
              .finally(() => setIdvLoading(false));
          }
        }}
      />

      {/* Mobile Header Bar with transparent backdrop */}
      <div className="md:hidden sticky top-0 z-[80] bg-transparent px-4 pt-5 pb-6 flex items-center justify-between border-none">
        <button
          onClick={() => {
            if (step > 1) {
              setStep(step - 1);
            } else {
              navigate(-1);
            }
          }}
          className="w-10 h-10 rounded-full bg-[#829CF8] text-white flex items-center justify-center shadow-[0_4px_12px_rgba(130,156,248,0.3)] active:scale-95 transition-all shrink-0"
        >
          <ChevronLeft className="w-6 h-6 -ml-0.5" />
        </button>
        <h1 className="text-lg font-bold text-[#1E1B4B] tracking-tight">Add New Lead</h1>
        <div className="w-10" />
      </div>

      {/* Glassmorphic Form Container Card */}
      <div className="relative overflow-hidden mx-3.5 sm:mx-4 mt-3.5 md:mt-0 bg-white/75 backdrop-blur-2xl rounded-[32px] md:rounded-[24px] border border-white/80 shadow-[0_8px_32px_rgba(147,171,255,0.18)]">
        {/* Ambient Gradient Blur Orbs */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-[#829CF8]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-20 w-72 h-72 bg-[#A5B7F9]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#C4D3FF]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 px-5 md:px-8 py-6 md:py-8">
            {/* Desktop Header */}
            <div className="hidden md:flex items-center justify-between pb-4 mb-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 3) setStep(2);
                      else if (step === 4) setStep(3);
                      else setStep(step - 1);
                    }}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{stepTitles[step - 1]}</h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isMutatingRef.current) return;
                  isMutatingRef.current = true;
                  saveLeadMutation.mutate();
                }}
                disabled={saveLeadMutation.isPending}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                {saveLeadMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                {saveLeadMutation.isPending ? 'Saving...' : `Save Draft`}
              </button>
            </div>
            {lastSavedBy && (
              <div className="mb-5 px-3 py-2 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                <CheckCircle size={14} className="text-green-600 shrink-0" />
                <span className="text-xs text-green-700">
                  Draft last saved by <span className="font-semibold">{lastSavedBy}</span>
                </span>
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-4">

                <FormSection stretched={true}>

                  <FloatingInput
                    label="Mobile Number *"
                    placeholder="Enter 10-digit Mobile"
                    required
                    type="tel"
                    maxLength={10}
                    value={form.mobile}
                    onChange={e => setForm({ ...form, mobile: e.target.value })}
                  />
                  <div className="flex flex-col gap-1">
                    <FloatingInput
                      label={form.case_type === 'new_car_purchase' ? "Vehicle Number (Optional)" : "Vehicle Number *"}
                      placeholder="Enter Vehicle Number (e.g. MH12AB1234)"
                      required={form.case_type !== 'new_car_purchase'}
                      value={form.vehicle_number}
                      className={(rcLookupFailed || showRcOcrForm) && form.case_type !== 'new_car_purchase' ? '!rounded-b-none !border-b-0' : ''}
                      onChange={e => setForm({ ...form, vehicle_number: e.target.value.toUpperCase() })}
                      onBlur={() => {
                        if (form.vehicle_number && form.vehicle_number.length >= 6 && form.case_type !== 'new_car_purchase' && (!rcData || rcData.rc_number !== form.vehicle_number)) {
                          toast.info('Fetching vehicle details...');
                          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/add-lead/details`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
                            body: JSON.stringify({ rc_number: form.vehicle_number, mobile: form.mobile })
                          })
                          .then(res => res.json())
                          .then(data => {
                            if (data?.rcData) {
                              setRcData(data.rcData);
                              setRcLookupFailed(false);
                              if (data.vehicleAge) setVehicleAge(data.vehicleAge);
                              if (data.financeStatus) setFinanceStatus(data.financeStatus);
                              toast.success('Vehicle details fetched successfully!');
                            } else {
                              setRcLookupFailed(true);
                              toast.error('Vehicle details not found. Please upload RC.');
                            }
                          })
                          .catch(err => {
                            console.error("Auto RC Fetch Error:", err);
                            setRcLookupFailed(true);
                            toast.error('Vehicle details not found. Please upload RC.');
                          });
                        }
                      }}
                    />
                    
                    {rcData && form.vehicle_number && rcData.rc_number === form.vehicle_number && rcData.source !== 'ocr_fallback' && (
                      <div className="flex items-center gap-2 text-[11px] font-bold text-green-700 uppercase mt-1 mb-2 tracking-wide px-1">
                        <CheckCircle size={14} className="shrink-0" />
                        {[rcData.owner_name, rcData.model_name].filter(Boolean).join(', ').toUpperCase()}
                      </div>
                    )}

                    {(rcLookupFailed || showRcOcrForm) && form.case_type !== 'new_car_purchase' && (
                      <div className="rounded-b-[16px] border border-t-0 border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 space-y-1 -mt-1 mb-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 text-amber-700 text-[10px] font-bold">
                            <AlertTriangle size={11} className="shrink-0" />
                            {rcData ? 'Re-extract RC' : 'API Fail'}
                          </div>
                          {extractRcOcrMutation.isPending && (
                            <span className="flex items-center gap-1 text-[9px] font-semibold text-amber-700">
                              <Loader2 size={10} className="animate-spin" /> Extracting...
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-start gap-x-6 gap-y-1.5">
                          <div>
                            <label className="block text-[8px] font-bold text-[#8E9BAE] uppercase tracking-wide">RC Front</label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="text-[9px] file:mr-1 file:py-0.5 file:px-1 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-[#E2E8F0] file:text-[#0F172A] hover:file:bg-[#CBD5E1]"
                              onChange={e => setRcOcrFront(e.target.files?.[0] || null)}
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-[#8E9BAE] uppercase tracking-wide">RC Back</label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="text-[9px] file:mr-1 file:py-0.5 file:px-1 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-[#E2E8F0] file:text-[#0F172A] hover:file:bg-[#CBD5E1]"
                              onChange={e => setRcOcrBack(e.target.files?.[0] || null)}
                            />
                          </div>
                        </div>
                        {!extractRcOcrMutation.isPending && (rcOcrFront || rcOcrBack) && (
                          <button
                            type="button"
                            onClick={() => extractRcOcrMutation.mutate()}
                            className="text-[9px] font-semibold text-amber-700 underline hover:text-amber-900"
                          >
                            Re-run extraction
                          </button>
                        )}
                      </div>
                    )}

                    {rcData?.source === 'ocr_fallback' && !showRcOcrForm && (
                      <div className={`rounded-[16px] border p-3.5 text-xs flex items-center justify-between gap-2 shadow-2xs mt-2 mb-4 ${rcData?.needsReview ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
                        <span className="flex items-center gap-2 leading-relaxed">
                          <CheckCircle size={16} className="shrink-0" />
                          RC details extracted from the uploaded image{rcData?.needsReview ? ' — low confidence, please verify against the document' : ''}.
                        </span>
                        <button type="button" onClick={() => setShowRcOcrForm(true)} className="underline font-semibold shrink-0 hover:text-opacity-80">
                          Re-extract
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <FloatingInput
                      label="PAN Number *"
                      placeholder="Enter 10-digit PAN"
                      required
                      error={step1Mutation.isError}
                      value={form.pan_number}
                      onChange={e => setForm({ ...form, pan_number: e.target.value.toUpperCase() })}
                      onBlur={() => {
                        if (form.pan_number && form.pan_number.length === 10 && (!panData || panData.pan_number !== form.pan_number)) {
                          toast.info('Fetching PAN details...');
                          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/kyc/verify-pan`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
                            body: JSON.stringify({ pan_number: form.pan_number })
                          })
                          .then(res => res.json())
                          .then(data => {
                            // Assuming response might be structured like data.data or direct data.
                            // Update accordingly if data structure differs.
                            const payload = data.data || data;
                            if (payload && payload.full_name) {
                              setPanData(payload);
                              if (!form.customer_name) {
                                setForm(f => ({...f, customer_name: payload.full_name}));
                              }
                              toast.success('PAN details verified!');
                            } else {
                              toast.error('PAN verification failed.');
                              setPanData(null);
                            }
                          })
                          .catch(err => {
                            console.error("PAN Fetch Error:", err);
                            toast.error('Failed to verify PAN.');
                          });
                        }
                      }}
                    />
                    
                    {panData && panData.pan_number === form.pan_number && (
                      <div className="flex items-center gap-2 text-[11px] font-bold text-green-700 uppercase mt-1 mb-2 tracking-wide px-1">
                        <CheckCircle size={14} className="shrink-0" />
                        {panData.full_name} • DOB: {panData.dob}
                      </div>
                    )}
                    {step1Mutation.isError && (
                      <div className="text-red-600 text-[11px] font-medium flex items-center gap-1 mt-1">
                        <Info size={12} />
                        {step1Mutation.error?.message}
                      </div>
                    )}
                  </div>

                  <FloatingSelect
                    label="Case Type *"
                    required
                    value={form.case_type}
                    onChange={e => setForm({ ...form, case_type: e.target.value })}
                  >
                    <option value=""></option>
                    <option value="new_car_purchase">New Car - Purchase</option>
                    <option value="used_car_purchase">Used Car - Purchase</option>
                    <option value="used_car_refinance">Used Car - Refinance</option>
                    <option value="used_car_bt_topup">Used Car BT/Top-up</option>
                  </FloatingSelect>

                  {assignableUsers.length > 0 && (
                    <FloatingSelect
                      label="Assign to (Optional)"
                      value={form.assignedTo || ''}
                      onChange={e => update('assignedTo', e.target.value)}
                    >
                      <option value=""></option>
                      {assignableUsers.map((user: any) => (
                        <option key={user.id} value={user.id}>{user.full_name || user.user_id} ({user.role})</option>
                      ))}
                    </FloatingSelect>
                  )}

                  <FloatingSelect
                    label="Income Type *"
                    required
                    value={form.incomeSource || ''}
                    onChange={e => setForm({ ...form, incomeSource: e.target.value })}
                  >
                    <option value=""></option>
                    <option value="Salaried">Salaried</option>
                    <option value="Self Employed">Self Employed</option>
                  </FloatingSelect>

                  {form.incomeSource === 'Salaried' && (
                    <>
                      <FloatingInput
                        label="Net Monthly Salary *"
                        type="number"
                        required
                        value={form.netMonthlySalary}
                        onChange={e => update('netMonthlySalary', e.target.value)}
                        placeholder="Enter net monthly salary"
                        max="99999"
                      />
                      <FloatingSelect
                        label="Salary Credit Mode *"
                        required
                        value={form.salaryCreditMode}
                        onChange={e => update('salaryCreditMode', e.target.value)}
                      >
                        <option value=""></option>
                        <option value="Account Transfer">Account Transfer</option>
                        <option value="Cash">Cash</option>
                      </FloatingSelect>
                    </>
                  )}

                  {form.incomeSource === 'Self Employed' && (
                    <>
                      <div className="flex flex-col gap-1">
                        <FloatingSelect
                          label="Profile *"
                          required
                          value={PROFILE_SUBTYPES.find(p =>
                            p.professionalSubtype ? (form.profile === p.profile && form.professionalSubtype === p.professionalSubtype)
                            : p.freelancerSubtype ? (form.profile === p.profile && form.freelancerSubtype === p.freelancerSubtype)
                            : form.profile === p.profile
                          )?.label || ''}
                          onChange={e => {
                            const picked = PROFILE_SUBTYPES.find(p => p.label === e.target.value);
                            setForm({
                              ...form,
                              profile: picked?.profile || '',
                              professionalSubtype: picked?.professionalSubtype || '',
                              freelancerSubtype: picked?.freelancerSubtype || '',
                            });
                          }}
                        >
                          <option value=""></option>
                          {PROFILE_SUBTYPES.map(p => (
                            <option key={p.label} value={p.label}>{p.label}</option>
                          ))}
                        </FloatingSelect>
                        {form.profile && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-green-700 px-1">
                            <CheckCircle size={12} className="shrink-0" /> Category: {form.profile}
                          </div>
                        )}
                      </div>

                      {form.profile && form.profile !== 'Farmer' && (
                        <FloatingSelect label="Office Setup *" required value={form.hasOfficeSetup || ''} onChange={e => update('hasOfficeSetup', e.target.value)}>
                          <option value=""></option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </FloatingSelect>
                      )}

                      {form.profile === 'Business' && (
                        <>
                          <FloatingInput label="Business Name *" required value={form.businessName} onChange={e => update('businessName', e.target.value)} placeholder="Enter business name" />
                          <FloatingInput label="Business Type *" required value={form.businessType} onChange={e => update('businessType', e.target.value)} placeholder="Enter business type" />
                          <FloatingInput label="Business Vintage (Years) *" required type="number" value={form.businessVintage} onChange={e => update('businessVintage', e.target.value)} placeholder="Enter years" max="99" />
                        </>
                      )}

                      {form.profile === 'Professional' && (
                        <FloatingInput label="Practice Experience (In Yrs) *" required type="number" value={form.practiceExperience} onChange={e => update('practiceExperience', e.target.value)} placeholder="Enter years" max="99" />
                      )}

                      {form.profile === 'Other Income' && (
                        <FloatingInput label="Profession *" required value={form.otherIncomeType} onChange={e => update('otherIncomeType', e.target.value)} placeholder="Enter profession" />
                      )}

                      {form.profile === 'Farmer' && (
                        <>
                          <FloatingInput label="Agriculture Land Ownership (Self) *" required value={form.agricultureLandOwnership || ''} onChange={e => update('agricultureLandOwnership', e.target.value)} placeholder="Enter ownership details" />
                          <FloatingSelect label="Dairy Income *" required value={form.dairyIncome || ''} onChange={e => update('dairyIncome', e.target.value)}>
                            <option value=""></option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </FloatingSelect>
                          {form.dairyIncome === 'Yes' && (
                            <FloatingInput label="Number of Cattles *" required type="number" value={form.numberOfCattles || ''} onChange={e => update('numberOfCattles', e.target.value)} placeholder="Enter number" />
                          )}
                          <FloatingSelect label="Jamabandhi Available *" required value={form.jamabandhiAvailable || ''} onChange={e => update('jamabandhiAvailable', e.target.value)}>
                            <option value=""></option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </FloatingSelect>
                        </>
                      )}

                      {form.profile && form.profile !== 'Farmer' && (
                        <FloatingSelect label="ITR Available *" required value={form.itrAvailable} onChange={e => update('itrAvailable', e.target.value)}>
                          <option value=""></option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </FloatingSelect>
                      )}
                      {form.itrAvailable === 'Yes' && form.profile !== 'Farmer' && (
                        <FloatingInput label="Annual Income (ITR) *" required type="number" value={form.annualIncomeItr} onChange={e => update('annualIncomeItr', e.target.value)} placeholder="Enter annual income" />
                      )}
                    </>
                  )}
                </FormSection>

                  {/* OCR block moved up under Vehicle Number */}

              {showDropdowns && (
                <div>
                  <FormSection title="Communication details" icon={Info}>
                    <div>
                      <label className={labelClass}>Email Address *</label>
                      <div className="relative">
                        <select required className={selectClass} value={selectedEmail} onChange={e => setSelectedEmail(e.target.value)}>
                          <option value="">Select Email from CIBIL</option>
                          {dropdowns.emails.map((e: string, i) => <option key={i} value={e}>{e}</option>)}
                          <option value="other">Other (Manual Entry)</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-[#64748B] pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                    {selectedEmail === 'other' && (
                      <div>
                        <label className={labelClass}>Enter Email *</label>
                        <input required type="email" className={inputClass} value={manualEmail} onChange={e => setManualEmail(e.target.value)} placeholder="Enter email address" />
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className={labelClass}>Current Address *</label>
                      <div className="relative">
                        <select required className={selectClass} value={selectedAddress} onChange={e => setSelectedAddress(e.target.value)}>
                          <option value="">Select Address from CIBIL</option>
                          {dropdowns.addresses.map((a: string, i) => <option key={i} value={a}>{a}</option>)}
                          <option value="other">Other (Manual Entry)</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-[#64748B] pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                    {selectedAddress === 'other' && (
                      <div className="md:col-span-2">
                        <label className={labelClass}>Enter Address manually *</label>
                        <textarea required className={inputClass} rows={2} value={manualAddress} onChange={e => setManualAddress(e.target.value)} placeholder="Enter address" />
                      </div>
                    )}
                    
                    <div className="md:col-span-2">
                      <label className={labelClass}>Residence Type *</label>
                      <div className="relative">
                        <select required className={selectClass} value={residenceType} onChange={e => setResidenceType(e.target.value)}>
                          <option value="">Select Residence Type</option>
                          <option value="Owned">Owned</option>
                          <option value="Rented">Rented</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-[#64748B] pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    {autoLoans.length > 0 && (
                      <div className="md:col-span-2 mt-4">
                        <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5"><CreditCard size={13} className="text-gray-400" /> Auto Loan Accounts ({autoLoans.length})</h4>
                        <div className="overflow-x-auto rounded-md border border-gray-200">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="p-2 text-[10px] uppercase font-semibold text-gray-500">Lender</th>
                                <th className="p-2 text-[10px] uppercase font-semibold text-gray-500">Account No</th>
                                <th className="p-2 text-[10px] uppercase font-semibold text-gray-500">Amount</th>
                                <th className="p-2 text-[10px] uppercase font-semibold text-gray-500">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {autoLoans.map((loan: any, i: number) => (
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="p-2 text-xs font-medium text-gray-900">{loan.subscriber_name}</td>
                                  <td className="p-2 text-xs text-gray-500">{maskAccountNumber(loan.account_number)}</td>
                                  <td className="p-2 text-xs font-medium text-blue-600">₹{loan.sanctioned_amount?.toLocaleString()}</td>
                                  <td className="p-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${loan.account_status?.toLowerCase().includes('closed') || loan.close_date ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                      {loan.account_status?.toLowerCase().includes('closed') || loan.close_date ? 'Closed' : 'Active'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {autoLoans.length === 0 && (
                                <tr><td colSpan={4} className="p-4 text-center text-xs text-gray-400">No auto loans found.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </FormSection>
                </div>
              )}

              <div className="flex items-start gap-3 py-2">
                <input
                  type="checkbox"
                  required
                  id="consent-check"
                  className="w-5 h-5 rounded-[4px] border-[#94A3B8] text-[#3B82F6] accent-[#3B82F6] shrink-0 mt-0.5 cursor-pointer"
                />
                <label htmlFor="consent-check" className="text-xs text-[#64748B] font-medium leading-relaxed cursor-pointer select-none">
                  I confirm that all the information provided is accurate and I authorize the platform to process this application.
                </label>
              </div>

              <button
                type="submit"
                disabled={step1Mutation.isPending}
                className="w-full h-12 bg-[#708CFB] hover:bg-[#5C7BF9] text-white text-base font-bold rounded-[16px] shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-4"
              >
                {step1Mutation.isPending ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-white" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Submit Lead</span>
                )}
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {form.case_type === 'new_car_purchase' ? (
                <div className="space-y-6 text-left">
                  {/* Vehicle Header */}
                  <div className="flex flex-row items-center gap-4 p-4 rounded-md border border-gray-200 bg-gray-50">
                    <div className="w-20 h-14 bg-white rounded-md border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden text-gray-300">
                      {carImageUrl ? (
                        <img src={carImageUrl} alt="car preview" className="w-full h-full object-cover" />
                      ) : (
                        <Car size={28} />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col space-y-1 text-left">
                      <h2 className="text-sm font-semibold text-gray-900 leading-tight">
                        {form.car_make || 'Vehicle Maker'}
                      </h2>
                      <div className="flex flex-col sm:flex-row items-center gap-1.5">
                        <span className="inline-block px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded uppercase tracking-wide">
                          {form.car_model || 'Model'}
                        </span>
                        <span className="inline-block px-2.5 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded uppercase tracking-wide">
                          NEW CAR
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Key Information Box */}
                  <div className="rounded-md border border-gray-200 p-5 bg-white space-y-4">
                    <h3 className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wider">Key Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Car Make *</label>
                        <select
                          required
                          className={inputClass}
                          value={form.car_make || ''}
                          onChange={e => {
                            const make = e.target.value;
                            setForm({ ...form, car_make: make, car_model: '', city: '', car_variant: '', price: '' });
                          }}
                        >
                          <option value="">Select Make</option>
                          {carMakes.map(make => (
                            <option key={make} value={make}>{make}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Car Model *</label>
                        <select
                          required
                          disabled={!form.car_make}
                          className={inputClass}
                          value={form.car_model || ''}
                          onChange={e => {
                            const model = e.target.value;
                            setForm({ ...form, car_model: model, city: '', car_variant: '', price: '' });
                          }}
                        >
                          <option value="">Select Model</option>
                          {carModels.map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>City *</label>
                        <select
                          required
                          disabled={!form.car_model}
                          className={inputClass}
                          value={form.city || ''}
                          onChange={e => {
                            const city = e.target.value;
                            setForm({ ...form, city: city, car_variant: '', price: '' });
                          }}
                        >
                          <option value="">Select City</option>
                          {carCities.map(city => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Car Variant *</label>
                        <select
                          required
                          disabled={!form.city}
                          className={inputClass}
                          value={form.car_variant || ''}
                          onChange={e => {
                            const variantName = e.target.value;
                            const variantObj = carVariants.find(v => (v.variant || v.name) === variantName);
                            const exShowroom = variantObj ? String(variantObj.ex_showroom || variantObj.price || '') : '';
                            const finalPrice = variantObj ? String(variantObj.on_road || variantObj.price || '') : '';
                            setForm({
                              ...form,
                              car_variant: variantName,
                              ex_showroom_price: exShowroom,
                              price: finalPrice
                            });
                          }}
                        >
                          <option value="">Select Variant</option>
                          {carVariants.map((v, index) => {
                            const vName = v.variant || v.name || `Variant ${index}`;
                            return <option key={index} value={vName}>{vName} (₹{(v.price || v.ex_showroom || 0).toLocaleString('en-IN')})</option>;
                          })}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Ex-showroom Price *</label>
                        <input
                          required
                          type="number"
                          className={inputClass}
                          value={form.ex_showroom_price || ''}
                          onChange={e => setForm({ ...form, ex_showroom_price: e.target.value })}
                          placeholder="Ex-showroom price"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Final Price *</label>
                        <input
                          required
                          type="number"
                          className={inputClass}
                          value={form.price || ''}
                          onChange={e => setForm({ ...form, price: e.target.value })}
                          placeholder="Enter final price"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* RC OCR upload fallback now lives on step 1 (Customer Details),
                      right where the automated lookup result is known — see the
                      `rcLookupFailed` block there, above the "Next" button. */}

                  {/* Vehicle Header */}
                  <div className="flex flex-row items-center gap-4 p-4 rounded-md border border-gray-200 bg-gray-50">
                    <div className="w-20 h-14 bg-white rounded-md border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden text-gray-300">
                      {vehicleImageFrom(idvData, rcData) ? (
                        <img
                          src={vehicleImageFrom(idvData, rcData)}
                          alt="vehicle"
                          className="w-full h-full object-cover"
                          // n8n scrapes these, so a dead link is possible —
                          // fall back to the icon rather than a broken image.
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <Car size={28} />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col space-y-1 text-left">
                      <h2 className="text-sm font-semibold text-gray-900 leading-tight">
                        {rcData?.maker_name || rcData?.full_rc_data?.maker_description || rcData?.full_rc_data?.maker_name || 'Vehicle Maker'}
                      </h2>
                      <div className="flex flex-col sm:flex-row items-center gap-1.5">
                        <span className="inline-block px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded uppercase tracking-wide">
                          {rcData?.model_name || rcData?.full_rc_data?.maker_model || rcData?.full_rc_data?.model_name || 'N/A'}
                        </span>
                        <span className="inline-block px-2.5 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded uppercase tracking-wide">
                          {rcData?.rc_number || rcData?.full_rc_data?.rc_number || form.vehicle_number}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Key Information Box */}
                  <div className="rounded-md border border-gray-200 p-5">
                    <h3 className="text-xs font-semibold text-gray-500 mb-4">Key Information</h3>
                    <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                      <div>
                        <span className="block text-[10px] font-medium text-gray-400 mb-1">Owner Name</span>
                        <span className="block text-sm font-medium text-gray-900 truncate" title={rcData?.owner_name || 'N/A'}>{rcData?.owner_name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-gray-400 mb-1">Vehicle Age</span>
                        <span className="block text-sm font-medium text-gray-900">{vehicleAge || 'Unknown'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-gray-400 mb-1">Fuel Type</span>
                        <span className="block text-sm font-medium text-gray-900">{rcData?.fuel_type || rcData?.full_rc_data?.fuel_type || 'Unknown'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-gray-400 mb-1">Insurance Expiry Date</span>
                        <span className="block text-sm font-medium text-gray-900">{(rcData?.insurance_upto || rcData?.full_rc_data?.insurance_upto) ? new Date(rcData?.insurance_upto || rcData.full_rc_data.insurance_upto).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-gray-400 mb-1">PUCC Valid Upto</span>
                        <span className="block text-sm font-medium text-gray-900">{(rcData?.pucc_upto || rcData?.full_rc_data?.pucc_upto) ? new Date(rcData?.pucc_upto || rcData.full_rc_data.pucc_upto).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-gray-400 mb-1">Owner Serial No</span>
                        <span className="block text-sm font-medium text-gray-900">{(rcData?.owner_number || rcData?.full_rc_data?.owner_number) ? String(rcData?.owner_number || rcData.full_rc_data.owner_number).padStart(2, '0') : '01'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-gray-400 mb-1">Manufacturing Date</span>
                        <span className="block text-sm font-medium text-gray-900">{(rcData?.manufacturing_date_formatted || rcData?.full_rc_data?.manufacturing_date_formatted) ? new Date(rcData?.manufacturing_date_formatted || rcData.full_rc_data.manufacturing_date_formatted).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-gray-400 mb-1">Vehicle Financed</span>
                        <span className={`block text-sm font-medium ${financeStatus !== 'Not Financed' ? 'text-red-600' : 'text-green-600'}`}>
                          {financeStatus !== 'Not Financed' ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {/* rc-lookup already counts the pending challans and totals
                          them as challan_info — nothing extra is fetched here. */}
                      <div>
                        <span className="block text-[10px] font-medium text-gray-400 mb-1">Pending Challan</span>
                        <span className={`block text-sm font-medium ${formatPendingChallan(rcData?.challan_info)?.pending ? 'text-red-600' : 'text-green-600'}`}>
                          {formatPendingChallan(rcData?.challan_info)?.text ?? '-'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-gray-400 mb-1">Financer Name</span>
                        <span className="block text-sm font-medium text-gray-900 truncate" title={rcData?.financer || rcData?.full_rc_data?.financer || 'N/A'}>
                          {rcData?.financer || rcData?.full_rc_data?.financer || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-gray-400 mb-1">Kilometers</span>
                        <div className="flex items-stretch border border-gray-300 rounded overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400">
                          <input
                            type="number"
                            className="min-w-0 flex-1 text-sm font-medium text-gray-900 border-0 bg-transparent px-2 py-1 focus:outline-none"
                            placeholder="e.g. 45000"
                            value={kilometers}
                            onChange={(e) => setKilometers(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!kilometers.trim()) {
                                toast.error('Enter a kilometers value first — the IDV won\'t change without one.');
                                return;
                              }
                              refreshIdv();
                            }}
                            disabled={idvLoading}
                            className="shrink-0 bg-blue-600 text-white px-2.5 text-[11px] font-semibold whitespace-nowrap disabled:opacity-50"
                          >
                            Send
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-medium text-gray-400">Tentative Car Value (IDV)</span>
                          <button
                            type="button"
                            onClick={refreshIdv}
                            disabled={idvLoading}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            title="Refresh Tentative IDV"
                          >
                            <RefreshCw size={12} className={idvLoading ? "animate-spin text-blue-600" : "text-gray-400 hover:text-blue-600"} />
                          </button>
                        </span>
                        <span className="block text-sm font-medium text-gray-900">
                          {idvLoading ? (
                            <span className="text-amber-600 animate-pulse">Calculating...</span>
                          ) : idvData ? (
                            (() => {
                              const searchObj = (obj: any): number | null => {
                                if (!obj || typeof obj !== 'object') return null;
                                if (obj.fair_market_retail_value || obj.book_value || obj.dealer_purchase_price || obj.idv || obj.idv_value || obj.tentative_idv || obj.vehicle_value) {
                                  const val = Number(obj.fair_market_retail_value || obj.book_value || obj.dealer_purchase_price || obj.idv || obj.idv_value || obj.tentative_idv || obj.vehicle_value);
                                  return val > 0 ? val : null;
                                }
                                for (const key in obj) {
                                  if (typeof obj[key] === 'number' && obj[key] > 0 && (key.toLowerCase().includes('idv') || key.toLowerCase().includes('value'))) return obj[key];
                                  const res = searchObj(obj[key]);
                                  if (res && res > 0) return res;
                                }
                                return null;
                              };
                              const val = searchObj(idvData);
                              return val && val > 0
                                ? <span className="text-emerald-600">₹{val.toLocaleString('en-IN')}</span>
                                : <span className="text-gray-400">Value not available</span>;
                            })()
                          ) : (
                            <span className="text-gray-400">Tap refresh to fetch →</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Finance Status Box */}
                  <div className="p-5 rounded-md border border-gray-200 space-y-4">
                    <div>
                      <p className="text-sm text-gray-700">As per RTO,</p>
                      <p className="text-sm text-gray-700">
                        {financeStatus === 'Not Financed'
                          ? 'Car is Not Financed.'
                          : `Car is financed by ${rcData?.financer || rcData?.full_rc_data?.financer || 'Bank'}.`}
                      </p>
                    </div>

                    {/* Status Of Loan On Car? */}
                    {['used_car_bt_topup', 'used_car_refinance'].includes(form.case_type) && financeStatus !== 'Not Financed' && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-700">Status Of Loan On Car?</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setLoanStatusFilter('active')}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${loanStatusFilter === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          >
                            Active
                          </button>
                          <button
                            type="button"
                            onClick={() => setLoanStatusFilter('closed')}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${loanStatusFilter === 'closed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          >
                            Closed
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Loan Selection Dropdown Box — hide for purchase case type */}
                  {autoLoans.length > 0 && form.case_type !== 'used_car_purchase' && (
                    <div className="p-5 rounded-md border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Link Loan Account</h4>
                      <div className="mb-2">
                        <label className={labelClass}>Loan Account</label>
                        <select className={inputClass} value={selectedLoanId} onChange={e => setSelectedLoanId(e.target.value)}>
                          <option value="">Select an account</option>
                          {autoLoans.map((loan: any) => (
                            <option key={loan.account_number} value={loan.account_number}>
                              {loan.subscriber_name} - ₹{loan.sanctioned_amount?.toLocaleString()} ({maskAccountNumber(loan.account_number)}) [{loan.account_status?.toLowerCase().includes('closed') || loan.close_date ? 'Closed' : 'Active'}]
                            </option>
                          ))}
                        </select>
                      </div>
                      {selectedLoanId && (() => {
                        const selectedLoanObj = autoLoans.find((l: any) => l.account_number === selectedLoanId);
                        if (!selectedLoanObj) return null;

                        const lenderName = (selectedLoanObj.subscriber_name || '').toLowerCase();
                        const sameLenderLoans = autoLoans.filter((l: any) =>
                          l.account_number !== selectedLoanObj.account_number &&
                          (l.subscriber_name || '').toLowerCase() === lenderName &&
                          (l.account_status || '').toLowerCase() === 'active'
                        );

                        return (
                          <div className="mt-5 space-y-4 pt-5 border-t border-gray-200">
                            <h5 className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                              <LinkIcon size={13} className="text-gray-400" /> Link Loan Analysis
                            </h5>

                            {sameLenderLoans.length === 0 ? (
                              <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
                                <CheckCircle size={14} />
                                No other active loans found from <strong className="mx-1">{selectedLoanObj.subscriber_name}</strong>.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200">
                                  <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-semibold text-red-700 text-[11px]">Multiple Active Loans Found from Same Lender</p>
                                    <p className="text-[11px] text-red-600 mt-1 leading-snug">
                                      {sameLenderLoans.length} additional active loan{sameLenderLoans.length > 1 ? 's' : ''} found from{' '}
                                      <strong>{selectedLoanObj.subscriber_name}</strong>.
                                    </p>
                                  </div>
                                </div>

                                {sameLenderLoans.map((loan: any, i: number) => (
                                  <div key={i} className="p-3 rounded-md border border-red-200 bg-red-50/50">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-semibold text-[11px] text-gray-900">{loan.subscriber_name}</span>
                                      <span className="text-[9px] px-2 py-0.5 rounded border border-red-200 bg-red-100 text-red-700 font-semibold uppercase">LINK LOAN</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                                      <div><span className="text-gray-400 block mb-0.5 uppercase text-[9px]">Sanctioned</span> <span className="font-semibold text-gray-900">₹{loan.sanctioned_amount?.toLocaleString()}</span></div>
                                      <div><span className="text-gray-400 block mb-0.5 uppercase text-[9px]">Account No</span> <span className="font-semibold text-gray-900">{maskAccountNumber(loan.account_number)}</span></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex justify-end mt-2">
                              <button
                                type="button"
                                onClick={() => window.open(`/link-loan-finder?rc=${rcData?.rc_number || rcData?.full_rc_data?.rc_number || form.vehicle_number}`, '_blank')}
                                className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:underline px-2 py-1"
                              >
                                Open Link Loan Finder Tool <ArrowLeft size={12} className="rotate-135" />
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between pt-2">
                <button type="button" onClick={() => setStep(1)} className="px-5 py-2.5 rounded-md border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    goToStep(3);
                  }}
                  disabled={
                    idvLoading || 
                    (form.case_type === 'new_car_purchase' && (!form.car_make || !form.car_model || !form.car_variant || !form.city || !form.price || !form.ex_showroom_price)) ||
                    (form.case_type !== 'used_car_purchase' && form.case_type !== 'new_car_purchase' && financeStatus !== 'Not Financed' && !selectedLoanId && autoLoans.length > 0)
                  }
                  className={`px-6 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${idvLoading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60'}`}
                >
                  {idvLoading ? <Loader2 className="animate-spin w-4 h-4" /> : null}
                  Next: View Credit Report
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <CreditReportSummary
              rcData={rcData}
              fullReport={fullReport}
              creditScore={creditScore}
              selectedLoanId={selectedLoanId}
              onBack={() => setStep(2)}
              onNext={() => goToStep(4)}
            />
          )}

          {step === 4 && (
            <LinkLoanFinderStep
              onBack={() => goToStep(3)}
              onNext={() => goToStep(isReapplyMode ? 7 : 5)}
              onSnapshotUpdate={setPresentedLenders}
              onSubmit={() => {
                if (isMutatingRef.current) return;
                isMutatingRef.current = true;
                saveLeadMutation.mutate();
              }}
              onApply={(bankId, details, autoNavigate = true) => { 
                setSelectedLoanId(bankId); 
                setSelectedBankDetails(details); 
                if (autoNavigate) {
                  goToStep(isReapplyMode ? 7 : 5, bankId, details?.is_serviceable); 
                }
              }}
              isSubmitting={saveLeadMutation.isPending}
              selectedLoanId={selectedLoanId}
              autoLoans={autoLoans}
              creditScore={creditScore}
              rcData={rcData}
              caseType={form.case_type}
              address={selectedAddress === 'other' ? manualAddress : selectedAddress}
              rcNumber={rcData?.rc_number || rcData?.full_rc_data?.rc_number || form.vehicle_number}
              prefetchedIdvData={idvData}
              prefetchedIdvLoading={idvLoading}
              incomeSource={form.incomeSource}
              monthlyIncome={form.incomeSource === 'Salaried' ? form.netMonthlySalary : undefined}
              profile={form.profile}
              dob={panData?.dob}
              panData={panData}
              annualIncomeItr={form.annualIncomeItr}
              incomeProof={form.incomeSource === 'Salaried' ? (form.salarySlipAvailable ? form.salarySlipAvailable === 'Yes' : undefined) : (form.itrAvailable ? form.itrAvailable === 'Yes' : undefined)}
              businessVintageYears={form.businessVintage}
              salaryPaymentMode={form.salaryCreditMode}
              existingAccounts={fullReport?.accounts}
            />
          )}

          {step === 5 && (
            <div className="space-y-6">
              <FormSection title="Income Source Details" icon={CreditCard}>
                <div className="col-span-1 md:col-span-2">
                  <label className={labelClass}>Income Source *</label>
                  <select className={inputClass} value={form.incomeSource} onChange={e => update('incomeSource', e.target.value)}>
                    <option value="">Select Income Source</option>
                    <option value="Salaried">Salaried</option>
                    <option value="Self Employed">Self Employed</option>
                  </select>
                </div>

                {form.incomeSource === 'Salaried' && (
                  <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    {/* Net Monthly Salary + Salary Credit Mode are already asked in step 1
                        (Customer Details) — shown here read-only rather than re-asked. */}
                    <div>
                      <label className={labelClass}>Net Monthly Salary</label>
                      <div className="w-full px-4 py-3 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] text-sm font-medium text-[#0F172A]">
                        {form.netMonthlySalary ? `₹${form.netMonthlySalary}` : 'Not entered in step 1'}
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Salary Credit Mode</label>
                      <div className="w-full px-4 py-3 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] text-sm font-medium text-[#0F172A]">
                        {form.salaryCreditMode || 'Not entered in step 1'}
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Company Name</label>
                      <input className={inputClass} value={form.companyName} onChange={e => update('companyName', e.target.value)} placeholder="Enter company name" />
                    </div>
                    {form.companyName && (
                      <div>
                        <label className={labelClass}>Designation</label>
                        <input className={inputClass} value={form.designation} onChange={e => update('designation', e.target.value)} placeholder="Enter designation" />
                      </div>
                    )}
                    {form.designation && (
                      <div>
                        <label className={labelClass}>Salary Slip Available</label>
                        <select className={inputClass} value={form.salarySlipAvailable} onChange={e => update('salarySlipAvailable', e.target.value)}>
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    )}
                    {form.salarySlipAvailable && (
                      <div>
                        <label className={labelClass}>Current Job (In Yrs)</label>
                        <input type="number" className={inputClass} value={form.currentJobYears} onChange={e => update('currentJobYears', e.target.value)} placeholder="Enter years" max="99" />
                      </div>
                    )}
                    {form.currentJobYears && (
                      <div>
                        <label className={labelClass}>Total Work Exp. (In Yrs)</label>
                        <input type="number" className={inputClass} value={form.totalWorkExp} onChange={e => update('totalWorkExp', e.target.value)} placeholder="Enter years" max="99" />
                      </div>
                    )}
                  </div>
                )}

                {form.incomeSource === 'Self Employed' && (() => {
                  const readOnly = (label: string, value: string) => (
                    <div>
                      <label className={labelClass}>{label}</label>
                      <div className="w-full px-4 py-3 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] text-sm font-medium text-[#0F172A]">
                        {value || 'Not entered in step 1'}
                      </div>
                    </div>
                  );
                  return (
                    <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      {/* All Self Employed fields are already collected in step 1 (Customer
                          Details) — shown here read-only rather than re-asked. */}
                      {readOnly('Profile', `${form.profile || ''}${form.professionalSubtype ? ` – ${form.professionalSubtype}` : ''}${form.freelancerSubtype ? ` – ${form.freelancerSubtype}` : ''}`)}
                      {form.profile !== 'Farmer' && readOnly('Office Setup', form.hasOfficeSetup)}
                      {form.profile === 'Business' && (
                        <>
                          {readOnly('Business Name', form.businessName)}
                          {readOnly('Business Type', form.businessType)}
                          {readOnly('Business Vintage (Years)', form.businessVintage)}
                        </>
                      )}
                      {form.profile === 'Professional' && readOnly('Practice Experience (In Yrs)', form.practiceExperience)}
                      {form.profile === 'Other Income' && readOnly('Profession', form.otherIncomeType)}
                      {form.profile === 'Farmer' && (
                        <>
                          {readOnly('Agriculture Land Ownership (Self)', form.agricultureLandOwnership)}
                          {readOnly('Dairy Income', form.dairyIncome)}
                          {form.dairyIncome === 'Yes' && readOnly('Number of Cattles', form.numberOfCattles)}
                          {readOnly('Jamabandhi Available', form.jamabandhiAvailable)}
                        </>
                      )}
                      {form.profile !== 'Farmer' && readOnly('ITR Available', form.itrAvailable)}
                      {form.itrAvailable === 'Yes' && form.profile !== 'Farmer' && readOnly('Annual Income (ITR)', form.annualIncomeItr ? `₹${form.annualIncomeItr}` : '')}
                    </div>
                  );
                })()}
              </FormSection>


              <FormSection title="Other Personal Details" icon={User}>
                <div>
                  <label className={labelClass}>Marital Status *</label>
                  <select className={inputClass} value={form.maritalStatus || ''} onChange={e => update('maritalStatus', e.target.value)}>
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widow">Widow</option>
                  </select>
                </div>
                {form.maritalStatus === 'Married' && (
                  <div>
                    <label className={labelClass}>Spouse Name</label>
                    <input className={inputClass} value={form.spouseName || ''} onChange={e => update('spouseName', e.target.value)} placeholder="Enter spouse name" />
                  </div>
                )}
                <div>
                  <label className={labelClass}>Mother's Name</label>
                  <input className={inputClass} value={form.motherName || ''} onChange={e => update('motherName', e.target.value)} placeholder="Enter mother's name" />
                </div>
              </FormSection>

              <div className="flex justify-between pt-2">
                <button type="button" onClick={() => setStep(4)} className="px-5 py-2.5 rounded-md border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Back</button>
                <button type="button" onClick={() => goToStep(6)} disabled={
                  !form.incomeSource ||
                  (form.incomeSource === 'Salaried' && !(form.companyName && form.designation && form.netMonthlySalary && form.salarySlipAvailable && form.currentJobYears && form.totalWorkExp && form.salaryCreditMode)) ||
                  (form.incomeSource === 'Self Employed' && !(form.profile && (form.profile === 'Farmer' || form.hasOfficeSetup) && ((form.profile === 'Business' && form.businessName && form.businessType && form.businessVintage) || (form.profile === 'Professional' && form.professionalSubtype && form.practiceExperience) || (form.profile === 'Freelancer/Agent' && form.freelancerSubtype) || (form.profile === 'Other Income' && form.otherIncomeType) || (form.profile === 'Farmer' && form.agricultureLandOwnership && form.dairyIncome && (form.dairyIncome !== 'Yes' || form.numberOfCattles) && form.jamabandhiAvailable)))) ||
                  !form.maritalStatus ||
                  (form.maritalStatus === 'Married' && !form.spouseName)
                } className="px-6 py-2.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2">Next: KYC Upload</button>
              </div>
            </div>
          )}

          {step === 6 && (() => {
            const hasDoc = (stateName: string, dbName: string) => !!((form as any)[stateName] || existingDocs.find((d: any) => d.document_type === dbName));
            const isKycComplete = hasDoc('aadharFront', 'aadhar_front') && hasDoc('aadharBack', 'aadhar_back') && hasDoc('panCard', 'pan_card') && hasDoc('rcFront', 'rc_front') && hasDoc('rcBack', 'rc_back');
            return (
              <div className="space-y-6">
                <FormSection title="KYC Uploads (Mandatory)" icon={User}>
                  <div>
                    <label className={labelClass}>Aadhar Card Front *</label>
                    {!form.aadharFront && <input type="file" className={inputClass} onChange={e => update('aadharFront', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                    <DocumentPreview file={form.aadharFront as File | null} onRemove={() => update('aadharFront', null)} />
                    {!form.aadharFront && existingDocs.find(d => d.document_type === 'aadhar_front') && <div className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1"><CheckCircle size={12} /> Existing document attached</div>}
                  </div>
                  <div>
                    <label className={labelClass}>Aadhar Card Back *</label>
                    {!form.aadharBack && <input type="file" className={inputClass} onChange={e => update('aadharBack', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                    <DocumentPreview file={form.aadharBack as File | null} onRemove={() => update('aadharBack', null)} />
                    {!form.aadharBack && existingDocs.find(d => d.document_type === 'aadhar_back') && <div className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1"><CheckCircle size={12} /> Existing document attached</div>}
                  </div>
                  <div>
                    <label className={labelClass}>Pan Card *</label>
                    {!form.panCard && <input type="file" className={inputClass} onChange={e => update('panCard', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                    <DocumentPreview file={form.panCard as File | null} onRemove={() => update('panCard', null)} />
                    {!form.panCard && existingDocs.find(d => d.document_type === 'pan_card') && <div className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1"><CheckCircle size={12} /> Existing document attached</div>}
                  </div>
                  <div>
                    <label className={labelClass}>RC (Front) *</label>
                    {!form.rcFront && <input type="file" className={inputClass} onChange={e => update('rcFront', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                    <DocumentPreview file={form.rcFront as File | null} onRemove={() => update('rcFront', null)} />
                    {!form.rcFront && existingDocs.find(d => d.document_type === 'rc_front') && <div className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1"><CheckCircle size={12} /> Existing document attached</div>}
                  </div>
                  <div>
                    <label className={labelClass}>RC (Back) *</label>
                    {!form.rcBack && <input type="file" className={inputClass} onChange={e => update('rcBack', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                    <DocumentPreview file={form.rcBack as File | null} onRemove={() => update('rcBack', null)} />
                    {!form.rcBack && existingDocs.find(d => d.document_type === 'rc_back') && <div className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1"><CheckCircle size={12} /> Existing document attached</div>}
                  </div>
                </FormSection>


                <FormSection title="Additional Documents" icon={LinkIcon}>
                  {[
                    { key: 'customerPhoto', label: 'Customer Photo', type: 'customer_photo' },
                    { key: 'drivingLicence', label: 'Driving Licence', type: 'driving_licence' },
                    { key: 'lightBill', label: 'Light Bill', type: 'light_bill' },
                    { key: 'bankStatement', label: 'Bank Statement', type: 'bank_statement' },
                    { key: 'cheque', label: 'Cheque', type: 'cheque' },
                    { key: 'incomeProof', label: 'Income Proof', type: 'income_proof' },
                    { key: 'rentAgreement', label: 'Rent Agreement', type: 'rent_agreement' },
                    { key: 'disbursementMemo', label: 'Disbursement Memo', type: 'disbursement_memo' },
                    { key: 'insurance', label: 'Insurance', type: 'insurance' },
                    { key: 'customerLedger', label: 'Customer Ledger', type: 'customer_ledger' },
                    { key: 'loanTrack', label: 'Loan Track', type: 'loan_track' },
                  ].map(doc => {
                    const files = (form as any)[doc.key] as File[] || [];
                    const existingCount = existingDocs.filter(d => d.document_type === doc.type).length;
                    return (
                      <div key={doc.key} className="col-span-1 md:col-span-2">
                        <label className={labelClass}>{doc.label}</label>
                        <input 
                          type="file" 
                          multiple 
                          className={inputClass} 
                          onChange={e => {
                            if (e.target.files && e.target.files.length > 0) {
                              update(doc.key, [...files, ...Array.from(e.target.files)]);
                            }
                            e.target.value = ''; // Reset so same file can be selected again
                          }} 
                          accept="image/*,.pdf" 
                        />
                        
                        {files.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {files.map((file, i) => (
                              <div key={i} className="flex-1 min-w-[150px] max-w-[200px]">
                                <DocumentPreview file={file} onRemove={() => update(doc.key, files.filter((_, idx) => idx !== i))} />
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {files.length === 0 && existingCount > 0 && (
                          <div className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                            <CheckCircle size={12} /> {existingCount} Existing document{existingCount > 1 ? 's' : ''} attached
                          </div>
                        )}
                      </div>
                    );
                  })}
                </FormSection>


                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => setStep(5)} className="px-5 py-2.5 rounded-md border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Back</button>
                  <button type="button" onClick={() => goToStep(7)} disabled={!isKycComplete} className="px-6 py-2.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60">Next: Review & Submit</button>
                </div>
              </div>
            );
          })()}

          {step === 7 && (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 text-emerald-800 text-sm">
                <h3 className="font-semibold flex items-center gap-2 mb-2"><CheckCircle size={16} /> Final Review</h3>
                <p>Please review all details before creating the loan application. This will generate a distinct Loan ID and submit all documents.</p>
              </div>

              <div className="space-y-6">

                {/* Step 1: Customer & Vehicle */}
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-700 text-white flex items-center justify-center text-xs font-semibold">1</div>
                    <h3 className="font-semibold text-gray-900 text-sm">Customer & Vehicle Profile</h3>
                  </div>
                  <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                    <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Customer Name</span><span className="font-medium text-sm text-gray-900">{form.customer_name}</span></div>
                    <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Mobile</span><span className="font-medium text-sm text-gray-900">{form.mobile}</span></div>
                    <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">PAN Number</span><span className="font-medium text-sm text-gray-900">{form.pan_number || 'N/A'}</span></div>
                    <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Case Type</span><span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">{form.case_type.replace(/_/g, ' ')}</span></div>

                    <div className="col-span-2"><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Email Address</span><span className="font-medium text-sm text-gray-900">{selectedEmail === 'other' ? manualEmail : selectedEmail || 'N/A'}</span></div>
                    <div className="col-span-2 md:col-span-2"><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Current Address</span><span className="font-medium text-sm text-gray-900">{selectedAddress === 'other' ? manualAddress : selectedAddress || 'N/A'} {residenceType ? `(${residenceType})` : ''}</span></div>

                    <div className="col-span-2 md:col-span-4 border-t border-gray-100 my-2"></div>

                    <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Reg Number</span><span className="font-medium text-sm text-gray-900 uppercase">{form.vehicle_number}</span></div>
                    <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Maker/Model</span><span className="font-medium text-sm text-gray-900">{rcData?.maker_name || rcData?.full_rc_data?.maker_name || rcData?.maker_description || rcData?.full_rc_data?.maker_description || rcData?.maker_model || 'N/A'}</span></div>
                    <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Financed Status</span><span className="font-medium text-sm text-gray-900">{financeStatus || 'N/A'}</span></div>
                    <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Vehicle Age</span><span className="font-medium text-sm text-gray-900">{vehicleAge || 'N/A'}</span></div>
                  </div>
                </div>

                {/* Step 2: Income & Personal Details */}
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-700 text-white flex items-center justify-center text-xs font-semibold">2</div>
                    <h3 className="font-semibold text-gray-900 text-sm">Income & Personal Details</h3>
                  </div>
                  <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                    <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Income Source</span><span className="font-medium text-sm text-gray-900">{form.incomeSource || 'N/A'}</span></div>
                    {form.incomeSource === 'Salaried' && (
                      <>
                        <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Company Name</span><span className="font-medium text-sm text-gray-900">{form.companyName || 'N/A'}</span></div>
                        <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Designation</span><span className="font-medium text-sm text-gray-900">{form.designation || 'N/A'}</span></div>
                        <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Net Monthly Salary</span><span className="font-medium text-sm text-gray-900">₹{form.netMonthlySalary || 0}</span></div>
                        <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Total Work Exp</span><span className="font-medium text-sm text-gray-900">{form.totalWorkExp || 0} Yrs</span></div>
                      </>
                    )}
                    {form.incomeSource === 'Self Employed' && (
                      <>
                        <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Profile</span><span className="font-medium text-sm text-gray-900">{form.profile || 'N/A'}</span></div>
                        {form.businessName && <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Business Name</span><span className="font-medium text-sm text-gray-900">{form.businessName}</span></div>}
                        {form.businessType && <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Business Type</span><span className="font-medium text-sm text-gray-900">{form.businessType}</span></div>}
                        {form.businessVintage && <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Vintage</span><span className="font-medium text-sm text-gray-900">{form.businessVintage} Yrs</span></div>}
                        {form.hasOfficeSetup && <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Business Setup</span><span className="font-medium text-sm text-gray-900">{form.hasOfficeSetup}</span></div>}
                        {form.professionalSubtype && <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Subtype</span><span className="font-medium text-sm text-gray-900">{form.professionalSubtype}</span></div>}
                        {form.freelancerSubtype && <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Subtype</span><span className="font-medium text-sm text-gray-900">{form.freelancerSubtype}</span></div>}
                        {form.profile === 'Farmer' && (
                          <>
                            {form.agricultureLandOwnership && <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Agri Land Ownership</span><span className="font-medium text-sm text-gray-900">{form.agricultureLandOwnership}</span></div>}
                            {form.dairyIncome && <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Dairy Income</span><span className="font-medium text-sm text-gray-900">{form.dairyIncome}</span></div>}
                            {form.dairyIncome === 'Yes' && form.numberOfCattles && <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">No. of Cattles</span><span className="font-medium text-sm text-gray-900">{form.numberOfCattles}</span></div>}
                            {form.jamabandhiAvailable && <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Jamabandhi</span><span className="font-medium text-sm text-gray-900">{form.jamabandhiAvailable}</span></div>}
                          </>
                        )}
                      </>
                    )}
                    {form.profile !== 'Farmer' && form.itrAvailable === 'Yes' && <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Annual Income (ITR)</span><span className="font-medium text-sm text-gray-900">₹{form.annualIncomeItr || 0}</span></div>}

                    <div className="col-span-2 md:col-span-4 border-t border-gray-100 my-2"></div>

                    <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Marital Status</span><span className="font-medium text-sm text-gray-900">{form.maritalStatus || 'N/A'}</span></div>
                    {form.maritalStatus === 'Married' && <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Spouse Name</span><span className="font-medium text-sm text-gray-900">{form.spouseName || 'N/A'}</span></div>}
                    <div><span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Mother's Name</span><span className="font-medium text-sm text-gray-900">{form.motherName || 'N/A'}</span></div>
                  </div>
                </div>

                {/* Step 3: Lender Selection */}
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-700 text-white flex items-center justify-center text-xs font-semibold">3</div>
                    <h3 className="font-semibold text-gray-900 text-sm">Selected Lender</h3>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-12 bg-white rounded-md border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                        {selectedBankDetails?.logoUrl ? (
                          <img src={selectedBankDetails.logoUrl} alt={selectedLoanId || 'Bank Logo'} className="w-full h-full object-contain p-1" />
                        ) : (
                          <CheckCircle size={22} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium block mb-1">Financial Institution</span>
                        <span className="font-semibold text-lg text-gray-900">{selectedLoanId || 'No Bank Selected'}</span>
                      </div>
                    </div>
                    {selectedBankDetails && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-100">
                        <div>
                          <span className="text-gray-400 text-[10px] uppercase tracking-wider font-medium block mb-1">Tentative Value</span>
                          <span className="font-medium text-sm text-emerald-600">{selectedBankDetails.tentativeValue ? `₹${Number(selectedBankDetails.tentativeValue).toLocaleString('en-IN')}` : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10px] uppercase tracking-wider font-medium block mb-1">Max Loan Amount</span>
                          <span className="font-medium text-sm text-amber-700">{selectedBankDetails.maxLoanAmount}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10px] uppercase tracking-wider font-medium block mb-1">ROI</span>
                          <span className="font-medium text-sm text-gray-900">{selectedBankDetails.roi}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10px] uppercase tracking-wider font-medium block mb-1">Max Tenure</span>
                          <span className="font-medium text-sm text-gray-900">{selectedBankDetails.maxTenure}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10px] uppercase tracking-wider font-medium block mb-1">Loan EMI</span>
                          <span className="font-medium text-sm text-gray-900">{selectedBankDetails.loanEmi}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 4: Documents Uploaded */}
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-700 text-white flex items-center justify-center text-xs font-semibold">4</div>
                    <h3 className="font-semibold text-gray-900 text-sm">Documentation Verification</h3>
                  </div>

                  {/* Mandatory Docs */}
                  <div className="px-5 pt-5 pb-3">
                    <h4 className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-3 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> Mandatory KYC
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries({
                        'Aadhar Front': form.aadharFront, 'Aadhar Back': form.aadharBack, 'Pan Card': form.panCard,
                        'RC Front': form.rcFront, 'RC Back': form.rcBack
                      }).filter(([_, file]) => !!file).map(([name, file]) => (
                        <div key={name} className="flex flex-col gap-2 bg-gray-50 p-3 rounded-md border border-gray-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                            <span className="text-gray-900 font-medium text-xs truncate">{name}</span>
                          </div>
                          <div className="flex justify-center bg-white rounded-md p-1 border border-gray-200">
                            <DocumentPreview file={file as File} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Docs */}
                  <div className="px-5 pt-3 pb-5 bg-gray-50/50">
                    <h4 className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-3 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div> Additional Documents
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { name: 'Customer Photo', files: form.customerPhoto },
                        { name: 'Driving Licence', files: form.drivingLicence },
                        { name: 'Light Bill', files: form.lightBill },
                        { name: 'Bank Statement', files: form.bankStatement },
                        { name: 'Cheque', files: form.cheque },
                        { name: 'Income Proof', files: form.incomeProof },
                        { name: 'Rent Agreement', files: form.rentAgreement },
                        { name: 'Disbursement Memo', files: form.disbursementMemo },
                        { name: 'Insurance', files: form.insurance },
                        { name: 'Customer Ledger', files: form.customerLedger },
                        { name: 'Loan Track', files: form.loanTrack }
                      ].flatMap(({ name, files }) => 
                        (files || []).map((file, idx) => (
                          <div key={`${name}-${idx}`} className="flex flex-col gap-2 bg-white p-3 rounded-md border border-gray-200">
                            <div className="flex items-center gap-2">
                              <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                              <span className="text-gray-900 font-medium text-xs truncate" title={file.name}>
                                {name} {files && files.length > 1 ? `(${idx + 1})` : ''}
                              </span>
                            </div>
                            <div className="flex justify-center bg-white rounded-md p-1 border border-gray-200">
                              <DocumentPreview file={file} />
                            </div>
                          </div>
                        ))
                      )}
                      
                      {[
                        ...(form.customerPhoto || []), ...(form.drivingLicence || []), ...(form.lightBill || []), 
                        ...(form.bankStatement || []), ...(form.cheque || []), ...(form.incomeProof || []), 
                        ...(form.rentAgreement || []), ...(form.disbursementMemo || []), ...(form.insurance || []), 
                        ...(form.customerLedger || []), ...(form.loanTrack || [])
                      ].length === 0 && (
                        <div className="text-xs text-gray-400 col-span-4 p-2 italic">No additional documents uploaded.</div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              <div className="flex justify-between pt-6 border-t border-gray-200">
                <button type="button" onClick={() => setStep(6)} className="px-5 py-2.5 rounded-md border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Back to Documents</button>
                <button type="button" onClick={() => {
                  if (isMutatingRef.current) return;
                  isMutatingRef.current = true;
                  submitLeadMutation.mutate();
                }} disabled={submitLeadMutation.isPending} className="px-6 py-2.5 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-60">
                  {submitLeadMutation.isPending ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : 'Submit Application & Create Loan'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
      <div className="mt-6 flex justify-center">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-5 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={16} /> Exit
        </button>
      </div>
    </div>
  );
}