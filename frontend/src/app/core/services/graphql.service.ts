import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GraphqlService {
  private readonly graphqlUrl = environment.graphqlUrl;

  async query<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(this.graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      data?: T;
      errors?: Array<{ message?: string } | string>;
    };
    if (payload.errors?.length) {
      const firstError = payload.errors[0];
      const errorMessage =
        typeof firstError === 'string'
          ? firstError
          : firstError?.message ?? 'GraphQL responded with errors';
      throw new Error(`GraphQL responded with errors: ${errorMessage}`);
    }

    if (!payload.data) {
      throw new Error('GraphQL returned no data');
    }

    return payload.data;
  }
}
