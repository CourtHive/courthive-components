/**
 * Composite Table Pattern Stories
 *
 * Demonstrates the common pattern of Header + ControlBar + Table
 * used for data management pages.
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
  title: 'Components/ControlBar/Composite Pattern',
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj;

// Generate realistic participant data using the factory mock engine
function getParticipantData(count: number = 25) {
  const { tournamentRecord } = mocksEngine.generateTournamentRecord({
    participantsProfile: {
      participantsCount: count,
      participantType: 'INDIVIDUAL'
    }
  });

  tournamentEngine.setState(tournamentRecord);
  const { participants } = tournamentEngine.getParticipants();

  const statuses = ['Active', 'Inactive', 'Pending'];
  const teams = ['Team A', 'Team B', 'Team C', 'Team D'];

  return participants.map((p: any, i: number) => ({
    participantId: p.participantId,
    name: p.participantName,
    sex: p.person?.sex || '',
    status: statuses[i % 3],
    team: teams[i % 4],
    signedIn: Math.random() > 0.5
  }));
}

/**
 * Full Participants Page Example
 *
 * Demonstrates the complete Header + ControlBar + Table pattern:
 * - Header with live participant count
 * - Search with real-time filtering by name
 * - Gender and team dropdown filters
 * - Overlay actions (sign in, delete) shown when rows are selected
 * - Right-side view selector and actions menu
 */
