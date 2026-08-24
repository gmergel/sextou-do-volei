import { TurmaId } from './turma.model';

export type PlayerStatus = 'pending' | 'confirmed' | 'declined';

export interface Game {
  uid: string;
  turma: TurmaId;
  date: string;
  time: string;
  location: string;
  locationAddress?: string;
  totalPlayers: number;
  createdAt: string;
  rosterVersionId?: string;
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

export type LogType = 'status_change' | 'slot_opened' | 'game_full' | 'game_reopened';

export interface CheckinLog {
  type?: LogType;
  playerId: number;
  playerName: string;
  previousStatus: PlayerStatus;
  newStatus: PlayerStatus;
  timestamp: string;
  ip: string | null;
  userAgent: string;
  deviceModel?: string;
  screenResolution: string;
  language: string;
  detail?: string;
}

export const DEFAULT_PLAYERS: Player[] = [
  { id: 1, name: 'Dani Griza', initial: 'D', status: 'pending', lastChange: null },
  { id: 2, name: 'Ger', initial: 'G', status: 'pending', lastChange: null },
  { id: 3, name: 'Carlos Serafim', initial: 'C', status: 'pending', lastChange: null },
  { id: 4, name: 'Raquel', initial: 'R', status: 'pending', lastChange: null },
  { id: 5, name: 'Daniel', initial: 'D', status: 'pending', lastChange: null },
  { id: 6, name: 'Neide', initial: 'N', status: 'pending', lastChange: null },
  { id: 7, name: 'Leandro', initial: 'L', status: 'pending', lastChange: null },
  { id: 8, name: 'Dias', initial: 'D', status: 'pending', lastChange: null },
  { id: 9, name: 'Thiago', initial: 'T', status: 'pending', lastChange: null },
  { id: 10, name: 'Fran', initial: 'F', status: 'pending', lastChange: null },
  { id: 11, name: 'Gilson', initial: 'G', status: 'pending', lastChange: null },
  { id: 12, name: 'Arthur', initial: 'A', status: 'pending', lastChange: null },
  { id: 13, name: 'Fernanda', initial: 'F', status: 'pending', lastChange: null },
  { id: 14, name: 'Carlos Alon\u00e7o', initial: 'C', status: 'pending', lastChange: null },
  { id: 15, name: 'Vanessa Costa', initial: 'V', status: 'pending', lastChange: null },
  { id: 16, name: 'Felipe', initial: 'F', status: 'pending', lastChange: null },
  { id: 17, name: 'Vanessa', initial: 'V', status: 'pending', lastChange: null },
  { id: 18, name: 'Alcides', initial: 'A', status: 'pending', lastChange: null },
  { id: 19, name: 'Adri', initial: 'A', status: 'pending', lastChange: null },
  { id: 20, name: 'Michelle', initial: 'M', status: 'pending', lastChange: null },
  { id: 21, name: 'Rosa', initial: 'R', status: 'pending', lastChange: null },
  { id: 22, name: 'Rosani', initial: 'R', status: 'pending', lastChange: null },
  { id: 23, name: 'Cleber', initial: 'C', status: 'pending', lastChange: null },
];

export const DOMINGOU_PLAYERS: Player[] = [
  { id: 1, name: 'Fran', initial: 'F', status: 'pending', lastChange: null },
  { id: 2, name: 'Thiago', initial: 'T', status: 'pending', lastChange: null },
  { id: 3, name: 'Fernanda', initial: 'F', status: 'pending', lastChange: null },
  { id: 4, name: 'Adri', initial: 'A', status: 'pending', lastChange: null },
  { id: 5, name: 'Gilson', initial: 'G', status: 'pending', lastChange: null },
  { id: 6, name: 'Adel', initial: 'A', status: 'pending', lastChange: null },
  { id: 7, name: 'Carlos da Adri', initial: 'C', status: 'pending', lastChange: null },
  { id: 8, name: 'Neide', initial: 'N', status: 'pending', lastChange: null },
  { id: 9, name: 'Leandro', initial: 'L', status: 'pending', lastChange: null },
  { id: 10, name: 'Dani Griza', initial: 'D', status: 'pending', lastChange: null },
  { id: 11, name: 'Ger', initial: 'G', status: 'pending', lastChange: null },
  { id: 12, name: 'Dias', initial: 'D', status: 'pending', lastChange: null },
  { id: 13, name: 'Raquel', initial: 'R', status: 'pending', lastChange: null },
  { id: 14, name: 'Arthur', initial: 'A', status: 'pending', lastChange: null },
  { id: 15, name: 'Vanessa do Carlos', initial: 'V', status: 'pending', lastChange: null },
  { id: 16, name: 'Carlos da Vanessa', initial: 'C', status: 'pending', lastChange: null },
  { id: 17, name: 'Luana', initial: 'L', status: 'pending', lastChange: null },
  { id: 18, name: 'Vanessa do Felipe', initial: 'V', status: 'pending', lastChange: null },
  { id: 19, name: 'Felipe', initial: 'F', status: 'pending', lastChange: null },
  { id: 20, name: 'Rafa', initial: 'R', status: 'pending', lastChange: null },
  { id: 21, name: 'Nathi', initial: 'N', status: 'pending', lastChange: null },
  { id: 22, name: 'Rosani', initial: 'R', status: 'pending', lastChange: null },
  { id: 23, name: 'Cleber', initial: 'C', status: 'pending', lastChange: null },
  { id: 24, name: 'Michelle', initial: 'M', status: 'pending', lastChange: null },
];
