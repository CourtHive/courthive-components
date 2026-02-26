import cx from 'classnames';

export const flagStyle = (opts?: { variant?: string }) =>
  cx('chc-flag', opts?.variant && `chc-flag--${opts.variant}`);
