# Angular + Claude Agent Orchestration — Real-Time Streaming

## Project Overview

Build a full-stack e-commerce customer support chat application with:
- **Frontend**: Angular 20+ (Zoneless, Signals, Standalone components)
- **Backend**: Node.js + Express (Claude API with streaming SSE)
- **AI**: Claude Agent Orchestration (Sonnet as Orchestrator, Haiku as Sub-Agents)
- **Feature**: Real-time streaming responses from agents to UI

---

## Architecture

```
Angular Frontend (Port 4200)
        │
        │  HTTP POST (user message)
        │  SSE stream (agent tokens)
        ▼
Node.js + Express Backend (Port 3000)
        │
        ▼
Orchestrator Agent (Claude Sonnet 4.6)
   decides which agents to call
        │              │
        ▼              ▼
Order Agent       Discount Agent
(Claude Haiku)    (Claude Haiku)
   streams            streams
   tokens             tokens
        │              │
        └──────┬────────┘
               ▼
   SSE events streamed to Angular
   Angular renders token by token
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | Angular 20+ |
| Change Detection | Zoneless (provideZonelessChangeDetection) |
| State Management | Signals + Computed |
| Styling | Tailwind CSS |
| Backend | Node.js + Express |
| Streaming | Server-Sent Events (SSE) |
| AI Models | Claude Sonnet 4.6 (Orchestrator), Claude Haiku 4.5 (Agents) |
| AI SDK | @anthropic-ai/sdk |
| HTTP Client | Angular HttpClient with EventSource |

---

## Project Structure

```
agent-orchestration-app/
├── backend/
│   ├── src/
│   │   ├── agents/
│   │   │   ├── orchestrator.ts
│   │   │   ├── order-agent.ts
│   │   │   ├── discount-agent.ts
│   │   │   ├── refund-agent.ts
│   │   │   └── product-agent.ts
│   │   ├── tools/
│   │   │   └── mock-db.ts
│   │   ├── types/
│   │   │   └── agent.types.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── chat/
│   │   │   │   │   ├── chat.component.ts
│   │   │   │   │   └── chat.component.html
│   │   │   │   ├── message/
│   │   │   │   │   ├── message.component.ts
│   │   │   │   │   └── message.component.html
│   │   │   │   ├── agent-status/
│   │   │   │   │   ├── agent-status.component.ts
│   │   │   │   │   └── agent-status.component.html
│   │   │   │   └── typing-indicator/
│   │   │   │       └── typing-indicator.component.ts
│   │   │   ├── services/
│   │   │   │   ├── chat.service.ts
│   │   │   │   └── stream.service.ts
│   │   │   ├── models/
│   │   │   │   └── chat.models.ts
│   │   │   ├── app.component.ts
│   │   │   ├── app.component.html
│   │   │   └── app.config.ts
│   │   ├── styles.css
│   │   └── index.html
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
```

---

## Backend Implementation

### 1. package.json (Backend)

```json
{
  "name": "agent-orchestration-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node-dev --respawn src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "cors": "^2.8.5",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.0"
  }
}
```

---

### 2. types/agent.types.ts

```typescript
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
  input_schema: {
    type: string;
    properties: Record<string, { type: string; description?: string }>;
    required: string[];
  };
}
```

---

### 3. tools/mock-db.ts

```typescript
// Simulated database for demo purposes
// In production, replace with actual DB calls / API calls

