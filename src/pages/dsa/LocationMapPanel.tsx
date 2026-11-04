import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

// An inline map on the Location tab, like the map in Find My Lender (Leaflet + OpenStreetMap, no new library).
// The device GPS is read for a few seconds (the most accurate reading wins), a pin is put there, and the applicant can
// drag the pin or tap the map to place it exactly on their office or setup before confirming.
// The same look as the customer pin in Find My Lender: a red pin with a "Your Location" popup. It is an inline SVG, so it
// does not depend on any other website being up.
const pinIcon = L.divIcon({
  className: '',
  iconSize: [30, 42],
  iconAnchor: [15, 41],
  popupAnchor: [0, -38],
  html: '<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg"><path d="M15 1C7.3 1 1 7.2 1 14.8 1 25.4 15 41 15 41s14-15.6 14-26.2C29 7.2 22.7 1 15 1z" fill="#dc2626" stroke="#991b1b" stroke-width="1.5"/><circle cx="15" cy="14.5" r="5.5" fill="#fff"/></svg>',
});
const TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; OpenStreetMap contributors';

type Fix = { lat: number; lng: number; accuracy: number };
export type PinAddress = { building: string; line: string; city: string; state: string; pincode: string; source: 'geocode' | 'edited' | 'typed' };
export type ConfirmedLocation = { lat: number; lng: number; accuracy: number; adjusted: boolean; address: PinAddress };

// A small read-only map of a location that is already saved.
export function SavedLocationMap({ lat, lng, accuracy }: { lat: number; lng: number; accuracy?: number | null }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current) return undefined;
    const m = L.map(el.current, { dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false, zoomControl: false }).setView([lat, lng], 17);
    L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(m);
    L.marker([lat, lng], { icon: pinIcon }).bindPopup('<b>Saved location</b>').addTo(m);
    if (accuracy) L.circle([lat, lng], { radius: Math.max(accuracy, 5), weight: 1, fillOpacity: 0.12 }).addTo(m);
    setTimeout(() => m.invalidateSize(), 150);
    return () => { m.remove(); };
  }, [lat, lng, accuracy]);
  return <div style={{ position: 'relative', zIndex: 0 }}><div ref={el} className="h-[260px] w-full rounded-lg border border-border" /></div>;
}

