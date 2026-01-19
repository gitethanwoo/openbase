import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// Token Counting
// ============================================================================

/**
 * Approximate token count for text.
 * Uses the common heuristic of ~4 characters per token for English text.
 * For more accurate counting, consider using tiktoken.
 */
export function countTokens(text: string): number {
  // GPT tokenizers average ~4 chars per token for English
  // This is a reasonable approximation for most use cases
  return Math.ceil(text.length / 4);
}

// ============================================================================
// Text Chunking
// ============================================================================

export interface ChunkOptions {
  targetTokens?: number;
  overlapTokens?: number;
}

export interface TextChunk {
  text: string;
  startIndex: number;
  endIndex: number;
  tokenCount: number;
}

/**
 * Split text into chunks with overlap for embedding.
 * Default: 500 tokens target, 100 token overlap.
 * Attempts to split on sentence boundaries when possible.
 */
export function chunkText(
  text: string,
  options: ChunkOptions = {}
): TextChunk[] {
  const { targetTokens = 500, overlapTokens = 100 } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const targetChars = targetTokens * 4;
  const overlapChars = overlapTokens * 4;

  const chunks: TextChunk[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + targetChars, text.length);

    // If not at the end, try to find a sentence boundary
    if (endIndex < text.length) {
      const searchStart = Math.max(startIndex, endIndex - 200);
      const searchText = text.slice(searchStart, endIndex);

      // Look for sentence endings (. ! ? followed by space or end)
      const sentenceEndRegex = /[.!?](?:\s|$)/g;
      let lastMatch: RegExpExecArray | null = null;
      let match: RegExpExecArray | null;

      while ((match = sentenceEndRegex.exec(searchText)) !== null) {
        lastMatch = match;
      }

      if (lastMatch) {
        endIndex = searchStart + lastMatch.index + 1;
      }
    }

    const chunkText = text.slice(startIndex, endIndex).trim();

    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        startIndex,
        endIndex,
        tokenCount: countTokens(chunkText),
      });
    }

    // Move start position, accounting for overlap
    const nextStart = endIndex - overlapChars;
    startIndex = nextStart <= startIndex ? endIndex : nextStart;
  }

  return chunks;
}

// ============================================================================
// Slug Generation
// ============================================================================

/**
 * Generate a URL-friendly slug from text.
 * Converts to lowercase, replaces spaces/special chars with hyphens,
 * removes consecutive hyphens, and trims hyphens from ends.
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/-+/g, "-") // Remove consecutive hyphens
    .replace(/^-+|-+$/g, ""); // Trim hyphens from start and end
}

// ============================================================================
// UUID Generation
// ============================================================================

/**
 * Generate a UUID v4.
 * Uses crypto.randomUUID() when available, falls back to manual generation.
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Format a date as ISO string (YYYY-MM-DD).
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format a date as a human-readable string.
 * Example: "January 19, 2026"
 */
export function formatDateLong(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a date as a short string.
 * Example: "Jan 19, 2026"
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date with time.
 * Example: "Jan 19, 2026, 2:30 PM"
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago").
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} ${diffWeeks === 1 ? "week" : "weeks"} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} ${diffMonths === 1 ? "month" : "months"} ago`;
  } else {
    return `${diffYears} ${diffYears === 1 ? "year" : "years"} ago`;
  }
}
