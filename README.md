# Agent Orchestration App

A multi-agent orchestration demo with an Angular frontend and an Express/TypeScript backend powered by Gemini.

## Prerequisites

- Node.js (v18+ recommended)
- npm
- A Gemini API key ([Google AI Studio](https://aistudio.google.com/apikey))

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/arunjanu21/agent-orchestration-app.git
cd agent-orchestration-app
```

### 2. Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` with the following keys:

```
GEMINI_API_KEY=
PORT=
FRONTEND_URL=
```

- `GEMINI_API_KEY` — your Gemini API key (required)
- `PORT` — port for the backend server (defaults to `3000` if omitted)
- `FRONTEND_URL` — URL of the frontend app, e.g. `http://localhost:4200`

Run the backend in dev mode:

```bash
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

The frontend runs at `http://localhost:4200` by default and expects the backend at `http://localhost:3000`.

## Project Structure

```
agent-orchestration-app/
├── backend/    # Express + TypeScript API, Gemini-powered agents
└── frontend/   # Angular chat UI
```
