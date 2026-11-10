import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  getDocsFromServer,
  collection,
  collectionData,
  docData,
  writeBatch,
  runTransaction,
  increment,
  Transaction,
  DocumentReference,
  updateDoc,
  addDoc,
  deleteField,
  orderBy,
  query,
} from '@angular/fire/firestore';
import { Observable, of, switchMap, map } from 'rxjs';
import {
  Game,
  Player,
  PlayerDoc,
  PlayerStatus,
  CheckinLog,
  LogType,
  DEFAULT_PLAYERS,
} from '../../models/game.model';
import { TurmaId, TURMAS } from '../../models/turma.model';
import { DeviceInfoService } from './device-info.service';
import { eligiblePlayerIds, interestedPlayersToConfirm, isPlayerEligible } from './eligibility';

class QueueChangedError extends Error {}
type QueueGame = Game & { queueRevision?: number };
type QueueEntry = { ref: DocumentReference; player: PlayerDoc };
type QueueSnapshot = { revision: number; entries: QueueEntry[] };

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly firestore = inject(Firestore);
  private readonly deviceInfo: DeviceInfoService = inject(DeviceInfoService);
  private seeding = false;
  private readonly queueSnapshots = new Map<string, QueueSnapshot>();
  private readonly queueLoads = new Map<string, Promise<QueueSnapshot>>();

  games$(): Observable<Game[]> {
    const gamesCol = collection(this.firestore, 'games');
    const q = query(gamesCol, orderBy('createdAt', 'desc'));
    return (collectionData(q) as Observable<Game[]>).pipe(
      map(games => games.map((g: Game) => ({ ...g, turma: g.turma || 'sextou' as const })))
    );
  }

  async getGame(gameId: string): Promise<Game | null> {
    const gameDoc = doc(this.firestore, 'games', gameId);
    const snap = await getDoc(gameDoc);
    if (!snap.exists()) return null;
    const game = snap.data() as Game;
    if (!game.turma) game.turma = 'sextou';
    return game;
  }

  game$(gameId: string): Observable<Game | undefined> {
    return docData(doc(this.firestore, 'games', gameId)) as Observable<Game | undefined>;
  }

  async prepareGameActions(gameId: string): Promise<void> {
    await Promise.all([this.loadQueue(gameId), this.deviceInfo.getCheckinDetails()]);
  }

  private loadQueue(gameId: string): Promise<QueueSnapshot> {
    const pending = this.queueLoads.get(gameId);
    if (pending) return pending;
    const load = (async () => {
      try {
        // A leitura anterior da revisão permite detectar mudanças durante a consulta da coleção.
        const before = await getDocFromServer(doc(this.firestore, 'games', gameId));
        if (!before.exists()) throw new Error('Jogo não encontrado.');
        const players = await getDocsFromServer(collection(this.firestore, 'games', gameId, 'players'));
        const snapshot: QueueSnapshot = {
          revision: (before.data() as QueueGame).queueRevision ?? 0,
          entries: players.docs.map(player => ({ ref: player.ref, player: player.data() as PlayerDoc })),
        };
        this.rememberQueue(gameId, snapshot);
        return snapshot;
      } finally {
        this.queueLoads.delete(gameId);
      }
    })();
    this.queueLoads.set(gameId, load);
    return load;
  }

  private rememberQueue(gameId: string, snapshot: QueueSnapshot): void {
    const current = this.queueSnapshots.get(gameId);
    if (!current || current.revision <= snapshot.revision) {
      this.queueSnapshots.set(gameId, snapshot);
    }
  }

  private async withQueue(
    gameId: string,
    action: (transaction: Transaction, game: QueueGame, entries: QueueEntry[]) => boolean | Promise<boolean>,
  ): Promise<QueueSnapshot> {
    const gameRef = doc(this.firestore, 'games', gameId);
    let snapshot = this.queueSnapshots.get(gameId) ?? await this.loadQueue(gameId);
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const committed = await runTransaction(this.firestore, async transaction => {
          const gameSnapshot = await transaction.get(gameRef);
          if (!gameSnapshot.exists()) throw new Error('Jogo não encontrado.');
          const game = gameSnapshot.data() as QueueGame;
          if ((game.queueRevision ?? 0) !== snapshot.revision) throw new QueueChangedError();
          const entries = snapshot.entries.map(entry => ({
            ref: entry.ref,
            player: { ...entry.player },
          }));
          if (!await action(transaction, game, entries)) return snapshot;
          transaction.update(gameRef, { queueRevision: increment(1) });
          return { revision: snapshot.revision + 1, entries };
        });
        this.rememberQueue(gameId, committed);
        return committed;
      } catch (error) {
        if (!(error instanceof QueueChangedError)) throw error;
        if (attempt < 4) snapshot = await this.loadQueue(gameId);
      }
    }
    throw new Error('A lista mudou durante a atualização. Tente novamente.');
  }

  async createGame(data: Omit<Game, 'uid' | 'createdAt'>): Promise<Game> {
    this.validateTotalPlayers(data.totalPlayers);
    const game: Game = {
      ...data,
      uid: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const gameDoc = doc(this.firestore, 'games', game.uid);
    await setDoc(gameDoc, game);
    await this.seedPlayers(game.uid, game.turma);
    return game;
  }

  async updateGame(
    gameId: string,
    data: Pick<Game, 'date' | 'time' | 'location' | 'totalPlayers'> & { locationAddress?: string },
  ): Promise<void> {
    this.validateTotalPlayers(data.totalPlayers);
    const gameDoc = doc(this.firestore, 'games', gameId);
    await updateDoc(gameDoc, {
      ...data,
      locationAddress: data.locationAddress?.trim() || deleteField(),
    });
  }

  private validateTotalPlayers(totalPlayers: number): void {
    if (
      !Number.isInteger(totalPlayers) ||
      totalPlayers < 12 ||
      totalPlayers > 20 ||
      totalPlayers % 2 !== 0
    ) {
      throw new RangeError('A quantidade de jogadores deve ser par, entre 12 e 20.');
    }
  }

  players$(gameId: string): Observable<Player[]> {
    const playersCol = collection(this.firestore, 'games', gameId, 'players');
    return (collectionData(playersCol) as Observable<PlayerDoc[]>).pipe(
      switchMap((docs) => {
        if (docs.length === 0 && !this.seeding) {
          this.seeding = true;
          this.seedPlayers(gameId).then(() => (this.seeding = false));
          return of(DEFAULT_PLAYERS);
        }
        const players: Player[] = docs
          .map((d) => ({
            ...d,
            lastChange: d.lastChange ? new Date(d.lastChange) : null,
          }))
          .sort((a, b) => a.id - b.id);
        return of(players);
      })
    );
  }

  async updateStatus(
    gameId: string,
    player: Player,
    newStatus: PlayerStatus,
    effectiveId?: number,
  ): Promise<Player> {
    const now = new Date().toISOString();

    const deviceDetails = this.deviceInfo.getCheckinDetails();

    const checkinsCol = collection(
      this.firestore, 'games', gameId, 'checkins'
    );
    const logRef = doc(checkinsCol);
    const saved = await this.withQueue(gameId, async (transaction, game, entries) => {
      const target = entries.find(entry => entry.player.id === player.id);
      if (!target || target.player.status !== player.status) {
        throw new Error('A resposta do jogador mudou. Atualize e tente novamente.');
      }
      if (newStatus === 'confirmed') {
        const eligible = eligiblePlayerIds(game, entries.map(entry => entry.player), Date.now());
        if (!isPlayerEligible(target.player, eligible) ||
            entries.filter(entry => entry.player.status === 'confirmed').length >= game.totalPlayers) {
          throw new Error('Não há vaga disponível para este jogador.');
        }
      }
      const playerUpdate = {
        status: newStatus,
        lastChange: newStatus === 'pending' ? null : now,
        interested: deleteField(),
        ...(effectiveId !== undefined ? { effectiveId } : {}),
      };
      const checkinLog: CheckinLog = {
        type: 'status_change',
        playerId: player.id,
        playerName: player.name,
        previousStatus: player.status,
        newStatus,
        timestamp: now,
        ...await deviceDetails,
      };
      transaction.update(target.ref, playerUpdate);
      target.player.status = newStatus;
      target.player.lastChange = newStatus === 'pending' ? null : now;
      delete target.player.interested;
      if (effectiveId !== undefined) target.player.effectiveId = effectiveId;
      transaction.set(logRef, checkinLog);
      return true;
    });
    return this.savedPlayer(saved, player.id);
  }

  private savedPlayer(snapshot: QueueSnapshot, playerId: number): Player {
    const player = snapshot.entries.find(entry => entry.player.id === playerId)?.player;
    if (!player) throw new Error('Jogador não encontrado após a atualização.');
    return { ...player, lastChange: player.lastChange ? new Date(player.lastChange) : null };
  }

  async setPlayerInterest(gameId: string, playerId: number, interested: boolean): Promise<Player> {
    const saved = await this.withQueue(gameId, (transaction, _game, entries) => {
      const target = entries.find(entry => entry.player.id === playerId);
      if (!target || target.player.status !== 'pending') {
        throw new Error('O jogador não está mais aguardando.');
      }
      if (!!target.player.interested === interested) return false;
      transaction.update(target.ref, { interested: interested ? true : deleteField() });
      if (interested) target.player.interested = true;
      else delete target.player.interested;
      return true;
    });
    return this.savedPlayer(saved, playerId);
  }

  async confirmInterestedPlayers(gameId: string): Promise<void> {
    await this.withQueue(gameId, (transaction, game, entries) => {
      const players = entries.map(entry => entry.player);
      const selected = interestedPlayersToConfirm(game, players, Date.now());
      const candidates = selected.map(player => {
        const entry = entries.find(item => item.player === player);
        if (!entry) throw new Error('Jogador não encontrado na fila.');
        return entry;
      });
      if (!candidates.length) return false;

      const now = new Date().toISOString();
      const logs = collection(this.firestore, 'games', gameId, 'checkins');
      for (const { ref, player } of candidates) {
        const log: CheckinLog = {
          type: 'status_change',
          origin: 'automatic',
          playerId: player.id,
          playerName: player.name,
          previousStatus: 'pending',
          newStatus: 'confirmed',
          timestamp: now,
          ip: null,
          userAgent: '',
          screenResolution: '',
          language: '',
        };
        transaction.update(ref, { status: 'confirmed', lastChange: now, interested: deleteField() });
        player.status = 'confirmed';
        player.lastChange = now;
        delete player.interested;
        transaction.set(doc(logs), log);
      }
      return true;
    });
  }

  private async seedPlayers(gameId: string, turma?: TurmaId): Promise<void> {
    const players = turma ? TURMAS[turma].defaultPlayers : DEFAULT_PLAYERS;
    const batch = writeBatch(this.firestore);
    for (const player of players) {
      const playerDoc = doc(
        this.firestore, 'games', gameId, 'players', String(player.id)
      );
      const data: PlayerDoc = { ...player, lastChange: null };
      batch.set(playerDoc, data);
    }
    batch.update(doc(this.firestore, 'games', gameId), { queueRevision: increment(1) });
    await batch.commit();
  }

  async addGuestPlayer(gameId: string, name: string): Promise<void> {
    const trimmed = name.trim();
    const displayName = `${trimmed} (convidado)`;
    await this.withQueue(gameId, (transaction, _game, entries) => {
      const newId = entries.reduce((max, entry) => Math.max(max, entry.player.id), 0) + 1;
      const data: PlayerDoc = {
        id: newId,
        name: displayName,
        initial: trimmed.charAt(0).toUpperCase(),
        status: 'pending',
        lastChange: null,
        guest: true,
      };
      const ref = doc(this.firestore, 'games', gameId, 'players', String(newId));
      transaction.set(ref, data);
      entries.push({ ref, player: data });
      return true;
    });
  }

  async removeGuestPlayer(gameId: string, playerId: number): Promise<void> {
    await this.withQueue(gameId, (transaction, _game, entries) => {
      const index = entries.findIndex(entry => entry.player.id === playerId);
      if (index < 0 || !entries[index].player.guest) {
        throw new Error('Convidado não encontrado.');
      }
      transaction.delete(entries[index].ref);
      entries.splice(index, 1);
      return true;
    });
  }

  async addEventLog(gameId: string, type: LogType, detail: string): Promise<void> {
    const checkinsCol = collection(this.firestore, 'games', gameId, 'checkins');
    const log: CheckinLog = {
      type,
      playerId: 0,
      playerName: 'Sistema',
      previousStatus: 'pending',
      newStatus: 'pending',
      timestamp: new Date().toISOString(),
      ip: null,
      userAgent: '',
      screenResolution: '',
      language: '',
      detail,
    };
    await addDoc(checkinsCol, log);
  }

  checkins$(gameId: string): Observable<CheckinLog[]> {
    const checkinsCol = collection(this.firestore, 'games', gameId, 'checkins');
    const q = query(checkinsCol, orderBy('timestamp', 'desc'));
    return collectionData(q) as Observable<CheckinLog[]>;
  }
}
