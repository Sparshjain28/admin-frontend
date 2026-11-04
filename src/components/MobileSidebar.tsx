import React, { useState, useEffect } from 'react';
import { Menu, X, LogOut, ChevronDown, ChevronRight, User } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, NavItem } from './DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

export default function MobileSidebar() {
  const { user, logout } = useAuth();
  const logo = '/Finonest%20logo.png';
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  if (!user) return null;

  const { hasPermission } = usePermission();

  const { data: pageConfigs = [] } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return [];
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.ok ? res.json() : [];
    },
    staleTime: 60_000,
  });

  const isPageEnabled = (path: string) => {
    if (user.role === 'admin') return true;
    const config = pageConfigs.find((c: any) => c.config_key === `page_enabled_${path}`);
    return !config || config.config_value === 'true';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const hasAccess = (item: NavItem) => {
    const roleHasAccess = item.roles.includes(user.role);

    if (item.label === 'API Integrations') return hasPermission('api_integrations.view');
    if (item.label === 'Operations') return hasPermission('operations.view') || roleHasAccess;
    if (item.label === 'Expenses') return hasPermission('expenses.view') || roleHasAccess;
    if (item.label === 'Insurance') return hasPermission('insurance.view') || roleHasAccess;
    if (item.label === 'Leads') return hasPermission('leads.view') || roleHasAccess;
    if (item.label === 'Loan Apps') return hasPermission('loans.view') || roleHasAccess;
    if (item.label === 'Offline Disbursement') return roleHasAccess;
    if (item.label === 'Payouts') return hasPermission('payouts.view') || roleHasAccess;
    if (item.label === 'Reports') return hasPermission('reports.view') || roleHasAccess;
    if (item.label === 'Permissions') return hasPermission('permissions.view') || roleHasAccess;

    return roleHasAccess;
  };

  useSwipeGesture({
    onSwipeRight: () => {
      if (window.innerWidth < 1024 && !isOpen) setIsOpen(true);
    },
    onSwipeLeft: () => {
      if (window.innerWidth < 1024 && isOpen) setIsOpen(false);
    }
  }, 100);

  const userRoleLabel = ROLE_LABELS[user.role] || user.role.replace(/_/g, ' ');

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-black border-b border-border z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">
            <Menu size={24} />
          </button>
          <img src={logo} alt="Finonest" className="h-8 object-contain" />
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold shadow-md">
          {user.name?.charAt(0).toUpperCase() || <User size={16} />}
        </div>
      </div>

      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={cn(
        "md:hidden fixed inset-y-0 left-0 w-72 bg-white dark:bg-[#0a0a0a] border-r border-border z-50 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0 bg-gray-50/50 dark:bg-black/50">
          <img src={logo} alt="Finonest" className="h-8 object-contain" />
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-border bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white dark:ring-gray-900">
              {user.name?.charAt(0).toUpperCase() || <User size={20} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate bg-white/50 dark:bg-black/20 inline-block px-2 py-0.5 rounded-full mt-1 border border-border/50">
                {userRoleLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
          {NAV_ITEMS.map((item, index) => {
            if (!hasAccess(item)) return null;
            if (item.path && !isPageEnabled(item.path)) return null;

            const isGroup = !!item.children;
            const isGroupExpanded = expandedGroups[item.label];
            const isActive = item.path === location.pathname;
            const hasActiveChild = item.children?.some(child => child.path === location.pathname);

            if (isGroup) {
              return (
                <div key={index} className="mb-1">
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group",
                      hasActiveChild 
                        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-medium" 
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        hasActiveChild ? "bg-indigo-100 dark:bg-indigo-500/20" : "bg-gray-100 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-700"
                      )}>
                        {item.icon}
                      </div>
                      <span className="text-sm">{item.label}</span>
                    </div>
                    {isGroupExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {isGroupExpanded && (
                    <div className="mt-1 ml-4 pl-4 border-l-2 border-gray-100 dark:border-gray-800 space-y-1 py-1">
                      {item.children?.map((child, childIndex) => {
                        if (!child.roles.includes(user.role)) return null;
                        if (!isPageEnabled(child.path)) return null;

                        const isChildActive = location.pathname === child.path;

                        return (
                          <Link
                            key={childIndex}
                            to={child.path}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                              isChildActive
                                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-medium"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200"
                            )}
                          >
                            {child.icon}
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={index}
                to={item.path!}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 mb-1 group",
                  isActive
                    ? "bg-indigo-500 text-white font-medium shadow-md shadow-indigo-500/20"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isActive ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-700"
                )}>
                  {item.icon}
                </div>
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-border bg-gray-50/50 dark:bg-black/50 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors text-sm font-medium"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
