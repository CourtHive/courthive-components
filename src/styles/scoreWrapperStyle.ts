import cx from 'classnames';

export const scoreWrapperStyle = (_participantHeight?: number) => {
  return (opts?: { sideNumber?: number | string; fontSize?: string }) =>
    cx(
      'chc-score-wrapper',
      (opts?.sideNumber === 1 || String(opts?.sideNumber) === '1') && 'chc-score-wrapper--side1',
      opts?.fontSize === 'small' && 'chc-score-wrapper--small'
    );
};
