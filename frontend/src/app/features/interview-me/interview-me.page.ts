import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiError } from '../../core/services/api.service';
import { ChatbotService } from '../../core/services/chatbot.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="mt-8 rounded-2xl border border-brand-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-brand-700/60 dark:bg-brand-900/35">
      <h2 class="mb-4 text-2xl font-semibold">Interview Me</h2>
      <div class="grid gap-3">
        <textarea [(ngModel)]="question" rows="4" class="w-full rounded-lg border border-brand-300 bg-white p-3 dark:border-brand-700 dark:bg-brand-950/60" placeholder="Ask about architecture decisions, tradeoffs, and delivery." [disabled]="isLoading()"></textarea>
        <button type="button" (click)="ask()" class="w-fit rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60" [disabled]="isLoading()">{{ isLoading() ? 'Thinking...' : 'Ask AI' }}</button>
      </div>
      <p class="mt-4 whitespace-pre-wrap leading-7" [class.text-red-600]="isError()" [class.dark:text-red-300]="isError()">{{ answer() }}</p>
    </section>
  `
})
export class InterviewMePage {
  question = '';
  readonly answer = signal('');
  readonly isLoading = signal(false);
  readonly isError = signal(false);

  constructor(private readonly chatbot: ChatbotService) {}

  async ask(): Promise<void> {
    if (this.isLoading()) {
      return;
    }

    if (!this.question.trim()) {
      return;
    }

    this.isLoading.set(true);
    this.isError.set(false);
    try {
      this.answer.set(await this.chatbot.ask(this.question));
    } catch (error: unknown) {
      this.isError.set(true);
      if (error instanceof ApiError) {
        this.answer.set(error.message);
      } else {
        this.answer.set('Unable to get a response right now. Please try again in a moment.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
