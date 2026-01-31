import { useState } from 'react';

/**
 * Task detail UI state management (non-chat state only)
 *
 * Chat-related state has been moved to useChatInputState for performance.
 * This prevents parent component re-renders on chat input keystrokes.
 *
 * Note: isTyping is kept here (not in ChatInputFooter) because it's displayed
 * in AISessionTab, not in the chat input. It's set by useChatHandlers (inside
 * ChatInputFooter) but displayed in the parent's AI session tab.
 */
export function useTaskUIState() {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<'activity' | 'ai-session' | 'diffs' | 'sessions'>('ai-session');
  const [isTyping, setIsTyping] = useState(false); // Displayed in AISessionTab
  const [diffApprovals, setDiffApprovals] = useState<Record<string, 'approved' | 'rejected' | null>>({});
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [expandedCommands, setExpandedCommands] = useState<Set<string>>(new Set());
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null);
  const [subPanelTab, setSubPanelTab] = useState<'chat-session' | 'diffs'>('diffs');
  const [isSubPanelOpen, setIsSubPanelOpen] = useState(false);
  const [contentModalData, setContentModalData] = useState<{ filePath: string; content: string } | null>(null);

  return {
    isDescriptionExpanded, setIsDescriptionExpanded,
    activeInfoTab, setActiveInfoTab,
    isTyping, setIsTyping,
    diffApprovals, setDiffApprovals,
    showAddProperty, setShowAddProperty,
    expandedCommands, setExpandedCommands,
    selectedDiffFile, setSelectedDiffFile,
    subPanelTab, setSubPanelTab,
    isSubPanelOpen, setIsSubPanelOpen,
    contentModalData, setContentModalData,
  };
}
