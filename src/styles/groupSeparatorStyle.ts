import cx from 'classnames';

export const groupSeparatorStyle = (opts?: { variant?: number | string; roundOrder?: string }) =>
  cx(
    'chc-group-separator',
    opts?.variant === 0 && 'chc-group-separator--0',
    opts?.roundOrder === 'first' && 'chc-group-separator--round-first',
    opts?.roundOrder === 'last' && 'chc-group-separator--round-last'
  );
