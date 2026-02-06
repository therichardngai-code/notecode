/**
 * Project Management Section
 * Manage projects: favorite, system prompt, approval gate
 * Approval Gate has 3 sections: Tool Rules, Command Patterns, File Patterns
 *
 * Features:
 * - Built-in patterns displayed as read-only (collapsible)
 * - Regex validation with error display
 * - Test popover for pattern testing
 */

import { useState, useEffect } from 'react';
import { Star, StarOff, Folder, ChevronDown, ChevronRight, Loader2, Trash2, Shield, FileText, Plus, X, Wrench, Terminal, FileWarning, Info, FlaskConical, Lock } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useProjects, useUpdateProject, useDeleteProject } from '@/shared/hooks/use-projects-query';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/shared/components/ui/collapsible';
import { BUILTIN_PATTERNS, AVAILABLE_TOOLS } from '@/shared/constants/approval-gate-constants';
import { isValidRegex, testRegexPattern, getRegexError } from '@/shared/lib/regex-utils';
import type { Project, ToolRule, ApprovalGateConfig } from '@/adapters/api/projects-api';

/** Compact pattern input row with validation and test (for project cards) */
function CompactPatternInput({
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
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={pattern}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
              'w-full px-2 py-1 text-xs border rounded bg-background text-foreground font-mono pr-7',
              isValid ? 'border-border' : 'border-red-500'
            )}
          />
          <button
            type="button"
            onClick={() => setShowTest(!showTest)}
            className={cn(
              'absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted',
              showTest ? 'text-primary' : 'text-muted-foreground'
            )}
            title="Test"
          >
            <FlaskConical className="w-3 h-3" />
          </button>
        </div>
        <button onClick={onRemove} className="p-0.5 text-muted-foreground hover:text-destructive">
          <X className="w-3 h-3" />
        </button>
      </div>
      {regexError && <p className="text-[10px] text-red-500">{regexError}</p>}
      {showTest && (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Test..."
            className="flex-1 px-1.5 py-0.5 text-[10px] border border-border rounded bg-muted/50 font-mono"
          />
          {testInput && (
            <span className={cn('text-[10px]', testResult ? 'text-green-500' : 'text-muted-foreground')}>
              {testResult ? '✓' : '✗'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Compact read-only built-in patterns (for project cards) */
function CompactBuiltinPatterns({ patterns }: { type: 'commands' | 'files'; patterns: readonly string[] }) {
  return (
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground w-full">
        <Lock className="w-2 h-2" />
        <span>Built-in ({patterns.length})</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-0.5 pl-3 text-[10px] font-mono text-muted-foreground/70">
          {patterns.map((p, i) => <div key={i}>{p}</div>)}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ProjectCard({ project, onUpdate, onDelete, isUpdating }: {
  project: Project;
  onUpdate: (data: Partial<Project>) => void;
  onDelete: () => void;
  isUpdating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(project.systemPrompt || '');
  const [approvalEnabled, setApprovalEnabled] = useState(project.approvalGate?.enabled || false);
  // Convert backend arrays → UI tool rules
  const backendToToolRules = (autoAllow: string[] = [], requireApproval: string[] = []): ToolRule[] => {
    const rules: ToolRule[] = [];
    autoAllow.forEach(tool => rules.push({ tool, action: 'approve' }));
    requireApproval.forEach(tool => rules.push({ tool, action: 'ask' }));
    return rules;
  };

  const [toolRules, setToolRules] = useState<ToolRule[]>(backendToToolRules(
    project.approvalGate?.autoAllowTools,
    project.approvalGate?.requireApprovalTools,
  ));
  const [dangerousCommands, setDangerousCommands] = useState<string[]>(project.approvalGate?.dangerousPatterns?.commands || []);
  const [dangerousFiles, setDangerousFiles] = useState<string[]>(project.approvalGate?.dangerousPatterns?.files || []);
  const [hasChanges, setHasChanges] = useState(false);

  // Check if all patterns are valid
  const hasInvalidPatterns = [...dangerousCommands, ...dangerousFiles].some(p => !isValidRegex(p));

  useEffect(() => {
    setSystemPrompt(project.systemPrompt || '');
    setApprovalEnabled(project.approvalGate?.enabled || false);
    setToolRules(backendToToolRules(
      project.approvalGate?.autoAllowTools,
      project.approvalGate?.requireApprovalTools,
    ));
    setDangerousCommands(project.approvalGate?.dangerousPatterns?.commands || []);
    setDangerousFiles(project.approvalGate?.dangerousPatterns?.files || []);
    setHasChanges(false);
  }, [project]);

  const handleSave = () => {
    const validCommands = dangerousCommands.filter(p => p.trim() && isValidRegex(p));
    const validFiles = dangerousFiles.filter(p => p.trim() && isValidRegex(p));
    // Convert UI tool rules → backend arrays
    const autoAllowTools = toolRules.filter(r => r.action === 'approve').map(r => r.tool);
    const requireApprovalTools = toolRules.filter(r => r.action === 'ask').map(r => r.tool);

    const approvalGate: ApprovalGateConfig = {
      enabled: approvalEnabled,
      autoAllowTools: autoAllowTools.length > 0 ? autoAllowTools : undefined,
      requireApprovalTools: requireApprovalTools.length > 0 ? requireApprovalTools : undefined,
      dangerousPatterns: (validCommands.length > 0 || validFiles.length > 0) ? {
        commands: validCommands.length > 0 ? validCommands : undefined,
        files: validFiles.length > 0 ? validFiles : undefined,
      } : undefined,
    };
    onUpdate({
      systemPrompt: systemPrompt || null,
      approvalGate,
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

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 bg-muted/30">
        <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-muted rounded">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <Folder className="w-4 h-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{project.name}</div>
          <div className="text-xs text-muted-foreground truncate">{project.path}</div>
        </div>
        <button
          onClick={() => onUpdate({ isFavorite: !project.isFavorite })}
          disabled={isUpdating}
          className={cn(
            'p-1.5 rounded hover:bg-muted transition-colors',
            project.isFavorite ? 'text-yellow-500' : 'text-muted-foreground'
          )}
          title={project.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {project.isFavorite ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
        </button>
        <button
          onClick={onDelete}
          disabled={isUpdating}
          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete project"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="p-4 space-y-4 border-t border-border">
          {/* System Prompt */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium text-foreground">System Prompt</label>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => { setSystemPrompt(e.target.value); setHasChanges(true); }}
              placeholder="Custom instructions for AI when working in this project..."
              className="w-full h-24 px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground resize-none"
            />
          </div>

          {/* Approval Gate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <label className="text-sm font-medium text-foreground">Approval Gate</label>
              </div>
              <button
                onClick={() => { setApprovalEnabled(!approvalEnabled); setHasChanges(true); }}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative',
                  approvalEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              >
                <span className={cn(
                  'absolute left-0 top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform',
                  approvalEnabled ? 'translate-x-6' : 'translate-x-1'
                )} />
              </button>
            </div>

            {/* 3 Sections when enabled */}
            {approvalEnabled && (
              <div className="space-y-4 pl-4 border-l-2 border-primary/20">

                {/* Section 1: Tool Rules */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-3 h-3 text-blue-500" />
                    <span className="text-xs font-medium text-foreground">Tool Rules</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground pl-5">
                    <Info className="w-2 h-2" />
                    <span>Which AI tools require approval</span>
                  </div>

                  {toolRules.length > 0 && (
                    <div className="space-y-1.5 pl-5">
                      {toolRules.map((rule, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <select
                            value={rule.tool}
                            onChange={(e) => updateToolRule(index, 'tool', e.target.value)}
                            className="flex-1 px-2 py-1 text-xs border border-border rounded bg-background text-foreground"
                          >
                            {AVAILABLE_TOOLS.map(tool => (
                              <option key={tool} value={tool}>{tool}</option>
                            ))}
                          </select>
                          <select
                            value={rule.action}
                            onChange={(e) => updateToolRule(index, 'action', e.target.value)}
                            className="px-2 py-1 text-xs border border-border rounded bg-background text-foreground"
                          >
                            <option value="ask">Ask</option>
                            <option value="approve">Auto</option>
                            <option value="deny">Deny</option>
                          </select>
                          <button onClick={() => removeToolRule(index)} className="p-0.5 text-muted-foreground hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={addToolRule} className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 pl-5">
                    <Plus className="w-2.5 h-2.5" />
                    Add Tool
                  </button>
                </div>

                {/* Section 2: Dangerous Commands */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3 h-3 text-orange-500" />
                    <span className="text-xs font-medium text-foreground">Dangerous Commands</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground pl-5">
                    <Info className="w-2 h-2" />
                    <span>Regex patterns (e.g., rm\s+-rf)</span>
                  </div>

                  {/* Built-in patterns */}
                  <div className="pl-5">
                    <CompactBuiltinPatterns type="commands" patterns={BUILTIN_PATTERNS.commands} />
                  </div>

                  {/* Custom patterns */}
                  {dangerousCommands.length > 0 && (
                    <div className="space-y-1.5 pl-5">
                      {dangerousCommands.map((pattern, index) => (
                        <CompactPatternInput
                          key={index}
                          pattern={pattern}
                          placeholder="rm\s+-rf"
                          onChange={(value) => updateDangerousCommand(index, value)}
                          onRemove={() => removeDangerousCommand(index)}
                        />
                      ))}
                    </div>
                  )}

                  <button onClick={addDangerousCommand} className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 pl-5">
                    <Plus className="w-2.5 h-2.5" />
                    Add Pattern
                  </button>
                </div>

                {/* Section 3: Dangerous Files */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileWarning className="w-3 h-3 text-red-500" />
                    <span className="text-xs font-medium text-foreground">Dangerous Files</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground pl-5">
                    <Info className="w-2 h-2" />
                    <span>Regex patterns (e.g., \.env$)</span>
                  </div>

                  {/* Built-in patterns */}
                  <div className="pl-5">
                    <CompactBuiltinPatterns type="files" patterns={BUILTIN_PATTERNS.files} />
                  </div>

                  {/* Custom patterns */}
                  {dangerousFiles.length > 0 && (
                    <div className="space-y-1.5 pl-5">
                      {dangerousFiles.map((pattern, index) => (
                        <CompactPatternInput
                          key={index}
                          pattern={pattern}
                          placeholder="\.env$"
                          onChange={(value) => updateDangerousFile(index, value)}
                          onRemove={() => removeDangerousFile(index)}
                        />
                      ))}
                    </div>
                  )}

                  <button onClick={addDangerousFile} className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 pl-5">
                    <Plus className="w-2.5 h-2.5" />
                    Add Pattern
                  </button>
                </div>
              </div>
            )}

            {!approvalEnabled && (
              <p className="text-xs text-muted-foreground pl-6">
                AI actions proceed without approval
              </p>
            )}
          </div>

          {/* Save Button */}
          {hasChanges && (
            <div className="flex items-center justify-end gap-2">
              {hasInvalidPatterns && (
                <span className="text-[10px] text-red-500">Fix invalid patterns</span>
              )}
              <button
                onClick={handleSave}
                disabled={isUpdating || hasInvalidPatterns}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProjectManagementSection() {
  const { data: projects = [], isLoading } = useProjects();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');

  const filteredProjects = filter === 'favorites'
    ? projects.filter(p => p.isFavorite)
    : projects;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Project Management</h3>
          <p className="text-sm text-muted-foreground">Manage favorites, system prompts, and approval settings</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            All ({projects.length})
          </button>
          <button
            onClick={() => setFilter('favorites')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1',
              filter === 'favorites' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            <Star className="w-3 h-3" />
            Favorites ({projects.filter(p => p.isFavorite).length})
          </button>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {filter === 'favorites' ? 'No favorite projects' : 'No projects found'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onUpdate={(data) => updateProject.mutate({ id: project.id, data })}
              onDelete={() => {
                if (confirm(`Delete project "${project.name}"?`)) {
                  deleteProject.mutate(project.id);
                }
              }}
              isUpdating={updateProject.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
