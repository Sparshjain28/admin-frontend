// Shared labels / field definitions for the DSA onboarding screens
// (applicant wizard: BecomeDsa.tsx, reviewer screens: DsaApplications.tsx).

// Business proof step: the documents each business type uploads, then 3 to 4 photos of the office (every firm).
// Registration: pick 'one' = choose one of the documents (required: false = it may be left out); pick 'each' = one upload box per
// document, all required except those listed in optional. A sole proprietorship, a partnership and an HUF already gave GST / Udyam,
// so nothing is required from them here (registration or authority). The backend (REG_RULES) holds the same rules.
// HUF has no RBI list, so its documents are ours.
export type RegRule = { pick: 'one' | 'each'; docs: string[]; optional: string[]; required?: boolean };
export const FIRM_PHOTO_MIN = 3;
export const FIRM_PHOTO_MAX = 4;
const COMPANY_AUTH = ['Board Resolution', 'Power of Attorney'];
const PARTNER_AUTH = ['Partnership Letter', 'Power of Attorney'];
const COMPANY_REG: RegRule = { pick: 'each', docs: ['Certificate of Incorporation', 'Memorandum of Association (MOA)', 'Articles of Association (AOA)'], optional: [] };
type ProofRule = { registration: RegRule; authority: string[]; authorityRequired: boolean; hint: string };
export const BUSINESS_PROOF_DOCS: Record<string, ProofRule> = {
  'Sole Proprietorship': {
    registration: { pick: 'one', docs: ['Shop & Establishment Certificate', 'Professional Tax Registration', 'IEC Certificate', 'Income Tax Return', 'Utility Bill', 'Other'], optional: [], required: false },
    authority: ['Proprietor Declaration'], authorityRequired: false,
    hint: 'Optional. Your GST or Udyam is already taken. You can add one more proof of the business in its name.',
  },
  Partnership: {
    registration: { pick: 'each', docs: ['Partnership Deed', 'Partnership Registration Certificate'], optional: ['Partnership Deed', 'Partnership Registration Certificate'] },
    authority: PARTNER_AUTH, authorityRequired: false,
    hint: 'Optional. Your GST or Udyam is already taken. You can add the partnership deed and the registration certificate (if registered).',
  },
  LLP: {
    registration: { pick: 'each', docs: ['Certificate of Incorporation', 'LLP Agreement'], optional: [] },
    authority: PARTNER_AUTH, authorityRequired: true,
    hint: 'Upload both documents.',
  },
  'Private Limited': { registration: COMPANY_REG, authority: COMPANY_AUTH, authorityRequired: true, hint: 'Upload all three documents.' },
  'Public Limited': { registration: COMPANY_REG, authority: COMPANY_AUTH, authorityRequired: true, hint: 'Upload all three documents.' },
  HUF: {
    registration: { pick: 'each', docs: ['HUF Deed / Declaration'], optional: ['HUF Deed / Declaration'] },
    authority: ['Power of Attorney', 'Other'], authorityRequired: false,
    hint: 'Optional. Your GST or Udyam is already taken. You can add the HUF deed or a declaration signed by the Karta.',
  },
};
export const proofRuleOf = (businessType?: string): ProofRule =>
  BUSINESS_PROOF_DOCS[businessType || ''] || { registration: { pick: 'one', docs: ['Other'], optional: [] }, authority: ['Other'], authorityRequired: true, hint: '' };
// "have" = the registration documents that already have a file.
export const regComplete = (rule: RegRule, have: string[]) =>
  rule.pick === 'one' ? (rule.required === false ? have.length <= 1 : have.length === 1) : rule.docs.every((t) => rule.optional.includes(t) || have.includes(t));
// The saved registration documents, as a list. An application saved before reg_docs has a single document in reg_doc_*.
export const regDocsOf = (d: any): { type: string; file_id: number; file_name?: string; file_size?: number }[] =>
  Array.isArray(d?.reg_docs) && d.reg_docs.length
    ? d.reg_docs
    : d?.reg_doc_file_id ? [{ type: d.reg_doc_type, file_id: d.reg_doc_file_id, file_name: d.reg_doc_file_name, file_size: d.reg_doc_file_size }] : [];

