import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AnalyticsService } from './core/services/analytics.service';
import { AppShellStore } from './core/stores/app-shell.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule
  ],
  template: `
    <mat-sidenav-container class="min-h-screen bg-transparent">
      <mat-sidenav
        mode="over"
        [opened]="shellStore.sidenavOpened()"
        (closedStart)="shellStore.closeSidenav()"
        class="w-72 border-r border-brand-200/70 bg-white dark:border-brand-700/60 dark:bg-brand-900"
      >
        <div class="px-5 py-4 text-lg font-semibold tracking-tight">Hire Me</div>
        <mat-nav-list>
          @for (link of shellStore.navLinks; track link.path) {
            <a
              mat-list-item
              [routerLink]="link.path"
              routerLinkActive="mdc-list-item--activated"
              [routerLinkActiveOptions]="{ exact: link.path === '/' }"
              (click)="shellStore.closeSidenav()"
            >
              {{ link.label }}
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="sticky top-0 z-20 flex items-center gap-3 border-b border-brand-200/70 bg-white/80 backdrop-blur-sm dark:border-brand-700/60 dark:bg-brand-900/60">
          <button mat-icon-button (click)="shellStore.openSidenav()" aria-label="Open navigation">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="font-semibold tracking-tight">Hire Me Fullstack</span>
          <span class="ml-auto text-xs opacity-80">{{ shellStore.isOnline() ? 'Online' : 'Offline' }}</span>
          <button mat-stroked-button (click)="shellStore.toggleTheme()">
            {{ shellStore.themeLabel() }} mode
          </button>
        </mat-toolbar>

        <main class="mx-auto w-full max-w-6xl p-4 md:p-8">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `
})
export class AppComponent {
  protected readonly shellStore = inject(AppShellStore);
  private readonly analytics = inject(AnalyticsService);

  constructor() {
    this.analytics.trackVisit().catch(() => {
      // Ignore analytics failures in UI bootstrap.
    });
  }
}
