const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/**
 * Escapes a value for interpolation into HTML text or a quoted attribute. Record data (names,
 * notes, addresses) comes from servers, integrators and imported files, so it must never be
 * parsed as markup. Prefer `textContent` where an element holds only the value; use this where
 * the value sits inside a larger HTML template.
 */
export function escapeHtml(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[&<>"']/g, (char) => ENTITIES[char]);
}
