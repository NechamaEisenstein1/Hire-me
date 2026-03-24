import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { ApiService } from '../../core/services/api.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { ParsedResume } from './resume-parser';

@Component({
  standalone: true,
  imports: [DatePipe],
  template: `
    <section class="grid gap-6">
      <div class="rounded-3xl border border-brand-200/70 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-brand-700/60 dark:bg-brand-900/45 md:p-8">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="m-0 text-xs uppercase tracking-[0.18em] opacity-70">Resume Studio</p>
            <h2 class="m-0 mt-2 text-3xl font-bold tracking-tight md:text-4xl">Professional CV Overview</h2>
            <p class="m-0 mt-3 max-w-2xl text-sm leading-6 opacity-80 md:text-base">
              This is the public recruiter view. It is curated and updated through a private owner admin panel.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <a
              href="/public/my-resume.txt"
              download
              (click)="trackResumeDownload()"
              class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-900 no-underline ring-1 ring-brand-300 hover:bg-brand-50 dark:bg-brand-950 dark:text-brand-100 dark:ring-brand-700"
            >
              Download My Resume
            </a>
          </div>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <aside class="rounded-2xl border border-brand-200/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-brand-700/60 dark:bg-brand-900/40 lg:sticky lg:top-24 lg:self-start">
          <h3 class="m-0 text-lg font-semibold">Candidate Snapshot</h3>
          <p class="m-0 mt-2 text-sm opacity-80">A concise summary of core qualifications.</p>

          <p class="mt-4 rounded-lg bg-brand-100/80 px-3 py-2 text-sm dark:bg-brand-800/50">
            {{ statusMessage() }}
          </p>

          @if (resume()) {
            <div class="mt-4 rounded-xl border border-brand-200 p-3 dark:border-brand-700">
              <p class="m-0 text-xs uppercase tracking-[0.12em] opacity-70">Current Role</p>
              <p class="m-0 mt-2 text-sm font-semibold">{{ resume()?.title }}</p>
              <p class="m-0 mt-1 text-xs opacity-80">{{ resume()?.location }}</p>
            </div>
          }

          <div class="mt-4 grid grid-cols-2 gap-3">
            <div class="rounded-xl border border-brand-200 p-3 text-center dark:border-brand-700">
              <p class="m-0 text-xs uppercase opacity-70">Skills</p>
              <p class="m-0 mt-1 text-2xl font-bold">{{ stats().skills }}</p>
            </div>
            <div class="rounded-xl border border-brand-200 p-3 text-center dark:border-brand-700">
              <p class="m-0 text-xs uppercase opacity-70">Experience</p>
              <p class="m-0 mt-1 text-2xl font-bold">{{ stats().experience }}</p>
            </div>
            <div class="rounded-xl border border-brand-200 p-3 text-center dark:border-brand-700">
              <p class="m-0 text-xs uppercase opacity-70">Projects</p>
              <p class="m-0 mt-1 text-2xl font-bold">{{ stats().projects }}</p>
            </div>
            <div class="rounded-xl border border-brand-200 p-3 text-center dark:border-brand-700">
              <p class="m-0 text-xs uppercase opacity-70">Education</p>
              <p class="m-0 mt-1 text-2xl font-bold">{{ stats().education }}</p>
            </div>
          </div>
        </aside>

        <article class="grid gap-5">
          @if (resume(); as model) {
            <section class="rounded-3xl border border-brand-200/70 bg-gradient-to-br from-brand-100/90 via-white to-brand-50 p-6 shadow-md dark:border-brand-700/60 dark:from-brand-900/70 dark:via-brand-900/65 dark:to-brand-950 md:p-8">
              <p class="m-0 text-xs uppercase tracking-[0.14em] opacity-70">Profile</p>
              <h3 class="m-0 mt-2 text-3xl font-bold md:text-4xl">{{ model.name }}</h3>
              <p class="m-0 mt-1 text-lg opacity-90 md:text-xl">{{ model.title }}</p>
              <p class="m-0 mt-2 text-sm opacity-80 md:text-base">{{ model.location }} · {{ model.email }}</p>
              <p class="m-0 mt-4 leading-7 opacity-90">{{ model.summary }}</p>
            </section>

            <section class="rounded-2xl border border-brand-200/70 bg-white/80 p-6 shadow-sm dark:border-brand-700/60 dark:bg-brand-900/40">
              <h4 class="m-0 text-xl font-semibold">Skills</h4>
              <div class="mt-3 flex flex-wrap gap-2">
                @for (skill of model.skills; track skill) {
                  <span class="rounded-full border border-brand-300 bg-brand-100/70 px-3 py-1 text-xs font-semibold dark:border-brand-700 dark:bg-brand-800/50">{{ skill }}</span>
                }
              </div>
            </section>

            <section class="rounded-2xl border border-brand-200/70 bg-white/80 p-6 shadow-sm dark:border-brand-700/60 dark:bg-brand-900/40">
              <h4 class="m-0 text-xl font-semibold">Experience Timeline</h4>
              <div class="mt-4 grid gap-3">
                @for (item of model.experience; track item.role + item.company + item.period) {
                  <div class="relative rounded-xl border border-brand-200/80 bg-white/95 p-4 pl-6 dark:border-brand-700 dark:bg-brand-950/40">
                    <span class="absolute left-2 top-5 h-2.5 w-2.5 rounded-full bg-brand-600"></span>
                    <p class="m-0 text-sm font-semibold">{{ item.role }} · {{ item.company }}</p>
                    <p class="m-0 mt-1 text-xs uppercase tracking-[0.12em] opacity-70">{{ item.period || 'Period not specified' }}</p>
                    @if (item.highlights.length > 0) {
                      <ul class="m-0 mt-2 list-disc pl-5 text-sm leading-6 opacity-90">
                        @for (line of item.highlights; track line) {
                          <li>{{ line }}</li>
                        }
                      </ul>
                    }
                  </div>
                }
              </div>
            </section>

            <section class="grid gap-5 md:grid-cols-2">
              <div class="rounded-2xl border border-brand-200/70 bg-white/80 p-6 shadow-sm dark:border-brand-700/60 dark:bg-brand-900/40">
                <h4 class="m-0 text-xl font-semibold">Projects</h4>
                <div class="mt-3 grid gap-3">
                  @for (project of model.projects; track project.name) {
                    <div class="rounded-xl border border-brand-200/80 p-4 dark:border-brand-700">
                      <p class="m-0 text-sm font-semibold">{{ project.name }}</p>
                      <p class="m-0 mt-1 text-sm leading-6 opacity-90">{{ project.summary || 'No summary provided.' }}</p>
                      @if (project.stack.length > 0) {
                        <div class="mt-2 flex flex-wrap gap-2">
                          @for (tech of project.stack; track tech) {
                            <span class="rounded-full bg-brand-100 px-2 py-1 text-xs dark:bg-brand-800/60">{{ tech }}</span>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>

              <div class="rounded-2xl border border-brand-200/70 bg-white/80 p-6 shadow-sm dark:border-brand-700/60 dark:bg-brand-900/40">
                <h4 class="m-0 text-xl font-semibold">Education</h4>
                <div class="mt-3 grid gap-3">
                  @for (ed of model.education; track ed.degree + ed.school) {
                    <div class="rounded-xl border border-brand-200/80 p-4 dark:border-brand-700">
                      <p class="m-0 text-sm font-semibold">{{ ed.degree }}</p>
                      <p class="m-0 mt-1 text-sm opacity-90">{{ ed.school }}</p>
                      <p class="m-0 mt-1 text-xs uppercase tracking-[0.12em] opacity-70">{{ ed.period || 'Period not specified' }}</p>
                    </div>
                  }
                </div>
              </div>
            </section>
          } @else {
            <section class="rounded-2xl border border-dashed border-brand-300 bg-white/70 p-10 text-center dark:border-brand-700 dark:bg-brand-900/35">
              <p class="m-0 text-lg font-semibold">Resume profile is temporarily unavailable</p>
              <p class="m-0 mt-2 text-sm opacity-80">Please try again shortly or contact the site owner.</p>
            </section>
          }
        </article>
      </div>

      <p class="text-xs opacity-70">Last updated: {{ now | date : 'medium' }}</p>
    </section>
  `
})
export class ResumeStudioPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly analytics = inject(AnalyticsService);

  readonly now = new Date();
  readonly resume = signal<ParsedResume | null>(null);
  readonly statusMessage = signal('Loading public resume profile...');

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
  }

  trackResumeDownload(): void {
    this.analytics.trackResumeDownload().catch(() => {
      // Ignore analytics failures for recruiter UX.
    });
  }

  private async loadPublicResumeProfile(): Promise<void> {
    try {
      const profile = await this.api.get<ParsedResume>('/api/v1/resume-profile');
      this.resume.set(profile);
      this.statusMessage.set('Loaded public resume profile for recruiter view.');
    } catch {
      this.statusMessage.set('Unable to load public resume profile right now.');
    }
  }
}
