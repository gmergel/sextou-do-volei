import { Game, PlayerDoc } from '../../models/game.model';

export const SLOT_INTERVAL_MS = 4 * 60 * 60 * 1000;
type QueuePlayer = Pick<PlayerDoc, 'id' | 'status' | 'effectiveId'>;

export function eligiblePlayerIds(
  game: Game,
  players: readonly QueuePlayer[],
  now: number,
  excludeDeclineId?: number,
): Set<number> {
  const elapsed = Math.max(0, now - new Date(game.createdAt).getTime());
  const baseSlots = game.totalPlayers + Math.floor(elapsed / SLOT_INTERVAL_MS);
  const sorted = [...players].sort((a, b) => a.id - b.id);
  let slots = baseSlots;
  let previousSize = -1;
  let eligible = new Set<number>();
  while (eligible.size !== previousSize) {
    previousSize = eligible.size;
    eligible = new Set(sorted.slice(0, slots).map(player => player.id));
    slots = baseSlots + sorted.filter(player =>
      eligible.has(player.id) && player.id !== excludeDeclineId && player.status === 'declined',
    ).length;
  }
  return eligible;
}

export function isPlayerEligible(player: QueuePlayer, eligible: Set<number>): boolean {
  return eligible.has(player.id) ||
    (player.effectiveId !== undefined && player.effectiveId > player.id && eligible.has(player.effectiveId));
}

export function interestedPlayersToConfirm<T extends QueuePlayer & Pick<PlayerDoc, 'interested'>>(
  game: Game,
  players: readonly T[],
  now: number,
): T[] {
  const available = game.totalPlayers - players.filter(player => player.status === 'confirmed').length;
  if (available <= 0) return [];
  const eligible = eligiblePlayerIds(game, players, now);
  return players
    .filter(player => player.status === 'pending' && player.interested && isPlayerEligible(player, eligible))
    .sort((a, b) => a.id - b.id)
    .slice(0, available);
}
