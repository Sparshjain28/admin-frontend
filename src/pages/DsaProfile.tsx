import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  Building2,
  Filter,
  ShieldCheck,
  CreditCard,
  FileText,
  Landmark,
  MapPin,
  User,
  KeyRound,
  Calendar,
} from 'lucide-react';
import { api } from '@/lib/api';
import { DsaApplicationBlock, FirmBlock } from '@/pages/dsa/DsaProfileBlocks';

interface ChecklistItem {
  label: string;
  value: string;
  isFilled: boolean;
  isVerified?: boolean;
}

interface ChecklistCategory {
  category: string;
  key: string;
  isFilled: boolean;
  isVerified: boolean;
  items: ChecklistItem[];
}

interface PartnerProfile {
  id: number;
  user_id: string;
  full_name: string;
  name?: string;
  email: string | null;
  phone: string;
  role: string;
  status: string;
  refer_code: string | null;
  joining_date: string | null;
  created_at: string;
  pan_number: string | null;
  pan_verified: boolean;
  pan_data: any;
  aadhaar_number: string | null;
  aadhaar_verified: boolean;
  aadhaar_data: any;
  kyc_completed: boolean;
  date_of_birth: string | null;
  gender: string | null;
  father_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
  photo_path: string | null;
  bank_account_number: string | null;
  bank_ifsc_code: string | null;
  bank_name: string | null;
  bank_account_holder: string | null;
  bank_verified: boolean;
  bank_data: any;
  branch_name: string | null;
  loan_ops_name: string | null;
  loan_ops_phone: string | null;
  accountant_name: string | null;
  accountant_phone: string | null;
  operations_name: string | null;
  operations_phone: string | null;
}

interface ProfileApiResponse {
  success: boolean;
  partner: PartnerProfile;
  checklist: ChecklistCategory[];
  dsa_application?: any;
  stats: {
    totalFields: number;
    filledFields: number;
    pendingFields: number;
    completionPercentage: number;
    isPanVerified: boolean;
    isAadhaarVerified: boolean;
    isBankVerified: boolean;
    isKycCompleted: boolean;
  };
}

function getInitials(name?: string) {
  if (!name) return 'DS';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

function formatFieldValue(label: string, rawVal: string) {
  if (!rawVal || rawVal === '—') return '— Not Provided';

  const lower = label.toLowerCase();

  // Format Date of Birth / other timestamps (e.g. 1987-12-08T18:30:00.000Z -> 09 Dec 1987)
  if (lower.includes('date') || lower.includes('dob')) {
    try {
      const d = new Date(rawVal);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      }
    } catch {}
  }

  // Format Gender (M -> Male, F -> Female)
  if (lower === 'gender') {
    const v = rawVal.trim().toUpperCase();
    if (v === 'M' || v === 'MALE') return 'Male';
    if (v === 'F' || v === 'FEMALE') return 'Female';
    if (v === 'O' || v === 'OTHER') return 'Other';
    return rawVal;
  }

  // Format Aadhaar Number (XXXX XXXX 1296)
  if (lower.includes('aadhaar') && !lower.includes('status') && !lower.includes('name')) {
    const clean = rawVal.replace(/\s+/g, '');
    if (clean.length >= 4) {
      return `XXXX XXXX ${clean.slice(-4)}`;
    }
  }

  return rawVal;
}

function getCategoryIcon(key: string) {
  switch (key) {
    case 'personal':
      return <User size={15} />;
    case 'pan':
      return <FileText size={15} />;
    case 'aadhaar':
      return <ShieldCheck size={15} />;
    case 'bank':
      return <Landmark size={15} />;
    case 'address':
      return <MapPin size={15} />;
    default:
      return <FileText size={15} />;
  }
}

