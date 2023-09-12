import { renderFlag } from '../components/renderFlag';

export default {
  title: 'Participants/Flag',
  tags: ['autodocs'],
  render: ({ ...args }) => {
    return renderFlag({ ...args });
  }
};

export const UnitedStates = {
  args: {
    individualParticipant: { person: { iso2NationalityCode: 'USA' } }
  }
};
export const Spain = {
  args: {
    individualParticipant: { person: { iso2NationalityCode: 'ESP' } }
  }
};
