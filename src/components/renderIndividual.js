import { participantNameStyle, participantStatus, participantStyle } from '../styles/participantStyle';
import { seedStyle } from '../styles/seedStyle';
import { renderAddress } from './renderAddress';
import { renderFrill } from './renderFrill';

const QUALIFIER = 'Qualifier';
const BYE = 'BYE';
const TBD = 'TBD';

export function renderIndividual(params) {
  const { isWinningSide, side, individualParticipant, matchUp, composition } = params || {};
  const variant = isWinningSide ? 'winner' : undefined;
  const eventHandlers = params.eventHandlers || {};
  const configuration = composition?.configuration;

  const participantName = individualParticipant?.participantName;

  const handleOnClick = (event) => {
    if (typeof eventHandlers?.participantClick === 'function') {
      event.stopPropagation();
      eventHandlers.participantClick({
        individualParticipant,
        matchUp,
        event,
        side
      });
    }
  };

  const div = document.createElement('div');
  div.setAttribute('key', params.index);
  div.onclick = handleOnClick;

  const individual = document.createElement('div');
  individual.className = participantStyle({ variant });
  const flags = configuration?.flags;
  const flag = flags && renderFrill({ ...params, type: 'flag' });
  if (flag) {
    individual.appendChild(flag);
  } else {
    const scale = renderFrill({
      type: 'scale',
      ...params
    });
    if (scale) individual.appendChild(scale);
  }
  const name = document.createElement('div');
  name.className = participantNameStyle({ variant });

  if (participantName) {
    const span = document.createElement('span');
    if (isWinningSide && configuration?.winnerColor) {
      span.style.color = typeof configuration.winnerColor === 'string' ? configuration.winnerColor : 'green';
    } else if (configuration?.genderColor) {
      const gender = individualParticipant?.person?.sex;
      const color = (gender === 'MALE' && '#2E86C1') || (gender === 'FEMALE' && '#AA336A') || '';
      span.style.color = typeof configuration.genderColor === 'string' ? configuration.genderColor : color;
    }
    span.innerHTML = participantName;
    name.appendChild(span);
  } else {
    const abbr = document.createElement('abbr');
    abbr.className = participantStatus();
    abbr.innerHTML = (side?.bye && BYE) || (side?.qualifier && QUALIFIER) || TBD;
    name.appendChild(abbr);
  }

  const seeding = renderFrill({
    ...params,
    className: seedStyle(),
    type: 'seeding'
  });
  if (seeding) name.appendChild(seeding);

  individual.appendChild(name);

  div.appendChild(individual);

  const address = renderAddress(params);
  div.appendChild(address);

  return div;
}
