import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Car, Search, Loader2, AlertCircle, TrendingUp, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  };
}

const getCarImage = (make: string, model: string) => {
  const query = `${make} ${model}`.toLowerCase();
  
  if (query.includes('creta')) {
    return 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=600';
  }
  if (query.includes('thar')) {
    return 'https://images.unsplash.com/photo-1533559662493-44039755683b?auto=format&fit=crop&q=80&w=600';
  }
  if (query.includes('swift') || query.includes('baleno') || query.includes('alto') || query.includes('i10') || query.includes('i20')) {
    return 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=600';
  }
  if (query.includes('fortuner') || query.includes('endeavour') || query.includes('harrier') || query.includes('safari')) {
    return 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600';
  }
  if (query.includes('bmw') || query.includes('audi') || query.includes('mercedes') || query.includes('jaguar')) {
    return 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=600';
  }
  
  // Generic beautiful car images by brand type/category
  if (query.includes('hyundai')) {
    return 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&q=80&w=600';
  }
  if (query.includes('mahindra') || query.includes('tata')) {
    return 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&q=80&w=600';
  }
  if (query.includes('maruti') || query.includes('suzuki') || query.includes('honda') || query.includes('toyota')) {
    return 'https://images.unsplash.com/photo-1532581291347-9c39cf10a73c?auto=format&fit=crop&q=80&w=600';
  }
  
  // Fallback to a very sleek generic SUV/Car image
  return 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=600';
};

interface VehicleValuationResult {
  idv: string;
  rcNumber: string;
  make?: string;
  model?: string;
  variant?: string;
  manufacturingYear?: string;
  fuelType?: string;
  ownerName?: string;
  registeredAt?: string;
  registrationDate?: string;
  source?: string;
  ownerCount?: string | number;
  imageUrl?: string;
  financeStatus?: string;
  isTaxi?: boolean;
}

