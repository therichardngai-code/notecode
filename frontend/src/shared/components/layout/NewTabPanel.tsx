import { useState } from 'react';
import { Search, Filter, FolderOpen, Sparkles, LayoutList, Kanban, Brain, BarChart3 } from 'lucide-react';

// New session icon (notepad with pen)
const NewSessionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 3H6a3 3 0 00-3 3v12a3 3 0 003 3h12a3 3 0 003-3v-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17.5 2.5a2.121 2.121 0 113 3L12 14l-4 1 1-4 8.5-8.5z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface QuickAccessPage {
  id: string;
  title: string;
  route: string;
  icon: React.ElementType;
}

const quickAccessPages: QuickAccessPage[] = [
  { id: 'chat', title: 'AI Chat', route: '/chat', icon: Sparkles },
  { id: 'sessions', title: 'Sessions', route: '/sessions', icon: LayoutList },
  { id: 'board', title: 'Board', route: '/board', icon: Kanban },
  { id: 'memory', title: 'Memory', route: '/memory', icon: Brain },
  { id: 'dashboard', title: 'Dashboard', route: '/dashboard', icon: BarChart3 },
];

interface NewTabPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPage: (page: { id: string; title: string; route?: string }) => void;
  onCreateNew: () => void;
}

export function NewTabPanel({ isOpen, onClose, onSelectPage, onCreateNew }: NewTabPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  if (!isOpen) return null;

  const filteredPages = quickAccessPages.filter((page) =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      {/* Centered Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] pointer-events-none">
        <div className="w-full max-w-2xl bg-sidebar border border-sidebar-border rounded-xl shadow-2xl overflow-hidden pointer-events-auto">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Open in new tab..."
              className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
              autoFocus
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg hover:bg-muted transition-colors ${
                showFilters ? 'bg-muted text-foreground' : 'text-muted-foreground'
              }`}
              title="Toggle filters"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Options - Toggleable */}
          {showFilters && (
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-sidebar-border text-sm text-muted-foreground">
              <span className="hover:text-foreground cursor-pointer">Sort</span>
              <span>·</span>
              <span className="hover:text-foreground cursor-pointer">Created by</span>
              <span>·</span>
              <span className="hover:text-foreground cursor-pointer">In</span>
              <span>·</span>
              <span className="hover:text-foreground cursor-pointer">Date</span>
            </div>
          )}

          {/* Create New Session */}
          <button
            onClick={() => {
              onCreateNew();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-b border-sidebar-border"
          >
            <span className="text-muted-foreground">
              <NewSessionIcon />
            </span>
            <span className="text-sm text-foreground">Create a new session</span>
          </button>

          {/* Quick Access Section */}
          <div className="max-h-[40vh] overflow-y-auto">
            <div className="px-4 py-2.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Quick Access
              </span>
            </div>

            {/* Page List */}
            {filteredPages.map((page) => {
              const Icon = page.icon;
              return (
                <button
                  key={page.id}
                  onClick={() => {
                    onSelectPage({ id: page.id, title: page.title, route: page.route });
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
                >
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">{page.title}</span>
                </button>
              );
            })}

            {filteredPages.length === 0 && (
              <div className="px-4 py-4 text-sm text-muted-foreground text-center">
                No pages found matching "{searchQuery}"
              </div>
            )}

            {/* Recent Workspaces Section */}
            <div className="px-4 py-2.5 mt-2 border-t border-sidebar-border/50">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Recent
              </span>
            </div>

            <button
              onClick={() => {
                onSelectPage({ id: 'workspace-1', title: 'AI Workspace Project' });
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
            >
              <FolderOpen className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-foreground">AI Workspace Project</span>
            </button>

            <button
              onClick={() => {
                onSelectPage({ id: 'workspace-2', title: 'NoteCode Development' });
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
            >
              <FolderOpen className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-foreground">NoteCode Development</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
