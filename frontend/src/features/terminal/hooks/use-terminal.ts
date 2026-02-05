/**
 * useTerminal Hook
 * Manages xterm.js instance and WebSocket connection
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { getWsUrl } from '@/shared/lib/api-config';

export function useTerminal(terminalId: string | null) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [connected, setConnected] = useState(false);

  const initTerminal = useCallback(() => {
    if (!terminalRef.current || !terminalId) return;

    // Create xterm instance
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      allowProposedApi: true, // Required for Unicode11Addon
      theme: {
        background: '#0a0a0a',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        selectionBackground: '#3a3a3a',
      },
    });

    // Add addons
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    // Unicode11 addon for proper cursor positioning with emojis/wide chars
    const unicode11Addon = new Unicode11Addon();
    term.loadAddon(unicode11Addon);
    term.unicode.activeVersion = '11';

    // Open in container
    term.open(terminalRef.current);

    // Connect WebSocket
    const ws = new WebSocket(getWsUrl(`/ws/terminal/${terminalId}`));

    ws.onopen = () => {
      setConnected(true);
      // Fit and send initial size after connection
      setTimeout(() => {
        fitAddon.fit();
        ws.send(JSON.stringify({
          type: 'resize',
          cols: term.cols,
          rows: term.rows,
        }));
      }, 100);
    };
    ws.onclose = () => setConnected(false);

    // Debounced refresh to fix cursor position after complex output (like Claude's logo)
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        term.refresh(0, term.rows - 1);
      }, 150);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'output':
            term.write(msg.data);
            // Schedule refresh after output to fix cursor positioning
            scheduleRefresh();
            break;
          case 'exit':
            term.write(`\r\n[Process exited with code ${msg.exitCode}]\r\n`);
            break;
          case 'closed':
            term.write('\r\n[Terminal closed]\r\n');
            break;
          case 'error':
            term.write(`\r\n[Error: ${msg.message}]\r\n`);
            break;
        }
      } catch {
        // Raw data fallback
        term.write(event.data);
        scheduleRefresh();
      }
    };

    // Send input to backend
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'resize',
          cols: term.cols,
          rows: term.rows,
        }));
      }
    };

    window.addEventListener('resize', handleResize);

    // ResizeObserver for container changes
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(terminalRef.current);

    // Store refs
    xtermRef.current = term;
    wsRef.current = ws;
    fitAddonRef.current = fitAddon;

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
    };
  }, [terminalId]);

  useEffect(() => {
    const cleanup = initTerminal();
    return cleanup;
  }, [initTerminal]);

  // Manual resize trigger - also syncs with backend PTY
  const resize = useCallback(() => {
    if (fitAddonRef.current && xtermRef.current) {
      fitAddonRef.current.fit();
      // Sync dimensions with backend
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'resize',
          cols: xtermRef.current.cols,
          rows: xtermRef.current.rows,
        }));
      }
      // Force refresh to fix cursor position
      xtermRef.current.refresh(0, xtermRef.current.rows - 1);
    }
  }, []);

  return { terminalRef, connected, resize };
}
