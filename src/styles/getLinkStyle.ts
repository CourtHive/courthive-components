import { lineHeights } from '../compositions/lineHeights';
import { css } from '@stitches/core';
import type { Composition } from '../types';

export function getLinkStyle({ 
  composition, 
  isDoubles, 
  roundFactor = 1 
}: { 
  composition?: Composition; 
  isDoubles?: boolean; 
  roundFactor?: number 
}) {
  const fontSize = parseInt(window.getComputedStyle(document.body).getPropertyValue('font-size'));

  const configuration = composition?.configuration || {};
  const connectorWidth = configuration?.connectorWidth || 16;
  const centerHeight = configuration.centerInfo ? lineHeights.centerInfo * fontSize : 0;
  const scheduleHeight = configuration.scheduleInfo ? lineHeights.scheduleInfo * fontSize : 0;
  const addressHeight = configuration.showAddress ? fontSize : 0;

  const baseHeight = (60 + addressHeight) * (isDoubles ? 1.3 : 1) + centerHeight;

  const m1Height = baseHeight * roundFactor;
  const m2Height = (baseHeight + scheduleHeight) * roundFactor;

  return css({
    '&::before': {
      borderBlockStart: '$borderWidths$matchUp solid #999',
      left: -connectorWidth,
      width: connectorWidth,
      position: 'absolute',
      borderRadius: 2,
      top: -1
    },
    '&::after': {
      width: connectorWidth,
      position: 'absolute',
      borderRadius: 2,
      left: '100%'
    },
    '&::after, &::before': {
      borderWidth: '$borderWidths$matchUp',
      borderColor: '$connector',
      display: 'block',
      content: ''
    },
    variants: {
      isFirstRound: {
        true: { '&::before': { height: 0, width: 0, borderWidth: 0 } }
      },
      link: {
        m1: {
          '&::after': {
            borderInlineEnd: '$borderWidths$matchUp solid $connector',
            borderTopStyle: 'solid',
            height: m1Height,
            top: -1
          }
        },
        m2: {
          '&::after': {
            bottom: `calc(100%)`,
            borderInlineEnd: '$borderWidths$matchUp solid $connector',
            borderBottomStyle: 'solid',
            height: m2Height
          }
        },
        m0: {
          '&::after': {
            borderTopStyle: 'solid',
            borderColor: '$connector',
            top: -1
          }
        },
        mr: {
          '&::before': { height: 0, width: 0, borderWidth: 0 },
          '&::after': { height: 0, width: 0, borderWidth: 0 }
        },
        noProgression: {
          true: { '&::after': { height: 0, width: 0, borderWidth: 0 } }
        }
      }
    }
  });
}
