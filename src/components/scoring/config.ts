/**
 * Scoring configuration for courthive-components
 * This provides a simple configuration object that can be modified by consumers
 */

export interface ScoringConfig {
  scoringApproach?: 'freeScore' | 'dynamicSets' | 'dialPad';
  smartComplements?: boolean;
  composition?: string; // Composition name: 'Australian', 'Basic', 'French', 'Wimbledon', 'US Open', 'ITF', 'National', 'Night'
  idiom?: string;
  dateFormat?: string;
  timeFormat?: string;
}

// Default configuration
const defaultConfig: ScoringConfig = {
  scoringApproach: 'dynamicSets',
  smartComplements: false,
  composition: 'Australian',
  idiom: 'en',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: 'HH:mm',
};

// Internal config state
let currentConfig: ScoringConfig = { ...defaultConfig };

/**
 * Get current scoring configuration
 */
export function getScoringConfig(): ScoringConfig {
  return { ...currentConfig };
}

/**
 * Set scoring configuration (can be partial)
 */
export function setScoringConfig(config: Partial<ScoringConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Reset configuration to defaults
 */
export function resetScoringConfig(): void {
  currentConfig = { ...defaultConfig };
}

/**
 * Stub for loadSettings (for compatibility with TMX code)
 */
export function loadSettings(): any {
  return {
    scoringApproach: currentConfig.scoringApproach,
    smartComplements: currentConfig.smartComplements,
    composition: currentConfig.composition,
  };
}
