import { CreditCard, LayoutDashboard, ChevronDown, Users, LogOut, Target, Wallet, Shield, Users2, UserCheck, Settings, ChevronRight, Terminal } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { ROLE_LABELS, UserRole } from '@/types';
import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar } from '@/components/ui/sidebar';
import { useEffect, useRef, useState } from 'react';
import { storageManager } from '@/services/storageManager';

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-indigo-100 text-indigo-700',
  manager: 'bg-blue-100 text-blue-700',
  dsa_partner: 'bg-orange-100 text-orange-700',
  team_leader: 'bg-green-100 text-green-700',
  employee: 'bg-gray-100 text-gray-600',
};

const MIN = 32;
const MAX = 42;
const BOUND = MIN * Math.PI;

function useDockEffect(count: number) {
  const [scales, setScales] = useState<number[]>(Array(count).fill(1));
  const menuRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!menuRef.current) return;
    const items = menuRef.current.querySelectorAll<HTMLElement>('[data-dock-item]');
    const pointer = e.clientY - menuRef.current.getBoundingClientRect().top;
    const newScales = Array.from(items).map((_, i) => {
      const distance = (i * MIN + MIN / 2) - pointer;
      if (distance > -BOUND && distance < BOUND) {
        const rad = (distance / MIN) * 0.5;
        return 1 + (MAX / MIN - 1) * Math.cos(rad);
      }
      return 1;
    });
    setScales(newScales);
  };

  const handleMouseLeave = () => setScales(Array(count).fill(1));

  return { menuRef, scales, handleMouseMove, handleMouseLeave };
}

