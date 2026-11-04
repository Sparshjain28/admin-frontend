// Utility for multi-portal detection, allowed roles, and local portal switching

export type PortalType = 'admin' | 'sales' | 'ops';

export interface PortalMeta {
  id: PortalType;
  title: string;
  tagline: string;
  badge: string;
  allowedRoles: string[];
}

export const PORTALS: Record<PortalType, PortalMeta> = {
  admin: {
    id: 'admin',
    title: 'Finonest Admin Portal',
    tagline: 'Super Administration & Master Control',
    badge: 'bg-red-500/10 text-red-600 border-red-200',
    allowedRoles: ['admin', 'super_admin'],
  },
  sales: {
    id: 'sales',
    title: 'Finonest Sales Hub',
    tagline: 'Sales Management, Branch & Team Oversight',
    badge: 'bg-blue-500/10 text-blue-600 border-blue-200',
    allowedRoles: ['sales_manager', 'manager'],
  },
  ops: {
    id: 'ops',
    title: 'Finonest Operations & Accounts',
    tagline: 'Underwriting Desk, Loans, Disbursements & Tally',
    badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    allowedRoles: ['operation_team', 'ops_team', 'loan_operations', 'accountant'],
  },
};

// Roles that belong strictly to the Field Portal (App-Frontend / app.finonest.com)
export const FIELD_ROLES = ['dsa', 'branch_manager', 'team_leader', 'executive', 'employee', 'advisor'];

/**
 * Detect the active portal based strictly on subdomain hostname
 * Works for both local (admin.localhost) and production (admin.finonest.com)
 * Returns null if the hostname is not an authorized portal subdomain.
 */
export function getCurrentPortal(): PortalType | null {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();

    // Direct strict subdomain checks (e.g. admin.localhost or admin.finonest.com)
    if (hostname === 'admin.localhost' || hostname === 'admin.finonest.com') return 'admin';
    if (hostname === 'sales.localhost' || hostname === 'sales.finonest.com') return 'sales';
    if (
      hostname === 'ops.localhost' ||
      hostname === 'ops.finonest.com' ||
      hostname === 'operation.localhost' ||
      hostname === 'operation.finonest.com'
    ) {
      return 'ops';
    }

    // Query override fallback ONLY on bare localhost / 127.0.0.1 for local testing
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const params = new URLSearchParams(window.location.search);
      const queryPortal = params.get('portal')?.toLowerCase() as PortalType;
      if (queryPortal && PORTALS[queryPortal]) {
        return queryPortal;
      }
    }
  }

  // Strict Zero-Trust: If not explicitly authorized, do NOT fallback to admin!
  return null;
}

/**
 * Switch dev portal for local testing
 */
export function setDevPortal(portal: PortalType) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('finonest_dev_portal', portal);
    window.location.reload();
  }
}

/**
 * Validate if a role is permitted on the current portal
 */
export function isRoleAllowedOnCurrentPortal(role?: string | null): boolean {
  if (!role) return false;
  const currentPortal = getCurrentPortal();
  if (!currentPortal) return false;
  const allowed = PORTALS[currentPortal]?.allowedRoles || [];
  return allowed.includes(role.toLowerCase());
}

/**
 * Find which portal a role belongs to
 */
export function getRecommendedPortalForRole(role?: string | null): { portal: PortalType | 'field'; domain: string; name: string } {
  const r = (role || '').toLowerCase();
  
  if (FIELD_ROLES.includes(r)) {
    return { portal: 'field', domain: 'https://app.finonest.com', name: 'Field / Partner App (app.finonest.com)' };
  }
  if (PORTALS.admin.allowedRoles.includes(r)) {
    return { portal: 'admin', domain: 'https://admin.finonest.com', name: 'Admin Portal (admin.finonest.com)' };
  }
  if (PORTALS.sales.allowedRoles.includes(r)) {
    return { portal: 'sales', domain: 'https://sales.finonest.com', name: 'Sales Hub (sales.finonest.com)' };
  }
  if (PORTALS.ops.allowedRoles.includes(r)) {
    return { portal: 'ops', domain: 'https://ops.finonest.com', name: 'Operations & Accounts (ops.finonest.com)' };
  }

  return { portal: 'field', domain: 'https://app.finonest.com', name: 'Finonest App' };
}