export default function LocationMapPanel({ onCancel, onConfirm, busy }: {
  onCancel: () => void; onConfirm: (loc: ConfirmedLocation) => void; busy?: boolean;
}) {
  const [status, setStatus] = useState<'locating' | 'ready' | 'error'>('locating');
  const [error, setError] = useState('');
  const [fix, setFix] = useState<Fix | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [adjusted, setAdjusted] = useState(false);

  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const circle = useRef<L.Circle | null>(null);
  const watch = useRef<number | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout>>();
  const adjustedRef = useRef(false);
  const best = useRef<Fix | null>(null);

  // The address at the pin: fetched from the pin and then editable. A part the applicant has typed in is not overwritten when
  // the pin moves.
  const [addr, setAddr] = useState({ building: '', line: '', city: '', state: '', pincode: '' });
  const [fetched, setFetched] = useState<{ line: string; city: string; state: string; pincode: string } | null>(null);
  const [geo, setGeo] = useState<'idle' | 'loading' | 'done' | 'none'>('idle');
  const touched = useRef<Set<string>>(new Set());
  const setPart = (k: 'building' | 'line' | 'city' | 'state' | 'pincode', v: string) => { touched.current.add(k); setAddr((a) => ({ ...a, [k]: k === 'pincode' ? v.replace(/\D/g, '').slice(0, 6) : v })); };

  const stopWatching = useCallback(() => {
    if (watch.current !== null) { navigator.geolocation.clearWatch(watch.current); watch.current = null; }
    clearTimeout(stopTimer.current);
  }, []);

  const locate = useCallback(() => {
    if (!navigator.geolocation) { setStatus('error'); setError('Location is not available on this device or browser.'); return; }
    stopWatching();
    best.current = null; adjustedRef.current = false; setAdjusted(false);
    setStatus('locating'); setError('');
    watch.current = navigator.geolocation.watchPosition(
      (pos) => {
        const f = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        if (!best.current || f.accuracy < best.current.accuracy) {
          best.current = f;
          setFix(f);
          if (!adjustedRef.current) setPin({ lat: f.lat, lng: f.lng });
        }
        setStatus('ready');
        if (f.accuracy <= 15) stopWatching();
      },
      (err) => {
        stopWatching();
        if (best.current) return; // we already have a reading, keep it
        setStatus('error');
        setError(err.code === 1
          ? 'Location permission was denied. Allow location access for this site in your browser settings, then try again.'
          : err.code === 3 ? 'Could not get your location in time. Move near a window or outdoors and try again.'
          : 'Your location is not available right now. Try again.');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
    stopTimer.current = setTimeout(stopWatching, 12000); // refine for a few seconds, then stop
  }, [stopWatching]);

  useEffect(() => { locate(); return stopWatching; }, [locate, stopWatching]);

  // Build the map once the first reading is in.
  useEffect(() => {
    if (status !== 'ready' || !fix || !mapEl.current || map.current) return undefined;
    const m = L.map(mapEl.current).setView([fix.lat, fix.lng], 18);
    L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(m);
    const mk = L.marker([fix.lat, fix.lng], { draggable: true, icon: pinIcon }).bindPopup('<b>Your Location</b>').addTo(m);
    mk.openPopup();
    const c = L.circle([fix.lat, fix.lng], { radius: Math.max(fix.accuracy, 5), weight: 1, fillOpacity: 0.12 }).addTo(m);
    mk.on('dragend', () => {
      const ll = mk.getLatLng();
      adjustedRef.current = true; setAdjusted(true); setPin({ lat: ll.lat, lng: ll.lng });
    });
    m.on('click', (e: L.LeafletMouseEvent) => {
      mk.setLatLng(e.latlng);
      adjustedRef.current = true; setAdjusted(true); setPin({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    map.current = m; marker.current = mk; circle.current = c;
    setTimeout(() => m.invalidateSize(), 200);
    return undefined;
  }, [status, fix]);

  // A better GPS reading moves the pin and the accuracy circle, unless the applicant already placed it by hand.
  useEffect(() => {
    if (!map.current || !marker.current || !circle.current || !fix) return;
    circle.current.setRadius(Math.max(fix.accuracy, 5));
    if (!adjustedRef.current) {
      marker.current.setLatLng([fix.lat, fix.lng]); circle.current.setLatLng([fix.lat, fix.lng]);
      map.current.setView([fix.lat, fix.lng], map.current.getZoom());
    }
  }, [fix]);

  useEffect(() => { if (status === 'ready') setTimeout(() => map.current?.invalidateSize(), 120); }, [status]);

  // Fetch the address whenever the pin settles on a new spot.
  useEffect(() => {
    if (!pin) return undefined;
    let cancelled = false;
    setGeo('loading');
    const t = setTimeout(async () => {
      try {
        const r = await api.post('/dsa-applications/me/reverse-geocode', { lat: pin.lat, lng: pin.lng });
        if (cancelled) return;
        const a = r?.address;
        if (!a) { setFetched(null); setGeo('none'); return; }
        const got = { line: a.line || '', city: a.city || '', state: a.state || '', pincode: a.pincode || '' };
        setFetched(got);
        setAddr((cur) => ({
          ...cur, // the house / shop / building / floor is only ever typed by the applicant
          line: touched.current.has('line') ? cur.line : got.line, city: touched.current.has('city') ? cur.city : got.city,
          state: touched.current.has('state') ? cur.state : got.state, pincode: touched.current.has('pincode') ? cur.pincode : got.pincode,
        }));
        setGeo('done');
      } catch { if (!cancelled) setGeo('none'); }
    }, 800);
    return () => { cancelled = true; clearTimeout(t); };
  }, [pin?.lat, pin?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const addrValid = addr.building.trim().length >= 2 && addr.line.trim().length >= 5 && addr.city.trim().length >= 2 && addr.state.trim().length >= 2 && /^[1-9][0-9]{5}$/.test(addr.pincode);
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const addrSource = (): PinAddress['source'] => (!fetched ? 'typed' : same(addr.line, fetched.line) && same(addr.city, fetched.city) && same(addr.state, fetched.state) && addr.pincode === fetched.pincode ? 'geocode' : 'edited');
  useEffect(() => () => { map.current?.remove(); map.current = null; }, []);

  return (
    <div className="space-y-3 rounded-2xl border border-border p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">Confirm your exact location</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Drag the pin, or tap the map, to place it exactly on your office or setup.</p>
        </div>
        <button type="button" onClick={onCancel} className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
      </div>

      {status === 'locating' && !fix && (
        <div className="flex h-[420px] flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 text-center text-sm text-muted-foreground sm:h-[500px]">
          <Loader2 className="animate-spin" size={22} />Getting your exact location… allow location access if your browser asks.
        </div>
      )}
      {status === 'error' && (
        <div className="flex h-[420px] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-red-50 p-4 text-center text-sm text-red-800 sm:h-[500px]">
          <p>{error}</p>
          <Button variant="outline" onClick={locate}><LocateFixed size={14} className="mr-1.5" />Try again</Button>
        </div>
      )}
      <div className={status === 'ready' ? '' : 'hidden'}>
        <div style={{ position: 'relative', zIndex: 0 }}>
          <div ref={mapEl} className="h-[420px] w-full rounded-lg border border-border sm:h-[500px]" />
        </div>
      </div>

      {status === 'ready' && fix && pin && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}</span>
          <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground">GPS accuracy ±{Math.round(fix.accuracy)} m{adjusted ? ' · pin adjusted' : ''}</span>
        </div>
      )}
      {status === 'ready' && pin && (
        <div className="space-y-2 rounded-xl border border-border bg-card/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">Address at this pin</span>
            {geo === 'loading' && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Loader2 className="animate-spin" size={12} />Fetching…</span>}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {geo === 'none' ? 'We could not fetch the address for this pin. Type it below.' : 'The street and area are fetched from your pin: edit anything that is not correct. The house / shop number, building and floor must be typed by you.'}
          </p>
          <label className="block"><span className="text-[11px] font-medium text-muted-foreground">House / Shop / Flat no., Building, Floor <span className="text-red-600">*</span></span>
            <Input className="mt-0.5" value={addr.building} maxLength={100} placeholder="e.g. Shop 4, Ground floor, Krishna Complex" onChange={(e) => setPart('building', e.target.value)} /></label>
          <label className="block"><span className="text-[11px] font-medium text-muted-foreground">Street / Area</span>
            <Input className="mt-0.5" value={addr.line} maxLength={200} placeholder="Street, area, landmark" onChange={(e) => setPart('line', e.target.value)} /></label>
          <div className="grid grid-cols-3 gap-2">
            <label className="block"><span className="text-[11px] font-medium text-muted-foreground">City</span>
              <Input className="mt-0.5" value={addr.city} maxLength={60} onChange={(e) => setPart('city', e.target.value)} /></label>
            <label className="block"><span className="text-[11px] font-medium text-muted-foreground">State</span>
              <Input className="mt-0.5" value={addr.state} maxLength={60} onChange={(e) => setPart('state', e.target.value)} /></label>
            <label className="block"><span className="text-[11px] font-medium text-muted-foreground">PIN code</span>
              <Input className="mt-0.5" inputMode="numeric" value={addr.pincode} maxLength={6} onChange={(e) => setPart('pincode', e.target.value)} /></label>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={locate} disabled={busy}><LocateFixed size={14} className="mr-1.5" />Refresh GPS</Button>
        <Button className="flex-1" disabled={busy || status !== 'ready' || !pin || !fix || !addrValid}
          onClick={() => pin && fix && onConfirm({
            lat: pin.lat, lng: pin.lng, accuracy: fix.accuracy, adjusted,
            address: { building: addr.building.trim(), line: addr.line.trim(), city: addr.city.trim(), state: addr.state.trim(), pincode: addr.pincode, source: addrSource() },
          })}>
          {busy ? 'Saving…' : 'Confirm location'}
        </Button>
      </div>
    </div>
  );
}
