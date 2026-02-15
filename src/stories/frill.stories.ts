import { renderFrill } from '../components/renderStructure/renderFrill';

export default {
  title: 'Participants/Frill',
  tags: ['autodocs'],
  render: ({ ...args }) => {
    return renderFrill({ ...args });
  }
};

const composition = {
  configuration: {
    scaleAttributes: { scaleType: 'RATING', scaleName: 'WTN', accessor: 'wtnRating' },
    bracketedSeeds: 'square',
    flags: true
  }
};
const individualParticipant = {
  person: { iso2NationalityCode: 'USA' },
  ratings: { SINGLES: [{ scaleName: 'WTN', scaleValue: { wtnRating: 13.53 } }] }
};

export const Flag = {
  args: {
    individualParticipant,
    type: 'flag',
    composition
  }
};

export const Seeding = {
  args: {
    individualParticipant,
    side: { seedValue: 1 },
    type: 'seeding',
    composition
  }
};

export const WTN = {
  args: {
    matchUp: { matchUpType: 'SINGLES' },
    individualParticipant,
    side: { seedValue: 1 },
    type: 'scale',
    composition
  }
};
