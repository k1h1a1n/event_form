import { Component, Injectable, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogData } from '../models/confirm-dialog.model';

/**
 * A yes/no popup. It closes with `true` when the user confirms, and `false` (or undefined,
 * on Esc / clicking outside) otherwise. Open it with ConfirmService below.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button [mat-dialog-close]="true" cdkFocusInitial>
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}

/** Asks the user to confirm something, e.g. `if (await confirm.ask({ … })) save();`. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(MatDialog);

  /** Opens the popup; resolves true only if the user clicks the confirm button. */
  async ask(data: ConfirmDialogData): Promise<boolean> {
    const answer = await firstValueFrom(this.dialog.open(ConfirmDialog, { data }).afterClosed());
    return answer === true;
  }
}
