/**
 * BurstChart D3v7 - Tournament Sunburst Visualization
 *
 * Modern D3v7 implementation with emoji flags and clean TypeScript architecture.
 * Consumes TODS-aligned SunburstDrawData natively.
 *
 * Features:
 * - D3v7 partition layout
 * - Emoji flags (no image dependencies)
 * - Interactive hover with winner/opponent display
 * - Tournament title with text wrapping
 * - Color coding by seed/entry type
 * - Three-line hover display (winner, score, opponent)
 */

import { select, scaleLinear, arc as d3Arc, partition as d3Partition, hierarchy, range as d3Range } from 'd3';
import type { ScaleLinear, HierarchyRectangularNode, Selection } from 'd3';
import { fixtures } from 'tods-competition-factory';
import { wordwrap } from './textHelpers';

// ============================================================================
// Constants
// ============================================================================

const ATTR_TEXT_ANCHOR = 'text-anchor';
const ATTR_DOMINANT_BASELINE = 'dominant-baseline';
const ATTR_FILL_OPACITY = 'fill-opacity';

const ioc2iso2 = Object.assign(
  {},
  ...fixtures.countries.filter((c: any) => c.ioc).map((c: any) => ({ [c.ioc]: c.iso2 })),
  ...fixtures.countries.filter((c: any) => c.iso).map((c: any) => ({ [c.iso]: c.iso2 }))
);

// ============================================================================
// TODS-aligned Types
// ============================================================================

/** TODS-aligned draw structure for the sunburst */
export interface SunburstDrawData {
  drawSize: number;
  roundMatchUps: Record<number, SunburstMatchUp[]>;
  seedAssignments?: { participantId: string; seedNumber: number }[];
}

export interface SunburstMatchUp {
  roundNumber: number;
  roundName?: string;
  matchUpStatus: string; // 'COMPLETED' | 'TO_BE_PLAYED' | 'BYE'
  winningSide?: number; // 1 or 2
  drawPositions: number[]; // [1, 2]
  scoreString?: string; // "6-2 7-6(2)"
  sides: SunburstSide[];
}

export interface SunburstSide {
  sideNumber: number;
  drawPosition: number;
  participantName?: string;
  nationalityCode?: string; // ISO 3-letter (works with existing flagISO)
  seedNumber?: number;
  entryStatus?: string; // 'DIRECT_ACCEPTANCE' | 'WILDCARD' | 'QUALIFIER' | 'LUCKY_LOSER'
}

// ============================================================================
// Hierarchy Node (TODS-aligned field names)
// ============================================================================

export interface HierarchyNode {
  name: string;
  drawPosition?: number;
  seedNumber?: number;
  entryStatus?: string;
  participantName?: string;
  nationalityCode?: string;
  roundName?: string;
  scoreString?: string;
  matchUpStatus?: string;
  matchUp?: SunburstMatchUp;
  depth: number;
  value?: number;
  color?: string;
  children?: HierarchyNode[];
  opponent?: HierarchyNode; // Set during hover to track opponent for flag display
}

export interface SegmentData {
  participantName?: string;
  drawPosition?: number;
  seedNumber?: number;
  entryStatus?: string;
  nationalityCode?: string;
  scoreString?: string;
  matchUpStatus?: string;
  roundName?: string;
  depth: number;
  matchUp?: SunburstMatchUp;
}

export interface BurstChartEventHandlers {
  clickSegment?: (data: SegmentData) => void;
}

export interface BurstChartOptions {
  width?: number;
  height?: number;
  title?: string;
  colorBySeeds?: boolean;
  countryCodes?: Record<string, string>;
  eventHandlers?: BurstChartEventHandlers;
  textScaleFactor?: number;
}

/** Handle returned by render() for controlling the chart after rendering */
export interface BurstChartInstance {
  /** Highlight all segments belonging to a player. Returns count of highlighted nodes. Omit name to clear. */
  highlightPlayer: (playerName?: string) => number;
  /** Show or hide the entire chart SVG */
  hide: (hidden: boolean) => void;
}

