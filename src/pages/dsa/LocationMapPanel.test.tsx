// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('leaflet', () => {
  const chain: any = () => new Proxy(function () {}, { get: (_t, p) => (p === 'getLatLng' ? () => ({ lat: 26.5, lng: 77 }) : p === 'getZoom' ? () => 18 : chain()), apply: () => chain() });
  const L: any = { divIcon: () => ({}), map: () => chain(), tileLayer: () => chain(), marker: () => chain(), circle: () => chain() };
  return { default: L, ...L };
});
vi.mock('@/lib/api', () => ({ api: { post: vi.fn().mockResolvedValue({ success: true, address: { line: 'Main Road, Govindpura', city: 'Karauli', state: 'Rajasthan', pincode: '322241' } }) } }));

import LocationMapPanel from './LocationMapPanel';

describe('LocationMapPanel', () => {
  it('opens, gets a fix, shows the editable address', async () => {
    let success: any;
    (global.navigator as any).geolocation = { watchPosition: (ok: any) => { success = ok; return 1; }, clearWatch: () => {} };
    const onConfirm = vi.fn();
    render(<LocationMapPanel onCancel={() => {}} onConfirm={onConfirm} />);
    await act(async () => { success({ coords: { latitude: 26.5012, longitude: 77.0, accuracy: 10 } }); });
    expect(screen.getByText('Address at this pin')).toBeTruthy();
    await act(async () => { await new Promise((r) => setTimeout(r, 1000)); });
    expect((screen.getByPlaceholderText('Street, area, landmark') as HTMLInputElement).value).toBe('Main Road, Govindpura');
    const btn = screen.getByText('Confirm location') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(/Shop 4, Ground floor/), { target: { value: 'Shop 4, Krishna Complex' } });
    expect((screen.getByText('Confirm location') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByText('Confirm location'));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ address: expect.objectContaining({ building: 'Shop 4, Krishna Complex', pincode: '322241', source: 'geocode' }) }));
  });
});
