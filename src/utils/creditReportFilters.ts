import { FilterState } from '@/components/AdvancedFilterPanel';

const ACCOUNT_TYPE_MAP: Record<string, string> = {
  '01': 'Auto Loan (Personal)', '1': 'Auto Loan (Personal)',
  '02': 'Home Loan', '2': 'Home Loan',
  '03': 'Property Loan', '3': 'Property Loan',
  '05': 'Personal Loan', '5': 'Personal Loan',
  '06': 'Consumer Loan', '6': 'Consumer Loan',
  '07': 'Gold Loan', '7': 'Gold Loan',
  '08': 'Education Loan', '8': 'Education Loan',
  '10': 'Credit Card',
  '11': 'Leasing',
  '12': 'Overdraft',
  '13': 'Two-Wheeler Loan',
  '15': 'Commercial Vehicle Loan',
  '32': 'Used Car Loan',
  '51': 'Business Loan',
  '69': 'Short Term Personal Loan',
};

function getAccountTypeName(code: any): string {
  const codeStr = String(code || '').trim();
  if (ACCOUNT_TYPE_MAP[codeStr]) {
    return ACCOUNT_TYPE_MAP[codeStr];
  }
  
  const upperCode = codeStr.toUpperCase();
  if (upperCode.includes('CREDIT CARD')) return 'Credit Card';
  if (upperCode.includes('AUTO LOAN')) return 'Auto Loan (Personal)';
  if (upperCode.includes('PERSONAL LOAN')) return 'Personal Loan';
  if (upperCode.includes('HOME LOAN') || upperCode.includes('HOUSING')) return 'Housing Loan';
  if (upperCode.includes('BUSINESS')) {
    if (upperCode.includes('SECURED')) return 'Business Loan - Secured';
    if (upperCode.includes('UNSECURED')) return 'Business Loan Unsecured';
    if (upperCode.includes('AGRICULTURE')) return 'Business Loan Priority Sector Agriculture';
    if (upperCode.includes('SMALL BUSINESS')) return 'Business Loan Priority Sector Small Business';
    return 'Business Loan General';
  }
  if (upperCode.includes('CONSUMER')) return 'Consumer Loan';
  if (upperCode.includes('GOLD')) return 'Gold Loan';
  if (upperCode.includes('PROPERTY')) return 'Property Loan';
  if (upperCode.includes('OVERDRAFT')) return 'Overdraft';
  if (upperCode.includes('MUDRA')) return 'Mudra Loans';
  if (upperCode.includes('TRACTOR')) return 'Tractor Loan';
  if (upperCode.includes('TWO WHEELER') || upperCode.includes('TWO-WHEELER')) return 'Two-Wheeler Loan';
  if (upperCode.includes('COMMERCIAL VEHICLE')) return 'Commercial Vehicle Loan';
  if (upperCode.includes('KISAN')) return 'Kisan Credit Card';
  
  return codeStr || 'Other';
}

function compareNumeric(
  value: number | null | undefined,
  operator: string,
  filterValue: number | null,
  filterMin: number | null,
  filterMax: number | null
): boolean {
  if (value === null || value === undefined) return false;
  
  switch (operator) {
    case 'equals':
      return filterValue !== null && value === filterValue;
    case 'gt':
      return filterValue !== null && value > filterValue;
    case 'gte':
      return filterValue !== null && value >= filterValue;
    case 'lt':
      return filterValue !== null && value < filterValue;
    case 'lte':
      return filterValue !== null && value <= filterValue;
    case 'between':
      return filterMin !== null && filterMax !== null && value >= filterMin && value <= filterMax;
    case 'notBetween':
      return filterMin !== null && filterMax !== null && (value < filterMin || value > filterMax);
    default:
      return true;
  }
}

export interface CreditReportAccount {
  account_type?: any;
  account_status?: string;
  sanctioned_amount?: number;
  highest_credit_or_original_loan_amount?: number;
  credit_limit_amount?: number;
  current_balance?: number;
  amount_overdue?: number;
  amount_past_due?: number;
  dpd?: number;
  days_past_due?: number;
  subscriber_name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  [key: string]: any;
}

