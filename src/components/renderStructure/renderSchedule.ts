import { renderOnlineResources } from './renderOnlineResources';
import { schedulingStyle } from '../../styles/schedulingStyle';
import { tools } from 'tods-competition-factory';
import { isFunction } from '../modal/cmodal';
import { renderSlot } from './renderSlot';
import dayjs from 'dayjs';
import type { Configuration, EventHandlers, MatchUp } from '../../types';

export function renderSchedule({
  configuration,
  eventHandlers,
  matchUp
}: {
  configuration?: Configuration;
  eventHandlers?: EventHandlers;
  matchUp?: MatchUp;
}): HTMLElement {
  const { scheduledTime, scheduledDate, venueAbbreviation, courtName } = matchUp?.schedule || {};
  const {
    dateTime: { extractDate, extractTime }
  } = tools;
  const displayDate = scheduledDate
    ? formatScheduleDate(extractDate(scheduledDate), extractTime(scheduledTime))
    : 'Not scheduled';
  const location =
    (venueAbbreviation && courtName?.toString().startsWith(venueAbbreviation) && courtName) || // ensure no duplication of venuAbbreviation
    (venueAbbreviation && courtName && `${venueAbbreviation} ${courtName}`) ||
    courtName ||
    venueAbbreviation ||
    '';

  const div = document.createElement('div');
  div.className = schedulingStyle();

  div.classList.add('tmx-sch');

  if (isFunction(eventHandlers?.scheduleClick)) {
    div.onclick = (pointerEvent: MouseEvent) => eventHandlers.scheduleClick({ matchUp, pointerEvent });
  }

  const dateDisplay = document.createElement('div');
  dateDisplay.className = 'chc-scheduling__date';
  dateDisplay.innerHTML = displayDate;
  div.append(dateDisplay);

  const handleVenueClick = (pointerEvent: MouseEvent) => {
    if (isFunction(eventHandlers?.venueClick)) {
      pointerEvent.stopPropagation();
      eventHandlers.venueClick({
        pointerEvent,
        matchUp
      });
    }
  };

  const optionsRight = document.createElement('div');
  optionsRight.style = 'display: flex; flex-direction: row; min-width: 0';

  // renderers.matchUpBadges, then configuration.onlineResources: the start of the right-hand group
  const badges = matchUp && renderSlot(configuration?.renderers, 'matchUpBadges', { matchUp });
  if (badges) optionsRight.append(badges);
  const onlineResources = renderOnlineResources({ configuration, eventHandlers, matchUp, placement: 'schedule' });
  if (onlineResources) optionsRight.append(onlineResources);

  const locationDisplay = document.createElement('div');
  locationDisplay.className = 'chc-scheduling__location';
  locationDisplay.style.paddingRight = '.2rem';
  locationDisplay.onclick = handleVenueClick;
  locationDisplay.textContent = location;
  optionsRight.append(locationDisplay);
  div.append(optionsRight);

  if (div.onclick) {
    const actionDots = document.createElement('div');
    actionDots.innerHTML = '⋮';
    optionsRight.append(actionDots);
  }

  return div;
}

/**
 * The schedule header's date and time, compact enough not to wrap beside a court name: `Mon 26 Oct., 8:00AM`.
 * The month is abbreviated with a period when it is shortened (`May` stays as it is), and the hour drops the
 * leading zero and the space before AM/PM (CA, 2026-10-26: `07:30 AM` wrapped the header).
 */
export function formatScheduleDate(date: string, time?: string): string {
  const parsed = dayjs(time ? `${date}T${time}` : date);
  const shortMonth = parsed.format('MMM');
  const month = parsed.format('MMMM').length > shortMonth.length ? `${shortMonth}.` : shortMonth;
  const day = `${parsed.format('ddd D')} ${month}`;
  return time ? `${day}, ${parsed.format('h:mmA')}` : day;
}
