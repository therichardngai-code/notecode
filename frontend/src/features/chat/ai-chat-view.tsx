import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  AtSign,
  Paperclip,
  Globe,
  ArrowUp,
  X,
  ListTodo,
  FileSearch,
  CheckCircle,
  Copy,
  Plus,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  ChevronDown,
  Square,
  Loader2,
  ExternalLink,
  Check,
  Clock,
  MessageCircle,
  Search,
  Trash2,
  PanelLeftClose,
  FileCode,
  Zap,
  ShieldAlert,
  Pencil,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useChatSession, type ChatMessage } from '@/shared/hooks';
import { projectsApi, type Project, type Chat } from '@/adapters/api';

interface ChatHistoryItem {
  id: string;
  title: string;
  date: Date;
  messages: ChatMessage[];
}

// Shared chat history (can be imported by FloatingChatPanel)
export const sharedChatHistory: ChatHistoryItem[] = [
  {
    id: '1',
    title: "What's new in NoteCode",
    date: new Date(),
    messages: [
      { id: '1', role: 'user', content: "What's new in NoteCode?", timestamp: new Date(), steps: undefined },
      { id: '2', role: 'assistant', content: 'NoteCode has several new features...', timestamp: new Date(), steps: 2 },
    ],
  },
  {
    id: '2',
    title: 'Meeting agenda help',
    date: new Date(Date.now() - 86400000),
    messages: [
      { id: '3', role: 'user', content: 'Help me write a meeting agenda', timestamp: new Date(Date.now() - 86400000) },
      { id: '4', role: 'assistant', content: "Here's a template for your team standup...", timestamp: new Date(Date.now() - 86400000), steps: 1 },
    ],
  },
];

// Quick actions
const quickActions = [
  { id: '1', icon: Sparkles, label: "What's new in NoteCode", prompt: "What's new in NoteCode?" },
  { id: '2', icon: ListTodo, label: 'Write meeting agenda', prompt: 'Help me write a meeting agenda for a team standup' },
  { id: '3', icon: FileSearch, label: 'Analyze PDFs or images', prompt: 'How can I analyze PDFs or images with AI?' },
  { id: '4', icon: CheckCircle, label: 'Create a task tracker', prompt: 'Help me create a simple task tracker' },
];

// Mock responses removed - using real API via useChatSession hook

// Group chats by date (works with Chat type from API)
function groupChatsByDate(chats: Chat[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; chats: Chat[] }[] = [];
  const todayChats = chats.filter((c) => {
    const d = new Date(c.createdAt);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });
  const yesterdayChats = chats.filter((c) => {
    const d = new Date(c.createdAt);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === yesterday.getTime();
  });
  const olderChats = chats.filter((c) => {
    const d = new Date(c.createdAt);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < yesterday.getTime();
  });

  if (todayChats.length > 0) groups.push({ label: 'Today', chats: todayChats });
  if (yesterdayChats.length > 0) groups.push({ label: 'Yesterday', chats: yesterdayChats });
  if (olderChats.length > 0) groups.push({ label: 'Previous', chats: olderChats });

  return groups;
}

