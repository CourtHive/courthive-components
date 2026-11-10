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

The Scoreboard preset uses the selected theme's winner, loser, live-score and serving treatment for both sides. It contains no sample team palette. Existing saved compositions that explicitly include `configuration.sideColors` keep their palette; loading/resetting the current preset restores the neutral default.

For a deliberate demonstration, supply `configuration: { ...compositions.Scoreboard.configuration, sideColors: { 1: '#0b7a75', 2: '#b3365b' } }`. The public `sideColors` API remains a one-based map or `({ matchUp, sideNumber }) => color` callback. Manual maps and callback arguments refer to rendered sides, including when a scorecard swaps them. Blank/partial explicit palettes own their results and suppress automatic branding.

`renderScorecard({ matchUp, composition, teamBranding: true })` opts into TEAM identity accents on collection lines. The scorecard header retains its normal theme styling, without colored bars or trim. The default is false. Colors come from `side.participant.teamColors` only for a TEAM, or from the privacy-filtered `side.teamParticipant` on a tie line. The participant ID is required. Individual and PAIR colors are ignored. Missing/invalid/filtered colors remain theme-neutral; the renderer never consults raw tournament data or restores denied child fields from a parent.

Each CODES TEAM palette stores named entries with stable `colorId`s and `display.primary` / optional `display.secondary` references. `resolveTeamColors` resolves those references to an opaque hex accent and trim; it never selects by array position. `normalizeTeamPalette` validates and normalizes the canonical shape. The palette retains all stored colors; the two display references select the current renderer's accent and optional trim. The 32-entry capacity is an implementation resource guard, not a researched maximum for a team brand. The closed palette allows 1–32 entries, unique IDs, bounded labels and valid selection references. Multiple entries may share values or brand groups. Text retains theme contrast. Identical team colors are allowed; names, score, winner and serve indicators remain independent. Reversing the sides array or enabling `swapSides` moves identity and accents together without mutating match data.

Clearing both Side 1 / Side 2 editor fields removes `sideColors`. On an opted-in scorecard, this restores automatic TEAM accents. An explicit empty map `{}` suppresses them; `teamBranding: false` disables automatic resolution at the host.

Brand resolution is runtime data. Composition JSON retains explicit maps and strips callbacks; it does not store hydrated TEAM records or the opt-in scorecard option. TMX and Epixodic adopt the option at their scorecard hosts; direct matchUp callers retain their current explicit palette behavior.

The DOM-free `courthive-components/team-colors` entry exports `normalizeTeamPalette` and `resolveTeamColors`, with palette/display types. Services and workers must use this subpath rather than the root UI entry.
