/**
 * Markdown Message Component
 * Renders markdown content with syntax highlighting and proper styling
 *
 * Performance optimizations:
 * - Memoized component prevents re-render when props unchanged
 * - Memoized preprocessing avoids repeated regex operations
 */

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/shared/lib/utils';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

/**
 * Fix nested code fences by converting inner backtick fences to tilde fences.
 * CommonMark: bare ``` inside a ```lang block prematurely closes the outer fence.
 * Solution: Convert inner ``` to ~~~ so they don't interfere with outer fences.
 */
function fixNestedCodeFences(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inOuterFence = false;
  let inInnerFence = false;

  for (const line of lines) {
    if (!inOuterFence) {
      // Outside any fence - check for opener with language
      if (/^`{3}\w+/.test(line)) {
        inOuterFence = true;
      }
      result.push(line);
    } else if (!inInnerFence) {
      // Inside outer fence, not in inner
      if (/^`{3}\w+/.test(line)) {
        // Nested fence opener - convert to ~~~
        inInnerFence = true;
        result.push(line.replace(/^`{3}/, '~~~'));
      } else if (/^`{3}\s*$/.test(line)) {
        // Outer fence closer
        inOuterFence = false;
        result.push(line);
      } else {
        result.push(line);
      }
    } else {
      // Inside inner fence (within outer fence)
      if (/^`{3}\s*$/.test(line)) {
        // Inner fence closer - convert to ~~~
        inInnerFence = false;
        result.push('~~~');
      } else {
        result.push(line);
      }
    }
  }

  return result.join('\n');
}

export const MarkdownMessage = memo(function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  // Pre-process to fix nested code fence issues (memoized to avoid repeated regex operations)
  const processedContent = useMemo(() => fixNestedCodeFences(content), [content]);

  return (
    <div className={cn('max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Code - both inline and block use same gray background for consistency
        // Detection: block code has language className OR multiline content
        code({ className: langClass, children, ...props }) {
          const text = String(children).replace(/\n$/, '');
          const isBlock = !!langClass || text.includes('\n');
          return isBlock ? (
            <code className={cn('block p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap', langClass)} {...props}>
              {children}
            </code>
          ) : (
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
              {children}
            </code>
          );
        },
        pre({ children }) {
          return <pre className="bg-muted rounded-lg overflow-hidden my-2">{children}</pre>;
        },
        // Paragraphs
        p({ children }) {
          return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
        },
        // Headers
        h1({ children }) {
          return <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h3>;
        },
        // Lists
        ul({ children }) {
          return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
        },
        li({ children }) {
          return <li className="leading-relaxed">{children}</li>;
        },
        // Links
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {children}
            </a>
          );
        },
        // Blockquotes
        blockquote({ children }) {
          return <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic my-2">{children}</blockquote>;
        },
        // Tables
        table({ children }) {
          return <table className="border-collapse w-full my-2 text-xs">{children}</table>;
        },
        th({ children }) {
          return <th className="border border-border bg-muted px-2 py-1 text-left font-medium">{children}</th>;
        },
        td({ children }) {
          return <td className="border border-border px-2 py-1">{children}</td>;
        },
        // Horizontal rule - visible line separator
        hr() {
          return <hr className="border-t border-border my-4" />;
        },
        // Task list checkbox inputs (GFM)
        input({ type, checked, ...props }) {
          if (type === 'checkbox') {
            return (
              <input
                type="checkbox"
                checked={checked}
                disabled
                className="mr-2 h-4 w-4 rounded border-gray-300 text-primary accent-primary"
                {...props}
              />
            );
          }
          return <input type={type} {...props} />;
        },
        // Strong/Bold
        strong({ children }) {
          return <strong className="font-semibold">{children}</strong>;
        },
        // Emphasis/Italic
        em({ children }) {
          return <em className="italic">{children}</em>;
        },
      }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});
