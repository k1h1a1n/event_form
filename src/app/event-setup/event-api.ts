import { Injectable } from '@angular/core';
import { EventSetupModel, defaultEventSetup } from '../models/event-setup.model';
import { sameName } from '../utils/text';

/** Where the saved events are kept, so they survive a page reload. */
const STORAGE_KEY = 'event-setup.saved-events';

/** Waits a moment, like a real network request would. */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A stand-in for the backend. It answers after a short delay and keeps the saved events in
 * the browser's localStorage.
 */
@Injectable({ providedIn: 'root' })
export class EventApi {
  /**
   * The starting values for a new event, as a server would send them, with a name that isn't
   * taken yet: "Angular Meetup", then "Angular Meetup 2", and so on.
   */
  async loadNewEvent(): Promise<EventSetupModel> {
    await delay(500);
    const event = defaultEventSetup();
    const saved = this.savedEvents();
    const baseName = event.name;
    for (let n = 2; saved.some((other) => sameName(other.name, event.name)); n++) {
      event.name = `${baseName} ${n}`;
    }
    return event;
  }

  /**
   * Saves the event. Resolves with null when it worked, or with a message about the name when
   * the server refuses it (the one rule only the server can check: names must be unique).
   */
  async save(event: EventSetupModel): Promise<string | null> {
    await delay(800);
    const saved = this.savedEvents();
    if (saved.some((other) => sameName(other.name, event.name))) {
      return 'An event with this name already exists.';
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...saved, event]));
    return null;
  }

  /** The events saved so far. Throws if the stored data can't be read: the caller then fails. */
  private savedEvents(): EventSetupModel[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return [];
    const events: unknown = JSON.parse(stored); // throws on broken JSON
    if (!Array.isArray(events)) throw new Error('The saved events could not be read.');
    return events;
  }
}
