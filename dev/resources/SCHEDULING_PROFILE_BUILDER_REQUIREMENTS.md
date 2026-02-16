# Scheduling Profile Builder UI - Requirements & Guidance

**Date:** February 7, 2026  
**Status:** Awaiting User Input  
**Phase:** 7 of 8

---

## 📋 Purpose

The **Scheduling Profile Builder** is a UI that allows tournament directors to:

1. Define **which courts** are available for **which events/rounds**
2. Specify **time windows** for different match categories
3. Build a **scheduling profile** that gets passed to `scheduleProfileRounds()`
4. Validate capacity vs. requirements before committing

---

## 🎯 Current State

### Data Layer (Complete) ✅

The **bridge** already has the data functions:

```typescript
// Bridge function (already implemented)
function buildSchedulingProfileFromUISelections(
  selections: SchedulingSelection[]
): SchedulingProfile {
  // Converts UI selections → Competition Factory format
  // Ready for scheduleProfileRounds()
}

interface SchedulingSelection {
  eventId: string;
  roundNumber: number;
  venues: {
    venueId: string;
    courts: CourtRef[];
    timeRanges: TimeRange[];
  }[];
}

interface SchedulingProfile {
  profileId: string;
  profileName: string;
  items: SchedulingProfileItem[];
}
```

### What's Needed (UI Layer) ⏳

A visual interface that:
1. Shows events/rounds that need scheduling
2. Lets users assign courts + time ranges
3. Validates capacity vs. match requirements
4. Saves and loads profiles

---

## 🤔 Questions for User

### 1. **UI Structure & Layout**

**Question:** What should the overall layout look like?

**Options:**
- [ ] **Modal/Dialog** - Opens over the temporal grid
- [ ] **Side Panel** - Slides in from right, shows alongside grid
- [ ] **Separate Page** - Dedicated route/view
- [ ] **Embedded Section** - Below or beside the grid
- [ ] **Other:** ___________

**Additional Considerations:**
- Should it be accessible while viewing the grid?
- Does it need to show capacity curves simultaneously?
- Should users see the calendar while building profiles?

---

### 2. **Event/Round Selection**

**Question:** How should users select which events/rounds to configure?

**Current Tournament Structure:**
```
Tournament
├── Event 1: Men's Singles
│   ├── Round 1: R64 (32 matches)
│   ├── Round 2: R32 (16 matches)
│   ├── Round 3: R16 (8 matches)
│   └── ...
├── Event 2: Women's Singles
│   └── ...
└── Event 3: Men's Doubles
    └── ...
```

**Options:**
- [ ] **Tree View** - Hierarchical selection (Event → Rounds)
- [ ] **Table View** - Flat list with filters
- [ ] **Wizard/Stepper** - Step-by-step configuration
- [ ] **Dropdown Menus** - Simple selectors
- [ ] **Other:** ___________

**Should Users:**
- [ ] Configure one round at a time
- [ ] Configure multiple rounds simultaneously
- [ ] Copy settings from one round to another
- [ ] Create templates for common patterns

---

### 3. **Court Assignment**

**Question:** How should users assign courts to events/rounds?

**Options:**
- [ ] **Checkboxes** - Select courts from facility tree
- [ ] **Drag & Drop** - Drag events to courts on timeline
- [ ] **Multi-Select List** - Transfer list (available ↔ assigned)
- [ ] **Visual Court Map** - Click courts on venue diagram
- [ ] **Other:** ___________

**Considerations:**
- Should assignment happen on the temporal grid itself?
- Or in a separate court selection interface?
- Should users see court metadata (surface, indoor, etc.)?
- Filter by court attributes (surface type, capacity)?

---

### 4. **Time Range Definition**

**Question:** How should users specify time windows for rounds?

**Options:**
- [ ] **Time Pickers** - Start/end time inputs
- [ ] **Timeline Selection** - Click-drag on visual timeline
- [ ] **Preset Blocks** - Morning, Afternoon, Evening
- [ ] **Smart Defaults** - Auto-suggest based on match count
- [ ] **Paint Mode** - Use existing temporal grid paint mode
- [ ] **Other:** ___________

**Considerations:**
- Should time ranges align with existing availability blocks?
- Can one round have multiple time windows (morning + afternoon)?
- Should users see estimated match duration?
- Validate that window can fit all required matches?

---

### 5. **Capacity Validation**

**Question:** How should capacity vs. requirements be displayed?

**Example:**
```
Round 1 (R32): 16 matches needed

Configuration:
- 4 courts assigned
- 10:00-18:00 (8 hours)

Capacity:
- Max sequential matches: 4 courts × 4 slots = 16 ✓
- Requires ~1 hour per match
- All matches can be scheduled ✓
```

**Display Options:**
- [ ] **Traffic Light** - Green/Yellow/Red indicator
- [ ] **Detailed Breakdown** - Show calculations
- [ ] **Visual Progress Bar** - Capacity vs. requirement
- [ ] **Real-time Preview** - Show what schedule would look like
- [ ] **Other:** ___________

**What to Validate:**
- [ ] Sufficient court-hours available
- [ ] Time window adequate for match count
- [ ] No conflicts with other rounds
- [ ] Follow-by constraints satisfied
- [ ] Other: ___________

---

### 6. **Profile Management**

**Question:** How should profiles be saved, loaded, and managed?

**Use Cases:**
- Create new profile from scratch
- Load existing profile
- Edit saved profile
- Duplicate profile
- Delete profile
- Export/import profiles

