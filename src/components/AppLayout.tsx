import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';
import { NavLink } from './NavLink';
import { useRole } from '@/contexts/RoleContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { UserCircle, Wallet, LayoutDashboard, CreditCard, Target, Users2, Shield, LogOut, Package, ChevronDown, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { storageManager } from '../services/storageManager';

const DockNav = ({ items, location }: any) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showLeadsSubmenu, setShowLeadsSubmenu] = useState(() => {
    // Keep submenu open if currently on a leads page
    return location.pathname.includes('/leads');
  });

  // Keep submenu open when navigating between leads pages
  useEffect(() => {
    if (location.pathname.includes('/leads')) {
      setShowLeadsSubmenu(true);
    }
  }, [location.pathname]);

  const getScale = (index: number) => {
    if (hoveredIndex === null) return 1;
    const distance = Math.abs(index - hoveredIndex);
    if (distance === 0) return 1.15;
    if (distance === 1) return 1.08;
    if (distance === 2) return 1.03;
    return 1;
  };

  const handleLeadsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowLeadsSubmenu(!showLeadsSubmenu);
  };

  return (
    <div className="space-y-1">
      {items.map((item: any, index: number) => {
        const isActive = location.pathname === item.path;
        const isLeadsItem = item.label === 'Leads';

        return (
          <div key={item.path}>
            <div
              onMouseEnter={() => {
                setHoveredIndex(index);
              }}
              onMouseLeave={() => {
                setHoveredIndex(null);
              }}
              className="relative"
            >
              <div
                style={{ transform: `scale(${getScale(index)})`, transformOrigin: 'left center' }}
                className="transition-transform duration-200"
              >
                {isLeadsItem ? (
                  <button
                    onClick={handleLeadsClick}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${showLeadsSubmenu
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-300 ${showLeadsSubmenu ? 'rotate-180' : ''
                        }`}
                    />
                  </button>
                ) : (
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                )}
              </div>
            </div>

            {/* Leads Submenu - Shows below with smooth slide */}
            {isLeadsItem && (
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${showLeadsSubmenu ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
                  }`}
              >
                <div className="bg-sidebar-accent/10 rounded-lg my-1 py-1 space-y-0.5">
                  <NavLink
                    to="/leads"
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center gap-3 px-4 py-1.5 text-sm transition-colors rounded-md mx-1 block ${location.pathname === '/leads'
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      }`}
                  >
                    <span>All Leads</span>
                  </NavLink>
                  
                  <NavLink
                    to="/personal-loan-leads"
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center gap-3 px-4 py-1.5 text-sm transition-colors rounded-md mx-1 block ${location.pathname === '/personal-loan-leads'
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      }`}
                  >
                    <span>Personal Loan</span>
                  </NavLink>
                  <NavLink
                    to="/archived-leads"
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center gap-3 px-4 py-1.5 text-sm transition-colors rounded-md mx-1 block ${location.pathname === '/archived-leads'
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      }`}
                  >
                    <span className="text-orange-500 font-semibold">Archived Leads</span>
                  </NavLink>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const DockItem = ({ onClick, icon: Icon, label }: any) => {
  const [scale, setScale] = useState(1);

  return (
    <div
      onMouseEnter={() => setScale(1.15)}
      onMouseLeave={() => setScale(1)}
      style={{ transform: `scale(${scale})`, transformOrigin: 'left center' }}
      className="transition-transform duration-200"
    >
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
      >
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </button>
    </div>
  );
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { setIsLoggedIn, displayName, role, moduleAccess, authUser } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Allowed user IDs for API access
  const ALLOWED_API_USER_IDS = ['CHDF6C7A94', 'CHAD18623', '15', '84'];
  const currentUserId = String(authUser?.id || '');
  const isExecOrAdvisor = role === 'executive' || role === 'advisor';
  const hasSuperior = Boolean(authUser?.reporting_to || (authUser as any)?.dsa_id);
  const canAccessPayouts = ['admin', 'super_admin', 'dsa', 'dsa_partner', 'accountant'].includes(role) || (isExecOrAdvisor && !hasSuperior);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/leads', label: 'Leads', icon: Target },
    ...(canAccessPayouts ? [{ path: '/payouts', label: 'Payouts', icon: Wallet }] : []),
    ...(role !== 'employee' ? [{ path: '/team', label: 'My Team', icon: Users2 }] : []),
    ...((role === 'super_admin' || role === 'admin') ? [
      { path: '/manage-products', label: 'Manage Products', icon: Package },
      { path: '/permissions', label: 'Permissions', icon: Shield },
      { path: '/product-management', label: 'Product Management', icon: Package },
    ] : []),
    ...(isAllowedApiUser ? [{ path: '/api-integration', label: 'API Docs', icon: Terminal }] : []),
  ];

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('hasSeenOnboarding');
    sessionStorage.clear();
    setIsLoggedIn(false);

    storageManager.fullCleanup().finally(() => {
      window.location.replace('/login');
    }).catch(() => {
      window.location.replace('/login');
    });

    // Failsafe timeout in case service workers/caches hang the promise chain
    setTimeout(() => {
      window.location.replace('/login');
    }, 300);
  };

  useEffect(() => {
    // Run storage cleanup on mount to fix potential bloat
    storageManager.cleanupLocalStorage();

    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.aadhaarPhoto) setProfilePhoto(`data:image/jpeg;base64,${u.aadhaarPhoto}`);
      } catch { }
    }

    
  }, []);
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';

  return (
    <div className="flex h-screen overflow-hidden bg-[#0D1A4A]">
      {/* Mobile Header */}
      <header className={`${isDashboard ? 'hidden' : 'md:hidden'} fixed top-0 left-0 right-0 z-30 bg-[#0D1A4A] h-14 shadow-sm`}>
        <div className="flex items-center justify-between px-4 h-full">
          <Link to="/" className="w-24 h-8 block hover:opacity-80 transition-opacity">
            <img src="/finonest-logo.png" alt="Finonest" className="w-full h-full object-contain brightness-0 invert" />
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell />
            {canAccessPayouts && (
              <button onClick={() => navigate('/payouts')} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <Wallet className="w-5 h-5 text-white/90" />
              </button>
            )}
            <button onClick={() => navigate('/profile')} className="flex items-center justify-center p-0.5 rounded-full hover:bg-white/10 transition-colors border border-white/20">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-bold text-white">
                    {displayName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[13vw] bg-[#0D1A4A] border-r border-white/10 flex-col z-30">
        {/* Logo */}
        <Link to="/" className="p-4 border-b border-white/10 block hover:opacity-80 transition-opacity">
          <img src="/finonest-logo.png" alt="Finonest" className="w-full h-8 object-contain brightness-0 invert" />
        </Link>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 relative">
          <p className="text-[10px] text-sidebar-foreground/50 px-3 mb-2">Navigation</p>
          <DockNav items={navItems} location={location} />
        </nav>

        {/* Logout */}
        <div className="p-3 border-sidebar-border">
          <DockItem onClick={handleLogout} icon={LogOut} label="Logout" />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Navbar */}
        <header className="hidden md:flex h-14 bg-sidebar-background border-sidebar-border border-b items-center px-6 justify-between z-20">
          <div id="desktop-navbar-left" className="flex items-center gap-4 flex-1"></div>
          <div className="flex items-center gap-4">
            <div id="desktop-navbar-right" className="flex items-center gap-4 mr-4"></div>
            <NotificationBell />
            <button onClick={() => navigate('/profile')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center">
                  <UserCircle className="w-5 h-5 text-accent-foreground" />
                </div>
              )}

            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className={`flex-1 overflow-auto md:rounded-tl-[2rem] h-[calc(100vh-3.5rem)] md:h-full md:mt-0 md:p-6 pb-20 md:pb-6 relative ${isDashboard ? 'bg-[#E2E8F0] mt-0 p-0' : 'bg-white mt-14 p-4'}`}>
          <div className="min-h-full w-full">
            {children}
          </div>
        </main>

      </div>

      {/* Mobile Bottom Nav */}
      <BottomNav />
    </div>
  );
};

export default AppLayout;
