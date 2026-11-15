import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { TicketTiers } from '../controls/ticket-tiers/ticket-tiers';
import { Schedule } from '../controls/schedule/schedule';

@Component({
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTabsModule,
    Schedule,
    TicketTiers,
  ],
  selector: 'app-event-setup',
  styleUrl: './event-setup.scss',
  templateUrl: './event-setup.html',
})
export class EventSetup {}
