import { buildEventCard } from '../components/event-card/buildEventCard';
import { mapEventToCardData } from '../components/event-card/mapEvent';
import { buildEventSkeletonCard } from '../components/event-card/buildSkeletonCard';
import { EventCardData } from '../components/event-card/types';

export default {
  title: 'Components/EventCard',
  tags: ['autodocs']
};

const BASE: EventCardData = {
  eventId: 'e1',
  eventName: "Men's Open Singles",
  categoryLabel: 'Open',
  eventType: 'SINGLES',
  gender: 'MALE',
  drawCount: 1,
  drawSummary: '32 SE',
  entryCount: 28,
  matchUpCounts: { total: 31, completed: 14, scheduled: 6, inProgress: 2 },
  status: { kind: 'live', label: 'Live' },
  courtSvgSport: 'tennis'
};

function makeFrame(card: HTMLElement): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding: 24px; background: #f3f4f6; width: 280px;';
  wrap.appendChild(card);
  return wrap;
}

function makeGrid(cards: HTMLElement[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'display: grid; grid-template-columns: repeat(auto-fill, minmax(224px, 1fr)); gap: 1rem; padding: 24px; background: #f3f4f6; max-width: 1100px;';
  for (const card of cards) wrap.appendChild(card);
  return wrap;
}

export const Default = {
  render: () => makeFrame(buildEventCard(BASE, undefined, { onClick: (d) => console.log('open', d.eventId) }))
};

export const SinglesMale = {
  render: () => makeFrame(buildEventCard({ ...BASE, eventType: 'SINGLES', gender: 'MALE' }))
};
export const DoublesFemale = {
  render: () =>
    makeFrame(buildEventCard({ ...BASE, eventName: "Women's Doubles", eventType: 'DOUBLES', gender: 'FEMALE' }))
};
export const TeamMixed = {
  render: () =>
    makeFrame(buildEventCard({ ...BASE, eventName: 'Mixed Teams', eventType: 'TEAM', gender: 'MIXED' }))
};

export const StatusDrawing = {
  render: () =>
    makeFrame(buildEventCard({ ...BASE, status: { kind: 'drawing', label: 'Drawing' } }))
};
export const StatusEntriesOpen = {
  render: () =>
    makeFrame(
      buildEventCard({
        ...BASE,
        drawCount: 0,
        matchUpCounts: undefined,
        status: { kind: 'entries-open', label: 'Entries Open' }
      })
    )
};
export const StatusCompleted = {
  render: () =>
    makeFrame(
      buildEventCard({
        ...BASE,
        matchUpCounts: { total: 31, completed: 31, scheduled: 0, inProgress: 0 },
        status: { kind: 'completed', label: 'Completed' }
      })
    )
};
export const StatusUpcoming = {
  render: () =>
    makeFrame(buildEventCard({ ...BASE, status: { kind: 'upcoming', label: 'Upcoming' }, matchUpCounts: undefined }))
};

export const LightMode = {
  render: () => makeFrame(buildEventCard({ ...BASE, matchUpCounts: undefined }))
};

export const Skeleton = {
  render: () => makeFrame(buildEventSkeletonCard())
};

export const FromFactoryEvent = {
  render: () => {
    const event = {
      eventId: 'mock-1',
      eventName: 'Boys U16 Singles',
      eventType: 'SINGLES',
      gender: 'M',
      category: { ageMin: 14, ageMax: 16 },
      startDate: '2026-05-22',
      endDate: '2026-05-24',
      entries: Array(28).fill({ entryStatus: 'DA' }),
      drawDefinitions: [
        {
          drawId: 'd1',
          drawSize: 32,
          drawType: 'SE',
          structures: [
            {
              matchUps: [
                ...Array(14).fill({ winningSide: 1 }),
                ...Array(2).fill({ matchUpStatus: 'IN_PROGRESS' }),
                ...Array(15).fill({})
              ]
            }
          ]
        }
      ]
    };
    return makeFrame(
      buildEventCard(mapEventToCardData(event, { sport: 'tennis' }), undefined, {
        onClick: (d) => console.log('open', d.eventId)
      })
    );
  }
};

const VARIANTS: EventCardData[] = [
  { ...BASE, eventId: 'a', eventName: "Men's Singles", eventType: 'SINGLES', gender: 'MALE' },
  { ...BASE, eventId: 'b', eventName: "Women's Singles", eventType: 'SINGLES', gender: 'FEMALE' },
  { ...BASE, eventId: 'c', eventName: "Men's Doubles", eventType: 'DOUBLES', gender: 'MALE' },
  { ...BASE, eventId: 'd', eventName: "Women's Doubles", eventType: 'DOUBLES', gender: 'FEMALE' },
  { ...BASE, eventId: 'e', eventName: 'Mixed Doubles', eventType: 'DOUBLES', gender: 'MIXED' },
  {
    ...BASE,
    eventId: 'f',
    eventName: 'Team Final',
    eventType: 'TEAM',
    gender: 'MIXED',
    status: { kind: 'upcoming', label: 'Upcoming' },
    matchUpCounts: undefined
  }
];

export const ResponsiveGrid = {
  render: () =>
    makeGrid(
      VARIANTS.map((d) => buildEventCard(d, undefined, { onClick: (data) => console.log('open', data.eventId) }))
    )
};

export const SkeletonGrid = {
  render: () => makeGrid(Array.from({ length: 6 }, () => buildEventSkeletonCard()))
};
