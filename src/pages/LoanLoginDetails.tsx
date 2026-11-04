import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { FINANCIERS } from '@/lib/financiers';
import { api } from '@/lib/api';
import { buildLoanApplicationPdfBlob } from '@/lib/pdf-export';

export default function LoanLoginDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const loanData = location.state?.loanData;

  const [form, setForm] = useState({
    selectedLender: '',
    otherLender: '',
    salesManager: '',
    location: '',
    remarks: '',
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return [];
        return await response.json();
      } catch {
        return [];
      }
    },
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/config`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.ok ? await response.json() : [];
    },
  });

  const salesManagers = users.filter((u: any) => 
    u.role === 'sales_manager' || u.role === 'team_leader'
  );

  const isLoginStageEnabled = () => {
    const config = configs.find((c: any) => c.config_key === 'login_stage_enabled');
    if (!config) return true;
    return config.config_value === 'true';
  };

  const getLoginStageTimeRemaining = () => {
    const config = configs.find((c: any) => c.config_key === 'login_stage_enabled');
    if (!config || config.config_value === 'true') return null;
    
    const description = config.description || '';
    const match = description.match(/Disabled until (.+)/);
    if (!match) return null;
    
    const disableUntil = new Date(match[1]).getTime();
    const now = Date.now();
    const remaining = disableUntil - now;
    
    if (remaining <= 0) return 'Time Up - Admin can re-enable now';
    
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    return `${hours}h ${minutes}m remaining`;
  };

  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  
  useEffect(() => {
    const updateTime = () => {
      setTimeRemaining(getLoginStageTimeRemaining());
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    
    return () => clearInterval(interval);
  }, [configs]);

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const generateLoanId = () => {
    const year = new Date().getFullYear();
    const num = Math.floor(Math.random() * 9000) + 1000;
    return `CL-${year}-${num}`;
  };

  const createLoan = useMutation({
    mutationFn: async () => {
      if (!loanData) {
        throw new Error('No loan data found');
      }

      const loanId = loanData.loanNumber || generateLoanId();
      const selectedLenderName = form.selectedLender === 'Others' ? form.otherLender : form.selectedLender;
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          ...loanData,
          id: loanId,
          loan_number: loanId,
          selected_financier: selectedLenderName,
          financier_location: form.location || null,
          sales_manager: form.salesManager || null,
          remark: form.remarks || null,
          created_by: user?.id,
        }),
      });
      
      if (!res.ok) throw new Error('Failed to create loan');
      return res.json();
    },
    onSuccess: async (data) => {
      try {
        const createdLoan = await api.get(`/loans/${data.id}`);
        const pdfBlob = await buildLoanApplicationPdfBlob(createdLoan);
        const pdfFile = new File([pdfBlob], `Loan-${createdLoan.id}.pdf`, { type: 'application/pdf' });
        const pdfFormData = new FormData();
        pdfFormData.append('document', pdfFile);
        pdfFormData.append('document_type', 'loan_application_pdf');
        pdfFormData.append('loan_id', String(data.id));
        if (loanData?.lead_id) pdfFormData.append('lead_id', String(loanData.lead_id));

        const pdfUploadResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: pdfFormData,
        });

        if (!pdfUploadResponse.ok) {
          const errorText = await pdfUploadResponse.text().catch(() => 'Unable to save loan PDF');
}
      } catch (pdfError) {
}

      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loans-dashboard'] });
      toast.success('Loan application created successfully!');
      navigate('/loans');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create loan');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoginStageEnabled()) {
      toast.error('Login stage is currently disabled by admin. Please try again later.');
      return;
    }
    
    if (!form.selectedLender) {
      toast.error('Please select a lender');
      return;
    }
    
    if (form.selectedLender === 'Others' && !form.otherLender.trim()) {
      toast.error('Please enter lender name');
      return;
    }

    createLoan.mutate();
  };

  const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all";
  const labelClass = "block text-sm font-medium text-foreground/70 mb-2";

  return (
    <div className="w-full max-w-4xl mx-auto">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Login Details</h1>
        <p className="text-sm text-muted-foreground">Complete the loan application by providing lender and sales information</p>
      </div>

      {/* Login Stage Disabled Warning */}
      {!isLoginStageEnabled() && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-700 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="font-bold text-red-700 dark:text-red-400 text-lg mb-1">🚫 Login Stage Disabled</p>
              <p className="text-sm text-red-600 dark:text-red-300 mb-2">The login stage has been disabled by admin for 24 hours. You cannot submit loan applications at this time.</p>
              {timeRemaining && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded-md border border-red-300 dark:border-red-600">
                  <Clock size={16} className="text-red-700 dark:text-red-400" />
                  <span className="text-sm font-semibold text-red-700 dark:text-red-400">{timeRemaining}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full">
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-6">
          
          {/* Select Lender */}
          <div>
            <label className={labelClass}>Select Lender *</label>
            <select 
              className={inputClass}
              value={form.selectedLender}
              onChange={e => update('selectedLender', e.target.value)}
              required
            >
              <option value="">-- Select Lender --</option>
              {FINANCIERS.map((lender) => (
                <option key={lender} value={lender}>{lender}</option>
              ))}
            </select>
          </div>

          {/* Other Lender Input */}
          {form.selectedLender === 'Others' && (
            <div>
              <label className={labelClass}>Enter Lender Name *</label>
              <input
                type="text"
                className={inputClass}
                value={form.otherLender}
                onChange={e => update('otherLender', e.target.value)}
                placeholder="Enter lender name"
                required
              />
            </div>
          )}

          {/* Sales Manager */}
          <div>
            <label className={labelClass}>Sales Manager</label>
            <select 
              className={inputClass}
              value={form.salesManager}
              onChange={e => update('salesManager', e.target.value)}
            >
              <option value="">-- Select Sales Manager --</option>
              {salesManagers.map((manager: any) => (
                <option key={manager.id} value={manager.name}>
                  {manager.name} ({manager.role})
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className={labelClass}>Location</label>
            <input
              type="text"
              className={inputClass}
              value={form.location}
              onChange={e => update('location', e.target.value)}
              placeholder="Enter location"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className={labelClass}>Remarks</label>
            <textarea
              className={inputClass}
              rows={4}
              value={form.remarks}
              onChange={e => update('remarks', e.target.value)}
              placeholder="Enter any additional remarks or notes"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => navigate(-1)} 
              className="px-6 py-3 rounded-xl border-2 border-border font-semibold hover:bg-muted transition-all"
            >
              Back
            </button>
            <button 
              type="submit" 
              disabled={createLoan.isPending || !isLoginStageEnabled()}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {createLoan.isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </span>
              ) : '✓ Submit Application'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

