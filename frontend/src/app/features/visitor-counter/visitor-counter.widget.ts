import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';

import { environment } from '../../../environments/environment';
import { WsService } from '../../core/services/ws.service';

type VisitorPayload = {
  active_visitors: number;
};

@Component({
  selector: 'app-visitor-counter',
  standalone: true,
  template: `
    <div class="inline-flex items-center gap-2 rounded-full border border-brand-300 bg-brand-100 px-4 py-2 text-sm font-medium text-brand-900 dark:border-brand-600 dark:bg-brand-800/70 dark:text-brand-100">
      <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
      <span>{{ count() }} visitors live</span>
    </div>
  `
})
export class VisitorCounterWidget implements OnInit, OnDestroy {
  readonly count = signal(0);
  private subscription?: Subscription;

  constructor(private readonly ws: WsService) {}

  ngOnInit(): void {
    this.subscription = this.ws
      .connect<VisitorPayload>(environment.wsVisitorsUrl)
      .subscribe((payload: VisitorPayload) => this.count.set(payload.active_visitors));
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
