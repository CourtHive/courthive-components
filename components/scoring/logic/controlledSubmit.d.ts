/**
 * A CONTROLLED submission: a host's `onSubmit` that returns a promise.
 *
 * A host that sends the outcome somewhere that can refuse it — CFS's executionQueue, an engine that answers
 * `{ error }` — needs the dialog to stay open until it knows. Returning nothing keeps the old contract (the dialog
 * closes at once); returning a promise makes the card wait on it, and the dialog close only when it is accepted.
 *
 * A submission is REFUSED when the promise rejects, or when it fulfils with a value carrying a truthy `error` — the
 * factory's own result shape, so `tournamentEngine.setMatchUpStatus(...)` can be returned as it is. Anything else is
 * accepted. These read the refusal's words; the card shows them.
 */
/** Whether a host's `onSubmit` returned something to wait on. */
export declare function isThenable(value: unknown): value is PromiseLike<unknown>;
/**
 * The refusal a fulfilled submission carries: `undefined` when it was accepted, otherwise its message (`''` when the
 * refusal gives none). `{ error }` is the factory's result shape; its `error` may be a string or an object with a
 * `message` or a `code`.
 */
export declare function refusalOf(value: unknown): string | undefined;
/** The words of a rejection or an `error`: its message, its code, or itself when it is a string; else `''`. */
export declare function messageOf(reason: unknown): string;
