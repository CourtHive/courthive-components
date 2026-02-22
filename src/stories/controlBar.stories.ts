/**
 * Control Bar Component Stories
 *
 * The Control Bar is a versatile component used for table controls.
 * It provides search fields, buttons, dropdown menus, and action overlays.
 *
 * ## Locations
 * Items can be positioned in different locations:
 * - OVERLAY: Shown only when rows are selected
 * - LEFT: Left side of the control bar
 * - CENTER: Center of the control bar
 * - RIGHT: Right side of the control bar
 * - HEADER: In the header section above the control bar
 */
// CSS dependencies
import 'bulma/css/versions/bulma-no-dark-mode.min.css';
import '../components/controlBar/controlBar.css';
import '../styles/tabulator.css';

// @ts-expect-error - Storybook types not in published package
import type { Meta, StoryObj } from '@storybook/html';
import { controlBar } from '../components/controlBar/controlBar';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import { mocksEngine, tournamentEngine } from 'tods-competition-factory';

const meta: Meta = {
  title: 'Components/ControlBar',
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj;

// Generate realistic participant data using the factory mock engine
function getParticipantData(count: number = 32) {
  const { tournamentRecord } = mocksEngine.generateTournamentRecord({
    participantsProfile: {
      participantsCount: count,
      participantType: 'INDIVIDUAL'
    }
  });

  tournamentEngine.setState(tournamentRecord);
  const { participants } = tournamentEngine.getParticipants();

  return participants.map((p: any) => ({
    participantId: p.participantId,
    name: p.participantName,
    sex: p.person?.sex || '',
    city: p.person?.addresses?.[0]?.city || '',
    state: p.person?.addresses?.[0]?.state || '',
    signedIn: Math.random() > 0.5
  }));
}

/**
 * Participants Page — the primary demonstration of the controlBar.
 *
 * Shows the full pattern: search, filter dropdowns, action buttons, and
 * overlay bulk actions that appear when table rows are selected.
 * Uses factory-generated participant data with realistic names.
 */
export const ParticipantsPage: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'section';
    container.style.maxWidth = '1200px';
    container.style.margin = '0 auto';

    const header = document.createElement('div');
    header.className = 'tabHeader';
    header.style.cssText = 'padding: 0.75rem 0.5rem; font-size: 1.1rem; font-weight: bold;';
    header.innerHTML = 'Participants (0)';
    container.appendChild(header);

    const target = document.createElement('div');
    container.appendChild(target);

    const tableContainer = document.createElement('div');
    container.appendChild(tableContainer);

    requestAnimationFrame(() => {
      const data = getParticipantData(32);

      const table = new Tabulator(tableContainer, {
        data,
        height: '400px',
        layout: 'fitColumns',
        selectableRows: true,
        index: 'participantId',
        columns: [
          { title: 'Name', field: 'name', width: 200, sorter: 'string' },
          { title: 'Gender', field: 'sex', width: 90, sorter: 'string' },
          { title: 'City', field: 'city', width: 150 },
          { title: 'State', field: 'state', width: 100 },
          {
            title: 'Signed In',
            field: 'signedIn',
            width: 100,
            hozAlign: 'center',
            formatter: (cell: any) =>
              cell.getValue()
                ? '<span style="color: green; font-weight: bold;">Yes</span>'
                : '<span style="color: #ccc;">No</span>'
          }
        ]
      });

      const updateHeader = () => {
        const rows = table.getRows('active');
        header.innerHTML = `Participants (${rows.length})`;
      };
      table.on('dataFiltered', updateHeader);
      table.on('tableBuilt', updateHeader);

      let currentSearch = '';
      let currentGender = '';

      const applyFilters = () => {
        const filters: any[] = [];
        if (currentSearch) filters.push({ field: 'name', type: 'like', value: currentSearch });
        if (currentGender) filters.push({ field: 'sex', type: '=', value: currentGender });
        table.clearFilter();
        if (filters.length) table.setFilter(filters);
      };

      const items = [
        // Overlay — visible when rows are selected
        {
          label: 'Sign In',
          location: 'overlay',
          intent: 'is-primary',
          onClick: () => {
            const selected = table.getSelectedData();
            selected.forEach((row: any) => {
              table.updateData([{ participantId: row.participantId, signedIn: true }]);
            });
            table.deselectRow();
          }
        },
        {
          label: 'Delete Selected',
          location: 'overlay',
          intent: 'is-danger',
          onClick: () => {
            const selected = table.getSelectedData();
            if (confirm(`Delete ${selected.length} participants?`)) {
              selected.forEach((row: any) => table.deleteRow(row.participantId));
            }
          }
        },
        // Left — search and filters
        {
          placeholder: 'Search by name',
          location: 'left',
          search: true,
          clearSearch: () => {
            currentSearch = '';
            applyFilters();
          },
          onKeyUp: (e: KeyboardEvent) => {
            currentSearch = (e.target as HTMLInputElement).value;
            applyFilters();
          }
        },
        {
          label: 'All Genders',
          location: 'left',
          modifyLabel: true,
          selection: true,
          options: [
            {
              label: '<b>All Genders</b>',
              close: true,
              onClick: () => {
                currentGender = '';
                applyFilters();
              }
            },
            { divider: true },
            {
              label: 'Male',
              close: true,
              onClick: () => {
                currentGender = 'MALE';
                applyFilters();
              }
            },
            {
              label: 'Female',
              close: true,
              onClick: () => {
                currentGender = 'FEMALE';
                applyFilters();
              }
            }
          ]
        },
        // Right — actions
        {
          label: 'Individuals',
          location: 'right',
          intent: 'is-info',
          modifyLabel: true,
          selection: true,
          options: [
            { label: 'Individuals', close: true, onClick: () => console.log('View Individuals') },
            { label: 'Teams', close: true, onClick: () => console.log('View Teams') }
          ]
        },
        {
          label: 'Actions',
          location: 'right',
          options: [
            { heading: 'Bulk Actions' },
            { label: 'Export Data', close: true, onClick: () => alert('Exporting...') },
            { divider: true },
            { heading: 'Add Participants' },
            { label: 'New Participant', close: true, onClick: () => alert('New participant form') }
          ]
        }
      ];

      controlBar({
        table,
        target,
        items,
        onSelection: (rows) => console.log(`${rows.length} selected`)
      });
    });

    return container;
  }
};

