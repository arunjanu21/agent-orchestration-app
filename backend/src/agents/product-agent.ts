import { GoogleGenAI, Content, FunctionDeclaration } from '@google/genai';
import { executeToolCall } from '../tools/mock-db';
import { AgentEvent, ToolDefinition } from '../types/agent.types';

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = 'gemini-3.6-flash';

const PRODUCT_TOOLS: ToolDefinition[] = [
  {
    name: 'get_products_by_category',
    description: 'Get products by category like laptops, mobiles, accessories',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Product category e.g. laptops, mobiles' }
      },
      required: ['category']
    }
  }
];

const FUNCTION_DECLARATIONS: FunctionDeclaration[] = PRODUCT_TOOLS.map(t => ({
  name: t.name,
  description: t.description,
  parametersJsonSchema: t.input_schema
}));

export async function productAgent(
  query: string,
  emitEvent: (event: AgentEvent) => void
): Promise<string> {

  emitEvent({
    type: 'agent_activated',
    agentName: 'Product Agent',
    content: 'Searching our product catalog...',
    timestamp: Date.now()
  });

  const messages: Content[] = [{ role: 'user', parts: [{ text: query }] }];

  let response = await client.models.generateContent({
    model: MODEL,
    contents: messages,
    config: {
      maxOutputTokens: 1024,
      systemInstruction: `You are a Product Specialist for ShopEasy.
      Your ONLY job: help customers find products, check availability, compare specs.
      Use tools to fetch real product data. Be helpful and informative.`,
      tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }]
    }
  });

  while ((response.functionCalls?.length ?? 0) > 0) {
    const toolCall = response.functionCalls![0];

    emitEvent({
      type: 'agent_tool_call',
      agentName: 'Product Agent',
      toolName: toolCall.name,
      content: `Fetching products in ${toolCall.args?.['category']}...`,
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
        systemInstruction: `You are a Product Specialist. Be helpful and informative.`,
        tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }]
      }
    });
  }

  const result = response.text ?? 'Unable to find product information.';

  emitEvent({ type: 'agent_complete', agentName: 'Product Agent', content: result, timestamp: Date.now() });
  return result;
}
