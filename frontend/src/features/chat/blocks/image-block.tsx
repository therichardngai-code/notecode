import type { ImageBlock } from '../../../domain/entities';

interface ImageBlockComponentProps {
  block: ImageBlock;
}

export function ImageBlockComponent({ block }: ImageBlockComponentProps) {
  return (
    <div className="image-block my-2">
      <img
        src={block.src}
        alt={block.alt || 'Image'}
        className="max-w-full h-auto rounded-md border border-border"
        loading="lazy"
      />
      {block.alt && (
        <p className="mt-1 text-xs text-muted-foreground">{block.alt}</p>
      )}
    </div>
  );
}