function getRelativeTime(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffMs / 86400000)}d ago`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

// Components
function QuickActionCard({ icon: Icon, label, onClick, delay = 0 }: { icon: React.ElementType; label: string; onClick?: () => void; delay?: number }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-2.5 p-3 rounded-xl glass hover:shadow-md transition-all text-left flex-1 min-w-[140px] opacity-0"
      style={{ animation: `float-up 0.4s ease-out ${0.4 + delay}s forwards` }}
    >
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm text-foreground leading-tight">{label}</span>
    </button>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="bg-sidebar border border-sidebar-border rounded-full px-4 py-2 text-sm text-foreground max-w-[80%]">{content}</div>
    </div>
  );
}

function AssistantMessage({ message }: { message: ChatMessage }) {
  const [stepsExpanded, setStepsExpanded] = useState(false);

  return (
    <div className="mb-6">
      {message.steps && (
        <button onClick={() => setStepsExpanded(!stepsExpanded)} className="flex items-center gap-1 text-sm text-muted-foreground mb-3 hover:text-foreground transition-colors">
          {stepsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {message.steps} steps
        </button>
      )}
      <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{message.content}</div>
      <div className="flex items-center gap-1 mt-3">
        <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Copy">
          <Copy className="w-4 h-4 text-muted-foreground" />
        </button>
        <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Add to page">
          <Plus className="w-4 h-4 text-muted-foreground" />
        </button>
        <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Good response">
          <ThumbsUp className="w-4 h-4 text-muted-foreground" />
        </button>
        <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Bad response">
          <ThumbsDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>Exploring</span>
    </div>
  );
}

interface AIChatViewProps {
  initialChatId?: string;
}

export function AIChatView({ initialChatId }: AIChatViewProps) {
  const [input, setInput] = useState('');
  const [_selectedMode, _setSelectedMode] = useState('auto'); // TODO: Reserved for future mode selection
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [chatTitle, setChatTitle] = useState('New chat');
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // inputRef removed - not currently needed
  const dropdownRef = useRef<HTMLDivElement>(null);
  const historyPanelRef = useRef<HTMLDivElement>(null);

  // Project selection state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Load projects on mount
  useEffect(() => {
    projectsApi.getRecent(10).then(res => {
      setProjects(res.projects);
      if (res.projects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(res.projects[0].id);
      }
    }).catch(console.error);
  }, []);

  // Load chat history when project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    projectsApi.listChats(selectedProjectId).then(res => {
      setChatHistory(res.chats);
    }).catch(console.error);
  }, [selectedProjectId]);

  // Chat session hook (real API)
  const {
    status: _chatStatus, // Reserved for status indicator
    messages,
    isStreaming,
    startChat,
    sendFollowUp,
    cancelStream,
    resetChat,
  } = useChatSession({
    projectId: selectedProjectId,
    onError: (msg) => console.error('Chat error:', msg),
  });

  // Chat input options state (aligned with TaskDetail AI Session)
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<'default' | 'haiku' | 'sonnet' | 'opus'>('default');
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [chatPermissionMode, setChatPermissionMode] = useState<'default' | 'acceptEdits' | 'bypassPermissions'>('default');
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const permissionDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showContextPicker, setShowContextPicker] = useState(false);
  const [contextSearch, setContextSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [contextPickerIndex, setContextPickerIndex] = useState(0);
  const contextPickerRef = useRef<HTMLDivElement>(null);
  const projectFiles = ['src/index.ts', 'src/app.tsx', 'src/components/Button.tsx', 'package.json', 'tsconfig.json'];
  const filteredFiles = projectFiles.filter(f => f.toLowerCase().includes(contextSearch.toLowerCase()));

  // Load initial chat from history
  useEffect(() => {
    if (initialChatId && chatHistory.length > 0) {
      const chat = chatHistory.find((c) => c.id === initialChatId);
      if (chat) {
        setIsAnimating(true);
        setChatTitle(chat.title);
        setCurrentChatId(chat.id);
        setShowQuickActions(false);
        setTimeout(() => setIsAnimating(false), 600);
      }
    }
  }, [initialChatId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowHistoryDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close history panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showHistoryPanel && historyPanelRef.current && !historyPanelRef.current.contains(e.target as Node)) setShowHistoryPanel(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showHistoryPanel]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isStreaming]);

  // Close dropdowns on click outside
  useEffect(() => {
    if (!showModelDropdown) return;
    const h = (e: MouseEvent) => { if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) setShowModelDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showModelDropdown]);

  useEffect(() => {
    if (!showPermissionDropdown) return;
    const h = (e: MouseEvent) => { if (permissionDropdownRef.current && !permissionDropdownRef.current.contains(e.target as Node)) setShowPermissionDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showPermissionDropdown]);

  useEffect(() => {
    if (!showContextPicker) return;
    const h = (e: MouseEvent) => { if (contextPickerRef.current && !contextPickerRef.current.contains(e.target as Node)) setShowContextPicker(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showContextPicker]);

  useEffect(() => { setContextPickerIndex(0); }, [contextSearch]);

  // File handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!).map(f => f.name)]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const removeAttachedFile = (idx: number) => setAttachedFiles(prev => prev.filter((_, i) => i !== idx));

  // Drag/drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    if (e.dataTransfer.files?.length) setAttachedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files).map(f => f.name)]);
  }, []);

  // Paste handler
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: string[] = [];
    for (let i = 0; i < items.length; i++) { if (items[i].kind === 'file') { const f = items[i].getAsFile(); if (f) files.push(f.name); } }
    if (files.length) setAttachedFiles(prev => [...prev, ...files]);
  }, []);

  // @ context picker handlers
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value, pos = e.target.selectionStart || 0;
    setInput(v); setCursorPosition(pos);
    const before = v.slice(0, pos), atIdx = before.lastIndexOf('@');
    if (atIdx !== -1) {
      const after = before.slice(atIdx + 1), charBefore = atIdx > 0 ? before[atIdx - 1] : ' ';
      if ((charBefore === ' ' || atIdx === 0) && !after.includes(' ')) { setContextSearch(after); setShowContextPicker(true); return; }
    }
    setShowContextPicker(false);
  }, []);

  const selectContextFile = useCallback((file: string) => {
    const before = input.slice(0, cursorPosition), after = input.slice(cursorPosition), atIdx = before.lastIndexOf('@');
    setInput(before.slice(0, atIdx) + `@${file} ` + after);
    setShowContextPicker(false); setContextSearch('');
    if (!attachedFiles.includes(file)) setAttachedFiles(prev => [...prev, file]);
    chatInputRef.current?.focus();
  }, [input, cursorPosition, attachedFiles]);

  const handleContextKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showContextPicker) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setContextPickerIndex(p => Math.min(p + 1, filteredFiles.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setContextPickerIndex(p => Math.max(p - 1, 0)); }
    else if (e.key === 'Enter' && filteredFiles.length) { e.preventDefault(); selectContextFile(filteredFiles[contextPickerIndex]); }
    else if (e.key === 'Escape') setShowContextPicker(false);
  }, [showContextPicker, filteredFiles, contextPickerIndex, selectContextFile]);

  // Close project dropdown on click outside
  useEffect(() => {
    if (!showProjectDropdown) return;
    const h = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) setShowProjectDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showProjectDropdown]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;
    if (!selectedProjectId) {
      console.error('No project selected');
      return;
    }

    // Set chat title from first message
    if (messages.length === 0) {
      setChatTitle(content.trim().slice(0, 30) + (content.length > 30 ? '...' : ''));
      setShowQuickActions(false);

      // Start new chat session via API
      await startChat({
        message: content.trim(),
        attachments: attachedFiles.length > 0 ? attachedFiles : undefined,
        model: selectedModel !== 'default' ? selectedModel : undefined,
        permissionMode: chatPermissionMode !== 'default' ? chatPermissionMode : undefined,
        disableWebTools: !webSearchEnabled,
      });
    } else {
      // Send follow-up via WebSocket
      sendFollowUp(content.trim());
    }

    setInput('');
    setAttachedFiles([]);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isStreaming) sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !showContextPicker) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleNewChat = () => {
    resetChat();
    setShowQuickActions(true);
    setChatTitle('New chat');
    setCurrentChatId(null);
    setShowHistoryDropdown(false);
    setAttachedFiles([]);
  };

  const handleLoadChat = (chat: Chat) => {
    // Note: Loading historical chats would need backend support for resuming sessions
    // For now, we just display the history visually
    setIsAnimating(true);
    setChatTitle(chat.title);
    setCurrentChatId(chat.id);
    setShowQuickActions(false);
    setShowHistoryPanel(false);
    setTimeout(() => setIsAnimating(false), 600);
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!selectedProjectId) return;
    try {
      await projectsApi.deleteChat(selectedProjectId, chatId);
      setChatHistory((prev) => prev.filter((c) => c.id !== chatId));
      if (currentChatId === chatId) handleNewChat();
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const hasMessages = messages.length > 0;
  const filteredHistory = chatHistory.filter((c) => c.title.toLowerCase().includes(historySearch.toLowerCase()));

  return (
    <div className="h-full flex relative overflow-hidden">
      {/* Animation styles */}
      <style>{`
        @keyframes float-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-float-up { animation: float-up 0.5s ease-out forwards; }
      `}</style>

      {/* History Panel (welcome state only) */}
      {!hasMessages && (
        <div
          ref={historyPanelRef}
          className={cn(
            'w-64 border-r border-border/50 flex flex-col glass-subtle shrink-0 transition-all duration-300 ease-in-out',
            showHistoryPanel ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 absolute'
          )}
        >
          <div className="flex items-center justify-between px-3 py-3 border-b border-border">
            <button onClick={() => setShowHistoryPanel(false)} className="p-1.5 rounded-lg hover:bg-muted">
              <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-sm font-medium">Chat history</span>
            <button onClick={handleNewChat} className="p-1.5 rounded-lg hover:bg-muted">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-sidebar-border bg-sidebar text-sm focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <MessageCircle className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No chat history</p>
              </div>
            ) : (
              groupChatsByDate(filteredHistory).map((group) => (
                <div key={group.label}>
                  <div className="px-4 py-2 text-xs text-muted-foreground">{group.label}</div>
                  {group.chats.map((chat) => (
                    <div key={chat.id} className="group flex items-start gap-2.5 px-4 py-2.5 hover:bg-muted cursor-pointer" onClick={() => handleLoadChat(chat)}>
                      <MessageCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-foreground block truncate">{chat.title}</span>
                        <span className="text-xs text-muted-foreground">{getRelativeTime(chat.createdAt)}</span>
                      </div>
                      <button onClick={(e) => handleDeleteChat(e, chat.id)} className="p-1 rounded hover:bg-background opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Clock button (welcome state) */}
      {!hasMessages && !showHistoryPanel && chatHistory.length > 0 && (
        <button onClick={() => setShowHistoryPanel(true)} className="absolute top-3 left-3 p-2 rounded-lg hover:bg-muted z-10">
          <Clock className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header (chat state) */}
        {hasMessages && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <div className="flex items-center gap-2 text-sm" ref={dropdownRef}>
              <button onClick={handleNewChat} className="flex items-center gap-2 hover:bg-muted px-2 py-1 -ml-2 rounded">
                <Sparkles className="w-4 h-4" />
                <span className="text-muted-foreground">NoteCode AI</span>
              </button>
              <span className="text-muted-foreground">/</span>
              <div className="relative">
                <button onClick={() => setShowHistoryDropdown(!showHistoryDropdown)} className="flex items-center gap-1 hover:bg-muted px-2 py-1 rounded">
                  <span className="font-medium">{chatTitle}</span>
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', showHistoryDropdown && 'rotate-180')} />
                </button>
                {showHistoryDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-64 rounded-xl border border-sidebar-border bg-sidebar shadow-lg z-50">
                    {groupChatsByDate(chatHistory).map((group) => (
                      <div key={group.label}>
                        <div className="px-3 py-2 text-xs text-muted-foreground">{group.label}</div>
                        {group.chats.map((chat) => (
                          <button
                            key={chat.id}
                            onClick={() => {
                              handleLoadChat(chat);
                              setShowHistoryDropdown(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-sidebar-accent"
                          >
                            <span className="truncate">{chat.title}</span>
                            {currentChatId === chat.id && <Check className="w-4 h-4 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button onClick={handleNewChat} className="p-1.5 rounded hover:bg-muted">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!hasMessages ? (
            /* Welcome State */
            <div className="min-h-full flex flex-col items-center justify-center py-12 px-6">
              <div className="w-full max-w-2xl">
                {/* AI Icon */}
                <div className="flex justify-center mb-6 animate-float-up">
                  <div className="w-14 h-14 rounded-full bg-muted/80 border border-border flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-foreground" />
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-semibold text-foreground mb-8 text-center animate-float-up" style={{ animationDelay: '0.1s' }}>
                  How can I help you today?
                </h1>

                {/* Input Card */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn("rounded-2xl glass p-4 mb-4 animate-float-up relative", isDragOver ? "border-primary border-dashed bg-primary/10" : "focus-within:border-foreground/30")}
                  style={{ animationDelay: '0.2s' }}
                >
                  {isDragOver && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-2xl z-10">
                      <div className="flex items-center gap-2 text-primary text-sm font-medium"><Paperclip className="w-5 h-5" />Drop files here</div>
                    </div>
                  )}
                  {/* Project picker + Add context */}
                  <div className="flex items-center gap-2 mb-2">
                    {/* Project Picker */}
                    <div className="relative" ref={projectDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border/80 bg-background/50 hover:bg-muted max-w-[160px]"
                      >
                        <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{projects.find(p => p.id === selectedProjectId)?.name || 'Select project'}</span>
                        <ChevronDown className="w-3 h-3 shrink-0" />
                      </button>
                      {showProjectDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg py-1 z-30 max-h-48 overflow-y-auto">
                          <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide">Projects</div>
                          {projects.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-muted-foreground">No projects found</div>
                          ) : (
                            projects.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => { setSelectedProjectId(p.id); setShowProjectDropdown(false); }}
                                className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors hover:bg-accent", selectedProjectId === p.id && "text-primary font-medium")}
                              >
                                <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{p.name}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {/* Add context button */}
                    <button type="button" onClick={() => { setInput(input + '@'); setShowContextPicker(true); chatInputRef.current?.focus(); }} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border/80 bg-background/50 hover:bg-muted">
                      <AtSign className="w-3.5 h-3.5" />Add context
                    </button>
                  </div>
                  {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {attachedFiles.map((f, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-xs text-foreground">
                          <FileCode className="w-3 h-3" /><span className="max-w-[100px] truncate">{f}</span>
                          <button onClick={() => removeAttachedFile(i)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <form onSubmit={handleSubmit}>
                    <div className="relative mb-3">
                      <input
                        ref={chatInputRef}
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={(e) => { handleContextKeyDown(e); if (!showContextPicker) handleKeyDown(e); }}
                        onPaste={handlePaste}
                        placeholder="Type @ to add context..."
                        className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 text-sm outline-none"
                      />
                      {showContextPicker && filteredFiles.length > 0 && (
                        <div ref={contextPickerRef} className="absolute bottom-full left-0 mb-1 w-64 max-h-40 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg py-1 z-30">
                          <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide">Files</div>
                          {filteredFiles.slice(0, 6).map((f, i) => (
                            <button key={f} onClick={() => selectContextFile(f)} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors", i === contextPickerIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50")}>
                              <FileCode className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span className="truncate">{f}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-0.5">
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-muted/50"><Paperclip className="w-4 h-4 text-muted-foreground" /></button>
                        <div className="relative" ref={modelDropdownRef}>
                          <button type="button" onClick={() => setShowModelDropdown(!showModelDropdown)} className={cn("flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium", selectedModel !== 'default' ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground")}>
                            <Zap className="w-3.5 h-3.5" />{selectedModel === 'default' ? 'Default' : selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)}<ChevronDown className="w-3 h-3" />
                          </button>
                          {showModelDropdown && (
                            <div className="absolute bottom-full left-0 mb-1 w-28 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
                              {(['default', 'haiku', 'sonnet', 'opus'] as const).map(m => (
                                <button key={m} type="button" onClick={() => { setSelectedModel(m); setShowModelDropdown(false); }} className={cn("w-full px-3 py-1.5 text-left text-xs hover:bg-accent", selectedModel === m ? "text-primary font-medium" : "text-popover-foreground")}>
                                  {m === 'default' ? 'Default' : m.charAt(0).toUpperCase() + m.slice(1)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button type="button" onClick={() => setWebSearchEnabled(!webSearchEnabled)} className={cn("flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium", webSearchEnabled ? "text-blue-500 bg-blue-500/10" : "text-muted-foreground hover:text-foreground")}>
                          <Globe className={cn("w-3.5 h-3.5", webSearchEnabled && "text-blue-500")} />Web
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="relative" ref={permissionDropdownRef}>
                          <button type="button" onClick={() => setShowPermissionDropdown(!showPermissionDropdown)} className={cn("p-1.5 rounded-lg", chatPermissionMode === 'default' && "text-muted-foreground hover:text-foreground hover:bg-muted", chatPermissionMode === 'acceptEdits' && "text-yellow-500 bg-yellow-500/10", chatPermissionMode === 'bypassPermissions' && "text-red-500 bg-red-500/10")}>
                            {chatPermissionMode === 'default' && <ShieldAlert className="w-4 h-4" />}
                            {chatPermissionMode === 'acceptEdits' && <Pencil className="w-4 h-4" />}
                            {chatPermissionMode === 'bypassPermissions' && <Zap className="w-4 h-4" />}
                          </button>
                          {showPermissionDropdown && (
                            <div className="absolute bottom-full right-0 mb-1 w-40 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
                              <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide">Permission</div>
                              <button type="button" onClick={() => { setChatPermissionMode('default'); setShowPermissionDropdown(false); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent", chatPermissionMode === 'default' && "text-primary font-medium")}><ShieldAlert className="w-3.5 h-3.5" />Default</button>
                              <button type="button" onClick={() => { setChatPermissionMode('acceptEdits'); setShowPermissionDropdown(false); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent", chatPermissionMode === 'acceptEdits' && "text-yellow-500 font-medium")}><Pencil className="w-3.5 h-3.5" />Accept Edits</button>
                              <button type="button" onClick={() => { setChatPermissionMode('bypassPermissions'); setShowPermissionDropdown(false); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent", chatPermissionMode === 'bypassPermissions' && "text-red-500 font-medium")}><Zap className="w-3.5 h-3.5" />Bypass All</button>
                            </div>
                          )}
                        </div>
                        <button type="submit" className={cn('w-7 h-7 rounded-lg flex items-center justify-center', input.trim() ? 'bg-foreground text-background' : 'bg-muted/50 text-muted-foreground')}><ArrowUp className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Quick Actions */}
                {showQuickActions && (
                  <div className="mt-6 animate-float-up" style={{ animationDelay: '0.3s' }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-muted-foreground">Get started</span>
                      <button onClick={() => setShowQuickActions(false)} className="p-0.5 rounded hover:bg-muted">
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      {quickActions.map((action, i) => (
                        <QuickActionCard key={action.id} icon={action.icon} label={action.label} onClick={() => sendMessage(action.prompt)} delay={i * 0.05} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Messages State */
            <div className="p-6 max-w-3xl mx-auto">
              <div className={cn('text-center text-sm text-muted-foreground mb-6', isAnimating && 'animate-float-up')}>{formatDate(messages[0]?.timestamp || new Date())} · NoteCode AI</div>
              {messages.map((msg, i) => (
                <div key={msg.id} className={isAnimating ? 'opacity-0' : ''} style={isAnimating ? { animation: `float-up 0.4s ease-out ${0.1 + i * 0.1}s forwards` } : undefined}>
                  {msg.role === 'user' ? <UserMessage content={msg.content} /> : <AssistantMessage message={msg} />}
                </div>
              ))}
              {isStreaming && messages[messages.length - 1]?.content === '' && <TypingIndicator />}
            </div>
          )}
        </div>

        {/* Fixed Input (chat state) */}
        {hasMessages && (
          <div className={cn('p-4', isAnimating && 'opacity-0')} style={isAnimating ? { animation: `float-up 0.4s ease-out ${0.1 + messages.length * 0.1}s forwards` } : undefined}>
            <div className="max-w-3xl mx-auto">
              <form
                onSubmit={handleSubmit}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn("rounded-2xl border p-3 relative", isDragOver ? "border-primary border-dashed bg-primary/10" : "border-sidebar-border bg-sidebar focus-within:border-foreground/30")}
              >
                {isDragOver && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-2xl z-10">
                    <div className="flex items-center gap-2 text-primary text-sm font-medium"><Paperclip className="w-5 h-5" />Drop files here</div>
                  </div>
                )}
                {/* Project indicator + Add context */}
                <div className="flex items-center gap-2 mb-2">
                  {/* Project indicator (read-only in chat state) */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border/80 bg-background/50 text-muted-foreground max-w-[160px]">
                    <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{projects.find(p => p.id === selectedProjectId)?.name || 'No project'}</span>
                  </div>
                  {/* Add context button */}
                  <button type="button" onClick={() => { setInput(input + '@'); setShowContextPicker(true); chatInputRef.current?.focus(); }} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border/80 bg-background/50 hover:bg-muted">
                    <AtSign className="w-3.5 h-3.5" />Add context
                  </button>
                </div>
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {attachedFiles.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-xs text-foreground">
                        <FileCode className="w-3 h-3" /><span className="max-w-[100px] truncate">{f}</span>
                        <button type="button" onClick={() => removeAttachedFile(i)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative mb-2">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => { handleContextKeyDown(e); if (!showContextPicker) handleKeyDown(e); }}
                    onPaste={handlePaste}
                    placeholder="Type @ to add context..."
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 text-sm outline-none"
                  />
                  {showContextPicker && filteredFiles.length > 0 && (
                    <div ref={contextPickerRef} className="absolute bottom-full left-0 mb-1 w-64 max-h-40 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg py-1 z-30">
                      <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide">Files</div>
                      {filteredFiles.slice(0, 6).map((f, i) => (
                        <button key={f} type="button" onClick={() => selectContextFile(f)} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors", i === contextPickerIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50")}>
                          <FileCode className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span className="truncate">{f}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-muted/50"><Paperclip className="w-4 h-4 text-muted-foreground" /></button>
                    <div className="relative" ref={modelDropdownRef}>
                      <button type="button" onClick={() => setShowModelDropdown(!showModelDropdown)} className={cn("flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium", selectedModel !== 'default' ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground")}>
                        <Zap className="w-3.5 h-3.5" />{selectedModel === 'default' ? 'Default' : selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)}<ChevronDown className="w-3 h-3" />
                      </button>
                      {showModelDropdown && (
                        <div className="absolute bottom-full left-0 mb-1 w-28 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
                          {(['default', 'haiku', 'sonnet', 'opus'] as const).map(m => (
                            <button key={m} type="button" onClick={() => { setSelectedModel(m); setShowModelDropdown(false); }} className={cn("w-full px-3 py-1.5 text-left text-xs hover:bg-accent", selectedModel === m ? "text-primary font-medium" : "text-popover-foreground")}>
                              {m === 'default' ? 'Default' : m.charAt(0).toUpperCase() + m.slice(1)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => setWebSearchEnabled(!webSearchEnabled)} className={cn("flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium", webSearchEnabled ? "text-blue-500 bg-blue-500/10" : "text-muted-foreground hover:text-foreground")}>
                      <Globe className={cn("w-3.5 h-3.5", webSearchEnabled && "text-blue-500")} />Web
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="relative" ref={permissionDropdownRef}>
                      <button type="button" onClick={() => setShowPermissionDropdown(!showPermissionDropdown)} className={cn("p-1.5 rounded-lg", chatPermissionMode === 'default' && "text-muted-foreground hover:text-foreground hover:bg-muted", chatPermissionMode === 'acceptEdits' && "text-yellow-500 bg-yellow-500/10", chatPermissionMode === 'bypassPermissions' && "text-red-500 bg-red-500/10")}>
                        {chatPermissionMode === 'default' && <ShieldAlert className="w-4 h-4" />}
                        {chatPermissionMode === 'acceptEdits' && <Pencil className="w-4 h-4" />}
                        {chatPermissionMode === 'bypassPermissions' && <Zap className="w-4 h-4" />}
                      </button>
                      {showPermissionDropdown && (
                        <div className="absolute bottom-full right-0 mb-1 w-40 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
                          <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide">Permission</div>
                          <button type="button" onClick={() => { setChatPermissionMode('default'); setShowPermissionDropdown(false); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent", chatPermissionMode === 'default' && "text-primary font-medium")}><ShieldAlert className="w-3.5 h-3.5" />Default</button>
                          <button type="button" onClick={() => { setChatPermissionMode('acceptEdits'); setShowPermissionDropdown(false); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent", chatPermissionMode === 'acceptEdits' && "text-yellow-500 font-medium")}><Pencil className="w-3.5 h-3.5" />Accept Edits</button>
                          <button type="button" onClick={() => { setChatPermissionMode('bypassPermissions'); setShowPermissionDropdown(false); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent", chatPermissionMode === 'bypassPermissions' && "text-red-500 font-medium")}><Zap className="w-3.5 h-3.5" />Bypass All</button>
                        </div>
                      )}
                    </div>
                    {isStreaming ? (
                      <button type="button" onClick={cancelStream} className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted/50 text-muted-foreground hover:bg-muted" title="Stop"><Square className="w-3 h-3 fill-current" /></button>
                    ) : (
                      <button type="submit" disabled={!selectedProjectId} className={cn('w-7 h-7 rounded-lg flex items-center justify-center', input.trim() && selectedProjectId ? 'bg-foreground text-background' : 'bg-muted/50 text-muted-foreground cursor-not-allowed')}><ArrowUp className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
