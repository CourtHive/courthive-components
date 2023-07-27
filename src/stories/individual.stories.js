import { renderIndividual } from '../components/renderIndividual';

export default {
  title: 'Participants/Individual',
  tags: ['autodocs'],
  render: ({ ...args }) => {
    return renderIndividual({ ...args });
  },
  argTypes: {
    name: { control: 'text' },
    seedNumber: { control: 'text' },
    address: { control: 'text' }
  }
};

const composition = {
  configuration: { bracketedSeeds: 'square', flags: true, showAddress: true }
};
const participantName = 'Thornstein Veblen';

export const Basic = {
  args: {
    individualParticipant: { participantName },
    composition: { configuration: { flags: false } }
  }
};

export const GenderedMale = {
  args: {
    individualParticipant: { participantName, person: { sex: 'MALE' } },
    composition: { configuration: { flags: false, genderColor: true } }
  }
};

export const GenderedFemale = {
  args: {
    individualParticipant: { participantName: 'Zeta Moon', person: { sex: 'FEMALE' } },
    composition: { configuration: { flags: false, genderColor: true } }
  }
};

export const WinnerColor = {
  args: {
    composition: { configuration: { flags: false, winnerColor: true } },
    individualParticipant: { participantName },
    isWinningSide: true
  }
};

export const Seeded = {
  args: {
    individualParticipant: {
      person: { iso2NationalityCode: 'USA' },
      participantName
    },
    side: { seedValue: 1 },
    composition
  }
};

export const supSeed = {
  args: {
    individualParticipant: {
      person: { iso2NationalityCode: 'USA' },
      participantName
    },
    side: { seedValue: 1 },
    composition: { configuration: { seedingElement: 'sup' } }
  }
};

export const Unseeded = {
  args: {
    individualParticipant: {
      person: { iso2NationalityCode: 'USA' },
      participantName
    },
    composition
  }
};

export const FlagAddress = {
  args: {
    individualParticipant: {
      participantName,
      person: {
        iso2NationalityCode: 'USA',
        addresses: [{ city: 'Atlanta', state: 'GA' }]
      }
    },
    matchUp: { matchUpType: 'SINGLES' },
    composition
  }
};

export const scaleAddress = {
  args: {
    matchUp: { matchUpType: 'SINGLES' },
    individualParticipant: {
      person: { addresses: [{ city: 'Atlanta', state: 'GA' }] },
      ratings: { SINGLES: { WTN: 13.5 } },
      participantName
    },
    composition: {
      configuration: {
        scaleAttributes: { scaleType: 'RATING', accessor: 'WTN' },
        showAddress: true
      }
    }
  }
};

export const Address = {
  args: {
    individualParticipant: {
      participantName,
      person: {
        iso2NationalityCode: 'USA',
        addresses: [{ city: 'Atlanta', state: 'GA' }]
      }
    },
    composition: {
      configuration: { showAddress: true }
    }
  }
};
