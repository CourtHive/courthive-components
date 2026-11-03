/**
 * Escapes a value for interpolation into HTML text or a quoted attribute. Record data (names,
 * notes, addresses) comes from servers, integrators and imported files, so it must never be
 * parsed as markup. Prefer `textContent` where an element holds only the value; use this where
 * the value sits inside a larger HTML template.
 */
export declare function escapeHtml(value: unknown): string;
