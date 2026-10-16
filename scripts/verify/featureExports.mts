import { tennisCourt, basketballCourt, resolveCourtSport, type CourtSport } from 'courthive-components/courts';
import { buildSegmentedBar, type BuildSegmentedBarResult } from 'courthive-components/segmented-bar';
// @ts-expect-error Scoring belongs to the root, not the court-only runtime entry.
import { scoringModal } from 'courthive-components/courts';
const svg: SVGSVGElement = tennisCourt('court--tennis');
const other: SVGSVGElement = basketballCourt('court--basketball');
const sport: CourtSport | undefined = resolveCourtSport({});
const bar: BuildSegmentedBarResult = buildSegmentedBar({ segments: [{ key: 'a', label: 'A', color: 'red' }] });
bar.update({ a: 1 });
export const consumerFixtures = [svg, other, sport, scoringModal];
