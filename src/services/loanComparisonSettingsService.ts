export interface LenderCharges {
  stamp_duty: number;       // default: 0.35 (%)
  processing_fee: number;   // default: 1.5 (%)
  valuation: number;        // default: 1000 (INR)
  pdd: number;              // default: 1000 (INR)
  foreclosure: number;      // default: 5 (%)
  rto_purchase?: number;    // default: 6000 (INR base + Road Tax)
  rto_refinance?: number;   // default: 4000 (INR)
  rto_bt_topup?: number;    // default: 4000 (INR)
  rto_purchase_financed?: number;      // default: 6000 (INR agent fee + Road Tax)
  rto_purchase_not_financed?: number;  // default: 4000 (INR agent fee + Road Tax)
  rto_refinance_financed?: number;     // default: 4000 (INR)
  rto_refinance_not_financed?: number; // default: 2000 (INR)
  other_mandatory_below_5l?: number; // default: 4000 (INR) if loan amount < 5L
  other_mandatory_above_5l?: number; // default: 6000 (INR) if loan amount >= 5L
}

export interface BankCompareChargesConfig {
  stamp_duty_percentage: number;       // default: 0.35 (%)
  valuation_charges_base: number;      // default: 1000 (INR)
  pdd_charges_base: number;            // default: 1000 (INR)
  foreclosure_percentage: number;      // default: 5 (%)
  gst_percentage: number;              // default: 18 (%)
  rto_charges_purchase_base: number;   // default: 6000 (Road Tax + 6000)
  rto_charges_refinance: number;       // default: 4000 (INR)
  rto_charges_bt_topup: number;        // default: 4000 (INR)
  rto_purchase_financed: number;       // default: 6000 (Road Tax + 6000)
  rto_purchase_not_financed: number;   // default: 4000 (Road Tax + 4000)
  rto_refinance_financed: number;      // default: 4000 (INR)
  rto_refinance_not_financed: number;  // default: 2000 (INR)
  other_mandatory_below_5l: number;    // default: 4000 (INR) if loan < 5 Lakhs
  other_mandatory_above_5l: number;    // default: 6000 (INR) if loan >= 5 Lakhs
  bank_processing_fees: Record<string, number>; // e.g. { "idfc": 1.3 }
  bank_charges?: Record<string, LenderCharges>;
}

export const DEFAULT_BANK_COMPARE_CHARGES: BankCompareChargesConfig = {
  stamp_duty_percentage: 0.35,
  valuation_charges_base: 1000,
  pdd_charges_base: 1000,
  foreclosure_percentage: 5,
  gst_percentage: 18,
  rto_charges_purchase_base: 6000,
  rto_charges_refinance: 4000,
  rto_charges_bt_topup: 4000,
  rto_purchase_financed: 6000,
  rto_purchase_not_financed: 4000,
  rto_refinance_financed: 4000,
  rto_refinance_not_financed: 2000,
  other_mandatory_below_5l: 4000,
  other_mandatory_above_5l: 6000,
  bank_processing_fees: {
    aubank: 1.5,
    axis: 1.5,
    bajaj: 1.5,
    bandhan: 1.5,
    chola: 1.5,
    duggar: 1.5,
    equitas: 1.5,
    esaf: 1.5,
    federal: 1.5,
    fortunefinance: 1.5,
    hdb: 1.5,
    hdfc: 1.5,
    herofincorp: 1.5,
    icici: 1.25,
    idfc: 1.3,
    idfc_urban: 1.3,
    ikf: 1.5,
    indostar: 1.5,
    indusind: 1.5,
    jana: 1.5,
    kogta: 1.5,
    kotak: 1.5,
    loans24: 1.5,
    mahindra: 1.5,
    manappuram: 1.5,
    muthoot: 1.5,
    nissan: 1.5,
    piramal: 1.5,
    poonawalla: 1.5,
    rbl: 1.5,
    saraswat: 1.5,
    sundram: 1.5,
    suryoday: 1.5,
    tatacapital: 1.5,
    toyota: 1.5,
    tvs: 1.5,
    vastu: 1.5,
    yes: 1.25
  },
  bank_charges: {
    aubank: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    axis: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    bajaj: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    bandhan: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    chola: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    duggar: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    equitas: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    esaf: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    federal: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    fortunefinance: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    hdb: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    hdfc: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    herofincorp: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    icici: { stamp_duty: 0.35, processing_fee: 1.25, valuation: 1000, pdd: 1000, foreclosure: 5 },
    idfc: { stamp_duty: 0.35, processing_fee: 1.3, valuation: 1000, pdd: 1000, foreclosure: 5 },
    idfc_urban: { stamp_duty: 0.35, processing_fee: 1.3, valuation: 1000, pdd: 1000, foreclosure: 5 },
    ikf: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    indostar: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    indusind: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    jana: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    kogta: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    kotak: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    loans24: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    mahindra: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    manappuram: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    muthoot: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    nissan: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    piramal: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    poonawalla: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    rbl: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    saraswat: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    sundram: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    suryoday: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    tatacapital: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    toyota: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    tvs: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    vastu: { stamp_duty: 0.35, processing_fee: 1.5, valuation: 1000, pdd: 1000, foreclosure: 5 },
    yes: { stamp_duty: 0.35, processing_fee: 1.25, valuation: 1000, pdd: 1000, foreclosure: 5 }
  }
};

