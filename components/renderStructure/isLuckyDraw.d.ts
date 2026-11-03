import { RoundProfile } from 'tods-competition-factory';
interface IsLuckyDrawParams {
    roundsNotPowerOf2?: boolean;
    hasNoRoundPositions?: boolean;
    roundNumbers?: number[];
    roundProfile?: RoundProfile;
}
export declare function isLuckyDraw({ roundsNotPowerOf2, hasNoRoundPositions, roundNumbers, roundProfile }: IsLuckyDrawParams): boolean;
export {};
