import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { StreamEvent } from '../models/chat.models';

@Injectable({ providedIn: 'root' })
export class StreamService {

  private readonly BASE_URL = 'http://localhost:3000/api';

  // Stream chat using fetch + ReadableStream (SSE via POST)
  streamChat(message: string): Observable<StreamEvent> {
    return new Observable<StreamEvent>(observer => {
      const controller = new AbortController();

      fetch(`${this.BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: controller.signal
      }).then(async (response) => {
        if (!response.ok) {
          observer.error(new Error(`HTTP error: ${response.status}`));
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event: StreamEvent = JSON.parse(line.slice(6));
                observer.next(event);
                if (event.type === 'stream_end' || event.type === 'error') {
                  observer.complete();
                  return;
                }
              } catch {
                // skip malformed lines
              }
            }
          }
        }
        observer.complete();

      }).catch(err => {
        if (err.name !== 'AbortError') observer.error(err);
      });

      // Cleanup: abort fetch when observable unsubscribes
      return () => controller.abort();
    });
  }
}
