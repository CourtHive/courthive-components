import cx from 'classnames';

export const tieBreakStyle = () => 'chc-tiebreak';

export const gameScoreStyle = (opts?: { variant?: string }) =>
  cx('chc-game-score', opts?.variant && `chc-game-score--${opts.variant}`);

export const gameWrapperStyle = () => 'chc-game-wrapper';
