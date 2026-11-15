import { Component, signal } from '@angular/core';
import { EventSetup } from './event-setup/event-setup';

@Component({
  selector: 'app-root',
  imports: [EventSetup],
  template: `<app-event-setup />`,
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('eventForm');
}
