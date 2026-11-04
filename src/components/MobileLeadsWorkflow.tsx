import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Filter,
  Home,
  List,
  FileText,
  User,
  CreditCard,
  Shield,
  HandCoins,
  Eye,
  ArrowRight,
  Menu,
  Search,
  Download,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

export default function MobileLeadsWorkflow() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "cards" | "loans" | "insurance" | "drafts"
  >("loans"); // Default to loans tab
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCardId, setExpandedCardId] = useState<string | number | null>(
    null,
  );

  // Fetch standard Leads using the official api utility
  const { data: leads = [], isLoading: leadsLoading } = useQuery<any[]>({
    queryKey: ["leads"],
    queryFn: async () => {
      return api.get("/leads");
    },
    enabled: !!user && activeTab !== "loans",
  });

  // Fetch real Loan Applications, paginated — this used to call api.get("/loans")
  // with no page/limit at all, which on the current loans table (3000+ rows,
  // each pulled through ~20 joins) genuinely times out server-side after 60s
  // (verified directly against production data), which is exactly why this
  // tab hung on "Loading your files...". Paginating reuses the same
  // page/limit support the desktop Loans list already relies on, and search
  // is sent to the backend too (it already supports a `search` param) so
  // results aren't limited to whatever page happens to be loaded.
  const [loansPage, setLoansPage] = useState(1);
  const [loadedLoans, setLoadedLoans] = useState<any[]>([]);
  const loansSearchRef = React.useRef(searchQuery);

  const { data: loansPageData, isLoading: loansPageLoading } = useQuery<{
    data: any[]; total: number; totalPages: number;
  }>({
    queryKey: ["loans", loansPage, activeTab === "loans" ? searchQuery : ""],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(loansPage), limit: "20" });
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      return api.get(`/loans?${params.toString()}`);
    },
    enabled: !!user && activeTab === "loans",
  });

  // Reset to page 1 and clear accumulated results when the search term
  // changes (or the tab is (re)entered) — otherwise "Load More" would keep
  // appending onto results from a stale search.
  useEffect(() => {
    if (activeTab !== "loans") return;
    if (loansSearchRef.current !== searchQuery) {
      loansSearchRef.current = searchQuery;
      setLoadedLoans([]);
      setLoansPage(1);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    if (!loansPageData) return;
    setLoadedLoans((prev) => {
      const incoming = loansPageData.data || [];
      if (loansPage === 1) return incoming;
      const seen = new Set(prev.map((l: any) => l.id));
      return [...prev, ...incoming.filter((l: any) => !seen.has(l.id))];
    });
  }, [loansPageData, loansPage]);

  const loansLoading = loansPageLoading && loadedLoans.length === 0;
  const loansData = loadedLoans;
  const hasMoreLoans = !!loansPageData && loadedLoans.length < (loansPageData.total || 0);
  const loadMoreLoans = () => setLoansPage((p) => p + 1);

  // Fetch Drafts ("Save for later") using the official api utility
  const { data: drafts = [], isLoading: draftsLoading } = useQuery<any[]>({
    queryKey: ["drafts"],
    queryFn: async () => {
      return api.get("/loan-drafts");
    },
    enabled: !!user && activeTab === "drafts",
  });

  // Fetch ePartner insurance leads
  const { data: epartnerLeads = [], isLoading: epartnerLoading } = useQuery<any[]>({
    queryKey: ["epartnerLeads"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/insurance/epartner/leads`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.ok ? await response.json() : [];
    },
    enabled: !!user && activeTab === "insurance",
  });

  // Fetch Cards Module leads
  const { data: cardsLeads = [], isLoading: cardsLoading } = useQuery<any[]>({
    queryKey: ["cardsLeads"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/cardsModule/leads`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = response.ok ? await response.json() : { records: [] };
      return data.records || [];
    },
    enabled: !!user && activeTab === "cards",
  });

  // Filter leads based on active tab matching LeadsList.tsx rules
  const filteredLeads = React.useMemo(() => {
    // Filter pending leads (not converted)
    const pendingLeads = leads.filter((l: any) => {
      if (l.converted_to_loan) return false;
      if (user?.role === "executive" && l.created_by !== user?.id) return false;
      return true;
    });

    let items = [];
    if (activeTab === "cards") {
      items = pendingLeads.filter((lead) => lead.product_type === "cards");
    } else if (activeTab === "insurance") {
      items = pendingLeads.filter((lead) => lead.product_type === "insurance");
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (lead) =>
          lead.customer_name?.toLowerCase().includes(q) ||
          lead.customer_id?.toLowerCase().includes(q) ||
          lead.phone?.includes(q),
      );
    }

    return items;
  }, [leads, activeTab, user, searchQuery]);

  // Search is now applied server-side (sent as a `search` param on the
  // paginated /loans call above), so loansData already reflects it — no
  // need to re-filter client-side here anymore.
  const filteredLoans = loansData;

  // Combine draft leads and standalone drafts under the "Drafts" tab
  const combinedDrafts = React.useMemo(() => {
    if (activeTab !== "drafts") return [];

    // 1. Leads in SUBMITTED stage (which the desktop UI maps to "Draft")
    const submittedLeads = leads
      .filter((l: any) => {
        if (l.converted_to_loan) return false;
        if (user?.role === "executive" && l.created_by !== user?.id)
          return false;
        return !l.application_stage || l.application_stage === "SUBMITTED";
      })
      .map((l) => ({
        id: `lead-draft-${l.id}`,
        realId: l.id,
        customer_id: l.customer_id,
        customer_name: l.customer_name,
        phone: l.phone,
        city: l.city,
        amount: l.loan_amount_required || 0,
        sourcing_person_name: l.sourcing_person_name,
        vehicle_number: l.vehicle_number || l.vehicle_no || "",
        updated_at: l.created_at,
        isLeadDraft: true,
        case_type: l.case_type || "PURCHASE",
        product_type: l.product_type || "USED CAR",
        remarks: l.remarks || "No remarks recorded",
        step: l.current_step || l.step || 1,
        isStandaloneDraft: false,
      }));

    // 2. Standalone drafts from loan_drafts table
    const uniqueDraftsMap = new Map();
    
    // Sort drafts by updated_at descending so we process the newest first
    const sortedDrafts = [...drafts].sort((a, b) => 
      new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    );

    sortedDrafts.forEach(d => {
      // Ignore completely blank auto-saved drafts
      if (!d.lead_id && !d.form_data?.phone && !d.form_data?.customer_name) {
        return;
      }

      // Use lead_id if it exists. If not, use phone or customer name.
      const key = d.lead_id 
        ? `lead_${d.lead_id}` 
        : `phone_${d.form_data?.phone || d.form_data?.customer_name}`;
      if (!uniqueDraftsMap.has(key)) {
        uniqueDraftsMap.set(key, d);
      }
    });

    // Standalone drafts from loan_drafts table
    const standaloneDrafts = Array.from(uniqueDraftsMap.values()).map((d) => ({
      id: `standalone-draft-${d.id}`,
      realId: d.lead_id,
      customer_id: null,
      customer_name: d.form_data?.customer_name || "Draft Application",
      phone: d.form_data?.phone || "No phone info",
      city: d.form_data?.city || "",
      amount: d.form_data?.loan_amount_required || 0,
      sourcing_person_name: null,
      vehicle_number: d.form_data?.vehicle_number || d.form_data?.vehicle_no || "",
      updated_at: d.updated_at,
      isStandaloneDraft: true,
      case_type: d.form_data?.case_type || "PURCHASE",
      product_type: d.form_data?.product_type || "USED CAR",
      remarks: d.remarks || "No remarks recorded",
      step: d.current_step || d.form_data?.step || d.step || 1,
      isLeadDraft: false,
    }));

    // Filter out submittedLeads that already have a standalone draft
    const standaloneLeadIds = new Set(standaloneDrafts.map(d => d.realId).filter(id => id !== null));
    const uniqueSubmittedLeads = submittedLeads.filter(l => !standaloneLeadIds.has(l.realId));

    let items = [...uniqueSubmittedLeads, ...standaloneDrafts];
    
    // Final deduplication by vehicle number (keep newest)
    const uniqueByVehicle = new Map();
    items.forEach(item => {
      const vNum = item.vehicle_number?.trim().toUpperCase();
      if (vNum) {
        if (!uniqueByVehicle.has(vNum)) {
          uniqueByVehicle.set(vNum, item);
        } else {
          // If we already have one with this vehicle number, keep the newer one
          const existing = uniqueByVehicle.get(vNum);
          if (new Date(item.updated_at).getTime() > new Date(existing.updated_at).getTime()) {
            uniqueByVehicle.set(vNum, item);
          }
        }
      } else {
        // Items without vehicle number are kept using their unique ID
        uniqueByVehicle.set(item.id, item);
      }
    });
    
    items = Array.from(uniqueByVehicle.values());

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (draft) =>
          draft.customer_name?.toLowerCase().includes(q) ||
          draft.phone?.includes(q),
      );
    }

    return items;
  }, [leads, drafts, activeTab, user, searchQuery]);

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <h3 className="text-xl font-bold text-slate-800 mb-2">
        No Applications Found
      </h3>
      <p className="text-sm text-slate-500 max-w-[280px] mb-6 leading-relaxed">
        Try modifying your search query or add a new application to start
        earning.
      </p>
      <button
        onClick={() => navigate("/add-lead")}
        className="px-6 py-3 border-2 border-orange-500 text-orange-500 rounded-xl font-bold text-sm bg-white hover:bg-orange-50 active:scale-95 transition-all flex items-center gap-2"
      >
        <Plus size={16} strokeWidth={2.5} /> Add new lead
      </button>
    </div>
  );

  // Status styling map helper
  const getStatusStyle = (stage: string) => {
    const s = (stage || "").toUpperCase();
    if (s.includes("DISBURSED"))
      return {
        bg: "bg-emerald-50 border-emerald-100 text-emerald-600",
        label: "Disbursed",
      };
    if (s.includes("REJECTED"))
      return {
        bg: "bg-rose-50 border-rose-100 text-rose-600",
        label: "Rejected",
      };
    if (s.includes("APPROVED"))
      return {
        bg: "bg-teal-50 border-teal-100 text-teal-600",
        label: "Approved",
      };
    if (s.includes("LOGIN"))
      return { bg: "bg-blue-50 border-blue-100 text-blue-600", label: "Login" };
    if (s.includes("IN_PROCESS"))
      return {
        bg: "bg-amber-50 border-amber-100 text-amber-600",
        label: "In Process",
      };
    return {
      bg: "bg-slate-50 border-slate-100 text-slate-500",
      label: stage || "Submitted",
    };
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-28 font-sans overflow-x-hidden relative">
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between px-4 pt-4 pb-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 shadow-md transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Leads</h1>
        <button
          onClick={() => toast.info("Filters coming soon!")}
          className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 hover:bg-indigo-100/70 transition-colors shadow-sm"
        >
          <Filter size={18} />
        </button>
      </div>

      {/* --- SEGMENTED TABS --- */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 border-b border-slate-200">
          {/* Loans Tab */}
          <button
            onClick={() => {
              setActiveTab("loans");
              setExpandedCardId(null);
            }}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeTab === "loans"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 bg-white border border-slate-100"
              }`}
          >
            {activeTab === "loans" && (
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            )}
            Loans
          </button>

          {/* Drafts Tab */}
          <button
            onClick={() => {
              setActiveTab("drafts");
              setExpandedCardId(null);
            }}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeTab === "drafts"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 bg-white border border-slate-100"
              }`}
          >
            {activeTab === "drafts" && (
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            )}
            Drafts
          </button>
        </div>
      </div>

      {/* --- SEARCH BAR --- */}
      <div className="px-4 mb-4 flex gap-2">
        <div className="flex-1 bg-white border border-slate-100 rounded-xl px-3 py-2.5 flex items-center gap-2.5 shadow-sm">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search by Lead Id, Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm outline-none text-slate-700 bg-transparent font-medium"
          />
        </div>
        <button
          onClick={() => navigate("/add-lead")}
          className="w-11 h-11 shrink-0 bg-gradient-to-tr from-[#E85D04] to-[#F48C06] rounded-xl flex items-center justify-center text-white shadow-md shadow-orange-500/20 active:scale-95 transition-transform"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>

      {/* --- CONTENT LIST --- */}
      <div className="px-4 space-y-3">
        {/* Loading Spinner */}
        {((activeTab === "loans" && loansLoading) ||
          (activeTab === "insurance" && epartnerLoading) ||
          (activeTab === "cards" && cardsLoading) ||
          (activeTab === "drafts" && (leadsLoading || draftsLoading))) && (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-xs text-slate-400 font-medium">
                Loading your files...
              </p>
            </div>
          )}

        {/* --- INSURANCE LEADS (ePartner) --- */}
        {activeTab === "insurance" && !epartnerLoading && (
          epartnerLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <Shield size={48} className="text-slate-200 mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">No Insurance Leads</h3>
              <p className="text-sm text-slate-500 max-w-[280px] mb-6 leading-relaxed">
                Purchase a policy to see your insurance leads here.
              </p>
              <button
                onClick={() => navigate("/loans")}
                className="px-6 py-3 border-2 border-green-600 text-green-600 rounded-xl font-bold text-sm bg-white hover:bg-green-50 active:scale-95 transition-all flex items-center gap-2"
              >
                <Plus size={16} strokeWidth={2.5} /> Buy Policy
              </button>
            </div>
          ) : (
            <>
              {/* Buy Policy Button */}
              <div className="mb-3">
                <button
                  onClick={() => navigate("/loans")}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl font-bold text-sm shadow-md shadow-green-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  <Plus size={16} strokeWidth={2.5} /> Buy New Policy
                </button>
              </div>
              {epartnerLeads.map((lead: any) => {
                const initials = (lead.name || lead.customer_name || 'IN')
                  .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                const isSuccess = lead.status === 'Success';
                return (
                  <div key={lead.id} className="bg-white rounded-2xl shadow-sm border border-slate-100/80 overflow-hidden">
                    <div className="flex gap-3 items-center pt-3 pr-3 pl-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0 shadow-sm">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h3 className="text-sm font-bold text-slate-800 leading-tight uppercase truncate">
                            {lead.name || lead.customer_name}
                          </h3>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${isSuccess ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                            {lead.status || 'Lead'}
                          </span>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 tracking-tight truncate">
                          {lead.phone} • {lead.vehicle_number || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-3 pt-3 pb-3 mt-2 border-t border-slate-50 text-[11px] leading-tight">
                      <div>
                        <p className="text-slate-400 font-medium mb-0.5">Product</p>
                        <p className="font-bold text-slate-800 uppercase">{lead.product_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium mb-0.5">Provider</p>
                        <p className="font-bold text-slate-800 uppercase">{lead.product_provider_name || 'Pending'}</p>
                      </div>
                      {lead.amount && (
                        <div>
                          <p className="text-slate-400 font-medium mb-0.5">Amount</p>
                          <p className="font-bold text-slate-800">₹{lead.amount}</p>
                        </div>
                      )}
                      {lead.vle_margin && (
                        <div>
                          <p className="text-slate-400 font-medium mb-0.5">Margin</p>
                          <p className="font-bold text-emerald-600">₹{lead.vle_margin}</p>
                        </div>
                      )}
                    </div>
                    {isSuccess && lead.si_id && (
                      <div className="px-3 pb-3">
                        <button
                          onClick={async () => {
                            try {
                              const toastId = toast.loading('Downloading...');
                              const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/insurance/epartner/download-pdf`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
                                body: JSON.stringify({ quotation_id: lead.si_id })
                              });
                              if (!response.ok) throw new Error('Failed');
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url; a.download = `Policy_${lead.si_id}.pdf`;
                              document.body.appendChild(a); a.click();
                              window.URL.revokeObjectURL(url); document.body.removeChild(a);
                              toast.success('Downloaded!', { id: toastId });
                            } catch { toast.error('Download failed'); }
                          }}
                          className="w-full py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                        >
                          <Download size={14} /> Download Policy
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )
        )}

        {/* --- CARDS LEADS CARDS --- */}
        {activeTab === "cards" &&
          !cardsLoading &&
          (cardsLeads.length === 0
            ? renderEmptyState()
            : cardsLeads.filter(l => !searchQuery || l.applicant_name?.toLowerCase().includes(searchQuery.toLowerCase()) || l.lead_id?.toLowerCase().includes(searchQuery.toLowerCase())).map((lead) => {
              const isExpanded = expandedCardId === lead.id;
              const status = getStatusStyle(lead.status || "pending");
              // Vector avatar based on dynamic character initials
              const initials =
                lead.applicant_name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "SP";
              const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.applicant_name || "Finonest"}`;

              return (
                <div
                  key={lead.id}
                  onClick={() =>
                    setExpandedCardId(isExpanded ? null : lead.id)
                  }
                  className="bg-white rounded-2xl shadow-sm border border-slate-100/80 overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-200"
                >
                  {/* TOP ROW: Avatar + Name + Status */}
                  <div className="flex gap-3 items-center pt-3 pr-3 pl-3">
                    <div className="w-12 h-12 rounded-full bg-[#FFCA28] border-2 border-white flex items-center justify-center text-white shrink-0 overflow-hidden shadow-sm">
                      <img
                        src={avatarUrl}
                        alt={initials}
                        className="w-11 h-11 object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h3 className="text-sm font-bold text-slate-800 leading-tight uppercase truncate">
                          {lead.applicant_name}
                        </h3>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${status.bg}`}
                        >
                          {(lead.status || "pending").replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-[10px] font-medium text-slate-400 tracking-tight truncate">
                        Lead ID: {lead.lead_id || "-"}
                      </p>
                    </div>
                  </div>

                  {/* FULL WIDTH: Product/Date grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-3 pt-3 pb-3 mt-2 border-t border-slate-50 text-[11px] leading-tight">
                    <div>
                      <p className="text-slate-400 font-medium mb-0.5">
                        Product
                      </p>
                      <p className="font-bold text-slate-800 uppercase">
                        {lead.card_name || "CREDIT CARD"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium mb-0.5">
                        Date & Time
                      </p>
                      <p className="font-bold text-slate-800">
                        {lead.created_at ? lead.created_at.split(' ')[0] : '-'}
                      </p>
                    </div>
                  </div>

                  {/* FULL WIDTH: Expandable section */}
                  {isExpanded && (
                    <div className="px-3 pt-3 pb-3 border-t border-slate-100 text-[11px] space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-400 font-medium mb-0.5">
                            Bank
                          </p>
                          <p className="font-bold text-slate-800 uppercase">
                            {lead.bank_name || "NOT ASSIGNED"}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium mb-0.5">
                            Remarks / Comments
                          </p>
                          <p className="font-bold text-slate-800 truncate">
                            {lead.remark || "No remarks recorded"}
                          </p>
                        </div>
                      </div>
                      <div
                        className="flex items-center justify-between pt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          href={`tel:${lead.applicant_phone}`}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          Connect with Customer
                        </a>
                        <button
                          onClick={() => navigate("/loans")}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-[10px] font-bold shadow-sm"
                        >
                          View Detail
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }))}

        {/* --- REAL LOAN APPLICATIONS CARDS --- */}
        {activeTab === "loans" &&
          !loansLoading &&
          (filteredLoans.length === 0
            ? renderEmptyState()
            : filteredLoans.map((loan) => {
              const isExpanded = expandedCardId === loan.id;
              const status = getStatusStyle(
                loan.application_stage || "Submitted",
              );
              const initials =
                loan.applicant_name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "SP";
              const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${loan.applicant_name || "Finonest"}`;

              return (
                <div
                  key={loan.id}
                  onClick={() =>
                    setExpandedCardId(isExpanded ? null : loan.id)
                  }
                  className="bg-white rounded-2xl shadow-sm border border-slate-100/80 overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-200"
                >
                  {/* TOP ROW: Avatar + Name + Status */}
                  <div className="flex gap-3 items-center pt-3 pr-3 pl-3">
                    <div className="w-12 h-12 rounded-full bg-[#FFCA28] border-2 border-white flex items-center justify-center text-white shrink-0 overflow-hidden shadow-sm">
                      <img
                        src={avatarUrl}
                        alt={initials}
                        className="w-11 h-11 object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h3 className="text-sm font-bold text-slate-800 leading-tight uppercase truncate">
                          {loan.applicant_name}
                        </h3>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${status.bg}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-[10px] font-medium text-slate-400 tracking-tight truncate">
                        {loan.maker_model ||
                          loan.car_model ||
                          loan.car_make ||
                          loan.loan_number ||
                          String(loan.id)}
                      </p>
                    </div>
                  </div>

                  {/* FULL WIDTH: Product/Date grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-3 pt-3 pb-3 mt-2 border-t border-slate-50 text-[11px] leading-tight">
                    <div>
                      <p className="text-slate-400 font-medium mb-0.5">
                        Product
                      </p>
                      <p className="font-bold text-slate-800 uppercase">
                        {loan.product_type
                          ? loan.product_type.replace(/_/g, " ")
                          : "USED CAR"}
                        {loan.case_type &&
                          !loan.case_type.includes(loan.product_type || "X")
                          ? ` (${loan.case_type.replace(/^(USED_CAR_|NEW_CAR_|TWO_WHEELER_)/i, "").replace(/_/g, " ")})`
                          : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium mb-0.5">
                        Date & Time
                      </p>
                      <p className="font-bold text-slate-800">
                        {loan.created_at
                          ? new Date(loan.created_at).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {/* FULL WIDTH: Expandable section */}
                  {isExpanded && (
                    <div className="px-3 pt-3 pb-3 border-t border-slate-100 text-[11px] space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-400 font-medium mb-0.5">
                            Lender
                          </p>
                          <p className="font-bold text-slate-800 uppercase">
                            {loan.bank_name ||
                              loan.financier_name ||
                              "NOT ASSIGNED"}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium mb-0.5">
                            Remarks / Comments
                          </p>
                          <p className="font-bold text-slate-800 truncate">
                            {loan.remarks ||
                              loan.comments ||
                              "No remarks recorded"}
                          </p>
                        </div>
                      </div>
                      <div
                        className="flex items-center justify-between pt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          href={`tel:${loan.mobile}`}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          Connect with Customer
                        </a>
                        <button
                          onClick={() => navigate(`/loans/${loan.id}`)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-[10px] font-bold shadow-sm"
                        >
                          View Detail
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }))}

        {activeTab === "loans" && hasMoreLoans && (
          <button
            type="button"
            onClick={loadMoreLoans}
            disabled={loansPageLoading}
            className="w-full py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            {loansPageLoading ? "Loading..." : `Load More (${loadedLoans.length} of ${loansPageData?.total ?? 0})`}
          </button>
        )}

        {/* --- COMBINED DRAFTS CARDS --- */}
        {activeTab === "drafts" &&
          !leadsLoading &&
          !draftsLoading &&
          (combinedDrafts.length === 0
            ? renderEmptyState()
            : combinedDrafts.map((draft) => {
              const isExpanded = expandedCardId === draft.id;
              const initials =
                draft.customer_name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "SP";
              const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${draft.customer_name || "Finonest"}`;

              return (
                <div
                  key={draft.id}
                  onClick={() =>
                    setExpandedCardId(isExpanded ? null : draft.id)
                  }
                  className="bg-white rounded-2xl shadow-sm border border-slate-100/80 overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-200"
                >
                  {/* TOP ROW: Avatar + Name + Status */}
                  <div className="flex gap-3 items-center pt-3 pr-3 pl-3">
                    <div className="w-12 h-12 rounded-full bg-[#FFCA28] border-2 border-white flex items-center justify-center text-white shrink-0 overflow-hidden shadow-sm">
                      <img
                        src={avatarUrl}
                        alt={initials}
                        className="w-11 h-11 object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h3 className="text-sm font-bold text-slate-800 leading-tight uppercase truncate">
                          {draft.customer_name}
                        </h3>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 bg-amber-50 text-amber-700 border-amber-100">
                          {draft.isLeadDraft ? "DRAFT LEAD" : "SAVED DRAFT"}
                        </span>
                      </div>
                      <p className="text-[10px] font-medium text-slate-400 tracking-tight truncate">
                        {draft.phone}
                      </p>
                    </div>
                  </div>

                  {/* FULL WIDTH: Product/Date grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-3 pt-3 pb-3 mt-2 border-t border-slate-50 text-[11px] leading-tight">
                    <div>
                      <p className="text-slate-400 font-medium mb-0.5">
                        Product
                      </p>
                      <p className="font-bold text-slate-800 uppercase">
                        {draft.product_type
                          ? draft.product_type.replace(/_/g, " ")
                          : "USED CAR"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium mb-0.5">
                        Date & Time
                      </p>
                      <p className="font-bold text-slate-800">
                        {new Date(draft.updated_at).toLocaleDateString(
                          "en-IN",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </p>
                    </div>
                  </div>

                  {/* FULL WIDTH: Expandable section */}
                  {isExpanded && (
                    <div className="px-3 pt-3 pb-3 border-t border-slate-100 text-[11px] space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-400 font-medium mb-0.5">
                            Estimated Loan
                          </p>
                          <p className="font-bold text-slate-800">
                            ₹
                            {Number(draft.amount || 0).toLocaleString(
                              "en-IN",
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium mb-0.5">
                            Remarks / Comments
                          </p>
                          <p className="font-bold text-slate-800 truncate">
                            {draft.remarks || "No remarks recorded"}
                          </p>
                        </div>
                      </div>
                      <div
                        className="flex items-center justify-between pt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          href={`tel:${draft.phone}`}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          Connect with Customer
                        </a>
                        <button
                          onClick={() => {
                            if (draft.isLeadDraft) {
                              // For incomplete leads, redirect to AddLead with the exact step
                              navigate(`/add-lead?leadId=${draft.realId}&hasDraft=true&step=${draft.step}`);
                            } else {
                              navigate(
                                `/add-lead?leadId=${draft.realId || ""}&hasDraft=true&step=${draft.step}`,
                              );
                            }
                          }}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-[10px] font-bold shadow-sm"
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }))}
      </div>
    </div>
  );
}
