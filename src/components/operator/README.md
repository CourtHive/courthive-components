# Operator presentation widgets (unpublished candidate)

CMX's day and draw compositions now use the **same match-up card core** as the schedule catalog:
`../match-up-card/matchUpCard.ts`, with an isolated stylesheet and a shared status-label map.
The catalog adapter owns drag payloads, highlighting, completion decoration and extra content;
the core owns display and native keyboard activation. The operator adapter supplies ID-only tap intent,
per-side score cells, winner text and compact mode. It never imports the catalog's state or page styles.

```ts
import { createOperatorDraw } from 'courthive-components/operator';
import 'courthive-components/operator.css';

const handle = createOperatorDraw(presentation, {
  access: 'read-only',
  freshness: 'unverified',
  dayFrame,
  details,
  onOpenMatch: (matchUpId) => openMatchRoute(matchUpId)
});
container.append(handle.element);
handle.update(replacement, { freshness: 'current', updatedAt: serverDocumentBuiltAt });
handle.destroy();
```

Access and freshness are independent. The defaults are quiet **read-only** access and **unverified** freshness,
never a claim of current data. Pending projection is informational; stale/unknown outcomes request attention,
and unavailable/refused states have stronger treatment. The host owns state and the last-updated instant.
Each stateful page/draw keeps one persistent polite live region; updates change its text instead of replacing it.
This establishes the DOM prerequisites for announcements, not a claim of testing every screen reader.

## Display inputs and boundaries

`model.ts` contains DOM-free text, grouping, filtering and round selection. `render.ts` is a thin adapter over
shared cards; `page.ts` composes day controls. Direct round selection preserves supplied round identities.
Structure selection is still a known gap: one draw presentation describes one structure.

A day frame supplies one venue date, locale, IANA zone, human zone label, venue label and optional venue-clock
"now". The date is formatted without a browser-zone conversion. Matching rows omit repeated date/zone metadata;
the page shows the zone once. Missing time context is explicit. Different date/zone rows retain exception context.
"Jump to now" uses the supplied clock; it never infers the venue's time from the browser.

Day rows are whole native button targets when a host supplies an open handler. The host owns the route; no fake
href is invented. Court/time groups have sticky headings, natural court ordering and Ready/On court/Finished/Other
facets. Filters operate only on already delivered authorized rows. Incomplete collections say "delivered matches".
Unknown bucket membership goes to Other; TO_BE_PLAYED does **not** imply Ready.

`OperatorDetails` is an **unpublished UI-contract experiment**, separate from the existing factory DTO: title,
preformatted score columns, bucket membership and stable court-group identity are host-supplied display slots.
The stories hand-author these values. The factory/CFS contract must emit and audience-validate them before real
query integration. The browser neither splits score strings nor computes readiness, eligibility or actions.
Unsupported/unstructured scoring retains the producer's canonical score text. Upset facts are not rendered.

All names and labels use text nodes. Winner and score facts are included in accessible card names as well as
per-side rows. Configurable labels include the shared status map; unknown codes do not leak raw enum text.
Destroy clears the current document and disables retained open, navigation and refresh handlers.

## Stories and score-entry workflow preview

`Operator/Read-only surfaces` contains interactive visual examples. Automated play checks and the explicitly
labelled hostile-name security fixture live under hidden `!dev` test stories, so opening a showcase does not
resize the browser or complete its workflow. Security strings are not example participant names.

`Operator/Result entry preview/Record a result (interactive)` uses the **released**
`tods-competition-factory/score-entry-state` API. Its DOM-free story-host model calls canonical transitions,
validation, submission and outcome conversion. No scoring rules are copied. The small two-set tennis form is a
workflow prototype, not the general scoring modal or a released operator API.

The preview's simulation controls demonstrate Saving → Saved · updating views → Up to date, refusal with retained
entry, and unknown-outcome recovery by the original command ID without resubmission. Acceptance does not close
the modal; a sufficiently recent matching document does. The command/read/receipt ports are explicit simulations
of a prospective app-host contract, **not** implemented CFS/query routes or proof of server authorization/fences.
These story-only modules and the pure scoring package are absent from the production operator graph.

## Qualification and publication hold

The operator entry may import only its own production modules and the three explicitly approved shared-card
files. Its guard rejects root factory, engine-backed renderers, the entire scheduling adapter/page CSS,
transport, storage and telemetry, and demonstrates those failures with planted imports/calls.

This branch and its types remain unpublished/unmerged pending complete operator-document contract v1 and the
released producer dependency. No new factory API, package subpath or dependency version is introduced by this UX
revision. CMX's separate session foundation already tests local logout/provider/expiry cleanup; real query grant
revocation and operator delivery still require the live integration.
