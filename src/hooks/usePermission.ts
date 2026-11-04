import { useAuth } from "@/contexts/AuthContext";

export const usePermission = () => {
  const { user, permissions } = useAuth();

  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true;
    if (user?.role === "admin") return true;

    if (!permissions) return false;

    const keys = permission.split(".");

    let current: any = permissions;

    for (const key of keys) {
      if (current[key] === undefined) {
        return false;
      }
      current = current[key];
    }

    return current === true;
  };

  return {
    permissions,
    hasPermission,
  };
};