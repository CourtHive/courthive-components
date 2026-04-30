/**
 * Types for the print-composition editor.
 *
 * The editor produces a config that mirrors pdf-factory's `CompositionConfig`
 * shape but is defined locally to avoid a hard runtime dep on pdf-factory.
 * Callers (admin-client) bridge this object to pdf-factory at print time.
 *
 * See `Mentat/planning/PRINT_COMPOSITION_POLICY_PLAN.md` for the
 * end-to-end architecture.
 */

export type PrintType = 'draw' | 'schedule' | 'playerList' | 'courtCard' | 'signInSheet' | 'matchCard';

export type HeaderLayout = 'grand-slam' | 'itf' | 'minimal' | 'none';

export type FooterLayout = 'standard' | 'seedings' | 'officials' | 'none';

export type PageSize = 'a4' | 'letter';
export type PageOrientation = 'portrait' | 'landscape' | 'auto';

export interface PageBlock {
  pageSize?: PageSize;
  orientation?: PageOrientation;
  margins?: { top: number; right: number; bottom: number; left: number };
}

export interface HeaderBlock {
  layout?: HeaderLayout;
  tournamentName?: string;
  subtitle?: string;
}

export interface FooterBlock {
  layout?: FooterLayout;
  showTimestamp?: boolean;
  showPageNumbers?: boolean;
}

export interface DrawContent {
  includeSeedings?: boolean;
  includeScores?: boolean;
  showByes?: boolean;
  showDrawPositions?: boolean;
}

export interface ScheduleContent {
  cellStyle?: 'detailed' | 'compact';
  showMatchNumbers?: boolean;
  alertBanner?: string;
}

export interface ContentBlock {
  draw?: DrawContent;
  schedule?: ScheduleContent;
  // playerList / courtCard / signInSheet / matchCard — extend as needed
}

export interface PrintCompositionConfig {
  name?: string;
  page?: PageBlock;
  header?: HeaderBlock;
  footer?: FooterBlock;
  content?: ContentBlock;
}

export interface PrintCompositionEditorConfig {
  /** The print type whose composition is being edited. Determines which content fields render. */
  printType: PrintType;
  /** Initial config to seed the form. Defaults applied for missing fields. */
  config?: PrintCompositionConfig;
  /** When true, all fields are disabled. */
  readOnly?: boolean;
  /** Fired when the user clicks Save. */
  onSave?: (config: PrintCompositionConfig) => void;
  /** Fired on every field change with the current config. */
  onChange?: (config: PrintCompositionConfig) => void;
}

export interface PrintCompositionEditorHandle {
  /** Remove the editor from the DOM and detach listeners. */
  destroy: () => void;
  /** Get the current config (deep clone). */
  getConfig: () => PrintCompositionConfig;
  /** Replace the config and re-render. */
  setConfig: (config: PrintCompositionConfig) => void;
}
