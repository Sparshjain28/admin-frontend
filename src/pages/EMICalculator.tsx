import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, IndianRupee, Percent, CalendarDays } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const MIN_AMOUNT = 100_000;
const MAX_AMOUNT = 50_000_000;
const MIN_RATE = 1.0;
const MAX_RATE = 30.0;
const MIN_TENURE = 6;
const MAX_TENURE = 360;

// Scopes the shadcn Slider's track/thumb color to Flutter's exact #3B5BDB /
// #E2E8F0 without touching the shared component or the app-wide theme.
const SLIDER_COLOR_VARS = { '--primary': '228 69% 55%', '--secondary': '214 32% 91%' } as React.CSSProperties;

function formatCurrency(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function formatAmountInput(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}

export default function EMICalculator() {
  const navigate = useNavigate();

  const [method, setMethod] = useState<'reducing' | 'flat'>('reducing');
  const [loanAmount, setLoanAmount] = useState(1_000_000);
  const [interestRate, setInterestRate] = useState(10.0);
  const [tenure, setTenure] = useState(60);

  const [amountInput, setAmountInput] = useState(formatAmountInput(1_000_000));
  const [rateInput, setRateInput] = useState('10');
  const [tenureInput, setTenureInput] = useState('60');

  const { emi, totalInterest, totalAmount, equivalentRate } = useMemo(() => {
    const P = loanAmount;
    const n = tenure;

    if (method === 'reducing') {
      const r = interestRate / 12 / 100;
      if (r === 0) {
        return { emi: P / n, totalInterest: 0, totalAmount: P, equivalentRate: 0 };
      }
      const emiVal = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      return {
        emi: emiVal,
        totalInterest: emiVal * n - P,
        totalAmount: emiVal * n,
        equivalentRate: 0,
      };
    }

    // Flat rate method
    const years = n / 12;
    const totalInt = P * (interestRate / 100) * years;
    const emiVal = (P + totalInt) / n;

    // Approximate equivalent reducing-balance rate via Newton-Raphson
    const target = emiVal;
    let r = interestRate / 12 / 100;
    for (let i = 0; i < 100; i++) {
      const pow1 = Math.pow(1 + r, n);
      const f = (P * r * pow1) / (pow1 - 1) - target;
      const df =
        (P * (pow1 * (1 + r * n) - Math.pow(1 + r, 2 * n))) / Math.pow(pow1 - 1, 2);
      if (df === 0) break;
      const rNew = r - f / df;
      if (Math.abs(rNew - r) < 1e-10) {
        r = rNew;
        break;
      }
      r = rNew;
    }

    return {
      emi: emiVal,
      totalInterest: totalInt,
      totalAmount: P + totalInt,
      equivalentRate: Math.round(r * 12 * 100 * 100) / 100,
    };
  }, [method, loanAmount, interestRate, tenure]);

  const principalPercent = totalAmount > 0 ? loanAmount / totalAmount : 0;
  const interestPercent = totalAmount > 0 ? totalInterest / totalAmount : 0;

  const handleAmountChange = (val: string) => {
    setAmountInput(val);
    const digits = val.replace(/[^0-9]/g, '');
    if (!digits) return;
    let numVal = parseFloat(digits);
    if (numVal > MAX_AMOUNT) numVal = MAX_AMOUNT;
    setLoanAmount(numVal);
  };

  const handleRateChange = (val: string) => {
    setRateInput(val);
    let numVal = parseFloat(val) || 0;
    if (numVal > MAX_RATE) numVal = MAX_RATE;
    setInterestRate(numVal);
  };

  const handleTenureChange = (val: string) => {
    setTenureInput(val);
    let numVal = parseFloat(val) || 0;
    if (numVal > MAX_TENURE) numVal = MAX_TENURE;
    setTenure(numVal);
  };

  return (
    <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 md:mx-auto md:mt-0 w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] md:w-full min-h-screen bg-[#F8F9FA] font-sans pb-10">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 flex items-center justify-center px-4 py-3.5 border-b border-slate-100 relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#3B5BDB] active:scale-95 transition-transform"
        >
          <ArrowLeft size={16} className="stroke-[2.5]" />
        </button>
        <h1 className="text-[17px] font-bold text-[#0F172A]">EMI Calculator</h1>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Method Selector */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] px-4 py-2 flex items-center justify-between">
          <span className="text-[14px] font-semibold text-[#475569]">Calculation Method</span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as 'reducing' | 'flat')}
            className="text-[14px] font-bold text-[#3B5BDB] bg-transparent outline-none cursor-pointer"
          >
            <option value="reducing">Reducing Balance</option>
            <option value="flat">Flat Rate</option>
          </select>
        </div>

        {/* Inputs Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-6" style={SLIDER_COLOR_VARS}>
          {/* Loan Amount */}
          <div>
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="flex items-center gap-1 text-[14px] font-semibold text-[#1E293B] shrink-0">
                <IndianRupee size={16} className="text-[#3B5BDB]" /> Loan Amount
              </span>
              <div className="min-w-[150px] max-w-[200px] h-10 bg-[#F1F5F9] rounded-xl flex items-center px-3 border border-slate-200/80 shrink-0 overflow-hidden">
                <span className="font-bold text-[#475569] text-sm shrink-0">₹</span>
                <input
                  value={amountInput}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onBlur={() => setAmountInput(formatAmountInput(loanAmount))}
                  inputMode="numeric"
                  className="w-full bg-transparent outline-none text-right font-bold text-sm text-[#0F172A] min-w-0 pr-0.5"
                />
              </div>
            </div>
            <Slider
              value={[loanAmount]}
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              step={(MAX_AMOUNT - MIN_AMOUNT) / 998}
              onValueChange={([v]) => {
                setLoanAmount(v);
                setAmountInput(formatAmountInput(v));
              }}
            />
            <div className="flex justify-between px-1 mt-1">
              <span className="text-[11px] text-[#64748B]">₹1 Lakh</span>
              <span className="text-[11px] text-[#64748B]">₹5 Crore</span>
            </div>
          </div>

          {/* Interest Rate */}
          <div>
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="flex items-center gap-1 text-[14px] font-semibold text-[#1E293B] shrink-0">
                <Percent size={16} className="text-[#3B5BDB]" />
                {method === 'flat' ? 'Flat Rate (p.a.)' : 'Interest Rate (p.a.)'}
              </span>
              <div className="w-24 h-10 bg-[#F1F5F9] rounded-xl flex items-center px-3 border border-slate-200/80 shrink-0 overflow-hidden">
                <input
                  value={rateInput}
                  onChange={(e) => handleRateChange(e.target.value)}
                  inputMode="decimal"
                  className="w-full bg-transparent outline-none text-right font-bold text-sm text-[#0F172A] min-w-0"
                />
                <span className="font-bold text-[#475569] text-sm ml-1 shrink-0">%</span>
              </div>
            </div>
            <Slider
              value={[interestRate]}
              min={MIN_RATE}
              max={MAX_RATE}
              step={0.1}
              onValueChange={([v]) => {
                const rounded = Math.round(v * 10) / 10;
                setInterestRate(rounded);
                setRateInput(rounded.toString());
              }}
            />
            <div className="flex justify-between px-1 mt-1">
              <span className="text-[11px] text-[#64748B]">1%</span>
              <span className="text-[11px] text-[#64748B]">30%</span>
            </div>
          </div>

          {/* Tenure */}
          <div>
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="flex items-center gap-1 text-[14px] font-semibold text-[#1E293B] shrink-0">
                <CalendarDays size={15} className="text-[#3B5BDB]" /> Loan Tenure
              </span>
              <div className="w-28 h-10 bg-[#F1F5F9] rounded-xl flex items-center px-3 border border-slate-200/80 shrink-0 overflow-hidden">
                <input
                  value={tenureInput}
                  onChange={(e) => handleTenureChange(e.target.value)}
                  inputMode="numeric"
                  className="w-full bg-transparent outline-none text-right font-bold text-sm text-[#0F172A] min-w-0"
                />
                <span className="font-bold text-[#475569] text-sm ml-1 shrink-0">mo</span>
              </div>
            </div>
            <Slider
              value={[tenure]}
              min={MIN_TENURE}
              max={MAX_TENURE}
              step={(MAX_TENURE - MIN_TENURE) / 59}
              onValueChange={([v]) => {
                setTenure(v);
                setTenureInput(Math.round(v).toString());
              }}
            />
            <div className="flex justify-between px-1 mt-1">
              <span className="text-[11px] text-[#64748B]">6 months</span>
              <span className="text-[11px] text-[#64748B]">30 years</span>
            </div>
          </div>
        </div>

        {/* EMI Result Card */}
        <div
          className="rounded-2xl px-4 py-6 text-center shadow-[0_6px_12px_rgba(59,91,219,0.2)]"
          style={{ background: 'linear-gradient(135deg, #3B5BDB, #5C7CFA)' }}
        >
          <p className="text-white/70 text-[13px] font-medium">Monthly EMI</p>
          <p className="text-white text-[32px] font-black tracking-tight mt-1">{formatCurrency(emi)}</p>
          {method === 'flat' && equivalentRate > 0 && (
            <span className="inline-block mt-2 px-2.5 py-1 rounded-full bg-white/15 text-white text-[11px] font-semibold">
              Equiv. reducing balance rate: {equivalentRate.toFixed(2)}% p.a.
            </span>
          )}
        </div>

        {/* Breakdown Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
          <p className="text-[14px] font-bold text-[#1E293B] mb-3">Payment Breakdown</p>
          <div className="h-3 rounded-full bg-[#F1F5F9] overflow-hidden flex">
            {principalPercent > 0 && (
              <div style={{ width: `${principalPercent * 100}%`, backgroundColor: '#3B5BDB' }} />
            )}
            {interestPercent > 0 && (
              <div style={{ width: `${interestPercent * 100}%`, backgroundColor: '#FB7185' }} />
            )}
          </div>
          <div className="flex justify-between mt-3 text-[11px] font-medium text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B5BDB] inline-block" />
              Principal ({(principalPercent * 100).toFixed(1)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FB7185] inline-block" />
              Interest ({(interestPercent * 100).toFixed(1)}%)
            </span>
          </div>

          <div className="h-px bg-[#E2E8F0] my-6" />

          <div className="flex justify-between text-[13px]">
            <span className="text-[#64748B] font-medium">Principal Amount</span>
            <span className="font-bold text-[#1E293B]">{formatCurrency(loanAmount)}</span>
          </div>
          <div className="flex justify-between text-[13px] mt-3.5">
            <span className="text-[#64748B] font-medium">Total Interest</span>
            <span className="font-bold text-[#E11D48]">{formatCurrency(totalInterest)}</span>
          </div>

          <div className="flex justify-between items-center bg-[#F8FAFC] rounded-lg px-3 py-3 mt-3.5">
            <span className="text-[13px] font-bold text-[#0F172A]">Total Payable</span>
            <span className="text-[15px] font-black text-[#0F172A]">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {method === 'flat' && (
          <p className="text-center text-[11px] text-[#94A3B8] leading-snug px-2">
            In flat rate method, interest is calculated on the original principal for the entire tenure.
            Reducing balance method charges interest only on the outstanding principal.
          </p>
        )}
      </div>
    </div>
  );
}
