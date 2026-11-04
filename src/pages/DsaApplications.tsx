import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LANE_CORRECTABLE, LANE_EDITABLE, LANE_SECTIONS, STATUS_META, STEP_FIELDS, STEP_LABELS, laneOf, proofRuleOf, regComplete, regDocsOf, summaryRows, type Field } from '@/pages/dsa/dsaConfig';
import { openDsaFile, uploadDsaFile } from '@/pages/dsa/dsaFiles';
import { recordRows } from '@/pages/dsa/dsaRecord';

const FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'submitted', label: 'Pending review' },
  { key: 'correction_needed', label: 'Correction needed' },
  { key: 'draft', label: 'In progress' },
  { key: 'invited', label: 'Invited' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const fmt = (d?: string) => (d ? new Date(d).toLocaleString() : '—');

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${m?.cls || ''}`}>{m?.label || status}</span>;
}

export default function DsaApplications() {
  const { id } = useParams();
  return id ? <Detail id={id} /> : <List />;
}

// ── List ─────────────────────────────────────────────────────────────

function List() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [limited, setLimited] = useState(false);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (status) qs.set('status', status);
      if (q.trim()) qs.set('q', q.trim());
      const res = await api.get(`/dsa-applications${qs.toString() ? `?${qs}` : ''}`);
      setRows(res.applications || []);
      setLimited(res.limited === true);
    } catch (e: any) {
      toast.error(e.message || 'Could not load applications');
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-foreground">DSA Applications</h1>
        <p className="text-xs text-muted-foreground">
          {limited
            ? 'These are the DSA invites you sent. You can see the status only. Details and approval are with the admin and sales manager.'
            : 'To invite someone, open Users and set their role to DSA. They get the application link in their notifications. The role changes only after you approve.'}
        </p>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {!limited && FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setStatus(f.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${status === f.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`}>{f.label}</button>
        ))}
        <Input className="ml-auto w-full sm:w-64" placeholder="Search name, phone or application no." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No applications found.</div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <button key={r.id} type="button" disabled={limited} onClick={() => !limited && navigate(`/dsa-applications/${r.id}`)} className={`flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-4 text-left ${limited ? 'cursor-default' : 'hover:bg-muted/40'}`}>
                <div className="min-w-[160px] flex-1">
                  <div className="text-sm font-semibold text-foreground">{r.full_name}</div>
                  <div className="text-xs text-muted-foreground">{r.phone} · {r.user_code} · {r.application_no}</div>
                </div>
                {!limited && <div className="text-xs text-muted-foreground">Invited by {r.requested_by_name || '—'}</div>}
                <div className="text-xs text-muted-foreground">Updated {fmt(r.updated_at)}</div>
                {r.flags > 0 && r.status === 'submitted' && <span className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300"><AlertTriangle size={12} />{r.flags} flag{r.flags > 1 ? 's' : ''}</span>}
                <StatusPill status={r.status} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Detail ───────────────────────────────────────────────────────────

function StepEditor({ step, app, onSave, onCancel }: { step: string; app: any; onSave: (data: any) => Promise<void>; onCancel: () => void }) {
  const fields: Field[] = STEP_FIELDS[step] || [];
  const cur = app.data?.[step] || {};
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, f.key === 'account_number' ? '' : String(cur[f.key] ?? '')])));
  const [saving, setSaving] = useState(false);
  return (
    <form className="mt-2 space-y-2" onSubmit={async (e) => { e.preventDefault(); setSaving(true); try { await onSave(vals); } finally { setSaving(false); } }}>
      {fields.map((f) => (
        <label key={f.key} className="block">
          <span className="text-[11px] font-medium text-muted-foreground">{f.label}</span>
          {f.type === 'select' ? (
            <select className="mt-0.5 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm" value={vals[f.key]} onChange={(e) => setVals((p) => ({ ...p, [f.key]: e.target.value }))}>
              <option value="">Select</option>{f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <Input className="mt-0.5" type={f.type === 'date' ? 'date' : 'text'} value={vals[f.key]} placeholder={f.placeholder}
              onChange={(e) => setVals((p) => ({ ...p, [f.key]: f.upper ? e.target.value.toUpperCase() : e.target.value }))} />
          )}
        </label>
      ))}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Save change'}</Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

// One document slot in the reviewer's editor: see the current file (opened privately) or replace it.
function ProofSlot({ label, kind, appId, file, onUploaded }: { label: string; kind: 'registration' | 'authority'; appId: string; file: any; onUploaded: (f: any) => void }) {
  const [uploading, setUploading] = useState(false);
  return (
    <div className="space-y-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-md border border-border p-2 text-xs">
        <span className="min-w-0 flex-1 truncate text-foreground">{file ? file.name : 'No file'}</span>
        {file && (
          <button type="button" className="inline-flex items-center gap-1 text-primary" onClick={() => openDsaFile(file.id).catch((e) => toast.error(e.message))}>
            <ExternalLink size={12} />View
          </button>
        )}
        <label className="cursor-pointer text-primary">
          {uploading ? 'Uploading…' : file ? 'Replace' : 'Upload'}
          <input type="file" className="hidden" accept=".pdf,image/jpeg,image/png,image/webp" data-testid={`reviewer-file-${kind}`}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setUploading(true);
              try { onUploaded(await uploadDsaFile(`/dsa-applications/${appId}/upload-proof`, kind, f)); toast.success('Uploaded'); }
              catch (err: any) { toast.error(err.message || 'Upload failed'); }
              finally { setUploading(false); e.target.value = ''; }
            }} />
        </label>
      </div>
    </div>
  );
}

