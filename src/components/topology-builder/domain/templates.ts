/**
 * Standard Topology Templates — Pre-built topology configurations.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';
import type { TopologyNode, TopologyTemplate } from '../types';

type Stage = TopologyNode['stage'];

const {
  SINGLE_ELIMINATION,
  FIRST_MATCH_LOSER_CONSOLATION,
  FEED_IN_CHAMPIONSHIP,
  COMPASS,
  ROUND_ROBIN,
  MAIN,
  QUALIFYING,
  CONSOLATION,
  PLAY_OFF
} = drawDefinitionConstants;

const WINNER = 'WINNER';
const LOSER = 'LOSER';
const POSITION = 'POSITION';
const TPL_EDGE_1 = 'tpl-edge-1';
const TPL_EDGE_2 = 'tpl-edge-2';

export const standardTemplates: TopologyTemplate[] = [
  {
    name: 'Single Elimination + Qualifying',
    description: 'Standard SE main draw with one qualifying structure',
    state: {
      drawName: 'SE + Qualifying',
      nodes: [
        {
          id: 'tpl-main',
          structureName: 'Main Draw',
          stage: MAIN as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 32,
          position: { x: 320, y: 40 }
        },
        {
          id: 'tpl-qual',
          structureName: 'Qualifying',
          stage: QUALIFYING as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 16,
          position: { x: 40, y: 40 }
        }
      ],
      edges: [
        {
          id: TPL_EDGE_1,
          sourceNodeId: 'tpl-qual',
          targetNodeId: 'tpl-main',
          linkType: WINNER,
          targetRoundNumber: 1,
          qualifyingPositions: 4,
          label: 'winners → R1 (4Q)'
        }
      ]
    }
  },
  {
    name: 'FMLC (First Match Loser Consolation)',
    description: 'Main draw with first match loser consolation',
    state: {
      drawName: 'FMLC',
      nodes: [
        {
          id: 'tpl-main',
          structureName: 'Main Draw',
          stage: MAIN as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 32,
          position: { x: 40, y: 40 }
        },
        {
          id: 'tpl-cons',
          structureName: 'Consolation',
          stage: CONSOLATION as Stage,
          drawType: FIRST_MATCH_LOSER_CONSOLATION,
          drawSize: 16,
          position: { x: 320, y: 40 }
        }
      ],
      edges: [
        {
          id: TPL_EDGE_1,
          sourceNodeId: 'tpl-main',
          targetNodeId: 'tpl-cons',
          linkType: LOSER,
          sourceRoundNumber: 1,
          label: 'R1 losers'
        }
      ]
    }
  },
  {
    name: 'Feed-In Championship (FIC)',
    description: 'Main draw with multi-round fed consolation',
    state: {
      drawName: 'FIC',
      nodes: [
        {
          id: 'tpl-main',
          structureName: 'Main Draw',
          stage: MAIN as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 32,
          position: { x: 40, y: 40 }
        },
        {
          id: 'tpl-cons',
          structureName: 'Consolation',
          stage: CONSOLATION as Stage,
          drawType: FEED_IN_CHAMPIONSHIP,
          drawSize: 16,
          position: { x: 320, y: 40 }
        }
      ],
      edges: [
        {
          id: TPL_EDGE_1,
          sourceNodeId: 'tpl-main',
          targetNodeId: 'tpl-cons',
          linkType: LOSER,
          sourceRoundNumber: 1,
          label: 'R1 losers'
        },
        {
          id: TPL_EDGE_2,
          sourceNodeId: 'tpl-main',
          targetNodeId: 'tpl-cons',
          linkType: LOSER,
          sourceRoundNumber: 2,
          label: 'R2 losers'
        },
        {
          id: 'tpl-edge-3',
          sourceNodeId: 'tpl-main',
          targetNodeId: 'tpl-cons',
          linkType: LOSER,
          sourceRoundNumber: 3,
          label: 'R3 losers'
        }
      ]
    }
  },
  {
    name: 'Compass',
    description: '8-draw compass structure',
    state: {
      drawName: 'Compass',
      nodes: [
        // Col 1
        {
          id: 'tpl-east',
          structureName: 'East',
          stage: MAIN as Stage,
          drawType: COMPASS,
          drawSize: 32,
          position: { x: 40, y: 40 }
        },
        // Col 2
        {
          id: 'tpl-west',
          structureName: 'West',
          stage: CONSOLATION as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 16,
          position: { x: 320, y: 40 }
        },
        {
          id: 'tpl-north',
          structureName: 'North',
          stage: CONSOLATION as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 8,
          position: { x: 320, y: 210 }
        },
        {
          id: 'tpl-ne',
          structureName: 'Northeast',
          stage: CONSOLATION as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 4,
          position: { x: 320, y: 380 }
        },
        // Col 3
        {
          id: 'tpl-south',
          structureName: 'South',
          stage: CONSOLATION as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 8,
          position: { x: 600, y: 40 }
        },
        {
          id: 'tpl-sw',
          structureName: 'Southwest',
          stage: CONSOLATION as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 4,
          position: { x: 600, y: 210 }
        },
        {
          id: 'tpl-nw',
          structureName: 'Northwest',
          stage: CONSOLATION as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 4,
          position: { x: 600, y: 380 }
        },
        // Col 4
        {
          id: 'tpl-se',
          structureName: 'Southeast',
          stage: CONSOLATION as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 4,
          position: { x: 880, y: 40 }
        }
      ],
      edges: [
        // East → losers
        {
          id: TPL_EDGE_1,
          sourceNodeId: 'tpl-east',
          targetNodeId: 'tpl-west',
          linkType: LOSER,
          sourceRoundNumber: 1,
          label: 'R1 losers'
        },
        {
          id: TPL_EDGE_2,
          sourceNodeId: 'tpl-east',
          targetNodeId: 'tpl-north',
          linkType: LOSER,
          sourceRoundNumber: 2,
          label: 'R2 losers'
        },
        {
          id: 'tpl-edge-3',
          sourceNodeId: 'tpl-east',
          targetNodeId: 'tpl-ne',
          linkType: LOSER,
          sourceRoundNumber: 3,
          label: 'R3 losers'
        },
        // West → losers
        {
          id: 'tpl-edge-4',
          sourceNodeId: 'tpl-west',
          targetNodeId: 'tpl-south',
          linkType: LOSER,
          sourceRoundNumber: 1,
          label: 'R1 losers'
        },
        {
          id: 'tpl-edge-5',
          sourceNodeId: 'tpl-west',
          targetNodeId: 'tpl-sw',
          linkType: LOSER,
          sourceRoundNumber: 2,
          label: 'R2 losers'
        },
        // North → losers
        {
          id: 'tpl-edge-6',
          sourceNodeId: 'tpl-north',
          targetNodeId: 'tpl-nw',
          linkType: LOSER,
          sourceRoundNumber: 1,
          label: 'R1 losers'
        },
        // South → losers
        {
          id: 'tpl-edge-7',
          sourceNodeId: 'tpl-south',
          targetNodeId: 'tpl-se',
          linkType: LOSER,
          sourceRoundNumber: 1,
          label: 'R1 losers'
        }
      ]
    }
  },
  {
    name: 'Round Robin + Playoff',
    description: 'Round robin groups with single-elimination playoff',
    state: {
      drawName: 'RR + Playoff',
      nodes: [
        {
          id: 'tpl-main',
          structureName: 'Main Draw',
          stage: MAIN as Stage,
          drawType: ROUND_ROBIN,
          drawSize: 16,
          structureOptions: { groupSize: 4 },
          position: { x: 40, y: 40 }
        },
        {
          id: 'tpl-playoff',
          structureName: 'Playoff',
          stage: PLAY_OFF as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 4,
          position: { x: 320, y: 40 }
        }
      ],
      edges: [
        {
          id: TPL_EDGE_1,
          sourceNodeId: 'tpl-main',
          targetNodeId: 'tpl-playoff',
          linkType: POSITION,
          finishingPositions: [1],
          label: 'group winners'
        }
      ]
    }
  },
  {
    name: 'SE + Multi-Qualifying',
    description: 'Main draw with qualifying feeding R1 and R2',
    state: {
      drawName: 'SE + Multi-Q',
      nodes: [
        {
          id: 'tpl-main',
          structureName: 'Main Draw',
          stage: MAIN as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 64,
          position: { x: 320, y: 40 }
        },
        {
          id: 'tpl-q1',
          structureName: 'Qualifying 1',
          stage: QUALIFYING as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 32,
          position: { x: 40, y: 40 }
        },
        {
          id: 'tpl-q2',
          structureName: 'Qualifying 2',
          stage: QUALIFYING as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 16,
          position: { x: 40, y: 210 }
        }
      ],
      edges: [
        {
          id: TPL_EDGE_1,
          sourceNodeId: 'tpl-q1',
          targetNodeId: 'tpl-main',
          linkType: WINNER,
          targetRoundNumber: 1,
          qualifyingPositions: 8,
          label: 'winners → R1 (8Q)'
        },
        {
          id: TPL_EDGE_2,
          sourceNodeId: 'tpl-q2',
          targetNodeId: 'tpl-main',
          linkType: WINNER,
          targetRoundNumber: 2,
          qualifyingPositions: 4,
          label: 'winners → R2 (4Q)'
        }
      ]
    }
  }
];
