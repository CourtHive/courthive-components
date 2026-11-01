/**
 * Collection Card — Visual showcase and basics.
 *
 * A collection card displays a team dual's lines (singles/doubles/mixed matchUps) grouped by type and collection,
 * with order-of-finish badges on completed lines and optional issue markers.
 */

import { expect } from 'vitest';
import { mocksEngine, tournamentEngine, eventConstants } from 'tods-competition-factory';
import { renderCollectionCard } from '../components/scorecard/renderCollectionCard';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';

const { TEAM: TEAM_EVENT } = eventConstants;

/**
 * Generate a completed team dual with collections and issues.
 */
function generateDual() {
  mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize: 2, eventType: TEAM_EVENT }],
    completeAllMatchUps: true,
    setState: true
  });

  const matchUps = tournamentEngine.allTournamentMatchUps({ inContext: true }).matchUps;
  const dual = matchUps.find((m: any) => m.matchUpType === 'TEAM' && m.tieMatchUps?.length);

  if (!dual) throw new Error('Failed to generate team dual');
  return structuredClone(dual);
}

const meta: Meta = {
  title: 'Scoring/Team Scorecard/Collection Card/Basics',
  tags: ['autodocs'],
  render: ({
    compositionName = 'National',
    collectionType = 'singles',
    showIssues = false
  }) => {
    const composition = compositions[compositionName] || compositions['National'];
    const dual = generateDual();
    const collections = dual.tieFormat.collectionDefinitions;

    const collection = collections.find((c: any) => {
      const type = c.matchUpType?.toLowerCase();
      return type?.includes(collectionType.toLowerCase());
    });

    if (!collection) {
      const el = document.createElement('div');
      el.textContent = `No ${collectionType} collection found`;
      el.style.cssText = 'padding: 2rem; color: red;';
      return el;
    }

    const collectionMatchUps = dual.tieMatchUps.filter(
      (m: any) => m.collectionId === collection.collectionId
    );

    // Build issues array if requested
    let issues: any[] | undefined;
    if (showIssues) {
      issues = collectionMatchUps
        .filter((m: any, idx: number) => idx % 2 === 0)
        .map((m: any) => ({
          matchUpId: m.matchUpId,
          issues: [{ code: 'SCORE_DISCREPANCY', message: 'Score discrepancy' }]
        }));
    }

    const container = document.createElement('div');
    container.style.cssText = 'display: flex; flex-direction: column; gap: 1rem; padding: 1rem;';

    // Render collection card
    const card = renderCollectionCard({
      collectionDefinition: collection,
      collectionMatchUps,
      composition,
      issues
    });

    container.appendChild(card);
    return container;
  },
  argTypes: {
    compositionName: {
      control: 'select',
      options: Object.keys(compositions).filter(k => !['Night', 'InlineScoring'].includes(k)),
      description: 'Composition theme'
    },
    collectionType: {
      control: 'select',
      options: ['singles', 'doubles', 'mixed'],
      description: 'Collection match type'
    },
    showIssues: {
      control: 'boolean',
      description: 'Show issue markers on lines'
    }
  }
};

export default meta;

export const SinglesCollection: StoryObj = {
  args: { compositionName: 'National', collectionType: 'singles', showIssues: false }
};

export const DoublesCollection: StoryObj = {
  args: { compositionName: 'National', collectionType: 'doubles', showIssues: false }
};

export const MixedCollection: StoryObj = {
  args: { compositionName: 'National', collectionType: 'mixed', showIssues: false }
};

export const WithIssuesMarked: StoryObj = {
  args: { compositionName: 'National', collectionType: 'singles', showIssues: true }
};

export const FrenchTheme: StoryObj = {
  args: { compositionName: 'French', collectionType: 'singles', showIssues: false }
};

export const WimbledonTheme: StoryObj = {
  args: { compositionName: 'Wimbledon', collectionType: 'singles', showIssues: false }
};

export const ITFTheme: StoryObj = {
  args: { compositionName: 'ITF', collectionType: 'singles', showIssues: false }
};

export const AustralianTheme: StoryObj = {
  args: { compositionName: 'Australian', collectionType: 'singles', showIssues: false }
};

export const FinishBadgeDoesNotOverlapScores: StoryObj = {
  tags: ['!dev'],
  args: { compositionName: 'National', collectionType: 'singles', showIssues: false },
  play: async ({ canvasElement }) => {
    const cards = canvasElement.querySelectorAll('.chc-scorecard-card');
    expect(cards.length).toBeGreaterThan(0);

    for (const card of cards) {
      const badge = card.querySelector('.chc-scorecard-finish-badge');
      if (!badge) continue;

      const badgeRect = badge.getBoundingClientRect();
      const scoreElements = card.querySelectorAll('.chc-game-score');

      for (const score of scoreElements) {
        const scoreRect = score.getBoundingClientRect();
        const overlap =
          badgeRect.left < scoreRect.right &&
          badgeRect.right > scoreRect.left &&
          badgeRect.top < scoreRect.bottom &&
          badgeRect.bottom > scoreRect.top;
        expect(overlap).toBe(false);
      }
    }
  }
};

/**
 * Interactive finishing order editor — click badges to edit order.
 * This demonstrates the finishingOrderState engine in interactive mode.
 */
export const InteractiveFinishingOrderEditor: StoryObj = {
  args: { compositionName: 'National', collectionType: 'singles', showIssues: false },
  render: ({
    compositionName = 'National',
    collectionType = 'singles'
  }) => {
    const composition = compositions[compositionName] || compositions['National'];
    const dual = generateDual();
    const collections = dual.tieFormat.collectionDefinitions;

    const collection = collections.find((c: any) => {
      const type = c.matchUpType?.toLowerCase();
      return type?.includes(collectionType.toLowerCase());
    });

    if (!collection) {
      const el = document.createElement('div');
      el.textContent = `No ${collectionType} collection found`;
      el.style.cssText = 'padding: 2rem; color: red;';
      return el;
    }

    const collectionMatchUps = dual.tieMatchUps.filter(
      (m: any) => m.collectionId === collection.collectionId
    );

    const container = document.createElement('div');
    container.style.cssText = 'display: flex; flex-direction: column; gap: 1rem; padding: 1rem;';

    // Render with finishing order editor enabled
    const card = renderCollectionCard({
      collectionDefinition: collection,
      collectionMatchUps,
      composition,
      finishingOrder: {
        editing: true,
        onSave: (order: any[]) => {
          console.log('Order saved:', order);
        },
        onCancel: () => {
          console.log('Order cancelled');
        }
      }
    });

    container.appendChild(card);

    const instructions = document.createElement('div');
    instructions.style.cssText = `
      background: #f5f5f5; padding: 1rem; margin-top: 1rem; border-radius: 4px;
      font-size: 0.9rem; color: #666;
    `;
    instructions.innerHTML = `
      <strong>Instructions:</strong>
      <ul>
        <li>Click the order number to edit finishing order</li>
        <li>Enter a number (1-${collectionMatchUps.length})</li>
        <li>Numbers auto-adjust to prevent gaps</li>
        <li>Click Save or Cancel to commit changes</li>
      </ul>
    `;

    container.appendChild(instructions);
    return container;
  }
};
