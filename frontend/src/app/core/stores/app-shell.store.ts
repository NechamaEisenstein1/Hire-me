import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

type NavLink = {
  readonly path: string;
  readonly label: string;
};

@Injectable({ providedIn: 'root' })
export class AppShellStore {
  private readonly document = inject(DOCUMENT);

  readonly navLinks: ReadonlyArray<NavLink> = [
    { path: '/', label: 'Home' },
    { path: '/resume-studio', label: 'Resume Studio' },
    { path: '/resume-3d', label: '3D Resume' },
    { path: '/interview-me', label: 'Interview Me' }
  ];

  readonly darkMode = signal(this.getInitialDarkMode());
  readonly sidenavOpened = signal(false);
  readonly isOnline = signal(globalThis.navigator?.onLine ?? true);
  readonly themeLabel = computed(() => (this.darkMode() ? 'Dark' : 'Light'));

  constructor() {
    this.applyThemeClass(this.darkMode());
    globalThis.addEventListener('online', () => this.isOnline.set(true));
    globalThis.addEventListener('offline', () => this.isOnline.set(false));
  }

  toggleTheme(): void {
    const nextMode = !this.darkMode();
    this.darkMode.set(nextMode);
    globalThis.localStorage.setItem('theme', nextMode ? 'dark' : 'light');
    this.applyThemeClass(nextMode);
  }

  openSidenav(): void {
    this.sidenavOpened.set(true);
  }

  closeSidenav(): void {
    this.sidenavOpened.set(false);
  }

  private applyThemeClass(isDarkMode: boolean): void {
    this.document.documentElement.classList.toggle('dark', isDarkMode);
  }

  private getInitialDarkMode(): boolean {
    const persisted = globalThis.localStorage.getItem('theme');
    if (persisted === 'dark') {
      return true;
    }
    if (persisted === 'light') {
      return false;
    }
    return globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}