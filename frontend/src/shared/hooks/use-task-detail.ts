/**
 * Shared Task Detail Hook
 * Single utility for viewing/editing tasks from any view (floating panel or full page)
 * Uses API only - no Zustand store for consistency
 */

import { useCallback, useState, useEffect } from 'react';
import { useTask, useUpdateTask } from './use-tasks-query';
import { useProject } from './use-projects-query';
import type { Task, UpdateTaskRequest, TaskStatus, TaskPriority, AgentRole, ProviderType, ToolConfig, PermissionMode } from '@/adapters/api';
import { getProviderForModel } from '@/shared/config/property-config';

// UI property format (matches PropertyItem component but includes 'status')
export interface TaskDetailProperty {
  id: string;
  type: 'project' | 'agent' | 'provider' | 'model' | 'priority' | 'skills' | 'tools' | 'context' | 'status' | 'subagentDelegates' | 'autoBranch' | 'autoCommit' | 'permissionMode';
  value: string[];
}

// Convert API task to UI property format
function taskToProperties(task: Task): TaskDetailProperty[] {
  const properties: TaskDetailProperty[] = [];

  // Status (always present)
  properties.push({
    id: 'status',
    type: 'status' as TaskDetailProperty['type'],
    value: [task.status],
  });

  // Project
  if (task.projectId) {
    properties.push({
      id: 'project',
      type: 'project',
      value: [task.projectId],
    });
  }

  // Priority
  if (task.priority) {
    properties.push({
      id: 'priority',
      type: 'priority',
      value: [task.priority],
    });
  }

  // Agent Role
  if (task.agentRole) {
    properties.push({
      id: 'agent',
      type: 'agent',
      value: [task.agentRole],
    });
  }

  // Provider
  if (task.provider) {
    properties.push({
      id: 'provider',
      type: 'provider',
      value: [task.provider],
    });
  }

  // Model
  if (task.model) {
    properties.push({
      id: 'model',
      type: 'model',
      value: [task.model],
    });
  }

  // Skills
  if (task.skills && task.skills.length > 0) {
    properties.push({
      id: 'skills',
      type: 'skills',
      value: task.skills,
    });
  }

  // Tools
  if (task.tools && task.tools.tools.length > 0) {
    properties.push({
      id: 'tools',
      type: 'tools',
      value: task.tools.tools,
    });
  }

  // Context Files
  if (task.contextFiles && task.contextFiles.length > 0) {
    properties.push({
      id: 'context',
      type: 'context',
      value: task.contextFiles,
    });
  }

  // Subagent Delegates - only show if explicitly enabled
  if (task.subagentDelegates === true) {
    properties.push({
      id: 'subagentDelegates',
      type: 'subagentDelegates',
      value: ['true'],
    });
  }

  // Auto Branch - only show if explicitly enabled
  if (task.autoBranch === true) {
    properties.push({
      id: 'autoBranch',
      type: 'autoBranch',
      value: ['true'],
    });
  }

  // Auto Commit - only show if explicitly enabled
  if (task.autoCommit === true) {
    properties.push({
      id: 'autoCommit',
      type: 'autoCommit',
      value: ['true'],
    });
  }

  // Permission Mode - only show if not default
  if (task.permissionMode && task.permissionMode !== 'default') {
    properties.push({
      id: 'permissionMode',
      type: 'permissionMode',
      value: [task.permissionMode],
    });
  }

  return properties;
}

