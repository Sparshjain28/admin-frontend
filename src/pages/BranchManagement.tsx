import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, MapPin, Edit, Trash2, UserPlus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { RoleAssignModal } from '@/components/RoleAssignModal';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  };
}

interface AddressSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

async function getAddressSuggestions(input: string): Promise<AddressSuggestion[]> {
  const trimmedInput = input.trim();
  if (!trimmedInput || trimmedInput.length < 2) return [];

  try {
    const response = await fetch(`${API_BASE_URL}/google-maps/autocomplete`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ input })
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data.predictions || [];
  } catch (error) {
    return [];
  }
}

async function getPlaceDetails(placeId: string): Promise<{ lat: number; lng: number; address: string } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/google-maps/place-details`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ place_id: placeId })
    });

    const data = await response.json();
    if (response.ok) return data;
    return null;
  } catch (error) {
    return null;
  }
}

export default function BranchManagement() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [addUserBranch, setAddUserBranch] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const addressDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const addressSuggestionsRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    is_active: true,
  });

  const fetchNextCode = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/branches/next-code`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, code: data.code }));
      }
    } catch { }
  };

  const { data: branchesData, isLoading } = useQuery({
    queryKey: ['branches', page, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '50');
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/branches?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch branches');
      return res.json();
    },
  });

  const branches = branchesData?.data || [];
  const totalBranches = branchesData?.total || 0;
  const totalPages = branchesData?.totalPages || 1;

  const saveBranch = useMutation({
    mutationFn: async (data: any) => {
      const method = editingBranch ? 'PUT' : 'POST';
      const url = editingBranch
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/branches/${editingBranch.id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/branches`;
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save branch');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success(editingBranch ? 'Branch updated' : 'Branch created');
      setShowModal(false);
      resetForm();
    },
    onError: () => toast.error('Failed to save branch'),
  });

  const deleteBranch = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/branches/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to delete branch');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch deleted');
    },
  });

  const handleAddressChange = (value: string) => {
    setFormData({ ...formData, address: value });

    if (addressDebounceTimer.current) {
      clearTimeout(addressDebounceTimer.current);
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length < 2) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    const words = trimmedValue.split(/\s+/).filter(w => w.length > 0);
    const shouldCallApi = words.length >= 1 && value.endsWith(' ');

    if (!shouldCallApi) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    setAddressLoading(true);
    addressDebounceTimer.current = setTimeout(async () => {
      const results = await getAddressSuggestions(value);
      setAddressSuggestions(results);
      setShowAddressSuggestions(results.length > 0);
      setAddressLoading(false);
    }, 300);
  };

  const handleSelectAddressSuggestion = async (suggestion: AddressSuggestion) => {
    setAddressLoading(true);
    try {
      const details = await getPlaceDetails(suggestion.place_id);
      if (details) {
        setFormData({ ...formData, address: details.address });
        setAddressSuggestions([]);
        setShowAddressSuggestions(false);
        toast.success('Address selected');
      }
    } catch (error) {
      toast.error('Failed to get address details');
    } finally {
      setAddressLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      is_active: true,
    });
    setEditingBranch(null);
    setAddressSuggestions([]);
    setShowAddressSuggestions(false);
  };

  const handleEdit = (branch: any) => {
    setEditingBranch(branch);
    setFormData(branch);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveBranch.mutate(formData);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Branch Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{totalBranches} branches total</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search branches..."
            className="px-3 py-2 rounded-lg border border-border bg-background"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
          <button
            onClick={() => { resetForm(); fetchNextCode(); setShowModal(true); }}
            className="flex items-center justify-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm w-full sm:w-auto"
          >
            <Plus size={16} /> Add Branch
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((branch: any) => (
          <div key={branch.id} className="stat-card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-accent" />
                <h3 className="font-semibold text-foreground">{branch.name}</h3>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${branch.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {branch.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">Code: <span className="text-foreground font-medium">{branch.code}</span></p>
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-muted-foreground mt-0.5" />
                <p className="text-muted-foreground">{branch.address}, {branch.city}, {branch.state} - {branch.pincode}</p>
              </div>
              {branch.manager_name && (
                <p className="text-muted-foreground">Manager: <span className="text-foreground">{branch.manager_name}</span></p>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleEdit(branch)}
                className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-sm transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => setAddUserBranch(branch)}
                className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-sm transition-colors font-medium"
              >
                <UserPlus size={14} /> Add User
              </button>
              <button
                onClick={() => deleteBranch.mutate(branch.id)}
                className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      { totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-border bg-card text-foreground disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-border bg-card text-foreground disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}

        <RoleAssignModal
          open={!!addUserBranch}
          onClose={() => setAddUserBranch(null)}
          onSuccess={() => { setAddUserBranch(null); queryClient.invalidateQueries({ queryKey: ['branches'] }); }}
          user={null}
          defaultBranchId={addUserBranch?.id}
        />

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-foreground mb-4">{editingBranch ? 'Edit Branch' : 'Add Branch'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Branch Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Branch Code</label>
                    <input
                      type="text"
                      value={formData.code}
                      readOnly
                      className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm font-mono font-bold cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="relative" ref={addressSuggestionsRef}>
                  <label className="block text-sm font-medium text-foreground mb-1">Address *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={e => handleAddressChange(e.target.value)}
                      onFocus={() => addressSuggestions.length > 0 && setShowAddressSuggestions(true)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                      placeholder="Type address and press space..."
                    />
                    {formData.address && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, address: '' });
                          setAddressSuggestions([]);
                          setShowAddressSuggestions(false);
                        }}
                        className="absolute top-1/2 -translate-y-1/2 right-2 p-1 hover:bg-muted rounded transition-colors"
                      >
                        <X size={14} className="text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-[9999] max-h-48 overflow-y-auto">
                      {addressLoading ? (
                        <div className="p-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                          <Loader2 size={14} className="animate-spin" />
                          Loading...
                        </div>
                      ) : (
                        addressSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectAddressSuggestion(suggestion)}
                            className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b border-border last:border-b-0 flex items-start gap-2"
                          >
                            <MapPin size={14} className="text-primary mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground truncate">{suggestion.main_text}</p>
                              {suggestion.secondary_text && (
                                <p className="text-xs text-muted-foreground truncate">{suggestion.secondary_text}</p>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">State *</label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={e => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Pincode *</label>
                    <input
                      type="text"
                      required
                      value={formData.pincode}
                      onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <label className="text-sm text-foreground">Active</label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saveBranch.isPending}
                    className="flex-1 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {saveBranch.isPending ? 'Saving...' : 'Save Branch'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      );
}

