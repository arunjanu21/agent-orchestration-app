export interface AgentEvent {
  type:
    | 'orchestrator_thinking'
    | 'agent_activated'
    | 'agent_tool_call'
    | 'agent_streaming'
    | 'agent_complete'
    | 'final_response'
    | 'error';
  agentName?: string;
  toolName?: string;
  content?: string;
  token?: string;
  timestamp: number;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  // Plain JSON Schema, passed to Gemini as FunctionDeclaration.parametersJsonSchema
  input_schema: {
    type: string;
    properties: Record<string, { type: string; description?: string }>;
    required: string[];
  };
}
