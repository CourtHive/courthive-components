import { css } from '@stitches/core';

export const groupSeparatorStyle = css({
  borderTop: 'solid 1px black',
  marginRight: '-1em',
  marginLeft: '-1em',
  paddingTop: '.5em',
  marginTop: '.2em',
  variants: {
    variant: {
      0: {
        marginTop: '1em',
        borderTop: 'none',
        paddingTop: '0px'
      }
    },
    roundOrder: {
      first: {
        marginLeft: '0em'
      },
      last: {
        marginRight: '0em'
      }
    }
  }
});
