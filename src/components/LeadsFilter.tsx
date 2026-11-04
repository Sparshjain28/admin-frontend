import { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { api } from '@/services/api';
import { BANKS_DATA } from '@/constants/banks';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface LeadsFilterData {
  dateFrom: string;
  dateTo: string;
  advisorName: string;
  customerName: string;
  customerNumber?: string;
  status: string;
  bank: string;
  leadId: string;
  applicationNumber: string;
  advisorKycStatus?: string;
  card_status?: string;
  card_type?: string;
  activation_status?: string;
  advisorActive?: string;
  archived?: boolean;
}

interface LeadsFilterProps {
  onFilterChange: (filters: LeadsFilterData) => void;
  initialFilters?: Partial<LeadsFilterData>;
  children?: React.ReactNode;
}

const LeadsFilter = ({ onFilterChange, initialFilters = {}, children }: LeadsFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [banks, setBanks] = useState<any[]>([]);
  const [applicantNames, setApplicantNames] = useState<string[]>([]);
  const [advisorSearchQuery, setAdvisorSearchQuery] = useState('');
  const [filteredAdvisors, setFilteredAdvisors] = useState<any[]>([]);
  const [loadingAdvisors, setLoadingAdvisors] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<string[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [filters, setFilters] = useState<LeadsFilterData>({
    dateFrom: '',
    dateTo: '',
    advisorName: '',
    customerName: '',
    status: 'all',
    bank: 'all',
    leadId: '',
    applicationNumber: '',
    customerNumber: '',
    card_status: '',
    card_type: '',
    activation_status: 'all',
    advisorActive: 'all',
    ...initialFilters
  });

  const getBankLogo = (bankName: string) => {
    const bankData = BANKS_DATA.find(b => b.dbBankNames.some(db => db.toLowerCase() === bankName.toLowerCase()));
    return bankData;
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'Generated', label: 'Generated' },
    { value: 'In_Process', label: 'In Process' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Disbursed', label: 'Disbursed' }
  ];

  const fetchBanks = async () => {
    try {
      const response = await api.getBanks();
      if (response.banks) {
        setBanks(response.banks);
      }
    } catch (error) {
      console.error('Failed to fetch banks:', error);
    }
  };

  const fetchApplicantNames = async () => {
    try {
      const response = await api.getApplicantNames();
      if (response.success && response.names) {
        setApplicantNames(response.names);
      }
    } catch (error) {
      console.error('Failed to fetch applicant names:', error);
    }
  };

  const fetchAdvisors = async (query: string) => {
    if (!query.trim()) {
      setFilteredAdvisors([]);
      return;
    }
    try {
      setLoadingAdvisors(true);
      const response = await api.getUsers(1, 100, query);
      if (response.users) {
        setFilteredAdvisors(response.users);
      } else {
        setFilteredAdvisors([]);
      }
    } catch (error) {
      console.error('Failed to fetch advisors:', error);
      setFilteredAdvisors([]);
    } finally {
      setLoadingAdvisors(false);
    }
  };

  const fetchCustomers = async (query: string) => {
    if (!query.trim()) {
      setFilteredCustomers([]);
      return;
    }
    try {
      setLoadingCustomers(true);
      const response = await api.getApplicantNames(query);
      if (response.success && response.names) {
        // Filter the names on frontend by search query
        const filtered = response.names.filter((name: string) => 
          name.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredCustomers(filtered);
      } else {
        setFilteredCustomers([]);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setFilteredCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  useEffect(() => {
    if (Object.keys(initialFilters).length > 0) {
      setFilters(prev => ({ ...prev, ...initialFilters }));
      if (initialFilters.advisorName) setAdvisorSearchQuery(initialFilters.advisorName);
      if (initialFilters.customerName) setCustomerSearchQuery(initialFilters.customerName);
    }
  }, [initialFilters]);

  const handleFilterChange = (key: keyof LeadsFilterData, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleApplyFilters = () => {
    onFilterChange(filters);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    const clearedFilters: LeadsFilterData = {
      dateFrom: '',
      dateTo: '',
      advisorName: '',
      customerName: '',
      customerNumber: '',
      status: 'all',
      bank: 'all',
      leadId: '',
      applicationNumber: '',
      card_status: '',
      card_type: '',
      activation_status: 'all',
      advisorActive: 'all'
    };
    setFilters(clearedFilters);
    setAdvisorSearchQuery('');
    setFilteredAdvisors([]);
    setCustomerSearchQuery('');
    setFilteredCustomers([]);
    onFilterChange(clearedFilters);
    setIsOpen(false);
  };

  const hasActiveFilters = () => {
    return filters.dateFrom || filters.dateTo || filters.advisorName ||
      filters.customerName || filters.customerNumber || filters.status !== 'all' ||
      filters.bank !== 'all' || filters.leadId || filters.applicationNumber ||
      (filters.card_status && filters.card_status !== '') ||
      (filters.card_type && filters.card_type !== '') ||
      (filters.activation_status && filters.activation_status !== 'all');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.advisorName) count++;
    if (filters.customerName) count++;
    if (filters.customerNumber) count++;
    if (filters.status !== 'all') count++;
    if (filters.bank !== 'all') count++;
    if (filters.leadId) count++;
    if (filters.applicationNumber) count++;
    if (filters.card_status && filters.card_status !== '') count++;
    if (filters.card_type && filters.card_type !== '' && filters.card_type !== 'all') count++;
    if (filters.activation_status && filters.activation_status !== 'all') count++;
    return count;
  };

  // Filter panel content (shared between mobile & desktop)
  const filterContent = (
    <div className="space-y-3">
      {/* Name Searches */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Search by Names</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Advisor</Label>
            <div className="relative">
              <Input
                placeholder="Search by name or ID..."
                value={advisorSearchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setAdvisorSearchQuery(value);
                  handleFilterChange('advisorName', value);
                  if (value) {
                    fetchAdvisors(value);
                  } else {
                    setFilteredAdvisors([]);
                  }
                }}
                className="text-xs h-9"
              />
              {advisorSearchQuery && filteredAdvisors.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-[60] max-h-48 overflow-y-auto">
                  {loadingAdvisors ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Searching...</div>
                  ) : (
                    filteredAdvisors.map((advisor) => (
                      <button
                        key={advisor.id}
                        onClick={() => {
                          handleFilterChange('advisorName', advisor.name);
                          setAdvisorSearchQuery(advisor.name);
                          setFilteredAdvisors([]);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-card-foreground border-b border-border last:border-b-0"
                      >
                        <div className="font-medium">{advisor.name}</div>
                        <div className="text-[10px] text-muted-foreground">{advisor.id}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Customer Name</Label>
            <div className="relative">
              <Input
                placeholder="Search by name or channel code..."
                value={customerSearchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomerSearchQuery(value);
                  handleFilterChange('customerName', value);
                  if (value) {
                    fetchCustomers(value);
                  } else {
                    setFilteredCustomers([]);
                  }
                }}
                className="text-xs h-9"
              />
              {customerSearchQuery && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-[60] max-h-48 overflow-y-auto">
                  {loadingCustomers ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Searching...</div>
                  ) : (
                    filteredCustomers.map((name) => (
                      <button
                        key={name}
                        onClick={() => {
                          handleFilterChange('customerName', name);
                          setCustomerSearchQuery(name);
                          setFilteredCustomers([]);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-card-foreground border-b border-border last:border-b-0"
                      >
                        {name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Date & ID Fields */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Date & IDs</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-9 text-xs border-input",
                    !filters.dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  {filters.dateFrom ? (
                    filters.dateTo ? (
                      <>
                        {format(new Date(filters.dateFrom), "dd MMM yy")} - {format(new Date(filters.dateTo), "dd MMM yy")}
                      </>
                    ) : (
                      format(new Date(filters.dateFrom), "dd MMM yy")
                    )
                  ) : (
                    <span>Date Range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[60]" align="center" side="bottom" sideOffset={4}>
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                  selected={{
                    from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
                    to: filters.dateTo ? new Date(filters.dateTo) : undefined,
                  }}
                  onSelect={(range) => {
                    setFilters({
                      ...filters,
                      dateFrom: range?.from ? format(range.from, "yyyy-MM-dd") : '',
                      dateTo: range?.to ? format(range.to, "yyyy-MM-dd") : ''
                    });
                  }}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Input
            placeholder="Lead ID"
            value={filters.leadId}
            onChange={(e) => handleFilterChange('leadId', e.target.value)}
            className="text-xs h-9"
          />

          <Input
            placeholder="App Number"
            value={filters.applicationNumber}
            onChange={(e) => handleFilterChange('applicationNumber', e.target.value)}
            className="text-xs h-9"
          />

          <Input
            placeholder="Search with Number..."
            value={filters.customerNumber || ''}
            onChange={(e) => handleFilterChange('customerNumber', e.target.value)}
            className="text-xs h-9 col-span-2"
          />
        </div>
      </div>

      {/* Dropdown Filters */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.bank} onValueChange={(value) => handleFilterChange('bank', value)}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="All Banks" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="all">All Banks</SelectItem>
              {banks
                .filter(bank => bank && bank.name && bank.name.trim() !== "" && bank.enabled !== false)
                .map((bank) => (
                  <SelectItem key={bank.id} value={bank.name}>
                    {bank.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select value={filters.activation_status} onValueChange={(value) => handleFilterChange('activation_status', value)}>
            <SelectTrigger className="text-xs h-9 col-span-2">
              <SelectValue placeholder="Activation Status" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="all">All Activation Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="card closed">Card Closed</SelectItem>
              <SelectItem value="-">- (Not Activated)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.card_type || 'all'} onValueChange={(value) => handleFilterChange('card_type', value === 'all' ? '' : value)}>
            <SelectTrigger className="text-xs h-9 col-span-2">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="credit_card">Credit Card</SelectItem>
              <SelectItem value="personal_loan">Personal Loan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          onClick={handleClearFilters}
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-9"
        >
          <X className="w-3 h-3 mr-1" />
          Clear
        </Button>
        <Button
          onClick={handleApplyFilters}
          size="sm"
          className="flex-1 gradient-accent text-accent-foreground text-xs h-9"
        >
          Apply Filter
        </Button>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Filter Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
        className={`flex items-center gap-1 whitespace-nowrap h-10 ${hasActiveFilters() ? 'border-accent text-accent' : ''
          }`}
      >
        <span>Filters</span>
        {hasActiveFilters() && (
          <span className="bg-accent text-accent-foreground text-xs rounded-full px-1.5 py-0.5">
            {getActiveFilterCount()}
          </span>
        )}
        {isOpen ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </Button>

      {/* ===== MOBILE: Fixed bottom sheet ===== */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-200"
            onClick={() => setIsOpen(false)}
          />
          {/* Bottom Sheet */}
          <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl shadow-2xl border-t border-border animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2 border-b border-border/50">
              <h3 className="text-sm font-semibold text-foreground">Filters</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 py-3 overscroll-contain">
              {filterContent}
            </div>
          </div>
        </>
      )}

      {/* ===== DESKTOP: Absolute dropdown ===== */}
      {isOpen && (
        <>
          <div
            className="hidden md:block fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="hidden md:block absolute top-full right-0 z-50 bg-background border border-border rounded-lg shadow-lg p-4 space-y-4 mt-2 w-[500px]">
            {filterContent}
          </div>
        </>
      )}
    </div>
  );
};

export default LeadsFilter;
