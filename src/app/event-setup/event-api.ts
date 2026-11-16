import { Injectable } from '@angular/core';
import { EventSetupModel } from '../models/event-setup.model';

/**
 * A stand-in for the backend: it takes a moment, like a real request, and remembers the
 * events saved so far (in memory, so a page reload forgets them).
 */
@Injectable({ providedIn: 'root' })
export class EventApi {
  /** Names already saved, in lower case, so "Angular Meetup" and "angular meetup" clash. */
  private readonly savedNames = new Set<string>();

  /**
   * Saves the event. Resolves with null when it worked, or with a message about the name when
   * the server refuses it (the one rule only the server can check: names must be unique).
   */
  async save(event: EventSetupModel): Promise<string | null> {
    await new Promise((resolve) => setTimeout(resolve, 800)); // pretend network delay

    const name = event.name.trim().toLowerCase();
    if (this.savedNames.has(name)) {
      return 'An event with this name already exists.';
    }
    this.savedNames.add(name);
    return null;
  }
}