/**
 * Events Page — search, overlay delete, and a publish toggle button.
 */
export const EventsPage: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'section';
    container.style.maxWidth = '1200px';
    container.style.margin = '0 auto';

    const target = document.createElement('div');
    container.appendChild(target);

    const tableContainer = document.createElement('div');
    container.appendChild(tableContainer);

    requestAnimationFrame(() => {
      const data = [
        { id: 1, name: 'U16 Boys Singles', type: 'Singles', gender: 'M', draw: 32, status: 'Active' },
        { id: 2, name: 'U16 Girls Singles', type: 'Singles', gender: 'F', draw: 16, status: 'Active' },
        { id: 3, name: 'U18 Boys Singles', type: 'Singles', gender: 'M', draw: 32, status: 'Pending' },
        { id: 4, name: 'U18 Girls Singles', type: 'Singles', gender: 'F', draw: 16, status: 'Pending' },
        { id: 5, name: 'U16 Boys Doubles', type: 'Doubles', gender: 'M', draw: 16, status: 'Active' },
        { id: 6, name: 'U18 Mixed Doubles', type: 'Doubles', gender: 'X', draw: 8, status: 'Draft' }
      ];

      const table = new Tabulator(tableContainer, {
        data,
        height: '300px',
        layout: 'fitColumns',
        selectableRows: true,
        columns: [
          { title: 'Event', field: 'name', width: 200 },
          { title: 'Type', field: 'type', width: 100 },
          { title: 'Gender', field: 'gender', width: 80 },
          { title: 'Draw', field: 'draw', width: 70, hozAlign: 'right' },
          { title: 'Status', field: 'status', width: 100 }
        ]
      });

      const items = [
        {
          label: 'Delete selected',
          location: 'overlay',
          intent: 'is-danger',
          stateChange: true,
          onClick: () => {
            const selected = table.getSelectedData();
            if (confirm(`Delete ${selected.length} events?`)) {
              selected.forEach((row: any) => table.deleteRow(row.id));
            }
          }
        },
        {
          placeholder: 'Search events',
          location: 'left',
          search: true,
          clearSearch: () => table.clearFilter(),
          onKeyUp: (e: KeyboardEvent) => {
            const v = (e.target as HTMLInputElement).value;
            if (v) {
              table.setFilter('name', 'like', v);
            } else {
              table.clearFilter();
            }
          }
        },
        {
          label: 'Publish OOP',
          location: 'right',
          id: 'oopButton',
          onClick: () => {
            const btn = document.getElementById('oopButton');
            const published = btn?.classList.contains('is-primary');
            btn?.classList.toggle('is-primary');
            btn!.innerText = published ? 'Publish OOP' : 'Unpublish OOP';
          }
        },
        {
          label: 'Add event',
          location: 'right',
          intent: 'is-primary',
          onClick: () => alert('Add event')
        }
      ];

      controlBar({ table, target, items });
    });

    return container;
  }
};