type GSelection = Selection<SVGGElement, unknown, null, undefined>;

interface FlagGroups {
  flagsGroup: GSelection;
  winningFlagsGroup: GSelection;
  losingFlagsGroup: GSelection;
}

// ============================================================================
// Hierarchy Builder (consumes SunburstDrawData)
// ============================================================================

function reorderForBracket<T>(items: T[]): T[] {
  const half = Math.floor(items.length / 2);
  const firstHalf = items.slice(0, half);
  const secondHalf = items.slice(half).reverse();
  return [...firstHalf, ...secondHalf];
}

/** Map TODS entryStatus to short display codes for coloring */
function entryStatusShortCode(entryStatus: string | undefined): string | undefined {
  if (!entryStatus) return undefined;
  switch (entryStatus) {
    case 'WILDCARD':
      return 'WC';
    case 'QUALIFIER':
      return 'Q';
    case 'LUCKY_LOSER':
      return 'LL';
    default:
      // Legacy codes pass through (WC, Q, LL)
      return entryStatus;
  }
}

/** Build leaf HierarchyNodes from round-1 matchUps */
function buildLeafNodes(matchUps: SunburstMatchUp[], totalRounds: number): HierarchyNode[] {
  const leafNodes: HierarchyNode[] = [];
  for (const mu of matchUps) {
    for (const side of mu.sides) {
      const isBye = mu.matchUpStatus === 'BYE' && !side.participantName;
      leafNodes.push({
        name: side.participantName || (isBye ? 'BYE' : ''),
        participantName: side.participantName || (isBye ? 'BYE' : undefined),
        drawPosition: side.drawPosition,
        seedNumber: side.seedNumber,
        entryStatus: entryStatusShortCode(side.entryStatus),
        nationalityCode: side.nationalityCode,
        matchUp: mu,
        depth: totalRounds,
        value: 1
      });
    }
  }
  return leafNodes;
}

/** Resolve winner info from a matchUp and a participant lookup */
function resolveWinner(
  mu: SunburstMatchUp,
  lookup: Map<string, HierarchyNode>
): { winnerName?: string; winnerSide?: SunburstSide; winnerLookup?: HierarchyNode } {
  const winnerSide =
    mu.winningSide !== undefined && mu.winningSide !== null
      ? mu.sides.find((s) => s.sideNumber === mu.winningSide)
      : undefined;
  const winnerName = winnerSide?.participantName;
  const winnerLookup = winnerName ? lookup.get(winnerName) : undefined;
  return { winnerName, winnerSide, winnerLookup };
}

/** Build parent nodes for a single round from its matchUps and previous-level child nodes */
function buildRoundParents(
  matchUps: SunburstMatchUp[],
  childNodes: HierarchyNode[],
  depth: number,
  lookup: Map<string, HierarchyNode>
): HierarchyNode[] {
  return matchUps.map((mu, mi) => {
    const childIndex = mi * 2;
    const children = [childNodes[childIndex], childNodes[childIndex + 1]].filter(Boolean);
    const { winnerName, winnerSide, winnerLookup } = resolveWinner(mu, lookup);

    return {
      name: winnerName || '',
      participantName: winnerName,
      drawPosition: winnerLookup?.drawPosition ?? winnerSide?.drawPosition,
      seedNumber: winnerSide?.seedNumber ?? winnerLookup?.seedNumber,
      entryStatus: entryStatusShortCode(winnerSide?.entryStatus) ?? winnerLookup?.entryStatus,
      nationalityCode: winnerSide?.nationalityCode ?? winnerLookup?.nationalityCode,
      scoreString: mu.scoreString,
      matchUpStatus: mu.matchUpStatus,
      matchUp: mu,
      depth,
      children: children.length > 0 ? children : undefined
    };
  });
}

