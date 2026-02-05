import type { DiffBlock } from '../../../domain/entities';

interface DiffBlockProps {
  block: DiffBlock;
  onApprove?: (filePath: string) => void;
  onReject?: (filePath: string) => void;
}

export function DiffBlockComponent({ block, onApprove, onReject }: DiffBlockProps) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const statusLabels = {
    pending: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  return (
    <div className="diff-block my-2 border border-border rounded overflow-hidden">
      <div className="bg-muted px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            Diff:
          </span>
          <code className="font-mono text-sm text-blue-600 dark:text-blue-400">
            {block.filePath}
          </code>
        </div>
        <span className={`px-2 py-1 text-xs font-semibold rounded ${statusColors[block.status]}`}>
          {statusLabels[block.status]}
        </span>
      </div>

      <div className="bg-gray-900 text-white font-mono text-sm overflow-x-auto">
        {block.hunks.map((hunk, idx) => (
          <div key={idx} className="border-t border-gray-700 first:border-t-0">
            <div className="bg-gray-800 px-4 py-1 text-gray-400 text-xs">
              @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
            </div>
            <pre className="px-4 py-2">
              {hunk.content.split('\n').map((line, lineIdx) => {
                const prefix = line[0];
                let lineClass = 'text-gray-300';
                if (prefix === '+') lineClass = 'bg-green-900/30 text-green-200';
                if (prefix === '-') lineClass = 'bg-red-900/30 text-red-200';
                return (
                  <div key={lineIdx} className={lineClass}>
                    {line}
                  </div>
                );
              })}
            </pre>
          </div>
        ))}
      </div>

      {block.status === 'pending' && (
        <div className="bg-muted px-4 py-3 flex gap-2">
          <button
            onClick={() => onApprove?.(block.filePath)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => onReject?.(block.filePath)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