export const FullParticipantsExample: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'section';
    container.style.maxWidth = '1400px';
    container.style.margin = '0 auto';

    // Header
    const header = document.createElement('div');
    header.className = 'tabHeader';
    header.style.cssText = 'padding: 0.75rem 0.5rem; font-size: 1.1rem; font-weight: bold; background: #f5f5f5;';
    header.innerHTML = 'Participants (0)';
    container.appendChild(header);

    // Control bar container
    const controlContainer = document.createElement('div');
    container.appendChild(controlContainer);

    // Table container
    const tableContainer = document.createElement('div');
    container.appendChild(tableContainer);

    requestAnimationFrame(() => {
      const data = getParticipantData(25);

      const table = new Tabulator(tableContainer, {
        data,
        height: '450px',
        layout: 'fitColumns',
        selectableRows: true,
        index: 'participantId',
        columns: [
          { title: 'Name', field: 'name', width: 200, sorter: 'string' },
          { title: 'Gender', field: 'sex', width: 90, sorter: 'string' },
          { title: 'Team', field: 'team', width: 120, sorter: 'string' },
          {
            title: 'Status',
            field: 'status',
            width: 100,
            formatter: (cell: any) => {
              const value = cell.getValue();
              const colors: any = { Active: 'is-success', Inactive: 'is-danger', Pending: 'is-warning' };
              return `<span class="tag ${colors[value] || ''}">${value}</span>`;
            }
          },
          {
            title: 'Signed In',
            field: 'signedIn',
            width: 90,
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

      // Filter state
      let currentSearch = '';
      let currentGender = '';
      let currentTeam = '';

      const applyFilters = () => {
        const filters: any[] = [];
        if (currentSearch) filters.push({ field: 'name', type: 'like', value: currentSearch });
        if (currentGender) filters.push({ field: 'sex', type: '=', value: currentGender });
        if (currentTeam) filters.push({ field: 'team', type: '=', value: currentTeam });
        table.clearFilter();
        if (filters.length) table.setFilter(filters);
      };

      const items = [
        // Overlay — bulk actions on selected rows
        {
          label: 'Sign In Selected',
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
          label: 'Add to Event',
          location: 'overlay',
          intent: 'is-info',
          options: [
            {
              label: 'U16 Singles',
              close: true,
              onClick: () => { alert(`Adding ${table.getSelectedData().length} to U16 Singles`); table.deselectRow(); }
            },
            {
              label: 'U18 Singles',
              close: true,
              onClick: () => { alert(`Adding ${table.getSelectedData().length} to U18 Singles`); table.deselectRow(); }
            },
            { divider: true },
            {
              label: '<b>Create New Event</b>',
              close: true,
              onClick: () => { alert('Create event'); table.deselectRow(); }
            }
          ]
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
          clearSearch: () => { currentSearch = ''; applyFilters(); },
          onKeyUp: (e: KeyboardEvent) => { currentSearch = (e.target as HTMLInputElement).value; applyFilters(); }
        },
        {
          label: 'All Genders',
          location: 'left',
          modifyLabel: true,
          selection: true,
          options: [
            { label: '<b>All Genders</b>', close: true, onClick: () => { currentGender = ''; applyFilters(); } },
            { divider: true },
            { label: 'Male', close: true, onClick: () => { currentGender = 'MALE'; applyFilters(); } },
            { label: 'Female', close: true, onClick: () => { currentGender = 'FEMALE'; applyFilters(); } }
          ]
        },
        {
          label: 'All Teams',
          location: 'left',
          modifyLabel: true,
          selection: true,
          options: [
            { label: '<b>All Teams</b>', close: true, onClick: () => { currentTeam = ''; applyFilters(); } },
            { divider: true },
            { label: 'Team A', close: true, onClick: () => { currentTeam = 'Team A'; applyFilters(); } },
            { label: 'Team B', close: true, onClick: () => { currentTeam = 'Team B'; applyFilters(); } },
            { label: 'Team C', close: true, onClick: () => { currentTeam = 'Team C'; applyFilters(); } },
            { label: 'Team D', close: true, onClick: () => { currentTeam = 'Team D'; applyFilters(); } }
          ]
        },
        // Right — view selector and actions
        {
          label: 'Individuals',
          location: 'right',
          intent: 'is-info',
          modifyLabel: true,
          selection: true,
          options: [
            { label: 'Individuals', close: true, onClick: () => console.log('Individuals view') },
            { label: 'Teams', close: true, onClick: () => console.log('Teams view') },
            { label: 'Groups', close: true, onClick: () => console.log('Groups view') }
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
            {
              label: 'Generate More',
              close: true,
              onClick: () => {
                const more = getParticipantData(10);
                table.addData(more);
                alert('Added 10 participants');
              }
            },
            { label: 'New Participant', close: true, onClick: () => alert('New participant form') }
          ]
        }
      ];

      controlBar({
        table,
        target: controlContainer,
        items,
        onSelection: (rows) => console.log(`${rows.length} selected`)
      });
    });

    return container;
  }
};

/**
 * Minimal Example
 *
 * The simplest possible Header + ControlBar + Table: just a search input
 * and a data table. Shows the minimum code needed to use the pattern.
 */
export const MinimalExample: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'section';
    container.style.maxWidth = '900px';
    container.style.margin = '0 auto';

    const header = document.createElement('div');
    header.className = 'tabHeader';
    header.style.cssText = 'padding: 0.75rem 0.5rem; font-size: 1.1rem; font-weight: bold;';
    header.innerHTML = 'Items (0)';
    container.appendChild(header);

    const controlContainer = document.createElement('div');
    container.appendChild(controlContainer);

    const tableContainer = document.createElement('div');
    container.appendChild(tableContainer);

    requestAnimationFrame(() => {
      const data = [
        { id: 1, name: 'Court 1', surface: 'Hard', available: true },
        { id: 2, name: 'Court 2', surface: 'Clay', available: false },
        { id: 3, name: 'Court 3', surface: 'Hard', available: true },
        { id: 4, name: 'Court 4', surface: 'Grass', available: true },
        { id: 5, name: 'Court 5', surface: 'Hard', available: false }
      ];

      const table = new Tabulator(tableContainer, {
        data,
        height: '250px',
        layout: 'fitColumns',
        columns: [
          { title: 'Court', field: 'name' },
          { title: 'Surface', field: 'surface' },
          {
            title: 'Available',
            field: 'available',
            hozAlign: 'center',
            formatter: (cell: any) =>
              cell.getValue()
                ? '<span style="color: green;">Yes</span>'
                : '<span style="color: #ccc;">No</span>'
          }
        ]
      });

      const items = [
        {
          placeholder: 'Search...',
          location: 'left',
          search: true,
          clearSearch: () => table.clearFilter(),
          onKeyUp: (e: KeyboardEvent) => {
            const v = (e.target as HTMLInputElement).value;
            v ? table.setFilter('name', 'like', v) : table.clearFilter();
          }
        }
      ];

      controlBar({ table, target: controlContainer, items });

      table.on('dataFiltered', () => {
        header.innerHTML = `Items (${table.getRows('active').length})`;
      });
      table.on('tableBuilt', () => {
        header.innerHTML = `Items (${table.getData().length})`;
      });
    });

    return container;
  }
};
