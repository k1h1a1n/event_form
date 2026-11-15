import { Component, computed, input, signal } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/** The value this control reads from and writes to the form. */
export interface ScheduleValue {
  date: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:mm'
  durationMinutes: number | null;
}

/** The duration rules. Returns what is wrong with the duration, or null if it is fine. */
export function durationIssue(minutes: number | null): string | null {
  if (minutes === null || Number.isNaN(minutes)) return 'Enter a duration.';
  if (!Number.isInteger(minutes)) return 'Use whole minutes.';
  if (minutes < 1) return 'The duration must be at least 1 minute.';
  if (minutes > 24 * 60) return 'An event can last at most 24 hours.';
  return null;
}

@Component({
  imports: [MatFormFieldModule, MatInputModule],
  selector: 'app-schedule',
  styleUrl: './schedule.scss',
  templateUrl: './schedule.html',
  providers: [
    // "This component is a form control": the form talks to it through the
    // ControlValueAccessor methods below.
    { provide: NG_VALUE_ACCESSOR, useExisting: Schedule, multi: true },
    // "This component can check its own value": the form calls validate() below.
    { provide: NG_VALIDATORS, useExisting: Schedule, multi: true },
  ],
})
export class Schedule implements ControlValueAccessor, Validator {
  /**
   * Whether the form considers this field touched (the user left it, or pressed Save).
   * We don't bind this ourselves: [formField] fills in inputs with this name automatically.
   */
  readonly touched = input(false);

  /** What the three inputs currently show. */
  protected readonly schedule = signal<ScheduleValue>({
    date: '',
    startTime: '',
    durationMinutes: null,
  });

  /** The duration message to show: only once the field is touched, so we don't nag early. */
  protected readonly durationError = computed(() =>
    this.touched() ? durationIssue(this.schedule().durationMinutes) : null,
  );

  // Callbacks the form gives us. Until it does, they do nothing.
  private onChange: (value: ScheduleValue) => void = () => {};
  protected onTouched: () => void = () => {};

  // ---- Form -> control ----

  /** The form calls this to put its value into the control. */
  writeValue(value: ScheduleValue): void {
    this.schedule.set(value);
  }

  /** The form gives us a function to call whenever the user changes the value. */
  registerOnChange(fn: (value: ScheduleValue) => void): void {
    this.onChange = fn;
  }

  /** The form gives us a function to call when the user leaves the control. */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  // ---- Validation ----

  /**
   * The form calls this whenever the value changes. Returning an error object makes the
   * schedule field invalid, and with it the whole parent form.
   */
  validate(control: AbstractControl<ScheduleValue>): ValidationErrors | null {
    const issue = durationIssue(control.value.durationMinutes);
    return issue ? { duration: issue } : null;
  }

  // ---- Control -> form ----

  protected setDate(date: string): void {
    this.update({ ...this.schedule(), date });
  }

  protected setStartTime(startTime: string): void {
    this.update({ ...this.schedule(), startTime });
  }

  protected setDuration(text: string): void {
    this.update({ ...this.schedule(), durationMinutes: text === '' ? null : Number(text) });
  }

  /** Show the new value in the inputs and send it to the form. */
  private update(value: ScheduleValue): void {
    this.schedule.set(value);
    this.onChange(value);
  }
}
