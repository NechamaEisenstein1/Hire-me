import { Injectable } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WsService {
  connect<T>(url: string): Observable<T> {
    return new Observable<T>((subscriber: Subscriber<T>) => {
      const socket = new WebSocket(url);

      socket.onmessage = (event) => {
        try {
          subscriber.next(JSON.parse(event.data) as T);
        } catch {
          subscriber.error(new Error('Invalid WebSocket payload'));
        }
      };

      socket.onerror = () => subscriber.error(new Error('WebSocket error'));
      socket.onclose = () => subscriber.complete();

      const ping = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send('ping');
        }
      }, 15000);

      return () => {
        clearInterval(ping);
        socket.close();
      };
    });
  }
}
