/**
 * Court Card — Skeleton wrapper.
 */

import { buildCardSkeleton } from '../../helpers/cards/buildCardSkeleton';
import { mergeCourtCardConfig } from './defaultConfig';
import {
  ccBodyStyle,
  ccFooterStyle,
  ccImageStyle,
  ccSkeletonBlockStyle,
  ccSkeletonLineStyle,
  ccSkeletonStyle
} from './styles';
import { CourtCardConfig } from './types';

export function buildCourtSkeletonCard(config?: Partial<CourtCardConfig>): HTMLElement {
  const cfg = mergeCourtCardConfig(config);
  return buildCardSkeleton({
    showImage: cfg.showImage !== false,
    bodyLines: cfg.body.length,
    showFooter: cfg.footer.length > 0,
    cardClass: ccSkeletonStyle(),
    imageClass: ccImageStyle(),
    bodyClass: ccBodyStyle(),
    footerClass: ccFooterStyle(),
    blockClass: ccSkeletonBlockStyle(),
    lineClass: ccSkeletonLineStyle()
  });
}
