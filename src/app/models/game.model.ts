export type PlayerStatus = 'pending' | 'confirmed' | 'declined';

export interface Game {
  uid: string;
  date: string;
  time: string;
  location: string;
  totalPlayers: number;
  createdAt: string;
}

export interface Player {
  id: number;
  name: string;
  initial: string;
  status: PlayerStatus;
  lastChange: Date | null;
  guest?: boolean;
  effectiveId?: number;
}

export interface PlayerDoc {
  id: number;
  name: string;
  initial: string;
  status: PlayerStatus;
  lastChange: string | null;
  guest?: boolean;
  effectiveId?: number;
}

export interface CheckinLog {
  playerId: number;
  playerName: string;
  previousStatus: PlayerStatus;
  newStatus: PlayerStatus;
  timestamp: string;
  ip: string | null;
  userAgent: string;
  screenResolution: string;
  language: string;
}

export const DEFAULT_PLAYERS: Player[] = [
  { id: 1, name: 'Wagner', initial: 'W', status: 'pending', lastChange: null },
  { id: 2, name: 'Michele', initial: 'M', status: 'pending', lastChange: null },
  { id: 3, name: 'Dani', initial: 'D', status: 'pending', lastChange: null },
  { id: 4, name: 'Ger', initial: 'G', status: 'pending', lastChange: null },
  { id: 5, name: 'Carlos', initial: 'C', status: 'pending', lastChange: null },
  { id: 6, name: 'Raquel', initial: 'R', status: 'pending', lastChange: null },
  { id: 7, name: 'Daniel', initial: 'D', status: 'pending', lastChange: null },
  { id: 8, name: 'Neide', initial: 'N', status: 'pending', lastChange: null },
  { id: 9, name: 'Leandro', initial: 'L', status: 'pending', lastChange: null },
  { id: 10, name: 'Dias', initial: 'D', status: 'pending', lastChange: null },
  { id: 11, name: 'Thiago', initial: 'T', status: 'pending', lastChange: null },
  { id: 12, name: 'Fran', initial: 'F', status: 'pending', lastChange: null },
  { id: 13, name: 'Gilson', initial: 'G', status: 'pending', lastChange: null },
  { id: 14, name: 'Arthur', initial: 'A', status: 'pending', lastChange: null },
  { id: 15, name: 'Fernanda', initial: 'F', status: 'pending', lastChange: null },
  { id: 16, name: 'Adri', initial: 'A', status: 'pending', lastChange: null },
  { id: 17, name: 'Michelle', initial: 'M', status: 'pending', lastChange: null },
  { id: 18, name: 'Rosa', initial: 'R', status: 'pending', lastChange: null },
  { id: 19, name: 'Rosani', initial: 'R', status: 'pending', lastChange: null },
  { id: 20, name: 'Cleber', initial: 'C', status: 'pending', lastChange: null },
  { id: 21, name: 'Felipe', initial: 'F', status: 'pending', lastChange: null },
  { id: 22, name: 'Vanessa', initial: 'V', status: 'pending', lastChange: null },
  { id: 23, name: 'Alcides', initial: 'A', status: 'pending', lastChange: null },
];
