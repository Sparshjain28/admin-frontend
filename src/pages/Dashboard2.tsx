import React, { useEffect, useMemo, useRef, useState } from "react";
import { LineChart, Line, BarChart, Bar, Cell, ResponsiveContainer } from "recharts";

type LoanFilter =
  | "All"
  | "Credit Card"
  | "Personal Loan"
  | "Business Loan"
  | "Home Loan"
  | "Loan Against Property"
  | "Used Car Loan"
  | "New Car Loan"
  | "Insurance";

interface StatCardData {
  id: string;
  label: string;
  value: number;
  caption: string;
  icon: "home" | "check" | "process" | "reject";
  iconBg: string;
}

interface RevenueCardData {
  id: string;
  label: string;
  value: number;
  delta: string;
  chart: "wave" | "bar";
  cardBg: string;
  accent: string;
  iconBg: string;
  icon: "folder" | "chip";
  chartData: number[]; // normalized 0-1 values driving the recharts chart
}

export interface DashboardProps {
  userName?: string;
  /** Initial range, format: "YYYY-MM-DD" */
  initialStartDate?: string;
  /** Initial range, format: "YYYY-MM-DD" */
  initialEndDate?: string;
  filters?: LoanFilter[];
  stats?: StatCardData[];
  revenueCards?: RevenueCardData[];
  avatarInitials?: string;
}

/* ------------------------------------------------------------------ */
/*  Dummy data generation (per filter tab)                             */
/* ------------------------------------------------------------------ */

const DEFAULT_FILTERS: LoanFilter[] = [
  "All",
  "Credit Card",
  "Personal Loan",
  "Business Loan",
  "Home Loan",
  "Loan Against Property",
  "Used Car Loan",
  "New Car Loan",
  "Insurance",
];

const FILTER_MULTIPLIER: Record<LoanFilter, number> = {
  All: 1,
  "Credit Card": 0.34,
  "Personal Loan": 0.52,
  "Business Loan": 0.27,
  "Home Loan": 0.46,
  "Loan Against Property": 0.19,
  "Used Car Loan": 0.23,
  "New Car Loan": 0.16,
  Insurance: 0.31,
};

const seededRandom = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return (index: number) => {
    const x = Math.sin(h + index * 97.13) * 10000;
    return x - Math.floor(x);
  };
};

const buildBarData = (seed: string, length = 8): number[] => {
  const rand = seededRandom(seed);
  return Array.from({ length }, (_, i) => 0.3 + rand(i) * 0.7);
};

const buildWaveData = (seed: string, length = 14): number[] => {
  const rand = seededRandom(seed);
  return Array.from({ length }, (_, i) => {
    const base = i % 2 === 0 ? 0.15 : 0.85;
    const jitter = (rand(i) - 0.5) * 0.2;
    return Math.min(1, Math.max(0.05, base + jitter));
  });
};

const roundTo = (n: number) => Math.max(1, Math.round(n));

const getStatsForFilter = (filter: LoanFilter): StatCardData[] => {
  const m = FILTER_MULTIPLIER[filter];
  return [
    { id: "leads", label: "Leads Created", value: roundTo(1200 * m), caption: "from the last month", icon: "home", iconBg: "#101B3D" },
    { id: "approved", label: "Approved", value: roundTo(800 * m), caption: "from the last month", icon: "check", iconBg: "#1FAA59" },
    { id: "process", label: "Under Process", value: roundTo(250 * m), caption: "from the last month", icon: "process", iconBg: "#FF8A00" },
    { id: "rejected", label: "Rejected", value: roundTo(150 * m), caption: "from the last month", icon: "reject", iconBg: "#E8491D" },
  ];
};

const getRevenueForFilter = (filter: LoanFilter): RevenueCardData[] => {
  const m = FILTER_MULTIPLIER[filter];
  const pct = (1.01 * (0.6 + m)).toFixed(2);
  const delta = `+${pct}% This Week`;

  return [
    {
      id: "total-revenue",
      label: "Total Revenue",
      value: roundTo(1200 * m),
      delta,
      chart: "wave",
      cardBg: "#FAF8EB",
      accent: "#E2BD27",
      iconBg: "#E2BD27",
      icon: "folder",
      chartData: buildWaveData(filter + "-r1"),
    },
    {
      id: "total-revenue-month",
      label: "Total Revenue This Month",
      value: roundTo(800 * m),
      delta,
      chart: "bar",
      cardBg: "#F0E7FA",
      accent: "#492787",
      iconBg: "#492787",
      icon: "chip",
      chartData: buildBarData(filter + "-r2"),
    },
    {
      id: "total-revenue-prev-month",
      label: "Total Revenue Previous Month",
      value: roundTo(400 * m),
      delta,
      chart: "bar",
      cardBg: "#FAE8E8",
      accent: "#AE384E",
      iconBg: "#AE384E",
      icon: "chip",
      chartData: buildBarData(filter + "-r3"),
    },
    {
      id: "total-volume-revenue",
      label: "Total Volume Revenue",
      value: roundTo(800 * m),
      delta,
      chart: "wave",
      cardBg: "#E8EAF9",
      accent: "#2732AD",
      iconBg: "#2732AD",
      icon: "chip",
      chartData: buildWaveData(filter + "-r4"),
    },
    {
      id: "total-volume-revenue-month",
      label: "Total Volume Revenue This Month",
      value: roundTo(250 * m),
      delta,
      chart: "bar",
      cardBg: "#E1F8EA",
      accent: "#2C9E73",
      iconBg: "#2C9E73",
      icon: "chip",
      chartData: buildBarData(filter + "-r5"),
    },
    {
      id: "total-volume-revenue-prev-month",
      label: "Total Volume Revenue Previous Month",
      value: roundTo(150 * m),
      delta,
      chart: "bar",
      cardBg: "#FFF5E2",
      accent: "#F4A014",
      iconBg: "#F4A014",
      icon: "chip",
      chartData: buildBarData(filter + "-r6"),
    },
  ];
};

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