// Convert UI properties to API update request
// Note: status is excluded - use updateStatus() for status changes (backend validates transitions)
function propertiesToUpdateRequest(properties: TaskDetailProperty[]): Partial<UpdateTaskRequest> {
  const request: Partial<UpdateTaskRequest> = {};

  for (const prop of properties) {
    const value = prop.value[0];

    switch (prop.type) {
      // Status excluded - backend validates transitions, use updateStatus() instead
      case 'priority':
        request.priority = value as TaskPriority;
        break;
      case 'agent':
        request.agentRole = value as AgentRole;
        break;
      case 'provider':
        request.provider = value as ProviderType;
        break;
      case 'model':
        request.model = value || null;
        // Auto-set provider based on model
        if (value) {
          const provider = getProviderForModel(value);
          if (provider) request.provider = provider as ProviderType;
        }
        break;
      case 'skills':
        request.skills = prop.value;
        break;
      case 'tools':
        // Convert tools array to ToolConfig (always allowlist mode from UI)
        request.tools = prop.value.length > 0
          ? { mode: 'allowlist', tools: prop.value }
          : null;
        break;
      case 'context':
        request.contextFiles = prop.value;
        break;
      case 'subagentDelegates':
        request.subagentDelegates = prop.value.includes('true');
        break;
      case 'autoBranch':
        request.autoBranch = prop.value.includes('true');
        break;
      case 'autoCommit':
        request.autoCommit = prop.value.includes('true');
        break;
      case 'permissionMode':
        request.permissionMode = value as PermissionMode;
        break;
      // project excluded - cannot change project after creation
    }
  }

  return request;
}

export interface UseTaskDetailOptions {
  taskId: string;
}

export function useTaskDetail({ taskId }: UseTaskDetailOptions) {
  // API hooks - single source of truth
  const { data: task, isLoading, error } = useTask(taskId);
  const { data: project } = useProject(task?.projectId || '');
  const updateTaskMutation = useUpdateTask();

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editProperties, setEditProperties] = useState<TaskDetailProperty[]>([]);

  // Track if we've initialized the edit form for this editing session
  // This prevents resetting edit state when task data refetches
  const [editInitialized, setEditInitialized] = useState(false);

  // Initialize edit form only once when entering edit mode
  useEffect(() => {
    if (task && isEditing && !editInitialized) {
      setEditTitle(task.title);
      setEditDescription(task.description || '');
      setEditProperties(taskToProperties(task));
      setEditInitialized(true);
    }
    // Reset initialization flag when exiting edit mode
    if (!isEditing && editInitialized) {
      setEditInitialized(false);
    }
  }, [task, isEditing, editInitialized]);

  // Start editing - useEffect handles initialization
  const startEdit = useCallback(() => {
    if (!task) return;
    setIsEditing(true);
  }, [task]);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Save edits
  const saveEdit = useCallback(async () => {
    if (!task) return { success: false, error: 'No task' };

    try {
      const propsUpdate = propertiesToUpdateRequest(editProperties);
      const updateData: UpdateTaskRequest = {
        title: editTitle,
        description: editDescription || undefined,
        ...propsUpdate,
      };

      const result = await updateTaskMutation.mutateAsync({ id: taskId, data: updateData });
      setIsEditing(false);
      return { success: true };
    } catch (err) {
      console.error('[useTaskDetail] Failed to update task:', err);
      return { success: false, error: err };
    }
  }, [task, taskId, editTitle, editDescription, editProperties, updateTaskMutation]);

  // Update single property
  const updateProperty = useCallback((propertyId: string, values: string[]) => {
    setEditProperties((prev) =>
      prev.map((p) => (p.id === propertyId ? { ...p, value: values } : p))
    );
  }, []);

  // Add property
  const addProperty = useCallback((type: TaskDetailProperty['type']) => {
    if (editProperties.find((p) => p.type === type)) return;
    setEditProperties((prev) => [
      ...prev,
      { id: type, type, value: [] },
    ]);
  }, [editProperties]);

  // Remove property
  const removeProperty = useCallback((propertyId: string) => {
    setEditProperties((prev) => prev.filter((p) => p.id !== propertyId));
  }, []);

  // Quick update (for status changes without edit mode)
  const updateStatus = useCallback(async (status: TaskStatus) => {
    if (!task) return;
    await updateTaskMutation.mutateAsync({
      id: taskId,
      data: { status },
    });
  }, [task, taskId, updateTaskMutation]);

  // Get properties for display (read-only view)
  const displayProperties = task ? taskToProperties(task) : [];

  return {
    // Data
    task,
    project,
    projectName: project?.name || 'Unknown Project',
    displayProperties,

    // Loading states
    isLoading,
    error,
    isUpdating: updateTaskMutation.isPending,

    // Edit mode
    isEditing,
    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,
    editProperties,
    startEdit,
    cancelEdit,
    saveEdit,
    updateProperty,
    addProperty,
    removeProperty,

    // Quick actions
    updateStatus,
  };
}