export default function DsaProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'filled'>('all');

  const { data, isLoading, isError } = useQuery<ProfileApiResponse>({
    queryKey: ['dsa-profile', id],
    queryFn: () => api.get(`/brokers/dsa/${id}/profile`),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-3">
        <div className="w-9 h-9 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-muted-foreground font-heading">
          Loading partner profile & details…
        </p>
      </div>
    );
  }

  if (isError || !data?.partner) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-3">
        <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center border border-border">
          <AlertCircle size={20} />
        </div>
        <h2 className="text-base font-bold text-foreground font-heading">Partner Profile Not Found</h2>
        <p className="text-xs text-muted-foreground text-center">
          Unable to retrieve partner details.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg shadow-sm hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer font-heading"
        >
          <ArrowLeft size={13} /> Back
        </button>
      </div>
    );
  }

  const { partner, checklist, stats } = data;
  const categoryOrder = ['personal', 'bank', 'aadhaar', 'pan', 'address'];

  const orderedChecklist = [...checklist].sort((a, b) => {
    const idxA = categoryOrder.indexOf(a.key);
    const idxB = categoryOrder.indexOf(b.key);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  const filteredChecklist = orderedChecklist.map((cat) => {
    let items = cat.items;
    if (filterMode === 'pending') {
      items = items.filter((i) => !i.isFilled || i.isVerified === false);
    } else if (filterMode === 'filled') {
      items = items.filter((i) => i.isFilled);
    }
    return { ...cat, items };
  });

  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-3 space-y-2 max-w-7xl mx-auto">
      {/* ── Partner Hero Info Card ── */}
      <div className="bg-card border border-border/80 rounded-xl px-3.5 py-2.5 sm:py-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Initials Avatar */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#2872A1] to-[#184F70] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs ring-2 ring-primary/20 shrink-0 font-heading">
              {getInitials(partner.full_name)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading">
                  {partner.full_name || 'DSA Partner'}
                </h1>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                  {partner.user_id ? (partner.user_id.startsWith('#') ? partner.user_id : `#${partner.user_id}`) : `#FL-${partner.id}`}
                </span>
                {partner.status && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 capitalize">
                    {partner.status}
                  </span>
                )}
                {stats.isKycCompleted ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                    <CheckCircle2 size={11} /> KYC Verified
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border flex items-center gap-1">
                    <Clock size={11} /> KYC Pending ({stats.completionPercentage}%)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                {partner.phone && (
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Phone size={11} className="text-primary" />
                    <span>{partner.phone}</span>
                  </span>
                )}
                {partner.branch_name && (
                  <span className="flex items-center gap-1">
                    <Building2 size={11} className="text-muted-foreground" />
                    <span>{partner.branch_name}</span>
                  </span>
                )}
                {partner.refer_code && (
                  <span className="flex items-center gap-1">
                    <KeyRound size={11} className="text-muted-foreground" />
                    <span>Ref: <strong className="font-semibold text-foreground">{partner.refer_code}</strong></span>
                  </span>
                )}
                {partner.created_at && (
                  <span className="flex items-center gap-1">
                    <Calendar size={11} className="text-muted-foreground" />
                    <span>Joined: {new Date(partner.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Onboarding Completion Meter */}
          <div className="sm:text-right bg-muted/20 sm:bg-transparent p-2 sm:p-0 rounded-lg border sm:border-0 border-border/50">
            <div className="flex sm:flex-col sm:items-end justify-between items-center gap-0.5">
              <span className="text-xs font-semibold text-muted-foreground font-heading">Onboarding Progress</span>
              <span className="text-base font-bold font-heading text-primary leading-none">
                {stats.completionPercentage}%
              </span>
            </div>
            <div className="w-full sm:w-36 h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden border border-border/50">
              <div
                className="h-full bg-gradient-to-r from-[#2872A1] to-[#184F70] rounded-full transition-all duration-300"
                style={{ width: `${stats.completionPercentage}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              <strong className="text-foreground">{stats.filledFields}</strong> completed •{' '}
              <strong className="text-foreground">{stats.pendingFields}</strong> pending
            </p>
          </div>
        </div>
      </div>

      {/* ── 4 Executive Verification Pillar Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {/* PAN Card */}
        <div className="bg-card border border-border/80 rounded-xl p-2.5 px-3 shadow-2xs hover:border-primary/50 transition-all">
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-primary/10 text-primary">
                <FileText size={12} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-heading">
                PAN Card
              </span>
            </div>
            {stats.isPanVerified ? (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-0.5">
                <CheckCircle2 size={10} /> Verified
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border flex items-center gap-0.5">
                <Clock size={10} /> {partner.pan_number ? 'Unverified' : 'Pending'}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm font-bold text-foreground font-heading tracking-tight truncate">
            {partner.pan_number || '— Not Provided'}
          </p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {partner.pan_data?.name || 'PAN verification document'}
          </p>
        </div>

        {/* Aadhaar Card */}
        <div className="bg-card border border-border/80 rounded-xl p-2.5 px-3 shadow-2xs hover:border-primary/50 transition-all">
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-primary/10 text-primary">
                <ShieldCheck size={12} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-heading">
                Aadhaar Card
              </span>
            </div>
            {stats.isAadhaarVerified ? (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-0.5">
                <CheckCircle2 size={10} /> Verified
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border flex items-center gap-0.5">
                <Clock size={10} /> {partner.aadhaar_number ? 'Unverified' : 'Pending'}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm font-bold text-foreground font-heading tracking-tight truncate">
            {partner.aadhaar_number ? `XXXX XXXX ${partner.aadhaar_number.replace(/\s+/g, '').slice(-4)}` : '— Not Provided'}
          </p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {partner.aadhaar_data?.name || 'Aadhaar identity record'}
          </p>
        </div>

        {/* Bank Account */}
        <div className="bg-card border border-border/80 rounded-xl p-2.5 px-3 shadow-2xs hover:border-primary/50 transition-all">
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-primary/10 text-primary">
                <Landmark size={12} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-heading">
                Bank Account
              </span>
            </div>
            {stats.isBankVerified ? (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-0.5">
                <CheckCircle2 size={10} /> Verified
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border flex items-center gap-0.5">
                <Clock size={10} /> {partner.bank_account_number ? 'Unverified' : 'Pending'}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm font-bold text-foreground font-heading tracking-tight truncate">
            {partner.bank_account_number || '— Not Provided'}
          </p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {partner.bank_name || 'Payout account details'}
          </p>
        </div>

        {/* Address */}
        <div className="bg-card border border-border/80 rounded-xl p-2.5 px-3 shadow-2xs hover:border-primary/50 transition-all">
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-primary/10 text-primary">
                <MapPin size={12} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-heading">
                Address
              </span>
            </div>
            {partner.city || partner.state ? (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-0.5">
                <CheckCircle2 size={10} /> Provided
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border flex items-center gap-0.5">
                <Clock size={10} /> Pending
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm font-bold text-foreground font-heading tracking-tight truncate">
            {[partner.city, partner.state].filter(Boolean).join(', ') || '— Not Provided'}
          </p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {partner.pincode ? `PIN: ${partner.pincode}` : 'Residential location'}
          </p>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-card border border-border/80 rounded-lg px-3 py-1.5 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 font-heading">
            <Filter size={11} className="text-primary" /> Filter:
          </span>
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md border border-border/80">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Details ({stats.totalFields})
            </button>
            <button
              onClick={() => setFilterMode('pending')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                filterMode === 'pending'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pending Only ({stats.pendingFields})
            </button>
            <button
              onClick={() => setFilterMode('filled')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                filterMode === 'filled'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Filled Only ({stats.filledFields})
            </button>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Completed: <strong className="text-foreground">{stats.filledFields}</strong> •{' '}
          Pending: <strong className="text-foreground">{stats.pendingFields}</strong>
        </p>
      </div>

      {/* ── Detailed Checklist Sections (Executive 2-Column Field Tiles) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {filteredChecklist.map((category) => {
          const hasItems = category.items.length > 0;
          return (
            <div
              key={category.key}
              className={`bg-card border border-border/80 rounded-xl overflow-hidden shadow-2xs flex flex-col ${category.key === 'address' ? 'md:col-span-2' : ''}`}
            >
              {/* Category Header */}
              <div className="px-3.5 py-2 bg-muted/30 border-b border-border/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-primary/10 text-primary">
                    {getCategoryIcon(category.key)}
                  </div>
                  <span className="font-bold text-xs sm:text-sm font-heading text-foreground">
                    {category.category}
                  </span>
                </div>

                {category.isVerified ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-0.5">
                    <CheckCircle2 size={10} /> Verified
                  </span>
                ) : category.isFilled ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-muted text-foreground border border-border flex items-center gap-0.5">
                    Filled
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border flex items-center gap-0.5">
                    Pending
                  </span>
                )}
              </div>

              {/* Category Field Tiles Grid */}
              <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 flex-1">
                {!hasItems ? (
                  <p className="col-span-full text-[11px] text-muted-foreground py-3 text-center">
                    No items match the "{filterMode}" filter.
                  </p>
                ) : (
                  category.items.map((item, idx) => {
                    const formatted = formatFieldValue(item.label, item.value);
                    return (
                      <div
                        key={idx}
                        className="bg-muted/15 p-2 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-muted/30 transition-all flex flex-col justify-between"
                      >
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                          {item.label}
                        </p>
                        <div className="flex items-center justify-between gap-1.5 mt-0.5">
                          <p
                            className={`text-xs font-semibold truncate ${
                              item.isFilled ? 'text-foreground' : 'text-muted-foreground/60 font-normal'
                            }`}
                            title={formatted}
                          >
                            {formatted}
                          </p>
                          {item.isFilled && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" title="Filled" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── The firm (firm DSAs) and everything the DSA onboarding collected, with the API / OCR records under "Read more" ── */}
      <FirmBlock info={data.dsa_application} />
      <DsaApplicationBlock info={data.dsa_application} />

      {/* ── Assigned Support Team & Branch ── */}
      <div className="bg-card border border-border/80 rounded-xl px-3.5 py-2.5 shadow-xs">
        <h3 className="font-bold text-xs sm:text-sm font-heading text-foreground mb-2 flex items-center gap-1.5">
          <Building2 size={13} className="text-primary" /> Assigned Support Team & Branch
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Branch */}
          <div className="p-2 rounded-lg bg-muted/20 border border-border/60">
            <span className="text-[10px] font-semibold text-muted-foreground">Branch</span>
            <p className="text-xs font-bold text-foreground truncate mt-0.5">
              {partner.branch_name || 'No Branch Assigned'}
            </p>
          </div>

          {/* Loan Operations */}
          <div className="p-2 rounded-lg bg-muted/20 border border-border/60">
            <span className="text-[10px] font-semibold text-muted-foreground">Loan Operations</span>
            <p className="text-xs font-bold text-foreground truncate mt-0.5">
              {partner.loan_ops_name || 'Not Assigned'}
            </p>
            {partner.loan_ops_phone && (
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <Phone size={10} className="text-primary" /> {partner.loan_ops_phone}
              </p>
            )}
          </div>

          {/* Accountant */}
          <div className="p-2 rounded-lg bg-muted/20 border border-border/60">
            <span className="text-[10px] font-semibold text-muted-foreground">Accountant</span>
            <p className="text-xs font-bold text-foreground truncate mt-0.5">
              {partner.accountant_name || 'Not Assigned'}
            </p>
            {partner.accountant_phone && (
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <Phone size={10} className="text-primary" /> {partner.accountant_phone}
              </p>
            )}
          </div>

          {/* Operations */}
          <div className="p-2 rounded-lg bg-muted/20 border border-border/60">
            <span className="text-[10px] font-semibold text-muted-foreground">Operations</span>
            <p className="text-xs font-bold text-foreground truncate mt-0.5">
              {partner.operations_name || 'Not Assigned'}
            </p>
            {partner.operations_phone && (
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <Phone size={10} className="text-primary" /> {partner.operations_phone}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
