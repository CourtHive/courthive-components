import { css } from '@stitches/core';

export const scaleStyle = css({
  WebkitBoxSizing: 'border-box',
  marginInlineEnd: '.5em',
  boxSizing: 'border-box',
  display: 'inline-block',
  position: 'relative',
  fontSize: 'smaller',
  fontWeight: 'bold',
  borderRadius: 2,
  // width: '1.8rem',
  color: 'blue',
  variants: {
    color: {
      green: {
        color: 'green'
      },
      red: {
        color: 'red'
      }
    }
  }
});
