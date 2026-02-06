/**
 * Draw State Manager
 * Manages tournament draw state and participant assignments using tournamentEngine API
 */
import { tournamentEngine } from 'tods-competition-factory';
import type { Participant } from '../types';

export type RenderCallback = () => void;

export class DrawStateManager {
  private tournamentRecord: any;
  private drawId: string;
  private structureId: string;
  private eventId: string;
  private renderCallback?: RenderCallback;
  private focusDrawPosition?: number; // Track which position to focus after re-render

  constructor({
    tournamentRecord,
    drawId,
    structureId,
    eventId,
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
      individualParticipants: p.individualParticipants,
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
    const { assignedParticipantIds = [] } = tournamentEngine.getAssignedParticipantIds({
      drawId: this.drawId,
    }) || {};
    
    console.log('[DrawStateManager] getAvailableParticipants:', {
      totalParticipants: allParticipants.length,
      assignedCount: assignedParticipantIds.length,
      assignedIds: assignedParticipantIds,
      availableCount: allParticipants.length - assignedParticipantIds.length,
    });
    
    // Filter out assigned participants
    return allParticipants.filter(
      (participant) => !assignedParticipantIds.includes(participant.participantId)
    );
  }

  /**
   * Assign a participant to a specific draw position
   */
  assignParticipant({
    drawPosition,
    participantId,
  }: {
    drawPosition: number;
    participantId: string;
  }): { success: boolean; error?: any } {
    console.log('[DrawStateManager] assignParticipant called:', {
      drawPosition,
      participantId,
      drawId: this.drawId,
      structureId: this.structureId,
    });
    
    tournamentEngine.setState(this.tournamentRecord);
    
    const result = tournamentEngine.assignDrawPosition({
      drawId: this.drawId,
      structureId: this.structureId,
      drawPosition,
      participantId,
    });

    if (result.error) {
      console.error('[DrawStateManager] Error assigning participant:', result.error);
      return { success: false, error: result.error };
    }

    console.log('[DrawStateManager] Participant assigned successfully');

    // Update stored tournament record
    const { tournamentRecord } = tournamentEngine.getState() || {};
    this.tournamentRecord = tournamentRecord;

    // Check assigned participants after assignment
    const { assignedParticipantIds = [] } = tournamentEngine.getAssignedParticipantIds({
      drawId: this.drawId,
    }) || {};
    
    console.log('[DrawStateManager] After assignment, assignedParticipantIds:', assignedParticipantIds);

    // Set focus to next drawPosition (current + 1)
    this.focusDrawPosition = drawPosition + 1;
    console.log('[DrawStateManager] Will focus drawPosition:', this.focusDrawPosition);

    // Trigger re-render if callback is set
    if (this.renderCallback) {
      console.log('[DrawStateManager] Triggering re-render');
      this.renderCallback();
    } else {
      console.warn('[DrawStateManager] No render callback set!');
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
   * Get all matchUps for the draw with properly populated drawPosition data
   */
  getMatchUps(): any[] {
    tournamentEngine.setState(this.tournamentRecord);
    
    // Use getEventData to get matchUps with drawPosition information
    const { eventData } = tournamentEngine.getEventData({
      eventId: this.eventId,
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
      structureId: this.structureId,
    };
  }
}
