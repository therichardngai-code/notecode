/**
 * Update Banner
 * Shows notification when a new version is available
 */

import { useState } from 'react';
import { useVersionCheck } from '@/shared/hooks/use-version-check';
import { X, ExternalLink, Download } from 'lucide-react';

export function UpdateBanner() {
  const { data } = useVersionCheck();
  const [dismissed, setDismissed] = useState(false);

  if (!data?.hasUpdate || dismissed) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-950/50 border-b border-blue-200 dark:border-blue-800 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-blue-800 dark:text-blue-200 text-sm">
          Update available: <strong>v{data.latest}</strong> (current: v{data.current})
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.open('https://github.com/anthropics/notecode/releases', '_blank')}
          className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          View Release
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
