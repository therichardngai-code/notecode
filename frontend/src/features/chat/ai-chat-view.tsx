import { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

// Types
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  steps?: number;
}

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

// Mock responses
const mockResponses: Record<string, { content: string; steps: number }> = {
  "What's new in NoteCode?": {
    steps: 2,
    content: `NoteCode has several exciting new features:\n\n1. **AI-powered chat** - Get help with coding tasks\n2. **Task management** - Kanban boards and task tracking\n3. **Source control** - Built-in git integration\n\nWould you like to know more about any specific feature?`,
  },
  'Help me write a meeting agenda for a team standup': {
    steps: 1,
    content: `**Daily Standup Agenda**\n\n1. **Roll Call** (2 min)\n2. **Yesterday's Progress** (5 min)\n3. **Today's Goals** (5 min)\n4. **Blockers & Help Needed** (5 min)\n5. **Quick Announcements** (3 min)\n\n*Total time: ~20 minutes*`,
  },
};

const defaultResponse = {
  steps: 1,
  content: `I understand your question. Let me help you with that.\n\n1. **Analysis**: I've reviewed your request\n2. **Suggestions**: Based on your input, I recommend exploring the documentation\n3. **Next Steps**: Would you like me to elaborate?\n\nFeel free to ask follow-up questions!`,
};

// Group chats by date
function groupChatsByDate(chats: ChatHistoryItem[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; chats: ChatHistoryItem[] }[] = [];
  const todayChats = chats.filter((c) => {
    const d = new Date(c.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });
  const yesterdayChats = chats.filter((c) => {
    const d = new Date(c.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === yesterday.getTime();
  });
  const olderChats = chats.filter((c) => {
    const d = new Date(c.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < yesterday.getTime();
  });

  if (todayChats.length > 0) groups.push({ label: 'Today', chats: todayChats });
  if (yesterdayChats.length > 0) groups.push({ label: 'Yesterday', chats: yesterdayChats });
  if (olderChats.length > 0) groups.push({ label: 'Previous', chats: olderChats });

  return groups;
}

function getRelativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
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
      className="flex flex-col items-start gap-2.5 p-3 rounded-xl border border-sidebar-border bg-sidebar hover:bg-sidebar-accent transition-colors text-left flex-1 min-w-[140px] opacity-0"
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
  const [selectedMode, setSelectedMode] = useState('auto');
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatTitle, setChatTitle] = useState('New chat');
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [chatHistory, setChatHistory] = useState(sharedChatHistory);
  const [isAnimating, setIsAnimating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const historyPanelRef = useRef<HTMLDivElement>(null);

  // Load initial chat
  useEffect(() => {
    if (initialChatId) {
      const chat = sharedChatHistory.find((c) => c.id === initialChatId);
      if (chat) {
        setIsAnimating(true);
        setChatTitle(chat.title);
        setCurrentChatId(chat.id);
        setMessages(chat.messages);
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
  }, [messages, isTyping]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    if (messages.length === 0) setChatTitle(content.trim().slice(0, 30) + (content.length > 30 ? '...' : ''));

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: content.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setShowQuickActions(false);
    setIsTyping(true);

    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));

    const response = mockResponses[content.trim()] || defaultResponse;
    const assistantMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: response.content, timestamp: new Date(), steps: response.steps };
    setIsTyping(false);
    setMessages((prev) => [...prev, assistantMsg]);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isTyping) sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setShowQuickActions(true);
    setChatTitle('New chat');
    setCurrentChatId(null);
    setShowHistoryDropdown(false);
  };

  const handleLoadChat = (chat: ChatHistoryItem) => {
    setIsAnimating(true);
    setChatTitle(chat.title);
    setCurrentChatId(chat.id);
    setMessages(chat.messages);
    setShowQuickActions(false);
    setShowHistoryPanel(false);
    setTimeout(() => setIsAnimating(false), 600);
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setChatHistory((prev) => prev.filter((c) => c.id !== chatId));
    if (currentChatId === chatId) handleNewChat();
  };

  const hasMessages = messages.length > 0;
  const filteredHistory = chatHistory.filter((c) => c.title.toLowerCase().includes(historySearch.toLowerCase()));

  return (
    <div className="h-full flex bg-background relative overflow-hidden">
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
            'w-64 border-r border-border flex flex-col bg-background shrink-0 transition-all duration-300 ease-in-out',
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
                        <span className="text-xs text-muted-foreground">{getRelativeTime(chat.date)}</span>
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
                <div className="rounded-2xl border border-sidebar-border bg-sidebar p-4 mb-4 animate-float-up focus-within:border-foreground/30" style={{ animationDelay: '0.2s' }}>
                  <div className="mb-2">
                    <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border/80 bg-background/50 hover:bg-muted">
                      <AtSign className="w-3.5 h-3.5" />
                      Add context
                    </button>
                  </div>
                  <form onSubmit={handleSubmit}>
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask, search, or make anything..."
                      className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 text-sm resize-none outline-none min-h-[40px] mb-3"
                      rows={1}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-0.5">
                        <button type="button" className="p-2 rounded-lg hover:bg-muted/50">
                          <Paperclip className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedMode('auto')}
                          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium', selectedMode === 'auto' ? 'text-foreground' : 'text-muted-foreground')}
                        >
                          Auto
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedMode('all-sources')}
                          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium', selectedMode === 'all-sources' ? 'text-foreground' : 'text-muted-foreground')}
                        >
                          <Globe className="w-3.5 h-3.5" />
                          All sources
                        </button>
                      </div>
                      <button
                        type="submit"
                        className={cn('w-7 h-7 rounded-lg flex items-center justify-center', input.trim() ? 'bg-foreground text-background' : 'bg-muted/50 text-muted-foreground')}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
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
              {isTyping && <TypingIndicator />}
            </div>
          )}
        </div>

        {/* Fixed Input (chat state) */}
        {hasMessages && (
          <div className={cn('p-4', isAnimating && 'opacity-0')} style={isAnimating ? { animation: `float-up 0.4s ease-out ${0.1 + messages.length * 0.1}s forwards` } : undefined}>
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSubmit} className="rounded-2xl border border-sidebar-border bg-sidebar p-3 focus-within:border-foreground/30">
                <div className="mb-2">
                  <button type="button" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border/80 bg-background/50 hover:bg-muted">
                    <AtSign className="w-3.5 h-3.5" />
                    Add context
                  </button>
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask, search, or make anything..."
                  className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 text-sm resize-none outline-none min-h-[24px] max-h-[120px] mb-2"
                  rows={1}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    <button type="button" className="p-2 rounded-lg hover:bg-muted/50">
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMode('auto')}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-medium', selectedMode === 'auto' ? 'text-foreground' : 'text-muted-foreground')}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMode('all-sources')}
                      className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium', selectedMode === 'all-sources' ? 'text-foreground' : 'text-muted-foreground')}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      All sources
                    </button>
                  </div>
                  {isTyping ? (
                    <button type="button" onClick={() => setIsTyping(false)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted/50 text-muted-foreground hover:bg-muted">
                      <Square className="w-3 h-3 fill-current" />
                    </button>
                  ) : (
                    <button type="submit" className={cn('w-7 h-7 rounded-lg flex items-center justify-center', input.trim() ? 'bg-foreground text-background' : 'bg-muted/50 text-muted-foreground')}>
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
