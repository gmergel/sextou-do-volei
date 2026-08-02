import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  query,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  DocumentSnapshot,
} from '@angular/fire/firestore';
import { Observable, from, of, switchMap } from 'rxjs';
import { RosterPlayer, RosterVersion, RosterDeviceInfo, RosterHistoryPage } from '../../models/roster.model';
import { TurmaId, TURMAS } from '../../models/turma.model';
import { DeviceInfoService } from '../players/device-info.service';

@Injectable({ providedIn: 'root' })
export class RosterService {
  private readonly firestore = inject(Firestore);
  private readonly deviceInfoService = inject(DeviceInfoService);

  getCurrentRoster(turmaId: TurmaId): Observable<RosterVersion | null> {
    return from(this.loadCurrentRoster(turmaId));
  }

  private async loadCurrentRoster(turmaId: TurmaId): Promise<RosterVersion | null> {
    const turmaDoc = doc(this.firestore, 'turmas', turmaId);
    const turmaSnap = await getDoc(turmaDoc);

    if (turmaSnap.exists()) {
      const data = turmaSnap.data() as { currentRosterVersion?: string };
      if (data.currentRosterVersion) {
        const versionDoc = doc(this.firestore, 'turmas', turmaId, 'roster-versions', data.currentRosterVersion);
        const versionSnap = await getDoc(versionDoc);
        if (versionSnap.exists()) {
          return { id: versionSnap.id, ...versionSnap.data() } as RosterVersion;
        }
      }
    }

    // No version exists — seed
    const versionId = await this.seedRoster(turmaId);
    const seededDoc = doc(this.firestore, 'turmas', turmaId, 'roster-versions', versionId);
    const seededSnap = await getDoc(seededDoc);
    return { id: seededSnap.id, ...seededSnap.data() } as RosterVersion;
  }

  async saveRosterVersion(turmaId: TurmaId, players: RosterPlayer[], deviceInfo: RosterDeviceInfo): Promise<string> {
    const batch = writeBatch(this.firestore);

    const versionsCol = collection(this.firestore, 'turmas', turmaId, 'roster-versions');
    const newVersionDoc = doc(versionsCol);

    batch.set(newVersionDoc, {
      createdAt: serverTimestamp(),
      deviceInfo,
      players,
    });

    const turmaDoc = doc(this.firestore, 'turmas', turmaId);
    batch.set(turmaDoc, { currentRosterVersion: newVersionDoc.id }, { merge: true });

    await batch.commit();
    return newVersionDoc.id;
  }

  async getRosterHistory(turmaId: TurmaId, pageSize = 20, startAfterDoc?: DocumentSnapshot): Promise<RosterHistoryPage> {
    const versionsCol = collection(this.firestore, 'turmas', turmaId, 'roster-versions');

    let q = startAfterDoc
      ? query(versionsCol, orderBy('createdAt', 'desc'), startAfter(startAfterDoc), limit(pageSize + 1))
      : query(versionsCol, orderBy('createdAt', 'desc'), limit(pageSize + 1));

    const snap = await getDocs(q);
    const hasMore = snap.docs.length > pageSize;
    const docs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;

    const versions: RosterVersion[] = docs.map(d => ({ id: d.id, ...d.data() } as RosterVersion));
    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

    return { versions, hasMore, lastDoc };
  }

  async seedRoster(turmaId: TurmaId): Promise<string> {
    const versionsCol = collection(this.firestore, 'turmas', turmaId, 'roster-versions');
    const existing = await getDocs(query(versionsCol, limit(1)));

    if (!existing.empty) {
      // Already seeded — return current version
      const turmaDoc = doc(this.firestore, 'turmas', turmaId);
      const turmaSnap = await getDoc(turmaDoc);
      if (turmaSnap.exists()) {
        const data = turmaSnap.data() as { currentRosterVersion?: string };
        if (data.currentRosterVersion) return data.currentRosterVersion;
      }
      return existing.docs[0].id;
    }

    // Map hardcoded players to RosterPlayer[]
    const turmaConfig = TURMAS[turmaId];
    const players: RosterPlayer[] = turmaConfig.defaultPlayers.map(p => ({
      id: String(p.id),
      name: p.name,
      initial: p.name.charAt(0).toUpperCase(),
      active: true,
    }));

    const deviceInfo: RosterDeviceInfo = { source: 'Sistema' };

    const batch = writeBatch(this.firestore);
    const newVersionDoc = doc(versionsCol);

    batch.set(newVersionDoc, {
      createdAt: serverTimestamp(),
      deviceInfo,
      players,
      note: 'Versão inicial (migração automática)',
    });

    const turmaDoc = doc(this.firestore, 'turmas', turmaId);
    batch.set(turmaDoc, { currentRosterVersion: newVersionDoc.id }, { merge: true });

    await batch.commit();
    return newVersionDoc.id;
  }

  async collectDeviceInfo(): Promise<RosterDeviceInfo> {
    const [ip, deviceModel] = await Promise.all([
      this.deviceInfoService.getIp(),
      this.deviceInfoService.getDeviceModel(),
    ]);

    return {
      userAgent: this.deviceInfoService.getUserAgent(),
      screenResolution: this.deviceInfoService.getScreenResolution(),
      language: this.deviceInfoService.getLanguage(),
      deviceModel,
      ip,
    };
  }
}
