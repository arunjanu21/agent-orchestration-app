import { Injectable, signal, computed } from '@angular/core';
import { StreamService } from './stream.service';
import { ChatMessage, AgentStep, StreamEvent } from '../models/chat.models';

@Injectable({ providedIn: 'root' })
export class ChatService {

  private streamService = new StreamService();

  // ── Signals ──────────────────────────────────────────────
  messages = signal<ChatMessage[]>([]);
  isLoading = signal(false);
  activeAgents = signal<string[]>([]);
  orchestratorStatus = signal('');

  // ── Computed ──────────────────────────────────────────────
  hasMessages = computed(() => this.messages().length > 0);
  messageCount = computed(() => this.messages().length);

  // ── Send Message ─────────────────────────────────────────
  sendMessage(userText: string): void {
    if (!userText.trim() || this.isLoading()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userText.trim(),
      timestamp: new Date()
    };
    this.messages.update(msgs => [...msgs, userMessage]);

    // Prepare assistant placeholder (streaming into this)
    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      agentSteps: []
    };
    this.messages.update(msgs => [...msgs, assistantMessage]);

    this.isLoading.set(true);
    this.activeAgents.set([]);

    // Subscribe to SSE stream
    this.streamService.streamChat(userText).subscribe({
      next: (event: StreamEvent) => this.handleStreamEvent(event, assistantId),
      error: (err) => {
        this.updateMessage(assistantId, {
          content: `⚠️ Error: ${err.message}`,
          isStreaming: false
        });
        this.isLoading.set(false);
        this.activeAgents.set([]);
      },
      complete: () => {
        this.updateMessage(assistantId, { isStreaming: false });
        this.isLoading.set(false);
        this.activeAgents.set([]);
        this.orchestratorStatus.set('');
      }
    });
  }

  private handleStreamEvent(event: StreamEvent, assistantId: string): void {
    switch (event.type) {

      case 'orchestrator_thinking':
        this.orchestratorStatus.set(event.content ?? '');
        break;

      case 'agent_activated':
        if (event.agentName) {
          this.activeAgents.update(agents =>
            agents.includes(event.agentName!) ? agents : [...agents, event.agentName!]
          );
          this.addAgentStep(assistantId, {
            agentName: event.agentName,
            type: 'activated',
            content: event.content ?? '',
            timestamp: event.timestamp
          });
        }
        break;

      case 'agent_tool_call':
        if (event.agentName) {
          this.addAgentStep(assistantId, {
            agentName: event.agentName,
            type: 'tool_call',
            content: event.content ?? '',
            toolName: event.toolName,
            timestamp: event.timestamp
          });
        }
        break;

      case 'agent_complete':
        if (event.agentName) {
          this.activeAgents.update(agents =>
            agents.filter(a => a !== event.agentName)
          );
          this.addAgentStep(assistantId, {
            agentName: event.agentName!,
            type: 'complete',
            content: event.content ?? '',
            timestamp: event.timestamp
          });
        }
        break;

      case 'final_response':
        // Append streaming token to message content
        if (event.token) {
          this.messages.update(msgs =>
            msgs.map(m =>
              m.id === assistantId
                ? { ...m, content: m.content + event.token }
                : m
            )
          );
        }
        break;
    }
  }

  private addAgentStep(assistantId: string, step: AgentStep): void {
    this.messages.update(msgs =>
      msgs.map(m =>
        m.id === assistantId
          ? { ...m, agentSteps: [...(m.agentSteps ?? []), step] }
          : m
      )
    );
  }

  private updateMessage(id: string, patch: Partial<ChatMessage>): void {
    this.messages.update(msgs =>
      msgs.map(m => m.id === id ? { ...m, ...patch } : m)
    );
  }

  clearChat(): void {
    this.messages.set([]);
    this.orchestratorStatus.set('');
    this.activeAgents.set([]);
  }
}
