/**
 * Render typeahead input field for inline participant assignment
 * Used when matchUp has empty draw positions and inlineAssignment is enabled
 */
import { renderField } from '../forms/renderField';
import { isFunction } from '../modal/cmodal';
import type { Composition, EventHandlers, MatchUp, Side } from '../../types';

// Special values to identify BYE and QUALIFIER selection
const BYE_VALUE = '__BYE__';
const QUALIFIER_VALUE = '__QUALIFIER__';

export function renderParticipantInput({
  matchUp,
  side,
  sideNumber,
  eventHandlers,
  composition,
  position,
  currentParticipant
}: {
  matchUp: MatchUp;
  side?: Side;
  sideNumber?: number;
  eventHandlers?: EventHandlers;
  composition?: Composition;
  position?: number; // For doubles: 1 or 2
  currentParticipant?: any; // Current assigned participant (for persistInputFields mode)
}): HTMLElement {
  const configuration = composition?.configuration;
  const drawPosition = side?.drawPosition;

  // Get initial list with BYE and QUALIFIER options
  const getParticipantList = () => {
    const availableParticipants = isFunction(configuration?.participantProvider)
      ? configuration.participantProvider()
      : [];

    // In persistInputFields mode, include the current participant even if already assigned
    const persistMode = configuration?.persistInputFields;
    let participantsToShow = availableParticipants;

    if (persistMode && currentParticipant) {
      // Check if current participant is in the available list
      const currentIsAvailable = availableParticipants.some(
        (p) => p.participantId === currentParticipant.participantId
      );

      // If not in list (because it's already assigned), add it
      if (!currentIsAvailable) {
        participantsToShow = [currentParticipant, ...availableParticipants];
      }
    }

    // Convert participants to options
    const participantOptions = participantsToShow.map((participant) => ({
      label: participant.participantName || participant.participantId,
      value: participant.participantId
    }));

    // Check if current assignment is BYE or QUALIFIER
    const currentIsBye = currentParticipant?.participantId === BYE_VALUE;
    const currentIsQualifier = currentParticipant?.participantId === QUALIFIER_VALUE;

    // Build special options list
    const specialOptions = [];

    // Add BYE unless it's already the current value
    if (!currentIsBye) {
      specialOptions.push({ label: '— BYE —', value: BYE_VALUE });
    }

    // Add QUALIFIER if hasQualifying is enabled, unless it's already the current value
    const hasQualifying = configuration?.hasQualifying;
    if (hasQualifying && !currentIsQualifier) {
      specialOptions.push({ label: '— QUALIFIER —', value: QUALIFIER_VALUE });
    }

    // Return special options + participant options
    return [...specialOptions, ...participantOptions];
  };

  const initialList = getParticipantList();

  // Handle participant or BYE or QUALIFIER selection
  const handleAssignment = (value: string) => {
    if (!side) return;

    // Check if field was cleared (empty value means user wants to remove assignment)
    if (!value || value.trim() === '') {
      if (isFunction(eventHandlers?.removeAssignment)) {
        eventHandlers.removeAssignment({
          matchUp,
          side,
          sideNumber: sideNumber || 1
        });
      }
      return;
    }

    // Check if BYE was selected
    if (value === BYE_VALUE) {
      if (isFunction(eventHandlers?.assignBye)) {
        eventHandlers.assignBye({
          matchUp,
          side,
          sideNumber: sideNumber || 1
        });
      }
      return;
    }

    // Check if QUALIFIER was selected
    if (value === QUALIFIER_VALUE) {
      if (isFunction(eventHandlers?.assignQualifier)) {
        eventHandlers.assignQualifier({
          matchUp,
          side,
          sideNumber: sideNumber || 1
        });
      }
      return;
    }

    // Regular participant assignment
    const availableParticipants = isFunction(configuration?.participantProvider)
      ? configuration.participantProvider()
      : [];

    const participant = availableParticipants.find((p) => p.participantId === value);

    if (participant && isFunction(eventHandlers?.assignParticipant)) {
      eventHandlers.assignParticipant({
        matchUp,
        side,
        sideNumber: sideNumber || 1,
        participant
      });
    }
  };

  // Track if user is manually tabbing (vs programmatic focus)
  let isManualTabbing = false;

  // Handle moving focus to next input after selection
  const handleSelectComplete = () => {
    // Don't auto-focus if user is manually tabbing backwards
    if (isManualTabbing) {
      isManualTabbing = false;
      return;
    }

    // Find all participant assignment inputs
    const allInputs = Array.from(
      document.querySelectorAll('.participant-assignment-input input')
    ) as HTMLInputElement[];

    // Find the current input
    const currentIndex = allInputs.findIndex((input) => input.id === fieldId);

    // Focus the next input if it exists
    if (currentIndex !== -1 && currentIndex < allInputs.length - 1) {
      const nextInput = allInputs[currentIndex + 1];
      setTimeout(() => {
        nextInput.focus();
      }, 100);
    }
  };

  // Create input field using renderField
  const fieldId = `assign-${matchUp.matchUpId}-side${sideNumber}${position ? `-p${position}` : ''}`;

  // Set current value if participant is assigned (for persistInputFields mode)
  const currentValue = currentParticipant?.participantId;

  const { field } = renderField({
    typeAhead: {
      list: initialList,
      callback: handleAssignment,
      onSelectComplete: handleSelectComplete,
      listProvider: getParticipantList, // Pass the function to refresh list
      currentValue // Show current assignment in input field
    },
    placeholder: position ? `Partner ${position}` : 'Type participant name...',
    field: fieldId,
    id: fieldId,
    class: 'participant-assignment-input'
  });

  // Add data attribute to identify input by drawPosition
  if (drawPosition) {
    field.dataset.drawPosition = drawPosition.toString();
  }

  // Track manual Tab/Shift+Tab navigation to prevent auto-focus interference
  const inputElement = field.querySelector('input');
  if (inputElement) {
    inputElement.addEventListener('keydown', (evt: KeyboardEvent) => {
      if (evt.key === 'Tab') {
        // User is manually tabbing (forward or backward)
        isManualTabbing = true;

        // Clear the flag after a short delay in case they're just navigating
        setTimeout(() => {
          isManualTabbing = false;
        }, 500);
      }
    });
  }

  // Style for inline display
  field.style.width = '100%';
  field.style.margin = '0';

  // Apply font size if specified in configuration (optional)
  // Only set on the field wrapper to allow CSS inheritance
  const fontSize = configuration?.assignmentInputFontSize;
  if (fontSize) {
    field.style.fontSize = fontSize;
  }

  // Walk up the DOM and disable overflow on all ancestors with JavaScript
  setTimeout(() => {
    const input = field.querySelector('input');
    if (input) {
      let element: HTMLElement | null = input.parentElement;
      let level = 0;
      while (element && level < 15) {
        const styles = window.getComputedStyle(element);
        // Force overflow visible on any element that has overflow scroll/auto/hidden
        if (styles.overflow !== 'visible' || styles.overflowX !== 'visible' || styles.overflowY !== 'visible') {
          element.style.setProperty('overflow', 'visible', 'important');
          element.style.setProperty('overflow-x', 'visible', 'important');
          element.style.setProperty('overflow-y', 'visible', 'important');
        }
        element = element.parentElement;
        level++;
      }
    }
  }, 100);

  return field;
}
