import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatButtonModule],
  template: `
    <main class="min-h-screen p-6 md:p-10">
      <header class="mb-10 flex items-center justify-between rounded-2xl border border-brand-200/70 bg-white/70 px-6 py-4 shadow-sm backdrop-blur-sm dark:border-brand-700/60 dark:bg-brand-900/35">
        <h1 class="text-xl font-bold tracking-tight">Hire Me</h1>
        <button mat-stroked-button color="primary" (click)="toggleTheme()">
          {{ darkMode() ? 'Light' : 'Dark' }} mode
        </button>
      </header>

      <section class="rounded-2xl border border-brand-200/70 bg-white/70 p-8 shadow-sm backdrop-blur-sm dark:border-brand-700/60 dark:bg-brand-900/35">
        <h2 class="mb-3 text-3xl font-semibold tracking-tight">Production portfolio in progress</h2>
        <p class="m-0 text-base leading-7 opacity-90">
          Foundation is ready. Next files will add REST + GraphQL API clients, realtime visitor WebSocket,
          Three.js resume scene, and Interview Me chatbot.
        </p>
      </section>

      <router-outlet />
    </main>
  `
})
export class AppComponent {
  readonly darkMode = signal(false);

  toggleTheme(): void {
    this.darkMode.update((value: boolean) => !value);
    document.documentElement.classList.toggle('dark', this.darkMode());
  }
}
