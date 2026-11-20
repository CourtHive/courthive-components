import { SchedulePageStore } from '../../../../src/components/schedule-page/engine/schedulePageStore';
import { buildMatchUpCatalog } from '../../../../src/components/schedule-page/ui/matchUpCatalog';
import '../../../../src/styles/theme.css';
import '../../../../src/styles/components/buttons.css';
import '../../../../src/styles/components/forms.css';
import './fixture.css';

const theme = new URLSearchParams(location.search).get('theme');
document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
const base = {
  eventId: 'event-1',
  eventName: 'Open singles',
  drawId: 'draw-1',
  drawName: 'Main draw',
  structureId: 'structure-1',
  roundNumber: 1,
  roundName: 'Round 1',
  matchUpType: 'SINGLES' as const,
  matchUpFormat: 'SET3-S:6/TB7',
  sides: [{ participantName: 'Ann Example' }, { participantName: 'Bea Example' }],
  isScheduled: false
};
const store = new SchedulePageStore({
  matchUpCatalog: [
    {
      ...base,
      matchUpId: 'unplayed-1',
      matchUpStatus: 'TO_BE_PLAYED',
      scheduledTime: '10:30',
      scheduledCourtName: 'Court 1'
    },
    {
      ...base,
      matchUpId: 'completed-1',
      matchUpStatus: 'COMPLETED',
      roundName: 'Round 2',
      roundNumber: 2,
      scheduledTime: '11:00',
      scheduledCourtName: 'Court 2'
    },
    { ...base, matchUpId: 'scheduled-1', isScheduled: true, scheduledTime: '12:00', scheduledCourtName: 'Court 3' }
  ],
  scheduleDates: []
});
store.setShowCompleted(true);
store.setShowScheduled(true);
const panel = buildMatchUpCatalog({
  onSearchChange: (query) => store.setCatalogSearch(query),
  onGroupByChange: (mode) => store.setCatalogGroupBy(mode),
  onFilterChange: (filters) => store.setCatalogFilters(filters),
  onShowCompletedChange: (show) => store.setShowCompleted(show),
  onShowScheduledChange: (show) => store.setShowScheduled(show),
  onMatchUpSelected: (item) => store.selectMatchUp(item)
});
store.subscribe((state) => panel.update(state));
panel.update(store.getState());
document.querySelector('#catalog')!.append(panel.element);
const target = document.querySelector<HTMLElement>('#court')!;
let trustedStart = false;
document.addEventListener(
  'dragstart',
  (event) => {
    trustedStart = event.isTrusted;
  },
  true
);
target.addEventListener('dragover', (event) => {
  event.preventDefault();
  event.dataTransfer!.dropEffect = 'copy';
});
target.addEventListener('drop', (event) => {
  event.preventDefault();
  const payload = JSON.parse(event.dataTransfer!.getData('application/json'));
  document.querySelector('#evidence')!.textContent = JSON.stringify({
    id: payload.matchUp.matchUpId,
    type: payload.type,
    trusted: event.isTrusted && trustedStart
  });
});
