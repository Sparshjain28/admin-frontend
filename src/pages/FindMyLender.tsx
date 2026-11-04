import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Search, Phone, User, Building2, Loader2, AlertCircle, CheckCircle2, Map, X } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
declare const google: any;
declare global {
  interface Window {
    showMapRoute?: (clat: number, clng: number, blat: number, blng: number) => void;
  }
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const GOOGLE_MAPS_API_KEY = 'AIzaSyBMkTPRdi-YeWJO-tLIdQ44hNLKsV-YfAE';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  };
}

interface AddressSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  lat?: number;
  lng?: number;
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
  is_serviceable?: boolean;
}

interface Lender {
  bank_id: number;
  bank_name: string;
  logo_url: string;
  branches: LenderBranch[];
  is_serviceable?: boolean;
  supports: {
    purchase: boolean;
    refinance: boolean;
    bt: boolean;
  };
}

async function getAddressSuggestions(input: string): Promise<AddressSuggestion[]> {
  const trimmedInput = input.trim();
  if (!trimmedInput || trimmedInput.length < 2) return [];

  try {
    const response = await fetch(`${API_URL}/google-maps/autocomplete`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ input })
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.predictions || [];
  } catch (error) {
    return [];
  }
}

async function getPlaceDetails(placeId: string): Promise<{ lat: number; lng: number; address: string } | null> {
  try {
    const response = await fetch(`${API_URL}/google-maps/place-details`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ place_id: placeId })
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function geocodeAddress(addr: string) {
  try {
    const response = await fetch(`${API_URL}/google-maps/geocode`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ address: addr })
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    }
    return null;
  } catch (error) {
    return null;
  }
}

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

// Fix for default leaflet icons not showing in React sometimes
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

L.Marker.prototype.options.icon = DefaultIcon;

function OSMMap({ customerLat, customerLng, branches }: { customerLat: number; customerLng: number; branches: LenderBranch[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routingControlRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || !branches.length) return;

    if (typeof customerLat !== 'number' || typeof customerLng !== 'number' || isNaN(customerLat) || isNaN(customerLng)) {
      return;
    }

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([customerLat, customerLng], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear existing layers and controls
    map.eachLayer((layer) => {
      // Don't remove the tile layer!
      if (layer instanceof L.Marker || layer instanceof L.Circle || (layer as any)._path) {
        map.removeLayer(layer);
      }
    });

    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }

    // Custom icons
    const customerIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34]
    });

    const branchIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34]
    });

    // Add customer location marker
    L.marker([customerLat, customerLng], { icon: customerIcon })
      .bindPopup('<b>Your Location</b>')
      .addTo(map);

    // Filter branches with valid coordinates
    const validBranches = branches.filter(b =>
      typeof b.latitude === 'number' &&
      typeof b.longitude === 'number' &&
      !isNaN(b.latitude) &&
      !isNaN(b.longitude)
    );

    const bounds = L.latLngBounds([customerLat, customerLng], [customerLat, customerLng]);

    validBranches.forEach(branch => {
      const lat = branch.latitude as number;
      const lng = branch.longitude as number;
      bounds.extend([lat, lng]);

      if (branch.geo_limit_km) {
        L.circle([lat, lng], {
          radius: branch.geo_limit_km * 1000,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 2
        }).addTo(map);
      }

      const marker = L.marker([lat, lng], { icon: branchIcon }).addTo(map);

      const popupContent = document.createElement('div');
      popupContent.innerHTML = `
        <div style="font-size: 12px; max-width: 300px;">
          <strong style="font-size: 14px;">${branch.branch_name}</strong><br/>
          <div style="margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 8px;">
            <div style="margin-bottom: 6px;"><strong>📍 Location:</strong> ${branch.location}</div>
            <div style="margin-bottom: 6px;"><strong>📏 Distance:</strong> ${branch.distance.toFixed(2)} km</div>
            <div style="margin-bottom: 6px;"><strong>🎯 Service Area:</strong> ${branch.geo_limit_km} km</div>
            <button class="route-btn" style="margin-top: 8px; padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%;">Show Route (OSRM)</button>
          </div>
        </div>
      `;

      popupContent.querySelector('.route-btn')?.addEventListener('click', () => {
        if (routingControlRef.current) {
          map.removeControl(routingControlRef.current);
        }

        // Using OSRM Routing directly through Leaflet Routing Machine
        routingControlRef.current = (L as any).Routing.control({
          waypoints: [
            L.latLng(customerLat, customerLng),
            L.latLng(lat, lng)
          ],
          router: (L as any).Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1'
          }),
          lineOptions: {
            styles: [{ color: '#3b82f6', weight: 4 }]
          },
          show: false,
          addWaypoints: false,
          routeWhileDragging: false,
          fitSelectedRoutes: true,
          createMarker: () => null // Prevent creating extra markers for route endpoints
        }).addTo(map);

        map.closePopup();
      });

      marker.bindPopup(popupContent);
    });

    if (validBranches.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [customerLat, customerLng, branches]);

  return (
    <div style={{ position: 'relative', zIndex: 0 }}>
      <div ref={mapRef} className="w-full h-[500px] rounded-lg border border-border" />
    </div>
  );
}

