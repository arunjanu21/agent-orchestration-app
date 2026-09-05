import { Component, input } from '@angular/core';
import { AgentStep } from '../../models/chat.models';

@Component({
  selector: 'app-agent-status',
  standalone: true,
  template: `
    <div class="agent-steps">
      @for (step of steps(); track step.timestamp) {
        <div class="agent-step" [class]="'step-' + step.type">

          @if (step.type === 'activated') {
            <span class="step-icon">🤖</span>
            <span class="step-label">{{ step.agentName }}</span>
            <span class="step-content">{{ step.content }}</span>
          }

          @if (step.type === 'tool_call') {
            <span class="step-icon">🔧</span>
            <span class="step-label">{{ step.toolName }}</span>
            <span class="step-content">{{ step.content }}</span>
          }

          @if (step.type === 'complete') {
            <span class="step-icon">✅</span>
            <span class="step-label">{{ step.agentName }}</span>
            <span class="step-content">Done</span>
          }

        </div>
      }
    </div>
  `,
  styles: [`
    .agent-steps { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
    .agent-step {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; padding: 4px 8px; border-radius: 4px;
      background: rgba(99,102,241,0.08); color: #6366f1;
    }
    .step-icon { font-size: 14px; }
    .step-label { font-weight: 600; }
    .step-content { color: #9ca3af; font-size: 11px; }
  `]
})
export class AgentStatusComponent {
  steps = input.required<AgentStep[]>();
}
