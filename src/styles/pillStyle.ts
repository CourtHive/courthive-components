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
  color: '#fff',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  variants: {
    variant: {
      in_progress: {
        backgroundColor: '#199f01ff'
      },
      awaiting_result: {
        backgroundColor: '#199f01ff'
      },
      defaulted: {
        backgroundColor: '#df164c'
      },
      dead_rubber: {
        backgroundColor: '#df164c'
      },
      cancelled: {
        backgroundColor: '#df164c'
      },
      incomplete: {
        backgroundColor: '#f7ae04ff'
      },
      suspended: {
        backgroundColor: '#f7ae04ff'
      },
      retired: {
        backgroundColor: '#df164c'
      },
      walkover: {
        backgroundColor: 'black'
      },
      double_walkover: {
        backgroundColor: 'black'
      },
      double_default: {
        backgroundColor: '#df164c'
      }
    }
  }
});
