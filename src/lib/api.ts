function enforceHttpsApiUrl(rawUrl: string): string {
  const cleaned = rawUrl.trim().replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    if (!isLocalHost && /^http:\/\//i.test(cleaned)) {
      return cleaned.replace(/^http:\/\//i, 'https://');
    }
  }
  return cleaned;
}

const explicitBase = import.meta.env.VITE_API_BASE_URL?.trim();
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const isRelativeApiPath = Boolean(configuredApiUrl && configuredApiUrl.startsWith('/'));

export const API_BASE_URL = enforceHttpsApiUrl(
  explicitBase ||
    (isRelativeApiPath
      ? ''
      : configuredApiUrl?.replace(/\/api\/?$/, '') ||
        (typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ? 'http://localhost:5000'
          : 'https://staging-api.finonest.org'))
);
export const API_URL = enforceHttpsApiUrl(
  configuredApiUrl || `${API_BASE_URL}/api`
);

export function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url || url === 'null') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http')) return trimmed;
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${path}`;
}

// Safe localStorage access & auth headers helper
export function getAuthToken(): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  } catch {
    return null;
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const SESSION_DRAFT_KEYS = [
  'loan_draft_data',
  'reapply_loan_data',
  'current_draft_id',
];

export function sanitizeCachedUser<T extends Record<string, any> | null | undefined>(user: T) {
  if (!user) return null;
  return {
    id: user.id,
    user_id: user.user_id,
    name: user.name || user.full_name,
    full_name: user.full_name || user.name,
    role: user.role,
    status: user.status,
    branch_id: user.branch_id,
    reporting_to: user.reporting_to,
    dsa_id: user.dsa_id,
    photo_path: user.photo_path ?? null,
    must_change_mpin: user.must_change_mpin === true,
  };
}

export function clearAuthStorage() {
  authToken = null;
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('cached_user');
      localStorage.removeItem('cached_permissions');
      localStorage.removeItem('customer_token');
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      for (const key of SESSION_DRAFT_KEYS) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage errors
  }
}

let authToken: string | null = getAuthToken();

export const api = {
  setToken(token: string | null) {
    authToken = token;
    try {
      if (typeof window !== 'undefined') {
        if (token) {
          localStorage.setItem('auth_token', token);
        } else {
          localStorage.removeItem('auth_token');
        }
      }
    } catch (error) {
      console.error('Failed to update localStorage:', error);
    }
  },

  async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // /sso is exempt alongside /login and /signup: a 401 there is a bad
        // one-time ticket, not a dead session. SSOCallback renders its own
        // error, so swallowing the rejection here would leave it stuck on
        // the spinner and would clear a token that is still valid.
        const exempt = ['/login', '/signup', '/sso'];
        if (typeof window !== 'undefined' && !exempt.some((p) => window.location.pathname.includes(p))) {
          clearAuthStorage();
          window.location.href = '/login';
          // Prevent the calling component from showing an error toast while the page redirects
          return new Promise(() => {}) as any;
        }
      }
      const error = await response.json().catch(() => ({ error: response.statusText }));
      const apiError: any = new Error(error.message || error.error || 'API Error');
      apiError.status = response.status;
      throw apiError;
    }

    return response.json();
  },

  get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  patch(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// Auth API
export const authAPI = {
  login: (phone: string, password: string) => api.post('/auth/login', { phone, password }),
  signup: (name: string, phone: string, password: string, additionalData?: any) => 
    api.post('/auth/signup', { name, phone, password, ...additionalData }),
  getProfile: () => api.get('/auth/profile'),
  exchangeSsoTicket: (ticket: string) => api.post('/auth/exchange-sso-ticket', { ticket }),
};

// Integrations API
export const integrationsAPI = {
  getInventory: () => api.get('/integrations/inventory'),
};

// Legacy supabase compatibility
export const supabase = {
  auth: {
    signInWithPassword: async ({ phone, password }: { phone: string; password: string }) => {
      try {
        const data = await authAPI.login(phone, password);
        if (data.token) {
          api.setToken(data.token);
        }
        return { data: { user: data.user }, error: null };
      } catch (error: any) {
        return { data: { user: null }, error: { message: error.message } };
      }
    },
    signUp: async ({ phone, password, options }: any) => {
      try {
        await authAPI.signup(options?.data?.full_name || 'User', phone, password);
        return { error: null };
      } catch (error: any) {
        return { error: { message: error.message } };
      }
    },
    signOut: async () => {
      clearAuthStorage();
      return {};
    },
    getSession: async () => {
      return { data: { session: authToken ? { user: {} } : null } };
    },
    onAuthStateChange: (callback: any) => {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },
};
