import { Injectable } from '@angular/core';

import { ApiService } from './api.service';

type ChatResponse = {
  answer: string;
};

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  constructor(private readonly api: ApiService) {}

  async ask(question: string): Promise<string> {
    const response = await this.api.post<ChatResponse>('/api/v1/chat/messages', { question });
    return response.answer;
  }
}
