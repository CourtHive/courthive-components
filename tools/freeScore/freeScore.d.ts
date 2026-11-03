/**
 * freeScore Parser
 *
 * Parses free-form score input using matchUpFormat context for intelligent interpretation.
 * Character-by-character state machine that handles ambiguous digit sequences.
 *
 * Goals:
 * - Accept any reasonable score notation (spaces, dashes, brackets optional)
 * - Use matchUpFormat to disambiguate (e.g., "123" → "12-3" vs "1-23" based on setTo)
 * - Provide confidence scores and suggestions for ambiguous inputs
 * - Give helpful error messages with position context
 * - Support incomplete scores (user typing in real-time)
 */
type ParsedFormat = any;
export interface ParsedSet {
    side1Score?: number;
    side2Score?: number;
    side1TiebreakScore?: number;
    side2TiebreakScore?: number;
    winningSide?: number;
    setNumber: number;
}
export interface ParserState {
    input: string;
    position: number;
    setIndex: number;
    currentSide1Buffer: string;
    currentSide2Buffer: string;
    currentTiebreakSide1Buffer: string;
    currentTiebreakSide2Buffer: string;
    sets: ParsedSet[];
    parsedFormat: ParsedFormat;
    state: TokenizerState;
    inTiebreak: boolean;
    expectingTiebreakOnly: boolean;
    irregularEnding?: string;
    irregularEndingPosition?: number;
    isValid: boolean;
    errors: ParseError[];
    warnings: string[];
    confidence: number;
    ambiguities: string[];
    suggestions: string[];
}
export declare enum TokenizerState {
    START = "START",
    PARSING_SIDE1 = "PARSING_SIDE1",
    PARSING_SIDE2 = "PARSING_SIDE2",
    PARSING_TIEBREAK_SIDE1 = "PARSING_TIEBREAK_SIDE1",
    PARSING_TIEBREAK_SIDE2 = "PARSING_TIEBREAK_SIDE2",
    SET_COMPLETE = "SET_COMPLETE",
    MATCH_COMPLETE = "MATCH_COMPLETE",
    ERROR = "ERROR"
}
export interface ParseError {
    position: number;
    message: string;
    expected?: string;
    got?: string;
    context?: string;
}
export interface ParseResult {
    valid: boolean;
    formattedScore: string;
    sets: ParsedSet[];
    confidence: number;
    errors: ParseError[];
    warnings: string[];
    ambiguities: string[];
    suggestions: string[];
    incomplete: boolean;
    matchComplete: boolean;
    matchUpStatus?: string;
}
/**
 * Parse free-form score string using matchUpFormat context
 */
export declare function parseScore(input: string, matchUpFormat: string | ParsedFormat): ParseResult;
export {};
