/**
 * Draw State Manager
 * Manages tournament draw state and participant assignments using tournamentEngine API
 */
import { tournamentEngine } from 'tods-competition-factory';
import type { Participant } from '../types';

export type RenderCallback = () => void;

export class DrawStateManager {
  private tournamentRecord: any;
  private readonly drawId: string;
  private readonly structureId: string;
  private readonly eventId: string;
  private renderCallback?: RenderCallback;
  private focusDrawPosition?: number; // Track which position to focus after re-render

  constructor({
    tournamentRecord,
    drawId,
    structureId,
    eventId
  }: {
    tournamentRecord: any;
    drawId: string;
    structureId: string;
    eventId?: string;
  }) {
    this.tournamentRecord = tournamentRecord;
    this.drawId = drawId;
    this.structureId = structureId;

    // Get eventId from tournament if not provided
    this.eventId = eventId || tournamentRecord.events?.[0]?.eventId;

    // Set initial state
    tournamentEngine.setState(tournamentRecord);
  }

  /**
   * Set callback to trigger re-render when state changes
   */
  setRenderCallback(callback: RenderCallback): void {
    this.renderCallback = callback;
  }

  /**
   * Get participant IDs from draw entries (via flight profile or drawDefinition.entries)
   */
  private getDrawEntryParticipantIds(): string[] {
    const { event, drawDefinition } = tournamentEngine.getEvent({ drawId: this.drawId }) || {};
    if (!event) return [];

    // Check flight profile first (multi-draw events allocate entries per flight)
    const { flightProfile } = tournamentEngine.getFlightProfile({ eventId: this.eventId }) || {};
    const flight = flightProfile?.flights?.find((f: any) => f.drawId === this.drawId);
    const drawEntries = flight?.drawEntries || drawDefinition?.entries || [];

    return drawEntries.map((entry: any) => entry.participantId).filter(Boolean);
  }

  /**
   * Get participants entered in the draw (including qualifiers)
   */
  getAllParticipants(): Participant[] {
    tournamentEngine.setState(this.tournamentRecord);

    const drawEntryIds = this.getDrawEntryParticipantIds();
    if (!drawEntryIds.length) return [];

    const { participants = [] } =
      tournamentEngine.getParticipants({
        participantFilters: { participantIds: drawEntryIds }
      }) || {};

    return participants.map((p: any) => ({
      participantId: p.participantId,
      participantName: p.participantName,
      participantType: p.participantType,
      person: p.person,
      individualParticipants: p.individualParticipants
    }));
  }

  /**
   * Get participants that haven't been assigned to draw positions yet
   */
  getAvailableParticipants(): Participant[] {
    tournamentEngine.setState(this.tournamentRecord);

    // Get all participants
    const allParticipants = this.getAllParticipants();

    // Get already assigned participant IDs
    const { assignedParticipantIds = [] } =
      tournamentEngine.getAssignedParticipantIds({
        drawId: this.drawId
      }) || {};

    // Filter out assigned participants
    return allParticipants.filter((participant) => !assignedParticipantIds.includes(participant.participantId));
  }

