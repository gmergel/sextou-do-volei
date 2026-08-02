import { Component, input, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RosterService } from './roster.service';
import { RosterVersion, RosterPlayer } from '../../models/roster.model';
import { TurmaId } from '../../models/turma.model';

@Component({
  selector: 'app-roster-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loading()) {
      <div class="roster-preview roster-preview--loading">
        <span>Carregando lista...</span>
      </div>
    } @else if (error()) {
      <div class="roster-preview roster-preview--error">
        <span>⚠️ Não foi possível carregar a lista de jogadores</span>
      </div>
    } @else if (rosterVersion()) {
      <div class="roster-preview">
        <div class="roster-preview__summary">
          <span class="roster-preview__count">{{ activeCount() }} jogadores ativos</span>
          <span class="roster-preview__separator">|</span>
          <span class="roster-preview__date">Versão de {{ formattedDate() }}</span>
        </div>
        <ol class="roster-preview__list">
          @for (player of activePlayers(); track player.id) {
            <li class="roster-preview__item">{{ player.name }}</li>
          }
        </ol>
      </div>
    }
  `,
  styles: [`
    .roster-preview {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 12px 16px;
      margin-top: 8px;
    }
    .roster-preview--loading,
    .roster-preview--error {
      text-align: center;
      padding: 16px;
      font-size: 0.9rem;
      opacity: 0.8;
    }
    .roster-preview--error {
      color: #ffcdd2;
    }
    .roster-preview__summary {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      opacity: 0.9;
      margin-bottom: 8px;
    }
    .roster-preview__count {
      font-weight: 600;
    }
    .roster-preview__separator {
      opacity: 0.5;
    }
    .roster-preview__list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 4px 12px;
      padding-left: 20px;
      margin: 0;
      font-size: 0.85rem;
    }
    .roster-preview__item {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `],
})
export class RosterPreviewComponent {
  private readonly rosterService = inject(RosterService);

  readonly turmaId = input.required<TurmaId>();

  readonly rosterVersion = signal<RosterVersion | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);

  readonly activePlayers = signal<RosterPlayer[]>([]);
  readonly activeCount = signal(0);
  readonly formattedDate = signal('');

  constructor() {
    effect(() => {
      const id = this.turmaId();
      if (id) {
        this.loadRoster(id);
      }
    });
  }

  private loadRoster(turmaId: TurmaId): void {
    this.loading.set(true);
    this.error.set(false);

    this.rosterService.getCurrentRoster(turmaId).subscribe({
      next: (version) => {
        this.rosterVersion.set(version);
        if (version) {
          const active = version.players.filter(p => p.active);
          this.activePlayers.set(active);
          this.activeCount.set(active.length);
          this.formattedDate.set(this.formatDate(version.createdAt));
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private formatDate(timestamp: any): string {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('pt-BR');
  }
}
