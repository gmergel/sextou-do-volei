import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Player, PlayerStatus, Game } from '../../models/game.model';
import { GameService } from './game.service';

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './player-list.component.html',
  styleUrl: './player-list.component.scss',
})
export class PlayerListComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly gameService = inject(GameService);
  private subscription?: Subscription;
  private eligibilityTimer?: ReturnType<typeof setInterval>;

  gameId = '';
  readonly game = signal<Game | null>(null);
  readonly players = signal<Player[]>([]);
  readonly loading = signal(true);
  private readonly now = signal(Date.now());

  readonly totalPlayers = computed(() => this.game()?.totalPlayers ?? 14);

  /** Maior id de jogador habilitado a confirmar neste momento */
  readonly maxEligibleId = computed(() => {
    const game = this.game();
    if (!game) return 14;
    const createdAt = new Date(game.createdAt).getTime();
    const elapsed = Math.max(0, this.now() - createdAt);
    const baseSlots = game.totalPlayers + Math.floor(elapsed / 5000);
    const players = this.players();

    // Cada jogador elegível que declinou libera +1 vaga
    let eligible = Math.min(23, baseSlots);
    let prev = -1;
    while (eligible !== prev && eligible <= 23) {
      prev = eligible;
      const declined = players.filter(p => p.id <= eligible && p.status === 'declined').length;
      eligible = Math.min(23, baseSlots + declined);
    }
    return eligible;
  });

  readonly confirmedCount = computed(() =>
    this.players().filter((p) => p.status === 'confirmed').length);

  readonly declinedCount = computed(() =>
    this.players().filter((p) => p.status === 'declined').length);

  readonly isFull = computed(() => this.confirmedCount() >= this.totalPlayers());

  canInteract(player: Player): boolean {
    return player.id <= this.maxEligibleId();
  }

  async ngOnInit(): Promise<void> {
    this.gameId = this.route.snapshot.params['gameId'];

    const game = await this.gameService.getGame(this.gameId);
    if (!game) {
      return;
    }
    this.game.set(game);

    // Atualiza elegibilidade a cada 1s
    this.eligibilityTimer = setInterval(() => this.now.set(Date.now()), 1000);

    this.subscription = this.gameService.players$(this.gameId).subscribe((players) => {
      this.players.set(players.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      this.loading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    if (this.eligibilityTimer) clearInterval(this.eligibilityTimer);
  }

  setStatus(playerId: number, status: PlayerStatus): void {
    const player = this.players().find((p) => p.id === playerId);
    if (!player) return;
    // Ineligible players can only decline
    if (!this.canInteract(player) && status !== 'declined') return;
    if (status === 'confirmed' && this.isFull() && player.status !== 'confirmed') return;
    const newStatus = player.status === status ? 'pending' : status;
    this.gameService.updateStatus(this.gameId, player, newStatus);
  }

  formatGameDate(): string {
    const g = this.game();
    if (!g) return '';
    const [y, m, d] = g.date.split('-');
    return `${d}/${m}`;
  }

  readonly showModal = signal(false);
  readonly showWaitModal = signal(false);
  readonly waitPlayerId = signal(0);

  /** Segundos restantes para o jogador do modal poder confirmar */
  readonly waitSeconds = computed(() => {
    const game = this.game();
    if (!game) return 0;
    const pid = this.waitPlayerId();
    if (pid <= this.maxEligibleId()) return 0;
    const createdAt = new Date(game.createdAt).getTime();
    const elapsed = this.now() - createdAt;
    const declined = this.players().filter(p => p.id <= pid && p.status === 'declined').length;
    const needMs = (pid - game.totalPlayers - declined) * 5000;
    return Math.max(0, Math.ceil((needMs - elapsed) / 1000));
  });

  scrollToPlayers(): void {
    document.getElementById('player-list')?.scrollIntoView({ behavior: 'smooth' });
  }

  showFullAlert(): void {
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  showWaitAlert(playerId: number): void {
    this.waitPlayerId.set(playerId);
    this.showWaitModal.set(true);
  }

  closeWaitModal(): void {
    this.showWaitModal.set(false);
  }
}
