import { Component, OnInit, AfterViewInit, OnDestroy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AnalyticsService } from '../../core/services/analytics.service';
import { ApiService } from '../../core/services/api.service';
import { AppShellStore } from '../../core/stores/app-shell.store';
import { ParsedResume, parseResumeFile } from '../resume-studio/resume-parser';

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
  template: `

    <!-- ════════════════════════════════ HERO / ABOUT ════════════════════════════════ -->
    <section
      id="about"
      class="flex min-h-[calc(100svh-64px)] flex-col items-center justify-center px-6 py-24 text-center md:py-36"
    >
      @if (profile(); as model) {
        <!-- Avatar initials -->
        <div class="mb-7 flex h-24 w-24 items-center justify-center rounded-full bg-brand-600 text-3xl font-bold text-white shadow-lg ring-4 ring-brand-200 dark:ring-brand-800">
          {{ initials(model.name) }}
        </div>
        <p class="m-0 text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-400">
          {{ model.title }}
        </p>
        <h1 class="m-0 mt-4 text-5xl font-extrabold tracking-tight md:text-7xl">
          {{ model.name }}
        </h1>
        <p class="m-0 mt-6 max-w-2xl text-base leading-8 opacity-80 md:text-lg">
          {{ model.summary }}
        </p>
        <p class="m-0 mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm opacity-55">
          <span>{{ model.location }}</span>
          <span aria-hidden="true">·</span>
          <a [attr.href]="'mailto:' + model.email" class="opacity-80 hover:opacity-100">{{ model.email }}</a>
          @if (model.githubUsername) {
            <span aria-hidden="true">·</span>
            <a
              [href]="'https://github.com/' + model.githubUsername"
              target="_blank"
              rel="noopener noreferrer"
              class="opacity-80 hover:opacity-100"
            >github.com/{{ model.githubUsername }}</a>
          }
        </p>
        <div class="mt-10 flex flex-wrap justify-center gap-4">
          <a
            href="/public/my-resume.pdf"
            download
            (click)="trackResumeDownload()"
            class="rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-semibold text-white no-underline shadow-md transition hover:bg-brand-700 hover:shadow-lg"
          >
            Download Resume
          </a>
          <a
            routerLink="/interview-me"
            class="rounded-xl border border-brand-400 px-7 py-3.5 text-sm font-semibold no-underline transition hover:bg-brand-100 dark:border-brand-600 dark:hover:bg-brand-800/60"
          >
            Interview Me →
          </a>
        </div>
      } @else {
        <p class="opacity-60">{{ loadingMessage() }}</p>
      }
    </section>

    @if (profile(); as model) {

      <!-- ════════════════════════════════ SKILLS ════════════════════════════════ -->
      <section
        id="skills"
        class="scroll-mt-20 bg-brand-50/70 px-6 py-20 dark:bg-brand-900/30 md:py-28"
      >
        <div class="mx-auto max-w-4xl">
          <p class="m-0 text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-400">
            Toolkit
          </p>
          <h2 class="m-0 mt-3 text-3xl font-bold tracking-tight md:text-4xl">Technical Skills</h2>
          <div class="mt-8 flex flex-wrap gap-3">
            @for (skill of model.skills; track skill) {
              <span
                class="rounded-full border border-brand-300 bg-white px-4 py-2 text-sm font-medium shadow-sm dark:border-brand-700 dark:bg-brand-800/60"
              >
                {{ skill }}
              </span>
            }
          </div>
        </div>
      </section>

      <!-- ════════════════════════════════ PROJECTS ════════════════════════════════ -->
      <section
        id="projects"
        class="scroll-mt-20 px-6 py-20 md:py-28"
      >
        <div class="mx-auto max-w-6xl">
          <p class="m-0 text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-400">
            Work
          </p>
          <h2 class="m-0 mt-3 text-3xl font-bold tracking-tight md:text-4xl">Projects</h2>
          @if (githubReposLoading()) {
            <p class="mt-8 opacity-60">Loading GitHub projects...</p>
          } @else if (githubRepos().length > 0) {
            <div class="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              @for (repo of githubRepos(); track repo.id) {
                <a
                  [href]="repo.html_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex flex-col rounded-2xl border border-brand-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition hover:shadow-md no-underline dark:border-brand-700/60 dark:bg-brand-900/40"
                >
                  <h3 class="m-0 text-base font-semibold text-brand-700 dark:text-brand-300">{{ repo.name }}</h3>
                  @if (repo.description) {
                    <p class="m-0 mt-3 flex-1 text-sm leading-7 opacity-85">{{ repo.description }}</p>
                  } @else {
                    <p class="m-0 mt-3 flex-1 text-sm italic opacity-40">No description</p>
                  }
                  <div class="mt-4 flex flex-wrap items-center gap-2">
                    @if (repo.language) {
                      <span class="rounded-full bg-brand-100/80 px-2.5 py-1 text-xs font-medium dark:bg-brand-800/60">{{ repo.language }}</span>
                    }
                    @if (repo.stargazers_count > 0) {
                      <span class="ml-auto text-xs opacity-55">★ {{ repo.stargazers_count }}</span>
                    }
                  </div>
                </a>
              }
            </div>
          } @else {
            <div class="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              @for (project of model.projects; track project.name) {
                <article class="flex flex-col rounded-2xl border border-brand-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition hover:shadow-md dark:border-brand-700/60 dark:bg-brand-900/40">
                  <h3 class="m-0 text-base font-semibold">{{ project.name }}</h3>
                  <p class="m-0 mt-3 flex-1 text-sm leading-7 opacity-85">{{ project.summary }}</p>
                  @if (project.stack.length > 0) {
                    <div class="mt-4 flex flex-wrap gap-2">
                      @for (tech of project.stack; track tech) {
                        <span class="rounded-full bg-brand-100/80 px-2.5 py-1 text-xs font-medium dark:bg-brand-800/60">{{ tech }}</span>
                      }
                    </div>
                  }
                </article>
              }
            </div>
          }
        </div>
      </section>

      <!-- ════════════════════════════════ EXPERIENCE ════════════════════════════════ -->
      <section
        id="experience"
        class="scroll-mt-20 bg-brand-50/70 px-6 py-20 dark:bg-brand-900/30 md:py-28"
      >
        <div class="mx-auto max-w-4xl">
          <p class="m-0 text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-400">
            Career
          </p>
          <h2 class="m-0 mt-3 text-3xl font-bold tracking-tight md:text-4xl">Experience</h2>

          <!-- Timeline -->
          <div class="relative mt-10">
            <!-- Vertical connecting line -->
            <span class="absolute left-[1.1875rem] top-2 h-[calc(100%-1rem)] w-0.5 bg-brand-200 dark:bg-brand-700" aria-hidden="true"></span>

            <div class="grid gap-8">
              @for (job of model.experience; track job.role + job.company) {
                <article class="relative pl-12">
                  <!-- Timeline dot -->
                  <span
                    class="absolute left-3 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-brand-500 bg-white shadow-sm dark:bg-brand-900"
                    aria-hidden="true"
                  ></span>
                  <div class="rounded-2xl border border-brand-200/70 bg-white/90 p-6 shadow-sm dark:border-brand-700/60 dark:bg-brand-900/40">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 class="m-0 text-base font-semibold">{{ job.role }}</h3>
                        <p class="m-0 mt-0.5 text-sm font-medium text-brand-600 dark:text-brand-400">{{ job.company }}</p>
                      </div>
                      <span
                        class="shrink-0 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs tracking-wide text-brand-700 dark:border-brand-700 dark:bg-brand-800/60 dark:text-brand-300"
                      >
                        {{ job.period }}
                      </span>
                    </div>
                    @if (job.highlights.length > 0) {
                      <ul class="m-0 mt-4 list-none pl-0 text-sm leading-7 opacity-85">
                        @for (line of job.highlights; track line) {
                          <li class="flex gap-2 before:mt-[0.35rem] before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-brand-400">{{ line }}</li>
                        }
                      </ul>
                    }
                  </div>
                </article>
              }
            </div>
          </div>
        </div>
      </section>

      <!-- ════════════════════════════════ RESUME ════════════════════════════════ -->
      <section
        id="resume"
        class="scroll-mt-20 px-6 py-20 text-center md:py-28"
      >
        <div class="mx-auto max-w-3xl">
          <p class="m-0 text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-400">
            CV
          </p>
          <h2 class="m-0 mt-3 text-3xl font-bold tracking-tight md:text-4xl">Resume</h2>
          <p class="m-0 mt-5 text-base leading-8 opacity-75 md:text-lg">
            Download the PDF or open the interactive Resume Studio for the full career timeline, skills, and project details.
          </p>
          <div class="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href="/public/my-resume.pdf"
              download
              (click)="trackResumeDownload()"
              class="rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-semibold text-white no-underline shadow-md transition hover:bg-brand-700 hover:shadow-lg"
            >
              Download PDF
            </a>
            <a
              routerLink="/resume-studio"
              class="rounded-xl border border-brand-400 px-7 py-3.5 text-sm font-semibold no-underline transition hover:bg-brand-100 dark:border-brand-600 dark:hover:bg-brand-800/60"
            >
              Resume Studio
            </a>
          </div>
        </div>
      </section>

      <!-- ════════════════════════════════ CONTACT / AI CTA ════════════════════════════════ -->
      <section
        id="contact"
        class="scroll-mt-20 bg-brand-600 px-6 py-20 text-center text-white md:py-28"
      >
        <p class="m-0 text-xs font-semibold uppercase tracking-[0.22em] opacity-70">Let's Talk</p>
        <h2 class="m-0 mt-3 text-3xl font-bold tracking-tight md:text-4xl">Want to Know More?</h2>
        <p class="m-0 mt-5 text-base leading-8 opacity-85 md:mx-auto md:max-w-xl md:text-lg">
          Ask me directly about my experience, technical decisions, architecture tradeoffs,
          and delivery approach — powered by AI.
        </p>
        <div class="mt-10 flex flex-wrap justify-center gap-4">
          <a
            routerLink="/interview-me"
            class="rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-brand-700 no-underline shadow-md transition hover:bg-brand-50"
          >
            Start Interview →
          </a>
          <a
            [attr.href]="'mailto:' + model.email"
            class="rounded-xl border border-white/50 px-7 py-3.5 text-sm font-semibold text-white no-underline transition hover:bg-brand-700"
          >
            Email Me
          </a>
        </div>
      </section>

    }
  `
})
export class HomePage implements OnInit, AfterViewInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly analytics = inject(AnalyticsService);
  private readonly shellStore = inject(AppShellStore);

  private sectionObserver: IntersectionObserver | null = null;

  readonly profile = signal<ParsedResume | null>(null);
  readonly loadingMessage = signal('Loading profile...');
  readonly githubRepos = signal<GitHubRepo[]>([]);
  readonly githubReposLoading = signal(true);

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
    void this.loadGithubRepos();
  }

  ngAfterViewInit(): void {
    const sectionIds = ['about', 'skills', 'projects', 'experience', 'resume', 'contact'];
    this.sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.shellStore.setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) this.sectionObserver.observe(el);
    }
  }

  ngOnDestroy(): void {
    this.sectionObserver?.disconnect();
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  trackResumeDownload(): void {
    this.analytics.trackResumeDownload().catch(() => {
      // Ignore analytics failures for recruiter UX.
    });
  }

  private async loadGithubRepos(): Promise<void> {
    try {
      const username = this.profile()?.githubUsername ?? 'NechamaEisenstein1';
      const response = await fetch(
        `https://api.github.com/users/${username}/repos?per_page=100&sort=updated&type=owner`
      );
      if (!response.ok) {
        throw new Error(`GitHub API ${response.status}`);
      }
      const all = (await response.json()) as GitHubRepo[];
      const owned = all
        .filter((r) => !r.fork && !r.archived)
        .sort((a, b) => b.stargazers_count - a.stargazers_count || b.updated_at.localeCompare(a.updated_at))
        .slice(0, 12);
      this.githubRepos.set(owned.length > 0 ? owned : all.filter((r) => !r.archived).slice(0, 12));
    } catch {
      // GitHub unavailable — fallback to resume projects shown in template
    } finally {
      this.githubReposLoading.set(false);
    }
  }

  private async loadProfile(): Promise<void> {
    try {
      const data = await this.api.get<ParsedResume>('/api/v1/resume-profile');
      this.profile.set(data);
      this.shellStore.setCandidateName(data.name);
      return;
    } catch {
      // Fall through to bundled PDF fallback.
    }

    try {
      const response = await fetch('/public/my-resume.pdf');
      if (!response.ok) {
        throw new Error('Resume PDF unavailable.');
      }
      const blob = await response.blob();
      const file = new File([blob], 'my-resume.pdf', { type: blob.type || 'application/pdf' });
      const parsed = await parseResumeFile(file);
      this.profile.set(parsed);
      this.shellStore.setCandidateName(parsed.name);
    } catch {
      this.loadingMessage.set('Profile is temporarily unavailable.');
    }
  }
}


