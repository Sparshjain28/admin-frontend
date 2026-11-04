import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Search, Loader2, AlertCircle, CheckCircle2, Phone, User, Building2, Map, Download, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { resolveImageUrl } from '@/services/api';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  };
}

interface LenderBranch {
  branch_id: number;
  branch_name: string;
  location: string;
  distance: number;
  geo_limit: string;
  geo_limit_km: number;
  sales_manager_name: string;
  sales_manager_mobile: string;
  area_sales_manager_name: string;
  area_sales_manager_mobile: string;
  latitude?: number;
  longitude?: number;
}

interface Lender {
  bank_id: number;
  bank_name: string;
  logo_url: string;
  branches: LenderBranch[];
  supports: {
    purchase: boolean;
    refinance: boolean;
    bt: boolean;
  };
}

export default function AdminNearbyBranches() {
  const { user } = useAuth();
  const [address, setAddress] = useState('Jaipur Hospital, Tonk Road, Jaipur, Rajasthan');
  const [radius, setRadius] = useState(50);
  const [caseType, setCaseType] = useState('');
  const [loading, setLoading] = useState(false);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [searched, setSearched] = useState(false);
  const [testLog, setTestLog] = useState<string[]>([]);

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  const addLog = (message: string) => {
    setTestLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const geocodeAddress = async (addr: string) => {
    try {
      addLog(`🔍 Geocoding: ${addr}`);
      const params = new URLSearchParams({
        q: addr,
        format: 'json',
        limit: '1'
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'User-Agent': 'Finonest-Admin' }
      });

      const data = await response.json();
      if (data && data.length > 0) {
        const coords = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
        addLog(`✅ Found: ${data[0].display_name}`);
        addLog(`📍 Coordinates: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
        return coords;
      }
      addLog('❌ Address not found');
      return null;
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      return null;
    }
  };

  const handleSearch = async () => {
    if (!address.trim()) {
      toast.error('Please enter an address');
      return;
    }

    setLoading(true);
    setTestLog([]);
    setSearched(false);
    addLog('🚀 Starting search...');

    try {
      // Step 1: Geocode
      const coords = await geocodeAddress(address);
      if (!coords) {
        toast.error('Could not geocode address');
        setLoading(false);
        return;
      }

      setCoordinates(coords);

      // Step 2: Call API
      addLog(`📡 Calling Find Lenders API...`);
      addLog(`   Radius: ${radius}km`);
      addLog(`   Case Type: ${caseType || 'All'}`);

      const response = await fetch(`${API}/find-lender/search`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          latitude: coords.lat,
          longitude: coords.lng,
          case_type: caseType || null,
          radius
        })
      });

      const data = await response.json();

      if (!response.ok) {
        addLog(`❌ API Error: ${data.error}`);
        toast.error(data.error);
        setLoading(false);
        return;
      }

      addLog(`✅ API Response received`);
      addLog(`📊 Total lenders: ${data.total_lenders}`);

      if (data.lenders && data.lenders.length > 0) {
        data.lenders.forEach((lender: Lender, idx: number) => {
          addLog(`   ${idx + 1}. ${lender.bank_name} - ${lender.branches.length} branches`);
          lender.branches.slice(0, 2).forEach((branch, bidx) => {
            addLog(`      Branch ${bidx + 1}: ${branch.branch_name} (${branch.distance}km)`);
          });
        });
      } else {
        addLog('⚠️  No lenders found');
      }

      setLenders(data.lenders || []);
      setSearched(true);
      toast.success(`Found ${data.total_lenders} lenders`);
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadResults = () => {
    const csv = [
      ['Bank Name', 'Branch Name', 'Location', 'Distance (km)', 'Service Area (km)', 'Sales Manager', 'Phone', 'Area Manager', 'Area Manager Phone'],
      ...lenders.flatMap(lender =>
        lender.branches.map(branch => [
          lender.bank_name,
          branch.branch_name,
          branch.location,
          branch.distance,
          branch.geo_limit_km,
          branch.sales_manager_name || '',
          branch.sales_manager_mobile || '',
          branch.area_sales_manager_name || '',
          branch.area_sales_manager_mobile || ''
        ])
      )
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `nearby-branches-${new Date().toISOString()}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Downloaded as CSV');
  };

  const downloadLog = () => {
    const logText = testLog.join('\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(logText));
    element.setAttribute('download', `test-log-${new Date().toISOString()}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Downloaded log');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Find Nearby Branches</h1>
              <p className="text-sm text-muted-foreground">Search for bank branches near a customer address</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Panel */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 sticky top-24 space-y-4">
              <h2 className="text-lg font-bold text-foreground mb-4">Search Configuration</h2>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Customer Address
                </label>
                <textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleSearch()}
                  placeholder="Enter customer address"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">Ctrl+Enter to search</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Search Radius: {radius} km
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  value={radius}
                  onChange={e => setRadius(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Loan Type (Optional)
                </label>
                <select
                  value={caseType}
                  onChange={e => setCaseType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">All Types</option>
                  <option value="purchase">Purchase</option>
                  <option value="refinance">Refinance</option>
                  <option value="bt">Balance Transfer</option>
                </select>
              </div>

              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-secondary font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Search Branches
                  </>
                )}
              </button>

              {coordinates && (
                <div className="p-4 rounded-xl bg-muted/40 border border-border">
                  <p className="text-xs font-semibold text-foreground mb-2">Coordinates:</p>
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${coordinates.lat},${coordinates.lng}`);
                      toast.success('Copied');
                    }}
                    className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Test Log */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Test Log</h2>
                {testLog.length > 0 && (
                  <button
                    onClick={downloadLog}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Download size={14} /> Download
                  </button>
                )}
              </div>

              <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs h-48 overflow-y-auto space-y-1">
                {testLog.length === 0 ? (
                  <p className="text-slate-500">Test log will appear here...</p>
                ) : (
                  testLog.map((log, idx) => (
                    <div key={idx} className="text-slate-300">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Results */}
            {searched && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground">
                    Results ({lenders.length} lenders)
                  </h2>
                  {lenders.length > 0 && (
                    <button
                      onClick={downloadResults}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Download size={14} /> CSV
                    </button>
                  )}
                </div>

                {lenders.length === 0 ? (
                  <div className="p-8 text-center">
                    <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
                    <p className="text-muted-foreground">No lenders found in this area</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {lenders.map((lender, idx) => (
                      <div key={idx} className="border border-border rounded-lg overflow-hidden">
                        {/* Bank Header */}
                        <div className="bg-muted/40 p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {lender.logo_url && (
                              <img
                                src={resolveImageUrl(lender.logo_url)}
                                alt={lender.bank_name}
                                className="w-10 h-10 rounded object-contain"
                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                              />
                            )}
                            <div>
                              <h3 className="font-semibold text-foreground">{lender.bank_name}</h3>
                              <p className="text-xs text-muted-foreground">{lender.branches.length} branches</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {lender.supports.purchase && (
                              <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-700 dark:text-green-400">
                                Purchase
                              </span>
                            )}
                            {lender.supports.refinance && (
                              <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-700 dark:text-blue-400">
                                Refinance
                              </span>
                            )}
                            {lender.supports.bt && (
                              <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-700 dark:text-purple-400">
                                BT
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Branches */}
                        <div className="divide-y divide-border">
                          {lender.branches.map((branch, bidx) => (
                            <div key={bidx} className="p-4 hover:bg-muted/20 transition-colors">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold text-foreground">{branch.branch_name}</h4>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                    <MapPin size={14} />
                                    {branch.location}
                                  </p>
                                </div>
                                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                                  {branch.distance} km
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                {branch.geo_limit_km && (
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border-2 border-blue-500"></div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Service Area</p>
                                      <p className="font-medium text-foreground">{branch.geo_limit_km} km</p>
                                    </div>
                                  </div>
                                )}
                                {branch.sales_manager_name && (
                                  <div className="flex items-center gap-2">
                                    <User size={16} className="text-muted-foreground" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Sales Manager</p>
                                      <p className="font-medium text-foreground">{branch.sales_manager_name}</p>
                                    </div>
                                  </div>
                                )}
                                {branch.sales_manager_mobile && (
                                  <div className="flex items-center gap-2">
                                    <Phone size={16} className="text-muted-foreground" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Contact</p>
                                      <a
                                        href={`tel:${branch.sales_manager_mobile}`}
                                        className="font-medium text-primary hover:underline"
                                      >
                                        {branch.sales_manager_mobile}
                                      </a>
                                    </div>
                                  </div>
                                )}
                                {branch.area_sales_manager_name && (
                                  <div className="flex items-center gap-2">
                                    <Building2 size={16} className="text-muted-foreground" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Area Manager</p>
                                      <p className="font-medium text-foreground">{branch.area_sales_manager_name}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
