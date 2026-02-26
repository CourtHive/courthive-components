import cx from 'classnames';

export const resultsItemStyle = (opts?: { variant?: string }) =>
  cx('chc-results-item', opts?.variant && `chc-results-item--${opts.variant}`);

export const resultsInfoStyle = () => 'chc-results-info';
