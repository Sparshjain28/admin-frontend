import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { APPLICATION_STAGES, ApplicationStage } from '@/lib/mock-data';
import { X, Save, AlertCircle, ShieldAlert, Loader2, CheckCircle, AlertTriangle, Building2, CreditCard, RefreshCw } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` };
}
function fmt(v: any) { return v || '—'; }
function fmtCur(v: any) {
  const n = Number(v);
  return isNaN(n) || n === 0 ? '—' : `₹${n.toLocaleString('en-IN')}`;
}
function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-xs font-bold text-foreground">{value}</span>
    </div>
  );
}

interface LoanApplicationStageManagerProps {
  loan: any;
  isOpen: boolean;
  onClose: () => void;
}

interface StageFormData {
  stage: ApplicationStage;
  appScore?: string;
  creditScore?: number;
  tags?: string[];
  remarks?: string;
  loanAmount?: number;
  roi?: number;
  tenure?: number;
  loanAccountNumber?: string;
  rcType?: 'PHYSICAL_RC' | 'DIGITAL_RC';
  collectedBy?: 'SELF' | 'RTO_AGENT' | 'BANKER';
  agentName?: string;
  agentMobile?: string;
  bankerName?: string;
  bankerMobile?: string;
  linkLoanChecked?: 'Yes' | 'No';
  disbursedDate?: string;
  memoUrl?: string;
}

// Mirrors the backend's roleHierarchy (src/middleware/enhancedAuth.js) — branch_manager
// and anything at or above its level (4) may send a loan for rework.
const REWORK_ALLOWED_ROLES = ['branch_manager', 'manager', 'sales_manager', 'ops_team', 'operation_team', 'loan_operations', 'admin'];

export default function LoanApplicationStageManager({ loan, isOpen, onClose }: LoanApplicationStageManagerProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canSendForRework = !!user?.role && REWORK_ALLOWED_ROLES.includes(user.role);

  const STAGE_ORDER: ApplicationStage[] = ['SUBMITTED', 'LOGIN', 'IN_PROCESS', 'APPROVED', 'DISBURSED'];
  const currentStage: ApplicationStage = loan?.application_stage || 'SUBMITTED';
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const loginFilled = !!(
    (loan?.app_score || loan?.stage_data?.appScore) && 
    (loan?.credit_score || loan?.stage_data?.creditScore)
  );

  // Link Loan auto-check state (shown at LOGIN)
  const [llAutoLoans, setLlAutoLoans] = useState<any[]>([]);
  const [llLoading, setLlLoading] = useState(false);
  const [llChecked, setLlChecked] = useState(true);
  const [llSelectedLoan, setLlSelectedLoan] = useState<any>(null);
  const [llTagging, setLlTagging] = useState(false);
  const [llTagged, setLlTagged] = useState(false);

  const getDefaultStage = (): ApplicationStage => {
    // When a loan is sitting in REWORK, default the picker to the stage it
    // should return to (persisted server-side) rather than REWORK itself —
    // saves the admin from having to remember/re-pick it.
    if (currentStage === 'REWORK' && loan?.rework_from_stage) {
      return loan.rework_from_stage as ApplicationStage;
    }
    return currentStage;
  };

  const [memoUpload, setMemoUpload] = useState<File | null>(null);

  const [formData, setFormData] = useState<StageFormData>({
    stage: getDefaultStage(),
    appScore: loan?.app_score || loan?.stage_data?.appScore || undefined,
    creditScore: loan?.credit_score || loan?.stage_data?.creditScore || undefined,
    tags: loan?.tags || loan?.stage_data?.tags || [],
    remarks: '',
    loanAmount: loan?.loan_amount || undefined,
    roi: loan?.roi || undefined,
    tenure: loan?.tenure || undefined,
    loanAccountNumber: loan?.loan_account_number || '',
    rcType: loan?.rc_type || 'PHYSICAL_RC',
    collectedBy: loan?.rc_collected_by || 'SELF',
    agentName: loan?.rto_agent_name_rc || '',
    agentMobile: loan?.rto_agent_mobile || '',
    bankerName: loan?.banker_name || '',
    bankerMobile: loan?.banker_mobile || '',
    linkLoanChecked: loan?.link_loan_checked || undefined,
    disbursedDate: loan?.disbursed_date || loan?.stage_data?.disbursedDate || new Date().toISOString(),
    memoUrl: loan?.memo_url || loan?.stage_data?.memoUrl || '',
  });

  // Reinitialize form every time modal opens with fresh loan data
  useEffect(() => {
    if (isOpen && loan) {
      const cur: ApplicationStage = loan.application_stage || 'SUBMITTED';
      const defaultStage: ApplicationStage = cur === 'REWORK' && loan.rework_from_stage
        ? (loan.rework_from_stage as ApplicationStage)
        : cur;
      setFormData({
        stage: defaultStage,
        appScore: loan.app_score || loan.stage_data?.appScore || undefined,
        creditScore: loan.credit_score || loan.stage_data?.creditScore || undefined,
        tags: loan.tags || loan.stage_data?.tags || [],
        remarks: '',
        loanAmount: loan.loan_amount || undefined,
        roi: loan.roi || undefined,
        tenure: loan.tenure || undefined,
        loanAccountNumber: loan.loan_account_number || '',
        rcType: loan.rc_type || 'PHYSICAL_RC',
        collectedBy: loan.rc_collected_by || 'SELF',
        agentName: loan.rto_agent_name_rc || '',
        agentMobile: loan.rto_agent_mobile || '',
        bankerName: loan.banker_name || '',
        bankerMobile: loan.banker_mobile || '',
        linkLoanChecked: loan.link_loan_checked || undefined,
        disbursedDate: loan.disbursed_date || loan.stage_data?.disbursedDate || new Date().toISOString(),
        memoUrl: loan.memo_url || loan.stage_data?.memoUrl || '',
      });
      setMemoUpload(null);
    }
  }, [isOpen, loan?.id]);

  // Auto-trigger link loan + bureau check removed for manual entry
  useEffect(() => {
    if (formData.stage !== 'LOGIN' || !loan?.id) return;

    if (loan.credit_report_data) {
      const saved = typeof loan.credit_report_data === 'string'
        ? JSON.parse(loan.credit_report_data)
        : loan.credit_report_data;
      setLlAutoLoans(saved.auto_loans || []);
      if (saved.credit_score && !formData.creditScore) {
        setFormData(prev => ({ ...prev, creditScore: saved.credit_score }));
      }
    }
  }, [formData.stage, loan?.id]);

  const updateStage = useMutation({
    mutationFn: async (data: StageFormData) => {
const response = await fetch(`${API}/loans/${loan.id}/stage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || err.error || 'Failed to update stage');
      }
      const result = await response.json();
