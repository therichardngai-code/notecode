/**
 * Global Approval Gate Section
 * Configure global approval rules for AI actions with 3 categories:
 * 1. Tool Rules - which tools need approval (Bash, Write, Edit, etc.)
 * 2. Dangerous Commands - regex patterns for dangerous bash commands
 * 3. Dangerous Files - regex patterns for sensitive file paths
 *
 * Features:
 * - Built-in patterns displayed as read-only (collapsible)
 * - Regex validation with error display
 * - Test popover for pattern testing
 *
 * Note: Project-level approval gates override global settings
 */

import { useState, useEffect } from 'react';
import { Shield, Plus, X, Loader2, Info, Terminal, FileWarning, Wrench, FlaskConical, Lock } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useSettings, useUpdateSettings } from '@/shared/hooks/use-settings';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/shared/components/ui/collapsible';
import { BUILTIN_PATTERNS, AVAILABLE_TOOLS } from '@/shared/constants/approval-gate-constants';
import { isValidRegex, testRegexPattern, getRegexError } from '@/shared/lib/regex-utils';
import type { ToolRule } from '@/adapters/api/settings-api';

/** Pattern input row with validation and test feature */
function PatternInputRow({
  pattern,
  placeholder,
  onChange,
  onRemove,
}: {
  pattern: string;
  placeholder: string;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  const [testInput, setTestInput] = useState('');
  const [showTest, setShowTest] = useState(false);
  const regexError = getRegexError(pattern);
  const isValid = !regexError;
  const testResult = isValid && testInput ? testRegexPattern(pattern, testInput) : null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={pattern}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
              'w-full px-3 py-1.5 text-sm border rounded-md bg-background text-foreground font-mono pr-10',
              isValid ? 'border-border' : 'border-red-500'
            )}
          />
          {/* Test button */}
          <button
            type="button"
            onClick={() => setShowTest(!showTest)}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted transition-colors',
              showTest ? 'text-primary' : 'text-muted-foreground'
            )}
            title="Test pattern"
          >
            <FlaskConical className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors"
          title="Remove pattern"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Validation error */}
      {regexError && (
        <p className="text-xs text-red-500 pl-1">{regexError}</p>
      )}

      {/* Test popover */}
      {showTest && (
        <div className="flex items-center gap-2 pl-1">
          <input
            type="text"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Test input..."
            className="flex-1 px-2 py-1 text-xs border border-border rounded bg-muted/50 text-foreground font-mono"
          />
          {testInput && (
            <span className={cn('text-xs font-medium', testResult ? 'text-green-500' : 'text-muted-foreground')}>
              {testResult ? '✓ Matches' : '✗ No match'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Read-only built-in patterns section */
function BuiltinPatternsSection({ type, patterns }: { type: 'commands' | 'files'; patterns: readonly string[] }) {
  const Icon = type === 'commands' ? Terminal : FileWarning;
  const iconColor = type === 'commands' ? 'text-orange-500' : 'text-red-500';
  const title = type === 'commands' ? 'Built-in Command Patterns' : 'Built-in File Patterns';

  return (
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full">
        <Lock className="w-3 h-3" />
        <span>{title} ({patterns.length})</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-1 pl-5">
          {patterns.map((pattern, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Icon className={cn('w-3 h-3', iconColor, 'opacity-50')} />
              <code className="text-xs font-mono text-muted-foreground opacity-70">{pattern}</code>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground/60 italic mt-2">
            These patterns are always active and cannot be modified
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function GlobalApprovalGateSection() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [enabled, setEnabled] = useState(false);
  const [toolRules, setToolRules] = useState<ToolRule[]>([]);
  const [dangerousCommands, setDangerousCommands] = useState<string[]>([]);
  const [dangerousFiles, setDangerousFiles] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Check if all patterns are valid
  const hasInvalidPatterns = [...dangerousCommands, ...dangerousFiles].some(p => !isValidRegex(p));

  // Sync with API data
  useEffect(() => {
    if (settings) {
      setEnabled(settings.approvalGate?.enabled || false);
      setToolRules(settings.approvalGate?.toolRules || []);
      setDangerousCommands(settings.approvalGate?.dangerousCommands || []);
      setDangerousFiles(settings.approvalGate?.dangerousFiles || []);
      setHasChanges(false);
    }
  }, [settings]);

  const handleSave = () => {
    // Filter out empty and invalid patterns
    const validCommands = dangerousCommands.filter(p => p.trim() && isValidRegex(p));
    const validFiles = dangerousFiles.filter(p => p.trim() && isValidRegex(p));

    updateSettings.mutate({
      approvalGate: enabled ? {
        enabled,
        toolRules: toolRules.length > 0 ? toolRules : undefined,
        dangerousCommands: validCommands.length > 0 ? validCommands : undefined,
        dangerousFiles: validFiles.length > 0 ? validFiles : undefined,
      } : null,
    });
    setHasChanges(false);
  };

  // Tool rules handlers
  const addToolRule = () => {
    setToolRules([...toolRules, { tool: 'Bash', action: 'ask' }]);
    setHasChanges(true);
  };

  const updateToolRule = (index: number, field: keyof ToolRule, value: string) => {
    const updated = [...toolRules];
    updated[index] = { ...updated[index], [field]: value };
    setToolRules(updated);
    setHasChanges(true);
  };

  const removeToolRule = (index: number) => {
    setToolRules(toolRules.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  // Dangerous commands handlers
  const addDangerousCommand = () => {
    setDangerousCommands([...dangerousCommands, '']);
    setHasChanges(true);
  };

  const updateDangerousCommand = (index: number, value: string) => {
    const updated = [...dangerousCommands];
    updated[index] = value;
    setDangerousCommands(updated);
    setHasChanges(true);
  };

  const removeDangerousCommand = (index: number) => {
    setDangerousCommands(dangerousCommands.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  // Dangerous files handlers
  const addDangerousFile = () => {
    setDangerousFiles([...dangerousFiles, '']);
    setHasChanges(true);
  };

  const updateDangerousFile = (index: number, value: string) => {
    const updated = [...dangerousFiles];
    updated[index] = value;
    setDangerousFiles(updated);
    setHasChanges(true);
  };

  const removeDangerousFile = (index: number) => {
    setDangerousFiles(dangerousFiles.filter((_, i) => i !== index));
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
            Configure approval rules for AI actions. Project-level settings override these.
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

      {/* 3 Sections when enabled */}
      {enabled && (
        <div className="space-y-6 pl-2 border-l-2 border-primary/20">

          {/* Section 1: Tool Rules */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-foreground">Tool Rules</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
              <Info className="w-3 h-3" />
              <span>Configure which AI tools require approval</span>
            </div>

            {toolRules.length > 0 && (
              <div className="space-y-2 pl-6">
                {toolRules.map((rule, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={rule.tool}
                      onChange={(e) => updateToolRule(index, 'tool', e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground"
                    >
                      {AVAILABLE_TOOLS.map(tool => (
                        <option key={tool} value={tool}>{tool}</option>
                      ))}
                    </select>
                    <select
                      value={rule.action}
                      onChange={(e) => updateToolRule(index, 'action', e.target.value)}
                      className="px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground"
                    >
                      <option value="ask">Ask</option>
                      <option value="approve">Auto Approve</option>
                      <option value="deny">Deny</option>
                    </select>
                    <button
                      onClick={() => removeToolRule(index)}
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
              onClick={addToolRule}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors pl-6"
            >
              <Plus className="w-4 h-4" />
              Add Tool Rule
            </button>
          </div>

          {/* Section 2: Dangerous Command Patterns */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-foreground">Dangerous Command Patterns</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
              <Info className="w-3 h-3" />
              <span>Regex patterns for dangerous bash commands (e.g., rm\s+-rf)</span>
            </div>

            {/* Built-in patterns (read-only) */}
            <div className="pl-6">
              <BuiltinPatternsSection type="commands" patterns={BUILTIN_PATTERNS.commands} />
            </div>

            {/* Custom patterns */}
            {dangerousCommands.length > 0 && (
              <div className="space-y-2 pl-6">
                {dangerousCommands.map((pattern, index) => (
                  <PatternInputRow
                    key={index}
                    pattern={pattern}
                    placeholder="Regex pattern (e.g., rm\s+-rf)"
                    onChange={(value) => updateDangerousCommand(index, value)}
                    onRemove={() => removeDangerousCommand(index)}
                  />
                ))}
              </div>
            )}

            <button
              onClick={addDangerousCommand}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors pl-6"
            >
              <Plus className="w-4 h-4" />
              Add Custom Pattern
            </button>
          </div>

          {/* Section 3: Dangerous File Patterns */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-foreground">Dangerous File Patterns</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
              <Info className="w-3 h-3" />
              <span>Regex patterns for sensitive files (e.g., \.env$, credentials)</span>
            </div>

            {/* Built-in patterns (read-only) */}
            <div className="pl-6">
              <BuiltinPatternsSection type="files" patterns={BUILTIN_PATTERNS.files} />
            </div>

            {/* Custom patterns */}
            {dangerousFiles.length > 0 && (
              <div className="space-y-2 pl-6">
                {dangerousFiles.map((pattern, index) => (
                  <PatternInputRow
                    key={index}
                    pattern={pattern}
                    placeholder="Regex pattern (e.g., \.env$)"
                    onChange={(value) => updateDangerousFile(index, value)}
                    onRemove={() => removeDangerousFile(index)}
                  />
                ))}
              </div>
            )}

            <button
              onClick={addDangerousFile}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors pl-6"
            >
              <Plus className="w-4 h-4" />
              Add Custom Pattern
            </button>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={!hasChanges || updateSettings.isPending || hasInvalidPatterns}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
          title={hasInvalidPatterns ? 'Fix invalid patterns before saving' : undefined}
        >
          {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
        </button>
        {hasInvalidPatterns && hasChanges && (
          <span className="text-red-500 text-sm">Fix invalid patterns</span>
        )}
        {updateSettings.isSuccess && !hasChanges && (
          <span className="text-green-600 text-sm">✓ Saved</span>
        )}
      </div>
    </div>
  );
}
