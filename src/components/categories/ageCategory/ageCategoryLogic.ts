/**
 * Pure logic functions for Age Category Code parsing, validation, and generation.
 * Supports ITF TODS standard age category codes.
 */

const SIMPLE_UNDER = 'Simple Under';
const SIMPLE_OVER = 'Simple Over';

export interface ParsedAgeCategory {
  type: 'under' | 'over' | 'range' | 'combined' | 'open';
  ageValue?: number; // For simple under/over
  ageMin?: number; // For ranges and combined
  ageMax?: number; // For ranges and combined
  uPosition?: 'pre' | 'post'; // U18 vs 18U
  oPosition?: 'pre' | 'post'; // O10 vs 10O
  isCombined?: boolean; // C prefix
  rangeOrder?: 'max-min' | 'min-max'; // For preserving order in ranges like U18-10O vs 10O-18U
}

export interface AgeCategoryCodeConfig {
  type: 'under' | 'over' | 'range' | 'combined' | 'open';
  ageValue?: number;
  ageMin?: number;
  ageMax?: number;
  uPosition?: 'pre' | 'post';
  oPosition?: 'pre' | 'post';
  isCombined?: boolean;
  rangeOrder?: 'max-min' | 'min-max';
}

/**
 * Parse an age category code into its component parts
 */
export function parseAgeCategoryCode(code: string): ParsedAgeCategory | null {
  if (!code) return null;

  const upperCode = code.trim().toUpperCase();

  if (upperCode === 'OPEN') {
    return { type: 'open' };
  }

  const combinedMatch = upperCode.match(/^C(\d{1,2})-(\d{1,2})$/);
  if (combinedMatch) {
    const [, min, max] = combinedMatch;
    return {
      type: 'combined',
      ageMin: Number.parseInt(min, 10),
      ageMax: Number.parseInt(max, 10),
      isCombined: true
    };
  }

  if (upperCode.includes('-')) {
    const rangeResult = parseRangeCode(upperCode);
    if (rangeResult) return rangeResult;
  }

  return parseSimpleCode(upperCode);
}

function parseUnderPart(part: string): { age: number; position: 'pre' | 'post' } | undefined {
  if (!part.startsWith('U') && !part.endsWith('U')) return undefined;
  const match = part.match(/^U?(\d{1,2})U?$/);
  if (!match) return undefined;
  const age = Number.parseInt(match[1], 10);
  const position: 'pre' | 'post' = part.startsWith('U') ? 'pre' : 'post';
  return { age, position };
}

function parseOverPart(part: string): { age: number; position: 'pre' | 'post' } | undefined {
  if (!part.startsWith('O') && !part.endsWith('O')) return undefined;
  const match = part.match(/^O?(\d{1,2})O?$/);
  if (!match) return undefined;
  const age = Number.parseInt(match[1], 10);
  const position: 'pre' | 'post' = part.startsWith('O') ? 'pre' : 'post';
  return { age, position };
}

function parseRangeCode(upperCode: string): ParsedAgeCategory | null {
  const parts = upperCode.split('-');
  if (parts.length !== 2) return null;

  const [part1, part2] = parts;
  let ageMin: number | undefined;
  let ageMax: number | undefined;
  let uPosition: 'pre' | 'post' | undefined;
  let oPosition: 'pre' | 'post' | undefined;
  let rangeOrder: 'max-min' | 'min-max' | undefined;

  const under1 = parseUnderPart(part1);
  const over1 = parseOverPart(part1);

  if (under1) {
    rangeOrder = 'max-min';
    ageMax = under1.position === 'pre' ? under1.age - 1 : under1.age;
    uPosition = under1.position;
  } else if (over1) {
    rangeOrder = 'min-max';
    ageMin = over1.position === 'pre' ? over1.age + 1 : over1.age;
    oPosition = over1.position;
  }

  const under2 = parseUnderPart(part2);
  const over2 = parseOverPart(part2);

  if (under2) {
    ageMax = under2.position === 'pre' ? under2.age - 1 : under2.age;
    uPosition = under2.position;
  } else if (over2) {
    ageMin = over2.position === 'pre' ? over2.age + 1 : over2.age;
    oPosition = over2.position;
  }

  if (ageMin !== undefined || ageMax !== undefined) {
    return {
      type: 'range',
      ageMin,
      ageMax,
      uPosition,
      oPosition,
      rangeOrder
    };
  }

  return null;
}