export default function FindMyCarValue() {
  const { user } = useAuth();
  const [rcNumber, setRcNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VehicleValuationResult | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rcNumber.trim()) {
      toast.error('Please enter an RC Number');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/find-lender/idv`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ id_number: rcNumber }),
      });

      const rawData = await response.json();

      if (!response.ok) {
        throw new Error(rawData.error || 'Failed to fetch car value');
      }

      // Unwrap if n8n returned an array
      let data = rawData;
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        data = first?.json || first?.output || first?.data || first;
      }

      // Check all possible places for the vehicle value — fair_market_retail_value first (actual used car value)
      const val = data?.data?.fair_market_retail_value
        || data?.fair_market_retail_value
        || data?.data?.book_value
        || data?.book_value
        || data?.data?.dealer_purchase_price
        || data?.dealer_purchase_price
        || data?.data?.idv_value
        || data?.idv_value
        || data?.data?.idv
        || data?.idv
        || data?.data?.vehicle_value
        || data?.vehicle_value
        || data?.data?.tentative_idv
        || data?.tentative_idv
        || data?.result?.idv_value
        || data?.result?.idv
        || data?.output?.idv_value
        || data?.output?.idv;

      const rc = data?.rc_number || data?.data?.rc_number || data?.rcNumber || data?.data?.rcNumber || rcNumber;

      if (val && Number(val) > 0) {
        let finStatus = 'No';
        const rawFinancer = data?.data?.financer || data?.financer;
        const rawFinanceStatus = data?.data?.finance_status || data?.finance_status;
        const rawFinanced = data?.data?.financed || data?.financed;

        const hasFinancer = rawFinancer && rawFinancer !== 'N/A' && rawFinancer !== 'None' && String(rawFinancer).trim() !== '';
        const hasFinanceStatus = rawFinanceStatus && rawFinanceStatus !== 'N/A' && rawFinanceStatus !== 'None' && String(rawFinanceStatus).trim() !== '';
        const isFinancedBool = rawFinanced === true || rawFinanced === 'Yes' || rawFinanced === 'YES' || rawFinanced === 'financed' || rawFinanced === 'FINANCED';

        if (hasFinancer || hasFinanceStatus || isFinancedBool) {
          finStatus = 'Yes';
        }

        const rawCategory = (data?.data?.vehicle_category || data?.vehicle_category || '').toString();
        const rawCategoryDesc = (data?.data?.vehicle_category_description || data?.vehicle_category_description || '').toString();
        const rawClass = (data?.data?.vehicle_class || data?.vehicle_class || '').toString();
        const isTaxiVeh = /\bCAB\b|MOTOR ?CAB|MAXI ?CAB|\bTAXI\b|COMMERCIAL|TOURIST|\bTRANSPORT\b/i.test(`${rawCategory} ${rawCategoryDesc} ${rawClass}`);

        setResult({
          idv: val.toString(),
          rcNumber: rc,
          make: data?.data?.vehicle_make || data?.vehicle_make || data?.data?.maker_name || data?.maker_name || data?.data?.maker_description || data?.maker_description || '',
          model: data?.data?.vehicle_model || data?.vehicle_model || data?.data?.model_name || data?.model_name || data?.data?.maker_model || data?.maker_model || '',
          variant: data?.data?.variant || data?.variant || data?.data?.variant_raw || data?.variant_raw || '',
          manufacturingYear: data?.data?.manufacturing_year || data?.manufacturing_year || data?.data?.maker_year || data?.maker_year || data?.data?.manufacturing_date || data?.manufacturing_date || '',
          fuelType: data?.data?.fuel_type || data?.fuel_type || data?.data?.fuel_desc || data?.fuel_desc || '',
          ownerName: data?.data?.owner_name || data?.owner_name || data?.data?.owner || data?.owner || '',
          registeredAt: data?.data?.registered_at || data?.registered_at || '',
          registrationDate: data?.data?.registration_date || data?.registration_date || '',
          source: data?.data?.source || data?.source || 'n8n',
          ownerCount: data?.data?.owner_count || data?.owner_count || data?.data?.owner_number || data?.owner_number || data?.data?.owner_serial_number || data?.owner_serial_number || '',
          imageUrl: data?.data?.image_url || data?.image_url || data?.data?.imageUrl || data?.imageUrl || data?.data?.car_image || data?.car_image || data?.data?.vehicle_image || data?.vehicle_image || data?.data?.image || data?.image || '',
          financeStatus: finStatus,
          isTaxi: isTaxiVeh,
        });
        toast.success('Car value found successfully');
      } else {
        // Log the full response to help debug
toast.error('Could not find car value for this RC number. Please check the RC number and try again.');
      }
    } catch (error: any) {
toast.error(error.message || 'An error occurred while fetching car value');
    } finally {
      setLoading(false);
    }
  };


  const formatCurrency = (amount: string) => {
    const num = Number(amount);
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="bg-background pb-20">
      <main className="max-w-md mx-auto px-0 sm:px-4 pt-4 sm:pt-6 transition-all duration-300">
        {!result ? (
          /* Search Form Container */
          <div className="bg-card rounded-none sm:rounded-2xl p-5 sm:p-6 border-y sm:border border-border shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Check Vehicle Valuation</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Enter the vehicle's RC number to get an instant estimated IDV (Insured Declared Value) for loans.
            </p>
            
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">RC Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={rcNumber}
                    onChange={(e) => setRcNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. MH01AB1234"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Fetching Value...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Find Car Value
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Search Result Card Container */
          <div className="bg-card rounded-none sm:rounded-2xl border-y sm:border border-border shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Car Image section */}
            <div className="relative h-48 bg-muted overflow-hidden">
              <button
                onClick={() => {
                  setResult(null);
                  setRcNumber('');
                }}
                className="absolute top-4 left-4 z-10 w-9 h-9 bg-black/50 hover:bg-black/75 rounded-full flex items-center justify-center text-white transition-all active:scale-95 shadow-md"
                title="Back to search"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <img 
                src={result.imageUrl || getCarImage(result.make || '', result.model || '')} 
                alt={`${result.make || ''} ${result.model || ''}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-end p-4">
                <div className="w-full">
                  {result.make || result.model ? (
                    <>
                      <p className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-0.5">{result.make}</p>
                      <h3 className="text-lg font-bold text-white leading-tight uppercase break-words">
                        {`${result.model || ''} ${result.variant || ''}`.trim() || 'Vehicle'}
                      </h3>
                    </>
                  ) : (
                    <h3 className="text-lg font-bold text-white leading-tight">Vehicle Valuation</h3>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Estimated Value (IDV)</h3>
                <div className="text-3xl font-bold text-primary flex items-center gap-2">
                  {formatCurrency(result.idv)}
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Vehicle RC</span>
                  <span className="font-semibold font-mono">{result.rcNumber}</span>
                </div>
                {result.ownerName && (
                  <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-0.5 text-sm">
                    <span className="text-muted-foreground shrink-0">Owner Name</span>
                    <span className="font-semibold break-words text-right" title={result.ownerName}>{result.ownerName}</span>
                  </div>
                )}
                {result.ownerCount && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Owner Serial No.</span>
                    <span className="font-semibold">
                      {typeof result.ownerCount === 'number'
                        ? String(result.ownerCount).padStart(2, '0')
                        : result.ownerCount}
                    </span>
                  </div>
                )}
                {result.manufacturingYear && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Mfg. Year</span>
                    <span className="font-semibold">{result.manufacturingYear}</span>
                  </div>
                )}
                {result.fuelType && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Fuel Type</span>
                    <span className="font-semibold capitalize text-right">{result.fuelType.toLowerCase()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Finance Status</span>
                  {result.financeStatus === 'Yes' ? (
                    <span className="font-semibold text-[11px] text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/20 px-2.5 py-1 rounded-full">
                      Yes
                    </span>
                  ) : (
                    <span className="font-semibold text-[11px] text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-500/20 px-2.5 py-1 rounded-full">
                      No
                    </span>
                  )}
                </div>

                {/* Elegant separator line */}
                <div className="border-t border-border/40 my-3 pt-3" />

                {/* Purchase Value Row */}
                <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-0.5 text-sm">
                  <span className="text-muted-foreground font-medium shrink-0">Purchase Value</span>
                  <span className="font-bold text-foreground text-right">
                    {formatCurrency(String(Number(result.idv) * 0.8))} – {formatCurrency(String(Number(result.idv) * 0.9))}
                  </span>
                </div>

                {/* Refinance Value Row */}
                <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-0.5 text-sm">
                  <span className="text-muted-foreground font-medium shrink-0">Refinance Value</span>
                  <span className="font-bold text-foreground text-right">
                    {formatCurrency(String(Number(result.idv) * 0.8))} – {formatCurrency(String(Number(result.idv) * 1.2))}
                  </span>
                </div>

                {/* BT & Topup Value Row (Hidden for taxi/commercial vehicles) */}
                {!result.isTaxi && (
                  <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-0.5 text-sm">
                    <span className="text-muted-foreground font-medium shrink-0">BT & Top-up Value</span>
                    <span className="font-bold text-foreground text-right">
                      {formatCurrency(String(Number(result.idv) * 1.2))} – {formatCurrency(String(Number(result.idv) * 1.6))}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Empty placeholder space */}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

