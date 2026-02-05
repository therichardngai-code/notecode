import { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import {
  // Search,      // Demo: Not implemented
  Home,
  FolderTree,
  // GitBranch,   // Demo: Not implemented
  Sparkles,
  // Inbox,       // Demo: Not implemented
  ListTodo,
  BarChart3,
  // Brain,       // Demo: Not implemented
  Settings,
  ChevronDown,
  PanelLeft,
  MoreHorizontal,
  ExternalLink,
  Terminal,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { useSettings } from '@/shared/hooks/use-settings';

// Panel items - single click toggles panel, double click opens in tab
// (same as prototype: source-control, inbox)
// Demo: Commented out - features not implemented yet
const panelItems: string[] = [
  // '/source-control',  // Demo: Not implemented
  // '/inbox',           // Demo: Not implemented
];

interface NavigatorProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenInNewTab?: (route: string) => void;
  onSettingsClick?: () => void;
  onNewTaskClick?: () => void;
  onPanelItemClick?: (route: string) => void;
  onPanelItemDoubleClick?: (route: string) => void;
  activePanelRoute?: string | null;
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  to: string;
  isActive?: boolean;
  isPanelActive?: boolean;
  isPanelItem?: boolean;
  onOpenInNewTab?: (route: string) => void;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

function NavItem({ icon: Icon, label, to, isActive, isPanelActive, isPanelItem, onOpenInNewTab, onClick, onDoubleClick }: NavItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleOpenInNewTab = useCallback(() => {
    onOpenInNewTab?.(to);
    setShowMenu(false);
  }, [onOpenInNewTab, to]);

  // For panel items, use button instead of Link
  if (isPanelItem) {
    return (
      <div className="relative group">
        <button
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          className={cn(
            'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors',
            'hover:bg-sidebar-accent',
            isActive || isPanelActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/80'
          )}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span className="truncate flex-1 text-left">{label}</span>
        </button>
        {onOpenInNewTab && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent transition-opacity"
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-sidebar-foreground/60" />
          </button>
        )}
        {showMenu && (
          <div ref={menuRef} className="absolute right-0 top-full mt-1 z-50 glass rounded-md shadow-md py-1 min-w-[140px]">
            <button onClick={(e) => { e.stopPropagation(); handleOpenInNewTab(); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent">
              <ExternalLink className="w-3.5 h-3.5" />
              Open in new tab
            </button>
          </div>
        )}
      </div>
    );
  }

  // For regular items, use Link
  return (
    <div className="relative group">
      <Link
        to={to}
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors',
          'hover:bg-sidebar-accent',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/80'
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate flex-1 text-left">{label}</span>
      </Link>
      {onOpenInNewTab && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent transition-opacity"
        >
          <MoreHorizontal className="w-3.5 h-3.5 text-sidebar-foreground/60" />
        </button>
      )}
      {showMenu && (
        <div ref={menuRef} className="absolute right-0 top-full mt-1 z-50 glass rounded-md shadow-md py-1 min-w-[140px]">
          <button onClick={(e) => { e.stopPropagation(); handleOpenInNewTab(); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent">
            <ExternalLink className="w-3.5 h-3.5" />
            Open in new tab
          </button>
        </div>
      )}
    </div>
  );
}

// Navigation items config - Board/Sessions are view modes within Tasks, not separate nav items
// Demo: Some items commented out - features not implemented yet
const navItems = [
  // { icon: Search, label: 'Search', to: '/search' },  // Demo: Not implemented
  { icon: Home, label: 'Home', to: '/' },
  { icon: FolderTree, label: 'Explorer', to: '/explorer' },
  { icon: Terminal, label: 'Terminal', to: '/terminal' },
  // { icon: GitBranch, label: 'Source Control', to: '/source-control' },  // Demo: Not implemented
  { icon: Sparkles, label: 'AI Chat', to: '/chat' },
  // { icon: Inbox, label: 'Inbox', to: '/inbox' },  // Demo: Not implemented
  { icon: ListTodo, label: 'Tasks', to: '/tasks' },
  { icon: BarChart3, label: 'Dashboard', to: '/dashboard' },
  // { icon: Brain, label: 'Memory', to: '/memory' },  // Demo: Not implemented
];

export function Navigator({
  isCollapsed = false,
  onToggleCollapse,
  onOpenInNewTab,
  onSettingsClick,
  onNewTaskClick,
  onPanelItemClick,
  onPanelItemDoubleClick,
  activePanelRoute
}: NavigatorProps) {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;
  const { data: settings } = useSettings();
  const userName = settings?.userName || 'User';

  if (isCollapsed) {
    return (
      <div className="w-12 glass-subtle border-r border-sidebar-border/50 flex flex-col h-full">
        <div className="flex items-center justify-center py-2 border-b border-sidebar-border/50">
          <button
            onClick={onToggleCollapse}
            className="w-7 h-7 rounded-md overflow-hidden hover:opacity-90 transition-opacity"
            title="Expand sidebar"
          >
            <img src="/logo.svg" alt="NoteCode" className="w-full h-full" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 glass-subtle border-r border-sidebar-border/50 flex flex-col h-full">
      {/* Top Row: App Logo + Name + Toggle */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md overflow-hidden">
            <img src="/logo.svg" alt="NoteCode" className="w-full h-full" />
          </div>
          <span className="font-semibold text-sm text-sidebar-foreground">NoteCode</span>
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-sidebar-accent"
            title="Collapse sidebar"
          >
            <PanelLeft className="w-4 h-4 text-sidebar-foreground/70" />
          </button>
        )}
      </div>

      {/* Workspace Selector */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border/50">
        <span className="font-medium text-sm text-sidebar-foreground">{userName}'s Workspace</span>
        <div className="flex items-center gap-0.5">
          {onNewTaskClick && (
            <button
              onClick={onNewTaskClick}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-sidebar-accent text-sidebar-foreground/60"
              title="Create new task"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3H6a3 3 0 00-3 3v12a3 3 0 003 3h12a3 3 0 003-3v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M17.5 2.5a2.121 2.121 0 113 3L12 14l-4 1 1-4 8.5-8.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setWorkspaceOpen(!workspaceOpen)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-sidebar-accent"
          >
            <ChevronDown className="w-3.5 h-3.5 text-sidebar-foreground/60" />
          </button>
        </div>
      </div>


      {/* Main Navigation */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {navItems.map((item) => {
            const isPanelItem = panelItems.includes(item.to);
            return (
              <NavItem
                key={item.to}
                icon={item.icon}
                label={item.label}
                to={item.to}
                isActive={currentPath === item.to}
                isPanelActive={activePanelRoute === item.to}
                isPanelItem={isPanelItem}
                onOpenInNewTab={onOpenInNewTab}
                onClick={isPanelItem ? () => onPanelItemClick?.(item.to) : undefined}
                onDoubleClick={isPanelItem ? () => onPanelItemDoubleClick?.(item.to) : undefined}
              />
            );
          })}
          {/* Settings - opens floating panel */}
          <NavItem
            icon={Settings}
            label="Settings"
            to="/settings"
            isActive={false}
            isPanelItem={true}
            onClick={onSettingsClick}
            onOpenInNewTab={onOpenInNewTab}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
