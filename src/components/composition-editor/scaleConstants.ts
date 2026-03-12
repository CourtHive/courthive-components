/** Known rating/ranking scale definitions for the composition editor */
export interface ScaleDef {
  scaleName: string;
  accessor: string;
  label: string;
}

export const KNOWN_SCALES: ScaleDef[] = [
  { scaleName: 'WTN', accessor: 'wtnRating', label: 'WTN' },
  { scaleName: 'UTR', accessor: 'utrRating', label: 'UTR' },
  { scaleName: 'NTRP', accessor: 'ntrpRating', label: 'NTRP' },
  { scaleName: 'ELO', accessor: 'eloRating', label: 'ELO' },
];
