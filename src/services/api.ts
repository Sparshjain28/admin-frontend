export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000').replace(/\/$/, '');

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

export const api = {
  // Authentication & OTP
  sendOtpSignup: async (mobile: string) => {
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/auth/send-otp-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile })
    });
    return response.json();
  },

  verifyOtpSignup: async (mobile: string, otp: string) => {
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/auth/verify-otp-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, otp })
    });
    return response.json();
  },

  sendOtpForgot: async (mobile: string) => {
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/auth/send-otp-forgot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile })
    });
    return response.json();
  },

  verifyOtpForgot: async (mobile: string, otp: string) => {
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/auth/verify-otp-forgot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, otp })
    });
    return response.json();
  },

  resetPassword: async (resetToken: string, newMpin: string) => {
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken, newMpin })
    });
    return response.json();
  },

  getCreditCards: async () => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/credit-cards`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include'
    });
    return response.json();
  },

  getMainAppCreditCards: async () => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/products?category=Credit Card`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include'
    });
    return response.json();
  },

  createMainAppLead: async (data: any) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/credit-card-leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify({
        applicant_name: data.name || data.applicant_name || data.customer_name,
        customer_name: data.name || data.applicant_name || data.customer_name,
        phone: data.phone || data.applicant_phone,
        email: data.email || data.applicant_email,
        pincode: data.pincode,
        bank_id: data.bank_id,
        bank_name: data.bank_name,
        card_name: data.card_name || 'Credit Card',
        card_variant: data.card_variant,
        bank_redirect_url: data.bank_redirect_url || data.utm_link || '',
        utm_link: data.bank_redirect_url || data.utm_link || '',
        remark: data.remark || `Applied for ${data.card_name || 'Credit Card'}`,
        activation_status: data.activation_status || 'Pending',
        notes: `Applied for ${data.card_name || 'Credit Card'}. Redirect: ${data.bank_redirect_url || ''}`,
        source: 'Main App Apply Card',
        status: data.status || 'Generated'
      })
    });
    return response.json();
  },

  createCreditCard: async (data: any) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/credit-cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    return response.json();
  },

  updateCreditCardStatus: async (id: string, status: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/credit-cards/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify({ id, status })
    });
    return response.json();
  },

  updateCreditCard: async (id: string, data: any) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/credit-cards/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    return response.json();
  },

  deleteCreditCard: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/credit-cards/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.json();
  },

  getLeads: async (page: number = 1, limit: number = 20, search: string = '', status: string = '', cardStatus: string = '', cardType: string = '', filters: any = {}) => {
    const token = getAuthToken();
    const url = new URL(`${API_BASE_URL}/api/cardsModule/leads`);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('limit', limit.toString());
    if (search) url.searchParams.append('search', search);
    if (status && status !== 'all') url.searchParams.append('status', status);
    if (cardStatus && cardStatus !== 'all') url.searchParams.append('cardStatus', cardStatus);
    if (cardType && cardType !== 'all') url.searchParams.append('cardType', cardType);

    // Add new filter parameters
    if (filters.dateFrom) url.searchParams.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) url.searchParams.append('dateTo', filters.dateTo);
    if (filters.advisorName) url.searchParams.append('advisorName', filters.advisorName);
    if (filters.customerName) url.searchParams.append('customerName', filters.customerName);
    if (filters.customerNumber) url.searchParams.append('customerNumber', filters.customerNumber);
    if (filters.status && filters.status !== 'all') url.searchParams.append('status', filters.status);
    if (filters.bank && filters.bank !== 'all') url.searchParams.append('bank', filters.bank);
    if (filters.leadId) url.searchParams.append('leadId', filters.leadId);
    if (filters.applicationNumber) url.searchParams.append('applicationNumber', filters.applicationNumber);
    if (filters.advisorKycStatus && filters.advisorKycStatus !== '' && filters.advisorKycStatus !== 'all') url.searchParams.append('advisorKycStatus', filters.advisorKycStatus);
    if (filters.card_status && filters.card_status !== '' && filters.card_status !== 'all') url.searchParams.append('card_status', filters.card_status);
    if (filters.card_type && filters.card_type !== '' && filters.card_type !== 'all') url.searchParams.append('card_type', filters.card_type);
    if (filters.activation_status && filters.activation_status !== '' && filters.activation_status !== 'all') url.searchParams.append('activation_status', filters.activation_status);
    if (filters.advisorActive && filters.advisorActive !== '' && filters.advisorActive !== 'all') url.searchParams.append('advisorActive', filters.advisorActive);
    if (filters.archived) url.searchParams.append('archived', 'true');

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include'
    });
    return response.json();
  },

  getAllLeads: async (filters: any = {}) => {
    const token = getAuthToken();
    const params = new URLSearchParams();

    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '' && filters[key] !== 'all') {
        params.append(key, filters[key]);
      }
    });

    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/cardsModule/leads/all${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include'
    });
    return response.json();
  },

  getOfflineLeads: async (filters: any = {}) => {
    const token = getAuthToken();
    const params = new URLSearchParams();

    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '' && filters[key] !== 'all') {
        params.append(key, filters[key]);
      }
    });

    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/cardsModule/leads/offline${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include'
    });
    return response.json();
  },

  bulkLookupLeads: async (leadIds: string[] = [], applicationNumbers: string[] = []) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/leads/bulk-lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify({ leadIds, applicationNumbers })
    });
    return response.json();
  },

  createLead: async (data: any) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    return response.json();
  },

  updateLeadStatus: async (id: string, status: string, remark: string = '') => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/leads/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({ id, status, remark })
    });
    return response.json();
  },

  updateLead: async (id: string, data: any) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    return response.json();
  },

  deleteLead: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/leads/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({ id })
    });
    return response.json();
  },

  deleteAllLeads: async () => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/leads/delete-all`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    return response.json();
  },

  getApplicantNames: async (search?: string) => {
    const token = getAuthToken();
    try {
      const url = search 
        ? `${API_BASE_URL}/api/cardsModule/leads/applicants?search=${encodeURIComponent(search)}`
        : `${API_BASE_URL}/api/cardsModule/leads/applicants`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });
      return response.json();
    } catch { return { success: false, names: [] }; }
  },

  verifyPAN: async (panNumber: string) => {
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/pan/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_number: panNumber })
    });
    return response.json();
  },

  getUsers: async (page: number = 1, limit: number = 10, search: string = '', role: string = '') => {
    const token = getAuthToken();
    try {
      const roleParam = role ? `&role=${encodeURIComponent(role)}` : '';
      const response = await fetch(`${API_BASE_URL}/api/cardsModule/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}${roleParam}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });
      const text = await response.text();
      if (!text) return { success: false, users: [], total: 0 };
      return JSON.parse(text);
    } catch { return { success: false, users: [], total: 0 }; }
  },

  searchUsers: async (query: string, page: number = 1, limit: number = 10, role: string = '') => {
    const token = getAuthToken();
    try {
      const roleParam = role ? `&role=${encodeURIComponent(role)}` : '';
      const response = await fetch(`${API_BASE_URL}/api/cardsModule/users?search=${encodeURIComponent(query)}&page=${page}&limit=${limit}${roleParam}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });
      const text = await response.text();
      if (!text) return { success: false, users: [], total: 0 };
      return JSON.parse(text);
    } catch { return { success: false, users: [], total: 0 }; }
  },

  getMyTeam: async (page: number = 1, limit: number = 10, viewAll: boolean = false, search: string = '') => {
    const token = getAuthToken();
    try {
      const viewAllParam = viewAll ? '&viewAll=true' : '';
      const response = await fetch(`${API_BASE_URL}/api/cardsModule/users/my-team?page=${page}&limit=${limit}${viewAllParam}&search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });
      const text = await response.text();
      if (!text) return { success: false, members: [], total: 0 };
      return JSON.parse(text);
    } catch { return { success: false, members: [], total: 0 }; }
  },

  getMyTeamTree: async () => {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE_URL}/api/cardsModule/users/my-team/tree`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });
      const text = await response.text();
      if (!text) return { success: false, tree: [] };
      return JSON.parse(text);
    } catch { return { success: false, tree: [] }; }
  },

  getMappableUsers: async () => {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE_URL}/api/cardsModule/users/mappable`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });
      const text = await response.text();
      if (!text) return { success: false, users: [] };
      return JSON.parse(text);
    } catch { return { success: false, users: [] }; }
  },

  getUpperLevelUsers: async (userId: string) => {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE_URL}/api/cardsModule/users/upper-level/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });
      const text = await response.text();
      if (!text) return { success: false, users: [] };
      return JSON.parse(text);
    } catch { return { success: false, users: [] }; }
  },

  assignToTeam: async (userId: string, managerId?: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/users/${userId}/assign-manager`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify({ managerId })
    });
    return response.json();
  },

  removeFromTeam: async (userId: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/users/${userId}/remove-from-team`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.json();
  },

  deleteUser: async (userId: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.json();
  },

  updateUserPermissions: async (userId: string, permissions: any) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/users/${userId}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({ id: userId, ...permissions })
    });
    return response.json();
  },

  updateUserRole: async (userId: string, role: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({ id: userId, role })
    });
    return response.json();
  },

  updateUser: async (userId: string, data: any) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/users/${userId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  generateApiKey: async (userId: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/admin-config/users/${userId}/generate-key`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  generateSelfApiKey: async () => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/users/generate-api-key`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  setUserApiAccess: async (userId: string, enabled: boolean) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/users/${userId}/api-access`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ enabled })
    });
    return response.json();
  },

  getDashboardStats: async (userId?: string) => {
    const token = getAuthToken();
    const url = new URL(`${API_BASE_URL}/api/cardsModule/stats`);
    if (userId) url.searchParams.append('userId', userId);
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include'
    });
    return response.json();
  },

  getBankFilters: async (productType?: string) => {
    try {
      const url = productType
        ? `${API_BASE_URL}/api/cardsModule/bank-filters?productType=${productType}`
        : `${API_BASE_URL}/api/cardsModule/bank-filters`;
      const response = await fetch(url, { credentials: 'include' });
      const text = await response.text();
      if (!text) return { success: false, filters: [] };
      return JSON.parse(text);
    } catch { return { success: false, filters: [] }; }
  },

  saveBankFilter: async (data: any) => {
    const token = getAuthToken();
    const isDbId = data.id && /^[0-9a-f-]{36}$/.test(data.id);
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/bank-filters${isDbId ? `/${data.id}` : ''}`, {
      method: isDbId ? 'PUT' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  createBank: async (data: any) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/banks`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${token}` 
      },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return response.json();
  },

  deleteBankFilter: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/bank-filters/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },

  getBanks: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/cardsModule/banks`, { credentials: 'include' });
      const text = await response.text();
      if (!text) return { success: false, banks: [] };
      return JSON.parse(text);
    } catch { return { success: false, banks: [] }; }
  },

  saveBank: async (data: any) => {
    const token = getAuthToken();
    const isUpdate = !!data.id;
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/banks${isUpdate ? `/${data.id}` : ''}`, {
      method: isUpdate ? 'PUT' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  deleteBank: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/banks/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },

  uploadBankLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/upload/bank-logo`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return response.json();
  },

  uploadCardImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/upload/card-image`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return response.json();
  },

  getPayouts: async () => {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE_URL}/api/cardsModule/payouts`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await response.text();
      if (!text) return { success: false, myPayouts: [], referralPayouts: [], totalMyEarnings: 0, totalReferralEarnings: 0 };
      return JSON.parse(text);
    } catch { return { success: false, myPayouts: [], referralPayouts: [], totalMyEarnings: 0, totalReferralEarnings: 0 }; }
  },

  getAllPayouts: async () => {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE_URL}/api/cardsModule/payouts/all`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await response.text();
      if (!text) return { success: false, payouts: [], totalPending: 0, totalPaid: 0 };
      return JSON.parse(text);
    } catch { return { success: false, payouts: [], totalPending: 0, totalPaid: 0 }; }
  },

  getTeamPayouts: async () => {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE_URL}/api/cardsModule/payouts/team`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await response.text();
      if (!text) return { success: false, payouts: [], totalPending: 0, totalPaid: 0 };
      return JSON.parse(text);
    } catch { return { success: false, payouts: [], totalPending: 0, totalPaid: 0 }; }
  },

  markPayoutPaid: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/payouts/${id}/mark-paid`, {
      method: 'PUT',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },

  updatePayoutDeduction: async (id: string, deduction: number, remarks?: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/payouts/${id}/deduction`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deduction, remarks: remarks || null }),
    });
    return response.json();
  },

  importPayouts: async (payouts: any[]) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/payouts/import`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payouts }),
    });
    return response.json();
  },

  deletePayout: async (id: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/payouts/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  },

  exportLeads: async () => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/leads/export/csv`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response;
  },

  importLeads: async (leadsData: any[]) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/leads/import/csv`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ leads: leadsData }),
    });
    return response.json();
  },

  // API Settings Management
  getApiSettings: async (userId: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/api-settings/${userId}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },

  updateApiSettings: async (userId: string, settings: any) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/api-settings/${userId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    return response.json();
  },

  getUsersWithApiAccess: async () => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/api-settings/users`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },

  getApiLogs: async (limit: number = 100, page: number = 1, filters: any = {}) => {
    const token = getAuthToken();
    const url = new URL(`${API_BASE_URL}/api/cardsModule/logs`);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('page', page.toString());
    if (filters.userId) url.searchParams.append('userId', filters.userId);
    if (filters.leadId) url.searchParams.append('leadId', filters.leadId);
    if (filters.endpoint) url.searchParams.append('endpoint', filters.endpoint);
    if (filters.action) url.searchParams.append('action', filters.action);

    const response = await fetch(url.toString(), {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },

  getApiCallStats: async (timeRange: string = '24h') => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/logs/stats?timeRange=${timeRange}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },

  getLeadApiCalls: async (leadId: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/logs/lead/${leadId}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },

  clearOldApiLogs: async (daysOld: number = 30) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/logs?daysOld=${daysOld}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },

  getApiUsersList: async () => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/api-settings?list=true`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },

  getAvailableCards: async () => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/api-settings?list=cards`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },
};
