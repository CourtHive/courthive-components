# Composition controls and styling

A composition combines a theme, shared renderer configuration and optional color overrides. All built-in presets use the same renderer and editor controls. A preset selects defaults; it does not restrict the available controls. Loading a preset replaces the configuration and colors. Changing only the color theme keeps the display settings.

## Serving indicator

`configuration.serverIndicator` controls the dot marking the side serving the next point:

| Value                | Behavior                                                              |
| -------------------- | --------------------------------------------------------------------- |
| Absent or `false`    | Off                                                                   |
| `true` or `'column'` | Reserve an indicator column on both sides, filled on the serving side |
| `'name'`             | Append a dot after the serving side's name                            |

The host must supply `matchUp.serverSideNumber` as `1` or `2`. Missing or invalid service data produces no dot or reserved column. A finished matchUp produces no indicator, even if it still carries a serving side. The active dot has the title and accessible label “Serving”; the inactive alignment marker is hidden from assistive technology.

The dot identifies a side, including a doubles pair, rather than an individual server. Rendering is data-driven and does not require a sport identifier. The host is responsible for providing meaningful service data from its scorer; the renderer never infers service from a score or fabricates service for formats without it.

Editor: **Score → Server indicator → Off / Column / After name**.

Preset defaults: Scoreboard, Broadcast Scorebug and Broadcast Bold use column; Watch uses name. Other presets leave it off. Changing these options does not start service tracking in a consumer application.

## Headers and footers

| Region               | Configuration             | Meaning                                                                                                  |
| -------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------- |
| Round header         | `roundHeader`             | Round name above each bracket column; the editor also previews a sample only when enabled                |
| Schedule header      | `scheduleInfo`            | Schedule/date/location above the card; an options object adds playing time, event/round or inline layout |
| Custom top slot      | `renderers.matchUpHeader` | Host-provided DOM above the schedule header, independent of its visibility                               |
| Built-in card footer | `matchUpFooter`           | Round/match label, or inline scoring controls during an applicable scoring session                       |
| Custom card footer   | `renderers.matchUpFooter` | Host-provided DOM that replaces the label; can render even with the built-in footer toggle off           |

Watch/Share actions are separate from the card footer. Inline scoring also has its own `inlineScoring.showFooter` setting. Hiding a built-in footer does not remove an independently supplied custom footer.

Editor: **Layout & Info** contains Schedule info, Header details, Round header and MatchUp footer. Header details are disabled while Schedule info is off. Turning it back on restores the previous details during the same editing session. Loading a preset, replacing the configuration or resetting clears this temporary memory and uses the loaded settings.

Saving while the schedule header is off stores `scheduleInfo: false`. Hidden details are not included in saved JSON. After closing and reopening that saved composition, enabling Schedule info starts with the standard header. This preserves the existing configuration format.

The preview renders the actual built-in visibility settings. Color controls do not turn content on; their hints identify the corresponding visibility control.

## Color overrides and inheritance

Existing round-header and footer fields remain available. Schedule-header controls follow the same convention:

| `colors` field             | CSS property                          | Fallback                                          |
| -------------------------- | ------------------------------------- | ------------------------------------------------- |
| `roundHeader`              | `--chc-color-round-header`            | Inherited text color                              |
| `roundHeaderBackground`    | `--chc-color-round-header-bg`         | Transparent                                       |
| `roundHeaderUnderline`     | `--chc-color-round-header-underline`  | Round-header color, then primary text             |
| `scheduleHeaderText`       | `--chc-color-schedule-header-text`    | Muted text                                        |
| `scheduleHeaderBackground` | `--chc-color-schedule-header-bg`      | Secondary background                              |
| `scheduleHeaderDivider`    | `--chc-color-schedule-header-divider` | Primary border; BasicCard defaults to transparent |
| `matchUpFooterText`        | `--chc-color-matchup-footer-text`     | Muted text                                        |
| `matchUpFooterBackground`  | `--chc-color-matchup-footer-bg`       | MatchUp background                                |
| `matchUpFooterDivider`     | `--chc-color-matchup-footer-divider`  | Transparent                                       |

An explicit color overrides the theme. A blank field inherits the theme, and **Clear color overrides** restores inheritance. Effective swatches show the selected theme's colors without saving those defaults as explicit overrides. Editing colors while a region is hidden leaves it hidden and saves the colors for later use.

