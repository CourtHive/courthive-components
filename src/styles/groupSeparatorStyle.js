import { css } from '@stitches/core';

export const groupSeparatorStyle = css({
  paddingTop: '1em',
  marginTop: '.5em',
  borderTop: 'solid 1px black',
  height: '1em',
  width: '100%',
  variants: {
    variant: {
      0: {
        marginTop: '1em',
        borderTop: 'none',
        paddingTop: '0px'
      }
    }
  }
});
