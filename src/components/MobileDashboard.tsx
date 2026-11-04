import React, { useState, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  CreditCard,
  Shield,
  HandCoins,
  PlayCircle,
  ChevronRight,
  Landmark,
} from "lucide-react";

import balanceIllustration from "@/assets/balance_illustration.png";
import earningsIllustration from "@/assets/earnings_illustration.png";
import discountIllustration from "@/assets/discount.png";
import creditCardsIllustration from "@/assets/credit_cards_illustration.png";
import loansIllustration from "@/assets/loans_illustration.png";
import insuranceIllustration from "@/assets/insurance_illustration.png";
import visitingCardIcon from "@/assets/visiting_card_icon.png";

// Google Material Icons, the same glyphs Flutter's My Tools tiles use
// (Icons.directions_car, Icons.account_balance_rounded, Icons.calculate_outlined).
type MaterialIconProps = { size?: number; style?: React.CSSProperties };

const MaterialCarIcon = ({ size = 24, style }: MaterialIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style} aria-hidden>
    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
  </svg>
);

const MaterialBankIcon = ({ size = 24, style }: MaterialIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style} aria-hidden>
    <path d="M4 11.5v4c0 .83.67 1.5 1.5 1.5S7 16.33 7 15.5v-4c0-.83-.67-1.5-1.5-1.5S4 10.67 4 11.5zm6 0v4c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5zM3.5 22h16c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5h-16c-.83 0-1.5.67-1.5 1.5S2.67 22 3.5 22zM16 11.5v4c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5zM10.57 1.49l-7.9 4.16c-.41.21-.67.64-.67 1.1C2 7.44 2.56 8 3.25 8h16.51C20.44 8 21 7.44 21 6.75c0-.46-.26-.89-.67-1.1l-7.9-4.16c-.58-.31-1.28-.31-1.86 0z" />
  </svg>
);

const MaterialCalculateIcon = ({ size = 24, style }: MaterialIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style} aria-hidden>
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
    <path d="M6.25 7.72h5v1.5h-5zM13 15.75h5v1.5h-5zm0-2.5h5v1.5h-5zM8 18h1.5v-2h2v-1.5h-2v-2H8v2H6V16h2zm6.09-7.05 1.41-1.41 1.41 1.41 1.06-1.06-1.41-1.42 1.41-1.41L16.91 6 15.5 7.41 14.09 6l-1.06 1.06 1.41 1.41-1.41 1.42z" />
  </svg>
);

