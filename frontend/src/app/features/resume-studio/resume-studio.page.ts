import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { ApiService } from '../../core/services/api.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { GitHubRepo, GitHubService } from '../../core/services/github.service';
import { ParsedResume } from './resume-parser';

@Component({
  standalone: true,
  imports: [DatePipe],
  templateUrl: './resume-studio.page.html',
  styleUrl: './resume-studio.page.css'
})
export class ResumeStudioPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly analytics = inject(AnalyticsService);
  private readonly github = inject(GitHubService);
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
      const username = await this.github.resolveUsername(this.resume()?.githubUsername);
      if (!username) {
        return;
      }
      const repos = await this.github.fetchRepos(username, this.githubReposAbortController.signal);
      this.githubRepos.set(repos);
    } catch {
      // Keep resume profile projects as fallback when GitHub is unavailable.
    } finally {
      globalThis.clearTimeout(timeoutId);
      this.githubReposLoading.set(false);
      this.githubReposAbortController = null;
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