export function applyAdvancedFilters(
  accounts: CreditReportAccount[],
  filters: FilterState
): CreditReportAccount[] {
  return accounts.filter(account => {
    if (filters.accountStatus !== 'all') {
      const status = String(account.account_status || '').toLowerCase();
      if (filters.accountStatus === 'active' && status !== 'active') return false;
      if (filters.accountStatus === 'closed' && status !== 'closed') return false;
    }
    
    if (filters.accountTypes.length > 0) {
      const accountType = getAccountTypeName(account.account_type);
      if (!filters.accountTypes.includes(accountType)) return false;
    }
    
    const loanAmount = Number(
      account.sanctioned_amount ||
      account.highest_credit_or_original_loan_amount ||
      account.credit_limit_amount ||
      account.current_balance ||
      0
    );
    
    if (filters.loanAmount.value !== null || filters.loanAmount.min !== null || filters.loanAmount.max !== null) {
      if (!compareNumeric(
        loanAmount,
        filters.loanAmount.operator,
        filters.loanAmount.value,
        filters.loanAmount.min,
        filters.loanAmount.max
      )) return false;
    }
    
    if (filters.address.city || filters.address.state || filters.address.pincode) {
      const accountAddress = String(account.address || '').toLowerCase();
      const accountCity = String(account.city || '').toLowerCase();
      const accountState = String(account.state || '').toLowerCase();
      const accountPincode = String(account.pincode || '');
      
      if (filters.address.city && !accountCity.includes(filters.address.city.toLowerCase()) && !accountAddress.includes(filters.address.city.toLowerCase())) {
        return false;
      }
      if (filters.address.state && !accountState.includes(filters.address.state.toLowerCase()) && !accountAddress.includes(filters.address.state.toLowerCase())) {
        return false;
      }
      if (filters.address.pincode && !accountPincode.includes(filters.address.pincode)) {
        return false;
      }
    }
    
    const dpd = Number(account.dpd || account.days_past_due || 0);
    if (filters.dpd.value !== null || filters.dpd.min !== null || filters.dpd.max !== null) {
      if (!compareNumeric(
        dpd,
        filters.dpd.operator,
        filters.dpd.value,
        filters.dpd.min,
        filters.dpd.max
      )) return false;
    }
    
    if (filters.overdueAmount !== 'all') {
      const overdueAmount = Number(account.amount_overdue || account.amount_past_due || 0);
      if (filters.overdueAmount === 'nil' && overdueAmount !== 0) return false;
      if (filters.overdueAmount === 'yes' && overdueAmount <= 0) return false;
    }
    
    return true;
  });
}

export function filterReportsByCibilScore(
  reports: any[],
  cibilFilter: FilterState['cibilScore']
): any[] {
  if (cibilFilter.min === null && cibilFilter.max === null) return reports;

  return reports.filter(report => {
    const score = Number(report.credit_score);
    if (!score) return false;
    if (cibilFilter.min !== null && score < cibilFilter.min) return false;
    if (cibilFilter.max !== null && score > cibilFilter.max) return false;
    return true;
  });
}