  /**
   * Remove participant assignment from a draw position
   */
  removeAssignment({ drawPosition }: { drawPosition: number }): { success: boolean; error?: any } {
    tournamentEngine.setState(this.tournamentRecord);

    // Check if the position being removed has a BYE
    // We need to know this BEFORE removing it
    const matchUps = this.getMatchUps();
    const matchUp = matchUps.find((m: any) => m.sides?.some((s: any) => s.drawPosition === drawPosition));
    const side = matchUp?.sides?.find((s: any) => s.drawPosition === drawPosition);
    const hadBye = side?.bye === true;

    const result = tournamentEngine.removeDrawPositionAssignment({
      drawId: this.drawId,
      structureId: this.structureId,
      drawPosition
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    // Update stored tournament record
    const { tournamentRecord } = tournamentEngine.getState() || {};
    this.tournamentRecord = tournamentRecord;

    // Only trigger re-render if a BYE was removed
    // This is important because removing a BYE can cause participants to advance
    // and checkmarks need to appear, but removing a regular participant doesn't
    // require re-rendering the entire structure
    if (hadBye && this.renderCallback) {
      this.renderCallback();
    }

    return { success: true };
  }

  /**
   * Assign a participant to a specific draw position
   * Note: Direct assignment replaces existing assignment (even with scores)
   */
  assignParticipant({ drawPosition, participantId }: { drawPosition: number; participantId: string }): {
    success: boolean;
    error?: any;
  } {
    tournamentEngine.setState(this.tournamentRecord);

    // Direct assignment - factory handles replacement automatically
    const result = tournamentEngine.assignDrawPosition({
      drawId: this.drawId,
      structureId: this.structureId,
      drawPosition,
      participantId
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    // Update stored tournament record
    const { tournamentRecord } = tournamentEngine.getState() || {};
    this.tournamentRecord = tournamentRecord;

    // Set focus to next drawPosition (current + 1)
    this.focusDrawPosition = drawPosition + 1;

    // Trigger re-render if callback is set
    if (this.renderCallback) {
      this.renderCallback();
    }

    return { success: true };
  }

  /**
   * Get and clear the drawPosition that should receive focus
   */
  getAndClearFocusDrawPosition(): number | undefined {
    const position = this.focusDrawPosition;
    this.focusDrawPosition = undefined;
    return position;
  }

  /**
   * Assign a BYE to a specific draw position
   * Note: Direct assignment replaces existing assignment (even with scores)
   */
  assignBye({ drawPosition }: { drawPosition: number }): { success: boolean; error?: any } {
    tournamentEngine.setState(this.tournamentRecord);

    // Direct assignment - factory handles replacement automatically
    const result = tournamentEngine.assignDrawPositionBye({
      drawId: this.drawId,
      structureId: this.structureId,
      drawPosition
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    // Update stored tournament record
    const { tournamentRecord } = tournamentEngine.getState() || {};
    this.tournamentRecord = tournamentRecord;

    // Set focus to next drawPosition (current + 1)
    this.focusDrawPosition = drawPosition + 1;

    // Trigger re-render if callback is set
    if (this.renderCallback) {
      this.renderCallback();
    }

    return { success: true };
  }

  /**
   * Assign a QUALIFIER placeholder to a specific draw position
   * Note: Used when structure has qualifying stage feeding into it
   */
  assignQualifier({ drawPosition }: { drawPosition: number }): { success: boolean; error?: any } {
    tournamentEngine.setState(this.tournamentRecord);

    // Assign qualifier placeholder using factory method
    const result = tournamentEngine.assignDrawPosition({
      drawId: this.drawId,
      structureId: this.structureId,
      drawPosition,
      qualifier: true
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    // Update stored tournament record
    const { tournamentRecord } = tournamentEngine.getState() || {};
    this.tournamentRecord = tournamentRecord;

    // Set focus to next drawPosition (current + 1)
    this.focusDrawPosition = drawPosition + 1;

    // Trigger re-render if callback is set
    if (this.renderCallback) {
      this.renderCallback();
    }

    return { success: true };
  }

  /**
   * Get all matchUps for the draw with properly populated drawPosition data
   */
  getMatchUps(): any[] {
    tournamentEngine.setState(this.tournamentRecord);

    // Use getEventData to get matchUps with drawPosition information
    const { eventData } =
      tournamentEngine.getEventData({
        eventId: this.eventId
      }) || {};

    // Extract matchUps from the draw structure
    const drawData = eventData?.drawsData?.find((dd: any) => dd.drawId === this.drawId);
    const structure = drawData?.structures?.find((s: any) => s.structureId === this.structureId);
    const roundMatchUps = structure?.roundMatchUps;
    const matchUps = roundMatchUps ? Object.values(roundMatchUps).flat() : [];

    return matchUps as any[];
  }

  /**
   * Get current tournament state
   */
  getState(): any {
    return this.tournamentRecord;
  }

  /**
   * Get draw context information
   */
  getContext(): { drawId: string; structureId: string } {
    return {
      drawId: this.drawId,
      structureId: this.structureId
    };
  }
}
