import { API_URL, getAuthHeaders } from '@/lib/api';

// Business documents are private: they cannot be opened from a plain link. The browser asks for the file with the
// user's login token, and the backend decides whether this user may see it (the applicant, or a reviewer of that application).
export async function openDsaFile(fileId: number | string): Promise<void> {
  const base = API_URL;
  const res = await fetch(`${base}/dsa-applications/files/${fileId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Could not open the file' }));
    throw new Error(err.error || err.message || 'Could not open the file');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function uploadDsaFile(path: string, kind: 'registration' | 'authority' | 'office_photo', file: File): Promise<{ id: number; name: string; size: number }> {
  const base = API_URL;
  const fd = new FormData();
  fd.append('kind', kind);
  fd.append('document', file);
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: fd,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.file) throw new Error(data?.error || data?.message || 'Upload failed');
  return data.file;
}

// A private file as an object URL (for a thumbnail), fetched with the user's login. The caller revokes it.
export async function fetchDsaFileUrl(fileId: number | string): Promise<string> {
  const base = API_URL;
  const res = await fetch(`${base}/dsa-applications/files/${fileId}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Could not load the photo');
  return URL.createObjectURL(await res.blob());
}

// The applicant removes an office photo they uploaded.
export async function deleteDsaFile(fileId: number | string): Promise<void> {
  const base = API_URL;
  const res = await fetch(`${base}/dsa-applications/me/files/${fileId}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Could not remove the photo');
  }
}
