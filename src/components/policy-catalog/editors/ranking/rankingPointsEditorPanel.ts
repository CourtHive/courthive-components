/**
 * Ranking Points Editor Panel — Root accordion assembly.
 *
 * Builds the DOM structure and provides an update() method for re-rendering
 * when store state changes. Follows schedulingEditorPanel pattern.
 */
import type { RankingPointsEditorStore } from './rankingPointsEditorStore';
import { buildAggregationSection } from './sections/aggregationSection';
import { buildQualityWinSection } from './sections/qualityWinSection';
import { buildMetadataSection } from './sections/metadataSection';
import { buildProfileCard } from './sections/profileCard';

// Styles
import {
  reSectionStyle,
  reSectionHeaderStyle,
  reSectionChevronStyle,
  reSectionCountStyle,
  reSectionBodyStyle,
  reEditorStyle,
  reEmptyStyle
} from './styles';

// Types
import type { RankingPointsEditorState, RankingEditorSection, RankingPointsEditorConfig } from './types';

interface SectionDef {
  id: RankingEditorSection;
  label: string;
  countFn?: (state: RankingPointsEditorState) => number;
}

interface PanelResult {
  element: HTMLElement;
  update: (state: RankingPointsEditorState) => void;
}

export function buildRankingPointsEditorPanel(
  store: RankingPointsEditorStore,
  _config: RankingPointsEditorConfig
): PanelResult {
  const root = document.createElement('div');
  root.className = reEditorStyle();

  // Persistent section builders (built once, updated on state changes)
  const metadataInner = buildMetadataSection(store);
  const qualityWinInner = buildQualityWinSection(store);
  const aggregationInner = buildAggregationSection(store);

  const sectionDefs: SectionDef[] = [
    { id: 'metadata', label: 'Metadata' },
    { id: 'awardProfiles', label: 'Award Profiles', countFn: (s) => s.draft.awardProfiles?.length ?? 0 },
    {
      id: 'qualityWinProfiles',
      label: 'Quality Win Profiles',
      countFn: (s) => s.draft.qualityWinProfiles?.length ?? 0
    },
    { id: 'aggregationRules', label: 'Aggregation Rules' }
  ];

  const sectionEls: {
    id: RankingEditorSection;
    chevron: HTMLElement;
    countEl: HTMLElement;
    bodyEl: HTMLElement;
  }[] = [];

  for (const def of sectionDefs) {
    const section = document.createElement('div');
    section.className = reSectionStyle();

    const header = document.createElement('div');
    header.className = reSectionHeaderStyle();

    const chevron = document.createElement('span');
    chevron.className = reSectionChevronStyle();

    const label = document.createElement('span');
    label.textContent = def.label;

    const countEl = document.createElement('span');
    countEl.className = reSectionCountStyle();

    header.appendChild(chevron);
    header.appendChild(label);
    header.appendChild(countEl);
    header.addEventListener('click', () => store.toggleSection(def.id));

    const bodyEl = document.createElement('div');
    bodyEl.className = reSectionBodyStyle();

    // Mount persistent inner elements
    if (def.id === 'metadata') bodyEl.appendChild(metadataInner.element);
    if (def.id === 'qualityWinProfiles') bodyEl.appendChild(qualityWinInner.element);
    if (def.id === 'aggregationRules') bodyEl.appendChild(aggregationInner.element);

    section.appendChild(header);
    section.appendChild(bodyEl);
    root.appendChild(section);

    sectionEls.push({ id: def.id, chevron, countEl, bodyEl });
  }

  // Track profile card instances for efficient updates
  let profileCards: { element: HTMLElement; update(state: RankingPointsEditorState): void }[] = [];
  let lastProfileCount = -1;
  let lastFilter = '';
  let addProfileBtn: HTMLElement | null = null;

  const update = (state: RankingPointsEditorState) => {
    const { draft, expandedSections, profileFilter } = state;

    // Update chevrons, counts, and body visibility
    for (let i = 0; i < sectionDefs.length; i++) {
      const def = sectionDefs[i];
      const el = sectionEls[i];
      const expanded = expandedSections.has(def.id);

      el.chevron.textContent = expanded ? '\u25BC' : '\u25B6';
      el.bodyEl.style.display = expanded ? 'block' : 'none';

      if (def.countFn) {
        const count = def.countFn(state);
        el.countEl.textContent = count ? `(${count})` : '';
      }
    }

    // Metadata — persistent inner, just call update
    if (expandedSections.has('metadata')) {
      metadataInner.update(state);
    }

    // Award Profiles — track card instances
    if (expandedSections.has('awardProfiles')) {
      const profilesBody = sectionEls[1].bodyEl;
      const profileCount = draft.awardProfiles?.length ?? 0;
      const filter = profileFilter.toLowerCase();

      // Rebuild cards if count or filter changed
      if (profileCount !== lastProfileCount || filter !== lastFilter) {
        lastProfileCount = profileCount;
        lastFilter = filter;
        profilesBody.innerHTML = '';
        profileCards = [];

        const profiles = draft.awardProfiles ?? [];
        let visibleCount = 0;

        for (let i = 0; i < profiles.length; i++) {
          const profile = profiles[i];

          if (filter) {
            const searchable = [
              profile.profileName ?? '',
              ...(profile.eventTypes ?? []),
              ...(profile.stages ?? []),
              ...(profile.levels ?? []).map((l) => `L${l}`),
              ...(profile.drawTypes ?? [])
            ]
              .join(' ')
              .toLowerCase();
            if (!searchable.includes(filter)) continue;
          }

          const card = buildProfileCard(store, i);
          profileCards.push(card);
          profilesBody.appendChild(card.element);
          visibleCount++;
        }

        if (!visibleCount) {
          const empty = document.createElement('div');
          empty.className = reEmptyStyle();
          empty.textContent = filter ? 'No profiles match filter' : 'No award profiles defined';
          profilesBody.appendChild(empty);
        }

        // Add Profile button
        if (!state.readonly) {
          addProfileBtn = document.createElement('button');
          addProfileBtn.className = 'sp-btn sp-btn--sm sp-btn--outline re-add-btn';
          addProfileBtn.textContent = '+ Add Profile';
          addProfileBtn.addEventListener('click', () => store.addProfile());
          profilesBody.appendChild(addProfileBtn);
        }
      }

      // Update all visible cards
      for (const card of profileCards) {
        card.update(state);
      }

      // Toggle add button visibility based on readonly
      if (addProfileBtn) {
        addProfileBtn.style.display = state.readonly ? 'none' : '';
      }
    }

    // Quality Win Profiles — persistent inner
    if (expandedSections.has('qualityWinProfiles')) {
      qualityWinInner.update(state);
    }

    // Aggregation Rules — persistent inner
    if (expandedSections.has('aggregationRules')) {
      aggregationInner.update(state);
    }
  };

  return { element: root, update };
}
