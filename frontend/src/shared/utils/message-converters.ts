/**
 * Message conversion utilities for Task Detail components
 * Converts API message/diff formats to UI-friendly formats
 */

import type { Message, Diff } from '@/adapters/api/sessions-api';
import type { ChatMessage, ToolCommand, UIDiff } from '@/shared/types/task-detail-types';

/**
 * Convert API Message to ChatMessage UI format
 * Handles various content formats including nested JSON from Claude API
 */
export function messageToChat(msg: Message): ChatMessage {
  let content = '';
  const commands: ToolCommand[] = [];
  const blocks = msg.blocks as Array<{
    type: string;
    content?: string;
    text?: string;
    name?: string;
    input?: Record<string, unknown>;
    id?: string;
  }>;

  for (const block of blocks) {
    // Handle direct tool_use blocks
    if (block.type === 'tool_use' && block.name) {
      commands.push({
        cmd: block.name,
        status: 'success',
        input: block.input,
      });
      continue;
    }

    // Handle text blocks
    if (block.type === 'text') {
      const blockContent = block.content || block.text || '';

      // Try to parse JSON content (nested Claude message format)
      if (msg.role === 'assistant' && blockContent.startsWith('{')) {
        try {
          const parsed = JSON.parse(blockContent);
          // Skip API response metadata objects (have model, id, usage fields)
          if (parsed.model && parsed.id && (parsed.usage || parsed.stop_reason !== undefined)) {
            // This is raw API response metadata - extract text if present, skip metadata
            if (parsed.content && Array.isArray(parsed.content)) {
              for (const item of parsed.content) {
                if (item.type === 'text' && item.text) {
                  content += item.text;
                } else if (item.type === 'tool_use' && item.name) {
                  commands.push({
                    cmd: item.name,
                    status: 'success',
                    input: item.input as Record<string, unknown>,
                  });
                }
              }
            }
            // Don't append raw metadata JSON
          } else if (parsed.content && Array.isArray(parsed.content)) {
            for (const item of parsed.content) {
              if (item.type === 'text' && item.text) {
                content += item.text;
              } else if (item.type === 'tool_use' && item.name) {
                commands.push({
                  cmd: item.name,
                  status: 'success',
                  input: item.input as Record<string, unknown>,
                });
              }
            }
          } else {
            content += blockContent;
          }
        } catch {
          content += blockContent;
        }
      } else {
        content += blockContent;
      }
    }
  }

  if (msg.toolName && !commands.find(c => c.cmd === msg.toolName)) {
    commands.push({
      cmd: msg.toolName,
      status: 'success',
      input: msg.toolInput as Record<string, unknown>,
    });
  }

  return {
    id: msg.id,
    role: msg.role === 'system' ? 'assistant' : msg.role,
    content: content || msg.toolResult || '',
    commands: commands.length > 0 ? commands : undefined,
  };
}

/**
 * Convert API Diff to UIDiff format
 * Calculates additions/deletions and formats for display
 */
export function diffToUI(diff: Diff): UIDiff {
  const hunks = diff.hunks || [];
  let additions = 0;
  let deletions = 0;

  hunks.forEach(h =>
    (h.lines || []).forEach(l => {
      if (l.type === 'add') additions++;
      if (l.type === 'remove') deletions++;
    })
  );

  return {
    id: diff.id,
    filename: diff.filePath,
    additions,
    deletions,
    chunks: hunks.map(h => ({
      header: h.header || '',
      lines: (h.lines || []).map(l => ({
        type: l.type as 'add' | 'remove' | 'context',
        lineNum: l.lineNum,
        content: l.content,
      })),
    })),
  };
}
