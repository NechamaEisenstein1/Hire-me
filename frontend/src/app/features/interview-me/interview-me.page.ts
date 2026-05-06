import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiError } from '../../core/services/api.service';
import { ChatbotService } from '../../core/services/chatbot.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="mx-auto max-w-4xl px-4 py-8 md:px-8">
    <section class="rounded-2xl border border-brand-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-brand-700/60 dark:bg-brand-900/35">
      <h2 class="mb-4 text-2xl font-semibold">Interview Me</h2>
      <div class="grid gap-3">
        <textarea [(ngModel)]="question" rows="4" class="w-full rounded-lg border border-brand-300 bg-white p-3 dark:border-brand-700 dark:bg-brand-950/60" placeholder="Ask about architecture decisions, tradeoffs, and delivery." [disabled]="isLoading()" [attr.dir]="containsHebrew(question) ? 'rtl' : 'ltr'" [class.text-right]="containsHebrew(question)" [class.text-left]="!containsHebrew(question)"></textarea>
        <button type="button" (click)="ask()" class="w-fit rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60" [disabled]="!canAsk()">{{ isLoading() ? 'Thinking...' : 'Ask AI' }}</button>
      </div>
      <div class="mt-4 rounded-xl border border-brand-200/70 bg-white/70 p-4 dark:border-brand-700/60 dark:bg-brand-950/30" [attr.dir]="answerDirection()" [class.text-right]="answerDirection() === 'rtl'" [class.text-left]="answerDirection() === 'ltr'">
        <p class="m-0 whitespace-pre-wrap leading-8" [class.text-red-600]="isError()" [class.dark:text-red-300]="isError()">{{ answer() }}</p>
      </div>
    </section>
    </div>
  `
})
export class InterviewMePage {
  question = '';
  readonly answer = signal('');
  readonly answerDirection = signal<'rtl' | 'ltr'>('ltr');
  readonly isLoading = signal(false);
  readonly isError = signal(false);

  constructor(private readonly chatbot: ChatbotService) {}

  canAsk(): boolean {
    return !this.isLoading() && this.question.trim().length > 0;
  }

  async ask(): Promise<void> {
    if (this.isLoading()) {
      return;
    }
    const prompt = this.question.trim();
    if (!prompt) {
      return;
    }

    this.isLoading.set(true);
    this.isError.set(false);
    try {
      const response = await this.chatbot.ask(prompt);
      this.setAnswerMessage(response, false);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        this.setAnswerMessage(
          error.message?.trim() || 'Unable to get a response right now. Please try again in a moment.',
          true
        );
      } else {
        this.setAnswerMessage(
          this.containsHebrew(prompt)
            ? 'כרגע לא הצלחתי לטעון תשובה. אפשר לנסות שוב בעוד רגע.'
            : 'Unable to get a response right now. Please try again in a moment.',
          true
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  private setAnswerMessage(message: string, isError: boolean): void {
    this.isError.set(isError);
    this.answer.set(message);
    this.answerDirection.set(this.containsHebrew(message) ? 'rtl' : 'ltr');
  }

  containsHebrew(text: string): boolean {
    return /[\u0590-\u05FF]/.test(text);
  }
}
