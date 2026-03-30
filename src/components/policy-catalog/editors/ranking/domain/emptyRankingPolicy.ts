/**
 * Factory function for creating a blank ranking policy.
 */
import type { RankingPolicyData } from '../types';

export function emptyRankingPolicy(): RankingPolicyData {
  return {
    policyName: 'New Ranking Policy',
    policyVersion: '1.0',
    awardProfiles: [
      {
        profileName: 'Default',
        finishingPositionRanges: {
          1: 100,
          2: 70,
          4: 50,
          8: 30,
          16: 15,
          32: 8,
        },
      },
    ],
    requireWinForPoints: true,
    doublesAttribution: 'fullToEach',
  };
}
