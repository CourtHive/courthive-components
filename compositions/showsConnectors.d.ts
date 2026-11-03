import { Composition } from '../types';
/**
 * Whether a structure rendered with this composition draws the lines between rounds: its
 * `configuration.connectors` when set, otherwise the theme's own choice. For a control that shows the setting.
 */
export declare function showsConnectors(composition?: Pick<Composition, 'theme' | 'configuration'>): boolean;
