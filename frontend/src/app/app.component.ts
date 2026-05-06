import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';

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
    MatDividerModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
  ],
  template: `
    <mat-sidenav-container class="min-h-screen bg-transparent">

      <!-- ── Mobile sidenav ── -->
      <mat-sidenav
        mode="over"
        [opened]="shellStore.sidenavOpened()"
        (closedStart)="shellStore.closeSidenav()"
        class="w-72 bg-white dark:bg-brand-900"
      >
        <div class="px-5 py-5">
          <a
            routerLink="/"
            (click)="shellStore.closeSidenav()"
            class="block text-lg font-bold tracking-tight no-underline"
          >
            {{ shellStore.candidateName() }}
          </a>
        </div>

        <mat-nav-list>
          @for (link of shellStore.sectionLinks; track link.fragment) {
            <a
              mat-list-item
              routerLink="/"
              [fragment]="link.fragment"
              (click)="shellStore.closeSidenav()"
            >
              {{ link.label }}
            </a>
          }
        </mat-nav-list>

        <mat-divider class="my-2" />

        <p class="px-5 py-2 text-xs font-semibold uppercase tracking-widest opacity-50">Advanced</p>
        <mat-nav-list>
          @for (link of shellStore.featureLinks; track link.path) {
            <a
              mat-list-item
              [routerLink]="link.path"
              routerLinkActive="mdc-list-item--activated"
              (click)="shellStore.closeSidenav()"
            >
              {{ link.label }}
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>

        <!-- ── Sticky portfolio header ── -->
        <header class="sticky top-0 z-20 border-b border-brand-200/60 bg-white/90 backdrop-blur-md dark:border-brand-800/60 dark:bg-brand-900/85">
          <div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:px-8">

            <!-- Hamburger (mobile only) -->
            <button
              mat-icon-button
              class="md:hidden"
              (click)="shellStore.openSidenav()"
              aria-label="Open navigation menu"
            >
              <mat-icon>menu</mat-icon>
            </button>

            <!-- Candidate name / home link -->
            <a
              routerLink="/"
              class="mr-4 shrink-0 text-base font-bold tracking-tight no-underline md:mr-6 md:text-lg"
            >
              {{ shellStore.candidateName() }}
            </a>

            <!-- Section anchor links (desktop only) -->
            <nav class="hidden items-center gap-0.5 md:flex" aria-label="Portfolio sections">
              @for (link of shellStore.sectionLinks; track link.fragment) {
                <a
                  routerLink="/"
                  [fragment]="link.fragment"
                  class="rounded-lg px-3 py-1.5 text-sm font-medium opacity-60 transition-opacity duration-150 no-underline hover:opacity-100 dark:opacity-50 dark:hover:opacity-90"
                >
                  {{ link.label }}
                </a>
              }
            </nav>

            <span class="flex-1" aria-hidden="true"></span>

            <!-- Interview Me CTA (desktop) -->
            <a
              routerLink="/interview-me"
              mat-stroked-button
              class="hidden text-sm md:inline-flex"
            >
              Interview Me
            </a>

            <!-- Theme toggle -->
            <button
              mat-icon-button
              (click)="shellStore.toggleTheme()"
              [attr.aria-label]="shellStore.themeLabel() + ' mode'"
            >
              <mat-icon>{{ shellStore.darkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
            </button>

          </div>
        </header>

        <!-- Page content — each page component manages its own layout -->
        <main>
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
