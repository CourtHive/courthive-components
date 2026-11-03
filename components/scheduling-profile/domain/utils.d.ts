import { RoundProfile, RoundLocator, RoundKey } from '../types';
export declare function deepClone<T>(obj: T): T;
export declare function clamp(n: number, lo: number, hi: number): number;
export declare function roundKeyString(r: RoundKey | RoundProfile): string;
export declare function roundLabel(r: RoundProfile): string;
export declare function sameLocator(a: RoundLocator | null, b: RoundLocator | null): boolean;
export declare function pickRoundKey(r: RoundProfile): RoundKey;
