import { createFileRoute } from '@tanstack/react-router';
import { FileTree, FileViewer } from '@/features/explorer';
import { useState } from 'react';

export const Route = createFileRoute('/explorer')({
  component: ExplorerPage,
});

function ExplorerPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <div className="h-full flex">
      {/* File Tree Sidebar */}
      <div className="w-64 border-r border-border bg-muted/30 flex flex-col">
        <div className="p-3 border-b border-border">
          <h2 className="font-semibold text-sm">Explorer</h2>
        </div>
        <div className="flex-1 overflow-auto">
          <FileTree onFileSelect={(path) => setSelectedFile(path)} />
        </div>
      </div>

      {/* File Viewer */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <FileViewer filePath={selectedFile} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg">No file selected</p>
              <p className="text-sm mt-1">Select a file from the explorer to view its contents</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
