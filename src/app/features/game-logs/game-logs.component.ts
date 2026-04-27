import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { GameService } from '../players/game.service';
import { CheckinLog, Game } from '../../models/game.model';

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmou',
  declined: 'Recusou',
  pending: 'Pendente',
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
        weekday: 'short',
        day: '2-digit',
        month: 'short',
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

  isEvent(log: CheckinLog): boolean {
    return !!log.type && log.type !== 'status_change';
  }

  eventIcon(log: CheckinLog): string {
    switch (log.type) {
      case 'slot_opened': return '🔓';
      case 'game_full': return '🔒';
      case 'game_reopened': return '🔓';
      default: return '⚙️';
    }
  }

  parseDevice(ua: string): string {
    if (!ua) return '—';
    // Extract OS
    let os = 'Desconhecido';
    if (/iPhone/.test(ua)) os = 'iPhone';
    else if (/iPad/.test(ua)) os = 'iPad';
    else if (/Android/.test(ua)) {
      const model = ua.match(/Android[^;]*;\s*([^)]+)/);
      os = model ? model[1].trim() : 'Android';
    }
    else if (/Windows/.test(ua)) os = 'Windows';
    else if (/Mac OS/.test(ua)) os = 'Mac';
    else if (/Linux/.test(ua)) os = 'Linux';
    // Extract browser
    let browser = '';
    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome';
    else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';
    return browser ? `${os} · ${browser}` : os;
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
