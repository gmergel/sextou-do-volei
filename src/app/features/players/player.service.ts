import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  getDocs,
} from '@angular/fire/firestore';
import { Observable, of, switchMap, take } from 'rxjs';

export type PlayerStatus = 'pending' | 'confirmed' | 'declined';

export interface Player {
  id: number;
  name: string;
  initial: string;
  status: PlayerStatus;
  lastChange: Date | null;
}

interface PlayerDoc {
  id: number;
  name: string;
  initial: string;
  status: PlayerStatus;
  lastChange: string | null;
}

const COLLECTION = 'players';

const DEFAULT_PLAYERS: Player[] = [
  { id: 1, name: 'Alice', initial: 'A', status: 'pending', lastChange: null },
  { id: 2, name: 'Bruno', initial: 'B', status: 'pending', lastChange: null },
  { id: 3, name: 'Carlos', initial: 'C', status: 'pending', lastChange: null },
  { id: 4, name: 'Diana', initial: 'D', status: 'pending', lastChange: null },
  { id: 5, name: 'Eduardo', initial: 'E', status: 'pending', lastChange: null },
  { id: 6, name: 'Fernanda', initial: 'F', status: 'pending', lastChange: null },
  { id: 7, name: 'Gabriel', initial: 'G', status: 'pending', lastChange: null },
  { id: 8, name: 'Helena', initial: 'H', status: 'pending', lastChange: null },
  { id: 9, name: 'Igor', initial: 'I', status: 'pending', lastChange: null },
  { id: 10, name: 'Juliana', initial: 'J', status: 'pending', lastChange: null },
  { id: 11, name: 'Kaio', initial: 'K', status: 'pending', lastChange: null },
  { id: 12, name: 'Larissa', initial: 'L', status: 'pending', lastChange: null },
  { id: 13, name: 'Marcos', initial: 'M', status: 'pending', lastChange: null },
  { id: 14, name: 'Nat\u00e1lia', initial: 'N', status: 'pending', lastChange: null },
  { id: 15, name: 'Ot\u00e1vio', initial: 'O', status: 'pending', lastChange: null },
  { id: 16, name: 'Paola', initial: 'P', status: 'pending', lastChange: null },
  { id: 17, name: 'Quirino', initial: 'Q', status: 'pending', lastChange: null },
  { id: 18, name: 'Renata', initial: 'R', status: 'pending', lastChange: null },
  { id: 19, name: 'Samuel', initial: 'S', status: 'pending', lastChange: null },
  { id: 20, name: 'Tatiana', initial: 'T', status: 'pending', lastChange: null },
  { id: 21, name: 'Ulisses', initial: 'U', status: 'pending', lastChange: null },
  { id: 22, name: 'Val\u00e9ria', initial: 'V', status: 'pending', lastChange: null },
  { id: 23, name: 'Wagner', initial: 'W', status: 'pending', lastChange: null },
  { id: 24, name: 'Ximena', initial: 'X', status: 'pending', lastChange: null },
  { id: 25, name: 'Yasmin', initial: 'Y', status: 'pending', lastChange: null },
  { id: 26, name: 'Z\u00e9lia', initial: 'Z', status: 'pending', lastChange: null },
  { id: 27, name: 'Andr\u00e9', initial: 'A', status: 'pending', lastChange: null },
  { id: 28, name: 'Bianca', initial: 'B', status: 'pending', lastChange: null },
];

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly firestore = inject(Firestore);
  private readonly playersCollection = collection(this.firestore, COLLECTION);
  private seeding = false;

  players$(): Observable<Player[]> {
    return (collectionData(this.playersCollection) as Observable<PlayerDoc[]>).pipe(
      switchMap((docs) => {
        if (docs.length === 0 && !this.seeding) {
          this.seeding = true;
          this.seedPlayers().then(() => (this.seeding = false));
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

  async updateStatus(playerId: number, status: PlayerStatus): Promise<void> {
    const playerDoc = doc(this.firestore, COLLECTION, String(playerId));
    await updateDoc(playerDoc, {
      status,
      lastChange: status === 'pending' ? null : new Date().toISOString(),
    });
  }

  private async seedPlayers(): Promise<void> {
    const batch = writeBatch(this.firestore);
    for (const player of DEFAULT_PLAYERS) {
      const playerDoc = doc(this.firestore, COLLECTION, String(player.id));
      const data: PlayerDoc = {
        ...player,
        lastChange: null,
      };
      batch.set(playerDoc, data);
    }
    await batch.commit();
  }
}
