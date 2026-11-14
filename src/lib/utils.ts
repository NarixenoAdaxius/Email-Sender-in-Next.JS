import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names with Tailwind's class merging
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the base URL of the application
 * Used for email templates to generate absolute URLs
 */
export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // In browser, use the current origin
    return window.location.origin;
  }
  
  // In server-side code, use environment variable or fallback to localhost
  return process.env.NEXT_PUBLIC_APP_URL || 
         process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` || 
         'http://localhost:3000';
}

/**
 * Verify binary image signatures against claimed MIME types (JPEG, PNG, GIF, WebP).
 */
export function hasValidImageMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
  if (bytes.length < 12) return false;

  switch (mimeType.toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'image/png':
      return (
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
      );
    case 'image/gif':
      return (
        bytes[0] === 0x47 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x38 &&
        (bytes[4] === 0x37 || bytes[4] === 0x39) &&
        bytes[5] === 0x61
      );
    case 'image/webp':
      return (
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      );
    default:
      return false;
  }
}

/**
 * Rewrite root-relative `/api/images/...` asset URLs to absolute URLs so external
 * email clients (and sandboxed previews) load hosted images reliably.
 */
export function absolutizeEmailUrls(html: string, baseUrl: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  if (!html || !cleanBase) return html;

  return html
    .replace(
      /(src\s*=\s*["'])\/api\/images\/([^"']+)(["'])/gi,
      (_match, prefix: string, path: string, suffix: string) =>
        `${prefix}${cleanBase}/api/images/${path}${suffix}`
    )
    .replace(
      /(url\(\s*["']?)\/api\/images\/([^"')]+)(["']?\s*\))/gi,
      (_match, prefix: string, path: string, suffix: string) =>
        `${prefix}${cleanBase}/api/images/${path}${suffix}`
    );
}
