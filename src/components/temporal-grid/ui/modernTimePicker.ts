/**
 * Modern Time Picker
 *
 * A circular clock-based time picker using timepicker-ui library.
 * Features range selection with two circular clocks for intuitive time selection.
 */

import { tools } from 'tods-competition-factory';
import './timepicker-ui.css';

let TimepickerUI: any;
let PluginRegistry: any;
let RangePlugin: any;
let pluginRegistered = false;

async function ensureTimepickerLoaded() {
  if (!TimepickerUI) {
    const timepickerModule = await import('timepicker-ui');
    TimepickerUI = timepickerModule.TimepickerUI;
    PluginRegistry = timepickerModule.PluginRegistry;

    const rangeModule = await import('timepicker-ui/plugins/range');
    RangePlugin = rangeModule.RangePlugin;

    if (!pluginRegistered && PluginRegistry && RangePlugin) {
      PluginRegistry.register(RangePlugin);
      pluginRegistered = true;
    }
  }
}

export interface TimePickerConfig {
  startTime: string; // ISO string or time string
  endTime?: string; // ISO string or time string (optional for segments)
  dayStartTime?: string; // HH:mm format (default: '00:00')
  dayEndTime?: string; // HH:mm format (default: '23:59')
  minuteIncrement?: number; // default: 5
  minDuration?: number; // Minimum duration in minutes (default: none)
  maxDuration?: number; // Maximum duration in minutes (default: none)
  clockType?: '12h' | '24h'; // default: '12h'
  onConfirm: (startTime: string, endTime: string) => void;
  onCancel: () => void;
}

export class ModernTimePicker {
  private readonly container: HTMLElement;
  private readonly config: TimePickerConfig;
  private picker: any; // TimepickerUI instance
  private readonly inputElement: HTMLInputElement;
  private selectedStart: string;
  private selectedEnd: string;

  constructor(config: TimePickerConfig) {
    this.config = {
      dayStartTime: '00:00',
      dayEndTime: '23:59',
      minuteIncrement: 5,
      clockType: '12h',
      ...config
    };

    // Extract times using factory utilities and ensure we have both start and end
    this.selectedStart = this.extractTimeAsHHMM(config.startTime);

    // If endTime is not provided, default to start time + 1 hour
    if (config.endTime) {
      this.selectedEnd = this.extractTimeAsHHMM(config.endTime);
    } else {
      // Use factory utilities to add 1 hour
      const startDate = new Date(`2000-01-01T${this.selectedStart}:00Z`);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Add 1 hour
      this.selectedEnd = tools.dateTime.extractTime(endDate.toISOString());
    }

    this.inputElement = document.createElement('input');
    this.container = this.createUI();
  }

  /**
   * Extract HH:mm time from ISO string or time string using factory utilities
   */
  private extractTimeAsHHMM(timeStr: string): string {
    if (timeStr.includes('T')) {
      // ISO string - use factory utility to extract time
      return tools.dateTime.extractTime(timeStr);
    }
    // Already HH:mm format
    return timeStr;
  }

  /**
   * Create a hidden container for the input element
   * The timepicker-ui library will create its own modal UI
   */
  private createUI(): HTMLElement {
    // Create a hidden container just to hold the input element
    // timepicker-ui will create and manage its own modal UI
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      top: -9999px;
      opacity: 0;
      pointer-events: none;
    `;

    // Input field for timepicker-ui (hidden, just for the library to attach to)
    this.inputElement.type = 'text';
    this.inputElement.value = `${this.selectedStart} - ${this.selectedEnd}`;
    this.inputElement.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
    `;

    container.appendChild(this.inputElement);

    return container;
  }

