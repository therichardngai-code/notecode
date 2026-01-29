/**
 * Global Approval Gate Section
 * Configure global approval rules for AI actions
 * Note: Project-level approval gates override global settings
 */

import { useState, useEffect } from 'react';
import { Shield, Plus, X, Loader2, Info } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useSettings, useUpdateSettings } from '@/shared/hooks/use-settings';
import type { ApprovalGateRule } from '@/adapters/api/settings-api';

export function GlobalApprovalGateSection() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [enabled, setEnabled] = useState(false);
  const [rules, setRules] = useState<ApprovalGateRule[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with API data
  useEffect(() => {
    if (settings) {
      setEnabled(settings.approvalGate?.enabled || false);
      setRules(settings.approvalGate?.rules || []);
      setHasChanges(false);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      approvalGate: enabled ? { enabled, rules } : null,
    });
    setHasChanges(false);
  };

  const addRule = () => {
    setRules([...rules, { pattern: '', action: 'ask' }]);
    setHasChanges(true);
  };

  const updateRule = (index: number, field: keyof ApprovalGateRule, value: string) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], [field]: value };
    setRules(updated);
    setHasChanges(true);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground mb-1">Global Approval Gate</h3>
          <p className="text-sm text-muted-foreground">
            Define rules for AI actions across all projects. Project-level settings override these.
          </p>
        </div>
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between py-2">
        <span className="text-sm font-medium text-foreground">Enable Approval Gate</span>
        <button
          onClick={() => { setEnabled(!enabled); setHasChanges(true); }}
          className={cn(
            'w-11 h-6 rounded-full transition-colors relative',
            enabled ? 'bg-primary' : 'bg-muted-foreground/30'
          )}
        >
          <span className={cn(
            'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
            enabled ? 'translate-x-6' : 'translate-x-1'
          )} />
        </button>
      </div>

      {/* Rules Section */}
      {enabled && (
        <div className="space-y-3 pl-2 border-l-2 border-primary/20">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-3 h-3" />
            <span>Define patterns to match commands (e.g., "rm -rf", "git push")</span>
          </div>

          {rules.length > 0 && (
            <div className="space-y-2">
              {rules.map((rule, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rule.pattern}
                    onChange={(e) => updateRule(index, 'pattern', e.target.value)}
                    placeholder="Pattern (e.g., rm -rf)"
                    className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground"
                  />
                  <select
                    value={rule.action}
                    onChange={(e) => updateRule(index, 'action', e.target.value as ApprovalGateRule['action'])}
                    className="px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="ask">Ask</option>
                    <option value="approve">Auto Approve</option>
                    <option value="deny">Deny</option>
                  </select>
                  <button
                    onClick={() => removeRule(index)}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors"
                    title="Remove rule"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addRule}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={!hasChanges || updateSettings.isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
        >
          {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
        </button>
        {updateSettings.isSuccess && !hasChanges && (
          <span className="text-green-600 text-sm">✓ Saved</span>
        )}
      </div>
    </div>
  );
}