/**
 * Convert SunburstDrawData to D3 hierarchy.
 * Builds bottom-up: round 1 sides become leaf nodes, round 1 winners wrap
 * pairs of leaves, then round 2+ winners wrap pairs from the previous level.
 */
function buildTournamentHierarchy(drawData: SunburstDrawData): HierarchyNode {
  const { roundMatchUps } = drawData;
  const roundNumbers = Object.keys(roundMatchUps)
    .map(Number)
    .sort((a, b) => a - b);

  if (roundNumbers.length === 0) {
    throw new Error('No round data found in draw');
  }

  // Build leaf nodes from ORIGINAL matchUp order (2 sides per matchUp → 128 leaves
  // for a 128-draw), then reorder at the leaf level. This matches the old code which
  // reordered 128 individual players. Reordering at the matchUp level (64 items)
  // would reverse pairs but not the sides within each pair, giving [127,128] instead
  // of [128,127] in the reversed half.
  const round1MUs = roundMatchUps[roundNumbers[0]];
  const rawLeaves = buildLeafNodes(round1MUs, roundNumbers.length);
  const leafNodes = reorderForBracket(rawLeaves);

  // Build participant lookup from leaf nodes for drawPosition/seed/nationalityCode
  const participantLookup = new Map<string, HierarchyNode>();
  for (const node of leafNodes) {
    if (node.participantName && node.participantName !== 'BYE') {
      participantLookup.set(node.participantName, node);
    }
  }

  // Round 1 winners: reorder matchUps (64 items) so they align with consecutive
  // pairs of the reordered leaves. Both reorders use the same split-and-reverse
  // logic, so matchUp[i] correctly parents leaves[2i] and leaves[2i+1].
  const reorderedR1 = reorderForBracket(round1MUs);
  let currentNodes = buildRoundParents(reorderedR1, leafNodes, roundNumbers.length - 1, participantLookup);

  // Rounds 2+: each subsequent round wraps pairs from the previous level
  for (let ri = 1; ri < roundNumbers.length; ri++) {
    const reorderedMUs = reorderForBracket(roundMatchUps[roundNumbers[ri]]);
    currentNodes = buildRoundParents(reorderedMUs, currentNodes, roundNumbers.length - 1 - ri, participantLookup);
  }

  if (currentNodes.length === 1) {
    return currentNodes[0];
  }

  // Multiple nodes remaining — wrap in a synthetic root
  return { name: 'Tournament', depth: 0, children: currentNodes };
}

// ============================================================================
// Color Application
// ============================================================================

/**
 * Apply colors using bracketBuilder_v2.js logic
 * Colors are calculated for each node based on seed/entry/draw, then propagated down
 */