function ProofEditor({ appId, app, onSave, onCancel }: { appId: string; app: any; onSave: (data: any) => Promise<void>; onCancel: () => void }) {
  const d = app.data?.business_proof || {};
  const docs = proofRuleOf(app.data?.business_details?.business_type);
  const rule = docs.registration;
  const saved = regDocsOf(d);
  const asFile = (r: any) => ({ id: r.file_id, name: r.file_name });
  // pick 'one': a dropdown and one file. pick 'each': one file per document, held by document name.
  const [oneType, setOneType] = useState(rule.pick === 'one' && rule.docs.includes(saved[0]?.type) ? saved[0].type : '');
  const [oneFile, setOneFile] = useState<any>(rule.pick === 'one' && saved[0] ? asFile(saved[0]) : null);
  const [eachFiles, setEachFiles] = useState<Record<string, any>>(Object.fromEntries(
    (rule.pick === 'each' ? saved : []).filter((r) => rule.docs.includes(r.type)).map((r) => [r.type, asFile(r)])));
  const [regNumber, setRegNumber] = useState(d.reg_doc_number ?? '');
  const [authType, setAuthType] = useState(docs.authority.includes(d.authority_doc_type) ? d.authority_doc_type : '');
  const [auth, setAuth] = useState<any>(d.authority_doc_file_id ? { id: d.authority_doc_file_id, name: d.authority_doc_file_name } : null);
  const [saving, setSaving] = useState(false);
  const picks = rule.pick === 'one' ? (oneType && oneFile ? [{ type: oneType, file: oneFile }] : [])
    : rule.docs.filter((t) => eachFiles[t]).map((t) => ({ type: t, file: eachFiles[t] }));
  // An optional document may be left out, but a document type and its file go together.
  const regOk = regComplete(rule, picks.map((r) => r.type)) && !(rule.pick === 'one' && oneFile && !oneType);
  const authOk = docs.authorityRequired ? Boolean(auth && authType) : Boolean(auth) === Boolean(authType);
  const canSave = !saving && regOk && authOk;
  const selectCls = 'mt-0.5 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm';
  return (
    <div className="mt-2 space-y-2">
      {rule.pick === 'one' ? (
        <>
          <label className="block">
            <span className="text-[11px] font-medium text-muted-foreground">Registration document type</span>
            <select className={selectCls} value={oneType} onChange={(e) => setOneType(e.target.value)}>
              <option value="">{rule.required === false ? 'Select (optional)' : 'Select'}</option>{rule.docs.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <ProofSlot label="Registration document" kind="registration" appId={appId} file={oneFile} onUploaded={setOneFile} />
        </>
      ) : (
        rule.docs.map((t) => (
          <ProofSlot key={t} label={rule.optional.includes(t) ? `${t} (optional)` : t} kind="registration" appId={appId} file={eachFiles[t]}
            onUploaded={(f) => setEachFiles((p) => ({ ...p, [t]: f }))} />
        ))
      )}
      <label className="block">
        <span className="text-[11px] font-medium text-muted-foreground">Registration number</span>
        <Input className="mt-0.5" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
      </label>
      <label className="block">
        <span className="text-[11px] font-medium text-muted-foreground">Authority proof type</span>
        <select className={selectCls} value={authType} onChange={(e) => setAuthType(e.target.value)}>
          <option value="">{docs.authorityRequired ? 'Select' : 'Select (optional)'}</option>{docs.authority.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
      <ProofSlot label="Authority proof" kind="authority" appId={appId} file={auth} onUploaded={setAuth} />
      <div className="flex gap-2">
        <Button size="sm" disabled={!canSave}
          onClick={async () => { setSaving(true); try { await onSave({ reg_docs: picks.map((r) => ({ type: r.type, file_id: r.file.id })), reg_doc_number: regNumber, authority_doc_type: authType, authority_doc_file_id: auth ? auth.id : null, ...(d.office_photo_file_ids ? { office_photo_file_ids: d.office_photo_file_ids } : {}) }); } finally { setSaving(false); } }}>
          {saving ? 'Saving…' : 'Save change'}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function Detail({ id }: { id: string }) {
  const navigate = useNavigate();
  const [res, setRes] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [fixSteps, setFixSteps] = useState<string[]>([]);
  const [ack, setAck] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/dsa-applications/${id}`);
      setRes(r);
    } catch (e: any) {
      toast.error(e.message || 'Could not load the application');
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<any>, okMsg: string) => {
    setBusy(true);
    try { await fn(); toast.success(okMsg); setNote(''); setFixSteps([]); setAck(false); await load(); }
    catch (e: any) { toast.error(e.message || 'Action failed'); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto animate-spin" /></div>;
  if (!res?.application) return <div className="p-8 text-center text-sm text-muted-foreground">Application not found.</div>;

  const app = res.application;
  const user = res.user || {};
  const status = app.status as string;
  const flags: any[] = app.checks || [];
  const canEdit = ['draft', 'submitted', 'correction_needed'].includes(status);
  const lane = laneOf(app);
  const sections = LANE_SECTIONS[lane];
  const files: any[] = res.files || [];

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <button type="button" onClick={() => navigate('/dsa-applications')} className="mb-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft size={14} />All applications</button>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">{user.full_name}</h1>
          <p className="text-xs text-muted-foreground">{user.phone} · {user.user_code} · current role {user.role} · {app.application_no}</p>
        </div>
        <StatusPill status={status} />
      </div>

      {flags.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="mb-1 flex items-center gap-1 text-sm font-semibold text-amber-900 dark:text-amber-100"><AlertTriangle size={14} />Verification flags</div>
          <ul className="list-disc pl-5 text-xs text-amber-900 dark:text-amber-100">{flags.map((f) => <li key={f.code}>{f.message}</li>)}</ul>
        </div>
      )}

      {app.correction && status === 'correction_needed' && (
        <div className="mb-4 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-100">
          Waiting for the applicant to fix: {(app.correction.steps || []).map((s: string) => STEP_LABELS[s]).join(', ')}. Note sent: “{app.correction.note}”
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          {sections.map((s) => (
            <div key={s} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <b className="text-sm text-foreground">{STEP_LABELS[s]}</b>
                {canEdit && LANE_EDITABLE[lane].includes(s) && editing !== s && !(s === 'kyc' && ['digilocker', 'aadhaar_otp'].includes(app.data?.kyc?.source)) && (
                  <button type="button" className="text-xs text-primary" onClick={() => setEditing(s)}>{app.data?.[s] ? 'Edit' : 'Add'}</button>
                )}
              </div>
              {editing === s ? (
                s === 'business_proof' ? (
                  <ProofEditor appId={id} app={app} onCancel={() => setEditing(null)}
                    onSave={async (data) => {
                      try {
                        await api.put(`/dsa-applications/${id}/details`, { step: s, data });
                        toast.success('Saved');
                        setEditing(null);
                        await load();
                      } catch (e: any) { toast.error(e.message || 'Could not save'); }
                    }} />
                ) : (
                  <StepEditor step={s} app={app} onCancel={() => setEditing(null)}
                    onSave={async (data) => {
                      try {
                        await api.put(`/dsa-applications/${id}/details`, { step: s, data });
                        toast.success('Saved');
                        setEditing(null);
                        await load();
                      } catch (e: any) { toast.error(e.message || 'Could not save'); }
                    }} />
                )
              ) : app.data?.[s] ? (
                <div className="mt-2 space-y-1">
                  {summaryRows(s, app.data[s]).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 text-xs"><span className="text-muted-foreground">{k}</span><span className="text-right text-foreground">{v}</span></div>
                  ))}
                  {s === 'gst_udyam' && (app.data.gst_udyam?.gst || app.data.gst_udyam?.udyam) && (
                    <details className="pt-1 text-xs">
                      <summary className="cursor-pointer font-medium text-primary">
                        Everything the {app.data.gst_udyam.gst ? 'GST' : 'Udyam'} record returned
                      </summary>
                      <div className="mt-2 space-y-1 rounded-lg bg-muted/40 p-3">
                        {recordRows(app.data.gst_udyam.gst || app.data.gst_udyam.udyam).map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-3"><span className="text-muted-foreground">{k}</span><span className="max-w-[60%] break-words text-right text-foreground">{v}</span></div>
                        ))}
                      </div>
                    </details>
                  )}
                  {s === 'gst_udyam' && app.data.gst_udyam?.document_file_id && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      <button type="button" className="inline-flex items-center gap-1 text-xs text-primary"
                        onClick={() => openDsaFile(app.data.gst_udyam.document_file_id).catch((e) => toast.error(e.message))}>
                        <ExternalLink size={12} />View the {app.data.gst_udyam.gst_choice === 'Has GST' ? 'GST' : 'Udyam'} document
                      </button>
                    </div>
                  )}
                  {s === 'work_setup' && (app.data.work_setup?.office_photos || []).length > 0 && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      {(app.data.work_setup.office_photos as any[]).map((ph, i) => (
                        <button key={ph.id} type="button" className="inline-flex items-center gap-1 text-xs text-primary"
                          onClick={() => openDsaFile(ph.id).catch((e) => toast.error(e.message))}>
                          <ExternalLink size={12} />View office photo {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                  {s === 'location' && app.data.location?.mode === 'gps' && (
                    <div className="pt-1">
                      <a className="inline-flex items-center gap-1 text-xs text-primary" target="_blank" rel="noopener noreferrer"
                        href={`https://www.openstreetmap.org/?mlat=${app.data.location.lat}&mlon=${app.data.location.lng}#map=18/${app.data.location.lat}/${app.data.location.lng}`}>
                        <ExternalLink size={12} />Open the location on a map
                      </a>
                    </div>
                  )}
                  {s === 'business_proof' && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      {[...regDocsOf(app.data.business_proof).map((r) => [r.type, r.file_id]), ['Authority proof', app.data.business_proof.authority_doc_file_id],
                        ...((app.data.business_proof.office_photos || []) as any[]).map((ph, i) => [`Office photo ${i + 1}`, ph.id])].map(([label, fid]) => (
                        fid ? (
                          <button key={`${label}-${fid}`} type="button" className="inline-flex items-center gap-1 text-xs text-primary"
                            onClick={() => openDsaFile(fid as number).catch((e) => toast.error(e.message))}>
                            <ExternalLink size={12} />View {String(label).toLowerCase()}
                          </button>
                        ) : null
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Not filled yet.</p>
              )}
            </div>
          ))}
          <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
            <div>Mobile verified: {app.otp_verified ? 'Yes' : 'No'}</div>
            <div>Consent: {app.consent ? `Accepted ${fmt(app.consent.accepted_at)}` : 'Not yet'}</div>
            <div>Agreement: {app.agreement ? `Signed by ${app.agreement.signed_name} on ${fmt(app.agreement.accepted_at)}` : 'Not yet'}</div>
          </div>
        </div>

        <div className="space-y-3">
          {status === 'submitted' && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <b className="text-sm text-foreground">Make this user a DSA</b>
              <p className="text-xs text-muted-foreground">Reporting, branch and DSA assignment are done from the user's page after approval.</p>
              {flags.length > 0 && (
                <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={ack} onChange={(e) => setAck(e.target.checked)} /><span>I have checked the verification flags above.</span></label>
              )}
              <Button className="w-full" disabled={busy || (flags.length > 0 && !ack)}
                onClick={() => { if (window.confirm(`Approve ${user.full_name} as a DSA? Their role changes to DSA now.`)) act(() => api.post(`/dsa-applications/${id}/approve`, { ack_checks: ack, note }), 'Approved. The user is now a DSA'); }}>
                Approve and make DSA
              </Button>
            </div>
          )}

          {['submitted', 'correction_needed'].includes(status) && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              {status === 'submitted' && (
                <>
                  <b className="text-sm text-foreground">Send back for correction</b>
                  <div className="flex flex-wrap gap-1.5">
                    {LANE_CORRECTABLE[lane].map((s) => (
                      <button key={s} type="button" onClick={() => setFixSteps((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))}
                        className={`rounded-full border px-2.5 py-1 text-[11px] ${fixSteps.includes(s) ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}>{STEP_LABELS[s]}</button>
                    ))}
                  </div>
                </>
              )}
              <Input placeholder={status === 'submitted' ? 'Note for the applicant (required)' : 'Reason for rejection'} value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex gap-2">
                {status === 'submitted' && (
                  <Button variant="outline" className="flex-1" disabled={busy || fixSteps.length === 0 || note.trim().length < 3}
                    onClick={() => act(() => api.post(`/dsa-applications/${id}/request-correction`, { steps: fixSteps, note }), 'Sent back for correction')}>Request correction</Button>
                )}
                <Button variant="destructive" className="flex-1" disabled={busy || note.trim().length < 3}
                  onClick={() => { if (window.confirm('Reject this application? The user stays in their current role.')) act(() => api.post(`/dsa-applications/${id}/reject`, { note }), 'Application rejected'); }}>Reject</Button>
              </div>
            </div>
          )}

          {['invited', 'draft', 'correction_needed'].includes(status) && (
            <div className="rounded-xl border border-border bg-card p-4">
              <Button variant="outline" className="w-full" disabled={busy}
                onClick={() => { if (window.confirm('Cancel this DSA invite?')) act(() => api.post(`/dsa-applications/${id}/cancel`, {}), 'Invite cancelled'); }}>Cancel invite</Button>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4">
            <b className="text-sm text-foreground">History</b>
            <ul className="mt-2 space-y-1.5">
              {res.events.map((e: any) => (
                <li key={e.id} className="text-xs"><span className="font-medium text-foreground">{e.action.replace(/_/g, ' ')}</span>
                  <span className="text-muted-foreground"> · {e.actor_name || 'system'} · {fmt(e.created_at)}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
