import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Player, PlayerStatus, Game } from '../../models/game.model';
import { TURMAS } from '../../models/turma.model';
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

  /** Conjunto de IDs de jogadores habilitados a confirmar neste momento */
  readonly eligibleIds = computed(() => {
    const game = this.game();
    if (!game) return new Set<number>();
    const createdAt = new Date(game.createdAt).getTime();
    const elapsed = Math.max(0, this.now() - createdAt);
    const baseSlots = game.totalPlayers + Math.floor(elapsed / this.SLOT_INTERVAL_MS);
    const players = this.players();

    // Ordena todos por ID para posição na fila
    const sorted = [...players].sort((a, b) => a.id - b.id);
    const eligible = new Set<number>();

    // Cada slot habilita o próximo da fila;
    // cada decline dentro dos habilitados libera +1 slot
    let slots = baseSlots;
    let prev = -1;
    while (eligible.size !== prev) {
      prev = eligible.size;
      eligible.clear();
      let used = 0;
      for (const p of sorted) {
        if (used >= slots) break;
        eligible.add(p.id);
        used++;
      }
      // Recalcula slots: base + declines dentro dos elegíveis
      const declined = sorted.filter(p => eligible.has(p.id) && p.status === 'declined').length;
      slots = baseSlots + declined;
    }
    return eligible;
  });

  /** Maior id elegível (compat) */
  readonly maxEligibleId = computed(() => {
    const ids = this.eligibleIds();
    return ids.size ? Math.max(...ids) : 14;
  });

  readonly confirmedCount = computed(() =>
    this.players().filter((p) => p.status === 'confirmed').length);

  readonly declinedCount = computed(() =>
    this.players().filter((p) => p.status === 'declined').length);

  readonly isFull = computed(() => this.confirmedCount() >= this.totalPlayers());

  canInteract(player: Player): boolean {
    if (player.status === 'confirmed') return true;
    const eligible = this.eligibleIds();

    // Se tem effectiveId (penalidade por ter declinado e alguém aproveitou),
    // verifica ambos: id original E effectiveId — basta um ser elegível
    if (player.effectiveId && player.effectiveId > player.id) {
      return eligible.has(player.id) || eligible.has(player.effectiveId);
    }

    return eligible.has(player.id);
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
      const currentEligible = this.eligibleIds();
      const withoutEligible = this.eligibleIdsWithout(player.id);
      // Alguém que ficou elegível graças ao decline já confirmou?
      const someoneConfirmed = this.players().some(
        p => !p.guest && currentEligible.has(p.id) && !withoutEligible.has(p.id) && p.status === 'confirmed'
      );
      if (someoneConfirmed) {
        effectiveId = this.maxEligibleId();
      }
      // Se ninguém confirmou, volta sem penalidade
    }

    this.gameService.updateStatus(this.gameId, player, newStatus, effectiveId).then(() => {
      const confirmed = this.confirmedCount();
      const total = this.totalPlayers();

      // Vaga liberada: jogador saiu de confirmed (desconfirmou) ou declinou
      if (player.status === 'confirmed' && newStatus !== 'confirmed') {
        this.gameService.addEventLog(this.gameId, 'slot_opened',
          `${player.name} liberou uma vaga (${confirmed}/${total})`);
      } else if (newStatus === 'declined' && player.status !== 'confirmed') {
        this.gameService.addEventLog(this.gameId, 'slot_opened',
          `${player.name} recusou — vaga liberada na fila (${confirmed}/${total})`);
      }

      // Jogo lotou
      if (newStatus === 'confirmed' && confirmed === total) {
        this.gameService.addEventLog(this.gameId, 'game_full',
          `Jogo lotado! (${total}/${total})`);
      }

      // Jogo reabriu (saiu de lotado)
      if (player.status === 'confirmed' && newStatus !== 'confirmed' && confirmed === total - 1) {
        this.gameService.addEventLog(this.gameId, 'game_reopened',
          `Vaga reaberta (${confirmed}/${total})`);
      }
    });
  }

  /** Calcula eligibleIds simulando que um jogador NÃO tivesse declinado */
  private eligibleIdsWithout(excludeId: number): Set<number> {
    const game = this.game();
    if (!game) return new Set();
    const createdAt = new Date(game.createdAt).getTime();
    const elapsed = Math.max(0, this.now() - createdAt);
    const baseSlots = game.totalPlayers + Math.floor(elapsed / this.SLOT_INTERVAL_MS);
    const players = this.players();
    const sorted = [...players].sort((a, b) => a.id - b.id);
    const eligible = new Set<number>();

    let slots = baseSlots;
    let prev = -1;
    while (eligible.size !== prev) {
      prev = eligible.size;
      eligible.clear();
      let used = 0;
      for (const p of sorted) {
        if (used >= slots) break;
        eligible.add(p.id);
        used++;
      }
      const declined = sorted.filter(
        p => eligible.has(p.id) && p.id !== excludeId && p.status === 'declined'
      ).length;
      slots = baseSlots + declined;
    }
    return eligible;
  }

  formatGameDate(): string {
    const g = this.game();
    if (!g) return '';
    const [y, m, d] = g.date.split('-');
    const date = new Date(+y, +m - 1, +d);
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '');
    return `${d}/${m} (${weekday})`;
  }

  turmaLabel(): string {
    const g = this.game();
    if (!g) return '#Sextou do Vôlei';
    return TURMAS[g.turma]?.label ?? '#Sextou do Vôlei';
  }

  turmaEmoji(): string {
    const g = this.game();
    if (!g) return '🍺';
    return TURMAS[g.turma]?.emoji ?? '🍺';
  }

  turmaColorClass(): string {
    const g = this.game();
    if (!g) return 'turma-sextou';
    return TURMAS[g.turma]?.colorClass ?? 'turma-sextou';
  }

  readonly showModal = signal(false);
  readonly showWaitModal = signal(false);
  readonly showInfoModal = signal(false);
  readonly showShareModal = signal(false);
  readonly shareCopied = signal(false);
  readonly waitPlayerId = signal(0);

  /** Posição na fila de espera (0 = já pode confirmar) */
  readonly waitQueuePosition = computed(() => {
    const pid = this.waitPlayerId();
    const eligible = this.eligibleIds();
    if (eligible.has(pid)) return 0;
    // Conta quantos jogadores à frente na fila que ainda não são elegíveis
    const sorted = [...this.players()].sort((a, b) => a.id - b.id);
    const ahead = sorted.filter(
      p => !eligible.has(p.id)
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
    'ASTTI': 'ASTTI, Porto Alegre RS',
    'Arena Beach': 'Arena Beach POA, Avenida Sertório, Porto Alegre RS',
    'LFR Beach': 'LFR Beach, Moinhos de Vento, Porto Alegre RS',
    'Alma Beach': 'Alma Beach Sports, 4º Distrito, Porto Alegre RS',
    'Sogipa': 'Sogipa, Rua Barão de Cotegipe 415, São João, Porto Alegre RS',
  };

  private getMapsUrl(location: string): string {
    const game = this.game();
    const address = game?.locationAddress
      ?? this.locationAddresses[location]
      ?? location;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  openMaps(): void {
    const loc = this.game()?.location;
    if (!loc) return;
    const url = this.getMapsUrl(loc);
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

  // ---- Compartilhar lista ----
  private readonly WOMEN = new Set([
    'Michele', 'Dani', 'Raquel', 'Neide', 'Fran', 'Fernanda',
    'Michelle', 'Rosa', 'Rosani', 'Vanessa', 'Adri',
    'Vanessa do Carlos', 'Vanessa do Felipe', 'Luana', 'Nathi',
  ]);

  private readonly WOMEN_RANK: Record<string, number> = {
    'Michelle': 1, 'Dani': 2, 'Neide': 3, 'Fran': 4,
    'Michele': 5, 'Raquel': 6, 'Rosani': 7, 'Fernanda': 8, 'Rosa': 9,
    'Adri': 10, 'Vanessa do Felipe': 11, 'Vanessa': 11,
    'Vanessa do Carlos': 12, 'Luana': 13, 'Nathi': 14,
  };

  private readonly MEN_RANK: Record<string, number> = {
    'Leandro': 1, 'Carlos': 3, 'Carlos da Adri': 3, 'Arthur': 3, 'Gilson': 4,
    'Ger': 5, 'Thiago': 6, 'Dias': 7, 'Wagner': 8,
    'Felipe': 9, 'Carlos da Vanessa': 10, 'Adel': 11, 'Rafa': 12,
  /** Pontuação de habilidade: 1 = ruim, 2 = médio, 3 = bom */
  private readonly PLAYER_RATING: Record<string, number> = {
    'Adri': 1, 'Alcides': 2, 'Arthur': 3, 'Carlos': 3,
    'Cleber': 1, 'Dani': 3, 'Daniel': 1, 'Dias': 2,
    'Felipe': 2, 'Fernanda': 1, 'Fran': 2, 'Ger': 2,
    'Gilson': 3, 'Leandro': 3, 'Michele': 2, 'Michelle': 3,
    'Neide': 3, 'Raquel': 2, 'Rosa': 1, 'Rosani': 1,
    'Thiago': 3, 'Vanessa': 2, 'Wagner': 2,
  };

  private readonly MUST_SEPARATE = ['Leandro', 'Carlos', 'Carlos da Adri'];

  /** PRNG simples baseada na data do jogo — mesma data = mesmos times */
  private seededRng(seed: string): () => number {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
      h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
      h = (h ^ (h >>> 16)) >>> 0;
      return h / 0x100000000;
    };
  }

  private buildTeams(confirmed: Player[], gameDate: string): { teamA: string[]; teamB: string[] } {
    const rng = this.seededRng(gameDate);
    const getRating = (name: string) => this.PLAYER_RATING[name] ?? 2;

    const allWomen = confirmed.filter(p => this.WOMEN.has(p.name));
    const allMen = confirmed.filter(p => !this.WOMEN.has(p.name));

    const teamA: string[] = [];
    const teamB: string[] = [];

    // 1) Regra de ouro: separar Leandro e Carlos
    const swap = rng() < 0.5;
    const leandro = allMen.find(p => p.name === 'Leandro');
    const carlos = allMen.find(p => p.name === 'Carlos');
    const remainingMen = allMen.filter(p => p.name !== 'Leandro' && p.name !== 'Carlos');
    let menPointsA = 0, menPointsB = 0;
    let menCountA = 0, menCountB = 0;

    if (leandro && carlos) {
      if (swap) {
        teamA.push('Carlos'); menPointsA += getRating('Carlos'); menCountA++;
        teamB.push('Leandro'); menPointsB += getRating('Leandro'); menCountB++;
      } else {
        teamA.push('Leandro'); menPointsA += getRating('Leandro'); menCountA++;
        teamB.push('Carlos'); menPointsB += getRating('Carlos'); menCountB++;
      }
    } else if (leandro) {
      teamA.push('Leandro'); menPointsA += getRating('Leandro'); menCountA++;
    } else if (carlos) {
      teamA.push('Carlos'); menPointsA += getRating('Carlos'); menCountA++;
    }

    // 2) Ordenar homens por rating DESCENDENTE (melhores primeiro) com jitter
    const sortDescWithJitter = (list: Player[]) => {
      const jitter = new Map<string, number>();
      for (const p of list) {
        jitter.set(p.name, getRating(p.name) + (rng() - 0.5) * 0.8);
      }
      list.sort((a, b) => jitter.get(b.name)! - jitter.get(a.name)!);
    };
    sortDescWithJitter(remainingMen);
    sortDescWithJitter(allWomen);

    // 3) Distribuir homens: cada um vai pro time com MENOR pontuação masculina
    //    Capacidade máxima = ceil(totalMen/2) para cada time
    //    Se ímpar, o time com menor pts fica com o homem extra
    const menMax = Math.ceil(allMen.length / 2);
    for (const p of remainingMen) {
      const rating = getRating(p.name);
      const canA = menCountA < menMax;
      const canB = menCountB < menMax;
      if (canA && (!canB || menPointsA <= menPointsB)) {
        teamA.push(p.name); menPointsA += rating; menCountA++;
      } else {
        teamB.push(p.name); menPointsB += rating; menCountB++;
      }
    }

    // 4) Definir alvos de mulheres para equilibrar tamanho total dos times
    const teamSizeA = Math.ceil(confirmed.length / 2);
    const womenTargetA = teamSizeA - menCountA;
    const womenTargetB = allWomen.length - womenTargetA;

    // 5) Distribuir mulheres: usar pontuação TOTAL do time (H+M) para compensar
    //    desequilíbrios masculinos na distribuição feminina
    let totalPointsA = menPointsA, totalPointsB = menPointsB;
    let womenCountA = 0, womenCountB = 0;
    for (const w of allWomen) {
      const rating = getRating(w.name);
      const canA = womenCountA < womenTargetA;
      const canB = womenCountB < womenTargetB;
      if (canA && (!canB || totalPointsA <= totalPointsB)) {
        teamA.push(w.name); totalPointsA += rating; womenCountA++;
      } else {
        teamB.push(w.name); totalPointsB += rating; womenCountB++;
      }
    }

    return { teamA, teamB };
  }

  readonly shareText = computed(() => {
    const game = this.game();
    if (!game) return '';
    const confirmed = this.players().filter(p => p.status === 'confirmed');
    const [y, m, d] = game.date.split('-');
    const address = game.locationAddress ?? this.locationAddresses[game.location] ?? game.location;
    const gameUrl = `https://gmergel.github.io/sextou-do-volei/jogo/${this.gameId}`;

    const turmaLabel = TURMAS[game.turma]?.label ?? '#Sextou do Vôlei';

    const lines = [
      `🏐 *${turmaLabel}* — ${d}/${m} às ${game.time}`,
      `📍 ${game.location}`,
      address,
    ];

    if (confirmed.length < 4) {
      lines.push(
        '',
        `✅ *Confirmados (${confirmed.length}/${this.totalPlayers()}):*`,
        ...confirmed
          .sort((a, b) => new Date(a.lastChange ?? 0).getTime() - new Date(b.lastChange ?? 0).getTime())
          .map((p, i) => `${i + 1}. ${p.name}`),
      );
      if (confirmed.length === 0) {
        lines.push('Nenhum jogador confirmado ainda.');
      }
    } else {
      const { teamA, teamB } = this.buildTeams(confirmed, game.date);
      lines.push(
        '',
        `🟡 *Time A (${teamA.length}):*`,
        ...teamA.map((n, i) => `${i + 1}. ${n}`),
        '',
        `🔵 *Time B (${teamB.length}):*`,
        ...teamB.map((n, i) => `${i + 1}. ${n}`),
      );
    }

    lines.push('', `🔗 Confirme sua presença no app:`, gameUrl);
    return lines.join('\n');
  });

  openShareModal(): void {
    this.shareCopied.set(false);
    this.showShareModal.set(true);
  }

  closeShareModal(): void {
    this.showShareModal.set(false);
  }

  copyShareText(): void {
    navigator.clipboard.writeText(this.shareText()).then(() => {
      this.shareCopied.set(true);
    });
  }

  shareWhatsApp(): void {
    const text = this.shareText();
    if (!text) return;

    // Web Share API (mobile) — preserva emojis perfeitamente
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
      return;
    }

    // Fallback desktop: abre WhatsApp Web
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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
