import React, { ReactNode, useState, useRef, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, FileText, Users, Building2, UserCheck, BarChart3,
  LogOut, Menu, X, Car, Bell, CreditCard, Shield, ChevronLeft, ChevronRight, MapPin, UserPlus, Settings,
  Wallet, Receipt, ShieldCheck, Sliders, ChevronDown, ChevronUp, Folder, Copy, Share2, UserCircle, Download, Eye, Calendar, Phone, Database, Zap, Globe, Calculator, Percent
} from 'lucide-react';
import MobileBottomNav from './MobileBottomNav';
import MobilePremiumDrawer from './MobilePremiumDrawer';
import Navbar from './Navbar';
import { toast } from 'sonner';
import NotificationBell from './NotificationBell';
import { useDashboardContextSafe } from '@/pages/Dashboard';
import { usePermission } from "@/hooks/usePermission";


export interface NavItem {
  label: string;
  path?: string;
  icon: ReactNode;
  roles: UserRole[];
  permission?: string;
  children?: {
    label: string;
    path: string;
    icon?: ReactNode;
    roles: UserRole[];
    permission?: string;
  }[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'] },
  { label: 'Dashboard', path: '/loan-ops/dashboard', icon: <LayoutDashboard size={18} />, roles: ['loan_operations'] },
  { label: 'Dashboard', path: '/ops/dashboard', icon: <LayoutDashboard size={18} />, roles: ['operation_team', 'ops_team'] },
  { label: 'Leads', path: '/ops/leads', icon: <FileText size={18} />, roles: ['operation_team'] },
  { label: 'API Tools', path: '/ops/api-tools', icon: <Database size={18} />, roles: ['operation_team'] },
  {
    label: 'Leads & Loans', path: '/loan', icon: <Folder size={18} />, roles: ['admin', 'manager', 'sales_manager', 'loan_operations'],
    children: [
      { label: 'Leads', path: '/leads-list', icon: <UserPlus size={16} />, roles: ['admin', 'manager', 'sales_manager'] },
      { label: 'Loan Apps', path: '/loans', icon: <FileText size={16} />, roles: ['admin', 'manager', 'sales_manager', 'loan_operations'] },
      { label: 'Offline Disbursement', path: '/offline-disbursement', icon: <FileText size={16} />, roles: ['admin', 'sales_manager', 'loan_operations'] },
    ]
  },
  { label: 'Team', path: '/team', icon: <Users size={18} />, roles: ['manager', 'sales_manager', 'team_leader', 'dsa', 'branch_manager', 'operation_team', 'loan_operations'] },
  // Accountant items - expanded directly for accountant role
  { label: 'Accountant Dashboard', path: '/accountant/dashboard', icon: <LayoutDashboard size={18} />, roles: ['accountant'] },
  { label: 'Operations Leads', path: '/ops/leads', icon: <Zap size={18} />, roles: ['accountant'] },
  {
    label: 'RC Limits', icon: <Wallet size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive', 'operation_team', 'loan_operations', 'accountant'],
    children: [
      { label: 'Bills', path: '/rc-limits/bills', icon: <Receipt size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive', 'operation_team', 'loan_operations', 'accountant'] },
      { label: 'Payment', path: '/rc-limits/payment', icon: <CreditCard size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive', 'operation_team', 'loan_operations', 'accountant'] }
    ]
  },
  { label: 'Folio Accounts', path: '/accountant/folio', icon: <CreditCard size={18} />, roles: ['accountant'] },
  { label: 'Payouts', path: '/payouts', icon: <Receipt size={18} />, roles: ['accountant'] },
  {
    label: 'Operations', icon: <ShieldCheck size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'executive', 'team_leader', 'ops_team', 'operation_team'],
    children: [
      { label: 'Credit Report', path: '/credit-reports', icon: <FileText size={16} />, roles: ['admin', 'sales_manager', 'manager', 'branch_manager', 'team_leader', 'executive', 'dsa'] },
      { label: 'Link Loan Finder', path: '/link-loan-finder', icon: <Shield size={16} />, roles: ['admin', 'sales_manager', 'branch_manager'] },
    ]
  },
  { label: 'PDD Management', path: '/pdd-management', icon: <FileText size={18} />, roles: ['admin', 'branch_manager', 'sales_manager', 'dsa', 'operation_team', 'loan_operations'] },
  { label: 'Find My Lender', path: '/find-lender', icon: <MapPin size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'] },
  { label: 'Find My Eligibility', path: '/find-eligibility', icon: <Calculator size={18} />, roles: ['admin'] },
  { label: 'Find My Car Value', path: '/find-car-value', icon: <Car size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'] },
  { label: 'Payouts', path: '/payouts', icon: <Receipt size={18} />, roles: ['dsa', 'executive'] },
  {
    label: 'Administration', icon: <Settings size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager'],
    children: [
      { label: 'Reports', path: '/reports', icon: <BarChart3 size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager'] },
      { label: 'Payouts', path: '/payouts', icon: <Receipt size={16} />, roles: ['admin'] },
      { label: 'Users', path: '/users', icon: <Users size={16} />, roles: ['admin', 'manager', 'sales_manager'] },
      { label: 'DSA Applications', path: '/dsa-applications', icon: <UserCheck size={16} />, roles: ['admin', 'sales_manager'] },
      { label: 'Banks / NBFC', path: '/banks', icon: <Building2 size={16} />, roles: ['admin'] },
      { label: 'Brokers / DSA', path: '/brokers', icon: <UserCheck size={16} />, roles: ['admin'] },
      { label: 'Branches', path: '/branches', icon: <MapPin size={16} />, roles: ['admin', 'manager', 'sales_manager'] },
      { label: 'Product Management', path: '/product-management', icon: <Settings size={16} />, roles: ['admin'] },
      { label: 'Permissions', path: '/permissions', icon: <Settings size={16} />, roles: ['admin'] },
      { label: 'Audit Logs', path: '/audit-logs', icon: <FileText size={16} />, roles: ['admin'] },
      { label: 'System Config', path: '/settings', icon: <Sliders size={16} />, roles: ['admin'] },
      { label: 'Loan Compare Charges', path: '/settings/loan-comparison-charges', icon: <Percent size={16} />, roles: ['admin'] },
      { label: 'API Usage', path: '/admin/api-usage', icon: <Database size={16} />, roles: ['admin'] },
      { label: 'API Call Logs', path: '/admin/api-usage-logs', icon: <Database size={16} />, roles: ['admin'] },
      { label: 'API Integrations', path: '/admin/api-integrations', icon: <Globe size={16} />, roles: ['admin'] },
      { label: 'API Management (Loans)', path: '/admin/api-management', icon: <Database size={16} />, roles: ['admin'] },
    ]
  },

  // Grouped version for admin only
  {
    label: 'Accountant Portal', icon: <Wallet size={18} />, roles: ['admin'],
    children: [
      { label: 'Folio Accounts', path: '/accountant/folio', icon: <CreditCard size={16} />, roles: ['admin'] },
    ]
  }
];



export default function DashboardLayout({ children }: { children: ReactNode }) {
  // const { user, logout } = useAuth();
  const { user, permissions, logout } = useAuth();
  const logo = "/Finonest%20logo.png?v=2";
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission } = usePermission();

  // Fetch page access permissions from system config
  const { data: pageConfigs = [] } = useQuery({
    queryKey: ["system-config"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return [];
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/config`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return res.ok ? res.json() : [];
    },
    staleTime: 60_000,
  });

  // Build a set of allowed paths for the current role based on saved config
  const allowedPaths = useMemo(() => {
    if (!user || user.role === "admin") return null; // admin sees everything
    const configs = pageConfigs.filter(
      (c: any) =>
        c.config_key?.startsWith(`page_access_`) &&
        c.config_key?.endsWith(`_${user.role}`),
    );
    // If no config saved yet for this role, don't restrict anything
    if (configs.length === 0) return null;
    const allowed = new Set<string>();
    configs.forEach((c: any) => {
      if (c.config_value === "true") {
        const pageKey = c.config_key
          .replace("page_access_", "")
          .replace(`_${user.role}`, "");
        const pathMap: Record<string, string> = {
          dashboard: '/dashboard', leads_list: '/leads-list', loans: '/loans',
          calling: '/calling', credit_reports: '/credit-reports', rc_limits: '/rc-limits',
          rc_limits_bills: '/rc-limits/bills', rc_limits_payment: '/rc-limits/payment',
          payouts: '/payouts', expenses: '/expenses',
          link_loan_finder: '/link-loan-finder', reports: '/reports', users: '/users',
          branches: '/branches', team: '/team', find_lender: '/find-lender',
          find_car_value: '/find-car-value', offline_disbursement: '/offline-disbursement',
        };
        if (pathMap[pageKey]) {
          allowed.add(pathMap[pageKey]);
          if (pageKey === 'dashboard') {
            allowed.add('/ops/dashboard');
            allowed.add('/loan-ops/dashboard');
          }
        }
      }
    });
    // The DSA review page is new and has no page-access key yet. The server limits it to admin and
    // sales manager, so keep it visible for them when a saved config would otherwise hide it.
    if (allowed.size > 0) allowed.add('/dsa-applications');
    // If config exists but nothing is enabled, still don't blank out the sidebar
    return allowed.size > 0 ? allowed : null;
  }, [pageConfigs, user?.role]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => {
      try {
        const saved = localStorage.getItem("sidebarExpandedGroups");
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    },
  );
  const [flyoutGroup, setFlyoutGroup] = useState<string | null>(null);

  // Save collapse state to localStorage
  React.useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(collapsed));
    window.dispatchEvent(new Event("storage"));
  }, [collapsed]);

  // Save expandedGroups to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem(
      "sidebarExpandedGroups",
      JSON.stringify(expandedGroups),
    );
  }, [expandedGroups]);

  // Auto-expand the group that contains the active route, and collapse others
  React.useEffect(() => {
    setExpandedGroups(() => {
      const next: Record<string, boolean> = {};
      NAV_ITEMS.forEach((item) => {
        if (item.children) {
          // const hasActive = item.children.some((child) => {
          //   const cleanPath = location.pathname.replace(/\/$/, "");
          //   const cleanChild = child.path.replace(/\/$/, "");
          //   return (
          //     cleanPath === cleanChild ||
          //     (cleanChild !== "/dashboard" &&
          //       cleanPath.startsWith(cleanChild + "/"))
          //   );
          // });
          const cleanPath = location.pathname.replace(/\/$/, "");
          const cleanItem = (item.path || "").replace(/\/$/, "");

          const hasActive =
            // Parent route active
            (cleanItem && cleanPath === cleanItem) ||

            // Any child active
            item.children.some((child) => {
              const cleanChild = child.path.replace(/\/$/, "");

              return (
                cleanPath === cleanChild ||
                (cleanChild !== "/dashboard" &&
                  cleanPath.startsWith(cleanChild + "/"))
              );
            });
          next[item.label] = hasActive;
        }
      });
      return next;
    });
  }, [location.pathname]);

  // Listen for openSidebar event (e.g. from MobileBottomNav)
  React.useEffect(() => {
    const handleOpenSidebar = () => setSidebarOpen(true);
    window.addEventListener("openSidebar", handleOpenSidebar);
    return () => window.removeEventListener("openSidebar", handleOpenSidebar);
  }, []);

  if (!user) return null;

  // const filteredNav = (NAV_ITEMS.filter(item => !user.role || item.roles.includes(user.role)).map(item => {
  //   if (item.children) {
  //     return {
  //       ...item,
  //       children: item.children.filter(child => {
  //         if (!user.role || !child.roles.includes(user.role)) return false;
  //         // If allowedPaths is set (non-admin with saved config), check it
  //         if (allowedPaths && child.path && !allowedPaths.has(child.path)) return false;
  //         return true;
  //       })
  //     };
  //   }
  //   // Top-level path check
  //   if (allowedPaths && item.path && !allowedPaths.has(item.path)) return null;
  //   return item;
  // }).filter((item): item is NavItem => item !== null && (!item.children || item.children.length > 0)) as NavItem[]);

  const filteredNav = NAV_ITEMS.filter((item) => {
    if (user.role && !item.roles.includes(user.role)) return false;
    // Payouts is only visible to DSA, Admin, and Independent Advisor/Executive (no superior)
    if (item.path === '/payouts' && (user.role === 'executive' || (user.role as string) === 'advisor')) {
      const hasSuperior = Boolean(user.reporting_to || (user as any).dsa_id);
      if (hasSuperior) return false;
    }
    return true;
  }).map((item) => {
    if (item.children) {
      const children = item.children.filter((child) => {
        if (user.role && !child.roles.includes(user.role)) return false;
        if (child.path === '/payouts' && (user.role === 'executive' || (user.role as string) === 'advisor')) {
          const hasSuperior = Boolean(user.reporting_to || (user as any).dsa_id);
          if (hasSuperior) return false;
        }

        if (!hasPermission(child.permission)) return false;

        if (allowedPaths && child.path && !allowedPaths.has(child.path))
          return false;

        return true;
      });

      if (children.length === 0) return null;

      return {
        ...item,
        path: (user.role === 'loan_operations' && item.path === '/loan') ? '/loans' : item.path,
        children,
      };
    }

    if (item.permission && !hasPermission(item.permission)) return null;

    if (allowedPaths && item.path && !allowedPaths.has(item.path)) return null;

    return item;
  }).filter(
    (item): item is NavItem =>
      item !== null && (!item.children || item.children.length > 0),
  );

  const allRoutes = useMemo(() => {
    const routes: string[] = [];
    filteredNav.forEach((item) => {
      if (item.path) {
        routes.push(item.path);
      }
      if (item.children) {
        item.children.forEach((child) => {
          if (child.path) {
            routes.push(child.path);
          }
        });
      }
    });
    return routes;
  }, [filteredNav]);

  // Get current route index
  const currentRouteIndex = allRoutes.indexOf(location.pathname);

  const toggleGroup = (label: string) => {
    if (collapsed) {
      setCollapsed(false);
      setExpandedGroups((prev) => ({ ...prev, [label]: true }));
    } else {
      setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
    }
  };

  const activeCutoutLabel = useMemo(() => {
    const activeItem = filteredNav.find((item) => {
      // if (item.children) {
      //   return item.children.some((child) => {
      //     const cleanPath = location.pathname.replace(/\/$/, "");
      //     const cleanChild = child.path.replace(/\/$/, "");
      //     if (cleanPath === cleanChild) return true;
      //     if (
      //       cleanChild !== "/dashboard" &&
      //       cleanPath.startsWith(cleanChild + "/")
      //     )
      //       return true;
      //     return false;
      //   });
      // }
      if (item.children) {
        const cleanPath = location.pathname.replace(/\/$/, "");
        const cleanItem = (item.path || "").replace(/\/$/, "");

        // Parent route bhi active ho
        if (cleanItem && cleanPath === cleanItem) {
          return true;
        }

        return item.children.some((child) => {
          const cleanChild = child.path.replace(/\/$/, "");

          return (
            cleanPath === cleanChild ||
            (cleanChild !== "/dashboard" &&
              cleanPath.startsWith(cleanChild + "/"))
          );
        });
      }
      const cleanPath = location.pathname.replace(/\/$/, "");
      const cleanItem = (item.path || "").replace(/\/$/, "");
      if (cleanPath === cleanItem) return true;
      if (cleanItem !== "/dashboard" && cleanPath.startsWith(cleanItem + "/"))
        return true;
      return false;
    });
    return activeItem?.label || null;
  }, [location.pathname, filteredNav]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleLogoClick = () => {
    localStorage.removeItem("finonest_history_tabs");
    window.dispatchEvent(new Event("clear-history-tabs"));

    let dashPath = "/dashboard";
    if (user?.role === "accountant") {
      dashPath = "/accountant/dashboard";
    } else if (user?.role === "loan_operations") {
      dashPath = "/loan-ops/dashboard";
    } else if (user?.role === "ops_team" || user?.role === "operation_team") {
      dashPath = "/ops/dashboard";
    }
    navigate(dashPath);
  };

  const initials = user.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
    : user.phone.slice(0, 2).toUpperCase();

  const navTitle = location.pathname.endsWith("dashboard")
    ? `Welcome, ${user.name || "User"}`
    : undefined;

  const isLeadsPage = useMemo(() => {
    const path = location.pathname.toLowerCase();
    return (
      path === "/leads-list" ||
      path === "/ops/leads" ||
      path === "/add-lead" ||
      path.startsWith("/leads/")
    );
  }, [location.pathname]);

  const isFullBleed = useMemo(() => {
    const path = location.pathname.toLowerCase();
    return (
      path === "/dashboard" ||
      path === "/" ||
      path === "/profile" ||
      path === "/leads-list" ||
      path === "/loans" ||
      path === "/add-lead" ||
            path === "/payouts" ||
      path.startsWith("/payouts") ||
      path === "/tools/emi-calculator" ||
      path.startsWith("/loans/") ||
      path.startsWith("/leads/") 
    );
  }, [location.pathname]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-sidebar">
      {/* Desktop Sidebar (Hidden on mobile) */}
      <aside
        data-sidebar="sidebar"
        data-state={collapsed ? "collapsed" : "expanded"}
        className={`hidden lg:flex flex-col lg:static inset-y-0 left-0 z-[90] bg-sidebar transition-all duration-300 shadow-none rounded-none w-auto
          ${collapsed ? "lg:w-[3.5rem] overflow-visible" : "lg:w-[13rem] overflow-hidden"}
        `}
        style={{ height: "100dvh" }}
      >
        {/* Logo */}
        <div
          className={`h-[80px] flex items-center pb-2 shrink-0 relative z-[100] bg-sidebar border-b border-sidebar-border
          ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}
        >
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
              className="flex items-center justify-center hover:scale-105 transition-transform"
            >
              <img
                src="/FN ICON PNG1.png"
                alt="FI"
                className="h-14 w-14 rounded-lg object-cover"
              />
            </button>
          ) : (
            <>
              <button
                onClick={handleLogoClick}
                className="flex-1 min-w-0 flex items-center justify-center hover:opacity-80 transition-opacity text-left pl-2"
              >
                <img
                  src={logo}
                  alt="Finonest India"
                  className="h-14 w-full max-w-[150px] object-contain drop-shadow-md"
                />
              </button>
              <button
                onClick={() => setCollapsed(true)}
                className="hidden lg:flex shrink-0 p-1.5 rounded-lg text-sidebar-muted hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-all duration-200"
                title="Collapse sidebar"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="lg:hidden ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={20} />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav
          className={`flex-1 pt-4 pb-2 relative z-10 custom-scrollbar ${collapsed ? "overflow-visible" : "overflow-y-auto"}`}
        >
          {filteredNav.map((item) => {
            if (item.children) {
              const isExpanded = expandedGroups[item.label];
              const hasActiveChild = item.children.some(
                (child) => location.pathname === child.path,
              );
              const showCutout = activeCutoutLabel === item.label;

              return (
                <div
                  key={item.label}
                  className="flex flex-col mb-0.5 relative w-full group"
                >
                  {/* Group Header Button */}
                  <button
                    onClick={() => {
                      toggleGroup(item.label);
                      if (item.path) {
                        const targetPath = (user.role === 'loan_operations' && item.path === '/loan') ? '/loans' : item.path;
                        navigate(targetPath);
                      }
                    }}
                    title={collapsed ? item.label : undefined}
                    className={`group flex items-center gap-2 transition-all duration-300 relative outline-none focus:outline-none ${showCutout
                      ? `sidebar-active-cutout bg-white text-[#1e293b] text-[13px] tracking-wide font-bold z-10 w-[calc(100%-0.5rem)] ml-2 mr-0 my-0.5 ${collapsed ? "py-3 px-2 justify-center" : "py-3 pl-4 pr-2"}`
                      : `mx-2 my-0.5 rounded-lg text-xs font-bold text-sidebar-muted hover:text-sidebar-accent-foreground hover:bg-sidebar-accent ${collapsed
                        ? "py-3 px-2 justify-center"
                        : "py-3 pl-4 pr-2"
                      } ${hasActiveChild ||
                        isExpanded ||
                        flyoutGroup === item.label
                        ? "text-sidebar-accent-foreground"
                        : ""
                      }`
                      }`}
                  >
                    <span
                      className={`shrink-0 transition-colors duration-300 ${showCutout
                        ? "text-[#00A859] scale-110 drop-shadow-sm"
                        : hasActiveChild ||
                          isExpanded ||
                          flyoutGroup === item.label
                          ? "text-sidebar-accent-foreground"
                          : "text-sidebar-muted group-hover:text-sidebar-accent-foreground"
                        }`}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="truncate tracking-wide flex-1 text-left text-xs">
                          {item.label}
                        </span>
                        {!isExpanded && (
                          <span className="text-sidebar-muted transition-transform duration-300">
                            <ChevronDown size={14} />
                          </span>
                        )}
                      </>
                    )}
                  </button>

                  {/* Hover Sublist Popover for Collapsed Sidebar */}
                  {collapsed && (
                    <div
                      className={`absolute left-full ml-1 opacity-0 pointer-events-none translate-x-[-10px] scale-95 transition-[opacity,transform] duration-300 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:scale-100 z-[120] w-56 p-2 bg-sidebar border border-sidebar-border rounded-2xl shadow-2xl backdrop-blur-2xl before:absolute before:-left-2 before:w-2 before:top-0 before:bottom-0 before:content-[''] ${item.label === "Administration" ? "top-[-120px]" : "top-0"}`}
                    >
                      {/* Popover Header showing Group Name */}
                      <p className="text-[10px] font-extrabold text-sidebar-muted uppercase tracking-widest px-3 pb-2 pt-1 border-b border-sidebar-border mb-2">
                        {item.label}
                      </p>
                      <div className="flex flex-col gap-0.5 px-1 py-1">
                        {item.children.map((child) => {
                          const childActive = location.pathname === child.path;
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-3 py-2 px-3 rounded-lg text-[13px] transition-colors duration-300 ${childActive
                                ? "text-sidebar-accent-foreground font-bold bg-sidebar-accent"
                                : "text-sidebar-muted hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
                                }`}
                            >
                              <span className="shrink-0">
                                {child.icon || (
                                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                )}
                              </span>
                              <span className="truncate tracking-wide">
                                {child.label}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Dropdown Children for Expanded Sidebar */}
                  {!collapsed && (
                    <div
                      className="overflow-hidden transition-all duration-300 ease-in-out relative z-10"
                      style={{
                        maxHeight: isExpanded
                          ? `${item.children.length * 44 + 40}px`
                          : "0px",
                        opacity: isExpanded ? 1 : 0,
                      }}
                    >
                      <div className="flex flex-col gap-0.5 mx-2 mt-1 mb-1.5 p-2 rounded-2xl bg-sidebar-accent">
                        {item.children.map((child) => {
                          const childActive = location.pathname === child.path;

                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-3 py-2 px-3 text-[13px] transition-colors duration-300 rounded-lg ${childActive
                                ? "text-sidebar-accent-foreground font-bold"
                                : "text-sidebar-muted hover:text-sidebar-accent-foreground"
                                }`}
                            >
                              <span className="shrink-0">
                                {child.icon || (
                                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                )}
                              </span>
                              <span className="truncate tracking-wide">
                                {child.label}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            const showCutout = activeCutoutLabel === item.label;
            return (
              <div key={item.path} className="w-full">
                <Link
                  to={item.path || "#"}
                  onClick={() => setSidebarOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={`group flex items-center gap-3 transition-all duration-300 relative outline-none focus:outline-none ${showCutout
                    ? `sidebar-active-cutout bg-white text-[#1e293b] text-[13px] tracking-wide font-bold z-10 w-[calc(100%-0.5rem)] ml-2 mr-0 my-0.5 ${collapsed ? "py-3 px-2 justify-center" : "py-3 pl-4 pr-2"}`
                    : `mx-2 my-0.5 rounded-xl text-xs font-bold text-sidebar-muted hover:text-sidebar-accent-foreground hover:bg-sidebar-accent ${collapsed
                      ? "py-3 px-2 justify-center"
                      : "py-3 pl-4 pr-2"
                    }`
                    }`}
                >
                  <span
                    className={`${showCutout ? "text-[#00A859] scale-110 drop-shadow-sm" : "text-sidebar-muted group-hover:text-sidebar-accent-foreground"} transition-all duration-300`}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div
          className={`px-2 pb-1.5 pt-1.5 border-t border-sidebar-border ${collapsed ? "flex flex-col items-center gap-1.5" : ""}`}
        >
          {/* Refer Code Section */}
          {["team_leader", "branch_manager", "dsa", "sales_manager"].includes(
            user.role,
          ) &&
            user.refer_code &&
            (collapsed ? (
              <div
                className="w-8 h-8 rounded-lg bg-sidebar-primary/10 flex items-center justify-center hover:bg-sidebar-accent transition-colors cursor-pointer group relative"
                title="Refer Code"
              >
                <Share2 size={14} className="text-white" />
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-sidebar-accent text-sidebar-foreground text-[9px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {user.refer_code}
                </div>
              </div>
            ) : (
              <div className="mb-2 px-2 py-1.5 rounded-2xl bg-sidebar-accent">
                <p className="text-[9px] font-bold text-sidebar-muted mb-1">
                  Refer Code
                </p>
                <div className="flex items-center gap-1">
                  <code className="flex-1 text-[9px] font-mono font-bold text-white bg-sidebar-accent/40 px-1.5 py-1 rounded">
                    {user.refer_code}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(user.refer_code);
                      toast.success("Refer code copied!");
                    }}
                    className="p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
                    title="Copy"
                  >
                    <Copy size={11} />
                  </button>
                </div>
              </div>
            ))}
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-1.5 mb-1 rounded-2xl bg-sidebar-accent">
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#1e293b] font-bold text-[9px] shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-sidebar-foreground truncate">
                  {user.name || "User"}
                </p>
                <p className="text-[8px] font-medium text-sidebar-muted">
                  {user.role ? ROLE_LABELS[user.role] : "N/A"}
                </p>
              </div>
            </div>
          )}
          {collapsed ? (
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-lg text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-all duration-300 border border-transparent hover:border-red-500/20"
            >
              <LogOut size={16} />
            </button>
          ) : (
            <div className="flex flex-col gap-1 w-full">
              <button
                onClick={() => navigate('/account-deletion')}
                className="text-[8px] text-sidebar-foreground/40 hover:text-red-300 transition-colors text-center py-0.5"
              >
                Delete Account
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-bold text-red-300 hover:text-white hover:bg-red-500 transition-all duration-300 w-full border border-red-500/20 hover:border-transparent hover:shadow-md"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Premium 3D Drawer (Hidden on Desktop) */}
      {/* <MobilePremiumDrawer
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        filteredNav={filteredNav}
        user={user}
        initials={initials}
        handleLogout={handleLogout}
      /> */}

      <MobilePremiumDrawer
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        filteredNav={filteredNav}
        user={user}
        initials={initials}
        handleLogout={handleLogout}
      />

      {/* Behind layer shadow effect for mobile 3D drawer */}
      <div
        className="fixed inset-0 bg-white/30 z-20 transition-all duration-300 origin-left pointer-events-none lg:hidden"
        style={{
          transform: sidebarOpen
            ? "translateX(66%) scale(0.66)"
            : "translateX(0) scale(1)",
          borderRadius: sidebarOpen ? "24px" : "0px",
          opacity: sidebarOpen ? 1 : 0,
        }}
      />

      <div
        className={`flex-1 flex flex-col min-h-0 overflow-hidden lg:rounded-l-[2.5rem] relative z-30 lg:z-0 transition-all duration-300 origin-left ${isFullBleed ? "bg-[#F5F7FA] lg:bg-white" : "bg-background lg:bg-white"
          }`}
        style={
          sidebarOpen && window.innerWidth < 1024
            ? {
              transform: "translateX(75%) scale(0.7)",
              borderRadius: "24px",
            }
            : {}
        }
      >
        {/* Transparent tap-to-close overlay on Mobile when drawer is open */}
        {sidebarOpen && (
          <div
            className="absolute inset-0 z-50 lg:hidden cursor-pointer"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div className="hidden lg:block">
          <Navbar title={navTitle} showTimeline={true} showExport={true} />
        </div>

        <main
          className={`flex-1 overflow-y-auto overflow-x-hidden ${isFullBleed ? "pt-0 pb-0" : "pt-0 sm:pt-4"
            }`}
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 5rem)",
          }}
        >
          {/* RWD fluid container: tight on mobile, comfortable on desktop */}
          <div
            className={`animate-fade-in w-full ${isFullBleed ? "p-0 sm:pl-6 sm:pt-6 sm:pr-6 m-0" : "page-container pb-3 sm:py-4 xl:py-5"}`}
          >
            {children}
          </div>
        </main>

        {/* Bottom Navigation — mobile & tablet only (Inside scaling container) */}
        <div className="absolute bottom-0 left-0 right-0 lg:hidden z-50 pointer-events-auto">
          <MobileBottomNav />
        </div>
      </div>
    </div>
  );
}
