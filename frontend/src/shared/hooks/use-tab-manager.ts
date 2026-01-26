import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';

export interface Tab {
  id: string;
  title: string;
  icon: 'ai' | 'file';
  route?: string;
  filePath?: string;
}

// Route to tab config mapping
const routeTabConfig: Record<string, { title: string; icon: 'ai' | 'file' }> = {
  '/': { title: 'Home', icon: 'file' },
  '/search': { title: 'Search', icon: 'file' },
  '/explorer': { title: 'Explorer', icon: 'file' },
  '/source-control': { title: 'Source Control', icon: 'file' },
  '/chat': { title: 'AI Chat', icon: 'ai' },
  '/inbox': { title: 'Inbox', icon: 'file' },
  '/tasks': { title: 'Tasks', icon: 'file' },
  '/sessions': { title: 'Sessions', icon: 'file' },
  '/board': { title: 'Board', icon: 'file' },
  '/dashboard': { title: 'Dashboard', icon: 'file' },
  '/memory': { title: 'Memory', icon: 'file' },
  '/settings': { title: 'Settings', icon: 'file' },
};

export function useTabManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tabs, setTabs] = useState<Tab[]>([{ id: '1', title: 'Home', icon: 'file', route: '/' }]);
  const [activeTabId, setActiveTabId] = useState('1');

  // Sync tab title when route changes
  useEffect(() => {
    const currentPath = location.pathname;
    const activeTab = tabs.find((t) => t.id === activeTabId);

    if (activeTab && activeTab.route !== currentPath) {
      const config = routeTabConfig[currentPath];
      if (config) {
        setTabs((prev) =>
          prev.map((tab) => (tab.id === activeTabId ? { ...tab, title: config.title, icon: config.icon, route: currentPath } : tab))
        );
      }
    }
  }, [location.pathname, activeTabId, tabs]);

  const handleTabClick = useCallback(
    (tabId: string) => {
      setActiveTabId(tabId);
      const tab = tabs.find((t) => t.id === tabId);
      if (tab?.route) {
        navigate({ to: tab.route });
      }
    },
    [tabs, navigate]
  );

  const handleTabClose = useCallback(
    (tabId: string) => {
      setTabs((prevTabs) => {
        const newTabs = prevTabs.filter((t) => t.id !== tabId);
        if (newTabs.length === 0) return prevTabs;

        if (activeTabId === tabId) {
          const closedIndex = prevTabs.findIndex((t) => t.id === tabId);
          const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
          const newActiveTab = newTabs[newActiveIndex];
          setActiveTabId(newActiveTab.id);
          if (newActiveTab.route) {
            navigate({ to: newActiveTab.route });
          }
        }

        return newTabs;
      });
    },
    [activeTabId, navigate]
  );

  const handleAddTab = useCallback(
    (title?: string, route?: string) => {
      const targetRoute = route || '/';
      const config = routeTabConfig[targetRoute] || { title: title || 'New Tab', icon: 'file' as const };

      const newTab: Tab = {
        id: Date.now().toString(),
        title: title || config.title,
        icon: config.icon,
        route: targetRoute,
      };

      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
      navigate({ to: targetRoute });
    },
    [navigate]
  );

  const handleOpenInNewTab = useCallback(
    (route: string) => {
      const config = routeTabConfig[route] || { title: 'New Tab', icon: 'file' as const };

      const newTab: Tab = {
        id: Date.now().toString(),
        title: config.title,
        icon: config.icon,
        route,
      };

      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
      navigate({ to: route });
    },
    [navigate]
  );

  const updateCurrentTab = useCallback(
    (updates: Partial<Pick<Tab, 'title' | 'icon' | 'route' | 'filePath'>>) => {
      setTabs((prev) =>
        prev.map((tab) => (tab.id === activeTabId ? { ...tab, ...updates } : tab))
      );
    },
    [activeTabId]
  );

  const handleFileClick = useCallback(
    (fileName: string, filePath: string) => {
      updateCurrentTab({ title: fileName, icon: 'file', route: undefined, filePath });
    },
    [updateCurrentTab]
  );

  const handleOpenFileInNewTab = useCallback((fileName: string, filePath: string) => {
    const newTab: Tab = {
      id: Date.now().toString(),
      title: fileName,
      icon: 'file',
      filePath,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  // Open task as a new tab block (Full View feature) - uses existing /tasks/$taskId route
  const handleOpenTaskAsTab = useCallback(
    (taskId: string, taskTitle: string) => {
      const route = `/tasks/${taskId}`;
      const newTab: Tab = {
        id: Date.now().toString(),
        title: taskTitle,
        icon: 'file',
        route,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
      navigate({ to: '/tasks/$taskId', params: { taskId } });
    },
    [navigate]
  );

  return {
    tabs,
    activeTabId,
    routeTabConfig,
    handleTabClick,
    handleTabClose,
    handleAddTab,
    handleOpenInNewTab,
    handleFileClick,
    handleOpenFileInNewTab,
    handleOpenTaskAsTab,
    updateCurrentTab,
    setTabs,
    setActiveTabId,
  };
}
