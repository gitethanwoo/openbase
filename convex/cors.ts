/**
 * CORS validation utilities for Convex HTTP actions.
 *
 * Validates request origins against an organization's allowedDomains list.
 * Supports wildcard subdomains (e.g., *.example.com matches foo.example.com).
 */

/**
 * Extract the hostname from an origin URL.
 * Returns null if the origin is invalid.
 */
export function getHostnameFromOrigin(origin: string): string | null {
  try {
    const url = new URL(origin);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Normalize a domain pattern for comparison.
 * Removes protocol, trailing slashes, and converts to lowercase.
 */
export function normalizeDomain(domain: string): string {
  // Remove protocol if present
  let normalized = domain.toLowerCase().trim();
  if (normalized.startsWith("http://")) {
    normalized = normalized.slice(7);
  } else if (normalized.startsWith("https://")) {
    normalized = normalized.slice(8);
  }
  // Remove trailing slash
  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  // Remove port if present (for comparison purposes)
  const colonIndex = normalized.indexOf(":");
  if (colonIndex !== -1) {
    normalized = normalized.slice(0, colonIndex);
  }
  return normalized;
}

/**
 * Check if an origin hostname matches an allowed domain pattern.
 * Supports wildcard subdomains (e.g., *.example.com).
 *
 * @param hostname - The hostname from the request origin (e.g., "app.example.com")
 * @param pattern - The allowed domain pattern (e.g., "*.example.com" or "example.com")
 * @returns true if the hostname matches the pattern
 */
export function matchesDomainPattern(
  hostname: string,
  pattern: string
): boolean {
  const normalizedHostname = hostname.toLowerCase();
  const normalizedPattern = normalizeDomain(pattern);

  // Handle wildcard subdomain patterns (e.g., *.example.com)
  if (normalizedPattern.startsWith("*.")) {
    const baseDomain = normalizedPattern.slice(2);
    // Must match exactly the base domain or be a subdomain
    // e.g., *.example.com matches app.example.com, sub.app.example.com
    // but also matches example.com itself
    return (
      normalizedHostname === baseDomain ||
      normalizedHostname.endsWith("." + baseDomain)
    );
  }

  // Exact match
  return normalizedHostname === normalizedPattern;
}

/**
 * Validate if an origin is allowed based on the organization's allowedDomains list.
 *
 * @param origin - The Origin header from the request
 * @param allowedDomains - Array of allowed domain patterns from the organization
 * @returns Object with validation result and the origin to use for CORS headers
 */
export function validateOrigin(
  origin: string | null,
  allowedDomains: string[]
): { allowed: boolean; corsOrigin: string } {
  // If no allowedDomains are configured, allow all origins (open access)
  if (allowedDomains.length === 0) {
    return { allowed: true, corsOrigin: origin || "*" };
  }

  // If no origin header, this might be a same-origin request or non-browser client
  // For security, we reject requests without an origin when domains are restricted
  if (!origin) {
    return { allowed: false, corsOrigin: "*" };
  }

  const hostname = getHostnameFromOrigin(origin);
  if (!hostname) {
    return { allowed: false, corsOrigin: "*" };
  }

  // Check if the hostname matches any allowed domain pattern
  for (const pattern of allowedDomains) {
    if (matchesDomainPattern(hostname, pattern)) {
      return { allowed: true, corsOrigin: origin };
    }
  }

  // No match found
  return { allowed: false, corsOrigin: "*" };
}

/**
 * Create a 403 Forbidden response for unauthorized origins.
 */
export function createForbiddenResponse(origin: string | null): Response {
  return new Response(
    JSON.stringify({
      error: "Forbidden",
      message: "Origin not allowed",
    }),
    {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        // Include basic CORS headers so the error message can be read
        "Access-Control-Allow-Origin": origin || "*",
      },
    }
  );
}
