import cx from 'classnames';

export function getInfoStyle({ variant }: { variant?: number | string }): string {
  return cx('chc-center-info', variant != null && `chc-center-info--${variant}`);
}

export const columnStyle = () => 'chc-column';

export const entryStyle = () => 'chc-entry';

export const statusStyle = () => 'chc-status';
