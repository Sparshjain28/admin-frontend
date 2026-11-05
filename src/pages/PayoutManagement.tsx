import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    Gift, CreditCard, TrendingUp, Clock, CheckCircle2, XCircle, RefreshCw, Send, X, Calculator, HelpCircle, Info, Plus, Edit2, Calendar, ChevronLeft, ChevronRight, Download, Save, Upload, Search,
    Check, Wallet as WalletIcon, Trash2, Filter, SlidersHorizontal, ArrowLeft, LayoutGrid, List
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

// Interface matching database schema
interface PayoutRecord {
    id?: number;
    payout_amount: number;
    status: string;
    txn_type: string;
    remarks?: string;
    credit_debit?: string;
    user_id?: number;
    dsa_id?: number;
    payment_date: string;
    account_number?: string;
    ifsc_code?: string;
    request_id: string;
    created_at?: string;
    dsa_name?: string;
}

interface RewardItem {
    id: string;
    title: string;
    date: string;
    category: string;
    subCategory?: string;
    lenderName?: string;
    targetRole: 'DSA' | 'Advisor' | 'All';
    targetUser: string;
}

interface WithdrawalRequest {
    id: string;
    partnerName: string;
    partnerRole: 'DSA' | 'Advisor';
    requestedAmount: number;
    walletBalance: number;
    status: 'pending' | 'approved' | 'rejected';
    paidAmount?: number;
    tdsAmount?: number;
    txnId?: string;
    remarks?: string;
    date: string;
}

interface SlabItem {
    id: string;
    minAmount: string;
    maxAmount: string;
    slabName: string;
    commissionRate: number;
    applyToAll: boolean;
    applyToDsa: boolean;
    applyToAdvisor: boolean;
}

const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr || dateStr === '—' || dateStr === '-') return '—';
    const s = String(dateStr).trim();
    if (s.includes('T') || s.includes('Z')) {
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        }
    }
    // Clean string and strip time part whether separated by 'T' or space ' '
    const cleanDate = s.split(/[T ]/)[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return cleanDate;
};

const maskPhoneNumber = (phone: string | null | undefined): string => {
    if (!phone) return '';
    let clean = String(phone).trim().replace(/\D/g, '');
    if (clean.length > 10 && clean.startsWith('91')) {
        clean = clean.slice(-10);
    }
    if (clean.length >= 10) {
        return `${clean.slice(0, 2)}XXXXXX${clean.slice(-2)}`;
    }
    return String(phone).trim();
};

const MaskedPhone = ({ phone }: { phone: string }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <span
            onMouseEnter={(e) => { e.stopPropagation(); setHovered(true); }}
            onMouseLeave={(e) => { e.stopPropagation(); setHovered(false); }}
            className="cursor-default font-mono text-[8px] text-muted-foreground truncate select-text"
            title={phone}
        >
            {hovered ? phone : maskPhoneNumber(phone)}
        </span>
    );
};