export const STEP_LABELS: Record<string, string> = {
  otp: 'Mobile verification',
  consent: 'Consent',
  type: 'Applicant type',
  // Individual DSA steps
  display_name: 'Display name',
  pan: 'PAN',
  kyc: 'Identity (KYC)',
  work_setup: 'Work setup',
  location: 'Location',
  // Firm DSA steps
  business_details: 'Business details',
  gst_udyam: 'GST / Udyam',
  representative: 'Representative',
  business_proof: 'Business proof',
  firm_address: 'Address & name',
  // Common steps
  bank: 'Bank account',
  review: 'Review',
  agreement: 'Agreement',
};

// Sections shown on the reviewer's detail screen, the steps that can be sent back for correction, and the steps a
// reviewer may edit directly, per application type. The representative is the applicant: their PAN and KYC are the
// same steps as an individual's (a verified KYC cannot be edited by hand).
export const LANE_SECTIONS: Record<'individual' | 'firm', string[]> = {
  individual: ['pan', 'kyc', 'display_name', 'work_setup', 'location', 'bank'],
  firm: ['business_details', 'pan', 'kyc', 'gst_udyam', 'representative', 'business_proof', 'firm_address', 'bank'],
};
export const LANE_CORRECTABLE = LANE_SECTIONS;
export const LANE_EDITABLE: Record<'individual' | 'firm', string[]> = {
  // A reviewer cannot type a location for someone: it must be shared from the applicant's own setup, so it is sent back.
  individual: ['pan', 'kyc', 'display_name', 'work_setup', 'bank'],
  // The role is fixed by the business type, so it is not edited either.
  firm: ['business_details', 'pan', 'kyc', 'gst_udyam', 'business_proof', 'firm_address', 'bank'],
};
export const laneOf = (app: any): 'individual' | 'firm' => (app?.applicant_type === 'firm' ? 'firm' : 'individual');

