import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AgentStatusComponent } from '../agent-status/agent-status.component';
import { TypingIndicatorComponent } from '../typing-indicator/typing-indicator.component';
import { ChatMessage } from '../../models/chat.models';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [AgentStatusComponent, TypingIndicatorComponent, DatePipe],
  template: `
    <div class="message-row" [class.user-row]="msg().role === 'user'">

      @if (msg().role === 'assistant') {
        <div class="avatar assistant-avatar">🛍️</div>
      }

      <div class="bubble" [class.user-bubble]="msg().role === 'user'"
                          [class.assistant-bubble]="msg().role === 'assistant'">

        <!-- Agent steps (collapsed accordion feel) -->
        @if (msg().role === 'assistant' && msg().agentSteps?.length) {
          <app-agent-status [steps]="msg().agentSteps!" />
        }

        <!-- Typing indicator while waiting for final response -->
        @if (msg().isStreaming && !msg().content) {
          <app-typing-indicator label="Agents working..." />
        }

        <!-- Main message content -->
        @if (msg().content) {
          <div class="message-text" [innerHTML]="msg().content"></div>
        }

        <!-- Streaming cursor -->
        @if (msg().isStreaming && msg().content) {
          <span class="cursor">▍</span>
        }

        <span class="timestamp">
          {{ msg().timestamp | date: 'HH:mm' }}
        </span>
      </div>

      @if (msg().role === 'user') {
        <div class="avatar user-avatar">👤</div>
      }

    </div>
  `,
  styles: [`
    .message-row {
      display: flex; align-items: flex-start; gap: 10px; margin-bottom: 16px;
    }
    .user-row { flex-direction: row-reverse; }
    .avatar {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    .assistant-avatar { background: #eef2ff; }
    .user-avatar { background: #f0fdf4; }
    .bubble {
      max-width: 70%; padding: 12px 16px; border-radius: 16px;
      font-size: 14px; line-height: 1.6; position: relative;
    }
    .assistant-bubble {
      background: #fff; border: 1px solid #e5e7eb;
      border-top-left-radius: 4px;
    }
    .user-bubble {
      background: #6366f1; color: white;
      border-top-right-radius: 4px;
    }
    .message-text { white-space: pre-wrap; }
    .cursor {
      display: inline-block; animation: blink 1s infinite; color: #6366f1;
    }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
    .timestamp {
      display: block; font-size: 10px; color: #9ca3af; margin-top: 6px; text-align: right;
    }
    .user-bubble .timestamp { color: rgba(255,255,255,0.7); }
  `]
})
export class MessageComponent {
  msg = input.required<ChatMessage>();
}