return result;
    },
    onSuccess: (data) => {
// Invalidate all loan-related queries to force fresh fetch
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan'] });
      queryClient.invalidateQueries({ queryKey: ['loan', loan.id] });
      queryClient.invalidateQueries({ queryKey: ['loan', String(loan.id)] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      // Force refetch after invalidation
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['loan', loan.id] });
        queryClient.refetchQueries({ queryKey: ['loan', String(loan.id)] });
      }, 500);
      toast.success('Application stage updated successfully');
      onClose();
    },
    onError: (error: any) => {
toast.error(error.message || 'Failed to update application stage');
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.stage === 'LOGIN' && !formData.appScore) {
      toast.error('App Score is required for Login stage');
      return;
    }
    if (formData.stage === 'REWORK' && !formData.remarks?.trim()) {
      toast.error('Rework remarks are required');
      return;
    }

    let submissionData = { ...formData };
    
    if (formData.stage === 'DISBURSED' && memoUpload) {
      const formDataUpload = new FormData();
      formDataUpload.append('document', memoUpload);
      formDataUpload.append('document_type', 'disbursement_memo');
      formDataUpload.append('loan_id', loan.id.toString());
      
      try {
        const uploadRes = await fetch(`${API}/documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: formDataUpload
        });
        
        if (uploadRes.ok) {
          const resData = await uploadRes.json();
          submissionData.memoUrl = resData.documentId?.toString() || '';
        }
      } catch (err) {
        console.error('Memo upload error:', err);
      }
    }
    
    updateStage.mutate(submissionData);
  };

  const renderStageFields = () => {
    switch (formData.stage) {
      case 'SUBMITTED':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Application has been submitted and is awaiting review.</p>
          </div>
        );

      case 'LOGIN':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-end text-sm font-medium mb-2 min-h-[40px] md:min-h-[20px]">App Score *</label>
                <input
                  type="text"
                  required
                  value={formData.appScore || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, appScore: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                  placeholder="Enter app score (e.g., A1, 850, B+)"
                />
              </div>
              <div>
                <label className="flex items-end text-sm font-medium mb-2 min-h-[40px] md:min-h-[20px]">Credit Score (Bureau)</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={formData.creditScore || ''}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (e.target.value === '' || (val >= 0 && val <= 1000))
                      setFormData(prev => ({ ...prev, creditScore: e.target.value ? val : undefined }));
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                  placeholder="Enter credit score"
                />
              </div>
            </div>
          </div>
        );

      case 'IN_PROCESS': {
        const PENDENCY_TAGS = [
          'Bank Statement', 'Alternate Bank Statement', 'LOAN SOA',
          'LOAN FORECLOSURE LETTER', 'NOC', 'CO-APP KYC',
          'CO-APP BANK STATEMENT', 'VEHICLE RC', 'VEHICLE VALUATION', 'FIELD INSPECTION'
        ];
        const selectedTags: string[] = formData.tags || [];
        const toggleTag = (tag: string) => {
          const updated = selectedTags.includes(tag)
            ? selectedTags.filter((t: string) => t !== tag)
            : [...selectedTags, tag];
          setFormData((prev: any) => ({ ...prev, tags: updated }));
        };
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium">Pendency Tags</label>
            <div className="grid grid-cols-2 gap-2">
              {PENDENCY_TAGS.map(tag => (
                <label key={tag} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  selectedTags.includes(tag)
                    ? 'border-accent bg-accent/10 text-accent font-medium'
                    : 'border-border hover:bg-muted'
                }`}>
                  <input
                    type="checkbox"
                    className="accent-accent"
                    checked={selectedTags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                  />
                  <span className="text-xs">{tag}</span>
                </label>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <p className="text-xs text-muted-foreground">Selected: {selectedTags.join(', ')}</p>
            )}
          </div>
        );
      }

      case 'REWORK': {
        const REWORK_TAGS = [
          'Bank Statement', 'Alternate Bank Statement', 'LOAN SOA',
          'LOAN FORECLOSURE LETTER', 'NOC', 'CO-APP KYC',
          'CO-APP BANK STATEMENT', 'VEHICLE RC', 'VEHICLE VALUATION', 'FIELD INSPECTION'
        ];
        const selectedTags: string[] = formData.tags || [];
        const toggleTag = (tag: string) => {
          const updated = selectedTags.includes(tag)
            ? selectedTags.filter((t: string) => t !== tag)
            : [...selectedTags, tag];
          setFormData(prev => ({ ...prev, tags: updated }));
        };
        return (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" size={16} />
                <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300">
                  This lead will be moved to Rework. It will return to <strong>{STAGE_ORDER.includes(currentStage) ? currentStage : 'its prior stage'}</strong> once resolved — pick that stage again from this form later to resume.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Rework Remarks *</label>
              <textarea
                required
                value={formData.remarks || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                rows={3}
                placeholder="What needs to be corrected?"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium">Pendency Tags</label>
              <div className="grid grid-cols-2 gap-2">
                {REWORK_TAGS.map(tag => (
                  <label key={tag} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedTags.includes(tag)
                      ? 'border-accent bg-accent/10 text-accent font-medium'
                      : 'border-border hover:bg-muted'
                  }`}>
                    <input
                      type="checkbox"
                      className="accent-accent"
                      checked={selectedTags.includes(tag)}
                      onChange={() => toggleTag(tag)}
                    />
                    <span className="text-xs">{tag}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 'REJECTED':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rejection Remarks *</label>
              <textarea
                required
                value={formData.remarks || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                rows={3}
                placeholder="Enter reason for rejection"
              />
            </div>
          </div>
        );

      case 'APPROVED':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="flex items-end text-sm font-medium mb-1.5 min-h-[32px] sm:min-h-[20px]">Loan Amount *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.loanAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, loanAmount: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                  placeholder="Enter loan amount"
                />
              </div>
              <div>
                <label className="flex items-end text-sm font-medium mb-1.5 min-h-[32px] sm:min-h-[20px]">ROI (%) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.roi || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, roi: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                  placeholder="Enter ROI"
                />
              </div>
              <div>
                <label className="flex items-end text-sm font-medium mb-1.5 min-h-[32px] sm:min-h-[20px]">Tenure (months) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.tenure || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, tenure: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                  placeholder="Enter tenure"
                />
              </div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" size={16} />
                <div className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-300">
                  <p className="font-medium">Auto-cancellation Notice</p>
                  <p>If not disbursed within 30 days, this application will automatically move to CANCELLED stage.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'DISBURSED':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="flex items-end text-sm font-medium mb-1.5 min-h-[32px] sm:min-h-[20px]">Disbursed Date *</label>
                <input
                  type="date"
                  required
                  value={formData.disbursedDate ? formData.disbursedDate.split('T')[0] : new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData(prev => ({ ...prev, disbursedDate: new Date(e.target.value).toISOString() }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                />
              </div>
              <div>
                <label className="flex items-end text-sm font-medium mb-1.5 min-h-[32px] sm:min-h-[20px]">Disbursement Memo Upload</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setMemoUpload(file);
                  }}
                  className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:border file:border-border file:rounded-lg file:text-[10px] file:bg-background file:text-foreground hover:file:bg-accent/50"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="flex items-end text-sm font-medium mb-1.5 min-h-[32px] sm:min-h-[20px]">Loan Amount *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.loanAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, loanAmount: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                />
              </div>
              <div>
                <label className="flex items-end text-sm font-medium mb-1.5 min-h-[32px] sm:min-h-[20px]">ROI (%) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.roi || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, roi: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                />
              </div>
              <div>
                <label className="flex items-end text-sm font-medium mb-1.5 min-h-[32px] sm:min-h-[20px]">Tenure (months) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.tenure || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, tenure: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5">Loan Account Number *</label>
              <input
                type="text"
                required
                value={formData.loanAccountNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, loanAccountNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                placeholder="Enter loan account number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Link Loan Checked *</label>
              <select
                required
                value={formData.linkLoanChecked || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, linkLoanChecked: e.target.value as 'Yes' | 'No' }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
              >
                <option value="" disabled>Select Yes/No</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="border border-border rounded-lg p-3 sm:p-4">
              <h4 className="font-medium mb-3 text-sm sm:text-base">Vehicle RC Status</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">RC Type *</label>
                  <select
                    required
                    value={formData.rcType}
                    onChange={(e) => setFormData(prev => ({ ...prev, rcType: e.target.value as 'PHYSICAL_RC' | 'DIGITAL_RC' }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                  >
                    <option value="PHYSICAL_RC">Physical RC</option>
                    <option value="DIGITAL_RC">Digital RC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Collected By *</label>
                  <select
                    required
                    value={formData.collectedBy}
                    onChange={(e) => setFormData(prev => ({ ...prev, collectedBy: e.target.value as 'SELF' | 'RTO_AGENT' | 'BANKER' }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                  >
                    <option value="SELF">Self</option>
                    <option value="RTO_AGENT">RTO Agent</option>
                    <option value="BANKER">Banker</option>
                  </select>
                </div>
              </div>

              {formData.collectedBy === 'RTO_AGENT' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Agent Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.agentName || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, agentName: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                      placeholder="Enter agent name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Agent Mobile *</label>
                    <input
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      value={formData.agentMobile || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                        if (value.length <= 10) {
                          setFormData(prev => ({ ...prev, agentMobile: value }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                    />
                  </div>
                </div>
              )}

              {formData.collectedBy === 'BANKER' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Banker Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.bankerName || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankerName: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                      placeholder="Enter banker name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Banker Mobile *</label>
                    <input
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      value={formData.bankerMobile || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                        if (value.length <= 10) {
                          setFormData(prev => ({ ...prev, bankerMobile: value }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                    />
                  </div>
                </div>
              )}
            </div>


          </div>
        );

      case 'CANCELLED':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Cancellation Remarks *</label>
              <textarea
                required
                value={formData.remarks || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                rows={3}
                placeholder="Enter reason for cancellation"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isStageAllowed = (stageValue: ApplicationStage) => {
    // REJECTED and CANCELLED always allowed
    if (stageValue === 'REJECTED' || stageValue === 'CANCELLED') return true;
    // REWORK is a side-branch, not a forward step — gated separately by role
    // (the option is hidden entirely for lower roles, see the <select> below).
    if (stageValue === 'REWORK') return canSendForRework;
    const stageIndex = STAGE_ORDER.indexOf(stageValue);
    // Must go through LOGIN first before any stage beyond it
    if (stageIndex > STAGE_ORDER.indexOf('LOGIN') && !loginFilled) return false;
    // Can only move forward (or stay at current)
    return stageIndex >= currentIndex;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4 pb-10 sm:pb-4">
      <div 
        className="bg-white dark:bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-border" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border shrink-0 bg-white dark:bg-card">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">Update Application Stage</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Loan: {loan?.loan_number || loan?.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1.5">Application Stage</label>
              <select
                value={formData.stage}
                onChange={(e) => {
                  const newStage = e.target.value as ApplicationStage;
                  setFormData(prev => ({
                    ...prev,
                    stage: newStage,
                    // Autofill login scores when switching to LOGIN
                    ...(newStage === 'LOGIN' && loginFilled ? {
                      appScore: loan?.app_score,
                      creditScore: loan?.credit_score
                    } : {})
                  }));
                }}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
              >
                {APPLICATION_STAGES
                  .filter(stage => stage.value !== 'REWORK' || canSendForRework)
                  .map(stage => {
                  const allowed = isStageAllowed(stage.value);
                  return (
                    <option key={stage.value} value={stage.value} disabled={!allowed}>
                      {stage.label}{!allowed ? (stage.value !== 'REJECTED' && stage.value !== 'CANCELLED' && !loginFilled && STAGE_ORDER.indexOf(stage.value) > STAGE_ORDER.indexOf('LOGIN') ? ' (Complete Login first)' : ' (Not available)') : ''}
                    </option>
                  );
                })}
              </select>
              {!loginFilled && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">⚠️ Complete Login stage (App Score & Credit Score) to unlock further stages</p>
              )}
            </div>

            {renderStageFields()}
          </div>

          <div className="p-4 pb-5 sm:p-6 border-t border-border bg-white dark:bg-card shrink-0 flex flex-row items-center justify-end gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateStage.isPending}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm font-medium shrink-0"
            >
              <Save size={16} />
              {updateStage.isPending ? 'Updating...' : 'Update Stage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
