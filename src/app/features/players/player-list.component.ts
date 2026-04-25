import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

export type PlayerStatus = 'pending' | 'confirmed' | 'declined';

export interface Player {
  id: number;
  name: string;
  initial: string;
  status: PlayerStatus;
  lastChange: Date | null;
}

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './player-list.component.html',
  styleUrl: './player-list.component.scss',
})
export class PlayerListComponent {
  readonly totalPlayers = 4;

  readonly players = signal<Player[]>([
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
    { id: 15, name: 'Otávio', initial: 'O', status: 'pending', lastChange: null },
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
  ]);

  readonly confirmedCount = computed(() =>
    this.players().filter((p) => p.status === 'confirmed').length);

  readonly declinedCount = computed(() =>
    this.players().filter((p) => p.status === 'declined').length);

  readonly isFull = computed(() => this.confirmedCount() >= this.totalPlayers);

  setStatus(playerId: number, status: PlayerStatus): void {
    if (status === 'confirmed' && this.isFull()) {
      const player = this.players().find((p) => p.id === playerId);
      if (player?.status !== 'confirmed') return;
    }
    this.players.update((players) =>
      players.map((p) => {
        if (p.id !== playerId) return p;
        const newStatus = p.status === status ? 'pending' : status;
        return {
          ...p,
          status: newStatus,
          lastChange: newStatus === 'pending' ? null : new Date(),
        };
      })
    );
  }

  readonly showModal = signal(false);

  scrollToPlayers(): void {
    document.getElementById('player-list')?.scrollIntoView({ behavior: 'smooth' });
  }

  showFullAlert(): void {
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }
}
