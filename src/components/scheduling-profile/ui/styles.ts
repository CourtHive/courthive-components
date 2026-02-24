/**
 * Scheduling Profile — Stitches CSS-in-JS Styles
 *
 * Dark theme styles matching the vanilla prototype.
 * Uses @stitches/core css() for className generation.
 */

import { css } from '@stitches/core';

// ============================================================================
// Shared CSS Values
// ============================================================================

const GAP_12 = '12px';
const BORDER_SUBTLE = '1px solid var(--sp-border-subtle)';
const JUSTIFY_BETWEEN = 'space-between';
const COLOR_MUTED = 'var(--sp-muted)';
const BORDER_DEFAULT = '1px solid var(--sp-border)';
const ACCENT_FOCUS = 'var(--sp-accent-focus)';
const RADIUS_PILL = '999px';
const BG_CARD = 'var(--sp-card-bg)';
const HOVER_BORDER = 'var(--sp-border-hover)';
const COLOR_TEXT = 'var(--sp-text)';
const BORDER_LIGHT = '1px solid var(--sp-border-light)';
const BG_INPUT = 'var(--sp-input-bg)';

// ============================================================================
// Layout
// ============================================================================

export const spLayoutStyle = css({
  display: 'grid',
  gridTemplateColumns: '320px 1fr 360px',
  gridTemplateRows: 'minmax(0, 1fr)',
  gap: GAP_12,
  padding: GAP_12,
  height: '100%',
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  color: COLOR_TEXT,
  boxSizing: 'border-box',
  '& *': { boxSizing: 'border-box' },
});

export const spColumnStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: GAP_12,
  minHeight: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: 'var(--sp-scrollbar) transparent',
  '&::-webkit-scrollbar': { width: '6px' },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    background: 'var(--sp-scrollbar)',
    borderRadius: '3px',
  },
});

// ============================================================================
// Panel
// ============================================================================

export const spPanelStyle = css({
  background: 'var(--sp-panel-bg)',
  border: '1px solid var(--sp-line)',
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: 'var(--sp-panel-shadow)',
  display: 'flex',
  flexDirection: 'column',
});

export const spPanelHeaderStyle = css({
  padding: '12px 12px 10px',
  borderBottom: BORDER_SUBTLE,
  display: 'flex',
  justifyContent: JUSTIFY_BETWEEN,
  alignItems: 'baseline',
  gap: '10px',
});

export const spPanelTitleStyle = css({
  fontWeight: 700,
  fontSize: '13px',
});

export const spPanelMetaStyle = css({
  fontSize: GAP_12,
  color: COLOR_MUTED,
});

export const spPanelBodyStyle = css({
  padding: GAP_12,
});

// ============================================================================
// Date Strip
// ============================================================================

export const spDateStripStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: GAP_12,
});

export const spDateChipStyle = css({
  display: 'flex',
  justifyContent: JUSTIFY_BETWEEN,
  alignItems: 'center',
  padding: '10px',
  borderRadius: '12px',
  border: BORDER_DEFAULT,
  background: 'var(--sp-chip-bg)',
  cursor: 'pointer',
  '&:hover': { borderColor: HOVER_BORDER },
  '&.selected': {
    borderColor: ACCENT_FOCUS,
    background: 'var(--sp-selected-bg)',
  },
  '&.unavailable': {
    opacity: 0.55,
    borderStyle: 'dashed',
  },
});

// ============================================================================
// Badges & Chips
// ============================================================================

export const spBadgesStyle = css({
  display: 'flex',
  gap: '6px',
  alignItems: 'center',
});

export const spBadgeStyle = css({
  fontSize: '11px',
  padding: '3px 6px',
  borderRadius: RADIUS_PILL,
  border: BORDER_LIGHT,
  color: COLOR_MUTED,
  '&.ok': { borderColor: 'var(--sp-ok-border)', color: 'var(--sp-ok-text)' },
  '&.warn': { borderColor: 'var(--sp-warn-border)', color: 'var(--sp-warn-text)' },
  '&.err': { borderColor: 'var(--sp-err-border)', color: 'var(--sp-err-text)' },
});

