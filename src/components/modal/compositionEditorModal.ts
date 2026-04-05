/**
 * Composition Editor Modal — configure PDF header/footer layouts.
 *
 * Opens a modal with two tabs (via menu): Header Config and Footer Config.
 * Each tab provides form controls for selecting layouts and entering field values.
 * Returns the composed HeaderConfig + FooterConfig for pdf-factory.
 */

import { cModal } from './cmodal';
import { renderForm } from '../forms/renderForm';

// Types match pdf-factory's HeaderConfig/FooterConfig but defined locally
// to avoid pulling the full pdf-factory bundle (includes jsPDF/Node APIs)
export interface HeaderConfig {
  layout: string;
  tournamentName: string;
  subtitle?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  city?: string;
  country?: string;
  surface?: string;
  prizeMoney?: string;
  currency?: string;
  supervisor?: string;
  grade?: string;
  sectionLabel?: string;
  organizer?: string;
  chiefUmpire?: string;
  tournamentId?: string;
}

export interface FooterConfig {
  layout: string;
  showPageNumbers?: boolean;
  showTimestamp?: boolean;
  releaseDate?: string;
  drawCeremonyDate?: string;
  notes?: string[];
}

interface CatalogEntry {
  id: string;
  name: string;
  category: string;
  tier: number;
}

const CATALOG_PRESETS: CatalogEntry[] = [
  { id: 'grand-slam', name: 'Grand Slam', category: 'grand-slam', tier: 1 },
  { id: 'wimbledon', name: 'Wimbledon', category: 'grand-slam', tier: 1 },
  { id: 'australian-open', name: 'Australian Open', category: 'grand-slam', tier: 2 },
  { id: 'wta-500', name: 'WTA 500', category: 'tour', tier: 2 },
  { id: 'wta-1000', name: 'WTA 1000', category: 'tour', tier: 2 },
  { id: 'atp-250', name: 'ATP 250', category: 'tour', tier: 2 },
  { id: 'atp-finals', name: 'ATP Finals', category: 'tour', tier: 3 },
  { id: 'itf-junior', name: 'ITF Junior', category: 'itf', tier: 3 },
  { id: 'itf-pro-circuit', name: 'ITF Pro Circuit', category: 'itf', tier: 2 },
  { id: 'national-federation', name: 'National Federation', category: 'national', tier: 3 },
  { id: 'collegiate-ncaa', name: 'NCAA Collegiate', category: 'collegiate', tier: 1 },
  { id: 'club-basic', name: 'Club Basic', category: 'club', tier: 1 }
];

export interface CompositionEditorResult {
  header: HeaderConfig;
  footer: FooterConfig;
  preset?: string;
}

export interface CompositionEditorOptions {
  initialPreset?: string;
  initialHeader?: Partial<HeaderConfig>;
  initialFooter?: Partial<FooterConfig>;
  onApply?: (result: CompositionEditorResult) => void;
}

