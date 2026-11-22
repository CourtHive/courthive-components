/** Display wording only. These labels never decide completion, readiness or available actions. */
export declare const matchUpStatusLabels: Readonly<Record<string, string>>;
export declare function matchUpStatusLabel(code: string | undefined, labels?: Readonly<Record<string, string>>, unknown?: string): string;
