import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  collectionData,
  writeBatch,
  updateDoc,
  addDoc,
  deleteDoc,
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
  LogType,
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
    newStatus: PlayerStatus,
    effectiveId?: number,
  ): Promise<void> {
    const now = new Date().toISOString();

    const playerDoc = doc(
      this.firestore, 'games', gameId, 'players', String(player.id)
    );
    const update: Record<string, string | number | null> = {
      status: newStatus,
      lastChange: newStatus === 'pending' ? null : now,
    };
    if (effectiveId !== undefined) {
      update['effectiveId'] = effectiveId;
    }
    await updateDoc(playerDoc, update);

    const checkinLog: CheckinLog = {
      type: 'status_change',
      playerId: player.id,
      playerName: player.name,
      previousStatus: player.status,
      newStatus,
      timestamp: now,
      ip: await this.deviceInfo.getIp(),
      userAgent: this.deviceInfo.getUserAgent(),
      deviceModel: await this.deviceInfo.getDeviceModel(),
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

  async addGuestPlayer(gameId: string, name: string): Promise<void> {
    const playersCol = collection(this.firestore, 'games', gameId, 'players');
    const snap = await getDocs(playersCol);
    const maxId = snap.docs.reduce((max, d) => {
      const id = (d.data() as PlayerDoc).id;
      return id > max ? id : max;
    }, 0);
    const newId = Math.max(100, maxId + 1);
    const trimmed = name.trim();
    const data: PlayerDoc = {
      id: newId,
      name: trimmed,
      initial: trimmed.charAt(0).toUpperCase(),
      status: 'pending',
      lastChange: null,
      guest: true,
    };
    const playerDoc = doc(this.firestore, 'games', gameId, 'players', String(newId));
    await setDoc(playerDoc, data);
  }

  async removeGuestPlayer(gameId: string, playerId: number): Promise<void> {
    const playerDoc = doc(this.firestore, 'games', gameId, 'players', String(playerId));
    await deleteDoc(playerDoc);
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
