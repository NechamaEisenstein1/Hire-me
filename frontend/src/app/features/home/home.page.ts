import { AfterViewChecked, AfterViewInit, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AnalyticsService } from '../../core/services/analytics.service';
import { ApiService } from '../../core/services/api.service';
import { AppShellStore } from '../../core/stores/app-shell.store';
import { ParsedResume } from '../resume-studio/resume-parser';

type GitHubRepo = {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  fork: boolean;
  archived: boolean;
};

@Component({
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
})
export class HomePage implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly analytics = inject(AnalyticsService);
  private readonly shellStore = inject(AppShellStore);

  private sectionObserver: IntersectionObserver | null = null;
  private readonly observedSectionIds = new Set<string>();
  private githubReposAbortController: AbortController | null = null;

  readonly profile = signal<ParsedResume | null>(null);
  readonly loadingMessage = signal('Loading profile...');
  readonly githubRepos = signal<GitHubRepo[]>([]);
  readonly githubReposLoading = signal(true);

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
    void this.loadGithubRepos();
  }

  ngAfterViewInit(): void {
    this.sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.shellStore.setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    );
    this.observeAvailableSections();
  }

  ngAfterViewChecked(): void {
    this.observeAvailableSections();
  }

  ngOnDestroy(): void {
    this.sectionObserver?.disconnect();
    this.githubReposAbortController?.abort();
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  trackResumeDownload(): void {
    this.analytics.trackResumeDownload().catch(() => {
      // Ignore analytics failures for recruiter UX.
    });
  }

  private observeAvailableSections(): void {
    if (!this.sectionObserver) {
      return;
    }

    const sectionIds = this.shellStore.sectionLinks.map((link) => link.fragment);
    for (const id of sectionIds) {
      if (this.observedSectionIds.has(id)) {
        continue;
      }
      const element = document.getElementById(id);
      if (element) {
        this.sectionObserver.observe(element);
        this.observedSectionIds.add(id);
      }
    }
  }

  private async loadProfile(): Promise<void> {
    try {
      const data = await this.api.get<ParsedResume>('/api/v1/resume-profile');
      this.profile.set(data);
      this.shellStore.setCandidateName(data.name);
    } catch {
      this.loadingMessage.set('Profile is temporarily unavailable.');
    }
  }

  private async loadGithubRepos(): Promise<void> {
    this.githubReposAbortController?.abort();
    this.githubReposAbortController = new AbortController();
    const timeoutId = globalThis.setTimeout(() => this.githubReposAbortController?.abort(), 8000);

    try {
      const username = this.profile()?.githubUsername ?? 'NechamaEisenstein1';
      const response = await fetch(
        `https://api.github.com/users/${username}/repos?per_page=100&sort=updated&type=owner`,
        { signal: this.githubReposAbortController.signal },
      );
      if (!response.ok) {
        throw new Error(`GitHub API ${response.status}`);
      }
      const all = (await response.json()) as GitHubRepo[];
      const owned = all
        .filter((repo) => !repo.fork && !repo.archived)
        .sort((a, b) => b.stargazers_count - a.stargazers_count || b.updated_at.localeCompare(a.updated_at))
        .slice(0, 12);
      this.githubRepos.set(owned.length > 0 ? owned : all.filter((repo) => !repo.archived).slice(0, 12));
    } catch {
      // GitHub unavailable — fallback to resume projects shown in template
    } finally {
      globalThis.clearTimeout(timeoutId);
      this.githubReposLoading.set(false);
      this.githubReposAbortController = null;
    }
  }
}