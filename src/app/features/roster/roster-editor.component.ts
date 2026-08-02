import { Component, inject, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { RosterService } from './roster.service';
import { RosterPlayer, RosterVersion } from '../../models/roster.model';
import { TurmaId } from '../../models/turma.model';

@Component({
  selector: 'app-roster-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './roster-editor.component.html',
  styleUrl: './roster-editor.component.scss',
})
export class RosterEditorComponent {
  private readonly rosterService = inject(RosterService);

  readonly turmaId = input.required<TurmaId>();
  readonly currentVersion = input.required<RosterVersion | null>();

  readonly saved = output<RosterVersion>();
  readonly editingChanged = output<boolean>();

  readonly editingPlayers = signal<RosterPlayer[]>([]);
  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly newPlayerName = signal('');
  readonly newPlayerError = signal<string | null>(null);

  readonly editingPlayerId = signal<string | null>(null);
  readonly editingPlayerName = signal('');

  readonly activePlayers = computed(() =>
    this.editingPlayers().filter(p => p.active)
  );
  readonly inactivePlayers = computed(() =>
    this.editingPlayers().filter(p => !p.active)
  );
  readonly activeCount = computed(() => this.activePlayers().length);

  readonly hasUnsavedChanges = computed(() => {
    const version = this.currentVersion();
    if (!version) return false;
    return JSON.stringify(this.editingPlayers()) !== JSON.stringify(version.players);
  });

  startEditing(): void {
    const version = this.currentVersion();
    if (version) {
      this.editingPlayers.set([...version.players.map(p => ({ ...p }))]);
    }
    this.isEditing.set(true);
    this.editingChanged.emit(true);
  }

  cancelEditing(): void {
    if (this.hasUnsavedChanges()) {
      if (!confirm('Você tem alterações não salvas. Deseja descartá-las?')) {
        return;
      }
    }
    this.isEditing.set(false);
    this.editingChanged.emit(false);
    this.saveError.set(null);
    this.newPlayerName.set('');
    this.newPlayerError.set(null);
    this.editingPlayerId.set(null);
  }

  onDrop(event: CdkDragDrop<RosterPlayer[]>): void {
    const players = [...this.activePlayers()];
    moveItemInArray(players, event.previousIndex, event.currentIndex);
    this.rebuildPlayersArray(players);
  }

  moveUp(index: number): void {
    if (index === 0) return;
    const players = [...this.activePlayers()];
    moveItemInArray(players, index, index - 1);
    this.rebuildPlayersArray(players);
  }

  moveDown(index: number): void {
    const players = [...this.activePlayers()];
    if (index >= players.length - 1) return;
    moveItemInArray(players, index, index + 1);
    this.rebuildPlayersArray(players);
  }

  private rebuildPlayersArray(activeSorted: RosterPlayer[]): void {
    const inactive = this.editingPlayers().filter(p => !p.active);
    this.editingPlayers.set([...activeSorted, ...inactive]);
  }

  // Add player
  addPlayer(): void {
    const name = this.newPlayerName().trim();
    this.newPlayerError.set(null);

    if (name.length < 2) {
      this.newPlayerError.set('Nome precisa ter pelo menos 2 caracteres');
      return;
    }

    const isDuplicate = this.editingPlayers().some(
      p => p.name.toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      this.newPlayerError.set('Já existe um jogador com esse nome');
      return;
    }

    const newPlayer: RosterPlayer = {
      id: this.generateId(),
      name,
      initial: name.charAt(0).toUpperCase(),
      active: true,
    };

    const active = [...this.activePlayers(), newPlayer];
    const inactive = this.inactivePlayers();
    this.editingPlayers.set([...active, ...inactive]);
    this.newPlayerName.set('');
  }

  // Soft delete
  deactivatePlayer(player: RosterPlayer): void {
    this.editingPlayers.update(players =>
      players.map(p => p.id === player.id ? { ...p, active: false } : p)
    );
  }

  reactivatePlayer(player: RosterPlayer): void {
    this.editingPlayers.update(players =>
      players.map(p => p.id === player.id ? { ...p, active: true } : p)
    );
  }

  // Inline rename
  startRename(player: RosterPlayer): void {
    this.editingPlayerId.set(player.id);
    this.editingPlayerName.set(player.name);
  }

  confirmRename(player: RosterPlayer): void {
    const name = this.editingPlayerName().trim();
    if (name.length < 2) return;

    const isDuplicate = this.editingPlayers().some(
      p => p.id !== player.id && p.name.toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) return;

    this.editingPlayers.update(players =>
      players.map(p => p.id === player.id ? { ...p, name, initial: name.charAt(0).toUpperCase() } : p)
    );
    this.editingPlayerId.set(null);
  }

  cancelRename(): void {
    this.editingPlayerId.set(null);
  }

  // Save
  async save(): Promise<void> {
    this.isSaving.set(true);
    this.saveError.set(null);

    try {
      const deviceInfo = await this.rosterService.collectDeviceInfo();
      const versionId = await this.rosterService.saveRosterVersion(
        this.turmaId(),
        this.editingPlayers(),
        deviceInfo
      );

      const newVersion: RosterVersion = {
        id: versionId,
        createdAt: new Date(),
        deviceInfo,
        players: [...this.editingPlayers()],
      };

      this.saved.emit(newVersion);
      this.isEditing.set(false);
      this.editingChanged.emit(false);
    } catch (err) {
      this.saveError.set('Erro ao salvar. Verifique sua conexão e tente novamente.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private generateId(): string {
    return crypto.randomUUID().slice(0, 8);
  }
}
