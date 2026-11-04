import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { calculateEMI, formatCurrency } from '@/lib/mock-data';
import '@/styles/floating-labels.css';

// Validation functions
const validateVehicleNumber = (vehicleNumber: string): boolean => {
  return true;
};

export default function EditLead() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    customerName: '',
    mobile: '',
    vehicleNumber: '',
    loanAmount: '',
    makerName: '',
    modelVariantName: '',
    irr: '',
    tenure: '60',
  });

  const [vehicleError, setVehicleError] = useState('');

  useEffect(() => {
    if (user?.role === 'team_leader') {
      const stored = localStorage.getItem('team_leader_dummy_lead');
      if (stored) {
        const lead = JSON.parse(stored);
        setForm({
          customerName: lead.applicant_name || '',
          mobile: lead.mobile || '',
          vehicleNumber: lead.vehicle_number || '',
          loanAmount: String(lead.loan_amount || ''),
          makerName: lead.maker_name || lead.car_make || '',
          modelVariantName: lead.model_variant_name || lead.car_model || '',
          irr: '12',
          tenure: '60',
        });
      }
    }
  }, [user]);

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleVehicleNumberChange = (value: string) => {
    update('vehicleNumber', value.toUpperCase());
    setVehicleError('');
  };

  const emi = useMemo(() => {
    const p = Number(form.loanAmount);
    const r = Number(form.irr);
    const t = Number(form.tenure);
    if (p > 0 && r > 0 && t > 0) return calculateEMI(p, r, t);
    return 0;
  }, [form.loanAmount, form.irr, form.tenure]);

  const totalPayable = emi * Number(form.tenure);
  const totalInterest = totalPayable - Number(form.loanAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate vehicle number if provided
    if (form.vehicleNumber && !validateVehicleNumber(form.vehicleNumber)) {
      toast.error('Invalid vehicle number format');
      return;
    }
    
    const stored = localStorage.getItem('team_leader_dummy_lead');
    const existingLead = stored ? JSON.parse(stored) : {};
    
    const updated = {
      ...existingLead,
      applicant_name: form.customerName,
      mobile: form.mobile,
      vehicle_number: form.vehicleNumber,
      loan_amount: Number(form.loanAmount),
      maker_name: form.makerName,
      car_make: form.makerName,
      model_variant_name: form.modelVariantName,
      car_model: form.modelVariantName,
      emi: emi,
    };

    localStorage.setItem('team_leader_dummy_lead', JSON.stringify(updated));
    queryClient.invalidateQueries({ queryKey: ['loans'] });
    toast.success('Lead updated successfully');
    navigate('/loans');
  };

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Access denied</p>
        <button onClick={() => navigate('/loans')} className="mt-4 text-accent hover:underline text-sm">← Back to loans</button>
      </div>
    );
  }

  const inputClass = "w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all";
  const labelClass = "block text-[10px] font-medium text-foreground/70 mb-1";

  return (
    <div className="w-full mx-auto px-4">
      <button onClick={() => navigate('/loans')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground mb-2">Edit Loan Application</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm mb-4 space-y-6">
          {/* Customer Details */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Customer Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="floating-input-wrapper">
                <input required className={inputClass} value={form.customerName} onChange={e => update('customerName', e.target.value)} placeholder=" " />
                <label className={labelClass}>Customer Name *</label>
              </div>
              <div className="floating-input-wrapper">
                <input required className={inputClass} value={form.mobile} onChange={e => update('mobile', e.target.value)} maxLength={10} placeholder=" " />
                <label className={labelClass}>Mobile No *</label>
              </div>
            </div>
          </div>

          {/* Vehicle & Loan */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Vehicle & Loan Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="floating-input-wrapper">
                <input className={`${inputClass} ${vehicleError ? 'border-red-500' : ''}`} value={form.vehicleNumber} onChange={e => handleVehicleNumberChange(e.target.value)} placeholder=" " />
                <label className={labelClass}>Vehicle Reg. No</label>
                {vehicleError && <p className="text-[10px] text-red-500 mt-1 font-semibold">{vehicleError}</p>}
              </div>
              <div className="floating-input-wrapper">
                <input className={inputClass} value={form.makerName} onChange={e => update('makerName', e.target.value)} placeholder=" " />
                <label className={labelClass}>Maker's Name</label>
              </div>
              <div className="floating-input-wrapper">
                <input className={inputClass} value={form.modelVariantName} onChange={e => update('modelVariantName', e.target.value)} placeholder=" " />
                <label className={labelClass}>Model / Variant</label>
              </div>
              <div className="floating-input-wrapper">
                <input required type="number" className={inputClass} value={form.loanAmount} onChange={e => update('loanAmount', e.target.value)} placeholder=" " />
                <label className={labelClass}>Loan Amount (₹) *</label>
              </div>
            </div>
          </div>

          {/* EMI Details */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">EMI Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="floating-input-wrapper">
                <input required type="number" step="0.01" className={inputClass} value={form.irr} onChange={e => update('irr', e.target.value)} placeholder=" " />
                <label className={labelClass}>IRR (%) *</label>
              </div>
              <div className="floating-input-wrapper">
                <select required className={inputClass} value={form.tenure} onChange={e => update('tenure', e.target.value)}>
                  {[12, 18, 24, 36, 48, 60, 72, 84].map(t => <option key={t} value={t}>{t} MONTH</option>)}
                </select>
                <label className={labelClass}>Tenure *</label>
              </div>
            </div>
            {emi > 0 && (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator size={16} className="text-accent" />
                  <span className="text-accent font-semibold text-sm">EMI Calculator</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-background/50">
                    <p className="text-xs text-muted-foreground mb-1">Monthly EMI</p>
                    <p className="text-lg font-bold text-accent break-all">{formatCurrency(emi)}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background/50">
                    <p className="text-xs text-muted-foreground mb-1">Total Interest</p>
                    <p className="text-lg font-bold text-foreground break-all">{formatCurrency(totalInterest > 0 ? totalInterest : 0)}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background/50">
                    <p className="text-xs text-muted-foreground mb-1">Total Payable</p>
                    <p className="text-lg font-bold text-foreground break-all">{formatCurrency(totalPayable)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pb-6">
            <button 
              type="button" 
              onClick={() => navigate('/loans')} 
              className="px-6 py-3 rounded-xl border-2 border-border font-semibold hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              ✓ Update Application
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
