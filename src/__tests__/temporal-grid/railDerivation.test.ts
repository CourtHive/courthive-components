/**
 * Rail Derivation Algorithm Tests
 * 
 * Test suite for the sweep-line algorithm that converts overlapping blocks
 * into non-overlapping rail segments with status resolution.
 */

import { describe, it, expect } from 'vitest';
import type { Block, BlockType, EngineConfig, TimeRange } from '../../components/temporal-grid/engine/types';
import {
  buildDayRange,
  clampToDayRange,
  courtDayKey,
  deriveRailSegments,
  diffMinutes,
  extractDay,
  mergeAdjacentSegments,
  overlappingRange,
  rangesOverlap,
  resolveStatus,
  validateSegments,
} from '../../components/temporal-grid/engine/railDerivation';

// ============================================================================
// Test Fixtures
// ============================================================================

const mockConfig: EngineConfig = {
  tournamentId: 'test-tournament',
  dayStartTime: '06:00',
  dayEndTime: '23:00',
  slotMinutes: 15,
  typePrecedence: [
    'HARD_BLOCK',
    'LOCKED',
    'MAINTENANCE',
    'BLOCKED',
    'PRACTICE',
    'RESERVED',
    'SOFT_BLOCK',
    'AVAILABLE',
    'UNSPECIFIED',
  ],
};

const mockCourt = {
  tournamentId: 'test-tournament',
  facilityId: 'facility-1',
  courtId: 'court-1',
};

function createBlock(
  id: string,
  start: string,
  end: string,
  type: BlockType = 'AVAILABLE',
): Block {
  return {
    id,
    court: mockCourt,
    start,
    end,
    type,
  };
}

// ============================================================================
// Utility Functions Tests
// ============================================================================

describe('courtDayKey', () => {
  it('should generate consistent keys', () => {
    const key1 = courtDayKey(mockCourt, '2026-06-15');
    const key2 = courtDayKey(mockCourt, '2026-06-15');
    expect(key1).toBe(key2);
    expect(key1).toContain('test-tournament');
    expect(key1).toContain('facility-1');
    expect(key1).toContain('court-1');
    expect(key1).toContain('2026-06-15');
  });

  it('should generate different keys for different days', () => {
    const key1 = courtDayKey(mockCourt, '2026-06-15');
    const key2 = courtDayKey(mockCourt, '2026-06-16');
    expect(key1).not.toBe(key2);
  });
});

describe('extractDay', () => {
  it('should extract day from ISO datetime', () => {
    expect(extractDay('2026-06-15T10:30:00')).toBe('2026-06-15');
    expect(extractDay('2026-06-15T00:00:00')).toBe('2026-06-15');
    expect(extractDay('2026-12-31T23:59:59')).toBe('2026-12-31');
  });
});

describe('buildDayRange', () => {
  it('should build correct day range from config', () => {
    const range = buildDayRange('2026-06-15', mockConfig);
    expect(range.start).toBe('2026-06-15T06:00:00');
    expect(range.end).toBe('2026-06-15T23:00:00');
  });
});

describe('diffMinutes', () => {
  it('should calculate minute difference', () => {
    expect(diffMinutes('2026-06-15T10:00:00', '2026-06-15T10:30:00')).toBe(30);
    expect(diffMinutes('2026-06-15T10:00:00', '2026-06-15T11:00:00')).toBe(60);
    expect(diffMinutes('2026-06-15T10:00:00', '2026-06-15T12:30:00')).toBe(150);
  });
});

describe('rangesOverlap', () => {
  it('should detect overlapping ranges', () => {
    const a: TimeRange = { start: '2026-06-15T10:00:00', end: '2026-06-15T12:00:00' };
    const b: TimeRange = { start: '2026-06-15T11:00:00', end: '2026-06-15T13:00:00' };
    expect(rangesOverlap(a, b)).toBe(true);
  });

  it('should detect non-overlapping ranges', () => {
    const a: TimeRange = { start: '2026-06-15T10:00:00', end: '2026-06-15T12:00:00' };
    const b: TimeRange = { start: '2026-06-15T12:00:00', end: '2026-06-15T14:00:00' };
    expect(rangesOverlap(a, b)).toBe(false);
  });

  it('should handle completely separate ranges', () => {
    const a: TimeRange = { start: '2026-06-15T10:00:00', end: '2026-06-15T11:00:00' };
    const b: TimeRange = { start: '2026-06-15T13:00:00', end: '2026-06-15T14:00:00' };
    expect(rangesOverlap(a, b)).toBe(false);
  });
});

