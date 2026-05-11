import { Injectable, inject } from '@angular/core';

import { ApiService } from './api.service';

export type GitHubRepo = {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
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
   * Fetches and ranks repos for a given username, returning up to 12 results.
   * Prefers non-fork, non-archived repos sorted by stars then recency.
   */
  async fetchRepos(username: string, signal?: AbortSignal): Promise<GitHubRepo[]> {
    const response = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated&type=owner`,
      { signal },
    );
    if (!response.ok) {
      throw new Error(`GitHub API ${response.status}`);
    }
    const all = (await response.json()) as GitHubRepo[];
    const ranked = all
      .filter((repo) => !repo.fork && !repo.archived)
      .sort((a, b) => b.stargazers_count - a.stargazers_count || b.updated_at.localeCompare(a.updated_at))
      .slice(0, 12);
    return ranked.length > 0 ? ranked : all.filter((repo) => !repo.archived).slice(0, 12);
  }
}
