import { RosterPlayer } from '../../models/roster.model';

export interface RosterDiffEntry {
  type: 'added' | 'removed' | 'moved' | 'renamed' | 'reactivated' | 'deactivated';
  player: RosterPlayer;
  previousIndex?: number;
  currentIndex?: number;
  previousName?: string;
}

export function calculateRosterDiff(
  previous: RosterPlayer[],
  current: RosterPlayer[]
): RosterDiffEntry[] {
  const diffs: RosterDiffEntry[] = [];
  const prevMap = new Map(previous.map((p, i) => [p.id, { player: p, index: i }]));
  const currMap = new Map(current.map((p, i) => [p.id, { player: p, index: i }]));

  // Check for added players
  for (const [id, { player, index }] of currMap) {
    if (!prevMap.has(id)) {
      diffs.push({ type: 'added', player, currentIndex: index });
    }
  }

  // Check for removed players
  for (const [id, { player, index }] of prevMap) {
    if (!currMap.has(id)) {
      diffs.push({ type: 'removed', player, previousIndex: index });
    }
  }

  // Check for changes in existing players
  for (const [id, { player: currPlayer, index: currIndex }] of currMap) {
    const prev = prevMap.get(id);
    if (!prev) continue;

    const { player: prevPlayer, index: prevIndex } = prev;

    if (prevPlayer.name !== currPlayer.name) {
      diffs.push({ type: 'renamed', player: currPlayer, previousName: prevPlayer.name });
    }

    if (prevPlayer.active && !currPlayer.active) {
      diffs.push({ type: 'deactivated', player: currPlayer });
    } else if (!prevPlayer.active && currPlayer.active) {
      diffs.push({ type: 'reactivated', player: currPlayer });
    }

    if (prevIndex !== currIndex && prevPlayer.active && currPlayer.active) {
      diffs.push({ type: 'moved', player: currPlayer, previousIndex: prevIndex, currentIndex: currIndex });
    }
  }

  return diffs;
}
