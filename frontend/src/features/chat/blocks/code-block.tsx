import type { CodeBlock } from '../../../domain/entities';

interface CodeBlockProps {
  block: CodeBlock;
}

// Simple code block without heavy syntax highlighter -
// Uses CSS for basic styling, avoiding 1.7MB bundle
export function CodeBlockComponent({ block }: CodeBlockProps) {
  return (
    <div className="code-block my-2">
      {block.filename && (
        <div className="bg-zinc-800 text-zinc-300 px-4 py-2 text-sm font-mono rounded-t border-b border-zinc-700">
          {block.filename}
        </div>
      )}
      <pre
        className={`bg-zinc-900 text-zinc-100 p-4 text-sm font-mono overflow-auto ${
          block.filename ? 'rounded-b' : 'rounded'
        }`}
      >
        <code>{block.content}</code>
      </pre>
    </div>
  );
}
