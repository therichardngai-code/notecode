import { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';

export type PanelType = 'explorer' | 'search' | 'source-control' | 'inbox';

// Routes that show toggle panel (route -> panel type mapping)
export const panelRoutes: Record<string, PanelType> = {
  '/explorer': 'explorer',
  '/source-control': 'source-control',
  '/inbox': 'inbox',
};

// Reverse mapping: panel type -> route
export const panelTypeToRoute: Record<PanelType, string> = {
  explorer: '/explorer',
  search: '/search',
  'source-control': '/source-control',
  inbox: '/inbox',
};

interface UsePanelStateProps {
  routeTabConfig: Record<string, { title: string; icon: 'ai' | 'file' }>;
  activeTabId: string;
  setTabs: React.Dispatch<React.SetStateAction<{ id: string; title: string; icon: 'ai' | 'file'; route?: string; filePath?: string }[]>>;
}

export function usePanelState({ routeTabConfig, activeTabId, setTabs }: UsePanelStateProps) {
  const navigate = useNavigate();
  const [activePanelType, setActivePanelType] = useState<PanelType | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Get active panel route for Navigator highlighting
  const activePanelRoute = activePanelType ? panelTypeToRoute[activePanelType] : null;

  const handlePanelClose = useCallback(() => {
    setIsPanelOpen(false);
    setActivePanelType(null);
  }, []);

  // Handle panel item single click - toggle panel without changing tab/route
  const handlePanelItemClick = useCallback(
    (route: string) => {
      const panelType = panelRoutes[route];
      if (!panelType) return;

      // If clicking same panel that's open, close it
      if (activePanelType === panelType && isPanelOpen) {
        setIsPanelOpen(false);
        setActivePanelType(null);
      } else {
        // Open the panel
        setActivePanelType(panelType);
        setIsPanelOpen(true);
      }
    },
    [activePanelType, isPanelOpen]
  );

  // Handle panel item double click - open in current tab
  const handlePanelItemDoubleClick = useCallback(
    (route: string) => {
      const panelType = panelRoutes[route];
      const config = routeTabConfig[route];
      if (!config) return;

      // Update current tab with the new view
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId
            ? { ...tab, title: config.title, icon: config.icon, route, filePath: undefined }
            : tab
        )
      );

      // Navigate to the route
      navigate({ to: route });

      // Keep panel open for explorer
      if (panelType === 'explorer') {
        setActivePanelType(panelType);
        setIsPanelOpen(true);
      } else {
        setIsPanelOpen(false);
        setActivePanelType(null);
      }
    },
    [activeTabId, navigate, routeTabConfig, setTabs]
  );

  const showPanel = isPanelOpen && activePanelType !== null;

  return {
    activePanelType,
    isPanelOpen,
    activePanelRoute,
    showPanel,
    handlePanelClose,
    handlePanelItemClick,
    handlePanelItemDoubleClick,
    setActivePanelType,
    setIsPanelOpen,
  };
}