export const mockDatabase = {
  orders: {
    'ORD-2024-001': {
      order_id: 'ORD-2024-001',
      product: 'Laptop Dell XPS 15',
      status: 'In Transit',
      placed_on: '2024-01-10',
      expected_delivery: '2024-01-14',
      tracking_number: 'TRK-FDX-789456',
      courier: 'FedEx',
      amount: 75000,
      customer_email: 'arun@example.com'
    },
    'ORD-2024-002': {
      order_id: 'ORD-2024-002',
      product: 'Wireless Mouse',
      status: 'Delivered',
      placed_on: '2024-01-05',
      expected_delivery: '2024-01-08',
      tracking_number: 'TRK-BLU-123789',
      courier: 'BlueDart',
      amount: 2500,
      customer_email: 'arun@example.com'
    }
  },
  discounts: {
    standard: [
      { code: 'LOYAL10', discount: '10% off', valid_till: '2024-02-28', min_order: 5000 },
      { code: 'NEXT15', discount: '₹1500 off', valid_till: '2024-02-28', min_order: 10000 },
      { code: 'WELCOME5', discount: '5% off', valid_till: '2024-03-31', min_order: 1000 }
    ]
  },
  products: {
    laptops: [
      { id: 1, name: 'Dell XPS 15', price: 75000, stock: 5, rating: 4.5 },
      { id: 2, name: 'MacBook Air M2', price: 99000, stock: 3, rating: 4.8 },
      { id: 3, name: 'Lenovo ThinkPad', price: 65000, stock: 8, rating: 4.3 }
    ]
  },
  refunds: {
    eligible_window_days: 7,
    policy: 'Items can be returned within 7 days of delivery in original condition'
  }
};

export function executeToolCall(toolName: string, input: Record<string, any>): string {
  switch (toolName) {

    case 'get_order_status': {
      const order = Object.values(mockDatabase.orders).find(
        o => o.order_id === input.order_id
      );
      return JSON.stringify(order ?? { error: 'Order not found' });
    }

    case 'get_orders_by_customer': {
      const orders = Object.values(mockDatabase.orders).filter(
        o => o.customer_email === input.customer_email || !input.customer_email
      );
      return JSON.stringify({ orders, total: orders.length });
    }

    case 'get_available_discounts': {
      return JSON.stringify({
        customer_email: input.customer_email,
        available_codes: mockDatabase.discounts.standard
      });
    }

    case 'check_refund_eligibility': {
      const order = Object.values(mockDatabase.orders).find(
        o => o.order_id === input.order_id
      );
      if (!order) return JSON.stringify({ eligible: false, reason: 'Order not found' });
      return JSON.stringify({
        eligible: true,
        order_id: input.order_id,
        policy: mockDatabase.refunds.policy,
        refund_amount: order.amount
      });
    }

    case 'get_products_by_category': {
      const category = input.category?.toLowerCase();
      const products = (mockDatabase.products as any)[category] ?? [];
      return JSON.stringify({ category, products });
    }

    default:
      return JSON.stringify({ error: `Tool ${toolName} not found` });
  }
}
```

---

### 4. agents/order-agent.ts

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { executeToolCall } from '../tools/mock-db';
import { AgentEvent, ToolDefinition } from '../types/agent.types';

const client = new Anthropic();

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

  const messages: any[] = [{ role: 'user', content: query }];

  let response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: `You are an Order Tracking Specialist for ShopEasy.
    Your ONLY job: find and report order status, delivery info, and tracking.
    Always use tools to get real data. Be factual and concise.
    If no order ID provided, fetch all recent orders.`,
    tools: ORDER_TOOLS as any,
    messages
  });

  // Agentic loop
  while (response.stop_reason === 'tool_use') {
    const toolBlock = response.content.find(b => b.type === 'tool_use') as any;

    emitEvent({
      type: 'agent_tool_call',
      agentName: 'Order Agent',
      toolName: toolBlock.name,
      content: `Looking up: ${toolBlock.name.replace(/_/g, ' ')}`,
      timestamp: Date.now()
    });

    const toolResult = executeToolCall(toolBlock.name, toolBlock.input);

    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: toolBlock.id, content: toolResult }]
    });

    response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `You are an Order Tracking Specialist. Be factual and concise.`,
      tools: ORDER_TOOLS as any,
      messages
    });
  }

  const resultText = response.content.find(b => b.type === 'text') as any;
  const result = resultText?.text ?? 'Unable to fetch order details.';

  emitEvent({
    type: 'agent_complete',
    agentName: 'Order Agent',
    content: result,
    timestamp: Date.now()
  });

  return result;
}
```

