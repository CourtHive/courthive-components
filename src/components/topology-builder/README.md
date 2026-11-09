# Fit proposals

Supply `drawFit`, `acceptance`, and `fitProposals` with `footer: true` to offer factory-backed alternatives in Fit mode. The host calls factory 7.34.0 `getDrawFitProposals` with its ranked entries and the current trial acceptance, then maps factory entry statuses into `EntryChange` values (`participantId`, `from`, `to`). Return `{ proposals, error? }`; each proposal carries its actual `fit` and consequence counts.

The footer Fit button opens Cut, Grow and Feed-in option cards. Choosing one previews its main size/type and qualifier count, moves the acceptance line where representable, and preserves exact pending changes including wildcards. `getEntryChanges()` supplies those changes to Generate. Moving the acceptance line or Discard clears the proposal override. Existing qualifying entries are preserved. Grow can remain SHORT; extra BYEs are shown explicitly.

The main card also offers a Feed-in toggle between single elimination and feed-in. The builder changes only local state. The host owns all persistence and must apply pending entry changes and draw generation atomically. TMX uses its existing mutation request for that operation. Read-only builders expose neither proposals nor levers. Sanction limits are enforced by the factory query and generation; this API supplies no override permission.
