import { useRef, useEffect, useState, useCallback } from 'react';
import {
  X, ChevronsRight, Sparkles, Folder, Bot, Zap, Calendar, User, Play, Pause, CheckCircle, Clock,
  ExternalLink, GripVertical, Archive, Pencil, Check, ChevronDown, Plus, Wrench, Maximize2,
  AtSign, Paperclip, Globe, MessageSquare, FileCode, GitBranch, Terminal, ThumbsUp, ThumbsDown, Loader2,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { statusConfig, priorityConfig, type StatusId } from '@/shared/config/task-config';
import {
  propertyTypes, statusPropertyType, statusOptions, priorityOptions, projectOptions,
  agentOptions, providerOptions, modelOptions, skillsOptions, toolsOptions,
  agentLabels, providerLabels, modelLabels,
} from '@/shared/config/property-config';
import { useTaskStore, type Task } from '@/shared/stores/task-store';
import { useTask, useUpdateTask } from '@/shared/hooks/use-tasks-query';

interface FloatingTaskDetailPanelProps {
  isOpen: boolean;
  taskId: string | null;
  onClose: () => void;
  onOpenFullView?: (taskId: string, taskTitle: string) => void;
}

// Combined property types for Task Detail (includes status)
const taskDetailPropertyTypes = [statusPropertyType, ...propertyTypes];

// Chat message type
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  files?: { name: string; additions?: number; deletions?: number }[];
  commands?: { cmd: string; status: 'success' | 'running' | 'pending' }[];
  todos?: { text: string; checked: boolean }[];
}

// Mock chat messages
const initialChatMessages: ChatMessage[] = [
  { id: '1', role: 'assistant', content: "Now I need to check the current dependencies. Let me check the package.json:", files: [{ name: 'package.json' }] },
  { id: '2', role: 'assistant', content: "I'll add the canvas-confetti library:", commands: [{ cmd: 'npm install canvas-confetti', status: 'success' }], todos: [{ text: 'TODO list updated', checked: true }] },
  { id: '3', role: 'assistant', content: "Now I'll add the confetti animation to components:", files: [{ name: 'src/components/InstallCommand.jsx', additions: 15, deletions: 1 }] },
];

// Mock diffs data
const mockDiffs = [
  {
    id: 'diff-1', filename: 'src/components/InstallCommand.jsx', additions: 45, deletions: 8,
    chunks: [{ header: '@@ -1,3 +1,5 @@', lines: [
      { type: 'add', lineNum: 1, content: "import confetti from 'canvas-confetti'" },
      { type: 'add', lineNum: 2, content: "import { useState } from 'react'" },
      { type: 'context', lineNum: 3, content: '' },
    ]}],
  },
  {
    id: 'diff-2', filename: 'src/components/ComparisonView.tsx', additions: 55, deletions: 0,
    chunks: [{ header: '@@ -106,0 +107,6 @@', lines: [
      { type: 'add', lineNum: 106, content: '        </div>' },
      { type: 'add', lineNum: 107, content: '      </li>' },
    ]}],
  },
];

// Status badge component
function StatusBadge({ status }: { status: StatusId }) {
  const config = statusConfig[status];
  const iconMap: Record<StatusId, React.ElementType> = {
    'not-started': Clock, 'in-progress': Play, 'review': Pause, 'done': CheckCircle, 'cancelled': Clock, 'archived': Archive,
  };
  const Icon = iconMap[status];
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: config.bgColor, color: config.color }}>
      <Icon className="w-3 h-3" />{config.label}
    </div>
  );
}

// Priority badge component
function PriorityBadge({ priority }: { priority: 'low' | 'medium' | 'high' | undefined }) {
  if (!priority) return null;
  const config = priorityConfig[priority];
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: config.bgColor, color: config.color }}>{config.label}</span>;
}

// Property display row
function PropertyRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-sidebar/50 hover:bg-sidebar transition-colors">
      <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground shrink-0"><Icon className="w-4 h-4" /><span>{label}</span></div>
      <span className="text-sm text-foreground truncate">{value}</span>
    </div>
  );
}

