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
  templateUrl: './owner-admin.page.html',
  styleUrl: './owner-admin.page.css'
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
  readonly resumeFileName = signal<string | null>(null);
  readonly resumeFile = signal<File | null>(null);
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
    const file = this.resumeFile();
    if (!token || !profile) {
      return;
    }

    this.isPublishing.set(true);
    try {
      const profileToSave = { ...profile, resumeFileName: this.resumeFileName() };
      await this.api.put<ParsedResume>('/api/v1/resume-profile', { profile: profileToSave }, {
        headers: { 'X-Resume-Owner-Token': token }
      });

      // Upload the actual file separately if available
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        await this.api.post('/api/v1/resume-profile/file', formData, {
          headers: { 'X-Resume-Owner-Token': token }
        });
      }

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
      this.resumeFileName.set(file.name);
      this.resumeFile.set(file);
      this.statusMessage.set(`Parsed ${file.name}. Review and publish.`);
    } catch (error: unknown) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Could not parse resume file.');
    } finally {
      this.isParsing.set(false);
    }
  }
}
