/**
 * Modern Time Picker
 *
 * A circular clock-based time picker using timepicker-ui library.
 * Features range selection with two circular clocks for intuitive time selection.
 */

import { tools } from 'tods-competition-factory';
// Import timepicker-ui styles (copied from node_modules to avoid Vite import issues)
import './timepicker-ui.css';

// Lazy imports to avoid issues with Storybook/HMR
let TimepickerUI: any;
let PluginRegistry: any;
let RangePlugin: any;
let pluginRegistered = false;

async function ensureTimepickerLoaded() {
  if (!TimepickerUI) {
    const timepickerModule = await import('timepicker-ui');
    TimepickerUI = timepickerModule.TimepickerUI;
    PluginRegistry = timepickerModule.PluginRegistry;

    // @ts-ignore - TS doesn't handle dynamic imports well
    const rangeModule = await import('timepicker-ui/plugins/range');
    RangePlugin = rangeModule.RangePlugin;

    // Register the range plugin (only once)
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
  clockType?: '12h' | '24h'; // default: '12h' - TODO: should come from TemporalGrid config
  onConfirm: (startTime: string, endTime: string) => void;
  onCancel: () => void;
}

/**
 * NOTE: The Temporal Grid component should have a comprehensive config object that includes:
 * - timePickerMode: '12h' | '24h' (default: '12h')
 * - theme: string (for timepicker-ui themes like 'crane', 'm3-green', etc)
 * - minuteIncrement: number
 * - Other UI preferences and behavior settings
 *
 * This config should be passed down from TemporalGrid → TemporalGridControl → ModernTimePicker
 * to ensure consistent settings across the entire component.
 */

export class ModernTimePicker {
  private container: HTMLElement;
  private config: TimePickerConfig;
  private picker: any; // TimepickerUI instance
  private inputElement: HTMLInputElement;
  private selectedStart: string;
  private selectedEnd: string;

  constructor(config: TimePickerConfig) {
    this.config = {
      dayStartTime: '00:00',
      dayEndTime: '23:59',
      minuteIncrement: 5,
      clockType: '12h', // Default to 12-hour mode
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

    // Parse the times to get hours and minutes
    const [startHour, startMin] = this.selectedStart.split(':').map(Number);
    const [endHour, endMin] = this.selectedEnd.split(':').map(Number);

    // Convert to 12-hour format with AM/PM
    const startPeriod = startHour >= 12 ? 'PM' : 'AM';
    const start12Hour = startHour === 0 ? 12 : startHour > 12 ? startHour - 12 : startHour;
    const startTimeFormatted = `${String(start12Hour).padStart(2, '0')}:${String(startMin).padStart(
      2,
      '0'
    )} ${startPeriod}`;

    const endPeriod = endHour >= 12 ? 'PM' : 'AM';
    const end12Hour = endHour === 0 ? 12 : endHour > 12 ? endHour - 12 : endHour;
    const endTimeFormatted = `${String(end12Hour).padStart(2, '0')}:${String(endMin).padStart(2, '0')} ${endPeriod}`;

    // Set the input value to show the range
    this.inputElement.value = `${startTimeFormatted} - ${endTimeFormatted}`;

    // Set data attributes for the range plugin to pick up initial values
    this.inputElement.setAttribute(
      'data-time-from',
      `${String(start12Hour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`
    );
    this.inputElement.setAttribute(
      'data-time-to',
      `${String(end12Hour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`
    );
    this.inputElement.setAttribute('data-type-from', startPeriod);
    this.inputElement.setAttribute('data-type-to', endPeriod);

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
        type: this.config.clockType || '12h', // Use config or default to 12h
        incrementMinutes: this.config.minuteIncrement || 5
      },
      ui: {
        theme: 'crane' // TODO: should also come from TemporalGrid config
      },
      callbacks: {
        // For range mode, use onRangeConfirm instead of onConfirm
        onRangeConfirm: (data: any) => {
          try {
            // Extract from and to times (these are strings like "06:30 AM")
            const fromTimeStr = data.from;
            const toTimeStr = data.to;

            if (fromTimeStr && toTimeStr) {
              // Parse the 12-hour time strings (e.g., "06:30 AM")
              // and convert to 24-hour HH:mm format
              // TODO: Replace with factory utilities once correct usage is determined

              const parseTime12h = (timeStr: string): string => {
                const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                if (!match) {
                  return '00:00';
                }

                let hour = parseInt(match[1], 10);
                const minutes = match[2];
                const period = match[3].toUpperCase();

                // Convert to 24-hour format
                if (period === 'PM' && hour !== 12) {
                  hour += 12;
                } else if (period === 'AM' && hour === 12) {
                  hour = 0;
                }

                return `${String(hour).padStart(2, '0')}:${minutes}`;
              };

              this.selectedStart = parseTime12h(fromTimeStr);
              this.selectedEnd = parseTime12h(toTimeStr);

              // Call the confirm callback with the selected times in 24-hour format
              this.config.onConfirm(this.selectedStart, this.selectedEnd);

              // Clean up
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