const AppSidebar = () => {
  const { role, setRole, isDemoMode, setIsLoggedIn, moduleAccess, authUser, displayName } = useRole();
  const location = useLocation();
  const { state, setOpen } = useSidebar();
  const collapsed = state === 'collapsed';
  const showRoleSelector = isDemoMode || (authUser as any)?.email === 'admin@finocards.com';

  const [referredBy, setReferredBy] = useState<{ name: string; role: string } | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [pendingMenuOpen, setPendingMenuOpen] = useState<string | null>(null);

  // Auto-expand Leads menu when on Leads pages
  useEffect(() => {
    const isLeadsPage = location.pathname.includes('leads');
    if (isLeadsPage && !expandedMenus.includes('leads')) {
      setExpandedMenus(['leads']);
    }
  }, [location.pathname]);

  const toggleMenu = (key: string) => {
    setExpandedMenus(prev =>
      prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
    );
  };

  // If user clicks a submenu while sidebar is collapsed, open sidebar first
  // and then expand that submenu after sidebar state updates.
  useEffect(() => {
    if (!collapsed && pendingMenuOpen) {
      setExpandedMenus(prev => (prev.includes(pendingMenuOpen) ? prev : [...prev, pendingMenuOpen]));
      setPendingMenuOpen(null);
    }
  }, [collapsed, pendingMenuOpen]);

  useEffect(() => {
    // Initial load from localStorage
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.referredBy) setReferredBy({ name: u.referredBy.name, role: u.referredBy.role });
      } catch { }
    }

    const BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000').replace(/\/$/, '');
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    fetch(`${BASE}/api/cardsModule/auth/user`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        if (!r.ok) {
          if (r.status === 401) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            localStorage.removeItem('hasSeenOnboarding');
            await storageManager.fullCleanup();
            window.location.href = '/login';
          }
          return null;
        }
        return r.text();
      })
      .then(t => {
        if (!t) return;
        const data = JSON.parse(t);
        if (!data.success) return;
        const user = data.user;

        // Strip large image strings before storing in localStorage
        const userToStore = { ...user };
        if (userToStore.aadhaarPhoto) delete userToStore.aadhaarPhoto;
        localStorage.setItem('user', JSON.stringify(userToStore));

        if (user.referredBy) {
          setReferredBy({ name: user.referredBy.name, role: user.referredBy.role });
        }

        fetch(`${BASE}/api/users/my-team/tree`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => { if (!r.ok) return null; return r.text(); })
          .then(t2 => {
            if (!t2) return;
            const d = JSON.parse(t2);
            setReferralCount((d.tree || []).length);
          }).catch(() => { });
      }).catch(() => { });
  const isExecOrAdvisor = role === 'executive' || role === 'advisor';
  const hasSuperior = Boolean(authUser?.reporting_to || (authUser as any)?.dsa_id);
  const canAccessPayouts = ['admin', 'super_admin', 'dsa', 'dsa_partner', 'accountant'].includes(role) || (isExecOrAdvisor && !hasSuperior);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/apply-card', label: 'Apply Card (Main DB)', icon: CreditCard },
    ...(moduleAccess.creditCards ? [
      { path: '/credit-cards', label: 'Credit Cards (Legacy)', icon: CreditCard },
      { path: '/cards-eligibility', label: 'Cards Eligibility', icon: Shield },
      { path: '/personal-loans', label: 'Personal Loans', icon: Wallet },
      {
        key: 'leads',
        label: 'Leads',
        icon: Target,
        submenu: [
          { path: '/credit-card-leads', label: 'Credit Card Leads' },
          { path: '/main-cc-leads', label: 'CC Leads (Main DB)' },
          { path: '/personal-loan-leads', label: 'Personal Loan Leads' },
        ]
      },
    ] : []),
    ...(canAccessPayouts ? [{ path: '/payouts', label: 'Payouts', icon: Wallet }] : []),
    ...(role !== 'employee' ? [{ path: '/team', label: 'My Team', icon: Users2 }] : []),
    ...(role === 'super_admin' ? [
      { path: '/manage-products', label: 'Manage Products', icon: Settings },
    ] : []),

    ...((role === 'admin' || role === 'super_admin') ? [
      { path: '/permissions', label: 'Permissions', icon: Shield },
      { path: '/admin/api-management', label: 'API Management (Loans)', icon: Terminal },
    ] : []),
    { path: '/api-integration', label: 'Developer API (Cards)', icon: Terminal },
  ];

  const { menuRef, scales, handleMouseMove, handleMouseLeave } = useDockEffect(navItems.length);

  const roles: UserRole[] = ['super_admin', 'manager', 'team_leader', 'employee', 'dsa_partner'];

  const handleLogout = async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('hasSeenOnboarding');
    sessionStorage.clear();
    await storageManager.fullCleanup();
    setIsLoggedIn(false); // Make sure context is synced
    window.location.replace('/login');
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 w-11">


      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px]">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <div ref={menuRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
              <SidebarMenu>
                {navItems.map((item, index) => {
                  const isActive = item.path ? location.pathname === item.path : false;
                  const isExpanded = item.key ? expandedMenus.includes(item.key) : false;
                  const hasSubmenu = item.submenu && item.submenu.length > 0;

                  return (
                    <div key={item.key || item.path}>
                      <SidebarMenuItem data-dock-item style={{
                        transform: `scale(${scales[index]})`,
                        transformOrigin: 'left center',
                        transition: 'transform 0.2s ease, margin 0.2s ease',
                        zIndex: Math.round((scales[index] ?? 1) * 10),
                        marginTop: `${((scales[index] ?? 1) - 1) * 6}px`,
                        marginBottom: `${((scales[index] ?? 1) - 1) * 6}px`,
                      }}>
                        {hasSubmenu ? (
                          <div className="flex items-center w-full">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!item.key) return;
                                // In collapsed mode: expand first, then open submenu in effect.
                                if (collapsed) {
                                  setPendingMenuOpen(item.key);
                                  setOpen(true);
                                  return;
                                }
                                toggleMenu(item.key);
                              }}
                              className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors text-left"
                            >
                              <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                              {!collapsed && <span>{item.label}</span>}
                            </button>
                            {!collapsed && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!item.key) return;
                                  toggleMenu(item.key);
                                }}
                                className="px-1 py-1.5 hover:bg-sidebar-accent/30 rounded transition-colors"
                              >
                                <ChevronRight className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <SidebarMenuButton asChild isActive={isActive} tooltip={item.label} size="sm">
                            <NavLink to={item.path || '#'} end={item.path === '/'} className="gap-2 text-xs" activeClassName="font-semibold">
                              <item.icon className="w-3.5 h-3.5" />
                              <span>{item.label}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>

                      {/* Submenu */}
                      {hasSubmenu && isExpanded && !collapsed && (
                        <div className="ml-4 mt-1 space-y-1">
                          {item.submenu!.map((subitem) => {
                            const isSubActive = location.pathname === subitem.path;
                            return (
                              <NavLink
                                key={subitem.path}
                                to={subitem.path}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Allow navigation without closing menu
                                }}
                                className="block px-2 py-1.5 rounded-lg text-xs text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                                activeClassName="font-semibold bg-sidebar-accent/50"
                              >
                                {subitem.label}
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </SidebarMenu>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Referral Info */}
        {!collapsed && (referredBy || referralCount > 0) && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px]">Referral</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 space-y-2">
                {referredBy && (
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sidebar-accent/30">
                    <UserCheck className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Referred by</p>
                      <p className="text-xs font-medium text-sidebar-foreground truncate">{referredBy.name}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${ROLE_BADGE[referredBy.role] || 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABELS[referredBy.role as keyof typeof ROLE_LABELS] || referredBy.role}
                      </span>
                    </div>
                  </div>
                )}
                {referralCount > 0 && (
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sidebar-accent/30">
                    <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Total Users</p>
                      <p className="text-xs font-medium text-sidebar-foreground">{referralCount} {referralCount > 1 ? '' : ''} </p>
                    </div>
                  </div>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border">
        {showRoleSelector && (
          <DropdownMenu>
            <DropdownMenuTrigger className={`w-full flex items-center ${collapsed ? 'justify-center p-1.5' : 'gap-2 px-2 py-1.5'} rounded-lg text-xs text-sidebar-foreground bg-sidebar-accent/50 hover:bg-sidebar-accent transition-all mb-1`}>
              {!collapsed && <span className="font-medium">{ROLE_LABELS[role]}</span>}
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {roles.map((r) => (
                <DropdownMenuItem key={r} onClick={() => setRole(r)} className="text-xs">{ROLE_LABELS[r]}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleLogout();
          }}
          className={`w-full flex items-center ${collapsed ? 'justify-center p-1.5' : 'gap-2 px-2 py-1.5'} rounded-lg text-xs text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all cursor-pointer relative z-50`}
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0 pointer-events-none" />
          {!collapsed && <span className="pointer-events-none">Logout</span>}
        </button>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};

export default AppSidebar;
