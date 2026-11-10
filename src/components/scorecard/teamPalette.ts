export interface TeamPaletteColor {
  colorId: string;
  value: string;
  name?: string;
  group?: string;
}

export type TeamColorRole = 'team.surface' | 'team.text' | 'team.accent' | 'score.surface' | 'score.text';

/** Portable CODES TEAM palette and provider-authored preferred color roles. */
export interface TeamColors {
  palette: TeamPaletteColor[];
  display?: { roles: Partial<Record<TeamColorRole, string>> };
}

/** A theme marker explicitly uses the renderer/theme fallback; omission inherits. */
export interface TeamPresentation {
  roles?: Partial<Record<TeamColorRole, string | { theme: true }>>;
  teams?: Record<string, { roles: Partial<Record<TeamColorRole, string | { theme: true }>> }>;
}

export const TEAM_COLOR_ROLES = new Set<TeamColorRole>([
  'team.surface',
  'team.text',
  'team.accent',
  'score.surface',
  'score.text'
]);

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && Object.prototype.toString.call(value) === '[object Object]';
const hex = (value: unknown): value is string => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
const colorId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/.test(value);
const only = (value: Record<string, unknown>, keys: string[]) => {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
};
const label = (value: unknown) =>
  value === undefined || (typeof value === 'string' && value.trim().length > 0 && value.length <= 100);

/** Validate the portable palette independently of any renderer or tournament. */
export function normalizeTeamPalette(value: unknown): TeamColors | undefined {
  if (!object(value) || !only(value, ['palette', 'display']) || !Array.isArray(value.palette)) return undefined;
  if (!value.palette.length) return undefined;
  const ids = new Set<string>();
  const palette: TeamPaletteColor[] = [];
  for (const entry of value.palette) {
    if (!object(entry) || !only(entry, ['colorId', 'value', 'name', 'group'])) return undefined;
    if (!colorId(entry.colorId) || ids.has(entry.colorId) || !hex(entry.value)) return undefined;
    if (!label(entry.name) || !label(entry.group)) return undefined;
    ids.add(entry.colorId);
    palette.push({
      colorId: entry.colorId,
      value: entry.value.toUpperCase(),
      ...(typeof entry.name === 'string' && { name: entry.name.trim() }),
      ...(typeof entry.group === 'string' && { group: entry.group.trim() })
    });
  }
  if (value.display === undefined) return { palette };
  if (!object(value.display) || !only(value.display, ['roles']) || !object(value.display.roles)) return undefined;
  const roles: Partial<Record<TeamColorRole, string>> = {};
  for (const [role, reference] of Object.entries(value.display.roles)) {
    if (!TEAM_COLOR_ROLES.has(role as TeamColorRole) || !colorId(reference) || !ids.has(reference)) return undefined;
    roles[role as TeamColorRole] = reference;
  }
  return { palette, display: { roles } };
}

/** Unpainted role values. Foreground contrast is resolved by the consuming renderer. */
export interface TeamDisplayColors {
  roles: Partial<Record<TeamColorRole, string>>;
}

export const TEAM_RENDERERS = {
  clean: { roles: [], pairs: [] },
  scorecard: { roles: ['team.text', 'team.accent'], pairs: [] },
  arena: {
    roles: [...TEAM_COLOR_ROLES],
    pairs: [
      ['team.text', 'team.surface'],
      ['score.text', 'score.surface']
    ]
  }
} as const;

/**
 * Read sparse tournament settings without coupling them to a particular TEAM palette. Invalid entries are
 * dropped individually (an empty team exception inherits) and described in `issues`; writers reject any issue.
 */
