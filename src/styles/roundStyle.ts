import { css } from '@stitches/core';

export const roundStyle = css({
  justifyContent: 'space-around',
  marginInlineStart: '16px',
  marginInlineEnd: '16px',
  flexDirection: 'column',
  height: '100%',
  display: 'flex',
  // width: '370px',
  variants: {
    variant: {
      adHoc: {
        justifyContent: 'flex-start'
      }
    }
  }
});
