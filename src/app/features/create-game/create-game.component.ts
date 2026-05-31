import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService } from '../players/game.service';
import { TurmaId, TURMAS, TurmaConfig } from '../../models/turma.model';
import { NominatimService, NominatimResult } from './nominatim.service';

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
  private readonly nominatim = inject(NominatimService);

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

  // Local
  location = '';
  locationAddress = '';
  locationMode: 'preset' | 'custom' = 'preset';
  searchQuery = '';
  readonly searchResults = signal<NominatimResult[]>([]);
  readonly searching = signal(false);
  private searchTimer: any;

  readonly locations = ['My Beach', "It's Nilo", 'MB', 'Meca', 'ASTTI'];

  readonly knownAddresses: Record<string, string> = {
    'My Beach': 'My Beach Sports, Avenida Circular 173, Vila Jardim, Porto Alegre RS',
    "It's Nilo": "It's Esportes e Eventos, Avenida Dr Nilo Peçanha 3370, Petrópolis, Porto Alegre RS",
    'MB': 'MB Beach Sports, Avenida Alexandre Luiz 190, Jardim Itu Sabará, Porto Alegre RS',
    'Meca': 'Meca Sports Bar, Avenida Baltazar de Oliveira Garcia 2274, São Sebastião, Porto Alegre RS',
    'ASTTI': 'ASTTI, Porto Alegre RS',
    'Arena Beach': 'Arena Beach POA, Avenida Sertório, Porto Alegre RS',
    'LFR Beach': 'LFR Beach, Moinhos de Vento, Porto Alegre RS',
    'Alma Beach': 'Alma Beach Sports, 4º Distrito, Porto Alegre RS',
    'Sogipa': 'Sogipa, Rua Barão de Cotegipe 415, São João, Porto Alegre RS',
  };

  readonly otherLocations = ['Arena Beach', 'LFR Beach', 'Alma Beach', 'Sogipa'];

  get filteredOtherLocations(): string[] {
    if (!this.searchQuery) return this.otherLocations;
    const q = this.searchQuery.toLowerCase();
    return this.otherLocations.filter(l => l.toLowerCase().includes(q));
  }

  selectLocation(loc: string): void {
    this.location = loc;
    this.locationAddress = this.knownAddresses[loc] ?? '';
    this.locationMode = 'preset';
    this.searchResults.set([]);
    this.searchQuery = '';
  }

  selectOutro(): void {
    this.locationMode = 'custom';
    this.location = '';
    this.locationAddress = '';
    this.searchResults.set([]);
  }

  onSearchInput(): void {
    clearTimeout(this.searchTimer);
    this.searchResults.set([]);
    if (this.searchQuery.length < 3) return;
    if (this.filteredOtherLocations.length > 0) return;
    this.searchTimer = setTimeout(() => this.doSearch(), 350);
  }

  private async doSearch(): Promise<void> {
    this.searching.set(true);
    try {
      const results = await this.nominatim.search(this.searchQuery);
      this.searchResults.set(results);
    } finally {
      this.searching.set(false);
    }
  }

  pickResult(result: NominatimResult): void {
    this.location = result.name || result.display_name.split(',')[0];
    this.locationAddress = result.display_name;
    this.searchResults.set([]);
  }

  pickKnownLocation(loc: string): void {
    this.location = loc;
    this.locationAddress = this.knownAddresses[loc] ?? '';
    this.searchQuery = loc;
    this.searchResults.set([]);
  }

  // Horário
  timeOption: 'preset1' | 'preset2' | 'preset3' | 'custom' = 'preset1';
  customStartHour = 18;
  customEndHour = 20;

  readonly startHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

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
      locationAddress: this.locationAddress || undefined,
      totalPlayers: this.totalPlayers,
    });
    this.router.navigate(['/jogo', game.uid]);
  }
}