const toTitleCase = (str: string): string => {
    if (!str) return '';
    return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

// Parse vehicle details string: "Hyundai Creta MH12AB1234"
// Returns { name: "Hyundai Creta", number: "MH12AB1234" }
const parseVehicleDetails = (vehicleDetails: string | null | undefined): { name: string; number: string } => {
    if (!vehicleDetails) return { name: '', number: '' };
    
    const str = String(vehicleDetails).trim();
    if (!str) return { name: '', number: '' };
    
    // Last part is usually the registration number (contains digits or follows pattern)
    const parts = str.split(' ');
    
    // If only one part, it's either name or number
    if (parts.length === 1) {
        // If it looks like a registration number (contains letter and digits)
        if (/[A-Z]{2}\d{2}[A-Z]{2}\d{4}/.test(parts[0])) {
            return { name: '', number: parts[0] };
        }
        return { name: parts[0], number: '' };
    }
    
    // Last part is likely the registration number if it looks like one
    const lastPart = parts[parts.length - 1];
    if (/[A-Z]{2}\d{2}[A-Z]{2}\d{4}/.test(lastPart)) {
        return { name: parts.slice(0, -1).join(' '), number: lastPart };
    }
    
    // Otherwise, all parts are the name
    return { name: str, number: '' };
};

// Generates subtle pastel colors for bank/lender avatars matching Flutter
const getAvatarStyle = (name: string) => {
    const styles = [
        { bg: 'bg-[#EFF6FF] dark:bg-blue-950/40', text: 'text-[#1D4ED8] dark:text-blue-400' },
        { bg: 'bg-[#ECFDF5] dark:bg-emerald-950/40', text: 'text-[#047857] dark:text-emerald-400' },
        { bg: 'bg-[#FDF2F8] dark:bg-pink-950/40', text: 'text-[#BE185D] dark:text-pink-400' },
        { bg: 'bg-[#FFF7ED] dark:bg-orange-950/40', text: 'text-[#C2410C] dark:text-orange-400' },
    ];
    let hash = 0;
    const str = String(name || 'Bank');
    for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
    return styles[Math.abs(hash) % styles.length];
};

export default function PayoutManagement() {
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState<'reward' | 'earning' | 'payout'>('earning');

    // Accountant should only access earning tab
    useEffect(() => {
        if (user?.role === 'accountant' && activeTab !== 'earning') {
            setActiveTab('earning');
        }
    }, [user?.role, activeTab]);
    
    // Admin Payout Approval States
    const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);

    const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
    const [showAdminApproveModal, setShowAdminApproveModal] = useState(false);
    const [showAdminRejectModal, setShowAdminRejectModal] = useState(false);
    
    // Admin approval inputs
    const [adminPaidAmount, setAdminPaidAmount] = useState('');
    const [adminTdsAmount, setAdminTdsAmount] = useState('');
    const [adminTxnId, setAdminTxnId] = useState('');
    const [adminRemarks, setAdminRemarks] = useState('');
    
    // Admin Payout Search & Filter States
    const [adminSearchTerm, setAdminSearchTerm] = useState('');
    const [adminRoleFilter, setAdminRoleFilter] = useState('all');
    const [adminStatusFilter, setAdminStatusFilter] = useState('all');
    
    
    // States for earnings list
    const [earnings, setEarnings] = useState<any[]>([]);
    const [loadingEarnings, setLoadingEarnings] = useState(false);
    const [earningTotal, setEarningTotal] = useState(0);
    const [earningsLoadFailed, setEarningsLoadFailed] = useState(false);
    const [debouncedEarningSearch, setDebouncedEarningSearch] = useState('');
    const earningsRequestRef = useRef(0);
    const lastEarningFiltersRef = useRef<string | null>(null);
    const [showEarningDateFilter, setShowEarningDateFilter] = useState(false);
    const [earningCaseTypeFilter, setEarningCaseTypeFilter] = useState('');
    const [earningSearchTerm, setEarningSearchTerm] = useState('');
    const [earningCategory, setEarningCategory] = useState<string>('Loan');
    const [earningSubcategory, setEarningSubcategory] = useState<string>('Used Car Loan');
    const [earningPartnerRoleFilter, setEarningPartnerRoleFilter] = useState<'all' | 'dsa' | 'advisor'>('all');
    
    // Loan subcategories list (No 'All' option)
    const loanSubcategoryOptions = [
        'Used Car Loan',
        'New Car Loan',
        'Home Loan',
        'Loan Against Property',
        'Personal Loan',
        'Business Loan'
    ];
    const earningCategoryOptions = ['Loan'];
    const earningSubcategoryMap: Record<string, string[]> = {
        Loan: loanSubcategoryOptions,
        
    };
    const earningSubcategoryList = earningSubcategoryMap[earningCategory] || [];
    const hasEarningSubcategories = earningSubcategoryList.length > 0;
    const isEarningFilterReady = Boolean(earningCategory);

    const earningCaseTypeMap: Record<string, string[]> = {
        'Used Car Loan': ['Purchase', 'Refinance', 'BT/Top-Up'],
    };

    // Map UI category values to backend API values
    const getCategoryApiValue = (uiCategory: string): string => {
        if (uiCategory === 'Loan') return 'loan';
        if (uiCategory === 'Credit Card') return 'credit_card';
        if (uiCategory === 'Insurance') return 'insurance';
        return '';
    };

    // Map UI subcategory values to backend API values
    const getSubcategoryApiValue = (uiSubcategory: string): string => {
        const mappings: Record<string, string> = {
            'Used Car Loan': 'used_car_loan',
            'New Car Loan': 'new_car_loan',
            'Home Loan': 'home_loan',
            'Loan Against Property': 'loan_against_property',
            'Personal Loan': 'personal_loan',
            'Business Loan': 'business_loan',
        };
        return mappings[uiSubcategory] || '';
    };

    // Map UI case type values to backend API values
    const getCaseTypeApiValue = (uiCaseType: string): string => {
        if (uiCaseType === 'BT/Top-Up') return 'BT';
        return uiCaseType;
    };

    // Auto-sync search params (e.g. from DSA Performance -> Total Earnings click)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab === 'earning' || tab === 'reward' || tab === 'payout') {
            setActiveTab(tab);
        }

        const dsa = params.get('dsa') || params.get('search') || params.get('partner');
        if (dsa) {
            setEarningSearchTerm(dsa);
        }

        const cat = params.get('category');
        if (cat) {
            const lowerCat = cat.toLowerCase();
            if (lowerCat.includes('loan')) {
                setEarningCategory('Loan');
            }
        } else if (tab === 'earning' || !tab) {
            setEarningCategory(prev => prev || 'Loan');
        }

        const sub = params.get('subcategory');
        if (sub && sub !== 'all') {
            setEarningSubcategory(sub);
        } else if (!cat || cat.toLowerCase().includes('loan')) {
            setEarningSubcategory(prev => prev || 'Used Car Loan');
        }

        const period = params.get('period');
        if (period === 'current_month' || period === 'previous_month') {
            const now = new Date();
            const monthOffset = period === 'current_month' ? 0 : -1;
            const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
            const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0);
            const formatDate = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            setAppliedEarningDateFrom(formatDate(start));
            setAppliedEarningDateTo(formatDate(end));
        }

        const statusParam = params.get('status');
        if (statusParam === 'approved' || statusParam === 'paid') {
            setEarningStatusFilter('paid');
        } else if (statusParam === 'pending') {
            setEarningStatusFilter('pending');
        }
    }, [location.search]);

    const isCreditCardEarning = (r: any): boolean => {
        const earningType = String(r?.earning_type || '').toLowerCase();
        if (earningType === 'loan') return false;
        if (earningType === 'credit_card') return true;
        const cat = String(r?.product_category || r?.case_type || '').toLowerCase();
        return cat.includes('credit_card') || cat.includes('credit card') || !!r?.card_name;
    };
    const [showEarningImportExport, setShowEarningImportExport] = useState(false);
    const [isImportingEarnings, setIsImportingEarnings] = useState(false);
    const earningImportRef = useRef<HTMLInputElement>(null);
    const [showImportPreview, setShowImportPreview] = useState(false);
    const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
    const [importSummary, setImportSummary] = useState<any>(null);
    const [importPreviewFilter, setImportPreviewFilter] = useState<'total' | 'update' | 'skipped' | 'failed'>('total');
    const [isProcessingImport, setIsProcessingImport] = useState(false);
    const [importPreviewFile, setImportPreviewFile] = useState<File | null>(null);
    const [importErrors, setImportErrors] = useState<Record<number | string, string>>({});
    const [importSuccessfulIds, setImportSuccessfulIds] = useState<(number | string)[]>([]);
    const [importRemarks, setImportRemarks] = useState<Record<number | string, string>>({});
    const [earningDateFilterDraftFrom, setEarningDateFilterDraftFrom] = useState('');
    const [earningDateFilterDraftTo, setEarningDateFilterDraftTo] = useState('');
    const [appliedEarningDateFrom, setAppliedEarningDateFrom] = useState('');
    const [appliedEarningDateTo, setAppliedEarningDateTo] = useState('');
    const [selectedEarningIds, setSelectedEarningIds] = useState<number[]>([]);
    const [showDeleteEarningsConfirm, setShowDeleteEarningsConfirm] = useState(false);
    const [deletingEarnings, setDeletingEarnings] = useState(false);

    const earningDateFilterButtonRef = useRef<HTMLButtonElement>(null);
    const earningDateFilterMobileButtonRef = useRef<HTMLButtonElement>(null);
    const earningDateFilterPopupRef = useRef<HTMLDivElement>(null);
    const [earningStatusFilter, setEarningStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
    const [approvingIds, setApprovingIds] = useState<number[]>([]);
    const [editingEarningId, setEditingEarningId] = useState<number | null>(null);
    const [editingEarningRow, setEditingEarningRow] = useState<any | null>(null);
    const [editingLoanAmount, setEditingLoanAmount] = useState('');
    const [editingNewBasePayout, setEditingNewBasePayout] = useState('');
    const [editingPayout, setEditingPayout] = useState('');
    const [editingRemark, setEditingRemark] = useState('');
    const [editingError, setEditingError] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [manualPayoutEdit, setManualPayoutEdit] = useState(false);
    const [earningCurrentPage, setEarningCurrentPage] = useState(() => Number(sessionStorage.getItem('earning_page')) || 1);
    const earningItemsPerPage = 50;
    
    // States for partner wallet / payout withdrawal
    const [walletData, setWalletData] = useState<any>(null);
    const [loadingWallet, setLoadingWallet] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawAmountError, setWithdrawAmountError] = useState('');
    const [myWithdrawals, setMyWithdrawals] = useState<any[]>([]);
    const [loadingMyWithdrawals, setLoadingMyWithdrawals] = useState(false);
    const isExecOrAdvisor = (user?.role || '').toLowerCase() === 'executive' || (user?.role || '').toLowerCase() === 'advisor';
    const hasSuperior = Boolean(user?.reporting_to || (user as any)?.dsa_id);
    const isIndependentAdvisor = isExecOrAdvisor && !hasSuperior;
    const isPartnerPayoutRole = (user?.role || '').toLowerCase() === 'dsa' || isIndependentAdvisor;
    const isPartnerWalletRole = ['dsa', 'dsa_partner'].includes((user?.role || '').toLowerCase()) || isIndependentAdvisor;
    
    // States for Payout request form
    const [requestAmount, setRequestAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('IMPS');
    const [remarks, setRemarks] = useState('');
    const [accountNumber, setAccountNumber] = useState('123456789012');
    const [ifscCode, setIfscCode] = useState('HDFC0000123');
    const [submittingPayout, setSubmittingPayout] = useState(false);

    // States for Modals
    const [showCalcModal, setShowCalcModal] = useState(false);
    const [showSlabModal, setShowSlabModal] = useState(false);
    const [showAddRewardModal, setShowAddRewardModal] = useState(false);

    // States for Payout Calculator
    const [calcBank, setCalcBank] = useState('au');
    const [calcProduct, setCalcProduct] = useState('new_car');
    const [calcLoanAmount, setCalcLoanAmount] = useState('1000000');
    const [calcRaccRate, setCalcRaccRate] = useState(12);
    const [calcTenure, setCalcTenure] = useState(36);
    const [calcResult, setCalcResult] = useState<any>(null);

    // States for Reward form input
    const [rewardTitle, setRewardTitle] = useState('');
    const [rewardDate, setRewardDate] = useState('');
    const [rewardCategory, setRewardCategory] = useState('Used Car Loan');
    const [rewardSubCategory, setRewardSubCategory] = useState('Used Car - Purchase');
    const [rewardLenderName, setRewardLenderName] = useState('');
    const [rewardTargetRole, setRewardTargetRole] = useState<'DSA' | 'Advisor' | 'All'>('DSA');
    const [rewardTargetUser, setRewardTargetUser] = useState('All');
    
    // Editing Reward state
    const [editingRewardId, setEditingRewardId] = useState<string | null>(null);

    // State list for active rewards
    const [rewardsList, setRewardsList] = useState<RewardItem[]>([]);

    // Redesigned active rewards states
    const [activeRewardCategory, setActiveRewardCategory] = useState<string>('loan');
    const [activeRewardSubcategory, setActiveRewardSubcategory] = useState<string>('');
    const [activeRewardDsa, setActiveRewardDsa] = useState<boolean>(false);
    const [activeRewardAdvisor, setActiveRewardAdvisor] = useState<boolean>(false);
    const [selectedLenders, setSelectedLenders] = useState<string[]>([]);
    const [showLenderDropdown, setShowLenderDropdown] = useState<boolean>(false);

    const [dsaList, setDsaList] = useState<{ id: string; name: string }[]>([]);
    const [advisorList, setAdvisorList] = useState<{ id: string; name: string }[]>([]);
    const [selectedDsas, setSelectedDsas] = useState<string[]>([]);
    const [selectedAdvisors, setSelectedAdvisors] = useState<string[]>([]);
    const [showDsaDropdown, setShowDsaDropdown] = useState<boolean>(false);
    const [showAdvisorDropdown, setShowAdvisorDropdown] = useState<boolean>(false);

    const [lendersRewardsList, setLendersRewardsList] = useState<any[]>([]);
    const [fetchingRoi, setFetchingRoi] = useState<Record<string, boolean>>({});
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [subcategoryOptions, setSubcategoryOptions] = useState<string[]>(loanSubcategoryOptions);
    const EARNING_CASE_TYPES = ['Purchase', 'Refinance', 'Used Car BT/Top-Up'];
    const [activePayoutType, setActivePayoutType] = useState<'base_payout' | 'bonus'>('base_payout');
    const [basePayout_dsa, setBasePayout_dsa] = useState<string>('');
    const [basePayout_advisor, setBasePayout_advisor] = useState<string>('');
    const [isSavingBasePayout_dsa, setIsSavingBasePayout_dsa] = useState(false);
    const [isSavingBasePayout_advisor, setIsSavingBasePayout_advisor] = useState(false);

    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filterClosing, setFilterClosing] = useState(false);
    // Mirrors Flutter's reverse transition: play the exit animation, then unmount
    const closeFilterModal = () => {
        setFilterClosing(true);
        window.setTimeout(() => { setShowFilterModal(false); setFilterClosing(false); }, 180);
    };
    const [rewardViewMode, setRewardViewMode] = useState<'cards' | 'table'>('cards');

    // Base Payout — per-lender section
    const [basePayoutTopCategory, setBasePayoutTopCategory] = useState<string>('loan');
    const [basePayoutLoanType, setBasePayoutLoanType] = useState<string>('used_car_loan');
    const [basePayoutCategory, setBasePayoutCategory] = useState<string>('used_car_loan');
    const [basePayoutLenderId, setBasePayoutLenderId] = useState<string>('');
    const [creditCardProducts, setCreditCardProducts] = useState<any[]>([]);
    const [baseLenders, setBaseLenders] = useState<{ id: string; name: string }[]>([]);
    const [baseLenderData, setBaseLenderData] = useState<Record<string, { dsaBase: string; advisorBase: string }>>({});
    const [loadingBaseLenders, setLoadingBaseLenders] = useState(false);
    const [savingBaseLenderRow, setSavingBaseLenderRow] = useState<Record<string, boolean>>({});
    const [isSavingAll, setIsSavingAll] = useState(false);
    // Tracks the last-saved values — used to detect which rows have unsaved changes
    const baseLenderDataOriginal = useRef<Record<string, { dsaBase: string; advisorBase: string }>>({});

    // Bonus section state — maps category key to the product name used only for lender lookup
    const categoryToProduct: Record<string, string> = {
        used_car_loan: 'Used Car Purchase',
        new_car_loan: 'New Car Purchase',
        personal_loan: 'Personal Loan',
        business_loan: 'Business Loan',
        home_loan: 'Home Loan',
        loan_against_property: 'Loan Against Property',
        used_car_refinance: 'Used Car Refinance Up',
        used_car_bt_topup: 'Used Car BT/Top Up',
        credit_card: 'Credit Card',
        insurance: 'Insurance',
    };
    const [bonusTopCategory, setBonusTopCategory] = useState<string>('');
    const [bonusLoanType, setBonusLoanType] = useState<string>('');
    const [bonusCategory, setBonusCategory] = useState<string>('');
    const [bonusLenders, setBonusLenders] = useState<{ id: string; name: string }[]>([]);
    const [bonusTableData, setBonusTableData] = useState<Record<string, { dsaBase: string; dsaBonus: string | null; dsaTotal: string | null; advisorBase: string; advisorBonus: string | null; advisorTotal: string | null }>>({});
    const [loadingBonusData, setLoadingBonusData] = useState(false);

    // Fetch lenders + saved base payouts when basePayoutCategory / basePayoutLoanType / basePayoutTopCategory changes
    useEffect(() => {
        if (activeTab !== 'reward') return;
        if (!basePayoutCategory) { setBaseLenders([]); setBaseLenderData({}); setCreditCardProducts([]); return; }
        const product = categoryToProduct[basePayoutCategory];
        if (!product) { setBaseLenders([]); setBaseLenderData({}); setCreditCardProducts([]); return; }
        const fetch = async () => {
            setLoadingBaseLenders(true);
            try {
                let list: { id: string; name: string }[] = [];
                try {
                    const lenderData: any = await api.get(`/banks/by-subcategory?product=${encodeURIComponent(product)}`);
                    list = Array.isArray(lenderData)
                        ? lenderData.map((b: any) => ({ id: String(b.id), name: b.name }))
                        : [];
                } catch (e) {
                    console.error('Error fetching banks by subcategory:', e);
                }

                let fetchedProducts: any[] = [];
                const isCC = basePayoutCategory === 'credit_card' || basePayoutTopCategory === 'credit_card';
                if (isCC) {
                    try {
                        const prodRes: any = await api.get(`/products?category=${encodeURIComponent('Credit Card')}`);
                        fetchedProducts = Array.isArray(prodRes?.data) ? prodRes.data : (Array.isArray(prodRes) ? prodRes : []);
                        setCreditCardProducts(fetchedProducts);

                        // If banks list is empty, derive banks from credit card products
                        if (list.length === 0 && fetchedProducts.length > 0) {
                            const bankMap = new Map<string, string>();
                            fetchedProducts.forEach((p: any) => {
                                const bId = String(p.bank_id || p.bankId || p.id || '');
                                const bName = p.bank_name || p.bankName || p.name || 'Bank';
                                if (bId && !bankMap.has(bId)) {
                                    bankMap.set(bId, bName);
                                }
                            });
                            list = Array.from(bankMap.entries()).map(([id, name]) => ({ id, name }));
                        }
                    } catch (e) {
                        console.error('Failed to fetch credit card products:', e);
                    }
                } else {
                    setCreditCardProducts([]);
                }

                setBaseLenders(list);
                if (list.length === 0) { setBaseLenderData({}); return; }

                const params = new URLSearchParams({ category: basePayoutTopCategory || basePayoutCategory, subcategory: basePayoutLoanType, bank_ids: list.map(l => l.id).join(',') });
                const saved: any = await api.get(`/payouts/reward-schemes/lender-base-payouts?${params}`);
                const next: Record<string, { dsaBase: string; advisorBase: string }> = {};
                list.forEach(({ id }) => {
                    const subKey = basePayoutLoanType ? `${id}_${basePayoutLoanType}` : id;
                    next[id] = {
                        dsaBase: saved[subKey]?.dsaBase ?? saved[id]?.dsaBase ?? '0',
                        advisorBase: saved[subKey]?.advisorBase ?? saved[id]?.advisorBase ?? '0',
                    };
                    if (isCC) {
                        const bankProds = fetchedProducts.filter((p: any) => String(p.bank_id) === String(id) || String(p.id) === String(id));
                        bankProds.forEach((p: any) => {
                            const pName = p.product_name || p.name || 'Credit Card';
                            const pKey = `${id}_${pName}`;
                            next[pKey] = {
                                dsaBase: saved[pKey]?.dsaBase ?? saved[id]?.dsaBase ?? '0',
                                advisorBase: saved[pKey]?.advisorBase ?? saved[id]?.advisorBase ?? '0',
                            };
                        });
                    }
                });
                setBaseLenderData(next);
                baseLenderDataOriginal.current = JSON.parse(JSON.stringify(next));
            } catch { setBaseLenders([]); setBaseLenderData({}); setCreditCardProducts([]); }
            finally { setLoadingBaseLenders(false); }
        };
        fetch();    
    }, [basePayoutCategory, basePayoutLoanType, basePayoutTopCategory, activeTab]);

    const handleSaveBaseLenderRow = async (bankId: string, role: 'DSA' | 'Advisor', subcategory?: string) => {
        const isCC = basePayoutCategory === 'credit_card' || basePayoutTopCategory === 'credit_card';
        const effectiveSubcategory = isCC ? (subcategory || '') : (subcategory !== undefined ? subcategory : basePayoutLoanType);
        const dataKey = isCC && effectiveSubcategory ? `${bankId}_${effectiveSubcategory}` : bankId;
        const key = `${dataKey}_${role}`;
        setSavingBaseLenderRow(prev => ({ ...prev, [key]: true }));
        try {
            const rowData = baseLenderData[dataKey] || baseLenderData[bankId];
            const val = role === 'DSA' ? rowData?.dsaBase : rowData?.advisorBase;
            await api.post('/payouts/reward-schemes/lender-base-payout', {
                category: basePayoutTopCategory || basePayoutCategory,
                subcategory: effectiveSubcategory,
                bank_id: bankId,
                role,
                base_payout: parseFloat(val ?? '0') || 0,
            });
            baseLenderDataOriginal.current = {
                ...baseLenderDataOriginal.current,
                [dataKey]: {
                    ...baseLenderDataOriginal.current[dataKey],
                    ...(role === 'DSA' ? { dsaBase: val ?? '0' } : { advisorBase: val ?? '0' }),
                },
            };
            toast.success(`${role} base payout saved.`);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to save.');
        } finally {
            setSavingBaseLenderRow(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleSaveAllBasePayout = async () => {
        // Collect rows where DSA or Advisor value differs from the original
        type PendingRow = { bankId: string; name: string; role: 'DSA' | 'Advisor'; value: string; subcategory: string; dataKey: string };
        const pending: PendingRow[] = [];
        const isCC = basePayoutCategory === 'credit_card' || basePayoutTopCategory === 'credit_card';

        baseLenders.forEach(({ id, name }) => {
            const bankProds = isCC ? creditCardProducts.filter((p: any) => String(p.bank_id) === String(id)) : [];

            if (isCC && bankProds.length > 0) {
                bankProds.forEach((p: any) => {
                    const pName = p.product_name || p.name || 'Credit Card';
                    const pKey = `${id}_${pName}`;
                    const current = baseLenderData[pKey];
                    const original = baseLenderDataOriginal.current[pKey];
                    if (!current) return;
                    const dsaChanged = current.dsaBase !== (original?.dsaBase ?? '0');
                    const advisorChanged = current.advisorBase !== (original?.advisorBase ?? '0');
                    if (dsaChanged) pending.push({ bankId: id, name: `${name} - ${pName}`, role: 'DSA', value: current.dsaBase, subcategory: pName, dataKey: pKey });
                    if (advisorChanged) pending.push({ bankId: id, name: `${name} - ${pName}`, role: 'Advisor', value: current.advisorBase, subcategory: pName, dataKey: pKey });
                });
            } else {
                const current = baseLenderData[id];
                const original = baseLenderDataOriginal.current[id];
                if (!current) return;
                const dsaChanged = current.dsaBase !== (original?.dsaBase ?? '0');
                const advisorChanged = current.advisorBase !== (original?.advisorBase ?? '0');
                if (dsaChanged) pending.push({ bankId: id, name, role: 'DSA', value: current.dsaBase, subcategory: basePayoutLoanType, dataKey: id });
                if (advisorChanged) pending.push({ bankId: id, name, role: 'Advisor', value: current.advisorBase, subcategory: basePayoutLoanType, dataKey: id });
            }
        });

        if (pending.length === 0) {
            toast.info('No changes to save.');
            return;
        }

        setIsSavingAll(true);
        const failed: { name: string; role: string; reason: string }[] = [];

        await Promise.allSettled(
            pending.map(async ({ bankId, name, role, value, subcategory, dataKey }) => {
                try {
                    await api.post('/payouts/reward-schemes/lender-base-payout', {
                        category: basePayoutTopCategory || basePayoutCategory,
                        subcategory: subcategory,
                        bank_id: bankId,
                        role,
                        base_payout: parseFloat(value) || 0,
                    });
                    // Update original baseline for successfully saved rows
                    baseLenderDataOriginal.current = {
                        ...baseLenderDataOriginal.current,
                        [dataKey]: {
                            ...baseLenderDataOriginal.current[dataKey],
                            ...(role === 'DSA' ? { dsaBase: value } : { advisorBase: value }),
                        },
                    };
                } catch (err: any) {
                    failed.push({ name, role, reason: err?.response?.data?.error || 'Save failed' });
                }
            })
        );

        setIsSavingAll(false);

        const savedCount = pending.length - failed.length;
        if (failed.length === 0) {
            toast.success(`All ${savedCount} change${savedCount !== 1 ? 's' : ''} saved successfully.`);
        } else {
            if (savedCount > 0) toast.success(`${savedCount} change${savedCount !== 1 ? 's' : ''} saved.`);
            failed.forEach(({ name, role, reason }) => {
                toast.error(`${name} (${role}): ${reason}`);
            });
        }
    };

    // const handleSaveBasePayout = async (role: 'dsa' | 'advisor') => {
    //     const setter = role === 'dsa' ? setIsSavingBasePayout_dsa : setIsSavingBasePayout_advisor;
    //     const pct = role === 'dsa' ? basePayout_dsa : basePayout_advisor;
    //     setter(true);
    //     try {
    //         await api.post('/payouts/base-payout', { role, pct: parseFloat(pct) || 0 });
    //         toast.success(`${role === 'dsa' ? 'DSA' : 'Advisor'} base payout saved successfully.`);
    //     } catch (err: any) {
    //         toast.error(err?.response?.data?.error || 'Failed to save base payout.');
    //     } finally {
    //         setter(false);
    //     }
    // };

    // Load saved base payout values on mount
    // useEffect(() => {
    //     api.get('/payouts/base-payout').then((data: any) => {
    //         if (data?.dsa != null) setBasePayout_dsa(String(data.dsa));
    //         if (data?.advisor != null) setBasePayout_advisor(String(data.advisor));
    //     }).catch(() => {});
    // }, []);

    // Fetch lenders + payout data when bonusCategory or selected DSA/Advisor changes
    useEffect(() => {
        if (activeTab !== 'reward') return;
        if (!bonusCategory) { setBonusLenders([]); setBonusTableData({}); return; }
        const product = categoryToProduct[bonusCategory];
        if (!product) return;
        const fetchLendersAndPayouts = async () => {
            setLoadingBonusData(true);
            try {
                let list: { id: string; name: string }[] = [];
                try {
                    const lenderData: any = await api.get(`/banks/by-subcategory?product=${encodeURIComponent(product)}`);
                    list = Array.isArray(lenderData)
                        ? lenderData.map((b: any) => ({ id: String(b.id), name: b.name }))
                        : [];
                } catch (e) {
                    console.error('Error fetching bonus banks by subcategory:', e);
                }

                let fetchedProducts: any[] = [];
                const isCC = bonusCategory === 'credit_card' || bonusTopCategory === 'credit_card';
                if (isCC) {
                    try {
                        const prodRes: any = await api.get(`/products?category=${encodeURIComponent('Credit Card')}`);
                        fetchedProducts = Array.isArray(prodRes?.data) ? prodRes.data : (Array.isArray(prodRes) ? prodRes : []);
                        setCreditCardProducts(fetchedProducts);

                        if (list.length === 0 && fetchedProducts.length > 0) {
                            const bankMap = new Map<string, string>();
                            fetchedProducts.forEach((p: any) => {
                                const bId = String(p.bank_id || p.bankId || p.id || '');
                                const bName = p.bank_name || p.bankName || p.name || 'Bank';
                                if (bId && !bankMap.has(bId)) {
                                    bankMap.set(bId, bName);
                                }
                            });
                            list = Array.from(bankMap.entries()).map(([id, name]) => ({ id, name }));
                        }
                    } catch (e) {
                        console.error('Failed to fetch credit card products for bonus:', e);
                    }
                }

                setBonusLenders(list);
                if (list.length === 0) { setBonusTableData({}); return; }

                // subcategory intentionally omitted — bonus is stored at category level (no subcategory), same as Base Payout
                const params = new URLSearchParams({ category: bonusTopCategory || bonusCategory, subcategory: bonusLoanType, bank_ids: list.map(l => l.id).join(',') });
                if (selectedDsas.length > 0) params.set('dsa_ids', selectedDsas.join(','));
                if (selectedAdvisors.length > 0) params.set('advisor_ids', selectedAdvisors.join(','));
                const payoutData: any = await api.get(`/payouts/reward-schemes/base-payouts?${params}`);
                const next: typeof bonusTableData = {};
                list.forEach(({ id }) => {
                    const d = payoutData[id] || (bonusLoanType ? payoutData[`${id}_${bonusLoanType}`] : null) || {};
                    next[id] = {
                        dsaBase:      d.dsaBase      != null ? String(d.dsaBase)      : '0',
                        dsaBonus:     d.dsaBonus     != null ? String(d.dsaBonus)     : null,
                        dsaTotal:     d.dsaTotal     != null ? String(d.dsaTotal)     : null,
                        advisorBase:  d.advisorBase  != null ? String(d.advisorBase)  : '0',
                        advisorBonus: d.advisorBonus != null ? String(d.advisorBonus) : null,
                        advisorTotal: d.advisorTotal != null ? String(d.advisorTotal) : null,
                    };
                    if (isCC) {
                        const bankProds = fetchedProducts.filter((p: any) => String(p.bank_id) === String(id) || String(p.id) === String(id));
                        bankProds.forEach((p: any) => {
                            const pName = p.product_name || p.name || 'Credit Card';
                            const pKey = `${id}_${pName}`;
                            const pd = payoutData[pKey] || {};
                            next[pKey] = {
                                dsaBase:      pd.dsaBase      != null ? String(pd.dsaBase)      : (d.dsaBase != null ? String(d.dsaBase) : '0'),
                                dsaBonus:     pd.dsaBonus     != null ? String(pd.dsaBonus)     : null,
                                dsaTotal:     pd.dsaTotal     != null ? String(pd.dsaTotal)     : null,
                                advisorBase:  pd.advisorBase  != null ? String(pd.advisorBase)  : (d.advisorBase != null ? String(d.advisorBase) : '0'),
                                advisorBonus: pd.advisorBonus != null ? String(pd.advisorBonus) : null,
                                advisorTotal: pd.advisorTotal != null ? String(pd.advisorTotal) : null,
                            };
                        });
                    }
                });
                setBonusTableData(next);
            } catch { setBonusLenders([]); setBonusTableData({}); }
            finally { setLoadingBonusData(false); }
        };
        fetchLendersAndPayouts();
    }, [bonusCategory, bonusTopCategory, bonusLoanType, selectedDsas, selectedAdvisors, activeTab]);

    const handleBonusFieldChange = (bankId: string, field: 'dsaBonus' | 'advisorBonus', value: string) => {
        setBonusTableData(prev => {
            const defaultRow: typeof bonusTableData[string] = { dsaBase: '0', dsaBonus: null, dsaTotal: null, advisorBase: '0', advisorBonus: null, advisorTotal: null };
            const row: typeof bonusTableData[string] = { ...(prev[bankId] || defaultRow), [field]: value };
            const dsaB  = parseFloat(row.dsaBase)  || 0;
            const advB  = parseFloat(row.advisorBase) || 0;
            row.dsaTotal     = row.dsaBonus     != null ? String(dsaB  + (parseFloat(row.dsaBonus)     || 0)) : null;
            row.advisorTotal = row.advisorBonus != null ? String(advB  + (parseFloat(row.advisorBonus) || 0)) : null;
            return { ...prev, [bankId]: row };
        });
    };

    // DSA Panel View state
    const [dsaViewCategory, setDsaViewCategory] = useState<string>('');
    const [dsaViewSubcategory, setDsaViewSubcategory] = useState<string>('');
    const [dsaViewRows, setDsaViewRows] = useState<any[]>([]);
    const [loadingDsaView, setLoadingDsaView] = useState(false);

    const dsaSubcategoryMap: Record<string, { label: string; value: string }[]> = {
        loan: [
            { label: 'New Car Loan', value: 'new_car_loan' },
            { label: 'Used Car Loan', value: 'used_car_loan' },
            { label: 'Home Loan', value: 'home_loan' },
            { label: 'Loan Against Property', value: 'loan_against_property' },
            { label: 'Personal Loan', value: 'personal_loan' },
            { label: 'Business Loan', value: 'business_loan' },
        ],
    };

    // Fetch DSA / Advisor payout view when category+subcategory are set
    useEffect(() => {
        if (activeTab !== 'reward') return;
        if (!isPartnerPayoutRole) return;
        const cat = dsaViewCategory;
        const sub = dsaViewSubcategory;
        // For loan, require subcategory; for others, fetch immediately
        if (!cat || (cat === 'loan' && !sub)) { setDsaViewRows([]); return; }
        const fetchDsaView = async () => {
            setLoadingDsaView(true);
            try {
                const params = new URLSearchParams({ category: cat });
                if (sub) params.set('subcategory', sub);
                const data: any = await api.get(`/payouts/reward-schemes/dsa-view?${params}`);
                setDsaViewRows(Array.isArray(data) ? data : []);
            } catch { setDsaViewRows([]); }
            finally { setLoadingDsaView(false); }
        }; 
        fetchDsaView();
    }, [dsaViewCategory, dsaViewSubcategory, user?.role, isPartnerPayoutRole]);

    const [savingBonusRow, setSavingBonusRow] = useState<Record<string, boolean>>({});
    const [isSavingBonusDsa, setIsSavingBonusDsa] = useState(false);
    const [isSavingBonusAdvisor, setIsSavingBonusAdvisor] = useState(false);
    const [isImportingBase, setIsImportingBase] = useState(false);
    const [isImportingBonus, setIsImportingBonus] = useState(false);
    const baseImportRef = useRef<HTMLInputElement>(null);
    const bonusImportRef = useRef<HTMLInputElement>(null);
    const [rewardSearchTerm, setRewardSearchTerm] = useState<string>('');
    const [showBaseIOMenu, setShowBaseIOMenu] = useState(false);
    const [showBonusIOMenu, setShowBonusIOMenu] = useState(false);

    // Reward Import Preview state
    const [showRewardImportPreview, setShowRewardImportPreview] = useState(false);
    const [rewardImportPreviewData, setRewardImportPreviewData] = useState<any[]>([]);
    const [rewardImportSummary, setRewardImportSummary] = useState<any>(null);
    const [rewardImportPreviewFilter, setRewardImportPreviewFilter] = useState<'total' | 'update' | 'skipped' | 'failed'>('total');
    const [rewardImportPreviewFile, setRewardImportPreviewFile] = useState<File | null>(null);
    const [rewardImportPreviewType, setRewardImportPreviewType] = useState<'base-payout' | 'bonus'>('base-payout');
    const [isProcessingRewardImport, setIsProcessingRewardImport] = useState(false);
    const [rewardImportErrors, setRewardImportErrors] = useState<Record<number | string, string>>({});
    const [rewardImportSuccessfulIds, setRewardImportSuccessfulIds] = useState<(number | string)[]>([]);
    const baseIOMenuRef = useRef<HTMLDivElement>(null);
    const bonusIOMenuRef = useRef<HTMLDivElement>(null);

    const API_URL = import.meta.env.VITE_API_URL || '/api';
    const getAuthHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` });

    // Close Import/Export dropdown menus when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (baseIOMenuRef.current && !baseIOMenuRef.current.contains(e.target as Node)) setShowBaseIOMenu(false);
            if (bonusIOMenuRef.current && !bonusIOMenuRef.current.contains(e.target as Node)) setShowBonusIOMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleExport = async (type: 'base-payout' | 'bonus') => {
        // If a search is active, export only the filtered rows client-side
        const term = rewardSearchTerm.trim().toLowerCase();
        if (term) {
            try {
                if (type === 'base-payout') {
                    const filtered = baseLenders.filter(l => l.name.toLowerCase().includes(term));
                    if (filtered.length === 0) { toast.error('No matching records to export.'); return; }
                    const params = new URLSearchParams({
                        category: basePayoutTopCategory || basePayoutCategory,
                        subcategory: basePayoutLoanType || '',
                        bank_ids: filtered.map(lender => lender.id).join(','),
                    });
                    const res = await fetch(`${API_URL}/payouts/reward-schemes/base-payout/export?${params}`, { headers: getAuthHeaders() });
                    if (!res.ok) throw new Error('Export failed');
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `base-payout_filtered_${new Date().toISOString().split('T')[0]}.xlsx`;
                    a.click();
                    URL.revokeObjectURL(url);
                } else {
                    const filtered = bonusLenders.filter(l => l.name.toLowerCase().includes(term));
                    if (filtered.length === 0) { toast.error('No matching records to export.'); return; }
                    const rows = filtered.map(({ id, name }) => {
                        const d = bonusTableData[id] || { dsaBase: '0', dsaBonus: null, dsaTotal: null, advisorBase: '0', advisorBonus: null, advisorTotal: null };
                        return {
                            'Lender / Bank': name,
                            'DSA Base Payout (%)': parseFloat(d.dsaBase) || 0,
                            'DSA Bonus (%)': parseFloat(d.dsaBonus ?? '0') || 0,
                            'DSA New Base Payout (%)': parseFloat(d.dsaTotal ?? d.dsaBase) || 0,
                            'Advisor Base Payout (%)': parseFloat(d.advisorBase) || 0,
                            'Advisor Bonus (%)': parseFloat(d.advisorBonus ?? '0') || 0,
                            'Advisor New Base Payout (%)': parseFloat(d.advisorTotal ?? d.advisorBase) || 0,
                        };
                    });
                    const worksheet = XLSX.utils.json_to_sheet(rows);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bonus');
                    XLSX.writeFile(workbook, `bonus_filtered_${new Date().toISOString().split('T')[0]}.xlsx`);
                }
                toast.success('Filtered Excel exported successfully!');
            } catch { toast.error('Export failed.'); }
            return;
        }
        try {
            if (type === 'base-payout') {
                const params = new URLSearchParams({
                    category: basePayoutTopCategory || basePayoutCategory,
                    subcategory: basePayoutLoanType || '',
                    bank_ids: baseLenders.map(lender => lender.id).join(','),
                });
                const res = await fetch(`${API_URL}/payouts/reward-schemes/base-payout/export?${params}`, { headers: getAuthHeaders() });
                if (!res.ok) throw new Error('Export failed');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `base-payout_${new Date().toISOString().split('T')[0]}.xlsx`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Excel exported successfully!');
                return;
            }
            const res = await fetch(`${API_URL}/payouts/reward-schemes/${type}/export`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Excel exported successfully!');
        } catch { toast.error('Export failed.'); }
    };

    const handleImport = async (type: 'base-payout' | 'bonus', file: File) => {
        const setter = type === 'base-payout' ? setIsImportingBase : setIsImportingBonus;
        setter(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const apiUrl = `${API_URL}/payouts/reward-schemes/${type}/import-preview`;
            const authToken = localStorage.getItem('auth_token');
            const previewRes = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken || ''}` },
                body: formData,
            });
            if (!previewRes.ok) {
                const errorData = await previewRes.json().catch(() => ({ error: 'Preview failed' }));
                throw new Error(errorData.error || `Preview failed with status ${previewRes.status}`);
            }
            const previewData = await previewRes.json();
            setRewardImportPreviewFile(file);
            setRewardImportPreviewType(type);
            setRewardImportPreviewData(previewData.preview || []);
            setRewardImportSummary(previewData.summary || {});
            setRewardImportPreviewFilter('total');
            setRewardImportErrors({});
            setRewardImportSuccessfulIds([]);
            setShowRewardImportPreview(true);
            const toUpdate = previewData.summary?.recordsToUpdate || 0;
            const failed = previewData.summary?.failedRecords || 0;
            if (failed > 0) {
                toast.success(`Preview loaded: ${toUpdate} to update, ${failed} failed`);
            } else {
                toast.success(`Preview loaded: ${toUpdate} record${toUpdate !== 1 ? 's' : ''} to update`);
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to preview import.');
        } finally {
            setter(false);
        }
    };

    const handleConfirmRewardImport = async () => {
        if (!rewardImportPreviewFile) return;
        setIsProcessingRewardImport(true);
        setRewardImportErrors({});
        setRewardImportSuccessfulIds([]);
        try {
            const eligibleRows = rewardImportPreviewData.filter((r: any) => r.category === 'update');
            // Pass row indices so backend can match and process only eligible rows
            const eligibleRowIndices = eligibleRows.map((r: any) => r.rowIndex);
            const formData = new FormData();
            formData.append('file', rewardImportPreviewFile);
            formData.append('eligible_row_indices', JSON.stringify(eligibleRowIndices));
            const apiUrl = `${API_URL}/payouts/reward-schemes/${rewardImportPreviewType}/import`;
            const authToken = localStorage.getItem('auth_token');
            const importRes = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken || ''}` },
                body: formData,
            });
            if (!importRes.ok) {
                const errorData = await importRes.json().catch(() => ({ error: 'Import failed' }));
                throw new Error(errorData.error || `Import failed with status ${importRes.status}`);
            }
            const data = await importRes.json();
            if (data.failures && data.failures.length > 0) {
                const errorMap: Record<string, string> = {};
                data.failures.forEach((f: any) => { errorMap[f.rowIndex] = f.error; });
                setRewardImportErrors(errorMap);
                const successIds = eligibleRows
                    .filter((r: any) => !errorMap[r.rowIndex])
                    .map((r: any) => r.rowIndex);
                setRewardImportSuccessfulIds(successIds);
                toast.error(`Import completed with errors: ${data.updated} updated, ${data.failures.length} failed.`);
            } else {
                toast.success(`Successfully imported ${data.updated} records!`);
                setShowRewardImportPreview(false);
                setRewardImportPreviewData([]);
                setRewardImportSummary(null);
                setRewardImportPreviewFile(null);
                setRewardImportErrors({});
                setRewardImportSuccessfulIds([]);
                // Refresh table data
                if (rewardImportPreviewType === 'base-payout' && basePayoutCategory) {
                    const cat = basePayoutCategory;
                    setBasePayoutCategory('');
                    setTimeout(() => setBasePayoutCategory(cat), 50);
                }
            }
        } catch (err: any) {
            toast.error(err.message || 'Import failed.');
        } finally {
            setIsProcessingRewardImport(false);
        }
    };

    const handleSaveAllForRole = async (role: 'dsa' | 'advisor' | 'both') => {
        if (bonusLenders.length === 0) return;
        const saveDsa = role === 'dsa' || role === 'both';
        const saveAdvisor = role === 'advisor' || role === 'both';
        if (saveDsa) setIsSavingBonusDsa(true);
        if (saveAdvisor) setIsSavingBonusAdvisor(true);
        const isCC = bonusCategory === 'credit_card' || bonusTopCategory === 'credit_card';
        try {
            const calls: Promise<any>[] = [];
            bonusLenders.forEach(({ id }) => {
                const bankProds = isCC ? creditCardProducts.filter((p: any) => String(p.bank_id) === String(id)) : [];
                const itemsToSave = isCC && bankProds.length > 0
                    ? bankProds.map((p: any) => ({ dataKey: `${id}_${p.product_name || p.name || 'Credit Card'}`, sub: p.product_name || p.name || 'Credit Card' }))
                    : [{ dataKey: id, sub: bonusLoanType }];

                itemsToSave.forEach(({ dataKey, sub }) => {
                    const defaultBonusRow: typeof bonusTableData[string] = { dsaBase: '0', dsaBonus: null, dsaTotal: null, advisorBase: '0', advisorBonus: null, advisorTotal: null };
                    const d = bonusTableData[dataKey] || bonusTableData[id] || defaultBonusRow;
                    const dsaHasBonus     = saveDsa     && (parseFloat(d.dsaBonus     ?? '') || 0) > 0;
                    const advisorHasBonus = saveAdvisor && (parseFloat(d.advisorBonus ?? '') || 0) > 0;
                    if (!dsaHasBonus && !advisorHasBonus) return;
                    const lender: any = { bank_id: id };
                    if (dsaHasBonus) lender.dsa = { enabled: true, user_ids: selectedDsas, base_payout: parseFloat(d.dsaBase) || 0, bonus_pct: parseFloat(d.dsaBonus ?? '0') || 0, new_payout: parseFloat(d.dsaTotal ?? '0') || 0 };
                    if (advisorHasBonus) lender.advisor = { enabled: true, user_ids: selectedAdvisors, base_payout: parseFloat(d.advisorBase) || 0, bonus_pct: parseFloat(d.advisorBonus ?? '0') || 0, new_payout: parseFloat(d.advisorTotal ?? '0') || 0 };
                    calls.push(api.post('/payouts/reward-schemes/save', { category: bonusTopCategory || bonusCategory, subcategory: sub, lenders: [lender] }));
                });
            });
            if (calls.length === 0) { toast.error('No lenders/cards with a bonus entered to save.'); return; }
            await Promise.all(calls);
            toast.success(`${role === 'both' ? 'DSA & Advisor' : role === 'dsa' ? 'DSA' : 'Advisor'} bonuses saved for all lenders.`);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to save bonuses.');
        } finally {
            if (saveDsa) setIsSavingBonusDsa(false);
            if (saveAdvisor) setIsSavingBonusAdvisor(false);
        }
    };

    const handleSaveBonusRow = async (bankId: string, role: 'dsa' | 'advisor', subcategory?: string) => {
        if (role === 'dsa' && selectedDsas.length === 0) { toast.error('Select DSA partners first.'); return; }
        if (role === 'advisor' && selectedAdvisors.length === 0) { toast.error('Select Advisor partners first.'); return; }
        const dataKey = subcategory ? `${bankId}_${subcategory}` : bankId;
        const key = `${dataKey}_${role}`;
        setSavingBonusRow(prev => ({ ...prev, [key]: true }));
        try {
            const defaultBonusRow: typeof bonusTableData[string] = { dsaBase: '0', dsaBonus: null, dsaTotal: null, advisorBase: '0', advisorBonus: null, advisorTotal: null };
            const d = bonusTableData[dataKey] || bonusTableData[bankId] || defaultBonusRow;
            const lender = {
                bank_id: bankId,
                ...(role === 'dsa' && { dsa: { enabled: true, user_ids: selectedDsas, base_payout: parseFloat(d.dsaBase) || 0, bonus_pct: parseFloat(d.dsaBonus ?? '0') || 0, new_payout: parseFloat(d.dsaTotal ?? '0') || 0 } }),
                ...(role === 'advisor' && { advisor: { enabled: true, user_ids: selectedAdvisors, base_payout: parseFloat(d.advisorBase) || 0, bonus_pct: parseFloat(d.advisorBonus ?? '0') || 0, new_payout: parseFloat(d.advisorTotal ?? '0') || 0 } }),
            };
            await api.post('/payouts/reward-schemes/save', { category: bonusTopCategory || bonusCategory, subcategory: subcategory || bonusLoanType, lenders: [lender] });
            toast.success(`${role === 'dsa' ? 'DSA' : 'Advisor'} bonus saved for this lender.`);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to save.');
        } finally {
            setSavingBonusRow(prev => ({ ...prev, [key]: false }));
        }
    };




    const fetchRoiForLender = async (lenderId: string, subcategory: string = activeRewardSubcategory) => {
        const productName = subcategory;

        if (!productName) return;

        setFetchingRoi(prev => ({ ...prev, [lenderId]: true }));

        try {
            const rates = await api.get(`/banks/${lenderId}/product-rates`);

            if (Array.isArray(rates)) {
                const match = rates.find((r: any) => r.product_name === productName);

                if (match) {
                    const raccRate = match.racc_rate != null ? String(match.racc_rate) : '';
                    const minRate = match.min_rate != null ? String(match.min_rate) : '';

                    setLendersRewardsList(prev => prev.map(item =>
                        item.id === lenderId ? { ...item, interestRate: raccRate, minRate } : item
                    ));
                } else {
                    setLendersRewardsList(prev => prev.map(item =>
                        item.id === lenderId ? { ...item, interestRate: '', minRate: '' } : item
                    ));
                }
            }

        } catch (err) {
            console.error(`Failed to fetch ROI for lender ${lenderId}:`, err);
        } finally {
            setFetchingRoi(prev => ({ ...prev, [lenderId]: false }));
        }
    };

    // Re-fetch rates for all selected lenders when subcategory changes
    useEffect(() => {
        if (selectedLenders.length === 0) return;
        selectedLenders.forEach(id => fetchRoiForLender(id, activeRewardSubcategory));
    }, [activeRewardSubcategory]);

    const handleLenderRewardValueChange = (id: string, role: 'dsa' | 'advisor', field: 'base' | 'bonus' | 'interestRate', value: string) => {
        setLendersRewardsList(prev => prev.map(item => {
            if (item.id !== id) return item;
            
            let updateKey = '';
            if (field === 'interestRate') {
                updateKey = 'interestRate';
            } else {
                updateKey = role === 'dsa' 
                    ? (field === 'base' ? 'dsaBase' : 'dsaBonus')
                    : (field === 'base' ? 'advisorBase' : 'advisorBonus');
            }
            
            return {
                ...item,
                [updateKey]: value
            };
        }));
    };

    // Slab Modal State
    const [slabCategory, setSlabCategory] = useState<string>('loan');
    const [slabSubcategory, setSlabSubcategory] = useState<string>('');
    const [slabSelectedLenders, setSlabSelectedLenders] = useState<string[]>([]);
    const [slabTargetRole, setSlabTargetRole] = useState<'DSA' | 'Advisor' | 'Both'>('DSA');
    const [slabShowLenderDropdown, setSlabShowLenderDropdown] = useState(false);
    const slabLenderDropdownRef = useRef<HTMLDivElement>(null);

    const defaultSlabs = [
        { id: '1', slabName: 'Bronze', minAmount: '1L', maxAmount: '5L' },
        { id: '2', slabName: 'Silver', minAmount: '5L', maxAmount: '10L' },
        { id: '3', slabName: 'Gold',   minAmount: '10L', maxAmount: '20L' },
        { id: '4', slabName: 'Diamond', minAmount: '20L', maxAmount: 'Above' },
    ];
    // slabRows: per-slab config — name, range, and per-lender payout %
    // shape: { id, slabName, minAmount, maxAmount, payouts: Record<lenderId, string> }
    const [slabRows, setSlabRows] = useState<any[]>(defaultSlabs.map(s => ({ ...s, payouts: {} })));

    // Close slab lender dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (slabLenderDropdownRef.current && !slabLenderDropdownRef.current.contains(event.target as Node)) {
                setSlabShowLenderDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSlabRowChange = (slabId: string, field: 'slabName' | 'minAmount' | 'maxAmount', value: string) => {
        setSlabRows(prev => prev.map(r => r.id === slabId ? { ...r, [field]: value } : r));
    };

    const handleSlabPayoutChange = (slabId: string, lenderId: string, value: string) => {
        setSlabRows(prev => prev.map(r =>
            r.id === slabId ? { ...r, payouts: { ...r.payouts, [lenderId]: value } } : r
        ));
    };

    // Custom Interactive Calendar States
    const [showCalendarPicker, setShowCalendarPicker] = useState(false);
    const [calMonth, setCalMonth] = useState(6); // July (0-indexed is 6)
    const [calYear, setCalYear] = useState(2026);
    const [rangeStart, setRangeStart] = useState<Date | null>(null);
    const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
    const calendarRef = useRef<HTMLDivElement>(null);
    const lenderDropdownRef = useRef<HTMLDivElement>(null);
    const dsaDropdownRef = useRef<HTMLDivElement>(null);
    const advisorDropdownRef = useRef<HTMLDivElement>(null);

    // Close calendar click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setShowCalendarPicker(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Close lender dropdown click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (lenderDropdownRef.current && !lenderDropdownRef.current.contains(event.target as Node)) {
                setShowLenderDropdown(false);
            }
            if (dsaDropdownRef.current && !dsaDropdownRef.current.contains(event.target as Node)) {
                setShowDsaDropdown(false);
            }
            if (advisorDropdownRef.current && !advisorDropdownRef.current.contains(event.target as Node)) {
                setShowAdvisorDropdown(false);
            }
            if (earningDateFilterPopupRef.current && 
                !earningDateFilterPopupRef.current.contains(event.target as Node) && 
                (!earningDateFilterButtonRef.current || !earningDateFilterButtonRef.current.contains(event.target as Node)) &&
                (!earningDateFilterMobileButtonRef.current || !earningDateFilterMobileButtonRef.current.contains(event.target as Node))) {
                setShowEarningDateFilter(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const hasFetchedRewardListsRef = useRef(false);

    // Fetch Lenders, DSA, and Advisor lists from API on demand (Reward tab or Reward modal)
    useEffect(() => {
        if (activeTab !== 'reward' && !showAddRewardModal && !showSlabModal) return;
        if (hasFetchedRewardListsRef.current) return;
        hasFetchedRewardListsRef.current = true;

        const fetchRewardLists = async () => {
            try {
                const [banksData, dsaData, advisorData] = await Promise.all([
                    api.get('/banks'),
                    api.get('/users/by-role?roles=dsa'),
                    api.get('/users/by-role?roles=executive'),
                ]);

                if (Array.isArray(banksData)) {
                    setLendersRewardsList(banksData.map((b: any) => ({
                        id: String(b.id),
                        lenderName: b.name,
                        interestRate: '',
                        minRate: '',
                        dsaBase: '0',
                        dsaBonus: '0',
                        advisorBase: '0',
                        advisorBonus: '0',
                    })));

                    if (banksData.length > 0) {
                        try {
                            const rates = await api.get(`/banks/${banksData[0].id}/product-rates`);
                            if (Array.isArray(rates)) {
                                const names = rates.map((r: any) => r.product_name).filter(Boolean);
                                setSubcategoryOptions(names);
                                if (names.length > 0) setActiveRewardSubcategory(names[0]);
                            }
                        } catch (e) {
                            console.error('Failed to fetch product names:', e);
                        }
                    }
                }
                if (Array.isArray(dsaData)) {
                    setDsaList(dsaData.map((u: any) => ({ id: String(u.id), name: u.full_name || u.name })));
                }
                if (Array.isArray(advisorData)) {
                    setAdvisorList(advisorData.map((u: any) => ({ id: String(u.id), name: u.full_name || u.name })));
                }
            } catch (error) {
                console.error('Failed to fetch reward lists:', error);
                hasFetchedRewardListsRef.current = false;
            }
        };
        fetchRewardLists();
    }, [activeTab, showAddRewardModal, showSlabModal]);

    // Every filter the server applies, shared by the page, "select all" and refresh.
    const buildEarningParams = () => {
        const params = new URLSearchParams({ paginate: '1' });
        if (appliedEarningDateFrom) params.set('from_date', appliedEarningDateFrom);
        if (appliedEarningDateTo) params.set('to_date', appliedEarningDateTo);
        if (earningCaseTypeFilter) {
            const caseTypeApiValue = getCaseTypeApiValue(earningCaseTypeFilter);
            if (caseTypeApiValue) params.set('case_type', caseTypeApiValue);
        }
        if (earningCategory) {
            const categoryApiValue = getCategoryApiValue(earningCategory);
            if (categoryApiValue) params.set('category', categoryApiValue);
        }
        if (earningSubcategory) {
            const subcategoryApiValue = getSubcategoryApiValue(earningSubcategory);
            if (subcategoryApiValue) params.set('subcategory', subcategoryApiValue);
        }
        if (debouncedEarningSearch) params.set('search', debouncedEarningSearch);
        if (earningPartnerRoleFilter !== 'all') params.set('partner_role', earningPartnerRoleFilter);
        if (earningStatusFilter === 'pending') params.set('status', 'pending');
        if (earningStatusFilter === 'paid') params.set('status', 'approved');
        return params;
    };

    const fetchEarnings = async () => {
        if (activeTab !== 'earning') return;
        if (!isEarningFilterReady) {
            setEarnings([]);
            setEarningTotal(0);
            setLoadingEarnings(false);
            return;
        }

        const requestId = ++earningsRequestRef.current;
        setLoadingEarnings(true);
        setEarningsLoadFailed(false);
        try {
            const params = buildEarningParams();
            params.set('page', String(earningCurrentPage));
            params.set('limit', String(earningItemsPerPage));
            const response: any = await api.get(`/payouts/earnings?${params.toString()}`);
            // A slower, older request must not overwrite the page the user is now on.
            if (requestId !== earningsRequestRef.current) return;
            const list = Array.isArray(response?.data) ? response.data : [];
            const total = Number(response?.total) || 0;
            const lastPage = Math.max(Math.ceil(total / earningItemsPerPage), 1);
            setEarnings(list);
            setEarningTotal(total);
            // Deleting the last rows of the last page leaves the current page empty.
            if (list.length === 0 && earningCurrentPage > lastPage) setEarningCurrentPage(lastPage);
        } catch (error) {
            if (requestId !== earningsRequestRef.current) return;
            console.error('Error fetching earnings:', error);
            toast.error('Failed to load earnings.');
            setEarnings([]);
            setEarningTotal(0);
            setEarningsLoadFailed(true);
        } finally {
            if (requestId === earningsRequestRef.current) setLoadingEarnings(false);
        }
    };

    const toggleEarningSelection = (id: number) => {
        setSelectedEarningIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    };

    const handleDeleteEarnings = async () => {
        if (selectedEarningIds.length === 0) return;
        setDeletingEarnings(true);
        try {
            await api.post('/payouts/earnings/delete', { ids: selectedEarningIds });
            toast.success(`Deleted ${selectedEarningIds.length} earning record(s)`);
            setSelectedEarningIds([]);
            setShowDeleteEarningsConfirm(false);
            fetchEarnings();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to delete earnings.');
        } finally {
            setDeletingEarnings(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedEarningSearch(earningSearchTerm.trim()), 300);
        return () => clearTimeout(timer);
    }, [earningSearchTerm]);

    useEffect(() => {
        if (activeTab !== 'earning') return;
        // New filters start from page 1, and a selection made under the old
        // filters must not stay hidden and get deleted later.
        const filters = buildEarningParams().toString();
        if (filters !== lastEarningFiltersRef.current) {
            lastEarningFiltersRef.current = filters;
            setSelectedEarningIds([]);
            if (earningCurrentPage !== 1) {
                setEarningCurrentPage(1);
                return;
            }
        }
        fetchEarnings();
    }, [activeTab, earningCurrentPage, appliedEarningDateFrom, appliedEarningDateTo, earningCaseTypeFilter, earningCategory, earningSubcategory, isEarningFilterReady, debouncedEarningSearch, earningPartnerRoleFilter, earningStatusFilter]);

    const fetchWallet = async () => {
        if (!isPartnerWalletRole || activeTab !== 'earning') return;
        setLoadingWallet(true);
        try {
            const data: any = await api.get('/payouts/wallet');
            setWalletData(Array.isArray(data) ? data[0] : data);
        } catch (error) {
            setWalletData(null);
        } finally {
            setLoadingWallet(false);
        }
    };

    const fetchMyWithdrawals = async () => {
        if (!isPartnerWalletRole || (activeTab !== 'earning' && activeTab !== 'payout')) return;
        setLoadingMyWithdrawals(true);
        try {
            const data: any = await api.get('/payouts/withdrawals');
            setMyWithdrawals(Array.isArray(data) ? data : []);
        } catch (error) {
            setMyWithdrawals([]);
        } finally {
            setLoadingMyWithdrawals(false);
        }
    };

    useEffect(() => {
        if (activeTab !== 'earning' && activeTab !== 'payout') return;
        if (activeTab === 'earning' && isPartnerWalletRole) {
            fetchWallet();
        } else if (activeTab === 'payout') {
            fetchMyWithdrawals();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, isPartnerWalletRole]);

    const handleWithdraw = async () => {
        if (!isPartnerWalletRole) return;
        const available = walletData?.available_balance ?? 0;
        setWithdrawAmount(available > 0 ? String(available) : '');
        setWithdrawAmountError('');
        setShowEarningDateFilter(false);
        setShowWithdrawModal(true);
    };

    const handleConfirmWithdraw = async () => {
        if (!isPartnerWalletRole) return;
        const available = walletData?.available_balance ?? 0;
        const amt = parseFloat(withdrawAmount);
        if (isNaN(amt) || amt <= 0) {
            setWithdrawAmountError('Please enter a valid amount greater than zero.');
            return;
        }
        if (amt > available + 1e-9) {
            setWithdrawAmountError(`Amount cannot exceed available balance of ₹${available.toLocaleString('en-IN')}`);
            return;
        }
        setWithdrawing(true);
        setWithdrawAmountError('');
        try {
            await api.post('/payouts/wallet/withdraw', { amount: amt });
            toast.success('Withdrawal request raised successfully. The accountant will process it shortly.');
            setShowWithdrawModal(false);
            await Promise.all([fetchWallet(), fetchEarnings(), fetchMyWithdrawals()]);
        } catch (error: any) {
            const msg = error?.response?.data?.error || error?.message || 'Failed to raise withdrawal request';
            toast.error(msg);
        } finally {
            setWithdrawing(false);
        }
    };

    useEffect(() => {
        sessionStorage.setItem('earning_page', String(earningCurrentPage));
    }, [earningCurrentPage]);



    // Reset case type filter when subcategory changes
    useEffect(() => {
        setEarningCaseTypeFilter('');
    }, [earningSubcategory]);

    // Helper for calendar days calculation

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
        return new Date(year, month, 1).getDay();
    };

    // Handle day selection click
    const handleDayClick = (day: number) => {
        const clickedDate = new Date(calYear, calMonth, day);
        
        if (!rangeStart || (rangeStart && rangeEnd)) {
            setRangeStart(clickedDate);
            setRangeEnd(null);
        } else if (rangeStart && !rangeEnd) {
            if (clickedDate < rangeStart) {
                setRangeStart(clickedDate);
            } else {
                setRangeEnd(clickedDate);
            }
        }
    };

    const formatDateString = (date: Date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const handleApplyDateSelection = () => {
        if (!rangeStart) {
            toast.error("Please select at least a single date.");
            return;
        }

        if (rangeStart && !rangeEnd) {
            // Selected a single day
            setRewardDate(formatDateString(rangeStart));
        } else if (rangeStart && rangeEnd) {
            // Selected a date range
            setRewardDate(`${formatDateString(rangeStart)} to ${formatDateString(rangeEnd)}`);
        }
        setShowCalendarPicker(false);
    };

    const handleClearDateSelection = () => {
        setRangeStart(null);
        setRangeEnd(null);
        setRewardDate('');
    };

    // Fetch payouts from backend
    const fetchPayouts = async () => {
        setLoadingPayouts(true);
        try {
            const data = await api.get('/payouts');
            // Filter payouts matching the logged-in user if they are not admin
            let userPayouts = data || [];
            if (user && user.role !== 'admin' && user.role !== 'accountant') {
                userPayouts = userPayouts.filter((p: PayoutRecord) => p.user_id === user.id || p.dsa_id === user.id);
            }
            setPayouts(userPayouts);
        } catch (error) {
        } finally {
            setLoadingPayouts(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'payout') {
            fetchPayouts();
        }
    }, [user, activeTab]);
    // Handle Payout request submission
    const handleRequestPayout = async (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = parseFloat(requestAmount);
        
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error("Please enter a valid payout amount.");
            return;
        }
        
        if (amountNum > 94500) {
            toast.error("Payout amount cannot exceed available cleared balance (₹94,500).");
            return;
        }

        setSubmittingPayout(true);
        try {
            const generatedReqId = `REQ-${Math.floor(100000 + Math.random() * 900000)}`;
            const today = new Date().toISOString().split('T')[0];
            
            const newPayout: PayoutRecord = {
                payout_amount: amountNum,
                status: 'pending',
                txn_type: paymentMode,
                remarks: remarks || 'Self requested payout',
                credit_debit: 'debit',
                user_id: user?.id,
                dsa_id: user?.id, // set both to be compatible with left joins in backend query
                payment_date: today,
                account_number: accountNumber,
                ifsc_code: ifscCode,
                request_id: generatedReqId
            };

            await api.post('/payouts', newPayout);
            toast.success("Payout request submitted successfully for approval!");
            
            // Reset form fields
            setRequestAmount('');
            setRemarks('');
            
        } catch (error: any) {
toast.error(error.message || "Failed to submit payout request. Please try again.");
        } finally {
            setSubmittingPayout(false);
        }
    };

    // Admin approval click handlers
    const handleAdminApproveClick = (req: WithdrawalRequest) => {
        setSelectedRequest(req);
        setAdminPaidAmount(req.requestedAmount.toString());
        setAdminTdsAmount((req.requestedAmount * 0.1).toString()); // 10% TDS default
        setAdminTxnId(`TXN${Math.floor(100000000 + Math.random() * 900000000)}`);
        setAdminRemarks('Approved and disbursed.');
        setShowAdminApproveModal(true);
    };

    const handleAdminRejectClick = (req: WithdrawalRequest) => {
        setSelectedRequest(req);
        setAdminRemarks('Request rejected.');
        setShowAdminRejectModal(true);
    };

    const handleApproveConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRequest) return;

        const paid = parseFloat(adminPaidAmount);
        const tds = parseFloat(adminTdsAmount);

        if (isNaN(paid) || paid <= 0) {
            toast.error("Please enter a valid paid amount.");
            return;
        }

        setWithdrawalRequests(prev => prev.map(r => {
            if (r.id === selectedRequest.id) {
                return {
                    ...r,
                    status: 'approved',
                    paidAmount: paid,
                    tdsAmount: isNaN(tds) ? 0 : tds,
                    txnId: adminTxnId || 'N/A',
                    remarks: adminRemarks || 'Approved'
                };
            }
            return r;
        }));

        toast.success(`Withdrawal request ${selectedRequest.id} has been approved.`);
        setShowAdminApproveModal(false);
        setSelectedRequest(null);
    };

    const handleRejectConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRequest) return;

        setWithdrawalRequests(prev => prev.map(r => {
            if (r.id === selectedRequest.id) {
                return {
                    ...r,
                    status: 'rejected',
                    remarks: adminRemarks || 'Rejected by Admin'
                };
            }
            return r;
        }));

        toast.success(`Withdrawal request ${selectedRequest.id} has been rejected.`);
        setShowAdminRejectModal(false);
        setSelectedRequest(null);
    };

    const handleDownloadData = () => {
        // Filter requests based on current selections
        const filtered = withdrawalRequests.filter(req => {
            const matchesSearch = req.partnerName.toLowerCase().includes(adminSearchTerm.toLowerCase());
            const matchesRole = adminRoleFilter === 'all' || req.partnerRole === adminRoleFilter;
            const matchesStatus = adminStatusFilter === 'all' || req.status === adminStatusFilter;
            return matchesSearch && matchesRole && matchesStatus;
        });

        // Convert to CSV
        const headers = ["Request ID", "Date", "Partner Name", "Partner Role", "Requested Amount", "Wallet Balance", "Paid Amount", "TDS Amount", "Transaction ID", "Remarks", "Status"];
        const rows = filtered.map(req => [
            req.id,
            formatDisplayDate(req.date),
            req.partnerName,
            req.partnerRole,
            req.requestedAmount,
            req.walletBalance,
            req.paidAmount || 0,
            req.tdsAmount || 0,
            req.txnId || '',
            req.remarks || '',
            req.status
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `payout_requests_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV download started!");
    };

    const handleDownloadExcel = () => {
        try {
            const activeLenders = lendersRewardsList.filter(l => selectedLenders.includes(l.id));
            if (activeLenders.length === 0) {
                toast.error("No lender data to download. Please select one or more lenders.");
                return;
            }

            // Map data to rows
            const excelRows = activeLenders.map(lender => {
                const dsaBase = parseFloat(lender.dsaBase || '0');
                const dsaBonus = parseFloat(lender.dsaBonus || '0');
                const dsaTotal = dsaBase + dsaBonus;

                const advBase = parseFloat(lender.advisorBase || '0');
                const advBonus = parseFloat(lender.advisorBonus || '0');
                const advTotal = advBase + advBonus;

                return {
                    'Lender Bank Name': lender.lenderName,
                    'Category': activeRewardCategory.toUpperCase(),
                    'Subcategory': activeRewardSubcategory || 'N/A',
                    'Interest Rate (ROI %)': lender.interestRate,
                    'Minimum Rate (%)': lender.minRate || 'N/A',
                    'DSA Base Payout (%)': activeRewardDsa ? `${dsaBase.toFixed(2)}%` : 'Disabled',
                    'DSA Bonus Payout (%)': activeRewardDsa ? `${dsaBonus.toFixed(2)}%` : 'Disabled',
                    'DSA Total Payout (%)': activeRewardDsa ? `${dsaTotal.toFixed(2)}%` : 'Disabled',
                    'Advisor Base Payout (%)': activeRewardAdvisor ? `${advBase.toFixed(2)}%` : 'Disabled',
                    'Advisor Bonus Payout (%)': activeRewardAdvisor ? `${advBonus.toFixed(2)}%` : 'Disabled',
                    'Advisor Total Payout (%)': activeRewardAdvisor ? `${advTotal.toFixed(2)}%` : 'Disabled',
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(excelRows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Lender Payout Rates');

            // Save the file
            const fileName = `lender_payout_rates_${activeRewardCategory}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            toast.success("Excel sheet downloaded successfully!");
        } catch (error) {
toast.error("Failed to export data to Excel.");
        }
    };


    const handleApplyEarningDateFilter = () => {
        if (earningDateFilterDraftFrom && earningDateFilterDraftTo && earningDateFilterDraftFrom > earningDateFilterDraftTo) {
            toast.error('From date cannot be after To date.');
            return;
        }
        setAppliedEarningDateFrom(earningDateFilterDraftFrom);
        setAppliedEarningDateTo(earningDateFilterDraftTo);
        setShowEarningDateFilter(false);
    };

    const handleClearEarningDateFilter = () => {
        setEarningDateFilterDraftFrom('');
        setEarningDateFilterDraftTo('');
        setAppliedEarningDateFrom('');
        setAppliedEarningDateTo('');
        setShowEarningDateFilter(false);
    };

    const getEarningDateFilterLabel = () => {
        if (appliedEarningDateFrom && appliedEarningDateTo) {
            return `${formatDisplayDate(appliedEarningDateFrom)} → ${formatDisplayDate(appliedEarningDateTo)}`;
        }
        if (appliedEarningDateFrom) {
            return `From ${formatDisplayDate(appliedEarningDateFrom)}`;
        }
        if (appliedEarningDateTo) {
            return `To ${formatDisplayDate(appliedEarningDateTo)}`;
        }
        return 'Date';
    };

    const earningTotalPages = Math.ceil(earningTotal / earningItemsPerPage);

    const allEarningsSelected = earningTotal > 0 && selectedEarningIds.length >= earningTotal;

    const handleSelectAllEarnings = async () => {
        if (allEarningsSelected) {
            setSelectedEarningIds([]);
            return;
        }
        try {
            const params = buildEarningParams();
            params.set('ids_only', '1');
            const response: any = await api.get(`/payouts/earnings?${params.toString()}`);
            setSelectedEarningIds(Array.isArray(response?.ids) ? response.ids : []);
        } catch (error) {
            console.error('Error selecting earnings:', error);
            toast.error('Failed to select earnings.');
        }
    };

    const handleExportEarnings = async () => {
        try {
            const params = new URLSearchParams();
            if (appliedEarningDateFrom) params.set('from_date', appliedEarningDateFrom);
            if (appliedEarningDateTo) params.set('to_date', appliedEarningDateTo);
            if (earningCaseTypeFilter) {
                const caseTypeApiValue = getCaseTypeApiValue(earningCaseTypeFilter);
                if (caseTypeApiValue) params.set('case_type', caseTypeApiValue);
            }
            if (earningCategory) {
                const categoryApiValue = getCategoryApiValue(earningCategory);
                if (categoryApiValue) params.set('category', categoryApiValue);
            }
            if (earningSubcategory) {
                const subcategoryApiValue = getSubcategoryApiValue(earningSubcategory);
                if (subcategoryApiValue) params.set('subcategory', subcategoryApiValue);
            }
            if (earningStatusFilter === 'pending') params.set('status', 'Pending');
            if (earningStatusFilter === 'paid') params.set('status', 'Approved');
            const res = await fetch(`${API_URL}/payouts/earnings/export?${params.toString()}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const catPrefix = earningCategory === 'Credit Card' ? 'credit_card' : 'loan';
            a.download = `${catPrefix}_earnings_${new Date().toISOString().split('T')[0]}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Earnings export completed successfully!');
        } catch (err: any) {
            toast.error(err.message || 'Export failed.');
        }
    };

    const handleImportEarnings = async (file: File) => {
        setIsImportingEarnings(true);
        try {
            // Validate file
            if (!file) {
                throw new Error('No file selected');
            }

            const formData = new FormData();
            formData.append('file', file);
            
            const apiUrl = `${import.meta.env.VITE_API_URL || '/api'}/payouts/earnings/import-preview`;
            const authToken = localStorage.getItem('auth_token');
            
            // First, get the preview using raw fetch to handle FormData properly
            const previewRes = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken || ''}`
                },
                body: formData,
            });
            
            if (!previewRes.ok) {
                const errorData = await previewRes.json().catch(() => ({ error: 'Preview failed' }));
                throw new Error(errorData.error || `Preview failed with status ${previewRes.status}`);
            }
            
            const previewData = await previewRes.json();
            
            // Show preview modal with data
            setImportPreviewFile(file);
            setImportPreviewData(previewData.preview || []);
            setImportSummary(previewData.summary || {});
            setImportPreviewFilter('total');
            setShowImportPreview(true);
            
            const toUpdate = previewData.summary?.recordsToUpdate || 0;
            const failed = previewData.summary?.failedRecords || 0;
            if (failed > 0) {
                toast.success(`Preview loaded: ${toUpdate} to update, ${failed} failed (unauthorized changes)`);
            } else {
                toast.success(`Preview loaded: ${toUpdate} record${toUpdate !== 1 ? 's' : ''} to update`);
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to preview import. Check console for details.');
        } finally {
            setIsImportingEarnings(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!importPreviewFile) {
            return;
        }
        setIsProcessingImport(true);
        setImportErrors({});
        setImportSuccessfulIds([]);
        
        try {
            // Only pass IDs that are in the "To Update" category (valid allowed changes, no unauthorized)
            const eligibleIds = importPreviewData
                .filter((r: any) => r.category === 'update')
                .map((r: any) => r.id);

            const formData = new FormData();
            formData.append('file', importPreviewFile);
            formData.append('remarks', JSON.stringify(importRemarks));
            formData.append('eligible_ids', JSON.stringify(eligibleIds));
            
            const apiUrl = `${import.meta.env.VITE_API_URL || '/api'}/payouts/earnings/import`;
            const authToken = localStorage.getItem('auth_token');
            
            // Use raw fetch to handle FormData properly
            const importRes = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken || ''}`
                },
                body: formData,
            });
            
            if (!importRes.ok) {
                const errorData = await importRes.json().catch(() => ({ error: 'Import failed' }));
                throw new Error(errorData.error || `Import failed with status ${importRes.status}`);
            }
            
            const data = await importRes.json();
            
            // Check if there are failures among the eligible records
            if (data.failures && data.failures.length > 0) {
                const errorMap: Record<number | string, string> = {};
                data.failures.forEach((failure: any) => {
                    errorMap[failure.id] = failure.error;
                });
                setImportErrors(errorMap);
                
                // Mark successful records (only among eligible ones)
                const successIds = eligibleIds.filter((id: number | string) => !errorMap[id]);
                setImportSuccessfulIds(successIds);
                
                // Keep preview open and show error toast
                toast.error(`Import completed with errors: ${data.updated} records updated, ${data.failures.length} failed.`);
            } else {
                // All successful
                toast.success(`Successfully imported ${data.updated} records!`);
                setShowImportPreview(false);
                setImportPreviewData([]);
                setImportSummary(null);
                setImportPreviewFile(null);
                setImportErrors({});
                setImportSuccessfulIds([]);
                setImportRemarks({});
                
                // Refresh earnings data
                await fetchEarnings();
            }
        } catch (err: any) {
            toast.error(err.message || 'Import failed. Check console for details.');
        } finally {
            setIsProcessingImport(false);
        }
    };

    const openEarningEditModal = (row: any) => {
        if (!row || row.id == null) return;
        const status = String(row.status || '').trim().toLowerCase();
        if (['approved', 'paid'].includes(status)) {
            toast.error('Approved earnings cannot be edited.');
            return;
        }
        const isCC = isCreditCardEarning(row);
        const loanAmount = parseFloat(row.original_amount ?? row.loan_amount ?? row.amount ?? 0) || 0;
        setEditingEarningId(row.id);
        setEditingEarningRow(row);
        setEditingLoanAmount(isCC ? '' : String(loanAmount));
        setEditingNewBasePayout(isCC ? '' : (row.new_base_payout != null && row.new_base_payout !== '' ? String(row.new_base_payout) : ''));
        setEditingPayout(String(row.net_amount ?? row.amount ?? 0));
        setEditingRemark('');
        setEditingError('');
        setManualPayoutEdit(isCC);
    };

    const closeEarningEditModal = () => {
        setEditingEarningId(null);
        setEditingEarningRow(null);
        setEditingLoanAmount('');
        setEditingNewBasePayout('');
        setEditingPayout('');
        setEditingRemark('');
        setEditingError('');
        setManualPayoutEdit(false);
    };

    const handleEarningLoanAmountChange = (value: string) => {
        setEditingLoanAmount(value);
        setEditingError('');

        if (value === '' || Number.isNaN(parseFloat(value))) {
            setEditingPayout('');
            return;
        }

        if (manualPayoutEdit) {
            return;
        }

        const parsedLoanAmount = parseFloat(value) || 0;
        const parsedNbp = parseFloat(editingNewBasePayout || '0');
        if (editingNewBasePayout === '' || Number.isNaN(parsedNbp)) {
            setEditingPayout('');
            return;
        }

        const recalculatedPayout = (parsedLoanAmount * (parsedNbp / 100)).toFixed(2);
        setEditingPayout(recalculatedPayout);
    };

    const handleEarningNbpChange = (value: string) => {
        const parsedNbp = parseFloat(value);
        const loanAmount = parseFloat(editingLoanAmount || '0') || 0;
        setEditingNewBasePayout(value);
        setManualPayoutEdit(false);
        setEditingError('');

        if (value === '' || Number.isNaN(parsedNbp)) {
            setEditingPayout('');
            return;
        }

        const recalculatedPayout = (loanAmount * (parsedNbp / 100)).toFixed(2);
        setEditingPayout(recalculatedPayout);
    };

    const handleEarningPayoutChange = (value: string) => {
        setEditingPayout(value);
        setManualPayoutEdit(true);
        setEditingNewBasePayout('');
        setEditingError('');
    };

    const handleSaveEarningUpdate = async () => {
        if (!editingEarningId) return;
        if (!editingRemark.trim()) {
            setEditingError('Please enter a remark before saving the earning update.');
            return;
        }

        // Find the original earning record to track changes
        const originalEarning = earnings.find(e => e.id === editingEarningId);
        if (!originalEarning) {
            setEditingError('Original earning record not found.');
            return;
        }

        const status = String(originalEarning.status || '').trim().toLowerCase();
        if (['approved', 'paid'].includes(status)) {
            setEditingError('Approved earnings cannot be edited.');
            toast.error('Approved earnings cannot be edited.');
            closeEarningEditModal();
            return;
        }

        const isCC = isCreditCardEarning(originalEarning);

        let parsedLoanAmount = 0;
        if (!isCC) {
            parsedLoanAmount = parseFloat(editingLoanAmount);
            if (editingLoanAmount === '' || Number.isNaN(parsedLoanAmount)) {
                setEditingError('Please enter a valid Loan Amount.');
                return;
            }
        }

        const parsedPayout = parseFloat(editingPayout);
        if (Number.isNaN(parsedPayout)) {
            setEditingError('Please enter a valid Payout value.');
            return;
        }
        setSavingEdit(true);
        try {
            // Find the original earning record to track changes
            const originalEarning = earnings.find(e => e.id === editingEarningId);
            if (!originalEarning) {
                setEditingError('Original earning record not found.');
                setSavingEdit(false);
                return;
            }

            // Track changes
            const changes = [];
            
            if (!isCC && parsedLoanAmount !== (originalEarning.original_amount ?? 0)) {
                changes.push({
                    field_name: 'Loan Amount',
                    old_value: originalEarning.original_amount,
                    new_value: parsedLoanAmount,
                });
            }

            if (!isCC && !manualPayoutEdit) {
                const parsedNbp = parseFloat(editingNewBasePayout);
                if (editingNewBasePayout === '' || Number.isNaN(parsedNbp)) {
                    setEditingError('Please enter a valid NBP percentage.');
                    setSavingEdit(false);
                    return;
                }
                if (parsedNbp !== originalEarning.new_base_payout) {
                    changes.push({
                        field_name: 'Payout %',
                        old_value: originalEarning.new_base_payout,
                        new_value: parsedNbp,
                    });
                }
            }

            if (parsedPayout !== originalEarning.net_amount) {
                changes.push({
                    field_name: 'Payout Amount',
                    old_value: originalEarning.net_amount,
                    new_value: parsedPayout,
                });
            }

            // Build history entry
            const historyEntry = {
                timestamp: new Date().toISOString(),
                edited_by: user?.name || user?.id || 'Unknown',
                user_id: user?.id || null,
                user_remark: editingRemark.trim(),
                changes: changes,
            };

            // Parse existing history or create new array
            let history = [];
            if (originalEarning.remarks) {
                try {
                    const parsed = JSON.parse(originalEarning.remarks);
                    if (Array.isArray(parsed)) {
                        history = parsed;
                    } else if (typeof parsed === 'string' && parsed.length > 0) {
                        // Old format: plain text remarks, preserve as first entry
                        history = [
                            {
                                timestamp: null,
                                edited_by: 'System',
                                user_id: null,
                                user_remark: parsed,
                                changes: [],
                            },
                        ];
                    }
                } catch (e) {
                    // If remarks is plain text, preserve it as first entry
                    if (originalEarning.remarks && originalEarning.remarks.trim().length > 0) {
                        history = [
                            {
                                timestamp: null,
                                edited_by: 'System',
                                user_id: null,
                                user_remark: originalEarning.remarks,
                                changes: [],
                            },
                        ];
                    }
                }
            }

            // Append new history entry
            history.push(historyEntry);

            const payload: any = {
                net_amount: parsedPayout,
                remarks: JSON.stringify(history),
            };

            if (!isCC) {
                payload.original_amount = parsedLoanAmount;
                if (!manualPayoutEdit) {
                    const parsedNbp = parseFloat(editingNewBasePayout);
                    if (editingNewBasePayout === '' || Number.isNaN(parsedNbp)) {
                        setEditingError('Please enter a valid NBP percentage.');
                        setSavingEdit(false);
                        return;
                    }
                    payload.new_base_payout = parsedNbp;
                } else {
                    payload.new_base_payout = null;
                }
            } else {
                payload.new_base_payout = originalEarning.new_base_payout || originalEarning.base_payout || 0;
            }

            const res = await api.patch(`/payouts/earnings/${editingEarningId}`, payload);
            const updated = res.data || res;
            setEarnings(prev => prev.map(e => (e.id === updated.id ? updated : e)));
            fetchEarnings();
            toast.success('Earning updated successfully.');
            closeEarningEditModal();
        } catch (err: any) {
            console.error('Failed to update earning:', err);
            setEditingError(err?.response?.data?.error || err?.message || 'Failed to save update.');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleApproveEarning = async (earningId: number) => {
        if (!earningId) return;
        if (editingEarningId === earningId) {
            closeEarningEditModal();
        }
        try {
            setApprovingIds(prev => [...prev, earningId]);
            const res = await api.patch(`/payouts/earnings/${earningId}`, { status: 'approved' });
            const updated = res.data || res;
            setEarnings(prev => prev.map(e => (e.id === updated.id ? updated : e)));
            fetchEarnings();
            toast.success('Earning approved successfully.');
        } catch (err: any) {
            console.error('Failed to approve earning:', err);
            toast.error('Failed to approve earning');
        } finally {
            setApprovingIds(prev => prev.filter(id => id !== earningId));
        }
    };



    const handleSaveRewardConfig = async () => {

        if (selectedLenders.length === 0) {

            toast.error("Please select at least one lender.");

            return;

        }

        if (!activeRewardDsa && !activeRewardAdvisor) {

            toast.error("Please select at least one DSA or Advisor.");

            return;

        }

        setIsSaving(true);

        try {

            const activeLenders = lendersRewardsList.filter(l => selectedLenders.includes(l.id));

            const lendersPayload = activeLenders.map(lender => ({

                bank_id: lender.id,

                ...(activeRewardDsa && {

                    dsa: {

                        enabled: true,

                        user_ids: selectedDsas,

                        base_payout: parseFloat(lender.dsaBase) || 0,

                        bonus_pct: parseFloat(lender.dsaBonus) || 0,

                        new_payout: (parseFloat(lender.dsaBase) || 0) + (parseFloat(lender.dsaBonus) || 0),

                    }

                }),

                ...(activeRewardAdvisor && {

                    advisor: {

                        enabled: true,

                        user_ids: selectedAdvisors,

                        base_payout: parseFloat(lender.advisorBase) || 0,

                        bonus_pct: parseFloat(lender.advisorBonus) || 0,

                        new_payout: (parseFloat(lender.advisorBase) || 0) + (parseFloat(lender.advisorBonus) || 0),

                    }

                }),

                racc_rate: parseFloat(lender.interestRate) || 0,

                min_rate: parseFloat(lender.minRate) || 0,

            }));

            await api.post('/payouts/reward-schemes/save', {

                category: activeRewardCategory,

                subcategory: activeRewardSubcategory || '',

                lenders: lendersPayload,

            });

            toast.success("Reward configuration saved successfully.");

        } catch (err: any) {

            toast.error(err?.response?.data?.error || "Failed to save reward configuration.");

        } finally {

            setIsSaving(false);

        }

    };


    const bankProductsConfig: Record<string, Record<string, { name: string; minRate: number; baseRacc: number }>> = {
        au: {
            new_car: { name: "New Car Purchase", minRate: 8.5, baseRacc: 12 },
            used_car: { name: "Used Car Purchase", minRate: 12, baseRacc: 16 },
            refinance: { name: "Used Car Refinance Up", minRate: 16, baseRacc: 18 },
            topup: { name: "Used Car BT/Top Up", minRate: 8.5, baseRacc: 12 }
        },
        axis: {
            new_car: { name: "New Car Purchase", minRate: 8, baseRacc: 10 },
            used_car: { name: "Used Car Purchase", minRate: 11, baseRacc: 14 },
            refinance: { name: "Used Car Refinance Up", minRate: 15.5, baseRacc: 16 },
            topup: { name: "Used Car BT/Top Up", minRate: 15.5, baseRacc: 16 }
        },
        default: {
            new_car: { name: "New Car Purchase", minRate: 8.5, baseRacc: 16 },
            used_car: { name: "Used Car Purchase", minRate: 12, baseRacc: 16 },
            refinance: { name: "Used Car Refinance Up", minRate: 16, baseRacc: 18 },
            topup: { name: "Used Car BT/Top Up", minRate: 8.5, baseRacc: 16 }
        }
    };

    // Keep RACC rate in sync with bank/product selection on change
    useEffect(() => {
        const bankConfig = bankProductsConfig[calcBank] || bankProductsConfig.default;
        const prodConfig = bankConfig[calcProduct] || bankConfig.new_car;
        setCalcRaccRate(prodConfig.baseRacc);
    }, [calcBank, calcProduct]);

    // Calculate payout
    const handleCalculatePayout = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const amt = parseFloat(calcLoanAmount); 
        if (isNaN(amt) || amt <= 0) {
            setCalcResult(null);
            return;
        }
        const bankConfig = bankProductsConfig[calcBank] || bankProductsConfig.default;
        const prodConfig = bankConfig[calcProduct] || bankConfig.new_car;
        const baseRate = prodConfig.baseRacc;
        const racc = calcRaccRate;
        const tenure = calcTenure;

        // Calculate RACC cut: for every 0.25% step down from baseRate, margin (starting at 4%) is cut by 0.25%
        let raccCut = 0;
        if (racc < baseRate) {
            raccCut = Math.ceil(parseFloat((baseRate - racc).toFixed(4)) / 0.25) * 0.25;
        }

        const margin = Math.max(0, 4 - raccCut);
        const effectiveRate = margin * (tenure / 36);
        const commissionAmount = (amt * effectiveRate) / 100;

        setCalcResult({
            effectiveRate,
            commissionAmount,
            baseRate,
            minRate: prodConfig.minRate,
            racc,
            tenure,
            amount: amt,
            productName: prodConfig.name
        });
    };

    // Calculate instantly on inputs change
    useEffect(() => {
        handleCalculatePayout();
    }, [calcBank, calcProduct, calcLoanAmount, calcRaccRate, calcTenure]);

    // Handle reward form submission (save/add/edit)
    const handleSaveDummyReward = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!rewardLenderName) {
            toast.error("Please select a lender bank manually.");
            return;
        }
        
        if (editingRewardId) {
            // Update existing reward scheme in the list
            setRewardsList(prev => prev.map(item => {
                if (item.id === editingRewardId) {
                    return {
                        id: item.id,
                        title: rewardTitle,
                        date: rewardDate,
                        category: rewardCategory,
                        subCategory: rewardCategory === 'Used Car Loan' ? rewardSubCategory : undefined,
                        lenderName: rewardLenderName,
                        targetRole: rewardTargetRole,
                        targetUser: rewardTargetUser
                    };
                }
                return item;
            }));
            toast.success(`Reward Scheme "${rewardTitle}" updated successfully!`);
        } else {
            // Add new reward scheme to the list
            const newReward: RewardItem = {
                id: `RW-${Math.floor(103 + Math.random() * 900)}`,
                title: rewardTitle,
                date: rewardDate,
                category: rewardCategory,
                subCategory: rewardCategory === 'Used Car Loan' ? rewardSubCategory : undefined,
                lenderName: rewardLenderName,
                targetRole: rewardTargetRole,
                targetUser: rewardTargetUser
            };
            setRewardsList(prev => [newReward, ...prev]);
            toast.success(`Reward Scheme "${rewardTitle}" added successfully!`);
        }
        
        // Reset state & close modal
        handleCloseRewardModal();
    };

    // Trigger Edit Mode for a reward scheme
    const handleEditReward = (reward: RewardItem) => {
        setEditingRewardId(reward.id);
        setRewardTitle(reward.title);
        setRewardDate(reward.date);
        
        // Parse date for range highlight if edit has range format
        if (reward.date.includes(" to ")) {
            const parts = reward.date.split(" to ");
            const s = new Date(parts[0]);
            const e = new Date(parts[1]);
            setRangeStart(isNaN(s.getTime()) ? null : s);
            setRangeEnd(isNaN(e.getTime()) ? null : e);
            if (!isNaN(s.getTime())) {
                setCalMonth(s.getMonth());
                setCalYear(s.getFullYear());
            }
        } else {
            const s = new Date(reward.date);
            setRangeStart(isNaN(s.getTime()) ? null : s);
            setRangeEnd(null);
            if (!isNaN(s.getTime())) {
                setCalMonth(s.getMonth());
                setCalYear(s.getFullYear());
            }
        }

        setRewardCategory(reward.category);
        setRewardSubCategory(reward.subCategory || 'Purchase');
        setRewardLenderName(reward.lenderName || 'All Lenders');
        setRewardTargetRole(reward.targetRole);
        setRewardTargetUser(reward.targetUser);
        setShowAddRewardModal(true);
    };

    const handleCloseRewardModal = () => {
        setEditingRewardId(null);
        setRewardTitle('');
        setRewardDate('');
        setRewardCategory('Credit card');
        setRewardSubCategory('Purchase');
        setRewardLenderName('All Lenders');
        setRewardTargetRole('DSA');
        setRewardTargetUser('All');
        setRangeStart(null);
        setRangeEnd(null);
        setShowAddRewardModal(false);
    };

    // Render Calendar cells helper
    const renderCalendarDays = () => {
        const totalDays = getDaysInMonth(calMonth, calYear);
        const startDayOfWeek = getFirstDayOfMonth(calMonth, calYear);
        const dayCells = [];

        // Month Names
        const monthNames = [
            "January", "February", "March", "April", "May", "June", 
            "July", "August", "September", "October", "November", "December"
        ];

        // Empty cells for alignment before month start day
        for (let i = 0; i < startDayOfWeek; i++) {
            dayCells.push(<div key={`empty-${i}`} className="h-7 w-7"></div>);
        }

        for (let day = 1; day <= totalDays; day++) {
            const currentDate = new Date(calYear, calMonth, day);
            const isStart = rangeStart && formatDateString(currentDate) === formatDateString(rangeStart);
            const isEnd = rangeEnd && formatDateString(currentDate) === formatDateString(rangeEnd);
            const inRange = rangeStart && rangeEnd && currentDate > rangeStart && currentDate < rangeEnd;
            
            let cellStyle = "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors";
            
            if (isStart || isEnd) {
                cellStyle = "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary text-white cursor-pointer shadow-sm";
            } else if (inRange) {
                cellStyle = "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold bg-primary/20 text-primary cursor-pointer";
            }

            dayCells.push(
                <button
                    key={`day-${day}`}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={cellStyle}
                >
                    {day}
                </button>
            );
        }
        return dayCells;
    };

    const handlePrevMonth = () => {
        if (calMonth === 0) {
            setCalMonth(11);
            setCalYear(calYear - 1);
        } else {
            setCalMonth(calMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (calMonth === 11) {
            setCalMonth(0);
            setCalYear(calYear + 1);
        } else {
            setCalMonth(calMonth + 1);
        }
    };

    const monthNames = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];

    const filteredRequests = withdrawalRequests.filter(req => {
        const matchesSearch = req.partnerName.toLowerCase().includes(adminSearchTerm.toLowerCase());
        const matchesRole = adminRoleFilter === 'all' || req.partnerRole === adminRoleFilter;
        const matchesStatus = adminStatusFilter === 'all' || req.status === adminStatusFilter;
        return matchesSearch && matchesRole && matchesStatus;
    });

    const userRole = (user?.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole === 'accountant';
    const isDsa = userRole === 'dsa' || userRole === 'dsa_partner';
    const canAccessPayouts = isAdmin || isDsa || isIndependentAdvisor;

    if (!canAccessPayouts) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500">
                    <XCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Access Restricted</h3>
                <p className="text-xs text-gray-500 max-w-sm">
                    Payouts and Earnings access is only available for DSA, Admin, and Independent Advisors.
                </p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in pb-16 min-h-screen relative isolate overflow-x-clip">
            {/* Flutter ambient glow: rotated blurred peach -> lavender -> mint blob (mobile / tablet only) */}
            <div
                aria-hidden="true"
                className="lg:hidden pointer-events-none absolute -z-10 left-[-13px] top-[288px] w-[472px] h-[413px] rotate-45 rounded-tl-[20px] rounded-tr-[94px] rounded-br-[20px] rounded-bl-[20px] blur-[100px] dark:opacity-20"
                style={{ background: 'linear-gradient(135deg, #FFD7C2 0%, #DBE2FF 50%, #D2FFE5 100%)' }}
            />
            {/* Desktop Top Navigation & Header Row (Default window view) */}
            {user?.role !== 'accountant' && (
                <div className="hidden lg:flex flex-col gap-3 mb-4">
                    {/* Row 1: Top Navigation Tabs matching original desktop design */}
                    <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-2.5 border border-gray-200/50 dark:border-slate-800/80 shadow-sm">
                        <button
                            onClick={() => setActiveTab('earning')}
                            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 active:scale-[0.98] text-center ${
                                activeTab === 'earning'
                                    ? 'text-white shadow-md border border-transparent'
                                    : 'bg-white text-gray-700 border border-gray-200/60 hover:bg-gray-50 hover:text-gray-900 shadow-sm'
                            }`}
                            style={activeTab === 'earning' ? { backgroundColor: 'hsl(215 55% 28%)' } : {}}
                        >
                            Earning
                        </button>

                        <button
                            onClick={() => setActiveTab('reward')} 
                            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 active:scale-[0.98] text-center ${
                                activeTab === 'reward'
                                    ? 'text-white shadow-md border border-transparent'
                                    : 'bg-white text-gray-700 border border-gray-200/60 hover:bg-gray-50 hover:text-gray-900 shadow-sm'
                            }`}
                            style={activeTab === 'reward' ? { backgroundColor: 'hsl(215 55% 28%)' } : {}}
                        >
                            Reward
                        </button>

                        <button
                            onClick={() => setActiveTab('payout')}
                            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 active:scale-[0.98] text-center ${
                                activeTab === 'payout'
                                    ? 'text-white shadow-md border border-transparent'
                                    : 'bg-white text-gray-700 border border-gray-200/60 hover:bg-gray-50 hover:text-gray-900 shadow-sm'
                            }`}
                            style={activeTab === 'payout' ? { backgroundColor: 'hsl(215 55% 28%)' } : {}}
                        >
                            Payout
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile / Tablet Top Navigation & Header Row (Flutter styled) */}
            <div className="lg:hidden space-y-1.5 mb-1 sm:mb-3">
                {/* Shaded Top Bar flush to the top edge with taller height */}
                <div className="relative flex items-center justify-between gap-2 bg-gradient-to-br from-[#DBE2FF] via-[#E8EDFF] to-[#FFFFFF] dark:from-slate-900 dark:via-blue-950/40 dark:to-slate-900 backdrop-blur-md rounded-b-2xl border-b border-blue-200/60 dark:border-blue-900/40 shadow-sm px-4 pt-5 pb-4 min-h-[58px]">
                    {/* Left: Back button */}
                    <div className="flex items-center gap-2 z-10">
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800 text-[#2563EB] dark:text-blue-400 flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm border border-blue-100 dark:border-slate-700"
                            title="Back"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Center: Title Payouts */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                            Payouts
                        </h1>
                    </div>

                    {/* Right side: Funnel Filter button (Calc / Slab live in the row below so they never overlap the title) */}
                    <div className="flex items-center gap-1.5 z-10">
                        {/* Funnel Filter circular button matching Flutter */}
                        <button
                            type="button"
                            onClick={() => setShowFilterModal(true)}
                            className="relative w-8 h-8 rounded-full bg-[#7C8FE4] hover:bg-[#6A7ED4] text-white flex items-center justify-center shadow-md shadow-indigo-300/30 active:scale-95 transition-all shrink-0"
                            title="Filter Payouts"
                        >
                            <Filter className="w-3.5 h-3.5 fill-white" />
                            {activeTab === 'reward' && (basePayoutCategory || basePayoutTopCategory || bonusCategory) && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-[8px] font-extrabold text-white flex items-center justify-center border-2 border-white dark:border-slate-900 shadow">
                                    1
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Flutter-style Capsule Tab Bar */}
                {user?.role !== 'accountant' && (
                <div className="flex items-center justify-center gap-2 w-full pt-1.5 pb-1 px-3">
                    <button
                        onClick={() => setActiveTab('earning')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 active:scale-[0.98] ${
                            activeTab === 'earning'
                                ? 'bg-gradient-to-b from-[#EFF6FF] to-[#DBEAFE] border-[1.4px] border-[#2563EB] text-[#1D4ED8] shadow-sm'
                                : 'text-[#64748B] dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white bg-transparent'
                        }`}
                    >
                        {activeTab === 'earning' && <span className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8]" />}
                        Earnings
                    </button>

                    <button
                        onClick={() => setActiveTab('reward')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 active:scale-[0.98] ${
                            activeTab === 'reward'
                                ? 'bg-gradient-to-b from-[#EEF2FF] to-[#E0E7FF] border-[1.4px] border-[#6366F1] text-[#4F46E5] shadow-sm'
                                : 'text-[#64748B] dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white bg-transparent'
                        }`}
                    >
                        {activeTab === 'reward' && <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />}
                        Rewards
                    </button>

                    <button
                        onClick={() => setActiveTab('payout')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 active:scale-[0.98] ${
                            activeTab === 'payout'
                                ? 'bg-gradient-to-b from-[#FFF7ED] to-[#FFEDD5] border-[1.4px] border-[#EA580C] text-[#EA580C] shadow-sm'
                                : 'text-[#64748B] dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white bg-transparent'
                        }`}
                    >
                        {activeTab === 'payout' && <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />}
                        Payout
                    </button>
                </div>
                )}
            </div>

            {/* Content Panel below */}
            <div className="px-2.5 sm:px-0">
                <div className="bg-transparent dark:bg-transparent lg:bg-white/80 lg:dark:bg-slate-900/60 lg:backdrop-blur-md rounded-2xl px-1 sm:px-5 py-0 sm:py-5 border border-transparent lg:border-gray-200/50 lg:dark:border-slate-800/80 shadow-none lg:shadow-md min-h-[400px]">
                
                {/* ================================= REWARD TAB ================================= */}
                {activeTab === 'reward' && (
                    <div className="space-y-2 sm:space-y-4 animate-fade-in text-xs">
                        {user?.role !== 'admin' && !isPartnerPayoutRole && (
                            <div className="w-full py-16 text-center text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl text-xs">
                                Payout configuration is only available to administrators.
                            </div>
                        )}

                        {(user?.role === 'admin' || user?.role === 'accountant') && (
                            <>
                                {/* Desktop Default Header Toolbar (Hidden on mobile/tablet) */}
                                <div className="hidden lg:flex flex-wrap items-end gap-3 pb-5 border-b border-gray-100 dark:border-slate-800">
                                    {/* Payout Name Select */}
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider pl-0.5">Payout Name</span>
                                        <select
                                            value={activePayoutType}
                                            onChange={(e) => {
                                                setActivePayoutType(e.target.value as 'base_payout' | 'bonus');
                                                setRewardSearchTerm('');
                                                if (e.target.value === 'bonus') {
                                                    setBonusTopCategory('');
                                                    setBonusLoanType('');
                                                    setBonusCategory('');
                                                    setBonusLenders([]);
                                                    setBonusTableData({});
                                                    setSelectedDsas([]);
                                                    setSelectedAdvisors([]);
                                                }
                                            }}
                                            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold w-36 shadow-sm"
                                        >
                                            <option value="base_payout">Base Payout</option>
                                            <option value="bonus">Bonus</option>
                                        </select>
                                    </div>

                                    {/* Bonus inline fields — Category, Subcategory, Target Partners */}
                                    {activePayoutType === 'bonus' && (
                                        <>
                                            {/* Category */}
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider pl-0.5">Category</span>
                                                <select
                                                    value={bonusTopCategory}
                                                    onChange={(e) => {
                                                        const cat = e.target.value;
                                                        setBonusTopCategory(cat);
                                                        setBonusLoanType('');
                                                        setBonusCategory(cat === 'loan' ? '' : cat);
                                                        setBonusLenders([]);
                                                        setBonusTableData({});
                                                    }}
                                                    className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold w-40 shadow-sm"
                                                >
                                                    <option value="">Select Category</option>
                                                    <option value="loan">Loan</option>
                                                    
                                                </select>
                                            </div>

                                            {/* Subcategory — only when Loan is selected */}
                                            {bonusTopCategory === 'loan' && (
                                                <div className="flex flex-col gap-1.5 animate-fade-in">
                                                    <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider pl-0.5">Sub-category</span>
                                                    <select
                                                        value={bonusLoanType}
                                                        onChange={(e) => {
                                                            setBonusLoanType(e.target.value);
                                                            setBonusCategory(e.target.value);
                                                            setBonusLenders([]);
                                                            setBonusTableData({});
                                                        }}
                                                        className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold w-48 shadow-sm"
                                                    >
                                                        <option value="">Select Subcategory</option>
                                                        <option value="new_car_loan">New Car Loan</option>
                                                        <option value="used_car_loan">Used Car Loan</option>
                                                        <option value="personal_loan">Personal Loan</option>
                                                        <option value="business_loan">Business Loan</option>
                                                        <option value="home_loan">Home Loan</option>
                                                        <option value="loan_against_property">Loan Against Property</option>
                                                    </select>
                                                </div>
                                            )}

                                            {/* Target Partners — only after category is selected */}
                                            {bonusCategory && (
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider pl-0.5">Target Partners</span>
                                                    <div className="flex items-center gap-2">
                                                        {/* DSA Dropdown */}
                                                        <div className="relative" ref={dsaDropdownRef}>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setShowDsaDropdown(!showDsaDropdown); setShowAdvisorDropdown(false); }}
                                                                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-bold w-44 shadow-sm text-left transition-all ${
                                                                    activeRewardDsa
                                                                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                                                                        : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-800'
                                                                }`}
                                                            >
                                                                <span className="truncate">
                                                                    {selectedDsas.length === 0 ? 'DSA Partner' : selectedDsas.length === dsaList.length ? 'All DSAs Selected' : `${selectedDsas.length} DSA Selected`}
                                                                </span>
                                                                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transform transition-transform ${showDsaDropdown ? 'rotate-90' : ''}`} />
                                                            </button>
                                                            {showDsaDropdown && (
                                                                <div className="absolute left-0 top-full mt-1.5 z-[210] bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl p-3 w-56 animate-fade-in space-y-2">
                                                                    <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-slate-900">
                                                                        <button type="button" onClick={() => { const next = selectedDsas.length === dsaList.length ? [] : dsaList.map(d => d.id); setSelectedDsas(next); setActiveRewardDsa(next.length > 0); }} className="text-[10px] font-extrabold text-primary hover:underline cursor-pointer">
                                                                            {selectedDsas.length === dsaList.length ? 'Deselect All' : 'Select All'}
                                                                        </button>
                                                                        <span className="text-[10px] font-bold text-gray-400">{selectedDsas.length}/{dsaList.length}</span>
                                                                    </div>
                                                                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                                                                        {dsaList.map((dsa) => {
                                                                            const isChecked = selectedDsas.includes(dsa.id);
                                                                            return (
                                                                                <label key={dsa.id} className="flex items-center gap-2 px-1 py-0.5 hover:bg-gray-50 dark:hover:bg-slate-900 rounded cursor-pointer select-none">
                                                                                    <input type="checkbox" checked={isChecked} onChange={() => { const next = isChecked ? selectedDsas.filter(id => id !== dsa.id) : [...selectedDsas, dsa.id]; setSelectedDsas(next); setActiveRewardDsa(next.length > 0); }} className="w-3.5 h-3.5 rounded border-gray-300 dark:border-slate-700 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer" />
                                                                                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">{dsa.name}</span>
                                                                                </label>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                              )}
                                                        </div>

                                                        {/* Advisor Dropdown */}
                                                        <div className="relative" ref={advisorDropdownRef}>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setShowAdvisorDropdown(!showAdvisorDropdown); setShowDsaDropdown(false); }}
                                                                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-bold w-44 shadow-sm text-left transition-all ${
                                                                    activeRewardAdvisor
                                                                        ? 'bg-blue-50 dark:bg-blue-950/20 text-[#00b2ff] border-blue-200 dark:border-blue-800/60'
                                                                        : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-800'
                                                                }`}
                                                            >
                                                                <span className="truncate">
                                                                    {selectedAdvisors.length === 0 ? 'Advisor Partner' : selectedAdvisors.length === advisorList.length ? 'All Advisors Selected' : `${selectedAdvisors.length} Advisor Selected`}
                                                                </span>
                                                                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transform transition-transform ${showAdvisorDropdown ? 'rotate-90' : ''}`} />
                                                            </button>
                                                            {showAdvisorDropdown && (
                                                                <div className="absolute left-0 top-full mt-1.5 z-[210] bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl p-3 w-56 animate-fade-in space-y-2">
                                                                    <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-slate-900">
                                                                        <button type="button" onClick={() => { const next = selectedAdvisors.length === advisorList.length ? [] : advisorList.map(a => a.id); setSelectedAdvisors(next); setActiveRewardAdvisor(next.length > 0); }} className="text-[10px] font-extrabold text-primary hover:underline cursor-pointer">
                                                                            {selectedAdvisors.length === advisorList.length ? 'Deselect All' : 'Select All'}
                                                                        </button>
                                                                        <span className="text-[10px] font-bold text-gray-400">{selectedAdvisors.length}/{advisorList.length}</span>
                                                                    </div>
                                                                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                                                                        {advisorList.map((advisor) => {
                                                                            const isChecked = selectedAdvisors.includes(advisor.id);
                                                                            return (
                                                                                <label key={advisor.id} className="flex items-center gap-2 px-1 py-0.5 hover:bg-gray-50 dark:hover:bg-slate-900 rounded cursor-pointer select-none">
                                                                                    <input type="checkbox" checked={isChecked} onChange={() => { const next = isChecked ? selectedAdvisors.filter(id => id !== advisor.id) : [...selectedAdvisors, advisor.id]; setSelectedAdvisors(next); setActiveRewardAdvisor(next.length > 0); }} className="w-3.5 h-3.5 rounded border-gray-300 dark:border-slate-700 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer" />
                                                                                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">{advisor.name}</span>
                                                                                </label>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                              )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Bonus Search, Save buttons, and Import/Export */}
                                            <div className="flex items-end gap-2 ml-auto">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        value={rewardSearchTerm}
                                                        onChange={e => setRewardSearchTerm(e.target.value)}
                                                        placeholder="Search lender..."
                                                        className="pl-8 pr-6 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 w-40 shadow-sm"
                                                    />
                                                    {rewardSearchTerm && (
                                                        <button type="button" onClick={() => setRewardSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>

                                                {bonusCategory && bonusLenders.length > 0 && !loadingBonusData && (activeRewardDsa || activeRewardAdvisor) && (
                                                    <div className="flex items-center gap-2">
                                                        {activeRewardDsa && !activeRewardAdvisor && (
                                                            <button type="button" onClick={() => handleSaveAllForRole('dsa')} disabled={isSavingBonusDsa} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs disabled:opacity-60 transition-all active:scale-95 shadow-sm" style={{ backgroundColor: 'hsl(215 55% 28%)' }}>
                                                                <Save className="w-3 h-3" />{isSavingBonusDsa ? 'Saving...' : 'Save DSA'}
                                                            </button>
                                                        )}
                                                        {activeRewardAdvisor && !activeRewardDsa && (
                                                            <button type="button" onClick={() => handleSaveAllForRole('advisor')} disabled={isSavingBonusAdvisor} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs disabled:opacity-60 transition-all active:scale-95 shadow-sm" style={{ backgroundColor: 'hsl(215 55% 28%)' }}>
                                                                <Save className="w-3 h-3" />{isSavingBonusAdvisor ? 'Saving...' : 'Save Advisor'}
                                                            </button>
                                                        )}
                                                        {activeRewardDsa && activeRewardAdvisor && (
                                                            <button type="button" onClick={() => handleSaveAllForRole('both')} disabled={isSavingBonusDsa || isSavingBonusAdvisor} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs disabled:opacity-60 transition-all active:scale-95 shadow-sm" style={{ backgroundColor: 'hsl(215 55% 28%)' }}>
                                                                <Save className="w-3 h-3" />{(isSavingBonusDsa || isSavingBonusAdvisor) ? 'Saving...' : 'Save Both'}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Combined Import/Export icon menu */}
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowBaseIOMenu(prev => !prev)}
                                                        title="Import / Export"
                                                        className="flex items-center justify-center w-8 h-8 rounded-xl border border-gray-200/60 hover:bg-gray-50 bg-white text-gray-700 transition-all active:scale-95 shadow-sm"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                    {showBaseIOMenu && (
                                                        <div className="absolute right-0 top-full mt-1.5 z-[220] w-36 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl py-1 animate-in fade-in slide-in-from-top-1 duration-100">
                                                            <button
                                                                type="button"
                                                                onClick={() => { setShowBaseIOMenu(false); handleExport('bonus'); }}
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg transition-colors"
                                                            >
                                                                <Download className="w-3.5 h-3.5 text-emerald-500" />Export Excel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={isImportingBonus}
                                                                onClick={() => { setShowBaseIOMenu(false); bonusImportRef.current?.click(); }}
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg transition-colors disabled:opacity-50"
                                                            >
                                                                <Upload className="w-3.5 h-3.5 text-blue-500" />{isImportingBonus ? 'Importing...' : 'Import Excel'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Category + Subcategory dropdowns — only for base_payout */}
                                    {activePayoutType === 'base_payout' && (
                                        <>
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider pl-0.5">Category</span>
                                                <select
                                                    value={basePayoutTopCategory}
                                                    onChange={(e) => {
                                                        const cat = e.target.value;
                                                        setBasePayoutTopCategory(cat);
                                                        setBasePayoutLoanType('');
                                                        setBasePayoutLenderId('');
                                                        setBasePayoutCategory(cat === 'loan' ? '' : cat);
                                                    }}
                                                    className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold w-40 shadow-sm"
                                                >
                                                    <option value="">Select Category</option>
                                                    <option value="loan">Loan</option>
                                                    
                                                </select>
                                            </div>

                                            {basePayoutTopCategory === 'loan' && (
                                                <div className="flex flex-col gap-1.5 animate-fade-in">
                                                    <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider pl-0.5">Sub-category</span>
                                                    <select
                                                        value={basePayoutLoanType}
                                                        onChange={(e) => {
                                                            setBasePayoutLoanType(e.target.value);
                                                            setBasePayoutCategory(e.target.value);
                                                        }}
                                                        className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold w-48 shadow-sm"
                                                    >
                                                        <option value="">Select Subcategory</option>
                                                        <option value="new_car_loan">New Car Loan</option>
                                                        <option value="used_car_loan">Used Car Loan</option>
                                                        <option value="personal_loan">Personal Loan</option>
                                                        <option value="business_loan">Business Loan</option>
                                                        <option value="home_loan">Home Loan</option>
                                                        <option value="loan_against_property">Loan Against Property</option>
                                                    </select>
                                                </div>
                                            )}

                                            {basePayoutTopCategory === 'credit_card' && (
                                                <div className="flex flex-col gap-1.5 animate-fade-in">
                                                    <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider pl-0.5">Lender</span>
                                                    <select
                                                        value={basePayoutLenderId}
                                                        onChange={(e) => setBasePayoutLenderId(e.target.value)}
                                                        className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold w-48 shadow-sm"
                                                    >
                                                        <option value="">Select Lender</option>
                                                        <option value="all">All Lenders</option>
                                                        {baseLenders
                                                            .filter(l => creditCardProducts.some((p: any) => String(p.bank_id) === String(l.id)))
                                                            .map(l => (
                                                                <option key={l.id} value={l.id}>{l.name}</option>
                                                            ))}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Base Payout Import/Export / Save / Search */}
                                            <div className="flex items-end gap-2 ml-auto">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        value={rewardSearchTerm}
                                                        onChange={e => setRewardSearchTerm(e.target.value)}
                                                        placeholder="Search lender..."
                                                        className="pl-8 pr-6 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 w-40 shadow-sm"
                                                    />
                                                    {rewardSearchTerm && (
                                                        <button type="button" onClick={() => setRewardSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>

                                                {baseLenders.length > 0 && !loadingBaseLenders && (
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveAllBasePayout}
                                                        disabled={isSavingAll}
                                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-95 shadow-sm disabled:opacity-50 ${
                                                            isSavingAll
                                                                ? 'text-white shadow-md border-transparent'
                                                                : 'bg-white text-gray-700 border-gray-200/60 hover:bg-gray-50 hover:text-gray-900'
                                                        }`}
                                                        style={isSavingAll ? { backgroundColor: 'hsl(215 55% 28%)' } : {}}
                                                    >
                                                        <Save className="w-3.5 h-3.5" />{isSavingAll ? 'Saving...' : 'Save All'}
                                                    </button>
                                                )}

                                                {/* Combined Import/Export icon menu */}
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowBaseIOMenu(prev => !prev)}
                                                        title="Import / Export"
                                                        className="flex items-center justify-center w-8 h-8 rounded-xl border border-gray-200/60 hover:bg-gray-50 bg-white text-gray-700 transition-all active:scale-95 shadow-sm"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                    {showBaseIOMenu && (
                                                        <div className="absolute right-0 top-full mt-1.5 z-[220] w-36 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl py-1 animate-in fade-in slide-in-from-top-1 duration-100">
                                                            <button
                                                                type="button"
                                                                onClick={() => { setShowBaseIOMenu(false); handleExport('base-payout'); }}
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg transition-colors"
                                                            >
                                                                <Download className="w-3.5 h-3.5 text-emerald-500" />Export Excel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={isImportingBase}
                                                                onClick={() => { setShowBaseIOMenu(false); baseImportRef.current?.click(); }}
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg transition-colors disabled:opacity-50"
                                                            >
                                                                <Upload className="w-3.5 h-3.5 text-blue-500" />{isImportingBase ? 'Importing...' : 'Import Excel'}
                              </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Mobile / Tablet Flutter Controls (Hidden on desktop md:) */}
                                <div className="lg:hidden space-y-2.5 !mt-0">
                                    {/* Search Bar matching modern mobile app design */}
                                    <div className="relative w-full">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={rewardSearchTerm}
                                            onChange={e => setRewardSearchTerm(e.target.value)}
                                            placeholder="Search bank or product name..."
                                            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#5046E5]/20 shadow-xs placeholder:text-slate-400"
                                        />
                                        {rewardSearchTerm && (
                                            <button type="button" onClick={() => setRewardSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Actions Row: Balanced across width */}
                                    <div className="flex items-center justify-between w-full gap-2">
                                        {/* Left: Save Action (if available) */}
                                        <div className="flex items-center gap-2">
                                            {/* Save All for Admin in Base Payout */}
                                            {activePayoutType === 'base_payout' && baseLenders.length > 0 && !loadingBaseLenders && (
                                                <button
                                                    type="button"
                                                    onClick={handleSaveAllBasePayout}
                                                    disabled={isSavingAll}
                                                    className={`flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-95 shadow-xs disabled:opacity-50 ${
                                                        isSavingAll
                                                            ? 'text-white shadow-sm border-transparent bg-indigo-600'
                                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <Save className="w-3.5 h-3.5" />
                                                    <span>{isSavingAll ? 'Saving...' : 'Save All'}</span>
                                                </button>
                                            )}

                                            {/* Bonus Save buttons */}
                                            {activePayoutType === 'bonus' && bonusCategory && bonusLenders.length > 0 && !loadingBonusData && (activeRewardDsa || activeRewardAdvisor) && (
                                                <div className="flex items-center gap-2">
                                                    {activeRewardDsa && !activeRewardAdvisor && (
                                                        <button type="button" onClick={() => handleSaveAllForRole('dsa')} disabled={isSavingBonusDsa} className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-white font-bold text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition-all active:scale-95 shadow-xs">
                                                            <Save className="w-3.5 h-3.5" /><span>{isSavingBonusDsa ? 'Saving...' : 'Save DSA'}</span>
                                                        </button>
                                                    )}
                                                    {activeRewardAdvisor && !activeRewardDsa && (
                                                        <button type="button" onClick={() => handleSaveAllForRole('advisor')} disabled={isSavingBonusAdvisor} className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-white font-bold text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition-all active:scale-95 shadow-xs">
                                                            <Save className="w-3.5 h-3.5" /><span>{isSavingBonusAdvisor ? 'Saving...' : 'Save Advisor'}</span>
                                                        </button>
                                                    )}
                                                    {activeRewardDsa && activeRewardAdvisor && (
                                                        <button type="button" onClick={() => handleSaveAllForRole('both')} disabled={isSavingBonusDsa || isSavingBonusAdvisor} className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-white font-bold text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition-all active:scale-95 shadow-xs">
                                                            <Save className="w-3.5 h-3.5" /><span>{(isSavingBonusDsa || isSavingBonusAdvisor) ? 'Saving...' : 'Save Both'}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Right: View Toggle + Import/Export */}
                                        <div className="flex items-center gap-2 ml-auto">
                                            {/* View Toggle: Cards vs Table */}
                                            <div className="flex items-center h-9 p-0.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800">
                                                <button
                                                    type="button"
                                                    onClick={() => setRewardViewMode('cards')}
                                                    title="Cards View"
                                                    className={`h-7.5 px-2.5 flex items-center justify-center rounded-lg transition-all ${
                                                        rewardViewMode === 'cards'
                                                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                                    }`}
                                                >
                                                    <LayoutGrid className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRewardViewMode('table')}
                                                    title="Table View"
                                                    className={`h-7.5 px-2.5 flex items-center justify-center rounded-lg transition-all ${
                                                        rewardViewMode === 'table'
                                                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                                    }`}
                                                >
                                                    <List className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {/* Import / Export Menu */}
                                            <div className="relative" ref={baseIOMenuRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowBaseIOMenu(prev => !prev)}
                                                    title="Export / Import"
                                                    className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 active:scale-95 shadow-xs transition-all"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                </button>
                                                {showBaseIOMenu && (
                                                    <div className="absolute right-0 top-full mt-1.5 z-50 w-36 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1 animate-in fade-in slide-in-from-top-1 duration-100">
                                                        <button
                                                            type="button"
                                                            onClick={() => { setShowBaseIOMenu(false); handleExport(activePayoutType === 'bonus' ? 'bonus' : 'base-payout'); }}
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                        >
                                                            <Download className="w-3.5 h-3.5 text-emerald-500" />Export Excel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isImportingBase || isImportingBonus}
                                                            onClick={() => { setShowBaseIOMenu(false); (activePayoutType === 'bonus' ? bonusImportRef : baseImportRef).current?.click(); }}
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                                                        >
                                                            <Upload className="w-3.5 h-3.5 text-blue-500" />{isImportingBase || isImportingBonus ? 'Importing...' : 'Import Excel'}
                                                        </button>
                                                    </div>
                                                )}
                                                <input ref={baseImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { handleImport('base-payout', f); e.target.value = ''; } }} />
                                                <input ref={bonusImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { handleImport('bonus', f); e.target.value = ''; } }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Active Filter Chips Bar (hidden on mobile) */}
                                    <div className="hidden sm:block pt-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-800 space-y-2">
                                        {/* Header line: Title on left, Change Filters button on right */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <SlidersHorizontal className="w-3 h-3 text-indigo-500" /> Active Filters:
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setShowFilterModal(true)}
                                                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors active:scale-95 cursor-pointer"
                                            >
                                                <span>Change Filters</span>
                                                <ChevronRight className="w-3 h-3" />
                                            </button>
                                        </div>

                                        {/* Horizontal Scrollable Chips Row */}
                                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
                                            {/* Scheme Chip */}
                                            <button
                                                type="button"
                                                onClick={() => setShowFilterModal(true)}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/40 active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                                                {activePayoutType === 'base_payout' ? 'Base Payout' : 'Bonus Scheme'}
                                            </button>

                                            {/* Category Chip */}
                                            <button
                                                type="button"
                                                onClick={() => setShowFilterModal(true)}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/40 active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                                                {toTitleCase(activePayoutType === 'bonus' ? (bonusTopCategory || 'Loan') : (basePayoutTopCategory || 'Loan'))}
                                            </button>

                                            {/* Subcategory Chip */}
                                            {(activePayoutType === 'bonus' ? bonusLoanType : basePayoutLoanType) && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowFilterModal(true)}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/40 active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                                    {toTitleCase((activePayoutType === 'bonus' ? bonusLoanType : basePayoutLoanType).replace(/_/g, ' '))}
                                                </button>
                                            )}

                                            {/* Lender Chip if filtered */}
                                            {basePayoutLenderId && basePayoutLenderId !== 'all' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowFilterModal(true)}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/40 active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                                    Lender: {baseLenders.find(l => String(l.id) === String(basePayoutLenderId))?.name || basePayoutLenderId}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Base Payout Section */}
                        {user?.role === 'admin' && activePayoutType === 'base_payout' && (
                            <div className="space-y-4 animate-fade-in pt-1">
                                {!basePayoutCategory ? (
                                    <div className="py-16 text-center text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl text-xs">
                                        Select a category in filters to load lenders.
                                    </div>
                                ) : basePayoutCategory && (
                                    loadingBaseLenders ? (
                                        <div className="py-12 text-center text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl animate-pulse text-xs">
                                            Fetching lenders...
                                        </div>
                                    ) : baseLenders.length === 0 ? (
                                        <div className="py-12 text-center text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl text-xs">
                                            No lenders found for this category.
                                        </div>
                                    ) : (
                                        (() => {
                                            let list = baseLenders;
                                            if (rewardSearchTerm.trim()) {
                                                list = list.filter(l => l.name.toLowerCase().includes(rewardSearchTerm.trim().toLowerCase()));
                                            }
                                            if (basePayoutCategory === 'credit_card' && basePayoutLenderId && basePayoutLenderId !== 'all') {
                                                list = list.filter(l => String(l.id) === String(basePayoutLenderId));
                                            }

                                            if (list.length === 0) {
                                                return (
                                                    <div className="py-12 text-center text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl text-xs">
                                                        No lenders found{rewardSearchTerm ? ` matching "${rewardSearchTerm}"` : ''}.
                                                    </div>
                                                );
                                            }

                                            // Return both Mobile Cards and Desktop/Responsive Table
                                            return (
                                                <>
                                                    {/* Mobile / Tablet Cards View */}
                                                    <div className={`lg:hidden ${rewardViewMode === 'cards' ? 'block' : 'hidden'} space-y-2.5`}>
                                                        {list.map(({ id, name }) => {
                                                            if (basePayoutCategory === 'credit_card') {
                                                                const bankProds = creditCardProducts.filter((p: any) => String(p.bank_id) === String(id) || String(p.id) === String(id));
                                                                if (bankProds.length > 0) {
                                                                    return (
                                                                        <React.Fragment key={id}>
                                                                            {bankProds.map((p: any) => {
                                                                                const pName = p.product_name || p.name || 'Credit Card';
                                                                                const pKey = `${id}_${pName}`;
                                                                                const row = baseLenderData[pKey] || baseLenderData[id] || { dsaBase: '0', advisorBase: '0' };
                                                                                const avatarStyle = getAvatarStyle(name);
                                                                                return (
                                                                                    <div
                                                                                        key={pKey}
                                                                                        className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                                                                    >
                                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                                            <div className={`w-10 h-10 rounded-full ${avatarStyle.bg} flex items-center justify-center font-bold text-sm ${avatarStyle.text} shrink-0`}>
                                                                                                {name.charAt(0).toUpperCase()}
                                                                                            </div>
                                                                                            <div className="min-w-0">
                                                                                                <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                                                                                    {name}
                                                                                                </h3>
                                                                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                                                                                                    {pName}
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto min-w-0 sm:shrink-0">
                                                                                            {/* DSA Base Payout */}
                                                                                            <div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-0">
                                                                                                <div className="relative flex-1 min-w-0 sm:flex-none sm:w-24">
                                                                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 pointer-events-none">DSA: ₹</span>
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        value={row.dsaBase}
                                                                                                        onChange={e => setBaseLenderData(prev => ({ ...prev, [pKey]: { ...prev[pKey], dsaBase: e.target.value } }))}
                                                                                                        placeholder="0.00"
                                                                                                        className="w-full min-w-0 pl-12 pr-2 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                                                                    />
                                                                                                </div>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => handleSaveBaseLenderRow(id, 'DSA', pName)}
                                                                                                    disabled={savingBaseLenderRow[`${pKey}_DSA`]}
                                                                                                    title="Save DSA Payout"
                                                                                                    className="flex items-center justify-center w-7 h-7 shrink-0 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 disabled:opacity-40 transition-all active:scale-90"
                                                                                                >
                                                                                                    <Save className="w-3.5 h-3.5" />
                                                                                                </button>
                                                                                            </div>

                                                                                            {/* Advisor Base Payout */}
                                                                                            <div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-0">
                                                                                                <div className="relative flex-1 min-w-0 sm:flex-none sm:w-28">
                                                                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-600 dark:text-blue-400 pointer-events-none">Advisor: ₹</span>
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        value={row.advisorBase}
                                                                                                        onChange={e => setBaseLenderData(prev => ({ ...prev, [pKey]: { ...prev[pKey], advisorBase: e.target.value } }))}
                                                                                                        placeholder="0.00"
                                                                                                        className="w-full min-w-0 pl-16 pr-2 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                                                    />
                                                                                                </div>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => handleSaveBaseLenderRow(id, 'Advisor', pName)}
                                                                                                    disabled={savingBaseLenderRow[`${pKey}_Advisor`]}
                                                                                                    title="Save Advisor Payout"
                                                                                                    className="flex items-center justify-center w-7 h-7 shrink-0 rounded-lg bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 text-blue-600 dark:text-blue-400 disabled:opacity-40 transition-all active:scale-90"
                                                                                                >
                                                                                                    <Save className="w-3.5 h-3.5" />
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </React.Fragment>
                                                                    );
                                                                }
                                                                return null;
                                                            }

                                                            const row = baseLenderData[id] || { dsaBase: '0', advisorBase: '0' };
                                                            const avatarStyle = getAvatarStyle(name);
                                                            const subcatLabel = toTitleCase((basePayoutLoanType || basePayoutCategory || 'Used Car Loan').replace(/_/g, ' '));
                                                            return (
                                                                <div
                                                                    key={id}
                                                                    className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                                                >
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        <div className={`w-10 h-10 rounded-full ${avatarStyle.bg} flex items-center justify-center font-bold text-sm ${avatarStyle.text} shrink-0`}>
                                                                            {name.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                                                                {name}
                                                                            </h3>
                                                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                                                                                {subcatLabel}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto min-w-0 sm:shrink-0">
                                                                        {/* DSA Badge & Input */}
                                                                        <div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-0">
                                                                            <div className="relative flex-1 min-w-0 sm:flex-none sm:w-28">
                                                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 pointer-events-none">DSA:</span>
                                                                                <input
                                                                                    type="text"
                                                                                    value={row.dsaBase}
                                                                                    onChange={e => setBaseLenderData(prev => ({ ...prev, [id]: { ...prev[id], dsaBase: e.target.value } }))}
                                                                                    placeholder="0.00"
                                                                                    className="w-full pl-9 pr-5 min-w-0 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                                                />
                                                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 pointer-events-none">
                                                                                    {basePayoutCategory === 'credit_card' ? '₹' : '%'}
                                                                                </span>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleSaveBaseLenderRow(id, 'DSA')}
                                                                                disabled={savingBaseLenderRow[`${id}_DSA`]}
                                                                                title="Save DSA Payout"
                                                                                className="flex items-center justify-center w-7 h-7 shrink-0 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 disabled:opacity-40 transition-all active:scale-90"
                                                                            >
                                                                                <Save className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>

                                                                        {/* Advisor Badge & Input */}
                                                                        <div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-0">
                                                                            <div className="relative flex-1 min-w-0 sm:flex-none sm:w-32">
                                                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-700 dark:text-blue-400 pointer-events-none">Advisor:</span>
                                                                                <input
                                                                                    type="text"
                                                                                    value={row.advisorBase}
                                                                                    onChange={e => setBaseLenderData(prev => ({ ...prev, [id]: { ...prev[id], advisorBase: e.target.value } }))}
                                                                                    placeholder="0.00"
                                                                                    className="w-full pl-14 pr-5 min-w-0 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                                />
                                                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-600 dark:text-blue-400 pointer-events-none">
                                                                                    {basePayoutCategory === 'credit_card' ? '₹' : '%'}
                                                                                </span>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleSaveBaseLenderRow(id, 'Advisor')}
                                                                                disabled={savingBaseLenderRow[`${id}_Advisor`]}
                                                                                title="Save Advisor Payout"
                                                                                className="flex items-center justify-center w-7 h-7 shrink-0 rounded-lg bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 text-blue-600 dark:text-blue-400 disabled:opacity-40 transition-all active:scale-90"
                                                                            >
                                                                                <Save className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Desktop Table View (Always on md:) & Mobile Table View (when rewardViewMode === 'table') */}
                                                    <div className={`${rewardViewMode === 'table' ? 'block' : 'hidden lg:block'} overflow-x-auto border border-gray-100 dark:border-slate-800/80 rounded-xl`}>
                                                    <table className="w-full text-left border-collapse text-xs">
                                                        <thead>
                                                            <tr className="bg-gray-50/50 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-800 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                                                <th className="p-3 pl-4">Lender / Bank</th>
                                                                <th className="p-3 text-center border-l border-gray-100 dark:border-slate-800">
                                                                    DSA Base Payout {basePayoutCategory === 'credit_card' ? '(₹)' : '(%)'}
                                                                </th>
                                                                <th className="p-3 text-center border-l border-gray-100 dark:border-slate-800">
                                                                    Advisor Base Payout {basePayoutCategory === 'credit_card' ? '(₹)' : '(%)'}
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                                                            {list.map(({ id, name }) => {
                                                                if (basePayoutCategory === 'credit_card') {
                                                                    const bankProds = creditCardProducts.filter((p: any) => String(p.bank_id) === String(id));
                                                                    if (bankProds.length > 0) {
                                                                        return (
                                                                            <React.Fragment key={id}>
                                                                                {bankProds.map((p: any) => {
                                                                                    const pName = p.product_name || p.name || 'Credit Card';
                                                                                    const pKey = `${id}_${pName}`;
                                                                                    const row = baseLenderData[pKey] || baseLenderData[id] || { dsaBase: '0', advisorBase: '0' };
                                                                                    return (
                                                                                        <tr key={pKey} className="hover:bg-gray-50/40 dark:hover:bg-slate-800/20 transition-colors">
                                                                                            <td className="p-3 pl-4">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-[11px] font-bold text-gray-500 uppercase shrink-0">
                                                                                                        {name.charAt(0)}
                                                                                                    </div>
                                                                                                    <div className="flex flex-col">
                                                                                                        <span className="font-semibold text-gray-900 dark:text-white">{name} - <span className="text-gray-500 font-medium">{pName}</span></span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </td>
                                                                                            <td className="p-3 border-l border-gray-100 dark:border-slate-800">
                                                                                                <div className="flex items-center gap-1.5 justify-center">
                                                                                                    <div className="relative w-24">
                                                                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">₹</span>
                                                                                                        <input type="text"
                                                                                                            value={row.dsaBase}
                                                                                                            onChange={e => setBaseLenderData(prev => ({ ...prev, [pKey]: { ...prev[pKey], dsaBase: e.target.value } }))}
                                                                                                            placeholder="0.00"
                                                                                                            className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-[11px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary/20"
                                                                                                        />
                                                                                                    </div>
                                                                                                    <button type="button"
                                                                                                        onClick={() => handleSaveBaseLenderRow(id, 'DSA', pName)}
                                                                                                        disabled={savingBaseLenderRow[`${pKey}_DSA`]}
                                                                                                        className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 disabled:opacity-40 transition-all active:scale-90 shrink-0"
                                                                                                    >
                                                                                                        <Save className="w-3 h-3" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            </td>
                                                                                            <td className="p-3 border-l border-gray-100 dark:border-slate-800">
                                                                                                <div className="flex items-center gap-1.5 justify-center">
                                                                                                    <div className="relative w-24">
                                                                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">₹</span>
                                                                                                        <input type="text"
                                                                                                            value={row.advisorBase}
                                                                                                            onChange={e => setBaseLenderData(prev => ({ ...prev, [pKey]: { ...prev[pKey], advisorBase: e.target.value } }))}
                                                                                                            placeholder="0.00"
                                                                                                            className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-[11px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary/20"
                                                                                                        />
                                                                                                    </div>
                                                                                                    <button type="button"
                                                                                                        onClick={() => handleSaveBaseLenderRow(id, 'Advisor', pName)}
                                                                                                        disabled={savingBaseLenderRow[`${pKey}_Advisor`]}
                                                                                                        className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[#00b2ff] disabled:opacity-40 transition-all active:scale-90 shrink-0"
                                                                                                    >
                                                                                                        <Save className="w-3 h-3" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            </td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                            </React.Fragment>
                                                                        );
                                                                    }
                                                                    return null;
                                                                }

                                                                const row = baseLenderData[id] || { dsaBase: '0', advisorBase: '0' };
                                                                return (
                                                                    <tr key={id} className="hover:bg-gray-50/40 dark:hover:bg-slate-800/20 transition-colors">
                                                                        <td className="p-3 pl-4">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-[11px] font-bold text-gray-500 uppercase shrink-0">
                                                                                    {name.charAt(0)}
                                                                                </div>
                                                                                <span className="font-semibold text-gray-900 dark:text-white">{name}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-3 border-l border-gray-100 dark:border-slate-800">
                                                                            <div className="flex items-center gap-1.5 justify-center">
                                                                                <div className="relative w-24">
                                                                                    {basePayoutCategory === 'credit_card' && (
                                                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">₹</span>
                                                                                    )}
                                                                                    <input type="text"
                                                                                        value={row.dsaBase}
                                                                                        onChange={e => setBaseLenderData(prev => ({ ...prev, [id]: { ...prev[id], dsaBase: e.target.value } }))}
                                                                                        placeholder="0.00"
                                                                                        className={`w-full ${basePayoutCategory === 'credit_card' ? 'pl-6 pr-2' : 'pr-5 pl-2'} py-1.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-[11px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary/20`}
                                                                                    />
                                                                                    {basePayoutCategory !== 'credit_card' && (
                                                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400 pointer-events-none">%</span>
                                                                                    )}
                                                                                </div>
                                                                                <button type="button"
                                                                                    onClick={() => handleSaveBaseLenderRow(id, 'DSA')}
                                                                                    disabled={savingBaseLenderRow[`${id}_DSA`]}
                                                                                    className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 disabled:opacity-40 transition-all active:scale-90 shrink-0"
                                                                                >
                                                                                    <Save className="w-3 h-3" />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-3 border-l border-gray-100 dark:border-slate-800">
                                                                            <div className="flex items-center gap-1.5 justify-center">
                                                                                <div className="relative w-24">
                                                                                    {basePayoutCategory === 'credit_card' && (
                                                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">₹</span>
                                                                                    )}
                                                                                    <input type="text"
                                                                                        value={row.advisorBase}
                                                                                        onChange={e => setBaseLenderData(prev => ({ ...prev, [id]: { ...prev[id], advisorBase: e.target.value } }))}
                                                                                        placeholder="0.00"
                                                                                        className={`w-full ${basePayoutCategory === 'credit_card' ? 'pl-6 pr-2' : 'pr-5 pl-2'} py-1.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-[11px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary/20`}
                                                                                    />
                                                                                    {basePayoutCategory !== 'credit_card' && (
                                                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400 pointer-events-none">%</span>
                                                                                    )}
                                                                                </div>
                                                                                <button type="button"
                                                                                    onClick={() => handleSaveBaseLenderRow(id, 'Advisor')}
                                                                                    disabled={savingBaseLenderRow[`${id}_Advisor`]}
                                                                                    className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[#00b2ff] disabled:opacity-40 transition-all active:scale-90 shrink-0"
                                                                                >
                                                                                    <Save className="w-3 h-3" />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </>
                                            );
                                        })()
                                    )
                                )}
                            </div>
                        )}

                        {/* Bonus section — shown only when bonus is selected */}
                        {user?.role === 'admin' && activePayoutType === 'bonus' && (
                            <div className="space-y-4 animate-fade-in">
                                {loadingBonusData ? (
                                    <div className="py-16 text-center text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl animate-pulse text-xs">
                                        Fetching lenders and payout data...
                                    </div>
                                ) : bonusLenders.length === 0 ? (
                                    <div className="py-16 text-center text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl text-xs">
                                        {bonusTopCategory === 'loan'
                                            ? bonusCategory
                                                ? 'No lenders found for this subcategory.'
                                                : 'Select a subcategory to load lenders.'
                                            : bonusTopCategory
                                                ? 'No lenders found for this category.'
                                                : 'Select a category to load lenders.'}
                                    </div>
                                ) : (
                                    <>
                                        {/* Mobile / Tablet Bonus Cards View */}
                                        <div className={`lg:hidden ${rewardViewMode === 'cards' ? 'block' : 'hidden'} space-y-2.5`}>
                                            {(rewardSearchTerm.trim()
                                                ? bonusLenders.filter(l => l.name.toLowerCase().includes(rewardSearchTerm.trim().toLowerCase()))
                                                : bonusLenders
                                            ).length === 0 ? (
                                                <div className="py-10 text-center text-gray-400 dark:text-gray-600 text-xs border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl">
                                                    No lenders found matching "{rewardSearchTerm}".
                                                </div>
                                            ) : (
                                                (rewardSearchTerm.trim()
                                                    ? bonusLenders.filter(l => l.name.toLowerCase().includes(rewardSearchTerm.trim().toLowerCase()))
                                                    : bonusLenders
                                                ).map(({ id, name }) => {
                                                    const isCC = bonusCategory === 'credit_card' || bonusTopCategory === 'credit_card';
                                                    const avatarStyle = getAvatarStyle(name);
                                                    if (isCC) {
                                                        const bankProds = creditCardProducts.filter((p: any) => String(p.bank_id) === String(id));
                                                        return (
                                                            <React.Fragment key={id}>
                                                                {bankProds.map((p: any) => {
                                                                    const pName = p.product_name || p.name || 'Credit Card';
                                                                    const pKey = `${id}_${pName}`;
                                                                    const bankDefault = bonusTableData[id] || { dsaBase: '0', dsaBonus: null, dsaTotal: null, advisorBase: '0', advisorBonus: null, advisorTotal: null };
                                                                    const d = bonusTableData[pKey] || { ...bankDefault, dsaBonus: null, dsaTotal: null, advisorBonus: null, advisorTotal: null };
                                                                    return (
                                                                        <div key={pKey} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm space-y-2.5">
                                                                            <div className="flex items-center gap-2.5">
                                                                                <div className={`w-9 h-9 rounded-full ${avatarStyle.bg} flex items-center justify-center font-bold text-xs ${avatarStyle.text} shrink-0`}>
                                                                                    {name.charAt(0).toUpperCase()}
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{name}</h4>
                                                                                    <p className="text-[11px] text-slate-500 truncate">{pName}</p>
                                                                                </div>
                                                                            </div>
                                                                            {activeRewardDsa && (
                                                                                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                                                                                    <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                                                                                        <span>DSA: ₹{d.dsaBase || '0'}</span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <div className="relative w-16">
                                                                                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">₹</span>
                                                                                            <input
                                                                                                type="text"
                                                                                                value={d.dsaBonus ?? ''}
                                                                                                placeholder="0"
                                                                                                onChange={e => handleBonusFieldChange(pKey, 'dsaBonus', e.target.value)}
                                                                                                className="w-full pl-4 pr-1 py-1 rounded-lg border border-emerald-200 bg-white text-emerald-900 text-xs font-bold text-center"
                                                                                            />
                                                                                        </div>
                                                                                        <span className="text-[11px] font-extrabold text-emerald-700">₹{(parseFloat(d.dsaBase || '0') + (parseFloat(d.dsaBonus || '0') || 0))}</span>
                                                                                        <button type="button" onClick={() => handleSaveBonusRow(id, 'dsa', pName)} disabled={savingBonusRow[`${pKey}_dsa`]} className="p-1.5 rounded-lg bg-emerald-600 text-white active:scale-95 transition-all"><Save className="w-3 h-3" /></button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {activeRewardAdvisor && (
                                                                                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                                                                                    <div className="text-[11px] font-bold text-blue-800 dark:text-blue-300">
                                                                                        <span>Adv: ₹{d.advisorBase || '0'}</span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <div className="relative w-16">
                                                                                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">₹</span>
                                                                                            <input
                                                                                                type="text"
                                                                                                value={d.advisorBonus ?? ''}
                                                                                                placeholder="0"
                                                                                                onChange={e => handleBonusFieldChange(pKey, 'advisorBonus', e.target.value)}
                                                                                                className="w-full pl-4 pr-1 py-1 rounded-lg border border-blue-200 bg-white text-blue-900 text-xs font-bold text-center"
                                                                                            />
                                                                                        </div>
                                                                                        <span className="text-[11px] font-extrabold text-blue-700">₹{(parseFloat(d.advisorBase || '0') + (parseFloat(d.advisorBonus || '0') || 0))}</span>
                                                                                        <button type="button" onClick={() => handleSaveBonusRow(id, 'advisor', pName)} disabled={savingBonusRow[`${pKey}_advisor`]} className="p-1.5 rounded-lg bg-blue-600 text-white active:scale-95 transition-all"><Save className="w-3 h-3" /></button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </React.Fragment>
                                                        );
                                                    }
                                                    const d = bonusTableData[id] || { dsaBase: '0', dsaBonus: '0', dsaTotal: '0', advisorBase: '0', advisorBonus: '0', advisorTotal: '0' };
                                                    const subcat = toTitleCase((bonusLoanType || bonusCategory || 'Loan').replace(/_/g, ' '));
                                                    return (
                                                        <div key={id} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm space-y-2.5">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={`w-9 h-9 rounded-full ${avatarStyle.bg} flex items-center justify-center font-bold text-xs ${avatarStyle.text} shrink-0`}>
                                                                    {name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{name}</h4>
                                                                    <p className="text-[11px] text-slate-500 truncate">{subcat}</p>
                                                                </div>
                                                            </div>
                                                            {activeRewardDsa && (
                                                                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                                                                    <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                                                                        <span>DSA: {parseFloat(d.dsaBase || '0').toFixed(2)}%</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className="relative w-16">
                                                                            <input
                                                                                type="text"
                                                                                value={d.dsaBonus ?? ''}
                                                                                placeholder="0.00"
                                                                                onChange={e => handleBonusFieldChange(id, 'dsaBonus', e.target.value)}
                                                                                className="w-full pr-3 pl-1 py-1 rounded-lg border border-emerald-200 bg-white text-emerald-900 text-xs font-bold text-center"
                                                                            />
                                                                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">%</span>
                                                                        </div>
                                                                        <span className="text-[11px] font-extrabold text-emerald-700">{(parseFloat(d.dsaBase || '0') + (parseFloat(d.dsaBonus || '0') || 0)).toFixed(2)}%</span>
                                                                        <button type="button" onClick={() => handleSaveBonusRow(id, 'dsa')} disabled={savingBonusRow[`${id}_dsa`]} className="p-1.5 rounded-lg bg-emerald-600 text-white active:scale-95 transition-all"><Save className="w-3 h-3" /></button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {activeRewardAdvisor && (
                                                                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                                                                    <div className="text-[11px] font-bold text-blue-800 dark:text-blue-300">
                                                                        <span>Adv: {parseFloat(d.advisorBase || '0').toFixed(2)}%</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className="relative w-16">
                                                                            <input
                                                                                type="text"
                                                                                value={d.advisorBonus ?? ''}
                                                                                placeholder="0.00"
                                                                                onChange={e => handleBonusFieldChange(id, 'advisorBonus', e.target.value)}
                                                                                className="w-full pr-3 pl-1 py-1 rounded-lg border border-blue-200 bg-white text-blue-900 text-xs font-bold text-center"
                                                                            />
                                                                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">%</span>
                                                                        </div>
                                                                        <span className="text-[11px] font-extrabold text-blue-700">{(parseFloat(d.advisorBase || '0') + (parseFloat(d.advisorBonus || '0') || 0)).toFixed(2)}%</span>
                                                                        <button type="button" onClick={() => handleSaveBonusRow(id, 'advisor')} disabled={savingBonusRow[`${id}_advisor`]} className="p-1.5 rounded-lg bg-blue-600 text-white active:scale-95 transition-all"><Save className="w-3 h-3" /></button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>

                                        {/* Desktop Table View (Always on md:) & Mobile Table View (when rewardViewMode === 'table') */}
                                        <div className={`${rewardViewMode === 'table' ? 'block' : 'hidden lg:block'} overflow-x-auto border border-gray-100 dark:border-slate-800/80 rounded-xl`}>
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-gray-50/50 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-800 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                                    <th className="p-3 pl-4">Lender / Bank</th>
                                                    {activeRewardDsa && (
                                                        <>
                                                            {(() => {
                                                        const isBonusCC = bonusCategory === 'credit_card' || bonusTopCategory === 'credit_card';
                                                        return (
                                                            <>
                                                                <th className="p-3 text-center border-l border-gray-100 dark:border-slate-800">DSA Base Payout {isBonusCC ? '(₹)' : '(%)'}</th>
                                                                <th className="p-3 text-center border-l border-gray-100 dark:border-slate-800">DSA Bonus {isBonusCC ? '(₹)' : '(%)'}</th>
                                                                <th className="p-3 text-center border-l border-gray-100 dark:border-slate-800">DSA New Base Payout {isBonusCC ? '(₹)' : '(%)'}</th>
                                                            </>
                                                        );
                                                    })()}
                                                    {activeRewardAdvisor && (() => {
                                                        const isBonusCC = bonusCategory === 'credit_card' || bonusTopCategory === 'credit_card';
                                                        return (
                                                            <>
                                                                <th className="p-3 text-center border-l border-gray-200 dark:border-slate-700">Advisor Base Payout {isBonusCC ? '(₹)' : '(%)'}</th>
                                                                <th className="p-3 text-center border-l border-gray-100 dark:border-slate-800">Advisor Bonus {isBonusCC ? '(₹)' : '(%)'}</th>
                                                                <th className="p-3 text-center border-l border-gray-100 dark:border-slate-800">Advisor New Base Payout {isBonusCC ? '(₹)' : '(%)'}</th>
                                                            </>
                                                        );
                                                    })()}
                                                        </>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                                                {(rewardSearchTerm.trim()
                                                    ? bonusLenders.filter(l => l.name.toLowerCase().includes(rewardSearchTerm.trim().toLowerCase()))
                                                    : bonusLenders
                                                ).length === 0 ? (
                                                    <tr>
                                                        <td colSpan={10} className="py-10 text-center text-gray-400 dark:text-gray-600 text-xs">
                                                            No lenders found matching "{rewardSearchTerm}".
                                                        </td>
                                                    </tr>
                                                ) : (rewardSearchTerm.trim()
                                                    ? bonusLenders.filter(l => l.name.toLowerCase().includes(rewardSearchTerm.trim().toLowerCase()))
                                                    : bonusLenders
                                                ).map(({ id, name }) => {
                                                    const isCC = bonusCategory === 'credit_card' || bonusTopCategory === 'credit_card';
                                                    if (isCC) {
                                                        const bankProds = creditCardProducts.filter((p: any) => String(p.bank_id) === String(id));
                                                        if (bankProds.length > 0) {
                                                            return (
                                                                <React.Fragment key={id}>
                                                                    {bankProds.map((p: any) => {
                                                                        const pName = p.product_name || p.name || 'Credit Card';
                                                                        const pKey = `${id}_${pName}`;
                                                                        const bankDefault = bonusTableData[id] || { dsaBase: '0', dsaBonus: null, dsaTotal: null, advisorBase: '0', advisorBonus: null, advisorTotal: null };
                                                                        const d = bonusTableData[pKey] || { ...bankDefault, dsaBonus: null, dsaTotal: null, advisorBonus: null, advisorTotal: null };
                                                                        return (
                                                                            <tr key={pKey} className="hover:bg-gray-50/40 dark:hover:bg-slate-800/20 transition-colors">
                                                                                {/* Lender name + Card Product Name */}
                                                                                <td className="p-3 pl-4">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-[11px] font-bold text-gray-500 uppercase shrink-0">
                                                                                            {name.charAt(0)}
                                                                                        </div>
                                                                                        <div className="flex flex-col">
                                                                                            <span className="font-semibold text-gray-900 dark:text-white">{name} - <span className="text-gray-500 font-medium">{pName}</span></span>
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                                {/* DSA columns */}
                                                                                {activeRewardDsa && (
                                                                                    <>
                                                                                        <td className="p-3 border-l border-gray-100 dark:border-slate-800">
                                                                                            <div className="px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-800/60 text-center w-24 mx-auto border border-gray-200 dark:border-slate-700">
                                                                                                <span className="text-[11px] font-black text-gray-600 dark:text-gray-300 font-mono">₹{parseFloat(d.dsaBase || '0')}</span>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="p-3 border-l border-gray-100 dark:border-slate-800">
                                                                                            <div className="flex items-center gap-1.5 justify-center">
                                                                                                <div className="relative w-20">
                                                                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">₹</span>
                                                                                                    <input type="text"
                                                                                                        value={d.dsaBonus ?? ''}
                                                                                                        placeholder="0.00"
                                                                                                        onChange={e => handleBonusFieldChange(pKey, 'dsaBonus', e.target.value)}
                                                                                                        className="w-full pl-5 pr-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-[11px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary/20"
                                                                                                    />
                                                                                                </div>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => handleSaveBonusRow(id, 'dsa', pName)}
                                                                                                    disabled={savingBonusRow[`${pKey}_dsa`]}
                                                                                                    title="Save DSA bonus for this card"
                                                                                                    className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 disabled:opacity-40 transition-all active:scale-90 shrink-0"
                                                                                                >
                                                                                                    <Save className="w-3 h-3" />
                                                                                                </button>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="p-3 border-l border-gray-100 dark:border-slate-800">
                                                                                            <div className="px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-center w-24 mx-auto">
                                                                                                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                                                                                    ₹{(parseFloat(d.dsaBase || '0') + (parseFloat(d.dsaBonus || '0') || 0))}
                                                                                                </span>
                                                                                            </div>
                                                                                        </td>
                                                                                    </>
                                                                                )}
                                                                                {/* Advisor columns */}
                                                                                {activeRewardAdvisor && (
                                                                                    <>
                                                                                        <td className="p-3 border-l border-gray-200 dark:border-slate-700">
                                                                                            <div className="px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-800/60 text-center w-24 mx-auto border border-gray-200 dark:border-slate-700">
                                                                                                <span className="text-[11px] font-black text-gray-600 dark:text-gray-300 font-mono">₹{parseFloat(d.advisorBase || '0')}</span>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="p-3 border-l border-gray-100 dark:border-slate-800">
                                                                                            <div className="flex items-center gap-1.5 justify-center">
                                                                                                <div className="relative w-20">
                                                                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">₹</span>
                                                                                                    <input type="text"
                                                                                                        value={d.advisorBonus ?? ''}
                                                                                                        placeholder="0.00"
                                                                                                        onChange={e => handleBonusFieldChange(pKey, 'advisorBonus', e.target.value)}
                                                                                                        className="w-full pl-5 pr-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-[11px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary/20"
                                                                                                    />
                                                                                                </div>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => handleSaveBonusRow(id, 'advisor', pName)}
                                                                                                    disabled={savingBonusRow[`${pKey}_advisor`]}
                                                                                                    title="Save Advisor bonus for this card"
                                                                                                    className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[#00b2ff] disabled:opacity-40 transition-all active:scale-90 shrink-0"
                                                                                                >
                                                                                                    <Save className="w-3 h-3" />
                                                                                                </button>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="p-3 border-l border-gray-100 dark:border-slate-800">
                                                                                            <div className="px-2 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-center w-24 mx-auto">
                                                                                                <span className="text-[11px] font-black text-[#00b2ff] font-mono">
                                                                                                    ₹{(parseFloat(d.advisorBase || '0') + (parseFloat(d.advisorBonus || '0') || 0))}
                                                                                                </span>
                                                                                            </div>
                                                                                        </td>
                                                                                    </>
                                                                                )}
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </React.Fragment>
                                                            );
                                                        }
                                                    }

                                                    const d = bonusTableData[id] || { dsaBase: '0', dsaBonus: '0', dsaTotal: '0', advisorBase: '0', advisorBonus: '0', advisorTotal: '0' };
                                                    return (
                                                        <tr key={id} className="hover:bg-gray-50/40 dark:hover:bg-slate-800/20 transition-colors">
                                                            {/* Lender name */}
                                                            <td className="p-3 pl-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-[11px] font-bold text-gray-500 uppercase shrink-0">
                                                                        {name.charAt(0)}
                                                                    </div>
                                                                    <span className="font-semibold text-gray-900 dark:text-white">{name}</span>
                                                                </div>
                                                            </td>
                                                            {/* DSA columns — only when DSA is selected */}
                                                            {activeRewardDsa && (
                                                                <>
                                                                    <td className="p-3 border-l border-gray-100 dark:border-slate-800">
                                                                        <div className="px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-800/60 text-center w-24 mx-auto border border-gray-200 dark:border-slate-700">
                                                                            <span className="text-[11px] font-black text-gray-600 dark:text-gray-300 font-mono">{isCC ? `₹${parseFloat(d.dsaBase || '0')}` : `${parseFloat(d.dsaBase || '0').toFixed(2)}%`}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 border-l border-gray-100 dark:border-slate-800">
                                                                        <div className="flex items-center gap-1.5 justify-center">
                                                                            <div className="relative w-20">
                                                                                {isCC && (
                                                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">₹</span>
                                                                                )}
                                                                                <input type="text"
                                                                                    value={d.dsaBonus ?? ''}
                                                                                    placeholder="0.00"
                                                                                    onChange={e => handleBonusFieldChange(id, 'dsaBonus', e.target.value)}
                                                                                    className={`w-full ${isCC ? 'pl-5 pr-2' : 'pr-5 pl-2'} py-1.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-[11px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary/20`}
                                                                                />
                                                                                {!isCC && (
                                                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400 pointer-events-none">%</span>
                                                                                )}
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleSaveBonusRow(id, 'dsa')}
                                                                                disabled={savingBonusRow[`${id}_dsa`]}
                                                                                title="Save DSA bonus for this lender"
                                                                                className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 disabled:opacity-40 transition-all active:scale-90 shrink-0"
                                                                            >
                                                                                <Save className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 border-l border-gray-100 dark:border-slate-800">
                                                                        <div className="px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-center w-24 mx-auto">
                                                                            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                                                                {isCC
                                                                                    ? `₹${(parseFloat(d.dsaBase || '0') + parseFloat(d.dsaBonus || '0'))}`
                                                                                    : `${(parseFloat(d.dsaBase || '0') + parseFloat(d.dsaBonus || '0')).toFixed(2)}%`
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                </>
                                                            )}
                                                            {/* Advisor columns — only when Advisor is selected */}
                                                            {activeRewardAdvisor && (
                                                                <>
                                                                    <td className="p-3 border-l border-gray-200 dark:border-slate-700">
                                                                        <div className="px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-800/60 text-center w-24 mx-auto border border-gray-200 dark:border-slate-700">
                                                                            <span className="text-[11px] font-black text-gray-600 dark:text-gray-300 font-mono">{isCC ? `₹${parseFloat(d.advisorBase || '0')}` : `${parseFloat(d.advisorBase || '0').toFixed(2)}%`}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 border-l border-gray-100 dark:border-slate-800">
                                                                        <div className="flex items-center gap-1.5 justify-center">
                                                                            <div className="relative w-20">
                                                                                {isCC && (
                                                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">₹</span>
                                                                                )}
                                                                                <input type="text"
                                                                                    value={d.advisorBonus ?? ''}
                                                                                    placeholder="0.00"
                                                                                    onChange={e => handleBonusFieldChange(id, 'advisorBonus', e.target.value)}
                                                                                    className={`w-full ${isCC ? 'pl-5 pr-2' : 'pr-5 pl-2'} py-1.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-[11px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary/20`}
                                                                                />
                                                                                {!isCC && (
                                                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400 pointer-events-none">%</span>
                                                                                )}
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleSaveBonusRow(id, 'advisor')}
                                                                                disabled={savingBonusRow[`${id}_advisor`]}
                                                                                title="Save Advisor bonus for this lender"
                                                                                className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[#00b2ff] disabled:opacity-40 transition-all active:scale-90 shrink-0"
                                                                            >
                                                                                <Save className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 border-l border-gray-100 dark:border-slate-800">
                                                                        <div className="px-2 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-center w-24 mx-auto">
                                                                            <span className="text-[11px] font-black text-[#00b2ff] font-mono">
                                                                                {isCC
                                                                                    ? `₹${(parseFloat(d.advisorBase || '0') + parseFloat(d.advisorBonus || '0'))}`
                                                                                    : `${(parseFloat(d.advisorBase || '0') + parseFloat(d.advisorBonus || '0')).toFixed(2)}%`
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                            </div>
                        )}
                        {/* DSA / Advisor Panel — shown for DSA and independent Advisor */}
                        {isPartnerPayoutRole && (
                            <div className="space-y-4 animate-fade-in">
                                {/* Toolbar */}
                                <div className="grid grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap sm:gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
                                    {/* Category */}
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider pl-0.5">Category</span>
                                        <select
                                            value={dsaViewCategory}
                                            onChange={e => {
                                                setDsaViewCategory(e.target.value);
                                                setDsaViewSubcategory('');
                                                setDsaViewRows([]);
                                            }}
                                            className="w-full sm:w-40 px-3 py-2.5 sm:py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold shadow-sm"
                                        >
                                            <option value="">Select Category</option>
                                            <option value="loan">Loan</option>
                                            
                                        </select>
                                    </div>

                                    {/* Subcategory — only for Loan */}
                                    {dsaViewCategory === 'loan' && (
                                        <div className="flex flex-col gap-1.5 animate-fade-in">
                                            <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider pl-0.5">Sub-category</span>
                                            <select
                                                value={dsaViewSubcategory}
                                                onChange={e => setDsaViewSubcategory(e.target.value)}
                                                className="w-full sm:w-52 px-3 py-2.5 sm:py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold shadow-sm"
                                            >
                                                <option value="">Select Subcategory</option>
                                                {dsaSubcategoryMap.loan.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* Table */}
                                {!dsaViewCategory || (dsaViewCategory === 'loan' && !dsaViewSubcategory) ? (
                                    <div className="py-16 text-center text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl text-xs">
                                        {!dsaViewCategory ? 'Select a category to view your payout rates.' : 'Select a subcategory to view your payout rates.'}
                                    </div>
                                ) : loadingDsaView ? (
                                    <div className="py-10 text-center text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl animate-pulse text-xs">
                                        Loading payout rates...
                                    </div>
                                ) : dsaViewRows.length === 0 ? (
                                    <div className="py-10 text-center text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl text-xs">
                                        No payout rates configured for this category yet.
                                    </div>
                                ) : (
                                    <>
                                    <div className="md:hidden space-y-3">
                                        {dsaViewRows.map(row => {
                                            const isCC = dsaViewCategory === 'credit_card' || row.unit === '₹';
                                            const rowKey = row.product_name ? `${row.bank_id}_${row.product_name}` : row.bank_id;
                                            const displayName = row.product_name ? `${row.bank_name} - ${row.product_name}` : (row.bank_name || 'Unknown Lender');
                                            const payoutText = isCC
                                                ? `₹${parseFloat(row.effective_payout || 0)}`
                                                : `${parseFloat(row.effective_payout || 0).toFixed(2)}%`;
                                            const basePayoutText = isCC
                                                ? `₹${parseFloat(row.base_payout || 0)}`
                                                : `${parseFloat(row.base_payout || 0).toFixed(2)}%`;

                                            return (
                                                <article key={rowKey} className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm overflow-hidden">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30 text-sm font-bold uppercase text-primary">
                                                                {(displayName || '?').charAt(0)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h3 className="break-words text-sm font-bold leading-tight text-gray-900 dark:text-white">{displayName}</h3>
                                                                <p className="mt-1 break-words text-[10px] text-gray-500 dark:text-slate-400">
                                                                    {dsaViewCategory || '—'}{dsaViewSubcategory ? ` / ${dsaViewSubcategory}` : ''} · DSA
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0 text-right">
                                                            <p className="text-base font-black text-primary">{payoutText}</p>
                                                            <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">Payout</p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 dark:border-slate-800 pt-3">
                                                        <div className="min-w-0">
                                                            <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">Base Payout</p>
                                                            <p className="mt-0.5 text-xs font-bold text-gray-800 dark:text-gray-200">{basePayoutText}</p>
                                                        </div>
                                                        <a href="#" onClick={e => e.preventDefault()} className="shrink-0 text-xs font-semibold text-[#00b2ff] hover:underline">View Policy</a>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                    <div className="hidden md:block overflow-x-auto border border-gray-100 dark:border-slate-800/80 rounded-xl">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-gray-50/50 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-800 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                                    <th className="p-3 pl-4">Lender / Product</th>
                                                    <th className="p-3 text-center border-l border-gray-100 dark:border-slate-800">Payout</th>
                                                    <th className="p-3 text-center border-l border-gray-100 dark:border-slate-800">Policy</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                                                {dsaViewRows.map(row => {
                                                    const isCC = dsaViewCategory === 'credit_card' || row.unit === '₹';
                                                    const rowKey = row.product_name ? `${row.bank_id}_${row.product_name}` : row.bank_id;
                                                    const displayName = row.product_name ? `${row.bank_name} - ${row.product_name}` : row.bank_name;
                                                    const payoutText = isCC
                                                        ? `₹${parseFloat(row.effective_payout || 0)}`
                                                        : `${parseFloat(row.effective_payout || 0).toFixed(2)}%`;

                                                    return (
                                                        <tr key={rowKey} className="hover:bg-gray-50/40 dark:hover:bg-slate-800/20 transition-colors">
                                                            <td className="p-3 pl-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-[11px] font-bold text-gray-500 uppercase shrink-0">
                                                                        {displayName.charAt(0)}
                                                                    </div>
                                                                    <span className="font-semibold text-gray-900 dark:text-white">{displayName}</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-3 text-center border-l border-gray-100 dark:border-slate-800">
                                                                <span className={`inline-block px-2.5 py-1 rounded-lg font-mono font-black text-xs ${
                                                                    row.has_bonus
                                                                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                                                                        : 'bg-gray-50 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300'
                                                                }`}>
                                                                    {payoutText}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-center border-l border-gray-100 dark:border-slate-800">
                                                                <a
                                                                    href="#"
                                                                    onClick={e => e.preventDefault()}
                                                                    className="text-[#00b2ff] hover:underline font-semibold text-xs"
                                                                >
                                                                    View Policy
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    </>
                                )}
                            </div>
                        )}

                    </div>
                )}



                {/* ================================= EARNING TAB ================================= */}

                {activeTab === 'earning' && (

                    <div className="flex flex-col h-[calc(100vh-200px)] sm:h-[calc(100vh-200px)] min-h-0 animate-fade-in text-xs">

                        {/* Partner Wallet — Approved balance + Withdraw */}
                        {isPartnerWalletRole && (
                            <div className="mb-3 rounded-2xl border border-gray-200/60 dark:border-slate-700 bg-gradient-to-br from-[#F4F7FF] to-white dark:from-slate-900 dark:to-slate-800 shadow-md p-3 sm:p-4 flex flex-row items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-[#0024A2]/10 text-[#0024A2]">
                                        <WalletIcon className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Wallet Balance</p>
                                        <p className="text-lg sm:text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">
                                            ₹{(walletData?.available_balance ?? walletData?.approved_balance ?? 0).toLocaleString('en-IN')}
                                        </p>
                                        <p className="text-[10px] text-gray-400 truncate">
                                            Approved ₹{(walletData?.approved_balance ?? 0).toLocaleString('en-IN')}
                                            {walletData?.pending_withdrawal > 0 && <> · Pending ₹{walletData.pending_withdrawal.toLocaleString('en-IN')}</>}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleWithdraw}
                                    disabled={withdrawing || loadingWallet || !walletData || (walletData?.available_balance ?? 0) <= 0 || walletData?.pending_count > 0}
                                    className="shrink-0 rounded-xl px-4 py-2 sm:px-5 sm:py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: 'hsl(215 55% 28%)' }}
                                >
                                    {withdrawing ? 'Withdrawing...' : walletData?.pending_count > 0 ? 'Pending' : 'Withdraw'}
                                </button>
                            </div>
                        )}

                        {/* Withdraw Amount Modal */}
                        {showWithdrawModal && (
                            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-xs">
                                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
                                    <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <WalletIcon className="w-5 h-5 text-[#0024A2]" />
                                            <h3 className="text-md font-bold text-gray-900 dark:text-white">Withdraw Amount</h3>
                                        </div>
                                        <button onClick={() => setShowWithdrawModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="p-3 bg-gray-50 dark:bg-slate-800/40 rounded-xl flex justify-between items-center">
                                            <span className="text-gray-500">Available Balance:</span>
                                            <span className="font-bold text-gray-900 dark:text-white">₹{(walletData?.available_balance ?? 0).toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="font-bold text-gray-700 dark:text-gray-300">Amount to Withdraw (INR)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                step="any"
                                                autoFocus
                                                placeholder={`Enter amount (max ₹${(walletData?.available_balance ?? 0).toLocaleString('en-IN')})`}
                                                value={withdrawAmount}
                                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                                            />
                                            {withdrawAmountError && (
                                                <p className="text-red-500 text-[10px]">{withdrawAmountError}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-3 justify-end pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setShowWithdrawModal(false)}
                                                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-slate-800"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleConfirmWithdraw}
                                                disabled={withdrawing}
                                                className="px-4 py-2 rounded-lg text-white font-bold shadow-md active:scale-95 transition-all disabled:opacity-50"
                                                style={{ backgroundColor: 'hsl(215 55% 28%)' }}
                                            >
                                                {withdrawing ? 'Withdrawing...' : 'Confirm Withdrawal'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Mobile Filters Section (sm:hidden) */}
                        <div className="sm:hidden flex flex-col gap-2.5 pb-3 border-b border-border overflow-visible">
                            {/* Row 1: Search customer, lender, loan ID */}
                            <div className="relative w-full">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={earningSearchTerm}
                                    onChange={(e) => setEarningSearchTerm(e.target.value)}
                                    placeholder="Search customer, lender, loan ID"
                                    className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#5046E5]/20 shadow-xs placeholder:text-slate-400"
                                />
                                {earningSearchTerm && (
                                    <button type="button" onClick={() => setEarningSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Row 2: Category & Subcategory */}
                            <div className="grid grid-cols-2 gap-2 w-full">
                                <select
                                    value={earningCategory}
                                    onChange={(e) => {
                                        const newCat = e.target.value;
                                        setEarningCategory(newCat);
                                        setEarningSubcategory(newCat === 'Loan' ? 'Used Car Loan' : '');
                                        setEarningCaseTypeFilter('');
                                        setEarnings([]);
                                    }}
                                    className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition-all shadow-xs ${
                                        earningCategory
                                            ? 'border-blue-500 bg-blue-50/50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-500'
                                            : 'border-slate-200/90 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                                    }`}
                                >
                                    <option value="">Select Category</option>
                                    {earningCategoryOptions.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>

                                {hasEarningSubcategories ? (
                                    <select
                                        value={earningSubcategory}
                                        onChange={(e) => {
                                            setEarningSubcategory(e.target.value);
                                            setEarningCaseTypeFilter('');
                                        }}
                                        className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition-all shadow-xs ${
                                            earningSubcategory
                                                ? 'border-blue-500 bg-blue-50/50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-500'
                                                : 'border-slate-200/90 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                                        }`}
                                    >
                                        <option value="">All Subcategories</option>
                                        {earningSubcategoryList.map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <select
                                        value={earningPartnerRoleFilter}
                                        onChange={(e) => setEarningPartnerRoleFilter(e.target.value as 'all' | 'dsa' | 'advisor')}
                                        className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition-all shadow-xs ${
                                            earningPartnerRoleFilter !== 'all'
                                                ? 'border-blue-500 bg-blue-50/50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-500'
                                                : 'border-slate-200/90 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                                        }`}
                                    >
                                        <option value="all">All (DSA & Advisor)</option>
                                        <option value="dsa">DSA</option>
                                        <option value="advisor">Advisor</option>
                                    </select>
                                )}
                            </div>

                            {/* Row 3: Partner Role & Date Filter */}
                            <div className={`grid ${hasEarningSubcategories ? 'grid-cols-2' : 'grid-cols-1'} gap-2 w-full`}>
                                {hasEarningSubcategories && (
                                    <select
                                        value={earningPartnerRoleFilter}
                                        onChange={(e) => setEarningPartnerRoleFilter(e.target.value as 'all' | 'dsa' | 'advisor')}
                                        className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition-all shadow-xs ${
                                            earningPartnerRoleFilter !== 'all'
                                                ? 'border-blue-500 bg-blue-50/50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-500'
                                                : 'border-slate-200/90 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                                        }`}
                                    >
                                        <option value="all">All (DSA & Advisor)</option>
                                        <option value="dsa">DSA</option>
                                        <option value="advisor">Advisor</option>
                                    </select>
                                )}

                                {/* Date Filter Button & Popup */}
                                <div className="relative z-[100] w-full">
                                    <button
                                        type="button"
                                        ref={earningDateFilterMobileButtonRef}
                                        onClick={() => {
                                            setEarningDateFilterDraftFrom(appliedEarningDateFrom);
                                            setEarningDateFilterDraftTo(appliedEarningDateTo);
                                            setShowEarningDateFilter(prev => !prev);
                                        }}
                                        className={`w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border shadow-xs ${
                                            appliedEarningDateFrom || appliedEarningDateTo || showEarningDateFilter
                                                ? 'text-white shadow-sm border-transparent'
                                                : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                                        }`}
                                        style={(appliedEarningDateFrom || appliedEarningDateTo || showEarningDateFilter) ? { backgroundColor: 'hsl(215 55% 28%)' } : {}}
                                    >
                                        <div className="flex items-center gap-1.5 truncate">
                                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate">{getEarningDateFilterLabel()}</span>
                                        </div>
                                        <ChevronRight className={`w-3.5 h-3.5 text-slate-400 shrink-0 transform transition-transform ${showEarningDateFilter ? 'rotate-90' : ''}`} />
                                    </button>

                                    {showEarningDateFilter && (
                                        <div
                                            ref={earningDateFilterPopupRef}
                                            className="absolute left-0 top-full mt-1.5 z-[1000] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                                            style={{
                                                maxHeight: 'calc(100vh - 1.5rem)',
                                            }}
                                        >
                                            <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                                                <div>
                                                    <label className="mb-1 block font-semibold">From Date</label>
                                                    <input
                                                        type="date"
                                                        value={earningDateFilterDraftFrom}
                                                        onChange={(e) => setEarningDateFilterDraftFrom(e.target.value)}
                                                        onClick={(e) => { try { (e.target as any)?.showPicker?.(); } catch {} }}
                                                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block font-semibold">To Date</label>
                                                    <input
                                                        type="date"
                                                        value={earningDateFilterDraftTo}
                                                        onChange={(e) => setEarningDateFilterDraftTo(e.target.value)}
                                                        onClick={(e) => { try { (e.target as any)?.showPicker?.(); } catch {} }}
                                                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-end gap-2 pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={handleClearEarningDateFilter}
                                                        className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                                    >
                                                        Clear
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleApplyEarningDateFilter}
                                                        className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-white"
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Row 4: Status Filter + Actions */}
                            <div className="flex items-center justify-between w-full pt-0.5 gap-2">
                                {/* Left: Status Filter */}
                                <div className="flex items-center h-9 p-0.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800 text-xs font-bold shrink-0">
                                    {(['pending', 'paid'] as const).map((opt) => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setEarningStatusFilter(prev => prev === opt ? 'all' : opt)}
                                            className={`h-7.5 px-3 flex items-center justify-center rounded-lg transition-all capitalize ${
                                                earningStatusFilter === opt
                                                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-extrabold'
                                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                            }`}
                                        >
                                            {opt === 'pending' ? 'Pending' : 'Paid'}
                                        </button>
                                    ))}
                                </div>

                                {/* Right: Action Buttons */}
                                <div className="flex items-center gap-1.5 ml-auto">
                                    {(user?.role === 'admin' || user?.role === 'accountant') && selectedEarningIds.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteEarningsConfirm(true)}
                                            className="flex items-center gap-1 h-9 px-2.5 rounded-xl bg-red-600 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Delete ({selectedEarningIds.length})</span>
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => fetchEarnings()}
                                        title="Refresh Earnings"
                                        className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-200 shadow-xs active:scale-95 cursor-pointer ${
                                            loadingEarnings
                                                ? 'text-white shadow-sm border-transparent bg-indigo-600'
                                                : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${loadingEarnings ? 'animate-spin' : ''}`} />
                                    </button>

                                    <div className="relative z-50 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setShowEarningImportExport(prev => !prev)}
                                            title="Export / Import"
                                            className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-200 active:scale-95 shadow-xs ${
                                                showEarningImportExport
                                                    ? 'text-white shadow-sm border-transparent'
                                                    : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                                            }`}
                                            style={showEarningImportExport ? { backgroundColor: 'hsl(215 55% 28%)' } : {}}
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </button>

                                        {showEarningImportExport && (
                                            <div className="absolute right-0 top-full mt-1.5 z-50 w-36 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 shadow-xl">
                                                {(user?.role === 'admin' || user?.role === 'accountant') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowEarningImportExport(false);
                                                            if (earningImportRef.current) {
                                                                earningImportRef.current.click();
                                                            }
                                                        }}
                                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                                    >
                                                        <Upload className="w-3.5 h-3.5 text-blue-500" /> Import
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowEarningImportExport(false);
                                                        handleExportEarnings();
                                                    }}
                                                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 ${(user?.role === 'admin' || user?.role === 'accountant') ? 'mt-1' : ''}`}
                                                >
                                                    <Download className="w-3.5 h-3.5 text-emerald-500" /> Export
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Desktop Filters Section (hidden on mobile, unchanged for desktop) */}
                        <div className="hidden sm:flex sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3 sm:pb-4 border-b border-border overflow-visible">

                            {/* Left group: Search + Category + Subcategory */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                                <div className="relative w-full sm:w-[240px] sm:flex-none">
                                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={earningSearchTerm}
                                        onChange={(e) => setEarningSearchTerm(e.target.value)}
                                        placeholder="Search customer, lender, loan ID"
                                        className="w-full sm:w-[240px] rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                    />
                                </div>

                                {/* Category and Subcategory Dropdowns */}
                                <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 w-full sm:w-auto">
                                    <select
                                        value={earningCategory}
                                        onChange={(e) => {
                                            const newCat = e.target.value;
                                            setEarningCategory(newCat);
                                            setEarningSubcategory(newCat === 'Loan' ? 'Used Car Loan' : '');
                                            setEarningCaseTypeFilter('');
                                            setEarnings([]);
                                        }}
                                        className={`w-full sm:w-auto rounded-lg border px-2.5 py-1.5 text-xs font-medium outline-none transition-all ${
                                            earningCategory
                                                ? 'border-blue-500 bg-blue-50/40 text-blue-900 font-semibold dark:bg-blue-950/20 dark:text-blue-200 dark:border-blue-500'
                                                : 'border-gray-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                                        }`}
                                        title="Select Category"
                                    >
                                        <option value="">Select Category</option>
                                        {earningCategoryOptions.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>

                                    {hasEarningSubcategories && (
                                        <select
                                            value={earningSubcategory}
                                            onChange={(e) => {
                                                setEarningSubcategory(e.target.value);
                                                setEarningCaseTypeFilter('');
                                            }}
                                            className={`w-full sm:w-auto rounded-lg border px-2.5 py-1.5 text-xs font-medium outline-none transition-all ${
                                                earningSubcategory
                                                    ? 'border-blue-500 bg-blue-50/40 text-blue-900 font-semibold dark:bg-blue-950/20 dark:text-blue-200 dark:border-blue-500'
                                                : 'border-gray-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                                            }`}
                                            title="Select Subcategory"
                                        >
                                            <option value="">All Subcategories</option>
                                            {earningSubcategoryList.map(sub => (
                                                <option key={sub} value={sub}>{sub}</option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Partner Role Filter (All / DSA / Advisor) */}
                                    <select
                                        value={earningPartnerRoleFilter}
                                        onChange={(e) => setEarningPartnerRoleFilter(e.target.value as 'all' | 'dsa' | 'advisor')}
                                        className={`col-span-2 sm:col-span-1 w-full sm:w-auto rounded-lg border px-2.5 py-1.5 text-xs font-medium outline-none transition-all ${
                                            earningPartnerRoleFilter !== 'all'
                                                ? 'border-blue-500 bg-blue-50/40 text-blue-900 font-semibold dark:bg-blue-950/20 dark:text-blue-200 dark:border-blue-500'
                                                : 'border-gray-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                                        }`}
                                        title="Filter by Partner Role (All / DSA / Advisor)"
                                    >
                                        <option value="all">All (DSA & Advisor)</option>
                                        <option value="dsa">DSA</option>
                                        <option value="advisor">Advisor</option>
                                    </select>
                                </div>
                            </div>

                            {/* Right group: Date Filter + Status Filter + Refresh + Delete + Export */}
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 overflow-visible py-0.5 w-full sm:w-auto">
                                {/* Date Filter Button & Popup */}
                                <div className="relative z-[100] shrink-0">
                                    <button
                                        type="button"
                                        ref={earningDateFilterButtonRef}
                                        onClick={() => {
                                            setEarningDateFilterDraftFrom(appliedEarningDateFrom);
                                            setEarningDateFilterDraftTo(appliedEarningDateTo);
                                            setShowEarningDateFilter(prev => !prev);
                                        }}
                                        className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 sm:gap-2 border ${
                                            appliedEarningDateFrom || appliedEarningDateTo || showEarningDateFilter
                                                ? 'text-white shadow-md border-transparent'
                                                : 'bg-white text-gray-700 border-gray-200/60 hover:bg-gray-50 hover:text-gray-900 dark:bg-slate-800 dark:text-gray-200 dark:border-slate-700'
                                        }`}
                                        style={(appliedEarningDateFrom || appliedEarningDateTo || showEarningDateFilter) ? { backgroundColor: 'hsl(215 55% 28%)' } : {}}
                                    >
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{getEarningDateFilterLabel()}</span>
                                    </button>

                                    {showEarningDateFilter && (
                                        <div
                                            ref={earningDateFilterPopupRef}
                                            className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 z-[1000] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                                            style={{
                                                maxHeight: 'calc(100vh - 1.5rem)',
                                            }}
                                        >
                                            <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                                                <div>
                                                    <label className="mb-1 block font-semibold">From Date</label>
                                                    <input
                                                        type="date"
                                                        value={earningDateFilterDraftFrom}
                                                        onChange={(e) => setEarningDateFilterDraftFrom(e.target.value)}
                                                        onClick={(e) => { try { (e.target as any)?.showPicker?.(); } catch {} }}
                                                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block font-semibold">To Date</label>
                                                    <input
                                                        type="date"
                                                        value={earningDateFilterDraftTo}
                                                        onChange={(e) => setEarningDateFilterDraftTo(e.target.value)}
                                                        onClick={(e) => { try { (e.target as any)?.showPicker?.(); } catch {} }}
                                                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-end gap-2 pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={handleClearEarningDateFilter}
                                                        className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                                    >
                                                        Clear
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleApplyEarningDateFilter}
                                                        className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-white"
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Status Filter */}
                                <div className="shrink-0 flex items-center rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 text-xs font-bold">
                                    {(['pending', 'paid'] as const).map((opt) => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setEarningStatusFilter(prev => prev === opt ? 'all' : opt)}
                                            className={`px-3 py-1.5 transition-all duration-200 capitalize border-transparent ${
                                                earningStatusFilter === opt
                                                    ? 'text-white shadow-md'
                                                    : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:bg-slate-800 dark:text-gray-200'
                                            }`}
                                            style={earningStatusFilter === opt ? { backgroundColor: 'hsl(215 55% 28%)' } : {}}
                                        >
                                            {opt === 'pending' ? 'Pending' : 'Paid'}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => fetchEarnings()}
                                    className={`shrink-0 flex items-center gap-1.5 sm:gap-2 font-bold text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 shadow-sm active:scale-95 cursor-pointer ${
                                        loadingEarnings
                                            ? 'text-white shadow-md border-transparent'
                                            : 'bg-white text-gray-700 border-gray-200/60 hover:bg-gray-50 hover:text-gray-900 dark:bg-slate-800 dark:text-gray-200 dark:border-slate-700'
                                    }`}
                                    style={loadingEarnings ? { backgroundColor: 'hsl(215 55% 28%)' } : {}}
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${loadingEarnings ? 'animate-spin' : ''}`} />
                                    <span>Refresh</span>
                                </button>

                                {(user?.role === 'admin' || user?.role === 'accountant') && (
                                    <button
                                        type="button"
                                        onClick={() => selectedEarningIds.length > 0 && setShowDeleteEarningsConfirm(true)}
                                        disabled={selectedEarningIds.length === 0}
                                        className={`shrink-0 flex items-center gap-1.5 sm:gap-2 font-bold text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 shadow-sm active:scale-95 cursor-pointer ${
                                            selectedEarningIds.length > 0
                                                ? 'bg-red-600 text-white border-transparent hover:bg-red-700'
                                                : 'bg-white text-gray-400 border-gray-200/60 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700'
                                        }`}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete{selectedEarningIds.length > 0 ? ` (${selectedEarningIds.length})` : ''}</span>
                                    </button>
                                )}

                                <div className="relative z-50 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setShowEarningImportExport(prev => !prev)}
                                        className={`flex items-center justify-center w-8 h-8 rounded-xl border transition-all duration-200 active:scale-95 shadow-sm ${
                                            showEarningImportExport
                                                ? 'text-white shadow-md border-transparent'
                                                : 'bg-white text-gray-700 border-gray-200/60 hover:bg-gray-50 hover:text-gray-900 dark:bg-slate-800 dark:text-gray-200 dark:border-slate-700'
                                        }`}
                                        style={showEarningImportExport ? { backgroundColor: 'hsl(215 55% 28%)' } : {}}
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        
                                    </button>

                                    {showEarningImportExport && (
                                        <div className="absolute right-0 top-full mt-2 z-50 w-36 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                                            {(user?.role === 'admin' || user?.role === 'accountant') && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowEarningImportExport(false);
                                                        if (earningImportRef.current) {
                                                            earningImportRef.current.click();
                                                        }
                                                    }}
                                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                                >
                                                    <Upload className="w-3.5 h-3.5" /> Import
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowEarningImportExport(false);
                                                    handleExportEarnings();
                                                }}
                                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 ${(user?.role === 'admin' || user?.role === 'accountant') ? 'mt-1' : ''}`}
                                            >
                                                <Download className="w-3.5 h-3.5" /> Export
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Scrollable Table Section */}
                        <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
                            {loadingEarnings && earnings.length === 0 ? (

                            <div className="py-20 text-center text-gray-400 dark:text-gray-600 bg-gray-50/20 dark:bg-slate-900/10 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl animate-pulse">

                                Loading earnings...

                            </div>

                        ) : !earningCategory ? (
                            <div className="py-20 text-center text-gray-500 dark:text-gray-400 bg-gray-50/20 dark:bg-slate-900/10 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2">
                                <Info className="w-8 h-8 text-blue-500/70 dark:text-blue-400/70" />
                                <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">Please select a category to view earnings</p>
                                <p className="text-xs text-gray-400">Choose Loan from the filter above</p>
                            </div>
                        ) : earningsLoadFailed ? (
                            <div className="py-20 text-center text-gray-500 dark:text-gray-400 bg-gray-50/20 dark:bg-slate-900/10">
                                <p className="font-semibold text-sm">Couldn't load earnings.</p>
                                <button onClick={() => fetchEarnings()} className="mt-2 text-xs font-semibold underline">Try again</button>
                            </div>
                        ) : earnings.length === 0 ? (

                            <div className="py-20 text-center text-gray-400 dark:text-gray-600 bg-gray-50/20 dark:bg-slate-900/10 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl">

                                No earnings records found yet.

                            </div>

                        ) : (
                          <>
                                                        {(user?.role === 'dsa' || isPartnerWalletRole) && (
                                                            <div className="md:hidden space-y-3 pb-32">
                                                                {earnings.map((row, idx) => {
                                                                    const vehicleNumber = row.vehicle_number ? String(row.vehicle_number).trim().toUpperCase() : '';
                                                                    const modelOrMaker = (row.maker_model || row.model_variant_name || row.maker_name) ? String(row.maker_model || row.model_variant_name || row.maker_name).trim().toUpperCase() : '';
                                                                    const vehicleDetails = [vehicleNumber, modelOrMaker ? `(${modelOrMaker})` : ''].filter(Boolean).join(' ');
                                                                    const status = row.status ? String(row.status).toUpperCase() : '—';
                                                                    const isApproved = status.toLowerCase() === 'approved';

                                                                    const isCC = isCreditCardEarning(row);
                                                                    return (
                                                                        <article key={row.id ?? idx} className="rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition-all overflow-hidden uppercase">
                                                                            <div className="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
                                                                                <div className="min-w-0 flex-1">
                                                                                    <h3 className="break-words text-sm font-bold leading-tight text-gray-900 dark:text-white uppercase">
                                                                                        {row.customer_name ? String(row.customer_name).toUpperCase() : '—'}
                                                                                    </h3>
                                                                                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                                                        <span className="text-[11px] text-muted-foreground uppercase">{isCC ? 'LEAD ID' : 'LOAN ID'}:</span>
                                                                                        <span className="font-mono text-[10px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase">
                                                                                            {isCC ? String(row.lead_code || row.customer_id || (row.loan_number?.startsWith('LD-') ? row.loan_number : (row.lead_id ? `LD-${row.lead_id}` : (row.loan_number || '—')))).toUpperCase() : String(row.loan_number || row.loan_id || '—').toUpperCase()}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide border uppercase ${
                                                                                    isApproved 
                                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
                                                                                        : 'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                                                                }`}>
                                                                                    {status}
                                                                                </span>
                                                                            </div>
                                                                            {isCC ? (
                                                                                <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3">
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Approved Date</p>
                                                                                        <p className="mt-0.5 break-words text-xs font-semibold text-gray-800 dark:text-gray-200 uppercase">{formatDisplayDate(row.approval_date || row.card_issued_date || row.disbursement_date || row.created_at)}</p>
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Bank</p>
                                                                                        <p className="mt-0.5 break-words text-xs font-semibold text-gray-800 dark:text-gray-200 uppercase">{row.bank_name ? String(row.bank_name).toUpperCase() : '—'}</p>
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Product</p>
                                                                                        <p className="mt-0.5 break-words text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">{String(row.product_subcategory || row.card_name || 'Credit Card').toUpperCase()}</p>
                                                                                        {row.card_variant && <div className="text-[9px] text-muted-foreground truncate uppercase">({String(row.card_variant).toUpperCase()})</div>}
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Application No</p>
                                                                                        <p className="mt-0.5 break-words text-xs font-mono font-medium text-gray-800 dark:text-gray-200 uppercase">{row.application_no ? String(row.application_no).toUpperCase() : '—'}</p>
                                                                                    </div>
                                                                                    <div className="min-w-0 col-span-2 flex items-center justify-between pt-1 border-t border-gray-100 dark:border-slate-800/60">
                                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cust Type & KYC:</span>
                                                                                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200 uppercase">
                                                                                            {((row.cust_type && !['-', 'new', 'individual', 'none', 'null'].includes(String(row.cust_type).trim().toLowerCase())) ? String(row.cust_type).toUpperCase() : '-')}
                                                                                            <span className="ml-1 text-muted-foreground italic text-[10px] uppercase">
                                                                                                ({(row.bkyc_status || '').toUpperCase() === 'COMPLETED' ? 'BKYC' : ((row.vkyc_status || '').toUpperCase() === 'COMPLETED' ? 'VKYC' : 'PENDING')})
                                                                                            </span>
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="min-w-0 col-span-2 flex items-center justify-between">
                                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Activation Status:</span>
                                                                                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                                                                                            String(row.activation_status || '').toLowerCase() === 'active' || String(row.activation_status || '').toLowerCase() === 'activated'
                                                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                                                                                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                                                                                        }`}>
                                                                                            {row.activation_status ? String(row.activation_status).toUpperCase() : 'PENDING'}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3">
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Disbursement Date</p>
                                                                                        <p className="mt-0.5 break-words text-xs font-semibold text-gray-800 dark:text-gray-200 uppercase">{formatDisplayDate(row.disbursement_date || row.created_at || '—')}</p>
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Lender</p>
                                                                                        <p className="mt-0.5 break-words text-xs font-semibold text-gray-800 dark:text-gray-200 uppercase">
                                                                                            {row.bank_name ? String(row.bank_name).toUpperCase() : '—'}
                                                                                            {row.case_type && (
                                                                                                <span className="inline-block text-[9px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded ml-1 uppercase">
                                                                                                    {String(row.case_type).toUpperCase()}
                                                                                                </span>
                                                                                            )}
                                                                                        </p>
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Vehicle Details</p>
                                                                                        <p className="mt-0.5 break-words text-xs font-semibold text-gray-800 dark:text-gray-200 uppercase">{vehicleDetails || '—'}</p>
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">PDD Status</p>
                                                                                        <p className="mt-0.5 text-xs font-semibold">
                                                                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                                                                (row.pdd_status || '').toLowerCase() === 'collected' || (row.pdd_status || '').toLowerCase() === 'approved' || (row.pdd_status || '').toLowerCase() === 'completed'
                                                                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                                                                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                                                                            }`}>
                                                                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                                                                    (row.pdd_status || '').toLowerCase() === 'collected' || (row.pdd_status || '').toLowerCase() === 'approved' || (row.pdd_status || '').toLowerCase() === 'completed'
                                                                                                        ? 'bg-emerald-500'
                                                                                                        : 'bg-amber-500'
                                                                                                }`} />
                                                                                                {row.pdd_status ? String(row.pdd_status).toUpperCase() : 'PENDING'}
                                                                                            </span>
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            <div className={`mt-3.5 ${isCC ? 'flex items-center justify-between' : 'grid grid-cols-3 gap-2'} rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/20 dark:from-slate-800/50 dark:to-slate-800/20 border border-slate-100 dark:border-slate-800/80 p-2.5 text-center`}>
                                                                                {!isCC && (
                                                                                    <>
                                                                                        <div className="min-w-0">
                                                                                            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Loan Amount</p>
                                                                                            <p className="mt-0.5 break-words text-xs font-bold text-gray-900 dark:text-white">
                                                                                                ₹{Number(row.original_amount ?? row.loan_amount ?? row.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                            </p>
                                                                                        </div>
                                                                                        <div className="min-w-0">
                                                                                            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Payout %</p>
                                                                                            <p className="mt-0.5 break-words text-xs font-extrabold text-[#0024A2] dark:text-blue-400">
                                                                                                {row.new_base_payout != null && row.new_base_payout !== '' ? `${parseFloat(row.new_base_payout).toFixed(2)}%` : '—'}
                                                                                            </p>
                                                                                        </div>
                                                                                    </>
                                                                                )}
                                                                                <div className="min-w-0">
                                                                                    <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Payout Amount</p>
                                                                                    <p className="mt-0.5 break-words text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                                                                                        ₹{Number(row.net_amount ?? row.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </article>
                                    );
                                })}
                            </div>
                        )}
                        <table className={`${(user?.role === 'dsa' || isPartnerWalletRole) ? 'hidden md:table' : ''} w-full min-w-[1280px] text-xs`} style={{ tableLayout: 'fixed' }}>
                              {earningCategory === 'Credit Card' ? (
                                <colgroup>
                                  {(user?.role === 'admin' || user?.role === 'accountant') ? <col style={{ width: '4%' }} /> : null}
                                  <col style={{ width: '9%' }} /> {/* Approved Date */}
                                  {user?.role !== 'dsa' ? <col style={{ width: '12%' }} /> : null} {/* Partner */}
                                  <col style={{ width: '9%' }} /> {/* Lead ID */}
                                  <col style={{ width: '12%' }} /> {/* Customer */}
                                  <col style={{ width: '10%' }} /> {/* Application No */}
                                  <col style={{ width: '16%' }} /> {/* Bank & Product */}
                                  <col style={{ width: '10%' }} /> {/* Cust Type & KYC */}
                                  <col style={{ width: '8%' }} /> {/* Activation Status */}
                                  <col style={{ width: '9%' }} /> {/* Payout Amt */}
                                  <col style={{ width: '7%' }} /> {/* Status */}
                                  {user?.role !== 'dsa' ? <col style={{ width: '8%' }} /> : null} {/* Action */}
                                </colgroup>
                              ) : (
                                <colgroup>
                                  {(user?.role === 'admin' || user?.role === 'accountant') ? <col style={{ width: '4%' }} /> : null}
                                  <col style={{ width: '8%' }} />
                                  {user?.role !== 'dsa' ? <col style={{ width: '10%' }} /> : null}
                                  <col style={{ width: '9%' }} />
                                  <col style={{ width: '11%' }} />
                                  <col style={{ width: '10%' }} />
                                  <col style={{ width: '10%' }} />
                                  <col style={{ width: '8%' }} />
                                  <col style={{ width: '10%' }} />
                                  <col style={{ width: '9%' }} />
                                  <col style={{ width: '7%' }} />
                                  <col style={{ width: '11%' }} />
                                  <col style={{ width: '8%' }} />
                                  {user?.role !== 'dsa' ? <col style={{ width: '12%' }} /> : null}
                                </colgroup>
                              )}
                              <thead className="sticky top-0 z-20">
                                <tr className="border-b border-border">
                                  {(user?.role === 'admin' || user?.role === 'accountant') ? (
                                    <th className="text-center py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border overflow-hidden text-ellipsis">
                                      <input
                                        type="checkbox"
                                        checked={allEarningsSelected}
                                        onChange={handleSelectAllEarnings}
                                        onClick={(e) => e.stopPropagation()}
                                        title="Select all"
                                      />
                                    </th>
                                  ) : null}
                                  {earningCategory === 'Credit Card' ? (
                                    <>
                                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Approved Date</th>
                                      {user?.role !== 'dsa' ? (
                                        <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Partner</th>
                                      ) : null}
                                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Lead ID</th>
                                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Customer</th>
                                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Application No</th>
                                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Bank & Product</th>
                                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Cust Type & KYC</th>
                                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Activation Status</th>
                                      <th className="text-right py-2 px-3 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Payout Amt</th>
                                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Status</th>
                                      {user?.role !== 'dsa' ? (
                                        <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Action</th>
                                      ) : null}
                                    </>
                                  ) : (
                                    <>
                                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Disb. Date</th>
                                      {user?.role !== 'dsa' ? (
                                        <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Partner</th>
                                      ) : null}
                                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Loan ID</th>
                                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Applicant</th>
                                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Vehicle Details</th>
                                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Lender</th>
                                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Case Type</th>
                                      <th className="text-right py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Loan Amount</th>
                                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground whitespace-normal text-[10px] bg-[#edf4f8] border-b border-border">PDD Status</th>
                                      <th className="text-right py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Payout %</th>
                                      <th className="text-right py-2 px-6 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Payout Amt</th>
                                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Status</th>
                                      {user?.role !== 'dsa' ? (
                                        <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground whitespace-nowrap text-[10px] bg-[#edf4f8] border-b border-border">Action</th>
                                      ) : null}
                                    </>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {earnings.map((row, idx) => {
                                  const isEditing = editingEarningId === row.id;
                                  return (
                                    <tr key={row.id ?? idx} className={`border-b border-border/50 ${!isEditing ? 'hover:bg-muted/30 transition-colors' : 'bg-blue-50/30 dark:bg-blue-950/10'} group cursor-pointer h-[4.5rem]`}>
                                      {(user?.role === 'admin' || user?.role === 'accountant') ? (
                                        <td className="py-0.5 px-1.5 text-center align-top overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                          <div className="flex justify-center pt-5">
                                            {row.id != null ? (
                                              <input
                                                type="checkbox"
                                                checked={selectedEarningIds.includes(row.id)}
                                                onChange={() => toggleEarningSelection(row.id)}
                                                onClick={(e) => e.stopPropagation()}
                                              />
                                            ) : null}
                                          </div>
                                        </td>
                                      ) : null}
                                      {earningCategory === 'Credit Card' ? (
                                        <>
                                          {/* Approved Date */}
                                          <td className="py-0.5 px-1.5 align-top">
                                            <div className="flex flex-col pt-5">
                                              <p className="font-mono text-[10px] text-primary font-semibold whitespace-nowrap">
                                                {formatDisplayDate(row.approval_date || row.card_issued_date || row.disbursement_date || row.created_at)}
                                              </p>
                                            </div>
                                          </td>
                                          {/* Partner */}
                                          {user?.role !== 'dsa' ? (
                                            <td className="py-0.5 px-1.5 align-top">
                                              <div className="flex flex-col pt-5">
                                                <div className="font-medium text-foreground text-[10px] break-words leading-tight whitespace-normal uppercase" title={row.partner_name ? String(row.partner_name).toUpperCase() : undefined}>{row.partner_name ? String(row.partner_name).toUpperCase() : 'UNKNOWN'}</div>
                                                <div className={`inline-flex w-fit items-center rounded-full px-1 py-0.5 text-[7px] font-bold overflow-hidden h-3 ${
                                                  row.partner_role === 'DSA'
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                                                    : 'bg-blue-50 text-[#00b2ff] dark:bg-blue-950/20'
                                                }`}>
                                                  ({row.partner_role ? String(row.partner_role).toUpperCase() : "UNKNOWN"})
                                                </div>
                                                
                                              </div>
                                            </td>
                                          ) : null}
                                           {/* Lead ID */}
                                           <td className="py-0.5 px-1.5 align-top">
                                             <div className="flex flex-col pt-5">
                                               <p className="font-medium text-foreground text-[10px] uppercase whitespace-nowrap">
                                                 {row.lead_code || row.customer_id || (row.loan_number?.startsWith('LD-') ? row.loan_number : (row.lead_id ? `LD-${row.lead_id}` : (row.loan_number || '—')))}
                                               </p>
                                             </div>
                                           </td>
                                           {/* Customer */}
                                           <td className="py-0.5 px-1.5 align-top overflow-hidden">
                                             <div className="flex flex-col pt-5">
                                               <p className="font-medium text-foreground text-[10px] uppercase break-words leading-tight whitespace-normal" title={row.customer_name ? String(row.customer_name).toUpperCase() : undefined}>{row.customer_name ? String(row.customer_name).toUpperCase() : '—'}</p>
                                              {row.customer_phone ? (
                                                  <MaskedPhone phone={row.customer_phone} />
                                              ) : null}
                                            </div> 
                                          </td>
                                          {/* Application No */}
                                          <td className="py-0.5 px-1.5 align-top overflow-hidden">
                                            <div className="flex flex-col pt-5">
                                              <p className="font-mono text-foreground text-[10px] whitespace-nowrap overflow-hidden text-ellipsis h-4">
                                                {row.application_no ? String(row.application_no).toUpperCase() : '—'}
                                              </p>
                                            </div>
                                          </td>
                                           {/* Bank & Product */}
                                           <td className="py-0.5 px-1.5 align-top overflow-hidden">
                                             <div className="flex flex-col pt-5">
                                               <p className="font-medium text-foreground text-[10px] break-words leading-tight whitespace-normal">
                                                 {row.bank_name ? toTitleCase(row.bank_name) : '—'}
                                               </p>
                                               <div className="font-medium text-blue-600 dark:text-blue-400 text-[10px] break-words leading-tight whitespace-normal mt-0.5">
                                                 {String(row.product_subcategory || row.card_name || 'Credit Card').toUpperCase()}
                                               </div>
                                               {row.card_variant ? (
                                                 <div className="text-[8px] text-muted-foreground whitespace-normal">({String(row.card_variant).toUpperCase()})</div>
                                               ) : null}
                                             </div>
                                           </td>
                                          {/* Cust Type & KYC */}
                                          <td className="py-0.5 px-1.5 align-top overflow-hidden">
                                            <div className="flex flex-col pt-5">
                                              <div className="font-medium text-foreground text-[10px] whitespace-nowrap overflow-hidden text-ellipsis h-4">
                                                {(() => {
                                                  const ct = row.cust_type || row.custType;
                                                  const bkyc = (row.bkyc_status || row.bkycStatus || '').toUpperCase();
                                                  const vkyc = (row.vkyc_status || row.vkycStatus || '').toUpperCase();
                                                  const kyc = bkyc === 'COMPLETED' ? 'BKYC' : (vkyc === 'COMPLETED' ? 'VKYC' : 'PENDING');
                                                  const typeStr = (ct && !['-', 'new', 'individual', 'none', 'null'].includes(String(ct).trim().toLowerCase())) ? String(ct).trim().toUpperCase() : '-';
                                                  return (
                                                    <>
                                                      <span>{typeStr}</span>
                                                      <span className="ml-1 text-muted-foreground italic text-[9px]">
                                                        ({kyc})
                                                      </span>
                                                    </>
                                                  );
                                                })()}
                                              </div>
                                            </div>
                                          </td>
                                          {/* Activation Status */}
                                          <td className="py-0.5 px-1.5 align-top overflow-hidden">
                                            <div className="flex flex-col pt-5">
                                              <span className={`inline-flex w-fit items-center rounded-full px-1.5 py-0.5 text-[8px] font-bold ${
                                                String(row.activation_status || '').toLowerCase() === 'active' || String(row.activation_status || '').toLowerCase() === 'activated'
                                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                                              }`}>
                                                {row.activation_status ? String(row.activation_status).toUpperCase() : 'PENDING'}
                                              </span>
                                            </div>
                                          </td>
                                          {/* Payout Amt */}
                                          <td className="py-0.5 pr-4 pl-1.5 text-right font-medium text-foreground text-[10px] align-top overflow-hidden" onClick={(e) => isEditing && e.stopPropagation()}>
                                            {isEditing ? (
                                              <div className="flex flex-col pt-5">
                                                <input
                                                  type="number"
                                                  value={editingPayout}
                                                  onChange={(e) => handleEarningPayoutChange(e.target.value)}
                                                  placeholder="0.00"
                                                  className="w-full px-1 py-2 rounded-md border border-border bg-white dark:bg-slate-900 text-foreground text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary/50 h-6"
                                                />
                                              </div>
                                            ) : (
                                              <div className="flex flex-col pt-5">
                                                <span className="h-4 font-semibold text-emerald-600 dark:text-emerald-400">₹{parseFloat(row.net_amount ?? row.amount ?? 0).toFixed(2)}</span>
                                              </div>
                                            )}
                                          </td>
                                          {/* Status */}
                                          <td className="py-0.5 pl-2 pr-1.5 text-[10px] text-muted-foreground align-top overflow-visible relative" onClick={(e) => isEditing && e.stopPropagation()}>
                                            {isEditing ? (
                                              <div className="flex flex-col pt-5 relative h-6">
                                                <input
                                                  type="text"
                                                  value={editingRemark}
                                                  onChange={(e) => setEditingRemark(e.target.value)}
                                                  placeholder="Remark..."
                                                  title={editingError || 'Enter remark...'}
                                                  className={`absolute right-0 top-0 px-2 mt-5 py-1 rounded-md border text-foreground text-xs focus:outline-none focus:ring-1 h-6 ${
                                                    editingError
                                                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20 focus:ring-red-500'
                                                      : 'border-border bg-white dark:bg-slate-900 focus:ring-primary/50'
                                                  }`}
                                                  style={{
                                                    minWidth: '80px',
                                                    width: `${Math.max(80, editingRemark.length * 7 + 40)}px`,
                                                  }}
                                                />
                                              </div>
                                            ) : (
                                              <div className="flex flex-col pt-5">
                                                <span className="h-4 uppercase">{row.status ? String(row.status).toUpperCase() : '—'}</span>
                                              </div>
                                            )}
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          {/* Date - Primary on line 1, no secondary */}
                                          <td className="py-0.5 px-1.5 align-top">
                                            <div className="flex flex-col pt-5">
                                              <p className="font-mono text-[10px] text-primary font-semibold whitespace-nowrap">{formatDisplayDate(row.disbursement_date || row.created_at || '—')}</p>
                                            </div>
                                          </td> 
                                            
                                          {/* Partner - Line 1: Name, Line 2: Role Badge */}
                                           {user?.role !== 'dsa' ? (
                                             <td className="py-0.5 px-1.5 align-top">
                                               <div className="flex flex-col pt-5 uppercase">
                                                 <div className="font-medium text-foreground text-[10px] break-words leading-tight whitespace-normal uppercase" title={row.partner_name ? String(row.partner_name).toUpperCase() : undefined}>{row.partner_name ? String(row.partner_name).toUpperCase() : 'UNKNOWN'}</div>
                                                 <div className={`inline-flex w-fit items-center rounded-full px-1 py-0.5 text-[7px] font-bold overflow-hidden h-3 uppercase ${
                                                   row.partner_role === 'DSA'
                                                     ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                                                     : 'bg-blue-50 text-[#00b2ff] dark:bg-blue-950/20'
                                                 }`}>
                                                   ({row.partner_role ? String(row.partner_role).toUpperCase() : "UNKNOWN"})
                                                 </div>
                                                 
                                               </div>
                                             </td>
                                           ) : null}
                                           
                                           {/* Loan ID - Primary only, no secondary */}
                                          <td className="py-0.5 px-1.5 align-top">
                                            <div className="flex flex-col pt-5">
                                              <p className="font-medium text-foreground text-[10px] uppercase whitespace-nowrap">{String(row.loan_number || row.loan_id || '—').toUpperCase()}</p>
                                            </div>
                                          </td>
                                          
                                          {/* Applicant - Primary only, no secondary */}
                                          <td className="py-0.5 px-1.5 align-top">
                                            <div className="flex flex-col pt-5">
                                              <p className="font-medium text-foreground text-[10px] uppercase break-words leading-tight whitespace-normal" title={row.customer_name ? String(row.customer_name).toUpperCase() : undefined}>{row.customer_name ? String(row.customer_name).toUpperCase() : '—'}</p>
                                            </div> 
                                          </td>
                                          
                                          {/* Vehicle - Line 1: Number, Line 2: Maker */}
                                          <td className="py-0.5 px-1.5 align-top">
                                            <div className="flex flex-col pt-5">
                                              {(() => {
                                                const number = row.vehicle_number ? String(row.vehicle_number).trim() : '';
                                                const model = (row.maker_model || row.model_variant_name || row.maker_name) ? String(row.maker_model || row.model_variant_name || row.maker_name).trim() : '';
                                                if (!number && !model) {
                                                  return <p className="font-medium text-foreground text-[10px]">—</p>;
                                                }
                                                return (
                                                  <>
                                                    {number && <div className="font-semibold text-foreground text-[10px] uppercase whitespace-nowrap">{number.toUpperCase()}</div>}
                                                    {model && <div className="text-[8px] text-muted-foreground uppercase whitespace-normal break-words leading-tight mt-0.5">({model.toUpperCase()})</div>}
                                                  </>
                                                );
                                              })()}
                                            </div>
                                          </td>
                                          
                                          {/* Lender - Bank */}
                                          <td className="py-0.5 px-3 align-top overflow-hidden">
                                            <div className="flex flex-col pt-5">
                                              <div className="font-medium text-foreground text-[10px] uppercase break-words leading-tight whitespace-normal" title={row.bank_name ? String(row.bank_name).toUpperCase() : undefined}>
                                                {row.bank_name ? String(row.bank_name).toUpperCase() : '—'}
                                              </div>
                                            </div>
                                          </td>

                                          {/* Case Type */}
                                          <td className="py-0.5 px-1.5 align-top overflow-hidden">
                                            <div className="flex flex-col pt-5">
                                              <p className="font-medium text-foreground text-[10px] uppercase break-words leading-tight whitespace-normal" title={row.case_type ? String(row.case_type).toUpperCase() : undefined}>
                                                {row.case_type ? String(row.case_type).toUpperCase() : '—'}
                                              </p>
                                            </div>
                                          </td>
                                          
                                          {/* Loan Amount - Line 1: Amount, Line 2: ROI & Tenure */}
                                          <td className="py-0.5 px-1.5 text-right align-top overflow-hidden" onClick={(e) => isEditing && e.stopPropagation()}>
                                             {isEditing ? (
                                               <div className="flex flex-col pt-5">
                                                 <input
                                                   type="number"
                                                   value={editingLoanAmount}
                                                   onChange={(e) => handleEarningLoanAmountChange(e.target.value)}
                                                   placeholder="0.00"
                                                   className="w-full px-2 py-1 rounded-md border border-border bg-white dark:bg-slate-900 text-foreground text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary/50 h-6"
                                                 />
                                               </div>
                                             ) : (
                                              <div className="flex flex-col pt-5">
                                                <div className="font-medium text-foreground text-[10px] h-4">₹{parseFloat(row.original_amount ?? row.loan_amount ?? row.amount ?? 0).toFixed(2)}</div>
                                                {(row.loan_roi != null && row.loan_roi !== '') || row.loan_tenure ? (
                                                  <div className="text-[8px] text-muted-foreground truncate overflow-hidden h-3">
                                                    ({row.loan_roi != null && row.loan_roi !== '' ? `${parseFloat(row.loan_roi).toFixed(2)}%` : '—'}, {row.loan_tenure ? `${row.loan_tenure}M` : '—'})
                                                  </div>
                                                ) : null}
                                              </div>
                                            )}
                                          </td>
                                          
                                          {/* PDD Status - Primary only, no secondary */}
                                          <td className="py-1 px-1.5 text-left align-top overflow-hidden">
                                            <div className="flex flex-col pt-5">
                                              <div className="font-medium text-foreground text-[10px] break-words leading-tight whitespace-normal">
                                                {row.pdd_status && row.pdd_status !== '' ? String(row.pdd_status).toUpperCase() : 'PENDING'}
                                              </div>
                                            </div>
                                          </td>
                                          
                                          {/* NBP (Payout %) - Primary only, no secondary */}
                                          <td className="py-0.5 px-1.5 text-right align-top overflow-hidden" onClick={(e) => isEditing && e.stopPropagation()}>
                                             {isEditing ? (
                                               <div className="flex flex-col pt-5">
                                                 <input
                                                   type="number"
                                                   value={editingNewBasePayout}
                                                   onFocus={() => setManualPayoutEdit(false)}
                                                   onChange={(e) => handleEarningNbpChange(e.target.value)}
                                                   placeholder="0.00"
                                                   className="w-full px-2 py-1 rounded-md border border-border bg-white dark:bg-slate-900 text-foreground text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary/50 h-6"
                                                 />
                                               </div>
                                             ) : (
                                              <div className="flex flex-col pt-5">
                                                <p className="font-medium text-foreground text-[10px] h-4">{row.new_base_payout != null && row.new_base_payout !== '' ? `${parseFloat(row.new_base_payout).toFixed(2)}%` : '—'}</p>
                                              </div>
                                            )}
                                          </td>
                                          
                                          {/* Payout - Primary only, no secondary */}
                                          <td className="py-0.5 pr-8 pl-1.5 text-right font-medium text-foreground text-[10px] align-top overflow-hidden" onClick={(e) => isEditing && e.stopPropagation()}>
                                            {isEditing ? (
                                              <div className="flex flex-col pt-5">
                                                <input
                                                  type="number"
                                                  value={editingPayout}
                                                  onChange={(e) => handleEarningPayoutChange(e.target.value)}
                                                  placeholder="0.00"
                                                  className="w-full px-1 py-2 rounded-md border border-border bg-white dark:bg-slate-900 text-foreground text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary/50 h-6"
                                                />
                                              </div>
                                            ) : (
                                              <div className="flex flex-col pt-5">
                                                <span className="h-4">₹{parseFloat(row.net_amount ?? row.amount ?? 0).toFixed(2)}</span>
                                              </div>
                                            )}
                                          </td>
                                          
                                          {/* Status - Primary only, no secondary */}
                                          <td className="py-0.5 pl-4 pr-1.5 text-[10px] text-muted-foreground align-top overflow-visible relative" onClick={(e) => isEditing && e.stopPropagation()}>
                                            {isEditing ? (
                                              <div className="flex flex-col pt-5 relative h-6">
                                                <input
                                                  type="text"
                                                  value={editingRemark}
                                                  onChange={(e) => setEditingRemark(e.target.value)}
                                                  placeholder="Remark..."
                                                  title={editingError || 'Enter remark...'}
                                                  className={`absolute right-0 top-0 px-2 mt-5 py-1 rounded-md border text-foreground text-xs focus:outline-none focus:ring-1 h-6 ${
                                                    editingError
                                                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20 focus:ring-red-500'
                                                      : 'border-border bg-white dark:bg-slate-900 focus:ring-primary/50'
                                                  }`}
                                                  style={{
                                                    minWidth: '80px',
                                                    width: `${Math.max(80, editingRemark.length * 7 + 40)}px`,
                                                  }}
                                                />
                                              </div>
                                            ) : (
                                              <div className="flex flex-col pt-5">
                                                <span className="h-4 uppercase">{row.status ? String(row.status).toUpperCase() : '—'}</span>
                                              </div>
                                            )}
                                          </td>
                                        </>
                                      )}
                                      
                                      {/* Action */}
                                      {user?.role !== 'dsa' ? (
                                        <td className="py-0.5 px-1.5 align-top overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                          {isEditing ? (
                                            <div className="flex items-center gap-1 justify-start pt-5">
                                              {/* Save Icon */}
                                              <button
                                                type="button"
                                                onClick={() => handleSaveEarningUpdate()}
                                                disabled={savingEdit}
                                                className="p-1 rounded-md border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                                title="Save changes"
                                              >
                                                <Save size={14} />
                                              </button>
                                              
                                              {/* Cancel Icon */}
                                              <button
                                                type="button"
                                                onClick={() => closeEarningEditModal()}
                                                disabled={savingEdit}
                                                className="p-1 rounded-md border border-red-500 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                                title="Cancel editing"
                                              >
                                                <X size={14} />
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="flex items-start justify-start gap-1 pt-5">
                                              {user && (user.role === 'admin' || user.role === 'accountant') ? (
                                                <>
                                                  {/* Edit Icon */}
                                                  {(() => {
                                                    const isApprovedOrPaid = ['approved', 'paid'].includes(String(row.status || '').trim().toLowerCase());
                                                    return (
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          if (isApprovedOrPaid) {
                                                            toast.error('Approved earnings cannot be edited.');
                                                            return;
                                                          }
                                                          openEarningEditModal(row);
                                                        }}
                                                        disabled={isApprovedOrPaid || (editingEarningId !== null && editingEarningId !== row.id)}
                                                        className={`p-1 rounded-md border border-border bg-card text-xs font-medium flex-shrink-0 transition-colors ${
                                                          isApprovedOrPaid
                                                            ? 'opacity-30 cursor-not-allowed text-muted-foreground'
                                                            : 'text-foreground hover:bg-blue-500/10 disabled:opacity-40 disabled:cursor-not-allowed'
                                                        }`}
                                                        title={isApprovedOrPaid ? 'Approved earnings cannot be edited' : 'Edit Payout'}
                                                      >
                                                        <Edit2 size={11} className={isApprovedOrPaid ? 'text-gray-400' : 'text-blue-500'} />
                                                      </button>
                                                    );
                                                  })()}

                                                  {/* Info Icon */}
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <button
                                                        type="button"
                                                        className="p-1 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-accent/10 transition-colors flex-shrink-0"
                                                        title="View Edit History"
                                                      >
                                                        <Info size={11} className="text-accent" />
                                                      </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left" className="max-w-sm bg-slate-900 text-white dark:bg-slate-800 max-h-60 overflow-y-auto">
                                                      {(() => {
                                                        try {
                                                          if (!row.remarks || !row.remarks.trim()) {
                                                            return <p className="text-xs">No edit history available</p>;
                                                          }

                                                          const history = JSON.parse(row.remarks);
                                                          if (!Array.isArray(history)) {
                                                            return <p className="text-xs">{row.remarks}</p>;
                                                          }

                                                          return (
                                                            <div className="space-y-2">
                                                              {history.map((entry, idx) => (
                                                                <div key={idx} className="border-b border-slate-700 pb-2 last:border-0">
                                                                  <p className="text-xs font-semibold text-blue-300">
                                                                    Edit #{idx + 1} {entry.edited_by && `by ${entry.edited_by}`}
                                                                  </p>
                                                                  {entry.timestamp && (
                                                                    <p className="text-[10px] text-slate-400">
                                                                      {new Date(entry.timestamp).toLocaleString()}
                                                                    </p>
                                                                  )}
                                                                  {entry.user_remark && (
                                                                    <p className="text-xs mt-1 text-slate-100">
                                                                      Remark: {entry.user_remark}
                                                                    </p>
                                                                  )}
                                                                  {entry.changes && entry.changes.length > 0 && (
                                                                    <div className="text-xs mt-1 space-y-1">
                                                                      {entry.changes
                                                                        .filter((change: any) => {
                                                                          // For credit card earnings, never display Loan Amount or Payout %
                                                                          if (isCreditCardEarning(row)) {
                                                                            const field = (change.field_name || change.field || '').toLowerCase();
                                                                            if (field.includes('loan') || field.includes('payout %') || field.includes('nbp')) {
                                                                              return false;
                                                                            }
                                                                          }
                                                                          return true;
                                                                        })
                                                                        .map((change: any, cidx: number) => (
                                                                        <p key={cidx} className="text-slate-300">
                                                                          <span className="font-semibold">{change.field_name || change.field}:</span> {change.old_value} → {change.new_value}
                                                                        </p>
                                                                      ))}
                                                                    </div>
                                                                  )}
                                                                </div>
                                                              ))}
                                                            </div>
                                                          );
                                                        } catch (e) {
                                                          // Fallback for non-JSON remarks
                                                          return <p className="text-xs">{row.remarks || 'No remark available'}</p>;
                                                        }
                                                      })()}
                                                    </TooltipContent>
                                                  </Tooltip>

                                                  {/* Check Icon - Approve Action */}
                                                  {(row.status || '').toLowerCase() === 'pending' ? (
                                                    <button
                                                      type="button"
                                                      disabled={approvingIds.includes(row.id)}
                                                      onClick={() => handleApproveEarning(row.id)}
                                                      className="p-1 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-emerald-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                                      title="Approve Earning"
                                                    >
                                                      <Check size={14} className="text-emerald-600" />
                                                    </button>
                                                  ) : null}
                                                </>
                                              ) : null}
                                            </div>
                                          )}
                                        </td>
                                      ) : null}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>

                            {/* Mobile Pagination */}
                            {earningTotalPages > 1 && (
                              <div className="sm:hidden flex items-center justify-between pt-4 pb-32 px-2">
                                <button
                                  onClick={() => setEarningCurrentPage(prev => Math.max(prev - 1, 1))}
                                  disabled={earningCurrentPage === 1}
                                  className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card text-foreground disabled:opacity-50"
                                >
                                  Previous
                                </button>
                                <span className="text-sm text-muted-foreground">
                                  Page {earningCurrentPage} of {earningTotalPages}
                                </span>
                                <button
                                  onClick={() => setEarningCurrentPage(prev => Math.min(prev + 1, earningTotalPages))}
                                  disabled={earningCurrentPage === earningTotalPages}
                                  className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card text-foreground disabled:opacity-50"
                                >
                                  Next
                                </button>
                              </div>
                            )}

                            {/* Desktop Pagination */}
                            {earningTotalPages > 1 && (
                              <div className="hidden sm:flex items-center justify-between px-4 py-3 bg-card border-t border-border mt-2 rounded-xl sticky left-0 w-full">
                                <div className="flex flex-1 items-center justify-between">
                                  <div>
                                    <p className="text-sm text-muted-foreground">
                                      Showing <span className="font-medium">{(earningCurrentPage - 1) * earningItemsPerPage + 1}</span> to <span className="font-medium">{Math.min(earningCurrentPage * earningItemsPerPage, earningTotal)}</span> of{' '}
                                      <span className="font-medium">{earningTotal}</span> results
                                    </p>
                                  </div>
                                  <div>
                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                      <button
                                        onClick={() => setEarningCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={earningCurrentPage === 1}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border hover:bg-muted focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors"
                                      >
                                        <span className="sr-only">Previous</span>
                                        <ChevronRight className="h-4 w-4 rotate-180" aria-hidden="true" />
                                      </button>
                                      <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-foreground ring-1 ring-inset ring-border focus:z-20 focus:outline-offset-0 bg-accent/5">
                                        Page {earningCurrentPage} of {earningTotalPages}
                                      </span>
                                      <button
                                        onClick={() => setEarningCurrentPage(prev => Math.min(prev + 1, earningTotalPages))}
                                        disabled={earningCurrentPage === earningTotalPages}
                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border hover:bg-muted focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors"
                                      >
                                        <span className="sr-only">Next</span>
                                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                      </button>
                                    </nav>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        </div>

                    </div>

                )}

                {showDeleteEarningsConfirm && (user?.role === 'admin' || user?.role === 'accountant') && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50" onClick={() => !deletingEarnings && setShowDeleteEarningsConfirm(false)}>
                        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-base font-bold text-foreground">Delete Earnings</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Are you sure you want to delete <span className="font-bold text-foreground">{selectedEarningIds.length}</span> earning record(s)? This cannot be undone.
                            </p>
                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    type="button"
                                    disabled={deletingEarnings}
                                    onClick={() => setShowDeleteEarningsConfirm(false)}
                                    className="px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={deletingEarnings}
                                    onClick={handleDeleteEarnings}
                                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {deletingEarnings ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================================= PAYOUT TAB ================================= */}
                {activeTab === 'payout' && (
                    <div className="animate-fade-in">
                        {/* My Withdrawal Requests */}
                        <div className="rounded-2xl border border-gray-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md p-3 sm:p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-bold text-gray-900 dark:text-white">Withdrawal Requests</h3>
                                <span className="text-[10px] text-gray-400">Request ID · Status</span>
                            </div>
                            {loadingMyWithdrawals ? (
                                <div className="text-center py-8 text-[10px] text-gray-400">Loading...</div>
                            ) : myWithdrawals.length === 0 ? (
                                <div className="text-center py-8 text-[10px] text-gray-400">No withdrawal requests yet</div>
                            ) : (
                                <div className="space-y-2">
                                    {myWithdrawals.map((w: any) => {
                                        const st = (w.withdrawal_status || w.status || 'withdrawal_pending');
                                        const statusMeta = st === 'withdrawal_paid'
                                            ? { label: 'PAID', cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' }
                                            : st === 'withdrawal_rejected'
                                                ? { label: 'REJECTED', cls: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' }
                                                : { label: 'PENDING', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' };
                                        return (
                                            <div key={w.id} className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/40 px-3 py-2.5">
                                                <div>
                                                    <p className="text-[11px] font-bold text-gray-900 dark:text-white">#{w.id} · ₹{Number(w.payout_amount || 0).toLocaleString('en-IN')}</p>
                                                    <p className="text-[9px] text-gray-400">{new Date(w.created_at).toLocaleString('en-IN')}</p>
                                                </div>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold ${statusMeta.cls}`}>
                                                    {statusMeta.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                </div>
            </div>

            {/* ================================= FILTER MODAL (FLUTTER STYLED) ================================= */}
            {showFilterModal && (
                <div
                    className={`fixed inset-0 z-[100] bg-black/35 ${filterClosing ? 'flutter-fade-out' : 'flutter-fade-in'}`}
                    onClick={closeFilterModal}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={`mx-auto w-full max-w-xl bg-white dark:bg-slate-900 rounded-b-3xl shadow-[0_5px_10px_rgba(0,0,0,0.12)] overflow-hidden origin-top-right ${filterClosing ? 'flutter-pop-out' : 'flutter-pop-in'}`}
                    >
                        <div className="px-5 pb-5 pt-[calc(env(safe-area-inset-top,0px)+16px)] max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-[#1E293B] dark:text-white">
                                Filter {activeTab === 'reward' ? 'Reward Schemes' : activeTab === 'earning' ? 'Earnings' : 'Payout Requests'}
                            </h3>
                            <button
                                type="button"
                                onClick={closeFilterModal}
                                className="w-7 h-7 rounded-full bg-[#F1F5F9] dark:bg-slate-800 text-[#64748B] flex items-center justify-center active:scale-95 transition-transform"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="space-y-3 text-xs">
                            {/* ================= Reward Tab Filters ================= */}
                            {activeTab === 'reward' && (
                                <>
                                    {/* Payout Scheme */}
                                    {user?.role === 'admin' && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payout Scheme</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setActivePayoutType('base_payout')}
                                                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                                                        activePayoutType === 'base_payout'
                                                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 shadow-sm'
                                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    Base Payout
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setActivePayoutType('bonus')}
                                                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                                                        activePayoutType === 'bonus'
                                                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 shadow-sm'
                                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    Bonus Scheme
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Category */}
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                                        <select
                                            value={activePayoutType === 'bonus' ? bonusTopCategory : basePayoutTopCategory}
                                            onChange={(e) => {
                                                const cat = e.target.value;
                                                if (activePayoutType === 'bonus') {
                                                    setBonusTopCategory(cat);
                                                    setBonusLoanType('');
                                                    setBonusCategory(cat === 'loan' ? '' : cat);
                                                    setBonusLenders([]);
                                                    setBonusTableData({});
                                                } else {
                                                    setBasePayoutTopCategory(cat);
                                                    setBasePayoutLoanType(cat === 'loan' ? 'used_car_loan' : '');
                                                    setBasePayoutLenderId('');
                                                    setBasePayoutCategory(cat === 'loan' ? 'used_car_loan' : cat);
                                                }
                                            }}
                                            className="flutter-select w-full px-4 py-3.5 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E0531B]/20 text-sm font-semibold"
                                        >
                                            <option value="">Select Category</option>
                                            <option value="loan">Loan</option>
                                            
                                        </select>
                                    </div>

                                    {/* Subcategory */}
                                    {((activePayoutType === 'bonus' ? bonusTopCategory : basePayoutTopCategory) === 'loan') && (
                                        <div className="space-y-1.5 animate-fade-in">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sub-category</label>
                                            <select
                                                value={activePayoutType === 'bonus' ? bonusLoanType : basePayoutLoanType}
                                                onChange={(e) => {
                                                    const subcat = e.target.value;
                                                    if (activePayoutType === 'bonus') {
                                                        setBonusLoanType(subcat);
                                                        setBonusCategory(subcat);
                                                        setBonusLenders([]);
                                                        setBonusTableData({});
                                                    } else {
                                                        setBasePayoutLoanType(subcat);
                                                        setBasePayoutCategory(subcat);
                                                    }
                                                }}
                                                className="flutter-select w-full px-4 py-3.5 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E0531B]/20 text-sm font-semibold"
                                            >
                                                <option value="">Select Subcategory</option>
                                                <option value="used_car_loan">Used Car Loan</option>
                                                <option value="new_car_loan">New Car Loan</option>
                                                <option value="personal_loan">Personal Loan</option>
                                                <option value="business_loan">Business Loan</option>
                                                <option value="home_loan">Home Loan</option>
                                                <option value="loan_against_property">Loan Against Property</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Lender filter for Credit Card */}
                                    {((activePayoutType === 'bonus' ? bonusTopCategory : basePayoutTopCategory) === 'credit_card' || (activePayoutType === 'bonus' ? bonusCategory : basePayoutCategory) === 'credit_card') && (
                                        <div className="space-y-1.5 animate-fade-in">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lender (Bank)</label>
                                            <select
                                                value={basePayoutLenderId}
                                                onChange={(e) => setBasePayoutLenderId(e.target.value)}
                                                className="flutter-select w-full px-4 py-3.5 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E0531B]/20 text-sm font-semibold"
                                            >
                                                <option value="">All Lenders</option>
                                                <option value="all">All Lenders</option>
                                                {(activePayoutType === 'bonus' ? bonusLenders : baseLenders).map(l => (
                                                    <option key={l.id} value={l.id}>{l.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Bonus Target Partners */}
                                    {activePayoutType === 'bonus' && bonusCategory && (
                                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target Partners</label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveRewardDsa(!activeRewardDsa);
                                                        if (!activeRewardDsa) setSelectedDsas(dsaList.map(d => d.id));
                                                    }}
                                                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                                                        activeRewardDsa
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                                            : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
                                                    }`}
                                                >
                                                    {activeRewardDsa ? '✓ DSA Selected' : '+ Include DSA'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveRewardAdvisor(!activeRewardAdvisor);
                                                        if (!activeRewardAdvisor) setSelectedAdvisors(advisorList.map(a => a.id));
                                                    }}
                                                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                                                        activeRewardAdvisor
                                                            ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                                                            : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
                                                    }`}
                                                >
                                                    {activeRewardAdvisor ? '✓ Advisor Selected' : '+ Include Advisor'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ================= Earning Tab Filters ================= */}
                            {activeTab === 'earning' && (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                                        <select
                                            value={earningCategory}
                                            onChange={(e) => {
                                                const newCat = e.target.value;
                                                setEarningCategory(newCat);
                                                setEarningSubcategory(newCat === 'Loan' ? 'Used Car Loan' : '');
                                                setEarningCaseTypeFilter('');
                                            }}
                                            className="flutter-select w-full px-4 py-3.5 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E0531B]/20 text-sm font-semibold"
                                        >
                                            <option value="">All Categories</option>
                                            <option value="Loan">Loan</option>
                                            
                                        </select>
                                    </div>

                                    {earningCategory === 'Loan' && (
                                        <div className="space-y-1.5 animate-fade-in">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Subcategory</label>
                                            <select
                                                value={earningSubcategory}
                                                onChange={(e) => {
                                                    setEarningSubcategory(e.target.value);
                                                    setEarningCaseTypeFilter('');
                                                }}
                                                className="flutter-select w-full px-4 py-3.5 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E0531B]/20 text-sm font-semibold"
                                            >
                                                <option value="">All Subcategories</option>
                                                {loanSubcategoryOptions.map(sub => (
                                                    <option key={sub} value={sub}>{sub}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {earningSubcategory === 'Used Car Loan' && (
                                        <div className="space-y-1.5 animate-fade-in">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Case Type</label>
                                            <select
                                                value={earningCaseTypeFilter}
                                                onChange={(e) => setEarningCaseTypeFilter(e.target.value)}
                                                className="flutter-select w-full px-4 py-3.5 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E0531B]/20 text-sm font-semibold"
                                            >
                                                <option value="">All Case Types</option>
                                                <option value="Purchase">Purchase</option>
                                                <option value="Refinance">Refinance</option>
                                                <option value="BT/Top-Up">BT/Top-Up</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                                        <select
                                            value={earningStatusFilter}
                                            onChange={(e) => setEarningStatusFilter(e.target.value as any)}
                                            className="flutter-select w-full px-4 py-3.5 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E0531B]/20 text-sm font-semibold"
                                        >
                                            <option value="all">All Statuses</option>
                                            <option value="pending">Pending</option>
                                            <option value="paid">Paid</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* ================= Payout Tab Filters ================= */}
                            {activeTab === 'payout' && (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Partner Role</label>
                                        <select
                                            value={adminRoleFilter}
                                            onChange={(e) => setAdminRoleFilter(e.target.value)}
                                            className="flutter-select w-full px-4 py-3.5 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E0531B]/20 text-sm font-semibold"
                                        >
                                            <option value="all">All Roles</option>
                                            <option value="dsa">DSA</option>
                                            <option value="advisor">Advisor</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Request Status</label>
                                        <select
                                            value={adminStatusFilter}
                                            onChange={(e) => setAdminStatusFilter(e.target.value)}
                                            className="flutter-select w-full px-4 py-3.5 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E0531B]/20 text-sm font-semibold"
                                        >
                                            <option value="all">All Statuses</option>
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved / Paid</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center gap-3 mt-5">
                            <button
                                type="button"
                                onClick={() => {
                                    if (activeTab === 'reward') {
                                        setBasePayoutTopCategory('loan');
                                        setBasePayoutLoanType('used_car_loan');
                                        setBasePayoutCategory('used_car_loan');
                                        setBasePayoutLenderId('');
                                        setBonusTopCategory('');
                                        setBonusLoanType('');
                                        setBonusCategory('');
                                        setRewardSearchTerm('');
                                    } else if (activeTab === 'earning') {
                                        setEarningCategory('Loan');
                                        setEarningSubcategory('Used Car Loan');
                                        setEarningCaseTypeFilter('');
                                        setEarningStatusFilter('all');
                                    } else {
                                        setAdminRoleFilter('all');
                                        setAdminStatusFilter('all');
                                    }
                                    closeFilterModal();
                                }}
                                className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#64748B] bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 active:scale-[0.98] transition-transform"
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={closeFilterModal}
                                className="flex-[2] py-3 rounded-xl text-[15px] font-bold text-white bg-[#E0531B] hover:bg-[#CC4A16] active:scale-[0.98] transition-all"
                            >
                                Apply Filters
                            </button>
                        </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================= PAYOUT CALCULATOR MODAL ================================= */}
            {showCalcModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto sm:max-h-none sm:overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <Calculator className="w-5 h-5 text-primary" />
                                <h3 className="text-md font-bold text-gray-900 dark:text-white">Payout Calculator</h3>
                            </div>
                            <button onClick={() => setShowCalcModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={(e) => e.preventDefault()} className="p-6 space-y-4 text-xs">
                            {/* Expected Loan Amount (INR) on the top */}
                            <div className="space-y-1.5">
                                <label className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                    Expected Loan Amount (INR) <span className="text-red-500 font-extrabold">*</span>
                                </label>
                                <input 
                                    type="number" 
                                    required
                                    placeholder="e.g. 1000000"
                                    value={calcLoanAmount}
                                    onChange={(e) => setCalcLoanAmount(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            {/* Bank Selection & Product Selection Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Bank Selection */}
                                <div className="space-y-1.5">
                                    <label className="font-bold text-gray-700 dark:text-gray-300">Select Bank</label>
                                    <div className="flex items-center gap-2">
                                        <select 
                                            value={calcBank}
                                            onChange={(e) => {
                                                setCalcBank(e.target.value);
                                                setCalcProduct('new_car');
                                            }}
                                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
                                        >
                                            <option value="au">AU Small Finance Bank (AU Bank)</option>
                                            <option value="axis">Axis Bank</option>
                                            <option value="default">General Financier (Default)</option>
                                        </select>
                                        <div className="px-2 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary font-extrabold font-mono text-[10px] whitespace-nowrap text-center">
                                            {calcBank === 'au' ? '12% - 18%' : calcBank === 'axis' ? '10% - 16%' : '16% Base'}
                                        </div>
                                    </div>
                                </div>

                                {/* Product Selection */}
                                <div className="space-y-1.5">
                                    <label className="font-bold text-gray-700 dark:text-gray-300">Select Loan Product</label>
                                    <div className="flex items-center gap-2">
                                        <select 
                                            value={calcProduct}
                                            onChange={(e) => setCalcProduct(e.target.value)}
                                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
                                        >
                                            <option value="new_car">New Car Purchase</option>
                                            <option value="used_car">Used Car Purchase</option>
                                            <option value="refinance">Used Car Refinance Up</option>
                                            <option value="topup">Used Car BT/Top Up</option>
                                        </select>
                                        <div className="px-2 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-extrabold font-mono text-[10px] whitespace-nowrap text-center">
                                            {(bankProductsConfig[calcBank]?.[calcProduct]?.baseRacc || 0).toFixed(1)}% RACC
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sliders Grid Row (Reduced height & side-by-side layout) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* RACC Rate Slider */}
                                <div className="space-y-1.5 bg-gray-50/50 dark:bg-slate-900/40 p-2.5 border border-gray-100 dark:border-slate-800 rounded-lg">
                                    <div className="flex justify-between items-center mb-0.5 text-[11px]">
                                        <span className="font-bold text-gray-600 dark:text-gray-400">RACC Rate (%)</span>
                                        <span className="font-mono font-extrabold text-primary">{calcRaccRate.toFixed(2)}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min={bankProductsConfig[calcBank]?.[calcProduct]?.minRate || 0.25} 
                                        max={bankProductsConfig[calcBank]?.[calcProduct]?.baseRacc || 16} 
                                        step="0.25"
                                        value={calcRaccRate}
                                        onChange={(e) => setCalcRaccRate(parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <div className="flex justify-between text-[9px] text-gray-400">
                                        <span>Min: {(bankProductsConfig[calcBank]?.[calcProduct]?.minRate || 0.25).toFixed(2)}%</span>
                                        <span>Max: {(bankProductsConfig[calcBank]?.[calcProduct]?.baseRacc || 16).toFixed(2)}%</span>
                                    </div>
                                </div>

                                {/* Tenure Slider */}
                                <div className="space-y-1.5 bg-gray-50/50 dark:bg-slate-900/40 p-2.5 border border-gray-100 dark:border-slate-800 rounded-lg">
                                    <div className="flex justify-between items-center mb-0.5 text-[11px]">
                                        <span className="font-bold text-gray-600 dark:text-gray-400">Tenure (Months)</span>
                                        <span className="font-mono font-extrabold text-primary">{calcTenure} months</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="36" 
                                        step="1"
                                        value={calcTenure}
                                        onChange={(e) => setCalcTenure(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <div className="flex justify-between text-[9px] text-gray-400">
                                        <span>Min: 1 month</span>
                                        <span>Max: 36 months</span>
                                    </div>
                                </div>
                            </div>

                            {/* Dynamic Live Result Display */}
                            {calcResult && (
                                <div className="space-y-2 pt-1 animate-fade-in">
                                    {/* Effective Commission Breakdown */}
                                    <div className="p-3 bg-gray-50/55 dark:bg-slate-900/80 border border-gray-150 dark:border-slate-800/85 rounded-xl space-y-1.5">
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-gray-400 font-semibold uppercase tracking-wider text-[8px]">Selected Product:</span>
                                            <span className="font-bold text-gray-800 dark:text-gray-200">{calcResult.productName}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-gray-400 font-semibold uppercase tracking-wider text-[8px]">RACC Rate Factor:</span>
                                            <span className="font-bold text-gray-800 dark:text-gray-200">
                                                {calcResult.racc.toFixed(2)}% / {calcResult.baseRate.toFixed(2)}% ({(calcResult.racc / calcResult.baseRate).toFixed(2)}x)
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-gray-400 font-semibold uppercase tracking-wider text-[8px]">Tenure Factor:</span>
                                            <span className="font-bold text-gray-800 dark:text-gray-200">
                                                {calcResult.tenure}m / 36m ({(calcResult.tenure / 36).toFixed(2)}x)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Estimated Commission Banner */}
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 rounded-xl text-center shadow-inner">
                                        <span className="text-gray-500 dark:text-gray-400 font-medium block text-[9px] uppercase tracking-wider">Estimated Payout Commission</span>
                                        <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                                            ₹{calcResult.commissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Modal Footer (Edit Bank/NBFC styled Cancel & Confirm buttons panel) */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/10 px-6 py-3.5 -mx-6 -mb-6">
                                <button 
                                    type="button"
                                    onClick={() => setShowCalcModal(false)}
                                    className="px-4 py-2 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-slate-850 active:scale-95 transition-all text-xs"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setShowCalcModal(false)}
                                    className="px-4 py-2 bg-primary hover:bg-opacity-95 text-white font-bold rounded-lg active:scale-95 transition-all text-xs shadow-sm"
                                >
                                    Close Calculator
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================================= SLAB DETAILS MODAL ================================= */}
            {showSlabModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                        {/* Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
                            <div className="flex items-center gap-2">
                                <HelpCircle className="w-5 h-5 text-primary" />
                                <h3 className="text-md font-bold text-gray-900 dark:text-white">Configure Commission Slab Rates</h3>
                            </div>
                            <button onClick={() => setShowSlabModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 text-xs overflow-y-auto flex-1">

                            {/* ── Row 1: Category + Subcategory + Lenders + Target Role ── */}
                            <div className="flex flex-wrap items-end gap-3 pb-5 border-b border-gray-100 dark:border-slate-800">

                                {/* Category */}
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pl-0.5">Category</span>
                                    <select
                                        value={slabCategory}
                                        onChange={(e) => {
                                            setSlabCategory(e.target.value);
                                            setSlabSubcategory(e.target.value === 'loan' ? (subcategoryOptions[0] || '') : '');
                                        }}
                                        className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold w-36 shadow-sm"
                                    >
                                        <option value="loan">Loan</option>
                                        
                                    </select>
                                </div>

                                {/* Subcategory */}
                                {slabCategory === 'loan' && (
                                    <div className="flex flex-col gap-1.5 animate-fade-in">
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pl-0.5">Subcategory</span>
                                        <select
                                            value={slabSubcategory}
                                            onChange={(e) => setSlabSubcategory(e.target.value)}
                                            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold w-48 shadow-sm"
                                        >
                                            {(subcategoryOptions.length > 0 ? subcategoryOptions : loanSubcategoryOptions).map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Lenders multiselect */}
                                <div className="flex flex-col gap-1.5 relative" ref={slabLenderDropdownRef}>
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pl-0.5">Lenders</span>
                                    <button
                                        type="button"
                                        onClick={() => setSlabShowLenderDropdown(!slabShowLenderDropdown)}
                                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none text-xs font-bold w-48 shadow-sm"
                                    >
                                        <span className="truncate">
                                            {slabSelectedLenders.length === 0
                                                ? 'Select Lender'
                                                : slabSelectedLenders.length === lendersRewardsList.length
                                                    ? 'All Lenders'
                                                    : slabSelectedLenders.length === 1
                                                        ? lendersRewardsList.find(l => l.id === slabSelectedLenders[0])?.lenderName
                                                        : `${slabSelectedLenders.length} Selected`}
                                        </span>
                                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${slabShowLenderDropdown ? 'rotate-90' : ''}`} />
                                    </button>
                                    {slabShowLenderDropdown && (
                                        <div className="absolute left-0 top-full mt-1.5 z-[220] bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl p-3 w-56 space-y-2">
                                            <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-slate-900">
                                                <button
                                                    type="button"
                                                    onClick={() => setSlabSelectedLenders(
                                                        slabSelectedLenders.length === lendersRewardsList.length ? [] : lendersRewardsList.map(l => l.id)
                                                    )}
                                                    className="text-[10px] font-extrabold text-primary hover:underline"
                                                >
                                                    {slabSelectedLenders.length === lendersRewardsList.length ? 'Deselect All' : 'Select All'}
                                                </button>
                                                <span className="text-[10px] font-bold text-gray-400">{slabSelectedLenders.length}/{lendersRewardsList.length}</span>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                                {lendersRewardsList.map(lender => {
                                                    const checked = slabSelectedLenders.includes(lender.id);
                                                    return (
                                                        <label key={lender.id} className="flex items-center gap-2 px-1 py-0.5 hover:bg-gray-50 dark:hover:bg-slate-900 rounded cursor-pointer select-none">
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => setSlabSelectedLenders(
                                                                    checked ? slabSelectedLenders.filter(id => id !== lender.id) : [...slabSelectedLenders, lender.id]
                                                                )}
                                                                className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                                                            />
                                                            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">{lender.lenderName}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Target Role toggle */}
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pl-0.5">Target Role</span>
                                    <div className="flex items-center rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                        {(['DSA', 'Advisor', 'Both'] as const).map(role => (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => setSlabTargetRole(role)}
                                                className={`px-4 py-2 text-xs font-bold transition-all ${
                                                    slabTargetRole === role
                                                        ? 'text-white'
                                                        : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 hover:bg-gray-50'
                                                }`}
                                                style={slabTargetRole === role ? { backgroundColor: 'hsl(215 55% 28%)' } : {}}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            {/* ── Slab Table ── */}
                            {slabSelectedLenders.length === 0 ? (
                                <div className="py-14 text-center text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
                                    Select at least one lender above to configure slab rates.
                                </div>
                            ) : (
                                <div className="overflow-x-auto border border-gray-100 dark:border-slate-800/80 rounded-xl">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-gray-50/50 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-800 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                                <th className="p-3 pl-4 w-28">Slab</th>
                                                <th className="p-3 w-28">Min</th>
                                                <th className="p-3 w-28">Max</th>
                                                {slabSelectedLenders.map(id => {
                                                    const lender = lendersRewardsList.find(l => l.id === id);
                                                    return (
                                                        <th key={id} className="p-3 text-center">
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <span>{lender?.lenderName}</span>
                                                                <span className="text-[9px] font-normal text-gray-400 normal-case tracking-normal">{slabTargetRole} Payout %</span>
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                                            {slabRows.map((slab, idx) => {
                                                const colors = [
                                                    { badge: 'bg-amber-700/10 text-amber-700', dot: 'bg-amber-600' },
                                                    { badge: 'bg-gray-400/10 text-gray-500', dot: 'bg-gray-400' },
                                                    { badge: 'bg-yellow-400/10 text-yellow-600', dot: 'bg-yellow-500' },
                                                    { badge: 'bg-cyan-400/10 text-cyan-600', dot: 'bg-cyan-500' },
                                                ];
                                                const c = colors[idx] || colors[0];
                                                return (
                                                    <tr key={slab.id} className="hover:bg-gray-50/40 dark:hover:bg-slate-800/20 transition-colors">
                                                        {/* Slab name */}
                                                        <td className="p-3 pl-4">
                                                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${c.badge}`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`}></span>
                                                                <input
                                                                    type="text"
                                                                    value={slab.slabName}
                                                                    onChange={(e) => handleSlabRowChange(slab.id, 'slabName', e.target.value)}
                                                                    className="bg-transparent border-none outline-none font-bold text-xs w-16 cursor-text"
                                                                />
                                                            </div>
                                                        </td>
                                                        {/* Min */}
                                                        <td className="p-3">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-gray-400 font-medium text-[10px]">₹</span>
                                                                <input
                                                                    type="text"
                                                                    value={slab.minAmount}
                                                                    onChange={(e) => handleSlabRowChange(slab.id, 'minAmount', e.target.value)}
                                                                    className="w-16 px-2 py-1 rounded border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                                                />
                                                            </div>
                                                        </td>
                                                        {/* Max */}
                                                        <td className="p-3">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-gray-400 font-medium text-[10px]">₹</span>
                                                                <input
                                                                    type="text"
                                                                    value={slab.maxAmount}
                                                                    onChange={(e) => handleSlabRowChange(slab.id, 'maxAmount', e.target.value)}
                                                                    className="w-16 px-2 py-1 rounded border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                                                />
                                                            </div>
                                                        </td>
                                                        {/* Per-lender payout % */}
                                                        {slabSelectedLenders.map(lenderId => (
                                                            <td key={lenderId} className="p-3">
                                                                <div className="relative flex items-center justify-center">
                                                                    <input
                                                                        type="text"
                                                                        value={slab.payouts[lenderId] ?? ''}
                                                                        onChange={(e) => handleSlabPayoutChange(slab.id, lenderId, e.target.value)}
                                                                        placeholder="0.00"
                                                                        className="w-20 pr-5 pl-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
                                                                    />
                                                                    <span className="absolute right-2 text-[9px] font-bold text-gray-400 pointer-events-none">%</span>
                                                                </div>
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 px-6 py-3.5 border-t border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/10 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowSlabModal(false)}
                                className="px-4 py-2 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-100 active:scale-95 transition-all text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    toast.success('Commission slabs saved successfully!');
                                    setShowSlabModal(false);
                                }}
                                className="px-4 py-2 bg-primary hover:bg-opacity-95 text-white font-bold rounded-lg active:scale-95 transition-all text-xs shadow-sm"
                            >
                                Save Configuration
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* ================================= ADD REWARD MODAL (Wide landscape pop-up) ================================= */}
            {showAddRewardModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-fade-in max-h-[92vh] overflow-y-auto sm:max-h-none sm:overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <Gift className="w-5 h-5 text-primary" />
                                <h3 className="text-md font-bold text-gray-900 dark:text-white">
                                    {editingRewardId ? "Edit Reward Scheme" : "Configure Reward Scheme"}
                                </h3>
                            </div>
                            <button onClick={handleCloseRewardModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Form - Wide 2-column layout */}
                        <form onSubmit={handleSaveDummyReward} className="p-6 space-y-4 text-xs">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                
                                {/* Left Column: Role details and partner selection */}
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="font-bold text-gray-700 dark:text-gray-300">Reward Title <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="e.g. Special Campaign"
                                            value={rewardTitle}
                                            onChange={(e) => setRewardTitle(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="font-bold text-gray-700 dark:text-gray-300">Target Role <span className="text-red-500">*</span></label>
                                        <select 
                                            value={rewardTargetRole}
                                            onChange={(e) => {
                                                setRewardTargetRole(e.target.value as 'DSA' | 'Advisor' | 'All');
                                                setRewardTargetUser('All');
                                            }}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                        >
                                            <option value="DSA">DSA</option>
                                            <option value="Advisor">Advisor</option>
                                            <option value="All">All</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="font-bold text-gray-700 dark:text-gray-300">Select Partner / User <span className="text-red-500">*</span></label>
                                        <select 
                                            value={rewardTargetUser}
                                            onChange={(e) => setRewardTargetUser(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                        >
                                            {rewardTargetRole === 'All' ? (
                                                <option value="All">All Users</option>
                                            ) : rewardTargetRole === 'DSA' ? (
                                                <>
                                                    <option value="All">All DSAs</option>
                                                    <option value="Test DSA (9988776655)">Test DSA (9988776655)</option>
                                                    <option value="Premium DSA Partner">Premium DSA Partner</option>
                                                    <option value="Elite Finance DSA">Elite Finance DSA</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="All">All Advisors</option>
                                                    <option value="Advisor User (9911223344)">Advisor User (9911223344)</option>
                                                    <option value="Senior Advisor Raj">Senior Advisor Raj</option>
                                                    <option value="Wealth Consultant Amit">Wealth Consultant Amit</option>
                                                </>
                                            )}
                                        </select>
                                    </div>

                                    {/* Date Selection: Interactive Range/Day custom Pop-over calendar picker */}
                                    <div className="space-y-1.5 relative" ref={calendarRef}>
                                        <label className="font-bold text-gray-700 dark:text-gray-300">Validity Date Selection <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                readOnly
                                                required
                                                placeholder="Click to select Date / Range"
                                                value={rewardDate}
                                                onClick={() => setShowCalendarPicker(true)}
                                                className="w-full pl-3 pr-8 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                                            />
                                            <Calendar className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" size={14} />
                                        </div>

                                        {/* Dropdown Calendar Pop-over */}
                                        {showCalendarPicker && (
                                            <div className="absolute left-0 top-full mt-1.5 z-[60] bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl p-3 w-[240px] animate-fade-in">
                                                {/* Calendar Header */}
                                                <div className="flex justify-between items-center mb-2.5">
                                                    <button 
                                                        type="button" 
                                                        onClick={handlePrevMonth}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors"
                                                    >
                                                        <ChevronLeft size={14} />
                                                    </button>
                                                    <span className="font-bold text-xs text-gray-800 dark:text-gray-200">
                                                        {monthNames[calMonth]} {calYear}
                                                    </span>
                                                    <button 
                                                        type="button" 
                                                        onClick={handleNextMonth}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors"
                                                    >
                                                        <ChevronRight size={14} />
                                                    </button>
                                                </div>

                                                {/* Calendar Weekday Names */}
                                                <div className="grid grid-cols-7 text-center font-bold text-[9px] text-gray-400 mb-1">
                                                    <div>Su</div>
                                                    <div>Mo</div>
                                                    <div>Tu</div>
                                                    <div>We</div>
                                                    <div>Th</div>
                                                    <div>Fr</div>
                                                    <div>Sa</div>
                                                </div>

                                                {/* Calendar Grid cells */}
                                                <div className="grid grid-cols-7 gap-y-1 justify-items-center mb-3">
                                                    {renderCalendarDays()}
                                                </div>

                                                {/* Selected Feedback Info */}
                                                <div className="text-[9px] text-gray-500 border-t border-gray-100 dark:border-slate-800 pt-2 mb-2 font-medium">
                                                    {rangeStart && !rangeEnd ? (
                                                        <span>Single Day: <strong className="text-primary">{formatDateString(rangeStart)}</strong></span>
                                                    ) : rangeStart && rangeEnd ? (
                                                        <span>Range: <strong className="text-primary">{formatDateString(rangeStart)} to {formatDateString(rangeEnd)}</strong></span>
                                                    ) : (
                                                        <span>Please click to select start & end dates.</span>
                                                    )}
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex justify-end gap-1 text-[9px]">
                                                    <button
                                                        type="button"
                                                        onClick={handleClearDateSelection}
                                                        className="px-2 py-1 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 rounded"
                                                    >
                                                        Clear
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleApplyDateSelection}
                                                        className="px-2 py-1 bg-primary text-white font-bold rounded shadow-sm hover:opacity-95"
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Column: Product select and case-type selection */}
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="font-bold text-gray-700 dark:text-gray-300">Product select <span className="text-red-500">*</span></label>
                                        <select 
                                            value={rewardCategory}
                                            onChange={(e) => setRewardCategory(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                        >
                                            
                                            <option value="Used Car Loan">Used Car Loan</option>
                                        </select>
                                    </div>

                                    {/* Lender Select - Always Visible */}
                                    <div className="space-y-1.5">
                                        <label className="font-bold text-gray-700 dark:text-gray-300">Lender / Bank <span className="text-red-500">*</span></label>
                                        <select 
                                            required
                                            value={rewardLenderName}
                                            onChange={(e) => setRewardLenderName(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                                        >
                                            <option value="">-- Select Lender --</option>
                                            <option value="All Lenders">All Lenders</option>
                                            {lendersRewardsList.map(l => (
                                                <option key={l.id} value={l.lenderName}>{l.lenderName}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Conditional Subcategory field - shown only when category is 'Used Car Loan' */}
                                    {rewardCategory === 'Used Car Loan' && (
                                        <div className="space-y-1.5 animate-fade-in">
                                            <label className="font-bold text-gray-700 dark:text-gray-300">case-type <span className="text-red-500">*</span></label>
                                            <select 
                                                value={rewardSubCategory}
                                                onChange={(e) => setRewardSubCategory(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                                            >
                                                <option value="Used Car - Purchase">Used Car - Purchase</option>
                                                <option value="Used Car - Refinance">Used Car - Refinance</option>
                                                <option value="Used Car BT/Top-up">Used Car BT/Top-up</option>
                                            </select>
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* Modal Footer actions */}
                            <div className="flex justify-end gap-2 border-t border-gray-100 dark:border-slate-800 pt-4">
                                <button 
                                    type="button"
                                    onClick={handleCloseRewardModal}
                                    className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-lg hover:opacity-95 active:scale-[0.98] transition-all"
                                >
                                    {editingRewardId ? "Save Changes" : "Save Reward Scheme"}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

            {/* ================================= ADMIN APPROVE MODAL ================================= */}
            {showAdminApproveModal && selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-xs">
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto sm:max-h-none sm:overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                <h3 className="text-md font-bold text-gray-900 dark:text-white">Approve Withdrawal ({selectedRequest.id})</h3>
                            </div>
                            <button onClick={() => setShowAdminApproveModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleApproveConfirm} className="p-6 space-y-4 text-xs">
                            <div className="p-3 bg-gray-50 dark:bg-slate-800/40 rounded-xl space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Partner:</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{selectedRequest.partnerName} ({selectedRequest.partnerRole})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Requested Amount:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">₹{selectedRequest.requestedAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Wallet Balance:</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">₹{selectedRequest.walletBalance.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="font-bold text-gray-700 dark:text-gray-300">Paid Amount (INR) <span className="text-red-500">*</span></label>
                                    <input 
                                        type="number" 
                                        required
                                        placeholder="Enter Paid Amount"
                                        value={adminPaidAmount}
                                        onChange={(e) => setAdminPaidAmount(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="font-bold text-gray-700 dark:text-gray-300">TDS Amount (INR)</label>
                                    <input 
                                        type="number"
                                        placeholder="Enter TDS"
                                        value={adminTdsAmount}
                                        onChange={(e) => setAdminTdsAmount(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold text-gray-700 dark:text-gray-300">Remarks</label>
                                <textarea 
                                    rows={2}
                                    placeholder="Enter approval remarks..."
                                    value={adminRemarks}
                                    onChange={(e) => setAdminRemarks(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setShowAdminApproveModal(false)}
                                    className="flex-1 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all"
                                >
                                    Confirm Approval
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================================= ADMIN REJECT MODAL ================================= */}
            {showAdminRejectModal && selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-xs">
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto sm:max-h-none sm:overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <XCircle className="w-5 h-5 text-red-600" />
                                <h3 className="text-md font-bold text-gray-900 dark:text-white">Reject Withdrawal ({selectedRequest.id})</h3>
                            </div>
                            <button onClick={() => setShowAdminRejectModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleRejectConfirm} className="p-6 space-y-4 text-xs">
                            <div className="p-3 bg-gray-50 dark:bg-slate-800/40 rounded-xl space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Partner:</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{selectedRequest.partnerName} ({selectedRequest.partnerRole})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Requested Amount:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">₹{selectedRequest.requestedAmount.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold text-gray-700 dark:text-gray-300">Rejection Remarks <span className="text-red-500">*</span></label>
                                <textarea 
                                    rows={3}
                                    required
                                    placeholder="Enter reason for rejection..."
                                    value={adminRemarks}
                                    onChange={(e) => setAdminRemarks(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setShowAdminRejectModal(false)}
                                    className="flex-1 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all"
                                >
                                    Confirm Reject
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================================= REWARD IMPORT PREVIEW MODAL ================================= */}
            {showRewardImportPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] sm:mt-5">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <Upload className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Import Preview — {rewardImportPreviewType === 'base-payout' ? 'Base Payout' : 'Bonus'}
                                </h3>
                            </div>
                            <button
                                onClick={() => {
                                    setShowRewardImportPreview(false);
                                    setRewardImportPreviewData([]);
                                    setRewardImportSummary(null);
                                    setRewardImportPreviewFile(null);
                                    setRewardImportErrors({});
                                    setRewardImportSuccessfulIds([]);
                                }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Summary Stats */}
                        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setRewardImportPreviewFilter('total')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                                        rewardImportPreviewFilter === 'total'
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span className={rewardImportPreviewFilter === 'total' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}>Total Records:</span>
                                    <span className="font-bold">{rewardImportSummary?.totalRecords || 0}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRewardImportPreviewFilter('update')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                                        rewardImportPreviewFilter === 'update'
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span className={rewardImportPreviewFilter === 'update' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}>To Update:</span>
                                    <span className={`font-bold ${rewardImportPreviewFilter === 'update' ? 'text-white' : 'text-blue-600'}`}>{rewardImportSummary?.recordsToUpdate || 0}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRewardImportPreviewFilter('skipped')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                                        rewardImportPreviewFilter === 'skipped'
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span className={rewardImportPreviewFilter === 'skipped' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}>Skipped:</span>
                                    <span className={`font-bold ${rewardImportPreviewFilter === 'skipped' ? 'text-white' : 'text-amber-600'}`}>{rewardImportSummary?.recordsSkipped || 0}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRewardImportPreviewFilter('failed')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                                        rewardImportPreviewFilter === 'failed'
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span className={rewardImportPreviewFilter === 'failed' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}>Failed:</span>
                                    <span className={`font-bold ${rewardImportPreviewFilter === 'failed' ? 'text-white' : 'text-red-600'}`}>{rewardImportSummary?.failedRecords || 0}</span>
                                </button>
                            </div>
                        </div>

                        {/* Records list */}
                        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4">
                            {(() => {
                                const visibleRecords = (rewardImportPreviewData || []).filter(record => {
                                    if (rewardImportPreviewFilter === 'total') return true;
                                    return record.category === rewardImportPreviewFilter;
                                });

                                if (visibleRecords.length === 0) {
                                    return (
                                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                            {rewardImportPreviewFilter === 'skipped' ? (
                                                <>
                                                    <p className="text-sm font-semibold mb-2">No Skipped Records</p>
                                                    <p className="text-xs">Skipped records have no changes.</p>
                                                </>
                                            ) : rewardImportPreviewFilter === 'update' ? (
                                                <>
                                                    <p className="text-sm font-semibold mb-2">No Records to Update</p>
                                                    <p className="text-xs">No changed records found in the import file.</p>
                                                </>
                                            ) : rewardImportPreviewFilter === 'failed' ? (
                                                <>
                                                    <p className="text-sm font-semibold mb-2">No Failed Records</p>
                                                    <p className="text-xs">All records passed validation.</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-sm font-semibold mb-2">No Records Found</p>
                                                    <p className="text-xs">The import file appears to be empty or unreadable.</p>
                                                </>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-3">
                                        {visibleRecords.map((record: any, idx: number) => {
                                            const hasError = rewardImportErrors[record.rowIndex] || record.error;
                                            const isSuccessful = rewardImportSuccessfulIds.includes(record.rowIndex);
                                            const isSkipped = record.category === 'skipped';

                                            return (
                                                <div
                                                    key={idx}
                                                    className={`border rounded-lg p-4 transition-colors ${
                                                        hasError
                                                            ? 'border-red-200 dark:border-red-800/50 bg-red-50/30 dark:bg-red-950/20'
                                                            : isSuccessful
                                                            ? 'border-green-200 dark:border-green-800/50 bg-green-50/30 dark:bg-green-950/20'
                                                            : isSkipped
                                                            ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50/20 dark:bg-amber-950/10'
                                                            : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-800/20'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                                                {record.label || record.bank_name || `Row ${record.rowIndex}`}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {record.target_role} • {record.product_category}{record.product_subcategory ? ` / ${record.product_subcategory}` : ''}
                                                                {record.user_ids ? ` • User ID: ${record.user_ids}` : ''}
                                                                {record.isNew ? ' • New Record' : record.id ? ` • ID: ${record.id}` : ''}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {hasError ? (
                                                                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-bold bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400">
                                                                    <XCircle size={14} className="mr-1" />Failed
                                                                </span>
                                                            ) : isSkipped ? (
                                                                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-bold bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
                                                                    No Changes
                                                                </span>
                                                            ) : isSuccessful ? (
                                                                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-bold bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400">
                                                                    <CheckCircle2 size={14} className="mr-1" />Successful
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-bold bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
                                                                    {record.isNew ? 'New' : `${record.changes?.length || 0} field${(record.changes?.length || 0) !== 1 ? 's' : ''} changed`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {hasError && (
                                                        <div className="bg-red-100/50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded p-3 text-xs">
                                                            <p className="font-semibold text-red-700 dark:text-red-400 mb-1">Import Failed</p>
                                                            <p className="text-red-600 dark:text-red-300">{typeof hasError === 'string' ? hasError : record.error}</p>
                                                        </div>
                                                    )}
                                                    {!isSkipped && record.changes && record.changes.length > 0 && (
                                                        <div className={`flex items-stretch gap-3 text-xs p-3 rounded border ${
                                                            isSuccessful
                                                                ? 'bg-green-100/50 dark:bg-green-950/30 border-green-200/50 dark:border-green-800/30'
                                                                : 'bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/30'
                                                        }`}>
                                                            <div className="flex-1 grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(120px, 1fr))` }}>
                                                                <p className="col-span-full text-xs font-semibold text-green-700 dark:text-green-400">Allowed Changes</p>
                                                                {record.changes.map((change: any, changeIdx: number) => (
                                                                    <div key={changeIdx} className="flex flex-col gap-1">
                                                                        <p className="font-bold text-gray-900 dark:text-white">{change.field}</p>
                                                                        <div className="flex items-center gap-1 text-xs">
                                                                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                                                                                {typeof change.currentValue === 'number'
                                                                                    ? change.currentValue.toFixed(2)
                                                                                    : change.currentValue || '(empty)'}
                                                                            </span>
                                                                            <span className="text-gray-500 dark:text-gray-400">→</span>
                                                                            <span className="font-bold text-green-600 dark:text-green-500">
                                                                                {typeof change.newValue === 'number'
                                                                                    ? change.newValue.toFixed(2)
                                                                                    : change.newValue || '(empty)'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {record.unauthorizedChanges && record.unauthorizedChanges.length > 0 && (
                                                        <div className="mt-3 bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded p-3 text-xs">
                                                            <p className="font-semibold text-red-700 dark:text-red-400 mb-2">Unauthorized Changes (Cannot be Modified)</p>
                                                            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(160px, 1fr))` }}>
                                                                {record.unauthorizedChanges.map((change: any, changeIdx: number) => (
                                                                    <div key={changeIdx} className="flex flex-col gap-1">
                                                                        <p className="font-bold text-gray-900 dark:text-white">{change.field}</p>
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-gray-700 dark:text-gray-300">{change.currentValue || '(empty)'}</span>
                                                                            <span className="text-gray-500 dark:text-gray-400">→</span>
                                                                            <span className="font-bold text-red-600 dark:text-red-400">{change.newValue || '(empty)'}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/10">
                            {Object.keys(rewardImportErrors).length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowRewardImportPreview(false);
                                        setRewardImportPreviewData([]);
                                        setRewardImportSummary(null);
                                        setRewardImportPreviewFile(null);
                                        setRewardImportErrors({});
                                        setRewardImportSuccessfulIds([]);
                                    }}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg active:scale-95 transition-all text-xs"
                                >
                                    Close
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowRewardImportPreview(false);
                                            setRewardImportPreviewData([]);
                                            setRewardImportSummary(null);
                                            setRewardImportPreviewFile(null);
                                        }}
                                        className="px-4 py-2 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 active:scale-95 transition-all text-xs"
                                    >
                                        Cancel
                                    </button>
                                    {rewardImportPreviewFilter === 'update' && (
                                        <button
                                            type="button"
                                            onClick={handleConfirmRewardImport}
                                            disabled={isProcessingRewardImport || (rewardImportSummary?.recordsToUpdate || 0) === 0}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg active:scale-95 transition-all text-xs"
                                        >
                                            {isProcessingRewardImport ? 'Importing...' : `Import ${rewardImportSummary?.recordsToUpdate || 0} Record${(rewardImportSummary?.recordsToUpdate || 0) !== 1 ? 's' : ''}`}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ================================= IMPORT PREVIEW MODAL ================================= */}
            {showImportPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] sm:mt-5">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <Upload className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Import Preview</h3>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowImportPreview(false);
                                    setImportPreviewData([]);
                                    setImportSummary(null);
                                    setImportPreviewFile(null);
                                }} 
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Summary Stats */}
                        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setImportPreviewFilter('total')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                                        importPreviewFilter === 'total'
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span className={importPreviewFilter === 'total' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}>Total Records:</span>
                                    <span className="font-bold">{importSummary?.totalRecords || 0}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImportPreviewFilter('update')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                                        importPreviewFilter === 'update'
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span className={importPreviewFilter === 'update' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}>To Update:</span>
                                    <span className={`font-bold ${importPreviewFilter === 'update' ? 'text-white' : 'text-blue-600'}`}>{importSummary?.recordsToUpdate || 0}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImportPreviewFilter('skipped')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                                        importPreviewFilter === 'skipped'
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span className={importPreviewFilter === 'skipped' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}>Skipped:</span>
                                    <span className={`font-bold ${importPreviewFilter === 'skipped' ? 'text-white' : 'text-amber-600'}`}>{importSummary?.recordsSkipped || 0}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImportPreviewFilter('failed')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                                        importPreviewFilter === 'failed'
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span className={importPreviewFilter === 'failed' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}>Failed:</span>
                                    <span className={`font-bold ${importPreviewFilter === 'failed' ? 'text-white' : 'text-red-600'}`}>{importSummary?.failedRecords || 0}</span>
                                </button>
                            </div>
                        </div>

                        {/* Records to Update */}
                        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4">
                            {/* Show unauthorized changes error if any exist */}
                            {importSummary?.hasUnauthorizedChanges && (
                                <div className="mb-4 p-4 rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-950/30">
                                    <p className="font-semibold text-red-700 dark:text-red-400 mb-3">⚠️ Unauthorized Column Changes Detected</p>
                                    <p className="text-xs text-red-600 dark:text-red-300 mb-3">
                                        The following records contain changes to columns that cannot be modified. Only <strong>Loan Amount</strong>, <strong>Payout %</strong>, and <strong>Payout Amt</strong> can be changed.
                                    </p>
                                    <div className="space-y-2">
                                        {importSummary?.unauthorizedChanges?.map((record, idx) => (
                                            <div key={idx} className="text-xs bg-red-100/50 dark:bg-red-950/40 p-2 rounded border border-red-200/50 dark:border-red-800/30">
                                                <p className="font-semibold text-red-700 dark:text-red-400">
                                                    {record.applicant} (ID: {record.id})
                                                </p>
                                                <p className="text-red-600 dark:text-red-300 mt-1">
                                                    Loan ID: {record.loanId || 'N/A'}
                                                </p>
                                                <p className="text-red-600 dark:text-red-300 mt-1">
                                                    Modified columns: <strong>{record.columns.join(', ')}</strong>
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {(() => {
                                // Compute filtered list based on active summary tab
                                const visibleRecords = (importPreviewData || []).filter(record => {
                                    if (importPreviewFilter === 'total') return true;
                                    return record.category === importPreviewFilter;
                                });

                                if (visibleRecords.length === 0) {
                                    return (
                                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                            {importPreviewFilter === 'skipped' ? (
                                                <>
                                                    <p className="text-sm font-semibold mb-2">No Skipped Records to Display</p>
                                                    <p className="text-xs">Skipped records have no changes and are not included in the preview.</p>
                                                </>
                                            ) : importPreviewFilter === 'update' ? (
                                                <>
                                                    <p className="text-sm font-semibold mb-2">No Records to Update</p>
                                                    <p className="text-xs">No records with valid allowed changes were found in the import file.</p>
                                                </>
                                            ) : importPreviewFilter === 'failed' ? (
                                                <>
                                                    <p className="text-sm font-semibold mb-2">No Failed Records</p>
                                                    <p className="text-xs">All records passed validation with no unauthorized changes.</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-sm font-semibold mb-2">No Records to Update</p>
                                                    <p className="text-xs">All records in your Excel file either don't exist in the database or have no changes from current values.</p>
                                                </>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                <div className="space-y-3">
                                    {visibleRecords.map((record, idx) => {
                                        const hasError = importErrors[record.id] || record.error;
                                        const isSuccessful = importSuccessfulIds.includes(record.id);
                                        const hasUnauthorized = record.unauthorizedChanges && record.unauthorizedChanges.length > 0;
                                        const isSkipped = record.category === 'skipped';
                                        
                                        return (
                                            <div 
                                                key={idx} 
                                                className={`border rounded-lg p-4 transition-colors ${
                                                    hasError || hasUnauthorized
                                                        ? 'border-red-200 dark:border-red-800/50 bg-red-50/30 dark:bg-red-950/20 hover:bg-red-50/50 dark:hover:bg-red-950/30' 
                                                        : isSuccessful
                                                        ? 'border-green-200 dark:border-green-800/50 bg-green-50/30 dark:bg-green-950/20'
                                                        : isSkipped
                                                        ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50/20 dark:bg-amber-950/10'
                                                        : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-800/20'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                                            {record.customer || record.applicant || 'N/A'}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {earningCategory === 'Credit Card' ? 'Lead ID' : 'Loan ID'}: {record.leadId || record.loanId || 'N/A'} • Record ID: {record.id}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {hasError || hasUnauthorized ? (
                                                            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-bold bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400">
                                                                <XCircle size={14} className="mr-1" />
                                                                {hasUnauthorized ? 'Unauthorized Changes' : 'Failed'}
                                                            </span>
                                                        ) : isSkipped ? (
                                                            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-bold bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
                                                                No Changes
                                                            </span>
                                                        ) : isSuccessful ? (
                                                            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-bold bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400">
                                                                <CheckCircle2 size={14} className="mr-1" />
                                                                Successful
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-bold bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
                                                                {record.changes?.length || 0} field{(record.changes?.length || 0) !== 1 ? 's' : ''} changed
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {hasError && !hasUnauthorized ? (
                                                    <div className="bg-red-100/50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded p-3 text-xs">
                                                        <p className="font-semibold text-red-700 dark:text-red-400 mb-1">Import Failed</p>
                                                        <p className="text-red-600 dark:text-red-300">{hasError}</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {/* Allowed Changes Section */}
                                                        {record.changes && record.changes.length > 0 && (
                                                            <>
                                                                <div>
                                                                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">✓ Allowed Changes</p>
                                                                    <div className={`flex items-stretch gap-3 text-xs p-3 rounded border ${
                                                                        isSuccessful
                                                                            ? 'bg-green-100/50 dark:bg-green-950/30 border-green-200/50 dark:border-green-800/30'
                                                                            : 'bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/30'
                                                                    }`}>
                                                                        {/* Changes container - all fields in one row, wraps on mobile */}
                                                                        <div className="flex-1 grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(120px, 1fr))` }}>
                                                                            {record.changes.map((change: any, changeIdx: number) => (
                                                                                <div key={changeIdx} className="flex flex-col gap-1">
                                                                                    <p className="font-bold text-gray-900 dark:text-white">{change.field}</p>
                                                                                    <div className="flex items-center gap-1 text-xs">
                                                                                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                                                                                            {typeof change.currentValue === 'number' 
                                                                                                ? `${change.currentValue.toFixed(2)}` 
                                                                                                : change.currentValue || '(empty)'}
                                                                                        </span>
                                                                                        <span className="text-gray-500 dark:text-gray-400">→</span>
                                                                                        <span className="font-bold text-green-600 dark:text-green-500">
                                                                                            {typeof change.newValue === 'number' 
                                                                                                ? `${change.newValue.toFixed(2)}` 
                                                                                                : change.newValue || '(empty)'}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* Unauthorized Changes Section */}
                                                        {record.unauthorizedChanges && record.unauthorizedChanges.length > 0 && (
                                                            <div>
                                                                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">⚠️ Unauthorized Changes (Cannot be Modified)</p>
                                                                <div className="space-y-2">
                                                                    {record.unauthorizedChanges.map((change: any, changeIdx: number) => (
                                                                        <div key={changeIdx} className="text-xs p-3 rounded border border-red-200/50 dark:border-red-800/30 bg-red-50/50 dark:bg-red-950/20">
                                                                            <div className="font-bold text-red-700 dark:text-red-400 mb-1">{change.field}</div>
                                                                            <div className="flex items-center gap-1 text-red-600 dark:text-red-300">
                                                                                <span className="font-medium">
                                                                                    {typeof change.currentValue === 'number' 
                                                                                        ? `₹${change.currentValue.toFixed(2)}` 
                                                                                        : change.currentValue || '(empty)'}
                                                                                </span>
                                                                                <span className="text-red-500 dark:text-red-400">→</span>
                                                                                <span className="font-bold">
                                                                                    {typeof change.newValue === 'number' 
                                                                                        ? `₹${change.newValue.toFixed(2)}` 
                                                                                        : change.newValue || '(empty)'}
                                                                                </span>
                                                                            </div>
                                                                            {change.reason && (
                                                                                <p className="text-red-500 dark:text-red-400 mt-1 text-[11px]">{change.reason}</p>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <p className="text-xs text-red-600 dark:text-red-300 mt-2 font-semibold">
                                                                    These columns cannot be modified. Please revert these changes before importing.
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Remark required warning — shown when numeric fields changed but no Remark in Excel */}
                                                        {!hasError && !isSuccessful && !(record.unauthorizedChanges && record.unauthorizedChanges.length > 0) && (() => {
                                                            const numericFields = ['Loan Amount', 'Payout %', 'Payout Amt'];
                                                            const hasNumericChanges = record.changes?.some((c: any) => numericFields.includes(c.field));
                                                            const hasRemarkInChanges = record.changes?.some((c: any) => c.field === 'Remark');
                                                            if (!hasNumericChanges) return null;
                                                            if (hasRemarkInChanges) return null;
                                                            // Numeric changes exist but no Remark in Excel — show mandatory input
                                                            const remarkValue = importRemarks[record.id] || '';
                                                            const remarkMissing = remarkValue.trim() === '';
                                                            return (
                                                                <div className={`pt-2 border-t ${remarkMissing ? 'border-amber-200 dark:border-amber-800/50' : 'border-gray-200 dark:border-slate-700'}`}>
                                                                    <label className={`block text-xs font-semibold mb-1.5 ${remarkMissing ? 'text-amber-700 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                        Remark <span className="text-red-500">*</span>
                                                                        <span className="font-normal ml-1 text-gray-500 dark:text-gray-400">(required when updating Loan Amount, Payout %, or Payout Amount)</span>
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={remarkValue}
                                                                        onChange={(e) => setImportRemarks(prev => ({
                                                                            ...prev,
                                                                            [record.id]: e.target.value
                                                                        }))}
                                                                        placeholder="Enter remark for this change..."
                                                                        className={`w-full px-2 py-1.5 text-xs border rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-colors ${
                                                                            remarkMissing
                                                                                ? 'border-amber-400 dark:border-amber-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-400'
                                                                                : 'border-gray-200 dark:border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary'
                                                                        }`}
                                                                    />
                                                                    {remarkMissing && (
                                                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                                                            ⚠ Please enter a remark before importing.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                );
                            })()}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/10">
                            {Object.keys(importErrors).length > 0 ? (
                                <>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setShowImportPreview(false);
                                            setImportPreviewData([]);
                                            setImportSummary(null);
                                            setImportPreviewFile(null);
                                            setImportErrors({});
                                            setImportSuccessfulIds([]);
                                            setImportRemarks({});
                                        }}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg active:scale-95 transition-all text-xs"
                                    >
                                        Close
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setShowImportPreview(false);
                                            setImportPreviewData([]);
                                            setImportSummary(null);
                                            setImportPreviewFile(null);
                                            setImportRemarks({});
                                        }}
                                        className="px-4 py-2 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 active:scale-95 transition-all text-xs"
                                    >
                                        Cancel
                                    </button>
                                    {/* Import button — only visible on the To Update tab */}
                                    {importPreviewFilter === 'update' && (
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                // Check if any eligible record with numeric changes is missing a Remark
                                                const recordsMissingRemark = importPreviewData.filter((record: any) => {
                                                    if (record.category !== 'update') return false;
                                                    const numericFields = ['Loan Amount', 'Payout %', 'Payout Amt'];
                                                    const hasNumericChanges = record.changes?.some((c: any) => numericFields.includes(c.field));
                                                    const hasRemarkInChanges = record.changes?.some((c: any) => c.field === 'Remark');
                                                    const hasPopupRemark = importRemarks[record.id] && importRemarks[record.id].trim() !== '';
                                                    return hasNumericChanges && !hasRemarkInChanges && !hasPopupRemark;
                                                });

                                                if (recordsMissingRemark.length > 0) {
                                                    toast.error('Remark is required for all records with numeric changes. Please fill in all remark fields.');
                                                    return;
                                                }
                                                
                                                handleConfirmImport();
                                            }}
                                            disabled={isProcessingImport || (importSummary?.recordsToUpdate || 0) === 0 || importPreviewData.some((record: any) => {
                                                if (record.category !== 'update') return false;
                                                const numericFields = ['Loan Amount', 'Payout %', 'Payout Amt'];
                                                const hasNumericChanges = record.changes?.some((c: any) => numericFields.includes(c.field));
                                                const hasRemarkInChanges = record.changes?.some((c: any) => c.field === 'Remark');
                                                const hasPopupRemark = importRemarks[record.id] && importRemarks[record.id].trim() !== '';
                                                return hasNumericChanges && !hasRemarkInChanges && !hasPopupRemark;
                                            })}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg active:scale-95 transition-all text-xs"
                                        >
                                            {isProcessingImport ? 'Importing...' : `Import ${importSummary?.recordsToUpdate || 0} Record${(importSummary?.recordsToUpdate || 0) !== 1 ? 's' : ''}`}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden file input for earnings import */}
            <input
                ref={earningImportRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                        handleImportEarnings(file);
                        e.target.value = '';
                    }
                }}
            />

        </div>
    );
}

