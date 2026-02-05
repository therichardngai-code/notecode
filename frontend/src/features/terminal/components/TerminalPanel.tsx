/**
 * TerminalPanel Component
 * Manages multiple terminal tabs with create/close functionality
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { terminalsApi } from '@/adapters/api/terminals-api';
import { TerminalView } from './TerminalView';
import { Plus, X, Terminal, ChevronDown, Square, Columns2, Grid2X2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

type LayoutMode = 'single' | 'split-2' | 'split-4';

interface TerminalPanelProps {
  projectId: string;
}

export function TerminalPanel({ projectId }: TerminalPanelProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutMode>('single');
  
  // List terminals
  const { data, isLoading } = useQuery({
    queryKey: ['terminals', projectId],
    queryFn: () => terminalsApi.list(projectId),
    enabled: !!projectId,
  });

  // Create terminal
  const createMutation = useMutation({
    mutationFn: () => terminalsApi.create(projectId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['terminals', projectId] });
      setActiveTab(result.id);
      // Auto-switch to single if new terminal exceeds layout slots
      const maxSlots = layout === 'single' ? 999 : layout === 'split-2' ? 2 : 4;
      if (terminals.length >= maxSlots) {
        setLayout('single');
      }
    },
  });

  // Close terminal
  const closeMutation = useMutation({
    mutationFn: (id: string) => terminalsApi.close(id),
    onSuccess: (_, closedId) => {
      queryClient.invalidateQueries({ queryKey: ['terminals', projectId] });
      if (activeTab === closedId) setActiveTab(null);
    },
  });

  const terminals = data?.terminals ?? [];
  const limits = data?.limits;
  const canCreate = !limits || limits.currentProject < limits.perProject;

  // Auto-select first terminal if none selected
  if (!activeTab && terminals.length > 0) {
    setActiveTab(terminals[0].id);
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Tab bar - modern styling */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900/95 border-b border-zinc-800/50 overflow-x-auto backdrop-blur-sm">
        {terminals.map((t, idx) => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id);
              // Auto-switch to single if terminal is outside visible grid slots
              const maxSlots = layout === 'single' ? 999 : layout === 'split-2' ? 2 : 4;
              if (idx >= maxSlots) setLayout('single');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-full transition-all duration-200 ease-out ${
              activeTab === t.id
                ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30'
                : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="font-medium">{t.shell}</span>
            <X
              className="w-3 h-3 opacity-60 hover:opacity-100 hover:text-red-400 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                closeMutation.mutate(t.id);
              }}
            />
          </button>
        ))}
        {canCreate && (
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="p-1.5 rounded-full text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200 transition-all duration-200 disabled:opacity-50"
            title="New Terminal"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
        {/* Layout dropdown + count */}
        <div className="ml-auto flex items-center gap-2 border-l border-zinc-700/50 pl-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded transition-all duration-200">
                {layout === 'single' && <Square className="w-3.5 h-3.5" />}
                {layout === 'split-2' && <Columns2 className="w-3.5 h-3.5" />}
                {layout === 'split-4' && <Grid2X2 className="w-3.5 h-3.5" />}
                <span>Split</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              <DropdownMenuItem onClick={() => setLayout('single')} className="gap-2">
                <Square className="w-4 h-4" />
                <span>Single</span>
                {layout === 'single' && <span className="ml-auto text-blue-400">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLayout('split-2')} className="gap-2">
                <Columns2 className="w-4 h-4" />
                <span>2 Panels</span>
                {layout === 'split-2' && <span className="ml-auto text-blue-400">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLayout('split-4')} className="gap-2">
                <Grid2X2 className="w-4 h-4" />
                <span>4 Panels</span>
                {layout === 'split-4' && <span className="ml-auto text-blue-400">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {limits && (
            <span className="text-xs text-zinc-500 font-mono">
              {limits.currentProject}/{limits.perProject}
            </span>
          )}
        </div>
      </div>

      {/* Terminal view */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            Loading terminals...
          </div>
        ) : terminals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
            <Terminal className="w-12 h-12 text-zinc-700" />
            <p>No terminal open</p>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !canCreate}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-200 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              New Terminal
            </button>
          </div>
        ) : (
          <div className={`h-full bg-[#0a0a0a] ${
            layout === 'single' ? '' :
            layout === 'split-2' ? 'grid grid-cols-2 gap-[1px]' :
            'grid grid-cols-2 grid-rows-2 gap-[1px]'
          }`} style={{ backgroundColor: '#3f3f46' }}>
            {layout === 'single' ? (
              // Render ALL terminals, hide inactive with CSS to preserve state on tab switch
              terminals.map(t => (
                <div
                  key={t.id}
                  className={t.id === activeTab ? 'h-full' : 'hidden'}
                >
                  <TerminalView
                    terminalId={t.id}
                    shell={t.shell}
                    isActive={t.id === activeTab}
                  />
                </div>
              ))
            ) : (
              Array.from({ length: layout === 'split-2' ? 2 : 4 }).map((_, i) => (
                <div
                  key={i}
                  onClick={() => terminals[i] && setActiveTab(terminals[i].id)}
                  className={`bg-[#0a0a0a] min-h-0 overflow-hidden cursor-pointer transition-all duration-200 ${
                    terminals[i]?.id === activeTab ? 'ring-1 ring-inset ring-blue-500/40' : ''
                  }`}
                >
                  {terminals[i] ? (
                    <TerminalView
                      terminalId={terminals[i].id}
                      shell={terminals[i].shell}
                      onSelect={() => setActiveTab(terminals[i].id)}
                      isActive={terminals[i].id === activeTab}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                      <button
                        onClick={() => createMutation.mutate()}
                        disabled={createMutation.isPending || !canCreate}
                        className="p-2 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
                        title="New Terminal"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
