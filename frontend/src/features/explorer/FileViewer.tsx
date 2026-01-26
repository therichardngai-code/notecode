import { useEffect, useState } from 'react';
import { fileSystemAdapter } from './file-system-adapter';
import { LoadingSpinner } from '@/shared/components/common';

interface FileViewerProps {
  filePath: string | null;
}

// Simple file viewer without Monaco to prevent memory issues
export const FileViewer: React.FC<FileViewerProps> = ({ filePath }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!filePath) {
      setContent('');
      return;
    }

    const loadFile = async () => {
      setLoading(true);
      try {
        const fileContent = await fileSystemAdapter.readFile(filePath);
        setContent(fileContent);
      } catch (error) {
        setContent(`Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [filePath]);

  if (!filePath) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a file to view
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="px-4 py-2 border-b border-border bg-muted/50 font-mono text-sm">
        {filePath}
      </div>
      <pre className="flex-1 overflow-auto p-4 text-sm font-mono bg-zinc-900 text-zinc-100">
        {content}
      </pre>
    </div>
  );
};
