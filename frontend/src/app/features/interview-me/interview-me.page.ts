import { AfterViewChecked, Component, ElementRef, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiError } from '../../core/services/api.service';
import { ChatbotService } from '../../core/services/chatbot.service';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  isError?: boolean;
  dir: 'ltr' | 'rtl';
}

@Component({
  standalone: true,
  imports: [FormsModule],
  templateUrl: './interview-me.page.html',
})
export class InterviewMePage implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  question = '';
  readonly messages = signal<ChatMessage[]>([]);
  readonly isLoading = signal(false);
  private shouldScrollToBottom = false;

  readonly suggestedQuestions = [
    'What architecture decisions shaped this project?',
    'Walk me through the AI chat integration.',
    'How do you manage async DB operations and connection pooling?',
    'What tradeoffs did you make when choosing this tech stack?',
    'How is JWT authentication and rate limiting implemented?',
    'מה הניסיון שלך עם פריסה לענן ו-Terraform?',
  ];

  constructor(private readonly chatbot: ChatbotService) {}

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  canAsk(): boolean {
    return !this.isLoading() && this.question.trim().length > 0;
  }

  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.ask();
    }
  }

  askSuggested(q: string): void {
    this.question = q;
    this.ask();
  }

  clearConversation(): void {
    this.messages.set([]);
    this.question = '';
  }

  async ask(): Promise<void> {
    if (!this.canAsk()) return;

    const prompt = this.question.trim();
    this.question = '';

    this.messages.update(msgs => [
      ...msgs,
      { role: 'user', text: prompt, dir: this.containsHebrew(prompt) ? 'rtl' : 'ltr' },
    ]);
    this.shouldScrollToBottom = true;

    this.isLoading.set(true);
    try {
      const response = await this.chatbot.ask(prompt);
      this.messages.update(msgs => [
        ...msgs,
        { role: 'ai', text: response, dir: this.containsHebrew(response) ? 'rtl' : 'ltr' },
      ]);
    } catch (error: unknown) {
      const errorText = this.buildErrorMessage(error, prompt);
      this.messages.update(msgs => [
        ...msgs,
        { role: 'ai', text: errorText, isError: true, dir: this.containsHebrew(errorText) ? 'rtl' : 'ltr' },
      ]);
    } finally {
      this.isLoading.set(false);
      this.shouldScrollToBottom = true;
    }
  }

  containsHebrew(text: string): boolean {
    return /[\u0590-\u05FF]/.test(text);
  }

  private buildErrorMessage(error: unknown, prompt: string): string {
    if (error instanceof ApiError && error.status === 429) {
      return 'You have reached the daily message limit (5/day). Please try again tomorrow. | הגעת למגבלת ההודעות היומית (5 ביום). אפשר לנסות שוב מחר.';
    }
    if (error instanceof ApiError) {
      return error.message?.trim() || 'Unable to get a response right now. Please try again in a moment.';
    }
    return this.containsHebrew(prompt)
      ? 'כרגע לא הצלחתי לטעון תשובה. אפשר לנסות שוב בעוד רגע.'
      : 'Unable to get a response right now. Please try again in a moment.';
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
