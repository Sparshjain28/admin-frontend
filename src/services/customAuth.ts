const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000').replace(/\/$/, '');
const isProd = import.meta.env.PROD;

// Cookie helper functions
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, hours: number = 168): void { // Default to 7 days
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + hours * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax` + (isProd ? ';Secure' : '');
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// Get auth token - checks cookie first, then localStorage fallback
function getAuthToken(): string | null {
  return getCookie('auth_token') || localStorage.getItem('auth_token');
}

// Clear all auth data
function clearAuthData() {
  deleteCookie('auth_token');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('user_permissions');
}

// Check if user is authenticated (by validating with backend)
async function checkAuth(): Promise<{ authenticated: boolean; user?: any; status?: number }> {
  const token = getAuthToken();
  if (!token) return { authenticated: false };

  try {
    const response = await fetch(`${API_BASE_URL}/api/cardsModule/auth/user`, {
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthData();
      }
      return { authenticated: false, status: response.status };
    }

    const data = await response.json();
    return { authenticated: data.success, user: data.user, status: 200 };
  } catch (error: any) {
    // A network error occurred, do NOT clear auth data (prevents logging out on flaky mobile connections)
    return { authenticated: false, status: error.status || 500 };
  }
}

export const customAuth = {
  signUp: async (mobile: string, mpin: string, name: string, employeeType: string, pan: string, dob: string, aadhaar: string, aadhaarName: string, aadhaarAddress: string, aadhaarFatherName: string, aadhaarPhoto: string, email: string, bankAccount: string, ifsc: string, creditCardsAccess: boolean, loanDisbursementAccess: boolean, referredBy?: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        mobile, mpin, name,
        employee_type: employeeType,
        pan, dob, aadhaar,
        aadhaar_name: aadhaarName,
        aadhaar_address: aadhaarAddress,
        aadhaar_father_name: aadhaarFatherName,
        aadhaar_photo: aadhaarPhoto,
        email, bank_account: bankAccount, ifsc,
        creditCardsAccess, loanDisbursementAccess,
        referred_by: referredBy || undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    // Store token in cookie (set by backend) and localStorage fallback
    setCookie('auth_token', data.token);
    localStorage.setItem('auth_token', data.token);

    // Store only essential user data to minimize storage (5-9MB issue fixed)
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return { success: data.success, error: null };
  },

  signIn: async (identifier: string, mpin: string) => {
    console.log('Signing in with:', identifier, mpin);
    const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ identifier, mpin }),
    });

    console.log('Signin response:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('Signin error:', error);
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    console.log('Signin success:', data);

    // Store token in cookie (set by backend) and localStorage fallback
    setCookie('auth_token', data.token);
    localStorage.setItem('auth_token', data.token);

    // Store only essential user data to minimize storage (5-9MB issue fixed)
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    if (data.user.permissions) {
      localStorage.setItem('user_permissions', JSON.stringify(data.user.permissions));
    }
    return { success: data.success, error: null };
  },

  signOut: async () => {
    const token = getAuthToken();
    // Notify backend to clear cookie
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
    } catch { /* ignore */ }

    clearAuthData();
  },

  getUser: async () => {
    const token = getAuthToken();
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/cardsModule/auth/user`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearAuthData();
        }
        return null;
      }
      const data = await response.json();
      return data.user;
    } catch {
      return null;
    }
  },

  // Validate auth state with backend - this is the proper way to check auth
  validateAuth: checkAuth,

  // Legacy check - just checks if token exists (use validateAuth for proper validation)
  isAuthenticated: async () => {
    const result = await checkAuth();
    return result.authenticated;
  },
};
