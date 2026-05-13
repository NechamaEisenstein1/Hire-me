import { Injectable, inject } from '@angular/core';

import { ApiService } from './api.service';

export type Project = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  repo_url: string;
  live_url: string | null;
  featured: boolean;
  created_at: string;
};

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly api = inject(ApiService);

  async getProjects(): Promise<Project[]> {
    return this.api.get<Project[]>('/api/v1/projects');
  }
}
