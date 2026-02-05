/**
 * TerminalView Component
 * Renders a single terminal instance with xterm.js
 */

import { useEffect } from 'react';
import { useTerminal } from '../hooks/use-terminal';
import '@xterm/xterm/css/xterm.css';

interface TerminalViewProps {
  terminalId: string;
  shell?: string;
  onSelect?: () => void;
  isActive?: boolean;
}

export function TerminalView({ terminalId, shell, onSelect, isActive }: TerminalViewProps) {
  const { terminalRef, connected, resize } = useTerminal(terminalId);

  // Refit terminal when it becomes active (fixes cursor misalignment on tab switch)
  useEffect(() => {
    if (isActive) {
      // Small delay to ensure container is fully visible
      const timer = setTimeout(() => resize(), 50);
      return () => clearTimeout(timer);
    }
  }, [isActive, resize]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] overflow-hidden">
      {/* Enhanced status bar - clickable to select */}
      <div
        onClick={onSelect}
        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all duration-200 ${
          isActive
            ? 'bg-blue-900/30 border-b border-blue-500/40'
            : 'bg-zinc-900/90 border-b border-zinc-800/50 hover:bg-zinc-800/70'
        }`}
      >
        {/* Connection status dot */}
        <span className={`w-1.5 h-1.5 rounded-full transition-colors ${
          connected ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-zinc-600'
        }`} />
        {/* Shell name */}
        {shell && (
          <span className="text-xs font-medium text-zinc-300">{shell}</span>
        )}
        {/* Separator */}
        <span className="text-zinc-700">│</span>
        {/* Connection text */}
        <span className={`text-xs ${connected ? 'text-zinc-400' : 'text-zinc-600'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      {/* Terminal container */}
      <div ref={terminalRef} className="flex-1 min-h-0 bg-[#0a0a0a]" />
    </div>
  );
}
