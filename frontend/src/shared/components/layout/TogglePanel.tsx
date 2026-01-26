import { ExplorerPanel, SearchPanel, SourceControlPanel, InboxPanel } from './panels';

export type PanelType = 'explorer' | 'search' | 'source-control' | 'inbox';

interface TogglePanelProps {
  activePanel: PanelType;
  onClose?: () => void;
  onFileClick?: (fileName: string, filePath: string) => void;
  onOpenFileInNewTab?: (fileName: string, filePath: string) => void;
}

export function TogglePanel({ activePanel, onClose, onFileClick, onOpenFileInNewTab }: TogglePanelProps) {
  const panels: Record<PanelType, React.ReactNode> = {
    explorer: <ExplorerPanel onClose={onClose} onFileClick={onFileClick} onOpenInNewTab={onOpenFileInNewTab} />,
    search: <SearchPanel onClose={onClose} />,
    'source-control': <SourceControlPanel onClose={onClose} />,
    inbox: <InboxPanel onClose={onClose} />,
  };

  return panels[activePanel] || null;
}
