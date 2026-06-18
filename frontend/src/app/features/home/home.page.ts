import { AfterViewInit, Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AnalyticsService } from '../../core/services/analytics.service';
import { ApiService } from '../../core/services/api.service';
import { GitHubService } from '../../core/services/github.service';
import { Project } from '../../core/services/projects.service';
import { AppShellStore } from '../../core/stores/app-shell.store';
import { downloadResumeFile, getResumeDownloadFileName, getResumeDownloadHref } from '../../core/utils/resume-download';
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
  private readonly githubService = inject(GitHubService);
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

  readonly profile = signal<ParsedResume | null>(null);
  readonly loadingMessage = signal('Loading profile...');
  readonly projects = signal<Project[]>([]);
  readonly projectsLoading = signal(true);
  readonly githubStats = signal<{ followers: number; stars: number; publicRepos: number } | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadHomeSnapshot();
    void this.loadProjects();
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

  trackResumeDownload(event: MouseEvent, fileName?: string | null): void {
    event.preventDefault();
    this.analytics.trackResumeDownload().catch(() => {
      // Ignore analytics failures for recruiter UX.
    });
    downloadResumeFile(fileName).catch(() => {
      // Fallback: same-tab navigation avoids popup-blocker (triggered after async, not user gesture).
      window.location.assign(getResumeDownloadHref(fileName));
    });
  }

  protected readonly getResumeDownloadHref = getResumeDownloadHref;
  protected readonly getResumeDownloadFileName = getResumeDownloadFileName;

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

  private async loadProjects(): Promise<void> {
    try {
      const repos = await this.githubService.fetchRepos();
      this.projects.set(this.githubService.mapReposToProjects(repos));
    } catch {
      // Fallback: resume profile projects shown in template
    } finally {
      this.projectsLoading.set(false);
    }
  }

  private async loadHomeSnapshot(): Promise<void> {
    type GraphQLResponse<T> = {
      data?: T;
      errors?: Array<{ message?: string }>;
    };

    type HomeSnapshotQuery = {
      resumeProfile?: ParsedResume;
      githubStats?: {
        followers: number;
        stars: number;
        publicRepos: number;
      };
    };

    const query = `
      query HomeSnapshot {
        resumeProfile {
          name
          title
          location
          email
          githubUsername
          resumeFileName
          summary
          skills
          experience {
            role
            company
            period
            highlights
          }
          projects {
            name
            summary
            stack
          }
          education {
            degree
            school
            period
          }
        }
        githubStats {
          followers
          stars
          publicRepos
        }
      }
    `;

    try {
      const response = await this.api.post<GraphQLResponse<HomeSnapshotQuery>>('/graphql', { query });
      if (response.errors?.length) {
        throw new Error('GraphQL snapshot query failed.');
      }

      if (response.data?.resumeProfile) {
        this.profile.set(response.data.resumeProfile);
        this.shellStore.setCandidateName(response.data.resumeProfile.name);
      }

      if (response.data?.githubStats) {
        this.githubStats.set(response.data.githubStats);
      }

      if (!response.data?.resumeProfile) {
        await this.loadProfile();
      }
    } catch {
      // Preserve existing Home flow when GraphQL is unavailable.
      await this.loadProfile();
    }
  }
}