function parseSimpleCode(upperCode: string): ParsedAgeCategory | null {
  const underMatch = upperCode.match(/^U(\d{1,2})$|^(\d{1,2})U$/);
  if (underMatch) {
    const age = Number.parseInt(underMatch[1] || underMatch[2], 10);
    const uPosition: 'pre' | 'post' = underMatch[1] ? 'pre' : 'post';
    return {
      type: 'under',
      ageValue: age,
      uPosition
    };
  }

  const overMatch = upperCode.match(/^O(\d{1,2})$|^(\d{1,2})O$/);
  if (overMatch) {
    const age = Number.parseInt(overMatch[1] || overMatch[2], 10);
    const oPosition: 'pre' | 'post' = overMatch[1] ? 'pre' : 'post';
    return {
      type: 'over',
      ageValue: age,
      oPosition
    };
  }

  return null;
}

/**
 * Build an age category code from configuration
 */
export function buildAgeCategoryCode(config: AgeCategoryCodeConfig): string {
  const { type, ageValue, ageMin, ageMax, uPosition = 'post', oPosition = 'post', rangeOrder = 'min-max' } = config;

  if (type === 'open') {
    return 'OPEN';
  }

  if (type === 'combined' && ageMin !== undefined && ageMax !== undefined) {
    return `C${ageMin}-${ageMax}`;
  }

  if (type === 'under' && ageValue !== undefined) {
    return uPosition === 'pre' ? `U${ageValue}` : `${ageValue}U`;
  }

  if (type === 'over' && ageValue !== undefined) {
    return oPosition === 'pre' ? `O${ageValue}` : `${ageValue}O`;
  }

  if (type === 'range' && (ageMin !== undefined || ageMax !== undefined)) {
    // For ranges, we need to convert back to the original age value, not the calculated min/max
    // If uPosition is 'pre', we had U18 which means ageMax=17, so original age was 18
    // If uPosition is 'post', we had 18U which means ageMax=18, so original age was 18

    const maxPart =
      ageMax !== undefined && uPosition
        ? (() => {
            const originalAge = uPosition === 'pre' ? ageMax + 1 : ageMax;
            return uPosition === 'pre' ? `U${originalAge}` : `${originalAge}U`;
          })()
        : null;

    const minPart =
      ageMin !== undefined && oPosition
        ? (() => {
            const originalAge = oPosition === 'pre' ? ageMin - 1 : ageMin;
            return oPosition === 'pre' ? `O${originalAge}` : `${originalAge}O`;
          })()
        : null;

    // Preserve original order
    if (rangeOrder === 'max-min') {
      // U18-10O format
      return [maxPart, minPart].filter(Boolean).join('-');
    } else {
      // 10O-18U format (default)
      return [minPart, maxPart].filter(Boolean).join('-');
    }
  }

  return '';
}

/**
 * Get age options for dropdowns
 */
export function getAgeOptions(): number[] {
  return [8, 10, 12, 14, 16, 18, 21, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90];
}

/**
 * Get category type options
 */
export function getCategoryTypeOptions(): string[] {
  return [SIMPLE_UNDER, SIMPLE_OVER, 'Range', 'Combined', 'Open'];
}

/**
 * Convert category type to internal type
 */
export function categoryTypeToInternal(categoryType: string): ParsedAgeCategory['type'] {
  switch (categoryType) {
    case SIMPLE_UNDER:
      return 'under';
    case SIMPLE_OVER:
      return 'over';
    case 'Range':
      return 'range';
    case 'Combined':
      return 'combined';
    case 'Open':
      return 'open';
    default:
      return 'open';
  }
}

/**
 * Convert internal type to category type label
 */
export function internalToCategory(type: ParsedAgeCategory['type']): string {
  switch (type) {
    case 'under':
      return SIMPLE_UNDER;
    case 'over':
      return SIMPLE_OVER;
    case 'range':
      return 'Range';
    case 'combined':
      return 'Combined';
    case 'open':
      return 'Open';
    default:
      return 'Open';
  }
}

/**
 * Get default predefined age category codes
 */
export function getDefaultPredefinedCodes(): Array<{ code: string; text: string }> {
  return [
    { code: 'OPEN', text: 'Open (No age limit)' },
    { code: '8U', text: '8 and Under' },
    { code: '10U', text: '10 and Under' },
    { code: '12U', text: '12 and Under' },
    { code: '14U', text: '14 and Under' },
    { code: '16U', text: '16 and Under' },
    { code: '18U', text: '18 and Under' },
    { code: '21U', text: '21 and Under' },
    { code: '30O', text: '30 and Over' },
    { code: '35O', text: '35 and Over' },
    { code: '40O', text: '40 and Over' },
    { code: '45O', text: '45 and Over' },
    { code: '50O', text: '50 and Over' },
    { code: '55O', text: '55 and Over' },
    { code: '60O', text: '60 and Over' },
    { code: '65O', text: '65 and Over' },
    { code: '70O', text: '70 and Over' },
    { code: '75O', text: '75 and Over' },
    { code: '80O', text: '80 and Over' }
  ];
}
