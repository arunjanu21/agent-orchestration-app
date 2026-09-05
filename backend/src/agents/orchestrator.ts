import { GoogleGenAI, Content, FunctionDeclaration } from '@google/genai';
import { orderAgent } from './order-agent';
import { discountAgent } from './discount-agent';
import { refundAgent } from './refund-agent';
import { productAgent } from './product-agent';
import { AgentEvent } from '../types/agent.types';

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = 'gemini-3.6-flash';

// Tools that tell Orchestrator WHICH agent to delegate to
const ORCHESTRATOR_TOOLS: FunctionDeclaration[] = [
  {
    name: 'call_order_agent',
    description: 'Delegate to Order Agent for: order status, tracking, delivery ETA, order history',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The order-related query to handle' }
      },
      required: ['query']
    }
  },
  {
    name: 'call_discount_agent',
    description: 'Delegate to Discount Agent for: discount codes, promo offers, loyalty rewards',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The discount-related query to handle' }
      },
      required: ['query']
    }
  },
  {
    name: 'call_refund_agent',
    description: 'Delegate to Refund Agent for: returns, refunds, cancellations, exchange requests',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The refund-related query to handle' }
      },
      required: ['query']
    }
  },
  {
    name: 'call_product_agent',
    description: 'Delegate to Product Agent for: product search, specs, availability, recommendations',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The product-related query to handle' }
      },
      required: ['query']
    }
  }
];

// Map tool name → agent function
type AgentFn = (query: string, emitEvent: (e: AgentEvent) => void) => Promise<string>;

const AGENT_REGISTRY: Record<string, AgentFn> = {
  call_order_agent:    orderAgent,
  call_discount_agent: discountAgent,
  call_refund_agent:   refundAgent,
  call_product_agent:  productAgent
};

export async function orchestrate(
  userMessage: string,
  emitEvent: (event: AgentEvent) => void
): Promise<void> {

  emitEvent({
    type: 'orchestrator_thinking',
    content: 'Analyzing your request...',
    timestamp: Date.now()
  });

  const messages: Content[] = [{ role: 'user', parts: [{ text: userMessage }] }];

  // Orchestrator uses Gemini Pro — smarter reasoning for delegation decisions
  let response = await client.models.generateContent({
    model: MODEL,
    contents: messages,
    config: {
      maxOutputTokens: 2048,
      systemInstruction: `You are the Master Orchestrator for ShopEasy customer support.

      Your responsibilities:
      1. Understand what the customer needs (may have multiple intents)
      2. Identify which specialist agents are required
      3. Call those agents using your tools (you can call multiple simultaneously)
      4. Combine all agent responses into ONE clear, warm, friendly reply

      Rules:
      - ALWAYS delegate to agents — never answer from your own knowledge
      - Call multiple agents if query has multiple intents (order + discount = call both)
      - Synthesize all responses into a single natural reply
      - Start the final reply with a warm greeting
      - Use emojis sparingly to make responses friendly`,
      tools: [{ functionDeclarations: ORCHESTRATOR_TOOLS }]
    }
  });

  // Orchestrator loop — may call multiple agents
  while ((response.functionCalls?.length ?? 0) > 0) {
    const toolCalls = response.functionCalls!;

    emitEvent({
      type: 'orchestrator_thinking',
      content: `Delegating to: ${toolCalls.map(t =>
        (t.name ?? '').replace('call_', '').replace('_agent', ' Agent')
      ).join(', ')}`,
      timestamp: Date.now()
    });

    // Run all required agents in PARALLEL
    const results = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const agentFn = AGENT_REGISTRY[toolCall.name!];
        const query = (toolCall.args as { query?: string } | undefined)?.query ?? '';
        return agentFn(query, emitEvent);
      })
    );

    // Feed all results back to orchestrator for synthesis
    messages.push({ role: 'model', parts: response.candidates![0].content!.parts! });
    messages.push({
      role: 'user',
      parts: toolCalls.map((toolCall, i) => ({
        functionResponse: { name: toolCall.name, response: { result: results[i] } }
      }))
    });

    emitEvent({
      type: 'orchestrator_thinking',
      content: 'Preparing your complete answer...',
      timestamp: Date.now()
    });

    // Orchestrator synthesizes the final response — using STREAMING
    // Stream the final answer token by token back to client
    const stream = await client.models.generateContentStream({
      model: MODEL,
      contents: messages,
      config: {
        maxOutputTokens: 2048,
        systemInstruction: `You are the Master Orchestrator. Combine all agent results into
                 ONE warm, clear, well-structured customer response.
                 Use markdown for formatting. Use emojis where appropriate.`,
        tools: [{ functionDeclarations: ORCHESTRATOR_TOOLS }]
      }
    });

    // Stream each token as it arrives
    for await (const chunk of stream) {
      if (chunk.text) {
        emitEvent({
          type: 'final_response',
          token: chunk.text,
          timestamp: Date.now()
        });
      }
    }

    break; // Final answer streamed — exit loop
  }
}