  /**
   * Initialize the timepicker-ui instance
   */
  private async initTimePicker(): Promise<void> {
    // Ensure the library is loaded
    await ensureTimepickerLoaded();

    const clockType = this.config.clockType ?? '12h';

    // Parse the times to get hours and minutes
    const [startHour, startMin] = this.selectedStart.split(':').map(Number);
    const [endHour, endMin] = this.selectedEnd.split(':').map(Number);

    if (clockType === '24h') {
      // 24h mode: use HH:MM format directly
      const startFormatted = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
      const endFormatted = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
      this.inputElement.value = `${startFormatted} - ${endFormatted}`;
      this.inputElement.dataset.timeFrom = startFormatted;
      this.inputElement.dataset.timeTo = endFormatted;
    } else {
      // 12h mode: convert to HH:MM AM/PM format
      const startPeriod = startHour >= 12 ? 'PM' : 'AM';
      const start12Hour = startHour === 0 ? 12 : startHour > 12 ? startHour - 12 : startHour;
      const startFormatted = `${String(start12Hour).padStart(2, '0')}:${String(startMin).padStart(
        2,
        '0'
      )} ${startPeriod}`;

      const endPeriod = endHour >= 12 ? 'PM' : 'AM';
      const end12Hour = endHour === 0 ? 12 : endHour > 12 ? endHour - 12 : endHour;
      const endFormatted = `${String(end12Hour).padStart(2, '0')}:${String(endMin).padStart(2, '0')} ${endPeriod}`;

      this.inputElement.value = `${startFormatted} - ${endFormatted}`;
      this.inputElement.dataset.timeFrom = `${String(start12Hour).padStart(2, '0')}:${String(startMin).padStart(
        2,
        '0'
      )}`;
      this.inputElement.dataset.timeTo = `${String(end12Hour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
      this.inputElement.dataset.typeFrom = startPeriod;
      this.inputElement.dataset.typeTo = endPeriod;
    }

    // Build range configuration with optional min/max duration
    const rangeConfig: any = {
      enabled: true,
      fromLabel: 'Start',
      toLabel: 'End'
    };

    // Add duration constraints if provided
    if (this.config.minDuration !== undefined) {
      rangeConfig.minDuration = this.config.minDuration;
    }
    if (this.config.maxDuration !== undefined) {
      rangeConfig.maxDuration = this.config.maxDuration;
    }

    // Create the picker with range plugin
    this.picker = new TimepickerUI(this.inputElement, {
      range: rangeConfig,
      clock: {
        type: clockType,
        incrementMinutes: this.config.minuteIncrement || 5
      },
      ui: {
        theme: 'crane' // TODO: should also come from TemporalGrid config
      },
      callbacks: {
        onRangeConfirm: (data: any) => {
          try {
            const fromTimeStr = data.from;
            const toTimeStr = data.to;

            if (fromTimeStr && toTimeStr) {
              const parseToHHMM = (timeStr: string): string => {
                // Try 12h format first (e.g., "06:30 AM")
                const match12 = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                if (match12) {
                  let hour = parseInt(match12[1], 10);
                  const minutes = match12[2];
                  const period = match12[3].toUpperCase();
                  if (period === 'PM' && hour !== 12) hour += 12;
                  else if (period === 'AM' && hour === 12) hour = 0;
                  return `${String(hour).padStart(2, '0')}:${minutes}`;
                }
                // 24h format (e.g., "17:30")
                const match24 = timeStr.match(/(\d{1,2}):(\d{2})/);
                if (match24) {
                  return `${match24[1].padStart(2, '0')}:${match24[2]}`;
                }
                return '00:00';
              };

              this.selectedStart = parseToHHMM(fromTimeStr);
              this.selectedEnd = parseToHHMM(toTimeStr);
              this.config.onConfirm(this.selectedStart, this.selectedEnd);
              this.destroy();
            }
          } catch (error) {
            console.error('[ModernTimePicker] Error in onRangeConfirm:', error);
          }
        },
        onCancel: () => {
          try {
            this.config.onCancel();
            this.destroy();
          } catch (error) {
            console.error('[ModernTimePicker] Error in onCancel:', error);
          }
        }
      }
    });

    this.picker.create();

    // Auto-open the picker after a short delay
    setTimeout(() => {
      if (this.picker) {
        this.picker.open();
      }
    }, 100);
  }

  /**
   * Show the time picker
   */
  async show(): Promise<void> {
    document.body.appendChild(this.container);
    // Initialize the picker after it's been added to the DOM
    await this.initTimePicker();
  }

  /**
   * Destroy the time picker
   */
  destroy(): void {
    // Destroy the timepicker-ui instance
    if (this.picker && this.picker.destroy) {
      this.picker.destroy();
    }

    // Remove from DOM
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

/**
 * Factory function to create and show a time picker
 */
export async function showModernTimePicker(config: TimePickerConfig): Promise<ModernTimePicker> {
  const picker = new ModernTimePicker(config);
  await picker.show();

  return picker;
}
