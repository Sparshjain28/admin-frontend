const API_URL = import.meta.env.VITE_API_URL || 'https://staging-api.finonest.org/api';

// Safe localStorage access
function getStoredToken(): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  } catch {
    return null;
  }
}

let authToken: string | null = getStoredToken();

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
          localStorage.removeItem('auth_token');
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
      api.setToken(null);
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
