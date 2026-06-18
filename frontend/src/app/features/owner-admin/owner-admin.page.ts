import { DatePipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiError, ApiService } from '../../core/services/api.service';
import { AdminTodayStats, AnalyticsService } from '../../core/services/analytics.service';
import { ParsedResume, parseResumeFile } from '../resume-studio/resume-parser';
import { environment } from '../../../environments/environment';

type VerifyResponse = { valid: boolean };

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './owner-admin.page.html',
  styleUrl: './owner-admin.page.css'
})
export class OwnerAdminPage implements OnDestroy {
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
  readonly activeVisitors = signal<number | null>(null);
  readonly isPresenceConnected = signal(false);

  private visitorsSocket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private socketClosedManually = false;

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
      this.connectVisitorsPresence();
      await this.refreshTodayStats();
    } catch (error: unknown) {
      this.ownerUnlocked.set(false);
      this.disconnectVisitorsPresence();
      this.statusMessage.set(error instanceof ApiError ? error.message : 'Owner verification failed.');
    } finally {
      this.isVerifyingOwner.set(false);
    }
  }

  ngOnDestroy(): void {
    this.disconnectVisitorsPresence();
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
      const profileToSave = normalizePublishProfile(profile, this.resumeFileName());
      const publishPayload = { profile: profileToSave };

      if (!environment.production) {
        console.info('Resume publish payload', {
          endpoint: '/api/v1/resume-profile',
          payload: publishPayload,
        });
      }

      await this.api.put<ParsedResume>('/api/v1/resume-profile', publishPayload, {
        headers: { 'X-Resume-Owner-Token': token }
      });

      // Upload the actual file separately if available
      if (file) {
        if (!environment.production) {
          console.info('Resume file upload payload', {
            endpoint: '/api/v1/resume-profile/file',
            fileName: file.name,
            size: file.size,
            type: file.type,
          });
        }
        const formData = new FormData();
        formData.append('file', file, file.name);
        await this.api.post('/api/v1/resume-profile/file', formData, {
          headers: { 'X-Resume-Owner-Token': token }
        });
      }

      this.statusMessage.set('Resume published successfully. Public site is updated.');
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 422) {
        console.error('Publish request failed with 422. Check logged payload structure and field values.');
      }
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

  private connectVisitorsPresence(): void {
    if (!this.ownerUnlocked() || typeof WebSocket === 'undefined' || this.visitorsSocket) {
      return;
    }

    if (this.reconnectTimer) {
      globalThis.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.socketClosedManually = false;

    let socket: WebSocket;
    try {
      socket = new WebSocket(this.buildVisitorsWsUrl());
    } catch {
      this.isPresenceConnected.set(false);
      this.schedulePresenceReconnect();
      return;
    }

    this.visitorsSocket = socket;

    socket.onopen = () => {
      this.isPresenceConnected.set(true);
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as { active_visitors?: unknown };
        if (typeof payload.active_visitors === 'number') {
          this.activeVisitors.set(payload.active_visitors);
        }
      } catch {
        // Ignore malformed payloads so presence stream stays resilient.
      }
    };

    socket.onerror = () => {
      this.isPresenceConnected.set(false);
    };

    socket.onclose = () => {
      this.visitorsSocket = null;
      this.isPresenceConnected.set(false);

      this.schedulePresenceReconnect();
    };
  }

  private schedulePresenceReconnect(): void {
    if (this.socketClosedManually || !this.ownerUnlocked() || this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = globalThis.setTimeout(() => {
      this.reconnectTimer = null;
      this.connectVisitorsPresence();
    }, 1500);
  }

  private disconnectVisitorsPresence(): void {
    if (this.reconnectTimer) {
      globalThis.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.socketClosedManually = true;
    this.isPresenceConnected.set(false);
    this.activeVisitors.set(null);

    if (this.visitorsSocket) {
      this.visitorsSocket.close();
      this.visitorsSocket = null;
    }
  }

  private buildVisitorsWsUrl(): string {
    const configuredApiBase = environment.apiBaseUrl.trim();
    const resolvedBase = configuredApiBase ? new URL(configuredApiBase, globalThis.location.origin) : new URL(globalThis.location.origin);

    resolvedBase.protocol = resolvedBase.protocol === 'https:' ? 'wss:' : 'ws:';
    resolvedBase.pathname = '/ws/visitors';
    resolvedBase.search = '';
    resolvedBase.hash = '';

    return resolvedBase.toString();
  }
}

function normalizePublishProfile(profile: ParsedResume, resumeFileName: string | null): ParsedResume {
  return {
    ...profile,
    resumeFileName: resumeFileName ?? profile.resumeFileName,
    summary: profile.summary.trim(),
    skills: dedupeStrings(profile.skills),
    experience: profile.experience.map((item) => ({
      role: item.role.trim(),
      company: item.company.trim(),
      period: item.period.trim(),
      highlights: dedupeStrings(item.highlights),
    })),
    projects: profile.projects.map((item) => ({
      name: item.name.trim(),
      summary: item.summary.trim(),
      stack: dedupeStrings(item.stack),
    })),
    education: profile.education.map((item) => ({
      degree: item.degree.trim(),
      school: item.school.trim(),
      period: item.period.trim(),
    })),
  };
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }

  return result;
}
