import { GoogleGenAI, Content, FunctionDeclaration } from '@google/genai';
import { executeToolCall } from '../tools/mock-db';
import { AgentEvent, ToolDefinition } from '../types/agent.types';

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = 'gemini-3.6-flash';

const DISCOUNT_TOOLS: ToolDefinition[] = [
  {
    name: 'get_available_discounts',
    description: 'Get available discount codes and offers for a customer',
    input_schema: {
      type: 'object',
      properties: {
        customer_email: { type: 'string', description: 'Customer email' }
      },
      required: []
    }
  }
];

const FUNCTION_DECLARATIONS: FunctionDeclaration[] = DISCOUNT_TOOLS.map(t => ({
  name: t.name,
  description: t.description,
  parametersJsonSchema: t.input_schema
}));

export async function discountAgent(
  query: string,
  emitEvent: (event: AgentEvent) => void
): Promise<string> {

  emitEvent({
    type: 'agent_activated',
    agentName: 'Discount Agent',
    content: 'Finding your exclusive offers...',
    timestamp: Date.now()
  });

  const messages: Content[] = [{ role: 'user', parts: [{ text: query }] }];

  let response = await client.models.generateContent({
    model: MODEL,
    contents: messages,
    config: {
      maxOutputTokens: 1024,
      systemInstruction: `You are a Discount and Offers Specialist for ShopEasy.
      Your ONLY job: find and explain available discount codes.
      Always use tools to fetch real offers. Be enthusiastic and customer-friendly.
      Present discount codes clearly with their benefits.`,
      tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }]
    }
  });

  while ((response.functionCalls?.length ?? 0) > 0) {
    const toolCall = response.functionCalls![0];

    emitEvent({
      type: 'agent_tool_call',
      agentName: 'Discount Agent',
      toolName: toolCall.name,
      content: `Fetching your personalized offers...`,
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
        systemInstruction: `You are a Discount Specialist. Be enthusiastic and customer-friendly.`,
        tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }]
      }
    });
  }

  const result = response.text ?? 'No discounts available at this time.';

  emitEvent({
    type: 'agent_complete',
    agentName: 'Discount Agent',
    content: result,
    timestamp: Date.now()
  });

  return result;
}