// Account-level cross-filter: a report passes only if at least one account satisfies ALL active account-level filters simultaneously
function accountMatchesFilters(
  account: CreditReportAccount,
  filters: Pick<FilterState, 'accountTypes' | 'accountStatus' | 'lenders' | 'loanAmount' | 'creditCardLimit' | 'dpd' | 'overdueAmount'>
): boolean {
  if (filters.accountStatus !== 'all') {
    const status = String(account.account_status || '').toLowerCase();
    if (status !== filters.accountStatus) return false;
  }

  if (filters.accountTypes.length > 0) {
    if (!filters.accountTypes.includes(getAccountTypeName(account.account_type))) return false;
  }

  if (filters.lenders.length > 0) {
    const subscriberName = String(account.subscriber_name || '').trim().toLowerCase();
    if (!filters.lenders.some(l => l.toLowerCase() === subscriberName)) return false;
  }

  if (filters.loanAmount.min !== null || filters.loanAmount.max !== null) {
    const loanAmount = Number(
      account.sanctioned_amount ||
      account.highest_credit_or_original_loan_amount ||
      account.credit_limit_amount ||
      account.current_balance ||
      0
    );
    if (filters.loanAmount.min !== null && loanAmount < filters.loanAmount.min) return false;
    if (filters.loanAmount.max !== null && loanAmount > filters.loanAmount.max) return false;
  }

  if (filters.creditCardLimit.min !== null || filters.creditCardLimit.max !== null) {
    const accType = String(account.account_type || '');
    const isCreditCard = accType === '10' || accType.toUpperCase().includes('CREDIT CARD');
    if (!isCreditCard) return false;
    const creditLimit = Number(account.credit_limit || account.credit_limit_amount || account.highest_credit_or_original_loan_amount || 0);
    if (filters.creditCardLimit.min !== null && creditLimit < filters.creditCardLimit.min) return false;
    if (filters.creditCardLimit.max !== null && creditLimit > filters.creditCardLimit.max) return false;
  }

  if (filters.dpd.value !== null || filters.dpd.min !== null || filters.dpd.max !== null) {
    const dpd = Number(account.dpd || account.days_past_due || 0);
    if (!compareNumeric(dpd, filters.dpd.operator, filters.dpd.value, filters.dpd.min, filters.dpd.max)) return false;
  }

  if (filters.overdueAmount !== 'all') {
    const overdueAmount = Number(account.amount_overdue || account.amount_past_due || 0);
    if (filters.overdueAmount === 'nil' && overdueAmount !== 0) return false;
    if (filters.overdueAmount === 'yes' && overdueAmount <= 0) return false;
  }

  return true;
}

function hasActiveAccountFilters(filters: FilterState): boolean {
  return (
    filters.accountStatus !== 'all' ||
    filters.accountTypes.length > 0 ||
    filters.lenders.length > 0 ||
    (filters.loanAmount.min !== null || filters.loanAmount.max !== null) ||
    (filters.creditCardLimit.min !== null || filters.creditCardLimit.max !== null) ||
    (filters.dpd.value !== null || filters.dpd.min !== null || filters.dpd.max !== null) ||
    filters.overdueAmount !== 'all'
  );
}

export function filterReportsByAllAccountFilters(reports: any[], filters: FilterState): any[] {
  if (!hasActiveAccountFilters(filters)) return reports;
  return reports.filter(report =>
    (report.report_data?.full_report?.accounts || []).some((a: CreditReportAccount) =>
      accountMatchesFilters(a, filters)
    )
  );
}

export function filterReportsByAccountTypes(reports: any[], accountTypes: string[]): any[] {
  if (accountTypes.length === 0) return reports;
  return reports.filter(report =>
    (report.report_data?.full_report?.accounts || []).some((a: CreditReportAccount) =>
      accountTypes.includes(getAccountTypeName(a.account_type))
    )
  );
}

export function filterReportsByAccountStatus(reports: any[], accountStatus: 'all' | 'active' | 'closed'): any[] {
  if (accountStatus === 'all') return reports;
  return reports.filter(report =>
    (report.report_data?.full_report?.accounts || []).some((a: CreditReportAccount) =>
      String(a.account_status || '').toLowerCase() === accountStatus
    )
  );
}

export function filterReportsByLoanAmount(reports: any[], loanAmountFilter: FilterState['loanAmount']): any[] {
  if (loanAmountFilter.value === null && loanAmountFilter.min === null && loanAmountFilter.max === null) return reports;
  return reports.filter(report =>
    (report.report_data?.full_report?.accounts || []).some((a: CreditReportAccount) =>
      compareNumeric(
        Number(a.sanctioned_amount || a.highest_credit_or_original_loan_amount || a.credit_limit_amount || a.current_balance || 0),
        loanAmountFilter.operator, loanAmountFilter.value, loanAmountFilter.min, loanAmountFilter.max
      )
    )
  );
}

