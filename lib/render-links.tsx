import { ExternalLink } from 'lucide-react';
import { cn } from './utils';

/**
 * Detects URLs in text and renders them as clickable links
 * @param text - The text that may contain URLs
 * @param className - Optional className for the link styling
 * @returns React elements with clickable links
 */
export function renderTextWithLinks(text: string, className?: string) {
  if (!text) return null;

  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // Reset regex lastIndex
      urlRegex.lastIndex = 0;

      // Clean up URL (remove trailing punctuation that's likely not part of the URL)
      const cleanUrl = part.replace(/[.,;:!?)]+$/, '');
      const trailingPunctuation = part.slice(cleanUrl.length);

      return (
        <span key={index}>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn('inline-flex items-center gap-1 text-primary hover:underline', className)}
            onClick={(e) => e.stopPropagation()}
          >
            {cleanUrl.length > 50 ? cleanUrl.substring(0, 50) + '...' : cleanUrl}
            <ExternalLink className="inline h-3 w-3 flex-shrink-0" />
          </a>
          {trailingPunctuation}
        </span>
      );
    }
    return part;
  });
}

/**
 * Extracts the first URL from a text string
 * @param text - The text that may contain URLs
 * @returns The first URL found or null
 */
export function extractFirstUrl(text: string | null | undefined): string | null {
  if (!text) return null;

  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/;
  const match = text.match(urlRegex);

  if (match) {
    // Clean up URL (remove trailing punctuation)
    return match[1].replace(/[.,;:!?)]+$/, '');
  }

  return null;
}

/**
 * Checks if a string contains any URLs
 * @param text - The text to check
 * @returns boolean indicating if the text contains a URL
 */
export function hasUrl(text: string | null | undefined): boolean {
  if (!text) return false;
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/;
  return urlRegex.test(text);
}
