import { css } from '@stitches/core';

const CHC_PILL_BG_DANGER = 'var(--chc-pill-bg-danger)';
const CHC_PILL_BG_DARK = 'var(--chc-pill-bg-dark)';

export const pillStyle = css({
  width: 'auto',
  display: 'inline-block',
  textTransform: 'uppercase',
  fontFamily: 'Sharp Sans, Arial, sans-serif',
  fontSize: '0.625rem',
  lineHeight: '1rem',
  marginInline: '0.25rem 0.25rem',
  paddingInline: '0.25rem 0.25rem',
  fontWeight: 700,
  borderRadius: '4px',
  color: 'var(--chc-pill-text)',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  variants: {
    variant: {
      in_progress: {
        backgroundColor: 'var(--chc-pill-bg-success)'
      },
      awaiting_result: {
        backgroundColor: 'var(--chc-pill-bg-success)'
      },
      defaulted: {
        backgroundColor: CHC_PILL_BG_DANGER
      },
      dead_rubber: {
        backgroundColor: CHC_PILL_BG_DANGER
      },
      cancelled: {
        backgroundColor: CHC_PILL_BG_DANGER
      },
      incomplete: {
        backgroundColor: 'var(--chc-pill-bg-warning)'
      },
      suspended: {
        backgroundColor: 'var(--chc-pill-bg-warning)'
      },
      retired: {
        backgroundColor: CHC_PILL_BG_DANGER
      },
      walkover: {
        backgroundColor: CHC_PILL_BG_DARK
      },
      double_walkover: {
        backgroundColor: CHC_PILL_BG_DARK
      },
      double_default: {
        backgroundColor: CHC_PILL_BG_DANGER
      },
      abandoned: {
        backgroundColor: CHC_PILL_BG_DARK
      }
    }
  }
});
