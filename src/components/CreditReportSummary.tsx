import React, { useMemo, useEffect, useState } from 'react';
import { ChevronLeft, CheckCircle, Loader2, Car, TrendingUp, CreditCard, Shield, AlertCircle } from 'lucide-react';

interface Props {
  rcData: any;
  fullReport: any;
  creditScore: number;
  selectedLoanId: string;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const AUTO_LOAN_TYPES = [
  'Used Car Loan', 'Auto Loan', 'Auto Loan (Personal)', 'Two Wheeler Loan', 'Two-Wheeler Loan',
  'Commercial Vehicle Loan', 'Tractor Loan', 'Construction Equipment Loan'
];

const CREDIT_CARD_TYPES = [
  'Credit Card', 'Kisan Credit Card', 'Corporate Credit Card', 'Charge Card'
];

const SECURED_LOAN_TYPES = [
  'Home Loan', 'Loan Against Property', 'Gold Loan', 'Property Loan', 'Housing Loan',
  'Microfinance Housing Loan', 'Loan Against Bank Deposits', 'Business Loan - Secured',
  'Priority Sector Gold Loan', 'Pradhan Mantri Awas Yojana - CLSS',
  'Business Loan Priority Sector  Agriculture'
];

const parseDate = (dateStr: string) => {
  if (!dateStr) return null;
  const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
  if (parts.length === 3) {
    if (parts[2].length === 4) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  return null;
};

export default function CreditReportSummary({ rcData, fullReport, creditScore, selectedLoanId, onBack, onNext }: any) {

  const metrics = useMemo(() => {
    const accounts = fullReport?.accounts || [];
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    let securedNew = 0, unsecuredNew = 0, autoNew = 0, ccNew = 0;
    let securedNewAmt = 0, unsecuredNewAmt = 0, autoNewAmt = 0, ccNewAmt = 0;
    let totalOutstanding = 0, totalActive = 0, totalEMI = 0, maxSanctioned = 0;
    let overdueCount = 0, totalOverdueAmount = 0, dpd6mCount = 0;

    const securedLoans: any[] = [];
    const unsecuredLoans: any[] = [];
    const autoLoansList: any[] = [];
    const ccLoans: any[] = [];
    let selectedAutoLoan = null;

    accounts.forEach((acc: any) => {
      const type = (acc.account_type || '').toLowerCase().trim();
      const isAuto = AUTO_LOAN_TYPES.some(t => t.toLowerCase() === type);
      const isCC = CREDIT_CARD_TYPES.some(t => t.toLowerCase() === type);
      const isSecured = SECURED_LOAN_TYPES.some(t => t.toLowerCase() === type);
      
      const openDate = parseDate(acc.open_date);
      if (openDate && openDate >= threeMonthsAgo) {
        if (isAuto) { autoNew++; autoNewAmt += acc.sanctioned_amount || 0; }
        else if (isCC) { ccNew++; ccNewAmt += acc.sanctioned_amount || 0; }
        else if (isSecured) { securedNew++; securedNewAmt += acc.sanctioned_amount || 0; }
        else { unsecuredNew++; unsecuredNewAmt += acc.sanctioned_amount || 0; }
      }

      // Always add auto loans to the list (active + closed)
      if (isAuto) autoLoansList.push(acc);

      const isActive = acc.account_status !== 'Closed';

      if (isActive) {
        if (isCC) ccLoans.push(acc);
        else if (isSecured) securedLoans.push(acc);
        else if (!isAuto) unsecuredLoans.push(acc);
        
        totalOutstanding += acc.current_balance || 0;
        totalActive++;
        totalEMI += acc.emi_amount || 0;
        if (acc.amount_overdue > 0) {
          overdueCount++;
          totalOverdueAmount += acc.amount_overdue;
        }
      }

      if (acc.account_number === selectedLoanId) {
        selectedAutoLoan = acc;
      }

      if (acc.sanctioned_amount > maxSanctioned) maxSanctioned = acc.sanctioned_amount;

      // Check DPD in last 6m
      const hist = acc.payment_history || [];
      const recentHist = [...hist].sort((a, b) => (b.year - a.year) || (b.month - a.month)).slice(0, 6);
      if (recentHist.some(h => h.days_past_due > 0)) {
        dpd6mCount++;
      }
    });

    // Sort carousels by open date descending
    securedLoans.sort((a, b) => (parseDate(b.open_date)?.getTime() || 0) - (parseDate(a.open_date)?.getTime() || 0));
    unsecuredLoans.sort((a, b) => (parseDate(b.open_date)?.getTime() || 0) - (parseDate(a.open_date)?.getTime() || 0));
    autoLoansList.sort((a, b) => (parseDate(b.open_date)?.getTime() || 0) - (parseDate(a.open_date)?.getTime() || 0));
    ccLoans.sort((a, b) => (parseDate(b.open_date)?.getTime() || 0) - (parseDate(a.open_date)?.getTime() || 0));

    return {
      securedNew, unsecuredNew, autoNew, ccNew,
      securedNewAmt, unsecuredNewAmt, autoNewAmt, ccNewAmt,
      totalOutstanding, totalActive, totalEMI, maxSanctioned,
      overdueCount, totalOverdueAmount, dpd6mCount,
      securedLoans, unsecuredLoans, autoLoansList, ccLoans, selectedAutoLoan
    };
  }, [fullReport, selectedLoanId]);

  const { selectedAutoLoan: _selected } = metrics;
  // If no specific loan selected, default to first auto loan in the list
  const selectedAutoLoan = _selected || (metrics.autoLoansList.length > 0 ? metrics.autoLoansList[0] : null);
  const recentHist = selectedAutoLoan ? [...(selectedAutoLoan.payment_history || [])].sort((a, b) => (b.year - a.year) || (b.month - a.month)).reverse() : [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const formatINRCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const getScoreColor = (score: number) => {
    if (score >= 750) return '#22c55e'; // green
    if (score >= 650) return '#eab308'; // yellow
    if (score >= 550) return '#f97316'; // orange
    return '#ef4444'; // red
  };
  const scoreColor = getScoreColor(creditScore);
  const scoreRotation = Math.min(Math.max((creditScore - 300) / 600 * 180, 0), 180);

  const LoanCard = ({ acc }: { acc: any }) => {
    const hist = [...(acc.payment_history || [])].sort((a, b) => (b.year - a.year) || (b.month - a.month)).slice(0, 6).reverse();
    return (
      <div className="min-w-[280px] bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 mr-4 flex-shrink-0">
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1">{acc.subscriber_name || 'Unknown Bank'}</h4>
        <div className="flex justify-between text-xs text-slate-500 mb-3">
          <span>{acc.account_type || 'Loan'}</span>
          <span>{acc.open_date || 'N/A'}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <div className="text-[10px] text-slate-400">Sanctioned</div>
            <div className="font-semibold text-xs">{formatINRCurrency(acc.sanctioned_amount)}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Outstanding</div>
            <div className="font-semibold text-xs text-blue-600">{formatINRCurrency(acc.current_balance)}</div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2 mb-1">
          <span className="text-[10px] font-bold text-slate-500">DPD Status (Last 6 Months)</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {hist.map((h, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm ${h.days_past_due > 0 ? 'bg-red-500' : 'bg-emerald-500'}`}>
                {h.days_past_due}
              </div>
              <span className="text-[8px] text-slate-400 mt-1">{monthNames[h.month - 1]}</span>
            </div>
          ))}
          {hist.length === 0 && <span className="text-[10px] text-slate-400 italic">No history</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Header */}
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center mr-3 hover:bg-blue-200 transition">
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="bg-gradient-to-br from-[#f8f9ff] to-[#fff5f2] dark:from-slate-900 dark:to-slate-900 rounded-3xl p-4 sm:p-6 shadow-xl border border-white/50 dark:border-slate-800 space-y-6">
        
        {/* Vehicle Info Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-32 h-20 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
            <Car size={40} className="text-slate-400" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">{rcData?.maker_name || ''} {rcData?.model_name || 'Vehicle Info'}</h3>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded shadow-sm">{rcData?.rc_number || rcData?.full_rc_data?.rc_number || 'N/A'}</span>
              <span className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded shadow-sm">
                {rcData?.full_rc_data?.fuel_type ? rcData.full_rc_data.fuel_type[0] : 'E'}. {rcData?.full_rc_data?.cubic_capacity ? (parseFloat(rcData.full_rc_data.cubic_capacity)/1000).toFixed(1) : '1.5'} {rcData?.full_rc_data?.manufacturing_date_formatted?.split('-')[0] || new Date().getFullYear()}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Score & New Accounts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Credit Score Gauge */}
          <div className="bg-[#eef2ff] dark:bg-slate-800 rounded-2xl p-5 border border-blue-100 dark:border-slate-700 flex flex-col items-center relative overflow-hidden">
            <h4 className="text-xs font-bold text-slate-500 w-full mb-4">Credit Score</h4>
            <div className="relative w-48 h-28 mt-2 flex flex-col items-center">
              <svg viewBox="0 -5 100 65" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="40%" stopColor="#f97316" />
                    <stop offset="60%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
                  </filter>
                </defs>
                {/* Background Track */}
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-200 dark:text-slate-700" strokeLinecap="round" />
                {/* Active Track */}
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#scoreGradient)" strokeWidth="10" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * Math.min(Math.max((creditScore - 300) / 600, 0), 1))} className="transition-all duration-1000 ease-out" strokeLinecap="round" filter="url(#shadow)" />
                {/* Needle */}
                <g style={{ transform: `rotate(${Math.min(Math.max((creditScore - 300) / 600 * 180, 0), 180) - 90}deg)`, transformOrigin: '50px 50px', transition: 'transform 1.5s cubic-bezier(0.22, 1, 0.36, 1)' }}>
                  <polygon points="48.5,50 50,15 51.5,50" className="fill-slate-800 dark:fill-white" />
                  <circle cx="50" cy="50" r="4" className="fill-slate-800 dark:fill-white" />
                  <circle cx="50" cy="50" r="1.5" className="fill-white dark:fill-slate-800" />
                </g>
              </svg>
              <div className="absolute top-[85px] left-0 right-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[28px] font-black drop-shadow-sm" style={{ color: scoreColor }}>{creditScore || 0}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{creditScore >= 750 ? 'Excellent' : creditScore >= 650 ? 'Good' : creditScore >= 550 ? 'Fair' : 'Poor'}</span>
              </div>
            </div>
            <div className="w-full flex justify-between mt-2 px-4 text-[10px] font-bold text-slate-400">
              <span>300</span>
              <span>900</span>
            </div>
          </div>

          {/* New Accounts */}
          <div className="bg-[#f0f9ff] dark:bg-slate-800 rounded-2xl p-5 border border-blue-100 dark:border-slate-700">
            <h4 className="text-xs font-bold text-slate-500 mb-4">New Accounts <span className="font-normal">(Last 3m)</span></h4>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-blue-200 dark:border-slate-700 pb-2">
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Secured</div>
                <div className="text-right">
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-none">{metrics.securedNew} <span className="text-[10px] text-slate-400 font-normal">a/c</span></div>
                  <div className="text-xs font-semibold text-blue-600 mt-1">{formatINRCurrency(metrics.securedNewAmt)}</div>
                </div>
              </div>
              <div className="flex justify-between items-end border-b border-blue-200 dark:border-slate-700 pb-2">
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Unsecured</div>
                <div className="text-right">
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-none">{metrics.unsecuredNew} <span className="text-[10px] text-slate-400 font-normal">a/c</span></div>
                  <div className="text-xs font-semibold text-blue-600 mt-1">{formatINRCurrency(metrics.unsecuredNewAmt)}</div>
                </div>
              </div>
              <div className="flex justify-between items-end border-b border-blue-200 dark:border-slate-700 pb-2">
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Credit Cards</div>
                <div className="text-right">
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-none">{metrics.ccNew} <span className="text-[10px] text-slate-400 font-normal">a/c</span></div>
                  <div className="text-xs font-semibold text-blue-600 mt-1">{formatINRCurrency(metrics.ccNewAmt)}</div>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Auto</div>
                <div className="text-right">
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-none">{metrics.autoNew} <span className="text-[10px] text-slate-400 font-normal">a/c</span></div>
                  <div className="text-xs font-semibold text-blue-600 mt-1">{formatINRCurrency(metrics.autoNewAmt)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auto Loan Summary */}
        <div className="bg-[#eef2ff] dark:bg-slate-800 rounded-2xl p-5 border border-blue-100 dark:border-slate-700">
          <h4 className="text-xs font-bold text-slate-500 mb-4">Auto Loan Summary {selectedAutoLoan ? `(${selectedAutoLoan.subscriber_name})` : ''}</h4>
          
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-6">
            <div>
              <div className="text-[10px] text-slate-500 mb-1">Sanctioned Amount</div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedAutoLoan ? formatINRCurrency(selectedAutoLoan.sanctioned_amount) : '-'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 mb-1">Principal Outstanding</div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedAutoLoan ? formatINRCurrency(selectedAutoLoan.current_balance) : '-'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 mb-1">Date Of A/C Open</div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedAutoLoan ? selectedAutoLoan.open_date : '-'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 mb-1">Over Due Amount</div>
              <div className="text-sm font-bold text-red-500">{selectedAutoLoan ? formatINRCurrency(selectedAutoLoan.amount_overdue) : '-'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 mb-1">EMI Amount</div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedAutoLoan ? formatINRCurrency(selectedAutoLoan.emi_amount) : '-'}</div>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-500 mb-2">Loan DPD</div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-blue-200">
              {recentHist.length > 0 ? recentHist.map((h, i) => (
                <div key={i} className="flex flex-col items-center flex-shrink-0 min-w-[36px]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${h.days_past_due > 0 ? 'bg-red-500' : 'bg-[#7cd036]'}`}>
                    {h.days_past_due}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 font-medium whitespace-nowrap">{monthNames[h.month - 1]} '{String(h.year).slice(2)}</span>
                </div>
              )) : (
                <span className="text-xs text-slate-400 italic">No DPD history found</span>
              )}
            </div>
          </div>
        </div>


        {/* Auto Loans Carousel */}
        <div className="bg-[#eef2ff] dark:bg-slate-800 rounded-2xl p-5 border border-blue-100 dark:border-slate-700 overflow-hidden">
          <h4 className="text-xs font-bold text-slate-500 mb-4">Auto Loan Summary <span className="font-normal">(All Accounts)</span></h4>
          <div className="flex overflow-x-auto pb-4 -mx-1 px-1 scrollbar-thin scrollbar-thumb-blue-200">
            {metrics.autoLoansList.length > 0 ? metrics.autoLoansList.map((acc, i) => (
              <LoanCard key={i} acc={acc} />
            )) : <span className="text-sm text-slate-400">No active auto loans found.</span>}
          </div>
        </div>

        {/* Credit Cards Carousel */}
        <div className="bg-[#eef2ff] dark:bg-slate-800 rounded-2xl p-5 border border-blue-100 dark:border-slate-700 overflow-hidden">
          <h4 className="text-xs font-bold text-slate-500 mb-4">Credit Card Summary <span className="font-normal">(Active Accounts)</span></h4>
          <div className="flex overflow-x-auto pb-4 -mx-1 px-1 scrollbar-thin scrollbar-thumb-blue-200">
            {metrics.ccLoans.length > 0 ? metrics.ccLoans.map((acc, i) => (
              <LoanCard key={i} acc={acc} />
            )) : <span className="text-sm text-slate-400">No active credit cards found.</span>}
          </div>
        </div>

        {/* Secured Loans Carousel */}
        <div className="bg-[#eef2ff] dark:bg-slate-800 rounded-2xl p-5 border border-blue-100 dark:border-slate-700 overflow-hidden">
          <h4 className="text-xs font-bold text-slate-500 mb-4">Secured Loan Summary <span className="font-normal">(Active Accounts)</span></h4>
          <div className="flex overflow-x-auto pb-4 -mx-1 px-1 scrollbar-thin scrollbar-thumb-blue-200">
            {metrics.securedLoans.length > 0 ? metrics.securedLoans.map((acc, i) => (
              <LoanCard key={i} acc={acc} />
            )) : <span className="text-sm text-slate-400">No active secured loans found.</span>}
          </div>
        </div>

        {/* Unsecured Loans Carousel */}
        <div className="bg-[#eef2ff] dark:bg-slate-800 rounded-2xl p-5 border border-blue-100 dark:border-slate-700 overflow-hidden">
          <h4 className="text-xs font-bold text-slate-500 mb-4">Unsecured Loan Summary <span className="font-normal">(Active Accounts)</span></h4>
          <div className="flex overflow-x-auto pb-4 -mx-1 px-1 scrollbar-thin scrollbar-thumb-blue-200">
            {metrics.unsecuredLoans.length > 0 ? metrics.unsecuredLoans.map((acc, i) => (
              <LoanCard key={i} acc={acc} />
            )) : <span className="text-sm text-slate-400">No active unsecured loans found.</span>}
          </div>
        </div>

        {/* Link Loan Finder logic moved to Step 4 */}

        {/* Action Button */}
        <div className="pt-4 flex justify-between">
          <button onClick={onBack} className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-blue-100 text-blue-600 font-bold hover:bg-blue-50 transition">
            Back
          </button>
          <button 
            onClick={onNext}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02]"
          >
            Next <ChevronLeft className="rotate-180" size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}
