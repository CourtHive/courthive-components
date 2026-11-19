/**
 * Keep the refusal visible even where the restricted status has been removed from the choices. The DOM half of
 * `statusScope.ts`, split from it so the sentences stay importable where there is no `document`.
 */
export declare function statusScopeNotice(disabledMatchUpStatuses?: readonly string[], labels?: Record<string, string>): HTMLElement;
