import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Building2, ChevronDown, ChevronUp, ClipboardList, ExternalLink } from 'lucide-react';
import { STATUS_META, STEP_LABELS, laneOf, regDocsOf, summaryRows } from '@/pages/dsa/dsaConfig';
import { fetchDsaFileUrl, openDsaFile } from '@/pages/dsa/dsaFiles';
import { recordRows } from '@/pages/dsa/dsaRecord';

const SavedLocationMap = lazy(() => import('@/pages/dsa/LocationMapPanel').then((m) => ({ default: m.SavedLocationMap })));

// The DSA onboarding details on the broker / DSA profile page: what the application collected, what the government records
// (API) returned and what was read from the uploaded certificate (OCR). The important parts are shown, and "Read more" opens
// every field. Only an admin / sales manager gets the full application from the server; others get the headline.

type Rows = [string, string][];
const CARD = 'bg-card border border-border/80 rounded-xl px-3.5 py-2.5 shadow-xs';
const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const pretty = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/15 p-2 rounded-lg border border-border/50">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 text-xs font-semibold text-foreground break-words">{value}</p>
    </div>
  );
}

function Group({ title, rows, children }: { title: string; rows?: Rows; children?: ReactNode }) {
  if ((!rows || rows.length === 0) && !children) return null;
  return (
    <div className="mt-2.5">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-primary">{title}</p>
      {rows && rows.length > 0 && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{rows.map(([k, v]) => <Cell key={k} label={k} value={v} />)}</div>}
      {children}
    </div>
  );
}

// "Read more": every field, in sections.
function ReadMore({ sections }: { sections: { title: string; rows: Rows }[] }) {
  const [open, setOpen] = useState(false);
  const shown = sections.filter((s) => s.rows.length > 0);
  if (shown.length === 0) return null;
  return (
    <div className="mt-3 border-t border-border/60 pt-2">
      <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}{open ? 'Show less' : 'Read more: all details from the application, the records and the document'}
      </button>
      {open && shown.map((s) => (
        <Group key={s.title} title={s.title} rows={s.rows} />
      ))}
    </div>
  );
}

function FileLinks({ items }: { items: [string, number | null | undefined][] }) {
  const have = items.filter(([, id]) => id);
  if (have.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-3">
      {have.map(([label, id]) => (
        <button key={label} type="button" className="inline-flex items-center gap-1 text-xs text-primary" onClick={() => openDsaFile(id as number).catch((e) => toast.error(e.message))}>
          <ExternalLink size={12} />View {label.toLowerCase()}
        </button>
      ))}
    </div>
  );
}

function Thumb({ id, label }: { id: number; label: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let made = '';
    fetchDsaFileUrl(id).then((u) => { made = u; setUrl(u); }).catch(() => {});
    return () => { if (made) URL.revokeObjectURL(made); };
  }, [id]);
  return (
    <button type="button" title={label} onClick={() => openDsaFile(id).catch((e) => toast.error(e.message))}
      className="h-20 w-20 overflow-hidden rounded-lg border border-border bg-muted/40">
      {url ? <img src={url} alt={label} className="h-full w-full object-cover" /> : <span className="text-[10px] text-muted-foreground">…</span>}
    </button>
  );
}