export const spChipsStyle = css({
  display: 'flex',
  gap: '6px',
  flexWrap: 'wrap',
  marginTop: '8px',
});

export const spChipStyle = css({
  fontSize: '11px',
  padding: '3px 6px',
  borderRadius: RADIUS_PILL,
  border: BORDER_LIGHT,
  color: COLOR_MUTED,
  '&.seg': { borderColor: 'var(--sp-accent-border)', color: 'var(--sp-accent-text)' },
  '&.nb': { borderColor: 'var(--sp-ok-border)', color: 'var(--sp-ok-text)' },
  '&.err': { borderColor: 'var(--sp-err-border)', color: 'var(--sp-err-text)' },
  '&.warn': { borderColor: 'var(--sp-warn-border)', color: 'var(--sp-warn-text)' },
});

// ============================================================================
// Venue Board
// ============================================================================

export const spBoardStyle = css({
  padding: GAP_12,
  display: 'grid',
  gap: '10px',
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
});

export const spVenueStyle = css({
  border: BORDER_DEFAULT,
  borderRadius: '14px',
  background: BG_CARD,
  display: 'flex',
  flexDirection: 'column',
  minHeight: '480px',
});

export const spVenueHeaderStyle = css({
  padding: '10px 10px 8px',
  borderBottom: BORDER_SUBTLE,
  display: 'flex',
  justifyContent: JUSTIFY_BETWEEN,
  alignItems: 'center',
});

export const spVenueTitleStyle = css({
  fontSize: '12px',
  fontWeight: 800,
});

export const spVenueSubStyle = css({
  fontSize: '11px',
  color: COLOR_MUTED,
});

export const spDropzoneStyle = css({
  padding: '10px 10px 40px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  flex: 1,
  '&.over': {
    outline: `2px solid ${ACCENT_FOCUS}`,
    outlineOffset: '-4px',
  },
});

// ============================================================================
// Round Card
// ============================================================================

export const spCardStyle = css({
  border: BORDER_DEFAULT,
  background: BG_INPUT,
  borderRadius: '14px',
  padding: '10px',
  cursor: 'grab',
  '&:active': { cursor: 'grabbing' },
  '&.selected': { borderColor: 'var(--sp-selected-border)' },
  '&.error': { borderColor: 'var(--sp-err-border-strong)' },
  '&.warn': { borderColor: 'var(--sp-warn-border-strong)' },
});

export const spCardTitleStyle = css({
  fontSize: '12px',
  fontWeight: 800,
});

export const spCardMetaStyle = css({
  marginTop: '4px',
  fontSize: '11px',
  color: COLOR_MUTED,
});

// ============================================================================
// Issues Panel
// ============================================================================

export const spIssuesStyle = css({
  padding: GAP_12,
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
});

export const spIssueStyle = css({
  border: BORDER_DEFAULT,
  borderRadius: '12px',
  padding: '10px',
  background: BG_CARD,
  '&.error': { borderColor: 'var(--sp-err-border-light)' },
  '&.warn': { borderColor: 'var(--sp-warn-border-light)' },
  '&.info': { borderColor: 'var(--sp-accent-border-light)' },
});

export const spIssueCodeStyle = css({
  fontSize: '11px',
  color: COLOR_MUTED,
});

export const spIssueMsgStyle = css({
  fontSize: '12px',
  marginTop: '4px',
});

export const spIssueActionsStyle = css({
  display: 'flex',
  gap: '6px',
  flexWrap: 'wrap',
  marginTop: '8px',
});

export const spIssueActionBtnStyle = css({
  fontSize: '11px',
  padding: '6px 8px',
  borderRadius: '10px',
  border: BORDER_LIGHT,
  background: 'var(--sp-action-btn-bg)',
  color: COLOR_TEXT,
  cursor: 'pointer',
  '&:hover': { borderColor: HOVER_BORDER },
});

