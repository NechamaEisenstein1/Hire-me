import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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
    <!-- ── Sticky portfolio header (outside sidenav-container so window-level sticky works) ── -->
    <header class="fixed inset-x-0 top-0 z-50 border-b border-brand-200/60 bg-white/90 backdrop-blur-md dark:border-brand-800/60 dark:bg-brand-900/85">
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
              class="relative rounded-lg px-3 py-1.5 text-sm no-underline transition-all duration-200"
              [class.font-semibold]="isHomeRoute() && shellStore.activeSection() === link.fragment"
              [class.text-brand-600]="isHomeRoute() && shellStore.activeSection() === link.fragment"
              [class.dark:text-brand-400]="isHomeRoute() && shellStore.activeSection() === link.fragment"
              [class.opacity-100]="isHomeRoute() && shellStore.activeSection() === link.fragment"
              [class.font-medium]="!isHomeRoute() || shellStore.activeSection() !== link.fragment"
              [class.opacity-50]="!isHomeRoute() || shellStore.activeSection() !== link.fragment"
              [class.hover:opacity-100]="!isHomeRoute() || shellStore.activeSection() !== link.fragment"
            >
              {{ link.label }}
              @if (isHomeRoute() && shellStore.activeSection() === link.fragment) {
                <span class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-brand-500" aria-hidden="true"></span>
              }
            </a>
          }
        </nav>

        <span class="flex-1" aria-hidden="true"></span>

        <!-- Feature CTAs (desktop) -->
        <a
          routerLink="/resume-3d"
          mat-stroked-button
          class="hidden text-sm md:inline-flex"
        >
          3D Resume
        </a>
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

    <mat-sidenav-container class="min-h-screen bg-transparent pt-16 md:pt-[72px]">

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
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);

  constructor() {
    this.analytics.trackVisit().catch(() => {
      // Ignore analytics failures in UI bootstrap.
    });
  }

  protected isHomeRoute(): boolean {
    return this.router.url === '/' || this.router.url.startsWith('/#') || this.router.url.startsWith('/?');
  }
}