describe('overlappingRange', () => {
  it('should compute overlapping portion', () => {
    const a: TimeRange = { start: '2026-06-15T10:00:00', end: '2026-06-15T12:00:00' };
    const b: TimeRange = { start: '2026-06-15T11:00:00', end: '2026-06-15T13:00:00' };
    const overlap = overlappingRange(a, b);
    expect(overlap.start).toBe('2026-06-15T11:00:00');
    expect(overlap.end).toBe('2026-06-15T12:00:00');
  });
});

describe('clampToDayRange', () => {
  const dayRange: TimeRange = {
    start: '2026-06-15T06:00:00',
    end: '2026-06-15T23:00:00',
  };

  it('should clamp block that starts before day', () => {
    const block = createBlock('1', '2026-06-15T05:00:00', '2026-06-15T10:00:00');
    const clamped = clampToDayRange(block, dayRange);
    expect(clamped?.start).toBe('2026-06-15T06:00:00');
    expect(clamped?.end).toBe('2026-06-15T10:00:00');
  });

  it('should clamp block that ends after day', () => {
    const block = createBlock('1', '2026-06-15T20:00:00', '2026-06-16T01:00:00');
    const clamped = clampToDayRange(block, dayRange);
    expect(clamped?.start).toBe('2026-06-15T20:00:00');
    expect(clamped?.end).toBe('2026-06-15T23:00:00');
  });

  it('should return null for block completely outside day', () => {
    const block = createBlock('1', '2026-06-14T10:00:00', '2026-06-14T12:00:00');
    const clamped = clampToDayRange(block, dayRange);
    expect(clamped).toBeNull();
  });

  it('should not modify block within day range', () => {
    const block = createBlock('1', '2026-06-15T10:00:00', '2026-06-15T12:00:00');
    const clamped = clampToDayRange(block, dayRange);
    expect(clamped?.start).toBe('2026-06-15T10:00:00');
    expect(clamped?.end).toBe('2026-06-15T12:00:00');
  });
});

// ============================================================================
// Status Resolution Tests
// ============================================================================

describe('resolveStatus', () => {
  const blocksById = new Map<string, Block>([
    ['1', createBlock('1', '2026-06-15T10:00:00', '2026-06-15T12:00:00', 'AVAILABLE')],
    ['2', createBlock('2', '2026-06-15T10:00:00', '2026-06-15T12:00:00', 'MAINTENANCE')],
    ['3', createBlock('3', '2026-06-15T10:00:00', '2026-06-15T12:00:00', 'HARD_BLOCK')],
  ]);

  it('should return UNSPECIFIED for empty contributing blocks', () => {
    const status = resolveStatus([], blocksById, mockConfig.typePrecedence);
    expect(status).toBe('UNSPECIFIED');
  });

  it('should return single block type', () => {
    const status = resolveStatus(['1'], blocksById, mockConfig.typePrecedence);
    expect(status).toBe('AVAILABLE');
  });

  it('should resolve precedence - HARD_BLOCK wins', () => {
    const status = resolveStatus(['1', '2', '3'], blocksById, mockConfig.typePrecedence);
    expect(status).toBe('HARD_BLOCK');
  });

  it('should resolve precedence - MAINTENANCE over AVAILABLE', () => {
    const status = resolveStatus(['1', '2'], blocksById, mockConfig.typePrecedence);
    expect(status).toBe('MAINTENANCE');
  });
});

// ============================================================================
// Segment Merging Tests
// ============================================================================

