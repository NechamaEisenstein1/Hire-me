import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { ApiService } from '../../core/services/api.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { GitHubService } from '../../core/services/github.service';
import { Project } from '../../core/services/projects.service';
import { downloadResumeFile, getResumeDownloadFileName, getResumeDownloadHref } from '../../core/utils/resume-download';
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
  private readonly githubService = inject(GitHubService);

  readonly now = new Date();
  readonly resume = signal<ParsedResume | null>(null);
  readonly statusMessage = signal('Loading public resume profile...');
  readonly projects = signal<Project[]>([]);
  readonly projectsLoading = signal(true);

  readonly stats = computed(() => {
    const model = this.resume();
    const dbProjects = this.projects();
    return {
      skills: model?.skills.length ?? 0,
      experience: model?.experience.length ?? 0,
      projects: dbProjects.length > 0 ? dbProjects.length : (model?.projects.length ?? 0),
      education: model?.education.length ?? 0
    };
  });

  async ngOnInit(): Promise<void> {
    await this.loadPublicResumeProfile();
    void this.loadProjects();
  }

  trackResumeDownload(event: MouseEvent, fileName?: string | null): void {
    event.preventDefault();
    this.analytics.trackResumeDownload().catch(() => {
      // Ignore analytics failures for recruiter UX.
    });
    downloadResumeFile(fileName).catch(() => {
      window.location.assign(getResumeDownloadHref(fileName));
    });
  }

  protected readonly getResumeDownloadHref = getResumeDownloadHref;
  protected readonly getResumeDownloadFileName = getResumeDownloadFileName;

  private async loadProjects(): Promise<void> {
    try {
      const repos = await this.githubService.fetchRepos();
      this.projects.set(this.githubService.mapReposToProjects(repos));
    } catch {
      // Keep resume profile projects as fallback when GitHub is unavailable.
    } finally {
      this.projectsLoading.set(false);
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
