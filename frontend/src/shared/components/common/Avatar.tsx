import * as React from 'react';
import { cn } from '@/shared/lib/utils';

interface AvatarProps {
  name: string;
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const Avatar = ({ name, src, alt, size = 'md', className }: AvatarProps) => {
  const [imageError, setImageError] = React.useState(false);
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center overflow-hidden rounded-full bg-muted',
        sizeClasses[size],
        className
      )}
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={alt || name}
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="font-medium text-muted-foreground">{initials}</span>
      )}
    </div>
  );
};
