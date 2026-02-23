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
const BORDER_SUBTLE = '1px solid rgba(31,41,55,0.85)';
const JUSTIFY_BETWEEN = 'space-between';
const COLOR_MUTED = 'var(--sp-muted)';
const BORDER_DEFAULT = '1px solid rgba(148,163,184,0.18)';
const ACCENT_FOCUS = 'rgba(96,165,250,0.55)';
const RADIUS_PILL = '999px';
const BG_CARD = 'rgba(15,23,42,0.55)';
const HOVER_BORDER = 'rgba(148,163,184,0.35)';
const COLOR_TEXT = 'var(--sp-text)';
const BORDER_LIGHT = '1px solid rgba(148,163,184,0.22)';
const BG_INPUT = 'rgba(2,6,23,0.45)';

// ============================================================================
// CSS Variables (injected via layout root)
// ============================================================================

export const SP_CSS_VARS = {
  '--sp-bg': '#0b0f14',
  '--sp-panel': '#111827',
  '--sp-muted': '#94a3b8',
  '--sp-text': '#e5e7eb',
  '--sp-line': '#1f2937',
  '--sp-accent': '#60a5fa',
  '--sp-ok': '#34d399',
  '--sp-warn': '#fbbf24',
  '--sp-err': '#fb7185',
} as const;

// ============================================================================
// Layout
// ============================================================================

export const spLayoutStyle = css({
  display: 'grid',
  gridTemplateColumns: '320px 1fr 360px',
  gap: GAP_12,
  padding: GAP_12,
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  color: COLOR_TEXT,
  boxSizing: 'border-box',
  '& *': { boxSizing: 'border-box' },
});

export const spColumnStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: GAP_12,
});

// ============================================================================
// Panel
// ============================================================================

export const spPanelStyle = css({
  background: 'rgba(17,24,39,0.75)',
  border: '1px solid var(--sp-line)',
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
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
  background: 'rgba(15,23,42,0.6)',
  cursor: 'pointer',
  '&:hover': { borderColor: HOVER_BORDER },
  '&.selected': {
    borderColor: ACCENT_FOCUS,
    background: 'rgba(96,165,250,0.12)',
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
  '&.ok': { borderColor: 'rgba(52,211,153,0.35)', color: 'rgba(52,211,153,0.95)' },
  '&.warn': { borderColor: 'rgba(251,191,36,0.4)', color: 'rgba(251,191,36,0.95)' },
  '&.err': { borderColor: 'rgba(251,113,133,0.45)', color: 'rgba(251,113,133,0.95)' },
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
  '&.seg': { borderColor: 'rgba(96,165,250,0.35)', color: 'rgba(96,165,250,0.95)' },
  '&.nb': { borderColor: 'rgba(52,211,153,0.28)', color: 'rgba(52,211,153,0.95)' },
  '&.err': { borderColor: 'rgba(251,113,133,0.35)', color: 'rgba(251,113,133,0.95)' },
  '&.warn': { borderColor: 'rgba(251,191,36,0.35)', color: 'rgba(251,191,36,0.95)' },
});

// ============================================================================
// Venue Board
// ============================================================================

export const spBoardStyle = css({
  padding: GAP_12,
  display: 'grid',
  gap: '10px',
  minHeight: '520px',
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
  padding: '10px',
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
  '&.selected': { borderColor: 'rgba(96,165,250,0.6)' },
  '&.error': { borderColor: 'rgba(251,113,133,0.55)' },
  '&.warn': { borderColor: 'rgba(251,191,36,0.55)' },
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
  maxHeight: '360px',
  overflow: 'auto',
});

export const spIssueStyle = css({
  border: BORDER_DEFAULT,
  borderRadius: '12px',
  padding: '10px',
  background: BG_CARD,
  '&.error': { borderColor: 'rgba(251,113,133,0.35)' },
  '&.warn': { borderColor: 'rgba(251,191,36,0.35)' },
  '&.info': { borderColor: 'rgba(96,165,250,0.25)' },
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
  background: 'rgba(17,24,39,0.6)',
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
  maxHeight: '520px',
  overflow: 'auto',
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
  border: '1px solid rgba(148,163,184,0.14)',
  borderRadius: '14px',
  overflow: 'hidden',
});

export const spGroupHeaderStyle = css({
  padding: '10px',
  borderBottom: BORDER_SUBTLE,
  fontSize: GAP_12,
  fontWeight: 800,
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
  '&:hover': { background: '#f0f0f0', color: '#333' },
});

export const spPopoverDeleteStyle = css({
  padding: '6px 12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: '#e74c3c',
  fontSize: '13px',
  '&:hover': { background: '#fdecea' },
});

export const spPopoverDividerStyle = css({
  borderTop: '1px solid #e0e0e0',
  margin: '4px 0',
});
