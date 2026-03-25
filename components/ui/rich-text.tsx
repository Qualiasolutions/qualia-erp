import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

interface RichTextProps {
  children: string | null | undefined;
  className?: string;
  /** Compact mode for card previews — limits to 3 lines */
  compact?: boolean;
}

/**
 * Renders text with basic rich formatting:
 * - **bold** text
 * - Line breaks (newlines)
 * - Bullet lists (lines starting with - or •)
 * - Numbered lists (lines starting with 1. 2. etc.)
 * - Clickable URLs
 * - Headings (lines starting with # ## ###)
 */
export function RichText({ children: text, className, compact }: RichTextProps) {
  if (!text) return null;

  if (compact) {
    return (
      <p className={cn('line-clamp-3 text-sm text-muted-foreground', className)}>
        {text.replace(/\n/g, ' ')}
      </p>
    );
  }

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;
  let key = 0;

  function flushList() {
    if (!currentList) return;
    if (currentList.type === 'ul') {
      elements.push(
        <ul key={key++} className="my-1.5 space-y-0.5 pl-4">
          {currentList.items.map((item, i) => (
            <li
              key={i}
              className="list-disc text-sm leading-relaxed text-foreground/80 marker:text-muted-foreground/50"
            >
              {item}
            </li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={key++} className="my-1.5 space-y-0.5 pl-4">
          {currentList.items.map((item, i) => (
            <li
              key={i}
              className="list-decimal text-sm leading-relaxed text-foreground/80 marker:text-muted-foreground/50"
            >
              {item}
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (trimmed === '') {
      flushList();
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const hClasses =
        {
          1: 'text-base font-semibold text-foreground',
          2: 'text-sm font-semibold text-foreground',
          3: 'text-sm font-medium text-foreground/90',
        }[level] || 'text-sm font-medium text-foreground/90';
      elements.push(
        <p key={key++} className={cn(hClasses, i > 0 && 'mt-2')}>
          {renderInline(headingText)}
        </p>
      );
      continue;
    }

    // Unordered list item (- or •)
    const ulMatch = trimmed.match(/^[-•]\s+(.+)$/);
    if (ulMatch) {
      if (currentList?.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList!.items.push(renderInline(ulMatch[1]));
      continue;
    }

    // Ordered list item (1. 2. etc.)
    const olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      if (currentList?.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList!.items.push(renderInline(olMatch[1]));
      continue;
    }

    // Regular line
    flushList();
    elements.push(
      <p key={key++} className="text-sm leading-relaxed text-foreground/80">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();

  return <div className={cn('space-y-0.5', className)}>{elements}</div>;
}

/** Renders inline formatting: **bold**, *italic*, `code`, and URLs */
function renderInline(text: string): React.ReactNode {
  // Split by inline patterns: **bold**, *italic*, `code`, and URLs
  const parts: React.ReactNode[] = [];
  // Combined regex for bold, italic, code, and URLs
  const inlineRegex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|((https?:\/\/[^\s<>"{}|\\^`[\]]+))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {match[2]}
        </strong>
      );
    } else if (match[4]) {
      // *italic*
      parts.push(
        <em key={match.index} className="italic">
          {match[4]}
        </em>
      );
    } else if (match[6]) {
      // `code`
      parts.push(
        <code
          key={match.index}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground/90"
        >
          {match[6]}
        </code>
      );
    } else if (match[7]) {
      // URL
      const url = match[7].replace(/[.,;:!?)]+$/, '');
      const trailing = match[7].slice(url.length);
      parts.push(
        <span key={match.index}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {url.length > 50 ? url.substring(0, 50) + '...' : url}
            <ExternalLink className="inline h-3 w-3 flex-shrink-0" />
          </a>
          {trailing}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : parts;
}
