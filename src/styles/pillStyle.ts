import cx from 'classnames';

export const pillStyle = (opts?: { variant?: string }) => cx('chc-pill', opts?.variant && `chc-pill--${opts.variant}`);
