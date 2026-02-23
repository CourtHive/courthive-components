/**
 * Scheduling Profile — Stitches CSS-in-JS Styles
 *
 * Dark theme styles matching the vanilla prototype.
 * Uses @stitches/core css() for className generation.
 */

import { css } from '@stitches/core';

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
  gap: '12px',
  padding: '12px',
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  color: 'var(--sp-text)',
  boxSizing: 'border-box',
  '& *': { boxSizing: 'border-box' },
});

export const spColumnStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
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
  borderBottom: '1px solid rgba(31,41,55,0.85)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: '10px',
});

export const spPanelTitleStyle = css({
  fontWeight: 700,
  fontSize: '13px',
});

export const spPanelMetaStyle = css({
  fontSize: '12px',
  color: 'var(--sp-muted)',
});

export const spPanelBodyStyle = css({
  padding: '12px',
});

// ============================================================================
// Date Strip
// ============================================================================

export const spDateStripStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: '12px',
});

export const spDateChipStyle = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px',
  borderRadius: '12px',
  border: '1px solid rgba(148,163,184,0.18)',
  background: 'rgba(15,23,42,0.6)',
  cursor: 'pointer',
  '&:hover': { borderColor: 'rgba(148,163,184,0.35)' },
  '&.selected': {
    borderColor: 'rgba(96,165,250,0.55)',
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
  borderRadius: '999px',
  border: '1px solid rgba(148,163,184,0.22)',
  color: 'var(--sp-muted)',
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
  borderRadius: '999px',
  border: '1px solid rgba(148,163,184,0.22)',
  color: 'var(--sp-muted)',
  '&.seg': { borderColor: 'rgba(96,165,250,0.35)', color: 'rgba(96,165,250,0.95)' },
  '&.nb': { borderColor: 'rgba(52,211,153,0.28)', color: 'rgba(52,211,153,0.95)' },
  '&.err': { borderColor: 'rgba(251,113,133,0.35)', color: 'rgba(251,113,133,0.95)' },
  '&.warn': { borderColor: 'rgba(251,191,36,0.35)', color: 'rgba(251,191,36,0.95)' },
});

// ============================================================================
// Venue Board
// ============================================================================

export const spBoardStyle = css({
  padding: '12px',
  display: 'grid',
  gap: '10px',
  minHeight: '520px',
});

export const spVenueStyle = css({
  border: '1px solid rgba(148,163,184,0.18)',
  borderRadius: '14px',
  background: 'rgba(15,23,42,0.55)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: '480px',
});

export const spVenueHeaderStyle = css({
  padding: '10px 10px 8px',
  borderBottom: '1px solid rgba(31,41,55,0.85)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const spVenueTitleStyle = css({
  fontSize: '12px',
  fontWeight: 800,
});

export const spVenueSubStyle = css({
  fontSize: '11px',
  color: 'var(--sp-muted)',
});

export const spDropzoneStyle = css({
  padding: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  flex: 1,
  '&.over': {
    outline: '2px solid rgba(96,165,250,0.55)',
    outlineOffset: '-4px',
  },
});

// ============================================================================
// Round Card
// ============================================================================

export const spCardStyle = css({
  border: '1px solid rgba(148,163,184,0.18)',
  background: 'rgba(2,6,23,0.45)',
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
  color: 'var(--sp-muted)',
});

// ============================================================================
// Issues Panel
// ============================================================================

export const spIssuesStyle = css({
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  maxHeight: '360px',
  overflow: 'auto',
});

export const spIssueStyle = css({
  border: '1px solid rgba(148,163,184,0.18)',
  borderRadius: '12px',
  padding: '10px',
  background: 'rgba(15,23,42,0.55)',
  '&.error': { borderColor: 'rgba(251,113,133,0.35)' },
  '&.warn': { borderColor: 'rgba(251,191,36,0.35)' },
  '&.info': { borderColor: 'rgba(96,165,250,0.25)' },
});

export const spIssueCodeStyle = css({
  fontSize: '11px',
  color: 'var(--sp-muted)',
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
  border: '1px solid rgba(148,163,184,0.22)',
  background: 'rgba(17,24,39,0.6)',
  color: 'var(--sp-text)',
  cursor: 'pointer',
  '&:hover': { borderColor: 'rgba(148,163,184,0.35)' },
});

// ============================================================================
// Catalog
// ============================================================================

export const spCatalogStyle = css({
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  maxHeight: '520px',
  overflow: 'auto',
});

export const spCatalogToolbarStyle = css({
  display: 'flex',
  gap: '8px',
  padding: '12px',
  borderBottom: '1px solid rgba(31,41,55,0.85)',
});

export const spInputStyle = css({
  width: '100%',
  background: 'rgba(2,6,23,0.45)',
  border: '1px solid rgba(148,163,184,0.18)',
  color: 'var(--sp-text)',
  borderRadius: '12px',
  padding: '8px 10px',
  fontSize: '12px',
  outline: 'none',
  '&:focus': { borderColor: 'rgba(96,165,250,0.55)' },
});

export const spSelectStyle = css({
  maxWidth: '170px',
  background: 'rgba(2,6,23,0.45)',
  border: '1px solid rgba(148,163,184,0.18)',
  color: 'var(--sp-text)',
  borderRadius: '12px',
  padding: '8px 10px',
  fontSize: '12px',
  outline: 'none',
});

export const spGroupStyle = css({
  border: '1px solid rgba(148,163,184,0.14)',
  borderRadius: '14px',
  overflow: 'hidden',
});

export const spGroupHeaderStyle = css({
  padding: '10px',
  borderBottom: '1px solid rgba(31,41,55,0.85)',
  fontSize: '12px',
  fontWeight: 800,
});

export const spGroupBodyStyle = css({
  padding: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
});

export const spCatalogItemStyle = css({
  border: '1px solid rgba(148,163,184,0.18)',
  borderRadius: '14px',
  padding: '10px',
  background: 'rgba(15,23,42,0.55)',
  cursor: 'grab',
  '&:hover': { borderColor: 'rgba(148,163,184,0.35)' },
  '&.dimmed': { opacity: 0.65 },
});

// ============================================================================
// Inspector
// ============================================================================

export const spInspectorStyle = css({
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  minHeight: '160px',
});

export const spKvStyle = css({
  display: 'flex',
  justifyContent: 'space-between',
  gap: '10px',
  fontSize: '12px',
});

export const spKvKeyStyle = css({
  color: 'var(--sp-muted)',
});

export const spKvValueStyle = css({
  fontWeight: 800,
});

export const spSmallStyle = css({
  fontSize: '11px',
  color: 'var(--sp-muted)',
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
