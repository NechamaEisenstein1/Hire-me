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

function isFormDataBody(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

function hasResponseBody(response: Response): boolean {
  if (response.status === 204 || response.status === 205) {
    return false;
  }
  const contentLength = response.headers.get('content-length');
  if (contentLength === '0') {
    return false;
  }
  const contentType = response.headers.get('content-type');
  return contentType !== null && contentType.length > 0;
}

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
  private readonly timeoutMs = environment.apiRequestTimeoutMs;

  private async request(input: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (error: unknown) {
      if (
        controller.signal.aborted ||
        (error instanceof DOMException && error.name === 'AbortError')
      ) {
        throw new ApiError(
          504,
          'The request took too long and timed out. Please try again.'
        );
      }
      throw error;
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  }

  async get<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.request(`${this.baseUrl}${path}`, init);
    if (!response.ok) {
      throw await toApiError(response);
    }
    return (hasResponseBody(response) ? await response.json() : undefined) as T;
  }

  async post<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers ?? {});
    const usesFormData = isFormDataBody(body);
    if (!usesFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await this.request(`${this.baseUrl}${path}`, {
      ...init,
      method: 'POST',
      headers,
      body: usesFormData ? body : JSON.stringify(body)
    });
    if (!response.ok) {
      throw await toApiError(response);
    }
    return (hasResponseBody(response) ? await response.json() : undefined) as T;
  }

  async put<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers ?? {});
    const usesFormData = isFormDataBody(body);
    if (!usesFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await this.request(`${this.baseUrl}${path}`, {
      ...init,
      method: 'PUT',
      headers,
      body: usesFormData ? body : JSON.stringify(body)
    });
    if (!response.ok) {
      throw await toApiError(response);
    }
    return (hasResponseBody(response) ? await response.json() : undefined) as T;
  }
}
