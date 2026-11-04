import { IndianRupee, FileText, Building2 } from 'lucide-react';
import { formatCurrency } from '@/lib/mock-data';
import { Card, Field, EditProps } from './shared';
import { useAuth } from '@/contexts/AuthContext';

interface LoanTabProps extends EditProps {
  loan: any;
  displayLoanAmount: number;
  displayTenure: string;
  displayIrr: string;
  displayEmiAmount: string;
  lenders: string[];
  branchOptions: any[];
  loadingBranches: boolean;
  handleLenderChange: (lenderName: string) => void;
  handleBranchChange: (branchName: string) => void;
}

export default function LoanTab({
  loan, displayLoanAmount, displayTenure, displayIrr, displayEmiAmount,
  lenders, branchOptions, loadingBranches, handleLenderChange, handleBranchChange,
  canEditLoanFromCard, isLoanOperations, editModalState, editForm, setEditForm, isSavingEdit, handleSavePartial, openEditModal,
}: LoanTabProps) {
  const l = loan as any;
  const { user } = useAuth();

  const isLoanOps = isLoanOperations !== undefined
    ? isLoanOperations
    : (user?.role === 'loan_operations');

  const currentLenderName = l.financier_name ||
    (typeof l.selected_financier === 'object' ? l.selected_financier?.name : l.selected_financier) ||
    (typeof l.bank_name === 'object' ? l.bank_name?.name : l.bank_name) || '';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Loan, EMI & Selected Financier Details */}
        <Card
          title="Loan, EMI & Selected Financier Details"
          icon={<IndianRupee size={16} />}
          iconBg="bg-[#0024A2]/10"
          iconColor="text-[#0024A2]"
          accent="border-emerald-200/50"
          onEdit={(canEditLoanFromCard || isLoanOps) && editModalState !== 'loan' ? () => openEditModal('loan') : undefined}
        >
          {editModalState === 'loan' ? (
            <div className="flex flex-col gap-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Loan Amount</label>
                  <input type="number" className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.loan_amount} onChange={e => setEditForm({...editForm, loan_amount: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tenure (months)</label>
                  <input type="number" className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.tenure} onChange={e => setEditForm({...editForm, tenure: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">ROI (%)</label>
                  <input type="number" step="0.1" className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.roi} onChange={e => setEditForm({...editForm, roi: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">EMI Amount</label>
                  <input type="number" className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.emi_amount} onChange={e => setEditForm({...editForm, emi_amount: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Financier Name</label>
                  <select className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.financier_name} onChange={e => handleLenderChange(e.target.value)}>
                    <option value="">Select Financier</option>
                    {lenders.map((ln: string) => <option key={ln} value={ln}>{ln}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Branch Name {loadingBranches && <span className="text-blue-500">(loading...)</span>}</label>
                  {editForm.financier_name && editForm.financier_name !== 'Others' ? (
                    <select
                      className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500"
                      value={editForm.financier_branch_name}
                      onChange={e => handleBranchChange(e.target.value)}
                      disabled={loadingBranches || branchOptions.length === 0}
                    >
                      <option value="">{branchOptions.length === 0 ? '-- No branches added --' : '-- Select branch --'}</option>
                      {branchOptions.map((b: any) => (
                        <option key={b.id} value={b.branch_name}>{b.branch_name}{b.location ? ` (${b.location})` : ''}</option>
                      ))}
                    </select>
                  ) : (
                    <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.financier_branch_name} onChange={e => setEditForm({...editForm, financier_branch_name: e.target.value})} />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Executive Name</label>
                  <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.financier_executive_name} onChange={e => setEditForm({...editForm, financier_executive_name: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Executive Mobile</label>
                  <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.financier_executive_mobile} onChange={e => setEditForm({...editForm, financier_executive_mobile: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Manager Name</label>
                  <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.financier_area_manager_name} onChange={e => setEditForm({...editForm, financier_area_manager_name: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Manager Mobile</label>
                  <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.financier_area_manager_mobile} onChange={e => setEditForm({...editForm, financier_area_manager_mobile: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-border/50">
                <button onClick={() => openEditModal('none' as any)} className="px-4 py-1.5 text-sm font-semibold rounded-md border border-border hover:bg-muted text-foreground">Cancel</button>
                <button onClick={handleSavePartial} disabled={isSavingEdit} className="px-4 py-1.5 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2">
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Loan Amount" value={displayLoanAmount === 0 ? 'NA' : formatCurrency(displayLoanAmount)} />
                <Field label="Tenure" value={displayTenure} />
                <Field label="ROI (Current)" value={displayIrr} />
                <Field label="EMI Amount (Current)" value={displayEmiAmount} />

                <div className="col-span-2 border-t border-border/40 pt-3 mt-1">
                  <Field label="Selected Lender (Financier)" value={currentLenderName || 'No lender selected yet (NA)'} span={2} />
                </div>

                {(currentLenderName || isLoanOps) && (
                  <>
                    <Field label="Branch" value={l.financier_branch_name} />
                    <Field label="Sales Manager" value={l.financier_executive_name} />
                    <Field label="SM Mobile" value={l.financier_executive_mobile} />
                    <Field label="Area Manager" value={l.financier_area_manager_name} />
                    <Field label="AM Mobile" value={l.financier_area_manager_mobile} />
                  </>
                )}
              </div>

              {((l.existing_loan_status || l.existing_loan_amount)) && (
                <>
                  <div className="my-3 border-t border-border/40" />
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-3">Existing Loan Details</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="Loan Status" value={l.existing_loan_status} />
                    <Field label="Loan Amount" value={l.existing_loan_amount ? formatCurrency(Number(l.existing_loan_amount)) : ''} />
                    <Field label="Tenure (Months)" value={l.existing_tenure ? String(l.existing_tenure) : ''} />
                    <Field label="EMI Amount" value={l.existing_emi ? formatCurrency(Number(l.existing_emi)) : ''} />
                    <Field label="No of EMI Paid" value={l.no_of_emi_paid ? String(l.no_of_emi_paid) : ''} />
                    <Field label="Bouncing (3M)" value={l.bouncing_3_months != null ? String(l.bouncing_3_months) : ''} />
                    <Field label="Bouncing (6M)" value={l.bouncing_6_months != null ? String(l.bouncing_6_months) : ''} />
                  </div>
                </>
              )}
            </>
          )}
        </Card>

        {/* Application Stage Details */}
        <Card title="Application Stage Details" icon={<FileText size={16} />} iconBg="bg-[#0024A2]/10" iconColor="text-[#0024A2]" accent="border-purple-200/50">
          {(() => {
            let history: any[] = [];
            try {
              history = Array.isArray(l.stage_history) ? l.stage_history
                : typeof l.stage_history === 'string' ? JSON.parse(l.stage_history) : [];
            } catch { history = []; }
            const fromHistory = (stage: string) => history.find((h: any) => h.stage === stage);
            const loginEntry = fromHistory('LOGIN');
            const currentStage = l.application_stage || l.app_stage || loan.status || 'submitted';
            const appScore = l.app_score || loginEntry?.appScore;
            const creditScore = l.credit_score || loginEntry?.creditScore;
            return (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Current Status</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="Current Stage" value={currentStage} />
                    <Field label="Loan Account Number" value={l.loan_account_number || '—'} />
                    <Field label="Stage Changed At" value={l.stage_changed_at ? new Date(l.stage_changed_at).toLocaleDateString('en-IN') : '—'} />
                  </div>
                </div>
                {(appScore || creditScore) && (
                  <div>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Login Stage</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {appScore && <Field label="App Score" value={appScore.toString()} />}
                      {creditScore && <Field label="Credit Score" value={creditScore.toString()} />}
                    </div>
                  </div>
                )}
                {(l.tags && Array.isArray(l.tags) && l.tags.length > 0) && (
                  <div>
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">In Process — Pendency Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {l.tags.map((tag: string, idx: number) => (
                        <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[11px] font-semibold border border-amber-200 dark:border-amber-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-2">Draft Stage</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="Login Date" value={l.login_date ? new Date(l.login_date).toLocaleDateString('en-IN') : '—'} />
                    <Field label="Sourcing Person" value={l.sourcing_person_name || '—'} />
                  </div>
                </div>
              </div>
            );
          })()}
        </Card>
      </div>

      {/* Other Details */}
      <Card title="Other Details" icon={<Building2 size={16} />} iconBg="bg-gray-500/10" iconColor="text-gray-500" accent="border-gray-200/50">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
          <Field label="PDD Status" value={l.pdd_status || 'Pending'} />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Remarks / Comments</p>
          <p className="text-sm font-semibold text-foreground whitespace-pre-wrap">
            {l.remark
              || (l.application_stage === 'CANCELLED' ? l.cancellation_remarks : null)
              || (l.application_stage === 'REJECTED' ? l.rejection_remarks : null)
              || (l.application_stage === 'REWORK' ? l.rework_remarks : null)
              || '—'}
          </p>
        </div>
      </Card>

      {/* Workflow History */}
      <Card title="Workflow History" icon={<FileText size={16} />} iconBg="bg-[#0024A2]/10" iconColor="text-[#0024A2]" accent="border-purple-200/50">
        {(() => {
          let history: any[] = [];
          try {
            history = Array.isArray(l.stage_history) ? l.stage_history
              : typeof l.stage_history === 'string' ? JSON.parse(l.stage_history) : [];
          } catch { history = []; }
          return (
            <div className="relative border-l border-border pl-4 space-y-5 ml-2 mt-2">
              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border border-background shadow-sm" />
                <div className="text-xs">
                  <span className="font-bold text-foreground block">Application Created</span>
                  <span className="text-muted-foreground block text-[11px] mt-0.5">
                    {new Date(loan.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    &nbsp;• by <span className="font-semibold">{loan.created_by_name || 'System'}</span>
                  </span>
                </div>
              </div>

              {history
                .sort((a, b) => new Date(a.updatedAt || a.updated_at).getTime() - new Date(b.updatedAt || b.updated_at).getTime())
                .map((h, idx) => {
                  const stageLabels: any = {
                    SUBMITTED: 'Draft',
                    REWORK: 'Rework Required',
                    LOGIN: 'Login & Verification',
                    SOFT_APPROVAL: 'Soft Approval',
                    SANCTIONED: 'Sanctioned',
                    DISBURSED: 'Disbursed',
                    REJECTED: 'Rejected',
                  };
                  return (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border border-background shadow-sm" />
                      <div className="text-xs">
                        <span className="font-bold text-foreground block">
                          Stage changed to {stageLabels[h.stage] || h.stage}
                        </span>
                        <span className="text-muted-foreground block text-[11px] mt-0.5">
                          {new Date(h.updatedAt || h.updated_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          &nbsp;• by <span className="font-semibold">{h.updatedByName || h.updatedBy || 'System'}</span>
                        </span>
                        {h.note && (
                          <p className="text-muted-foreground text-xs italic mt-1 bg-muted/40 p-2 rounded-lg border border-border/40">
                            "{h.note}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          );
        })()}
      </Card>
    </div>
  );
}
