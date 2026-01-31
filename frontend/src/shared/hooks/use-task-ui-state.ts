import { useState } from 'react';

export function useTaskUIState() {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<'activity' | 'ai-session' | 'diffs' | 'sessions'>('ai-session');
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [diffApprovals, setDiffApprovals] = useState<Record<string, 'approved' | 'rejected' | null>>({});
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [expandedCommands, setExpandedCommands] = useState<Set<string>>(new Set());
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<'default' | 'haiku' | 'sonnet' | 'opus'>('default');
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [chatPermissionMode, setChatPermissionMode] = useState<'default' | 'acceptEdits' | 'bypassPermissions'>('default');
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false);
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null);
  const [subPanelTab, setSubPanelTab] = useState<'chat-session' | 'diffs'>('diffs');
  const [isSubPanelOpen, setIsSubPanelOpen] = useState(false);
  const [contentModalData, setContentModalData] = useState<{ filePath: string; content: string } | null>(null);

  return {
    isDescriptionExpanded, setIsDescriptionExpanded,
    activeInfoTab, setActiveInfoTab,
    chatInput, setChatInput,
    isTyping, setIsTyping,
    diffApprovals, setDiffApprovals,
    showAddProperty, setShowAddProperty,
    expandedCommands, setExpandedCommands,
    attachedFiles, setAttachedFiles,
    selectedModel, setSelectedModel,
    webSearchEnabled, setWebSearchEnabled,
    showModelDropdown, setShowModelDropdown,
    chatPermissionMode, setChatPermissionMode,
    showPermissionDropdown, setShowPermissionDropdown,
    selectedDiffFile, setSelectedDiffFile,
    subPanelTab, setSubPanelTab,
    isSubPanelOpen, setIsSubPanelOpen,
    contentModalData, setContentModalData,
  };
}