/**
 * Resolves the backend base URL:
 * - Uses VITE_API_URL or VITE_API_BASE_URL if configured
 * - Uses http://localhost:5000 in local dev if running locally
 * - Defaults to https://api.finonest.com
 */
export const getSettingsApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
  
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000';
  }
  
  return 'https://api.finonest.com';
};

/**
 * Retrieves the current JWT token from cookie or localStorage
 */
export const getAdminAuthToken = (): string | null => {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp('(^| )auth_token=([^;]+)'));
    if (match && match[2]) return decodeURIComponent(match[2]);
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('auth_token') || localStorage.getItem('token') || null;
  }
  return null;
};

/**
 * Fetches the current Bank Compare Charges configuration from the backend
 * GET /api/settings/bank_compare_charges
 */
export const fetchBankCompareCharges = async (customBaseUrl?: string): Promise<{
  config: BankCompareChargesConfig;
  rawResponse: any;
  updatedAt?: string;
  isDefault?: boolean;
}> => {
  const baseUrl = customBaseUrl || getSettingsApiBaseUrl();
  const token = getAdminAuthToken();

  const headers: Record<string, string> = {
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}/api/settings/bank_compare_charges`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    if (response.status === 404) {
      return {
        config: { ...DEFAULT_BANK_COMPARE_CHARGES },
        rawResponse: null,
        isDefault: true
      };
    }
    throw new Error(`Failed to load comparison charges (${response.status}: ${response.statusText})`);
  }

  const data = await response.json();
  let parsedConfig: BankCompareChargesConfig = { ...DEFAULT_BANK_COMPARE_CHARGES };

  // Response structure: { success: true, setting: { value: string }, value: string }
  const rawValue = data.setting?.value ?? data.value ?? (typeof data === 'object' && !data.setting && !data.value ? data : null);

  const normalizeConfig = (parsed: any): BankCompareChargesConfig => {
    const rawBankFees: Record<string, number> = {
      ...DEFAULT_BANK_COMPARE_CHARGES.bank_processing_fees,
      ...(parsed.bank_processing_fees || {})
    };

    const rawBankCharges: Record<string, Partial<LenderCharges>> = {
      ...(DEFAULT_BANK_COMPARE_CHARGES.bank_charges || {}),
      ...(parsed.bank_charges || {})
    };

    // Ensure all lenders have full charges populated
    const baseStampDuty = Number(parsed.stamp_duty_percentage) ?? DEFAULT_BANK_COMPARE_CHARGES.stamp_duty_percentage;
    const baseValuation = Number(parsed.valuation_charges_base) ?? DEFAULT_BANK_COMPARE_CHARGES.valuation_charges_base;
    const basePdd = Number(parsed.pdd_charges_base) ?? DEFAULT_BANK_COMPARE_CHARGES.pdd_charges_base;
    const baseForeclosure = Number(parsed.foreclosure_percentage) ?? DEFAULT_BANK_COMPARE_CHARGES.foreclosure_percentage;
    const baseRtoPurchase = Number(parsed.rto_charges_purchase_base) ?? DEFAULT_BANK_COMPARE_CHARGES.rto_charges_purchase_base;
    const baseRtoRefinance = Number(parsed.rto_charges_refinance) ?? DEFAULT_BANK_COMPARE_CHARGES.rto_charges_refinance;
    const baseRtoBt = Number(parsed.rto_charges_bt_topup) ?? DEFAULT_BANK_COMPARE_CHARGES.rto_charges_bt_topup;
    const baseOtherMandatoryBelow5l = Number(parsed.other_mandatory_below_5l) ?? DEFAULT_BANK_COMPARE_CHARGES.other_mandatory_below_5l;
    const baseOtherMandatoryAbove5l = Number(parsed.other_mandatory_above_5l) ?? DEFAULT_BANK_COMPARE_CHARGES.other_mandatory_above_5l;

    const allKeys = Array.from(new Set([...Object.keys(rawBankFees), ...Object.keys(rawBankCharges)]));
    const finalBankCharges: Record<string, LenderCharges> = {};

    for (const key of allKeys) {
      const existing: Partial<LenderCharges> = rawBankCharges[key] || {};
      const fee = existing.processing_fee ?? rawBankFees[key] ?? 1.5;
      finalBankCharges[key] = {
        stamp_duty: existing.stamp_duty !== undefined ? Number(existing.stamp_duty) : baseStampDuty,
        processing_fee: Number(fee),
        valuation: existing.valuation !== undefined ? Number(existing.valuation) : baseValuation,
        pdd: existing.pdd !== undefined ? Number(existing.pdd) : basePdd,
        foreclosure: existing.foreclosure !== undefined ? Number(existing.foreclosure) : baseForeclosure,
        rto_purchase: existing.rto_purchase !== undefined ? Number(existing.rto_purchase) : baseRtoPurchase,
        rto_refinance: existing.rto_refinance !== undefined ? Number(existing.rto_refinance) : baseRtoRefinance,
        rto_bt_topup: existing.rto_bt_topup !== undefined ? Number(existing.rto_bt_topup) : baseRtoBt,
        other_mandatory_below_5l: existing.other_mandatory_below_5l !== undefined ? Number(existing.other_mandatory_below_5l) : baseOtherMandatoryBelow5l,
        other_mandatory_above_5l: existing.other_mandatory_above_5l !== undefined ? Number(existing.other_mandatory_above_5l) : baseOtherMandatoryAbove5l
      };
      rawBankFees[key] = finalBankCharges[key].processing_fee;
    }

    return {
      ...DEFAULT_BANK_COMPARE_CHARGES,
      ...parsed,
      bank_processing_fees: rawBankFees,
      bank_charges: finalBankCharges
    };
  };

  if (typeof rawValue === 'string') {
    try {
      const parsed = JSON.parse(rawValue);
      parsedConfig = normalizeConfig(parsed);
    } catch (e) {
      console.warn('Unable to parse setting JSON string, falling back to defaults:', e);
    }
  } else if (typeof rawValue === 'object' && rawValue !== null) {
    parsedConfig = normalizeConfig(rawValue);
  }

  return {
    config: parsedConfig,
    rawResponse: data,
    updatedAt: data.setting?.updated_at || data.updated_at,
    isDefault: !!data.setting?.is_default
  };
};

/**
 * Saves updated Bank Compare Charges configuration to the backend
 * PUT /api/settings/bank_compare_charges
 */
export const saveBankCompareCharges = async (
  config: BankCompareChargesConfig,
  customBaseUrl?: string
): Promise<{ success: boolean; message?: string; rawResponse: any }> => {
  const baseUrl = customBaseUrl || getSettingsApiBaseUrl();
  const token = getAdminAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const body = {
    value: JSON.stringify(config)
  };

  const response = await fetch(`${baseUrl}/api/settings/bank_compare_charges`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      errorDetail = errJson.error || errJson.message || errorDetail;
    } catch {
      // ignore
    }
    throw new Error(`Failed to save comparison charges: ${errorDetail}`);
  }

  const data = await response.json();
  return {
    success: true,
    message: data.message || 'Settings saved successfully',
    rawResponse: data
  };
};

/**
 * Calculates accurate customer-facing loan fees and net in-hand disbursal
 * matching the customer portal (finonest.com) calculation logic
 */
export interface DisbursalCalculationResult {
  loanAmount: number;
  bankKey: string;
  bankProcessingRate: number;
  processingFeeBase: number;
  processingFeeGst: number;
  totalProcessingFee: number;
  stampDutyAmount: number;
  valuationBase: number;
  valuationGst: number;
  totalValuation: number;
  pddBase: number;
  pddGst: number;
  totalPdd: number;
  rtoAmount: number;
  rtoDescription: string;
  otherMandatoryAmount: number;
  otherMandatoryDescription: string;
  totalStatutoryCharges: number;
  totalDeductions: number;
  netInHandDisbursal: number;
  foreclosureRate: number;
  foreclosureBase: number;
  foreclosureGst: number;
  foreclosureEstimate: number;
}

export const calculateDisbursalBreakdown = (
  loanAmount: number,
  bankKey: string,
  config: BankCompareChargesConfig,
  caseType?: string,
  roadTaxAmount?: number,
  isVehicleFinanced: boolean = true
): DisbursalCalculationResult => {
  const sanitizedAmount = Math.max(0, Number(loanAmount) || 0);
  const gstRate = (Number(config.gst_percentage) || 18) / 100;

  const lenderOverride = config.bank_charges?.[bankKey];

  // Processing Fee
  const bankProcessingRate = Number(lenderOverride?.processing_fee ?? config.bank_processing_fees?.[bankKey]) ?? 1.3;
  const processingFeeBase = Math.round((sanitizedAmount * bankProcessingRate) / 100);
  const processingFeeGst = Math.round(processingFeeBase * gstRate);
  const totalProcessingFee = processingFeeBase + processingFeeGst;

  // Stamp Duty (Statutory percentage directly on loan principal)
  const stampDutyRate = (Number(lenderOverride?.stamp_duty ?? config.stamp_duty_percentage) || 0.35) / 100;
  const stampDutyAmount = Math.round(sanitizedAmount * stampDutyRate);

  // Valuation Charges (Base + GST)
  const valuationBase = Number(lenderOverride?.valuation ?? config.valuation_charges_base) || 1000;
  const valuationGst = Math.round(valuationBase * gstRate);
  const totalValuation = valuationBase + valuationGst;

  // PDD Charges (Base + GST)
  const pddBase = Number(lenderOverride?.pdd ?? config.pdd_charges_base) || 1000;
  const pddGst = Math.round(pddBase * gstRate);
  const totalPdd = pddBase + pddGst;

  // RTO Charges based on case type & vehicle finance status:
  // 1. Purchase:
  //    - Financed: 6000 + Road Tax
  //    - Not Financed: 4000 + Road Tax
  // 2. Refinance / BT:
  //    - Financed: 4000
  //    - Not Financed: 2000
  const normCase = (caseType || 'refinance').toLowerCase();
  const isRefinanceOrBt = normCase.includes('refinance') || normCase.includes('bt') || normCase.includes('top');
  let rtoAmount = 0;
  let rtoDescription = '';

  if (!isRefinanceOrBt) {
    const defaultAgent = isVehicleFinanced ? 6000 : 4000;
    const rtoBase = Number(
      isVehicleFinanced
        ? (lenderOverride?.rto_purchase_financed ?? config.rto_purchase_financed ?? defaultAgent)
        : (lenderOverride?.rto_purchase_not_financed ?? config.rto_purchase_not_financed ?? defaultAgent)
    ) || defaultAgent;
    const roadTax = Number(roadTaxAmount) || 0;
    rtoAmount = roadTax + rtoBase;
    rtoDescription = roadTax > 0
      ? `Road Tax (₹${roadTax.toLocaleString('en-IN')}) + ₹${rtoBase.toLocaleString('en-IN')}`
      : `Road Tax + ₹${rtoBase.toLocaleString('en-IN')}`;
  } else {
    const defaultAgent = isVehicleFinanced ? 4000 : 2000;
    const rtoBase = Number(
      isVehicleFinanced
        ? (lenderOverride?.rto_refinance_financed ?? config.rto_refinance_financed ?? defaultAgent)
        : (lenderOverride?.rto_refinance_not_financed ?? config.rto_refinance_not_financed ?? defaultAgent)
    ) || defaultAgent;
    rtoAmount = rtoBase;
    rtoDescription = `₹${rtoBase.toLocaleString('en-IN')}`;
  }

  // Other Mandatory Charges based on loan amount slab:
  // Loan amount < 5 Lakhs (< ₹5,00,000) -> 4000
  // Loan amount >= 5 Lakhs (>= ₹5,00,000) -> 6000
  const below5lCharge = Number(lenderOverride?.other_mandatory_below_5l ?? config.other_mandatory_below_5l) ?? 4000;
  const above5lCharge = Number(lenderOverride?.other_mandatory_above_5l ?? config.other_mandatory_above_5l) ?? 6000;
  const isBelow5L = sanitizedAmount < 500000;
  const otherMandatoryAmount = isBelow5L ? below5lCharge : above5lCharge;
  const otherMandatoryDescription = isBelow5L
    ? `< ₹5L (₹${below5lCharge.toLocaleString('en-IN')})`
    : `≥ ₹5L (₹${above5lCharge.toLocaleString('en-IN')})`;

  // Total Statutory & Documentation fees
  const totalStatutoryCharges = stampDutyAmount + totalValuation + totalPdd + rtoAmount + otherMandatoryAmount;

  // Total deductions from sanctioned loan
  const totalDeductions = totalProcessingFee + totalStatutoryCharges;

  // Net In-Hand Disbursal to customer account
  const netInHandDisbursal = Math.max(0, sanitizedAmount - totalDeductions);

  // Foreclosure penalty estimate (5% + GST on principal)
  const foreclosureRate = Number(lenderOverride?.foreclosure ?? config.foreclosure_percentage) || 5;
  const foreclosureBase = Math.round((sanitizedAmount * foreclosureRate) / 100);
  const foreclosureGst = Math.round(foreclosureBase * gstRate);
  const foreclosureEstimate = foreclosureBase + foreclosureGst;

  return {
    loanAmount: sanitizedAmount,
    bankKey,
    bankProcessingRate,
    processingFeeBase,
    processingFeeGst,
    totalProcessingFee,
    stampDutyAmount,
    valuationBase,
    valuationGst,
    totalValuation,
    pddBase,
    pddGst,
    totalPdd,
    rtoAmount,
    rtoDescription,
    otherMandatoryAmount,
    otherMandatoryDescription,
    totalStatutoryCharges,
    totalDeductions,
    netInHandDisbursal,
    foreclosureRate,
    foreclosureBase,
    foreclosureGst,
    foreclosureEstimate
  };
};
