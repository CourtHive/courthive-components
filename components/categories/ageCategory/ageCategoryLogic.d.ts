/**
 * Pure logic functions for Age Category Code parsing, validation, and generation.
 * Supports ITF TODS standard age category codes.
 */
export interface ParsedAgeCategory {
    type: 'under' | 'over' | 'range' | 'combined' | 'open';
    ageValue?: number;
    ageMin?: number;
    ageMax?: number;
    uPosition?: 'pre' | 'post';
    oPosition?: 'pre' | 'post';
    isCombined?: boolean;
    rangeOrder?: 'max-min' | 'min-max';
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
export declare function parseAgeCategoryCode(code: string): ParsedAgeCategory | null;
/**
 * Build an age category code from configuration
 */
export declare function buildAgeCategoryCode(config: AgeCategoryCodeConfig): string;
/**
 * Get age options for dropdowns
 */
export declare function getAgeOptions(): number[];
/**
 * Get category type options
 */
export declare function getCategoryTypeOptions(): string[];
/**
 * Convert category type to internal type
 */
export declare function categoryTypeToInternal(categoryType: string): ParsedAgeCategory['type'];
/**
 * Convert internal type to category type label
 */
export declare function internalToCategory(type: ParsedAgeCategory['type']): string;
/**
 * Get default predefined age category codes
 */
export declare function getDefaultPredefinedCodes(): Array<{
    code: string;
    text: string;
}>;
