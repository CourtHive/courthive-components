import { ProfileStore } from '../engine/profileStore';
import { SchedulingProfileConfig, SchedulingProfile } from '../types';
export declare class SchedulingProfileControl {
    private readonly store;
    private readonly layout;
    private readonly unsubscribe;
    private readonly popover;
    private container;
    constructor(config: SchedulingProfileConfig);
    render(container: HTMLElement): void;
    destroy(): void;
    getProfile(): SchedulingProfile;
    getStore(): ProfileStore;
}
