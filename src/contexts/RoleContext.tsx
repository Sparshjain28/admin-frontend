import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Permission } from '@/types';
import { useAuth } from './AuthContext';
import { customAuth } from '@/services/customAuth';

type RolePermissions = Record<UserRole, { creditCards: Permission }>;

interface ModuleAccess { creditCards: boolean; }
interface UserAccess { [userId: string]: ModuleAccess; }

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  permissions: { creditCards: Permission };
  moduleAccess: { creditCards: boolean };
  isLoggedIn: boolean;
  setIsLoggedIn: (v: boolean) => void;
  userAccess: UserAccess;
  setUserAccess: React.Dispatch<React.SetStateAction<UserAccess>>;
  rolePermissions: RolePermissions;
  setRolePermissions: React.Dispatch<React.SetStateAction<RolePermissions>>;
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (v: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  authUser: ReturnType<typeof useAuth>['user'];
  authLoading: boolean;
  displayName: string;
  signUp: ReturnType<typeof useAuth>['signUp'];
  signIn: ReturnType<typeof useAuth>['login'];
  signOut: ReturnType<typeof useAuth>['logout'];
  resetPassword: () => Promise<void>;
  isDemoMode: boolean;
  setIsDemoMode: (v: boolean) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const defaultRolePermissions: RolePermissions = {
  super_admin: { creditCards: { view: true, edit: true, add: true, delete: true } },
  admin: { creditCards: { view: true, edit: true, add: true, delete: true } },
  manager: { creditCards: { view: true, edit: true, add: true, delete: true } },
  team_leader: { creditCards: { view: true, edit: false, add: false, delete: false } },
  employee: { creditCards: { view: true, edit: false, add: false, delete: false } },
  dsa_partner: { creditCards: { view: true, edit: false, add: false, delete: false } },
  branch_manager: { creditCards: { view: true, edit: false, add: false, delete: false } },
  advisor: { creditCards: { view: true, edit: false, add: false, delete: false } },
  ops_team: { creditCards: { view: true, edit: false, add: false, delete: false } },
  operation_team: { creditCards: { view: true, edit: false, add: false, delete: false } },
  loan_operations: { creditCards: { view: true, edit: false, add: false, delete: false } },
  sales_manager: { creditCards: { view: true, edit: true, add: true, delete: false } },
  dsa: { creditCards: { view: true, edit: false, add: false, delete: false } },
  executive: { creditCards: { view: true, edit: false, add: false, delete: false } },
  accountant: { creditCards: { view: true, edit: false, add: false, delete: false } },
};

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const [demoRole, setDemoRole] = useState<UserRole>('super_admin');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('auth_token'));
  const [userAccess, setUserAccess] = useState<UserAccess>({});
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(defaultRolePermissions);
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState(() => localStorage.getItem('fincore_onboarding') === 'done');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [moduleAccess, setModuleAccess] = useState<ModuleAccess>({ creditCards: true });
  const [authValidated, setAuthValidated] = useState(false);

  // Validate auth with backend on mount
  useEffect(() => {
    const validateAuthState = async () => {
      const result = await customAuth.validateAuth();
      if (result.authenticated && result.user) {
        // Update localStorage with fresh user data from backend (already stripped by backend)
        localStorage.setItem('user', JSON.stringify(result.user));
        if (result.user.permissions) {
          localStorage.setItem('user_permissions', JSON.stringify(result.user.permissions));
        }
      } else if (result.status === 401) {
        // Token invalid or expired - clear local storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('user_permissions');
      }
      setAuthValidated(true);
    };

    validateAuthState();
  }, []);

  const getModuleAccess = (): ModuleAccess => {
    if (isDemoMode) return { creditCards: true };
    const effectiveRole = (auth.user?.role as string) || 'employee';
    if (effectiveRole === 'super_admin' || effectiveRole === 'admin') {
      return { creditCards: true };
    }
    const stored = localStorage.getItem('user_permissions');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          creditCards: parsed?.access?.creditCards ?? true,
        };
      } catch { }
    }
    return { creditCards: true };
  };

  useEffect(() => {
    setModuleAccess(getModuleAccess());
  }, [auth.user?.role, isDemoMode]);

  const handleOnboarding = (v: boolean) => {
    setHasSeenOnboardingState(v);
    if (v) localStorage.setItem('fincore_onboarding', 'done');
  };

  const effectiveRole = isDemoMode ? demoRole : (auth.user?.role || 'employee');
  const effectiveLoggedIn = isLoggedIn || !!auth.user;

  const fallbackPermissions = { creditCards: { view: true, edit: false, add: false, delete: false } };

  // Don't render children until auth is validated
  if (!authValidated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <RoleContext.Provider value={{
      role: effectiveRole,
      setRole: setDemoRole,
      permissions: rolePermissions[effectiveRole] ?? fallbackPermissions,
      moduleAccess,
      isLoggedIn: effectiveLoggedIn,
      setIsLoggedIn,
      userAccess, setUserAccess,
      rolePermissions, setRolePermissions,
      hasSeenOnboarding, setHasSeenOnboarding: handleOnboarding,
      sidebarOpen, setSidebarOpen,
      authUser: auth.user,
      authLoading: auth.isLoading,
      displayName: isDemoMode ? 'Demo User' : (auth.user?.name || ''),
      signUp: auth.signUp,
      signIn: auth.login,
      signOut: auth.logout,
      resetPassword: async () => {},
      isDemoMode, setIsDemoMode,
    }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within RoleProvider');
  return context;
};