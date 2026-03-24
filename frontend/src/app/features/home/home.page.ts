import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/services/api.service';
import { AnalyticsService } from '../../core/services/analytics.service';

type ResumePreview = {
  name: string;
  title: string;
  location: string;
  email: string;
  summary: string;
  skills: string[];
  experience: Array<{
    role: string;
    company: string;
    period: string;
    highlights: string[];
  }>;
};

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="grid gap-6 md:gap-8">
      <div class="rounded-3xl border border-brand-200/70 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-brand-700/60 dark:bg-brand-900/45 md:p-10">
        @if (resume(); as model) {
          <p class="m-0 text-xs uppercase tracking-[0.18em] opacity-70">Resume Studio</p>
          <h1 class="m-0 mt-2 text-4xl font-bold tracking-tight md:text-5xl">{{ model.name }}</h1>
          <p class="m-0 mt-2 text-xl font-medium opacity-90">{{ model.title }}</p>
          <p class="m-0 mt-2 text-sm opacity-80">{{ model.location }} · {{ model.email }}</p>
          <p class="m-0 mt-5 max-w-3xl text-base leading-7 opacity-90 md:text-lg">{{ model.summary }}</p>

          <div class="mt-6 flex flex-wrap gap-3">
            <a href="/public/my-resume.txt" download (click)="trackResumeDownload()" class="rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white no-underline hover:bg-brand-800">
              Download CV
            </a>
            <a routerLink="/interview-me" class="rounded-xl border border-brand-400 px-5 py-3 text-sm font-semibold no-underline hover:bg-brand-100 dark:hover:bg-brand-800/60">
              Interview Me
            </a>
          </div>
        } @else {
          <p class="m-0 text-sm opacity-80">{{ statusMessage() }}</p>
        }
      </div>

      @if (resume(); as model) {
        <div class="grid gap-5 md:grid-cols-[1.2fr_1fr]">
          <section class="rounded-2xl border border-brand-200/70 bg-white/80 p-6 shadow-sm dark:border-brand-700/60 dark:bg-brand-900/40">
            <h2 class="m-0 text-xl font-semibold">Selected Experience</h2>
            <div class="mt-4 grid gap-3">
              @for (item of topExperience(); track item.role + item.company + item.period) {
                <div class="rounded-xl border border-brand-200/80 bg-white/90 p-4 dark:border-brand-700 dark:bg-brand-950/40">
                  <p class="m-0 text-sm font-semibold">{{ item.role }} · {{ item.company }}</p>
                  <p class="m-0 mt-1 text-xs uppercase tracking-[0.12em] opacity-70">{{ item.period || 'Period not specified' }}</p>
                  @if (item.highlights.length > 0) {
                    <p class="m-0 mt-2 text-sm leading-6 opacity-90">{{ item.highlights[0] }}</p>
                  }
                </div>
              }
            </div>
          </section>

          <section class="rounded-2xl border border-brand-200/70 bg-white/80 p-6 shadow-sm dark:border-brand-700/60 dark:bg-brand-900/40">
            <h2 class="m-0 text-xl font-semibold">Core Skills</h2>
            <div class="mt-4 flex flex-wrap gap-2">
              @for (skill of topSkills(); track skill) {
                <span class="rounded-full border border-brand-300 bg-brand-100/70 px-3 py-1 text-xs font-semibold dark:border-brand-700 dark:bg-brand-800/50">{{ skill }}</span>
              }
            </div>
          </section>
        </div>
      }
    </section>
  `
})
export class HomePage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly analytics = inject(AnalyticsService);

  readonly resume = signal<ResumePreview | null>(null);
  readonly statusMessage = signal('Loading resume...');

  readonly topSkills = computed(() => (this.resume()?.skills ?? []).slice(0, 12));
  readonly topExperience = computed(() => (this.resume()?.experience ?? []).slice(0, 3));

  async ngOnInit(): Promise<void> {
    await this.loadResume();
  }

  trackResumeDownload(): void {
    this.analytics.trackResumeDownload().catch(() => {
      // Ignore analytics tracking failures for recruiter UX.
    });
  }

  private async loadResume(): Promise<void> {
    try {
      const profile = await this.api.get<ResumePreview>('/api/v1/resume-profile');
      this.resume.set(profile);
      this.statusMessage.set('');
    } catch {
      this.statusMessage.set('Resume is temporarily unavailable.');
    }
  }
}