export function filterReportsByCreditCardLimit(reports: any[], creditCardLimitFilter: FilterState['creditCardLimit']): any[] {
  if (creditCardLimitFilter.value === null && creditCardLimitFilter.min === null && creditCardLimitFilter.max === null) return reports;
  return reports.filter(report =>
    (report.report_data?.full_report?.accounts || []).some((a: CreditReportAccount) => {
      const typeName = getAccountTypeName(a.account_type);
      const isCreditCard = typeName === 'Credit Card' || typeName === 'Secured Credit Card' || String(a.account_type || '') === '10' || String(a.account_type || '').toUpperCase().includes('CREDIT CARD');
      if (!isCreditCard) return false;
      return compareNumeric(
        Number(a.credit_limit || a.credit_limit_amount || a.highest_credit_or_original_loan_amount || 0),
        creditCardLimitFilter.operator, creditCardLimitFilter.value, creditCardLimitFilter.min, creditCardLimitFilter.max
      );
    })
  );
}

export function filterReportsByDPD(reports: any[], dpdFilter: FilterState['dpd']): any[] {
  if (dpdFilter.value === null && dpdFilter.min === null && dpdFilter.max === null) return reports;
  return reports.filter(report =>
    (report.report_data?.full_report?.accounts || []).some((a: CreditReportAccount) =>
      compareNumeric(Number(a.dpd || a.days_past_due || 0), dpdFilter.operator, dpdFilter.value, dpdFilter.min, dpdFilter.max)
    )
  );
}

export function filterReportsByOverdueAmount(reports: any[], overdueFilter: FilterState['overdueAmount']): any[] {
  if (overdueFilter === 'all') return reports;
  return reports.filter(report =>
    (report.report_data?.full_report?.accounts || []).some((a: CreditReportAccount) => {
      const overdueAmount = Number(a.amount_overdue || a.amount_past_due || 0);
      if (overdueFilter === 'nil') return overdueAmount === 0;
      if (overdueFilter === 'yes') return overdueAmount > 0;
      return true;
    })
  );
}

export function filterReportsByAddress(reports: any[], addressFilter: FilterState['address']): any[] {
  if (!addressFilter.city && !addressFilter.state && !addressFilter.pincode) return reports;

  const matchesAddress = (city: string, state: string, pincode: string, address: string) => {
    if (addressFilter.city && !city.includes(addressFilter.city.toLowerCase()) && !address.includes(addressFilter.city.toLowerCase())) return false;
    if (addressFilter.state && !state.includes(addressFilter.state.toLowerCase()) && !address.includes(addressFilter.state.toLowerCase())) return false;
    if (addressFilter.pincode && !pincode.includes(addressFilter.pincode)) return false;
    return true;
  };

  return reports.filter(report => {
    const personal = report.report_data?.full_report?.personal || {};
    if (matchesAddress(
      String(personal.city || '').toLowerCase(),
      String(personal.state || '').toLowerCase(),
      String(personal.pincode || ''),
      String(personal.address || '').toLowerCase()
    )) return true;

    return (report.report_data?.full_report?.accounts || []).some((a: CreditReportAccount) =>
      matchesAddress(
        String(a.city || '').toLowerCase(),
        String(a.state || '').toLowerCase(),
        String(a.pincode || ''),
        String(a.address || '').toLowerCase()
      )
    );
  });
}

export function filterReportsByLenders(reports: any[], lenders: string[]): any[] {
  if (lenders.length === 0) return reports;
  const lowerLenders = lenders.map(l => l.toLowerCase());
  return reports.filter(report =>
    (report.report_data?.full_report?.accounts || []).some((a: CreditReportAccount) =>
      lowerLenders.includes(String(a.subscriber_name || '').trim().toLowerCase())
    )
  );
}

export function extractAllLenders(reports: any[]): string[] {
  const lendersSet = new Set<string>();
  lendersSet.add("Bank of India");
  
  reports.forEach(report => {
    const accounts = report.report_data?.full_report?.accounts || [];
    accounts.forEach((account: CreditReportAccount) => {
      const subscriberName = String(account.subscriber_name || '').trim();
      if (subscriberName && subscriberName !== 'N/A' && subscriberName !== '' && subscriberName !== 'undefined') {
        lendersSet.add(subscriberName);
      }
    });
  });
  
  // Sort alphabetically and return
  return Array.from(lendersSet).sort((a, b) => a.localeCompare(b));
}
