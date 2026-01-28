import { describe, it, expect } from 'vitest';
import {
  parseAgeCategoryCode,
  buildAgeCategoryCode,
  categoryTypeToInternal,
  internalToCategory,
  getAgeOptions,
  getCategoryTypeOptions,
  getDefaultPredefinedCodes,
} from '../ageCategoryLogic';

describe('parseAgeCategoryCode', () => {
  it('should parse OPEN category', () => {
    const result = parseAgeCategoryCode('OPEN');
    expect(result).toEqual({ type: 'open' });
  });

  it('should parse OPEN category case-insensitively', () => {
    const result = parseAgeCategoryCode('open');
    expect(result).toEqual({ type: 'open' });
  });

  it('should parse simple under with U prefix: U18', () => {
    const result = parseAgeCategoryCode('U18');
    expect(result).toEqual({
      type: 'under',
      ageValue: 18,
      uPosition: 'pre',
    });
  });

  it('should parse simple under with U suffix: 18U', () => {
    const result = parseAgeCategoryCode('18U');
    expect(result).toEqual({
      type: 'under',
      ageValue: 18,
      uPosition: 'post',
    });
  });

  it('should parse simple over with O prefix: O10', () => {
    const result = parseAgeCategoryCode('O10');
    expect(result).toEqual({
      type: 'over',
      ageValue: 10,
      oPosition: 'pre',
    });
  });

  it('should parse simple over with O suffix: 10O', () => {
    const result = parseAgeCategoryCode('10O');
    expect(result).toEqual({
      type: 'over',
      ageValue: 10,
      oPosition: 'post',
    });
  });

  it('should parse combined format: C50-70', () => {
    const result = parseAgeCategoryCode('C50-70');
    expect(result).toEqual({
      type: 'combined',
      ageMin: 50,
      ageMax: 70,
      isCombined: true,
    });
  });

  it('should parse range with under-over: U18-10O', () => {
    const result = parseAgeCategoryCode('U18-10O');
    expect(result).toEqual({
      type: 'range',
      ageMin: 10,
      ageMax: 17,
      uPosition: 'pre',
      oPosition: 'post',
      rangeOrder: 'max-min',
    });
  });

  it('should parse range with over-under: 10O-18U', () => {
    const result = parseAgeCategoryCode('10O-18U');
    expect(result).toEqual({
      type: 'range',
      ageMin: 10,
      ageMax: 18,
      uPosition: 'post',
      oPosition: 'post',
      rangeOrder: 'min-max',
    });
  });

  it('should return null for invalid codes', () => {
    expect(parseAgeCategoryCode('')).toBeNull();
    expect(parseAgeCategoryCode('INVALID')).toBeNull();
    expect(parseAgeCategoryCode('X18')).toBeNull();
  });

  it('should handle single digit ages', () => {
    const result = parseAgeCategoryCode('8U');
    expect(result).toEqual({
      type: 'under',
      ageValue: 8,
      uPosition: 'post',
    });
  });

  it('should handle two digit ages', () => {
    const result = parseAgeCategoryCode('80O');
    expect(result).toEqual({
      type: 'over',
      ageValue: 80,
      oPosition: 'post',
    });
  });
});

describe('buildAgeCategoryCode', () => {
  it('should build OPEN category', () => {
    const code = buildAgeCategoryCode({ type: 'open' });
    expect(code).toBe('OPEN');
  });

  it('should build simple under with pre position: U18', () => {
    const code = buildAgeCategoryCode({
      type: 'under',
      ageValue: 18,
      uPosition: 'pre',
    });
    expect(code).toBe('U18');
  });

  it('should build simple under with post position: 18U', () => {
    const code = buildAgeCategoryCode({
      type: 'under',
      ageValue: 18,
      uPosition: 'post',
    });
    expect(code).toBe('18U');
  });

  it('should default to post position for under', () => {
    const code = buildAgeCategoryCode({
      type: 'under',
      ageValue: 18,
    });
    expect(code).toBe('18U');
  });

  it('should build simple over with pre position: O10', () => {
    const code = buildAgeCategoryCode({
      type: 'over',
      ageValue: 10,
      oPosition: 'pre',
    });
    expect(code).toBe('O10');
  });

  it('should build simple over with post position: 10O', () => {
    const code = buildAgeCategoryCode({
      type: 'over',
      ageValue: 10,
      oPosition: 'post',
    });
    expect(code).toBe('10O');
  });

  it('should default to post position for over', () => {
    const code = buildAgeCategoryCode({
      type: 'over',
      ageValue: 10,
    });
    expect(code).toBe('10O');
  });

  it('should build combined format: C50-70', () => {
    const code = buildAgeCategoryCode({
      type: 'combined',
      ageMin: 50,
      ageMax: 70,
      isCombined: true,
    });
    expect(code).toBe('C50-70');
  });

  it('should build range with both ages', () => {
    const code = buildAgeCategoryCode({
      type: 'range',
      ageMin: 10,
      ageMax: 18,
      oPosition: 'post',
      uPosition: 'post',
    });
    expect(code).toBe('10O-18U');
  });

  it('should build range with only min age', () => {
    const code = buildAgeCategoryCode({
      type: 'range',
      ageMin: 10,
      oPosition: 'post',
    });
    expect(code).toBe('10O');
  });

  it('should build range with only max age', () => {
    const code = buildAgeCategoryCode({
      type: 'range',
      ageMax: 18,
      uPosition: 'post',
    });
    expect(code).toBe('18U');
  });

  it('should return empty string for incomplete config', () => {
    const code = buildAgeCategoryCode({
      type: 'under',
      // missing ageValue
    });
    expect(code).toBe('');
  });
});

