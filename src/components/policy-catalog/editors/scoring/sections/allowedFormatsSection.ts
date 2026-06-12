/**
 * "Allowed match-up formats" section — a tag-list of accepted formats.
 *
 * Empty list = no restriction (any format is allowed). Each chip is a
 * matchUp-format code string; the input validates incoming values via
 * matchUpFormatCode.parse so the user can't add gibberish.
 */

import { matchUpFormatCode } from 'tods-competition-factory';
import type { ScoringEditorState } from '../types';
import type { ScoringEditorStore } from '../scoringEditorStore';
import { buildTagListEditor } from './tagListEditor';

export function buildAllowedFormatsSection(store: ScoringEditorStore): {
  element: HTMLElement;
  update(state: ScoringEditorState): void;
} {
  const root = document.createElement('div');
  root.className = 'sc-section-body-inner';

  const help = document.createElement('div');
  help.className = 'sc-field-help';
  help.textContent = 'Restrict which formats events under this policy can use. Empty = no restriction.';
  root.appendChild(help);

  const tagList = buildTagListEditor({
    values: store.getData().matchUpFormats ?? [],
    placeholder: 'e.g. SET3-S:6/TB7',
    readonly: store.isReadonly(),
    validate: (value) => !!matchUpFormatCode.parse?.(value),
    invalidMessage: 'Not a recognized matchUp format',
    onAdd: (value) => store.addAllowedFormat(value),
    onRemove: (index) => store.removeAllowedFormat(index),
  });
  root.appendChild(tagList.element);

  function update(state: ScoringEditorState): void {
    tagList.setValues(state.draft.matchUpFormats ?? []);
  }

  return { element: root, update };
}