/**
 * MatchUps Page — multiple filter dropdowns for event, status, and match type.
 */
export const MatchUpsPage: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'section';
    container.style.maxWidth = '1200px';
    container.style.margin = '0 auto';

    const target = document.createElement('div');
    container.appendChild(target);

    const tableContainer = document.createElement('div');
    container.appendChild(tableContainer);

    requestAnimationFrame(() => {
      const data = getParticipantData(16);
      const matchData = [];
      for (let i = 0; i < data.length - 1; i += 2) {
        matchData.push({
          id: i,
          matchUp: `${data[i].name} vs ${data[i + 1].name}`,
          event: i % 4 < 2 ? 'U16 Singles' : 'U18 Singles',
          status: i % 3 === 0 ? 'Complete' : 'Ready',
          type: 'Singles'
        });
      }

      const table = new Tabulator(tableContainer, {
        data: matchData,
        height: '300px',
        layout: 'fitColumns',
        selectableRows: true,
        columns: [
          { title: 'Match', field: 'matchUp', width: 300 },
          { title: 'Event', field: 'event', width: 140 },
          { title: 'Status', field: 'status', width: 100 },
          { title: 'Type', field: 'type', width: 100 }
        ]
      });

      let currentSearch = '';
      let currentEvent = '';
      let currentStatus = '';

      const applyFilters = () => {
        const filters: any[] = [];
        if (currentSearch) filters.push({ field: 'matchUp', type: 'like', value: currentSearch });
        if (currentEvent) filters.push({ field: 'event', type: '=', value: currentEvent });
        if (currentStatus) filters.push({ field: 'status', type: '=', value: currentStatus });
        table.clearFilter();
        if (filters.length) table.setFilter(filters);
      };

      const items = [
        {
          label: 'Schedule',
          location: 'overlay',
          stateChange: true,
          intent: 'is-info',
          onClick: () => alert('Schedule selected')
        },
        {
          placeholder: 'Search matches',
          location: 'left',
          search: true,
          clearSearch: () => {
            currentSearch = '';
            applyFilters();
          },
          onKeyUp: (e: KeyboardEvent) => {
            currentSearch = (e.target as HTMLInputElement).value;
            applyFilters();
          }
        },
        {
          label: 'All Events',
          location: 'left',
          modifyLabel: true,
          selection: true,
          options: [
            {
              label: '<b>All Events</b>',
              close: true,
              onClick: () => {
                currentEvent = '';
                applyFilters();
              }
            },
            { divider: true },
            {
              label: 'U16 Singles',
              close: true,
              onClick: () => {
                currentEvent = 'U16 Singles';
                applyFilters();
              }
            },
            {
              label: 'U18 Singles',
              close: true,
              onClick: () => {
                currentEvent = 'U18 Singles';
                applyFilters();
              }
            }
          ]
        },
        {
          label: 'All Statuses',
          location: 'left',
          modifyLabel: true,
          selection: true,
          options: [
            {
              label: '<b>All Statuses</b>',
              close: true,
              onClick: () => {
                currentStatus = '';
                applyFilters();
              }
            },
            { divider: true },
            {
              label: 'Ready',
              close: true,
              onClick: () => {
                currentStatus = 'Ready';
                applyFilters();
              }
            },
            {
              label: 'Complete',
              close: true,
              onClick: () => {
                currentStatus = 'Complete';
                applyFilters();
              }
            }
          ]
        }
      ];

      controlBar({ table, target, items });
    });

    return container;
  }
};

