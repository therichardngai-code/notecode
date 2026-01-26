import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { DiffHunk } from '../../../domain/entities';

interface DiffViewerProps {
  hunks: DiffHunk[];
  filePath: string;
  mode?: 'unified' | 'split';
}

export function DiffViewer({ hunks, filePath, mode: initialMode = 'unified' }: DiffViewerProps) {
  const [mode, setMode] = useState<'unified' | 'split'>(initialMode);
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set(hunks.map((_, i) => i)));

  const toggleChunk = (index: number) => {
    setExpandedChunks(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
        <code className="text-sm font-mono text-foreground">{filePath}</code>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode('unified')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              mode === 'unified'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Unified
          </button>
          <button
            onClick={() => setMode('split')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              mode === 'split'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Split
          </button>
        </div>
      </div>

      {/* Diff content */}
      <div className="font-mono text-xs">
        {hunks.map((hunk, chunkIdx) => {
          const isExpanded = expandedChunks.has(chunkIdx);
          const lines = hunk.content.split('\n').filter(line => line.length > 0);

          return (
            <div key={chunkIdx} className="border-t border-border/50 first:border-t-0">
              {/* Chunk header */}
              <button
                onClick={() => toggleChunk(chunkIdx)}
                className="w-full flex items-center gap-2 px-3 py-1.5 bg-muted/30 text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <span>
                  @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                </span>
              </button>

              {/* Chunk lines */}
              {isExpanded && (
                <div className="bg-background">
                  {mode === 'unified' ? (
                    <UnifiedView lines={lines} oldStart={hunk.oldStart} newStart={hunk.newStart} />
                  ) : (
                    <SplitView lines={lines} oldStart={hunk.oldStart} newStart={hunk.newStart} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UnifiedView({ lines, oldStart, newStart }: { lines: string[]; oldStart: number; newStart: number }) {
  let oldLineNum = oldStart;
  let newLineNum = newStart;

  return (
    <>
      {lines.map((line, idx) => {
        const prefix = line[0];
        const content = line.slice(1);
        let lineClass = '';
        let displayOldNum = '';
        let displayNewNum = '';

        if (prefix === '+') {
          lineClass = 'bg-green-500/10';
          displayNewNum = String(newLineNum++);
        } else if (prefix === '-') {
          lineClass = 'bg-red-500/10';
          displayOldNum = String(oldLineNum++);
        } else {
          displayOldNum = String(oldLineNum++);
          displayNewNum = String(newLineNum++);
        }

        return (
          <div key={idx} className={`flex items-start gap-2 px-3 py-0.5 ${lineClass}`}>
            <span className="w-10 text-right text-muted-foreground/60 select-none shrink-0">
              {displayOldNum}
            </span>
            <span className="w-10 text-right text-muted-foreground/60 select-none shrink-0">
              {displayNewNum}
            </span>
            <span
              className={`w-4 shrink-0 ${
                prefix === '+' ? 'text-green-500' : prefix === '-' ? 'text-red-500' : 'text-muted-foreground/40'
              }`}
            >
              {prefix}
            </span>
            <span
              className={`flex-1 break-all ${
                prefix === '+' ? 'text-green-400' : prefix === '-' ? 'text-red-400' : 'text-foreground/80'
              }`}
            >
              {content}
            </span>
          </div>
        );
      })}
    </>
  );
}

function SplitView({ lines, oldStart, newStart }: { lines: string[]; oldStart: number; newStart: number }) {
  let oldLineNum = oldStart;
  let newLineNum = newStart;

  const leftLines: Array<{ num: string; content: string; type: string }> = [];
  const rightLines: Array<{ num: string; content: string; type: string }> = [];

  lines.forEach(line => {
    const prefix = line[0];
    const content = line.slice(1);

    if (prefix === '-') {
      leftLines.push({ num: String(oldLineNum++), content, type: 'delete' });
      rightLines.push({ num: '', content: '', type: 'empty' });
    } else if (prefix === '+') {
      leftLines.push({ num: '', content: '', type: 'empty' });
      rightLines.push({ num: String(newLineNum++), content, type: 'add' });
    } else {
      leftLines.push({ num: String(oldLineNum++), content, type: 'context' });
      rightLines.push({ num: String(newLineNum++), content, type: 'context' });
    }
  });

  return (
    <div className="grid grid-cols-2 divide-x divide-border/50">
      {/* Left (old) */}
      <div>
        {leftLines.map((line, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2 px-2 py-0.5 ${
              line.type === 'delete' ? 'bg-red-500/10' : ''
            }`}
          >
            <span className="w-8 text-right text-muted-foreground/60 select-none shrink-0">
              {line.num}
            </span>
            <span
              className={`flex-1 break-all ${
                line.type === 'delete' ? 'text-red-400' : 'text-foreground/80'
              }`}
            >
              {line.content}
            </span>
          </div>
        ))}
      </div>

      {/* Right (new) */}
      <div>
        {rightLines.map((line, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2 px-2 py-0.5 ${
              line.type === 'add' ? 'bg-green-500/10' : ''
            }`}
          >
            <span className="w-8 text-right text-muted-foreground/60 select-none shrink-0">
              {line.num}
            </span>
            <span
              className={`flex-1 break-all ${
                line.type === 'add' ? 'text-green-400' : 'text-foreground/80'
              }`}
            >
              {line.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
