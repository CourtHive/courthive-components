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
   * Get all participants in the tournament
   */
  getAllParticipants(): Participant[] {
    tournamentEngine.setState(this.tournamentRecord);
    const { participants = [] } = tournamentEngine.getParticipants() || {};

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

    return { success: true };
  }

  /**
   * Assign a participant to a specific draw position
   */
  assignParticipant({
    drawPosition,
    participantId,
    replaceExisting = false
  }: {
    drawPosition: number;
    participantId: string;
    replaceExisting?: boolean; // If true, remove existing assignment first
  }): { success: boolean; error?: any } {
    tournamentEngine.setState(this.tournamentRecord);

    // If replacing existing, remove first
    if (replaceExisting) {
      const removeResult = this.removeAssignment({ drawPosition });
      if (!removeResult.success) {
        return removeResult;
      }
    }

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
   */
  assignBye({
    drawPosition,
    replaceExisting = false
  }: {
    drawPosition: number;
    replaceExisting?: boolean; // If true, remove existing assignment first
  }): { success: boolean; error?: any } {
    tournamentEngine.setState(this.tournamentRecord);

    // If replacing existing, remove first
    if (replaceExisting) {
      const removeResult = this.removeAssignment({ drawPosition });
      if (!removeResult.success) {
        return removeResult;
      }
    }

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