describe('mergeAdjacentSegments', () => {
  it('should merge adjacent segments with same status', () => {
    const segments = [
      {
        start: '2026-06-15T10:00:00',
        end: '2026-06-15T11:00:00',
        status: 'AVAILABLE' as BlockType,
        contributingBlocks: ['1'],
      },
      {
        start: '2026-06-15T11:00:00',
        end: '2026-06-15T12:00:00',
        status: 'AVAILABLE' as BlockType,
        contributingBlocks: ['1'],
      },
    ];

    const merged = mergeAdjacentSegments(segments);
    expect(merged).toHaveLength(1);
    expect(merged[0].start).toBe('2026-06-15T10:00:00');
    expect(merged[0].end).toBe('2026-06-15T12:00:00');
    expect(merged[0].status).toBe('AVAILABLE');
  });

  it('should not merge segments with different status', () => {
    const segments = [
      {
        start: '2026-06-15T10:00:00',
        end: '2026-06-15T11:00:00',
        status: 'AVAILABLE' as BlockType,
        contributingBlocks: ['1'],
      },
      {
        start: '2026-06-15T11:00:00',
        end: '2026-06-15T12:00:00',
        status: 'BLOCKED' as BlockType,
        contributingBlocks: ['2'],
      },
    ];

    const merged = mergeAdjacentSegments(segments);
    expect(merged).toHaveLength(2);
  });

  it('should not merge non-adjacent segments', () => {
    const segments = [
      {
        start: '2026-06-15T10:00:00',
        end: '2026-06-15T11:00:00',
        status: 'AVAILABLE' as BlockType,
        contributingBlocks: ['1'],
      },
      {
        start: '2026-06-15T11:30:00',
        end: '2026-06-15T12:00:00',
        status: 'AVAILABLE' as BlockType,
        contributingBlocks: ['1'],
      },
    ];

    const merged = mergeAdjacentSegments(segments);
    expect(merged).toHaveLength(2);
  });
});

// ============================================================================
// Rail Derivation Tests
// ============================================================================

