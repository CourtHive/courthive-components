/**
 * Pure logic functions for Age Category Code parsing, validation, and generation.
 * Supports ITF TODS standard age category codes.
 */

export interface ParsedAgeCategory {
  type: 'under' | 'over' | 'range' | 'combined' | 'open';
  ageValue?: number;      // For simple under/over
  ageMin?: number;        // For ranges and combined
  ageMax?: number;        // For ranges and combined
  uPosition?: 'pre' | 'post';  // U18 vs 18U
  oPosition?: 'pre' | 'post';  // O10 vs 10O
  isCombined?: boolean;        // C prefix
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

  // OPEN category
  if (upperCode === 'OPEN') {
    return { type: 'open' };
  }

  // Combined format: C50-70
  const combinedMatch = upperCode.match(/^C(\d{1,2})-(\d{1,2})$/);
  if (combinedMatch) {
    const [, min, max] = combinedMatch;
    return {
      type: 'combined',
      ageMin: parseInt(min, 10),
      ageMax: parseInt(max, 10),
      isCombined: true,
    };
  }

  // Range format: U18-10O or 10O-18U
  if (upperCode.includes('-')) {
    const parts = upperCode.split('-');
    if (parts.length === 2) {
      const part1 = parts[0];
      const part2 = parts[1];

      let ageMin: number | undefined;
      let ageMax: number | undefined;
      let uPosition: 'pre' | 'post' | undefined;
      let oPosition: 'pre' | 'post' | undefined;
      let rangeOrder: 'max-min' | 'min-max' | undefined;

      // Parse first part
      const match1U = part1.match(/^U?(\d{1,2})U?$/);
      const match1O = part1.match(/^O?(\d{1,2})O?$/);

      // Parse second part
      const match2U = part2.match(/^U?(\d{1,2})U?$/);
      const match2O = part2.match(/^O?(\d{1,2})O?$/);

      // Determine order: if first part is U/under, order is max-min
      // If first part is O/over, order is min-max
      if (part1.startsWith('U') || part1.endsWith('U')) {
        rangeOrder = 'max-min';
      } else if (part1.startsWith('O') || part1.endsWith('O')) {
        rangeOrder = 'min-max';
      }

      // First part is Under (sets max)
      if (part1.startsWith('U') || part1.endsWith('U')) {
        if (match1U) {
          const age = parseInt(match1U[1], 10);
          ageMax = part1.startsWith('U') ? age - 1 : age; // U18 = max 17, 18U = max 18
          uPosition = part1.startsWith('U') ? 'pre' : 'post';
        }
      }
      // First part is Over (sets min)
      else if (part1.startsWith('O') || part1.endsWith('O')) {
        if (match1O) {
          const age = parseInt(match1O[1], 10);
          ageMin = part1.startsWith('O') ? age + 1 : age; // O10 = min 11, 10O = min 10
          oPosition = part1.startsWith('O') ? 'pre' : 'post';
        }
      }

      // Second part is Under (sets max)
      if (part2.startsWith('U') || part2.endsWith('U')) {
        if (match2U) {
          const age = parseInt(match2U[1], 10);
          ageMax = part2.startsWith('U') ? age - 1 : age;
          uPosition = part2.startsWith('U') ? 'pre' : 'post';
        }
      }
      // Second part is Over (sets min)
      else if (part2.startsWith('O') || part2.endsWith('O')) {
        if (match2O) {
          const age = parseInt(match2O[1], 10);
          ageMin = part2.startsWith('O') ? age + 1 : age;
          oPosition = part2.startsWith('O') ? 'pre' : 'post';
        }
      }

      if (ageMin !== undefined || ageMax !== undefined) {
        return {
          type: 'range',
          ageMin,
          ageMax,
          uPosition,
          oPosition,
          rangeOrder,
        };
      }
    }
  }

  // Simple Under: U18 or 18U
  const underMatch = upperCode.match(/^U(\d{1,2})$|^(\d{1,2})U$/);
  if (underMatch) {
    const age = parseInt(underMatch[1] || underMatch[2], 10);
    const uPosition = underMatch[1] ? 'pre' : 'post'; // U18 = pre, 18U = post
    return {
      type: 'under',
      ageValue: age,
      uPosition,
    };
  }

  // Simple Over: O10 or 10O
  const overMatch = upperCode.match(/^O(\d{1,2})$|^(\d{1,2})O$/);
  if (overMatch) {
    const age = parseInt(overMatch[1] || overMatch[2], 10);
    const oPosition = overMatch[1] ? 'pre' : 'post'; // O10 = pre, 10O = post
    return {
      type: 'over',
      ageValue: age,
      oPosition,
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
    
    const maxPart = ageMax !== undefined && uPosition
      ? (() => {
          const originalAge = uPosition === 'pre' ? ageMax + 1 : ageMax;
          return uPosition === 'pre' ? `U${originalAge}` : `${originalAge}U`;
        })()
      : null;

    const minPart = ageMin !== undefined && oPosition
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
  return ['Simple Under', 'Simple Over', 'Range', 'Combined', 'Open'];
}

/**
 * Convert category type to internal type
 */
export function categoryTypeToInternal(categoryType: string): ParsedAgeCategory['type'] {
  switch (categoryType) {
    case 'Simple Under':
      return 'under';
    case 'Simple Over':
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
      return 'Simple Under';
    case 'over':
      return 'Simple Over';
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
    { code: '80O', text: '80 and Over' },
  ];
}
