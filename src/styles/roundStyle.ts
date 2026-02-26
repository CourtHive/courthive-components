import cx from 'classnames';

export const roundStyle = (opts?: { variant?: string }) =>
  cx('chc-round', opts?.variant === 'adHoc' && 'chc-round--adhoc');
