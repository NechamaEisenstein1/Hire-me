import { Injectable, inject } from '@angular/core';

import { ApiService } from './api.service';
import { Project } from './projects.service';

export type GitHubRepo = {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  created_at: string;
  updated_at: string;
  fork: boolean;
  archived: boolean;
};

type GitHubStatsResponse = {
  username: string;
};

@Injectable({ providedIn: 'root' })
export class GitHubService {
  private readonly api = inject(ApiService);

  /**
   * Resolves the GitHub username from the resume profile, falling back to
   * the backend stats endpoint. Returns null when neither source provides one.
   */
  async resolveUsername(profileUsername?: string | null): Promise<string | null> {
    const fromProfile = profileUsername?.trim();
    if (fromProfile) {
      return fromProfile;
    }

    try {
      const stats = await this.api.get<GitHubStatsResponse>('/api/v1/github/stats');
      return stats.username?.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Fetches ranked repos via the backend proxy (uses server-side token + TTL cache).
   * Avoids direct browser→GitHub calls that are subject to rate limiting.
   */
  async fetchRepos(): Promise<GitHubRepo[]> {
    return this.api.get<GitHubRepo[]>('/api/v1/github/repos');
  }

  /**
   * Maps GitHub repos to the shared Project shape used across all pages.
   * Single source of truth for the repo→project transformation.
   */
  mapReposToProjects(repos: GitHubRepo[]): Project[] {
    return repos.map((r) => ({
      id: r.id,
      slug: r.name,
      title: r.name,
      summary: r.description || r.name,
      repo_url: r.html_url,
      live_url: r.homepage || null,
      featured: false,
      created_at: r.created_at,
    }));
  }
}
