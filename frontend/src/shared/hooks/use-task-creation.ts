/**
 * Shared Task Creation Hook
 * Single utility for creating tasks from any view (floating panel or full page)
 */

import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCreateTask, useUpdateTask } from './use-tasks-query';
import { useStartSession } from './use-sessions-query';
import type { CreateTaskRequest } from '@/adapters/api';
import { getProviderForModel } from '@/shared/config/property-config';

// UI property format (used by both FloatingNewTaskPanel and tasks.new.tsx)
export interface TaskProperty {
  id: string;
  type: string;
  value: string | string[];
}

// UI task data format
export interface TaskFormData {
  title: string;
  description?: string; // full page uses this
  requirement?: string; // floating panel uses this
  properties: TaskProperty[];
}

// Convert UI format to API format
function toApiRequest(data: TaskFormData): CreateTaskRequest {
  const getValue = (type: string) => {
    const prop = data.properties.find(p => p.type === type);
    return Array.isArray(prop?.value) ? prop.value[0] : prop?.value;
  };
  const getValues = (type: string) => {
    const prop = data.properties.find(p => p.type === type);
    return Array.isArray(prop?.value) ? prop.value : prop?.value ? [prop.value] : undefined;
  };
  // Toggle properties: check if ['true'] is set
  const getToggle = (type: string) => {
    const values = getValues(type);
    return values?.includes('true') ?? false;
  };

  // Convert tools array to ToolConfig (always allowlist mode from UI)
  const toolValues = getValues('tools');
  const tools = toolValues?.length
    ? { mode: 'allowlist' as const, tools: toolValues.filter(t => t !== 'all') }
    : undefined;

  return {
    projectId: getValue('project') || '',
    title: data.title || 'Untitled Task',
    description: data.description || data.requirement,
    priority: getValue('priority') as 'low' | 'medium' | 'high' | undefined,
    agentRole: getValue('agent') as 'researcher' | 'planner' | 'coder' | 'reviewer' | 'tester' | undefined,
    // Auto-derive provider from model selection
    provider: (getValue('model') ? getProviderForModel(getValue('model')!) : undefined) as 'anthropic' | 'google' | 'openai' | undefined,
    model: getValue('model'),
    skills: getValues('skills'),
    tools,
    contextFiles: getValues('context'),
    subagentDelegates: getToggle('subagentDelegates') || undefined,
    permissionMode: getValue('permissionMode') as 'default' | 'acceptEdits' | 'bypassPermissions' | undefined,
    autoBranch: getToggle('autoBranch') || undefined,
    autoCommit: getToggle('autoCommit') || undefined,
  };
}

export function useTaskCreation() {
  const navigate = useNavigate();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const startSessionMutation = useStartSession();

  const createTask = useCallback(
    async (data: TaskFormData, options?: { navigateTo?: string; autoStart?: boolean }) => {
      const request = toApiRequest(data);

      // Validate required fields
      if (!request.projectId) {
        alert('Please select a project');
        return { success: false, error: 'Project required' };
      }

      try {
        const result = await createTaskMutation.mutateAsync(request);

        // Auto start: create task, set in-progress, then start session
        if (options?.autoStart && result.task) {
          try {
            // Backend requires task to be in-progress before starting session
            await updateTaskMutation.mutateAsync({
              id: result.task.id,
              data: { status: 'in-progress' },
            });
            await startSessionMutation.mutateAsync({
              taskId: result.task.id,
              model: request.model,
              provider: request.provider || undefined,
              tools: request.tools,
              skills: request.skills,
              contextFiles: request.contextFiles,
              subagentDelegates: request.subagentDelegates,
              autoBranch: request.autoBranch,
              autoCommit: request.autoCommit,
            });
          } catch {
            // Session start failed - task still created, user can retry from task detail
          }
          navigate({ to: `/tasks/${result.task.id}` });
        } else {
          const destination = options?.navigateTo ?? '/tasks';
          navigate({ to: destination });
        }

        return { success: true, task: result.task };
      } catch (error) {
        console.error('Failed to create task:', error);
        alert('Failed to create task. Check console for details.');
        return { success: false, error };
      }
    },
    [navigate, createTaskMutation, updateTaskMutation, startSessionMutation]
  );

  return {
    createTask,
    isPending: createTaskMutation.isPending || updateTaskMutation.isPending || startSessionMutation.isPending,
  };
}
