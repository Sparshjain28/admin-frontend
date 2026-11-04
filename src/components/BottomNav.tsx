import { useState } from 'react';
import { LayoutDashboard, CreditCard, Target, Wallet, Menu, Users2, Shield, UserCircle, Package, LogOut, Terminal, List } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useRole } from '@/contexts/RoleContext';
import LeadsSelectionSheet from './LeadsSelectionSheet';

const BottomNav = () => {
  const { role, moduleAccess } = useRole();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [showLeadsSelection, setShowLeadsSelection] = useState(false);

  // Define only the primary 3 items here. Menu will be the 4th.
  const rawMainNavItems = [
    { path: '/', label: 'Home', icon: LayoutDashboard },
    ...(moduleAccess.creditCards ? [
      { path: '/leads', label: 'Leads', icon: Target }
    ] : []),
    ...(role !== 'employee' && role !== 'advisor' && role !== 'team_leader' && role !== 'branch_manager' ? [{ path: '/payouts', label: 'Payouts', icon: Wallet }] : []),
  ];

  const rawMenuItems = [
    { path: '/credit-cards', label: 'Cards', icon: CreditCard, show: moduleAccess.creditCards },
    { path: '/personal-loans', label: 'Loans', icon: Wallet, show: moduleAccess.creditCards },
    { path: '/team', label: 'Team', icon: Users2, show: role !== 'employee' },
    { path: '/manage-products', label: 'Manage Products', icon: Package, show: role === 'super_admin' || role === 'admin' },
    { path: '/permissions', label: 'Permissions', icon: Shield, show: role === 'super_admin' || role === 'admin' },
    { path: '/api-integration', label: 'API Docs', icon: Terminal, show: true },
  ].filter(item => item.show);

  // Limit to 3 items on the bottom bar, rest go to menu
  const mainNavItems = rawMainNavItems.slice(0, 3);
  const menuItems = [
    ...rawMainNavItems.slice(3).map(i => ({ ...i, show: true })),
    ...rawMenuItems
  ];

  const renderNavItem = (item: { path: string; label: string; icon: React.ElementType }) => {
    // Special handling for Leads item - show sheet instead of direct link
    if (item.path === '/leads') {
      const isActive = ['/leads', '/credit-card-leads', '/personal-loan-leads', '/archived-leads'].includes(location.pathname);
      return (
        <button
          key={item.path}
          onClick={() => setShowLeadsSelection(true)}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-200 ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <item.icon className={`w-6 h-6 ${isActive ? 'text-blue-600' : ''}`} />
          <span className="text-[11px] font-medium leading-none">{item.label}</span>
        </button>
      );
    }

    const isActive = location.pathname === item.path;
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-200 ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
          }`}
      >
        <item.icon className={`w-6 h-6 ${isActive ? 'text-blue-600' : ''}`} />
        <span className="text-[11px] font-medium leading-none">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {showMenu && (
        <div className="md:hidden fixed inset-0 z-[45] bg-black/50 backdrop-blur-sm transition-all" onClick={() => setShowMenu(false)} />
      )}

      {showMenu && (
        <div className="md:hidden fixed bottom-[72px] left-4 right-4 z-[60] bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <p className="text-sm font-semibold text-gray-800">More Options</p>
          </div>
          <div className="p-2 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setShowMenu(false)}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all duration-200 ${isActive ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent'
                      }`}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-xs font-medium text-center">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <button
              onClick={async () => {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user');
                localStorage.removeItem('hasSeenOnboarding');
                sessionStorage.clear();
                const { storageManager } = await import('@/services/storageManager');
                await storageManager.fullCleanup();
                window.location.replace('/login');
              }}
              className="flex items-center justify-center gap-2 w-full p-4 rounded-xl hover:bg-red-50 text-red-600 transition-all duration-200 mt-2 border border-red-100 focus:outline-none"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[50] bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
          {mainNavItems.map(renderNavItem)}
          
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-200 ${showMenu ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Menu className={`w-6 h-6 ${showMenu ? 'text-blue-600' : ''}`} />
            <span className="text-[11px] font-medium leading-none">Menu</span>
          </button>
        </div>
      </nav>

      <LeadsSelectionSheet isOpen={showLeadsSelection} onClose={() => setShowLeadsSelection(false)} />
    </>
  );
};

export default BottomNav;
