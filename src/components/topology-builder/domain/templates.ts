/**
 * Standard Topology Templates — Pre-built topology configurations.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';
import type { TopologyNode, TopologyTemplate } from '../types';

type Stage = TopologyNode['stage'];

const { SINGLE_ELIMINATION, FEED_IN, ROUND_ROBIN, LUCKY_DRAW, MAIN, QUALIFYING, CONSOLATION, PLAY_OFF } = drawDefinitionConstants;

const WINNER = 'WINNER';
const LOSER = 'LOSER';
const POSITION = 'POSITION';
const TPL_EDGE_1 = 'tpl-edge-1';
const TPL_EDGE_2 = 'tpl-edge-2';
const LABEL_R1_LOSERS_R1 = 'R1 losers → R1';

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
          structureType: SINGLE_ELIMINATION,
          drawSize: 32,
          position: { x: 320, y: 40 }
        },
        {
          id: 'tpl-qual',
          structureName: 'Qualifying',
          stage: QUALIFYING as Stage,
          structureType: SINGLE_ELIMINATION,
          drawSize: 16,
          qualifyingPositions: 4,
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
          structureType: SINGLE_ELIMINATION,
          drawSize: 32,
          position: { x: 40, y: 40 }
        },
        {
          id: 'tpl-cons',
          structureName: 'Consolation',
          stage: CONSOLATION as Stage,
          structureType: SINGLE_ELIMINATION,
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
          targetRoundNumber: 1,
          label: LABEL_R1_LOSERS_R1
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
          structureType: SINGLE_ELIMINATION,
          drawSize: 32,
          position: { x: 40, y: 40 }
        },
        {
          id: 'tpl-cons',
          structureName: 'Consolation',
          stage: CONSOLATION as Stage,
          structureType: FEED_IN,
          drawSize: 31,
          position: { x: 460, y: 40 }
        }
      ],
      edges: [
        {
          id: TPL_EDGE_1,
          sourceNodeId: 'tpl-main',
          targetNodeId: 'tpl-cons',
          linkType: LOSER,
          sourceRoundNumber: 1,
          targetRoundNumber: 1,
          label: LABEL_R1_LOSERS_R1
        },
        {
          id: TPL_EDGE_2,
          sourceNodeId: 'tpl-main',
          targetNodeId: 'tpl-cons',
          linkType: LOSER,
          sourceRoundNumber: 2,
          targetRoundNumber: 2,
          label: 'R2 losers → R2'
        },
        {
          id: 'tpl-edge-3',
          sourceNodeId: 'tpl-main',
          targetNodeId: 'tpl-cons',
          linkType: LOSER,
          sourceRoundNumber: 3,
          targetRoundNumber: 4,
          label: 'R3 losers → R4'
        },
        {
          id: 'tpl-edge-4',
          sourceNodeId: 'tpl-main',
          targetNodeId: 'tpl-cons',
          linkType: LOSER,
          sourceRoundNumber: 4,
          targetRoundNumber: 6,
          label: 'R4 losers → R6'
        },
        {
          id: 'tpl-edge-5',
          sourceNodeId: 'tpl-main',
          targetNodeId: 'tpl-cons',
          linkType: LOSER,
          sourceRoundNumber: 5,
          targetRoundNumber: 8,
          label: 'R5 losers → R8'
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
          structureType: SINGLE_ELIMINATION,
          drawSize: 32,
          position: { x: 40, y: 40 }
        },
        // Col 2
        {
          id: 'tpl-west',
          structureName: 'West',
          stage: CONSOLATION as Stage,
          structureType: SINGLE_ELIMINATION,
          drawSize: 16,
          position: { x: 400, y: 40 }
        },
        {
          id: 'tpl-north',
          structureName: 'North',
          stage: CONSOLATION as Stage,
          structureType: SINGLE_ELIMINATION,
          drawSize: 8,
          position: { x: 400, y: 210 }
        },
        {
          id: 'tpl-ne',
          structureName: 'Northeast',
          stage: CONSOLATION as Stage,
          structureType: SINGLE_ELIMINATION,
          drawSize: 4,
          position: { x: 400, y: 380 }
        },
        // Col 3
        {
          id: 'tpl-south',
          structureName: 'South',
          stage: CONSOLATION as Stage,
          structureType: SINGLE_ELIMINATION,
          drawSize: 8,
          position: { x: 680, y: 40 }
        },
        {
          id: 'tpl-sw',
          structureName: 'Southwest',
          stage: CONSOLATION as Stage,
          structureType: SINGLE_ELIMINATION,
          drawSize: 4,
          position: { x: 680, y: 210 }
        },
        {
          id: 'tpl-nw',
          structureName: 'Northwest',
          stage: CONSOLATION as Stage,
          structureType: SINGLE_ELIMINATION,
          drawSize: 4,
          position: { x: 680, y: 380 }
        },
        // Col 4
        {
          id: 'tpl-se',
          structureName: 'Southeast',
          stage: CONSOLATION as Stage,
          structureType: SINGLE_ELIMINATION,
          drawSize: 4,
          position: { x: 960, y: 40 }
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
          targetRoundNumber: 1,
          label: LABEL_R1_LOSERS_R1
        },
        {
          id: TPL_EDGE_2,
          sourceNodeId: 'tpl-east',
          targetNodeId: 'tpl-north',
          linkType: LOSER,
          sourceRoundNumber: 2,
          targetRoundNumber: 1,
          label: 'R2 losers → R1'
        },
        {
          id: 'tpl-edge-3',
          sourceNodeId: 'tpl-east',
          targetNodeId: 'tpl-ne',
          linkType: LOSER,
          sourceRoundNumber: 3,
          targetRoundNumber: 1,
          label: 'R3 losers → R1'
        },
        // West → losers
        {
          id: 'tpl-edge-4',
          sourceNodeId: 'tpl-west',
          targetNodeId: 'tpl-south',
          linkType: LOSER,
          sourceRoundNumber: 1,
          targetRoundNumber: 1,
          label: LABEL_R1_LOSERS_R1
        },
        {
          id: 'tpl-edge-5',
          sourceNodeId: 'tpl-west',
          targetNodeId: 'tpl-sw',
          linkType: LOSER,
          sourceRoundNumber: 2,
          targetRoundNumber: 1,
          label: 'R2 losers → R1'
        },
        // North → losers
        {
          id: 'tpl-edge-6',
          sourceNodeId: 'tpl-north',
          targetNodeId: 'tpl-nw',
          linkType: LOSER,
          sourceRoundNumber: 1,
          targetRoundNumber: 1,
          label: LABEL_R1_LOSERS_R1
        },
        // South → losers
        {
          id: 'tpl-edge-7',
          sourceNodeId: 'tpl-south',
          targetNodeId: 'tpl-se',
          linkType: LOSER,
          sourceRoundNumber: 1,
          targetRoundNumber: 1,
          label: LABEL_R1_LOSERS_R1
        }
      ]
    }
  },
  {
    name: 'Round Robin + Playoff',
    description: 'Round robin groups with winners and consolation playoffs',
    state: {
      drawName: 'RR + Playoff',
      nodes: [
        {
          id: 'tpl-main',
          structureName: 'Main Draw',
          stage: MAIN as Stage,
          structureType: ROUND_ROBIN,
          drawSize: 16,
          structureOptions: { groupSize: 4 },
          position: { x: 40, y: 40 }
        },
        {
          id: 'tpl-playoff-gold',
          structureName: 'Gold Flight',
          stage: PLAY_OFF as Stage,
          structureType: SINGLE_ELIMINATION,
          drawSize: 8,
          position: { x: 320, y: 40 }
        },
        {
          id: 'tpl-playoff-silver',
          structureName: 'Silver Flight',
          stage: PLAY_OFF as Stage,
          structureType: SINGLE_ELIMINATION,
          drawSize: 8,
          position: { x: 320, y: 220 }
        }
      ],
      edges: [
        {
          id: TPL_EDGE_1,
          sourceNodeId: 'tpl-main',
          targetNodeId: 'tpl-playoff-gold',
          linkType: POSITION,
          finishingPositions: [1, 2],
          label: 'positions 1,2'
        },
        {
          id: TPL_EDGE_2,
          sourceNodeId: 'tpl-main',
          targetNodeId: 'tpl-playoff-silver',
          linkType: POSITION,
          finishingPositions: [3, 4],
          label: 'positions 3,4'
        }
      ]
    }
  },
  {
    name: 'Lucky Draw + Consolation',
    description: 'Lucky draw main with consolation receiving R1 losers',
    state: {
      drawName: 'Lucky + Consolation',
      nodes: [
        {
          id: 'tpl-main',
          structureName: 'Main Draw',
          stage: MAIN as Stage,
          structureType: LUCKY_DRAW,
          drawSize: 11,
          position: { x: 40, y: 40 }
        },
        {
          id: 'tpl-cons',
          structureName: 'Consolation',
          stage: CONSOLATION as Stage,
          structureType: SINGLE_ELIMINATION,
          drawSize: 4,
          position: { x: 340, y: 40 }
        }
      ],
      edges: [
        {
          id: TPL_EDGE_1,
          sourceNodeId: 'tpl-main',
          targetNodeId: 'tpl-cons',
          linkType: LOSER,
          sourceRoundNumber: 1,
          targetRoundNumber: 1,
          label: LABEL_R1_LOSERS_R1
        }
      ]
    }
  },
  {
    name: 'Lucky Draw → Round Robin',
    description: 'Lucky draw main with R1 losers feeding into round robin consolation',
    state: {
      drawName: 'Lucky → RR',
      nodes: [
        {
          id: 'tpl-main',
          structureName: 'Main Draw',
          stage: MAIN as Stage,
          structureType: LUCKY_DRAW,
          drawSize: 25,
          position: { x: 40, y: 40 }
        },
        {
          id: 'tpl-cons-rr',
          structureName: 'Consolation RR',
          stage: CONSOLATION as Stage,
          structureType: ROUND_ROBIN,
          drawSize: 12,
          structureOptions: { groupSize: 4 },
          position: { x: 500, y: 40 }
        }
      ],
      edges: [
        {
          id: TPL_EDGE_1,
          sourceNodeId: 'tpl-main',
          targetNodeId: 'tpl-cons-rr',
          linkType: LOSER,
          sourceRoundNumber: 1,
          targetRoundNumber: 1,
          label: LABEL_R1_LOSERS_R1
        }
      ]
    }
  },
  {
    name: 'Adaptive (drawSize 11)',
    description: 'Compass-like multi-structure topology with lucky draw structures',
    state: {
      drawName: 'Adaptive',
      nodes: [
        {
          id: 'tpl-east',
          structureName: 'East',
          stage: MAIN as Stage,
          structureType: LUCKY_DRAW,
          drawSize: 11,
          position: { x: 40, y: 40 }
        },
        {
          id: 'tpl-west',
          structureName: 'West',
          stage: CONSOLATION as Stage,
          structureType: LUCKY_DRAW,
          drawSize: 6,
          position: { x: 340, y: 40 }
        },
        {
          id: 'tpl-north',
          structureName: 'North',
          stage: CONSOLATION as Stage,
          structureType: SINGLE_ELIMINATION,
          drawSize: 2,
          position: { x: 340, y: 250 }
        },
        {
          id: 'tpl-south',
          structureName: 'South',
          stage: CONSOLATION as Stage,
          structureType: SINGLE_ELIMINATION,
          drawSize: 2,
          position: { x: 600, y: 40 }
        }
      ],
      edges: [
        {
          id: TPL_EDGE_1,
          sourceNodeId: 'tpl-east',
          targetNodeId: 'tpl-west',
          linkType: LOSER,
          sourceRoundNumber: 1,
          targetRoundNumber: 1,
          label: 'R1 losers → R1 (6 losers)'
        },
        {
          id: TPL_EDGE_2,
          sourceNodeId: 'tpl-east',
          targetNodeId: 'tpl-north',
          linkType: LOSER,
          sourceRoundNumber: 2,
          targetRoundNumber: 1,
          label: 'R2 losers → R1 (2 losers)'
        },
        {
          id: 'tpl-edge-3',
          sourceNodeId: 'tpl-west',
          targetNodeId: 'tpl-south',
          linkType: LOSER,
          sourceRoundNumber: 1,
          targetRoundNumber: 1,
          label: 'R1 losers → R1 (2 losers)'
        }
      ]
    }
  }
];
