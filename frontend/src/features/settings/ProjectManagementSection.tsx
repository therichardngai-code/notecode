/**
 * Project Management Section
 * Manage projects: favorite, system prompt, approval gate
 */

import { useState, useEffect } from 'react';
import { Star, StarOff, Folder, ChevronDown, ChevronRight, Loader2, Trash2, Shield, FileText, Plus, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useProjects, useUpdateProject, useDeleteProject } from '@/shared/hooks/use-projects-query';
import type { Project, ApprovalGateRule } from '@/adapters/api/projects-api';

function ProjectCard({ project, onUpdate, onDelete, isUpdating }: {
  project: Project;
  onUpdate: (data: Partial<Project>) => void;
  onDelete: () => void;
  isUpdating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(project.systemPrompt || '');
  const [approvalEnabled, setApprovalEnabled] = useState(project.approvalGate?.enabled || false);
  const [approvalRules, setApprovalRules] = useState<ApprovalGateRule[]>(project.approvalGate?.rules || []);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSystemPrompt(project.systemPrompt || '');
    setApprovalEnabled(project.approvalGate?.enabled || false);
    setApprovalRules(project.approvalGate?.rules || []);
    setHasChanges(false);
  }, [project]);

  const handleSave = () => {
    onUpdate({
      systemPrompt: systemPrompt || null,
      approvalGate: { enabled: approvalEnabled, rules: approvalRules },
    });
    setHasChanges(false);
  };

  const addRule = () => {
    setApprovalRules([...approvalRules, { pattern: '', action: 'ask' }]);
    setHasChanges(true);
  };

  const updateRule = (index: number, field: keyof ApprovalGateRule, value: string) => {
    const updated = [...approvalRules];
    updated[index] = { ...updated[index], [field]: value };
    setApprovalRules(updated);
    setHasChanges(true);
  };

  const removeRule = (index: number) => {
    setApprovalRules(approvalRules.filter((_, i) => i !== index));
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
                  'w-10 h-6 rounded-full transition-colors relative',
                  approvalEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              >
                <span className={cn(
                  'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                  approvalEnabled ? 'translate-x-5' : 'translate-x-1'
                )} />
              </button>
            </div>

            {/* Rules list - only show when enabled */}
            {approvalEnabled && (
              <div className="space-y-2 pl-6">
                <p className="text-xs text-muted-foreground">
                  Define rules for file patterns (e.g., *.ts, src/**)
                </p>
                {approvalRules.map((rule, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={rule.pattern}
                      onChange={(e) => updateRule(index, 'pattern', e.target.value)}
                      placeholder="Pattern (e.g., *.ts)"
                      className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background text-foreground"
                    />
                    <select
                      value={rule.action}
                      onChange={(e) => updateRule(index, 'action', e.target.value as ApprovalGateRule['action'])}
                      className="px-2 py-1 text-sm border border-border rounded bg-background text-foreground"
                    >
                      <option value="ask">Ask</option>
                      <option value="approve">Auto Approve</option>
                      <option value="deny">Deny</option>
                    </select>
                    <button
                      onClick={() => removeRule(index)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addRule}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                >
                  <Plus className="w-3 h-3" />
                  Add Rule
                </button>
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
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={isUpdating}
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
