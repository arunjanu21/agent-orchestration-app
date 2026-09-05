import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { orchestrate } from './agents/orchestrator';
import { AgentEvent } from './types/agent.types';

const app = express();
const PORT = process.env.PORT ?? 3000;

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
