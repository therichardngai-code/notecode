import { useEffect, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { fileSystemAdapter } from './file-system-adapter';
import { LoadingSpinner } from '@/shared/components/common';
import { detectLanguage, getLanguageDisplayName, isBinaryFile } from './utils/language-detector';

interface FileViewerProps {
  filePath: string | null;
}

// Maximum lines to syntax highlight (fallback to plain text for larger files)
const MAX_HIGHLIGHTED_LINES = 10000;

/**
 * FileViewer component displays file contents with syntax highlighting
 *
 * Features:
 * - Syntax highlighting for 180+ languages via Prism
 * - Line numbers
 * - Language detection from file extension
 * - Performance optimization for large files
 * - Binary file detection
 *
 * @param filePath - Path to file being viewed
 */
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

  // Check if binary file
  if (isBinaryFile(filePath)) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-lg">📦 Binary file</p>
          <p className="text-sm mt-1">Cannot display binary content</p>
          <p className="text-xs mt-2 font-mono">{filePath}</p>
        </div>
      </div>
    );
  }

  // Check if empty file
  if (!content || content.trim().length === 0) {
    return (
      <div className="h-full w-full flex flex-col">
        <div className="px-4 py-2 border-b border-border bg-muted/50 font-mono text-sm">
          {filePath}
        </div>
        <div className="flex items-center justify-center flex-1 text-muted-foreground">
          <p className="text-sm">Empty file</p>
        </div>
      </div>
    );
  }

  // Detect language
  const language = detectLanguage(filePath);
  const displayLanguage = getLanguageDisplayName(language);
  const lines = content.split('\n');
  const isLargeFile = lines.length > MAX_HIGHLIGHTED_LINES;

  // For large files, fall back to plain text
  if (isLargeFile) {
    return (
      <div className="h-full w-full flex flex-col">
        <div className="p-3 bg-yellow-500/10 border-b border-yellow-500/20">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            ⚠️ Large file ({lines.length.toLocaleString()} lines). Syntax highlighting disabled for performance.
          </p>
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
          <span className="font-mono text-sm text-foreground/80 truncate flex-1">
            {filePath}
          </span>
          <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded bg-muted-foreground/10 text-muted-foreground">
            {displayLanguage}
          </span>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-sm font-mono bg-zinc-900 text-zinc-100">
          {content}
        </pre>
      </div>
    );
  }

  // Render with syntax highlighting
  return (
    <div className="h-full w-full flex flex-col">
      {/* Header with file path and language badge */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
        <span className="font-mono text-sm text-foreground/80 truncate flex-1">
          {filePath}
        </span>
        <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded bg-primary/10 text-primary">
          {displayLanguage}
        </span>
      </div>

      {/* Syntax highlighted content */}
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          showLineNumbers={true}
          wrapLines={true}
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '0.875rem',
            background: 'rgb(24, 24, 27)', // matches bg-zinc-900
            height: '100%',
          }}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: 'rgb(161, 161, 170)', // matches text-zinc-400
            userSelect: 'none',
          }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};
