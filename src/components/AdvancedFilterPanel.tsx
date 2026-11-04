import { useState } from 'react';
import { X, Search } from 'lucide-react';

export interface FilterState {
  cibilScore: {
    operator: 'equals' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'notBetween';
    value: number | null;
    min: number | null;
    max: number | null;
  };
  accountStatus: 'all' | 'active' | 'closed';
  accountTypes: string[];
  lenders: string[];
  loanAmount: {
    operator: 'equals' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'notBetween';
    value: number | null;
    min: number | null;
    max: number | null;
  };
  creditCardLimit: {
    operator: 'equals' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'notBetween';
    value: number | null;
    min: number | null;
    max: number | null;
  };
  address: {
    city: string;
    state: string;
    pincode: string;
  };
  dpd: {
    operator: 'equals' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'notBetween';
    value: number | null;
    min: number | null;
    max: number | null;
  };
  overdueAmount: 'all' | 'nil' | 'yes';
}

const ACCOUNT_TYPES = [
  'Auto Loan (Personal)', 'Business Loan - Secured', 'Business Loan General',
  'Business Loan Priority Sector Agriculture', 'Business Loan Priority Sector Small Business',
  'Business Loan Unsecured', 'Commercial Vehicle Loan', 'Consumer Loan', 'Credit Card',
  'Gold Loan', 'Housing Loan', 'Kisan Credit Card', 'Loan Against Bank Deposits',
  'Mudra Loans', 'Overdraft', 'Personal Loan', 'Priority Sector Gold Loan',
  'Property Loan', 'Secured Credit Card', 'Short Term Personal Loan',
  'Tractor Loan', 'Two-Wheeler Loan', 'Used Car Loan', 'Other',
];

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'gt', label: 'Greater Than' },
  { value: 'gte', label: 'Greater Than or Equal' },
  { value: 'lt', label: 'Less Than' },
  { value: 'lte', label: 'Less Than or Equal' },
  { value: 'between', label: 'Between' },
  { value: 'notBetween', label: 'Not Between' },
];

const DEFAULT_FILTER_STATE: FilterState = {
  cibilScore: { operator: 'gte', value: null, min: null, max: null },
  accountStatus: 'all',
  accountTypes: [],
  lenders: [],
  loanAmount: { operator: 'gte', value: null, min: null, max: null },
  creditCardLimit: { operator: 'gte', value: null, min: null, max: null },
  address: { city: '', state: '', pincode: '' },
  dpd: { operator: 'gte', value: null, min: null, max: null },
  overdueAmount: 'all',
};

const inputCls = 'h-10 w-full px-3 border border-gray-300 rounded text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 bg-white';
const selectCls = 'h-10 w-full px-3 border border-gray-300 rounded text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 bg-white appearance-none';
const labelCls = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';
const colCls = 'flex flex-col' as const;

interface AdvancedFilterPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onApply: (filters: FilterState) => void;
  onReset: () => void;
  availableLenders: string[];
  initialFilters?: FilterState | null;
}

