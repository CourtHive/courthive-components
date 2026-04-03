import { lineHeights } from '../compositions/lineHeights';
import cx from 'classnames';
import type { Composition } from '../types';

/**
 * Computes connector line configuration and returns a two-call API
 * that matches the previous Stitches pattern.
 *
 * Usage:
 *   const linkResult = getLinkStyle({ composition, isDoubles, roundFactor })({ isFirstRound, link });
 *   element.className = linkResult.className;
 *   linkResult.applyStyles(element); // sets CSS custom properties for dynamic dimensions
 */
export function getLinkStyle({
  composition,
  isDoubles,
  roundFactor = 1
}: {
  composition?: Composition;
  isDoubles?: boolean;
  roundFactor?: number;
}) {
  const fontSize = parseInt(window.getComputedStyle(document.body).getPropertyValue('font-size'));

  const configuration = composition?.configuration || {};
  const connectorWidth = (configuration as any)?.connectorWidth || 16;
  const centerHeight = configuration.centerInfo ? lineHeights.centerInfo * fontSize : 0;
  const scheduleHeight = configuration.scheduleInfo ? lineHeights.scheduleInfo * fontSize : 0;
  const addressHeight = configuration.showAddress ? fontSize : 0;

  const baseHeight = (60 + addressHeight) * (isDoubles ? 1.3 : 1) + centerHeight;
  const m1Height = baseHeight * roundFactor;
  const m2Height = (baseHeight + scheduleHeight) * roundFactor;

  return (opts: { isFirstRound?: boolean; link?: string; noProgression?: boolean }) => {
    const className = cx(
      'chc-link',
      opts.isFirstRound && 'chc-link--first-round',
      opts.link === 'mr' && 'chc-link--no-link',
      opts.link === 'm1' && 'chc-link--m1',
      opts.link === 'm2' && 'chc-link--m2',
      opts.link === 'm0' && 'chc-link--m0',
      opts.link === 'noProgression' && 'chc-link--no-progression'
    );

    return {
      className,
      /** Apply dynamic connector dimensions as CSS custom properties on the element */
      applyStyles(element: HTMLElement) {
        element.style.setProperty('--chc-connector-w', `${connectorWidth}px`);
        element.style.setProperty('--chc-link-m1-h', `${m1Height}px`);
        element.style.setProperty('--chc-link-m2-h', `${m2Height}px`);
      },
      /** Legacy: return className as string for backward-compat (styles won't include dynamic dimensions) */
      toString() {
        return className;
      }
    };
  };
}
