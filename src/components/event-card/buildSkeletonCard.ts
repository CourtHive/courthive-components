/**
 * Event Card — Skeleton wrapper.
 */

import { buildCardSkeleton } from '../../helpers/cards/buildCardSkeleton';
import { mergeEventCardConfig } from './defaultConfig';
import {
  ecBodyStyle,
  ecFooterStyle,
  ecImageStyle,
  ecSkeletonBlockStyle,
  ecSkeletonLineStyle,
  ecSkeletonStyle
} from './styles';
import { EventCardConfig } from './types';

export function buildEventSkeletonCard(config?: Partial<EventCardConfig>): HTMLElement {
  const cfg = mergeEventCardConfig(config);
  return buildCardSkeleton({
    showImage: cfg.showImage !== false,
    bodyLines: cfg.body.length,
    showFooter: cfg.footer.length > 0,
    cardClass: ecSkeletonStyle(),
    imageClass: ecImageStyle(),
    bodyClass: ecBodyStyle(),
    footerClass: ecFooterStyle(),
    blockClass: ecSkeletonBlockStyle(),
    lineClass: ecSkeletonLineStyle()
  });
}
