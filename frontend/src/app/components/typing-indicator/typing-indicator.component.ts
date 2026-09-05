import { Component, input } from '@angular/core';

@Component({
  selector: 'app-typing-indicator',
  standalone: true,
  template: `
    <div class="typing-wrapper">
      <span class="typing-label">{{ label() }}</span>
      <div class="dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  `,
  styles: [`
    .typing-wrapper {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; color: #6366f1; padding: 8px 0;
    }
    .dots { display: flex; gap: 4px; }
    .dots span {
      width: 6px; height: 6px; border-radius: 50%;
      background: #6366f1; animation: bounce 1.2s infinite;
    }
    .dots span:nth-child(2) { animation-delay: 0.2s; }
    .dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }
  `]
})
export class TypingIndicatorComponent {
  label = input('Thinking...');
}
