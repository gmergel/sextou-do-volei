import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService } from '../players/game.service';
import { TurmaId, TURMAS, TurmaConfig } from '../../models/turma.model';

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

  // Turma
  turma: TurmaId = 'sextou';
  readonly turmas = TURMAS;
  readonly turmaKeys: TurmaId[] = ['sextou', 'domingou'];

  get turmaConfig(): TurmaConfig {
    return TURMAS[this.turma];
  }

  date = this.getNextGameDay(TURMAS.sextou.dayOfWeek);

  onTurmaChange(turma: TurmaId): void {
    this.turma = turma;
    this.date = this.getNextGameDay(TURMAS[turma].dayOfWeek);
    // Reset time option ao trocar de turma
    this.timeOption = 'preset1';
  }

  private getNextGameDay(dayOfWeek: number): string {
    const today = new Date();
    const day = today.getDay();
    const diff = (dayOfWeek - day + 7) % 7 || 7;
    const target = new Date(today);
    target.setDate(today.getDate() + diff);
    return target.toISOString().slice(0, 10);
  }

  location = '';

  // Horário
  timeOption: 'preset1' | 'preset2' | 'preset3' | 'custom' = 'preset1';
  customStartHour = 18;
  customEndHour = 20;

  readonly startHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

  readonly locations = ['My Beach', "It's Nilo", 'MB', 'Meca', 'ASTTI'];

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
    const presets = this.turmaConfig.timePresets;
    if (this.timeOption === 'preset1' && presets[0]) return presets[0].value;
    if (this.timeOption === 'preset2' && presets[1]) return presets[1].value;
    if (this.timeOption === 'preset3' && presets[2]) return presets[2].value;
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
      turma: this.turma,
      date: this.date,
      time: this.resolvedTime,
      location: this.location,
      totalPlayers: this.totalPlayers,
    });
    this.router.navigate(['/jogo', game.uid]);
  }
}