// ============================================================================
// Catalog
// ============================================================================

export const spCatalogStyle = css({
  padding: GAP_12,
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  '&.over': {
    outline: '2px dashed var(--sp-accent)',
    outlineOffset: '-4px',
  },
});

export const spCatalogToolbarStyle = css({
  display: 'flex',
  gap: '8px',
  padding: GAP_12,
  borderBottom: BORDER_SUBTLE,
});

export const spInputStyle = css({
  width: '100%',
  background: BG_INPUT,
  border: BORDER_DEFAULT,
  color: COLOR_TEXT,
  borderRadius: '12px',
  padding: '8px 10px',
  fontSize: GAP_12,
  outline: 'none',
  '&:focus': { borderColor: ACCENT_FOCUS },
});

export const spSelectStyle = css({
  maxWidth: '170px',
  background: BG_INPUT,
  border: BORDER_DEFAULT,
  color: COLOR_TEXT,
  borderRadius: '12px',
  padding: '8px 10px',
  fontSize: GAP_12,
  outline: 'none',
});

export const spGroupStyle = css({
  border: '1px solid var(--sp-border-group)',
  borderRadius: '14px',
  overflow: 'hidden',
  flexShrink: 0,
});

export const spGroupHeaderStyle = css({
  padding: '10px',
  borderBottom: BORDER_SUBTLE,
  fontSize: GAP_12,
  fontWeight: 800,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  userSelect: 'none',
  '&:hover': { background: 'var(--sp-hover-bg)' },
});

export const spGroupBodyStyle = css({
  padding: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
});

export const spCatalogItemStyle = css({
  border: BORDER_DEFAULT,
  borderRadius: '14px',
  padding: '10px',
  background: BG_CARD,
  cursor: 'grab',
  '&:hover': { borderColor: HOVER_BORDER },
  '&.dimmed': { opacity: 0.65 },
  '&.navigate': {
    cursor: 'pointer',
    borderColor: 'var(--sp-accent-border)',
    '&:hover': { borderColor: ACCENT_FOCUS, opacity: 1 },
  },
});

// ============================================================================
// Inspector
// ============================================================================

export const spInspectorStyle = css({
  padding: GAP_12,
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  minHeight: '160px',
});

export const spKvStyle = css({
  display: 'flex',
  justifyContent: JUSTIFY_BETWEEN,
  gap: '10px',
  fontSize: GAP_12,
});

export const spKvKeyStyle = css({
  color: COLOR_MUTED,
});

export const spKvValueStyle = css({
  fontWeight: 800,
});

export const spSmallStyle = css({
  fontSize: '11px',
  color: COLOR_MUTED,
  lineHeight: 1.35,
});

// ============================================================================
// Popover
// ============================================================================

export const spPopoverItemStyle = css({
  padding: '6px 12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '13px',
  '&:hover': { background: 'var(--sp-popover-hover-bg)', color: 'var(--sp-popover-hover-text)' },
});

export const spPopoverDeleteStyle = css({
  padding: '6px 12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: 'var(--sp-popover-delete)',
  fontSize: '13px',
  '&:hover': { background: 'var(--sp-popover-delete-bg)' },
});

export const spPopoverDividerStyle = css({
  borderTop: '1px solid var(--sp-popover-divider)',
  margin: '4px 0',
});

// ============================================================================
// Insertion Line (position-aware drops)
// ============================================================================

export const spInsertionLineStyle = css({
  height: '2px',
  background: 'var(--sp-accent)',
  borderRadius: '1px',
  margin: '2px 0',
  pointerEvents: 'none',
  opacity: 0.8,
});

// ============================================================================
// Group Chevron (collapsible catalog groups)
// ============================================================================

export const spGroupChevronStyle = css({
  fontSize: '10px',
  color: COLOR_MUTED,
  display: 'inline-block',
  width: '12px',
  textAlign: 'center',
});