export default function FindMyLender() {
  const { user } = useAuth();
  const [address, setAddress] = useState('');
  const [caseType, setCaseType] = useState('');
  const [loading, setLoading] = useState(false);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [searched, setSearched] = useState(false);
  const [branchesWithCoords, setBranchesWithCoords] = useState<LenderBranch[]>([]);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setCoordinates({ lat: 26.8925, lng: 75.8048 });
  }, []);

  const handleAddressChange = (value: string) => {
    setAddress(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const words = trimmedValue.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const shouldCallApi = wordCount >= 1 && value.endsWith(' ');

    if (!shouldCallApi) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSuggestionsLoading(true);
    debounceTimer.current = setTimeout(async () => {
      const results = await getAddressSuggestions(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSuggestionsLoading(false);
    }, 300);
  };

  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    setSuggestionsLoading(true);
    try {
      const details = await getPlaceDetails(suggestion.place_id);
      if (details) {
        setAddress(details.address);
        setCoordinates({ lat: details.lat, lng: details.lng });
        setSuggestions([]);
        setShowSuggestions(false);
        setSearched(false);
        setBranchesWithCoords([]);
        setLenders([]);
        toast.success('Address selected');
      }
    } catch (error) {
      toast.error('Failed to get address details');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleSearch = async () => {
    if (!caseType) {
      toast.error('Please select a Loan Type');
      return;
    }

    console.log('🔍 [FRONTEND] Case type:', caseType);

    if (!address.trim()) {
      toast.error('Please enter an address');
      return;
    }

    setLoading(true);
    const startSearch = performance.now();
    try {
      const response = await fetch(`${API_URL}/find-lender/search-by-address`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          address: address.trim(),
          case_type: caseType || null
        }),
        signal: AbortSignal.timeout(90000) // 90 second timeout
      });

      const endFetch = performance.now();
      const data = await response.json();
      console.log('   - Status:', response.ok ? '✅ OK' : '❌ Error');
      console.log('   - Search stats:', data.stats);
      if (!response.ok) {
        toast.error(data.error || 'Search failed');
        setLoading(false);
        return;
      }

      const customerCoords = data.search_coordinates;
      if (!customerCoords) {
        toast.error('Could not find your address. Please try another location.');
        setLoading(false);
        return;
      }
      setCoordinates(customerCoords);

      // Filter lenders to only keep serviceable ones and extract their single nearest branch
      const eligibleLenders = data.lenders.filter((lender: Lender) => lender.is_serviceable && lender.nearest_branch);
      console.log('   - Total eligible lenders:', eligibleLenders.length);
      const allBranches = eligibleLenders.map((lender: Lender) => lender.nearest_branch);
      const branchesWithCoords = allBranches.filter(b =>
        b &&
        typeof b.latitude === 'number' &&
        typeof b.longitude === 'number' &&
        !isNaN(b.latitude) &&
        !isNaN(b.longitude)
      );
      setBranchesWithCoords(branchesWithCoords);
      setLenders(eligibleLenders);
      setSearched(true);

      const endProcess = performance.now();
      console.log(`⏱️  [FRONTEND] TOTAL TIME (including geocoding): ${(endProcess - startSearch).toFixed(2)}ms`);

      if (eligibleLenders.length === 0) {
        console.log('   - All lenders from API:', data.lenders);
        data.lenders.forEach((lender: any, idx: number) => {
          console.log(`      - is_serviceable: ${lender.is_serviceable}`);
          console.log(`      - serviceable branches: ${lender.branches.filter((b: any) => b.is_serviceable).length}`);
        });
        toast.info('No eligible lenders found for this location and loan type');
      } else {
        toast.success(`Found ${eligibleLenders.length} eligible lenders`);
      }

      await fetch(`${API_URL}/find-lender/save-search`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          latitude: customerCoords.lat,
          longitude: customerCoords.lng,
          case_type: caseType || null,
          results_count: data.lenders.length
        })
      }).catch(() => { });
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
      const finalTime = performance.now();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-3 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Find My Lender</h1>
              <p className="text-xs text-muted-foreground">Discover lenders near your location</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-3 mb-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-2 relative" ref={suggestionsRef}>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Enter Your Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={address}
                  onChange={e => handleAddressChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g., 3rd Floor, Besides Jaipur Hospital, BL Tower, 1, Tonk Rd, Jaipur"
                  className="w-full pl-3 pr-10 py-2 h-10 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {address && (
                  <button
                    onClick={() => {
                      setAddress('');
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X size={18} className="text-muted-foreground" />
                  </button>
                )}
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-[9999] max-h-48 overflow-y-auto">
                  {suggestionsLoading ? (
                    <div className="p-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Loader2 size={14} className="animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b border-border last:border-b-0 flex items-start gap-2"
                      >
                        <MapPin size={14} className="text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{suggestion.main_text}</p>
                          {suggestion.secondary_text && (
                            <p className="text-xs text-muted-foreground truncate">{suggestion.secondary_text}</p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Loan Type <span className="text-destructive">*</span>
              </label>
              <select
                value={caseType}
                onChange={e => setCaseType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select Loan Type</option>
                <option value="New Car - Purchase">New Car - Purchase</option>
                <option value="Used Car - Purchase">Used Car - Purchase</option>
                <option value="Used Car - Refinance">Used Car - Refinance</option>
                <option value="Used Car - BT/Top-up">Used Car - BT/Top-up</option>
              </select>
            </div>

            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-secondary font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Find
                </>
              )}
            </button>
          </div>
        </div>

        {(searched || coordinates) && (
          <div className="glass-card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Map size={18} className="text-primary" />
                <h2 className="text-base font-bold text-foreground">Map View</h2>
              </div>
              <button
                onClick={() => setShowMap(!showMap)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors flex items-center gap-2 text-sm font-medium text-foreground"
              >
                {showMap ? 'Hide Map' : 'Show Map'}
              </button>
            </div>

            {showMap && (coordinates && branchesWithCoords.length > 0 ? (
              <OSMMap
                customerLat={coordinates.lat}
                customerLng={coordinates.lng}
                branches={branchesWithCoords}
              />
            ) : coordinates && searched && branchesWithCoords.length === 0 ? (
              <div className="w-full h-[500px] rounded-lg border border-border bg-muted/40 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No branches with coordinates found in your area</p>
              </div>
            ) : coordinates && !searched ? (
              <div className="w-full h-[500px] rounded-lg border border-border bg-muted/40 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Search for lenders to see branches on map</p>
              </div>
            ) : (
              <div className="w-full h-[500px] rounded-lg border border-border bg-muted/40 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Unable to load map</p>
              </div>
            ))}
          </div>
        )}

        {searched && (
          <div className="mt-4">
            {lenders.length === 0 ? (
              <div className="glass-card p-6 text-center">
                <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">No Lenders Found</h3>
                <p className="text-sm text-muted-foreground">
                  Try increasing the search radius or changing your location
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {lenders.map((lender, idx) => (
                    <div key={idx} className="glass-card p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {lender.logo_url && (
                            <div className="w-12 h-12 rounded-xl bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center border border-border">
                              <img
                                src={`${API_URL}${lender.logo_url.startsWith('/') ? '' : '/'}${lender.logo_url}`}
                                alt={lender.bank_name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <div>
                            <h3 className="text-base font-bold text-foreground">{lender.bank_name}</h3>
                          </div>
                        </div>
                        {lender.branches.length > 0 && (
                          <div className="text-right">
                            <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                              Nearest: {Math.min(...lender.branches.map(b => b.distance ?? 999)).toFixed(2)} km
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

