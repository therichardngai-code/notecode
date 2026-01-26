import type { TextBlock } from '../../../domain/entities';

interface TextBlockProps {
  block: TextBlock;
}

export function TextBlockComponent({ block }: TextBlockProps) {
  return (
    <div className="text-block">
      <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
        {block.content}
      </p>
    </div>
  );
}