---

### 5. agents/discount-agent.ts

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { executeToolCall } from '../tools/mock-db';
import { AgentEvent, ToolDefinition } from '../types/agent.types';

const client = new Anthropic();

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

  const messages: any[] = [{ role: 'user', content: query }];

  let response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: `You are a Discount and Offers Specialist for ShopEasy.
    Your ONLY job: find and explain available discount codes.
    Always use tools to fetch real offers. Be enthusiastic and customer-friendly.
    Present discount codes clearly with their benefits.`,
    tools: DISCOUNT_TOOLS as any,
    messages
  });

  while (response.stop_reason === 'tool_use') {
    const toolBlock = response.content.find(b => b.type === 'tool_use') as any;

    emitEvent({
      type: 'agent_tool_call',
      agentName: 'Discount Agent',
      toolName: toolBlock.name,
      content: `Fetching your personalized offers...`,
      timestamp: Date.now()
    });

    const toolResult = executeToolCall(toolBlock.name, toolBlock.input);

    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: toolBlock.id, content: toolResult }]
    });

    response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `You are a Discount Specialist. Be enthusiastic and customer-friendly.`,
      tools: DISCOUNT_TOOLS as any,
      messages
    });
  }

  const resultText = response.content.find(b => b.type === 'text') as any;
  const result = resultText?.text ?? 'No discounts available at this time.';

  emitEvent({
    type: 'agent_complete',
    agentName: 'Discount Agent',
    content: result,
    timestamp: Date.now()
  });

  return result;
}
```

---

### 6. agents/refund-agent.ts

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { executeToolCall } from '../tools/mock-db';
import { AgentEvent, ToolDefinition } from '../types/agent.types';

const client = new Anthropic();

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

  const messages: any[] = [{ role: 'user', content: query }];

  let response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: `You are a Refund and Returns Specialist for ShopEasy.
    Your ONLY job: check refund eligibility and guide customers through returns.
    Always use tools to verify eligibility. Be empathetic and clear.`,
    tools: REFUND_TOOLS as any,
    messages
  });

  while (response.stop_reason === 'tool_use') {
    const toolBlock = response.content.find(b => b.type === 'tool_use') as any;

    emitEvent({
      type: 'agent_tool_call',
      agentName: 'Refund Agent',
      toolName: toolBlock.name,
      content: `Checking return eligibility...`,
      timestamp: Date.now()
    });

    const toolResult = executeToolCall(toolBlock.name, toolBlock.input);
    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: toolBlock.id, content: toolResult }]
    });

    response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `You are a Refund Specialist. Be empathetic and clear.`,
      tools: REFUND_TOOLS as any,
      messages
    });
  }

  const resultText = response.content.find(b => b.type === 'text') as any;
  const result = resultText?.text ?? 'Unable to process refund request.';

  emitEvent({ type: 'agent_complete', agentName: 'Refund Agent', content: result, timestamp: Date.now() });
  return result;
}
```

---

### 7. agents/product-agent.ts

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { executeToolCall } from '../tools/mock-db';
import { AgentEvent, ToolDefinition } from '../types/agent.types';

