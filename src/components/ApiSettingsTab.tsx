import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { Settings, User, Shield, Filter, CheckSquare, Loader2, CreditCard, Copy, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LEAD_FIELDS = [
  { name: 'applicant_name', label: 'Applicant Name', default: true },
  { name: 'applicant_email', label: 'Applicant Email', default: true },
  { name: 'applicant_phone', label: 'Applicant Phone', default: true },
  { name: 'application_no', label: 'Application Number', default: false },
  { name: 'card_variant', label: 'Card Variant', default: false },
  { name: 'cust_type', label: 'Customer Type', default: false },
  { name: 'vkyc_status', label: 'VKYC Status', default: false },
  { name: 'bkyc_status', label: 'BKYC Status', default: false },
  { name: 'card_issued_date', label: 'Card Issued Date', default: false },
  { name: 'disbursed_amount', label: 'Disbursed Amount', default: false },
  { name: 'remark', label: 'Remark', default: false },
];

interface ApiSettings {
  id: string;
  userId: string;
  productCategory: string;
  requiredFields: string[];
  allowedCards: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CardOption {
  id: string;
  name: string;
  bank: string;
  type: string;
  status: string;
  commission: number;
}

const ApiSettingsTab = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cards, setCards] = useState<CardOption[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Load users with API keys on mount
  useEffect(() => {
    loadUsers();
    loadCards();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.getApiUsersList();
      if (res.success) {
        setUsers(res.users || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load users with API keys',
        variant: 'destructive',
      });
    }
  };

  const loadCards = async () => {
    setCardsLoading(true);
    try {
      const res = await api.getAvailableCards();
      if (res.success) {
        setCards(res.cards || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load cards',
        variant: 'destructive',
      });
    } finally {
      setCardsLoading(false);
    }
  };

  // Load settings when user is selected
  useEffect(() => {
    if (selectedUserId) {
      loadSettings();
    } else {
      setSettings(null);
    }
  }, [selectedUserId]);

  const loadSettings = async () => {
    if (!selectedUserId) return;

    setLoading(true);
    try {
      const res = await api.getApiSettings(selectedUserId);
      if (res.success) {
        setSettings(res.settings);
      } else {
        toast({
          title: 'Error',
          description: res.error || 'Failed to load settings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load API settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<ApiSettings>) => {
    if (!selectedUserId) return;

    setSaving(true);
    try {
      const res = await api.updateApiSettings(selectedUserId, updates);
      if (res.success) {
        setSettings(res.settings);
        toast({
          title: 'Success',
          description: 'Settings updated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: res.error || 'Failed to update settings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleApiAccess = async () => {
    if (!settings) return;
    await updateSettings({ enabled: !settings.enabled } as any);
  };

  const handleProductCategoryChange = async (value: string) => {
    await updateSettings({ productCategory: value } as any);
  };

  const handleToggleRequiredField = async (fieldName: string) => {
    if (!settings) return;

    const currentFields = settings.requiredFields || [];
    const newFields = currentFields.includes(fieldName)
      ? currentFields.filter((f) => f !== fieldName)
      : [...currentFields, fieldName];

    await updateSettings({ requiredFields: newFields } as any);
  };

  const handleToggleCard = async (cardId: string) => {
    if (!settings) return;

    const currentCards = settings.allowedCards || [];
    const newCards = currentCards.includes(cardId)
      ? currentCards.filter((c) => c !== cardId)
      : [...currentCards, cardId];

    await updateSettings({ allowedCards: newCards } as any);
  };

  const copyApiKey = () => {
    const selectedUser = users.find((u) => u.id === selectedUserId);
    if (selectedUser?.apiKey) {
      navigator.clipboard.writeText(selectedUser.apiKey);
      toast({
        title: 'Copied',
        description: 'API key copied to clipboard',
      });
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const selectedCardCount = settings?.allowedCards?.length || 0;
  const cardsByBank = cards.reduce((acc: Record<string, CardOption[]>, card) => {
    if (!acc[card.bank]) acc[card.bank] = [];
    acc[card.bank].push(card);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            API Settings Configuration
          </CardTitle>
          <CardDescription>
            Configure API access, product categories, required fields, and allowed cards for each user with API keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* User Selection - Only shows users with API keys */}
          <div className="space-y-2">
            <Label htmlFor="user-select" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Select User (API Keys Created Only)
            </Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="user-select" className="w-full">
                <SelectValue placeholder="-- Select a user with API key --" />
              </SelectTrigger>
              <SelectContent>
                {users.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No users with API keys found</div>
                ) : (
                  users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} - {user.mobile} ({user.role})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {users.length === 0 && (
              <p className="text-xs text-muted-foreground">No users have created API keys yet. Generate API keys in the "API Integration & Key Generation" section first.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settings Panel */}
      {loading && (
        <Card>
          <CardContent className="py-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading settings...</span>
          </CardContent>
        </Card>
      )}

      {!loading && !selectedUserId && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Please select a user to configure their API settings</p>
          </CardContent>
        </Card>
      )}

      {!loading && selectedUserId && settings && (
        <>
          {/* Selected User Info with API Key */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuring API for:</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{selectedUser?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser?.mobile} • {selectedUser?.email} • {selectedUser?.role}
                  </p>
                </div>
              </div>

              {/* API Key Display */}
              {selectedUser?.apiKey && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <p className="text-sm font-semibold text-blue-900">Generated API Key:</p>
                  <div className="flex items-center gap-2 bg-white p-3 rounded border border-blue-300">
                    <code className="flex-1 text-xs font-mono break-all">
                      {showApiKey ? selectedUser.apiKey : '•'.repeat(60)}
                    </code>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title={showApiKey ? 'Hide' : 'Show'}
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4 text-gray-600" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={copyApiKey}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <p className="text-xs text-blue-700">Use this key in the Authorization header for API calls</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Access Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="w-5 h-5" />
                API Access Control
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">API Access</p>
                  <p className="text-sm text-muted-foreground">
                    {settings.enabled ? 'User can make API calls' : 'User cannot make API calls'}
                  </p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={handleToggleApiAccess}
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Category Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="w-5 h-5" />
                Product Category Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="product-category">What products can this user access?</Label>
                  <Select
                    value={settings.productCategory}
                    onValueChange={handleProductCategoryChange}
                    disabled={saving}
                  >
                    <SelectTrigger id="product-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Both (Credit Cards & Personal Loans)</SelectItem>
                      <SelectItem value="credit_card">Credit Cards Only</SelectItem>
                      <SelectItem value="personal_loan">Personal Loans Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground bg-blue-50 p-3 rounded border border-blue-200">
                  {settings.productCategory === 'both' && '✓ User can fetch both credit card and personal loan products'}
                  {settings.productCategory === 'credit_card' && '✓ User can only fetch credit card products'}
                  {settings.productCategory === 'personal_loan' && '✓ User can only fetch personal loan products'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Required Lead Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckSquare className="w-5 h-5" />
                Required Lead Fields
              </CardTitle>
              <CardDescription>
                Select which fields are mandatory when this user creates a lead via API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {LEAD_FIELDS.map((field) => {
                  const isRequired = settings.requiredFields?.includes(field.name) || false;
                  return (
                    <div
                      key={field.name}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Label htmlFor={field.name} className="cursor-pointer flex-1">
                        {field.label}
                      </Label>
                      <Switch
                        id={field.name}
                        checked={isRequired}
                        onCheckedChange={() => handleToggleRequiredField(field.name)}
                        disabled={saving}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Selected:</strong> {settings.requiredFields?.length || 0} required field
                  {settings.requiredFields?.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-blue-700 mt-1">API will reject requests missing any of these fields</p>
              </div>
            </CardContent>
          </Card>

          {/* Allowed Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-5 h-5" />
                Allowed Cards for API
              </CardTitle>
              <CardDescription>
                Select which cards this user can submit leads for (leave empty to allow all)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cardsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading cards...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-900">
                      <strong>Selected {selectedCardCount} card{selectedCardCount !== 1 ? 's' : ''}</strong>
                      {selectedCardCount === 0 && ' - User can submit for any card'}
                    </p>
                  </div>

                  {Object.entries(cardsByBank).length === 0 ? (
                    <p className="text-muted-foreground text-sm">No active cards available</p>
                  ) : (
                    Object.entries(cardsByBank).map(([bank, bankCards]) => (
                      <div key={bank} className="border rounded-lg p-4 space-y-3">
                        <h4 className="font-semibold text-sm">{bank}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(bankCards as CardOption[]).map((card) => {
                            const isSelected = settings.allowedCards?.includes(card.id) || false;
                            return (
                              <div
                                key={card.id}
                                className="flex items-start gap-3 p-2 border rounded hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => handleToggleCard(card.id)}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleToggleCard(card.id)}
                                  disabled={saving}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{card.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Commission: ₹{card.commission} • Type: {card.type}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ApiSettingsTab;
