import { Component, signal } from '@angular/core';

export interface Player {
  id: number;
  name: string;
  initial: string;
  confirmed: boolean;
}

@Component({
  selector: 'app-player-list',
  standalone: true,
  templateUrl: './player-list.component.html',
  styleUrl: './player-list.component.scss',
})
export class PlayerListComponent {
  readonly players = signal<Player[]>([
    { id: 1, name: 'Alice', initial: 'A', confirmed: false },
    { id: 2, name: 'Bruno', initial: 'B', confirmed: false },
    { id: 3, name: 'Carlos', initial: 'C', confirmed: false },
    { id: 4, name: 'Diana', initial: 'D', confirmed: false },
    { id: 5, name: 'Eduardo', initial: 'E', confirmed: false },
    { id: 6, name: 'Fernanda', initial: 'F', confirmed: false },
    { id: 7, name: 'Gabriel', initial: 'G', confirmed: false },
    { id: 8, name: 'Helena', initial: 'H', confirmed: false },
  ]);

  readonly confirmedCount = () =>
    this.players().filter((p) => p.confirmed).length;

  togglePlayer(playerId: number): void {
    this.players.update((players) =>
      players.map((p) =>
        p.id === playerId ? { ...p, confirmed: !p.confirmed } : p
      )
    );
  }
}
