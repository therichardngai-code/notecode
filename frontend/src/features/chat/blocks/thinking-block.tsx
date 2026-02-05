import { useState } from 'react';
import type { ThinkingBlock } from '../../../domain/entities';

interface ThinkingBlockProps {
  block: ThinkingBlock;
}

export function ThinkingBlockComponent({ block }: ThinkingBlockProps) {
  const [isCollapsed, setIsCollapsed] = useState(block.collapsed);

  return (
    <div className="thinking-block my-2 border border-purple-300 dark:border-purple-700 rounded overflow-hidden">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full bg-purple-50 dark:bg-purple-900/20 px-4 py-2 text-left flex items-center gap-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
      >
        <span className="text-purple-600 dark:text-purple-400">
          {isCollapsed ? '▶' : '▼'}
        </span>
        <span className="text-sm font-semibold text-purple-800 dark:text-purple-200">
          Thinking...
        </span>
      </button>
      {!isCollapsed && (
        <div className="px-4 py-3 bg-card">
          <p className="text-sm text-foreground/80 whitespace-pre-wrap italic">
            {block.content}
          </p>
        </div>
      )}
    </div>
  );
}
