import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
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
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { sharedChatHistory } from '@/features/chat';

// Message type (shared with AIChatView)
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  steps?: number;
}

// Chat history type (shared with AIChatView)
interface ChatHistory {
  id: string;
  title: string;
  date: Date;
  messages: Message[];
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatTitle, setChatTitle] = useState('New AI chat');
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Load messages when selecting a chat
  useEffect(() => {
    if (selectedChat) {
      setMessages(selectedChat.messages);
      setChatTitle(selectedChat.title);
    }
  }, [selectedChat]);

  const handleNewChat = () => {
    setSelectedChat(null);
    setMessages([]);
    setChatTitle('New AI chat');
    setShowHistory(false);
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
    if (!content.trim() || isTyping) return;

    // Set chat title from first message
    if (messages.length === 0) {
      setChatTitle(content.trim().slice(0, 25) + (content.length > 25 ? '...' : ''));
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Simulate AI typing
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Add AI response
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `I understand your question about "${content.trim()}". Here are my thoughts:\n\n1. **Analysis**: I've reviewed your request\n2. **Suggestions**: Based on your input, I recommend exploring the documentation\n3. **Next Steps**: Would you like me to elaborate?\n\nFeel free to ask follow-up questions!`,
      timestamp: new Date(),
      steps: 1,
    };

    setIsTyping(false);
    setMessages((prev) => [...prev, assistantMessage]);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

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
          'bg-muted/80 border border-border',
          'flex items-center justify-center',
          'shadow-lg hover:shadow-xl',
          'transition-all duration-300 hover:scale-105',
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
          'bg-card border border-border rounded-xl shadow-2xl',
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
              <div className="absolute left-0 top-full mt-1 w-64 bg-popover border border-border rounded-lg shadow-lg py-1 z-10">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Recent Chats
                </div>
                {sharedChatHistory.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleSelectChat(chat)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 hover:bg-muted transition-colors text-left',
                      selectedChat?.id === chat.id && 'bg-muted'
                    )}
                  >
                    <span className="text-sm text-foreground truncate">{chat.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">Today</span>
                  </button>
                ))}
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
                    <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{message.content}</div>
                  </div>
                )
              )}
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3">
          <div className="rounded-2xl border border-border bg-muted/50 p-3 focus-within:border-primary/50 transition-colors">
            {/* Add context button */}
            <div className="mb-2">
              <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors">
                <AtSign className="w-3.5 h-3.5" />
                Add context
              </button>
            </div>

            {/* Input field */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask, search, or make anything..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none mb-2"
              disabled={isTyping}
            />

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Auto
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <Globe className="w-3.5 h-3.5" />
                  All sources
                </button>
              </div>
              <button
                onClick={() => handleSubmit()}
                disabled={isTyping || !input.trim()}
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                  input.trim() && !isTyping ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop when panel is open (for mobile) */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setIsOpen(false)} />}
    </>
  );
}
