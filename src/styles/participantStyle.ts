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
  drawPosition: _drawPosition,
  sideNumber
}: {
  drawPosition?: number | string;
  sideNumber?: number;
}): string {
  // Draw position is rendered via the `data-draw-position` attribute selector:
  //   .chc-participant-container[data-draw-position]::before { content: attr(data-draw-position); }
  // Callers set element.dataset.drawPosition = String(drawPosition); we don't add a class for it.
  return cx('chc-participant-container', sideNumber === 1 && 'chc-participant-container--side1');
}

// Utility: the drawPosition value to set as a data attribute
export function getDrawPositionData(drawPosition?: number | string): string | undefined {
  return drawPosition != null ? String(drawPosition) : undefined;
}
