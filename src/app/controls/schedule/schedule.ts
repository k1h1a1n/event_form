import { Component } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  imports: [MatFormFieldModule, MatInputModule],
  selector: 'app-schedule',
  styleUrl: './schedule.scss',
  templateUrl: './schedule.html',
})
export class Schedule {}
