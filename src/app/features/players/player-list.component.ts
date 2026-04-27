import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Player, PlayerStatus, Game } from '../../models/game.model';
import { GameService } from './game.service';

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
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

  private readonly SLOT_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 horas

  /** Maior id de jogador habilitado a confirmar neste momento */
  readonly maxEligibleId = computed(() => {
    const game = this.game();
    if (!game) return 14;
    const createdAt = new Date(game.createdAt).getTime();
    const elapsed = Math.max(0, this.now() - createdAt);
    const baseSlots = game.totalPlayers + Math.floor(elapsed / this.SLOT_INTERVAL_MS);
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
    if (player.status === 'confirmed') return true;
    const maxElig = this.maxEligibleId();

    // Convidados seguem a fila como os demais
    if (player.guest) return player.id <= maxElig;

    // Se tem effectiveId (penalidade por ter declinado), verifica se ainda vale
    if (player.effectiveId && player.effectiveId > player.id) {
      const eid = player.effectiveId;
      const penaltyValid = this.players().some(
        p => !p.guest && p.id > maxElig && p.id <= eid && p.status === 'confirmed'
      );
      // Se ninguém aproveitou a vaga, usa prioridade original
      return penaltyValid ? eid <= maxElig : player.id <= maxElig;
    }

    return player.id <= maxElig;
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

    // Ao voltar atrás de um "Não", verifica se alguém já aproveitou a vaga
    let effectiveId: number | undefined;
    if (player.status === 'declined' && newStatus === 'pending') {
      const currentMax = this.maxEligibleId();
      const maxWithout = this.maxEligibleIdWithout(player.id);
      // Alguém na faixa aberta pelo decline já confirmou?
      const someoneConfirmed = this.players().some(
        p => !p.guest && p.id > maxWithout && p.id <= currentMax && p.status === 'confirmed'
      );
      if (someoneConfirmed) {
        effectiveId = currentMax;
      }
      // Se ninguém confirmou, volta sem penalidade
    }

    this.gameService.updateStatus(this.gameId, player, newStatus, effectiveId);
  }

  /** Calcula maxEligibleId simulando que um jogador NÃO tivesse declinado */
  private maxEligibleIdWithout(excludeId: number): number {
    const game = this.game();
    if (!game) return 14;
    const createdAt = new Date(game.createdAt).getTime();
    const elapsed = Math.max(0, this.now() - createdAt);
    const baseSlots = game.totalPlayers + Math.floor(elapsed / this.SLOT_INTERVAL_MS);
    const players = this.players();

    let eligible = Math.min(23, baseSlots);
    let prev = -1;
    while (eligible !== prev && eligible <= 23) {
      prev = eligible;
      const declined = players.filter(
        p => p.id <= eligible && p.id !== excludeId && p.status === 'declined'
      ).length;
      eligible = Math.min(23, baseSlots + declined);
    }
    return eligible;
  }

  formatGameDate(): string {
    const g = this.game();
    if (!g) return '';
    const [y, m, d] = g.date.split('-');
    return `${d}/${m}`;
  }

  readonly showModal = signal(false);
  readonly showWaitModal = signal(false);
  readonly showInfoModal = signal(false);
  readonly waitPlayerId = signal(0);

  /** Posição na fila de espera (0 = já pode confirmar) */
  readonly waitQueuePosition = computed(() => {
    const pid = this.waitPlayerId();
    const maxElig = this.maxEligibleId();
    if (pid <= maxElig) return 0;
    // Conta quantos jogadores à frente na fila (pelo id original)
    // Jogadores prioritários que perderam prioridade (effectiveId) não contam
    const ahead = this.players().filter(
      p => !p.guest
        && p.id > maxElig
        && p.id < pid
        && p.status !== 'declined'
    ).length;
    return ahead + 1;
  });

  scrollToPlayers(): void {
    document.getElementById('player-list')?.scrollIntoView({ behavior: 'smooth' });
  }

  showFullAlert(): void {
    this.showModal.set(true);
  }

  private readonly locationAddresses: Record<string, string> = {
    'My Beach': 'My Beach Sports, Avenida Circular 173, Vila Jardim, Porto Alegre RS',
    "It's Nilo": "It's Esportes e Eventos, Avenida Dr Nilo Pe\u00e7anha 3370, Petr\u00f3polis, Porto Alegre RS",
    'MB': 'MB Beach Sports, Avenida Alexandre Luiz 190, Jardim Itu Sabar\u00e1, Porto Alegre RS',
    'Meca': 'Meca Sports Bar, Avenida Baltazar de Oliveira Garcia 2274, S\u00e3o Sebasti\u00e3o, Porto Alegre RS',
  };

  openMaps(): void {
    const loc = this.game()?.location;
    if (!loc) return;
    const address = this.locationAddresses[loc] ?? loc;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    if (confirm(`Abrir ${loc} no Google Maps?`)) {
      window.open(url, '_blank');
    }
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

  // ---- Jogadores convidados ----
  guestName = '';
  readonly addingGuest = signal(false);
  readonly showGuestModal = signal(false);

  readonly regularPlayers = computed(() =>
    this.players().filter(p => !p.guest)
  );

  readonly guestPlayers = computed(() =>
    this.players().filter(p => p.guest)
  );

  openGuestModal(): void {
    this.guestName = '';
    this.showGuestModal.set(true);
  }

  closeGuestModal(): void {
    this.showGuestModal.set(false);
  }

  async addGuest(): Promise<void> {
    const name = this.guestName.trim();
    if (!name || this.addingGuest()) return;
    this.addingGuest.set(true);
    try {
      await this.gameService.addGuestPlayer(this.gameId, name);
      this.guestName = '';
      this.showGuestModal.set(false);
    } finally {
      this.addingGuest.set(false);
    }
  }

  async removeGuest(playerId: number): Promise<void> {
    if (!confirm('Remover este jogador convidado?')) return;
    await this.gameService.removeGuestPlayer(this.gameId, playerId);
  }
}
