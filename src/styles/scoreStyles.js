import { css } from '@stitches/core';

export const tieBreakStyle = css({
  lineHeight: '0.75rem',
  fontSize: '0.625rem',
  left: '1.1rem',
  top: '.4rem'
});

export const gameScoreStyle = css({
  lineHeight: '$lineHeights$gameScore',
  justifyContent: 'center',
  width: '$score$setWidth',
  position: 'relative',
  textAlign: 'center',
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: '$1',
  display: 'flex',
  margin: 0,

  variants: {
    variant: {
      winner: {
        color: '$winner!important',
        fontWeight: 700
      },
      loser: {
        color: '$loser!important'
      }
    }
  }
});

export const gameWrapperStyle = css({
  marginInlineEnd: '$space$gameMarginInlineEnd',
  justifyContent: 'flex-end',
  alignItems: 'center',
  display: 'flex'
});
