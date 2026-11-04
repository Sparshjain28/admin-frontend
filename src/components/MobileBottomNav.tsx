import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  List,
  Wallet,
  Menu,
} from "lucide-react";

// Same numbers as Flutter's FloatingGlassNavigationBar.
const COLLAPSED_SLOT = 48;
const EXPANDED_SLOT = 108;
const SLOT_PAD = 6;
const BAR_PAD = 8;
// Flutter Curves.easeOutBack: slides, overshoots a little, then settles.
const EASE_OUT_BACK = "cubic-bezier(0.175, 0.885, 0.32, 1.275)";
const DURATION_MS = 750;

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isAccountant = user?.role === "accountant";
  const isLoanOps = user?.role === "loan_operations";
  const isOpsTeam = user?.role === "operation_team" || user?.role === "ops_team";

  // Active index calculation
  const getActiveIndex = () => {
    const path = location.pathname.toLowerCase();
    if (path === "/dashboard" || path === "/loan-ops/dashboard" || path === "/ops/dashboard" || path === "/") return 0;
    if (path === "/offline-disbursement" || path === "/leads-list" || path.startsWith("/leads") || path === "/ops/leads") return 1;
    if (path === "/payouts" || path.startsWith("/payouts")) return 2;
    return -1;
  };

  const activeIndex = getActiveIndex();

  const getHomePath = () => {
    if (isLoanOps) return "/loan-ops/dashboard";
    if (isOpsTeam) return "/ops/dashboard";
    return "/dashboard";
  };

  const tabs = [
    {
      index: 0,
      label: "Home",
      icon: Home,
      path: getHomePath(),
    },
    {
      index: 1,
      label: isLoanOps ? "Disburse" : "Leads",
      icon: List,
      path: isLoanOps ? "/offline-disbursement" : isAccountant ? "/ops/leads" : "/leads-list",
    },
    {
      index: 2,
      label: "Payouts",
      icon: Wallet,
      path: "/payouts",
    },
  ];

  // Slots and the pill are positioned from the bar width so that they all
  // animate with one curve and stay in sync (the equal gaps move as widths change).
  const navRef = useRef<HTMLElement>(null);
  const [barWidth, setBarWidth] = useState(0);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const measure = () => setBarWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Turn transitions on only after the first layout so nothing flies in on load.
  useEffect(() => {
    if (barWidth === 0) return;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [barWidth]);

  const widths = tabs.map((t) => (t.index === activeIndex ? EXPANDED_SLOT : COLLAPSED_SLOT));
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  const gap = Math.max(0, (barWidth - BAR_PAD * 2 - totalWidth) / (tabs.length + 1));
  const lefts = widths.map(
    (_, i) => BAR_PAD + gap * (i + 1) + widths.slice(0, i).reduce((a, b) => a + b, 0),
  );

  const move = animate ? `${DURATION_MS}ms ${EASE_OUT_BACK}` : "0ms";

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between gap-3 max-w-[440px] mx-auto pointer-events-auto">
      {/* Main Glass Floating Navigation Bar Container */}
      <nav
        ref={navRef}
        className="relative flex-1 h-[52px] bg-white/30 backdrop-blur-[10px] border-[1.5px] border-white/35 shadow-[0_8px_32px_rgba(15,23,42,0.12)] rounded-[26px]"
      >
        {/* Single sliding orange pill */}
        {barWidth > 0 && (
          <div
            aria-hidden
            className="absolute top-1 h-11 rounded-full bg-gradient-to-b from-[#FFB088] to-[#FF7A45] shadow-[0_3px_12px_1px_rgba(255,122,69,0.4)] pointer-events-none"
            style={{
              width: EXPANDED_SLOT - SLOT_PAD * 2,
              left: (activeIndex >= 0 ? lefts[activeIndex] : lefts[0]) + SLOT_PAD,
              opacity: activeIndex >= 0 ? 1 : 0,
              transition: `left ${move}, opacity 200ms ease-out`,
            }}
          />
        )}

        {barWidth > 0 &&
          tabs.map((tab, i) => {
            const IconComp = tab.icon;
            const isSelected = activeIndex === tab.index;

            return (
              <button
                key={tab.index}
                onClick={() => navigate(tab.path)}
                className="absolute top-0 h-[52px] flex items-center justify-center overflow-hidden active:scale-95"
                style={{
                  left: lefts[i],
                  width: widths[i],
                  transition: `left ${move}, width ${move}`,
                }}
              >
                <IconComp
                  className="shrink-0"
                  size={20}
                  strokeWidth={2.2}
                  style={{
                    color: isSelected ? "#FFFFFF" : "#475569",
                    transform: isSelected ? "scale(0.8)" : "scale(1)",
                    transition: `color ${DURATION_MS / 2}ms ease-out, transform ${DURATION_MS / 2}ms ease-out`,
                  }}
                />
                <span
                  className="ml-1 text-[11px] font-bold tracking-wide whitespace-nowrap text-white"
                  style={{
                    opacity: isSelected ? 1 : 0,
                    width: isSelected ? "auto" : 0,
                    // Label fades in once the pill is about half open, like Flutter.
                    transition: isSelected ? `opacity 300ms ease-out ${DURATION_MS / 2}ms` : "opacity 100ms",
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
      </nav>

      {/* Floating Glass Circular Menu Button */}
      <button
        onClick={() => window.dispatchEvent(new Event("openSidebar"))}
        className="w-[52px] h-[52px] shrink-0 bg-gradient-to-b from-[#FFB088] to-[#FF7A45] border-[1.5px] border-white/35 shadow-[0_6px_16px_rgba(255,122,69,0.4)] rounded-full flex flex-col items-center justify-center gap-px text-white active:scale-95 transition-all"
        title="Open Drawer Menu"
      >
        <Menu size={20} strokeWidth={2.2} />
        <span className="text-[9px] font-bold leading-none">Menu</span>
      </button>
    </div>
  );
}
