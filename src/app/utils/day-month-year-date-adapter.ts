import { Injectable } from '@angular/core';
import { MAT_NATIVE_DATE_FORMATS, NativeDateAdapter } from '@angular/material/core';
import { dateToIsoDate, isoDateToDate } from './date-time';

/**
 * Material's NativeDateAdapter, except that the date field reads and shows dd/mm/yyyy.
 * (The built-in one reads typed text with Date.parse, which takes 05/12/2026 as May 12th.)
 */
@Injectable()
export class DayMonthYearDateAdapter extends NativeDateAdapter {
  /** Typed text -> Date: '05/12/2026' (or '5/12/2026'). Empty -> null; anything else -> invalid. */
  override parse(value: unknown, parseFormat?: unknown): Date | null {
    if (typeof value !== 'string') return super.parse(value, parseFormat);
    if (value.trim() === '') return null;
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
    const [, day, month, year] = match ?? [];
    const date =
      match && isoDateToDate(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    return date ?? this.invalid();
  }

  /** The date field's text is dd/mm/yyyy; every other format (the calendar's labels) is unchanged. */
  override format(date: Date, displayFormat: object): string {
    if (displayFormat === MAT_NATIVE_DATE_FORMATS.display.dateInput) {
      return dateToIsoDate(date).split('-').reverse().join('/'); // '2026-12-05' -> '05/12/2026'
    }
    return super.format(date, displayFormat);
  }
}
