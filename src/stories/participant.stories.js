import { renderParticipant } from '../components/renderParticipant';
import { generateMatchUps } from '../data/generateMatchUps';

export default {
  title: 'Participants/Participant',
  tags: ['autodocs'],
  render: ({ eventType, outcomes, randomWinningSide, participant, ...args }) => {
    const { matchUps } = generateMatchUps({
      ...args,
      randomWinningSide,
      drawSize: 2,
      eventType,
      outcomes
    });
    const matchUp = !participant ? matchUps[0] : undefined;
    return renderParticipant({ ...args, participant, matchUp });
  },
  argTypes: {}
};

const composition = {
  configuration: { bracketedSeeds: 'square', flags: true, showAddress: true }
};

export const ParticipantFlag = {
  args: {
    participant: {
      participantName: 'Normal person',
      person: {
        iso2NationalityCode: 'USA'
      }
    },
    composition
  }
};

export const ParticipantWTN = {
  args: {
    participant: {
      ratings: { SINGLES: [{ scaleName: 'WTN', scaleValue: { wtnRating: 13.5 } }] },
      participantName: 'Normal person',
      person: {
        addresses: [{ city: 'Buffalo', state: 'NY' }]
      }
    },
    composition: {
      configuration: {
        scaleAttributes: { scaleType: 'RATING', scaleName: 'WTN', accessor: 'wtnRating' },
        showAddress: true
      }
    }
  }
};

export const Singles = {
  args: {
    sideNumber: 1,
    composition
  }
};

export const SinglesWon = {
  args: {
    randomWinningSide: false,
    sideContainer: true,
    sideNumber: 1,
    composition
  }
};

export const SinglesRetired = {
  args: {
    outcomes: [
      // prettier-ignore
      { stage: 'MAIN', roundNumber: 1, roundPosition: 1, scoreString: '6-1 2-2', matchUpStatus: 'RETIRED', winningSide: 2 }
    ],
    sideContainer: true,
    sideNumber: 1,
    composition
  }
};

export const SinglesDefaulted = {
  args: {
    outcomes: [
      // prettier-ignore
      { stage: 'MAIN',roundNumber: 1, roundPosition: 1, matchUpStatus: 'DEFAULTED', winningSide: 2 }
    ],
    sideContainer: true,
    sideNumber: 1,
    composition
  }
};

export const SinglesWalkover = {
  args: {
    outcomes: [
      // prettier-ignore
      { matchUpStatus: "WALKOVER", roundNumber: 1, roundPosition: 1, winningSide: 2, stage: "MAIN", }
    ],
    sideContainer: true,
    sideNumber: 1,
    composition
  }
};

export const SinglesDoubleWalkover = {
  args: {
    outcomes: [
      // prettier-ignore
      { stage: 'MAIN',roundNumber: 1, roundPosition: 1, matchUpStatus: 'DOUBLE_WALKOVER' }
    ],
    sideContainer: true,
    sideNumber: 2,
    composition
  }
};

export const Doubles = {
  args: {
    composition: { configuration: { flags: false } },
    eventType: 'DOUBLES',
    sideNumber: 1
  }
};

export const DoublesAddress = {
  args: {
    composition: { configuration: { flags: true, showAddress: true } },
    eventType: 'DOUBLES',
    sideNumber: 1
  }
};
