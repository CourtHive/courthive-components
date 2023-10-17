import { schedulingStyle } from '../styles/schedulingStyle';
import { utilities } from 'tods-competition-factory';
import { isFunction } from './modal/cmodal';
import dayjs from 'dayjs';

export function renderSchedule({ matchUp, eventHandlers }) {
  const { scheduledTime, scheduledDate, venueAbbreviation, courtName } = matchUp?.schedule || {};
  const {
    dateTime: { extractDate, extractTime }
  } = utilities;
  const time = extractTime(scheduledTime);
  const date = extractDate(scheduledDate);
  let constructedDateString = date;
  let dateFormat = 'ddd D MMMM';
  if (time) {
    dateFormat += ', hh:mm A';
    constructedDateString += `T${time}`;
  }
  const displayDate = scheduledDate ? dayjs(constructedDateString).format(dateFormat) : 'Not scheduled';
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
    div.onclick = (pointerEvent) => eventHandlers.scheduleClick({ matchUp, pointerEvent });
  }

  const dateDisplay = document.createElement('div');
  dateDisplay.innerHTML = displayDate;
  div.append(dateDisplay);

  const handleVenueClick = (pointerEvent) => {
    if (isFunction(eventHandlers?.venueClick)) {
      pointerEvent.stopPropagation();
      eventHandlers.venueClick({
        pointerEvent,
        matchUp
      });
    }
  };

  const optionsRight = document.createElement('div');
  optionsRight.style = 'display: flex; flex-direction: row';

  const locationDisplay = document.createElement('div');
  locationDisplay.style.paddingRight = '.2rem';
  locationDisplay.onclick = handleVenueClick;
  locationDisplay.innerHTML = location;
  optionsRight.append(locationDisplay);
  div.append(optionsRight);

  if (div.onclick) {
    const actionDots = document.createElement('div');
    actionDots.innerHTML = '⋮';
    optionsRight.append(actionDots);
  }

  return div;
}
