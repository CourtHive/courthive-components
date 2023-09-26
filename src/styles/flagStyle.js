import { css } from '@stitches/core';

export const flagStyle = css({
  WebkitBoxSizing: 'border-box',
  marginInlineEnd: '.3em',
  display: 'inline-block',
  boxSizing: 'border-box',
  position: 'relative',
  borderRadius: 2,
  variants: {
    variant: {
      doubles: {
        width: '.75rem'
      },
      singles: {
        width: '1rem'
      }
    }
  }
});
