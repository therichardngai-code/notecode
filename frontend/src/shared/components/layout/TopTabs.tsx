import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Plus, FileText, Sparkles } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { NewTabPanel } from './NewTabPanel';

export interface Tab {
  id: string;
  title: string;
  icon: 'file' | 'ai';
  route?: string;
  filePath?: string;
  taskId?: string;
}

interface TopTabsProps {
  tabs: Tab[];
  activeTabId: string;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onAddTab: (title?: string, route?: string) => void;
}

export function TopTabs({ tabs, activeTabId, onTabClick, onTabClose, onAddTab }: TopTabsProps) {
  const [isNewTabPanelOpen, setIsNewTabPanelOpen] = useState(false);

  const goToPrevTab = () => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    if (currentIndex > 0) {
      onTabClick(tabs[currentIndex - 1].id);
    }
  };

  const goToNextTab = () => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    if (currentIndex < tabs.length - 1) {
      onTabClick(tabs[currentIndex + 1].id);
    }
  };

  const getTabIcon = (icon: Tab['icon']) => {
    return icon === 'ai' ? (
      <Sparkles className="w-3.5 h-3.5" />
    ) : (
      <FileText className="w-3.5 h-3.5" />
    );
  };

  const handleAddTabClick = () => {
    setIsNewTabPanelOpen(true);
  };

  const handleSelectPage = (page: { id: string; title: string; route?: string }) => {
    onAddTab(page.title, page.route);
  };

  const handleCreateNew = () => {
    onAddTab('New Tab', '/');
  };

  return (
    <div className="h-9 flex items-center glass-subtle border-b border-sidebar-border/50 relative">
      {/* Navigation Arrows */}
      <div className="flex items-center gap-0.5 px-2 border-r border-sidebar-border/50 h-full">
        <button
          type="button"
          onClick={goToPrevTab}
          className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-sidebar-accent text-sidebar-foreground/70"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={goToNextTab}
          className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-sidebar-accent text-sidebar-foreground/70"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs Container */}
      <div
        className="flex-1 flex items-center overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabClick(tab.id)}
            className={cn(
              'group flex items-center gap-1 pl-2 h-7 my-1 mx-0.5 text-sm whitespace-nowrap transition-colors rounded-lg',
              tabs.length === 1 ? 'pr-3' : 'pr-0.5',
              activeTabId === tab.id
                ? 'bg-background text-foreground'
                : 'text-sidebar-foreground/60 hover:text-sidebar-foreground/80 hover:bg-white/10'
            )}
          >
            <span
              className={cn(
                activeTabId === tab.id ? 'text-foreground/70' : 'text-sidebar-foreground/50'
              )}
            >
              {getTabIcon(tab.icon)}
            </span>
            <span className="max-w-[150px] truncate">{tab.title}</span>

            {/* Close button - only show if more than 1 tab */}
            {/* Using span with role="button" to avoid nested button HTML error */}
            {tabs.length > 1 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }
                }}
                className={cn(
                  'w-4 h-4 flex items-center justify-center rounded-sm transition-colors cursor-pointer',
                  'opacity-0 group-hover:opacity-100',
                  'hover:bg-muted'
                )}
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </button>
        ))}

        {/* Add Tab Button */}
        <button
          type="button"
          onClick={handleAddTabClick}
          className="w-7 h-7 my-1 mx-0.5 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* New Tab Panel */}
      <NewTabPanel
        isOpen={isNewTabPanelOpen}
        onClose={() => setIsNewTabPanelOpen(false)}
        onSelectPage={handleSelectPage}
        onCreateNew={handleCreateNew}
      />
    </div>
  );
}
