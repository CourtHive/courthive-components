/**
 * Render typeahead input field for inline participant assignment
 * Used when matchUp has empty draw positions and inlineAssignment is enabled
 */
import { renderField } from './forms/renderField';
import { isFunction } from './modal/cmodal';
import type { Composition, EventHandlers, MatchUp, Participant, Side } from '../types';

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
  
  // Get available participants from provider
  const availableParticipants = 
    isFunction(configuration?.participantProvider) 
      ? configuration.participantProvider() 
      : [];

  // Convert participants to typeahead format
  const list = availableParticipants.map((participant) => ({
    label: participant.participantName || participant.participantId,
    value: participant.participantId,
  }));

  // Handle participant selection
  const handleAssignment = (participantId: string) => {
    const participant = availableParticipants.find((p) => p.participantId === participantId);
    
    if (participant && isFunction(eventHandlers?.assignParticipant) && side) {
      eventHandlers.assignParticipant({
        matchUp,
        side,
        sideNumber: sideNumber || 1,
        participant,
      });
    }
  };

  // Create input field using renderField
  const fieldId = `assign-${matchUp.matchUpId}-side${sideNumber}${position ? `-p${position}` : ''}`;
  
  const { field } = renderField({
    typeAhead: {
      list,
      callback: handleAssignment,
    },
    placeholder: position ? `Partner ${position}` : 'Type participant name...',
    field: fieldId,
    id: fieldId,
    class: 'participant-assignment-input',
  });

  // Style for inline display
  field.style.width = '100%';
  field.style.margin = '0';

  return field;
}
