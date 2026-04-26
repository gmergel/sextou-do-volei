import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Game } from '../../models/game.model';
import { GameService } from '../players/game.service';

@Component({
  selector: 'app-game-list',
  standalone: true,
  templateUrl: './game-list.component.html',
  styleUrl: './game-list.component.scss',
})
export class GameListComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly gameService = inject(GameService);
  private sub?: Subscription;

  readonly games = signal<Game[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.sub = this.gameService.games$().subscribe((games) => {
      this.games.set(games);
      this.loading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  openGame(uid: string): void {
    this.router.navigate(['/jogo', uid]);
  }

  createGame(): void {
    this.router.navigate(['/jogo/new']);
  }

  formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  }
}
