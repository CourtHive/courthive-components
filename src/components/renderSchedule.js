import { schedulingStyle } from "../styles/schedulingStyle";
import { utilities } from "tods-competition-factory";
import dayjs from "dayjs";

export function renderSchedule({ matchUp, eventHandlers }) {
  const { scheduledTime, scheduledDate, venueAbbreviation, courtName } =
    matchUp?.schedule || {};
  const {
    dateTime: { extractDate, extractTime },
  } = utilities;
  const time = extractTime(scheduledTime);
  const date = extractDate(scheduledDate);
  let constructedDateString = date;
  let dateFormat = "ddd D MMMM";
  if (time) {
    dateFormat += ", hh:mm A";
    constructedDateString += `T${time}`;
  }
  const displayDate = scheduledDate
    ? dayjs(constructedDateString).format(dateFormat)
    : "Not scheduled";
  const location =
    (venueAbbreviation &&
      courtName?.toString().startsWith(venueAbbreviation) &&
      courtName) || // ensure no duplication of venuAbbreviation
    (venueAbbreviation && courtName && `${venueAbbreviation} ${courtName}`) ||
    courtName ||
    venueAbbreviation ||
    "";

  const div = document.createElement("div");
  div.className = schedulingStyle();
  div.onclick = eventHandlers?.scheduleClick;

  const dateDisplay = document.createElement("div");
  dateDisplay.innerHTML = displayDate;
  div.append(dateDisplay);

  const handleVenueClick = (event) => {
    if (typeof eventHandlers?.venueClick === "function") {
      event.stopPropagation();
      eventHandlers.venueClick({
        matchUp,
        event,
      });
    }
  };

  const locationDisplay = document.createElement("div");
  locationDisplay.onclick = handleVenueClick;
  locationDisplay.innerHTML = location;
  div.append(locationDisplay);

  return div;
}