const client = new Anthropic();

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

  const messages: any[] = [{ role: 'user', content: query }];

  let response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: `You are a Product Specialist for ShopEasy.
    Your ONLY job: help customers find products, check availability, compare specs.
    Use tools to fetch real product data. Be helpful and informative.`,
    tools: PRODUCT_TOOLS as any,
    messages
  });

  while (response.stop_reason === 'tool_use') {
    const toolBlock = response.content.find(b => b.type === 'tool_use') as any;

    emitEvent({
      type: 'agent_tool_call',
      agentName: 'Product Agent',
      toolName: toolBlock.name,
      content: `Fetching products in ${toolBlock.input.category}...`,
      timestamp: Date.now()
    });

    const toolResult = executeToolCall(toolBlock.name, toolBlock.input);
    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: toolBlock.id, content: toolResult }]
    });

    response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `You are a Product Specialist. Be helpful and informative.`,
      tools: PRODUCT_TOOLS as any,
      messages
    });
  }

  const resultText = response.content.find(b => b.type === 'text') as any;
  const result = resultText?.text ?? 'Unable to find product information.';

  emitEvent({ type: 'agent_complete', agentName: 'Product Agent', content: result, timestamp: Date.now() });
  return result;
}
```

---

### 8. agents/orchestrator.ts

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { orderAgent } from './order-agent';
import { discountAgent } from './discount-agent';
import { refundAgent } from './refund-agent';
import { productAgent } from './product-agent';
import { AgentEvent } from '../types/agent.types';

const client = new Anthropic();

// Tools that tell Orchestrator WHICH agent to delegate to
const ORCHESTRATOR_TOOLS = [
  {
    name: 'call_order_agent',
    description: 'Delegate to Order Agent for: order status, tracking, delivery ETA, order history',
    input_schema: {
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
    input_schema: {
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
    input_schema: {
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
    input_schema: {
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

  const messages: any[] = [{ role: 'user', content: userMessage }];

  // Orchestrator uses Sonnet — smarter reasoning for delegation decisions
  let response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `You are the Master Orchestrator for ShopEasy customer support.

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
    tools: ORCHESTRATOR_TOOLS as any,
    messages
  });

  // Orchestrator loop — may call multiple agents
  while (response.stop_reason === 'tool_use') {
    const toolBlocks = response.content.filter(b => b.type === 'tool_use') as any[];

    emitEvent({
      type: 'orchestrator_thinking',
      content: `Delegating to: ${toolBlocks.map(t =>
        t.name.replace('call_', '').replace('_agent', ' Agent')
      ).join(', ')}`,
      timestamp: Date.now()
    });

    // Run all required agents in PARALLEL
    const toolResults = await Promise.all(
      toolBlocks.map(async (toolBlock) => {
        const agentFn = AGENT_REGISTRY[toolBlock.name];
        const result = await agentFn(toolBlock.input.query, emitEvent);

        return {
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: result
        };
      })
    );

    // Feed all results back to orchestrator for synthesis
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    emitEvent({
      type: 'orchestrator_thinking',
      content: 'Preparing your complete answer...',
      timestamp: Date.now()
    });

    // Orchestrator synthesizes the final response — using STREAMING
    // Stream the final answer token by token back to client
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: `You are the Master Orchestrator. Combine all agent results into 
               ONE warm, clear, well-structured customer response.
               Use markdown for formatting. Use emojis where appropriate.`,
      tools: ORCHESTRATOR_TOOLS as any,
      messages
    });

    // Stream each token as it arrives
    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        emitEvent({
          type: 'final_response',
          token: chunk.delta.text,
          timestamp: Date.now()
        });
      }
    }

    // After streaming, update response for loop check
    response = await stream.finalMessage();
    break; // Final answer streamed — exit loop
  }
}
```

---

### 9. server.ts

```typescript
import express from 'express';
import cors from 'cors';
import { orchestrate } from './agents/orchestrator';
import { AgentEvent } from './types/agent.types';

const app = express();
const PORT = 3000;

app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

