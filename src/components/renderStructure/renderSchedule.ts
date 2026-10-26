import { elapsedOf, eventRoundLabel, formatElapsed, scheduleInfoOptions } from './scoreboardState';
import { renderOnlineResources } from './renderOnlineResources';
import { schedulingStyle } from '../../styles/schedulingStyle';
import { tools } from 'tods-competition-factory';
import { isFunction } from '../modal/cmodal';
import { renderSlot } from './renderSlot';
import dayjs from 'dayjs';

// constants and types
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

  // configuration.scheduleInfo as an object: playing time in place of the date, the event and round on the right
  const options = scheduleInfoOptions(configuration);
  const elapsed = options.elapsed ? elapsedOf(matchUp) : undefined;
  const eventRound = options.eventRound ? eventRoundLabel(matchUp) : '';

  const dateDisplay = document.createElement('div');
  dateDisplay.className = 'chc-scheduling__date';
  if (elapsed === undefined) {
    dateDisplay.innerHTML = displayDate;
  } else {
    dateDisplay.classList.add('chc-scheduling__elapsed');
    dateDisplay.textContent = formatElapsed(elapsed);
    dateDisplay.title = 'Playing time';
  }

  if (options.layout === 'inline') {
    return renderInlineHeader(div, {
      configuration,
      eventHandlers,
      matchUp,
      dateDisplay,
      location,
      eventRound: options.eventRound
    });
  }

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

  const badges = matchUp && renderSlot(configuration?.renderers, 'matchUpBadges', { matchUp });
  const onlineResources = renderOnlineResources({ configuration, eventHandlers, matchUp, placement: 'schedule' });

  const locationDisplay = document.createElement('div');
  locationDisplay.className = 'chc-scheduling__location';
  locationDisplay.style.paddingRight = '.2rem';
  locationDisplay.onclick = handleVenueClick;
  locationDisplay.textContent = location;

  if (eventRound) {
    // a scoreboard header: icons, time | location on the left; badges, then `Men's Singles - R32` on the right
    const optionsLeft = document.createElement('div');
    optionsLeft.className = 'chc-scheduling__left';
    if (onlineResources) optionsLeft.append(onlineResources);
    optionsLeft.append(dateDisplay);
    if (location) {
      const separator = document.createElement('span');
      separator.className = 'chc-scheduling__separator';
      separator.textContent = '|';
      optionsLeft.append(separator, locationDisplay);
    }
    div.append(optionsLeft);

    if (badges) optionsRight.append(badges);
    const eventRoundDisplay = document.createElement('div');
    eventRoundDisplay.className = 'chc-scheduling__event-round';
    eventRoundDisplay.textContent = eventRound;
    optionsRight.append(eventRoundDisplay);
    div.append(optionsRight);
  } else {
    div.append(dateDisplay);
    // renderers.matchUpBadges, then configuration.onlineResources: the start of the right-hand group
    if (badges) optionsRight.append(badges);
    if (onlineResources) optionsRight.append(onlineResources);
    optionsRight.append(locationDisplay);
    div.append(optionsRight);
  }

  if (div.onclick) {
    const actionDots = document.createElement('div');
    actionDots.innerHTML = '⋮';
    optionsRight.append(actionDots);
  }

  return div;
}

/** `configuration.scheduleInfo.layout: 'inline'`: the parts on one line, then badges and online-resource icons. */
function renderInlineHeader(
  div: HTMLElement,
  {
    configuration,
    eventHandlers,
    matchUp,
    dateDisplay,
    location,
    eventRound
  }: {
    configuration?: Configuration;
    eventHandlers?: EventHandlers;
    matchUp?: MatchUp;
    dateDisplay: HTMLElement;
    location: string;
    eventRound?: boolean;
  }
): HTMLElement {
  const parts = inlineParts({ matchUp, dateDisplay, location, eventRound });
  const meta = document.createElement('div');
  meta.className = 'chc-scheduling__meta';
  parts.forEach((part, index) => {
    if (index) {
      const dot = document.createElement('span');
      dot.className = 'chc-scheduling__dot';
      dot.setAttribute('aria-hidden', 'true');
      dot.textContent = '·';
      meta.append(dot);
    }
    meta.append(part);
  });
  div.classList.add('chc-scheduling--inline');
  div.append(meta);
  const badges = matchUp && renderSlot(configuration?.renderers, 'matchUpBadges', { matchUp });
  const onlineResources = renderOnlineResources({ configuration, eventHandlers, matchUp, placement: 'schedule' });
  if (badges || onlineResources) {
    const end = document.createElement('div');
    end.className = 'chc-scheduling__end';
    if (badges) end.append(badges);
    if (onlineResources) end.append(onlineResources);
    div.append(end);
  }
  return div;
}

/**
 * `configuration.scheduleInfo.layout: 'inline'`: `Live · 0:16 · RMTA Court 8 · Men's Singles · R32`. `Live` only
 * while in progress; the event and round only with `eventRound`; an empty part is left out.
 */
function inlineParts({
  matchUp,
  dateDisplay,
  location,
  eventRound
}: {
  matchUp?: MatchUp;
  dateDisplay: HTMLElement;
  location: string;
  eventRound?: boolean;
}): HTMLElement[] {
  const span = (className: string, text?: string) => {
    if (!text) return undefined;
    const el = document.createElement('span');
    el.className = className;
    el.textContent = text;
    return el;
  };
  const live = matchUp?.matchUpStatus === 'IN_PROGRESS' ? span('chc-scheduling__live', 'Live') : undefined;
  const parts = [live, dateDisplay, span('chc-scheduling__location', location)];
  if (eventRound) {
    parts.push(span('chc-scheduling__event', matchUp?.eventName), span('chc-scheduling__round', matchUp?.roundName));
  }
  return parts.filter((part): part is HTMLElement => !!part);
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
