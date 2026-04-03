import cx from 'classnames';

export function getPlacholderStyle({ variant }: { variant?: string }): string {
  return cx('chc-placeholder', variant === 'showAddress' && 'chc-placeholder--show-address');
}

export const participantStyle = (_opts?: { variant?: string }) => 'chc-participant';

export const participantNameStyle = (opts?: { variant?: string }) =>
  cx('chc-participant-name', opts?.variant && `chc-participant-name--${opts.variant}`);

export const participantTypeStyle = (opts?: { variant?: string }) =>
  cx('chc-participant-type', opts?.variant && `chc-participant-type--${opts.variant}`);

export function getParticipantContainerStyle({
  drawPosition,
  sideNumber
}: {
  drawPosition?: number | string;
  sideNumber?: number;
}): string {
  const classes = cx('chc-participant-container', sideNumber === 1 && 'chc-participant-container--side1');

  // Draw position is handled via data attribute in the CSS:
  // .chc-participant-container[data-draw-position]::before { content: attr(data-draw-position); }
  // The caller must set element.dataset.drawPosition = String(drawPosition) on the DOM element.
  // We store the drawPosition on a custom property of the returned string for the caller to read.
  if (drawPosition) {
    return `${classes} chc-has-draw-position`;
  }

  return classes;
}

// Utility: the drawPosition value to set as a data attribute
export function getDrawPositionData(drawPosition?: number | string): string | undefined {
  return drawPosition != null ? String(drawPosition) : undefined;
}
