import type { CommandBlock } from '../../../domain/entities';

interface CommandBlockProps {
  block: CommandBlock;
}

export function CommandBlockComponent({ block }: CommandBlockProps) {
  const hasOutput = block.output !== undefined;
  const exitCode = block.exitCode ?? 0;
  const isSuccess = exitCode === 0;

  return (
    <div className="command-block my-2 border border-border rounded overflow-hidden">
      <div className="bg-gray-900 text-white px-4 py-2 flex items-center gap-2">
        <span className="text-gray-400">$</span>
        <code className="font-mono text-sm">{block.command}</code>
      </div>
      {hasOutput && (
        <div className={`px-4 py-2 font-mono text-sm ${isSuccess ? 'bg-muted' : 'bg-red-50 dark:bg-red-900/20'}`}>
          <pre className="whitespace-pre-wrap text-foreground">
            {block.output}
          </pre>
          {block.exitCode !== undefined && !isSuccess && (
            <div className="mt-2 text-red-600 dark:text-red-400 text-xs">
              Exit code: {block.exitCode}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
