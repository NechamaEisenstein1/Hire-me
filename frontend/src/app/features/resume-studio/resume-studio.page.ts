import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiError, ApiService } from '../../core/services/api.service';
import { ParsedResume, parseResumeFile } from './resume-parser';

@Component({
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <section class="grid gap-6">
      <div class="rounded-3xl border border-brand-200/70 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-brand-700/60 dark:bg-brand-900/45 md:p-8">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="m-0 text-xs uppercase tracking-[0.18em] opacity-70">Resume Studio</p>
            <h2 class="m-0 mt-2 text-3xl font-bold tracking-tight md:text-4xl">Turn your resume into a premium visual profile</h2>
            <p class="m-0 mt-3 max-w-2xl text-sm leading-6 opacity-80 md:text-base">
              Recruiters see this polished CV view by default. Resume updates are owner-only
              and can be published with your secure owner token.
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

      <div class="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <aside class="rounded-2xl border border-brand-200/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-brand-700/60 dark:bg-brand-900/40 lg:sticky lg:top-24 lg:self-start">
          <h3 class="m-0 text-lg font-semibold">Owner Controls</h3>
          <p class="m-0 mt-2 text-sm opacity-80">Only you can update the public resume profile.</p>

          <div class="mt-4 grid gap-2">
            <input
              [ngModel]="ownerTokenInput()"
              (ngModelChange)="ownerTokenInput.set($event)"
              type="password"
              placeholder="Owner token"
              class="w-full rounded-lg border border-brand-300 bg-white p-2 text-sm dark:border-brand-700 dark:bg-brand-950/60"
            />
            <button
              type="button"
              (click)="unlockOwnerMode()"
              [disabled]="isVerifyingOwner() || !ownerTokenInput().trim()"
              class="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ isVerifyingOwner() ? 'Verifying...' : ownerUnlocked() ? 'Owner Unlocked' : 'Unlock Owner Mode' }}
            </button>
          </div>

          @if (ownerUnlocked()) {
            <div class="mt-4 rounded-xl border border-brand-300/70 bg-brand-50/60 p-4 dark:border-brand-700 dark:bg-brand-900/45">
              <p class="m-0 text-sm font-semibold">Upload Resume File</p>
              <p class="m-0 mt-1 text-xs opacity-80">Supported: .json, .txt, .md, .pdf, .docx</p>

              <label
                class="mt-3 block cursor-pointer rounded-xl border-2 border-dashed border-brand-300 p-4 text-center transition hover:border-brand-500 dark:border-brand-700 dark:hover:border-brand-500"
                (dragover)="onDragOver($event)"
                (drop)="onDrop($event)"
              >
                <input type="file" class="hidden" accept=".json,.txt,.md,.pdf,.docx" (change)="onFileSelected($event)" />
                <span class="text-xs font-medium">Click or drag file here</span>
              </label>

              <button
                type="button"
                (click)="publishResume()"
                [disabled]="isPublishing() || !resume()"
                class="mt-3 w-full rounded-lg border border-brand-500 px-3 py-2 text-sm font-semibold hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-brand-800/60"
              >
                {{ isPublishing() ? 'Publishing...' : 'Publish Resume To Site' }}
              </button>
            </div>
          } @else {
            <p class="mt-4 rounded-lg bg-brand-100/80 px-3 py-2 text-sm dark:bg-brand-800/50">
              Recruiter mode is active. Resume editing is locked.
            </p>
          }

          <p class="mt-4 rounded-lg bg-brand-100/80 px-3 py-2 text-sm dark:bg-brand-800/50" [class.animate-pulse]="isParsing()">
            {{ statusMessage() }}
          </p>

          @if (resume()) {
            <div class="mt-4 rounded-xl border border-brand-200 p-3 dark:border-brand-700">
              <p class="m-0 text-xs uppercase tracking-[0.12em] opacity-70">Extraction Quality</p>
              <p class="m-0 mt-2 text-sm font-semibold" [class.text-amber-700]="missingSections().length > 0" [class.dark:text-amber-300]="missingSections().length > 0">
                {{ missingSections().length === 0 ? 'Great: all major sections detected' : 'Partial: some sections are missing' }}
              </p>
              @if (missingSections().length > 0) {
                <p class="m-0 mt-2 text-xs opacity-80">Missing: {{ missingSections().join(', ') }}</p>
              }
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
export class ResumeStudioPage implements OnInit {
  private readonly api = inject(ApiService);
  private static readonly ownerTokenStorageKey = 'resume-owner-token';

  readonly now = new Date();
  readonly resume = signal<ParsedResume | null>(null);
  readonly isParsing = signal(false);
  readonly isPublishing = signal(false);
  readonly ownerUnlocked = signal(false);
  readonly isVerifyingOwner = signal(false);
  readonly ownerTokenInput = signal('');
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

  readonly missingSections = computed(() => {
    const model = this.resume();
    if (!model) {
      return [] as string[];
    }

    const missing: string[] = [];
    if (model.summary.length < 30) {
      missing.push('Summary');
    }
    if (model.skills.length === 0) {
      missing.push('Skills');
    }
    if (model.experience.length === 0) {
      missing.push('Experience');
    }
    if (model.education.length === 0) {
      missing.push('Education');
    }
    return missing;
  });

  async ngOnInit(): Promise<void> {
    await this.loadPublicResumeProfile();

    const savedToken = globalThis.localStorage.getItem(ResumeStudioPage.ownerTokenStorageKey);
    if (savedToken) {
      this.ownerTokenInput.set(savedToken);
      await this.unlockOwnerMode();
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    await this.processResumeFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }
    await this.processResumeFile(file);
  }

  async unlockOwnerMode(): Promise<void> {
    const token = this.ownerTokenInput().trim();
    if (!token) {
      return;
    }

    this.isVerifyingOwner.set(true);
    try {
      await this.api.post<{ valid: boolean }>('/api/v1/resume-profile/verify', {}, {
        headers: { 'X-Resume-Owner-Token': token }
      });
      this.ownerUnlocked.set(true);
      globalThis.localStorage.setItem(ResumeStudioPage.ownerTokenStorageKey, token);
      this.statusMessage.set('Owner mode unlocked. You can upload and publish resume updates.');
    } catch (error: unknown) {
      this.ownerUnlocked.set(false);
      const message = error instanceof ApiError ? error.message : 'Owner verification failed.';
      this.statusMessage.set(message);
    } finally {
      this.isVerifyingOwner.set(false);
    }
  }

  async publishResume(): Promise<void> {
    const profile = this.resume();
    const token = this.ownerTokenInput().trim();
    if (!profile || !token) {
      return;
    }

    this.isPublishing.set(true);
    try {
      const updated = await this.api.put<ParsedResume>('/api/v1/resume-profile', { profile }, {
        headers: { 'X-Resume-Owner-Token': token }
      });
      this.resume.set(updated);
      this.statusMessage.set('Resume published successfully. Recruiters now see the updated profile.');
    } catch (error: unknown) {
      const message = error instanceof ApiError ? error.message : 'Could not publish resume.';
      this.statusMessage.set(message);
    } finally {
      this.isPublishing.set(false);
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

  private async processResumeFile(file: File): Promise<void> {
    this.isParsing.set(true);
    this.statusMessage.set(`Parsing ${file.name}...`);

    try {
      const parsed = await parseResumeFile(file);
      this.resume.set(parsed);
      this.statusMessage.set(`Loaded ${file.name} successfully. Review then click Publish.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not parse this file.';
      this.statusMessage.set(message);
    } finally {
      this.isParsing.set(false);
    }
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
