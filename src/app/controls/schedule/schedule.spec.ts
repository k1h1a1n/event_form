import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField, form, required } from '@angular/forms/signals';
import { ScheduleValue } from '../../models/schedule.model';
import { Schedule } from './schedule';

/** A tiny signal form that uses the Schedule control the same way the event page does. */
@Component({
  imports: [Schedule, FormField],
  template: `<app-schedule [formField]="eventForm.schedule" />`,
})
class Host {
  readonly model = signal<{ schedule: ScheduleValue | null }>({
    schedule: { date: '2026-12-05', startTime: '18:30', durationMinutes: 90 },
  });
  readonly eventForm = form(this.model, (path) => {
    required(path.schedule);
  });
}

describe('Schedule', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  /** The date, start time and duration inputs, in that order. */
  function inputs(): HTMLInputElement[] {
    return [...fixture.nativeElement.querySelectorAll('app-schedule input')];
  }

  /** Types into an input the way a user would. `change` also commits it (the datepicker needs that). */
  async function type(input: HTMLInputElement, value: string, change = false): Promise<void> {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    if (change) input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  /** The error messages currently shown under the three fields. */
  function messages(): string[] {
    return [...fixture.nativeElement.querySelectorAll('app-schedule mat-hint.error')]
      .map((hint: HTMLElement) => hint.textContent!.trim())
      .filter(Boolean);
  }

  it('shows the value the form writes in, with the date as dd/mm/yyyy', () => {
    const [date, time, duration] = inputs();
    expect(date.value).toBe('05/12/2026');
    expect(time.value).toBe('18:30');
    expect(duration.value).toBe('90');
  });

  it('reports edits back to the form as one value', async () => {
    const [date, , duration] = inputs();
    await type(date, '20/12/2026', true);
    await type(duration, '120');

    expect(host.model().schedule).toEqual({
      date: '2026-12-20',
      startTime: '18:30',
      durationMinutes: 120,
    });
  });

  it('reports null to the form once every part is cleared', async () => {
    const [date, time, duration] = inputs();
    await type(date, '', true);
    await type(time, '');
    await type(duration, '');

    expect(host.model().schedule).toBeNull();
  });

  it('makes the parent form invalid while a part is invalid', async () => {
    const [, , duration] = inputs();
    await type(duration, '0');
    expect(host.eventForm().invalid()).toBe(true);

    await type(duration, '60');
    expect(host.eventForm().valid()).toBe(true);
  });

  it('shows messages only once the field is touched', async () => {
    const [date] = inputs();
    await type(date, '31/02/2026', true); // not a real day
    expect(messages()).toEqual([]);

    host.eventForm().markAsTouched(); // what Save does
    await fixture.whenStable();
    expect(messages()).toEqual(['Enter a valid date.']);
    expect(date.value).toBe('31/02/2026'); // the user's text is kept, not wiped
  });

  it('shows a message for each part when a required schedule is empty', async () => {
    host.model.set({ schedule: null });
    host.eventForm().markAsTouched();
    await fixture.whenStable();

    expect(messages()).toEqual(['Enter a date.', 'Enter a start time.', 'Enter a duration.']);
  });

  it('clears what the user typed when the form is reset', async () => {
    const [date, time, duration] = inputs();
    await type(duration, '45');

    host.eventForm().reset({ schedule: null });
    await fixture.whenStable();

    expect([date.value, time.value, duration.value]).toEqual(['', '', '']);
    expect(messages()).toEqual([]);
  });
});
