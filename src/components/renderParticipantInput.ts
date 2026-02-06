/**
 * Render typeahead input field for inline participant assignment
 * Used when matchUp has empty draw positions and inlineAssignment is enabled
 */
import { renderField } from './forms/renderField';
import { isFunction } from './modal/cmodal';
import type { Composition, EventHandlers, MatchUp, Side } from '../types';

export function renderParticipantInput({
  matchUp,
  side,
  sideNumber,
  eventHandlers,
  composition,
  position
}: {
  matchUp: MatchUp;
  side?: Side;
  sideNumber?: number;
  eventHandlers?: EventHandlers;
  composition?: Composition;
  position?: number; // For doubles: 1 or 2
}): HTMLElement {
  const configuration = composition?.configuration;
  const drawPosition = side?.drawPosition;
  
  console.log(`[ParticipantInput] Creating input for drawPosition ${drawPosition}`, {
    matchUpId: matchUp.matchUpId,
    roundNumber: matchUp.roundNumber,
    sideNumber,
  });
  
  // Get initial list
  const getParticipantList = () => {
    const availableParticipants = 
      isFunction(configuration?.participantProvider) 
        ? configuration.participantProvider() 
        : [];
    
    console.log(`[ParticipantInput] Getting participant list for drawPosition ${drawPosition}:`, {
      availableCount: availableParticipants.length,
      participants: availableParticipants.map(p => p.participantName).slice(0, 5),
    });
    
    return availableParticipants.map((participant) => ({
      label: participant.participantName || participant.participantId,
      value: participant.participantId,
    }));
  };

  const initialList = getParticipantList();

  // Handle participant selection
  const handleAssignment = (participantId: string) => {
    // Get fresh list to find participant
    const availableParticipants = 
      isFunction(configuration?.participantProvider) 
        ? configuration.participantProvider() 
        : [];
    
    const participant = availableParticipants.find((p) => p.participantId === participantId);
    
    console.log(`[ParticipantInput] Assigning participant to drawPosition ${drawPosition}:`, {
      participantId,
      participantName: participant?.participantName,
      drawPosition,
    });
    
    if (participant && isFunction(eventHandlers?.assignParticipant) && side) {
      eventHandlers.assignParticipant({
        matchUp,
        side,
        sideNumber: sideNumber || 1,
        participant,
      });
    }
  };

  // Handle moving focus to next input after selection
  const handleSelectComplete = () => {
    console.log(`[ParticipantInput] Selection complete for drawPosition ${drawPosition}, moving to next input`);
    
    // Find all participant assignment inputs
    const allInputs = Array.from(
      document.querySelectorAll('.participant-assignment-input input')
    ) as HTMLInputElement[];
    
    // Find the current input
    const currentIndex = allInputs.findIndex(input => 
      input.id === fieldId
    );
    
    console.log(`[ParticipantInput] Found ${allInputs.length} inputs, current index: ${currentIndex}`);
    
    // Focus the next input if it exists
    if (currentIndex !== -1 && currentIndex < allInputs.length - 1) {
      const nextInput = allInputs[currentIndex + 1];
      setTimeout(() => {
        nextInput.focus();
        console.log(`[ParticipantInput] Focused next input: ${nextInput.id}`);
      }, 100);
    }
  };

  // Create input field using renderField
  const fieldId = `assign-${matchUp.matchUpId}-side${sideNumber}${position ? `-p${position}` : ''}`;
  
  const { field } = renderField({
    typeAhead: {
      list: initialList,
      callback: handleAssignment,
      onSelectComplete: handleSelectComplete,
      listProvider: getParticipantList, // Pass the function to refresh list
    },
    placeholder: position ? `Partner ${position}` : 'Type participant name...',
    field: fieldId,
    id: fieldId,
    class: 'participant-assignment-input',
  });

  // Add data attribute to identify input by drawPosition
  if (drawPosition) {
    field.setAttribute('data-draw-position', drawPosition.toString());
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