export default function MobileDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeSlide, setActiveSlide] = useState(0);
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // ─── Fetch System Configuration & Page Permissions ───────────────────────
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
    enabled: !!user,
  });

  // ─── Live Balance, Earnings & Stats (Flutter main branch parity) ───────────
  const userId = user?.id?.toString();

  const { data: dashboardStats } = useQuery({
    queryKey: ["dashboard-stats-mobile"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/dashboard/stats?timeline=this_month`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return res.ok ? res.json() : null;
    },
    enabled: !!user,
  });

  const { data: earningsList = [] } = useQuery({
    queryKey: ["earnings-mobile"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/payouts/earnings`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return res.ok ? res.json() : [];
    },
    enabled: !!user,
  });

  const { data: payoutsList = [] } = useQuery({
    queryKey: ["payouts-mobile"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/payouts`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return res.ok ? res.json() : [];
    },
    enabled: !!user,
  });

  const { totalEarnings, availableBalance } = useMemo(() => {
    let totalEarned = 0;
    for (const e of earningsList as any[]) {
      const status = (e.status || "").toString().toLowerCase();
      if (status === "approved" || status === "confirmed" || status === "paid") {
        const amt = e.net_amount ?? e.payout_amount ?? e.amount ?? 0;
        totalEarned += Number(amt) || 0;
      }
    }

    const userPayouts = (payoutsList as any[]).filter((p) => {
      const pUid = p.user_id?.toString();
      const pDid = p.dsa_id?.toString();
      return userId && (pUid === userId || pDid === userId);
    });

    let credited = 0;
    let pending = 0;
    for (const p of userPayouts) {
      const status = (p.withdrawal_status ?? p.status ?? "").toString().toLowerCase();
      const amt = p.payout_amount ?? p.amount ?? 0;
      const val = Number(amt) || 0;
      const isDone = ["completed", "paid", "success", "withdrawal_paid"].includes(status);
      const isRejected = status === "rejected" || status === "withdrawal_rejected" || status.includes("reject");
      if (isDone) {
        credited += val;
      } else if (!isRejected) {
        pending += val;
      }
    }

    const avail = totalEarned - credited - pending;
    const finalTotalEarned = totalEarned > 0 ? totalEarned : (dashboardStats?.myEarnings ?? 0);
    const finalBalance = avail > 0 ? avail : (dashboardStats?.totalBalance ?? 0);

    return { totalEarnings: finalTotalEarned, availableBalance: finalBalance };
  }, [earningsList, payoutsList, userId, dashboardStats]);

  const formatAmount = (n: number) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const balance = formatAmount(availableBalance);
  const earnings = formatAmount(totalEarnings);

  const disbursedMTDAmount = dashboardStats?.monthlyTracker?.disbursed?.amount ?? 0;
  const disbursedAllTimeAmount = dashboardStats?.allTimeDisbursed?.amount ?? 0;
  const disbursedMTD = formatAmount(disbursedMTDAmount);
  const disbursedAllTime = formatAmount(disbursedAllTimeAmount);

  const cardsMTD = dashboardStats?.cardsIssuedMTD ?? 0;
  const cardsAllTime = dashboardStats?.cardsIssuedAllTime ?? 0;

  const initials = user?.name
    ? user.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
    : "FN";

  const rawPhotoPath = user?.photo_path?.trim();
  const photoUrl =
    rawPhotoPath && !photoLoadFailed
      ? rawPhotoPath.startsWith("http")
        ? rawPhotoPath
        : `/${rawPhotoPath}`
      : null;

  // 4 Carousel Cards mirroring Flutter main branch home_screen.dart
  const carouselCards = [
    {
      id: 0,
      gradient: "from-[#8A65FF] to-[#A78BFA]",
      icon: HandCoins,
      primaryTitle: "Total Earning (This Month)",
      primaryValue: `₹${earnings}`,
      secondaryTitle: "Current Balance",
      secondaryValue: `₹${balance}`,
      image: earningsIllustration,
      onClick: () => navigate("/payouts"),
    },
    {
      id: 1,
      gradient: "from-[#0D9488] to-[#2DD4BF]",
      icon: Landmark,
      primaryTitle: "Loan Disbursement (MTD)",
      primaryValue: `₹${disbursedMTD}`,
      secondaryTitle: "Total Disbursement (Till Date)",
      secondaryValue: `₹${disbursedAllTime}`,
      image: balanceIllustration,
      onClick: () => navigate("/loans"),
    },
    ];

  // Helper for corner badge matching Flutter buildCornerBadge
  const renderCornerBadge = (iconColorHex: string) => (
    <div
      className="absolute bottom-0 right-0 w-[30px] h-[30px] bg-white rounded-tl-[18px] rounded-br-[12px] shadow-[-1px_-1px_4px_rgba(0,0,0,0.08)] flex items-center justify-center pointer-events-none z-10"
    >
      <ChevronRight size={18} style={{ color: iconColorHex }} strokeWidth={2.5} />
    </div>
  );

  return (
    <div className="relative w-full h-full bg-[#E2E8F0] font-sans overflow-hidden flex flex-col">
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .mobile-dash-dot {
          transition: width 250ms ease, background-color 250ms ease;
        }
      `}</style>

      {/* Ambient Glows (Centered in the middle of the screen like Flutter) */}
      <div
        className="absolute top-[35%] right-[-60px] w-[500px] h-[500px] z-0 pointer-events-none opacity-85"
        style={{
          transform: "rotate(45deg)",
          borderRadius: "140px",
          background: "#DBE2FF",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute top-[18%] left-[-60px] w-[480px] h-[480px] z-0 pointer-events-none opacity-85"
        style={{
          transform: "rotate(45deg)",
          borderRadius: "140px",
          background: "#FFD7C2",
          filter: "blur(70px)",
        }}
      />

      {/* Main Scroll Container */}
      <div className="relative z-10 flex-1 flex flex-col overflow-y-auto pb-24 no-scrollbar">
        {/* Header Greetings Bar */}
        <div
          onClick={() => navigate("/profile")}
          className="flex items-center px-5 pt-4 pb-2 cursor-pointer select-none relative z-30"
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white shadow-sm overflow-hidden text-base ${
              photoUrl ? "bg-transparent" : "bg-[#FF7A45]"
            }`}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={user?.name || "Profile"}
                className="w-full h-full object-cover"
                onError={() => setPhotoLoadFailed(true)}
              />
            ) : (
              initials
            )}
          </div>
          <div className="ml-3">
            <p className="text-[13px] text-[#64748B] font-normal leading-tight">
              Hi,
            </p>
            <h1 className="text-[17px] font-bold text-[#0F172A] leading-tight mt-0.5">
              {user?.name || "User"}
            </h1>
          </div>
        </div>

        {/* 4 Cards Metrics Carousel (Layered ON TOP with z-30 and Flutter shadow) */}
        <div className="mt-2 h-[167px] relative w-full shrink-0 z-30">
          <div
            ref={carouselRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              const cardWidth = el.clientWidth * 0.85 + 12;
              const idx = Math.round(el.scrollLeft / cardWidth);
              setActiveSlide(Math.max(0, Math.min(3, idx)));
            }}
            className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar h-full px-5 gap-3 items-center"
          >
            {carouselCards.map((card, index) => {
              const IconComp = card.icon;
              const isActive = activeSlide === index;

              return (
                <div
                  key={card.id}
                  onClick={card.onClick}
                  style={{
                    boxShadow: isActive
                      ? "0px 22px 0px -16px rgba(15, 23, 42, 0.28)"
                      : "0px 20px 0px -16px rgba(15, 23, 42, 0.14)",
                  }}
                  className={`flex-shrink-0 w-[85%] h-[142px] snap-center rounded-[12px] relative transition-all duration-300 cursor-pointer bg-gradient-to-br ${card.gradient} ${
                    isActive ? "scale-100" : "scale-[0.94]"
                  }`}
                >
                  {/* Card Illustration */}
                  {card.image && (
                    <div className="absolute right-0 bottom-0 h-[140px] pointer-events-none opacity-80">
                      <img
                        src={card.image}
                        alt="Illustration"
                        className="w-full h-full object-contain object-bottom right-0"
                      />
                    </div>
                  )}

                  {/* Card Content */}
                  <div className="absolute inset-0 px-4 py-3 flex flex-col z-10">
                    <div className="flex items-center gap-2.5">
                      <div className="p-[7px] rounded-full bg-white/22 flex items-center justify-center">
                        <IconComp size={18} className="text-white" strokeWidth={2.2} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1 pr-16">
                        <span className="text-[12px] text-white/70 leading-tight truncate">
                          {card.primaryTitle}
                        </span>
                        <span className="text-[19px] font-bold text-white leading-[1.1] mt-[2px] truncate">
                          {card.primaryValue}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="h-[1px] w-full bg-white/20 mb-1.5" />
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] text-white/90 truncate">
                          {card.secondaryTitle}
                        </span>
                        <span className="text-[14px] font-semibold text-white ml-2 shrink-0">
                          {card.secondaryValue}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carousel Dot Indicators (4 dots) */}
        <div className="flex justify-center items-center gap-[6px] mt-1 mb-1 relative z-30">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="mobile-dash-dot h-[5px] rounded-full"
              style={{
                width: activeSlide === idx ? "16px" : "6px",
                background: activeSlide === idx ? "#475569" : "#CBD5E1",
              }}
            />
          ))}
        </div>

        {/* Inner Dashboard Contents - Sheet sits behind z-30 carousel with z-10 */}
        <div
          className="flex-1 -mt-12 pt-[48px] pb-28 px-5 relative z-10 rounded-t-[20px]"
          style={{
            background:
              "linear-gradient(to bottom, #ffffff 0%, rgba(255,255,255,0.60) 25%, rgba(255,255,255,0.20) 50%, transparent 80%)",
          }}
        >
          {/* Section Header */}
          <h3 className="text-[14px] font-bold text-[#0F172A] mb-2.5">
            Our Products
          </h3>

          {/* Category Rows Grid */}
          <div className="mb-3.5 h-[115px]">
            {/* Loans Card */}
            <button
              onClick={() => navigate("/loans")}
              className="w-full h-full bg-[#FFF3E6] rounded-[10px] relative overflow-hidden cursor-pointer hover:opacity-95 active:scale-[0.98] transition-all pt-4 pl-4 pr-3 pb-3 flex text-left shadow-[0_4px_10px_rgba(0,0,0,0.04)]"
            >
              <div className="flex-1 flex flex-col justify-start">
                <h3 className="text-[19px] font-extrabold text-[#EB6622] leading-[1.1]">
                  Loans & Underwriting
                </h3>
                <p className="text-[12px] font-normal text-[#1E293B] mt-2 leading-[1.25]">
                  Manage loan applications, approvals & disbursements
                </p>
              </div>
              <div className="w-[100px] shrink-0 pointer-events-none flex items-center justify-center">
                <img
                  src={loansIllustration}
                  alt="Loans"
                  className="w-full object-contain"
                />
              </div>
              {renderCornerBadge("#EB6622")}
            </button>
          </div>

          {/* My Tools: one panel, four equal tiles (same as Flutter _buildMyToolsSection) */}
          <div
            className="mt-4 mb-4 p-[14px] rounded-[24px] border border-[#FFE6D9]"
            style={{ background: "linear-gradient(to bottom right, #FFFFFF, #FFF3EA)" }}
          >
            <h3 className="text-[20px] font-extrabold text-[#0B1437] leading-tight">
              My Tools
            </h3>
            <p className="text-[12.5px] font-medium text-[#7A8197] mt-0.5">
              Quick access to your financial tools
            </p>

            <div className="grid grid-cols-4 gap-2 mt-3">
              {[
                { icon: MaterialCarIcon, image: null, label: "Car Value", path: "/find-car-value", accent: "#1F5FE0", tint: "#E6F8EF" },
                { icon: MaterialBankIcon, image: null, label: "Lender", path: "/find-lender", accent: "#1F5FE0", tint: "#E9F1FF" },
                { icon: MaterialCalculateIcon, image: null, label: "EMI", path: "/tools/emi-calculator", accent: "#7A2FE0", tint: "#F1E9FF" },
                { icon: null, image: visitingCardIcon, label: "Visiting Card", path: "/tools/visiting-card", accent: "#1F5FE0", tint: "#E9F1FF" },
              ].map((tool) => {
                const IconComp = tool.icon;
                return (
                  <button
                    key={tool.label}
                    onClick={() => navigate(tool.path)}
                    aria-label={`Find My ${tool.label}`}
                    className="relative aspect-[0.78] rounded-[16px] overflow-hidden cursor-pointer active:scale-95 transition-transform flex flex-col items-center justify-between px-1 pt-2 pb-2 text-center"
                    style={{
                      backgroundColor: tool.tint,
                      border: `1px solid ${tool.accent}1A`,
                      containerType: "inline-size",
                    }}
                  >
                    <div className="flex-1 flex items-center justify-center">
                      {tool.image ? (
                        <img src={tool.image} alt="" className="w-10 object-contain" />
                      ) : (
                        IconComp && <IconComp size={36} style={{ color: tool.accent }} />
                      )}
                    </div>

                    {/* "Find (My)" line */}
                    <div
                      className="flex items-center gap-0.5 whitespace-nowrap font-black text-[#0B1437] leading-[1.1]"
                      style={{ fontSize: "min(15px, 19cqw)" }}
                    >
                      <span>Find</span>
                      {/* "My" inside a magnifying lens: 24px lens + 45deg handle (30x26 box at 15px) */}
                      <span className="relative inline-block" style={{ width: "2em", height: "1.733em" }}>
                        <span
                          className="absolute left-0 top-0 inline-flex items-center justify-center rounded-full bg-white/70 font-black leading-none"
                          style={{
                            // 24px at a 15px parent; em here is the lens's own 0.733em font, so 1.6 / 0.733
                            width: "2.182em",
                            height: "2.182em",
                            border: `2px solid ${tool.accent}`,
                            color: tool.accent,
                            fontSize: "0.733em",
                          }}
                        >
                          My
                        </span>
                        <span
                          className="absolute"
                          style={{
                            left: "1.333em",
                            top: "1.333em",
                            width: "0.533em",
                            height: "0.2em",
                            borderRadius: 2,
                            backgroundColor: tool.accent,
                            transform: "rotate(45deg)",
                            transformOrigin: "top left",
                          }}
                        />
                      </span>
                    </div>

                    {/* Full name always shown on one line; font shrinks on narrow tiles */}
                    <span
                      className="font-semibold text-[#3A4660] whitespace-nowrap leading-tight mt-0.5 mb-1.5 pr-2"
                      style={{ fontSize: "min(11.5px, 13cqw)" }}
                    >
                      {tool.label}
                    </span>

                    <div className="absolute bottom-0 right-0 w-[26px] h-[26px] bg-white rounded-tl-[16px] rounded-br-[16px] shadow-[-1px_-1px_4px_rgba(0,0,0,0.08)] flex items-center justify-center pointer-events-none">
                      <ChevronRight size={18} style={{ color: tool.accent }} strokeWidth={2.5} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section Header */}
          <h3 className="text-[14px] font-bold text-[#0F172A] mb-2.5 mt-4">
            Latest Offers
          </h3>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3 mb-1">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="shrink-0 w-[300px] h-[120px] rounded-[10px] relative flex shadow-[0_3px_8px_rgba(0,0,0,0.06)] bg-white"
              >
                <img
                  src={discountIllustration}
                  alt="Discount Offer"
                  className="w-full h-full object-fill rounded-[10px]"
                />
              </div>
            ))}
          </div>

          {/* Section Header */}
          <h3 className="text-[14px] font-bold text-[#0F172A] mb-2.5 mt-4">
            Training video
          </h3>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="shrink-0 w-[160px] h-[110px] rounded-lg relative overflow-hidden cursor-pointer shadow-[0_3px_8px_rgba(0,0,0,0.08)] bg-[#C98A2E]"
              >
                <div className="absolute inset-0 bg-black/20 z-10 flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-md">
                    <PlayCircle size={22} className="text-[#C98A2E] ml-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
