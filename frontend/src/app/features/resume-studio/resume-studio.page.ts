import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { ParsedResume, parseResumeFile } from './resume-parser';

@Component({
  standalone: true,
  imports: [DatePipe],
  template: `
    <section class="grid gap-6">
      <div class="rounded-3xl border border-brand-200/70 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-brand-700/60 dark:bg-brand-900/45 md:p-8">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="m-0 text-xs uppercase tracking-[0.18em] opacity-70">Resume Studio</p>
            <h2 class="m-0 mt-2 text-3xl font-bold tracking-tight md:text-4xl">Make your CV visual and interactive</h2>
            <p class="m-0 mt-3 max-w-2xl text-sm leading-6 opacity-80 md:text-base">
              Upload JSON/TXT/MD resume data and instantly generate a polished visual profile.
              You can also download the current resume template and update it with your details.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <a
              href="/public/my-resume.txt"
              download
              class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-900 no-underline ring-1 ring-brand-300 hover:bg-brand-50 dark:bg-brand-950 dark:text-brand-100 dark:ring-brand-700"
            >
              Download My Resume
            </a>
            <a
              href="/public/resume-template.json"
              download
              class="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-brand-800"
            >
              Download Resume Template
            </a>
            <button
              type="button"
              (click)="downloadParsedResume()"
              [disabled]="!resume()"
              class="rounded-xl border border-brand-400 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 hover:bg-brand-100 dark:hover:bg-brand-800/60"
            >
              Download Parsed Resume
            </button>
          </div>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1.1fr_2fr]">
        <aside class="rounded-2xl border border-brand-200/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-brand-700/60 dark:bg-brand-900/40">
          <h3 class="m-0 text-lg font-semibold">Upload Resume File</h3>
          <p class="m-0 mt-2 text-sm opacity-80">Supported: .json, .txt, .md, .pdf, .docx</p>

          <label class="mt-4 block cursor-pointer rounded-xl border-2 border-dashed border-brand-300 p-5 text-center transition hover:border-brand-500 dark:border-brand-700 dark:hover:border-brand-500">
            <input type="file" class="hidden" accept=".json,.txt,.md,.pdf,.docx" (change)="onFileSelected($event)" />
            <span class="text-sm font-medium">Click to choose resume file</span>
          </label>

          <p class="mt-4 rounded-lg bg-brand-100/80 px-3 py-2 text-sm dark:bg-brand-800/50">
            {{ statusMessage() }}
          </p>

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
            <section class="rounded-2xl border border-brand-200/70 bg-gradient-to-br from-brand-100/80 to-white p-6 shadow-md dark:border-brand-700/60 dark:from-brand-900/70 dark:to-brand-950">
              <p class="m-0 text-xs uppercase tracking-[0.14em] opacity-70">Profile</p>
              <h3 class="m-0 mt-2 text-3xl font-bold">{{ model.name }}</h3>
              <p class="m-0 mt-1 text-lg opacity-90">{{ model.title }}</p>
              <p class="m-0 mt-2 text-sm opacity-80">{{ model.location }} · {{ model.email }}</p>
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
                  <div class="rounded-xl border border-brand-200/80 bg-white/90 p-4 dark:border-brand-700 dark:bg-brand-950/40">
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
              <p class="m-0 text-lg font-semibold">No resume loaded yet</p>
              <p class="m-0 mt-2 text-sm opacity-80">Upload your resume file to generate a visual profile.</p>
            </section>
          }
        </article>
      </div>

      <p class="text-xs opacity-70">Last updated: {{ now | date : 'medium' }}</p>
    </section>
  `
})
export class ResumeStudioPage {
  readonly now = new Date();
  readonly resume = signal<ParsedResume | null>(null);
  readonly statusMessage = signal('Ready. Upload your resume to render it visually.');

  readonly stats = computed(() => {
    const model = this.resume();
    return {
      skills: model?.skills.length ?? 0,
      experience: model?.experience.length ?? 0,
      projects: model?.projects.length ?? 0,
      education: model?.education.length ?? 0
    };
  });

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      const parsed = await parseResumeFile(file);
      this.resume.set(parsed);
      this.statusMessage.set(`Loaded ${file.name} successfully.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not parse this file.';
      this.statusMessage.set(message);
    }
  }

  downloadParsedResume(): void {
    const model = this.resume();
    if (!model) {
      return;
    }

    const blob = new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'resume-visual-data.json';
    link.click();
    URL.revokeObjectURL(url);
  }
}