export default function AdvancedFilterPanel({ isOpen, onToggle, onApply, onReset, availableLenders, initialFilters }: AdvancedFilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters || DEFAULT_FILTER_STATE);
  const [accountTypeSearch, setAccountTypeSearch] = useState('');
  const [showAccountTypeDropdown, setShowAccountTypeDropdown] = useState(false);
  const [lenderSearch, setLenderSearch] = useState('');
  const [showLenderDropdown, setShowLenderDropdown] = useState(false);

  const isRange = (op: string) => op === 'between' || op === 'notBetween';

  const handleApply = () => onApply(filters);

  const handleReset = () => {
    setFilters(DEFAULT_FILTER_STATE);
    setAccountTypeSearch('');
    setLenderSearch('');
    onReset();
  };

  const toggleAccountType = (type: string) => {
    setFilters(prev => {
      const nextTypes = prev.accountTypes.includes(type)
        ? prev.accountTypes.filter(t => t !== type)
        : [...prev.accountTypes, type];
      
      const hasCreditCard = nextTypes.includes('Credit Card') || nextTypes.includes('Secured Credit Card');
      return {
        ...prev,
        accountTypes: nextTypes,
        creditCardLimit: hasCreditCard ? prev.creditCardLimit : { operator: 'gte', value: null, min: null, max: null }
      };
    });
  };

  const toggleLender = (lender: string) => {
    setFilters(prev => ({
      ...prev,
      lenders: prev.lenders.includes(lender)
        ? prev.lenders.filter(l => l !== lender)
        : [...prev.lenders, lender],
    }));
  };

  const filteredAccountTypes = ACCOUNT_TYPES.filter(t =>
    t.toLowerCase().includes(accountTypeSearch.toLowerCase())
  );

  const filteredLenders = availableLenders.filter(l =>
    l.toLowerCase().includes(lenderSearch.toLowerCase())
  );

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="p-4">
        <div className="flex flex-wrap gap-3">

          {/* CIBIL Score */}
          <div className={colCls} style={{ width: 230 }}>
            <label className={labelCls}>CIBIL Score</label>
            <div className="flex gap-1.5">
              <input type="number" placeholder="Min" value={filters.cibilScore.min ?? ''} onChange={e => setFilters(prev => ({ ...prev, cibilScore: { ...prev.cibilScore, min: e.target.value ? Number(e.target.value) : null } }))} className={inputCls} />
              <input type="number" placeholder="Max" value={filters.cibilScore.max ?? ''} onChange={e => setFilters(prev => ({ ...prev, cibilScore: { ...prev.cibilScore, max: e.target.value ? Number(e.target.value) : null } }))} className={inputCls} />
            </div>
          </div>

          {/* Account Status */}
          <div className={colCls} style={{ width: 230 }}>
            <label className={labelCls}>Account Status</label>
            <select
              value={filters.accountStatus}
              onChange={e => setFilters(prev => ({ ...prev, accountStatus: e.target.value as any }))}
              className={selectCls}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Account Types */}
          <div className={colCls} style={{ width: 230 }}>
            <label className={labelCls}>Account Types {filters.accountTypes.length > 0 && `(${filters.accountTypes.length})`}</label>
            <div className="relative">
              <div
                className="h-10 w-full flex items-center gap-1 px-2 border border-gray-300 rounded bg-white overflow-hidden cursor-pointer"
                onClick={() => setShowAccountTypeDropdown(true)}
              >
                {filters.accountTypes.length === 0 ? (
                  <span className="text-xs text-gray-400 flex-1">Search types...</span>
                ) : (
                  <div className="flex items-center gap-1 flex-1 overflow-hidden">
                    {filters.accountTypes.slice(0, 2).map(type => (
                      <span key={type} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] shrink-0">
                        {type.length > 10 ? type.slice(0, 10) + '…' : type}
                        <button onMouseDown={e => { e.stopPropagation(); toggleAccountType(type); }}><X size={9} /></button>
                      </span>
                    ))}
                    {filters.accountTypes.length > 2 && <span className="text-[10px] text-gray-400 shrink-0">+{filters.accountTypes.length - 2}</span>}
                  </div>
                )}
                <Search size={13} className="text-gray-400 shrink-0" />
              </div>
              {showAccountTypeDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowAccountTypeDropdown(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-20">
                    <div className="p-2 border-b border-gray-100">
                      <input type="text" placeholder="Search..." value={accountTypeSearch} onChange={e => setAccountTypeSearch(e.target.value)} className={inputCls} autoFocus />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredAccountTypes.map(type => (
                        <label key={type} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-xs">
                          <input type="checkbox" checked={filters.accountTypes.includes(type)} onChange={() => toggleAccountType(type)} className="w-3.5 h-3.5 rounded border-gray-300" />
                          {type}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Lenders */}
          <div className={colCls} style={{ width: 230 }}>
            <label className={labelCls}>Lenders/Banks {filters.lenders.length > 0 && `(${filters.lenders.length})`}</label>
            <div className="relative">
              <div
                className="h-10 w-full flex items-center gap-1 px-2 border border-gray-300 rounded bg-white overflow-hidden cursor-pointer"
                onClick={() => setShowLenderDropdown(true)}
              >
                {filters.lenders.length === 0 ? (
                  <span className="text-xs text-gray-400 flex-1">Search lenders...</span>
                ) : (
                  <div className="flex items-center gap-1 flex-1 overflow-hidden">
                    {filters.lenders.slice(0, 2).map(lender => (
                      <span key={lender} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] shrink-0">
                        {lender.length > 10 ? lender.slice(0, 10) + '…' : lender}
                        <button onMouseDown={e => { e.stopPropagation(); toggleLender(lender); }}><X size={9} /></button>
                      </span>
                    ))}
                    {filters.lenders.length > 2 && <span className="text-[10px] text-gray-400 shrink-0">+{filters.lenders.length - 2}</span>}
                  </div>
                )}
                <Search size={13} className="text-gray-400 shrink-0" />
              </div>
              {showLenderDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowLenderDropdown(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-20">
                    <div className="p-2 border-b border-gray-100">
                      <input type="text" placeholder="Search..." value={lenderSearch} onChange={e => setLenderSearch(e.target.value)} className={inputCls} autoFocus />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredLenders.length > 0 ? filteredLenders.map(lender => (
                        <label key={lender} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-xs">
                          <input type="checkbox" checked={filters.lenders.includes(lender)} onChange={() => toggleLender(lender)} className="w-3.5 h-3.5 rounded border-gray-300" />
                          {lender}
                        </label>
                      )) : <p className="text-xs text-gray-400 text-center py-3">No lenders found</p>}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Loan Amount */}
          <div className={colCls} style={{ width: 230 }}>
            <label className={labelCls}>Loan Amount</label>
            <div className="flex gap-1.5">
              <input type="number" placeholder="Min" value={filters.loanAmount.min ?? ''} onChange={e => setFilters(prev => ({ ...prev, loanAmount: { ...prev.loanAmount, min: e.target.value ? Number(e.target.value) : null } }))} className={inputCls} />
              <input type="number" placeholder="Max" value={filters.loanAmount.max ?? ''} onChange={e => setFilters(prev => ({ ...prev, loanAmount: { ...prev.loanAmount, max: e.target.value ? Number(e.target.value) : null } }))} className={inputCls} />
            </div>
          </div>

          {/* Credit Card Limit */}
          {(filters.accountTypes.includes('Credit Card') || filters.accountTypes.includes('Secured Credit Card')) && (
            <div className={colCls} style={{ width: 230 }}>
              <label className={labelCls}>Credit Card Limit</label>
              <div className="flex gap-1.5">
                <input type="number" placeholder="Min" value={filters.creditCardLimit.min ?? ''} onChange={e => setFilters(prev => ({ ...prev, creditCardLimit: { ...prev.creditCardLimit, min: e.target.value ? Number(e.target.value) : null } }))} className={inputCls} />
                <input type="number" placeholder="Max" value={filters.creditCardLimit.max ?? ''} onChange={e => setFilters(prev => ({ ...prev, creditCardLimit: { ...prev.creditCardLimit, max: e.target.value ? Number(e.target.value) : null } }))} className={inputCls} />
              </div>
            </div>
          )}

          {/* Address */}
          <div className={colCls} style={{ width: 230 }}>
            <label className={labelCls}>Address</label>
            <input
              type="text"
              placeholder="City, State, Pincode"
              value={[filters.address.city, filters.address.state, filters.address.pincode].filter(Boolean).join(', ')}
              onChange={e => {
                const parts = e.target.value.split(',').map(s => s.trim());
                setFilters(prev => ({ ...prev, address: { city: parts[0] ?? '', state: parts[1] ?? '', pincode: parts[2] ?? '' } }));
              }}
              className={inputCls}
            />
          </div>

          {/* DPD */}
          <div className={colCls} style={{ width: 350 }}>
            <label className={labelCls}>DPD (Days Past Due)</label>
            <div className="flex gap-1.5">
              <select
                value={filters.dpd.operator}
                onChange={e => setFilters(prev => ({ ...prev, dpd: { ...prev.dpd, operator: e.target.value as any, value: null, min: null, max: null } }))}
                className={selectCls}
                style={{ width: 160 }}
              >
                {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
              </select>
              {isRange(filters.dpd.operator) ? (
                <>
                  <input type="number" placeholder="Min" value={filters.dpd.min ?? ''} onChange={e => setFilters(prev => ({ ...prev, dpd: { ...prev.dpd, min: e.target.value ? Number(e.target.value) : null } }))} className={inputCls} />
                  <input type="number" placeholder="Max" value={filters.dpd.max ?? ''} onChange={e => setFilters(prev => ({ ...prev, dpd: { ...prev.dpd, max: e.target.value ? Number(e.target.value) : null } }))} className={inputCls} />
                </>
              ) : (
                <input type="number" placeholder="Value" value={filters.dpd.value ?? ''} onChange={e => setFilters(prev => ({ ...prev, dpd: { ...prev.dpd, value: e.target.value ? Number(e.target.value) : null } }))} className={inputCls} />
              )}
            </div>
          </div>

          {/* Overdue Amount */}
          <div className={colCls} style={{ width: 230 }}>
            <label className={labelCls}>Overdue Amount</label>
            <select
              value={filters.overdueAmount}
              onChange={e => setFilters(prev => ({ ...prev, overdueAmount: e.target.value as any }))}
              className={selectCls}
            >
              <option value="all">All</option>
              <option value="nil">Nil</option>
              <option value="yes">Yes</option>
            </select>
          </div>

        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-end gap-2 bg-gray-50 rounded-b-xl">
        <button
          onClick={handleReset}
          className="h-10 px-5 rounded border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-100 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={handleApply}
          className="h-10 px-5 rounded bg-primary text-white font-semibold text-xs hover:bg-primary/90 transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
