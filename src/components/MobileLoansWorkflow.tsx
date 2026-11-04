import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  ChevronRight,
  Home,
  List,
  FileText,
  User,
  Wallet,
  CreditCard,
  Shield,
  HandCoins,
  Building2,
  Car,
  ShieldCheck,
  Menu,
} from "lucide-react";
import { resolveImageUrl } from "../services/api";

export default function MobileLoansWorkflow() {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<"categories" | "lenders">("categories");

  // Fetch banks/lenders from system API
  const { data: banks = [], isLoading } = useQuery({
    queryKey: ["banks"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/banks`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("Failed to fetch banks");
      return res.json();
    },
  });

  const categories = [
    {
      id: "personal",
      name: "Personal Loan",
      icon: <User size={20} className="text-teal-600" />,
      bg: "bg-teal-50",
    },
    {
      id: "business",
      name: "Business Loan",
      icon: <HandCoins size={20} className="text-emerald-600" />,
      bg: "bg-emerald-50",
    },
    {
      id: "home",
      name: "Home",
      icon: <Home size={20} className="text-blue-600" />,
      bg: "bg-blue-50",
    },
    {
      id: "property",
      name: "Loan Against Property",
      icon: <Building2 size={20} className="text-orange-600" />,
      bg: "bg-orange-50",
    },
    {
      id: "used_car",
      name: "Used Car Loan",
      icon: <Car size={20} className="text-amber-600" />,
      bg: "bg-amber-50",
      highlighted: true,
    },
    {
      id: "new_car",
      name: "New Car Loan",
      icon: <Car size={20} className="text-sky-600" />,
      bg: "bg-sky-50",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-28 font-sans overflow-x-hidden relative">
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between px-6 pt-4 pb-4">
        <button
          onClick={() => {
            if (view === "lenders") {
              setView("categories");
            } else {
              navigate("/dashboard");
            }
          }}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-600 hover:bg-slate-50 shadow-sm border border-slate-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">
          {view === "categories" ? "Sub Category Selection" : "Used Car Loan"}
        </h1>
        <div className="w-10"></div> {/* Spacer for alignment */}
      </div>

      {/* --- VIEW 1: CATEGORIES LIST --- */}
      {view === "categories" && (
        <div className="px-6 space-y-2.5">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => {
                if (cat.id === "used_car") {
                  setView("lenders");
                } else {
                  toast.info(`${cat.name} details feature coming soon!`);
                }
              }}
              className={`py-3 px-4 bg-white rounded-xl shadow-sm flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden border-2 ${
                cat.highlighted ? "border-[#3b82f6]" : "border-transparent"
              }`}
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-800">{cat.name}</h3>
              </div>
              <div
                className={`w-10 h-10 rounded-lg ${cat.bg} flex items-center justify-center shrink-0`}
              >
                {cat.icon}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- VIEW 2: LENDERS LIST (USED CAR LOAN DETAILS) --- */}
      {view === "lenders" && (
        <div className="px-6 space-y-6">
          {/* Add New Lead Card */}
          <div
            onClick={() => navigate("/add-lead")}
            className="p-6 bg-gradient-to-br from-[#E85D04] to-[#F48C06] rounded-[24px] text-white shadow-lg shadow-orange-500/20 cursor-pointer hover:opacity-95 transition-opacity relative overflow-hidden flex items-center justify-between"
          >
            <div>
              <h2 className="text-lg font-bold mb-1">Add New Lead</h2>
              <p className="text-xs text-orange-100">
                Create a fresh Used Car Loan application
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Plus size={28} className="text-white" strokeWidth={2.5} />
            </div>
          </div>

          {/* Lenders List Heading */}
          <div>
            <h3 className="text-base font-bold text-slate-800 mb-3">
              All Lenders
            </h3>
            <p className="text-xs text-slate-500">
              Apply directly with any bank or NBFC below
            </p>
          </div>

          {/* Banks/Lenders List */}
          {isLoading ? (
            <div className="text-center text-slate-400 py-8 text-sm">
              Loading lenders...
            </div>
          ) : banks.length === 0 ? (
            <div className="text-center text-slate-400 py-8 text-sm">
              No lenders available.
            </div>
          ) : (
            <div className="space-y-3">
              {banks.map((bank: any) => (
                <div
                  key={bank.id}
                  className="p-4 bg-white rounded-[20px] shadow-sm border border-slate-100 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                      {bank.logo_url ? (
                        <img
                          src={resolveImageUrl(bank.logo_url)}
                          alt={bank.name}
                          className="w-full h-full object-contain rounded-xl"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        bank.code || bank.name.substring(0, 2)
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 leading-tight">
                        {bank.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Used Car Refinance & Purchase
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/add-lead?bankId=${bank.id}`)}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
                  >
                    Direct Apply
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
