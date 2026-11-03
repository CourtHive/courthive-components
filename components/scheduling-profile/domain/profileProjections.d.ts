import { SchedulingProfile, RoundProfile, RoundKey, RoundLocator, ValidationResult, Severity } from '../types';
export declare function getVenueRounds(profile: SchedulingProfile, date: string, venueId: string): RoundProfile[];
export declare function getRoundAt(profile: SchedulingProfile, locator: RoundLocator): RoundProfile | null;
export declare function findIssuesForLocator(ruleResults: ValidationResult[], locator: RoundLocator): ValidationResult[];
export declare function maxSeverity(issues: ValidationResult[]): Severity | null;
export declare function findRoundInProfile(profile: SchedulingProfile, roundKey: RoundKey): RoundLocator | null;
