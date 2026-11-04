import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Building2, UserCircle, Calculator, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function CustomerProfileForm({ leadId }: { leadId: number }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({
        profile_type: 'salaried',
        sub_type: '',
        company_name: '',
        designation: '',
        current_job_experience_years: '',
        total_work_experience_years: '',
        net_monthly_salary: '',
        salary_credit_mode: 'account_transfer',
        salary_slip_available: false,
        business_name: '',
        business_vintage_years: '',
        professional_type: '',
        freelancer_type: '',
        practice_experience_years: '',
        itr_available: false,
        annual_income: ''
    });

    const { data: profile, isLoading } = useQuery({
        queryKey: ['lead-profile', leadId],
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/leads/${leadId}/profile`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to load profile');
            return await res.json();
        }
    });

    useEffect(() => {
        if (profile) {
            setFormData(profile);
        }
    }, [profile]);

    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/leads/${leadId}/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to save profile');
            return await res.json();
        },
        onSuccess: () => {
            toast.success('Customer profile saved successfully!');
            queryClient.invalidateQueries({ queryKey: ['lead-profile', leadId] });
            setIsEditing(false);
        },
        onError: (err: any) => {
            toast.error(err.message || 'Error saving profile');
        }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSave = () => {
        saveMutation.mutate(formData);
    };

    if (isLoading) return <div className="animate-pulse bg-muted h-64 rounded-xl"></div>;

    return (
        <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-accent"><Briefcase size={20} /></span>
                    <h2 className="text-lg font-bold text-foreground">Customer Profile</h2>
                </div>
                {user?.role === 'admin' && (
                    <button
                        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isEditing ? 'bg-accent text-accent-foreground hover:bg-accent/90' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            }`}
                        disabled={saveMutation.isPending}
                    >
                        {saveMutation.isPending ? 'Saving...' : isEditing ? 'Save Profile' : 'Edit Profile'}
                    </button>
                )}
            </div>

            <div className="space-y-6">
                {/* Profile Type Selection */}
                <div className="grid grid-cols-2 gap-4">
                    <div
                        onClick={() => isEditing && setFormData({ ...formData, profile_type: 'salaried' })}
                        className={`p-4 rounded-xl border-2 transition-all cursor-${isEditing ? 'pointer' : 'default'} ${formData.profile_type === 'salaried' ? 'border-accent bg-accent/5' : 'border-border bg-card'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <Building2 className={formData.profile_type === 'salaried' ? 'text-accent' : 'text-muted-foreground'} />
                            <div>
                                <h4 className="font-semibold text-foreground">Salaried</h4>
                                <p className="text-xs text-muted-foreground">Employed by a company</p>
                            </div>
                        </div>
                    </div>
                    <div
                        onClick={() => isEditing && setFormData({ ...formData, profile_type: 'self_employed' })}
                        className={`p-4 rounded-xl border-2 transition-all cursor-${isEditing ? 'pointer' : 'default'} ${formData.profile_type === 'self_employed' ? 'border-accent bg-accent/5' : 'border-border bg-card'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <UserCircle className={formData.profile_type === 'self_employed' ? 'text-accent' : 'text-muted-foreground'} />
                            <div>
                                <h4 className="font-semibold text-foreground">Self Employed</h4>
                                <p className="text-xs text-muted-foreground">Business, Professional, etc.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dynamic Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {formData.profile_type === 'salaried' && (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Company Name</label>
                                <input disabled={!isEditing} type="text" name="company_name" value={formData.company_name || ''} onChange={handleChange} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" placeholder="TCS, Infosys, etc." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Designation</label>
                                <input disabled={!isEditing} type="text" name="designation" value={formData.designation || ''} onChange={handleChange} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" placeholder="Software Engineer" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Current Job Experience (Years)</label>
                                <input disabled={!isEditing} type="number" name="current_job_experience_years" value={formData.current_job_experience_years || ''} onChange={handleChange} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" placeholder="2.5" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Total Experience (Years)</label>
                                <input disabled={!isEditing} type="number" name="total_work_experience_years" value={formData.total_work_experience_years || ''} onChange={handleChange} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" placeholder="5" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Net Monthly Salary</label>
                                <div className="relative">
                                    <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                    <input disabled={!isEditing} type="number" name="net_monthly_salary" value={formData.net_monthly_salary || ''} onChange={handleChange} className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-accent" placeholder="50000" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Salary Credit Mode</label>
                                <select disabled={!isEditing} name="salary_credit_mode" value={formData.salary_credit_mode || 'account_transfer'} onChange={handleChange} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent">
                                    <option value="account_transfer">Account Transfer</option>
                                    <option value="cash">Cash</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 mt-6">
                                <input disabled={!isEditing} type="checkbox" id="salary_slip" name="salary_slip_available" checked={formData.salary_slip_available} onChange={handleChange} className="rounded border-border text-accent focus:ring-accent" />
                                <label htmlFor="salary_slip" className="text-sm font-medium text-foreground">Valid Salary Slips Available</label>
                            </div>
                        </>
                    )}

                    {formData.profile_type === 'self_employed' && (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Sub Type</label>
                                <select disabled={!isEditing} name="sub_type" value={formData.sub_type || 'business'} onChange={handleChange} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent">
                                    <option value="business">Business</option>
                                    <option value="professional">Professional</option>
                                    <option value="freelancer">Freelancer / Agent</option>
                                    <option value="farmer">Farmer</option>
                                    <option value="other">Other Income</option>
                                </select>
                            </div>

                            {formData.sub_type === 'business' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Business Name</label>
                                        <input disabled={!isEditing} type="text" name="business_name" value={formData.business_name || ''} onChange={handleChange} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Business Vintage (Years)</label>
                                        <input disabled={!isEditing} type="number" name="business_vintage_years" value={formData.business_vintage_years || ''} onChange={handleChange} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                                    </div>
                                </>
                            )}

                            {formData.sub_type === 'professional' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Profession Type</label>
                                        <select disabled={!isEditing} name="professional_type" value={formData.professional_type || 'ca'} onChange={handleChange} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent">
                                            <option value="ca">CA</option>
                                            <option value="doctor">Doctor</option>
                                            <option value="engineer">Engineer</option>
                                            <option value="architect">Architect</option>
                                        </select>
                                    </div>
                                    {formData.professional_type === 'doctor' && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground">Doctor Specialty</label>
                                            <select disabled={!isEditing} name="doctor_specialty" value={formData.doctor_specialty || 'mbbs'} onChange={handleChange} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent">
                                                <option value="mbbs">MBBS</option>
                                                <option value="md_ms">MD/MS</option>
                                                <option value="bds_mds">BDS/MDS (Dentist)</option>
                                            </select>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Practice Experience (Years)</label>
                                        <input disabled={!isEditing} type="number" name="practice_experience_years" value={formData.practice_experience_years || ''} onChange={handleChange} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                                    </div>
                                </>
                            )}

                            {formData.sub_type === 'freelancer' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Freelancer / Agent Type</label>
                                    <select disabled={!isEditing} name="freelancer_type" value={formData.freelancer_type || 'it'} onChange={handleChange} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent">
                                        <option value="it">IT Freelancer</option>
                                        <option value="lic_agent">LIC Agent</option>
                                        <option value="property_broker">Property Broker</option>
                                        <option value="gig_worker">Gig Worker</option>
                                        <option value="commission_agent">Other Commission Agent</option>
                                    </select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Annual Income (Latest ITR)</label>
                                <div className="relative">
                                    <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                    <input disabled={!isEditing} type="number" name="annual_income" value={formData.annual_income || ''} onChange={handleChange} className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-accent" placeholder="600000" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-6">
                                <input disabled={!isEditing} type="checkbox" id="itr_available" name="itr_available" checked={formData.itr_available} onChange={handleChange} className="rounded border-border text-accent focus:ring-accent" />
                                <label htmlFor="itr_available" className="text-sm font-medium text-foreground">Valid ITR Available</label>
                            </div>
                        </>
                    )}
                </div>

                {!isEditing && !profile && (
                    <div className="flex items-center justify-center p-4 rounded-xl border border-dashed border-border bg-muted/30">
                        <div className="flex flex-col items-center text-center">
                            <Info className="text-muted-foreground mb-2" />
                            <p className="text-sm font-medium">No Profile Data Saved</p>
                            <p className="text-xs text-muted-foreground mt-1">Click 'Edit Profile' to add customer profiling information.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
