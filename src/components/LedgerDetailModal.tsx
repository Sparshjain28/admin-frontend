import { X, Eye, Search, FileText } from "lucide-react";
import { createPortal } from "react-dom";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import FolioLedger from "@/components/FolioLedger";
import FolioCards from "@/components/FolioCards";

interface SearchResult {
  bill_number: string;
  customer_name: string;
  loan_id: number;
  loan_account_number: string;
  phone: string;
  loan_amount: number;
  amount?: number;
  maker_model?: string;
  roi?: string;
  lender_name?: string;
  bank_nbfc?: string;
  creator_name: string;
  creator_role: string;
}

interface LedgerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanDetails: any;
  viewingLedger: any;
  onApprove?: (paymentId: number, options?: { utr_no?: string; bill_number?: string }) => void;
  onReject?: (paymentId: number, remarks: string) => void;
  onBillMappingConfirm?: (paymentId: number, billNumber: string) => void;
  userRole?: string;
}

export default function LedgerDetailModal({
  isOpen,
  onClose,
  loanDetails,
  viewingLedger,
  onApprove,
  onReject,
  onBillMappingConfirm,
  userRole = "",
}: LedgerDetailModalProps) {
  // Early return - NO HOOKS before this
  if (!isOpen || !viewingLedger) return null;

  return (
    <ModalContent
      isOpen
      onClose={onClose}
      loanDetails={loanDetails}
      viewingLedger={viewingLedger}
      onApprove={onApprove}
      onReject={onReject}
      onBillMappingConfirm={onBillMappingConfirm}
      userRole={userRole}
    />
  );
}

const normalizePurposeStr = (str: string) => {
  return String(str || '')
    .toLowerCase()
    .replace(/^folio:\s*/i, '')
    .replace(/^folio_creation_request/i, '')
    .replace(/charges|charge|fee|fees|payment|request/g, '')
    .replace(/_/g, ' ')
    .trim();
};

const purposesMatch = (p1: string, p2: string) => {
  const n1 = normalizePurposeStr(p1);
  const n2 = normalizePurposeStr(p2);
  if (!n1 || !n2) return false;
  return n1 === n2 || n1.includes(n2) || n2.includes(n1);
};

