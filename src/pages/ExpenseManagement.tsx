import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Search, Plus, X, Upload, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function ExpenseManagement() {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState<number | null>(null);
    const [rejectRemarks, setRejectRemarks] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [form, setForm] = useState({
        expense_type: '',
        employee_id: '',
        description: '',
        amount: '',
        document: null as File | null,
        expense_date: ''
    });

    const { user } = useAuth();
    const queryClient = useQueryClient();

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

    const { data: expenses = [], isLoading } = useQuery({
        queryKey: ['expenses'],
        queryFn: async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/expenses`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                });
                if (!response.ok) return [];
                return await response.json();
            } catch {
                return [];
            }
        },
    });

    const { data: stats } = useQuery({
        queryKey: ['expense-stats'],
        queryFn: async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/expenses/stats`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                });
                if (!response.ok) return null;
                return await response.json();
            } catch {
                return null;
            }
        },
    });

    const createExpense = useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/expenses`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: formData
            });
            if (!response.ok) throw new Error('Failed to create expense');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
            toast.success('Expense submitted successfully!');
            setShowAddModal(false);
            setForm({
                expense_type: '',
                employee_id: '',
                description: '',
                amount: '',
                document: null,
                expense_date: ''
            });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to submit expense');
        }
    });

    const approveExpense = useMutation({
        mutationFn: async (id: number) => {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/expenses/${id}/approve`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            if (!response.ok) throw new Error('Failed to approve expense');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
            toast.success('Expense approved successfully!');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to approve expense');
        }
    });

    const rejectExpense = useMutation({
        mutationFn: async ({ id, remarks }: { id: number; remarks: string }) => {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/expenses/${id}/reject`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ remarks })
            });
            if (!response.ok) throw new Error('Failed to reject expense');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
            toast.success('Expense rejected successfully!');
            setShowRejectModal(null);
            setRejectRemarks('');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to reject expense');
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!form.expense_type || !form.amount || !form.expense_date) {
            toast.error('Please fill all required fields');
            return;
        }

        const formData = new FormData();
        formData.append('expense_type', form.expense_type);
        formData.append('employee_id', form.employee_id);
        formData.append('description', form.description);
        formData.append('amount', form.amount);
        formData.append('expense_date', form.expense_date);
        if (form.document) {
            formData.append('document', form.document);
        }

        createExpense.mutate(formData);
    };

    const filteredExpenses = expenses.filter((expense: any) => {
        if (statusFilter === 'all') return true;
        return expense.status === statusFilter;
    });

    const canApprove = user?.role === 'admin' || user?.role === 'manager'  || user?.role === 'ops_team';

    const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all";
    const labelClass = "block text-sm font-medium text-foreground mb-1.5";

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expense Management</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Submit, review, and approve team expenses.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-secondary to-primary text-white rounded-xl text-sm font-semibold shadow-md active:scale-[0.98] transition-all"
                    >
                        <Plus size={16} /> File New Expense
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">Pending</p>
                                    <p className="text-2xl font-bold">{stats.pending_count || 0}</p>
                                    <p className="text-xs text-muted-foreground mt-1">₹{Number(stats.total_pending_amount || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <Clock className="text-yellow-500" size={32} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">Approved</p>
                                    <p className="text-2xl font-bold">{stats.approved_count || 0}</p>
                                    <p className="text-xs text-muted-foreground mt-1">₹{Number(stats.total_approved_amount || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <CheckCircle className="text-green-500" size={32} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">Rejected</p>
                                    <p className="text-2xl font-bold">{stats.rejected_count || 0}</p>
                                </div>
                                <XCircle className="text-red-500" size={32} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">Total Approved</p>
                                    <p className="text-2xl font-bold">₹{Number(stats.total_approved_amount || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <DollarSign className="text-blue-500" size={32} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="glass-panel rounded-2xl p-6 min-h-[400px]">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">Expense Records</h2>
                    <div className="flex flex-wrap gap-2">
                        <button 
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                                statusFilter === 'all' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                            All
                        </button>
                        <button 
                            onClick={() => setStatusFilter('pending')}
                            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                                statusFilter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                            Pending
                        </button>
                        <button 
                            onClick={() => setStatusFilter('approved')}
                            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                                statusFilter === 'approved' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                            Approved
                        </button>
                        <button 
                            onClick={() => setStatusFilter('rejected')}
                            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                                statusFilter === 'rejected' ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                            Rejected
                        </button>
                    </div>
                </div>
                {isLoading ? (
                    <div className="text-center text-gray-500 py-12">Loading expenses...</div>
                ) : filteredExpenses.length === 0 ? (
                    <div className="text-center text-gray-500 py-12">No expenses found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Date</th>
                                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Type</th>
                                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Employee</th>
                                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Description</th>
                                    <th className="text-right py-3 px-3 font-medium text-muted-foreground">Amount</th>
                                    <th className="text-center py-3 px-3 font-medium text-muted-foreground">Status</th>
                                    {canApprove && <th className="text-center py-3 px-3 font-medium text-muted-foreground">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExpenses.map((expense: any) => (
                                    <tr key={expense.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                        <td className="py-3 px-3 text-foreground">{new Date(expense.expense_date).toLocaleDateString()}</td>
                                        <td className="py-3 px-3 text-foreground">{expense.expense_type}</td>
                                        <td className="py-3 px-3 text-foreground">{expense.employee_name || '—'}</td>
                                        <td className="py-3 px-3 text-muted-foreground">{expense.description || '—'}</td>
                                        <td className="py-3 px-3 text-right font-medium text-foreground">₹{Number(expense.amount).toLocaleString('en-IN')}</td>
                                        <td className="py-3 px-3 text-center">
                                            <span className={`text-xs px-2 py-1 rounded ${
                                                expense.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                expense.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {expense.status}
                                            </span>
                                        </td>
                                        {canApprove && (
                                            <td className="py-3 px-3">
                                                {expense.status === 'pending' && (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => approveExpense.mutate(expense.id)}
                                                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setShowRejectModal(expense.id)}
                                                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                            title="Reject"
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Expense Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-foreground">Add New Expense</h3>
                            <button 
                                onClick={() => setShowAddModal(false)}
                                className="p-1 rounded-lg hover:bg-muted transition-colors"
                            >
                                <X size={20} className="text-muted-foreground" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Expense Type *</label>
                                    <select 
                                        required
                                        className={inputClass}
                                        value={form.expense_type}
                                        onChange={e => setForm({ ...form, expense_type: e.target.value })}
                                    >
                                        <option value="">Select Type</option>
                                        <option value="Salary/Commission">Salary/Commission</option>
                                        <option value="Rent">Rent</option>
                                        <option value="Electricity">Electricity</option>
                                        <option value="Banking/SOA">Banking/SOA</option>
                                        <option value="RTO">RTO</option>
                                        <option value="Cashback">Cashback</option>
                                        <option value="FC Difference">FC Difference</option>
                                        <option value="Customer EMI">Customer EMI</option>
                                        <option value="Other Office Expense">Other Office Expense</option>
                                    </select>
                                </div>

                                <div>
                                    <label className={labelClass}>Employee / Agent Name</label>
                                    <select 
                                        className={inputClass}
                                        value={form.employee_id}
                                        onChange={e => setForm({ ...form, employee_id: e.target.value })}
                                    >
                                        <option value="">Select Employee (Optional)</option>
                                        {users.map((user: any) => (
                                            <option key={user.id} value={user.id}>
                                                {user.name || user.full_name || user.email}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={labelClass}>Amount (₹) *</label>
                                    <input 
                                        required
                                        type="number"
                                        step="0.01"
                                        className={inputClass}
                                        value={form.amount}
                                        onChange={e => setForm({ ...form, amount: e.target.value })}
                                        placeholder="Enter amount"
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>Date of Expense *</label>
                                    <input 
                                        required
                                        type="date"
                                        className={inputClass}
                                        value={form.expense_date}
                                        onChange={e => setForm({ ...form, expense_date: e.target.value })}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className={labelClass}>Description</label>
                                    <textarea 
                                        className={inputClass}
                                        rows={3}
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        placeholder="Enter expense description"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className={labelClass}>Supporting Document</label>
                                    <div className="relative">
                                        <input 
                                            type="file"
                                            accept="image/*,.pdf"
                                            className={inputClass}
                                            onChange={e => setForm({ ...form, document: e.target.files?.[0] || null })}
                                        />
                                        {form.document && (
                                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                                <Upload size={12} /> {form.document.name}
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Upload JPG, PNG or PDF (Max 10MB)</p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-border">
                                <button 
                                    type="submit"
                                    disabled={createExpense.isPending}
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                                >
                                    {createExpense.isPending ? 'Submitting...' : 'Submit Expense'}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-xl shadow-2xl max-w-md w-full">
                        <div className="p-4 border-b border-border">
                            <h3 className="text-lg font-bold text-foreground">Reject Expense</h3>
                        </div>
                        <div className="p-6">
                            <label className={labelClass}>Reason for Rejection *</label>
                            <textarea 
                                className={inputClass}
                                rows={4}
                                value={rejectRemarks}
                                onChange={e => setRejectRemarks(e.target.value)}
                                placeholder="Enter reason for rejection"
                            />
                        </div>
                        <div className="flex gap-3 p-4 border-t border-border">
                            <button 
                                onClick={() => {
                                    if (!rejectRemarks.trim()) {
                                        toast.error('Please enter a reason for rejection');
                                        return;
                                    }
                                    rejectExpense.mutate({ id: showRejectModal, remarks: rejectRemarks });
                                }}
                                disabled={rejectExpense.isPending}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
                            >
                                {rejectExpense.isPending ? 'Rejecting...' : 'Reject Expense'}
                            </button>
                            <button 
                                onClick={() => {
                                    setShowRejectModal(null);
                                    setRejectRemarks('');
                                }}
                                className="px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
