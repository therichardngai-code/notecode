import { useState } from 'react';
import { MessageCircle, Trash2, Search } from 'lucide-react';
import { ScrollArea } from '@/shared/components/ui/scroll-area';

export interface ChatHistoryItem {
  id: string;
  title: string;
  timestamp: Date;
  messageCount: number;
}

interface ChatHistoryProps {
  conversations: ChatHistoryItem[];
  onSelect?: (conversationId: string) => void;
  onDelete?: (conversationId: string) => void;
  currentConversationId?: string;
}

function groupByDate(items: ChatHistoryItem[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: {
    label: string;
    items: ChatHistoryItem[];
  }[] = [];

  const todayItems = items.filter((item) => item.timestamp >= today);
  const yesterdayItems = items.filter(
    (item) => item.timestamp >= yesterday && item.timestamp < today
  );
  const previousItems = items.filter((item) => item.timestamp < yesterday);

  if (todayItems.length > 0) {
    groups.push({ label: 'Today', items: todayItems });
  }
  if (yesterdayItems.length > 0) {
    groups.push({ label: 'Yesterday', items: yesterdayItems });
  }
  if (previousItems.length > 0) {
    groups.push({ label: 'Previous', items: previousItems });
  }

  return groups;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

export function ChatHistory({
  conversations,
  onSelect,
  onDelete,
  currentConversationId,
}: ChatHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedConversations = groupByDate(filteredConversations);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete?.(id);
  };

  return (
    <div className="flex flex-col h-full border-r border-border bg-background">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {groupedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No conversations found' : 'No chat history'}
            </p>
          </div>
        ) : (
          <div className="py-2">
            {groupedConversations.map((group) => (
              <div key={group.label} className="mb-4">
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </div>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelect?.(item.id)}
                    className={`group w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-muted transition-colors ${
                      currentConversationId === item.id ? 'bg-muted' : ''
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">
                          {item.title}
                        </span>
                        <button
                          onClick={(e) => handleDelete(e, item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background transition-opacity"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          · {item.messageCount} messages
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