// SSE streaming endpoint
app.post('/api/chat/stream', async (req, res) => {
  const { message } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.flushHeaders();

  // Helper to emit SSE events to client
  const emitEvent = (event: AgentEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    await orchestrate(message, emitEvent);

    // Signal stream is done
    res.write(`data: ${JSON.stringify({ type: 'stream_end', timestamp: Date.now() })}\n\n`);
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({
      type: 'error',
      content: error.message ?? 'An error occurred',
      timestamp: Date.now()
    })}\n\n`);
  } finally {
    res.end();
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
```

---

### 10. tsconfig.json (Backend)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Frontend Implementation

### 11. app/models/chat.models.ts

```typescript
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
```

---

### 12. app/services/stream.service.ts

```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { StreamEvent } from '../models/chat.models';

@Injectable({ providedIn: 'root' })
export class StreamService {

  private readonly BASE_URL = 'http://localhost:3000/api';

  // Stream chat using fetch + ReadableStream (SSE via POST)
  streamChat(message: string): Observable<StreamEvent> {
    return new Observable<StreamEvent>(observer => {
      const controller = new AbortController();

      fetch(`${this.BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: controller.signal
      }).then(async (response) => {
        if (!response.ok) {
          observer.error(new Error(`HTTP error: ${response.status}`));
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event: StreamEvent = JSON.parse(line.slice(6));
                observer.next(event);
                if (event.type === 'stream_end' || event.type === 'error') {
                  observer.complete();
                  return;
                }
              } catch {
                // skip malformed lines
              }
            }
          }
        }
        observer.complete();

      }).catch(err => {
        if (err.name !== 'AbortError') observer.error(err);
      });

      // Cleanup: abort fetch when observable unsubscribes
      return () => controller.abort();
    });
  }
}
```

---

### 13. app/services/chat.service.ts

```typescript
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
```

---

### 14. components/agent-status/agent-status.component.ts

```typescript
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
```

---

### 15. components/typing-indicator/typing-indicator.component.ts

```typescript
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-typing-indicator',
  standalone: true,
  template: `
    <div class="typing-wrapper">
      <span class="typing-label">{{ label() }}</span>
      <div class="dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  `,
  styles: [`
    .typing-wrapper {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; color: #6366f1; padding: 8px 0;
    }
    .dots { display: flex; gap: 4px; }
    .dots span {
      width: 6px; height: 6px; border-radius: 50%;
      background: #6366f1; animation: bounce 1.2s infinite;
    }
    .dots span:nth-child(2) { animation-delay: 0.2s; }
    .dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }
  `]
})
export class TypingIndicatorComponent {
  label = input('Thinking...');
}
```

---

### 16. components/message/message.component.ts

```typescript
import { Component, input } from '@angular/core';
import { AgentStatusComponent } from '../agent-status/agent-status.component';
import { TypingIndicatorComponent } from '../typing-indicator/typing-indicator.component';
import { ChatMessage } from '../../models/chat.models';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [AgentStatusComponent, TypingIndicatorComponent],
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
```

---

### 17. components/chat/chat.component.ts

```typescript
import {
  Component, inject, signal,
  ElementRef, ViewChild, afterNextRender
} from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { MessageComponent } from '../message/message.component';
import { TypingIndicatorComponent } from '../typing-indicator/typing-indicator.component';
import { QUICK_PROMPTS } from '../../models/chat.models';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [MessageComponent, TypingIndicatorComponent],
  templateUrl: './chat.component.html'
})
export class ChatComponent {
  chatService = inject(ChatService);

  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  inputText = signal('');
  quickPrompts = QUICK_PROMPTS;

  constructor() {
    // Auto-scroll after each render
    afterNextRender(() => this.scrollToBottom());
  }

  sendMessage(text?: string): void {
    const message = text ?? this.inputText().trim();
    if (!message) return;
    this.inputText.set('');
    this.chatService.sendMessage(message);
    setTimeout(() => this.scrollToBottom(), 100);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  scrollToBottom(): void {
    this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
  }
}
```

---

### 18. components/chat/chat.component.html

```html
<div class="chat-container">

