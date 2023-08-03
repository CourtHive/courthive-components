import { css } from '@stitches/core';

export const flagStyle = css({
  WebkitBoxSizing: 'border-box',
  display: 'inline-block',
  boxSizing: 'border-box',
  position: 'relative',
  marginInlineStart: 1,
  marginInlineEnd: 2,
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
