import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiError, ApiService } from '../../core/services/api.service';
import { AdminTodayStats, AnalyticsService } from '../../core/services/analytics.service';
import { ParsedResume, parseResumeFile } from '../resume-studio/resume-parser';

type VerifyResponse = { valid: boolean };

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <section class="grid gap-6">
      <div class="rounded-3xl border border-brand-200/70 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-brand-700/60 dark:bg-brand-900/45 md:p-8">
        <p class="m-0 text-xs uppercase tracking-[0.18em] opacity-70">Owner Admin</p>
        <h2 class="m-0 mt-2 text-3xl font-bold tracking-tight md:text-4xl">Private Management Panel</h2>
        <p class="m-0 mt-3 max-w-2xl text-sm leading-6 opacity-80 md:text-base">
          This panel is only for you. Use your owner token to view daily metrics and publish an updated resume profile.
        </p>
      </div>

      <div class="rounded-2xl border border-brand-200/70 bg-white/80 p-5 shadow-sm dark:border-brand-700/60 dark:bg-brand-900/40">
        <div class="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label class="grid gap-1">
            <span class="text-xs uppercase tracking-[0.12em] opacity-70">Owner Token</span>
            <input
              [ngModel]="ownerTokenInput()"
              (ngModelChange)="ownerTokenInput.set($event)"
              type="password"
              placeholder="Enter owner token"
              class="w-full rounded-lg border border-brand-300 bg-white p-2 text-sm dark:border-brand-700 dark:bg-brand-950/60"
            />
          </label>
          <button
            type="button"
            (click)="unlockOwnerMode()"
            [disabled]="isVerifyingOwner() || !ownerTokenInput().trim()"
            class="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ isVerifyingOwner() ? 'Verifying...' : ownerUnlocked() ? 'Unlocked' : 'Unlock Admin' }}
          </button>
        </div>
        <p class="m-0 mt-3 rounded-lg bg-brand-100/80 px-3 py-2 text-sm dark:bg-brand-800/50">{{ statusMessage() }}</p>
      </div>

      @if (ownerUnlocked()) {
        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-2xl border border-brand-200/70 bg-white/80 p-5 shadow-sm dark:border-brand-700/60 dark:bg-brand-900/40">
            <p class="m-0 text-xs uppercase tracking-[0.12em] opacity-70">Visitors Today</p>
            <p class="m-0 mt-2 text-4xl font-bold">{{ todayStats().visitors_today }}</p>
          </div>

          <div class="rounded-2xl border border-brand-200/70 bg-white/80 p-5 shadow-sm dark:border-brand-700/60 dark:bg-brand-900/40">
            <p class="m-0 text-xs uppercase tracking-[0.12em] opacity-70">CV Downloads Today</p>
            <p class="m-0 mt-2 text-4xl font-bold">{{ todayStats().resume_downloads_today }}</p>
          </div>
        </div>

        <div class="rounded-2xl border border-brand-200/70 bg-white/80 p-5 shadow-sm dark:border-brand-700/60 dark:bg-brand-900/40">
          <h3 class="m-0 text-xl font-semibold">Update Resume Profile</h3>
          <p class="m-0 mt-2 text-sm opacity-80">Upload JSON/TXT/MD/PDF/DOCX, review the parsed result, and publish.</p>

          <label
            class="mt-4 block cursor-pointer rounded-xl border-2 border-dashed border-brand-300 p-4 text-center transition hover:border-brand-500 dark:border-brand-700 dark:hover:border-brand-500"
            (dragover)="onDragOver($event)"
            (drop)="onDrop($event)"
          >
            <input type="file" class="hidden" accept=".json,.txt,.md,.pdf,.docx" (change)="onFileSelected($event)" />
            <span class="text-sm font-medium">Click or drag file here</span>
          </label>

          <div class="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              (click)="publishResume()"
              [disabled]="isPublishing() || !resume()"
              class="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ isPublishing() ? 'Publishing...' : 'Publish Updated Resume' }}
            </button>
            <button
              type="button"
              (click)="refreshTodayStats()"
              class="rounded-lg border border-brand-400 px-4 py-2 text-sm font-semibold hover:bg-brand-100 dark:hover:bg-brand-800/60"
            >
              Refresh Metrics
            </button>
          </div>

          @if (resume(); as model) {
            <div class="mt-4 rounded-xl border border-brand-200 p-4 dark:border-brand-700">
              <p class="m-0 text-xs uppercase tracking-[0.12em] opacity-70">Parsed Preview</p>
              <p class="m-0 mt-2 text-lg font-semibold">{{ model.name }} · {{ model.title }}</p>
              <p class="m-0 mt-1 text-sm opacity-80">{{ model.location }} · {{ model.email }}</p>
              <p class="m-0 mt-2 text-sm leading-6 opacity-90">{{ model.summary }}</p>
              <p class="m-0 mt-3 text-xs uppercase tracking-[0.1em] opacity-70">
                Skills {{ model.skills.length }} · Experience {{ model.experience.length }} · Projects {{ model.projects.length }} · Education {{ model.education.length }}
              </p>
            </div>
          }
        </div>
      }

      <p class="text-xs opacity-70">Last updated: {{ now | date : 'medium' }}</p>
    </section>
  `
})
export class OwnerAdminPage {
  private readonly api = inject(ApiService);
  private readonly analytics = inject(AnalyticsService);
  private static readonly ownerTokenStorageKey = 'resume-owner-token';

  readonly now = new Date();
  readonly ownerTokenInput = signal(globalThis.sessionStorage.getItem(OwnerAdminPage.ownerTokenStorageKey) ?? '');
  readonly ownerUnlocked = signal(false);
  readonly isVerifyingOwner = signal(false);
  readonly isPublishing = signal(false);
  readonly isParsing = signal(false);
  readonly statusMessage = signal('Enter owner token to unlock private admin controls.');
  readonly resume = signal<ParsedResume | null>(null);
  readonly todayStats = signal<AdminTodayStats>({ visitors_today: 0, resume_downloads_today: 0 });

  readonly canPublish = computed(() => this.ownerUnlocked() && !!this.resume() && !this.isPublishing());

  async unlockOwnerMode(): Promise<void> {
    const token = this.ownerTokenInput().trim();
    if (!token) {
      return;
    }

    this.isVerifyingOwner.set(true);
    try {
      await this.api.post<VerifyResponse>('/api/v1/resume-profile/verify', {}, {
        headers: { 'X-Resume-Owner-Token': token }
      });
      this.ownerUnlocked.set(true);
      globalThis.sessionStorage.setItem(OwnerAdminPage.ownerTokenStorageKey, token);
      this.statusMessage.set('Admin unlocked successfully.');
      await this.refreshTodayStats();
    } catch (error: unknown) {
      this.ownerUnlocked.set(false);
      this.statusMessage.set(error instanceof ApiError ? error.message : 'Owner verification failed.');
    } finally {
      this.isVerifyingOwner.set(false);
    }
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
    await this.parseResume(file);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    await this.parseResume(file);
  }

  async publishResume(): Promise<void> {
    if (!this.canPublish()) {
      return;
    }

    const token = this.ownerTokenInput().trim();
    const profile = this.resume();
    if (!token || !profile) {
      return;
    }

    this.isPublishing.set(true);
    try {
      await this.api.put<ParsedResume>('/api/v1/resume-profile', { profile }, {
        headers: { 'X-Resume-Owner-Token': token }
      });
      this.statusMessage.set('Resume published successfully. Public site is updated.');
    } catch (error: unknown) {
      this.statusMessage.set(error instanceof ApiError ? error.message : 'Failed to publish resume.');
    } finally {
      this.isPublishing.set(false);
    }
  }

  async refreshTodayStats(): Promise<void> {
    const token = this.ownerTokenInput().trim();
    if (!token || !this.ownerUnlocked()) {
      return;
    }

    try {
      const stats = await this.analytics.getAdminTodayStats(token);
      this.todayStats.set(stats);
    } catch (error: unknown) {
      this.statusMessage.set(error instanceof ApiError ? error.message : 'Unable to load daily metrics.');
    }
  }

  private async parseResume(file: File): Promise<void> {
    this.isParsing.set(true);
    this.statusMessage.set(`Parsing ${file.name}...`);
    try {
      const parsed = await parseResumeFile(file);
      this.resume.set(parsed);
      this.statusMessage.set(`Parsed ${file.name}. Review and publish.`);
    } catch (error: unknown) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Could not parse resume file.');
    } finally {
      this.isParsing.set(false);
    }
  }
}
