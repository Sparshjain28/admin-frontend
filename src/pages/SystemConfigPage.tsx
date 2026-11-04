import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';

export default function SystemConfigPage() {
  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/config`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.ok ? await response.json() : [];
    },
  });

  const updateConfig = useMutation({
    mutationFn: async ({ key, value }: any) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/config/key/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ config_value: value })
      });
      if (!response.ok) throw new Error('Failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Configuration updated');
    },
  });

  const toggleStage = useMutation({
    mutationFn: async ({ stage_type, enabled }: any) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/config/toggle-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ stage_type, enabled })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle stage');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to toggle stage');
    },
  });

  const handleUpdate = (key: string, value: string) => {
    updateConfig.mutate({ key, value });
  };

  const handleToggleStage = (stage_type: string, enabled: boolean) => {
    toggleStage.mutate({ stage_type, enabled });
  };

  const isStageEnabled = (stage: string) => {
    const config = configs.find((c: any) => c.config_key === `${stage}_stage_enabled`);
    // Default to true (enabled) if config not found
    if (!config) return true;
    return config.config_value === 'true';
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2"><Settings size={32} /> System Configuration</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="stat-card lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Stage Access Control</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-white">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    {isStageEnabled('lead') ? <Power className="text-green-600" size={20} /> : <PowerOff className="text-red-600" size={20} />}
                    Lead Stage
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Control lead creation and access</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${isStageEnabled('lead') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isStageEnabled('lead') ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleStage('lead', true)}
                  disabled={isStageEnabled('lead')}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Enable
                </button>
                <button
                  onClick={() => handleToggleStage('lead', false)}
                  disabled={!isStageEnabled('lead')}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Disable 24hrs
                </button>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-white">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    {isStageEnabled('login') ? <Power className="text-green-600" size={20} /> : <PowerOff className="text-red-600" size={20} />}
                    Login Stage
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Control login stage access</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${isStageEnabled('login') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isStageEnabled('login') ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleStage('login', true)}
                  disabled={isStageEnabled('login')}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Enable
                </button>
                <button
                  onClick={() => handleToggleStage('login', false)}
                  disabled={!isStageEnabled('login')}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Disable 24hrs
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <h2 className="text-xl font-semibold mb-4">General Settings</h2>
          <div className="space-y-4">
            {configs.filter((c: any) => c.config_type === 'general').map((config: any) => (
              <ConfigItem key={config.id} config={config} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>

        <div className="stat-card">
          <h2 className="text-xl font-semibold mb-4">Document Settings</h2>
          <div className="space-y-4">
            {configs.filter((c: any) => c.config_type === 'document').map((config: any) => (
              <ConfigItem key={config.id} config={config} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>

        <div className="stat-card">
          <h2 className="text-xl font-semibold mb-4">Stage Rules</h2>
          <div className="space-y-4">
            {configs.filter((c: any) => c.config_type === 'stage').map((config: any) => (
              <ConfigItem key={config.id} config={config} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>

        <div className="stat-card">
          <h2 className="text-xl font-semibold mb-4">Timer Settings</h2>
          <div className="space-y-4">
            <div className="border-b pb-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="font-medium text-sm">Lead 24hr Timer</label>
                  <p className="text-xs text-muted-foreground mt-1">Show 24 hour countdown timer on pending leads</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configs.find((c: any) => c.config_key === 'lead_timer_enabled')?.config_value === 'true'}
                    onChange={(e) => handleUpdate('lead_timer_enabled', e.target.checked ? 'true' : 'false')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            <div className="border-b pb-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="font-medium text-sm">Loan SUBMITTED Stage Timer</label>
                  <p className="text-xs text-muted-foreground mt-1">Show 24 hour countdown timer on SUBMITTED stage loans</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configs.find((c: any) => c.config_key === 'loan_submitted_timer_enabled')?.config_value === 'true'}
                    onChange={(e) => handleUpdate('loan_submitted_timer_enabled', e.target.checked ? 'true' : 'false')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <h2 className="text-xl font-semibold mb-4 text-accent">Calling & Statistics Settings</h2>
          <div className="space-y-4">
            {configs.filter((c: any) => c.config_type === 'calling').map((config: any) => (
              <ConfigItem key={config.id} config={config} onUpdate={handleUpdate} />
            ))}
            {configs.filter((c: any) => c.config_type === 'calling').length === 0 && (
              <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">No calling configurations found. Refresh or Reset to Defaults to initialize.</p>
            )}
          </div>
        </div>

        <div className="stat-card">
          <h2 className="text-xl font-semibold mb-4">Integration Settings</h2>
          <div className="space-y-4">
            {configs.filter((c: any) => c.config_type === 'integration').map((config: any) => (
              <ConfigItem key={config.id} config={config} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigItem({ config, onUpdate }: any) {
  const [value, setValue] = useState(config.config_value);
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    onUpdate(config.config_key, value);
    setEditing(false);
  };

  return (
    <div className="border-b pb-3">
      <div className="flex items-center justify-between mb-1">
        <label className="font-medium text-sm">{config.config_key.replace(/_/g, ' ').toUpperCase()}</label>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
        ) : (
          <button onClick={handleSave} className="text-xs text-green-600 hover:underline">Save</button>
        )}
      </div>
      {editing ? (
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm"
        />
      ) : (
        <p className="text-sm text-muted-foreground">{value}</p>
      )}
      {config.description && <p className="text-xs text-muted-foreground mt-1">{config.description}</p>}
    </div>
  );
}
