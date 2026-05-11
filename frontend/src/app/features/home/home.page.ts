import { AfterViewInit, Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AnalyticsService } from '../../core/services/analytics.service';
import { ApiService } from '../../core/services/api.service';
import { GitHubRepo, GitHubService } from '../../core/services/github.service';
import { AppShellStore } from '../../core/stores/app-shell.store';
import { ParsedResume } from '../resume-studio/resume-parser';

@Component({
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
})
export class HomePage implements OnInit, AfterViewInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly analytics = inject(AnalyticsService);
  private readonly github = inject(GitHubService);
  private readonly shellStore = inject(AppShellStore);

  constructor() {
    effect(() => {
      if (this.profile() !== null) {
        Promise.resolve().then(() => this.observeAvailableSections());
      }
    });
  }

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
      const username = await this.github.resolveUsername(this.profile()?.githubUsername);
      if (!username) {
        return;
      }
      const repos = await this.github.fetchRepos(username, this.githubReposAbortController.signal);
      this.githubRepos.set(repos);
    } catch {
      // GitHub unavailable — fallback to resume projects shown in template
    } finally {
      globalThis.clearTimeout(timeoutId);
      this.githubReposLoading.set(false);
      this.githubReposAbortController = null;
    }
  }
}