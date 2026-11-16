import { ElementRef, Provider, Type, inject } from '@angular/core';
import { NG_VALIDATORS, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Registers a component as a form control that also checks its own value: the form talks to
 * it through ControlValueAccessor (writeValue, registerOnChange, …) and calls its validate().
 * Use it in the component's `providers`.
 */
export function provideFormControl(component: Type<unknown>): Provider[] {
  return [
    { provide: NG_VALUE_ACCESSOR, useExisting: component, multi: true },
    { provide: NG_VALIDATORS, useExisting: component, multi: true },
  ];
}

/**
 * To focus a field, [formField] calls focus() on the control's own element (e.g. <app-schedule>).
 * That element can't take focus itself, so send the call to `focusInside` instead, which focuses
 * the right input. Call it from the control's constructor.
 */
export function redirectHostFocus(focusInside: () => void): void {
  inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.focus = focusInside;
}
