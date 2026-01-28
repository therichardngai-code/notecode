/**
 * Markdown Message Component
 * Renders markdown content with syntax highlighting and proper styling
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/shared/lib/utils';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Code blocks
        code({ className, children, ...props }) {
          const isInline = !className;
          return isInline ? (
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
              {children}
            </code>
          ) : (
            <code className={cn('block bg-muted/50 p-3 rounded-lg text-xs font-mono overflow-x-auto', className)} {...props}>
              {children}
            </code>
          );
        },
        // Pre blocks (code block wrapper)
        pre({ children }) {
          return <pre className="bg-muted/50 rounded-lg overflow-hidden my-2">{children}</pre>;
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
        // Horizontal rule
        hr() {
          return <hr className="border-border my-3" />;
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
        {content}
      </ReactMarkdown>
    </div>
  );
}
