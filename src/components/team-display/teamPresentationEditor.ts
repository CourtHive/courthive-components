import { TEAM_COLOR_ROLES, normalizeTeamPresentation } from '../scorecard/teamPalette';
import { teamDisplayOption } from './teamDisplayElements';

// constants and types
import type { TeamPresentation, TeamColorRole, TeamColors } from '../scorecard/teamPalette';

export interface PresentationTeam {
  participantId: string;
  participantName?: string;
  teamColors?: TeamColors;
}

/** Sparse overrides stay separate from the provider-authored team defaults. */
export function renderTeamPresentationEditor(
  target: HTMLElement,
  initial: unknown,
  teams: PresentationTeam[],
  labels: Record<string, string> = {}
) {
  const text = (key: string, fallback: string) => labels[key] ?? fallback;
  const normalized = normalizeTeamPresentation(initial ?? {});
  const draft: TeamPresentation = normalized ?? {};
  let unreadable = !normalized;
  const root = document.createElement('section');
  root.className = 'team-presentation-editor';
  const title = document.createElement('h3');
  title.textContent = text('title', 'Tournament team presentation');
  const scopeLabel = document.createElement('label');
  scopeLabel.textContent = text('scope', 'Apply to');
  const scope = document.createElement('select');
  scope.appendChild(teamDisplayOption(text('allTeams', 'All teams'), ''));
  for (const team of teams)
    scope.appendChild(teamDisplayOption(team.participantName ?? team.participantId, team.participantId));
  for (const id of Object.keys(draft.teams ?? {})) {
    if (!teams.some((team) => team.participantId === id))
      scope.appendChild(teamDisplayOption(`${id} (${text('missingTeam', 'missing team')})`, id));
  }
  scopeLabel.appendChild(scope);
  const fields = document.createElement('div');
  const error = document.createElement('p');
  error.setAttribute('role', 'alert');
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = text('reset', 'Reset this scope to inherited defaults');
  reset.addEventListener('click', () => {
    if (scope.value) delete draft.teams?.[scope.value];
    else delete draft.roles;
    unreadable = false;
    render();
  });
  scope.addEventListener('change', render);
  root.append(title, scopeLabel, fields, reset, error);
  target.appendChild(root);
  render();

  function current() {
    if (!scope.value) return draft.roles ?? {};
    return Object.hasOwn(draft.teams ?? {}, scope.value) ? (draft.teams?.[scope.value]?.roles ?? {}) : {};
  }
  function set(role: TeamColorRole, value: string | { theme: true } | undefined) {
    const roles = { ...current() };
    if (value === undefined) delete roles[role];
    else roles[role] = value;
    if (scope.value) {
      draft.teams ??= {};
      Object.defineProperty(draft.teams, scope.value, {
        value: { roles },
        enumerable: true,
        writable: true,
        configurable: true
      });
    } else draft.roles = roles;
    unreadable = false;
  }
  function render() {
    fields.replaceChildren();
    for (const role of TEAM_COLOR_ROLES) {
      const row = document.createElement('div');
      row.className = 'team-presentation-role';
      row.style.display = 'block';
      const caption = document.createElement('span');
      const roleLabels = {
        'team.surface': 'Team background',
        'team.text': 'Team text',
        'team.accent': 'Team accent',
        'score.surface': 'Score background',
        'score.text': 'Score text'
      };
      caption.textContent = text(role, roleLabels[role]);
      const mode = document.createElement('select');
      mode.ariaLabel = caption.textContent ?? role;
      const modes = [
        ['inherit', 'Inherit'],
        ['theme', 'Use theme default'],
        ['color', 'Custom color']
      ];
      if (scope.value) modes.push(['palette', 'Team palette color']);
      for (const [value, fallback] of modes) mode.appendChild(teamDisplayOption(text(value, fallback), value));
      const value = current()[role];
      mode.value =
        typeof value === 'object'
          ? 'theme'
          : value === undefined
            ? 'inherit'
            : value.startsWith('#')
              ? 'color'
              : 'palette';
      const color = document.createElement('input');
      color.value = typeof value === 'string' && value.startsWith('#') ? value : '';
      color.placeholder = '#RRGGBB';
      color.ariaLabel = `${caption.textContent} ${text('color', 'custom color')}`;
      const palette = document.createElement('select');
      palette.ariaLabel = `${caption.textContent} ${text('palette', 'team palette')}`;
      palette.appendChild(teamDisplayOption(text('choosePalette', 'Choose team color'), ''));
      const entries = teams.find((team) => team.participantId === scope.value)?.teamColors?.palette ?? [];
      for (const entry of entries) palette.appendChild(teamDisplayOption(entry.name ?? entry.value, entry.colorId));
      if (mode.value === 'palette' && !entries.some((entry) => entry.colorId === value)) {
        const missing = teamDisplayOption(text('missingColor', 'Missing palette color'), value as string);
        missing.disabled = true;
        palette.appendChild(missing);
      }
      palette.value = mode.value === 'palette' ? (value as string) : '';
      const visibility = () => {
        color.hidden = color.disabled = mode.value !== 'color';
        palette.hidden = palette.disabled = mode.value !== 'palette';
      };
      visibility();
      mode.addEventListener('change', () => {
        visibility();
        const binding =
          mode.value === 'inherit'
            ? undefined
            : mode.value === 'theme'
              ? { theme: true as const }
              : mode.value === 'palette'
                ? palette.value
                : color.value;
        set(role, binding);
      });
      color.addEventListener('input', () => set(role, color.value));
      palette.addEventListener('change', () => set(role, palette.value));
      row.append(caption, mode, color, palette);
      fields.appendChild(row);
    }
    error.textContent = unreadable ? text('invalid', 'Check presentation settings') : '';
  }
  function read(): TeamPresentation | undefined {
    const result = unreadable ? undefined : normalizeTeamPresentation(draft);
    const missing = Object.entries(result?.teams ?? {}).some(([id, team]) => {
      const palette = teams.find((candidate) => candidate.participantId === id)?.teamColors?.palette ?? [];
      return Object.values(team.roles).some(
        (value) =>
          typeof value === 'string' && !value.startsWith('#') && !palette.some((entry) => entry.colorId === value)
      );
    });
    error.textContent = result && !missing ? '' : text('invalid', 'Check colors and palette references');
    return missing ? undefined : result;
  }
  return { read };
}
