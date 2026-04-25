import { Component, signal } from '@angular/core';

export type PlayerStatus = 'pending' | 'confirmed' | 'declined';

export interface Player {
  id: number;
  name: string;
  initial: string;
  status: PlayerStatus;
}

@Component({
  selector: 'app-player-list',
  standalone: true,
  templateUrl: './player-list.component.html',
  styleUrl: './player-list.component.scss',
})
export class PlayerListComponent {
  readonly players = signal<Player[]>([
    { id: 1, name: 'Alice', initial: 'A', status: 'pending' },
    { id: 2, name: 'Bruno', initial: 'B', status: 'pending' },
    { id: 3, name: 'Carlos', initial: 'C', status: 'pending' },
    { id: 4, name: 'Diana', initial: 'D', status: 'pending' },
    { id: 5, name: 'Eduardo', initial: 'E', status: 'pending' },
    { id: 6, name: 'Fernanda', initial: 'F', status: 'pending' },
    { id: 7, name: 'Gabriel', initial: 'G', status: 'pending' },
    { id: 8, name: 'Helena', initial: 'H', status: 'pending' },
  ]);

  readonly confirmedCount = () =>
    this.players().filter((p) => p.status === 'confirmed').length;

  readonly declinedCount = () =>
    this.players().filter((p) => p.status === 'declined').length;

  setStatus(playerId: number, status: PlayerStatus): void {
    this.players.update((players) =>
      players.map((p) =>
        // clicar no mesmo botão ativo volta para 'pending'
        p.id === playerId ? { ...p, status: p.status === status ? 'pending' : status } : p
      )
    );
  }
}