function ModalContent({
  isOpen,
  onClose,
  loanDetails,
  viewingLedger,
  onReject,
  onBillMappingConfirm,
  userRole = "",
  onApprove,
}: any) {
  const [billNumber, setBillNumber] = useState("");
  const [billError, setBillError] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [selectedBill, setSelectedBill] = useState<SearchResult | null>(null);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [billDetails, setBillDetails] = useState<any>(null);
  const [isLoadingBill, setIsLoadingBill] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [enrichedLoanDetails, setEnrichedLoanDetails] = useState<any>(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [utrNo, setUtrNo] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [accountantRemarks, setAccountantRemarks] = useState('');
  const [billNumberForPayment, setBillNumberForPayment] = useState('');
  const [folioByLoan, setFolioByLoan] = useState<any>(null);
  const [loadingFolioByLoan, setLoadingFolioByLoan] = useState(false);

  const [activeDocIndex, setActiveDocIndex] = useState(0);

  // Populate inputs from saved UTR/remarks when modal opens
  useEffect(() => {
    if (viewingLedger) {
      setUtrNo(viewingLedger.utr_reference || '');
      setAdminRemarks(viewingLedger.admin_remarks || '');
      setAccountantRemarks(viewingLedger.accountant_remarks || '');
    }
  }, [viewingLedger]);
  const isBillMapping = viewingLedger?.txn_type === 'BILL_MAPPING_REQUEST' || viewingLedger?.purpose === 'REQUEST RAISED FOR BILL MAPPING';
  const loanId = viewingLedger?.loan_id || loanDetails?.loan_id;

  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unwrapApiPayload = (payload: any) =>
    payload?.data?.loan || payload?.data || payload?.loan || payload;

  const LENDER_FIELD_KEYS = [
    "lender_name",
    "bank_nbfc",
    "banker_name",
    "bank_name",
    "financier_name",
    "nbfc_name",
    "lender",
    "bank",
    "financier",
    "selected_lender",
    "lenderName",
    "bankNbfc",
    "bankerName",
    "bankName",
    "financierName",
    "name", // nested financier/bank objects
  ] as const;

  const DISBURSEMENT_DATE_KEYS = [
    "disbursement_date",
    "disbursed_date",
    "disbursementDate",
    "disbursed_at",
    "disbursal_date",
    "disbursalDate",
    "loan_disbursement_date",
    "disbursed_on",
    "disbursement_dt",
    "date_of_disbursement",
    "disbursement",
    "disbursal",
  ] as const;

  const RC_NUMBER_KEYS = [
    "rc_number",
    "vehicle_number",
    "registration_number",
    "rc_no",
    "vehicle_no",
    "reg_number",
  ] as const;

  const VEHICLE_MODEL_KEYS = [
    "maker_model",
    "vehicle_model",
    "model",
    "make_model",
    "vehicle_make_model",
    "vehicle_make",
    "make_and_model",
  ] as const;

  const isValidDisplayValue = (value: unknown) =>
    value != null && value !== "" && value !== "N/A";

  const pickField = (keys: readonly string[], ...sources: any[]) => {
    for (const source of sources) {
      if (!source || typeof source !== "object") continue;
      for (const key of keys) {
        const value = source[key];
        if (isValidDisplayValue(value)) return value;
      }
    }
    return undefined;
  };

  const collectFieldHits = (source: any, keys: readonly string[]) => {
    if (!source || typeof source !== "object") return {};
    const hits: Record<string, unknown> = {};
    keys.forEach((key) => {
      const value = source[key];
      if (value != null && value !== "") hits[key] = value;
    });
    // nested financier / bank / lender objects
    ["financier", "bank", "lender", "nbfc"].forEach((nestedKey) => {
      const nested = source[nestedKey];
      if (nested && typeof nested === "object") {
        keys.forEach((key) => {
          const value = nested[key];
          if (value != null && value !== "")
            hits[`${nestedKey}.${key}`] = value;
        });
        if (nested.name) hits[`${nestedKey}.name`] = nested.name;
      }
    });
    return hits;
  };

  const logFieldPossibilities = (
    label: string,
    ...sources: Array<{ name: string; data: any }>
  ) => {
    sources.forEach(({ name, data }) => {
      if (!data) {
        return;
      }
      if (typeof data !== "object") {
        return;
      }
    });
  };

  const pickLenderName = (...sources: any[]) => {
    for (const source of sources) {
      for (const key of LENDER_FIELD_KEYS) {
        const value = source?.[key];
        if (isValidDisplayValue(value)) return value;
      }
      for (const nestedKey of ["financier", "bank", "lender", "nbfc"]) {
        const nested = source?.[nestedKey];
        if (nested && typeof nested === "object") {
          const nestedName =
            nested.name ||
            nested.lender_name ||
            nested.bank_name ||
            nested.financier_name;
          if (isValidDisplayValue(nestedName)) return nestedName;
        }
      }
    }
    return undefined;
  };

  const pickDisbursementDate = (...sources: any[]) =>
    pickField([...DISBURSEMENT_DATE_KEYS], ...sources);

  const pickRcNumber = (...sources: any[]) =>
    pickField([...RC_NUMBER_KEYS], ...sources);

  const pickVehicleModel = (...sources: any[]) =>
    pickField([...VEHICLE_MODEL_KEYS], ...sources);

  // Fetch full loan details with ROI, tenure, lender, and disbursement date
  useEffect(() => {
    const fetchLoanId = loanDetails?.loan_id || viewingLedger?.loan_id;
    if (fetchLoanId && !enrichedLoanDetails) {
      fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/accountant/payments/case-details/${fetchLoanId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        },
      )
        .then((res) => res.json())
        .then((payload) => {
          logFieldPossibilities("case-details API — RAW response", {
            name: "raw payload",
            data: payload,
          });
          const data = unwrapApiPayload(payload);
          logFieldPossibilities(
            "case-details API — after unwrap",
            { name: "payload.data", data: payload?.data },
            { name: "payload.loan", data: payload?.loan },
            { name: "unwrapped (used)", data },
            { name: "loanDetails (prop)", data: loanDetails },
          );
          setEnrichedLoanDetails({
            ...loanDetails,
            roi:
              data.roi ||
              data.rate_of_interest ||
              data.rateOfInterest ||
              loanDetails?.roi,
            tenure:
              data.tenure ||
              data.tenure_months ||
              data.tenureMonths ||
              loanDetails?.tenure,
            banker_name: pickLenderName(data, loanDetails),
            bank_nbfc: isValidDisplayValue(data.bank_nbfc)
              ? data.bank_nbfc
              : undefined,
            lender_name: pickLenderName(data, loanDetails),
            maker_model: pickVehicleModel(data, loanDetails),
            vehicle_number: pickRcNumber(data, loanDetails),
            disbursement_date: pickDisbursementDate(data, loanDetails),
            pdd_status: data.pdd_status || loanDetails?.pdd_status,
          });
        })
        .catch((err) => {
          setEnrichedLoanDetails(loanDetails);
        });
    }
  }, [loanDetails?.loan_id, viewingLedger?.loan_id, loanDetails, enrichedLoanDetails]);

  const { data: requestWithDocument, isLoading: isLoadingRequestDoc, refetch: refetchRequestWithDocument } =
    useQuery({
      queryKey: ["bill-mapping-request-with-document", viewingLedger?.id],
      queryFn: async () => {
        if (!viewingLedger?.id) return null;
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/accountant/bill-mapping/${viewingLedger.id}/with-documents`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          },
        );
        if (!response.ok) return null;
        return await response.json();
      },
      enabled:
        isOpen &&
        (viewingLedger?.txn_type === "BILL_MAPPING_REQUEST" || viewingLedger?.purpose === "REQUEST RAISED FOR BILL MAPPING") &&
        !!viewingLedger?.id,
    });

  // Fetch all payments for this loan (to show other pending requests)
  const { data: loanPayments = [] } = useQuery({
    queryKey: ["loan-payments-ledger", loanId],
    queryFn: async () => {
      if (!loanId) return [];
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/accountant/payments?status=all&loanId=${loanId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        },
      );
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: isOpen && !!loanId,
  });
  const otherPendingRequests = loanPayments
    .filter((p: any) => p.status !== 'completed' && p.status !== 'rejected')
    .sort((a: any, b: any) => new Date(a.created_at || a.payment_date).getTime() - new Date(b.created_at || b.payment_date).getTime())
    .map((p: any) => {
      // Merge viewingLedger's UTR/remarks into matching entry so FolioLedger inputs populate
      if (viewingLedger && Number(p.id) === Number(viewingLedger.id)) {
        return {
          ...p,
          utr_reference: viewingLedger.utr_reference || p.utr_reference,
          admin_remarks: viewingLedger.admin_remarks || p.admin_remarks,
          accountant_remarks: viewingLedger.accountant_remarks || p.accountant_remarks,
        };
      }
      return p;
    });
  // Debug logs: print the modal inputs when it opens or changes
  useEffect(() => {
    if (isOpen) {
      logFieldPossibilities(
        "Modal props on open/change",
        { name: "loanDetails (prop)", data: loanDetails },
        { name: "viewingLedger", data: viewingLedger },
        { name: "enrichedLoanDetails", data: enrichedLoanDetails },
        { name: "requestWithDocument", data: requestWithDocument },
        {
          name: "requestWithDocument.loan_details",
          data: requestWithDocument?.loan_details,
        },
        { name: "requestWithDocument.loan", data: requestWithDocument?.loan },
        {
          name: "requestWithDocument.team_hierarchy",
          data: requestWithDocument?.team_hierarchy,
        },
      );
    }
  }, [
    isOpen,
    loanDetails,
    viewingLedger,
    requestWithDocument,
    enrichedLoanDetails,
  ]);

  // Fetch linked folio and its ledger entries
  useEffect(() => {
    const custName = String(loanDetails?.customer_name || loanDetails?.applicant_name || viewingLedger?.customer_name || viewingLedger?.applicant_name || '').trim().toLowerCase();
    if ((loanId || custName) && isOpen) {
      setLoadingFolioByLoan(true);
      fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/accountant/folio-accounts`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        },
      )
        .then((res) => res.json())
        .then((folios: any[]) => {
          const reqPurpose = String(viewingLedger?.purpose || viewingLedger?.txn_type || viewingLedger?.entry_type || '').trim();
          const reqAmount = parseFloat(viewingLedger?.amount || viewingLedger?.payout_amount || 0);

          const matched = folios.find((f: any) => {
            const fLoanIdMatch = loanId && f.loan_id && Number(f.loan_id) === Number(loanId);
            const fCustName = String(f.customer_name || f.mapped_customer_name || f.loan_customer_name || '').trim().toLowerCase();
            const fCustMatch = custName && fCustName && (fCustName === custName || fCustName.includes(custName) || custName.includes(fCustName));
            
            const custOrLoanMatch = fLoanIdMatch || fCustMatch;
            if (!custOrLoanMatch) return false;

            if (reqPurpose) {
              const purposeOk = purposesMatch(reqPurpose, f.purpose || f.entry_type || '');
              if (!purposeOk) return false;
            }
            if (reqAmount > 0) {
              const fAmount = parseFloat(f.amount || f.folio_amount || 0);
              const amountOk = Math.abs(reqAmount - fAmount) < 1.0;
              if (!amountOk) return false;
            }

            return true;
          });
          setFolioByLoan(matched || null);
          if (matched?.bill_number) {
            setSelectedBill(prev => prev || ({
              bill_number: matched.bill_number,
              customer_name: matched.customer_name || matched.mapped_customer_name,
              loan_id: Number(loanId || matched.loan_id || 0),
              loan_account_number: matched.loan_account_number,
              phone: matched.mapped_mobile,
              loan_amount: matched.amount || matched.folio_amount,
              creator_name: matched.mapped_created_by_name || 'System',
              creator_role: matched.mapped_created_by_role || 'Accountant',
              lender_name: matched.lender_name || matched.custom_lender_name || matched.bank_nbfc
            } as SearchResult));
            setBillDetails(prev => prev || matched);
          }
        })
        .catch(() => { setFolioByLoan(null); })
        .finally(() => setLoadingFolioByLoan(false));
    } else {
      setFolioByLoan(null);
    }
  }, [loanId, isOpen, viewingLedger, loanDetails]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    };

    if (showSearchDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSearchDropdown]);

  // Fetch bill details when selectedBill changes
  useEffect(() => {
    if (showReview && selectedBill) {
      const fetchBillDetails = async () => {
        try {
          setIsLoadingBill(true);
          const loanIdParam = selectedBill.loan_id || loanId || "";
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/accountant/folio-accounts/search?search=${encodeURIComponent(selectedBill.bill_number)}&loanId=${loanIdParam}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
              },
            },
          );

          if (response.ok) {
            const data = await response.json();
            if (data.length > 0) {
              const matched = data.find(
                (item: any) =>
                  (selectedBill.loan_id && item.loan_id === selectedBill.loan_id) ||
                  (selectedBill.customer_name && item.customer_name === selectedBill.customer_name)
              ) || data[0];
              setBillDetails(matched);
            }
          }
        } catch (error) {
        } finally {
          setIsLoadingBill(false);
        }
      };

      fetchBillDetails();
    }
  }, [showReview, selectedBill]);

  const handleSearchInput = (value: string) => {
    setBillNumber(value);
    setBillError("");
    setSelectedResultIndex(-1);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const performSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/accountant/folio-accounts/search?search=${encodeURIComponent(query)}&loanId=${loanId || ""}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        setShowSearchDropdown(true);
      }
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    setSelectedBill(result);
    setBillDetails(result);
    setBillNumber(result.bill_number);
    setShowSearchDropdown(false);
    setSearchResults([]);
    setShowReview(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSearchDropdown || searchResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedResultIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedResultIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (
          selectedResultIndex >= 0 &&
          selectedResultIndex < searchResults.length
        ) {
          handleSelectResult(searchResults[selectedResultIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSearchDropdown(false);
        setSelectedResultIndex(-1);
        break;
    }
  };

  const handleConfirm = async (remarks?: Record<string, string>) => {
    const finalAccountantRemarks = remarks?.accountant_remarks || remarks?.remarks || accountantRemarks.trim() || '';
    setIsConfirming(true);
    setBillError("");
    try {
      if (!viewingLedger?.id) throw new Error("Missing request id");
      const activeBillNumber = selectedBill?.bill_number || folioByLoan?.bill_number || viewingLedger?.bill_number || requestWithDocument?.bill_number || loanDetails?.bill_number || enrichedLoanDetails?.bill_number;
      if (!activeBillNumber)
        throw new Error("Please select a bill number");
      const loanIdParam =
        viewingLedger?.loan_id ||
        requestWithDocument?.loan_id ||
        loanDetails?.loan_id ||
        enrichedLoanDetails?.loan_id;

      // Always call backend mapping endpoint so folio links properly.
      const mapResponse = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/accountant/bill-mapping/${viewingLedger.id}/map`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
          body: JSON.stringify({
            bill_number: activeBillNumber,
            loan_id: loanIdParam,
            accountant_remarks: finalAccountantRemarks,
            admin_remarks: remarks?.admin_remarks || adminRemarks.trim() || undefined,
            ...remarks,
          }),
        },
      );

      if (!mapResponse.ok) {
        const errBody = await mapResponse.json().catch(() => null);
        throw new Error(errBody?.error || "Bill mapping failed");
      }

      // Optional: let parent also refresh its own list/state if provided.
      if (onBillMappingConfirm) {
        await Promise.resolve(
          onBillMappingConfirm(viewingLedger.id, activeBillNumber),
        );
      }

      // Refetch the request status; if it was cleared backend-side it should return null / updated status
      await refetchRequestWithDocument();

      // Reset local UI and close modal
      setShowReview(false);
      setSelectedBill(null);
      setBillDetails(null);
      setBillNumber("");
      onClose();
    } catch (e: any) {
      setBillError(e?.message || "Something went wrong");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReject = async () => {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    if (!rejectRemarks.trim()) {
      setBillError('Please enter rejection remarks');
      return;
    }
    setIsConfirming(true);
    setBillError('');
    try {
      if (!viewingLedger?.id) throw new Error('Missing request id');
      if (!onReject) throw new Error('Reject handler not configured');
      await Promise.resolve(onReject(viewingLedger.id, rejectRemarks.trim()));
      await refetchRequestWithDocument();
      onClose();
    } finally {
      setIsConfirming(false);
    }
  };

  const handleNext = () => {
    if (!billNumber.trim()) {
      setBillError("Please enter a bill number");
      return;
    }
    handleSelectResult({ bill_number: billNumber } as SearchResult);
  };

  const handleBackToSearch = () => {
    setShowReview(false);
    setSelectedBill(null);
    setBillDetails(null);
    setBillNumber("");
    setBillError("");
  };

  const handleApproveWithMapping = (paymentId: number, options?: any) => {
    const isAccountantRole = userRole === 'accountant' || (userRole || '').toLowerCase().includes('account');
    const optRemarks = options?.accountant_remarks || options?.remarks || accountantRemarks.trim();
    if (isAccountantRole && !optRemarks) {
      setBillError("Remarks are mandatory for Accountant approval");
      return;
    }
    const entry = loanPayments?.find((p: any) => Number(p.id) === Number(paymentId));
    const isEntryBillMapping = entry?.txn_type === 'BILL_MAPPING_REQUEST' || entry?.purpose === 'REQUEST RAISED FOR BILL MAPPING';
    const activeBillNumber = selectedBill?.bill_number || folioByLoan?.bill_number || viewingLedger?.bill_number || requestWithDocument?.bill_number || loanDetails?.bill_number;
    if (isEntryBillMapping) {
      if (activeBillNumber) {
        handleConfirm({ ...options, accountant_remarks: optRemarks });
      } else {
        setBillError('Please select a bill number first');
      }
    } else if (onApprove) {
      onApprove(paymentId, { ...options, accountant_remarks: optRemarks });
      onClose();
    }
  };

  const handleBottomApprove = async () => {
    const isAdmin = userRole === 'admin' || userRole === 'super_admin' || (userRole || '').toLowerCase().includes('admin');
    const finalRemarks = isAdmin ? adminRemarks.trim() : accountantRemarks.trim();
    if (isBillMapping) {
      await handleConfirm(isAdmin ? { admin_remarks: finalRemarks } : { accountant_remarks: finalRemarks });
    } else {
      setIsConfirming(true);
      setBillError("");
      try {
        const targetEntries = viewingLedger
          ? [viewingLedger]
          : (otherPendingRequests.length > 0 ? otherPendingRequests : []);
        
        if (targetEntries.length > 0) {
          for (const entry of targetEntries) {
            if (entry.id && onApprove) {
              await Promise.resolve(onApprove(entry.id, isAdmin ? { admin_remarks: finalRemarks } : { accountant_remarks: finalRemarks }));
            }
          }
        }
        onClose();
      } catch (err: any) {
        setBillError(err?.message || "Failed to approve payment");
      } finally {
        setIsConfirming(false);
      }
    }
  };

  const content = (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]"
      style={{ zIndex: 99999 }}
    >
      <div
        className="bg-card border border-border shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col overflow-hidden transition-all w-[calc(100vw-1rem)] h-[92vh] max-w-[420px] sm:max-w-[1100px] sm:h-auto sm:max-h-[100vh]"
        style={{ zIndex: 100000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-border bg-card rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2">
            <>
              <FileText className="text-primary" size={16} />
              <div>
                <h2 className="text-xs font-bold text-foreground">
                  {isBillMapping
                    ? (selectedBill ? "Folio Mapping Review" : "Folio Mapping")
                    : "Payment Approval"}
                </h2>
                {isBillMapping && (
                  <p className="text-[11px] text-muted-foreground select-text">
                    {selectedBill
                      ? `Folio: ${selectedBill.bill_number}`
                      : "Search folio number to view details"}
                  </p>
                )}
              </div>
            </>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Right Side - Search + Loan & Bill Details */}
          <div className={isBillMapping ? "flex-[1.2]" : "flex-1"} style={{ overflowY: 'auto' }}>
            <div className="flex flex-col gap-2 p-2">
              {/* Document button */}
              {/* Folio Search (only for bill mapping) */}
              {isBillMapping && (
                <div ref={dropdownRef} className="relative z-[100]">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                      type="text"
                      value={billNumber}
                      onChange={(e) => handleSearchInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => billNumber && setShowSearchDropdown(true)}
                      placeholder="Search folio number..."
                      className="w-full pl-9 px-2.5 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground text-xs"
                    />
                    {isSearching && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        <div className="animate-spin w-3.5 h-3.5 border-[1.5px] border-primary/20 border-t-primary rounded-full"></div>
                      </div>
                    )}
                  </div>
                  {billError && (
                    <p className="text-[11px] text-red-600 mt-1">{billError}</p>
                  )}
                </div>
              )}

              {/* Loan Details */}
              {(() => {
                const requestLoanDetails = unwrapApiPayload(
                  requestWithDocument?.loan_details ||
                  requestWithDocument?.loan ||
                  {},
                );
                const finalLoanDetails =
                  enrichedLoanDetails || loanDetails || requestLoanDetails || {};
                const teamHierarchy = requestWithDocument?.team_hierarchy || {};
                const loanSources = [
                  finalLoanDetails,
                  requestLoanDetails,
                  loanDetails,
                  requestWithDocument,
                  viewingLedger,
                ];

                const displayLoan = {
                  // From folio (primary source, mapped_* then raw), fallback to viewingLedger and billDetails
                  loan_number: folioByLoan?.loan_number || finalLoanDetails?.loan_number || requestWithDocument?.loan_number || viewingLedger?.loan_number || billDetails?.bill_number,
                  loan_account_number: folioByLoan?.loan_account_number || finalLoanDetails?.loan_account_number || requestWithDocument?.loan_account_number || viewingLedger?.loan_account_number || billDetails?.loan_account_number,
                  customer_name: folioByLoan?.customer_name || folioByLoan?.mapped_customer_name || finalLoanDetails?.customer_name || finalLoanDetails?.applicant_name || requestWithDocument?.customer_name || requestWithDocument?.applicant_name || viewingLedger?.customer_name || viewingLedger?.applicant_name || billDetails?.customer_name,
                  applicant_name: finalLoanDetails?.applicant_name || requestWithDocument?.applicant_name || viewingLedger?.applicant_name || viewingLedger?.customer_name || billDetails?.customer_name,
                  loan_customer_name: finalLoanDetails?.loan_customer_name || requestWithDocument?.customer_name || viewingLedger?.customer_name || billDetails?.customer_name,
                  mobile: folioByLoan?.mobile || folioByLoan?.mapped_mobile || finalLoanDetails?.mobile || finalLoanDetails?.mobile_number || requestWithDocument?.mobile || requestWithDocument?.phone || viewingLedger?.mobile || viewingLedger?.phone || billDetails?.phone,
                  mobile_number: finalLoanDetails?.mobile_number || requestWithDocument?.mobile || viewingLedger?.mobile || billDetails?.phone,
                  phone: finalLoanDetails?.phone || requestWithDocument?.phone || viewingLedger?.phone || billDetails?.phone,
                  loan_amount: folioByLoan?.loan_amount || folioByLoan?.mapped_loan_amount || finalLoanDetails?.loan_amount || finalLoanDetails?.amount || requestWithDocument?.loan_amount || requestWithDocument?.amount || requestWithDocument?.payout_amount || viewingLedger?.loan_amount || viewingLedger?.amount || viewingLedger?.payout_amount || billDetails?.loan_amount || billDetails?.amount,
                  amount: folioByLoan?.amount || folioByLoan?.folio_amount || finalLoanDetails?.amount || viewingLedger?.amount || viewingLedger?.payout_amount || billDetails?.amount,
                  disbursed_amount: viewingLedger?.payout_amount || requestWithDocument?.payout_amount || 0,
                  rc_number: folioByLoan?.vehicle_number || pickRcNumber(...loanSources) || viewingLedger?.vehicle_number || billDetails?.vehicle_number,
                  vehicle_number: folioByLoan?.vehicle_number || pickRcNumber(...loanSources) || viewingLedger?.vehicle_number || billDetails?.vehicle_number,
                  maker_model: folioByLoan?.maker_model || folioByLoan?.mapped_maker_model || pickVehicleModel(...loanSources) || viewingLedger?.maker_model || [viewingLedger?.maker_name, viewingLedger?.maker_model].filter(Boolean).join(' ') || billDetails?.maker_model,
                  vehicle_model: folioByLoan?.maker_model || pickVehicleModel(...loanSources) || viewingLedger?.maker_model || billDetails?.maker_model,
                  lender_name: requestWithDocument?.bank_nbfc || folioByLoan?.bank_nbfc || folioByLoan?.lender_name || pickLenderName(...loanSources) || viewingLedger?.lender_name || viewingLedger?.bank_nbfc || billDetails?.lender_name || billDetails?.bank_nbfc,
                  bank_nbfc: requestWithDocument?.bank_nbfc || folioByLoan?.bank_nbfc || folioByLoan?.lender_name || pickLenderName(...loanSources) || viewingLedger?.lender_name || viewingLedger?.bank_nbfc || billDetails?.lender_name || billDetails?.bank_nbfc,
                  disbursement_date: requestWithDocument?.disbursement_date || folioByLoan?.disbursement_date || folioByLoan?.mapped_disbursement_date || pickDisbursementDate(...loanSources) || finalLoanDetails?.disbursement_date || viewingLedger?.disbursement_date || viewingLedger?.created_at || billDetails?.disbursement_date,
                  pdd_status: folioByLoan?.pdd_status || folioByLoan?.mapped_pdd_status || pickField(["pdd_status"], ...loanSources) || finalLoanDetails?.pdd_status || viewingLedger?.pdd_status || billDetails?.pdd_status,
                  request_id: requestWithDocument?.request_id || viewingLedger?.request_id,

                  // From team_hierarchy (nested in requestWithDocument), prefer folio data or viewingLedger fallback
                  created_by_name: folioByLoan?.mapped_created_by_name || folioByLoan?.created_by_name || teamHierarchy?.created_by_name || requestWithDocument?.raised_by_name || viewingLedger?.created_by_name || viewingLedger?.user_name || viewingLedger?.initiator_name || billDetails?.creator_name || billDetails?.creator_user_name,
                  created_by_role: folioByLoan?.mapped_created_by_role || folioByLoan?.created_by_role || teamHierarchy?.created_by_role || requestWithDocument?.raised_by_role || viewingLedger?.created_by_role || viewingLedger?.user_role || billDetails?.creator_role,
                  team_leader_name: folioByLoan?.mapped_team_leader_name || folioByLoan?.team_leader_name || teamHierarchy?.team_leader_name || viewingLedger?.team_leader_name,
                  team_leader_role: folioByLoan?.mapped_team_leader_role || teamHierarchy?.team_leader_role || viewingLedger?.team_leader_role,
                  branch_manager_name: folioByLoan?.mapped_branch_manager_name || folioByLoan?.branch_dsa_manager_name || folioByLoan?.branch_manager_name || teamHierarchy?.branch_manager_name || viewingLedger?.branch_manager_name || viewingLedger?.branch_dsa_manager_name,
                  branch_manager_role: folioByLoan?.mapped_branch_manager_role || teamHierarchy?.branch_manager_role || viewingLedger?.branch_manager_role,
                  senior_manager_name: folioByLoan?.mapped_senior_manager_name || folioByLoan?.sales_manager_name || folioByLoan?.senior_manager_name || teamHierarchy?.senior_manager_name || viewingLedger?.senior_manager_name || viewingLedger?.sales_manager_name,
                  senior_manager_role: folioByLoan?.mapped_senior_manager_role || teamHierarchy?.senior_manager_role || viewingLedger?.senior_manager_role,

                  // Hierarchy array built from backend recursive CTE (walking report_to chain)
                  hierarchy: (() => {
                    const th = teamHierarchy || requestWithDocument?.team_hierarchy || {};
                    // Folio search API returns hierarchy as a direct array
                    if (folioByLoan?.hierarchy && folioByLoan.hierarchy.length > 0) {
                      return folioByLoan.hierarchy;
                    }
                    // Payment request API returns hierarchy in .rows (or as direct array on team_hierarchy)
                    if (th.rows && th.rows.length > 0) {
                      return th.rows.map((r: any) => ({ person_name: r.person_name, role: r.role }));
                    }
                    // Try direct hierarchy array on team_hierarchy
                    if (Array.isArray(th) && th.length > 0) {
                      return th;
                    }
                    return undefined;
                  })(),

                  // From enriched loan details
                  roi: folioByLoan?.roi || folioByLoan?.mapped_roi || finalLoanDetails?.roi || viewingLedger?.roi || billDetails?.roi || "-",
                  tenure: folioByLoan?.tenure || folioByLoan?.mapped_tenure || finalLoanDetails?.tenure || viewingLedger?.tenure || billDetails?.tenure || "-",
                };

                return (
                  <div className="space-y-2 animate-fadeIn">
                    {(() => {
                      const ROLE_LABELS: Record<string, string> = {
                        executive: 'Executive',
                        team_leader: 'Team Leader',
                        branch_manager: 'Branch Manager',
                        senior_manager: 'Sales Manager',
                        sales_manager: 'Sales Manager',
                        admin: 'Admin',
                        accountant: 'Accountant',
                        operation_team: 'Operations',
                        ops_team: 'Operations',
                        manager: 'Manager',
                        dsa: 'DSA',
                        bm: 'Branch Manager',
                        tl: 'Team Leader',
                      };
                      const hier: Array<{ name: string, role: string }> = [];
                      if (displayLoan?.created_by_name) {
                        hier.push({ name: displayLoan.created_by_name, role: ROLE_LABELS[displayLoan.created_by_role] || displayLoan.created_by_role || 'Executive' });
                      }
                      // From hierarchy array (full chain from backend recursive CTE)
                      if (displayLoan?.hierarchy?.length) {
                        displayLoan.hierarchy.forEach((h: any) => {
                          const label = ROLE_LABELS[h.role] || h.role || '';
                          hier.push({ name: h.person_name, role: label });
                        });
                      }
                      // Fallback to flat hierarchy fields (for regular payments where folioByLoan has mapped_* data)
                      if (displayLoan?.team_leader_name) {
                        const exists = hier.some(h => h.name === displayLoan.team_leader_name);
                        if (!exists) hier.push({ name: displayLoan.team_leader_name, role: ROLE_LABELS[displayLoan.team_leader_role] || displayLoan.team_leader_role || 'Team Leader' });
                      }
                      if (displayLoan?.branch_manager_name) {
                        const exists = hier.some(h => h.name === displayLoan.branch_manager_name);
                        if (!exists) hier.push({ name: displayLoan.branch_manager_name, role: ROLE_LABELS[displayLoan.branch_manager_role] || displayLoan.branch_manager_role || 'Branch Manager' });
                      }
                      if (displayLoan?.senior_manager_name) {
                        const exists = hier.some(h => h.name === displayLoan.senior_manager_name);
                        if (!exists) hier.push({ name: displayLoan.senior_manager_name, role: ROLE_LABELS[displayLoan.senior_manager_role] || displayLoan.senior_manager_role || 'Sales Manager' });
                      }
                      const pddDays = displayLoan?.disbursement_date
                        ? (() => { const d = Math.floor((Date.now() - new Date(displayLoan.disbursement_date).getTime()) / 86400000); return d >= 0 ? `${d} days` : '-'; })()
                        : '-';
                      return (
                        <FolioCards
                          customerName={displayLoan?.customer_name || displayLoan?.applicant_name || displayLoan?.loan_customer_name || '-'}
                          mobile={displayLoan?.mobile || displayLoan?.mobile_number || displayLoan?.phone || '-'}
                          disbursementDate={displayLoan?.disbursement_date ? new Date(displayLoan.disbursement_date).toLocaleDateString('en-IN') : '-'}
                          pddDays={pddDays}
                          pddStatus={displayLoan?.pdd_status || '-'}
                          vehicleNumber={displayLoan?.vehicle_number || displayLoan?.rc_number || '-'}
                          vehicleModel={displayLoan?.maker_model || displayLoan?.vehicle_model || '-'}
                          lenderBank={displayLoan?.lender_name || displayLoan?.bank_nbfc || '-'}
                          loanAmount={'₹' + Number(displayLoan?.loan_amount || displayLoan?.amount || 0).toLocaleString('en-IN')}
                          roi={displayLoan?.roi}
                          tenure={displayLoan?.tenure}
                          hierarchy={hier as Array<{ role: string; name: string }>}
                          documentUrl={requestWithDocument?.documents?.[0] ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${requestWithDocument.documents[0].file_path}` : undefined}
                        />
                      );
                    })()}
                  </div>
                );
              })()}

              {/* Documents from request */}
              {requestWithDocument?.documents?.length > 0 && (
                <div className="bg-card rounded-xl border border-border/50 p-2">
                  <div className="flex items-center gap-2">
                    {requestWithDocument.documents.filter((d: any) => d.field_name === 'qr_upload').map((doc: any) => (
                      <a key={doc.id} href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${doc.file_path}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[9px] font-semibold rounded border border-blue-600/20 transition-colors">
                        Uploaded QR
                      </a>
                    ))}
                    {requestWithDocument.documents.filter((d: any) => d.field_name !== 'qr_upload').map((doc: any) => (
                      <a key={doc.id} href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${doc.file_path}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[9px] font-semibold rounded border border-blue-600/20 transition-colors">
                        {isBillMapping ? 'View Document' : 'Payment Proof'}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Bill Details / Linked Folio */}
              {isBillMapping ? (
                // BILL MAPPING: show folio search & selection
                <>
                  {isLoadingBill ? (
                    <div className="bg-muted/30 rounded-xl border border-border/50 p-2 flex items-center justify-center h-36">
                      <div className="animate-spin w-3.5 h-3.5 border-[1.5px] border-primary/20 border-t-primary rounded-full"></div>
                    </div>
                  ) : billDetails ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      <div className="bg-card p-1.5 rounded-lg border border-border shadow-sm">
                        <div className="space-y-[1px]">
                          <div className="flex items-center text-[10px]">
                            <span className="text-muted-foreground text-[8px] uppercase font-semibold w-[55px] shrink-0">Folio No</span>
                            <span className="text-muted-foreground text-[8px] w-[8px] shrink-0 text-center">:</span>
                            <span className="font-semibold text-foreground truncate text-[10px]">{billDetails.bill_number || "-"}</span>
                          </div>
                          <div className="flex items-center text-[10px]">
                            <span className="text-muted-foreground text-[8px] uppercase font-semibold w-[55px] shrink-0">Customer</span>
                            <span className="text-muted-foreground text-[8px] w-[8px] shrink-0 text-center">:</span>
                            <span className="font-semibold text-foreground truncate text-[10px]">{billDetails.customer_name || "-"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-card p-1.5 rounded-lg border border-border shadow-sm">
                        <div className="space-y-[1px]">
                          <div className="flex items-center text-[10px]">
                            <span className="text-muted-foreground text-[8px] uppercase font-semibold w-[55px] shrink-0">Lender</span>
                            <span className="text-muted-foreground text-[8px] w-[8px] shrink-0 text-center">:</span>
                            <span className="font-semibold text-foreground truncate text-[10px]">{billDetails.lender_name || billDetails.bank_nbfc || "-"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-card p-1.5 rounded-lg border border-border shadow-sm">
                        <div className="space-y-[1px]">
                          <div className="flex items-center text-[10px]">
                            <span className="text-muted-foreground text-[8px] uppercase font-semibold w-[55px] shrink-0">Purpose</span>
                            <span className="text-muted-foreground text-[8px] w-[8px] shrink-0 text-center">:</span>
                            <span className="font-semibold text-foreground truncate text-[10px]">{billDetails.purpose || "-"}</span>
                          </div>
                          <div className="flex items-center text-[10px]">
                            <span className="text-muted-foreground text-[8px] uppercase font-semibold w-[55px] shrink-0">Sanctioned</span>
                            <span className="text-muted-foreground text-[8px] w-[8px] shrink-0 text-center">:</span>
                            <span className="font-bold text-green-700 dark:text-green-300 truncate text-[10px]">₹{Number(billDetails.amount || billDetails.opening_balance || billDetails.loan_amount || 0).toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/30 rounded-xl border border-border/50 p-2 flex items-center justify-center h-36">
                      <p className="text-[12px] text-muted-foreground">
                        Search bill number to view folio details.
                      </p>
                    </div>
                  )}

                  {!folioByLoan && (userRole === 'accountant' || (userRole || '').toLowerCase().includes('account') || userRole === 'admin') && (
                    <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-medium flex items-center gap-2">
                      <span className="text-base">⚠️</span>
                      <span>Make a folio first to accept</span>
                    </div>
                  )}

                  {/* Folio Ledger (show pending requests for both bill mapping and regular) */}
                  {folioByLoan && (
                    <div className="mt-3 pt-3">
                      <FolioLedger
                        folioId={folioByLoan.id?.toString()}
                        folioAmount={folioByLoan.folio_amount || folioByLoan.amount}
                        customerName={folioByLoan.customer_name || folioByLoan.mapped_customer_name || 'N/A'}
                        customerPhone={folioByLoan.mapped_mobile || '-'}
                        lenderName={folioByLoan.lender_name || folioByLoan.custom_lender_name || folioByLoan.bank_nbfc || '-'}
                        extraEntries={otherPendingRequests}
                        activeRequestId={viewingLedger?.id}
                        activePurpose={viewingLedger?.purpose || viewingLedger?.txn_type}
                        userRole={userRole}
                        onApprove={handleApproveWithMapping}
                        onReject={onReject}
                        onClose={onClose}
                        hideReceivePayment={true}
                      />
                    </div>
                  )}
                  {!folioByLoan && otherPendingRequests.length > 0 && (
                    <div className="mt-3 pt-3">
                      <FolioLedger
                        extraEntries={otherPendingRequests}
                        activeRequestId={viewingLedger?.id}
                        activePurpose={viewingLedger?.purpose || viewingLedger?.txn_type}
                        lenderName="-"
                        userRole={userRole}
                        onApprove={handleApproveWithMapping}
                        onReject={onReject}
                        onClose={onClose}
                        hideReceivePayment={true}
                      />
                    </div>
                  )}
                </>
              ) : (
                // REGULAR PAYMENT: show account details from payment request
                <div >
                  <div>


                    {/* Folio Ledger */}
                    {folioByLoan && (
                      <div className="  ">
                        <FolioLedger
                          folioId={folioByLoan.id?.toString()}
                          folioAmount={folioByLoan.folio_amount || folioByLoan.amount}
                          customerName={folioByLoan.customer_name || folioByLoan.mapped_customer_name || 'N/A'}
                          customerPhone={folioByLoan.mapped_mobile || '-'}
                          lenderName={folioByLoan.lender_name || folioByLoan.custom_lender_name || folioByLoan.bank_nbfc || '-'}
                          extraEntries={otherPendingRequests}
                          activeRequestId={viewingLedger?.id}
                          activePurpose={viewingLedger?.purpose || viewingLedger?.txn_type}
                          userRole={userRole}
                          onApprove={handleApproveWithMapping}
                          onReject={onReject}
                          onClose={onClose}
                          hideReceivePayment={true}
                        />
                      </div>
                    )}
                    {!folioByLoan && otherPendingRequests.length > 0 && (
                      <div className="mt-3 pt-3">
                        <FolioLedger
                          extraEntries={otherPendingRequests}
                          activeRequestId={viewingLedger?.id}
                          activePurpose={viewingLedger?.purpose || viewingLedger?.txn_type}
                          lenderName="-"
                          userRole={userRole}
                          onApprove={handleApproveWithMapping}
                          onReject={onReject}
                          onClose={onClose}
                          hideReceivePayment={true}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-2 bg-gradient-to-r from-muted/40 to-muted/20 rounded-b-2xl shrink-0 flex items-center justify-between gap-2">
          {billError && (
            <span className="text-[10px] text-red-500 font-semibold flex-1">{billError}</span>
          )}
          <div className="flex gap-1.5 justify-end shrink-0 ml-auto">
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-[11px] font-semibold rounded-lg border border-border"
            >
              Close
            </button>
            <button
              onClick={handleReject}
              disabled={isConfirming}
              className="px-2.5 py-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[11px] font-semibold rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-all border border-red-300 dark:border-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConfirming ? "Rejecting..." : "Reject"}
            </button>
            <button
              onClick={handleBottomApprove}
              disabled={isConfirming}
              className="px-2.5 py-1.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-[11px] font-semibold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConfirming ? "Approving..." : "Approve"}
            </button>
          </div>
        </div>

        {/* Dropdown Portal */}
        {showSearchDropdown &&
          searchResults.length > 0 &&
          !showReview &&
          createPortal(
            <div
              style={{
                position: "fixed",
                top: dropdownRef.current?.getBoundingClientRect().bottom || 0,
                left: dropdownRef.current?.getBoundingClientRect().left || 0,
                width:
                  dropdownRef.current?.getBoundingClientRect().width || "auto",
                zIndex: 999999,
              }}
              className="bg-background border border-border rounded-lg shadow-xl max-h-96 overflow-y-auto"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelectResult(result);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/30 cursor-pointer transition-colors hover:bg-muted/50 focus:outline-none ${selectedResultIndex === idx ? "bg-primary/20" : ""}`}
                >
                  <div className="text-xs select-text">

                    <p className="text-[10px] text-foreground flex gap-4 flex-wrap"> <span className="font-semibold text-foreground mb-1">Bill: {result.bill_number}</span><span className="text-muted-foreground">Customer:</span> <span>{result.customer_name || "-"}</span> <span className="text-muted-foreground">Lender:</span> <span>{result.lender_name || "-"}</span> <span className="text-muted-foreground">Amount:</span> <span className="font-bold text-green-600 dark:text-green-400">₹{Number(result.loan_amount || result.amount || 0).toLocaleString("en-IN")}</span></p>
                  </div>
                </button>
              ))}
            </div>,
            document.body,
          )}


      </div>
    </div>
  );

  return createPortal(content, document.body);
}

