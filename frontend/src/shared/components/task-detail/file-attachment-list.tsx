import { memo } from 'react';
import { FileCode, X } from 'lucide-react';

interface FileAttachmentListProps {
  attachedFiles: string[];
  onRemoveFile: (idx: number) => void;
}

/**
 * FileAttachmentList - Display attached files with remove buttons
 *
 * Shows list of attached file paths as chips.
 * Each chip displays file icon, truncated name, and remove button.
 */
export const FileAttachmentList = memo(function FileAttachmentList({
  attachedFiles,
  onRemoveFile,
}: FileAttachmentListProps) {
  if (attachedFiles.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {attachedFiles.map((file, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-xs text-foreground"
        >
          <FileCode className="w-3 h-3" />
          <span className="max-w-[150px] truncate">{file}</span>
          <button
            onClick={() => onRemoveFile(idx)}
            className="hover:text-destructive"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  );
});