**Options:**
- [ ] **Simple List** - Dropdown to select profile
- [ ] **Profile Library** - Dedicated management view
- [ ] **Template System** - Pre-built templates + custom
- [ ] **Version History** - Track changes over time
- [ ] **Other:** ___________

**Storage:**
- [ ] In tournament record (TODS)
- [ ] Browser localStorage
- [ ] Server/database
- [ ] Export as JSON file
- [ ] Other: ___________

---

### 7. **Integration with Temporal Grid**

**Question:** How should the profile builder integrate with the temporal grid?

**Options:**
- [ ] **Live Preview** - Changes instantly visible on grid
- [ ] **Apply Button** - Preview then apply when ready
- [ ] **Separate Workflow** - Build profile, then import to grid
- [ ] **Bidirectional** - Changes in grid update profile
- [ ] **Other:** ___________

**Considerations:**
- Should profile assignments create blocks on the grid?
- Should existing grid blocks inform profile suggestions?
- Can users toggle between grid view and profile view?
- Show conflicts between profile and existing blocks?

---

### 8. **User Workflow**

**Question:** What's the typical workflow for a tournament director?

**Please describe the step-by-step process:**

1. ___________________________________________
2. ___________________________________________
3. ___________________________________________
4. ___________________________________________
5. ___________________________________________

**Example Workflow:**
```
1. Set up tournament dates and venues in system
2. Define court availability using temporal grid
3. Open profile builder
4. For each event/round:
   a. Select event and round
   b. Assign courts (filtered by surface if needed)
   c. Define time window(s)
   d. Validate capacity
5. Save profile
6. Run scheduleProfileRounds()
7. Review generated schedule
8. Make adjustments if needed
```

---

### 9. **Advanced Features**

**Question:** Which advanced features are needed?

- [ ] **Bulk Operations** - Assign same settings to multiple rounds
- [ ] **Smart Suggestions** - AI/algorithm suggests optimal assignments
- [ ] **Constraint Rules** - Define must/must-not rules (e.g., finals only on center court)
- [ ] **What-If Analysis** - Test different configurations
- [ ] **Templates** - Save common patterns (e.g., "Standard Draw", "Indoor Tournament")
- [ ] **Import from Previous Tournament** - Reuse past configurations
- [ ] **Visual Timeline** - Gantt-chart view of entire tournament
- [ ] **Conflict Warnings** - Real-time validation as user configures
- [ ] **Other:** ___________

---

### 10. **Visual Design**

**Question:** What's the desired look and feel?

**Style:**
- [ ] Match existing temporal grid aesthetic
- [ ] More form-focused (traditional inputs)
- [ ] Highly visual (drag-drop, interactive)
- [ ] Minimal/simple
- [ ] Other: ___________

**Key Colors:**
- Primary action: ___________ (default: #218D8D teal)
- Warning/validation: ___________ (default: #f39c12 amber)
- Error: ___________ (default: #e74c3c red)
- Success: ___________ (default: #27ae60 green)

**Components Needed:**
- [ ] Date picker
- [ ] Time picker
- [ ] Multi-select lists
- [ ] Tree view
- [ ] Tables
- [ ] Cards
- [ ] Modals
- [ ] Progress indicators
- [ ] Other: ___________

---

### 11. **Accessibility & Responsiveness**

**Requirements:**
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Mobile responsive (or desktop-only?)
- [ ] Touch-friendly (tablets)
- [ ] High contrast mode
- [ ] Internationalization (multiple languages?)

---

### 12. **Data Flow & Integration**

**Question:** How does this fit into the larger system?

```
Current System:
┌─────────────────────────────────────────┐
│ Competition Factory (TODS)              │
│ - Tournament records                    │
│ - Events, draws, matches                │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ Temporal Grid                           │
│ - Court availability management         │
│ - Visual timeline interface             │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ Scheduling Profile Builder ← NEW        │
│ - Event/round → court/time assignments  │
│ - Validation & preview                  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ scheduleProfileRounds()                 │
│ - Generates actual match schedule       │
└─────────────────────────────────────────┘
```

**Questions:**
- Where does the profile builder live in this flow?
- Is it part of temporal grid UI or separate?
- Does it read from grid state or tournament record directly?
- Does it write back to grid or just export profile?

---

## 🎨 Visual Mockup Considerations

**Please provide:**
- [ ] Sketches or wireframes (if available)
- [ ] Screenshots of similar UIs you like
- [ ] Links to reference applications
- [ ] Specific component preferences

**Or describe in words:**

___________________________________________
___________________________________________
___________________________________________

---

## 🔧 Technical Constraints

**Existing Stack:**
- Framework: Vanilla JS (ES6+)
- Calendar: @event-calendar/core
- Styling: Custom CSS + Bulma integration
- State: TemporalGridEngine (reactive)
- Testing: Vitest

**Should Profile Builder Use:**
- [ ] Same vanilla JS approach
- [ ] Can use a framework (React, Vue, Svelte?)
- [ ] Preference: ___________

---

## 📝 Additional Notes

**Please add any other considerations, requirements, or ideas:**

___________________________________________
___________________________________________
___________________________________________
___________________________________________
___________________________________________

---

## 🎯 Next Steps

Once you fill out this document, I will:

1. Design the UI architecture
2. Create component structure
3. Implement the interface
4. Write tests
5. Create Storybook stories
6. Integrate with temporal grid

**Estimated Implementation Time:** 3-4 hours after requirements are clear

---

**Ready for your input!** Please fill out the sections above with your preferences and guidance. 🚀