  <!-- Header -->
  <div class="chat-header">
    <div class="header-left">
      <span class="logo">🛍️</span>
      <div>
        <h1>ShopEasy Support</h1>
        <span class="status-dot"></span>
        <span class="status-text">AI Agents Online</span>
      </div>
    </div>
    <button class="clear-btn" (click)="chatService.clearChat()">Clear</button>
  </div>

  <!-- Orchestrator status bar -->
  @if (chatService.orchestratorStatus()) {
    <div class="orchestrator-bar">
      🧠 {{ chatService.orchestratorStatus() }}
    </div>
  }

  <!-- Active agents pill bar -->
  @if (chatService.activeAgents().length > 0) {
    <div class="active-agents-bar">
      @for (agent of chatService.activeAgents(); track agent) {
        <span class="agent-pill">⚡ {{ agent }}</span>
      }
    </div>
  }

  <!-- Messages area -->
  <div class="messages-area">

    <!-- Welcome screen -->
    @if (!chatService.hasMessages()) {
      <div class="welcome">
        <div class="welcome-icon">🤖</div>
        <h2>How can our AI agents help you?</h2>
        <p>Ask me about orders, discounts, returns or products</p>
        <div class="quick-prompts">
          @for (prompt of quickPrompts; track prompt) {
            <button class="prompt-chip" (click)="sendMessage(prompt)">
              {{ prompt }}
            </button>
          }
        </div>
      </div>
    }

    <!-- Message list -->
    @for (message of chatService.messages(); track message.id) {
      <app-message [msg]="message" />
    }

    <!-- Auto-scroll anchor -->
    <div #messagesEnd></div>
  </div>

  <!-- Input area -->
  <div class="input-area">
    <textarea
      class="input-box"
      [value]="inputText()"
      (input)="inputText.set($any($event.target).value)"
      (keydown)="onKeyDown($event)"
      placeholder="Ask about your orders, discounts, or products..."
      rows="1"
      [disabled]="chatService.isLoading()"
    ></textarea>
    <button
      class="send-btn"
      (click)="sendMessage()"
      [disabled]="chatService.isLoading() || !inputText().trim()">
      @if (chatService.isLoading()) { ⏳ } @else { ➤ }
    </button>
  </div>

</div>
```

---

### 19. app.config.ts

```typescript
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),  // Zoneless — no Zone.js
    provideHttpClient()
  ]
};
```

---

### 20. app.component.ts

```typescript
import { Component } from '@angular/core';
import { ChatComponent } from './components/chat/chat.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ChatComponent],
  template: `<app-chat />`
})
export class AppComponent {}
```

---

### 21. styles.css (Global)

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', -apple-system, sans-serif; background: #f9fafb; }

.chat-container {
  display: flex; flex-direction: column;
  height: 100vh; max-width: 800px; margin: 0 auto;
  background: #f9fafb;
}

.chat-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; background: #fff;
  border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; z-index: 10;
}
.header-left { display: flex; align-items: center; gap: 12px; }
.logo { font-size: 28px; }
.chat-header h1 { font-size: 18px; font-weight: 700; color: #111827; }
.status-dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%;
  background: #22c55e; margin-right: 4px;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; } 50% { opacity: 0.5; }
}
.status-text { font-size: 12px; color: #6b7280; }
.clear-btn {
  padding: 6px 14px; border: 1px solid #e5e7eb; border-radius: 8px;
  background: #fff; cursor: pointer; font-size: 13px; color: #6b7280;
}
.clear-btn:hover { background: #f3f4f6; }

.orchestrator-bar {
  background: #eef2ff; color: #6366f1;
  padding: 8px 20px; font-size: 13px; font-weight: 500;
  border-bottom: 1px solid #e0e7ff;
}

.active-agents-bar {
  display: flex; gap: 8px; padding: 8px 20px;
  background: #fff7ed; border-bottom: 1px solid #fed7aa; flex-wrap: wrap;
}
.agent-pill {
  padding: 4px 10px; border-radius: 20px;
  background: #fff; border: 1px solid #fb923c;
  font-size: 12px; color: #ea580c; font-weight: 500;
  animation: fadeIn 0.3s ease;
}

.messages-area {
  flex: 1; overflow-y: auto; padding: 20px;
}

.welcome {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 100%; text-align: center; gap: 12px;
}
.welcome-icon { font-size: 64px; }
.welcome h2 { font-size: 22px; font-weight: 700; color: #111827; }
.welcome p { color: #6b7280; font-size: 14px; }
.quick-prompts {
  display: flex; flex-wrap: wrap; gap: 8px;
  justify-content: center; margin-top: 12px;
}
.prompt-chip {
  padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 20px;
  background: #fff; cursor: pointer; font-size: 13px; color: #374151;
  transition: all 0.2s;
}
.prompt-chip:hover {
  border-color: #6366f1; color: #6366f1; background: #eef2ff;
}

.input-area {
  display: flex; align-items: flex-end; gap: 10px;
  padding: 16px 20px; background: #fff;
  border-top: 1px solid #e5e7eb; position: sticky; bottom: 0;
}
.input-box {
  flex: 1; padding: 12px 16px; border: 1px solid #e5e7eb;
  border-radius: 12px; font-size: 14px; resize: none;
  font-family: inherit; outline: none; max-height: 120px;
  transition: border-color 0.2s;
}
.input-box:focus { border-color: #6366f1; }
.input-box:disabled { background: #f9fafb; }

.send-btn {
  width: 44px; height: 44px; border-radius: 12px;
  background: #6366f1; color: #fff; border: none;
  cursor: pointer; font-size: 18px; transition: all 0.2s;
  flex-shrink: 0;
}
.send-btn:hover:not(:disabled) { background: #4f46e5; transform: scale(1.05); }
.send-btn:disabled { background: #c7d2fe; cursor: not-allowed; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
```

