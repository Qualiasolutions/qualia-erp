/**
 * Escapes the five HTML-significant characters into their entity equivalents.
 *
 * Follows the OWASP XSS Prevention Cheat Sheet (Rule #1 — HTML Entity Encoding):
 * https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Scripting_Prevention_Cheat_Sheet.html
 *
 * **Order matters:** `&` is replaced first so that ampersands introduced by
 * later replacements (e.g. `&lt;`) are never double-escaped.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