describe('roundtrip parsing and building', () => {
  const testCases = [
    'OPEN',
    'U18',
    '18U',
    'O10',
    '10O',
    'C50-70',
    'U18-10O',
    '10O-18U',
  ];

  testCases.forEach((code) => {
    it(`should roundtrip: ${code}`, () => {
      const parsed = parseAgeCategoryCode(code);
      expect(parsed).not.toBeNull();
      if (parsed) {
        const rebuilt = buildAgeCategoryCode(parsed);
        expect(rebuilt).toBe(code);
      }
    });
  });
});

describe('categoryTypeToInternal', () => {
  it('should convert Simple Under', () => {
    expect(categoryTypeToInternal('Simple Under')).toBe('under');
  });

  it('should convert Simple Over', () => {
    expect(categoryTypeToInternal('Simple Over')).toBe('over');
  });

  it('should convert Range', () => {
    expect(categoryTypeToInternal('Range')).toBe('range');
  });

  it('should convert Combined', () => {
    expect(categoryTypeToInternal('Combined')).toBe('combined');
  });

  it('should convert Open', () => {
    expect(categoryTypeToInternal('Open')).toBe('open');
  });

  it('should default to open for unknown', () => {
    expect(categoryTypeToInternal('Unknown')).toBe('open');
  });
});

describe('internalToCategory', () => {
  it('should convert under', () => {
    expect(internalToCategory('under')).toBe('Simple Under');
  });

  it('should convert over', () => {
    expect(internalToCategory('over')).toBe('Simple Over');
  });

  it('should convert range', () => {
    expect(internalToCategory('range')).toBe('Range');
  });

  it('should convert combined', () => {
    expect(internalToCategory('combined')).toBe('Combined');
  });

  it('should convert open', () => {
    expect(internalToCategory('open')).toBe('Open');
  });
});

describe('getAgeOptions', () => {
  it('should return an array of ages', () => {
    const options = getAgeOptions();
    expect(Array.isArray(options)).toBe(true);
    expect(options.length).toBeGreaterThan(0);
    expect(options).toContain(18);
    expect(options).toContain(10);
  });

  it('should have ages in ascending order', () => {
    const options = getAgeOptions();
    for (let i = 1; i < options.length; i++) {
      expect(options[i]).toBeGreaterThan(options[i - 1]);
    }
  });
});

describe('getCategoryTypeOptions', () => {
  it('should return category type options', () => {
    const options = getCategoryTypeOptions();
    expect(Array.isArray(options)).toBe(true);
    expect(options).toContain('Simple Under');
    expect(options).toContain('Simple Over');
    expect(options).toContain('Range');
    expect(options).toContain('Combined');
    expect(options).toContain('Open');
  });
});

describe('getDefaultPredefinedCodes', () => {
  it('should return predefined codes', () => {
    const codes = getDefaultPredefinedCodes();
    expect(Array.isArray(codes)).toBe(true);
    expect(codes.length).toBeGreaterThan(0);
    expect(codes[0]).toHaveProperty('code');
    expect(codes[0]).toHaveProperty('text');
  });

  it('should include common age categories', () => {
    const codes = getDefaultPredefinedCodes();
    const codeTags = codes.map((c) => c.code);
    expect(codeTags).toContain('OPEN');
    expect(codeTags).toContain('18U');
    expect(codeTags).toContain('10U');
    expect(codeTags).toContain('35O');
  });
});
