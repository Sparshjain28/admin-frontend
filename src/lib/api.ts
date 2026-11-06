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

// Loans API
export const loansAPI = {
  getAll: (params?: any) => api.get('/loans' + (params ? `?${new URLSearchParams(params)}` : '')),
  getById: (id: number) => api.get(`/loans/${id}`),
  create: (data: any) => api.post('/loans', data),
  update: (id: number, data: any) => api.put(`/loans/${id}`, data),
  delete: (id: number) => api.delete(`/loans/${id}`),
};

// Banks API
export const banksAPI = {
  getAll: () => api.get('/banks'),
  getById: (id: number) => api.get(`/banks/${id}`),
  create: (data: any) => api.post('/banks', data),
  update: (id: number, data: any) => api.put(`/banks/${id}`, data),
  delete: (id: number) => api.delete(`/banks/${id}`),
};

// Brokers API
export const brokersAPI = {
  getAll: () => api.get('/brokers'),
  getById: (id: number) => api.get(`/brokers/${id}`),
  create: (data: any) => api.post('/brokers', data),
  update: (id: number, data: any) => api.put(`/brokers/${id}`, data),
  delete: (id: number) => api.delete(`/brokers/${id}`),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

// Leads API
export const leadsAPI = {
  getAll: () => api.get('/leads'),
  getById: (id: number) => api.get(`/leads/${id}`),
  create: (data: any) => api.post('/leads', data),
  update: (id: number, data: any) => api.put(`/leads/${id}`, data),
  delete: (id: number) => api.delete(`/leads/${id}`),
};

// Commissions API
export const commissionsAPI = {
  getAll: () => api.get('/commissions'),
  getById: (id: number) => api.get(`/commissions/${id}`),
  create: (data: any) => api.post('/commissions', data),
  update: (id: number, data: any) => api.put(`/commissions/${id}`, data),
  delete: (id: number) => api.delete(`/commissions/${id}`),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Reports API
export const reportsAPI = {
  loans: (params?: any) => api.get('/reports/loans' + (params ? `?${new URLSearchParams(params)}` : '')),
  commissions: (params?: any) => api.get('/reports/commissions' + (params ? `?${new URLSearchParams(params)}` : '')),
  sales: () => api.get('/reports/sales'),
};

// Branches API
export const branchesAPI = {
  getAll: (page = 1, limit = 50, search = '') => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    if (search) params.append('search', search);
    return api.get(`/branches?${params.toString()}`);
  },
  getById: (id: number) => api.get(`/branches/${id}`),
  create: (data: any) => api.post('/branches', data),
  update: (id: number, data: any) => api.put(`/branches/${id}`, data),
  delete: (id: number) => api.delete(`/branches/${id}`),
};

// Calling API
export const callingAPI = {
  getConfig: () => api.get('/calling/config'),
  updateConfig: (data: any) => api.put('/calling/config', data),
  getRecords: (params?: any) => api.get('/calling/records' + (params ? `?${params}` : '')),
  createRecord: (data: any) => api.post('/calling/records', data),
  deleteRecord: (id: number) => api.delete(`/calling/records/${id}`),
  getStatistics: (params?: any) => api.get('/calling/statistics' + (params ? `?${params}` : '')),
  getTeamMembers: () => api.get('/calling/team-members'),
  getDailySummary: (params?: any) => api.get('/calling/daily-summary' + (params ? `?${params}` : '')),
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
