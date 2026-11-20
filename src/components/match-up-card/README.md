# Shared matchUp card

Internal presentation primitive used by the scheduling catalog and future DTO renderers. It renders supplied
text, chips, time, sides and preformatted score cells. It imports no factory, transport or storage code.

An activation callback produces a native button; otherwise the card is an article. The catalog uses `activator: inner`: a draggable container holds the body button and sibling consumer extras, so their controls are never nested inside a button. Its accessible name uses
all visible content by default. A caller supplying `accessibleName` must include the same facts, including time,
court, status and score. Winner cues include screen-reader text as well as weight/color.

Catalog drag payloads, completion decoration, related highlighting and consumer extras remain in the schedule
adapter. Its legacy status text is preserved. Native dragging is verified with real pointer input and trusted
start/drop events in Chromium, Firefox and Playwright WebKit. That is an engine test, not a native Safari result.

`pnpm verify:catalog <baseline-ref> <evidence-directory>` builds the actual catalog with its original card/CSS
and the current adapter. It compares PNG bytes in both themes and checks native drops and accessible facts.
The extraction baseline is `02060a74`. CI compares against its checked-out parent. Test fixtures contain only
hand-written example names; no tournament records are captured.
