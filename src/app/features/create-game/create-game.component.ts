import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService } from '../players/game.service';

@Component({
  selector: 'app-create-game',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './create-game.component.html',
  styleUrl: './create-game.component.scss',
})
export class CreateGameComponent {
  private readonly router = inject(Router);
  private readonly gameService = inject(GameService);

  readonly creating = signal(false);
  readonly totalPlayers = 14;

  date = this.getNextFriday();

  private getNextFriday(): string {
    const today = new Date();
    const day = today.getDay(); // 0=Sun … 5=Fri
    const diff = (5 - day + 7) % 7 || 7; // days until next Friday
    const friday = new Date(today);
    friday.setDate(today.getDate() + diff);
    return friday.toISOString().slice(0, 10);
  }
  location = '';

  // Horário
  timeOption: 'preset1' | 'preset2' | 'custom' = 'preset1';
  customStartHour = 18;
  customEndHour = 20;

  readonly startHours = [18, 19, 20, 21, 22, 23];

  readonly locations = ['My Beach', "It's Nilo", 'MB', 'Meca'];

  get endHours(): number[] {
    const hours: number[] = [];
    for (let h = this.customStartHour + 1; h <= 24; h++) {
      hours.push(h);
    }
    return hours;
  }

  onStartHourChange(): void {
    if (this.customEndHour <= this.customStartHour) {
      this.customEndHour = this.customStartHour + 1;
    }
  }

  get resolvedTime(): string {
    if (this.timeOption === 'preset1') return '19h–21h';
    if (this.timeOption === 'preset2') return '20h–22h';
    const endLabel = this.customEndHour === 24 ? '00h' : `${this.customEndHour}h`;
    return `${this.customStartHour}h–${endLabel}`;
  }

  get isValid(): boolean {
    return !!this.date && !!this.location;
  }

  async onSubmit(): Promise<void> {
    if (!this.isValid) return;

    this.creating.set(true);
    const game = await this.gameService.createGame({
      date: this.date,
      time: this.resolvedTime,
      location: this.location,
      totalPlayers: this.totalPlayers,
    });
    this.router.navigate(['/jogo', game.uid]);
  }
}
