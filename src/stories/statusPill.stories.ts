import { renderStatusPill } from '../components/renderStatusPill';
import { matchUpStatusConstants } from 'tods-competition-factory';

const { WALKOVER, RETIRED, DEFAULTED, SUSPENDED, AWAITING_RESULT, CANCELLED, IN_PROGRESS, ABANDONED } = matchUpStatusConstants;

export default {
  title: 'MatchUps/Status',
  tags: ['autodocs'],
  render: ({ ...args }) => {
    return renderStatusPill({ ...args });
  }
};

export const Walkover = {
  args: {
    matchUpStatus: WALKOVER
  }
};

export const Defaulted = {
  args: {
    matchUpStatus: DEFAULTED
  }
};

export const Cancelled = {
  args: {
    matchUpStatus: CANCELLED
  }
};

export const Abandoned = {
  args: {
    matchUpStatus: ABANDONED
  }
};

export const Retirement = {
  args: {
    matchUpStatus: RETIRED
  }
};

export const Awaiting = {
  args: {
    matchUpStatus: AWAITING_RESULT
  }
};

export const InProgress = {
  args: {
    matchUpStatus: IN_PROGRESS
  }
};

export const Suspended = {
  args: {
    matchUpStatus: SUSPENDED
  }
};
