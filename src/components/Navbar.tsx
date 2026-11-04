import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { ROLE_LABELS } from '@/lib/auth';
import { Download, LogOut, Eye, Share2, UserCircle, ArrowLeft, ChevronRight } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useDashboardContextSafe } from '@/pages/Dashboard';


interface BreadcrumbItem {
  label: string;
  path?: string;
}

function getBreadcrumbs(pathname: string, userRole?: string): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "");
  
  if (path === "/dashboard" || path === "/ops/dashboard" || path === "/loan-ops/dashboard") {
    return [{ label: "Dashboard", path: path }];
  }
  if (path === "/profile") {
    return [{ label: "Profile", path: "/profile" }];
  }
  
  const leadsLoansPath = userRole === 'loan_operations' ? '/loans' : '/leads-list';

  // Leads & Loans
  if (path === "/leads-list") {
    return [
      { label: "Leads & Loans", path: leadsLoansPath },
      { label: "Leads", path: "/leads-list" }
    ];
  }
  if (path === "/add-lead") {
    return [
      { label: "Leads & Loans", path: leadsLoansPath },
      { label: "Leads", path: "/leads-list" },
      { label: "Add Lead", path: "/add-lead" }
    ];
  }
  if (path.startsWith("/leads/")) {
    return [
      { label: "Leads & Loans", path: leadsLoansPath },
      { label: "Leads", path: "/leads-list" },
      { label: "Lead Details" }
    ];
  }
  if (path === "/loans") {
    return [
      { label: "Leads & Loans", path: leadsLoansPath },
      { label: "Loan Apps", path: "/loans" }
    ];
  }
  if (path === "/loans/new") {
    return [
      { label: "Leads & Loans", path: "/leads-list" },
      { label: "Loan Apps", path: "/loans" },
      { label: "New Loan", path: "/loans/new" }
    ];
  }
  if (path === "/loans/login-details") {
    return [
      { label: "Leads & Loans", path: "/leads-list" },
      { label: "Loan Apps", path: "/loans" },
      { label: "Login Details", path: "/loans/login-details" }
    ];
  }
  if (path.startsWith("/loans/edit/")) {
    return [
      { label: "Leads & Loans", path: "/leads-list" },
      { label: "Loan Apps", path: "/loans" },
      { label: "Edit Loan" }
    ];
  }
  if (path.startsWith("/loans/") && path.endsWith("/payments")) {
    return [
      { label: "Leads & Loans", path: "/leads-list" },
      { label: "Loan Apps", path: "/loans" },
      { label: "Payment Request" }
    ];
  }
  if (path.startsWith("/loans/")) {
    return [
      { label: "Leads & Loans", path: "/leads-list" },
      { label: "Loan Apps", path: "/loans" },
      { label: "Loan Details" }
    ];
  }
  if (path === "/offline-disbursement") {
    return [
      { label: "Leads & Loans", path: leadsLoansPath },
      { label: "Offline Disbursement", path: "/offline-disbursement" }
    ];
  }

  // Team
  if (path === "/team") {
    return [{ label: "Team", path: "/team" }];
  }

  // Operations
  if (path === "/calling") {
    return [
      { label: "Operations", path: "/calling" },
      { label: "Calling", path: "/calling" }
    ];
  }
  if (path === "/credit-reports") {
    return [
      { label: "Operations", path: "/calling" },
      { label: "Credit Report", path: "/credit-reports" }
    ];
  }
  if (path === "/rc-limits" || path === "/rc-limits/bills") {
    return [
      { label: "RC Limits", path: "/rc-limits/bills" },
      { label: "Bills", path: "/rc-limits/bills" }
    ];
  }
  if (path === "/rc-limits/payment") {
    return [
      { label: "RC Limits", path: "/rc-limits/payment" },
      { label: "Payment", path: "/rc-limits/payment" }
    ];
  }
  if (path === "/payouts") {
    return [
      { label: "Operations", path: "/calling" },
      { label: "Payouts", path: "/payouts" }
    ];
  }
  if (path === "/expenses") {
    return [
      { label: "Operations", path: "/calling" },
      { label: "Expenses", path: "/expenses" }
    ];
  }
  if (path === "/insurance") {
    return [
      { label: "Operations", path: "/calling" },
      { label: "Insurance", path: "/insurance" }
    ];
  }
  if (path === "/insurance-leads") {
    return [
      { label: "Leads & Loans", path: "/leads-list" },
      { label: "Insurance Leads", path: "/insurance-leads" }
    ];
  }
  if (path === "/link-loan-finder") {
    return [
      { label: "Operations", path: "/calling" },
      { label: "Link Loan Finder", path: "/link-loan-finder" }
    ];
  }
  if (path === "/account-aggregator") {
    return [
      { label: "Operations", path: "/calling" },
      { label: "Account Aggregator", path: "/account-aggregator" }
    ];
  }

  // Find My Lender / Car Value
  if (path === "/find-lender") {
    return [{ label: "Find My Lender", path: "/find-lender" }];
  }
  if (path === "/find-eligibility") {
    return [{ label: "Find My Eligibility", path: "/find-eligibility" }];
  }
  if (path === "/find-car-value") {
    return [{ label: "Find My Car Value", path: "/find-car-value" }];
  }

  // Administration
  if (path === "/reports") {
    return [
      { label: "Administration", path: "/reports" },
      { label: "Reports", path: "/reports" }
    ];
  }
  if (path === "/users") {
    return [
      { label: "Administration", path: "/reports" },
      { label: "Users", path: "/users" }
    ];
  }
  if (path === "/banks") {
    return [
      { label: "Administration", path: "/reports" },
      { label: "Banks / NBFC", path: "/banks" }
    ];
  }
  if (path === "/brokers") {
    return [
      { label: "Administration", path: "/reports" },
      { label: "Brokers / DSA", path: "/brokers" }
    ];
  }
  if (path === "/branches") {
    return [
      { label: "Administration", path: "/reports" },
      { label: "Branches", path: "/branches" }
    ];
  }
  if (path === "/permissions") {
    return [
      { label: "Administration", path: "/reports" },
      { label: "Permissions", path: "/permissions" }
    ];
  }
  if (path === "/audit-logs") {
    return [
      { label: "Administration", path: "/reports" },
      { label: "Audit Logs", path: "/audit-logs" }
    ];
  }
  if (path === "/settings") {
    return [
      { label: "Administration", path: "/reports" },
      { label: "System Config", path: "/settings" }
    ];
  }
  if (path === "/settings/loan-comparison-charges" || path === "/admin/loan-comparison-charges") {
    return [
      { label: "Administration", path: "/reports" },
      { label: "Loan Comparison Charges", path: "/settings/loan-comparison-charges" }
    ];
  }
  if (path === "/admin/api-usage") {
    return [
      { label: "Administration", path: "/reports" },
      { label: "API Usage", path: "/admin/api-usage" }
    ];
  }
  if (path === "/admin/api-usage-logs") {
    return [
      { label: "Administration", path: "/reports" },
      { label: "API Call Logs", path: "/admin/api-usage-logs" }
    ];
  }
  if (path === "/admin/api-integrations") {
    return [
      { label: "Administration", path: "/reports" },
      { label: "API Integrations", path: "/admin/api-integrations" }
    ];
  }

  // Accountant Portal
  if (path === "/accountant/dashboard") {
    return [
      { label: "Accountant Portal", path: "/accountant/dashboard" },
      { label: "Dashboard", path: "/accountant/dashboard" }
    ];
  }
  if (path === "/accountant/payments") {
    return [
      { label: "Accountant Portal", path: "/accountant/dashboard" },
      { label: "Payments & Approvals", path: "/accountant/payments" }
    ];
  }
  if (path === "/accountant/disbursement-ledger") {
    return [
      { label: "Accountant Portal", path: "/accountant/dashboard" },
      { label: "Disbursement Ledger", path: "/accountant/disbursement-ledger" }
    ];
  }
  if (path === "/accountant/folio") {
    return [
      { label: "Accountant Portal", path: "/accountant/dashboard" },
      { label: "Folio Accounts", path: "/accountant/folio" }
    ];
  }
  if (path === "/accountant/bank-accounts") {
    return [
      { label: "Accountant Portal", path: "/accountant/dashboard" },
      { label: "Bank Accounts", path: "/accountant/bank-accounts" }
    ];
  }
  if (path === "/payouts") {
    return [
      { label: userRole === 'accountant' ? "Accountant Portal" : "Administration", path: userRole === 'accountant' ? "/accountant/dashboard" : "/reports" },
      { label: "Payouts", path: "/payouts" }
    ];
  }

  // Operation Team custom
  if (path === "/ops/leads") {
    return [{ label: "Leads", path: "/ops/leads" }];
  }
  if (path === "/ops/api-tools") {
    return [{ label: "API Tools", path: "/ops/api-tools" }];
  }
  if (path.startsWith("/ops/loans/")) {
    return [
      { label: "Leads", path: "/ops/leads" },
      { label: "Loan Details" }
    ];
  }

  // Fallback: parse path segments
  const segments = path.split("/").filter(Boolean);
  return segments.map((seg, idx) => {
    const label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/[-_]/g, " ");
    const currentPath = "/" + segments.slice(0, idx + 1).join("/");
    return { label, path: currentPath };
  });
}