function applyColors(node: HierarchyNode, colorScale: ScaleLinear<number, number, never>): void {
  if (!node) return;

  const { seedNumber, entryStatus, drawPosition, participantName } = node;

  // Calculate color for THIS node based on seed/entry/draw
  let calculatedColor: string;

  // BYE: Light grey (consistent color for all byes)
  if (participantName?.trim().toUpperCase() === 'BYE') {
    calculatedColor = '#B0BEC5'; // Light to mid grey
  }
  // SEEDED (1-32): Blue gradient
  else if (seedNumber) {
    const seedNum = Number(seedNumber);
    const seeded = scaleLinear<string>().domain([1, 32]).range(['0', '1']);
    const heatmap = scaleLinear<string>()
      .domain(d3Range(0, 1, 1 / 7))
      .range(['#81D4FA', '#42A5F5', '#1E88E5', '#1565C0', '#5C6BC0', '#673AB7', '#9C27B0']);
    calculatedColor = heatmap(Number(seeded(seedNum)));
  }
  // WILDCARD: Red
  else if (entryStatus?.toUpperCase() === 'WC') {
    calculatedColor = 'red';
  }
  // QUALIFIER/LUCKY LOSER: Yellow-orange
  else if (entryStatus && (entryStatus === 'Q' || entryStatus === 'LL')) {
    const heatmap = scaleLinear<string>()
      .domain(d3Range(0, 1, 1 / 3))
      .range(['#FFF176', '#FBC02D', '#FF9800']);
    calculatedColor = heatmap(colorScale(drawPosition));
  }
  // UNSEEDED: Expanded color palette for better variation (especially in small draws)
  else {
    const palette = [
      '#C8E6C9',
      '#81C784',
      '#66BB6A',
      '#4CAF50',
      '#43A047',
      '#388E3C',
      '#2E7D32',
      '#1B5E20',
      '#A5D6A7',
      '#90CAF9',
      '#64B5F6',
      '#42A5F5',
      '#2196F3',
      '#1E88E5',
      '#1976D2',
      '#1565C0'
    ];
    const heatmap = scaleLinear<string>()
      .domain(d3Range(0, 1, 1 / palette.length))
      .range(palette);
    calculatedColor = heatmap(colorScale(drawPosition));
  }

  // Assign color to this node
  node.color = calculatedColor;

  // Propagate same color DOWN to children that match this player
  if (node.children) {
    node.children.forEach((child) => {
      // Set child's color if it matches this parent (same player)
      if (child.participantName === node.participantName) {
        child.color = calculatedColor;
      }
      // Recursively apply colors to all children
      applyColors(child, colorScale);
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build a leaf node info string (seed, entry, draw position)
 */
function getLeafInfo(data: HierarchyNode, depth: number): string | undefined {
  const info: string[] = [];
  if (data.seedNumber) info.push(`Seed ${data.seedNumber}`);
  if (data.entryStatus) info.push(data.entryStatus);
  if (depth === 7 && data.drawPosition) {
    info.push(`Draw ${data.drawPosition}`);
  }
  return info.length > 0 ? info.join(' \u2022 ') : undefined;
}

/**
 * Find the opponent node among children
 */
function findOpponent(
  children: HierarchyRectangularNode<HierarchyNode>[],
  playerName: string
): HierarchyNode | undefined {
  const opponent = children.find((child) => child.data.participantName && child.data.participantName !== playerName);
  return opponent?.data.participantName ? opponent.data : undefined;
}

/**
 * Build message lines for hover display
 */
function getMessageLines(
  data: HierarchyNode,
  d: HierarchyRectangularNode<HierarchyNode>
): { messageLines: string[]; opponentData?: HierarchyNode } {
  const messageLines: string[] = [data.participantName];
  let opponentData: HierarchyNode | undefined;
  const isMatchNode = d.children && d.children.length > 0;

  if (isMatchNode) {
    if (data.scoreString) messageLines.push(data.scoreString);
    opponentData = findOpponent(d.children, data.participantName);
    if (opponentData) messageLines.push(opponentData.participantName);
  } else {
    const leafInfo = getLeafInfo(data, d.depth);
    if (leafInfo) messageLines.push(leafInfo);
  }

  return { messageLines, opponentData };
}

/**
 * Calculate vertical offset to center text block
 */
function getTextVerticalOffset(lineCount: number, lineHeight: number): number {
  const totalHeight = lineCount * lineHeight;
  return -(totalHeight / 2) + lineHeight / 2;
}

// ============================================================================
// SVG Setup Helpers
// ============================================================================

/**
 * Create the SVG element and main groups
 */
function createSvgElements(
  container: HTMLElement,
  width: number,
  height: number
): {
  svg: Selection<SVGSVGElement, unknown, null, undefined>;
  g: Selection<SVGGElement, unknown, null, undefined>;
  flagsGroup: Selection<SVGGElement, unknown, null, undefined>;
  winningFlagsGroup: Selection<SVGGElement, unknown, null, undefined>;
  losingFlagsGroup: Selection<SVGGElement, unknown, null, undefined>;
} {
  const svg = select(container).append('svg').attr('width', width).attr('height', height).style('display', 'block');

  const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);

  const flagsGroup = g.append('g').attr('class', 'flags-group');
  const winningFlagsGroup = g.append('g').attr('class', 'winning-flags-group');
  const losingFlagsGroup = g.append('g').attr('class', 'losing-flags-group');

  return { svg, g, flagsGroup, winningFlagsGroup, losingFlagsGroup };
}

/**
 * Create the center text elements for tournament title / hover info
 */
function createCenterText(
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  width: number,
  height: number,
  titleFontSize: number,
  secondaryFontSize: number
): {
  centerText: Selection<SVGTextElement, unknown, null, undefined>;
  centerText2: Selection<SVGTextElement, unknown, null, undefined>;
} {
  const centerText = svg
    .append('text')
    .attr('x', width / 2)
    .attr('y', height / 2)
    .attr(ATTR_TEXT_ANCHOR, 'middle')
    .attr(ATTR_DOMINANT_BASELINE, 'middle')
    .attr('font-size', `${titleFontSize}px`)
    .attr('font-weight', 'bold')
    .attr('fill', '#333')
    .attr('pointer-events', 'none');

  const secondaryOffset = titleFontSize + secondaryFontSize * 0.5;
  const centerText2 = svg
    .append('text')
    .attr('x', width / 2)
    .attr('y', height / 2 + secondaryOffset)
    .attr(ATTR_TEXT_ANCHOR, 'middle')
    .attr(ATTR_DOMINANT_BASELINE, 'middle')
    .attr('font-size', `${secondaryFontSize}px`)
    .attr('fill', '#666')
    .attr('pointer-events', 'none');

  return { centerText, centerText2 };
}

// ============================================================================
// Flag Display Helpers
// ============================================================================

/**
 * Display a single flag (winner or opponent) in the center area.
 */
function displayFlag(
  group: GSelection,
  groups: FlagGroups,
  nationalityCode: string | undefined,
  ySign: number,
  clearAll: boolean,
  flagRadius: number,
  flagSize: number
): void {
  if (!nationalityCode) return;

  if (clearAll) {
    groups.flagsGroup.selectAll('text').remove();
    groups.winningFlagsGroup.selectAll('text').remove();
    groups.losingFlagsGroup.selectAll('text').remove();
  } else {
    group.selectAll('text').remove();
  }

  group
    .append('text')
    .attr('font-size', `${flagSize}px`)
    .attr(ATTR_TEXT_ANCHOR, 'middle')
    .attr(ATTR_DOMINANT_BASELINE, 'middle')
    .attr('transform', `translate(0, ${ySign * flagRadius})`)
    .text(flagISO(nationalityCode));
}

// ============================================================================
// Main Render Function
// ============================================================================

/**
 * Create a BurstChart D3v7 visualization.
 * Accepts the TODS-aligned SunburstDrawData format.
 */
export function renderburstChart(
  container: HTMLElement,
  drawData: SunburstDrawData,
  title: string,
  options: BurstChartOptions = {}
): BurstChartInstance {
  const width = options.width || 800;
  const height = options.height || 800;
  const textScale = (Math.min(width, height) / 800) * (options.textScaleFactor ?? 1);
  const titleFontSize = 28 * textScale;
  const secondaryFontSize = 24 * textScale;
  const lineHeight = 30 * textScale;
  const tournamentTitle = title || options.title || 'Tournament';
  const countryNames = Object.assign(
    {},
    ...fixtures.countries.filter((c) => c.label).map((c) => ({ [c.ioc]: c.label }))
  );

  // Convert draw data to hierarchy
  const tournamentHierarchy = buildTournamentHierarchy(drawData);

  // Build D3 hierarchy
  const rootHierarchy = hierarchy(tournamentHierarchy, (node: any) => node.children).sum(
    (node: any) => node.value || 0
  );

  // Chart dimensions
  const radius = Math.min(width, height) / 2;
  const centerRadius = radius / 2;

  // Flag size scaling helper
  const getFlagSize = (baseSize: number) => {
    return (baseSize * radius) / 200;
  };

  // Partition layout
  d3Partition<HierarchyNode>().size([2 * Math.PI, radius - centerRadius])(rootHierarchy);

  // Apply colors
  const colorScale = scaleLinear()
    .domain([0, drawData.drawSize || 128])
    .range([0, 1]);

  applyColors(tournamentHierarchy, colorScale);

  // After partition(), nodes have x0/y0/x1/y1 properties
  const descendants = rootHierarchy.descendants() as HierarchyRectangularNode<HierarchyNode>[];

  // Arc generator
  const arc = d3Arc<HierarchyRectangularNode<HierarchyNode>>()
    .startAngle((d: any) => d.x0!)
    .endAngle((d: any) => d.x1!)
    .innerRadius((d: any) => d.y0! + centerRadius)
    .outerRadius((d: any) => d.y1! + centerRadius);

  // Create SVG elements
  const { svg, g, flagsGroup, winningFlagsGroup, losingFlagsGroup } = createSvgElements(container, width, height);

  // Extract unique countries
  const uniqueCountries = new Set<string>();
  const extractCountries = (node: HierarchyNode) => {
    if (node.nationalityCode) uniqueCountries.add(node.nationalityCode);
    if (node.children) {
      node.children.forEach(extractCountries);
    }
  };
  extractCountries(tournamentHierarchy);
  const countries = Array.from(uniqueCountries);

  // Center text elements
  const { centerText, centerText2 } = createCenterText(svg, width, height, titleFontSize, secondaryFontSize);

  // Display tournament title with text wrapping
  function displayTournamentTitle() {
    const titleLines = wordwrap(tournamentTitle, 15);

    centerText.text('');
    centerText.selectAll('tspan').remove();
    centerText2.text('');
    centerText2.selectAll('tspan').remove();

    centerText
      .selectAll('tspan')
      .data(titleLines)
      .join('tspan')
      .attr('x', width / 2)
      .attr('dy', (_datum: any, i: number) => (i === 0 ? 0 : lineHeight))
      .text((line: any) => line);

    const lineCount = titleLines.length;
    const totalHeight = lineCount * lineHeight;
    const offsetY = -(totalHeight / 2) + lineHeight / 2;
    centerText.attr('y', height / 2 + offsetY);

    centerText.style('display', 'block');
    centerText2.style('display', 'none');
  }

  // Display all flags in a circle
  function displayAllFlags() {
    flagsGroup.selectAll('text').remove();
    winningFlagsGroup.selectAll('text').remove();
    losingFlagsGroup.selectAll('text').remove();

    if (countries.length === 0) return;

    const angleScale = scaleLinear()
      .domain([0, countries.length])
      .range([0, Math.PI * 2]);

    const circleFlagSize = getFlagSize(20);
    const flagRadius = centerRadius - circleFlagSize + 10;

    flagsGroup
      .selectAll('text')
      .data(countries)
      .join('text')
      .attr('font-size', `${circleFlagSize}px`)
      .attr(ATTR_TEXT_ANCHOR, 'middle')
      .attr(ATTR_DOMINANT_BASELINE, 'middle')
      .attr('transform', (_datum: any, i: number) => {
        const angle = angleScale(i);
        const x = Math.cos(angle) * flagRadius;
        const y = Math.sin(angle) * flagRadius;
        return `translate(${x}, ${y})`;
      })
      .text((nationalityCode: string) => flagISO(nationalityCode))
      .style('cursor', 'pointer')
      .on('mouseover', function (_event: any, nationalityCode: string) {
        const countryName = countryNames[nationalityCode] || nationalityCode;
        centerText.selectAll('tspan').remove();
        centerText.attr('y', height / 2);
        centerText.text(countryName).style('display', 'block');
        centerText2.selectAll('tspan').remove();
        centerText2.text('').style('display', 'none');

        if (!frozen) {
          g.selectAll<SVGPathElement, HierarchyRectangularNode<HierarchyNode>>('path').attr(
            ATTR_FILL_OPACITY,
            (p: any) => {
              if (p.data.nationalityCode === nationalityCode) return 0.9;
              return 0.3;
            }
          );
        }
      })
      .on('mouseout', function () {
        if (!frozen) {
          g.selectAll('path').attr(ATTR_FILL_OPACITY, 0.8);
        }
        displayTournamentTitle();
      });
  }

  displayAllFlags();
  displayTournamentTitle();

  // Frozen state: when a player is highlighted via highlightPlayer(), opacity is locked
  // but individual segments still show hover feedback
  let frozen = false;
  let frozenPlayerName: string | undefined;

  // Arc mouseover handler
  function handleArcMouseover(_event: MouseEvent, d: HierarchyRectangularNode<HierarchyNode>) {
    const nodeData = d.data;
    const playerName = nodeData.participantName;

    if (playerName) {
      const { messageLines, opponentData } = getMessageLines(nodeData, d);

      if (opponentData) {
        nodeData.opponent = opponentData;
      }

      centerText.selectAll('tspan').remove();
      centerText.text('');

      centerText
        .selectAll('tspan')
        .data(messageLines)
        .join('tspan')
        .attr('x', width / 2)
        .attr('dy', (_datum: any, i: number) => (i === 0 ? 0 : lineHeight))
        .text((line: any) => line);

      const offsetY = getTextVerticalOffset(messageLines.length, lineHeight);
      centerText.attr('y', height / 2 + offsetY);

      centerText.style('display', 'block');
      centerText2.style('display', 'none');
    }

    if (frozen) {
      // Frozen mode: only highlight the individual hovered segment
      // (searched player's segments stay at 1, don't register hover)
      const isSearchedPlayer = nodeData.participantName?.toLowerCase() === frozenPlayerName?.toLowerCase();
      if (!isSearchedPlayer) {
        select(_event.currentTarget as SVGPathElement).attr(ATTR_FILL_OPACITY, 0.9);
      }
    } else {
      // Normal mode: highlight all segments matching hovered player, dim others
      g.selectAll<SVGPathElement, HierarchyRectangularNode<HierarchyNode>>('path').attr(ATTR_FILL_OPACITY, (p: any) => {
        if (p.data.participantName === d.data.participantName) return 0.9;
        return 0.3;
      });
    }

    // Show winner's flag at top
    const hoverFlagSize = getFlagSize(30);
    const hoverFlagRadius = centerRadius - hoverFlagSize - 10;
    const allGroups: FlagGroups = { flagsGroup, winningFlagsGroup, losingFlagsGroup };

    displayFlag(winningFlagsGroup, allGroups, nodeData.nationalityCode, -1, true, hoverFlagRadius, hoverFlagSize);
    // Show opponent's flag at bottom
    if (nodeData.opponent) {
      displayFlag(
        losingFlagsGroup,
        allGroups,
        nodeData.opponent.nationalityCode,
        1,
        false,
        hoverFlagRadius,
        hoverFlagSize
      );
    }
  }

  // Arc mouseout handler
  function handleArcMouseout(_event: MouseEvent, d: HierarchyRectangularNode<HierarchyNode>) {
    if (frozen) {
      // Restore the segment to its frozen-state opacity
      const isSearchedPlayer = d.data.participantName?.toLowerCase() === frozenPlayerName?.toLowerCase();
      select(_event.currentTarget as SVGPathElement).attr(ATTR_FILL_OPACITY, isSearchedPlayer ? 1 : 0.2);
    } else {
      g.selectAll('path').attr(ATTR_FILL_OPACITY, 0.8);
    }
    displayAllFlags();
    displayTournamentTitle();
  }

  // Arc click handler
  const clickSegment = options.eventHandlers?.clickSegment;
  function handleArcClick(_event: MouseEvent, d: HierarchyRectangularNode<HierarchyNode>) {
    if (!clickSegment) return;
    const nodeData = d.data;
    clickSegment({
      participantName: nodeData.participantName,
      drawPosition: nodeData.drawPosition,
      seedNumber: nodeData.seedNumber,
      entryStatus: nodeData.entryStatus,
      nationalityCode: nodeData.nationalityCode,
      scoreString: nodeData.scoreString,
      matchUpStatus: nodeData.matchUpStatus,
      roundName: nodeData.roundName,
      depth: nodeData.depth,
      matchUp: nodeData.matchUp
    });
  }

  // Render sunburst
  const paths = g
    .selectAll<SVGPathElement, HierarchyRectangularNode<HierarchyNode>>('path')
    .data(descendants)
    .join('path')
    .attr('d', (d) => arc(d))
    .attr('fill', (d) => d.data.color || '#ccc')
    .attr(ATTR_FILL_OPACITY, 0.8)
    .attr('stroke', '#fff')
    .attr('stroke-width', 1)
    .on('mouseover', handleArcMouseover)
    .on('mouseout', handleArcMouseout);

  if (clickSegment) {
    paths.style('cursor', 'pointer').on('click', handleArcClick);
  }

  paths.append('title').text((node: any) => {
    const nodeData = node.data;
    if (nodeData.participantName) {
      return `${nodeData.participantName}\nDraw: ${nodeData.drawPosition || 'N/A'}`;
    }
    return `${nodeData.name}\nDepth: ${node.depth}`;
  });

  // ============================================================================
  // Instance methods for cross-chart coordination (player search)
  // ============================================================================

  function highlightPlayer(playerName?: string): number {
    let highlighted = 0;

    frozen = !!playerName;
    frozenPlayerName = playerName;

    g.selectAll<SVGPathElement, HierarchyRectangularNode<HierarchyNode>>('path').attr(ATTR_FILL_OPACITY, (p: any) => {
      if (!playerName) return 0.8;
      if (p.data.participantName?.toLowerCase() === playerName.toLowerCase()) {
        highlighted += 1;
        return 1;
      }
      return 0.2;
    });

    return highlighted;
  }

  function hide(hidden: boolean): void {
    svg.style('display', hidden ? 'none' : 'block');
  }

  return { highlightPlayer, hide };
}

/**
 * Factory function to create a burst chart renderer.
 * Accepts either SunburstDrawData (new) or TournamentDraw (legacy, auto-converted).
 */
export function burstChart(options: BurstChartOptions = {}) {
  return {
    render: (container: HTMLElement, drawData: SunburstDrawData, title: string): BurstChartInstance => {
      return renderburstChart(container, drawData, title, options);
    }
  };
}

function isoToFlag(isoCode: string): string {
  if (isoCode?.length !== 2) return '';

  // Convert each letter to regional indicator symbol
  // A = 0x41 → 🇦 = 0x1F1E6 (offset = 0x1F1A5)
  return isoCode && String.fromCodePoint !== undefined
    ? isoCode.toUpperCase().replaceAll(/./g, (char) => String.fromCodePoint((char.codePointAt(0) ?? 0) + 127397))
    : isoCode;
}

/**
 * Convert IOC code to emoji flag
 * Matches fixtures.flagISO() from tods-competition-factory
 * @param ioc - IOC nationality code (e.g., "SRB", "GBR", "SUI")
 * @returns Emoji flag
 */
export function flagISO(ioc: string): string {
  const iso2 = ioc2iso2[ioc] || ioc; // Fallback to ioc if not found
  return isoToFlag(iso2);
}
