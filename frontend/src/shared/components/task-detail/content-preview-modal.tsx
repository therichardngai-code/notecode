import { X, Copy } from 'lucide-react';

interface ContentPreviewModalProps {
  isOpen: boolean;
  filePath: string;
  content: string;
  onClose: () => void;
}

export function ContentPreviewModal({
  isOpen,
  filePath,
  content,
  onClose,
}: ContentPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background border border-border rounded-lg shadow-2xl w-[80vw] max-w-4xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-medium text-foreground truncate">{filePath}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => navigator.clipboard.writeText(content)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Copy">
              <Copy className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors" title="Close">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/90">{content}</pre>
        </div>
      </div>
    </div>
  );
}