export const STATUS_META: Record<string, { label: string; cls: string }> = {
  // What operations roles see for the invites they sent (they never see the real step or details).
  pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  invited: { label: 'Invited', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
  draft: { label: 'In progress', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  submitted: { label: 'Pending review', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  correction_needed: { label: 'Correction needed', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
};

export interface Field {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'select';
  options?: string[];
  placeholder?: string;
  upper?: boolean;
}

export const STEP_FIELDS: Record<string, Field[]> = {
  // ── Individual DSA ─────────────────────────────────────────────
  display_name: [{ key: 'display_name', label: 'Display name' }],
  pan: [
    { key: 'pan_number', label: 'PAN', upper: true, placeholder: 'ABCDE1234F' },
  ],
  kyc: [
    { key: 'aadhaar_number', label: 'Aadhaar number', placeholder: '12 digits' },
    { key: 'dob', label: 'Date of birth', type: 'date' },
    { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
    { key: 'address', label: 'Address as per Aadhaar' },
    { key: 'pincode', label: 'PIN code' },
  ],
  work_setup: [
    { key: 'work_type', label: 'Work setup', type: 'select', options: ['office', 'freelancer'] },
    { key: 'address_line', label: 'Working address' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'pincode', label: 'PIN code' },
  ],
  location: [
    { key: 'mode', label: 'Location type', type: 'select', options: ['gps', 'verified_address'] },
    { key: 'lat', label: 'Latitude (GPS only)' },
    { key: 'lng', label: 'Longitude (GPS only)' },
  ],
  // ── Firm / Company DSA ─────────────────────────────────────────
  business_details: [
    { key: 'business_type', label: 'Business type (cannot be changed here)', type: 'select', options: ['Sole Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited', 'HUF'] },
    { key: 'entity_pan', label: 'Business PAN (a sole proprietor\'s own PAN; the legal name is fetched from it)', upper: true, placeholder: 'AAACT1234A' },
  ],
  gst_udyam: [
    { key: 'gst_choice', label: 'GST status', type: 'select', options: ['Has GST', 'No GST – using Udyam'] },
    { key: 'gstin', label: 'GSTIN (checked again with the provider when saved)', upper: true, placeholder: '22AAAAA0000A1Z5' },
    { key: 'udyam_number', label: 'Udyam registration number (sole proprietorship / HUF without GST only)', upper: true, placeholder: 'UDYAM-XX-00-0000000' },
  ],
  representative: [],
  business_proof: [
    { key: 'reg_doc_type', label: 'Registration document type', type: 'select', options: [...new Set(Object.values(BUSINESS_PROOF_DOCS).flatMap((d) => d.registration.docs)), 'Trust Deed'] },
    { key: 'authority_doc_type', label: 'Authority proof type', type: 'select', options: [...new Set(Object.values(BUSINESS_PROOF_DOCS).flatMap((d) => d.authority))] },
  ],
  firm_address: [
    { key: 'display_name', label: 'DSA display name' },
    { key: 'reg_address', label: 'Registered / office address' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'pincode', label: 'PIN code' },
  ],
  // ── Common ─────────────────────────────────────────────────────
  bank: [
    { key: 'account_number', label: 'Account number', placeholder: 'Leave blank to keep the current number' },
    { key: 'ifsc', label: 'IFSC', upper: true, placeholder: 'HDFC0001234' },
    { key: 'holder_name', label: 'Account holder name' },
    { key: 'bank_name', label: 'Bank name' },
  ],
};

// Read-only rows for the review / detail screens.
export function summaryRows(step: string, d: any): [string, string][] {
  if (!d) return [];
  const rows: [string, any][] = [];
  switch (step) {
    case 'display_name': rows.push(['Display name', d.display_name]); break;
    case 'pan':
      rows.push(['PAN', d.pan_number], ['Name (from PAN, locked)', d.legal_name], ['Verified', verifiedText(d)]);
      break;
    case 'kyc':
      rows.push([d.name_locked ? 'Name (from PAN, locked)' : 'Name (as per Aadhaar)', d.full_name], ['Date of birth', d.dob], ['Gender', d.gender],
        [d.address_locked ? 'Address (from DigiLocker, locked)' : 'Address', d.address], ['District', d.district], ['State', d.state],
        ['PIN code', d.pincode], ['Aadhaar', d.aadhaar_last4 ? `XXXX XXXX ${d.aadhaar_last4}` : ''], ['Verified', verifiedText(d)],
        ['PAN–Aadhaar link', d.pan_link === 'linked_match' ? 'Linked and last 4 digits match' : d.pan_link === 'unlinked' ? 'PAN not linked to Aadhaar (reviewer to check)' : '']);
      break;
    case 'work_setup':
      rows.push(['Work setup', d.work_type], ...(d.work_type === 'office' ? [['Office photos', `${(d.office_photo_file_ids || []).length} uploaded`] as [string, any]] : []), ['Address', d.address_line], ['City', d.city], ['State', d.state], ['PIN code', d.pincode]);
      break;
    case 'location':
      if (d.mode === 'gps') rows.push(['Location', `GPS ${d.lat}, ${d.lng}`], ['Accuracy', d.accuracy ? `±${d.accuracy} m${d.adjusted ? ' (pin adjusted on the map)' : ''}` : ''],
        ...(d.address ? [['House / shop / building / floor', d.address.building], ['Street / area', d.address.line], ['City', d.address.city], ['State', d.address.state], ['PIN code', d.address.pincode], ['Address source', d.address.source === 'geocode' ? 'Fetched from the pin' : d.address.source === 'edited' ? 'Fetched, then edited by the applicant' : 'Typed by the applicant']] as [string, any][] : []));
      else rows.push(['Location', `Verified address${d.source ? ` (from ${d.source})` : ''}`], ['Address', d.address_line], ['PIN code', d.pincode]);
      break;
    // ── Firm steps ──────────────────────────────────────────────
    case 'business_details':
      rows.push(['Business type', d.business_type]);
      if (d.entity_pan) rows.push(['Legal name (from PAN, locked)', d.legal_name], ['Business PAN', d.entity_pan], ['Business PAN verified', verifiedText(d.entity_pan_verified)]);
      break;
    case 'gst_udyam': {
      rows.push(['GST', d.gst_choice === 'Has GST' ? 'Yes' : d.gst_choice ? 'No (Udyam)' : '']);
      if (d.gstin) {
        const g = d.gst || {};
        rows.push(['GSTIN', d.gstin], ['GSTIN check', verifiedText(d.gstin_verified)], ['GST status', g.gstin_status], ['Business name (GST)', g.business_name], ['Legal name (GST)', g.legal_name],
          ['Business type (GST)', g.constitution_of_business], ['GST PAN', g.pan_number], ['Registered on', g.date_of_registration], ['Taxpayer type', g.taxpayer_type], ['Address (GST)', g.address]);
      }
      if (d.udyam_number) {
        const m = d.udyam?.main_details || {};
        rows.push(['Udyam number', d.udyam_number], ['Udyam check', verifiedText(d.udyam_verified)], ['Enterprise name', m.name_of_enterprise], ['Business type (Udyam)', m.organization_type],
          ['Major activity', m.major_activity], ['Location', [m.city, m.state, m.pin].filter(Boolean).join(', ')]);
      }
      rows.push(['Document', d.document_file_name]);
      break;
    }
    case 'representative':
      rows.push(['Role in the business (owner or legal partner)', d.rep_designation]);
      break;
    case 'business_proof':
      if (d.skipped) { rows.push(['Business documents', 'Skipped for now']); break; }
      for (const r of regDocsOf(d)) rows.push([`Registration document: ${r.type}`, r.file_name]);
      rows.push(['Registration number', d.reg_doc_number], ['Authority proof', d.authority_doc_type], ['Authority file', d.authority_doc_file_name],
        ['Office photos', (d.office_photo_file_ids || []).length ? `${d.office_photo_file_ids.length} uploaded` : '']);
      break;
    case 'firm_address':
      rows.push(['Display name', d.display_name],
        ['Location', d.location_mode === 'gps' ? `GPS ${d.lat}, ${d.lng}` : 'Address'],
        ['House / shop / building / floor', d.building], [d.address_locked ? 'Address (from business PAN, locked)' : 'Street / area', d.reg_address], ['City', d.city], ['State', d.state], ['PIN code', d.pincode]);
      break;
    case 'bank':
      rows.push(['Account', d.account_last4 ? `XXXXXX${d.account_last4}` : ''], ['IFSC', d.ifsc], ['Holder', d.holder_name],
        ['Bank', [d.bank_name, d.branch].filter(Boolean).join(' · ')], ['Verified', verifiedText(d)]);
      break;
    default: break;
  }
  return rows.filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)]);
}

function verifiedText(d: any): string {
  if (!d) return 'No';
  if (d.verified_by === 'format_only') return 'Format and PAN match checked only. Reviewer: check it on the GST portal';
  if (d.verified_by === 'not_checked') return 'Not checked. Reviewer: check the Udyam registration';
  if (!d.verified) return 'No';
  if (d.verified_by === 'existing') return 'Yes (already verified on your profile)';
  if (d.source === 'aadhaar_otp' && d.verified_by !== 'mock') return 'Yes (Aadhaar OTP, tied to the PAN)';
  if (d.verified_by === 'mock') return 'Test mode (not verified with a provider)';
  if (d.verified_by === 'provider') return 'Yes (verified with the government record)';
  if (d.verified_by === 'digilocker') return 'Yes (verified through DigiLocker)';
  return 'Yes';
}
