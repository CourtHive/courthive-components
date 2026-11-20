# Operator presentation widgets

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
It is a **facet**, not a complete operator document: CFS must authorize/filter its input and wrap it with audience,
source revision and time validity. No raw record, action offers, readiness or rest calculation occurs here.
`fixtures.ts` is hand-written Storybook/test data and is absent from the public entry's graph.

## Verification and release dependency

`pnpm verify:operator` checks the DOM-free model, source graph, built renderer and public package entry. Its
negative controls plant the factory root, an existing engine-backed renderer, transport/storage code and DOM in
model logic. The current read-only entry allows **no factory runtime**; type imports erase. Adding score-entry
widgets later requires explicit qualification of their approved pure scoring subpath.

Storybook play functions use the trusted Playwright input helper. They cover keyboard focus/navigation, callbacks,
whole replacements, disposal, empty/unverified state, escaping, real light/dark palettes, phone widths and 44px controls.

This candidate depends on the **unreleased factory operator-types contract**. It was qualified using independently
installed packed candidates, not a sibling dist. The existing peer floor does not yet admit this new API on a fresh
published install: publish/qualify the factory change, then set its actual minimum version before merging/releasing
this consumer. The prototype does not imply that published factory 7.43.0 already contains operator-types.
