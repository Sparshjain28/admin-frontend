import { User, IndianRupee } from 'lucide-react';
import { Card, Field, EditProps } from './shared';
import { useAuth } from '@/contexts/AuthContext';

interface ApplicantTabProps extends EditProps {
  loan: any;
  banks: any[];
}

export default function ApplicantTab({
  loan, banks,
  canEditLoanFromCard, isLoanOperations, editModalState, editForm, setEditForm, isSavingEdit, handleSavePartial, openEditModal,
}: ApplicantTabProps) {
  const l = loan as any;
  const { user } = useAuth();

  // Strictly only for loan operations account
  const isLoanOps = user?.role === 'loan_operations';

  const renderCurrentAddress = () => {
    const fullAddr = l.current_address || loan.address || '';
    if (!fullAddr) return 'NA';
    const district = l.current_district || '';
    const state = l.current_state || '';
    const pincode = l.current_pincode || '';
    const landmark = l.current_landmark || l.landmark || '';

    let rest = fullAddr;
    if (pincode) rest = rest.replace(new RegExp('\\b' + pincode + '\\b', 'gi'), '');
    if (state) rest = rest.replace(new RegExp('\\b' + state + '\\b', 'gi'), '');
    if (district) rest = rest.replace(new RegExp('\\b' + district + '\\b', 'gi'), '');
    if (landmark) {
      const escapedLandmark = landmark.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      rest = rest.replace(new RegExp(escapedLandmark, 'gi'), '');
    }
    rest = rest
      .replace(/,\s*,/g, ',')
      .replace(/-\s*-/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
    rest = rest.replace(/^[,\-\s]+|[,\-\s]+$/g, '');
    const cleaned = rest || fullAddr;
    const residenceType = loan.stage_data?.residenceType ? ` (${loan.stage_data.residenceType})` : '';
    return cleaned + residenceType;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Applicant Information */}
        <Card
          title="Applicant Information"
          icon={<User size={16} />}
          iconBg="bg-[#0024A2]/10"
          iconColor="text-[#0024A2]"
          accent="border-[#0024A2]/20"
          onEdit={isLoanOps && editModalState !== 'applicant' ? () => openEditModal('applicant') : undefined}
        >
          {editModalState === 'applicant' ? (
            <div className="flex flex-col gap-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Applicant Name</label>
                  <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.applicant_name || ''} onChange={e => setEditForm({...editForm, applicant_name: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Mobile</label>
                  <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.mobile || ''} onChange={e => setEditForm({...editForm, mobile: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Email</label>
                  <input type="email" className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">PAN Number</label>
                  <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500 uppercase" value={editForm.pan_number || ''} onChange={e => setEditForm({...editForm, pan_number: e.target.value.toUpperCase()})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Co-Applicant Name</label>
                  <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.co_applicant_name || ''} onChange={e => setEditForm({...editForm, co_applicant_name: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Co-Applicant Mobile</label>
                  <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.co_applicant_mobile || ''} onChange={e => setEditForm({...editForm, co_applicant_mobile: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Guarantor Name</label>
                  <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.guarantor_name || ''} onChange={e => setEditForm({...editForm, guarantor_name: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Guarantor Mobile</label>
                  <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.guarantor_mobile || ''} onChange={e => setEditForm({...editForm, guarantor_mobile: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Marital Status</label>
                  <select className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.marital_status || ''} onChange={e => setEditForm({...editForm, marital_status: e.target.value})}>
                    <option value="">Select Option</option>
                    <option value="Married">Married</option>
                    <option value="Unmarried">Unmarried</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Mother Name</label>
                  <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.mother_name || ''} onChange={e => setEditForm({...editForm, mother_name: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Spouse Name</label>
                  <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.spouse_name || ''} onChange={e => setEditForm({...editForm, spouse_name: e.target.value})} />
                </div>

                {/* Address details */}
                <div className="flex flex-col gap-1 col-span-1 md:col-span-2 border-t border-border/40 pt-3 mt-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Current Address</label>
                  <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.current_address || ''} onChange={e => setEditForm({...editForm, current_address: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Landmark</label>
                  <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.current_landmark || ''} onChange={e => setEditForm({...editForm, current_landmark: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">District</label>
                  <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.current_district || ''} onChange={e => setEditForm({...editForm, current_district: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">State</label>
                  <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.current_state || ''} onChange={e => setEditForm({...editForm, current_state: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Pincode</label>
                  <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.current_pincode || ''} onChange={e => setEditForm({...editForm, current_pincode: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-border/50">
                <button onClick={() => openEditModal('none' as any)} className="px-4 py-1.5 text-sm font-semibold rounded-md border border-border hover:bg-muted text-foreground cursor-pointer">Cancel</button>
                <button onClick={handleSavePartial} disabled={isSavingEdit} className="px-4 py-1.5 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2 cursor-pointer">
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Customer ID" value={l.customer_id} />
              <Field label="Loan Number" value={l.loan_number} />
              <Field label="Full Name" value={loan.applicant_name} />
              <Field label="Mobile" value={loan.mobile} />
              <Field label="Email" value={l.email} />
              <Field label="PAN Number" value={l.pan_number} />
              <Field label="Co-Applicant" value={l.co_applicant_name} />
              <Field label="Co-Applicant Mobile" value={l.co_applicant_mobile} />
              <Field label="Guarantor" value={l.guarantor_name} />
              <Field label="Guarantor Mobile" value={l.guarantor_mobile} />
              <Field label="Marital Status" value={l.marital_status} />
              <Field label="Mother Name" value={l.mother_name} />
              <Field label="Spouse Name" value={l.spouse_name} />
              <div className="col-span-2 border-t border-border/40 pt-3 mt-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Current Address</p>
                <p className="text-sm font-semibold text-foreground">{renderCurrentAddress()}</p>
              </div>
              <Field label="Landmark" value={l.current_landmark || l.landmark} />
              <Field label="District" value={l.current_district} />
              <Field label="State" value={l.current_state} />
              <Field label="Pincode" value={l.current_pincode} />
            </div>
          )}
        </Card>

        {/* Income Details */}
        <Card
          title="Income Details"
          icon={<IndianRupee size={16} />}
          iconBg="bg-green-500/10"
          iconColor="text-green-600"
          accent="border-green-200/50"
          onEdit={isLoanOps && editModalState !== 'income' ? () => openEditModal('income') : undefined}
        >
          {editModalState === 'income' ? (
            <div className="flex flex-col gap-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Income Source</label>
                  <select
                    className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500"
                    value={editForm.income_source || ''}
                    onChange={e => setEditForm({ ...editForm, income_source: e.target.value })}
                  >
                    <option value="">Select Option</option>
                    <option value="Salaried">Salaried</option>
                    <option value="Self Employed">Self Employed</option>
                  </select>
                </div>

                {editForm.income_source === 'Salaried' && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Company Name</label>
                      <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.company_name || ''} onChange={e => setEditForm({ ...editForm, company_name: e.target.value })} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Designation</label>
                      <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.designation || ''} onChange={e => setEditForm({ ...editForm, designation: e.target.value })} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Net Monthly Salary</label>
                      <input type="number" className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.net_monthly_salary || ''} onChange={e => setEditForm({ ...editForm, net_monthly_salary: e.target.value })} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Salary Slip Available</label>
                      <select className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.salary_slip_available || ''} onChange={e => setEditForm({ ...editForm, salary_slip_available: e.target.value })}>
                        <option value="">Select Option</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Current Job (In Yrs)</label>
                      <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.current_job_years || ''} onChange={e => setEditForm({ ...editForm, current_job_years: e.target.value })} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Total Work Exp. (In Yrs)</label>
                      <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.total_work_exp || ''} onChange={e => setEditForm({ ...editForm, total_work_exp: e.target.value })} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Salary Credit Mode</label>
                      <select className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.salary_credit_mode || ''} onChange={e => setEditForm({ ...editForm, salary_credit_mode: e.target.value })}>
                        <option value="">Select Mode</option>
                        <option value="Account Transfer">Account Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="NEFT">NEFT</option>
                        <option value="IMPS">IMPS</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">ITR Available</label>
                      <select className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.itr_available || ''} onChange={e => setEditForm({ ...editForm, itr_available: e.target.value })}>
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    {editForm.itr_available === 'Yes' && (
                      <div className="flex flex-col gap-1 col-span-1 md:col-span-2">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Annual Income (ITR)</label>
                        <input type="number" className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.annual_income_itr || ''} onChange={e => setEditForm({ ...editForm, annual_income_itr: e.target.value })} />
                      </div>
                    )}
                  </>
                )}

                {editForm.income_source === 'Self Employed' && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Profile</label>
                      <select className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.profile || ''} onChange={e => setEditForm({ ...editForm, profile: e.target.value })}>
                        <option value="">Select Profile</option>
                        <option value="Business">Business</option>
                        <option value="Professional">Professional</option>
                        <option value="Freelancer/Agent">Freelancer/Agent</option>
                        <option value="Farmer">Farmer</option>
                        <option value="Other Income">Other Income</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Office Setup</label>
                      <select className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.has_office_setup || ''} onChange={e => setEditForm({ ...editForm, has_office_setup: e.target.value })}>
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    {editForm.profile === 'Business' && (
                      <>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Business Name</label>
                          <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.business_name || ''} onChange={e => setEditForm({ ...editForm, business_name: e.target.value })} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Business Type</label>
                          <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.business_type || ''} onChange={e => setEditForm({ ...editForm, business_type: e.target.value })} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Business Vintage (Years)</label>
                          <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.business_vintage || ''} onChange={e => setEditForm({ ...editForm, business_vintage: e.target.value })} />
                        </div>
                      </>
                    )}
                    {editForm.profile === 'Professional' && (
                      <>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Professional Subtype</label>
                          <select className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.professional_subtype || ''} onChange={e => setEditForm({ ...editForm, professional_subtype: e.target.value })}>
                            <option value="">Select Subtype</option>
                            <option value="CA">CA</option>
                            <option value="Doctor">Doctor</option>
                            <option value="Engineer">Engineer</option>
                            <option value="Architect">Architect</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Practice Experience (In Yrs)</label>
                          <input className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.practice_experience || ''} onChange={e => setEditForm({ ...editForm, practice_experience: e.target.value })} />
                        </div>
                      </>
                    )}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">ITR Available</label>
                      <select className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.itr_available || ''} onChange={e => setEditForm({ ...editForm, itr_available: e.target.value })}>
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    {editForm.itr_available === 'Yes' && (
                      <div className="flex flex-col gap-1 col-span-1 md:col-span-2">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Annual Income (ITR)</label>
                        <input type="number" className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500" value={editForm.annual_income_itr || ''} onChange={e => setEditForm({ ...editForm, annual_income_itr: e.target.value })} />
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-border/50">
                <button onClick={() => openEditModal('none' as any)} className="px-4 py-1.5 text-sm font-semibold rounded-md border border-border hover:bg-muted text-foreground cursor-pointer">Cancel</button>
                <button onClick={handleSavePartial} disabled={isSavingEdit} className="px-4 py-1.5 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2 cursor-pointer">
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2.5">
                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Income Source</label>
                  <select className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/40 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.income_source || ''} disabled>
                    <option value="">Select Income Source</option>
                    <option value="Salaried">Salaried</option>
                    <option value="Self Employed">Self Employed</option>
                  </select>
                </div>
              </div>
              {l.income_source === 'Salaried' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2.5 border-t border-border/40 pt-2.5 mt-1">
                  <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Company Name</label><input className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/20 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.company_name || 'NA'} readOnly /></div>
                  <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Designation</label><input className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/20 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.designation || 'NA'} readOnly /></div>
                  <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Net Monthly Salary</label><input className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/20 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.net_monthly_salary ? `₹${Number(l.net_monthly_salary).toLocaleString('en-IN')}` : 'NA'} readOnly /></div>
                  <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Salary Slip Available</label><select className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/40 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.salary_slip_available || ''} disabled><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
                  <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Current Job (In Yrs)</label><input className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/20 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.current_job_years || 'NA'} readOnly /></div>
                  <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Total Work Exp. (In Yrs)</label><input className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/20 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.total_work_exp || 'NA'} readOnly /></div>
                  <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Salary Credit Mode</label><select className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/40 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.salary_credit_mode || ''} disabled><option value="">Select</option><option value="Account Transfer">Account Transfer</option><option value="Cash">Cash</option></select></div>
                  <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">ITR Available</label><select className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/40 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.itr_available || ''} disabled><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
                  {l.itr_available === 'Yes' && (<div className="flex flex-col col-span-1 md:col-span-2"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Annual Income (ITR)</label><input className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/20 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.annual_income_itr ? `₹${Number(l.annual_income_itr).toLocaleString('en-IN')}` : 'NA'} readOnly /></div>)}
                </div>
              )}
              {l.income_source === 'Self Employed' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2.5 border-t border-border/40 pt-2.5 mt-1">
                  <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Profile</label><select className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/40 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.profile || ''} disabled><option value="">Select Profile</option><option value="Business">Business</option><option value="Professional">Professional</option><option value="Freelancer/Agent">Freelancer/Agent</option><option value="Farmer">Farmer</option><option value="Other Income">Other Income</option></select></div>
                  {l.profile !== 'Farmer' && (
                    <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Office Setup</label><input className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/20 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.has_office_setup || l.stage_data?.hasOfficeSetup || 'NA'} readOnly /></div>
                  )}
                  {l.profile === 'Business' && (
                    <>
                      <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Business Name</label><input className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/20 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.business_name || 'NA'} readOnly /></div>
                      <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Business Type</label><input className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/20 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.business_type || 'NA'} readOnly /></div>
                      <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Business Vintage (Years)</label><input className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/20 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.business_vintage || 'NA'} readOnly /></div>
                    </>
                  )}
                  {l.profile === 'Professional' && (
                    <>
                      <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Professional Subtype</label><select className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/40 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.professional_subtype || ''} disabled><option value="">Select Subtype</option><option value="CA">CA</option><option value="Doctor">Doctor</option><option value="Engineer">Engineer</option><option value="Architect">Architect</option></select></div>
                      <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Practice Experience (In Yrs)</label><input className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/20 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.practice_experience || 'NA'} readOnly /></div>
                    </>
                  )}
                  {l.profile === 'Freelancer/Agent' && (
                    <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Subtype</label><select className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/40 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.freelancer_subtype || ''} disabled><option value="">Select Subtype</option><option value="IT Freelancer">IT Freelancer</option><option value="LIC Agent">LIC Agent</option><option value="Property Broker">Property Broker</option><option value="Gig Worker">Gig Worker</option></select></div>
                  )}
                  {l.profile === 'Other Income' && (
                    <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Profession</label><input className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/20 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.other_income_type || 'NA'} readOnly /></div>
                  )}
                  {l.profile === 'Farmer' && (
                    <>
                      <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Agriculture Land Ownership</label><input className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/20 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.stage_data?.agricultureLandOwnership || 'NA'} readOnly /></div>
                      <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Dairy Income</label><input className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/20 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.stage_data?.dairyIncome || 'NA'} readOnly /></div>
                      {l.stage_data?.dairyIncome === 'Yes' && <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Number of Cattles</label><input className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/20 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.stage_data?.numberOfCattles || 'NA'} readOnly /></div>}
                      <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Jamabandhi Available</label><input className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/20 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.stage_data?.jamabandhiAvailable || 'NA'} readOnly /></div>
                    </>
                  )}
                  {l.profile !== 'Farmer' && (
                    <>
                      <div className="flex flex-col"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">ITR Available</label><select className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/40 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.itr_available || ''} disabled><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
                      {l.itr_available === 'Yes' && (<div className="flex flex-col col-span-1 md:col-span-2"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Annual Income (ITR)</label><input className="w-full px-2 py-0.5 text-[11px] rounded-md border border-border/80 bg-muted/20 text-foreground cursor-not-allowed font-semibold focus:outline-none" value={l.annual_income_itr ? `₹${Number(l.annual_income_itr).toLocaleString('en-IN')}` : 'NA'} readOnly /></div>)}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}