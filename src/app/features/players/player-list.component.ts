import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { Player, PlayerService, PlayerStatus } from './player.service';

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './player-list.component.html',
  styleUrl: './player-list.component.scss',
})
export class PlayerListComponent implements OnInit, OnDestroy {
  private readonly playerService = inject(PlayerService);
  private subscription?: Subscription;

  readonly totalPlayers = 4;
  readonly players = signal<Player[]>([]);
  readonly loading = signal(true);

  readonly confirmedCount = computed(() =>
    this.players().filter((p) => p.status === 'confirmed').length);

  readonly declinedCount = computed(() =>
    this.players().filter((p) => p.status === 'declined').length);

  readonly isFull = computed(() => this.confirmedCount() >= this.totalPlayers);

  ngOnInit(): void {
    this.subscription = this.playerService.players$().subscribe((players) => {
      this.players.set(players);
      this.loading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  setStatus(playerId: number, status: PlayerStatus): void {
    if (status === 'confirmed' && this.isFull()) {
      const player = this.players().find((p) => p.id === playerId);
      if (player?.status !== 'confirmed') return;
    }
    const player = this.players().find((p) => p.id === playerId);
    if (!player) return;
    const newStatus = player.status === status ? 'pending' : status;
    this.playerService.updateStatus(playerId, newStatus);
  }

  readonly showModal = signal(false);

  scrollToPlayers(): void {
    document.getElementById('player-list')?.scrollIntoView({ behavior: 'smooth' });
  }

  showFullAlert(): void {
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }
}
