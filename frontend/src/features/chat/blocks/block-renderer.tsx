import type { Block } from '../../../domain/entities';
import { TextBlockComponent } from './text-block';
import { CodeBlockComponent } from './code-block';
import { DiffBlockComponent } from './diff-block';
import { FileBlockComponent } from './file-block';
import { CommandBlockComponent } from './command-block';
import { ThinkingBlockComponent } from './thinking-block';
import { ImageBlockComponent } from './image-block';
import { ListBlockComponent } from './list-block';
import { ApprovalBlockComponent } from './approval-block';

interface BlockRendererProps {
  block: Block;
  onApprove?: (filePath: string) => void;
  onReject?: (filePath: string) => void;
  onFileClick?: (path: string) => void;
}

export function BlockRenderer({ block, onApprove, onReject, onFileClick }: BlockRendererProps) {
  switch (block.type) {
    case 'text':
      return <TextBlockComponent block={block} />;
    case 'code':
      return <CodeBlockComponent block={block} />;
    case 'diff':
      return <DiffBlockComponent block={block} onApprove={onApprove} onReject={onReject} />;
    case 'file':
      return <FileBlockComponent block={block} onFileClick={onFileClick} />;
    case 'command':
      return <CommandBlockComponent block={block} />;
    case 'thinking':
      return <ThinkingBlockComponent block={block} />;
    case 'image':
      return <ImageBlockComponent block={block} />;
    case 'list':
      return <ListBlockComponent block={block} />;
    case 'approval':
      return (
        <ApprovalBlockComponent
          block={block}
          onApprove={onApprove}
          onReject={onReject}
        />
      );
    default:
      return null;
  }
}