const formatDisplayDate = (iso: string) => iso; // keep YYYY-MM-DD to match reference design

const todayIso = () => new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/*  Inline icon components (zero dependency)                          */
/* ------------------------------------------------------------------ */

const IconHome: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
  </svg>
);

const IconCheck: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
    <path d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
    <path d="m9 13 2 2 4-4" />
  </svg>
);

const IconProcess: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const IconReject: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
    <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8Z" />
    <path d="M14 3v5h5" />
    <path d="m9.5 14.5 5 5" />
    <path d="m14.5 14.5-5 5" />
  </svg>
);

const IconFolder: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#8A6D1D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px]">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  </svg>
);

const IconChip: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px]">
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
  </svg>
);

const IconCalendar: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#5B5B66" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </svg>
);

const IconClose: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#E8491D" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const IconChevronDown: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#8A8B94" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Charts (recharts)                                                  */
/* ------------------------------------------------------------------ */

const WaveChart: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const chartData = useMemo(() => data.map((v, i) => ({ i, value: v * 100 })), [data]);
  return (
    <ResponsiveContainer width="60%" height="100%">
      <LineChart data={chartData} margin={{ top: 6, right: 2, bottom: 2, left: 2 }}>
        <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={false}
            isAnimationActive={true}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

const BarChartMini: React.FC<{ data: number[]; accent: string }> = ({ data, accent }) => {
  const chartData = useMemo(() => data.map((v, i) => ({ i, value: v * 100 })), [data]);
  return (
    <ResponsiveContainer width="60%" height="100%">
      <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barCategoryGap="22%">
        <Bar dataKey="value" radius={[5, 5, 5, 5]} isAnimationActive={false} maxBarSize={18}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={data[i] >= 0.7 || data[i] <= 0.4 ? accent : "#FFFFFF"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

/* ------------------------------------------------------------------ */
/*  Working date-range picker                                          */
/* ------------------------------------------------------------------ */

const DateRangePicker: React.FC<{
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  onClear: () => void;
}> = ({ start, end, onChange, onClear }) => {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep drafts in sync if the applied range changes externally
  useEffect(() => {
    setDraftStart(start);
    setDraftEnd(end);
  }, [start, end]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const invalidRange = draftStart && draftEnd && draftStart > draftEnd;

  const handleApply = () => {
    if (invalidRange) return;
    onChange(draftStart, draftEnd);
    setOpen(false);
  };

  const handleCancel = () => {
    setDraftStart(start);
    setDraftEnd(end);
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-2.5 whitespace-nowrap rounded-[10px] border border-neutral-200 bg-white px-3 py-[9px] text-[13px] text-neutral-700 hover:border-neutral-300"
      >
        <IconCalendar />
        <span>
          {formatDisplayDate(start)} - {formatDisplayDate(end)}
        </span>
        <IconChevronDown />
        <span
          role="button"
          tabIndex={0}
          aria-label="Clear date range"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
            setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              onClear();
              setOpen(false);
            }
          }}
          className="ml-1 flex items-center rounded p-0.5 hover:bg-neutral-100"
        >
          <IconClose />
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Select date range"
          className="absolute right-0 z-20 mt-2 w-[280px] rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg sm:w-72"
        >
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-neutral-500">
              From
              <input
                type="date"
                value={draftStart}
                max={draftEnd || undefined}
                onChange={(e) => setDraftStart(e.target.value)}
                className="rounded-lg border border-neutral-200 px-2.5 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-400"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-neutral-500">
              To
              <input
                type="date"
                value={draftEnd}
                min={draftStart || undefined}
                onChange={(e) => setDraftEnd(e.target.value)}
                className="rounded-lg border border-neutral-200 px-2.5 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-400"
              />
            </label>
          </div>

          {invalidRange && (
            <p className="mb-2 text-xs text-red-500">"From" date must be before "To" date.</p>
          )}

          <div className="mb-3 flex flex-wrap gap-1.5">
            {[
              { label: "Today", days: 0 },
              { label: "Last 7 days", days: 7 },
              { label: "Last 30 days", days: 30 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  const end = todayIso();
                  const startDate = new Date();
                  startDate.setDate(startDate.getDate() - preset.days);
                  const start = startDate.toISOString().slice(0, 10);
                  setDraftStart(start);
                  setDraftEnd(end);
                }}
                className="rounded-full border border-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!!invalidRange}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Sub components                                                    */
/* ------------------------------------------------------------------ */

const StatCard: React.FC<{ data: StatCardData }> = ({ data }) => {
  const IconMap = { home: IconHome, check: IconCheck, process: IconProcess, reject: IconReject };
  const Icon = IconMap[data.icon];
  return (
    <div className="min-w-0 rounded-[18px] border border-neutral-200 p-4 sm:p-[18px]">
      <div className="mb-4 flex items-start justify-between sm:mb-[22px]">
        <span className="text-[13.5px] font-medium text-neutral-700">{data.label}</span>
        <span
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full"
          style={{ background: data.iconBg }}
        >
          <Icon />
        </span>
      </div>
      <div className="mb-1 text-2xl font-bold tracking-tight sm:text-[28px]">{data.value.toLocaleString()}</div>
      <div className="text-xs text-neutral-400">{data.caption}</div>
    </div>
  );
};

const RevenueCard: React.FC<{ data: RevenueCardData }> = ({ data }) => {
  const Icon = data.icon === "folder" ? IconFolder : IconChip;
  return (
    <div className="flex min-w-0 flex-col rounded-[18px] p-4 sm:p-[18px]" style={{ background: data.cardBg }}>
      <div className="mb-4 flex items-center gap-[10px]">
        <span
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]"
          style={{ background: data.iconBg }}
        >
          <Icon />
        </span>
        <span className="text-[13.5px] font-medium text-neutral-800">{data.label}</span>
      </div>
    <div className="flex items-end justify-between gap-4">
        <div className="h-16 flex-1">
            {data.chart === "wave" ? (
            <WaveChart data={data.chartData} color={data.accent} />
            ) : (
            <BarChartMini data={data.chartData} accent={data.accent} />
            )}
        </div>

        <div className="flex flex-col items-end justify-end shrink-0">
            <span className="text-xl font-bold tracking-tight sm:text-[22px]">
            {data.value.toLocaleString()}
            </span>

            <span className="mt-1 whitespace-nowrap text-[11px] text-neutral-600/75">
            {data.delta}
            </span>
        </div>
    </div>

    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Dashboard component                                          */
/* ------------------------------------------------------------------ */

const Dashboard2: React.FC<DashboardProps> = ({
  userName = "Ankit Sharma",
  initialStartDate = "2025-08-01",
  initialEndDate = "2025-08-02",
  filters = DEFAULT_FILTERS,
  stats,
  revenueCards,
  avatarInitials = "AS",
}) => {
  const [activeFilter, setActiveFilter] = useState<LoanFilter>("All");
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  const activeStats = useMemo(() => stats ?? getStatsForFilter(activeFilter), [stats, activeFilter]);
  const activeRevenue = useMemo(() => revenueCards ?? getRevenueForFilter(activeFilter), [revenueCards, activeFilter]);

  return (
    <div className="mx-auto max-w-7xl bg-white font-sans text-neutral-900 sm:px-5 sm:pb-10 sm:pt-5">
      {/* Header row */}
      <div className="mb-5 flex flex-col flex-wrap items-stretch justify-between gap-3.5 sm:flex-row sm:items-start">
        <div>
          <h1 className="mb-0.5 text-[21px] font-bold tracking-tight sm:text-2xl">Dashboard</h1>
          <p className="m-0 text-[13px] text-neutral-400">{userName}</p>
        </div>

        <DateRangePicker
          start={startDate}
          end={endDate}
          onChange={(s, e) => {
            setStartDate(s);
            setEndDate(e);
          }}
          onClear={() => {
            setStartDate(initialStartDate);
            setEndDate(initialEndDate);
          }}
        />
      </div>

      {/* Filter tabs */}
      <div
        className="mb-[22px] flex gap-2 overflow-x-auto pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Loan type filters"
      >
        {filters.map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={activeFilter === f}
            onClick={() => setActiveFilter(f)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-[9px] text-[13px] font-medium transition-colors ${
              activeFilter === f
                ? "border-green-600 bg-green-600 text-white"
                : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {activeStats.map((s) => (
          <StatCard key={s.id} data={s} />
        ))}
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeRevenue.map((r) => (
          <RevenueCard key={r.id} data={r} />
        ))}
      </div>
    </div>
  );
};

export default Dashboard2;