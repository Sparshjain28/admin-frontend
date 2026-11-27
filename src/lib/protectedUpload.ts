import { useEffect, useState } from 'react';
import { API_BASE_URL, getAuthHeaders } from './api';

const PUBLIC_UPLOAD_PREFIXES = [
  '/uploads/bank-logos/',
  '/uploads/card-variants/',
  '/uploads/temp/',
];

export function resolveUploadUrl(rawPath: string | null | undefined): string | null {
  if (!rawPath || rawPath === 'null') return null;
  const trimmed = rawPath.trim();
  if (!trimmed) return null;
  if (/^(https?:|blob:|data:)/i.test(trimmed)) return trimmed;
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${normalized}`;
}

export function isProtectedUploadPath(urlOrPath: string | null | undefined): boolean {
  if (!urlOrPath) return false;
  const trimmed = urlOrPath.trim();
  if (!trimmed || /^(blob:|data:)/i.test(trimmed)) return false;

  try {
    const pathname = new URL(trimmed, 'http://localhost').pathname.toLowerCase();
    const uploadPath = pathname.startsWith('/api/uploads/')
      ? pathname.slice(4)
      : pathname;

    if (!uploadPath.startsWith('/uploads/')) return false;
    return !PUBLIC_UPLOAD_PREFIXES.some((prefix) => uploadPath.startsWith(prefix));
  } catch {
    return trimmed.toLowerCase().includes('/uploads/');
  }
}

export async function fetchProtectedUploadBlob(urlOrPath: string): Promise<Blob> {
  const fetchUrl = resolveUploadUrl(urlOrPath);
  if (!fetchUrl) {
    throw new Error('Invalid upload path');
  }
  const response = await fetch(fetchUrl, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch file (${response.status})`);
  }
  return response.blob();
}

export function isSafeOpenUrl(urlOrPath: string | null | undefined): boolean {
  if (!urlOrPath) return false;
  const trimmed = urlOrPath.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('blob:')) return true;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    const apiHost = (() => {
      try {
        return new URL(API_BASE_URL).hostname.toLowerCase();
      } catch {
        return '';
      }
    })();
    const currentHost =
      typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';

    return (
      host === apiHost ||
      host === currentHost ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === 'finonest.com' ||
      host.endsWith('.finonest.com') ||
      host === 'finonest.org' ||
      host.endsWith('.finonest.org')
    );
  } catch {
    return false;
  }
}

export async function openProtectedUpload(urlOrPath: string): Promise<void> {
  const resolved = resolveUploadUrl(urlOrPath);
  if (!resolved) return;
  if (!isSafeOpenUrl(resolved)) {
    throw new Error('Blocked unsafe document URL');
  }

  if (!isProtectedUploadPath(resolved)) {
    window.open(resolved, '_blank', 'noopener,noreferrer');
    return;
  }

  // Open blank window synchronously inside click handler to avoid popup blockers
  const previewWindow = window.open('', '_blank');
  if (previewWindow) {
    previewWindow.opener = null;
  }

  try {
    const blob = await fetchProtectedUploadBlob(resolved);
    const blobUrl = URL.createObjectURL(blob);
    if (previewWindow) {
      previewWindow.location.href = blobUrl;
    } else {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch (error) {
    previewWindow?.close();
    throw error;
  }
}

export async function downloadProtectedUpload(
  urlOrPath: string,
  filename: string
): Promise<void> {
  const resolved = resolveUploadUrl(urlOrPath);
  if (!resolved) return;

  if (!isProtectedUploadPath(resolved)) {
    const a = document.createElement('a');
    a.href = resolved;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  const blob = await fetchProtectedUploadBlob(resolved);
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
}

export function useProtectedUploadUrl(rawPath: string | null | undefined) {
  const resolved = resolveUploadUrl(rawPath);
  const needsAuthFetch = isProtectedUploadPath(resolved);

  const [state, setState] = useState<{
    url: string | null;
    isLoading: boolean;
    error: boolean;
    mimeType: string | null;
  }>(() => ({
    url: needsAuthFetch ? null : resolved,
    isLoading: needsAuthFetch,
    error: false,
    mimeType: null,
  }));

  useEffect(() => {
    if (!resolved) {
      setState({ url: null, isLoading: false, error: false, mimeType: null });
      return;
    }

    if (!needsAuthFetch) {
      setState({ url: resolved, isLoading: false, error: false, mimeType: null });
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    const controller = new AbortController();

    setState({ url: null, isLoading: true, error: false, mimeType: null });

    fetch(resolved, { headers: getAuthHeaders(), signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({
          url: objectUrl,
          isLoading: false,
          error: false,
          mimeType: blob.type || null,
        });
      })
      .catch((err) => {
        if (cancelled || err?.name === 'AbortError') return;
        setState({ url: null, isLoading: false, error: true, mimeType: null });
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [resolved, needsAuthFetch]);

  return state;
}
