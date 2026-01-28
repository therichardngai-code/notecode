import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ChevronsRight,
  Plus,
  Search,
  FileText,
  CheckCircle,
  AtSign,
  Paperclip,
  Globe,
  ArrowUp,
  ListTodo,
  Sparkles,
  X,
  FileCode,
  Zap,
  ShieldAlert,
  Pencil,
  Square,
  Loader2,
  FolderOpen,
  Terminal,
  Wrench,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useChatSession, type ChatMessage, type ToolCommand } from '@/shared/hooks';
import type { ToolUseBlock } from '@/shared/hooks/use-session-websocket';
import { projectsApi, type Project, type Chat } from '@/adapters/api';

// Chat history type (shared with AIChatView)
interface ChatHistory {
  id: string;
  title: string;
  date: Date;
  messages: ChatMessage[];
}

// Suggestion button component
function SuggestionButton({ icon: Icon, label, badge }: { icon: React.ElementType; label: string; badge?: string }) {
  return (
    <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-foreground">{label}</span>
      {badge && (
        <span className="text-[10px] font-medium text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">{badge}</span>
      )}
    </button>
  );
}

interface FloatingChatPanelProps {
  onGoToFullChat?: (chatId?: string) => void;
}

export function FloatingChatPanel({ onGoToFullChat }: FloatingChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedChat, setSelectedChat] = useState<ChatHistory | null>(null);
  const [input, setInput] = useState('');
  const [chatTitle, setChatTitle] = useState('New AI chat');
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Project selection state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Chat history state
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);

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
    status: chatStatus,
    messages,
    isStreaming,
    currentToolUse,
    startChat,
    sendFollowUp,
    cancelStream,
    resetChat,
  } = useChatSession({
    projectId: selectedProjectId,
    onError: (msg) => console.error('Chat error:', msg),
  });

  // Expanded commands state (for tool input details)
  const [expandedCommands, setExpandedCommands] = useState<Set<string>>(new Set());
  const toggleCommand = useCallback((key: string) => {
    setExpandedCommands(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

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

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);

  // @ context picker state
  const [showContextPicker, setShowContextPicker] = useState(false);
  const [contextSearch, setContextSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [contextPickerIndex, setContextPickerIndex] = useState(0);
  const contextPickerRef = useRef<HTMLDivElement>(null);

  // Sample project files
  const projectFiles = ['src/index.ts', 'src/app.tsx', 'src/components/Button.tsx', 'package.json', 'tsconfig.json'];
  const filteredFiles = projectFiles.filter(f => f.toLowerCase().includes(contextSearch.toLowerCase()));

  // Click outside to close history dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    if (showHistory) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHistory]);

  // Click outside to close floating panel
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedInsidePanel = panelRef.current?.contains(target);
      const clickedInsideButton = buttonRef.current?.contains(target);
      if (!clickedInsidePanel && !clickedInsideButton) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update chat title when selecting a chat from history
  useEffect(() => {
    if (selectedChat) {
      setChatTitle(selectedChat.title);
    }
  }, [selectedChat]);

  // Close dropdowns on click outside
  useEffect(() => {
    if (!showModelDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) setShowModelDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelDropdown]);

  useEffect(() => {
    if (!showPermissionDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (permissionDropdownRef.current && !permissionDropdownRef.current.contains(e.target as Node)) setShowPermissionDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPermissionDropdown]);

  useEffect(() => {
    if (!showContextPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (contextPickerRef.current && !contextPickerRef.current.contains(e.target as Node)) setShowContextPicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showContextPicker]);

  useEffect(() => { setContextPickerIndex(0); }, [contextSearch]);

  // File handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) setAttachedFiles(prev => [...prev, ...Array.from(files).map(f => f.name)]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const removeAttachedFile = (index: number) => setAttachedFiles(prev => prev.filter((_, i) => i !== index));

  // Drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) setAttachedFiles(prev => [...prev, ...Array.from(files).map(f => f.name)]);
  }, []);

  // Clipboard paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: string[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file.name);
      }
    }
    if (files.length > 0) setAttachedFiles(prev => [...prev, ...files]);
  }, []);

  // @ context picker
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setInput(value);
    setCursorPosition(cursorPos);
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if ((charBeforeAt === ' ' || lastAtIndex === 0) && !textAfterAt.includes(' ')) {
        setContextSearch(textAfterAt);
        setShowContextPicker(true);
        return;
      }
    }
    setShowContextPicker(false);
  }, []);

  const selectContextFile = useCallback((file: string) => {
    const textBeforeCursor = input.slice(0, cursorPosition);
    const textAfterCursor = input.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const newText = textBeforeCursor.slice(0, lastAtIndex) + `@${file} ` + textAfterCursor;
    setInput(newText);
    setShowContextPicker(false);
    setContextSearch('');
    if (!attachedFiles.includes(file)) setAttachedFiles(prev => [...prev, file]);
    chatInputRef.current?.focus();
  }, [input, cursorPosition, attachedFiles]);

  const handleContextPickerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showContextPicker) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setContextPickerIndex(prev => Math.min(prev + 1, filteredFiles.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setContextPickerIndex(prev => Math.max(prev - 1, 0)); }
    else if (e.key === 'Enter' && filteredFiles.length > 0) { e.preventDefault(); selectContextFile(filteredFiles[contextPickerIndex]); }
    else if (e.key === 'Escape') setShowContextPicker(false);
  }, [showContextPicker, filteredFiles, contextPickerIndex, selectContextFile]);

  const handleNewChat = () => {
    setSelectedChat(null);
    resetChat();
    setChatTitle('New AI chat');
    setShowHistory(false);
    setAttachedFiles([]);
  };

  const handleSelectChat = (chat: ChatHistory) => {
    setSelectedChat(chat);
    setShowHistory(false);
  };

  const handleOpenFullChat = () => {
    setIsOpen(false);
    onGoToFullChat?.(selectedChat?.id);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;
    if (!selectedProjectId) {
      console.error('No project selected');
      return;
    }

    // Set chat title from first message
    if (messages.length === 0) {
      setChatTitle(content.trim().slice(0, 25) + (content.length > 25 ? '...' : ''));

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

  // Close project dropdown on click outside
  useEffect(() => {
    if (!showProjectDropdown) return;
    const h = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) setShowProjectDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showProjectDropdown]);

  const currentMessages = selectedChat ? selectedChat.messages : messages;
  const hasMessages = currentMessages.length > 0;

  return (
    <>
      {/* Floating Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-12 right-6 z-50',
          'w-12 h-12 rounded-full',
          'glass border border-border/50',
          'flex items-center justify-center',
          'shadow-lg hover:shadow-xl',
          'transition-all duration-300 hover:scale-105 cursor-pointer',
          isOpen && 'scale-0 opacity-0'
        )}
      >
        <Sparkles className="w-5 h-5 text-foreground" />
      </button>

      {/* Floating Chat Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed bottom-12 right-6 z-50',
          'w-[400px] h-[600px] max-h-[80vh]',
          'glass-strong rounded-xl',
          'flex flex-col overflow-hidden',
          'transition-all duration-300 ease-in-out',
          isOpen ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-full scale-95 pointer-events-none'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          {/* Left: Chat Selector Dropdown */}
          <div className="relative" ref={historyRef}>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted transition-colors"
            >
              <span className="text-sm font-medium text-foreground">{chatTitle}</span>
              <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', showHistory && 'rotate-180')} />
            </button>

            {/* History Dropdown */}
            {showHistory && (
              <div className="absolute left-0 top-full mt-1 w-64 glass rounded-lg shadow-lg py-1 z-10">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Recent Chats
                </div>
                {chatHistory.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No chat history</div>
                ) : (
                  chatHistory.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => { setChatTitle(chat.title); setShowHistory(false); }}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted transition-colors text-left"
                    >
                      <span className="text-sm text-foreground truncate">{chat.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {new Date(chat.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-0.5">
            <button onClick={handleNewChat} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="New chat">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={handleOpenFullChat} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Open AI Chat">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Close">
              <ChevronsRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {!hasMessages ? (
            /* Welcome Screen */
            <div className="flex flex-col items-center justify-center min-h-full px-6 py-12">
              <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6 text-foreground" />
              </div>
              <h2 className="text-lg font-medium text-foreground mb-8">How can I help you today?</h2>
              <div className="w-full max-w-xs space-y-1">
                <SuggestionButton icon={Search} label="Search for anything" />
                <SuggestionButton icon={ListTodo} label="Write meeting agenda" />
                <SuggestionButton icon={FileText} label="Analyze PDFs or images" />
                <SuggestionButton icon={CheckCircle} label="Create a task tracker" badge="New" />
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="p-4">
              {currentMessages.map((message) =>
                message.role === 'user' ? (
                  <div key={message.id} className="flex justify-end mb-4">
                    <div className="bg-muted border border-border rounded-full px-4 py-2 text-sm text-foreground max-w-[80%]">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="mb-6">
                    {message.steps && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <ChevronDown className="w-3.5 h-3.5" />
                        {message.steps} steps
                      </div>
                    )}
                    <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-2">{message.content}</div>
                    {/* Tool commands */}
                    {message.commands && message.commands.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {message.commands.map((cmd, idx) => {
                          const cmdKey = `${message.id}-${idx}`;
                          const isExpanded = expandedCommands.has(cmdKey);
                          const hasInput = cmd.input && Object.keys(cmd.input).length > 0;
                          return (
                            <div key={idx} className="bg-muted/30 rounded text-xs font-mono overflow-hidden">
                              <button
                                onClick={() => hasInput && toggleCommand(cmdKey)}
                                className={cn("w-full flex items-center gap-2 px-2 py-1", hasInput && "hover:bg-muted/50 cursor-pointer")}
                              >
                                {hasInput ? (
                                  isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                ) : (
                                  <Terminal className="w-3 h-3 text-muted-foreground" />
                                )}
                                <span className="flex-1 text-foreground text-left">{cmd.cmd}</span>
                                {cmd.status === 'success' && <CheckCircle className="w-3 h-3 text-green-500" />}
                              </button>
                              {isExpanded && (
                                <div className="px-3 py-2 border-t border-border/50 bg-background/50 space-y-1">
                                  {cmd.input && 'file_path' in cmd.input && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <FileCode className="w-3 h-3 shrink-0" />
                                      <span className="truncate">{String(cmd.input.file_path)}</span>
                                    </div>
                                  )}
                                  {cmd.input && 'query' in cmd.input && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Globe className="w-3 h-3 shrink-0" />
                                      <span className="truncate">{String(cmd.input.query)}</span>
                                    </div>
                                  )}
                                  {cmd.input && 'command' in cmd.input && (
                                    <div className="flex items-start gap-2 text-muted-foreground">
                                      <Terminal className="w-3 h-3 shrink-0 mt-0.5" />
                                      <code className="text-[10px] break-all">{String(cmd.input.command)}</code>
                                    </div>
                                  )}
                                  {cmd.input && 'pattern' in cmd.input && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <span className="text-[10px] font-medium">Pattern:</span>
                                      <code className="text-[10px]">{String(cmd.input.pattern)}</code>
                                    </div>
                                  )}
                                  {cmd.input && 'url' in cmd.input && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Globe className="w-3 h-3 shrink-0" />
                                      <span className="truncate text-[10px]">{String(cmd.input.url)}</span>
                                    </div>
                                  )}
                                  {cmd.input && 'content' in cmd.input && (
                                    <pre className="mt-1 p-2 bg-muted/50 rounded text-[10px] max-h-[80px] overflow-auto whitespace-pre-wrap text-foreground/80">
                                      {String(cmd.input.content).slice(0, 300)}{String(cmd.input.content).length > 300 ? '...' : ''}
                                    </pre>
                                  )}
                                  {cmd.input && 'todos' in cmd.input && Array.isArray(cmd.input.todos) && (
                                    <div className="space-y-1">
                                      {(cmd.input.todos as Array<{content?: string; status?: string}>).slice(0, 5).map((todo, i) => (
                                        <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                          <span className={cn("w-2 h-2 rounded-full", todo.status === 'completed' ? 'bg-green-500' : todo.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400')} />
                                          <span className="truncate">{todo.content}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {/* Fallback: show raw JSON if no known fields */}
                                  {cmd.input && !('file_path' in cmd.input || 'query' in cmd.input || 'command' in cmd.input || 'pattern' in cmd.input || 'url' in cmd.input || 'content' in cmd.input || 'todos' in cmd.input) && (
                                    <pre className="text-[10px] text-muted-foreground/80 max-h-[80px] overflow-auto whitespace-pre-wrap">
                                      {JSON.stringify(cmd.input, null, 2).slice(0, 300)}
                                    </pre>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )
              )}
              {/* Current tool in use */}
              {currentToolUse && (
                <div className="mb-4 bg-muted/30 rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Wrench className="w-3.5 h-3.5 animate-pulse" />
                    <span className="font-medium">{currentToolUse.name}</span>
                  </div>
                  {currentToolUse.input && Object.keys(currentToolUse.input).length > 0 && (
                    <pre className="text-[10px] text-muted-foreground/80 max-h-[60px] overflow-auto whitespace-pre-wrap">
                      {JSON.stringify(currentToolUse.input, null, 2).slice(0, 300)}
                    </pre>
                  )}
                </div>
              )}
              {/* Streaming indicator */}
              {isStreaming && messages[messages.length - 1]?.content === '' && !currentToolUse && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "rounded-2xl border p-3 transition-colors relative",
              isDragOver ? "border-primary border-dashed bg-primary/10" : "border-border bg-muted/50 focus-within:border-primary/50"
            )}
          >
            {/* Drag overlay */}
            {isDragOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-2xl z-10">
                <div className="flex items-center gap-2 text-primary text-sm font-medium">
                  <Paperclip className="w-5 h-5" />Drop files here
                </div>
              </div>
            )}
            {/* Project picker + Add context */}
            <div className="flex items-center gap-2 mb-2">
              {/* Project Picker */}
              <div className="relative" ref={projectDropdownRef}>
                <button
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted text-muted-foreground transition-colors max-w-[140px]"
                >
                  <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{projects.find(p => p.id === selectedProjectId)?.name || 'Select project'}</span>
                  <ChevronDown className="w-3 h-3 shrink-0" />
                </button>
                {showProjectDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-30 max-h-48 overflow-y-auto">
                    <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide">Projects</div>
                    {projects.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No projects found</div>
                    ) : (
                      projects.map(p => (
                        <button
                          key={p.id}
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
              <button
                onClick={() => { setInput(input + '@'); setShowContextPicker(true); chatInputRef.current?.focus(); }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted text-muted-foreground transition-colors"
              >
                <AtSign className="w-3.5 h-3.5" />Add context
              </button>
            </div>
            {/* Attached Files */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {attachedFiles.map((file, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-xs text-foreground">
                    <FileCode className="w-3 h-3" />
                    <span className="max-w-[100px] truncate">{file}</span>
                    <button onClick={() => removeAttachedFile(idx)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
            {/* Input with @ picker */}
            <div className="relative mb-2">
              <input
                ref={chatInputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => { handleContextPickerKeyDown(e); if (!showContextPicker) handleKeyDown(e); }}
                onPaste={handlePaste}
                placeholder="Type @ to add context..."
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                disabled={isStreaming}
              />
              {/* @ Context Picker */}
              {showContextPicker && filteredFiles.length > 0 && (
                <div ref={contextPickerRef} className="absolute bottom-full left-0 mb-1 w-64 max-h-40 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg py-1 z-30">
                  <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide">Files</div>
                  {filteredFiles.slice(0, 6).map((file, idx) => (
                    <button
                      key={file}
                      onClick={() => selectContextFile(file)}
                      className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors", idx === contextPickerIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50")}
                    >
                      <FileCode className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{file}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Bottom toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Attach file">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                </button>
                {/* Model Selector */}
                <div className="relative" ref={modelDropdownRef}>
                  <button
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className={cn("flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors", selectedModel !== 'default' ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground")}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {selectedModel === 'default' ? 'Default' : selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showModelDropdown && (
                    <div className="absolute bottom-full left-0 mb-1 w-28 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
                      {(['default', 'haiku', 'sonnet', 'opus'] as const).map((model) => (
                        <button key={model} onClick={() => { setSelectedModel(model); setShowModelDropdown(false); }} className={cn("w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition-colors", selectedModel === model ? "text-primary font-medium" : "text-popover-foreground")}>
                          {model === 'default' ? 'Default' : model.charAt(0).toUpperCase() + model.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Web Search Toggle */}
                <button
                  onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                  className={cn("flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors", webSearchEnabled ? "text-blue-500 bg-blue-500/10" : "text-muted-foreground hover:text-foreground")}
                  title={webSearchEnabled ? "Web search enabled" : "Web search disabled"}
                >
                  <Globe className={cn("w-3.5 h-3.5", webSearchEnabled && "text-blue-500")} />
                  Web
                </button>
              </div>
              <div className="flex items-center gap-1">
                {/* Permission Mode */}
                <div className="relative" ref={permissionDropdownRef}>
                  <button
                    onClick={() => setShowPermissionDropdown(!showPermissionDropdown)}
                    className={cn("p-1.5 rounded-lg transition-colors", chatPermissionMode === 'default' && "text-muted-foreground hover:text-foreground hover:bg-muted", chatPermissionMode === 'acceptEdits' && "text-yellow-500 bg-yellow-500/10", chatPermissionMode === 'bypassPermissions' && "text-red-500 bg-red-500/10")}
                    title={`Permission: ${chatPermissionMode}`}
                  >
                    {chatPermissionMode === 'default' && <ShieldAlert className="w-4 h-4" />}
                    {chatPermissionMode === 'acceptEdits' && <Pencil className="w-4 h-4" />}
                    {chatPermissionMode === 'bypassPermissions' && <Zap className="w-4 h-4" />}
                  </button>
                  {showPermissionDropdown && (
                    <div className="absolute bottom-full right-0 mb-1 w-40 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
                      <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide">Permission</div>
                      <button onClick={() => { setChatPermissionMode('default'); setShowPermissionDropdown(false); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors", chatPermissionMode === 'default' && "text-primary font-medium")}><ShieldAlert className="w-3.5 h-3.5" />Default</button>
                      <button onClick={() => { setChatPermissionMode('acceptEdits'); setShowPermissionDropdown(false); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors", chatPermissionMode === 'acceptEdits' && "text-yellow-500 font-medium")}><Pencil className="w-3.5 h-3.5" />Accept Edits</button>
                      <button onClick={() => { setChatPermissionMode('bypassPermissions'); setShowPermissionDropdown(false); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors", chatPermissionMode === 'bypassPermissions' && "text-red-500 font-medium")}><Zap className="w-3.5 h-3.5" />Bypass All</button>
                    </div>
                  )}
                </div>
                {/* Send/Stop Button */}
                {isStreaming ? (
                  <button
                    onClick={cancelStream}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                    title="Stop"
                  >
                    <Square className="w-3 h-3 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubmit()}
                    disabled={!input.trim() || !selectedProjectId}
                    className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-colors", input.trim() && selectedProjectId ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed')}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop when panel is open (for mobile) */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setIsOpen(false)} />}
    </>
  );
}
