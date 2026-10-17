import { escapeHtml } from '../escapeHtml';
import { describe, expect, it } from 'vitest';

describe('escapeHtml', () => {
  it('escapes every character that can open markup or close an attribute', () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe(
      '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;'
    );
  });
  it('renders nullish as empty and stringifies other values', () => {
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(0)).toBe('0');
  });
});
