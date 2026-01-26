import { Check } from 'lucide-react';
import type { ListBlock } from '../../../domain/entities';

interface ListBlockComponentProps {
  block: ListBlock;
}

export function ListBlockComponent({ block }: ListBlockComponentProps) {
  if (block.style === 'todo') {
    return (
      <ul className="list-block space-y-1 my-2">
        {block.items.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <div
              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                item.checked
                  ? 'bg-primary border-primary'
                  : 'border-muted-foreground'
              }`}
            >
              {item.checked && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
            <span
              className={`text-sm ${
                item.checked ? 'line-through text-muted-foreground' : ''
              }`}
            >
              {item.content}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.style === 'numbered') {
    return (
      <ol className="list-block list-decimal list-inside space-y-1 my-2">
        {block.items.map((item, index) => (
          <li key={index} className="text-sm">
            {item.content}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ul className="list-block list-disc list-inside space-y-1 my-2">
      {block.items.map((item, index) => (
        <li key={index} className="text-sm">
          {item.content}
        </li>
      ))}
    </ul>
  );
}
