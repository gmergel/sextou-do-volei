import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { GameService } from '../players/game.service';
import { CheckinLog, Game } from '../../models/game.model';

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmou',
  declined: 'Recusou',
  pending: 'Voltou ao pendente',
};

@Component({
  selector: 'app-game-logs',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './game-logs.component.html',
  styleUrl: './game-logs.component.scss',
})
export class GameLogsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly gameService = inject(GameService);
  private sub?: Subscription;

  readonly gameId = signal('');
  readonly game = signal<Game | null>(null);
  readonly logs = signal<CheckinLog[]>([]);
  readonly loading = signal(true);

  /** Group logs by date for visual separation */
  readonly groupedLogs = computed(() => {
    const all = this.logs();
    const groups: { date: string; entries: CheckinLog[] }[] = [];
    let currentDate = '';

    for (const log of all) {
      const d = new Date(log.timestamp);
      const dateStr = d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groups.push({ date: dateStr, entries: [] });
      }
      groups[groups.length - 1].entries.push(log);
    }

    return groups;
  });

  statusLabel(status: string): string {
    return STATUS_LABEL[status] ?? status;
  }

  statusIcon(status: string): string {
    switch (status) {
      case 'confirmed': return '✅';
      case 'declined': return '❌';
      default: return '🔄';
    }
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('gameId') ?? '';
    this.gameId.set(id);

    this.gameService.getGame(id).then((g) => this.game.set(g));

    this.sub = this.gameService.checkins$(id).subscribe((checkins) => {
      this.logs.set(checkins);
      this.loading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
