import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { ApiService } from '../../core/services/api.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { ParsedResume } from './resume-parser';

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

type GitHubStatsResponse = {
  username: string;
};

@Component({
  standalone: true,
  imports: [DatePipe],
  templateUrl: './resume-studio.page.html',
  styleUrl: './resume-studio.page.css'
})
export class ResumeStudioPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly analytics = inject(AnalyticsService);
  private githubReposAbortController: AbortController | null = null;

  readonly now = new Date();
  readonly resume = signal<ParsedResume | null>(null);
  readonly statusMessage = signal('Loading public resume profile...');
  readonly githubRepos = signal<GitHubRepo[]>([]);
  readonly githubReposLoading = signal(true);

  readonly stats = computed(() => {
    const model = this.resume();
    return {
      skills: model?.skills.length ?? 0,
      experience: model?.experience.length ?? 0,
      projects: model?.projects.length ?? 0,
      education: model?.education.length ?? 0
    };
  });

  async ngOnInit(): Promise<void> {
    await this.loadPublicResumeProfile();
    void this.loadGithubRepos();
  }

  trackResumeDownload(): void {
    this.analytics.trackResumeDownload().catch(() => {
      // Ignore analytics failures for recruiter UX.
    });
  }

  private async loadGithubRepos(): Promise<void> {
    this.githubReposLoading.set(true);
    this.githubReposAbortController?.abort();
    this.githubReposAbortController = new AbortController();
    const timeoutId = globalThis.setTimeout(() => this.githubReposAbortController?.abort(), 8000);

    try {
      const username = await this.resolveGithubUsername();
      if (!username) {
        return;
      }

      const response = await fetch(
        `https://api.github.com/users/${username}/repos?per_page=100&sort=updated&type=owner`,
        { signal: this.githubReposAbortController.signal }
      );
      if (!response.ok) {
        throw new Error(`GitHub API ${response.status}`);
      }

      const repos = (await response.json()) as GitHubRepo[];
      const ranked = repos
        .filter((repo) => !repo.fork && !repo.archived)
        .sort((a, b) => b.stargazers_count - a.stargazers_count || b.updated_at.localeCompare(a.updated_at))
        .slice(0, 12);

      this.githubRepos.set(ranked.length > 0 ? ranked : repos.filter((repo) => !repo.archived).slice(0, 12));
    } catch {
      // Keep resume profile projects as fallback when GitHub is unavailable.
    } finally {
      globalThis.clearTimeout(timeoutId);
      this.githubReposLoading.set(false);
      this.githubReposAbortController = null;
    }
  }

  private async resolveGithubUsername(): Promise<string | null> {
    const fromProfile = this.resume()?.githubUsername?.trim();
    if (fromProfile) {
      return fromProfile;
    }

    try {
      const stats = await this.api.get<GitHubStatsResponse>('/api/v1/github/stats');
      return stats.username?.trim() || null;
    } catch {
      return null;
    }
  }

  private async loadPublicResumeProfile(): Promise<void> {
    try {
      const profile = await this.api.get<ParsedResume>('/api/v1/resume-profile');
      this.resume.set(profile);
      this.statusMessage.set('Loaded public resume profile. Projects are synced from GitHub.');
    } catch {
      this.statusMessage.set('Unable to load public resume profile right now.');
    }
  }
}