Broadcast presets retain dark card, schedule-header and footer treatments in both host modes. Broadcast Bold keeps its accent footer. TYPTI retains orange borders/connectors and uses a deeper orange for round-header text on light backgrounds. Distinct preset typography and spacing are intentional; the controls and inheritance contract are shared.

```typescript
import { compositions, renderMatchUp } from 'courthive-components';

const composition = {
  ...compositions.Scoreboard,
  configuration: {
    ...compositions.Scoreboard.configuration,
    serverIndicator: 'column' as const,
    scheduleInfo: { elapsed: true, eventRound: true },
    matchUpFooter: true
  },
  colors: {
    scheduleHeaderText: '#ffffff',
    scheduleHeaderBackground: '#123456',
    scheduleHeaderDivider: '#0f766e'
  }
};

const card = renderMatchUp({ composition, matchUp });
```

## Structure hosts and runtime slots

Wrap a bracket in `renderContainer({ theme: composition.theme, content: renderStructure({ composition, matchUps }) })` so the theme reaches round headers, connectors and their background. Standalone cards apply their composition theme themselves.

Custom header/footer slots add height. Keep their heights consistent across matchUps in a bracket; connectors account for standard schedule/footer dimensions but cannot infer arbitrary custom top-slot heights. At narrow widths, place a complete card or bracket inside a horizontal scroll container. Keep its painted background with its content rather than clipping names or scores.

Callbacks and DOM nodes are runtime inputs. Composition-editor snapshots omit `renderers`, functions and DOM nodes; a host must reattach runtime slots after loading saved JSON. Saved colors and ordinary configuration round-trip through the editor.

## Preview and regression coverage

Storybook **Policies & Setup → Composition → Consistency Audit** renders every registered preset with deterministic factory data. Light/dark and desktop/narrow stories cover preset defaults and shared header/footer controls enabled, including unfinished, finished and missing-service/schedule states. Browser assertions check visibility, serving behavior, header/footer contrast and complete painted card rows.

**Control Consistency** checks schedule colors, clearing overrides, header visibility and serving placements through the actual editor controls. Existing **Editor and Structure** and **Broadcast Compositions** stories cover additional connector, accent, footer-slot and scrolling behavior.

Run the browser checks with one worker when sharing development CPU:

```bash
pnpm test:stories src/stories/compositionConsistency.stories.ts src/stories/compositionConsistencyControls.stories.ts --maxWorkers=1
```

## Scoreboard defaults and TEAM branding

The Scoreboard preset follows the selected theme. Explicit `configuration.sideColors` maps/callbacks keep
their existing semantics and precedence. Automatic TEAM branding is opt-in through
`renderScorecard({ teamBranding: true })`; the scorecard header stays plain, and branded match lines use
team-name treatments without decorative bars or trim.

CODES `Participant.teamColors` contains a nonempty palette of stable IDs/opaque hex values and optional
`display.roles`. Supported roles are `team.surface`, `team.text`, `team.accent`, `score.surface` and
`score.text`. Each default role references a palette ID. Palette groups are descriptive; no array index,
primary/secondary ranking or palette count determines assignments.

`ScorecardOptions.teamPresentation` accepts sparse tournament overrides; by default it uses the hydrated
matchUp's teamPresentation. All-team `roles` contain hex values or `{ theme: true }` values; `teams[participantId].roles` may also
reference that TEAM palette. Resolution is theme fallback → team default → all-team override → team
exception. `{ theme: true }` uses theme fallback; omission inherits. Provider refresh can replace defaults without
changing tournament overrides. Specific team mappings belong in tournament presentation settings rather
than reusable composition presets.

`TEAM_RENDERERS` declares the role surface for clean scorecards, branded lines and arena panels. A clean
scorecard consumes no team roles; branded lines use text/accent preferences; arena layouts support
independent team/score surfaces and text. `readableTeamText`, `teamContrastRatio` and `teamRoleStyles` choose
readable paint values against consumer-local surfaces without editing stored colors. Names and visible
serve/outcome cues remain meaningful without color.

The DOM-free `courthive-components/team-colors` entry exports CODES normalizers, role resolver/declarations
and contrast/paint helpers. Node producers can use it without initializing UI libraries. Resolved role
values may be transported before consumer-local contrast decisions; unselected palette metadata is omitted.
`renderTeamColorsEditor` provides full-palette/default-role authoring. `renderTeamPresentationEditor`
provides sparse tournament overrides, explicit theme fallback, reference validation and reset-to-inherit.
