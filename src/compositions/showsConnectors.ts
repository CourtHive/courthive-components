import { basicCardTheme, wimbledonTheme } from '../styles/themes';
import type { Composition } from '../types';

/** Themes whose stylesheet hides the lines between rounds unless configuration.connectors shows them. */
const THEMES_WITHOUT_CONNECTORS = new Set<string>([basicCardTheme, wimbledonTheme]);

/**
 * Whether a structure rendered with this composition draws the lines between rounds: its
 * `configuration.connectors` when set, otherwise the theme's own choice. For a control that shows the setting.
 */
export function showsConnectors(composition?: Pick<Composition, 'theme' | 'configuration'>): boolean {
  const configured = composition?.configuration?.connectors;
  if (typeof configured === 'boolean') return configured;
  return !THEMES_WITHOUT_CONNECTORS.has(composition?.theme ?? '');
}
