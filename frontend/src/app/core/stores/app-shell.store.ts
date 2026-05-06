import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type SectionLink = {
  readonly label: string;
  readonly fragment: string;
};

export type FeatureLink = {
  readonly path: string;
  readonly label: string;
};

@Injectable({ providedIn: 'root' })
export class AppShellStore {
  private readonly document = inject(DOCUMENT);

  /** In-page section anchors displayed as the primary nav. */
  readonly sectionLinks: ReadonlyArray<SectionLink> = [
    { label: 'About', fragment: 'about' },
    { label: 'Skills', fragment: 'skills' },
    { label: 'Projects', fragment: 'projects' },
    { label: 'Experience', fragment: 'experience' },
    { label: 'Resume', fragment: 'resume' },
    { label: 'Contact', fragment: 'contact' },
  ];

  /** Secondary routes for advanced features, shown in sidenav and desktop utility area. */
  readonly featureLinks: ReadonlyArray<FeatureLink> = [
    { path: '/interview-me', label: 'Interview Me' },
    { path: '/resume-studio', label: 'Resume Studio' },
    { path: '/resume-3d', label: '3D Resume' },
  ];

  /** Candidate display name, updated after the resume profile loads. */
  readonly candidateName = signal('Portfolio');

  readonly darkMode = signal(this.getInitialDarkMode());
  readonly sidenavOpened = signal(false);
  readonly isOnline = signal(globalThis.navigator?.onLine ?? true);
  readonly activeSection = signal<string>('about');
  readonly themeLabel = computed(() => (this.darkMode() ? 'Dark' : 'Light'));

  constructor() {
    this.applyThemeClass(this.darkMode());
    globalThis.addEventListener('online', () => this.isOnline.set(true));
    globalThis.addEventListener('offline', () => this.isOnline.set(false));
  }

  setCandidateName(name: string): void {
    if (name?.trim()) {
      this.candidateName.set(name.trim());
    }
  }

  setActiveSection(fragment: string): void {
    this.activeSection.set(fragment);
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