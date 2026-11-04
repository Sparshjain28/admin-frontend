import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Info, Loader2, Megaphone, Star, Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { resolveImageUrl } from '../services/api';

interface Props {
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onApply: (bankId: string, details?: any, autoNavigate?: boolean) => void;
  onSnapshotUpdate?: (snapshot: any[]) => void;
  isSubmitting: boolean;
  selectedLoanId: string | null;
  autoLoans: any[];
  creditScore?: number;
  rcData?: any;
  caseType?: string;
  address?: string;
  rcNumber?: string;
  prefetchedIdvData?: any;
  prefetchedIdvLoading?: boolean;
  incomeSource?: string;
  monthlyIncome?: string;
  profile?: string;
  dob?: string;
  existingAccounts?: any[];
  panData?: { dob?: string };
  annualIncomeItr?: string;
  incomeProof?: boolean;
  businessVintageYears?: string;
  salaryPaymentMode?: string;
}

// Same credit-card-5%/EMI-full-amount logic the backend's
// findEligibilityController.js uses — active (non-closed) accounts only,
// so Piramal's native FOIR rule (loanData.existing_monthly_obligations)
// actually has real data to check instead of permanently gapping out.
// IDFC Rural reads loanData.age directly (a plain number) rather than
// falling back from loanData.dob the way Urban/Hero do — without this it
// silently defaults to age 30 for every applicant. Computed here so both
// fields go out together.
function ageFromDob(dob?: string): number | undefined {
  if (!dob) return undefined;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const hasHadBirthdayThisYear = now.getMonth() > d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() >= d.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

function sumExistingMonthlyObligations(accounts?: any[]): number | undefined {
  if (!Array.isArray(accounts) || accounts.length === 0) return undefined;
  return accounts
    .filter(acc => (acc?.account_status || '').toUpperCase() !== 'CLOSED')
    .reduce((sum, acc) => {
      const isCreditCard = (acc?.account_type || '').toUpperCase().includes('CREDIT CARD');
      if (isCreditCard) return sum + (parseFloat(acc?.current_balance) || 0) * 0.05;
      return sum + (parseFloat(acc?.emi_amount) || 0);
    }, 0);
}

export default function LinkLoanFinderStep({ onBack, onNext, onSubmit, onApply, onSnapshotUpdate, isSubmitting, selectedLoanId, autoLoans, creditScore, rcData, caseType, address, rcNumber, prefetchedIdvData, prefetchedIdvLoading, incomeSource, monthlyIncome, profile, dob, existingAccounts, panData, annualIncomeItr, incomeProof, businessVintageYears, salaryPaymentMode }: Props) {
  const [serviceableBanks, setServiceableBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // API IDV state
  const [apiIdv, setApiIdv] = useState<number | null>(null);
  const [apiIdvLoading, setApiIdvLoading] = useState(false);

  // Use prefetched IDV data
  const idvData = prefetchedIdvData;
  const idvLoading = prefetchedIdvLoading;

  // Fetch API IDV through backend (which tries n8n first, then Surepass)
  useEffect(() => {
    if (!rcNumber) return;
    setApiIdvLoading(true);
    const token = localStorage.getItem('auth_token');
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/find-lender/idv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id_number: rcNumber })
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(rawData => {
        let data = rawData;
        if (Array.isArray(data) && data.length > 0) {
          const first = data[0];
          data = first?.json || first?.output || first?.data || first;
        }
        // Handle both response formats
        const val = data?.data?.fair_market_retail_value || data?.fair_market_retail_value || data?.data?.book_value || data?.book_value || data?.data?.dealer_purchase_price || data?.dealer_purchase_price || data?.data?.idv_value || data?.idv_value || data?.idv || data?.vehicle_value;
        if (val && Number(val) > 0) {
          setApiIdv(Number(val));
        } else {
        }
      })
      .catch(err => console.error('Error fetching IDV:', err.message))
      .finally(() => setApiIdvLoading(false));
  }, [rcNumber]);

  // Use existing layout effects
  useEffect(() => {
    // Fetch find my lender
    const token = localStorage.getItem('auth_token');
    // On a page refresh/direct-load landing straight on this step (e.g. a
    // draft resumed via ?step=4 in the URL), `address` already has a
    // fallback default and fires immediately, but `caseType` starts out
    // empty until the lead's saved data finishes loading asynchronously.
    // Without this guard, that gap sends an empty case_type to the BRE,
    // which correctly (but confusingly) comes back CASE_TYPE_NOT_SUPPORTED
    // for an instant before the real case type loads and the effect reruns.
    if (token && address && caseType) {
      setLoading(true);

      // Tenure still isn't collected until later, so the BRE still defaults
      // that — but income source/profile/salary/DOB/existing obligations
      // are all captured up front in step 1 (DOB via the PAN lookup,
      // obligations via the CIBIL report already pulled for the credit
      // score), so they're available here instead of being left blank for
      // this preliminary check.
      const vehicleData = {
        maker_name: rcData?.maker_name || rcData?.full_rc_data?.maker_name || '',
        maker_model: rcData?.model_name || rcData?.full_rc_data?.model_name || '',
        fuel_type: rcData?.fuel_type || rcData?.full_rc_data?.fuel_type || '',
        ...(apiIdv != null ? { idv_value: apiIdv } : {}),
        manufacturing_date: rcData?.manufacturing_date_formatted || rcData?.full_rc_data?.manufacturing_date_formatted || rcData?.manufacturing_date || rcData?.full_rc_data?.manufacturing_date || '',
      };
      const creditReportData = creditScore ? { credit_score: creditScore, auto_loans: autoLoans || [], ...(Array.isArray(existingAccounts) ? { full_report: { accounts: existingAccounts } } : {}) } : undefined;
      const existingMonthlyObligations = sumExistingMonthlyObligations(existingAccounts);
      const loanData = (incomeSource || dob || existingMonthlyObligations != null)
        ? {
            ...((rcData?.financer || rcData?.full_rc_data?.financer) ? {
              existing_financier: rcData?.financer || rcData?.full_rc_data?.financer,
            } : {}),
            ...(autoLoans.some(a => String(a.account_number) === String(selectedLoanId)) ? {
              existing_loan_account_number: selectedLoanId,
            } : {}),
            ...(incomeSource ? {
              income_source: incomeSource,
              applicant_profile: incomeSource === 'Self Employed' && profile ? profile : incomeSource,
            } : {}),
            ...(monthlyIncome ? { monthly_income: monthlyIncome, net_monthly_salary: monthlyIncome } : {}),
            ...(annualIncomeItr ? { annual_income: annualIncomeItr } : {}),
            ...(incomeProof != null ? { income_proof: incomeProof } : {}),
            ...(businessVintageYears ? { business_vintage_months: Number(businessVintageYears) * 12 } : {}),
            ...(salaryPaymentMode ? { salary_payment_mode: salaryPaymentMode } : {}),
            ...(dob ? { dob, age: ageFromDob(dob) } : {}),
            ...(existingMonthlyObligations != null ? { existing_monthly_obligations: existingMonthlyObligations } : {}),
          }
        : undefined;

      const controller = new AbortController();
      fetch(`${import.meta.env.VITE_API_URL || '/api'}/find-lender/search-by-address`, {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          address: address,
          case_type: caseType,
          radius: 50,
          vehicleData,
          creditReportData,
          panData: panData || (dob ? { dob } : undefined),
          loanData
        })
      })
        .then(res => res.json())
        .then(data => {
          if (controller.signal.aborted) return;
          if (data.error) {
            setErrorMessage(data.error);
          } else if (data.lenders) {
            // Sorting (by loan amount, which needs the vehicle IDV) happens
            // separately in the `sortedBanks` memo below, not here — the IDV
            // fetch is a completely independent effect (keyed on rcNumber)
            // that can still be loading when this response arrives. Sorting
            // once, right here, would freeze the order using an IDV of 0
            // whenever this response wins the race, and it would never
            // re-sort once the real IDV showed up a moment later (the cards
            // themselves would still show the correct amount — getLoanRangeText
            // runs at render time — but the ORDER would stay wrong).
            setServiceableBanks(data.lenders);
          }
        })
        .catch(err => {
          if (err.name !== 'AbortError') setErrorMessage('Failed to connect to the server.');
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
      return () => controller.abort();
    } else {
      setLoading(false);
    }
  }, [address, caseType, apiIdv, creditScore, autoLoans, existingAccounts, incomeSource, monthlyIncome, profile, dob, panData, annualIncomeItr, incomeProof, businessVintageYears, salaryPaymentMode, rcData, selectedLoanId]);

  const getMatchingRate = (rates: any[]) => {
    if (!rates || rates.length === 0) return null;
    if (caseType) {
      const normalize = (s: string) => (s || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
      const normCase = normalize(caseType);
      const match = rates.find(r => r.product_name && normalize(r.product_name).includes(normCase));
      if (match) return match;
    }
    return rates[0];
  };

  const extractIdvAmount = () => {
    // Prefer the API IDV value if available, then fallback to prefetched data
    if (apiIdv && apiIdv > 0) return apiIdv;
    if (!idvData) return null;
    const searchObj = (obj: any): number | null => {
      if (!obj || typeof obj !== 'object') return null;
      if (obj.idv || obj.idv_value || obj.tentative_idv || obj.vehicle_value) {
        const val = Number(obj.idv || obj.idv_value || obj.tentative_idv || obj.vehicle_value);
        return val > 0 ? val : null;
      }
      for (const key in obj) {
        if (typeof obj[key] === 'number' && obj[key] > 0 && (key.toLowerCase().includes('idv') || key.toLowerCase().includes('value'))) return obj[key];
        const res = searchObj(obj[key]);
        if (res && res > 0) return res;
      }
      return null;
    };
    const result = searchObj(idvData);
    return result && result > 0 ? result : null;
  };

  const formattedIdv = () => {
    const amount = extractIdvAmount();
    if (amount) {
      if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} lacs`;
      return `₹${amount.toLocaleString('en-IN')}`;
    }
    if (apiIdvLoading || idvLoading) return 'Calculating...';
    return 'Value not found';
  };




  // `breLtv`: when this lender has a matched BRE policy (bank.bre.offer.ltv),
  // use that exact, lender-specific LTV instead of the generic case-type
  // estimate below — the generic range was never lender-specific and didn't
  // reflect model/case-type overrides (e.g. IDFC Bolero 70%, Alto BT 150%
  // Rural) that the BRE now computes.
  const getLoanParameters = (breLtv?: number) => {
    if (breLtv && breLtv > 0) {
      return { minPct: breLtv, maxPct: breLtv };
    }
    let minPct = 80;
    let maxPct = 90;
    const normCase = (caseType || '').toLowerCase();
    if (normCase.includes('refinance')) {
      minPct = 80; maxPct = 120;
    } else if (normCase.includes('bt')) {
      minPct = 120; maxPct = 160;
    } else if (normCase.includes('top')) {
      minPct = 100; maxPct = 120;
    } else {
      minPct = 80; maxPct = 90; // purchase
    }
    return { minPct, maxPct };
  };

  // `breMaxAmount`: an absolute loan-amount cap from the BRE offer
  // (max_loan_amount) — e.g. IDFC BT's Rs 50L/30L/20L caps, or Hero FinCorp's
  // Eeco-BT multiplier amount. Final loan = min(LTV x IDV, this cap). The
  // BRE's harmless 1-crore default rarely binds.
  const capByBre = (v: number, breMaxAmount?: number) =>
    (breMaxAmount && breMaxAmount > 0) ? Math.min(v, breMaxAmount) : v;

  // Loan amounts should always land on a round, lender-friendly figure
  // (nearest Rs 5,000) rather than an odd IDV x LTV% product like Rs 11,06,432.
  const roundTo5000 = (v: number, cap?: number) => {
    const rounded = Math.round(v / 5000) * 5000;
    return cap != null ? Math.min(rounded, Math.max(0, cap)) : rounded;
  };

  // Re-derived on every render (not sorted once when the lender list first
  // arrives) so the order stays correct once the IDV finishes loading — the
  // IDV fetch is a separate effect and can resolve after the lender list does.
  const sortedBanks = useMemo(() => {
    //   -1 = BRE evaluated & eligible (highest priority)
    //   0 = serviceable & not deprioritized (no BRE)
    //   1 = serviceable but deprioritized (BRE Rule 6/8 — show lower)
    //   2 = not serviceable / ineligible (bottom)
    const tierOf = (x: any) => {
      if (!x.is_serviceable) return 2;
      if (x.deprioritize) return 1;
      if (x.bre && x.bre.eligible) return -1;
      return 0;
    };
    // Within the same eligibility tier, the lender offering the higher loan
    // amount should show first — same IDV x LTV% (capped at the BRE's offer
    // cap) math used for the displayed "Loan Amount" figure, so the ordering
    // always matches what's on screen.
    const idvForSort = extractIdvAmount() || 0;
    const amountOf = (x: any) => {
      const { maxPct } = getLoanParameters(x.bre?.offer?.ltv);
      return roundTo5000(capByBre(idvForSort * (maxPct / 100), x.bre?.offer?.max_loan_amount), x.bre?.offer?.max_loan_amount);
    };
    return [...serviceableBanks].sort((a, b) => {
      const tierA = tierOf(a), tierB = tierOf(b);
      if (tierA !== tierB) return tierA - tierB;

      const amountA = amountOf(a);
      const amountB = amountOf(b);
      if (amountA !== amountB) return amountB - amountA; // higher loan amount first

      const matchA = getMatchingRate(a.rates);
      const matchB = getMatchingRate(b.rates);

      const aRate = matchA?.racc_rate ? parseFloat(matchA.racc_rate) : 999;
      const bRate = matchB?.racc_rate ? parseFloat(matchB.racc_rate) : 999;

      if (aRate !== bRate) return aRate - bRate; // lowest ROI first

      const aTenure = matchA?.max_tenure ? parseInt(matchA.max_tenure) : 0;
      const bTenure = matchB?.max_tenure ? parseInt(matchB.max_tenure) : 0;

      return bTenure - aTenure; // highest tenure first
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceableBanks, apiIdv, idvData]);

  // Ineligible lenders get their own "Unmatched Offers" slider below the main
  // list instead of being interleaved into it — sortedBanks already pushes
  // them to the bottom via tierOf, so splitting on is_serviceable here keeps
  // the same relative order within each group.
  const eligibleSortedBanks = useMemo(() => sortedBanks.filter(b => b.is_serviceable), [sortedBanks]);
  const ineligibleSortedBanks = useMemo(() => sortedBanks.filter(b => !b.is_serviceable), [sortedBanks]);

  const getLoanRangeText = (breLtv?: number, breMaxAmount?: number) => {
    if (idvLoading && apiIdvLoading) return 'Calculating...';
    const amount = extractIdvAmount();
    if (!amount) {
      if (idvLoading || apiIdvLoading) return 'Calculating...';
      return 'Value not found';
    }

    const { minPct, maxPct } = getLoanParameters(breLtv);
    const minL = roundTo5000(capByBre(amount * (minPct / 100), breMaxAmount), breMaxAmount);
    const maxL = roundTo5000(capByBre(amount * (maxPct / 100), breMaxAmount), breMaxAmount);

    const fmt = (v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(2)}L` : `₹${Math.round(v).toLocaleString('en-IN')}`;
    return minL === maxL ? fmt(minL) : `${fmt(minL)} - ${fmt(maxL)}`;
  };

  const calcEmi = (principal: number, annualRate: number, months: number) => {
    if (!principal || !annualRate || !months) return 0;
    const r = (annualRate / 12) / 100;
    const emi = principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
    return Math.round(emi);
  };

  const getEmiRangeText = (rateStr: string, tenureStr: string, breLtv?: number, breMaxAmount?: number) => {
    if (idvLoading && apiIdvLoading) return 'Calculating...';
    const amount = extractIdvAmount();
    if (!amount) {
      if (idvLoading || apiIdvLoading) return 'Calculating...';
      return 'N/A';
    }

    let rate = parseFloat(String(rateStr).replace(/[^0-9.]/g, '')) || 15;
    let months = parseInt(String(tenureStr).replace(/[^0-9]/g, '')) || 48;

    const { minPct, maxPct } = getLoanParameters(breLtv);
    const minL = roundTo5000(capByBre(amount * (minPct / 100), breMaxAmount), breMaxAmount);
    const maxL = roundTo5000(capByBre(amount * (maxPct / 100), breMaxAmount), breMaxAmount);

    const minEmi = calcEmi(minL, rate, months);
    const maxEmi = calcEmi(maxL, rate, months);

    return minEmi === maxEmi ? `₹${minEmi.toLocaleString('en-IN')}` : `₹${minEmi.toLocaleString('en-IN')} - ₹${maxEmi.toLocaleString('en-IN')}`;
  };

  const buildLenderSnapshot = (banks: any[]) => {
    return banks.map((bank, index) => {
      const rate = getMatchingRate(bank.rates);
      const interestRate = bank.bre?.offer?.roi ? `${bank.bre.offer.roi}% p.a.` : (rate?.racc_rate ? `${rate.racc_rate}% p.a.` : '15% p.a.');
      const tenure = bank.bre?.offer?.max_tenure ? `${bank.bre.offer.max_tenure} months` : (rate?.max_tenure ? `${rate.max_tenure} months` : '48 months');
      const activeBranch = bank.branches && (bank.branches.find((br: any) => br.is_serviceable) || bank.branches?.[0]);
      return {
        position: index + 1,
        bank_name: bank.bank_name,
        bank_id: bank.bank_id || bank.id || null,
        is_serviceable: !!bank.is_serviceable,
        is_recommended: !!(bank.is_serviceable && index < 2),
        loan_amount_display: getLoanRangeText(bank.bre?.offer?.ltv, bank.bre?.offer?.max_loan_amount),
        roi_display: interestRate,
        tenure_display: tenure,
        emi_display: getEmiRangeText(interestRate, tenure, bank.bre?.offer?.ltv, bank.bre?.offer?.max_loan_amount),
        bre_status: bank.bre ? (bank.bre.eligible ? 'eligible' : 'rejected') : 'no_policy',
        bre_reasons: bank.bre?.reasons || [],
        selected_scheme: bank.bre?.selectedScheme || null,
        scheme_results: bank.bre?.schemeResults || [],
        deprioritize: !!bank.deprioritize,
        deprioritize_reasons: bank.deprioritize_reasons || [],
        branch_name: activeBranch?.branch_name || null,
        distance_km: activeBranch?.distance != null ? activeBranch.distance : null,
        logo_url: bank.logo_url || null
      };
    });
  };

  useEffect(() => {
    if (sortedBanks && sortedBanks.length > 0 && onSnapshotUpdate) {
      onSnapshotUpdate(buildLenderSnapshot(sortedBanks));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedBanks, apiIdv, idvData]);

  const BankCard = ({ bank, index }: { bank: any, index: number }) => {
    const [logoFailed, setLogoFailed] = useState(false);
    // Cards this policy actually evaluated (IDFC Urban, Hero FinCorp, ...)
    // show plain numbers with a footnote instead of "Starting from X% p.a."
    // / "Upto X months" / "X/Mo onwards" — those phrasings were written for
    // the generic, non-BRE estimate and read oddly on a real calculated figure.
    const isBreEvaluated = !!bank.bre;
    const rate = getMatchingRate(bank.rates);
    // Same reasoning as tenure below: the BRE's own computed ROI (IDFC's
    // amount-slab rates, Hero's flat per-case-type rates) is the real,
    // policy-accurate figure — prefer it over the generic bank_product_rates
    // row, and only fall back to a flat 15% p.a. when neither source has one.
    const interestRate = bank.bre?.offer?.roi ? `${bank.bre.offer.roi}% p.a.` : (rate?.racc_rate ? `${rate.racc_rate}% p.a.` : '15% p.a.');
    // The BRE's own computed max tenure (e.g. IDFC Urban's 32-60 month policy
    // window, Hero's Eeco-BT 48-month cap) is the authoritative, case-specific
    // figure — prefer it over the generic bank_product_rates row, which was
    // never case-type/model aware, and only fall back to a flat 48 months
    // when neither source has a real value.
    const tenure = bank.bre?.offer?.max_tenure ? `${bank.bre.offer.max_tenure} months` : (rate?.max_tenure ? `${rate.max_tenure} months` : '48 months');
    // Plain-number display for BRE-evaluated cards (spec §-driven wording
    // like "Starting from"/"p.a."/"Upto"/"months" belongs to the generic
    // estimate shown when there's no real policy figure to quote).
    const roiDisplay = isBreEvaluated ? interestRate.replace(/\s*p\.a\.?$/i, '') : `Starting from ${interestRate}`;
    const tenureDisplay = isBreEvaluated ? tenure.replace(/\s*months?$/i, '') : `Upto ${tenure}`;
    const emiSuffix = isBreEvaluated ? '' : '/Mo onwards';
    const isRecommended = bank.is_serviceable && index < 2; // Tag first two as recommended like in the image
    const isSelected = selectedLoanId === bank.bank_name;

    const handleApply = (autoNavigate: boolean = true) => {
      const activeBranch = bank.branches && (bank.branches.find((br: any) => br.is_serviceable) || bank.branches?.[0]);
      const idvAmount = extractIdvAmount();
      // Use this lender's own BRE LTV/cap (same as the card's display) so the
      // amount carried forward on Apply always matches what was shown, and
      // round it the same way to a Rs 5,000 multiple.
      const { minPct, maxPct } = getLoanParameters(bank.bre?.offer?.ltv);
      const minLoanNumeric = idvAmount ? roundTo5000(capByBre(idvAmount * (minPct / 100), bank.bre?.offer?.max_loan_amount), bank.bre?.offer?.max_loan_amount) : null;
      const maxLoanNumeric = idvAmount ? roundTo5000(capByBre(idvAmount * (maxPct / 100), bank.bre?.offer?.max_loan_amount), bank.bre?.offer?.max_loan_amount) : null;
      const rateNumeric = parseFloat(String(interestRate).replace(/[^0-9.]/g, '')) || null;
      const tenureNumeric = parseInt(String(tenure).replace(/[^0-9]/g, '')) || null;
      const minEmiNumeric = (minLoanNumeric && rateNumeric && tenureNumeric) ? calcEmi(minLoanNumeric, rateNumeric, tenureNumeric) : null;
      const maxEmiNumeric = (maxLoanNumeric && rateNumeric && tenureNumeric) ? calcEmi(maxLoanNumeric, rateNumeric, tenureNumeric) : null;

      onApply(bank.bank_name, {
        maxLoanAmount: getLoanRangeText(bank.bre?.offer?.ltv, bank.bre?.offer?.max_loan_amount),
        roi: interestRate,
        maxTenure: tenure,
        loanEmi: getEmiRangeText(interestRate, tenure, bank.bre?.offer?.ltv, bank.bre?.offer?.max_loan_amount),
        logoUrl: bank.logo_url,
        branchName: activeBranch?.branch_name,
        salesManagerName: activeBranch?.sales_manager_name,
        salesManagerMobile: activeBranch?.sales_manager_mobile,
        areaManagerName: activeBranch?.area_sales_manager_name,
        areaManagerMobile: activeBranch?.area_sales_manager_mobile,
        tentativeValue: idvAmount,
        minLoanAmountNumeric: minLoanNumeric,
        maxLoanAmountNumeric: maxLoanNumeric,
        loanAmountNumeric: maxLoanNumeric,
        roiNumeric: rateNumeric,
        tenureNumeric: tenureNumeric,
        minEmiNumeric: minEmiNumeric,
        maxEmiNumeric: maxEmiNumeric,
        emiNumeric: maxEmiNumeric,
        is_serviceable: bank.is_serviceable,
        selectedScheme: bank.bre?.selectedScheme || null,
        schemeResults: bank.bre?.schemeResults || [],
        presented_lenders: buildLenderSnapshot(sortedBanks),
      }, autoNavigate);
    };

    return (
      <div
        onClick={() => handleApply(false)}
        className={`bg-white rounded-3xl p-5 shadow-md border-2 relative overflow-hidden mb-5 transition-all hover:shadow-lg cursor-pointer ${!bank.is_serviceable ? 'opacity-70 grayscale-[30%]' : ''
          } ${isSelected
            ? 'border-[#818CF8] bg-[#818CF8]/5 shadow-indigo-100'
            : 'border-slate-100 hover:border-slate-300'
          }`}
      >
        {/* Recommended Badge */}
        {isRecommended && (
          <div className="absolute top-0 right-6 bg-[#FEF3C7] text-[#B45309] text-[9px] font-extrabold px-3 py-1 rounded-b-md uppercase tracking-wider">
            Recommended
          </div>
        )}

        {!bank.is_serviceable && (
          <div className="absolute top-0 right-6 bg-slate-200 text-slate-600 text-[9px] font-extrabold px-3 py-1.5 rounded-b-md uppercase tracking-wider flex items-center gap-1 group/tooltip">
            Ineligible
            {bank.ineligible_reasons?.length > 0 && (
              <span className="relative flex items-center" onClick={(e) => e.stopPropagation()}>
                <Info size={11} className="cursor-help" />
                <div className="hidden group-hover/tooltip:block absolute top-full right-0 mt-2 w-64 bg-slate-800 text-white text-[11px] normal-case font-normal tracking-normal rounded-lg p-3 shadow-xl z-50 leading-relaxed">
                  <ul className="list-disc list-outside pl-3.5 space-y-1">
                    {bank.ineligible_reasons.map((reason: string, i: number) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                  <div className="absolute -top-1 right-3 w-2 h-2 bg-slate-800 rotate-45" />
                </div>
              </span>
            )}
          </div>
        )}

        {/* Top Row: Logo, Name, Actions */}
        <div className="flex justify-between items-center mb-6 pt-2">
          <div className="flex gap-3 items-center">
            {/* Logo box — falls back to the bank's initials if logo_url is
                missing OR fails to load */}
            <div className="w-[52px] h-[40px] bg-white border border-slate-200 rounded-lg flex items-center justify-center p-1 shadow-xs overflow-hidden relative">
              {bank.logo_url && (
                <img
                  src={resolveImageUrl(bank.logo_url)}
                  alt={bank.bank_name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                    const fallback = e.currentTarget.parentElement?.querySelector('.logo-fallback');
                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                  }}
                />
              )}
              <span className={`logo-fallback font-extrabold text-xs text-slate-700 w-full h-full items-center justify-center bg-slate-100 ${bank.logo_url ? 'hidden' : 'flex'}`}>
                {bank.bank_name?.substring(0, 2).toUpperCase()}
              </span>
            </div>

            <div className="flex flex-col justify-center">
              <h3 className="font-bold text-slate-800 text-[14px] uppercase tracking-wide leading-tight">
                {bank.bank_name}{isBreEvaluated && <span className="text-red-500 ml-0.5">*</span>}
              </h3>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1.5 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const tentativeVal = formattedIdv();
                const loanRange = getLoanRangeText(bank.bre?.offer?.ltv, bank.bre?.offer?.max_loan_amount);
                const emiRange = getEmiRangeText(interestRate, tenure, bank.bre?.offer?.ltv, bank.bre?.offer?.max_loan_amount);
                const text = `🏦 *${bank.bank_name}*${isBreEvaluated ? '*' : ''}\n\n🚗 Vehicle Tentative Value: ${tentativeVal}\n💰 Max Loan Amount: ${loanRange}\n📊 ROI: ${roiDisplay}\n📅 Max Tenure: ${tenureDisplay}\n💵 Loan EMI: ${emiRange}${emiSuffix}\n\n${isBreEvaluated ? '*The calculation is done according to our lender policy.\n\n' : ''}— Powered by Finonest`;
                if (navigator.share) {
                  navigator.share({
                    title: `Loan Details - ${bank.bank_name}`,
                    text: text
                  }).catch(console.error);
                } else {
                  navigator.clipboard.writeText(text);
                  toast.success('Copied to clipboard');
                }
              }}
              className="bg-[#6875F5] hover:bg-[#5865F2] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
            >
              Share
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const tentativeVal = formattedIdv();
                const loanRange = getLoanRangeText(bank.bre?.offer?.ltv, bank.bre?.offer?.max_loan_amount);
                const emiRange = getEmiRangeText(interestRate, tenure, bank.bre?.offer?.ltv, bank.bre?.offer?.max_loan_amount);
                const text = `🏦 *${bank.bank_name}*${isBreEvaluated ? '*' : ''}\n\n🚗 Vehicle Tentative Value: ${tentativeVal}\n💰 Max Loan Amount: ${loanRange}\n📊 ROI: ${roiDisplay}\n📅 Max Tenure: ${tenureDisplay}\n💵 Loan EMI: ${emiRange}${emiSuffix}\n\n${isBreEvaluated ? '*The calculation is done according to our lender policy.\n\n' : ''}— Powered by Finonest`;
                navigator.clipboard.writeText(text);
                toast.success('Copied to clipboard');
              }}
              className="bg-[#E8EAF6] text-[#6875F5] hover:bg-[#C5CAE9] p-2 rounded-lg shadow-sm transition-all flex items-center justify-center w-8 h-8"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>

        {bank.bre?.eligible && bank.bre?.selectedScheme && (
          <p className="text-xs font-medium text-slate-600 mt-3 mb-2">
            Selected scheme: {({ MAX_REFINANCE_120: '120% funding', MAX_REFINANCE_140: '140% funding', STANDARD_PURCHASE: 'Standard purchase', STANDARD_REFINANCE: 'Standard refinance', INTERNAL_BT_MULTIPLIER: 'Internal BT multiplier' } as Record<string, string>)[bank.bre.selectedScheme] || bank.bre.selectedScheme}
          </p>
        )}
        {/* 2x2 Grid of Details matching Image 2 layout */}
        <div className="grid grid-cols-2 gap-y-4 gap-x-4 border-t border-slate-100/70 pt-4">
          <div>
            <p className="text-[11px] text-slate-400 mb-0.5 font-medium">Loan EMI</p>
            <p className="font-bold text-[13px] text-slate-800">{getEmiRangeText(interestRate, tenure, bank.bre?.offer?.ltv, bank.bre?.offer?.max_loan_amount)}{emiSuffix}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 mb-0.5 font-medium">Loan Amount</p>
            <p className="font-bold text-[13px] text-[#f97316]">{getLoanRangeText(bank.bre?.offer?.ltv, bank.bre?.offer?.max_loan_amount)}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 mb-0.5 font-medium">Rate of Interest</p>
            <p className="font-bold text-[13px] text-slate-800">{roiDisplay}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 mb-0.5 font-medium">Tenure</p>
            <p className="font-bold text-[13px] text-slate-800">{tenureDisplay}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleApply(true);
            }}
            className="w-full py-2.5 rounded-xl font-bold text-[13px] transition-all shadow-sm flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#1E56A0] to-[#153e75] hover:from-[#153e75] hover:to-[#0f2d56] text-white cursor-pointer"
          >
            Apply Now
          </button>
        </div>
        {isBreEvaluated && (
          <p className="text-center text-[10px] text-slate-400 mt-2 leading-snug">
            *The calculation is done according to our lender policy.
          </p>
        )}
      </div>
    );
  };

  // One slide in the "Unmatched Offers" slider — starts as a compact summary
  // (logo, name, badge, (i) reasons tooltip); tapping it expands in place into
  // the exact same BankCard eligible lenders use, so the full ROI/EMI/Tenure/
  // Loan-Amount data and Apply/Share actions are identical, just revealed on tap
  // instead of always-on.
  const IneligibleSlide = ({ bank, index }: { bank: any, index: number }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const reasons: string[] = bank.ineligible_reasons || [];

    if (isExpanded) {
      return (
        <div className="snap-start shrink-0 w-[300px] relative">
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
            className="absolute top-3 left-3 z-20 bg-white border border-slate-200 rounded-full p-1.5 shadow-sm hover:bg-slate-50"
          >
            <ChevronDown size={14} className="text-slate-500 rotate-180" />
          </button>
          <BankCard bank={bank} index={index} />
        </div>
      );
    }

    return (
      <div
        className="snap-start shrink-0 w-[180px] h-[160px] flex flex-col bg-white rounded-2xl p-4 shadow-sm border border-slate-200 opacity-80 grayscale-[20%] cursor-pointer transition-all hover:opacity-100 hover:grayscale-0"
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="w-[44px] h-[34px] bg-white border border-slate-200 rounded-lg flex items-center justify-center p-1 overflow-hidden relative shrink-0">
            {bank.logo_url && (
              <img
                src={resolveImageUrl(bank.logo_url)}
                alt={bank.bank_name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.logo-fallback');
                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                }}
              />
            )}
            <span className={`logo-fallback font-extrabold text-[10px] text-slate-700 w-full h-full items-center justify-center bg-slate-100 ${bank.logo_url ? 'hidden' : 'flex'}`}>
              {bank.bank_name?.substring(0, 2).toUpperCase()}
            </span>
          </div>
          {reasons.length > 0 && (
            <span className="relative flex items-center group/tooltip" onClick={(e) => e.stopPropagation()}>
              <Info size={13} className="cursor-help text-slate-400" />
              <div className="hidden group-hover/tooltip:block absolute top-full right-0 mt-2 w-56 bg-slate-800 text-white text-[11px] font-normal rounded-lg p-3 shadow-xl z-50 leading-relaxed">
                <ul className="list-disc list-outside pl-3.5 space-y-1">
                  {reasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
                <div className="absolute -top-1 right-3 w-2 h-2 bg-slate-800 rotate-45" />
              </div>
            </span>
          )}
        </div>

        <h4 className="flex-1 font-bold text-slate-700 text-[12px] uppercase tracking-wide leading-tight line-clamp-2 mb-1.5">
          {bank.bank_name}
        </h4>

        <div className="flex items-center justify-between">
          <span className="inline-block bg-slate-100 text-slate-500 text-[9px] font-extrabold px-2 py-1 rounded-md uppercase tracking-wider">
            Not Eligible
          </span>
          <ChevronDown size={14} className="text-slate-400 shrink-0" />
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full min-h-[600px] flex flex-col bg-gradient-to-b from-[#eef2ff] via-[#f8faff] to-[#ecfdf5] md:-mx-8 px-0 md:px-8 py-6 rounded-2xl">
      <div className="w-full flex-1 md:max-w-md md:mx-auto">

        {/* Alert Banner */}
        <div className="mb-5 bg-[#dcfce7] rounded-xl p-3.5 flex gap-3 items-center shadow-sm border border-[#bbf7d0]">
          <div className="bg-[#86efac] p-2 rounded-lg text-emerald-800 shrink-0">
            <Megaphone size={18} className="rotate-[-15deg]" />
          </div>
          <p className="text-[13px] text-emerald-800 font-medium leading-snug pr-2">
            We've carefully selected {serviceableBanks.filter(b => b.is_serviceable).length || serviceableBanks.length || 5} of the best used car loan offers for your customers.
          </p>
        </div>

        {/* Loading States */}
        {loading && serviceableBanks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="animate-spin text-[#818CF8] mb-4" size={40} />
            <p className="text-slate-600 font-medium">Generating Product Recommendations...</p>
            {(idvLoading || apiIdvLoading) && <p className="text-xs text-slate-400 mt-2">Fetching vehicle valuation (IDV) details...</p>}
          </div>
        ) : errorMessage ? (
          <div className="bg-red-50 border border-red-200 p-6 rounded-2xl text-center">
            <p className="text-red-600 font-medium mb-4">{errorMessage}</p>
            <button onClick={onBack} className="text-sm font-bold text-red-600 underline">Go Back</button>
          </div>
        ) : serviceableBanks.length > 0 ? (
          <>
            {/* Cards List — eligible lenders only */}
            <div className="space-y-1">
              {eligibleSortedBanks.map((bank, i) => (
                <BankCard key={i} bank={bank} index={i} />
              ))}
            </div>

            {/* Unmatched Offers — ineligible lenders, horizontal slider of
                compact cards; tapping one expands it into the same BankCard
                (full ROI/EMI/Tenure/Loan-Amount data, Apply/Share actions,
                Ineligible badge + (i) reasons tooltip) eligible lenders use. */}
            {ineligibleSortedBanks.length > 0 && (
              <div className="mt-6">
                <h4 className="text-[13px] font-extrabold text-slate-700 mb-1">Unmatched Offers</h4>
                <p className="text-[11px] text-slate-400 mb-3 leading-snug">
                  These lenders couldn't be matched for this profile. This could be due to lender policy, credit score or previous loan history — tap a card for details.
                </p>
                <div className="flex items-start gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
                  {ineligibleSortedBanks.map((bank, i) => (
                    <IneligibleSlide key={i} bank={bank} index={i} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl text-center">
            <p className="text-orange-600 font-medium">No serviceable lenders found for this profile.</p>
          </div>
        )}

      </div>

      {/* Action Navigation Buttons */}
      <div className="pt-6 mt-6 border-t border-slate-200 flex justify-between gap-3 pb-4">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-[13px] hover:bg-slate-50 transition"
        >
          Back
        </button>
        <button
          onClick={() => {
            if (!selectedLoanId) {
              toast.error("Please select a bank to proceed.");
              return;
            }
            onNext();
          }}
          className={`px-6 py-3 flex items-center justify-center gap-2 rounded-xl font-bold text-[13px] transition-all ${
            selectedLoanId
              ? 'bg-gradient-to-r from-[#818CF8] to-[#6366f1] text-white shadow-md hover:opacity-90 active:scale-[0.98]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
          }`}
        >
          Next <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