/**
 * Venues Page — minimal controlBar with overlay delete and an add button.
 */
export const VenuesPage: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'section';
    container.style.maxWidth = '1200px';
    container.style.margin = '0 auto';

    const target = document.createElement('div');
    container.appendChild(target);

    const tableContainer = document.createElement('div');
    container.appendChild(tableContainer);

    requestAnimationFrame(() => {
      const data = [
        { id: 1, name: 'Central Tennis Club', courts: 8, surface: 'Hard' },
        { id: 2, name: 'Riverside Courts', courts: 4, surface: 'Clay' },
        { id: 3, name: 'Lakeside Arena', courts: 12, surface: 'Hard' },
        { id: 4, name: 'Mountain View TC', courts: 6, surface: 'Grass' }
      ];

      const table = new Tabulator(tableContainer, {
        data,
        height: '250px',
        layout: 'fitColumns',
        selectableRows: true,
        columns: [
          { title: 'Venue', field: 'name', width: 250 },
          { title: 'Courts', field: 'courts', width: 80, hozAlign: 'right' },
          { title: 'Surface', field: 'surface', width: 100 }
        ]
      });

      const items = [
        {
          label: 'Delete selected',
          location: 'overlay',
          intent: 'is-danger',
          stateChange: true,
          onClick: () => {
            const selected = table.getSelectedData();
            if (confirm(`Delete ${selected.length} venues?`)) {
              selected.forEach((row: any) => table.deleteRow(row.id));
            }
          }
        },
        { label: 'Add venue', location: 'right', intent: 'is-primary', onClick: () => alert('Add venue') }
      ];

      controlBar({ table, target, items });
    });

    return container;
  }
};

/**
 * All Locations — shows every controlBar zone: header, overlay, left, center, right.
 * The overlay zone is only visible when table rows are selected.
 */
export const AllLocations: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'section';
    container.style.maxWidth = '1200px';
    container.style.margin = '0 auto';

    const target = document.createElement('div');
    container.appendChild(target);

    const tableContainer = document.createElement('div');
    container.appendChild(tableContainer);

    requestAnimationFrame(() => {
      const table = new Tabulator(tableContainer, {
        data: [
          { id: 1, label: 'Select rows to reveal the overlay zone' },
          { id: 2, label: 'Each button shows its location' },
          { id: 3, label: 'The header zone appears above the bar' }
        ],
        height: '200px',
        layout: 'fitColumns',
        selectableRows: true,
        columns: [{ title: 'Info', field: 'label' }]
      });

      const items = [
        { location: 'header', headerClick: () => alert('Header clicked!') },
        { text: '<b>Overlay action</b>', location: 'overlay', onClick: () => alert('Overlay') },
        { label: 'Left', location: 'left', intent: 'is-light', onClick: () => alert('Left') },
        { label: 'Center', location: 'center', intent: 'is-light', onClick: () => alert('Center') },
        { label: 'Right', location: 'right', intent: 'is-primary', onClick: () => alert('Right') }
      ];

      controlBar({ table, target, items });
    });

    return container;
  }
};