---

## Setup & Run Instructions

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Set your Anthropic API key
export ANTHROPIC_API_KEY=your_api_key_here

# 4. Start backend dev server
npm run dev
# Server runs on http://localhost:3000
```

### Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Remove zone.js from angular.json polyfills
# In angular.json → find "polyfills" → remove "zone.js"

# 4. Uninstall zone.js
npm uninstall zone.js

# 5. Start Angular dev server
ng serve
# App runs on http://localhost:4200
```

---

## Environment Variables

```bash
# backend/.env
ANTHROPIC_API_KEY=sk-ant-xxxxx
PORT=3000
FRONTEND_URL=http://localhost:4200
```

---

## Key Technical Decisions

| Decision | Reason |
|---|---|
| SSE via POST (not GET) | POST allows sending message body; SSE GET doesn't support body |
| fetch() over EventSource | EventSource only supports GET; fetch supports POST with streaming |
| Parallel agent calls | Independent agents (order + discount) run simultaneously via Promise.all |
| Signals for all state | Zoneless requires Signals — no subscribe/unsubscribe needed |
| Haiku for sub-agents | 10x cheaper, fast enough for focused single-domain tasks |
| Sonnet for orchestrator | Needs stronger reasoning for multi-intent routing decisions |

---

## Sample Test Queries

```
Single intent (1 agent):
→ "Where is my order ORD-2024-001?"
→ "Do I have any discount codes?"
→ "I want to return my laptop"

Multi intent (2+ agents in parallel):
→ "Where is my order and do I have any discounts?"
→ "Check my order status and show me your best laptops"
→ "I want a refund and also check for available discounts"
```

---

## Possible Enhancements

- Add JWT authentication to `/api/chat/stream`
- Persist chat history in MongoDB / PostgreSQL
- Add real database integration replacing mock-db.ts
- Add WebSocket fallback for older browser support
- Add unit tests using Jest (backend) and Jasmine (Angular)
- Deploy backend to AWS Lambda / Azure Functions
- Deploy frontend to Azure Static Web Apps / Vercel
```