interface NavbarProps {
  title?: string;
  showTimeline?: boolean;
  showExport?: boolean;
  showNotifications?: boolean;
  showProfile?: boolean;
  selectedManager?: number | null;
  onManagerChange?: (managerId: number | null) => void;
}

export default function Navbar({
  title,
  showTimeline = true,
  showExport = true,
  showNotifications = true,
  showProfile = true,
  selectedManager,
  onManagerChange
}: NavbarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const mobileProfileRef = React.useRef<HTMLDivElement>(null);
  const desktopProfileRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        (!mobileProfileRef.current || !mobileProfileRef.current.contains(target)) &&
        (!desktopProfileRef.current || !desktopProfileRef.current.contains(target))
      ) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      // Use a small delay to prevent the same click that opened the menu from closing it
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [profileOpen]);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // State for mobile 'More' menu
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const dashboardContext = useDashboardContextSafe();


  // Fetch managers list for admin
  const { data: managers = [] } = useQuery({
    queryKey: ['sales-managers'],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/by-role?roles=sales_manager`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return [];
        return await response.json();
      } catch {
        return [];
      }
    },
    enabled: user?.role === 'admin',
  });

  // Listen to sidebar collapse state from localStorage or context
  React.useEffect(() => {
    const checkSidebarState = () => {
      const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
      setSidebarCollapsed(collapsed);
    };
    checkSidebarState();
    window.addEventListener('storage', checkSidebarState);
    return () => window.removeEventListener('storage', checkSidebarState);
  }, []);

  if (!user) return null;

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isDashboard = location.pathname === '/dashboard';

  const HISTORY_TABS_KEY = "finonest_history_tabs";

  const [historyTabs, setHistoryTabs] = React.useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_TABS_KEY);
      const list = saved ? JSON.parse(saved) : [];
      if (list.length === 0) {
        const path = window.location.pathname.replace(/\/$/, "");
        if (path && !["/login", "/signup", "/forgot-mpin", "/ops-login"].includes(path)) {
          const crumbs = getBreadcrumbs(window.location.pathname);
          if (crumbs.length > 0) {
            const label = crumbs.map(c => c.label).join(" ❯ ");
            return [{ path: window.location.pathname, label, breadcrumbs: crumbs }];
          }
        }
      }
      return list;
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    const path = location.pathname.replace(/\/$/, "");
    if (!path || ["/login", "/signup", "/forgot-mpin", "/ops-login"].includes(path)) {
      return;
    }

    if (path === "/dashboard" || path === "/ops/dashboard" || path === "/accountant/dashboard" || path === "/loan-ops/dashboard") {
      localStorage.removeItem(HISTORY_TABS_KEY);
      setHistoryTabs([]);
      return;
    }
    
    const crumbs = getBreadcrumbs(location.pathname, user?.role);
    if (crumbs.length === 0) return;
    
    const label = crumbs.map(c => c.label).join(" ❯ ");
    
    setHistoryTabs(prev => {
      const exists = prev.some(tab => tab.path === location.pathname);
      let updated = prev;
      
      if (exists) {
        // Just move the active tab to the end of the history array to maintain most-recent active ordering
        const filtered = prev.filter(tab => tab.path !== location.pathname);
        updated = [...filtered, { path: location.pathname, label, breadcrumbs: crumbs }];
      } else {
        updated = [...prev, { path: location.pathname, label, breadcrumbs: crumbs }];
      }
      
      if (updated.length > 3) {
        updated = updated.slice(updated.length - 3);
      }
      
      localStorage.setItem(HISTORY_TABS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [location.pathname, user?.role]);

  React.useEffect(() => {
    const handleClear = () => {
      setHistoryTabs([]);
    };
    window.addEventListener('clear-history-tabs', handleClear);
    return () => {
      window.removeEventListener('clear-history-tabs', handleClear);
    };
  }, []);

  const handleLogoClick = () => {
    localStorage.removeItem(HISTORY_TABS_KEY);
    window.dispatchEvent(new Event('clear-history-tabs'));
    
    let dashPath = '/dashboard';
    if (user?.role === 'accountant') {
      dashPath = '/accountant/dashboard';
    } else if (user?.role === 'loan_operations') {
      dashPath = '/loan-ops/dashboard';
    } else if (user?.role === 'ops_team' || user?.role === 'operation_team' || user?.role === 'ops') {
      dashPath = '/ops/dashboard';
    }
    navigate(dashPath);
  };

  const breadcrumbs = React.useMemo(() => {
    return getBreadcrumbs(location.pathname, user?.role);
  }, [location.pathname, user?.role]);

  const isLeadsPage = React.useMemo(() => {
    const path = location.pathname.toLowerCase();
    return (
      path === '/leads-list' ||
      path === '/ops/leads' ||
      path === '/add-lead' ||
      path.startsWith('/leads/')
    );
  }, [location.pathname]);

  return (
    <header className={`sticky top-0 w-full border-b border-white/20 dark:border-white/5 justify-between px-3 lg:px-5 gap-2 lg:gap-4 shrink-0 shadow-sm z-[110] bg-white dark:bg-gray-900 backdrop-blur-sm transition-all duration-300 ${
      isLeadsPage
        ? 'hidden lg:flex lg:flex-row lg:items-center lg:h-14'
        : 'flex flex-col h-24 lg:flex-row lg:items-center lg:h-14'
    }`}>
      
      {/* MOBILE HEADER (lg:hidden) */}
      <div className="flex lg:hidden items-center justify-between w-full">
        <div className="flex items-center gap-3">
          {location.pathname !== '/dashboard' && location.pathname !== '/' && (
            <button 
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 border border-slate-100 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <h1 className="text-base font-bold text-slate-800 dark:text-white capitalize">
            {location.pathname === '/dashboard' || location.pathname === '/' 
              ? 'Dashboard' 
              : (breadcrumbs[breadcrumbs.length - 1]?.label || 'Finonest')
            }
          </h1>
        </div>

        {showProfile && (
          <div className="relative" ref={mobileProfileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs shadow-sm border border-indigo-100 hover:bg-indigo-100 transition-all"
            >
              {initials}
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-[115]" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-10 w-56 glass-panel border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-[120] overflow-hidden transform origin-top-right transition-all backdrop-blur-2xl bg-white dark:bg-gray-900">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">User Account</p>
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{user.role ? ROLE_LABELS[user.role as UserRole] : 'No role'}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                      <UserCircle size={18} />
                      View Profile
                    </button>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setProfileOpen(false);
                        await handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 rounded-xl transition-all"
                      title="Logout"
                    >
                      <LogOut size={18} />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* DESKTOP HEADER (hidden lg:flex) */}
      <div className="hidden lg:flex flex-1 items-center justify-between w-full min-w-0 gap-2 lg:gap-4">
        {/* Page Title & Breadcrumbs Tabs */}
        <div className="flex-1 min-w-0 flex items-center overflow-hidden py-1">
          {historyTabs.length > 0 ? (
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground overflow-x-auto whitespace-nowrap scrollbar-none py-1 w-full">
              {historyTabs.map((tab, idx) => {
                const isActive = location.pathname === tab.path;
                return (
                  <React.Fragment key={tab.path}>
                    {idx > 0 && (
                      <span className="text-muted-foreground/60 select-none flex items-center shrink-0 text-[11px]">
                        ❯
                      </span>
                    )}
                    <Link
                      to={tab.path}
                      className={`${
                        isActive 
                          ? 'text-foreground font-bold hover:text-primary transition-colors hover:underline underline-offset-4' 
                          : 'text-muted-foreground hover:text-primary transition-colors hover:underline underline-offset-4'
                      } shrink-0`}
                    >
                      {tab.breadcrumbs[tab.breadcrumbs.length - 1]?.label || tab.label}
                    </Link>
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            isDashboard && title ? (
              <h1 className="text-xs sm:text-sm lg:text-base font-bold text-foreground truncate">
                {title}
              </h1>
            ) : (
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-foreground overflow-x-auto whitespace-nowrap scrollbar-none py-1">
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={idx}>
                      {idx > 0 && (
                        <span className="text-muted-foreground/60 select-none flex items-center shrink-0">
                          <ChevronRight size={14} className="stroke-[2.5]" />
                        </span>
                      )}
                      {crumb.path ? (
                        <Link
                          to={crumb.path}
                          className={`${
                            isLast 
                              ? 'text-foreground font-bold hover:text-primary transition-colors hover:underline underline-offset-4' 
                              : 'text-muted-foreground hover:text-primary transition-colors hover:underline underline-offset-4'
                          } shrink-0`}
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className={`${isLast ? 'text-foreground font-bold' : 'text-muted-foreground'} shrink-0`}>
                          {crumb.label}
                        </span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Desktop-only side actions (Timeline, Export, Notifications, Profile) */}
        <div className="hidden lg:flex items-center gap-2 lg:gap-4 shrink-0">
          {/* Timeline & Export — dashboard only */}
          {isDashboard && dashboardContext && showTimeline && showExport && (
            <div className="flex items-center gap-2">
              {user?.role === 'admin' && (
                <select
                  value={selectedManager || ''}
                  onChange={(e) => onManagerChange?.(e.target.value ? Number(e.target.value) : null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200/50 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <option value="">All Sales Managers</option>
                  {managers.map((manager: any) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.full_name} ({manager.user_id})
                    </option>
                  ))}
                </select>
              )}

              <select
                value={dashboardContext.timeline}
                onChange={(e) => dashboardContext.setTimeline(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200/50 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-md transition-all cursor-pointer"
              >
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_year">This Year</option>
                <option value="custom">Custom</option>
              </select>

              <div className="relative">
                <button
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="p-1.5 rounded-lg bg-white/80 dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-primary hover:shadow-md transition-all"
                  title="Export Dashboard"
                >
                  <Download size={16} />
                </button>
                {exportMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[115]" onClick={() => setExportMenuOpen(false)} />
                    <div className="absolute right-0 top-10 w-48 glass-panel border border-white/20 dark:border-white/5 rounded-xl shadow-xl z-[120] overflow-hidden">
                      <button
                        onClick={() => {
                          dashboardContext.setIsGeneratingPDF(true);
                          setExportMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-all border-b border-white/10"
                      >
                        <Download size={14} />
                        Download PDF
                      </button>
                      <button
                        onClick={() => {
                          dashboardContext.handleViewDashboard?.();
                          setExportMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-all border-b border-white/10"
                      >
                        <Eye size={14} />
                        View PDF
                      </button>
                      <button
                        onClick={() => {
                          dashboardContext.handleShareDashboard?.();
                          setExportMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
                      >
                        <Share2 size={14} />
                        Share PDF
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Notifications Bell */}
          {showNotifications && (
            <div className="bg-white/80 dark:bg-gray-800 rounded-full p-1.5 shadow-sm border border-gray-200/50 dark:border-gray-700 hover:shadow-md transition-colors cursor-pointer group">
              <div className="text-gray-600 group-hover:text-primary transition-colors">
                <NotificationBell />
              </div>
            </div>
          )}

          {/* Profile Avatar */}
          {showProfile && (
            <div className="relative" ref={desktopProfileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-primary font-bold text-xs shadow-sm border border-gray-200/50 dark:border-gray-700 hover:shadow-md transition-all"
              >
                {initials}
              </button>
              {profileOpen && (
                <>
                  <div className="absolute right-0 top-12 lg:top-14 w-56 glass-panel border border-white/20 dark:border-white/5 rounded-2xl shadow-xl z-[120] overflow-hidden transform origin-top-right transition-all backdrop-blur-2xl bg-white/10 dark:bg-black/20">
                    <div className="p-4 border-b border-white/10">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">User Account</p>
                      <p className="text-xs font-semibold text-primary dark:text-primary">{user.role ? ROLE_LABELS[user.role as UserRole] : 'No role'}</p>
                      {user.role === 'executive' && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Team: {user.manager_name || 'No team leader assigned'}
                        </p>
                      )}
                    </div>
                    <div className="p-2">
                      {location.pathname !== '/dashboard' && (
                        <button
                          onClick={() => {
                            navigate(-1);
                            setProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl transition-all"
                        >
                          <ArrowLeft size={18} />
                          Back
                        </button>
                      )}
                      <button
                        onClick={() => {
                          navigate('/profile');
                          setProfileOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl transition-all"
                      >
                        <UserCircle size={18} />
                        View Profile
                      </button>
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setProfileOpen(false);
                          await handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 rounded-xl transition-all"
                      >
                        <LogOut size={18} />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