// Editable property select
function EditablePropertySelect({ icon: Icon, label, value, onChange, options, placeholder }: {
  icon: React.ElementType; label: string; value: string; onChange: (v: string) => void; options: { id: string; label: string }[]; placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  const selectedOption = options.find(opt => opt.id === value);
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground shrink-0"><Icon className="w-4 h-4" /><span>{label}</span></div>
      <div className="relative flex-1" ref={dropdownRef}>
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="text-sm text-foreground hover:bg-muted px-2 py-1 rounded transition-colors flex items-center gap-2">
          <span className={selectedOption ? 'text-foreground' : 'text-muted-foreground'}>{selectedOption?.label || placeholder || 'Select...'}</span>
          <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 max-h-40 overflow-y-auto">
            <button type="button" onClick={() => { onChange(''); setIsOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors">None</button>
            {options.map((opt) => (
              <button key={opt.id} type="button" onClick={() => { onChange(opt.id); setIsOpen(false); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent transition-colors", value === opt.id && "bg-accent")}>{opt.label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Editable colored select (for status, priority)
function EditableColoredSelect({ icon: Icon, label, value, onChange, options, placeholder }: {
  icon: React.ElementType; label: string; value: string; onChange: (v: string) => void; options: { id: string; label: string; color: string }[]; placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  const selectedOption = options.find(opt => opt.id === value);
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground shrink-0"><Icon className="w-4 h-4" /><span>{label}</span></div>
      <div className="relative flex-1" ref={dropdownRef}>
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="text-sm hover:bg-muted px-2 py-1 rounded transition-colors flex items-center gap-2">
          {selectedOption ? (<><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedOption.color }} /><span className="text-foreground">{selectedOption.label}</span></>) : (<span className="text-muted-foreground">{placeholder || 'Select...'}</span>)}
          <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 max-h-48 overflow-y-auto">
            {options.map((opt) => (
              <button key={opt.id} type="button" onClick={() => { onChange(opt.id); setIsOpen(false); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent transition-colors", value === opt.id && "bg-accent")}>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} /><span>{opt.label}</span>{value === opt.id && <span className="ml-auto text-primary">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Multi-select property row
function EditableMultiSelect({ icon: Icon, label, value, onChange, options, placeholder }: {
  icon: React.ElementType; label: string; value: string[]; onChange: (v: string[]) => void; options: { id: string; label: string; icon?: React.ElementType }[]; placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  const toggleOption = (optId: string) => { if (value.includes(optId)) onChange(value.filter(v => v !== optId)); else onChange([...value, optId]); };
  const selectedLabels = value.map(v => options.find(o => o.id === v)?.label).filter(Boolean).join(', ');
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground shrink-0"><Icon className="w-4 h-4" /><span>{label}</span></div>
      <div className="relative flex-1" ref={dropdownRef}>
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="text-sm hover:bg-muted px-2 py-1 rounded transition-colors flex items-center gap-2 w-full justify-between">
          <span className={value.length > 0 ? "text-foreground truncate" : "text-muted-foreground"}>{value.length > 0 ? selectedLabels : placeholder || 'Select...'}</span>
          <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} />
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 max-h-48 overflow-y-auto">
            {options.map((opt) => {
              const isSelected = value.includes(opt.id);
              const OptionIcon = opt.icon;
              return (
                <button key={opt.id} type="button" onClick={() => toggleOption(opt.id)} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent transition-colors", isSelected && "bg-accent/50")}>
                  <span className={cn("w-3.5 h-3.5 border rounded flex items-center justify-center shrink-0", isSelected ? "border-primary bg-primary" : "border-border")}>{isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}</span>
                  {OptionIcon && <OptionIcon className="w-4 h-4 text-muted-foreground" />}<span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function FloatingTaskDetailPanel({ isOpen, taskId, onClose, onOpenFullView }: FloatingTaskDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);

  // Try Zustand store first (for local/mock tasks)
  const storeTask = useTaskStore((state) => taskId ? state.tasks[taskId] : null);
  const updateStoreTask = useTaskStore((state) => state.updateTask);

  // Fetch from API if not in store
  const { data: apiTask, isLoading: apiLoading } = useTask(taskId && !storeTask ? taskId : '');
  const updateTaskMutation = useUpdateTask();

  // Use store task if available, otherwise map API task to store format
  const task: Task | null = storeTask || (apiTask ? {
    id: apiTask.id,
    title: apiTask.title,
    description: apiTask.description || undefined,
    columnId: apiTask.status,
    priority: apiTask.priority as 'low' | 'medium' | 'high' | undefined,
    project: undefined, // API doesn't have project name directly
    agent: apiTask.agentRole || undefined,
    provider: apiTask.provider || undefined,
    model: apiTask.model || undefined,
    assignee: apiTask.assignee || undefined,
    dueDate: apiTask.dueDate ? new Date(apiTask.dueDate).toLocaleDateString() : undefined,
  } : null);

  // Unified update function - uses store or API based on task source
  const updateTask = (id: string, updates: Partial<Task>) => {
    if (storeTask) {
      updateStoreTask(id, updates);
    } else if (apiTask) {
      updateTaskMutation.mutate({ id, data: {
        title: updates.title,
        description: updates.description,
        status: updates.columnId as 'not-started' | 'in-progress' | 'review' | 'done' | 'cancelled' | 'archived',
        priority: updates.priority,
        agentRole: updates.agent as 'planner' | 'researcher' | 'coder' | 'reviewer' | 'tester' | null,
        provider: updates.provider as 'anthropic' | 'openai' | 'google' | null,
        model: updates.model,
      }});
    }
  };

  const isLoading = !storeTask && apiLoading;

  // Full View handler - uses prop callback to create Tab Block
  const handleFullView = () => {
    if (taskId && task && onOpenFullView) {
      onOpenFullView(taskId, task.title); // Open as Tab Block FIRST
      onClose(); // Then close floating panel
    }
  };

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editProject, setEditProject] = useState('');
  const [editAgent, setEditAgent] = useState('');
  const [editProvider, setEditProvider] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [editTools, setEditTools] = useState<string[]>([]);
  const [visibleProperties, setVisibleProperties] = useState<string[]>([]);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const addPropertyRef = useRef<HTMLDivElement>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<'activity' | 'ai-session' | 'diffs'>('ai-session');
  const [isSubPanelOpen, setIsSubPanelOpen] = useState(false);
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null);
  const [subPanelTab, setSubPanelTab] = useState<'chat-session' | 'diffs'>('diffs');
  const subPanelRef = useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [diffApprovals, setDiffApprovals] = useState<Record<string, 'approved' | 'rejected' | null>>({});

  // Initialize edit form when task changes or edit mode starts
  useEffect(() => {
    if (task && isEditing) {
      setEditTitle(task.title || '');
      setEditDescription(task.description || '');
      setEditStatus(task.columnId || 'not-started');
      setEditPriority(task.priority || '');
      setEditProject(task.project || '');
      setEditAgent(task.agent || '');
      setEditProvider(task.provider || '');
      setEditModel(task.model || '');
      const props: string[] = ['status'];
      if (task.project) props.push('project');
      if (task.agent) props.push('agent');
      if (task.provider) props.push('provider');
      if (task.model) props.push('model');
      if (task.priority) props.push('priority');
      setVisibleProperties(props);
    }
  }, [task, isEditing]);

  // Reset edit mode and full view when panel closes
  useEffect(() => { if (!isOpen) { setIsEditing(false); setShowAddProperty(false); } }, [isOpen]);

  // Close add property dropdown on click outside
  useEffect(() => {
    if (!showAddProperty) return;
    const handleClickOutside = (e: MouseEvent) => { if (addPropertyRef.current && !addPropertyRef.current.contains(e.target as Node)) setShowAddProperty(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddProperty]);

  const handleStartEdit = () => {
    if (!task) return;
    setEditTitle(task.title || '');
    setEditDescription(task.description || '');
    setEditStatus(task.columnId || 'not-started');
    setEditPriority(task.priority || '');
    setEditProject(task.project || '');
    setEditAgent(task.agent || '');
    setEditProvider(task.provider || '');
    setEditModel(task.model || '');
    const props: string[] = ['status'];
    if (task.project) props.push('project');
    if (task.agent) props.push('agent');
    if (task.provider) props.push('provider');
    if (task.model) props.push('model');
    if (task.priority) props.push('priority');
    setVisibleProperties(props);
    setIsEditing(true);
  };

  const handleCancelEdit = () => { setIsEditing(false); setShowAddProperty(false); };
  const handleSaveEdit = () => {
    if (taskId) {
      updateTask(taskId, {
        title: editTitle,
        description: editDescription || undefined,
        columnId: editStatus,
        priority: editPriority as 'low' | 'medium' | 'high' | undefined,
        project: editProject || undefined,
        agent: editAgent || undefined,
        provider: editProvider || undefined,
        model: editModel || undefined,
      });
    }
    setIsEditing(false);
    setShowAddProperty(false);
  };
  const addProperty = (propertyId: string) => { if (!visibleProperties.includes(propertyId)) setVisibleProperties([...visibleProperties, propertyId]); setShowAddProperty(false); };

  // Chat handlers
  const sendMessage = async (content: string) => {
    if (!content.trim() || isTyping) return;
    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: content.trim() };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: `I understand. Let me work on that for "${task?.title}"...` };
    setChatMessages(prev => [...prev, aiMessage]);
    setIsTyping(false);
  };
  const handleChatKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(chatInput); } };
  const handleStartTask = async () => {
    if (task && taskId) {
      updateTask(taskId, { columnId: 'in-progress' });
      await sendMessage(`Start working on "${task.title}"`);
    }
  };
  const handleCancelTask = async () => {
    if (task && taskId) {
      updateTask(taskId, { columnId: 'cancelled' });
      await sendMessage(`Cancel task "${task.title}"`);
    }
  };
  const handleContinueTask = async () => {
    if (task && taskId) {
      updateTask(taskId, { columnId: 'in-progress' });
      await sendMessage(`Continue working on "${task.title}"`);
    }
  };
  const handleDiffFileClick = (fileId: string) => {
    setSelectedDiffFile(fileId);
    setSubPanelTab('diffs');
    // In full view, show inline split; otherwise open sub-panel
    setIsSubPanelOpen(true);
  };
  const handleCloseSubPanel = () => { setIsSubPanelOpen(false); setSelectedDiffFile(null); };
  const handleApproveDiff = (diffId: string) => setDiffApprovals(prev => ({ ...prev, [diffId]: 'approved' }));
  const handleRejectDiff = (diffId: string) => setDiffApprovals(prev => ({ ...prev, [diffId]: 'rejected' }));

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => { e.preventDefault(); setIsResizing(true); }, []);
  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => { const newWidth = Math.max(480, Math.min(window.innerWidth - e.clientX, window.innerWidth - 560)); setPanelWidth(newWidth); };
    const handleMouseUp = () => { setIsResizing(false); };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
  }, [isResizing]);

  // Close on click outside (exclude sub-panel)
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        // Don't close if clicking inside main panel or sub-panel
        if (panelRef.current?.contains(target)) return;
        if (subPanelRef.current?.contains(target)) return;
        onClose();
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" />
      <div ref={panelRef} style={{ width: `${panelWidth}px`, right: isSubPanelOpen ? 800 : 0, transform: 'translateX(0)' }}
        className={cn("fixed top-0 h-full", isSubPanelOpen ? "z-[56]" : "z-50", "bg-sidebar border-l border-border shadow-2xl", "flex flex-col", !isResizing && "transition-all duration-300 ease-in-out")}>
        {/* Resize Handle */}
        <div onMouseDown={handleMouseDown} className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/20 transition-colors flex items-center justify-center group">
          <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <button onClick={() => { setIsSubPanelOpen(false); onClose(); }} className="p-1 rounded hover:bg-muted transition-colors" title="Close"><ChevronsRight className="w-4 h-4 text-muted-foreground" /></button>
            <span className="text-sm text-muted-foreground">Task Details</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleFullView} disabled={!task} className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-50" title="Full view">
              <Maximize2 className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => { setIsSubPanelOpen(false); onClose(); }} className="p-1 rounded hover:bg-muted transition-colors" title="Close"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        </div>

        {/* Content - show loading or task not found states */}
        <div className="flex-1 overflow-hidden p-4 overflow-y-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !task ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Task not found
            </div>
          ) : (
          <div>
          {isEditing ? (
            <>
              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full text-2xl font-medium text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 mb-6" placeholder="Task title" />
              <div className="space-y-3 mb-4">
                {visibleProperties.includes('status') && <EditableColoredSelect icon={Clock} label="Status" value={editStatus} onChange={setEditStatus} options={statusOptions} placeholder="Select status" />}
                {visibleProperties.includes('project') && <EditablePropertySelect icon={Folder} label="Project" value={editProject} onChange={setEditProject} options={projectOptions} placeholder="Select project" />}
                {visibleProperties.includes('agent') && <EditablePropertySelect icon={Bot} label="Agent" value={editAgent} onChange={setEditAgent} options={agentOptions} placeholder="Select agent" />}
                {visibleProperties.includes('provider') && <EditablePropertySelect icon={Sparkles} label="Provider" value={editProvider} onChange={setEditProvider} options={providerOptions} placeholder="Select provider" />}
                {visibleProperties.includes('model') && <EditablePropertySelect icon={Zap} label="Model" value={editModel} onChange={setEditModel} options={modelOptions} placeholder="Select model" />}
                {visibleProperties.includes('priority') && <EditableColoredSelect icon={Zap} label="Priority" value={editPriority} onChange={setEditPriority} options={priorityOptions} placeholder="Select priority" />}
                {visibleProperties.includes('skills') && <EditableMultiSelect icon={Zap} label="Skills" value={editSkills} onChange={setEditSkills} options={skillsOptions} placeholder="Select skills" />}
                {visibleProperties.includes('tools') && <EditableMultiSelect icon={Wrench} label="Tools" value={editTools} onChange={setEditTools} options={toolsOptions} placeholder="Select tools" />}
              </div>
              <div className="relative mb-4" ref={addPropertyRef}>
                <button onClick={() => setShowAddProperty(!showAddProperty)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><Plus className="w-4 h-4" /><span>Add a property</span></button>
                {showAddProperty && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
                    {taskDetailPropertyTypes.map((type) => {
                      const exists = visibleProperties.includes(type.id);
                      return (
                        <button key={type.id} onClick={() => addProperty(type.id)} disabled={exists} className={cn("w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors", exists ? "text-muted-foreground/50 cursor-not-allowed" : "text-popover-foreground hover:bg-accent")}>
                          <type.icon className="w-4 h-4" /><div className="text-left"><div className="font-medium">{type.label}</div><div className="text-xs text-muted-foreground">{type.description}</div></div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="border-t border-border my-6" />
              <div className="mb-6"><h3 className="text-sm font-medium text-foreground mb-3">Description</h3><textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full h-32 text-sm text-foreground bg-muted/30 border border-border rounded-lg p-3 outline-none resize-none placeholder:text-muted-foreground focus:border-primary/50 transition-colors" placeholder="Describe the task details..." /></div>
              <div className="flex items-center gap-2 mb-6">
                <button onClick={handleSaveEdit} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"><Check className="w-4 h-4" />Save</button>
                <button onClick={handleCancelEdit} className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors text-sm font-medium">Cancel</button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-medium text-foreground mb-2">{task.title}</h1>
              {task.description && (
                <div className="mb-6 overflow-hidden">
                  <p className={cn("text-sm text-muted-foreground break-words", !isDescriptionExpanded && "line-clamp-2")}>{task.description}</p>
                  {task.description.length > 100 && <button onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="text-xs text-primary hover:underline mt-1">{isDescriptionExpanded ? 'Show less' : 'Show more'}</button>}
                </div>
              )}
              <div className="flex items-center gap-3 mb-6">
                {task.project && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Folder className="w-3 h-3" />{task.project}</span>}
                <StatusBadge status={task.columnId as StatusId} />
                <PriorityBadge priority={task.priority} />
                <button onClick={handleStartEdit} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3 h-3" />Edit</button>
              </div>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-foreground mb-3">Properties</h3>
                <div className="border border-border rounded-lg overflow-hidden"><div className="max-h-[72px] overflow-y-auto"><div className="divide-y divide-border">
                  <PropertyRow icon={Folder} label="Project" value={task.project} />
                  <PropertyRow icon={Bot} label="Agent" value={task.agent ? agentLabels[task.agent] || task.agent : undefined} />
                  <PropertyRow icon={Sparkles} label="Provider" value={task.provider ? providerLabels[task.provider] || task.provider : undefined} />
                  <PropertyRow icon={Zap} label="Model" value={task.model ? modelLabels[task.model] || task.model : undefined} />
                  <PropertyRow icon={User} label="Assignee" value={task.assignee} />
                  <PropertyRow icon={Calendar} label="Due Date" value={task.dueDate} />
                </div></div></div>
              </div>
            </>
          )}

          <div className="border-t border-border my-6" />

          {/* Tabbed Info Panel */}
          <div>
            <div className="flex items-center gap-1 mb-4 border-b border-border">
              <button onClick={() => setActiveInfoTab('activity')} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px", activeInfoTab === 'activity' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}><MessageSquare className="w-3.5 h-3.5" />Activity</button>
              <button onClick={() => setActiveInfoTab('ai-session')} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px", activeInfoTab === 'ai-session' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}><Bot className="w-3.5 h-3.5" />AI Session</button>
              <button onClick={() => setActiveInfoTab('diffs')} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px", activeInfoTab === 'diffs' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}><GitBranch className="w-3.5 h-3.5" />Diffs</button>
            </div>

            {activeInfoTab === 'activity' && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm"><div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5"><User className="w-3 h-3 text-muted-foreground" /></div><div><p className="text-foreground">Task created</p><p className="text-xs text-muted-foreground">2 days ago</p></div></div>
                <div className="flex items-start gap-3 text-sm"><div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5"><GitBranch className="w-3 h-3 text-blue-500" /></div><div><p className="text-foreground">Branch created: feature/{task.id}</p><p className="text-xs text-muted-foreground">1 day ago</p></div></div>
              </div>
            )}

            {activeInfoTab === 'ai-session' && (
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {chatMessages.map((message) => (
                  message.role === 'user' ? (
                    <div key={message.id} className="flex justify-end mb-4"><div className="bg-muted border border-border rounded-full px-4 py-2 text-sm text-foreground max-w-[80%]">{message.content}</div></div>
                  ) : (
                    <div key={message.id} className="mb-6">
                      <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-2">{message.content}</div>
                      {message.files && message.files.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {message.files.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-2 py-1 bg-muted/30 rounded text-xs font-mono text-muted-foreground hover:bg-muted/50 transition-colors">
                              <FileCode className="w-3 h-3" /><span className="flex-1">{file.name}</span>
                              {file.additions !== undefined && <span className="text-green-500">+{file.additions}</span>}
                              {file.deletions !== undefined && file.deletions > 0 && <span className="text-red-500">-{file.deletions}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {message.commands && message.commands.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {message.commands.map((cmd, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-2 py-1 bg-muted/30 rounded text-xs font-mono">
                              <Terminal className="w-3 h-3 text-muted-foreground" /><span className="flex-1 text-foreground">{cmd.cmd}</span>
                              {cmd.status === 'success' && <CheckCircle className="w-3 h-3 text-green-500" />}
                            </div>
                          ))}
                        </div>
                      )}
                      {message.todos && message.todos.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {message.todos.map((todo, idx) => (
                            <div key={idx} className="flex items-start gap-2 px-2 py-1 text-xs">
                              {todo.checked ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> : <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                              <span className={cn("flex-1", todo.checked ? "text-muted-foreground line-through" : "text-foreground")}>{todo.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ))}
                {isTyping && <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4"><div className="flex gap-1"><span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div><span>Thinking...</span></div>}
              </div>
            )}

            {activeInfoTab === 'diffs' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                  <span>{mockDiffs.length} file{mockDiffs.length > 1 ? 's' : ''} changed,</span>
                  <span className="text-green-500">+{mockDiffs.reduce((sum, d) => sum + d.additions, 0)}</span>
                  <span className="text-red-500">-{mockDiffs.reduce((sum, d) => sum + d.deletions, 0)}</span>
                </div>
                {mockDiffs.map((diff) => (
                  <div key={diff.id} className={cn("border rounded-lg overflow-hidden", diffApprovals[diff.id] === 'approved' && "border-green-500/50", diffApprovals[diff.id] === 'rejected' && "border-red-500/50", !diffApprovals[diff.id] && "border-border")}>
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
                      <button onClick={() => handleDiffFileClick(diff.id)} className="flex items-center gap-2 flex-1 hover:bg-muted/50 px-1 py-0.5 rounded transition-colors cursor-pointer">
                        <FileCode className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium text-foreground">{diff.filename}</span>
                        {diffApprovals[diff.id] === 'approved' && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 font-medium">Approved</span>}
                        {diffApprovals[diff.id] === 'rejected' && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 font-medium">Rejected</span>}
                        <span className="text-xs text-green-500 ml-auto">+{diff.additions}</span>
                        {diff.deletions > 0 && <span className="text-xs text-red-500">-{diff.deletions}</span>}
                        <ExternalLink className="w-3 h-3 text-muted-foreground ml-2" />
                      </button>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); handleApproveDiff(diff.id); }} className={cn("p-1.5 rounded transition-colors", diffApprovals[diff.id] === 'approved' ? "bg-green-500/20 text-green-500" : "hover:bg-green-500/10 text-muted-foreground hover:text-green-500")} title="Approve changes"><ThumbsUp className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleRejectDiff(diff.id); }} className={cn("p-1.5 rounded transition-colors", diffApprovals[diff.id] === 'rejected' ? "bg-red-500/20 text-red-500" : "hover:bg-red-500/10 text-muted-foreground hover:text-red-500")} title="Reject changes"><ThumbsDown className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto bg-background">
                      {diff.chunks.map((chunk, chunkIdx) => (
                        <div key={chunkIdx} className="font-mono text-xs">
                          <div className="px-3 py-1 bg-muted/30 text-muted-foreground border-b border-border/50">{chunk.header}</div>
                          <div>{chunk.lines.map((line, lineIdx) => (
                            <div key={lineIdx} className={cn("px-3 py-0.5 flex items-start gap-3", line.type === 'add' && "bg-green-500/10", line.type === 'delete' && "bg-red-500/10")}>
                              <span className="w-12 text-right text-muted-foreground/60 select-none shrink-0">{line.lineNum}</span>
                              <span className={cn("w-4 shrink-0", line.type === 'add' && "text-green-500", line.type === 'delete' && "text-red-500", line.type === 'context' && "text-muted-foreground/40")}>{line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}</span>
                              <span className={cn("flex-1", line.type === 'add' && "text-green-400", line.type === 'delete' && "text-red-400", line.type === 'context' && "text-foreground/80")}>{line.content}</span>
                            </div>
                          ))}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
          )}
        </div>

        {/* Chat Input Footer - only show when task is loaded */}
        {task && (
        <div className="border-t border-border p-3">
          <div className="rounded-2xl border border-border bg-muted/30 p-3 focus-within:border-primary/50 transition-colors">
            <div className="mb-2"><button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted text-muted-foreground transition-colors"><AtSign className="w-3.5 h-3.5" />Add context</button></div>
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleChatKeyDown} placeholder="Ask, search, or make anything..." className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none mb-2" disabled={isTyping} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                <button className="p-2 rounded-lg hover:bg-muted transition-colors"><Paperclip className="w-4 h-4 text-muted-foreground" /></button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Auto</button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"><Globe className="w-3.5 h-3.5" />All sources</button>
              </div>
              {task.columnId === 'not-started' ? (
                <button onClick={handleStartTask} className="h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium"><Play className="w-3.5 h-3.5" />Start</button>
              ) : task.columnId === 'in-progress' ? (
                <button onClick={handleCancelTask} className="h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-xs font-medium"><X className="w-3.5 h-3.5" />Cancel</button>
              ) : (
                <button onClick={handleContinueTask} className="h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium"><Play className="w-3.5 h-3.5" />Continue</button>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Sub-Panel for expanded file view */}
      {isSubPanelOpen && (
        <>
          <div className="fixed top-0 left-0 bottom-0 z-[55] bg-black/20" style={{ right: '800px' }} onClick={handleCloseSubPanel} />
          <div ref={subPanelRef} className={cn("fixed top-0 right-0 z-[60] h-full w-[800px]", "bg-sidebar border-l-2 border-border shadow-2xl", "flex flex-col", "transition-transform duration-300 ease-in-out", isSubPanelOpen ? "translate-x-0" : "translate-x-full")}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2"><span className="text-sm font-medium text-foreground">File Details</span></div>
              <button onClick={handleCloseSubPanel} className="p-1 rounded hover:bg-muted transition-colors" title="Close"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-border">
              <button onClick={() => setSubPanelTab('chat-session')} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px", subPanelTab === 'chat-session' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}><Bot className="w-3.5 h-3.5" />Chat Session</button>
              <button onClick={() => setSubPanelTab('diffs')} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px", subPanelTab === 'diffs' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}><GitBranch className="w-3.5 h-3.5" />Diffs</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {subPanelTab === 'chat-session' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-foreground mb-3">AI Session Messages</h3>
                  {chatMessages.map((message) => (
                    message.role === 'user' ? (
                      <div key={message.id} className="flex justify-end mb-4"><div className="bg-muted border border-border rounded-lg px-4 py-2 text-sm text-foreground max-w-[80%]">{message.content}</div></div>
                    ) : (
                      <div key={message.id} className="mb-6"><div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-2">{message.content}</div></div>
                    )
                  ))}
                </div>
              )}
              {subPanelTab === 'diffs' && selectedDiffFile && (
                <div>
                  {mockDiffs.filter(diff => diff.id === selectedDiffFile).map((diff) => (
                    <div key={diff.id}>
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                        <FileCode className="w-5 h-5 text-muted-foreground" /><span className="text-base font-medium text-foreground">{diff.filename}</span>
                        {diffApprovals[diff.id] === 'approved' && <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/20 text-green-600 font-medium">✓ Approved</span>}
                        {diffApprovals[diff.id] === 'rejected' && <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-600 font-medium">✗ Rejected</span>}
                        <span className="text-sm text-green-500 ml-auto">+{diff.additions}</span>
                        {diff.deletions > 0 && <span className="text-sm text-red-500">-{diff.deletions}</span>}
                        <div className="flex items-center gap-2 ml-2">
                          <button onClick={() => handleApproveDiff(diff.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors", diffApprovals[diff.id] === 'approved' ? "bg-green-500 text-white" : "bg-green-500/10 text-green-600 hover:bg-green-500/20")}><ThumbsUp className="w-4 h-4" />Approve</button>
                          <button onClick={() => handleRejectDiff(diff.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors", diffApprovals[diff.id] === 'rejected' ? "bg-red-500 text-white" : "bg-red-500/10 text-red-600 hover:bg-red-500/20")}><ThumbsDown className="w-4 h-4" />Reject</button>
                        </div>
                      </div>
                      <div className="border border-border rounded-lg overflow-hidden">
                        {diff.chunks.map((chunk, chunkIdx) => (
                          <div key={chunkIdx} className="font-mono text-xs">
                            <div className="px-3 py-2 bg-muted/30 text-muted-foreground border-b border-border/50 sticky top-0">{chunk.header}</div>
                            <div className="bg-background">
                              {chunk.lines.map((line, lineIdx) => (
                                <div key={lineIdx} className={cn("px-3 py-1 flex items-start gap-3", line.type === 'add' && "bg-green-500/10", line.type === 'delete' && "bg-red-500/10")}>
                                  <span className="w-12 text-right text-muted-foreground/60 select-none shrink-0">{line.lineNum}</span>
                                  <span className={cn("w-4 shrink-0", line.type === 'add' && "text-green-500", line.type === 'delete' && "text-red-500", line.type === 'context' && "text-muted-foreground/40")}>{line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}</span>
                                  <span className={cn("flex-1 break-all", line.type === 'add' && "text-green-400", line.type === 'delete' && "text-red-400", line.type === 'context' && "text-foreground/80")}>{line.content}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
