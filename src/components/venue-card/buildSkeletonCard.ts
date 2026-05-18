/**
 * Venue Card — Skeleton wrapper around the shared buildCardSkeleton.
 */

import { buildCardSkeleton } from '../../helpers/cards/buildCardSkeleton';
import { mergeVenueCardConfig } from './defaultConfig';
import {
  vcBodyStyle,
  vcFooterStyle,
  vcImageStyle,
  vcSkeletonBlockStyle,
  vcSkeletonLineStyle,
  vcSkeletonStyle
} from './styles';
import { VenueCardConfig } from './types';

export function buildVenueSkeletonCard(config?: Partial<VenueCardConfig>): HTMLElement {
  const cfg = mergeVenueCardConfig(config);
  return buildCardSkeleton({
    showImage: cfg.showImage !== false,
    bodyLines: cfg.body.length,
    showFooter: cfg.footer.length > 0,
    cardClass: vcSkeletonStyle(),
    imageClass: vcImageStyle(),
    bodyClass: vcBodyStyle(),
    footerClass: vcFooterStyle(),
    blockClass: vcSkeletonBlockStyle(),
    lineClass: vcSkeletonLineStyle()
  });
}
