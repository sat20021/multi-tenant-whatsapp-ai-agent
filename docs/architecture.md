# Multi-Tenant WhatsApp AI Sales Agent Architecture

## System Overview

The Multi-Tenant WhatsApp AI Sales Agent is an enterprise-grade platform designed to serve multiple distinct business tenants simultaneously over WhatsApp. The platform decouples message ingestion, queueing, AI processing (via LangGraph in Python), and tenant dashboard presentation into a highly scalable, isolated multi-tenant architecture.

```mermaid
flowchart TB
    subgraph Clients["Clients & Simulation"]
        SIM["simulate.js (Meta Webhook Payload)"]
        UI["Dashboard UI (React + Vite)"]
    end

    subgraph NodeBackend["Node.js Express Backend (Port 4000)"]
        WEBHOOK["POST /webhook/whatsapp"]
        AUTH_MW["Auth Middleware (JWT validation)"]
        API_ROUTES["/api/leads, /api/auth, /api/dev"]
    end

    subgraph MessagingQueue["Queue & Storage Layer"]
        BULLMQ["BullMQ Queue (Redis)"]
        REDIS_LOCK["Redis Distributed Lock (per-lead)"]
        MONGO[("MongoDB (Multi-Tenant Data Storage)")]
    end

    subgraph AIWorker["Node.js Worker & Python LangGraph AI"]
        WORKER["Worker Process"]
        LANGGRAPH["Python FastAPI LangGraph Service (Port 8000)"]
        LLM["Google Gemini / OpenAI API"]
    end

    SIM -->|Webhook JSON| WEBHOOK
    UI -->|JWT Auth Requests| AUTH_MW --> API_ROUTES
    WEBHOOK -->|Idempotent Enqueue| BULLMQ
    BULLMQ --> WORKER
    WORKER --> REDIS_LOCK
    WORKER -->|Fetch Scoped Lead History| MONGO
    WORKER -->|Tenant Scoped Context| LANGGRAPH
    LANGGRAPH <--> LLM
    LANGGRAPH -->|Generated Reply| WORKER
    WORKER -->|Save Reply & Latency| MONGO
```

---

## Key Architectural Principles

### 1. Zero Cross-Tenant Data Leakage
- **Webhook Tenant Resolution:** Webhooks derive tenant identity strictly from `metadata.phone_number_id` in the Meta payload.
- **API Request Scoping:** All `/api/*` routes derive `accountId` exclusively from the verified JWT payload (`req.accountId`). Client-supplied body or URL query parameters can never override tenant identity.
- **Isolated AI Prompts:** The Python LangGraph service receives *only* the specific tenant's context (FAQs, tone, pricing) and conversation memory for that specific lead. Prompt construction dynamically injects tenant rules while isolating all other tenants.

### 2. Fast Webhook Response (< 200 ms) & Asynchronous Queue
- Webhook calls are processed immediately:
  1. Resolve Tenant by `phoneNumberId`.
  2. Deduplicate message using unique index on `waMessageId`.
  3. Find/Create Lead by `(accountId, phone)`.
  4. Save incoming message.
  5. Enqueue job into BullMQ.
  6. Return `200 OK` instantly (< 50ms).
- Long-running LLM invocation occurs asynchronously inside the BullMQ Worker.

### 3. Per-Lead Order Preservation with Parallel Cross-Lead Execution
- Messages from the same lead are locked using a Redis key (`lock:lead:<leadId>`).
- If a message for a lead is currently being processed, subsequent messages for that lead wait for the lock release.
- Messages for different leads execute concurrently across worker threads.

### 4. LangGraph AI Execution Pipeline
The Python AI service processes incoming requests through a compiled 5-step LangGraph graph:
1. `validate_input`: Verifies payload format and required fields.
2. `load_tenant_context`: Ingests business FAQs, pricing, tone, and language.
3. `build_prompt`: Formats system prompt and historical context window (last 10 messages).
4. `call_llm`: Executes LLM query with exponential backoff retries (tenacity).
5. `validate_response`: Validates reply quality and truncates for WhatsApp constraints if necessary.

---

## Data Models & Relations

```mermaid
erDiagram
    TENANT ||--o{ USER : owns
    TENANT ||--o{ LEAD : has
    TENANT ||--o{ MESSAGE : contains
    LEAD ||--o{ MESSAGE : tracks
    TENANT ||--o{ SENT_MESSAGE : logs

    TENANT {
        string accountId PK
        string businessName
        string phoneNumberId
        string tone
        string language
        array faqs
        string pricing
    }

    USER {
        string accountId FK
        string email UK
        string passwordHash
        string name
    }

    LEAD {
        string accountId FK
        string phone
        string name
        string status
        boolean humanTakeover
        date lastMessageAt
    }

    MESSAGE {
        string accountId FK
        string leadId FK
        string waMessageId UK
        string direction
        string sender
        string text
        number latencyMs
        date createdAt
    }

    SENT_MESSAGE {
        string accountId FK
        string phoneNumberId
        string to
        string text
        date sentAt
    }
```

---

## Security Boundaries & Compliance

- **Password Hashing:** Passwords are stored exclusively using bcrypt with salt rounds = 10.
- **Idempotency:** `waMessageId` has a MongoDB unique index preventing duplicate message processing even under high-velocity payload replays.
- **Cross-Tenant Guardrails:** Attempting to query or manipulate a lead ID belonging to another tenant returns an HTTP `404 Not Found`, ensuring tenant resource non-existence privacy.
