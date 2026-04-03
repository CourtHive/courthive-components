/**
 * JSON Editor — Fallback viewer/editor for policy types without custom editors.
 */

import type { PolicyEditorInstance } from '../types';
import { pcJsonEditorStyle, pcJsonErrorStyle } from './styles';

export function buildJsonEditor(config: {
  initialData: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}): PolicyEditorInstance {
  const root = document.createElement('div');
  root.className = pcJsonEditorStyle();

  const textarea = document.createElement('textarea');
  textarea.value = JSON.stringify(config.initialData, null, 2);

  const errorEl = document.createElement('div');
  errorEl.className = pcJsonErrorStyle();
  errorEl.style.display = 'none';

  let currentData = { ...config.initialData };

  textarea.addEventListener('input', () => {
    try {
      const parsed = JSON.parse(textarea.value);
      currentData = parsed;
      errorEl.style.display = 'none';
      config.onChange(parsed);
    } catch (e) {
      errorEl.style.display = 'block';
      errorEl.textContent = `Invalid JSON: ${(e as Error).message}`;
    }
  });

  root.appendChild(textarea);
  root.appendChild(errorEl);

  return {
    element: root,
    setData(data: Record<string, unknown>) {
      currentData = { ...data };
      textarea.value = JSON.stringify(data, null, 2);
      errorEl.style.display = 'none';
    },
    getData() {
      return { ...currentData };
    },
    destroy() {
      root.remove();
    }
  };
}
