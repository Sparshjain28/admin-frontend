import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import {
  Search,
  Eye,
  X,
  Calendar,
  ChevronDown,
  FileText,
  Zap,
  Loader2,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const maskMobile = (m: string) => {
  if (!m) return "—";
  const str = String(m);
  return str.length > 4 ? `${str.slice(0, 2)}XXXXXX${str.slice(-2)}` : str;
};

const MaskedMobile = ({ mobile }: { mobile: string }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-pointer font-mono"
      title={mobile}
    >
      {hovered ? mobile : maskMobile(mobile)}
    </span>
  );
};

function getPddDays(loan: any): number | null {
  const dateStr = loan.disbursement_date;
  if (!dateStr) return null;
  const days = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86400000,
  );
  return days >= 1 ? days : null;
}

function getPddBucket(days: number | null): string {
  if (days === null) return "none";
  if (days <= 30) return "1-30";
  if (days <= 45) return "30-45";
  if (days <= 60) return "45-60";
  if (days <= 90) return "60-90";
  return "90+";
}

const PDD_BUCKET_COLORS: Record<string, string> = {
  "1-30": "bg-green-100 text-green-700",
  "30-45": "bg-yellow-100 text-yellow-700",
  "45-60": "bg-orange-100 text-orange-700",
  "60-90": "bg-red-100 text-red-700",
  "90+": "bg-purple-100 text-purple-700",
};

const PDD_STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Completed: "bg-green-100 text-green-700",
};

const STAGE_COLORS: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-700",
  LOGIN: "bg-indigo-100 text-indigo-700",
  IN_PROCESS: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  DISBURSED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};