export function normalizeTeamPresentation(value: unknown, issues: string[] = []): TeamPresentation | undefined {
  if (!object(value)) {
    issues.push('teamPresentation must be an object');
    return undefined;
  }
  for (const key of Object.keys(value)) if (key !== 'roles' && key !== 'teams') issues.push(`unknown field ${key}`);
  const read = (input: unknown, references: boolean, path: string) => {
    const roles: Partial<Record<TeamColorRole, string | { theme: true }>> = {};
    if (input === undefined) return roles;
    if (!object(input)) {
      issues.push(`${path} must be an object`);
      return roles;
    }
    for (const [role, color] of Object.entries(input)) {
      if (!TEAM_COLOR_ROLES.has(role as TeamColorRole)) issues.push(`${path}: unknown role ${role}`);
      else if (object(color) && only(color, ['theme']) && color.theme === true) {
        roles[role as TeamColorRole] = { theme: true };
      } else if (hex(color)) roles[role as TeamColorRole] = color.toUpperCase();
      else if (references && colorId(color)) roles[role as TeamColorRole] = color;
      else issues.push(`${path}: invalid ${role}`);
    }
    return roles;
  };
  const result: TeamPresentation = {};
  if (value.roles !== undefined) result.roles = read(value.roles, false, 'roles');
  if (value.teams !== undefined) {
    if (object(value.teams)) {
      result.teams = {};
      for (const [id, team] of Object.entries(value.teams)) {
        if (!id || id.length > 200 || !object(team) || !only(team, ['roles'])) {
          issues.push(`invalid team exception ${id.slice(0, 200)}`);
          continue;
        }
        Object.defineProperty(result.teams, id, {
          value: { roles: read(team.roles, true, `teams.${id}`) },
          enumerable: true,
          configurable: true,
          writable: true
        });
      }
    } else issues.push('teams must be an object');
  }
  return result;
}

/** Resolve identity defaults and sparse overrides; never invent assignments from palette order. */
export function resolveTeamColors(
  value: unknown,
  options: { participantId?: string; presentation?: TeamPresentation; onDiagnostic?: (message: string) => void } = {}
): TeamDisplayColors | undefined {
  const colors = normalizeTeamPalette(value);
  const issues: string[] = [];
  const presentation =
    options.presentation === undefined ? undefined : normalizeTeamPresentation(options.presentation, issues);
  for (const issue of issues) options.onDiagnostic?.(`Invalid team presentation: ${issue}`);
  const palette = new Map(colors?.palette.map((entry) => [entry.colorId, entry.value]));
  const roles: TeamDisplayColors['roles'] = {};
  const layers = [
    colors?.display?.roles,
    presentation?.roles,
    options.participantId && Object.hasOwn(presentation?.teams ?? {}, options.participantId)
      ? presentation?.teams?.[options.participantId]?.roles
      : undefined
  ];
  for (const layer of layers) {
    for (const [role, reference] of Object.entries(layer ?? {})) {
      const key = role as TeamColorRole;
      if (typeof reference !== 'string') delete roles[key];
      else {
        const color = hex(reference) ? reference : palette.get(reference);
        if (color) roles[key] = color;
        else {
          delete roles[key];
          options.onDiagnostic?.(`Missing palette color ${reference} for ${role}`);
        }
      }
    }
  }
  return Object.keys(roles).length ? { roles } : undefined;
}

export function teamContrastRatio(first: string, second: string): number {
  const luminance = (color: string) => {
    const rgb = [1, 3, 5]
      .map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16) / 255)
      .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const values = [luminance(first), luminance(second)].toSorted((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

/** Choose a readable paint value without changing the stored team preference. */
export function readableTeamText(preferred: string | undefined, background: string, fallback: string): string {
  if (!hex(background)) return fallback;
  if (hex(preferred) && teamContrastRatio(preferred, background) >= 4.5) return preferred;
  if (hex(fallback) && teamContrastRatio(fallback, background) >= 4.5) return fallback;
  return teamContrastRatio('#000000', background) >= 4.5 ? '#000000' : '#FFFFFF';
}

/** Renderer-local role painting; callers supply the actual theme surface and foreground. */
export function teamRoleStyles(
  colors: TeamDisplayColors | undefined,
  theme: { background: string; text: string },
  region: 'team' | 'score' = 'team'
): string {
  if (!colors?.roles[`${region}.surface`] && !colors?.roles[`${region}.text`]) return '';
  const background = colors?.roles[`${region}.surface`] ?? theme.background;
  const text = readableTeamText(colors?.roles[`${region}.text`], background, theme.text);
  return `background-color:${background};color:${text};`;
}
