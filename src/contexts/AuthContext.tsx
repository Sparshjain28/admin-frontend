import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authAPI, api } from "@/lib/api";
import { getCurrentPortal, isRoleAllowedOnCurrentPortal, PortalType } from "@/utils/portalConfig";

export type UserRole =
  | "admin"
  | "ops_team"
  | "operation_team"
  | "loan_operations"
  | "manager"
  | "sales_manager"
  | "dsa"
  | "team_leader"
  | "executive"
  | "accountant"
  | "branch_manager";

export interface AppUser {
  id: number;
  phone: string;
  name: string;
  role: UserRole;
  status?: string;
  branch_id?: number;
  reporting_to?: number;
  dsa_id?: number;
  manager_name?: string;
  manager_role?: string;
  refer_code?: string;
  photo_path?: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  permissions: Record<string, any> | null;
  session: any;
  isLoading: boolean;
  currentPortal: PortalType | null;
  login: (phone: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  signUp: (userData: any) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (token) {
          api.setToken(token);
          
          // OPTIMISTIC LOADING: Check cache and dismiss loading screen instantly
          const cachedUser = localStorage.getItem("cached_user");
          const cachedPermissions = localStorage.getItem("cached_permissions");
          if (cachedUser) {
            const parsedUser = JSON.parse(cachedUser);
            if (!isRoleAllowedOnCurrentPortal(parsedUser.role)) {
              localStorage.removeItem("auth_token");
              localStorage.removeItem("cached_user");
              localStorage.removeItem("cached_permissions");
              api.setToken(null);
              setUser(null);
              setIsLoading(false);
              return;
            }
            setUser(parsedUser);
            if (cachedPermissions) {
              const parsedPerms = JSON.parse(cachedPermissions);
              setPermissions(parsedPerms);
              setSession({ user: parsedUser, permissions: parsedPerms });
            }
            setIsLoading(false); // Hide loading screen instantly!
          }

          // Fetch fresh data in the background
          const [userData, permissionData] = await Promise.all([
            authAPI.getProfile(),
            api.get("/permissions")
          ]);

          if (!isRoleAllowedOnCurrentPortal(userData.role)) {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("cached_user");
            localStorage.removeItem("cached_permissions");
            api.setToken(null);
            setUser(null);
            setIsLoading(false);
            return;
          }
          
          setUser(userData);
          setPermissions(permissionData.permissions);
          
          setSession({ 
            user: userData,
            permissions: permissionData.permissions
          });
          
          // Update the cache with fresh data
          localStorage.setItem("cached_user", JSON.stringify(userData));
          localStorage.setItem("cached_permissions", JSON.stringify(permissionData.permissions));
        }
      } catch (error: any) {
        if (error?.status === 401) {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("cached_user");
          localStorage.removeItem("cached_permissions");
          api.setToken(null);
        } else {
          console.error("Server error during auth initialization, falling back to cached user.");
          const cachedUser = localStorage.getItem("cached_user");
          if (cachedUser && !user) {
            setUser(JSON.parse(cachedUser));
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (phone: string, password: string) => {
    try {
      const currentPortal = getCurrentPortal();
      if (!currentPortal) {
        return {
          error: "Unauthorized subdomain: This domain is not a valid Finonest portal.",
        };
      }

      const data = await api.post("/auth/login", { phone, password, portal: currentPortal });

      if (data.token && data.user) {
        if (!isRoleAllowedOnCurrentPortal(data.user.role)) {
          return {
            error: "Invalid credentials",
          };
        }
        localStorage.setItem("auth_token", data.token);
        api.setToken(data.token);

        setUser(data.user);

        // 👇 Permission API call
        const permissionData = await api.get("/permissions");
        setPermissions(permissionData.permissions);

        setSession({
          user: data.user,
          permissions: permissionData.permissions,
        });

        // Store in cache for optimistic loading on next visit
        localStorage.setItem("cached_user", JSON.stringify(data.user));
        localStorage.setItem("cached_permissions", JSON.stringify(permissionData.permissions));

        return { error: null };
      }

      return { error: "Invalid login response" };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signUp = async (
    userData: any,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const signupData = {
        name: userData.name,
        phone: userData.phone,
        password: userData.mpin,
        email: userData.email,
        address: userData.address,
        role: userData.role,
        refer_code: userData.refer_code,
        pan_number: userData.pan_number,
        aadhaar_number: userData.aadhaar_number,
        pan_data: userData.pan_data,
        aadhaar_data: userData.aadhaar_data,
        photo_path: userData.photo_path,
        bank_account_number: userData.bank_account_number,
        bank_ifsc_code: userData.bank_ifsc_code,
        bank_name: userData.bank_name,
        bank_account_holder: userData.bank_account_holder,
        bank_verified: userData.bank_verified,
        bank_data: userData.bank_data,
        invite_token: userData.invite_token,
      };

      await api.post("/auth/signup", signupData);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    localStorage.removeItem("auth_token");
    api.setToken(null);
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        session,
        isLoading,
        currentPortal: getCurrentPortal(),
        login,
        logout,
        signUp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