const STAGE_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  LOGIN: "Login",
  IN_PROCESS: "In Process",
  APPROVED: "Approved",
  DISBURSED: "Disbursed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export default function OperationsLeads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [pddBucketFilter, setPddBucketFilter] = useState("all");
  const [pddStatusFilter, setPddStatusFilter] = useState("all");
  const [executiveFilter, setExecutiveFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [rcResults, setRcResults] = useState<
    Record<number, { loading: boolean; financer?: string; error?: string }>
  >({});
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [isProcessingRc, setIsProcessingRc] = useState(false);
  const [billNumberModal, setBillNumberModal] = useState<{
    loanId: number;
    loanNumber: string;
    applicantName: string;
  } | null>(null);
  const [billNumber, setBillNumber] = useState("");
  const [billError, setBillError] = useState("");
  const [isMapping, setIsMapping] = useState(false);
  const [folioSearch, setFolioSearch] = useState("");
  const [showFolioDropdown, setShowFolioDropdown] = useState(false);
  const [folioSearchLoading, setFolioSearchLoading] = useState(false);
  const [folioSearchResults, setFolioSearchResults] = useState<any[]>([]);
  const [selectedFolioIndex, setSelectedFolioIndex] = useState(-1);
  const [itemsToShow, setItemsToShow] = useState(20);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['ops-loans'],
    queryFn: () => api.get('/loans?limit=2000'),
    enabled: !!user,
  });

  const mapBillNumberToLoan = useMutation({
    mutationFn: async (data: { loanId: number; billNumber: string }) => {
// Step 1: Map the bill number to the loan
      const mapResponse = await api.put(`/loans/${data.loanId}`, {
        bill_number: data.billNumber,
      });
      
      // Step 2: Update folio account with loan data (snapshot)
try {
        await api.post('/accountant/folio-accounts/map', {
          bill_number: data.billNumber,
          loan_id: data.loanId,
        });
} catch (folioErr) {
}
      
      // Step 3: Get the loan details to get the loan amount
      const loanDetails = await api.get(`/loans/${data.loanId}`);
      
      // Step 4: Create a payment request for the accountant
const paymentResponse = await api.post('/accountant/payments/request', {
        loan_id: data.loanId,
        bill_number: data.billNumber,
        amount: loanDetails.loan_amount || 0,
        txn_type: 'LOAN DISBURSEMENT PAYMENT',
        utr_no: '',
        credit_debit: 'debit',
        payment_date: new Date().toISOString(),
        remarks: `Auto-created payment request for bill ${data.billNumber}`,
      });
return { mapResponse, paymentResponse };
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ops-loans"] });
      queryClient.invalidateQueries({ queryKey: ["loan-payments", variables.loanId] });
      toast.success("Bill number mapped and payment request sent to accountant!");
      setBillNumberModal(null);
      setBillNumber("");
      setBillError("");
      setFolioSearch("");
      setFolioSearchResults([]);
      
      // Navigate to FolioAccounts with the bill number to auto-load folio details
      setTimeout(() => {
        navigate(`/accountant/folio?bill=${variables.billNumber}`);
      }, 500);
    },
    onError: (error: any) => {
setBillError(error.message || "Failed to map bill number and create payment request");
      toast.error("Failed to map bill number and create payment request");
    },
  });

  const executives = useMemo(() => {
    const seen = new Set<string>();
    loans.forEach((l: any) => {
      const n =
        l.assigned_to_name || l.sourcing_person_name || l.created_by_name;
      if (n) seen.add(n);
    });
    return Array.from(seen).sort();
  }, [loans]);

  const filtered = useMemo(() => {
    return loans.filter((l: any) => {
      // Only show DISBURSED loans
      if (l.application_stage !== "DISBURSED") return false;

      const q = search.toLowerCase().trim();
      const qDigits = q.replace(/\D/g, "");
      const matchSearch =
        !q ||
        l.applicant_name?.toLowerCase().includes(q) ||
        l.customer_name?.toLowerCase().includes(q) ||
        (l.mobile && String(l.mobile).toLowerCase().includes(q)) ||
        (l.phone && String(l.phone).toLowerCase().includes(q)) ||
        (l.applicant_phone && String(l.applicant_phone).toLowerCase().includes(q)) ||
        (l.co_applicant_mobile && String(l.co_applicant_mobile).toLowerCase().includes(q)) ||
        (l.guarantor_mobile && String(l.guarantor_mobile).toLowerCase().includes(q)) ||
        (l.rto_agent_mobile && String(l.rto_agent_mobile).toLowerCase().includes(q)) ||
        (qDigits.length >= 3 && (
          (l.mobile && String(l.mobile).replace(/\D/g, "").includes(qDigits)) ||
          (l.phone && String(l.phone).replace(/\D/g, "").includes(qDigits)) ||
          (l.applicant_phone && String(l.applicant_phone).replace(/\D/g, "").includes(qDigits)) ||
          (l.co_applicant_mobile && String(l.co_applicant_mobile).replace(/\D/g, "").includes(qDigits)) ||
          (l.guarantor_mobile && String(l.guarantor_mobile).replace(/\D/g, "").includes(qDigits))
        )) ||
        l.financier_name?.toLowerCase().includes(q) ||
        l.bank_name?.toLowerCase().includes(q) ||
        l.case_type?.toLowerCase().includes(q) ||
        l.loan_number?.toLowerCase().includes(q) ||
        l.loan_account_number?.toLowerCase().includes(q) ||
        l.customer_id?.toLowerCase().includes(q) ||
        l.vehicle_number?.toLowerCase().replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
        l.model_variant_name?.toLowerCase().includes(q) ||
        l.maker_model?.toLowerCase().includes(q) ||
        l.car_model?.toLowerCase().includes(q);
      const days = getPddDays(l);
      const bucket = getPddBucket(days);
      const matchBucket =
        pddBucketFilter === "all" || bucket === pddBucketFilter;
      const pddStatus = l.pdd_status || "Pending";
      const matchPddStatus =
        pddStatusFilter === "all" || pddStatus === pddStatusFilter;
      const execName =
        l.assigned_to_name || l.sourcing_person_name || l.created_by_name || "";
      const matchExec =
        executiveFilter === "all" || execName === executiveFilter;
      return matchSearch && matchBucket && matchPddStatus && matchExec;
    });
  }, [loans, search, pddBucketFilter, pddStatusFilter, executiveFilter]);

  // Reset to default items when filters change
  useEffect(() => {
    setItemsToShow(20);
  }, [search, pddBucketFilter, pddStatusFilter, executiveFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-pagination-dropdown]")) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Pagination calculations - load 20, 40, 60, 80 leads
  const PAGINATION_OPTIONS = [20, 40, 60, 80, Infinity];
  const paginatedData = filtered.slice(0, itemsToShow);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleProcess = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessingRc(true);
    let successCount = 0;
    
    const selected = filtered.filter((l: any) => selectedIds.has(l.id));
    for (const loan of selected) {
      if (!loan.vehicle_number) continue;
      setRcResults((prev) => ({ ...prev, [loan.id]: { loading: true } }));
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/rc-verification/lookup`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
            body: JSON.stringify({
              rc_number: loan.vehicle_number,
              _source: "ops-process",
              force_fresh: true,
            }),
          },
        );
        const data = await res.json();
        const rc = data?.data;
        if (data.success && rc) {
          // The API returns data as { rc_details: {...}, challan_info: {...} }
          const rcDetails = rc.rc_details || rc.rc_data || rc;
          const extractedFinancer = rcDetails.financer || rcDetails.finance_details?.financer;
          const isNotFinanced = rcDetails.financed === false || rcDetails.finance_status === 'Not Financed';
          
          const newHpn = extractedFinancer ? extractedFinancer : (isNotFinanced ? "NO HPN" : "");
          
          setRcResults((prev) => ({
            ...prev,
            [loan.id]: { loading: false, financer: newHpn || "—" },
          }));
          
          // Always update the frontend cache and DB, even if empty
          queryClient.setQueryData(["ops-loans"], (old: any) =>
            Array.isArray(old)
              ? old.map((l: any) =>
                  l.id === loan.id ? { ...l, new_hpn: newHpn } : l,
                )
              : old,
          );
          
          const putRes = await fetch(
            `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/loans/${loan.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
              },
              body: JSON.stringify({ new_hpn: newHpn }),
            },
          );
          
          if (!putRes.ok) {
            console.error(
              "Failed to save new_hpn:",
              putRes.status,
              await putRes.text(),
            );
          } else {
            successCount++;
            // Invalidate the query to fetch fresh data from the database
            queryClient.invalidateQueries({ queryKey: ["ops-loans"] });
          }
        } else {
          setRcResults((prev) => ({
            ...prev,
            [loan.id]: { loading: false, error: "No RC data" },
          }));
        }
      } catch {
        setRcResults((prev) => ({
          ...prev,
          [loan.id]: { loading: false, error: "Failed" },
        }));
      }
    }
    
    setIsProcessingRc(false);
    setSelectedIds(new Set());
    if (successCount > 0) {
      toast.success(`Successfully processed and updated ${successCount} RC(s)!`);
    } else {
      toast.error("Failed to process the selected RC(s).");
    }
  };

  const handleBulkPddStatus = async (status: string) => {
    setBulkUpdating(true);
    const ids = Array.from(selectedIds);
    await Promise.all(
      ids.map((id) =>
        fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/loans/${id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
            body: JSON.stringify({ pdd_status: status }),
          },
        ).catch(() => {}),
      ),
    );
    queryClient.invalidateQueries({ queryKey: ["ops-loans"] });
    setSelectedIds(new Set());
    setBulkUpdating(false);
  };

  const selectClass =
    "appearance-none pl-2 pr-7 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:border-accent";

  return (
    <div
      className={`min-w-0 w-full overflow-x-auto ${user?.role === "accountant" ? "mt-1" : "mt-4"}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 mb-0.5">
        {/* Bulk action buttons — shown when rows selected */}
        {selectedIds.size > 0 && user?.role !== "accountant" && (
          <div className="flex items-center gap-0.5 flex-wrap mb-0.5">
            <span className="text-xs text-muted-foreground font-medium">
              {selectedIds.size} selected
            </span>
            <button
              onClick={handleProcess}
              disabled={isProcessingRc}
              className={`px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm ${isProcessingRc ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isProcessingRc ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />} 
              {isProcessingRc ? "Processing..." : "Process RC"}
            </button>
            <button
              onClick={() => handleBulkPddStatus("In Progress")}
              disabled={bulkUpdating}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60"
            >
              {bulkUpdating ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <CheckCircle2 size={13} />
              )}{" "}
              In Progress
            </button>
            <button
              onClick={() => handleBulkPddStatus("Completed")}
              disabled={bulkUpdating}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-60"
            >
              {bulkUpdating ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <CheckCircle2 size={13} />
              )}{" "}
              Completed
            </button>
          </div>
        )}
      </div>

      {/* Compact Filters */}
      <div className="flex flex-wrap items-center gap-0.5 mb-0.5 p-1 bg-card border border-border rounded-lg">
        <div className="relative flex-1 min-w-[160px]">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search by name, number, loan ID, vehicle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-7 py-0.5 rounded-lg border border-border bg-background text-foreground text-[11px] focus:outline-none focus:border-accent"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X size={12} className="text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={pddBucketFilter}
            onChange={(e) => setPddBucketFilter(e.target.value)}
            className="appearance-none pl-2 pr-7 py-0.5 rounded-lg border border-border bg-background text-foreground text-[11px] focus:outline-none focus:border-accent"
          >
            <option value="all">All PDD Days</option>
            <option value="1-30">1–30 Days</option>
            <option value="30-45">30–45 Days</option>
            <option value="45-60">45–60 Days</option>
            <option value="60-90">60–90 Days</option>
            <option value="90+">90+ Days</option>
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>
        <div className="relative">
          <select
            value={pddStatusFilter}
            onChange={(e) => setPddStatusFilter(e.target.value)}
            className="appearance-none pl-2 pr-7 py-0.5 rounded-lg border border-border bg-background text-foreground text-[11px] focus:outline-none focus:border-accent"
          >
            <option value="all">All PDD Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>
        <div className="relative">
          <select
            value={executiveFilter}
            onChange={(e) => setExecutiveFilter(e.target.value)}
            className="appearance-none pl-2 pr-7 py-0.5 rounded-lg border border-border bg-background text-foreground text-[11px] focus:outline-none focus:border-accent"
          >
            <option value="all">All Executives</option>
            {executives.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>
      </div>

      {isLoading && (
        <div className="stat-card py-8 text-center text-muted-foreground text-[10px]">
          Loading
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="stat-card py-8 text-center">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto mb-1">
            <FileText size={14} className="text-muted-foreground" />
          </div>
          <p className="text-[10px] font-semibold text-foreground">No loans</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      )}

      {/* Mobile Cards */}
      {!isLoading && paginatedData.length > 0 && (
        <div className="lg:hidden space-y-3">
          {paginatedData.map((loan: any) => {
            const days = getPddDays(loan);
            const bucket = getPddBucket(days);
            const pddStatus = loan.pdd_status || "Pending";
            const rc = rcResults[loan.id];
            const isSelected = selectedIds.has(loan.id);
            return (
              <div
                key={loan.id}
                className={`stat-card cursor-pointer transition-all ${isSelected ? "ring-2 ring-emerald-500" : ""}`}
                onClick={() => toggleSelect(loan.id)}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(loan.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-emerald-600 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-[11px] truncate">
                        {loan.applicant_name || "—"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {loan.vehicle_number && (
                          <span className="text-[10px] font-mono text-accent">
                            {loan.vehicle_number}
                          </span>
                        )}
                        {(loan.mobile || loan.phone) && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            • <MaskedMobile mobile={loan.mobile || loan.phone} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${PDD_STATUS_COLORS[pddStatus] || "bg-amber-100 text-amber-700"}`}
                  >
                    {pddStatus}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] border-t border-border pt-2">
                  <div>
                    <p className="text-muted-foreground font-medium mb-0.5">
                      Disbursed
                    </p>
                    <p className="text-foreground font-semibold">
                      {fmt(loan.disbursement_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium mb-0.5">
                      Lender
                    </p>
                    <p className="text-foreground font-semibold truncate">
                      {loan.financier_name || loan.bank_name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium mb-0.5">
                      Old HPN
                    </p>
                    <p className="text-foreground font-semibold truncate">
                      {loan.financer || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium mb-0.5">
                      New HPN (RC)
                    </p>
                    {rc?.loading ? (
                      <Loader2
                        size={13}
                        className="animate-spin text-muted-foreground"
                      />
                    ) : rc?.financer ? (
                      <p className="text-emerald-600 font-bold truncate">
                        {rc.financer}
                      </p>
                    ) : rc?.error ? (
                      <p className="text-red-500 text-[11px]">{rc.error}</p>
                    ) : loan.new_hpn ? (
                      <p className="text-emerald-600 font-bold truncate">
                        {loan.new_hpn}
                      </p>
                    ) : (
                      <p className="text-muted-foreground">—</p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium mb-0.5">
                      PDD Days
                    </p>
                    {days !== null ? (
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${PDD_BUCKET_COLORS[bucket] || ""}`}
                      >
                        {days}d
                      </span>
                    ) : (
                      <p className="text-muted-foreground">—</p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium mb-0.5">
                      Executive
                    </p>
                    <p className="text-foreground font-semibold truncate">
                      {loan.assigned_to_name ||
                        loan.sourcing_person_name ||
                        loan.created_by_name ||
                        "—"}
                      {loan.branch_manager_name
                        ? ` / ${loan.branch_manager_name}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/ops/loans/${loan.id}`);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-accent text-accent-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Eye size={14} /> View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop Table */}
      {!isLoading && filtered.length > 0 && (
        <div className="stat-card overflow-hidden p-0 hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {user?.role !== "accountant" && (
                    <th className="px-2 py-1 w-8">
                      <input
                        type="checkbox"
                        className="accent-emerald-600"
                        checked={
                          selectedIds.size === filtered.length &&
                          filtered.length > 0
                        }
                        onChange={() =>
                          selectedIds.size === filtered.length
                            ? setSelectedIds(new Set())
                            : setSelectedIds(
                                new Set(filtered.map((l: any) => l.id)),
                              )
                        }
                      />
                    </th>
                  )}
                  <th className="px-2 py-1 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                    Date
                  </th>
                  {user?.role !== "accountant" && (
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                      Customer
                    </th>
                  )}
                  {user?.role === "accountant" && (
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                      Info
                    </th>
                  )}
                  <th className="px-2 py-1 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                    Lender
                  </th>
                  {user?.role !== "accountant" && (
                    <>
                      <th className="px-2 py-1 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                        Old HPN
                      </th>
                      <th className="px-2 py-1 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                        New HPN 
                      </th>
                    </>
                  )}
                  {user?.role === "accountant" && (
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                      RC
                    </th>
                  )}
                  {user?.role === "accountant" && (
                    <th className="px-2 py-1 text-left text-[9px] font-semibold text-muted-foreground whitespace-nowrap">
Created By                    </th>
                  )}
                  {user?.role === "accountant" && (
                    <th className="px-2 py-1 text-left text-[9px] font-semibold text-muted-foreground whitespace-nowrap">
                      BM/DSA/Sales manager
                    </th>
                  )}
                  {user?.role === "accountant" && (
                    <th className="px-2 py-1 text-left text-[9px] font-semibold text-muted-foreground whitespace-nowrap">
                      PDD Days
                    </th>
                  )}
                  {user?.role !== "accountant" && (
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                      Executive
                    </th>
                  )}
                  {user?.role !== "accountant" && (
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                      PDD Days
                    </th>
                  )}
                  <th className="px-2 py-1 text-right text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginatedData.map((loan: any) => {
                  const days = getPddDays(loan);
                  const bucket = getPddBucket(days);
                  const pddStatus = loan.pdd_status || "Pending";
                  const rc = rcResults[loan.id];
                  const isSelected = selectedIds.has(loan.id);
                  return (
                    <tr
                      key={loan.id}
                      className={`hover:bg-muted/20 transition-colors ${isSelected ? "bg-emerald-50/50" : ""}`}
                    >
                      {user?.role !== "accountant" && (
                        <td className="px-2 py-1">
                          <input
                            type="checkbox"
                            className="accent-emerald-600 scale-90"
                            checked={isSelected}
                            onChange={() => toggleSelect(loan.id)}
                          />
                        </td>
                      )}
                      <td className="px-2 py-1 whitespace-nowrap">
                        <span className="text-[10px] text-foreground">
                          {fmt(loan.disbursement_date)}
                        </span>
                      </td>
                      {user?.role !== "accountant" && (
                        <td className="px-2 py-1 whitespace-nowrap">
                          <p className="text-[10px] font-semibold text-foreground">
                            {loan.applicant_name || "—"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {loan.vehicle_number && (
                              <span className="text-[10px] font-mono text-accent">
                                {loan.vehicle_number}
                              </span>
                            )}
                            {(loan.mobile || loan.phone) && (
                              <span className="text-[9px] text-muted-foreground font-mono">
                                • <MaskedMobile mobile={loan.mobile || loan.phone} />
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {user?.role === "accountant" && (
                        <td className="px-2 py-1 truncate w-28">
                          <p className="text-[10px] font-semibold text-foreground truncate">
                            {loan.applicant_name || "—"}
                          </p>
                          <p className="text-[9px] text-muted-foreground truncate">
                            {loan.loan_account_number || loan.mobile || "—"}
                          </p>
                        </td>
                      )}
                      <td className="px-2 py-1 whitespace-nowrap">
                        <p className="text-[10px] font-semibold text-foreground">
                          {loan.financier_name || loan.bank_name || "—"}
                        </p>
                        {loan.case_type && (
                          <span className="mt-1 inline-block px-2 py-0.5 rounded-md bg-accent/10 text-accent-foreground text-[10px] font-medium">
                            {loan.case_type}
                          </span>
                        )}
                      </td>
                      {user?.role !== "accountant" && (
                        <>
                          <td className="px-2 py-1 whitespace-nowrap">
                            <span className="text-[10px] text-foreground">
                              {loan.financer || "—"}
                            </span>
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap">
                            {rc?.loading ? (
                              <Loader2
                                size={10}
                                className="animate-spin text-muted-foreground"
                              />
                            ) : rc?.financer ? (
                              <span className="text-[10px] font-bold text-emerald-600">
                                {rc.financer}
                              </span>
                            ) : rc?.error ? (
                              <span className="text-[10px] text-red-500">
                                {rc.error}
                              </span>
                            ) : loan.new_hpn ? (
                              <span className="text-[10px] font-bold text-emerald-600">
                                {loan.new_hpn}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                        </>
                      )}
                      {user?.role === "accountant" && (
                        <td className="px-2 py-1 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-semibold text-foreground">
                              {loan.vehicle_number || "—"}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              {loan.model_variant_name ||
                                loan.maker_model ||
                                loan.car_model ||
                                "—"}
                            </span>
                          </div>
                        </td>
                      )}
                      {user?.role === "accountant" && (
                        <td className="px-2 py-1 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-foreground">
                              {loan.assigned_to_name || loan.sourcing_person_name || loan.created_by_name || "—"}
                            </span>
                          
                          </div>
                        </td>
                      )}

                      {user?.role === "accountant" && (
                        <td className="px-2 py-1 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            {loan.team_leader_name && (
                              <span className="text-[9px] ">
                                TL: {loan.team_leader_name}
                              </span>
                            )}
                            {loan.branch_dsa_manager_name && (
                              <span className="text-[9px] ">
                                BM/DSA: {loan.branch_dsa_manager_name}
                              </span>
                            )}
                            {loan.sales_manager_name && (
                              <span className="text-[9px] ">
                                SM: {loan.sales_manager_name}
                              </span>
                            )}
                            {!loan.team_leader_name && !loan.branch_dsa_manager_name && !loan.sales_manager_name && (
                              <span className="text-[9px] text-muted-foreground">
                                —
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {user?.role === "accountant" && (
                        <td className="px-2 py-1 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`px-1 py-0.5 rounded text-[8px] font-semibold ${PDD_STATUS_COLORS[pddStatus] || "bg-amber-100 text-amber-700"}`}
                            >
                              {pddStatus}
                            </span>
                            {days !== null ? (
                              <span
                                className={`px-1 py-0.5 rounded text-[8px] font-semibold ${PDD_BUCKET_COLORS[bucket] || ""}`}
                              >
                                {days}d
                              </span>
                            ) : (
                              <span className="text-[8px] text-muted-foreground">
                                —
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {user?.role !== "accountant" && (
                        <td className="px-2 py-1 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-foreground">
                              {loan.assigned_to_name ||
                                loan.sourcing_person_name ||
                                loan.created_by_name ||
                                "—"}
                            </span>
                          </div>
                        </td>
                      )}
                      {user?.role !== "accountant" && (
                        <td className="px-2 py-1 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            {days !== null ? (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${PDD_BUCKET_COLORS[bucket] || ""}`}
                              >
                                {days}d
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                —
                              </span>
                            )}
                            <span
                              className={`px-1 py-0.5 rounded text-[8px] font-semibold ${PDD_STATUS_COLORS[pddStatus] || "bg-amber-100 text-amber-700"}`}
                            >
                              {pddStatus}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="px-2 py-1 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {(user?.role === "accountant" || user?.role === "admin") && !loan.bill_number && (
                            <button
                              onClick={() => {
                                setBillNumberModal({
                                  loanId: loan.id,
                                  loanNumber: loan.loan_number || "N/A",
                                  applicantName: loan.applicant_name || "N/A",
                                });
                                setBillNumber("");
                                setBillError("");
                              }}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500 text-white rounded text-[9px] font-semibold hover:bg-blue-600 transition-colors"
                              title="Map Bill Number"
                            >
                               Bill
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/ops/loans/${loan.id}`)}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-accent text-accent-foreground rounded text-[9px] font-semibold hover:opacity-90 transition-opacity"
                          >
                             View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && filtered.length > 0 && (
        <div className="flex items-center justify-between gap-2 mt-1 p-2 bg-card border border-border rounded-lg text-[10px]">
          <div className="text-[10px] text-muted-foreground font-medium">
            {itemsToShow === Infinity ? 'All' : itemsToShow} of {filtered.length}
          </div>
          <div className="relative" data-pagination-dropdown>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border text-foreground font-semibold text-[10px] hover:bg-muted transition-colors"
            >
              {itemsToShow === Infinity ? 'All' : itemsToShow}
              <ChevronDown
                size={12}
                className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                {PAGINATION_OPTIONS.map((limit) => (
                  <button
                    key={limit}
                    onClick={() => {
                      setItemsToShow(limit);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-semibold transition-colors flex items-center justify-between ${
                      itemsToShow === limit
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{limit === Infinity ? 'All' : `Show ${limit}`}</span>
                    {itemsToShow === limit && (
                      <span className="text-lg">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bill Number Mapping Modal - Accountant Role */}
      {billNumberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
               
                <p className="text-sm text-muted-foreground mt-2">
                  <span className="font-semibold">Loan:</span>{" "}
                  {billNumberModal.loanNumber}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold">Applicant:</span>{" "}
                  {billNumberModal.applicantName}
                </p>
              </div>
              <button
                onClick={() => {
                  setBillNumberModal(null);
                  setBillNumber("");
                  setBillError("");
                }}
                className="p-1 rounded-lg hover:bg-muted"
              >
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-foreground mb-2">
                Search Folio
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={folioSearch}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setFolioSearch(val);
                    setBillNumber("");
                    setBillError("");
                    setSelectedFolioIndex(-1);
                    if (val.length < 2) {
                      setFolioSearchResults([]);
                      setShowFolioDropdown(false);
                      return;
                    }
                    setFolioSearchLoading(true);
                    setShowFolioDropdown(true);
                    try {
                      const res = await fetch(
                        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/folio-accounts`,
                        { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } }
                      );
                      if (res.ok) {
                        const all = await res.json();
                        const q = val.toLowerCase();
                        const filtered = all.filter((f: any) =>
                          f.bill_number?.toLowerCase().includes(q) ||
                          f.customer_name?.toLowerCase().includes(q) ||
                          f.loan_account_number?.toLowerCase().includes(q)
                        ).slice(0, 8);
                        setFolioSearchResults(filtered);
                      }
                    } catch {}
                    setFolioSearchLoading(false);
                  }}
                  onKeyDown={(e) => {
                    if (!showFolioDropdown || folioSearchResults.length === 0) return;

                    switch (e.key) {
                      case 'ArrowDown':
                        e.preventDefault();
                        setSelectedFolioIndex(prev => 
                          prev < folioSearchResults.length - 1 ? prev + 1 : prev
                        );
                        break;
                      case 'ArrowUp':
                        e.preventDefault();
                        setSelectedFolioIndex(prev => prev > 0 ? prev - 1 : -1);
                        break;
                      case 'Enter':
                        e.preventDefault();
                        if (selectedFolioIndex >= 0 && selectedFolioIndex < folioSearchResults.length) {
                          const selected = folioSearchResults[selectedFolioIndex];
                          setBillNumber(selected.bill_number);
                          setFolioSearch(selected.bill_number);
                          setShowFolioDropdown(false);
                          setBillError("");
                          setSelectedFolioIndex(-1);
                        }
                        break;
                      case 'Escape':
                        e.preventDefault();
                        setShowFolioDropdown(false);
                        setSelectedFolioIndex(-1);
                        break;
                    }
                  }}
                  placeholder="Search by customer name, bill no, loan account..."
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
                  autoFocus
                />
                {showFolioDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-56 overflow-y-auto">
                    {folioSearchLoading ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground text-center">Searching...</div>
                    ) : folioSearchResults.length > 0 ? (
                      folioSearchResults.map((f: any, idx: number) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setBillNumber(f.bill_number);
                            setFolioSearch(f.bill_number);
                            setShowFolioDropdown(false);
                            setBillError("");
                            setSelectedFolioIndex(-1);
                          }}
                          className={`w-full px-4 py-2.5 text-left border-b border-border last:border-b-0 transition-colors ${
                            idx === selectedFolioIndex
                              ? 'bg-primary/20 text-foreground font-semibold'
                              : 'hover:bg-muted/60'
                          }`}
                        >
                          <div className="font-semibold text-sm text-foreground">{f.bill_number}</div>
                          <div className="text-xs text-muted-foreground">
                            {f.customer_name || '—'} · {f.loan_account_number || '—'}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-muted-foreground text-center">No folio found</div>
                    )}
                  </div>
                )}
              </div>
              {billNumber && (
                <div className="mt-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-lg text-sm font-semibold text-primary">
                  Selected: {billNumber}
                </div>
              )}
              {billError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {billError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setBillNumberModal(null);
                  setBillNumber("");
                  setBillError("");
                }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!billNumber.trim()) {
                    setBillError("Please enter a bill number");
                    return;
                  }
                  setIsMapping(true);
                  mapBillNumberToLoan.mutate({
                    loanId: billNumberModal.loanId,
                    billNumber: billNumber.trim(),
                  });
                  setIsMapping(false);
                }}
                disabled={
                  isMapping ||
                  !billNumber.trim() ||
                  mapBillNumberToLoan.isPending
                }
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {mapBillNumberToLoan.isPending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  "Map"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

