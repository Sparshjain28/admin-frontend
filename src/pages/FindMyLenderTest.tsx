import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Search, Loader2, AlertCircle, CheckCircle2, Copy, Download } from 'lucide-react';
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

export default function FindMyLenderTest() {
  const { user } = useAuth();
  const [address, setAddress] = useState('Jaipur Hospital, Tonk Road, Jaipur, Rajasthan');
  const [radius, setRadius] = useState(50);
  const [caseType, setCaseType] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [testLog, setTestLog] = useState<string[]>([]);

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  const addLog = (message: string) => {
    setTestLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const geocodeAddress = async (addr: string) => {
    try {
      addLog(`🔍 Geocoding address: ${addr}`);
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
          lng: parseFloat(data[0].lon),
          display: data[0].display_name
        };
        addLog(`✅ Address found: ${coords.display}`);
        addLog(`📍 Coordinates: ${coords.lat}, ${coords.lng}`);
        return coords;
      }
      addLog('❌ Address not found');
      return null;
    } catch (error: any) {
      addLog(`❌ Geocoding error: ${error.message}`);
      return null;
    }
  };

  const testOSRM = async (lat: number, lng: number) => {
    try {
      addLog('🧪 Testing OSRM distance calculation...');
      
      // Test point 5km away
      const testLat = lat + 0.05;
      const testLng = lng + 0.05;
      
      const url = `http://router.project-osrm.org/route/v1/driving/${lng},${lat};${testLng},${testLat}?overview=false`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const distance = Math.round(data.routes[0].distance / 1000);
        const duration = Math.round(data.routes[0].duration / 60);
        addLog(`✅ OSRM working: ${distance}km, ${duration}min`);
        return true;
      }
      addLog('❌ OSRM failed');
      return false;
    } catch (error: any) {
      addLog(`❌ OSRM error: ${error.message}`);
      return false;
    }
  };

  const handleSearch = async () => {
    if (!address.trim()) {
      toast.error('Please enter an address');
      return;
    }

    setLoading(true);
    setTestLog([]);
    addLog('🚀 Starting Find My Lender test...');

    try {
      // Step 1: Geocode
      const coords = await geocodeAddress(address);
      if (!coords) {
        toast.error('Could not geocode address');
        setLoading(false);
        return;
      }

      setCoordinates(coords);

      // Step 2: Test OSRM
      await testOSRM(coords.lat, coords.lng);

      // Step 3: Call API
      addLog(`📡 Calling Find Lenders API...`);
      addLog(`   Latitude: ${coords.lat}`);
      addLog(`   Longitude: ${coords.lng}`);
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
      addLog(`📊 Total lenders found: ${data.total_lenders}`);

      if (data.lenders && data.lenders.length > 0) {
        data.lenders.forEach((lender: any, idx: number) => {
          addLog(`   ${idx + 1}. ${lender.bank_name} - ${lender.branches.length} branches`);
        });
      }

      setResults(data);
      toast.success(`Found ${data.total_lenders} lenders`);
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const downloadLog = () => {
    const logText = testLog.join('\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(logText));
    element.setAttribute('download', `find-lender-test-${new Date().toISOString()}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Find My Lender - Admin Test</h1>
              <p className="text-sm text-muted-foreground">Test the Find My Lender feature with address geocoding and distance calculation</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 sticky top-24 space-y-4">
              <h2 className="text-lg font-bold text-foreground mb-4">Test Configuration</h2>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Address
                </label>
                <textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Enter address to test"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={3}
                />
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
                    Testing...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Run Test
                  </>
                )}
              </button>

              {coordinates && (
                <div className="p-4 rounded-xl bg-muted/40 border border-border">
                  <p className="text-xs font-semibold text-foreground mb-2">Coordinates:</p>
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {coordinates.lat}, {coordinates.lng}
                  </p>
                  <button
                    onClick={() => copyToClipboard(`${coordinates.lat},${coordinates.lng}`)}
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

              <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs h-64 overflow-y-auto space-y-1">
                {testLog.length === 0 ? (
                  <p className="text-muted-foreground">Test log will appear here...</p>
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
            {results && (
              <div className="glass-card p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Results</h2>

                {results.lenders && results.lenders.length > 0 ? (
                  <div className="space-y-4">
                    {results.lenders.map((lender: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-lg border border-border bg-muted/20">
                        <div className="flex items-center justify-between mb-3">
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
                            {lender.supports.purchase && <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-700">Purchase</span>}
                            {lender.supports.refinance && <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-700">Refinance</span>}
                            {lender.supports.bt && <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-700">BT</span>}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {lender.branches.slice(0, 3).map((branch: any, bidx: number) => (
                            <div key={bidx} className="text-xs p-2 rounded bg-background/50">
                              <p className="font-semibold text-foreground">{branch.branch_name}</p>
                              <p className="text-muted-foreground">{branch.location}</p>
                              <p className="text-muted-foreground">Distance: {branch.distance}km | Service Area: {branch.geo_limit_km}km</p>
                              {branch.sales_manager_name && (
                                <p className="text-muted-foreground">Manager: {branch.sales_manager_name} ({branch.sales_manager_mobile})</p>
                              )}
                            </div>
                          ))}
                          {lender.branches.length > 3 && (
                            <p className="text-xs text-muted-foreground">... and {lender.branches.length - 3} more branches</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
                    <p className="text-muted-foreground">No lenders found in this area</p>
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
