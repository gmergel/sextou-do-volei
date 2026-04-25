import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/players/player-list.component').then(
        (m) => m.PlayerListComponent
      ),
  },
];
