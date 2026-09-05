import { GoogleGenAI, Content, FunctionDeclaration } from '@google/genai';
import { executeToolCall } from '../tools/mock-db';
import { AgentEvent, ToolDefinition } from '../types/agent.types';

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = 'gemini-3.6-flash';

const ORDER_TOOLS: ToolDefinition[] = [
  {
    name: 'get_order_status',
    description: 'Get current status and tracking info for a specific order',
    input_schema: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: 'The order ID e.g. ORD-2024-001' }
      },
      required: ['order_id']
    }
  },
  {
    name: 'get_orders_by_customer',
    description: 'Get all orders for a customer',
    input_schema: {
      type: 'object',
      properties: {
        customer_email: { type: 'string', description: 'Customer email address' }
      },
      required: []
    }
  }
];

const FUNCTION_DECLARATIONS: FunctionDeclaration[] = ORDER_TOOLS.map(t => ({
  name: t.name,
  description: t.description,
  parametersJsonSchema: t.input_schema
}));

export async function orderAgent(
  query: string,
  emitEvent: (event: AgentEvent) => void
): Promise<string> {

  emitEvent({
    type: 'agent_activated',
    agentName: 'Order Agent',
    content: 'Checking your order details...',
    timestamp: Date.now()
  });

  const messages: Content[] = [{ role: 'user', parts: [{ text: query }] }];

  let response = await client.models.generateContent({
    model: MODEL,
    contents: messages,
    config: {
      maxOutputTokens: 1024,
      systemInstruction: `You are an Order Tracking Specialist for ShopEasy.
      Your ONLY job: find and report order status, delivery info, and tracking.
      Always use tools to get real data. Be factual and concise.
      If no order ID provided, fetch all recent orders.`,
      tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }]
    }
  });

  // Agentic loop
  while ((response.functionCalls?.length ?? 0) > 0) {
    const toolCall = response.functionCalls![0];

    emitEvent({
      type: 'agent_tool_call',
      agentName: 'Order Agent',
      toolName: toolCall.name,
      content: `Looking up: ${(toolCall.name ?? '').replace(/_/g, ' ')}`,
      timestamp: Date.now()
    });

    const toolResult = executeToolCall(toolCall.name!, toolCall.args ?? {});

    messages.push({ role: 'model', parts: response.candidates![0].content!.parts! });
    messages.push({
      role: 'user',
      parts: [{ functionResponse: { name: toolCall.name, response: { result: toolResult } } }]
    });

    response = await client.models.generateContent({
      model: MODEL,
      contents: messages,
      config: {
        maxOutputTokens: 1024,
        systemInstruction: `You are an Order Tracking Specialist. Be factual and concise.`,
        tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }]
      }
    });
  }

  const result = response.text ?? 'Unable to fetch order details.';

  emitEvent({
    type: 'agent_complete',
    agentName: 'Order Agent',
    content: result,
    timestamp: Date.now()
  });

  return result;
}
