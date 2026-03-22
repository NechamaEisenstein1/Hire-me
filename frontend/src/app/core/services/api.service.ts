import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ErrorPayload = {
  detail?: string;
};

async function toApiError(response: Response): Promise<ApiError> {
  let detail = `Request failed: ${response.status}`;

  try {
    const payload = (await response.json()) as ErrorPayload;
    if (typeof payload.detail === 'string' && payload.detail.trim()) {
      detail = payload.detail;
    }
  } catch {
    // Keep the default error message when response body is not JSON.
  }

  return new ApiError(response.status, detail);
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) {
      throw await toApiError(response);
    }
    return (await response.json()) as T;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw await toApiError(response);
    }
    return (await response.json()) as T;
  }
}
