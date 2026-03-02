import cx from 'classnames';

export const tieBreakStyle = () => 'chc-tiebreak';

export const gameScoreStyle = (opts?: { variant?: string }) =>
  cx('chc-game-score', opts?.variant && `chc-game-score--${opts.variant}`);

export const gameWrapperStyle = () => 'chc-game-wrapper';

export const pointScoreStyle = (opts?: { inverted?: boolean; position?: 'leading' | 'trailing' }) =>
  cx(
    'chc-point-score',
    opts?.inverted && 'chc-point-score--inverted',
    opts?.position === 'leading' && 'chc-point-score--leading',
    opts?.position === 'trailing' && 'chc-point-score--trailing'
  );
