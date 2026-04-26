import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  collection,
  collectionData,
  writeBatch,
  updateDoc,
  addDoc,
  orderBy,
  query,
} from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';
import {
  Game,
  Player,
  PlayerDoc,
  PlayerStatus,
  CheckinLog,
  DEFAULT_PLAYERS,
} from '../../models/game.model';
import { DeviceInfoService } from './device-info.service';

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly firestore = inject(Firestore);
  private readonly deviceInfo: DeviceInfoService = inject(DeviceInfoService);
  private seeding = false;

  games$(): Observable<Game[]> {
    const gamesCol = collection(this.firestore, 'games');
    const q = query(gamesCol, orderBy('createdAt', 'desc'));
    return collectionData(q) as Observable<Game[]>;
  }

  async getGame(gameId: string): Promise<Game | null> {
    const gameDoc = doc(this.firestore, 'games', gameId);
    const snap = await getDoc(gameDoc);
    return snap.exists() ? (snap.data() as Game) : null;
  }

  async createGame(data: Omit<Game, 'uid' | 'createdAt'>): Promise<Game> {
    const game: Game = {
      ...data,
      uid: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const gameDoc = doc(this.firestore, 'games', game.uid);
    await setDoc(gameDoc, game);
    await this.seedPlayers(game.uid);
    return game;
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
    newStatus: PlayerStatus
  ): Promise<void> {
    const now = new Date().toISOString();

    const playerDoc = doc(
      this.firestore, 'games', gameId, 'players', String(player.id)
    );
    await updateDoc(playerDoc, {
      status: newStatus,
      lastChange: newStatus === 'pending' ? null : now,
    });

    const checkinLog: CheckinLog = {
      playerId: player.id,
      playerName: player.name,
      previousStatus: player.status,
      newStatus,
      timestamp: now,
      ip: await this.deviceInfo.getIp(),
      userAgent: this.deviceInfo.getUserAgent(),
      screenResolution: this.deviceInfo.getScreenResolution(),
      language: this.deviceInfo.getLanguage(),
    };

    const checkinsCol = collection(
      this.firestore, 'games', gameId, 'checkins'
    );
    await addDoc(checkinsCol, checkinLog);
  }

  private async seedPlayers(gameId: string): Promise<void> {
    const batch = writeBatch(this.firestore);
    for (const player of DEFAULT_PLAYERS) {
      const playerDoc = doc(
        this.firestore, 'games', gameId, 'players', String(player.id)
      );
      const data: PlayerDoc = { ...player, lastChange: null };
      batch.set(playerDoc, data);
    }
    await batch.commit();
  }
}
