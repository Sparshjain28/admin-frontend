export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://staging-api.finonest.org').replace(/\/$/, '');

// Get token from cookie first, then localStorage
function getAuthToken(): string | null {
  if (typeof document === 'undefined') return localStorage.getItem('auth_token');
  const match = document.cookie.match(new RegExp('(^| )auth_token=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : localStorage.getItem('auth_token');
}

export function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url || url === 'null') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http')) return trimmed;
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${path}`;
}

/** Pick first usable image field from a card/product record */
export function getCardImageSource(card: Record<string, unknown> | null | undefined): string | undefined {
  if (!card) return undefined;
  const raw =
    card.card_image ??
    card.cardImage ??
    card.image ??
    card.variant_image ??
    card.variantImage;
  return resolveImageUrl(typeof raw === 'string' ? raw : undefined);
}

/**
 * Legacy API client fallback:
 * The old Credit Card module (cardsModule) was removed from the backend.
 * This proxy safely handles any residual legacy references so the app never throws runtime errors.
 * Active application features use @/lib/api.
 */
export const api: Record<string, any> = new Proxy({}, {
  get: (_target, prop) => {
    return async (..._args: any[]) => {
      console.warn(`[Deprecated API] Called legacy method api.${String(prop)} - cardsModule is no longer active.`);
      return { success: false, data: [], records: [] };
    };
  }
});