describe('deriveRailSegments', () => {
  const dayRange: TimeRange = {
    start: '2026-06-15T06:00:00',
    end: '2026-06-15T23:00:00',
  };

  it('should handle empty blocks', () => {
    const segments = deriveRailSegments([], dayRange, mockConfig);
    expect(segments).toHaveLength(1);
    expect(segments[0].status).toBe('UNSPECIFIED');
    expect(segments[0].start).toBe(dayRange.start);
    expect(segments[0].end).toBe(dayRange.end);
  });

  it('should create single segment for single block', () => {
    const blocks = [createBlock('1', '2026-06-15T10:00:00', '2026-06-15T12:00:00', 'AVAILABLE')];
    const segments = deriveRailSegments(blocks, dayRange, mockConfig);

    // Should have 3 segments: before, during, after
    expect(segments).toHaveLength(3);
    expect(segments[0].status).toBe('UNSPECIFIED');
    expect(segments[1].status).toBe('AVAILABLE');
    expect(segments[2].status).toBe('UNSPECIFIED');
  });

  it('should handle overlapping blocks with precedence', () => {
    const blocks = [
      createBlock('1', '2026-06-15T10:00:00', '2026-06-15T14:00:00', 'AVAILABLE'),
      createBlock('2', '2026-06-15T12:00:00', '2026-06-15T16:00:00', 'MAINTENANCE'),
    ];
    const segments = deriveRailSegments(blocks, dayRange, mockConfig);

    // Find the overlap segment (12:00-14:00)
    const overlapSegment = segments.find(
      (s) => s.start === '2026-06-15T12:00:00' && s.end === '2026-06-15T14:00:00',
    );
    expect(overlapSegment).toBeDefined();
    expect(overlapSegment?.status).toBe('MAINTENANCE'); // Higher precedence
    expect(overlapSegment?.contributingBlocks).toHaveLength(2);
  });

  it('should handle adjacent non-overlapping blocks', () => {
    const blocks = [
      createBlock('1', '2026-06-15T10:00:00', '2026-06-15T12:00:00', 'AVAILABLE'),
      createBlock('2', '2026-06-15T12:00:00', '2026-06-15T14:00:00', 'BLOCKED'),
    ];
    const segments = deriveRailSegments(blocks, dayRange, mockConfig);

    const availableSegment = segments.find((s) => s.status === 'AVAILABLE');
    const blockedSegment = segments.find((s) => s.status === 'BLOCKED');

    expect(availableSegment).toBeDefined();
    expect(blockedSegment).toBeDefined();
    expect(availableSegment?.end).toBe(blockedSegment?.start);
  });

  it('should handle adjacent blocks with same status (but different IDs)', () => {
    const blocks = [
      createBlock('1', '2026-06-15T10:00:00', '2026-06-15T11:00:00', 'AVAILABLE'),
      createBlock('2', '2026-06-15T11:00:00', '2026-06-15T12:00:00', 'AVAILABLE'),
    ];
    const segments = deriveRailSegments(blocks, dayRange, mockConfig);

    // Two separate blocks = two separate segments (even with same status)
    // because contributing blocks are different
    const availableSegments = segments.filter((s) => s.status === 'AVAILABLE');
    expect(availableSegments).toHaveLength(2);
    expect(availableSegments[0].contributingBlocks).toEqual(['1']);
    expect(availableSegments[1].contributingBlocks).toEqual(['2']);
  });

  it('should handle complex overlapping scenario', () => {
    const blocks = [
      createBlock('1', '2026-06-15T08:00:00', '2026-06-15T18:00:00', 'AVAILABLE'),
      createBlock('2', '2026-06-15T10:00:00', '2026-06-15T12:00:00', 'MAINTENANCE'),
      createBlock('3', '2026-06-15T11:00:00', '2026-06-15T13:00:00', 'HARD_BLOCK'),
      createBlock('4', '2026-06-15T14:00:00', '2026-06-15T16:00:00', 'PRACTICE'),
    ];
    const segments = deriveRailSegments(blocks, dayRange, mockConfig);

    // Validate structure
    expect(validateSegments(segments)).toBe(true);

    // Check that HARD_BLOCK wins during 11:00-12:00
    const hardBlockSegment = segments.find(
      (s) => s.start === '2026-06-15T11:00:00' && s.end === '2026-06-15T12:00:00',
    );
    expect(hardBlockSegment?.status).toBe('HARD_BLOCK');
  });

  it('should clamp blocks to day range', () => {
    const blocks = [
      createBlock('1', '2026-06-15T05:00:00', '2026-06-15T10:00:00', 'AVAILABLE'),
      createBlock('2', '2026-06-15T20:00:00', '2026-06-16T02:00:00', 'BLOCKED'),
    ];
    const segments = deriveRailSegments(blocks, dayRange, mockConfig);

    // First segment should start at day start
    expect(segments[0].start).toBe('2026-06-15T06:00:00');

    // Last segment should end at day end
    expect(segments[segments.length - 1].end).toBe('2026-06-15T23:00:00');

    // Validate overall structure
    expect(validateSegments(segments)).toBe(true);
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('validateSegments', () => {
  it('should validate properly ordered segments', () => {
    const segments = [
      {
        start: '2026-06-15T10:00:00',
        end: '2026-06-15T11:00:00',
        status: 'AVAILABLE' as BlockType,
        contributingBlocks: [],
      },
      {
        start: '2026-06-15T11:00:00',
        end: '2026-06-15T12:00:00',
        status: 'BLOCKED' as BlockType,
        contributingBlocks: [],
      },
    ];
    expect(validateSegments(segments)).toBe(true);
  });

  it('should detect overlapping segments', () => {
    const segments = [
      {
        start: '2026-06-15T10:00:00',
        end: '2026-06-15T11:30:00',
        status: 'AVAILABLE' as BlockType,
        contributingBlocks: [],
      },
      {
        start: '2026-06-15T11:00:00',
        end: '2026-06-15T12:00:00',
        status: 'BLOCKED' as BlockType,
        contributingBlocks: [],
      },
    ];
    expect(validateSegments(segments)).toBe(false);
  });

  it('should detect gaps in segments', () => {
    const segments = [
      {
        start: '2026-06-15T10:00:00',
        end: '2026-06-15T11:00:00',
        status: 'AVAILABLE' as BlockType,
        contributingBlocks: [],
      },
      {
        start: '2026-06-15T11:30:00',
        end: '2026-06-15T12:00:00',
        status: 'BLOCKED' as BlockType,
        contributingBlocks: [],
      },
    ];
    expect(validateSegments(segments)).toBe(false);
  });

  it('should detect invalid time ranges', () => {
    const segments = [
      {
        start: '2026-06-15T11:00:00',
        end: '2026-06-15T10:00:00', // end before start
        status: 'AVAILABLE' as BlockType,
        contributingBlocks: [],
      },
    ];
    expect(validateSegments(segments)).toBe(false);
  });
});
