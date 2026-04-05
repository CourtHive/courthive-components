import cx from 'classnames';

export const scaleStyle = (opts?: { color?: string }) => cx('chc-scale', opts?.color && `chc-scale--${opts.color}`);
