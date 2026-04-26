import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'jogos',
    pathMatch: 'full',
  },
  {
    path: 'jogos',
    loadComponent: () =>
      import('./features/game-list/game-list.component').then(
        (m) => m.GameListComponent
      ),
  },
  {
    path: 'jogo/new',
    loadComponent: () =>
      import('./features/create-game/create-game.component').then(
        (m) => m.CreateGameComponent
      ),
  },
  {
    path: 'jogo/:gameId',
    loadComponent: () =>
      import('./features/players/player-list.component').then(
        (m) => m.PlayerListComponent
      ),
  },
];
