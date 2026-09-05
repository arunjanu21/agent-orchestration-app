export type MessageRole = 'user' | 'assistant';
export type AgentName = 'Order Agent' | 'Discount Agent' | 'Refund Agent' | 'Product Agent';

export interface AgentStep {
  agentName: string;
  type: 'activated' | 'tool_call' | 'complete';
  content: string;
  toolName?: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  agentSteps?: AgentStep[];
  orchestratorStatus?: string;
}

export interface StreamEvent {
  type:
    | 'orchestrator_thinking'
    | 'agent_activated'
    | 'agent_tool_call'
    | 'agent_streaming'
    | 'agent_complete'
    | 'final_response'
    | 'stream_end'
    | 'error';
  agentName?: string;
  toolName?: string;
  content?: string;
  token?: string;
  timestamp: number;
}

export const QUICK_PROMPTS = [
  '📦 Where is my order ORD-2024-001?',
  '🎁 Do I have any discount codes?',
  '↩️ I want to return my laptop',
  '💻 Show me your best laptops',
  '📦 Track my order and check for discounts'
];
