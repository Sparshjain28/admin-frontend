import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown, ChevronUp } from 'lucide-react';

interface NavItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
  children?: NavItem[];
}

interface MobilePremiumDrawerProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  filteredNav: NavItem[];
  user: any;
  initials: string;
  handleLogout: () => void;
}

export default function MobilePremiumDrawer({
  sidebarOpen,
  setSidebarOpen,
  filteredNav,
  user,
  initials,
  handleLogout
}: MobilePremiumDrawerProps) {
  const navigate = useNavigate();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const phone = user?.phone || "+91 98765 43210";

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className={`fixed lg:hidden inset-y-0 left-0 z-10 bg-sidebar flex flex-col px-6 pt-12 pb-8 transition-transform duration-300 w-full ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Drawer contents limited to 65% of viewport width so it doesn't overlap with shadow */}
        <div className="w-[65%] flex flex-col h-full pointer-events-auto relative z-50">
          {/* App Logo */}
          <div className="mb-2 opacity-95">
            <svg viewBox="0 0 251 95" width="120" height="45" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.83,91.13H20.57C21.32,91.13 21.95,90.52 21.97,89.78C22.48,73.61 39.2,56.93 55.61,56.33C56.36,56.31 56.97,55.68 56.97,54.94V40.28C56.97,39.51 56.34,38.89 55.56,38.89H40.83C40.07,38.89 39.45,39.49 39.42,40.23C38.91,56.4 22.19,73.08 5.78,73.68C5.03,73.7 4.43,74.33 4.43,75.08V89.73C4.43,90.5 5.06,91.13 5.83,91.13Z" fill="white" fillRule="evenodd" />
              <path d="M41.28,91.13H55.3C56.22,91.13 56.94,90.38 56.94,89.49V75.56C56.94,74.64 56.19,73.92 55.3,73.92H41.28C40.37,73.92 39.64,74.67 39.64,75.56V89.49C39.64,90.4 40.39,91.13 41.28,91.13Z" fill="white" fillRule="evenodd" />
              <path d="M21.76,38.24C21.76,33.59 23.67,29.38 26.74,26.3C29.81,23.24 34.07,21.34 38.74,21.34H56.94V4.09H38.74C29.31,4.09 20.72,7.92 14.5,14.1C8.28,20.28 4.43,28.83 4.43,38.21V56.31H21.76V38.21V38.24Z" fill="white" fillRule="evenodd" />
              <path d="M56.97,4.09C45.79,9.99 35.62,17.49 26.76,26.3C29.84,23.24 34.1,21.34 38.77,21.34H56.97V4.09Z" fill="white" fillRule="evenodd" />
              <path d="M21.76,56.33V38.24C21.76,33.59 23.67,29.38 26.74,26.3C17.88,35.11 10.36,45.21 4.4,56.33H21.73H21.76Z" fill="white" fillRule="evenodd" />
              <path d="M71.66,52.34H89.85V58.06H77.85V61.96H87.63V67.3H77.85V78.28H71.63V52.36L71.66,52.34Z" fill="white" />
              <path d="M93.53,52.34H99.75V78.25H93.53V52.34Z" fill="white" />
              <path d="M104.3,62.83C104.3,56.38 108.13,52.34 115.02,52.34C121.92,52.34 125.74,56.38 125.74,62.83V78.25H119.52V62.83C119.52,59.77 118.07,58.06 115,58.06C111.92,58.06 110.47,59.77 110.47,62.83V78.25H104.25V62.83H104.3Z" fill="white" />
              <path d="M129.06,65.31C129.06,57.85 134.57,52.34 142.39,52.34C150.21,52.34 155.73,57.82 155.73,65.31C155.73,72.79 150.21,78.28 142.39,78.28C134.57,78.28 129.06,72.79 129.06,65.31ZM149.46,65.31C149.46,61.12 146.65,58.06 142.42,58.06C138.18,58.06 135.37,61.12 135.37,65.31C135.37,69.49 138.18,72.55 142.42,72.55C146.65,72.55 149.46,69.49 149.46,65.31Z" fill="white" />
              <path d="M159.04,62.83C159.04,56.38 162.87,52.34 169.76,52.34C176.66,52.34 180.48,56.38 180.48,62.83V78.25H174.26V62.83C174.26,59.77 172.81,58.06 169.74,58.06C166.66,58.06 165.21,59.77 165.21,62.83V78.25H158.99V62.83H159.04Z" fill="white" />
              <path d="M185.06,52.34H203.57V58.06H191.27V62.13H201.37V68.07H191.27V72.53H203.57V78.25H185.06V52.34Z" fill="white" />
              <path d="M206.57,70.41H212.62C212.62,71.97 213.59,72.96 215.98,72.96C218.38,72.96 219.35,71.97 219.35,70.41C219.35,68.84 217.43,68.39 215.14,67.98C211.58,67.33 207.01,66.49 207.01,60.42C207.01,54.36 210.61,52.34 216.01,52.34C221.4,52.34 224.82,55.49 225.01,60.23H219.18C219.13,58.79 218.21,57.63 216.08,57.63C213.95,57.63 212.98,58.88 212.98,60.18C212.98,61.48 214.89,62.2 217.24,62.61C220.85,63.26 225.4,64.1 225.4,70.17C225.4,76.23 221.65,78.25 215.96,78.25C210.27,78.25 206.64,75.24 206.52,70.41H206.57Z" fill="white" />
              <path d="M233.67,58.06H226.85V52.34H246.74V58.06H239.87V78.25H233.65V58.06H233.67Z" fill="white" />
              <path d="M246.74,89.39H161.17V91.13H246.74V89.39Z" fill="white" />
            </svg>
          </div>
          <div className="h-[1px] bg-white/10 my-4" />

          {/* Profile Card */}
          <div className="flex items-center gap-3 px-1 my-3">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold text-xl text-white shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white leading-tight truncate">
                {user?.name || 'Sambhav Makkar'}
              </div>
              <div className="text-xs text-white/60 mt-0.5 truncate">{phone}</div>
            </div>
          </div>

          {/* Dynamic Navigation Items based on real permissions */}
          <div className="flex-1 overflow-y-auto pr-2 gap-1 my-4 no-scrollbar flex flex-col">
            {filteredNav.map((item, idx) => {
              if (item.children) {
                const isExpanded = expandedGroup === item.label;
                return (
                  <div key={idx} className="flex flex-col">
                    <button
                      onClick={() => setExpandedGroup(isExpanded ? null : item.label)}
                      className="flex items-center justify-between p-2.5 rounded-xl text-white hover:bg-white/5 active:bg-white/10 transition-colors w-full text-left"
                    >
                      <div className="flex items-center">
                        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
                          {item.icon}
                        </div>
                        <span className="ml-3.5 text-sm font-medium text-white">{item.label}</span>
                      </div>
                      <div className="text-white/50">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="ml-8 border-l border-white/10 pl-3 flex flex-col gap-0.5 mt-1">
                        {item.children.map((child, cIdx) => (
                          <button
                            key={cIdx}
                            onClick={() => { setSidebarOpen(false); navigate(child.path || '/'); }}
                            className="flex items-center p-2 rounded-lg cursor-pointer hover:bg-white/5 active:bg-white/10 text-white/80 hover:text-white transition-colors w-full text-left"
                          >
                            <span className="text-xs font-medium">{child.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={idx}
                  onClick={() => { setSidebarOpen(false); if (item.path) navigate(item.path); }}
                  className="flex items-center p-2.5 rounded-xl cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors w-full text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
                    {item.icon}
                  </div>
                  <span className="ml-3.5 text-sm font-medium text-white">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Logout button */}
          <div
            onClick={() => {
              setSidebarOpen(false);
              handleLogout();
            }}
            className="flex items-center p-2.5 rounded-xl cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors mt-auto shrink-0 border-t border-white/10 pt-3"
          >
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-red-400 shrink-0">
              <LogOut size={16} />
            </div>
            <span className="ml-3.5 text-sm font-medium text-red-400">Logout</span>
          </div>
        </div>
      </div>
    </>
  );
}
