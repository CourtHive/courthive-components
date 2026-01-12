# Inline Participant Assignment Implementation Plan

## Overview
Enable inline participant assignment within draw structures by rendering typeahead input fields in empty draw positions, allowing users to assign participants by typing names directly into the draw bracket.

## Architecture

### Current Flow
```
renderMatchUp() 
  → renderSide() (for each side)
    → renderParticipant() 
      → renderIndividual() 
        → Renders: participant name OR placeholder (TBD/Qualifier/BYE)
```

### Extended Flow (with inline assignment)
```
renderMatchUp() 
  → renderSide() 
    → renderParticipant() 
      → renderIndividual() 
        → IF no participant AND inlineAssignment enabled:
             → renderParticipantInput() (NEW)
                → renderField() with typeahead
           ELSE:
             → Render placeholder (existing logic)
```

## Implementation Steps

### 1. Type Definitions (src/types/index.ts)
Add to EventHandlers interface:
```typescript
assignParticipant?: (params: {
  matchUp: MatchUp;
  side: Side;
  sideNumber: number;
  participant: Participant;
  pointerEvent?: Event;
}) => void;
```

Add to Composition configuration:
```typescript
configuration?: {
  // ...existing properties
  inlineAssignment?: boolean;
  participantProvider?: () => Participant[];
}
```

### 2. Create renderParticipantInput Component
**File**: `src/components/renderParticipantInput.ts`

**Purpose**: Render typeahead input field for participant selection

**Key Features**:
- Uses renderField() with typeahead configuration
- Converts participant list to { label, value } format for typeahead
- Handles selection callback to trigger assignParticipant event
- Properly sized to fit within participant name area
- Returns HTMLElement that can be appended to name div

**Example Usage**:
```typescript
const inputField = renderParticipantInput({
  matchUp,
  side,
  sideNumber,
  eventHandlers,
  composition,
  availableParticipants: configuration.participantProvider()
});
```

### 3. Extend renderIndividual Component
**File**: `src/components/renderIndividual.ts`

**Changes** (around line 70-80):
```typescript
if (participantName) {
  // Existing: render participant name
  const span = document.createElement('span');
  // ...existing code
  name.appendChild(span);
} else {
  const configuration = composition?.configuration;
  
  // NEW: Check if inline assignment is enabled
  if (configuration?.inlineAssignment && 
      eventHandlers?.assignParticipant && 
      configuration?.participantProvider) {
    
    const inputField = renderParticipantInput({
      matchUp,
      side,
      sideNumber,
      eventHandlers,
      composition
    });
    name.appendChild(inputField);
    
  } else {
    // Existing: render placeholder
    const placeholder = document.createElement('abbr');
    placeholder.className = getPlacholderStyle({ 
      variant: configuration.showAddress ? 'showAddress' : '' 
    });
    placeholder.innerHTML =
      (side?.bye && placeHolders.BYE) || 
      (side?.qualifier && placeHolders.QUALIFIER) || 
      placeHolders.TBD;
    name.appendChild(placeholder);
  }
}
```

### 4. Doubles Support Considerations

For doubles matchUps (2 participants per side):
- Render 2 separate input fields stacked vertically
- Both fields must be filled before assignment is complete
- Track partial state (1 of 2 assigned)
- Consider UI feedback for partial assignment

**Potential approach**:
```typescript
if (isDoubles && !participant) {
  // Render placeholder for first partner
  const partner1Input = renderParticipantInput({ 
    position: 1, 
    ...params 
  });
  annotationDiv.appendChild(partner1Input);
  
  // Render placeholder for second partner
  const partner2Input = renderParticipantInput({ 
    position: 2, 
    ...params 
  });
  annotationDiv.appendChild(partner2Input);
}
```

## Consumer Integration (TMX Example)

### Usage in TMX:
```typescript
const composition = {
  ...existingComposition,
  configuration: {
    ...existingConfiguration,
    inlineAssignment: true,
    participantProvider: () => {
      // Get unassigned participants from tournamentEngine
      const { participants } = tournamentEngine.getParticipants({
        participantFilters: { participantTypes: ['INDIVIDUAL'] }
      });
      
      // Filter out already assigned
      return participants.filter(p => !isAssignedToEvent(p));
    }
  }
};

const eventHandlers = {
  ...existingHandlers,
  assignParticipant: async ({ matchUp, side, participant, sideNumber }) => {
    const result = await mutationRequest({
      methods: [{
        method: 'assignDrawPosition',
        params: {
          drawId: matchUp.drawId,
          structureId: matchUp.structureId,
          drawPosition: side.drawPosition,
          participantId: participant.participantId
        }
      }]
    });
    
    if (result.success) {
      // Refresh draw display
      renderDrawView({ drawId, structureId });
    }
  }
};
```

## Styling Considerations

### Input Field Sizing
- Match existing participant name font size and styling
- Ensure dropdown doesn't get clipped by matchUp container
- Consider z-index for dropdown overlay
- Maintain visual consistency with TBD/Qualifier placeholders

### CSS Updates Needed
```css
.participant-assignment-input {
  width: 100%;
  font-size: inherit;
  padding: 2px 4px;
  border: 1px solid #ccc;
  border-radius: 2px;
}

.participant-assignment-input:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 1px;
}

/* Ensure typeahead dropdown appears above other elements */
.awesomplete > ul {
  z-index: 9999;
}
```

## Testing Strategy

### Storybook Stories (DONE)
✅ Created `participantAssignment.stories.ts` with:
- EmptySingles: Both sides empty
- PartiallyAssigned: One side filled, one empty
- EmptyDoubles: Doubles matchUp with no participants

### Unit Tests (TODO)
- renderParticipantInput creates proper input element
- Typeahead receives correct participant list
- Selection triggers assignParticipant event
- Doubles renders 2 input fields
- Falls back to placeholder when inlineAssignment disabled

### Integration Tests (TODO)
- Full flow: type name → select → assignment → re-render
- Keyboard navigation (Tab, Enter, Escape)
- Click outside to cancel
- Error handling for failed assignments

## Implementation Checklist

- [x] Create Storybook story for participant assignment scenarios
- [ ] Create renderParticipantInput component
- [ ] Update EventHandlers type with assignParticipant
- [ ] Update Composition configuration type
- [ ] Modify renderIndividual to conditionally render input
- [ ] Handle doubles (2 inputs per side)
- [ ] Add CSS styling for input fields
- [ ] Test typeahead dropdown z-index
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Document API in README
- [ ] Update courthive-components version
- [ ] Test integration in TMX

## Open Questions

1. **Partial doubles assignment**: Should we allow assigning just 1 of 2 partners? Or require both?
2. **Input clearing**: Should there be a clear/remove button once assigned?
3. **Validation**: Should we validate participant eligibility (age, gender, etc.) at render time?
4. **Loading states**: How to handle async participant list loading?
5. **Keyboard shortcuts**: Any special keyboard shortcuts for quick assignment?

## Next Steps

1. Implement `renderParticipantInput.ts` component
2. Test in Storybook to validate UI/UX
3. Extend renderIndividual with conditional logic
4. Build and test in TMX integration
5. Iterate based on user feedback
