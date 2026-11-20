# Operator presentation widgets (unpublished candidate)

Read-only match cards, match lists and round navigation for a thin client. The factory supplies the display facts;
components renders them. The app owns routing, session, query/command clients and document freshness.

```ts
import { createOperatorDraw } from 'courthive-components/operator';
import 'courthive-components/operator.css';
import type { OperatorDrawPresentation } from 'tods-competition-factory/operator-types';

const handle = createOperatorDraw(presentation, {
  phase: 'read-only',
  onOpenMatch: (matchUpId) => openMatchRoute(matchUpId)
});
container.append(handle.element);
// After the host verifies a whole replacement and its source/audience/time metadata:
handle.update(replacement, 'current');
// On route teardown:
handle.destroy();
```

The default phase is **read-only**, never a claim that a document is current. Callers may explicitly show
projection-pending, outcome-unknown, stale, current, read-only or unavailable. Those labels display host state;
components does not compare revisions, infer authorization, recover commands or run a projection fence.
`onOpenMatch` is navigation intent only, not a result/placement command or an eligibility decision.

`model.ts` contains the DOM-free selection/text logic. `render.ts` owns DOM creation, event binding and focus.
Round selection is reconciled by supplied round identity when a replacement arrives. Update replaces the whole
presentation; destroy clears the view and makes later updates inert. There are no global subscriptions or timers.
All supplied names use text nodes, including accessible button names. Labels are configurable.

The first producer-owned presentation contract supplies round order, score text, score presence and upset facts.
It is a **facet**, not a complete operator document: CFS supplies verified audience/scope; the factory minimizes
fields for that audience and the producer adds source revision and time validity. Query serves that exact authorized
variant without field stripping. No raw record, action offers, readiness or rest calculation occurs here.
`fixtures.ts` is hand-written Storybook/test data and is absent from the public entry's graph.

## Verification and release dependency

`pnpm verify:operator` checks the DOM-free model, source graph, built renderer and public package entry. Its
negative controls plant the factory root, an existing engine-backed renderer, transport/storage code and DOM in
model logic. The current read-only entry allows **no factory runtime**; type imports erase. Adding score-entry
widgets later requires explicit qualification of their approved pure scoring subpath.

Storybook play functions use the trusted Playwright input helper. They cover keyboard focus/navigation, callbacks,
whole replacements, disposal, empty/unverified state, escaping, real light/dark palettes, phone widths and 44px controls.
A 124-match fixture checks dense day rendering and first/last selection at 320/390/736px in both themes. It is
hand-written example DTO data repeated for density, not a live-day readiness or advancement benchmark.

This candidate depends on the **unreleased factory operator-types contract**. It was qualified using independently
installed packed candidates, not a sibling dist. The existing peer floor does not yet admit this new API on a fresh
published install: publish/qualify the factory change, then set its actual minimum version before merging/releasing
this consumer. The prototype does not imply that published factory 7.43.0 already contains operator-types.

Venue calendar dates use the configured locale (default `en-GB`), without converting the date through the browser
time zone. Match times show the producer-supplied venue IANA zone, or explicitly say that the zone is unavailable.
The supplied winner fact has screen-reader text as well as visual emphasis; the renderer never infers a winner.

W4/W6 began before complete operator-document contract v1. Keep this branch unpublished and unmerged until
that contract is reviewed and the producer version is available; do not release it with the independent constants work.

## Exposure and session boundary

Render only the factory-minimized DTO for the verified caller. Do not hide forbidden fields from a broader response.
The provisional `recorder`/`director` facets carry no contacts, birth dates or raw person records. Their role catalog
is experimental and still needs complete-document/audience sizing before publication.

The entry has no persistence, token handling, telemetry, toast or error-report sink. Its graph guard deliberately
plants IndexedDB, Cache Storage, service-worker, personal logging/error and transport code and rejects each.
Callbacks emit match IDs only. Destroying a view clears its DOM, releases its current DTO and disables retained
navigation/open/refresh handlers. Playwright checks disposal and ID-only intents; this is not a logout test.

The app shell must wipe protected documents/tokens on logout, provider change and expiry, across every storage
mechanism it uses, and test a deliberately retained payload/token once. Query must refuse a revoked grant even
when a document is cached. Those app/query integrations do not yet exist, so these acceptance gates stay open.
CMX is a separate static app with HiveID login; no app server or SSR is required. The preferred cookie mode still
needs coordinated HiveID/query/CFS support; the shipped mode must be recorded before rollout.
