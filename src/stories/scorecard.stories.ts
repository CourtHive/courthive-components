import { mocksEngine, tournamentEngine, eventConstants } from 'tods-competition-factory';
import { renderScorecard, renderTeamVsHeader } from '../components/scorecard';
import { compositions } from '../compositions/compositions';

const { TEAM: TEAM_EVENT } = eventConstants;

function generateTeamMatchUp({ completeAllMatchUps = false } = {}) {
  mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize: 4, eventType: TEAM_EVENT, drawType: 'SINGLE_ELIMINATION' }],
    completeAllMatchUps,
    setState: true
  });

  const { matchUps } = tournamentEngine.allTournamentMatchUps({
    participantsProfile: { withISO2: true },
    inContext: true
  });

  // Find a TEAM matchUp that has tieMatchUps
  return matchUps.find((m: any) => m.matchUpType === 'TEAM' && m.tieMatchUps?.length);
}

const eventHandlers = {
  scoreClick: (params) => console.log('score click', params),
  matchUpClick: (params) => console.log('matchUp click', params),
  participantClick: (params) => console.log('participant click', params)
};

export default {
  title: 'Team/Scorecard',
  tags: ['autodocs'],
  render: ({ compositionName = 'National', completeAllMatchUps = false, swapSides = false }) => {
    const composition = compositions[compositionName] || compositions['National'];
    const matchUp = generateTeamMatchUp({ completeAllMatchUps });
    if (!matchUp) {
      const el = document.createElement('div');
      el.textContent = 'No team matchUp generated — check factory configuration';
      el.style.cssText = 'padding: 2rem; color: red;';
      return el;
    }
    return renderScorecard({ matchUp, composition, eventHandlers, swapSides });
  },
  argTypes: {
    compositionName: {
      control: 'select',
      options: Object.keys(compositions).filter((k) => k !== 'Night' && k !== 'InlineScoring'),
      description: 'Draw composition theme'
    },
    completeAllMatchUps: {
      control: 'boolean',
      description: 'Generate with all matchUps completed'
    },
    swapSides: {
      control: 'boolean',
      description: 'Swap participant sides (home/away flip)'
    }
  }
};

export const InProgress = {
  args: { compositionName: 'National', completeAllMatchUps: false }
};

export const Completed = {
  args: { compositionName: 'National', completeAllMatchUps: true }
};

export const FrenchTheme = {
  args: { compositionName: 'French', completeAllMatchUps: true }
};

export const WimbledonTheme = {
  args: { compositionName: 'Wimbledon', completeAllMatchUps: true }
};

export const ITFTheme = {
  args: { compositionName: 'ITF', completeAllMatchUps: true }
};

export const AustralianTheme = {
  args: { compositionName: 'Australian', completeAllMatchUps: true }
};

export const SwapSides = {
  render: ({ compositionName = 'National' }) => {
    const composition = compositions[compositionName] || compositions['National'];
    const matchUp = generateTeamMatchUp({ completeAllMatchUps: true });
    if (!matchUp) {
      const el = document.createElement('div');
      el.textContent = 'No team matchUp generated — check factory configuration';
      el.style.cssText = 'padding: 2rem; color: red;';
      return el;
    }

    const wrapper = document.createElement('div');

    const toast = document.createElement('div');
    toast.id = 'swap-sides-toast';
    toast.style.cssText =
      'position:fixed;top:1rem;right:1rem;z-index:9999;background:#1a1a2e;color:#e0e0e0;' +
      'padding:1rem 1.25rem;border-radius:8px;font-family:monospace;font-size:0.8rem;' +
      'max-width:420px;box-shadow:0 4px 20px rgba(0,0,0,0.4);display:none;line-height:1.5;' +
      'border-left:4px solid #4fc3f7;white-space:pre-wrap;word-break:break-word';
    wrapper.appendChild(toast);

    const showToast = (html: string) => {
      toast.innerHTML = html;
      toast.style.display = 'block';
      clearTimeout((toast as any)._timer);
      (toast as any)._timer = setTimeout(() => (toast.style.display = 'none'), 5000);
    };

    const swapHandlers = {
      participantClick: ({ individualParticipant, side }) => {
        const name = individualParticipant?.participantName || 'Unknown';
        const pid = individualParticipant?.participantId || '—';
        const sideNum = side?.sideNumber ?? '—';
        showToast(
          `<b>Participant clicked</b>\n` +
            `Name: <span style="color:#4fc3f7">${name}</span>\n` +
            `participantId: <span style="color:#81c784">${pid}</span>\n` +
            `sideNumber: <span style="color:#ffb74d">${sideNum}</span>`
        );
      },
      matchUpClick: ({ matchUp: mu }) => {
        const s1 = mu?.sides?.find((s: any) => s.sideNumber === 1)?.participant?.participantName || '—';
        const s2 = mu?.sides?.find((s: any) => s.sideNumber === 2)?.participant?.participantName || '—';
        showToast(
          `<b>MatchUp clicked</b>\n` +
            `matchUpId: <span style="color:#81c784">${mu?.matchUpId?.slice(0, 8)}...</span>\n` +
            `side 1: <span style="color:#4fc3f7">${s1}</span>\n` +
            `side 2: <span style="color:#ffb74d">${s2}</span>\n` +
            `winningSide: ${mu?.winningSide ?? '—'}`
        );
      }
    };

    const scorecard = renderScorecard({
      matchUp,
      composition,
      eventHandlers: swapHandlers,
      swapSides: true
    });
    wrapper.appendChild(scorecard);

    return wrapper;
  },
  args: { compositionName: 'National' },
  argTypes: {
    compositionName: {
      control: 'select',
      options: Object.keys(compositions).filter((k) => k !== 'Night' && k !== 'InlineScoring')
    }
  }
};

export const TeamVsHeaderOnly = {
  render: () => {
    const matchUp = generateTeamMatchUp({ completeAllMatchUps: true });
    if (!matchUp) {
      const el = document.createElement('div');
      el.textContent = 'No team matchUp generated';
      return el;
    }
    const side1 = matchUp.sides?.[0]?.participant?.participantName || 'Team 1';
    const side2 = matchUp.sides?.[1]?.participant?.participantName || 'Team 2';
    return renderTeamVsHeader({
      side1Name: side1,
      side2Name: side2,
      sets: matchUp.score?.sets,
      winningSide: matchUp.winningSide
    });
  }
};
