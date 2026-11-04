import { useState, useEffect } from 'react';
import { X, Save, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  ApplicationStage, 
  ApplicationStageData,
  LoginStageData,
  InProcessStageData,
  RejectedStageData,
  ApprovedStageData,
  DisbursedStageData,
  CancelledStageData,
  VehicleRCStatus,
  RCType,
  CollectedBy,
  STAGE_LABELS 
} from '@/types/applicationStages';

interface ApplicationStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStage: ApplicationStage;
  leadId: number;
  onStageUpdate: (stageData: ApplicationStageData) => void;
}

export default function ApplicationStageModal({ 
  isOpen, 
  onClose, 
  currentStage, 
  leadId, 
  onStageUpdate 
}: ApplicationStageModalProps) {
  const { user } = useAuth();
  const [selectedStage, setSelectedStage] = useState<ApplicationStage>(currentStage);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bureauScore, setBureauScore] = useState<number | null>(null);
  const [linkLoanTag, setLinkLoanTag] = useState<string | null>(null);
  const [fetchingBureau, setFetchingBureau] = useState(false);
  const [memoUpload, setMemoUpload] = useState<File | null>(null);

  // Auto-fetch bureau score removed for manual entry
  useEffect(() => {
    if (selectedStage !== 'LOGIN') return;
    
    // Just fetch lead to check if score already exists
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/leads/${leadId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    })
      .then(r => r.json())
      .then(lead => {
        if (lead.bureau_score && !formData.creditScore) {
          setBureauScore(lead.bureau_score);
          setFormData((f: any) => ({ ...f, creditScore: lead.bureau_score }));
          if (lead.link_loan_tag) setLinkLoanTag(lead.link_loan_tag);
        }
      })
      .catch(() => {});
  }, [selectedStage, leadId]);

  if (!isOpen) return null;

  const handleStageChange = (stage: ApplicationStage) => {
    setSelectedStage(stage);
    setFormData({});
    setMemoUpload(null);
  };

  const handleSubmit = async () => {
    if (selectedStage === 'LOGIN' && !formData.appScore) {
      toast.error('App Score is required for Login stage');
      return;
    }

    setIsSubmitting(true);
    try {
      const stageData: ApplicationStageData = {
        stage: selectedStage,
        updatedAt: new Date().toISOString(),
        updatedBy: 'current_user', // Replace with actual user
      };

      // Add stage-specific data
      switch (selectedStage) {
        case 'LOGIN':
          stageData.loginData = formData as LoginStageData;
          break;
        case 'IN_PROCESS':
          stageData.inProcessData = formData as InProcessStageData;
          break;
        case 'REJECTED':
          stageData.rejectedData = formData as RejectedStageData;
          break;
        case 'APPROVED':
          stageData.approvedData = {
            ...formData,
            approvedDate: new Date().toISOString()
          } as ApprovedStageData;
          break;
        case 'DISBURSED': {
          let memoUrl = '';
          if (memoUpload) {
            const formDataUpload = new FormData();
            formDataUpload.append('document', memoUpload);
            formDataUpload.append('document_type', 'disbursement_memo');
            formDataUpload.append('lead_id', leadId.toString());
            
            try {
              const uploadRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: formDataUpload
              });
              
              if (uploadRes.ok) {
                const resData = await uploadRes.json();
                memoUrl = resData.documentId?.toString() || '';
              }
            } catch (err) {
              console.error('Memo upload error:', err);
            }
          }
          
          stageData.disbursedData = {
            ...formData,
            disbursedDate: formData.disbursedDate || new Date().toISOString(),
            memoUrl
          } as DisbursedStageData;
          break;
        }
        case 'CANCELLED':
          stageData.cancelledData = {
            ...formData,
            cancelledDate: new Date().toISOString()
          } as CancelledStageData;
          break;
      }

      // API call to update stage
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/leads/${leadId}/stage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(stageData)
      });

      if (!response.ok) throw new Error('Failed to update stage');

      onStageUpdate(stageData);
      toast.success(`Stage updated to ${STAGE_LABELS[selectedStage]}`);
      onClose();
    } catch (error) {
      toast.error('Failed to update stage');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStageForm = () => {
    const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent";
    const labelClass = "flex items-end text-sm font-medium text-foreground mb-1 min-h-[40px] md:min-h-[20px]";

    switch (selectedStage) {
      case 'LOGIN':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>App Score (0-1000) *</label>
              <input
                type="number"
                min="0"
                max="1000"
                required
                className={inputClass}
                value={formData.appScore || ''}
                onChange={e => setFormData({...formData, appScore: Number(e.target.value)})}
                placeholder="Enter app score (0-1000)"
              />
            </div>
            <div>
              <label className={labelClass}>Credit Score (Bureau)</label>
              <input
                type="number"
                min="0"
                max="1000"
                className={inputClass}
                value={formData.creditScore || bureauScore || ''}
                onChange={e => {
                  const val = Number(e.target.value);
                  setFormData({...formData, creditScore: val});
                  setBureauScore(val);
                }}
                placeholder="Enter credit score (0-1000)"
              />
              {!formData.creditScore && !bureauScore && (
                <p className="text-xs text-muted-foreground mt-1">Please enter the score manually</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Link Loan Check</label>
              <select
                className={inputClass}
                value={linkLoanTag || ''}
                onChange={e => setLinkLoanTag(e.target.value)}
              >
                <option value="">Select Status</option>
                <option value="NO LINK LOAN">✓ No link loan found</option>
                <option value="LINK LOAN EXIST">⚠ Link loan detected</option>
              </select>
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
          setFormData({ ...formData, tags: updated });
        };
        return (
          <div className="space-y-3">
            <label className={labelClass}>Pendency Tags</label>
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

      case 'REJECTED':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Remarks *</label>
              <textarea
                className={inputClass}
                rows={3}
                value={formData.remarks || ''}
                onChange={e => setFormData({...formData, remarks: e.target.value})}
                placeholder="Enter rejection reason..."
                required
              />
            </div>
          </div>
        );

      case 'APPROVED':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Loan Amount *</label>
              <input
                type="number"
                className={inputClass}
                value={formData.loanAmount || ''}
                onChange={e => setFormData({...formData, loanAmount: Number(e.target.value)})}
                placeholder="Enter approved loan amount"
                required
              />
            </div>
            <div>
              <label className={labelClass}>ROI (%) *</label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={formData.roi || ''}
                onChange={e => setFormData({...formData, roi: Number(e.target.value)})}
                placeholder="Enter rate of interest"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Tenure (Months) *</label>
              <input
                type="number"
                className={inputClass}
                value={formData.tenure || ''}
                onChange={e => setFormData({...formData, tenure: Number(e.target.value)})}
                placeholder="Enter tenure in months"
                required
              />
            </div>
          </div>
        );

      case 'DISBURSED':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className={labelClass}>Disbursed Date *</label>
                <input
                  type="date"
                  className={inputClass}
                  value={formData.disbursedDate ? formData.disbursedDate.split('T')[0] : new Date().toISOString().split('T')[0]}
                  onChange={e => setFormData({...formData, disbursedDate: new Date(e.target.value).toISOString()})}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Disbursement Memo Upload</label>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className={labelClass}>Loan Amount *</label>
                <input
                  type="number"
                  className={inputClass}
                  value={formData.loanAmount || ''}
                  onChange={e => setFormData({...formData, loanAmount: Number(e.target.value)})}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>ROI (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={formData.roi || ''}
                  onChange={e => setFormData({...formData, roi: Number(e.target.value)})}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className={labelClass}>Tenure (Months) *</label>
                <input
                  type="number"
                  className={inputClass}
                  value={formData.tenure || ''}
                  onChange={e => setFormData({...formData, tenure: Number(e.target.value)})}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Loan Account Number *</label>
                <input
                  type="text"
                  className={inputClass}
                  value={formData.loanAccountNumber || ''}
                  onChange={e => setFormData({...formData, loanAccountNumber: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-semibold text-foreground mb-3 text-sm sm:text-base">Vehicle RC Status</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className={labelClass}>RC Type *</label>
                    <select
                      className={inputClass}
                      value={formData.rcType || ''}
                      onChange={e => setFormData({...formData, rcType: e.target.value as RCType})}
                      required
                    >
                      <option value="">Select RC Type</option>
                      <option value="PHYSICAL_RC">Physical RC</option>
                      <option value="DIGITAL_RC">Digital RC</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className={labelClass}>Collected By *</label>
                    <select
                      className={inputClass}
                      value={formData.collectedBy || ''}
                      onChange={e => setFormData({...formData, collectedBy: e.target.value as CollectedBy})}
                      required
                    >
                      <option value="">Select Collection Method</option>
                      <option value="SELF">Self</option>
                      <option value="RTO_AGENT">RTO Agent</option>
                      <option value="BANKER">Banker</option>
                    </select>
                  </div>
                </div>

                {formData.collectedBy === 'RTO_AGENT' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className={labelClass}>Agent Name *</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.rtoAgentName || ''}
                        onChange={e => setFormData({...formData, rtoAgentName: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Agent Mobile *</label>
                      <input
                        type="tel"
                        className={inputClass}
                        value={formData.rtoAgentMobile || ''}
                        onChange={e => setFormData({...formData, rtoAgentMobile: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                )}

                {formData.collectedBy === 'BANKER' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className={labelClass}>Banker Name *</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.bankerName || ''}
                        onChange={e => setFormData({...formData, bankerName: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Banker Mobile *</label>
                      <input
                        type="tel"
                        className={inputClass}
                        value={formData.bankerMobile || ''}
                        onChange={e => setFormData({...formData, bankerMobile: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'CANCELLED':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Remarks *</label>
              <textarea
                className={inputClass}
                rows={3}
                value={formData.remarks || ''}
                onChange={e => setFormData({...formData, remarks: e.target.value})}
                placeholder="Enter cancellation reason..."
                required
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4 pb-10 sm:pb-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-border">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border shrink-0 bg-card">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Update Application Stage</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Select Stage</label>
            <select
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              value={selectedStage}
              onChange={e => handleStageChange(e.target.value as ApplicationStage)}
            >
              <option value="SUBMITTED">Submitted</option>
              <option value="LOGIN">Login</option>
              <option value="IN_PROCESS">In Process</option>
              <option value="REJECTED">Rejected</option>
              <option value="APPROVED">Approved</option>
              <option value="DISBURSED">Disbursed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {renderStageForm()}
        </div>

        <div className="shrink-0 p-4 pb-5 sm:p-6 border-t border-border bg-card flex flex-row items-center justify-end gap-2.5 sm:gap-3">
          <button
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium text-center"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-50 text-sm font-medium shrink-0"
          >
            <Save size={16} />
            {isSubmitting ? 'Updating...' : 'Update Stage'}
          </button>
        </div>
      </div>
    </div>
  );
}