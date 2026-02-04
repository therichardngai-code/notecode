/**
 * Monaco-based file editor component
 * Supports syntax highlighting, Ctrl+S save, and dirty state tracking
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import { Save, Loader2, ExternalLink } from 'lucide-react';
import { filesApi } from '@/adapters/api/files-api';
import { detectLanguage } from './utils/language-detection';
import { Button } from '@/shared/components/ui/button';

interface FileEditorProps {
  filePath: string;
  projectId: string;
  onOpenInEditor?: (filePath: string) => void;
}

export function FileEditor({ filePath, projectId, onOpenInEditor }: FileEditorProps) {
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<any>(null);
  const saveRef = useRef<() => void>(() => {});

  const isDirty = content !== originalContent;
  const language = detectLanguage(filePath);
  const fileName = filePath.split('/').pop() || filePath;

  // Load file content
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    filesApi
      .readFile(projectId, filePath)
      .then((data) => {
        setContent(data.content);
        setOriginalContent(data.content);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load file');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [projectId, filePath]);

  // Save file
  const handleSave = useCallback(async () => {
    if (!isDirty || isSaving) return;

    setIsSaving(true);
    try {
      await filesApi.saveFile(projectId, filePath, content);
      setOriginalContent(content);
    } catch (err: any) {
      console.error('Save failed:', err);
      setError(err.message || 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  }, [isDirty, isSaving, projectId, filePath, content]);

  // Keep saveRef updated with latest handleSave
  useEffect(() => {
    saveRef.current = handleSave;
  }, [handleSave]);

  // Editor mount handler - add Ctrl+S keybinding
  const handleEditorMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;

    // Add Ctrl+S / Cmd+S keybinding - use ref to get latest save function
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveRef.current();
    });

    editor.focus();
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header with file info and actions */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">{fileName}</span>
          {isDirty && <span className="text-orange-500 text-lg leading-none">•</span>}
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
            {filePath}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenInEditor && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenInEditor(filePath)}
              title="Open in external editor"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="ml-1.5">Save</span>
          </Button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={content}
          onChange={(value) => setContent(value || '')}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            padding: { top: 10 },
          }}
        />
      </div>
    </div>
  );
}
