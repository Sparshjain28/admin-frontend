// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import fs from 'node:fs';

vi.mock('@/pages/dsa/LocationMapPanel', () => ({ SavedLocationMap: () => <div data-testid="map" /> }));
vi.mock('@/pages/dsa/dsaFiles', () => ({ openDsaFile: vi.fn(), fetchDsaFileUrl: vi.fn().mockResolvedValue('blob:x') }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { DsaApplicationBlock, FirmBlock } from './DsaProfileBlocks';

const DIR = process.env.PROFILE_FIXTURES || '';
const load = (n: string) => JSON.parse(fs.readFileSync(`${DIR}/${n}`, 'utf8'));

afterEach(cleanup);

describe('DSA profile blocks', () => {
  it.skipIf(!DIR)('shows the firm and the application of a firm DSA, and Read more opens every record', async () => {
    const info = load('profile_firm.json');
    const { container } = render(<><FirmBlock info={info} /><DsaApplicationBlock info={info} /></>);
    expect(screen.getByText('Firm / Company Details')).toBeTruthy();
    expect(screen.getByText('DSA Onboarding Details')).toBeTruthy();
    expect(container.textContent).toContain('Test Partner Kumar'); // partner on the certificate
    expect(container.textContent).toContain('Shop 4, Krishna Complex'); // building of the office
    expect(container.textContent).not.toContain('2302222250092090');
    const more = screen.getAllByText(/Read more/);
    more.forEach((b) => fireEvent.click(b));
    expect(container.textContent).toContain('GST record from the government portal');
    expect(container.textContent).toContain('Everything read from the certificate (OCR)');
    expect(container.textContent).toContain('XXXXXX2090');
    expect((await screen.findAllByTestId('map')).length).toBeGreaterThan(0);
  });
  it.skipIf(!DIR)('shows an individual DSA: display name, work setup, location with its address, no firm block', () => {
    const info = load('profile_individual.json');
    const { container } = render(<><FirmBlock info={info} /><DsaApplicationBlock info={info} /></>);
    expect(screen.queryByText('Firm / Company Details')).toBeNull();
    expect(container.textContent).toContain('Test Partner Services');
    expect(container.textContent).toContain('Shop 4');
    expect(container.textContent).toContain('freelancer');
    fireEvent.click(screen.getAllByText(/Read more/)[0]);
  });
  it('handles no application, and a restricted view', () => {
    const a = render(<DsaApplicationBlock info={null} />);
    expect(a.container.textContent).toContain('No DSA onboarding record');
    a.unmount();
    const b = render(<><FirmBlock info={{ restricted: true, application_no: 'DSA-1', status: 'approved', applicant_type: 'firm' }} /><DsaApplicationBlock info={{ restricted: true, application_no: 'DSA-1', status: 'approved', applicant_type: 'firm' }} /></>);
    expect(b.container.textContent).toContain('visible to an admin');
    expect(b.container.textContent).not.toContain('Firm / Company Details');
  });
});
