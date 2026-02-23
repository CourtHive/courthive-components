import { css } from '@stitches/core';

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
        backgroundColor: 'var(--chc-pill-bg-danger)'
      },
      dead_rubber: {
        backgroundColor: 'var(--chc-pill-bg-danger)'
      },
      cancelled: {
        backgroundColor: 'var(--chc-pill-bg-danger)'
      },
      incomplete: {
        backgroundColor: 'var(--chc-pill-bg-warning)'
      },
      suspended: {
        backgroundColor: 'var(--chc-pill-bg-warning)'
      },
      retired: {
        backgroundColor: 'var(--chc-pill-bg-danger)'
      },
      walkover: {
        backgroundColor: 'var(--chc-pill-bg-dark)'
      },
      double_walkover: {
        backgroundColor: 'var(--chc-pill-bg-dark)'
      },
      double_default: {
        backgroundColor: 'var(--chc-pill-bg-danger)'
      },
      abandoned: {
        backgroundColor: 'var(--chc-pill-bg-dark)'
      }
    }
  }
});
