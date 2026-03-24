import { Injectable } from '@angular/core';

import { ApiService } from './api.service';

export type AdminTodayStats = {
  visitors_today: number;
  resume_downloads_today: number;
};

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(private readonly api: ApiService) {}

  async trackVisit(): Promise<void> {
    await this.api.post<unknown>('/api/v1/analytics/visit', {});
  }

  async trackResumeDownload(): Promise<void> {
    await this.api.post<unknown>('/api/v1/analytics/resume-download', {});
  }

  async getAdminTodayStats(ownerToken: string): Promise<AdminTodayStats> {
    return this.api.get<AdminTodayStats>('/api/v1/analytics/admin/today', {
      headers: { 'X-Resume-Owner-Token': ownerToken }
    });
  }
}