export function openCompositionEditorModal(options: CompositionEditorOptions = {}) {
  let currentTab: 'preset' | 'header' | 'footer' = 'preset';
  let headerInputs: any = {};
  let footerInputs: any = {};
  let presetInputs: any = {};
  let modalHandle: any;

  const buildPresetContent = (container: HTMLElement) => {
    const presetOptions = CATALOG_PRESETS.map((p) => ({
      label: `${p.name} (${p.category}, Tier ${p.tier})`,
      value: p.id,
      selected: p.id === (options.initialPreset || 'club-basic')
    }));

    presetInputs = renderForm(container, [
      { header: true, text: 'Composition Preset' },
      { spacer: 0.5 },
      {
        field: 'preset',
        label: 'Select Preset',
        options: presetOptions
      },
      { spacer: 1 },
      {
        text: 'Select a preset to populate header and footer settings, then customize in the Header and Footer tabs.',
        style: 'color: var(--chc-text-muted); font-size: 13px;'
      }
    ]);
  };

  const buildHeaderContent = (container: HTMLElement) => {
    const ih = options.initialHeader || {};
    headerInputs = renderForm(container, [
      { header: true, text: 'Header Configuration' },
      { spacer: 0.5 },
      {
        field: 'layout',
        label: 'Layout',
        options: [
          { label: 'Grand Slam', value: 'grand-slam', selected: ih.layout === 'grand-slam' },
          { label: 'ITF / Professional', value: 'itf', selected: ih.layout === 'itf' },
          { label: 'WTA / ATP Tour', value: 'wta-tour', selected: ih.layout === 'wta-tour' },
          { label: 'National Federation', value: 'national-federation', selected: ih.layout === 'national-federation' },
          { label: 'Minimal', value: 'minimal', selected: ih.layout === 'minimal' || !ih.layout },
          { label: 'None', value: 'none', selected: ih.layout === 'none' }
        ]
      },
      { divider: true },
      {
        field: 'tournamentName',
        label: 'Tournament Name',
        value: ih.tournamentName || '',
        placeholder: 'e.g., Australian Open 2026'
      },
      { field: 'subtitle', label: 'Subtitle / Event', value: ih.subtitle || '', placeholder: 'e.g., Womens Singles' },
      { divider: true },
      {
        field: 'startDate',
        label: 'Start Date',
        value: ih.startDate || '',
        placeholder: 'e.g., 19 Jan 2026',
        fieldPair: { field: 'endDate', label: 'End Date', value: ih.endDate || '', placeholder: 'e.g., 1 Feb 2026' }
      },
      {
        field: 'city',
        label: 'City',
        value: ih.city || '',
        placeholder: 'e.g., Melbourne',
        fieldPair: { field: 'country', label: 'Country', value: ih.country || '', placeholder: 'e.g., AUS' }
      },
      { field: 'surface', label: 'Surface', value: ih.surface || '', placeholder: 'e.g., Hard' },
      { field: 'prizeMoney', label: 'Prize Money', value: ih.prizeMoney || '', placeholder: 'e.g., 1,520,600' },
      { divider: true },
      { field: 'supervisor', label: 'Supervisor', value: ih.supervisor || '' },
      { field: 'grade', label: 'Grade', value: ih.grade || '', placeholder: 'e.g., J300' },
      {
        field: 'sectionLabel',
        label: 'Section Label',
        value: ih.sectionLabel || '',
        placeholder: 'e.g., SINGLES MAIN DRAW'
      }
    ]);
  };

  const buildFooterContent = (container: HTMLElement) => {
    const fi = options.initialFooter || {};
    footerInputs = renderForm(container, [
      { header: true, text: 'Footer Configuration' },
      { spacer: 0.5 },
      {
        field: 'layout',
        label: 'Layout',
        options: [
          { label: 'Standard (timestamp + page)', value: 'standard', selected: fi.layout === 'standard' || !fi.layout },
          { label: 'Seedings Table', value: 'seedings-table', selected: fi.layout === 'seedings-table' },
          { label: 'Prize Money', value: 'prize-money', selected: fi.layout === 'prize-money' },
          { label: 'Officials Sign-off', value: 'officials-signoff', selected: fi.layout === 'officials-signoff' },
          { label: 'Combined Tour (WTA/ATP)', value: 'combined-tour', selected: fi.layout === 'combined-tour' },
          { label: 'None', value: 'none', selected: fi.layout === 'none' }
        ]
      },
      { divider: true },
      {
        field: 'showPageNumbers',
        id: 'comp-pagenums',
        label: 'Show Page Numbers',
        checkbox: true,
        checked: fi.showPageNumbers !== false
      },
      {
        field: 'showTimestamp',
        id: 'comp-timestamp',
        label: 'Show Timestamp',
        checkbox: true,
        checked: fi.showTimestamp !== false
      },
      { divider: true },
      {
        field: 'releaseDate',
        label: 'Release Date',
        value: fi.releaseDate || '',
        placeholder: 'e.g., 18 Jan 2026 at 15:30'
      },
      {
        field: 'drawCeremonyDate',
        label: 'Draw Ceremony',
        value: fi.drawCeremonyDate || '',
        placeholder: 'e.g., 18 Jan 2026 at 14:00'
      }
    ]);
  };

  const getHeaderConfig = (): HeaderConfig => ({
    layout: headerInputs.layout?.value || 'minimal',
    tournamentName: headerInputs.tournamentName?.value || '',
    subtitle: headerInputs.subtitle?.value || undefined,
    startDate: headerInputs.startDate?.value || undefined,
    endDate: headerInputs.endDate?.value || undefined,
    city: headerInputs.city?.value || undefined,
    country: headerInputs.country?.value || undefined,
    surface: headerInputs.surface?.value || undefined,
    prizeMoney: headerInputs.prizeMoney?.value || undefined,
    supervisor: headerInputs.supervisor?.value || undefined,
    grade: headerInputs.grade?.value || undefined,
    sectionLabel: headerInputs.sectionLabel?.value || undefined
  });

  const getFooterConfig = (): FooterConfig => ({
    layout: footerInputs.layout?.value || 'standard',
    showPageNumbers: footerInputs.showPageNumbers?.checked ?? true,
    showTimestamp: footerInputs.showTimestamp?.checked ?? true,
    releaseDate: footerInputs.releaseDate?.value || undefined,
    drawCeremonyDate: footerInputs.drawCeremonyDate?.value || undefined
  });

  const menuItems = [
    {
      label: 'Preset',
      active: true,
      onClick: () => {
        currentTab = 'preset';
        updateModal();
      }
    },
    {
      label: 'Header',
      active: false,
      onClick: () => {
        currentTab = 'header';
        updateModal();
      }
    },
    {
      label: 'Footer',
      active: false,
      onClick: () => {
        currentTab = 'footer';
        updateModal();
      }
    }
  ];

  const updateModal = () => {
    menuItems.forEach((item) => (item.active = item.label.toLowerCase() === currentTab));

    const contentFn =
      currentTab === 'preset' ? buildPresetContent : currentTab === 'header' ? buildHeaderContent : buildFooterContent;

    if (modalHandle) {
      modalHandle.update({
        content: contentFn,
        config: { menu: { menuItems }, maxWidth: 520 }
      });
    }
  };

  modalHandle = cModal.open({
    title: 'PDF Composition',
    content: buildPresetContent,
    buttons: [
      {
        label: 'Apply',
        intent: 'is-info',
        onClick: () => {
          const result: CompositionEditorResult = {
            header: getHeaderConfig(),
            footer: getFooterConfig(),
            preset: presetInputs.preset?.value
          };
          options.onApply?.(result);
          cModal.close();
        }
      },
      { label: 'Cancel', close: true }
    ],
    config: {
      menu: { menuItems },
      maxWidth: 520
    }
  });

  return modalHandle;
}
