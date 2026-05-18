/**
 * Tournament Card — Skeleton variant.
 *
 * Thin wrapper around the shared {@link buildCardSkeleton} that supplies
 * tournament-card's own class names. Matches the card's outer shape so the
 * grid layout doesn't reflow on swap.
 */

import { buildCardSkeleton } from '../../helpers/cards/buildCardSkeleton';
import { mergeTournamentCardConfig } from './defaultConfig';
import {
  tcBodyStyle,
  tcFooterStyle,
  tcImageStyle,
  tcSkeletonBlockStyle,
  tcSkeletonLineStyle,
  tcSkeletonStyle
} from './styles';
import { TournamentCardConfig } from './types';

export function buildSkeletonCard(config?: Partial<TournamentCardConfig>): HTMLElement {
  const cfg = mergeTournamentCardConfig(config);
  return buildCardSkeleton({
    showImage: cfg.showImage !== false,
    bodyLines: cfg.body.length,
    showFooter: cfg.footer.length > 0,
    cardClass: tcSkeletonStyle(),
    imageClass: tcImageStyle(),
    bodyClass: tcBodyStyle(),
    footerClass: tcFooterStyle(),
    blockClass: tcSkeletonBlockStyle(),
    lineClass: tcSkeletonLineStyle()
  });
}
