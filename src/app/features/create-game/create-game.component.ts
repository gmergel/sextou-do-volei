import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService } from '../players/game.service';
import { TurmaId, TURMAS, TurmaConfig } from '../../models/turma.model';
import { NominatimService, NominatimResult } from './nominatim.service';
import { RosterService } from '../roster/roster.service';
import { RosterPreviewComponent } from '../roster/roster-preview.component';
import { RosterEditorComponent } from '../roster/roster-editor.component';
import { RosterVersion } from '../../models/roster.model';

@Component({
  selector: 'app-create-game',
  standalone: true,
  imports: [FormsModule, RosterPreviewComponent, RosterEditorComponent],
  templateUrl: './create-game.component.html',
  styleUrl: './create-game.component.scss',
})
export class CreateGameComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly gameService = inject(GameService);
  private readonly nominatim = inject(NominatimService);
  private readonly rosterService = inject(RosterService);

  readonly creating = signal(false);
  readonly gameLoading = signal(false);
  readonly gameLoadError = signal('');
  readonly saveError = signal('');
  readonly minPlayers = 12;
  readonly maxPlayers = 20;
  totalPlayers = 14;
  readonly gameId = this.route.snapshot.paramMap.get('gameId');

  get isEditing(): boolean {
    return this.gameId !== null;
  }

  // Roster state
  readonly currentRosterVersion = signal<RosterVersion | null>(null);
  readonly rosterEditing = signal(false);
  readonly rosterError = signal(false);
  readonly rosterLoading = signal(false);

  // Turma
  turma: TurmaId = 'sextou';
  readonly turmas = TURMAS;
  readonly turmaKeys: TurmaId[] = ['sextou', 'domingou'];

  get turmaConfig(): TurmaConfig {
    return TURMAS[this.turma];
  }

  date = this.getNextGameDay(TURMAS.sextou.dayOfWeek);
  time = '';
  legacyTimeFormat = false;

  constructor() {
    if (this.gameId) {
      this.loadGame(this.gameId);
    } else {
      this.loadRoster(this.turma);
    }
  }

  private async loadGame(gameId: string): Promise<void> {
    this.gameLoading.set(true);
    try {
      const game = await this.gameService.getGame(gameId);
      if (!game) {
        this.gameLoadError.set('Jogo não encontrado.');
        return;
      }

      this.turma = game.turma;
      this.date = game.date;
      this.time = game.time;
      this.totalPlayers = this.normalizeTotalPlayers(game.totalPlayers ?? 14);
      this.location = game.location;
      this.locationAddress = game.locationAddress ?? '';
      this.locationMode = this.locations.includes(game.location) ? 'preset' : 'custom';

      const presetIndex = TURMAS[game.turma].timePresets.findIndex(
        (preset) => preset.value === game.time,
      );
      if (presetIndex >= 0) {
        this.timeOption = `preset${presetIndex + 1}` as typeof this.timeOption;
      } else {
        const customTime = game.time.match(/^\s*(\d{1,2})h\s*[–-]\s*(\d{1,2})h\s*$/);
        if (customTime) {
          this.timeOption = 'custom';
          this.customStartHour = Number(customTime[1]);
          this.customEndHour = Number(customTime[2]) || 24;
        } else {
          this.legacyTimeFormat = true;
        }
      }
    } catch {
      this.gameLoadError.set('Não foi possível carregar o jogo. Tente novamente.');
    } finally {
      this.gameLoading.set(false);
    }
  }

  onTurmaChange(turma: TurmaId): void {
    this.turma = turma;
    this.date = this.getNextGameDay(TURMAS[turma].dayOfWeek);
    this.timeOption = 'preset1';
    this.loadRoster(turma);
  }

  private loadRoster(turmaId: TurmaId): void {
    this.rosterLoading.set(true);
    this.rosterError.set(false);
    this.currentRosterVersion.set(null);

    this.rosterService.getCurrentRoster(turmaId).subscribe({
      next: (version) => {
        this.currentRosterVersion.set(version);
        this.rosterLoading.set(false);
      },
      error: () => {
        this.rosterError.set(true);
        this.rosterLoading.set(false);
      },
    });
  }

  onRosterSaved(version: RosterVersion): void {
    this.currentRosterVersion.set(version);
  }

  onRosterEditingChanged(editing: boolean): void {
    this.rosterEditing.set(editing);
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
    'Arena Match Point Beach Sports': 'Arena Match Point Beach Sports, Av. Baltazar de Oliveira Garcia, 1110',
    'Alma Beach': 'Alma Beach Sports, 4º Distrito, Porto Alegre RS',
    'Sogipa': 'Sogipa, Rua Barão de Cotegipe 415, São João, Porto Alegre RS',
  };

  readonly otherLocations = ['Arena Beach', 'LFR Beach', 'Alma Beach', 'Sogipa', 'Arena Match Point Beach Sports'];

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

  adjustTotalPlayers(amount: number): void {
    this.totalPlayers = Math.min(
      this.maxPlayers,
      Math.max(this.minPlayers, this.totalPlayers + amount * 2),
    );
  }

  private normalizeTotalPlayers(total: number): number {
    const clamped = Math.min(this.maxPlayers, Math.max(this.minPlayers, total));
    return clamped % 2 === 0 ? clamped : clamped + 1;
  }

  selectTimeOption(option: 'preset1' | 'preset2' | 'preset3' | 'custom'): void {
    this.timeOption = option;
    this.legacyTimeFormat = false;
  }

  get resolvedTime(): string {
    if (this.legacyTimeFormat) return this.time;
    const presets = this.turmaConfig.timePresets;
    if (this.timeOption === 'preset1' && presets[0]) return presets[0].value;
    if (this.timeOption === 'preset2' && presets[1]) return presets[1].value;
    if (this.timeOption === 'preset3' && presets[2]) return presets[2].value;
    const endLabel = this.customEndHour === 24 ? '00h' : `${this.customEndHour}h`;
    return `${this.customStartHour}h–${endLabel}`;
  }

  get isValid(): boolean {
    const validPlayerCount =
      Number.isInteger(this.totalPlayers) &&
      this.totalPlayers % 2 === 0 &&
      this.totalPlayers >= this.minPlayers &&
      this.totalPlayers <= this.maxPlayers;
    if (this.isEditing) {
      return validPlayerCount && !!this.date && !!this.time.trim() && !!this.location.trim() &&
        !this.gameLoading() && !this.gameLoadError();
    }
    return validPlayerCount && !!this.date && !!this.location && !this.rosterEditing() && !this.rosterError() && !!this.currentRosterVersion();
  }

  async onSubmit(): Promise<void> {
    if (!this.isValid) return;

    this.creating.set(true);
    this.saveError.set('');
    try {
      if (this.gameId) {
        await this.gameService.updateGame(this.gameId, {
          date: this.date,
          time: this.resolvedTime,
          location: this.location.trim(),
          locationAddress: this.locationAddress,
          totalPlayers: this.totalPlayers,
        });
        this.router.navigate(['/jogo', this.gameId]);
        return;
      }

      const game = await this.gameService.createGame({
        turma: this.turma,
        date: this.date,
        time: this.resolvedTime,
        location: this.location,
        locationAddress: this.locationAddress || undefined,
        totalPlayers: this.totalPlayers,
        rosterVersionId: this.currentRosterVersion()?.id,
      });
      this.router.navigate(['/jogo', game.uid]);
    } catch {
      this.saveError.set('Não foi possível salvar o jogo. Tente novamente.');
    } finally {
      this.creating.set(false);
    }
  }

  backToGames(): void {
    this.router.navigate(['/jogos']);
  }
}
