import { Player } from './game.model';

export type TurmaId = 'sextou' | 'domingou';

export interface TimePreset {
  label: string;
  value: string;
}

export interface TurmaConfig {
  id: TurmaId;
  label: string;
  shortLabel: string;
  dayOfWeek: number;
  colorClass: string;
  emoji: string;
  timePresets: TimePreset[];
  defaultPlayers: Player[];
}

export const TURMAS: Record<TurmaId, TurmaConfig> = {
  sextou: {
    id: 'sextou',
    label: '#Sextou do Vôlei',
    shortLabel: 'Sextou',
    dayOfWeek: 5, // sexta
    colorClass: 'turma-sextou',
    emoji: '\u{1F37A}',
    timePresets: [
      { label: '19h–21h', value: '19h–21h' },
      { label: '20h–22h', value: '20h–22h' },
    ],
    defaultPlayers: [], // será preenchido abaixo
  },
  domingou: {
    id: 'domingou',
    label: '#Domingou do Vôlei',
    shortLabel: 'Domingou',
    dayOfWeek: 0, // domingo
    colorClass: 'turma-domingou',
    emoji: '☀️',
    timePresets: [
      { label: '10h–12h', value: '10h–12h' },
      { label: '15h–17h', value: '15h–17h' },
      { label: '16h–18h', value: '16h–18h' },
    ],
    defaultPlayers: [], // será preenchido abaixo
  },
};

// Por enquanto, ambas as turmas compartilham a mesma lista de jogadores.
// Futuramente cada turma terá sua própria lista.
import { DEFAULT_PLAYERS } from './game.model';

TURMAS.sextou.defaultPlayers = DEFAULT_PLAYERS;
TURMAS.domingou.defaultPlayers = DEFAULT_PLAYERS;
