import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { VisitorCounterWidget } from '../visitor-counter/visitor-counter.widget';

@Component({
  standalone: true,
  imports: [RouterLink, VisitorCounterWidget],
  template: `
    <section class="grid gap-6">
      <app-visitor-counter />
      <div class="rounded-2xl border border-brand-200/70 bg-white/70 p-8 shadow-sm backdrop-blur-sm dark:border-brand-700/60 dark:bg-brand-900/35">
        <h2 class="mb-3 text-3xl font-semibold tracking-tight">Build, run, hire.</h2>
        <p class="mb-6 max-w-2xl text-base leading-7 opacity-90">
          This portfolio is engineered as a production system: async API, hybrid GraphQL and REST,
          realtime channels, 3D storytelling, and deploy-ready infrastructure.
        </p>
        <div class="flex flex-wrap gap-3">
          <a routerLink="/resume-3d" class="rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white no-underline hover:bg-brand-700">Open 3D Resume</a>
          <a routerLink="/interview-me" class="rounded-lg border border-brand-400 px-5 py-3 text-sm font-semibold no-underline hover:bg-brand-100 dark:hover:bg-brand-800/60">Interview Me</a>
        </div>
      </div>
    </section>
  `
})
export class HomePage {}
