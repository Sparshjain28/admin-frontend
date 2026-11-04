import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ExpensePage() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/expenses`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.ok ? await response.json() : [];
    },
  });

  const createExpense = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense submitted');
      setShowForm(false);
    },
  });

  const approveExpense = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/expenses/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense approved');
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2"><DollarSign size={32} /> Expense Management</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg">
          <Plus size={18} /> Submit Expense
        </button>
      </div>

      {showForm && <ExpenseForm onClose={() => setShowForm(false)} onSubmit={(data) => createExpense.mutate(data)} />}

      <div className="stat-card">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3">Date</th>
              <th className="text-left py-3">Type</th>
              <th className="text-left py-3">Employee</th>
              <th className="text-left py-3">Amount</th>
              <th className="text-left py-3">Status</th>
              <th className="text-right py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense: any) => (
              <tr key={expense.id} className="border-b">
                <td className="py-3">{new Date(expense.expense_date).toLocaleDateString()}</td>
                <td className="py-3">{expense.expense_type}</td>
                <td className="py-3">{expense.employee_name}</td>
                <td className="py-3">₹{Number(expense.amount).toLocaleString()}</td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    expense.status === 'approved' ? 'bg-green-100 text-green-800' :
                    expense.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>{expense.status}</span>
                </td>
                <td className="py-3 text-right">
                  {expense.status === 'pending' && (
                    <button onClick={() => approveExpense.mutate(expense.id)} className="text-green-600 hover:text-green-800">
                      <Check size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpenseForm({ onClose, onSubmit }: any) {
  const [form, setForm] = useState({ expense_type: 'salary', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0] });

  const handleSubmit = () => {
    if (!form.amount || !form.expense_date) {
      toast.error('Please fill all required fields');
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Submit Expense</h2>
        <div className="space-y-3">
          <select value={form.expense_type} onChange={e => setForm({...form, expense_type: e.target.value})} className="w-full px-3 py-2 border rounded">
            <option value="salary">Salary</option>
            <option value="rent">Rent</option>
            <option value="electricity">Electricity</option>
            <option value="rto">RTO</option>
            <option value="travel">Travel</option>
            <option value="other">Other</option>
          </select>
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border rounded" rows={3} />
          <input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full px-3 py-2 border rounded" />
          <input type="date" value={form.expense_date} onChange={e => setForm({...form, expense_date: e.target.value})} className="w-full px-3 py-2 border rounded" />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSubmit} className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded">Submit</button>
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
        </div>
      </div>
    </div>
  );
}
