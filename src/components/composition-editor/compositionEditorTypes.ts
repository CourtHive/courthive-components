import type { Composition, Configuration } from '../../types';

/** JSON-serializable snapshot of a composition (no functions/DOM refs) */
export interface SavedComposition {
  compositionName: string;
  theme: string;
  configuration: Configuration;
  version?: number;
}

export interface CompositionEditorConfig {
  /** Initial composition to edit */
  composition?: Composition;
  /** Name for display/save */
  compositionName?: string;
  /** View-only mode */
  readOnly?: boolean;
  /** Called when user saves */
  onSave?: (result: SavedComposition) => void;
  /** Called on every change (live preview) */
  onChange?: (composition: Composition) => void;
  /** Restrict available theme choices */
  availableThemes?: string[];
}

export type SectionId = 'theme' | 'display' | 'score' | 'participant' | 'placeholder' | 'scale' | 'layout';

export interface CompositionEditorState {
  compositionName: string;
  theme: string;
  configuration: Configuration;
  expandedSections: Set<SectionId>;
  isDirty: boolean;
  readOnly: boolean;
}

export type CompositionEditorListener = (state: CompositionEditorState) => void;

/** Standard panel interface */
export interface EditorPanel {
  element: HTMLElement;
  update(state: CompositionEditorState): void;
}
