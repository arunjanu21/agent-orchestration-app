import { GoogleGenAI, Content, FunctionDeclaration } from '@google/genai';
import { executeToolCall } from '../tools/mock-db';
import { AgentEvent, ToolDefinition } from '../types/agent.types';

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = 'gemini-3.6-flash';

const REFUND_TOOLS: ToolDefinition[] = [
  {
    name: 'check_refund_eligibility',
    description: 'Check if an order is eligible for refund or return',
    input_schema: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: 'Order ID to check for refund' }
      },
      required: ['order_id']
    }
  }
];

const FUNCTION_DECLARATIONS: FunctionDeclaration[] = REFUND_TOOLS.map(t => ({
  name: t.name,
  description: t.description,
  parametersJsonSchema: t.input_schema
}));

export async function refundAgent(
  query: string,
  emitEvent: (event: AgentEvent) => void
): Promise<string> {

  emitEvent({
    type: 'agent_activated',
    agentName: 'Refund Agent',
    content: 'Processing your return request...',
    timestamp: Date.now()
  });

  const messages: Content[] = [{ role: 'user', parts: [{ text: query }] }];

  let response = await client.models.generateContent({
    model: MODEL,
    contents: messages,
    config: {
      maxOutputTokens: 1024,
      systemInstruction: `You are a Refund and Returns Specialist for ShopEasy.
      Your ONLY job: check refund eligibility and guide customers through returns.
      Always use tools to verify eligibility. Be empathetic and clear.`,
      tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }]
    }
  });

  while ((response.functionCalls?.length ?? 0) > 0) {
    const toolCall = response.functionCalls![0];

    emitEvent({
      type: 'agent_tool_call',
      agentName: 'Refund Agent',
      toolName: toolCall.name,
      content: `Checking return eligibility...`,
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
        systemInstruction: `You are a Refund Specialist. Be empathetic and clear.`,
        tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }]
      }
    });
  }

  const result = response.text ?? 'Unable to process refund request.';

  emitEvent({ type: 'agent_complete', agentName: 'Refund Agent', content: result, timestamp: Date.now() });
  return result;
}
