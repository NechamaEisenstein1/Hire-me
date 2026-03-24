import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { VisitorCounterWidget } from '../visitor-counter/visitor-counter.widget';

@Component({
  standalone: true,
  imports: [RouterLink, VisitorCounterWidget],
  template: `
    <section class="grid gap-6 md:gap-8">
      <app-visitor-counter />

      <div class="rounded-3xl border border-brand-200/70 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-brand-700/60 dark:bg-brand-900/45 md:p-10">
        <p class="m-0 text-xs uppercase tracking-[0.18em] opacity-70">Portfolio Experience</p>
        <h2 class="m-0 mt-3 text-4xl font-bold tracking-tight md:text-5xl">Build, run, and get hired.</h2>
        <p class="m-0 mt-4 max-w-3xl text-base leading-7 opacity-90 md:text-lg">
          A live product showcase with API integrations, realtime telemetry, AI interview workflows,
          and now a visual Resume Studio where your CV data becomes an interactive profile.
        </p>

        <div class="mt-6 flex flex-wrap gap-3">
          <a routerLink="/resume-studio" class="rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white no-underline hover:bg-brand-800">
            Open Resume Studio
          </a>
          <a href="/public/resume-template.json" download class="rounded-xl border border-brand-400 px-5 py-3 text-sm font-semibold no-underline hover:bg-brand-100 dark:hover:bg-brand-800/60">
            Download Resume Template
          </a>
          <a routerLink="/interview-me" class="rounded-xl border border-brand-400 px-5 py-3 text-sm font-semibold no-underline hover:bg-brand-100 dark:hover:bg-brand-800/60">
            Interview Me
          </a>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <a routerLink="/resume-studio" class="group rounded-2xl border border-brand-200/70 bg-white/75 p-5 no-underline shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-brand-700/60 dark:bg-brand-900/35">
          <p class="m-0 text-xs uppercase tracking-[0.12em] opacity-70">Resume Studio</p>
          <h3 class="m-0 mt-2 text-xl font-semibold text-inherit">Upload + Visualize CV</h3>
          <p class="m-0 mt-2 text-sm leading-6 opacity-80">Upload resume data and transform it into a polished visual timeline, projects board, and skills map.</p>
        </a>

        <a routerLink="/resume-3d" class="group rounded-2xl border border-brand-200/70 bg-white/75 p-5 no-underline shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-brand-700/60 dark:bg-brand-900/35">
          <p class="m-0 text-xs uppercase tracking-[0.12em] opacity-70">3D Scene</p>
          <h3 class="m-0 mt-2 text-xl font-semibold text-inherit">Interactive Resume</h3>
          <p class="m-0 mt-2 text-sm leading-6 opacity-80">Explore a realtime 3D card scene powered by Three.js and GSAP motion loops.</p>
        </a>

        <a routerLink="/interview-me" class="group rounded-2xl border border-brand-200/70 bg-white/75 p-5 no-underline shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-brand-700/60 dark:bg-brand-900/35">
          <p class="m-0 text-xs uppercase tracking-[0.12em] opacity-70">AI Layer</p>
          <h3 class="m-0 mt-2 text-xl font-semibold text-inherit">Interview Assistant</h3>
          <p class="m-0 mt-2 text-sm leading-6 opacity-80">Ask architecture and delivery questions and get contextual answers from the chatbot service.</p>
        </a>
      </div>
    </section>
  `
})
export class HomePage {}
