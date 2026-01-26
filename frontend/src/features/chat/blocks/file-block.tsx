import type { FileBlock } from '../../../domain/entities';

interface FileBlockProps {
  block: FileBlock;
  onFileClick?: (path: string) => void;
}

export function FileBlockComponent({ block, onFileClick }: FileBlockProps) {
  const actionLabels = {
    read: 'Read',
    write: 'Write',
    edit: 'Edit',
  };

  const actionColors = {
    read: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    write: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    edit: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  };

  return (
    <div className="file-block my-2 border border-gray-300 dark:border-gray-700 rounded p-3">
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 text-xs font-semibold rounded ${actionColors[block.action]}`}>
          {actionLabels[block.action]}
        </span>
        <button
          onClick={() => onFileClick?.(block.path)}
          className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {block.path}
        </button>
      </div>
      {block.preview && (
        <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
          {block.preview}
        </pre>
      )}
    </div>
  );
}
