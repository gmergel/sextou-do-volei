export interface RosterPlayer {
  id: string;
  name: string;
  initial: string;
  active: boolean;
}

export interface RosterDeviceInfo {
  userAgent?: string;
  deviceModel?: string;
  screenResolution?: string;
  language?: string;
  ip?: string | null;
  source?: string;
}

export interface RosterVersion {
  id: string;
  createdAt: any; // Firestore Timestamp
  deviceInfo: RosterDeviceInfo;
  players: RosterPlayer[];
  note?: string;
}

export interface RosterHistoryPage {
  versions: RosterVersion[];
  hasMore: boolean;
  lastDoc: any | null;
}