function MapBlock({ lat, lng, accuracy }: { lat: number; lng: number; accuracy?: number | null }) {
  return (
    <div className="mt-2 space-y-1">
      <Suspense fallback={<div className="h-[260px] rounded-lg bg-muted/40" />}><SavedLocationMap lat={lat} lng={lng} accuracy={accuracy} /></Suspense>
      <a className="inline-flex items-center gap-1 text-xs text-primary" target="_blank" rel="noreferrer"
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`}><ExternalLink size={12} />Open the location on a map</a>
    </div>
  );
}

function NoRecord({ text }: { text: string }) {
  return (
    <div className={CARD}>
      <h3 className="mb-1 flex items-center gap-1.5 font-heading text-xs font-bold text-foreground sm:text-sm"><ClipboardList size={13} className="text-primary" /> DSA Onboarding Details</h3>
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

// ── Everything about the application (individual and firm) ─────────────────────────────────────────────────────────
export function DsaApplicationBlock({ info }: { info: any }) {
  if (!info) return <NoRecord text="No DSA onboarding record was found for this user. Their details above come from the profile itself." />;
  const meta = STATUS_META[info.status];
  if (info.restricted) {
    return <NoRecord text={`Application ${info.application_no} (${meta?.label || info.status}). The full onboarding details are visible to an admin or the sales manager of this team.`} />;
  }
  const d = info.data || {};
  const lane = laneOf(info);
  const files: any[] = info.files || [];
  const checks: any[] = info.checks || [];
  const events: any[] = info.events || [];
  const steps = lane === 'firm' ? ['pan', 'kyc', 'bank'] : ['display_name', 'work_setup', 'location', 'pan', 'kyc', 'bank'];
  const intended = info.intended || {};
  const appRows: Rows = ([
    ['Application no.', info.application_no], ['Type', lane === 'firm' ? 'Firm / company' : 'Individual'], ['Status', meta?.label || info.status],
    ['Invited by', info.requested_by_name], ['Invited on', fmt(info.requested_at)], ['Submitted on', fmt(info.submitted_at)],
    ['Reviewed by', info.reviewed_by_name], ['Reviewed on', fmt(info.reviewed_at)], ['Review note', info.review_note],
    ['Mobile verified by OTP', info.otp_verified ? 'Yes' : 'No'],
    ['Consent', info.consent ? `${fmt(info.consent.accepted_at)} · version ${info.consent.version}` : ''],
    ['Agreement', info.agreement ? `${fmt(info.agreement.accepted_at)} · version ${info.agreement.version}${info.agreement.signed_name ? ` · signed as ${info.agreement.signed_name}` : ''}` : ''],
    ['Reporting to (user id)', intended.reporting_to], ['Branch (id)', intended.branch_id], ['DSA id (parent)', intended.dsa_id],
  ] as [string, any][]).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)]);

  const photoIds: number[] = files.filter((f) => f.kind === 'office_photo').map((f) => f.id);
  const loc = d.location;
  // Everything else, field by field. For a firm, the firm's own steps are in the firm block.
  const FIRM_ONLY = ['business_details', 'gst_udyam', 'representative', 'business_proof', 'firm_address'];
  const rawKeys = Object.keys(d).filter((k) => !(lane === 'firm' && FIRM_ONLY.includes(k)));

  return (
    <div className={CARD}>
      <h3 className="mb-1 flex flex-wrap items-center gap-1.5 font-heading text-xs font-bold text-foreground sm:text-sm">
        <ClipboardList size={13} className="text-primary" /> DSA Onboarding Details
        <span className="rounded border border-primary/20 bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">{info.application_no}</span>
        {meta && <span className={`rounded px-1.5 text-[10px] font-semibold ${meta.cls}`}>{meta.label}</span>}
      </h3>

      <Group title="Application" rows={appRows} />
      {steps.map((s) => (d[s] ? <Group key={s} title={lane === 'firm' && s === 'pan' ? "Applicant's PAN" : lane === 'firm' && s === 'kyc' ? "Applicant's KYC" : STEP_LABELS[s] || pretty(s)} rows={summaryRows(s, d[s])}>
        {s === 'work_setup' && photoIds.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{photoIds.map((id, i) => <Thumb key={id} id={id} label={`Office photo ${i + 1}`} />)}</div>}
        {s === 'location' && loc?.mode === 'gps' && loc.lat != null && <MapBlock lat={loc.lat} lng={loc.lng} accuracy={loc.accuracy} />}
      </Group> : null))}

      {checks.length > 0 && (
        <Group title="Flags the reviewer saw">
          <ul className="space-y-1">
            {checks.map((c: any) => <li key={c.code} className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900"><b>{pretty(String(c.code).toLowerCase())}</b>: {c.message}</li>)}
          </ul>
        </Group>
      )}
      {events.length > 0 && (
        <details className="mt-2.5 text-xs">
          <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wider text-primary">History ({events.length})</summary>
          <ul className="mt-1.5 space-y-1">
            {events.map((e: any) => (
              <li key={e.id} className="flex justify-between gap-3 rounded-lg border border-border/50 bg-muted/15 p-1.5">
                <span className="font-semibold text-foreground">{pretty(e.action)}{e.actor_name ? ` · ${e.actor_name}` : ''}</span>
                <span className="shrink-0 text-muted-foreground">{fmt(e.created_at)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <ReadMore sections={rawKeys.map((k) => ({ title: STEP_LABELS[k] || pretty(k), rows: recordRows(d[k]) }))} />
    </div>
  );
}

// ── The firm / company (firm DSAs only) ──────────────────────────────────────────────────────────────────────────────
export function FirmBlock({ info }: { info: any }) {
  if (!info || info.restricted || laneOf(info) !== 'firm') return null;
  const d = info.data || {};
  const bd = d.business_details || {}; const g = d.gst_udyam || {}; const fa = d.firm_address || {}; const bp = d.business_proof || {};
  const ocr = g.document_ocr;
  const x = ocr?.extracted || {};
  const people: { name: string; designation?: string }[] = Array.isArray(x.partners) ? x.partners.filter((p: any) => p?.name) : [];
  const certRows: Rows = ocr ? ([
    ['Read by', ocr.engine === 'mock' ? 'Test mode' : `${ocr.engine}${ocr.confidence != null ? ` (${Math.round(ocr.confidence * 100)}% sure)` : ''}`],
    ['Applicant found on the certificate as', ocr.matched_person], ['Read on', fmt(ocr.read_at)],
    ['Reader asked for a review', ocr.needs_review ? 'Yes' : 'No'], ['Reader flags', (ocr.validation_flags || []).join(', ')],
  ] as [string, any][]).filter(([, v]) => v).map(([k, v]) => [k, String(v)]) : [];
  const hasLoc = fa.location_mode === 'gps' && fa.lat != null;

  return (
    <div className={CARD}>
      <h3 className="mb-1 flex flex-wrap items-center gap-1.5 font-heading text-xs font-bold text-foreground sm:text-sm">
        <Building2 size={13} className="text-primary" /> Firm / Company Details
        {bd.business_type && <span className="rounded border border-primary/20 bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">{bd.business_type}</span>}
      </h3>
      <Group title="Business" rows={summaryRows('business_details', bd)} />
      <Group title="GST / Udyam" rows={summaryRows('gst_udyam', g)} />
      <Group title="Applicant's role in the business" rows={summaryRows('representative', d.representative)} />
      {(people.length > 0 || x.ownerName) && (
        <Group title="Owners / partners / directors on the certificate">
          <ul className="space-y-1">
            {people.map((p, i) => <li key={`${p.name}-${i}`} className="rounded-lg border border-border/50 bg-muted/15 p-1.5 text-xs"><b className="text-foreground">{p.name}</b>{p.designation ? ` · ${p.designation}` : ''}</li>)}
            {x.ownerName && <li className="rounded-lg border border-border/50 bg-muted/15 p-1.5 text-xs"><b className="text-foreground">{x.ownerName}</b> · owner (Udyam)</li>}
          </ul>
        </Group>
      )}
      <Group title="Certificate check" rows={certRows} />
      <Group title="Office" rows={summaryRows('firm_address', fa)}>{hasLoc && <MapBlock lat={fa.lat} lng={fa.lng} accuracy={fa.accuracy} />}</Group>
      <Group title="Business proof" rows={summaryRows('business_proof', bp)}>
        {(bp.office_photo_file_ids || []).length > 0 && <div className="mt-2 flex flex-wrap gap-2">{(bp.office_photo_file_ids as number[]).map((id, i) => <Thumb key={id} id={id} label={`Office photo ${i + 1}`} />)}</div>}
      </Group>
      <FileLinks items={[['GST / Udyam certificate', g.document_file_id], ...regDocsOf(bp).map((r): [string, number] => [r.type, r.file_id]), ['Authority proof', bp.authority_doc_file_id]]} />

      <ReadMore sections={[
        { title: 'Business details (all fields)', rows: recordRows(bd) },
        { title: 'GST record from the government portal (all fields)', rows: recordRows(g.gst) },
        { title: 'Udyam record from the government portal (all fields)', rows: recordRows(g.udyam) },
        { title: 'Everything read from the certificate (OCR)', rows: recordRows(ocr ? { ...x, checks: (ocr.checks || []).map((c: any) => `${c.code}: ${c.ok ? 'matched' : c.message}`) } : null) },
        { title: 'Office location (all fields)', rows: recordRows(fa) },
        { title: 'Business proof (all fields)', rows: recordRows(bp) },
      ]} />
    </div>
  );
}

