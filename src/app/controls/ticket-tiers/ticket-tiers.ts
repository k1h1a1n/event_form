import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  selector: 'app-ticket-tiers',
  styleUrl: './ticket-tiers.scss',
  templateUrl: './ticket-tiers.html',
})
export class TicketTiers {}
