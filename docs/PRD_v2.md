# BotBhai v2 — Product Requirements Document

> **Status:** Draft for engineering kickoff
> **Owner:** Product + Engineering
> **Related docs:** [`COMPETITOR_RESEARCH.md`](./COMPETITOR_RESEARCH.md), [`../README.md`](../README.md)
> **Scope of this PRD:** Product + technical. **No monetization/pricing** (out of scope by decision).

---

## 1. Overview & Goals

**BotBhai** is a self-service SaaS that lets professionals, creators, and businesses build a Retrieval-Augmented-Generation (RAG) chatbot from their own content and embed it on any website. **v1** (already built) proved the core loop — upload documents → chunk → embed (Jina) → store (Pinecone) → retrieve → answer (Groq) — plus a standout **Missing-Answers feedback loop**.

**v2** turns that MVP into a competitive product. It (a) adds the table-stakes and accuracy features every competitor ships (embeddable widget, URL/site-crawl ingestion, reranking, streaming, analytics, lead capture), and (b) **re-architects the codebase to be clean, scalable, and SOLID** so those features land on a maintainable foundation instead of accreting onto v1's tightly-coupled core.

### Why v2 (the problem with v1)

v1 works but is structurally constrained:

- **Tight coupling** — business logic imports concrete providers directly (e.g. `lib/ingest.ts` imports `embedPassages`/`upsertChunks`; `app/api/chat/route.ts` imports `generateAnswer`). Swapping a provider or unit-testing a flow is impossible without touching everything.
- **Synchronous ingestion** — `app/api/documents/route.ts` `await`s the full parse→chunk→embed→upsert pipeline inside the request. Large files time out; crawls are a non-starter.
- **One bot per user** — `botId == userId` is hardcoded in `lib/db/bots.ts`. A real builder needs many bots per account.
- **Weak public-chat security** — `/api/chat` accepts any `botId` (a Firebase uid) with no key and no origin check.
- **Missing features the README advertises but v1 never built** — PII detection, the embeddable widget, chat-history/analytics. (Confirmed absent in code; all are v2 work.)

### Success criteria

1. A new user goes from sign-up to a **live, embeddable, answering bot in minutes**.
2. A bot can be embedded on a third-party site with a **single `<script>` tag**, securely.
3. **Multiple bots per account**, each fully isolated (data, vectors, persona, widget).
4. Answer relevance measurably improves over v1 (reranking + hybrid + rewrite), validated by an eval harness.
5. The codebase passes a SOLID review: providers are swappable behind ports, use-cases are unit-tested with mock ports, and no business logic lives in route handlers.
6. v1 data and bots continue working through a defined migration.

### Locked decisions (scope inputs)

| # | Decision | Implication |
|---|----------|-------------|
| 1 | **Multi-bot per user** | `botId` decoupled from `userId`; one account owns many bots. |
| 2 | **Comprehensive & phased** | All researched features, organized into milestones **M1 / M2 / M3**, each feature with user stories + acceptance criteria. |
| 3 | **Product + technical only** | No pricing, billing, or quota-monetization sections. |
| 4 | **Core stack retained + ports** | Keep Jina / Groq / Pinecone / Firebase. New capabilities (reranker, job queue, web crawler) only behind provider-agnostic interfaces. |

---

## 2. Scope & Non-Goals

### In scope
- Clean re-architecture (hexagonal / ports-and-adapters) of the existing feature set.
- Multi-bot per user account.
- Ingestion: file (incl. DOCX/PPTX), paste text, single URL, full-site crawl/sitemap; async pipeline; PII detection/redaction; pluggable chunking.
- Retrieval/generation: reranking, hybrid search, history-aware query rewriting, token streaming, per-bot persona/model/retrieval config, richer citations.
- Conversation persistence, retention, and usage limits.
- Embeddable widget + secure public embed API.
- Multi-bot dashboard, analytics & insights, feedback loop ("revise wrong answer"), leads inbox, onboarding.
- Non-functional requirements + testing strategy.

### Non-goals (explicitly out)
- **Monetization** — pricing tiers, billing (Stripe), paid quotas. (Usage *limits* from the README are enforced for abuse/cost protection, but not tied to plans here.)
- **Full organizations / teams / multi-seat** — v2 is multi-*bot* per single owner, not multi-*member* workspaces with roles. (Designed so it can be added later without rework.)
- **Connectors** (Notion / Drive / Zendesk) and **audio/video ingestion** — only the *extension seam* is designed (M3); no connector ships in M1/M2.
- **Mobile native apps.**

---

## 3. Personas & Top User Stories

### Personas
- **Bot Owner** — a professional, creator, support lead, or small-business owner. Non-technical to semi-technical. Uploads content, configures persona, embeds the widget, monitors performance, fixes gaps.
- **End Visitor** — an anonymous visitor on the owner's website who chats with the embedded bot.
- **Engineer (internal)** — maintains/extends the platform; cares about the SOLID architecture, testability, and observability.

### Top-level user stories
- *As a Bot Owner,* I can create **several bots**, each trained on different content, and manage them from one dashboard.
- *As a Bot Owner,* I can add knowledge by **uploading files, pasting text, or pointing at my website**, and see it process in the background.
- *As a Bot Owner,* I can **embed my bot on my site with one script tag** and trust that only my site can use it.
- *As a Bot Owner,* I can see **what visitors ask, what the bot couldn't answer, and fix gaps in one click.**
- *As an End Visitor,* I get **fast, streamed, accurate answers with sources**, and can give feedback or reach a human.
- *As an Engineer,* I can **swap a provider or add a feature behind a port** and unit-test a use-case without hitting the network.

---

## 4. v1 → v2 Baseline

Verified facts about v1 (with file references) and how v2 changes each.

| v1 fact (verified in code) | v2 disposition |
|---|---|
| `BotConfig.botId == userId`; bot doc keyed by uid (`lib/db/bots.ts`, `types/index.ts`) | Auto-generated `botId` + `ownerId` field; **multi-bot per user**. |
| Providers imported concretely by callers (`lib/ingest.ts`, `app/api/chat/route.ts`) | **Ports-and-adapters**; callers depend on interfaces; concretions wired in a composition root. |
| Ingestion is **synchronous** in the POST handler (`app/api/documents/route.ts` awaits `ingestDocument`) | Move onto a **`JobQueue`**; endpoint returns `202` immediately. |
| `/api/chat` is **public, unauthenticated, takes `botId`=uid in body** (`app/api/chat/route.ts`) | Split into **authed `test-chat`** + **secured public embed chat** (embed key + origin allowlist + CORS + caps). |
| Answer returned **all-at-once** as JSON | **Token streaming (SSE)** on both surfaces. |
| Confidence = `bestScore ≥ 0.35` **and** model didn't emit `NO_ANSWER` (`lib/ai/groq.ts`) | Preserved as the anti-hallucination contract; threshold applied to the **rerank** score; `confident` persisted per message. |
| `recordMissing` dedups by normalized question, tallies `timesAsked` (`lib/db/missing.ts`) | Preserved + extended (clustering, "revise wrong answer"). |
| Documents are **`userId`-scoped**, in-memory ingest, status `processing/ready/error` (`lib/db/documents.ts`) | **`botId`-scoped**; add `queued`/`staging`/`stale`; URL & crawl sources with re-sync. |
| Chunking = recursive **char** splitter, 1000/150 (`lib/chunking/splitter.ts`, `lib/config.ts`) | Pluggable **`ChunkingStrategy`**; **token-based** default; + structure-aware + semantic. |
| Collections: `bots`, `documents`, `missing_entries`; Pinecone **namespace per `botId`** (`lib/vector/pinecone.ts`) | Add `conversations`/`messages`, `feedback`, `leads`, `embed_keys`, `usage_counters`, `analytics_daily`. Namespace-per-bot retained. |
| Config is a static object with lazy `required()` thunks (`lib/config.ts`) | **Validated-at-boot** typed config feeding the composition root; per-bot overrides layer on top. |
| README features **PII / widget / chat-history / analytics** | **Not built in v1** — net-new v2 work. |
| UI: dark theme, `brand-*` tokens, `Button`/`Card`, sidebar (`app/(dashboard)/layout.tsx`) | Reused; sidebar gains a **bot switcher**; routes become per-bot. |

**v1 strengths to preserve:** clean RAG pipeline, grounded answers with citations, the proactive Missing-Answers one-click "Add Data" loop, and the cost/latency-friendly Groq + Jina stack.

**Milestone legend (used throughout):**
- **M1 — Foundation:** clean architecture, multi-bot, async ingestion, reranking, streaming, the embeddable widget + secure embed API, onboarding. (The distribution-unblocking release.)
- **M2 — Depth:** crawl/sitemap + re-sync, hybrid search + query rewrite, PII, semantic/FAQ chunking, conversation persistence + retention + limits, analytics & insights, feedback loop, eval harness.
- **M3 — Expansion:** leads inbox + human handoff, white-label, connectors (seam only → first connector), automated tuning suggestions.

---

## 5. Architecture — Clean / Hexagonal (Ports & Adapters)

v2 adopts **ports-and-adapters (clean architecture)**. The codebase splits into concentric layers; **dependencies point inward only**. The domain core has zero IO and zero framework imports — plain TypeScript that could run anywhere.

### 5.1 Layers

1. **`domain`** — Entities & value objects (`Bot`, `Document`, `Conversation`, `MissingEntry`, `Lead`, `Feedback`, `Chunk`, `RetrievedChunk`) and pure logic (confidence scoring, question normalization, ownership invariants). **No `server-only`, no `fetch`, no SDKs.**
2. **`ports`** — TypeScript interfaces describing every capability the use-cases need. Owned by the inner layers (they express what the core *needs*) — this is the inversion in Dependency Inversion.
3. **`usecases`** — Application services, **one class per operation** (`CreateBot`, `IngestDocument`, `AnswerQuestion`, …). Receive their ports via constructor injection; orchestrate ports; own transactions and authorization.
4. **`adapters`** — Concrete implementations of ports: `JinaEmbeddingProvider`, `GroqLLMProvider`, `PineconeVectorStore`, `FirestoreBotRepository`, `FirecrawlCrawler`, `InMemoryJobQueue`/`CloudTasksJobQueue`, etc. Import SDKs and `server-only`. Depend on ports + domain, never on use-cases.
5. **`delivery`** — Next.js App Router API routes and the widget. The HTTP boundary: validate input (zod), resolve the authenticated user, ask the composition root for a wired use-case, call it, map the `Result` to a response. **No business logic.**

### 5.2 The dependency rule

```
delivery  ──▶  usecases  ──▶  ports  ◀──  adapters
                  │              ▲
                  └──▶ domain ◀──┘
```

- `delivery` → `usecases` (+ `domain` types).
- `usecases` → `ports` + `domain` only.
- `adapters` → `ports` (to implement) + `domain` (types).
- `domain` → nothing.
- The **composition root** (`src/composition`) is the *only* module allowed to import concrete adapters **and** use-cases together, to wire them.

```
                          ┌───────────────────────────────────────────────┐
                          │                  DELIVERY                       │
                          │  Next.js API routes, widget, zod validation,    │
                          │  auth resolution, HTTP/Result mapping           │
                          └───────────────────────┬─────────────────────────┘
                                                  │ resolves wired use-cases
                          ┌───────────────────────▼─────────────────────────┐
                          │                  USE-CASES                       │
                          │  CreateBot · IngestDocument · AnswerQuestion ·   │
                          │  CrawlAndIngestUrl · AddDataFromMissing · ...     │
                          │  (orchestration, authz, Result<T,E>)             │
                          └───────┬──────────────────────────────┬──────────┘
                                  │ depends on                    │ depends on
                          ┌───────▼─────────┐            ┌────────▼─────────┐
                          │     DOMAIN      │            │      PORTS       │
                          │ entities + pure │◀───────────│ EmbeddingProvider│
                          │ rules (NO IO)   │   uses     │ VectorStore, LLM │
                          └─────────────────┘            │ Reranker, Crawler│
                                  ▲                       │ JobQueue, *Repo  │
                                  │ uses domain types     └────────▲─────────┘
                                  │                                │ implemented by
                                  │                       ┌────────┴─────────┐
                                  └───────────────────────│     ADAPTERS     │
                                                          │ Jina·Groq·       │
                                                          │ Pinecone·        │
                                                          │ Firestore·       │
                                                          │ Firecrawl·Queue  │
                                                          └──────────────────┘
                              ┌──────────────────────────────────────────┐
                              │  COMPOSITION ROOT (src/composition)        │
                              │  the ONLY place that imports adapters AND  │
                              │  use-cases — wires them per config         │
                              └──────────────────────────────────────────┘
```

### 5.3 Proposed `src/` folder structure

Everything moves under `src/` (Next 15 supports `src/app`). The `@/*` alias in `tsconfig.json` repoints to `./src/*`.

```
src/
├── core/
│   ├── domain/            # bot.ts, document.ts, conversation.ts, missing-entry.ts,
│   │                      # lead.ts, feedback.ts, chunk.ts, retrieval.ts, errors.ts
│   ├── ports/             # embedding-provider.ts, vector-store.ts, llm-provider.ts,
│   │   │                  # reranker.ts, document-parser.ts, chunking-strategy.ts,
│   │   │                  # crawler.ts, job-queue.ts, clock.ts, id-generator.ts, logger.ts
│   │   └── repositories/  # bot-, document-, conversation-, missing-answer-,
│   │                      # feedback-, lead-repository.ts
│   ├── usecases/
│   │   ├── bot/           # create-bot, list-bots, get-bot, update-bot, delete-bot
│   │   ├── ingest/        # ingest-document, ingest-text, crawl-and-ingest-url, run-ingest-job
│   │   ├── chat/          # answer-question
│   │   ├── missing/       # record-missing, list-missing, resolve-missing, add-data-from-missing
│   │   ├── feedback/      # submit-feedback, revise-answer
│   │   ├── lead/          # capture-lead
│   │   └── shared/        # result.ts (Result<T,E>), authz.ts (assertOwnsBot)
│   └── shared/            # widely-shared value types
├── adapters/
│   ├── embedding/         # jina-embedding-provider.ts
│   ├── vector/            # pinecone-vector-store.ts
│   ├── llm/               # groq-llm-provider.ts
│   ├── reranker/          # jina-reranker.ts, noop-reranker.ts
│   ├── parsing/           # multi-parser.ts, pdf-, docx-, pptx-, csv-, text-parser.ts
│   ├── chunking/          # recursive-, structure-, semantic-chunking-strategy.ts
│   ├── crawler/           # firecrawl-crawler.ts, fetch-crawler.ts
│   ├── queue/             # inmemory-job-queue.ts, cloud-tasks-job-queue.ts
│   ├── persistence/firestore/   # firestore-client.ts + one repo file per aggregate
│   ├── auth/              # firebase-auth-verifier.ts
│   └── observability/     # console-logger.ts, pino-logger.ts
├── composition/
│   ├── config.ts          # validated-at-boot typed env (was lib/config.ts)
│   ├── registry.ts        # config → which adapter
│   └── container.ts       # Container interface + buildContainer() + getContainer()
├── app/                   # Next.js (moved from /app): api/, (dashboard)/, (public)/, embed/
├── widget/                # embeddable widget loader + iframe app
└── lib/http/              # validation.ts (zod), respond.ts (Result→Response), with-auth.ts
```

#### v1 → v2 file mapping

| v1 file | v2 destination | Notes |
|---|---|---|
| `types/index.ts` | `src/core/domain/*.ts` | one entity per file; drop the `botId==userId` assumption |
| `lib/ingest.ts` | `usecases/ingest/{ingest-document,run-ingest-job}.ts` | logic preserved; deps injected; sync→async |
| `lib/vector/embeddings.ts` | `adapters/embedding/jina-embedding-provider.ts` | implements `EmbeddingProvider` |
| `lib/vector/pinecone.ts` | `adapters/vector/pinecone-vector-store.ts` | implements `VectorStore`; namespace=`botId` |
| `lib/ai/groq.ts` | `adapters/llm/groq-llm-provider.ts` | implements `LLMProvider`; prompt-building moves to domain/use-case |
| `lib/db/bots.ts` | `adapters/persistence/firestore/firestore-bot-repository.ts` | `getOrCreateBot` splits into `CreateBot` use-case + repo |
| `lib/db/documents.ts` | `…/firestore-document-repository.ts` | `Status` → `domain/document.ts` |
| `lib/db/missing.ts` | `…/firestore-missing-answer-repository.ts` | `normalize()` → pure `domain/missing-entry.ts` |
| `lib/firebase/admin.ts` | `…/firestore-client.ts` | shared client |
| `lib/firebase/auth-server.ts` | `adapters/auth/firebase-auth-verifier.ts` | |
| `lib/firebase/client.ts`, `lib/auth-context.tsx` | `src/app/(dashboard)/_lib/` | client-side, unchanged behavior |
| `lib/chunking/parse.ts` | `adapters/parsing/*` | `getFileType` stays a pure helper |
| `lib/chunking/splitter.ts` | `adapters/chunking/recursive-chunking-strategy.ts` | implements `ChunkingStrategy` |
| `lib/config.ts` | `composition/config.ts` | typed + zod-validated at boot |
| `app/api/**/route.ts` | `src/app/api/bots/[botId]/**` | re-nested under `botId`; thin handlers |

### 5.4 Port interfaces

All interfaces are **narrow** (Interface Segregation). Read/write halves are split where consumers differ.

```ts
// embedding-provider.ts
export interface EmbeddingProvider {
  embedPassages(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
  readonly dimensions: number;
}

// vector-store.ts  — ISP: AnswerQuestion only needs the reader
export interface VectorRecord { id: string; values: number[]; metadata: ChunkMetadata; }
export interface VectorReader { query(ns: string, vector: number[], topK: number, filter?: MetadataFilter): Promise<RetrievedChunk[]>; }
export interface VectorWriter {
  upsert(ns: string, records: VectorRecord[]): Promise<void>;
  deleteByDocument(ns: string, documentId: string): Promise<void>;
  deleteNamespace(ns: string): Promise<void>;
}
export interface VectorStore extends VectorReader, VectorWriter {
  queryHybrid?(ns: string, dense: number[], sparse: SparseVector, topK: number, filter?: MetadataFilter): Promise<RetrievedChunk[]>;
}

// llm-provider.ts
export interface LlmMessage { role: "system" | "user" | "assistant"; content: string; }
export interface CompletionRequest { model: string; messages: LlmMessage[]; temperature?: number; maxTokens?: number; }
export interface LLMProvider {
  complete(req: CompletionRequest): Promise<{ text: string; usage: TokenUsage }>;
  stream(req: CompletionRequest): AsyncIterable<string>; // token deltas
}

// reranker.ts  (NEW capability, behind a port; NoopReranker = identity default)
export interface Reranker { rerank(query: string, chunks: RetrievedChunk[], topN: number): Promise<RetrievedChunk[]>; }

// document-parser.ts
export interface DocumentParser { supports(fileType: string): boolean; extract(buffer: Buffer, fileType: string): Promise<{ text: string; structure?: StructureHint[] }>; }

// chunking-strategy.ts
export interface ChunkingStrategy { name: "recursive" | "structure" | "semantic"; chunk(input: ChunkInput, cfg: ChunkingConfig): Promise<Chunk[]>; }

// crawler.ts  (NEW)
export interface CrawledPage { url: string; title?: string; text: string; }
export interface Crawler { crawl(seedUrl: string, opts: CrawlLimits): AsyncIterable<CrawledPage>; }

// job-queue.ts  (NEW)
export interface JobQueue { enqueue<K extends keyof JobPayloadMap>(kind: K, payload: JobPayloadMap[K]): Promise<{ jobId: string }>; }

// testability seams
export interface Clock { now(): number; }
export interface IdGenerator { newId(): string; }
export interface Logger { child(b: Record<string, unknown>): Logger; info(m: string, meta?: object): void; warn(m: string, meta?: object): void; error(m: string, meta?: object): void; }
```

#### Repository ports (per-aggregate, narrow). Every bot-scoped method takes `botId`; authorization is the use-case's job, not the repo's.

```ts
export interface BotRepository {
  create(bot: Bot): Promise<Bot>;
  findById(botId: string): Promise<Bot | null>;
  findByOwner(ownerId: string): Promise<Bot[]>;
  update(botId: string, patch: Partial<BotEditableFields>): Promise<Bot>;
  delete(botId: string): Promise<void>;
}
export interface DocumentRepository {
  create(doc: Document): Promise<Document>;
  findById(id: string): Promise<Document | null>;
  listByBot(botId: string): Promise<Document[]>;
  updateStatus(id: string, patch: StatusPatch): Promise<void>;
  delete(id: string): Promise<void>;
}
export interface ConversationRepository {
  start(c: Conversation): Promise<Conversation>;
  appendMessage(conversationId: string, m: Message): Promise<void>;
  listByBot(botId: string, limit: number, cursor?: string): Promise<Page<Conversation>>;
}
export interface MissingAnswerRepository {
  upsertOccurrence(botId: string, question: string, normalized: string, now: number): Promise<void>;
  listByBot(botId: string, status: MissingStatus): Promise<MissingEntry[]>;
  findById(id: string): Promise<MissingEntry | null>;
  resolve(id: string): Promise<void>;
}
export interface FeedbackRepository { record(f: Feedback): Promise<Feedback>; listByBot(botId: string, limit: number, cursor?: string): Promise<Page<Feedback>>; }
export interface LeadRepository { create(l: Lead): Promise<Lead>; listByBot(botId: string, limit: number, cursor?: string): Promise<Page<Lead>>; }
```

### 5.5 Composition root / Dependency Injection

**No DI framework** — explicit constructor injection + a hand-written container keeps wiring transparent, tree-shakeable, and edge-friendly.

```ts
// usecases/chat/answer-question.ts — deps via constructor (DIP)
export class AnswerQuestion {
  constructor(
    private readonly bots: BotRepository,
    private readonly embedder: EmbeddingProvider,
    private readonly vectors: VectorReader,       // narrow: read only
    private readonly reranker: Reranker,
    private readonly llm: LLMProvider,
    private readonly missing: MissingAnswerRepository,
    private readonly conversations: ConversationRepository,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}
  async execute(input: AnswerQuestionInput): Promise<Result<AnswerQuestionOutput, DomainError>> { /* … */ }
}

// composition/registry.ts — config selects adapters
export function buildContainer(cfg: Config): Container {
  const logger   = cfg.logging.driver === "pino" ? new PinoLogger() : new ConsoleLogger();
  const embedder = new JinaEmbeddingProvider(cfg.jina);
  const vectors  = new PineconeVectorStore(cfg.pinecone);
  const llm      = new GroqLLMProvider(cfg.groq);
  const reranker = cfg.reranker.enabled ? new JinaReranker(cfg.jina) : new NoopReranker();
  const queue    = cfg.queue.driver === "cloud-tasks" ? new CloudTasksJobQueue(cfg.queue) : new InMemoryJobQueue();
  const crawler  = cfg.crawler.driver === "firecrawl" ? new FirecrawlCrawler(cfg.crawler) : new FetchCrawler();
  const fs       = firestoreClient(cfg.firebase);
  const bots     = new FirestoreBotRepository(fs); /* …other repos… */
  return {
    bots, embedder, vectors, llm, reranker, queue, crawler,
    clock: new SystemClock(), ids: new UuidGenerator(), logger,
    answerQuestion: () => new AnswerQuestion(bots, embedder, vectors, reranker, llm, missing, conversations, clock, logger),
    /* …other use-case factories… */
  };
}

let singleton: Container | null = null;
export function getContainer(): Container { return (singleton ??= buildContainer(loadConfig())); }
```

**Lifetimes:** SDK clients/adapters are **singletons** per server process (v1 already memoizes these in `lib/vector/pinecone.ts`, `lib/ai/groq.ts`, `lib/firebase/admin.ts` — preserved inside the container). The `Logger` is `.child({ requestId, botId })`'d **per request**; use-case instances are created per call (stateless, negligible cost). **Tests** call `buildContainer` with a test config selecting `InMemoryJobQueue`, fake repos, `FixedClock`, `SequentialIdGenerator`.

A route becomes thin:

```ts
// app/api/chat/route.ts
export async function POST(req: NextRequest) {
  const body = ChatBodySchema.parse(await req.json());      // zod
  const result = await getContainer().answerQuestion().execute(body);
  return respond(result);                                    // Result<T,E> → NextResponse
}
```

### 5.6 Use-case catalog (SRP — one operation each)

| Use-case | Input | Output | Ports |
|---|---|---|---|
| `CreateBot` | `{ ownerId, name, persona?, modelConfig?, retrievalConfig? }` | `Bot` | `BotRepository`, `IdGenerator`, `Clock` |
| `ListBots` | `{ ownerId }` | `Bot[]` | `BotRepository` |
| `GetBot` / `UpdateBot` / `DeleteBot` | `{ ownerId, botId, … }` | `Bot` / `void` | `BotRepository` (+ authz); Delete also `VectorWriter.deleteNamespace`, `DocumentRepository` |
| `IngestDocument` | `{ ownerId, botId, filename, fileType, storageKey }` | `{ documentId, status:"queued" }` | `BotRepository`(authz), `DocumentRepository`, `JobQueue` — **enqueues, returns immediately** |
| `RunIngestJob` | `{ botId, documentId, source }` (worker) | `{ chunkCount }` | `DocumentParser`, `ChunkingStrategy`, `EmbeddingProvider`, `VectorWriter`, `DocumentRepository` |
| `IngestText` | `{ botId, documentId, text }` | `{ chunkCount }` | `ChunkingStrategy`, `EmbeddingProvider`, `VectorWriter`, `DocumentRepository` — **shared by AddDataFromMissing/ReviseAnswer** |
| `CrawlAndIngestUrl` | `{ ownerId, botId, url, limits }` | `{ jobId }` | `BotRepository`(authz), `JobQueue` (worker uses `Crawler`→`IngestText`) |
| `AnswerQuestion` | `{ botId, question, conversationId? }` | `{ answer, sources, confident, conversationId }` | `BotRepository`, `EmbeddingProvider`, `VectorReader`, `Reranker`, `LLMProvider`, `MissingAnswerRepository`, `ConversationRepository` |
| `RecordMissingAnswer` | `{ botId, question }` | `void` | `MissingAnswerRepository`, `Clock` (called by `AnswerQuestion`) |
| `ListMissing` / `ResolveMissing` | `{ ownerId, botId, … }` | `MissingEntry[]` / `void` | `BotRepository`(authz), `MissingAnswerRepository` |
| `AddDataFromMissing` | `{ ownerId, botId, entryId, answer }` | `{ documentId }` | `BotRepository`(authz), `DocumentRepository`, `IngestText`, `MissingAnswerRepository` |
| `ReviseAnswer` | `{ ownerId, botId, messageId, answer }` | `{ documentId }` | `BotRepository`(authz), `FeedbackRepository`, `IngestText` |
| `SubmitFeedback` | `{ botId, conversationId, messageId, rating, comment? }` | `Feedback` | `FeedbackRepository`, `Clock` |
| `CaptureLead` | `{ botId, conversationId?, email, name?, phone?, meta? }` | `Lead` | `LeadRepository`, `Clock` |

`AnswerQuestion`'s pipeline (preserves v1 behavior, adds reranking): `rewrite? → embedQuery → vectors.query(topK) → reranker.rerank(→finalK) → evaluateConfidence (pure domain fn) → llm.stream/complete → if !confident: recordMissing`. The `NO_ANSWER` sentinel + threshold logic from `lib/ai/groq.ts` move into a pure `evaluateConfidence()` in `domain/retrieval.ts`.

### 5.7 SOLID mapping (v1 violation → v2 decision)

- **S — Single Responsibility.** *v1:* `app/api/missing/[id]/route.ts` does HTTP parsing **and** chunking **and** embedding **and** upserting **and** Firestore writes, duplicating `lib/ingest.ts`. *v2:* `IngestText` owns the pipeline; the route only validates and delegates. Routes never embed business logic.
- **O — Open/Closed.** *v1:* adding a reranker or swapping Groq means editing `app/api/chat/route.ts`. *v2:* `AnswerQuestion` depends on the `Reranker`/`LLMProvider` ports; adding `JinaReranker` or an `OpenAILLMProvider` is a new adapter + a one-line registry change. Closed for modification, open for extension.
- **L — Liskov Substitution.** *v2:* every adapter honors its port's contract, enforced by **contract tests** (§18). `NoopReranker` and `InMemoryJobQueue` are valid substitutes for their ports; callers never branch on the implementation.
- **I — Interface Segregation.** *v1:* `lib/vector/pinecone.ts` exports upsert+query+delete together though `AnswerQuestion` only queries. *v2:* `VectorStore` splits into `VectorReader`/`VectorWriter`; `AnswerQuestion` takes only `VectorReader`. Repos expose narrow per-aggregate methods.
- **D — Dependency Inversion.** *v1:* high-level policy (`lib/ingest.ts`) imports low-level details (`embedPassages`, `upsertChunks`) directly. *v2:* use-cases depend on port interfaces owned by the core; adapters depend on those same ports; the composition root is the only place concretions and policy meet.

---

## 6. Multi-Bot Data Model

### 6.1 Key change: decouple `botId` from `userId`

v1 keys bots by `userId` and sets `botId == userId` (`lib/db/bots.ts`, `types/index.ts`). v2 gives every bot an **auto-generated `botId`** and an **`ownerId`** field. A user owns many bots.

### 6.2 Firestore schema (v2)

```
bots/{botId}                          // botId = auto-generated id
  ownerId: string                     // Firebase uid (indexed)
  name: string
  persona: { systemInstructions, tone, welcome, fallback, starterQuestions[] }
  widgetConfig: { primaryColor, position, avatarUrl?, launcherIcon, greeting,
                  showPoweredBy, leadCapture: { enabled, trigger, fields[] } }
  retrievalConfig: { topK, finalK, minScore, hybrid, rerank, rewriteHistory, filters? }
  modelConfig: { provider:"groq", model, temperature, maxTokens }
  allowedOrigins: string[]            // CORS allowlist for the embed widget
  createdAt, updatedAt: number

documents/{documentId}
  botId: string                       // (indexed) — was userId-scoped in v1
  ownerId: string                     // denormalized for owner-wide queries
  filename, fileType, sizeBytes, chunkCount, tokenCount?
  status: "queued"|"processing"|"staging"|"ready"|"error"|"stale"
  source: "upload"|"paste"|"url"|"crawl"|"connector"
  sourceUrl?, crawlId?: string
  piiSummary?: { email:number, phone:number, gov_id:number, address:number }
  progress?: { phase, done, total }
  error?: string
  uploadedAt: number

conversations/{conversationId}        // NEW
  botId (indexed), visitorId?, startedAt, lastActivityAt, messageCount, dayBucket
conversations/{conversationId}/messages/{messageId}   // subcollection
  role:"user"|"bot", content, sources?: ChatSource[], confident?,
  usage?: { promptTokens, completionTokens, costUsd }, feedback?:"up"|"down",
  createdAt, expireAt                 // TTL field (30d)

missing_entries/{id}
  botId (indexed), question, normalizedQuestion, timesAsked,
  status:"open"|"resolved", firstSeen, lastSeen, expireAt   // TTL (90d)

feedback/{id}                         // NEW
  botId, conversationId, messageId, question, answer, rating:"up"|"down",
  sourcesUsed[], comment?, createdAt

leads/{id}                            // NEW
  botId, conversationId?, name?, email, phone?, meta?, createdAt

embed_keys/{keyId}                    // NEW
  botId, publicKey:"pk_live_…", createdAt, rotatedAt?, revoked:boolean

usage_counters/{botId}__{dayBucket}   // NEW — durable daily session counter
  botId, dayBucket, sessionCount, updatedAt

analytics_daily/{botId}__{dayBucket}  // NEW — pre-aggregated rollups
  botId, dayBucket, conversations, messages, confidentRate, topQuestions[],
  thumbsUp, thumbsDown, leads, sourcesUsed[]
```

### 6.3 Composite indexes required

| Collection | Fields | Used by |
|---|---|---|
| `documents` | `botId ASC, uploadedAt DESC` | per-bot document list |
| `bots` | `ownerId ASC, updatedAt DESC` | "My Bots" list |
| `missing_entries` | `botId ASC, status ASC, timesAsked DESC` | missing-answers (matches v1 query in `lib/db/missing.ts`) |
| `missing_entries` | `botId ASC, status ASC, lastSeen DESC` | recency view |
| `conversations` | `botId ASC, lastActivityAt DESC` | conversation logs |
| `feedback` | `botId ASC, rating ASC, createdAt DESC` | low-rated answers |
| `leads` | `botId ASC, createdAt DESC` | leads inbox |

### 6.4 Pinecone namespace strategy

Unchanged conceptually — v1 already isolates per bot via `namespace(botId)` (`lib/vector/pinecone.ts`). In v2 the namespace is `${botId}` where `botId` is now an independent id. `DeleteBot` calls `VectorWriter.deleteNamespace(botId)`. (Hybrid search later requires a sparse-capable index — see §7/§19.)

### 6.5 Authorization model

Every **bot-scoped** operation verifies the caller owns the bot. Centralized:

```ts
// usecases/shared/authz.ts
export async function assertOwnsBot(bots: BotRepository, botId: string, ownerId: string): Promise<Bot> {
  const bot = await bots.findById(botId);
  if (!bot) throw new NotFoundError("bot", botId);
  if (bot.ownerId !== ownerId) throw new NotFoundError("bot", botId); // 404, not 403 — prevents id enumeration
  return bot;
}
```

Every authed route resolves `ownerId` from the verified Firebase token (`FirebaseAuthVerifier`) and passes `{ ownerId, botId }` into the use-case, which calls `assertOwnsBot` first. This replaces v1's inconsistent ad-hoc checks (`app/api/documents/[id]/route.ts` checks `doc.userId`; `lib/db/missing.ts` checks `botId` inside the repo). The **public** embed chat reads only by `botId` and never exposes owner data (see §11).

### 6.6 v1 → v2 migration plan

1. **Backfill `bots.ownerId`.** One-off admin script: for each `bots/{uid}` doc, set `ownerId = botId` (they're equal in v1). Doc id stays the same, so existing bots keep working.
2. **Backfill `documents`.** v1 docs already store both `userId` and `botId` (set equal at upload), so `botId` is already correct; add `ownerId = userId` and `source:"upload"`.
3. **Pinecone:** no data movement — namespaces are already keyed by the (old) `botId == uid`, which remains valid.
4. **New collections** (`conversations`, `feedback`, `leads`, `embed_keys`, `usage_counters`, `analytics_daily`) start empty.
5. **Embed keys:** generate one `pk_live_…` per existing bot; seed `allowedOrigins` empty (owner adds origins in the embed-config page; `localhost` allowed while a bot is in "test" state).
6. **API compatibility window:** keep a legacy resolver so an authed call with no `botId` falls back to "the user's bot whose id == uid" during transition; the dashboard migrates to the multi-bot `/api/bots` endpoints + bot switcher. Remove the fallback after cutover.
7. **Going forward,** `CreateBot` uses `IdGenerator.newId()` for `botId`, never the uid.
8. **Hybrid-search index** (cosine → dotproduct serverless) is a separate, M2-gated migration documented in §7.5 / §19.

---

## 7. Ingestion v2

**Goal:** expand from file-only to file + paste + URL + full-site crawl, all funneling into one normalized async pipeline behind ports, so connectors (M3) drop in later.

### 7.1 Sources

A discriminated union normalizes every entry point into the same pipeline:

```ts
export type SourceKind = "file" | "paste" | "url" | "crawl" | "connector";
export interface FileSource  { kind:"file";  botId; filename; fileType; storageRef; sizeBytes }
export interface PasteSource { kind:"paste"; botId; title; text }
export interface UrlSource   { kind:"url";   botId; url }
export interface CrawlSource { kind:"crawl"; botId; seedUrl; mode:"crawl"|"sitemap"; limits: CrawlLimits; refresh?: RefreshSchedule }
```

- **File upload** — keep PDF/TXT/MD/CSV; **add DOCX** (`mammoth`, preserves heading structure) and **PPTX** (one unit per slide, slide # → metadata). Keep the lazy-import pattern already used for `pdf-parse`. 10 MB cap (existing `MAX_BYTES`). `extract()` returns `{ text, structure? }` so structure-aware chunking can use heading/slide boundaries.
  - *User story:* As an owner I can upload Word docs and decks. *Acceptance:* `.docx`/`.pptx` accepted; structure captured; oversize→400; corrupt→`error` with message. **(M1)**
- **Paste text** — `POST /api/bots/[botId]/sources/paste` `{ title, text }`; `title` becomes the citation filename. *(M1)*
- **Single URL** — fetch + readability extraction (same code path as one page of a crawl); non-HTML (e.g. a PDF link) routes through the matching file parser. *(M2)*
- **Full-site crawl / sitemap** — see 7.2. *(M2)*
- **Connectors** (Notion/Drive/Zendesk) — **seam only:** a connector is just another producer of pages via the `Crawler`/source port; `SourceKind` reserves `"connector"`. *(M3)*

### 7.2 Crawler

`CrawlLimits = { maxPages=100, maxDepth=3, sameDomainOnly=true, includePaths?, excludePaths?, respectRobots=true }`.

Algorithm (runs in a crawl-orchestrator job):
1. **Seed:** `sitemap` → fetch `sitemap.xml` (+ nested); `crawl` → BFS from `seedUrl`.
2. **robots.txt:** fetched once per origin, cached; disallowed paths skipped; `Crawl-delay` honored; `respectRobots` enforced server-side.
3. **Same-domain scoping:** normalize host (strip `www`, lowercase, drop fragments, sort query); only same registrable domain unless disabled.
4. **Limits:** BFS tracks depth; stop at `maxDepth`/`maxPages`; the counter is incremented in a Firestore transaction (atomic across fan-out).
5. **Dedupe:** canonical URL set (+ `rel=canonical`); content-hash (sha256 of extracted text) avoids re-embedding identical pages.
6. **Extraction:** `@mozilla/readability` + `jsdom` strips nav/footer/ads; keeps main content + title.
7. **Per-page documents:** each kept page → one `document` (`source:"crawl"`, `filename`=title, `sourceUrl`, `crawlId`); citations link back to the page.

*Fan-out:* orchestrator enqueues N `ingest-page` jobs → each runs the shared chunk→embed→stage→promote path → orchestrator marks the crawl `ready` when children settle. *Acceptance:* respects robots/depth/pages/scope; per-page citable docs; URL+content dedupe; boilerplate excluded; crawl reports `fetched/extracted/skipped/failed`. **(M2)**

### 7.3 Async pipeline (JobQueue)

Removes ingestion from the request path. Status lifecycle: `queued → processing → staging → ready | error` (`stale` for sources pending re-sync).

```ts
export type JobType = "ingest-document" | "crawl-orchestrate" | "ingest-page" | "refresh-source" | "cleanup-orphans";
```

**Flow (file):** `POST …/documents` → validate → stage original blob → `create({status:"queued"})` → `enqueue("ingest-document", …)` → respond `202 {documentId,status:"queued"}` (**no embedding on the request path**). Worker: `processing` → parse → chunk → PII scan → embed → upsert to **staging** ids → `staging` → atomically promote to live ids → `ready` (+ `chunkCount`, `tokenCount`). On any failure: delete staging vectors → `error`.

- **Progress:** worker patches `progress {phase,done,total}` at phase boundaries; dashboard polls `GET …/documents` or subscribes via a Firestore listener.
- **Idempotency:** `jobId` is the key; deterministic vector ids (`${documentId}::${i}`) make re-runs overwrite, not duplicate; delete `chunkIndex >= newCount` before promote to avoid a stale tail.
- **Partial-failure safety:** staging-then-promote means a mid-embed failure leaves **no live vectors**. An **orphan reaper** (`cleanup-orphans`, scheduled) deletes vectors whose `documentId` has no Firestore doc — covering v1's known gap where vector-delete could fail after metadata-delete succeeded.
- **Retry:** transient (5xx/timeout) → exponential backoff; permanent (parse error) → immediate `error`, no retry.
- **Adapters:** dev = `InMemoryJobQueue` (drains on a microtask loop, zero infra); prod = Cloud Tasks / QStash / Redis behind the same `JobQueue` port, invoking a secret-signed worker route `POST /api/jobs/worker`.

*Acceptance:* POST returns `202` without waiting on embedding; status observable in near-real-time; failure leaves no live vectors; duplicate delivery creates no duplicates; dev/prod differ only by the queue binding. **(M1)**

### 7.4 Chunking strategy abstraction

Pluggable `ChunkingStrategy`, **token-based** sizing, configurable per bot/source (override → bot → global default).

- **Recursive (default, kept):** port `splitRecursive`/`withOverlap`/`cleanText` from `lib/chunking/splitter.ts`, swapping char counts for tokens (`js-tiktoken`). Behavior-preserving. **(M1)**
- **Structure-aware:** markdown/DOCX split on heading hierarchy (prepend `H1 > H2` path); **CSV = one row per chunk** (fixes v1's flatten-then-split that can break rows); FAQ Q&A pairs kept together; PPTX one chunk/slide. **(M1 CSV/markdown, M2 FAQ)**
- **Semantic:** sentence embeddings → cut at low-similarity breakpoints → pack to `maxTokens`. Higher ingest cost → **off by default**, per-bot toggle. **(M2)**

### 7.5 PII detection & redaction

Runs **after chunking, before embedding** (so vectors/stored text never contain raw PII).

```
parse → chunk → [PII scan → redact|annotate] → embed → stage → promote
```

`PiiConfig = { enabled, mode:"redact"|"keep", types:("email"|"phone"|"gov_id"|"address")[], llmVerify }`.
- **Regex pass (always):** email, phone (intl), gov-id (SSN/Aadhaar/PAN-style), address heuristics.
- **Optional LLM verify:** flagged spans (not the whole corpus) sent to `LLMProvider` to cull false positives.
- **redact** → replace spans with `[REDACTED]` in embedded text + stored metadata; **keep** → text intact, findings recorded to `document.piiSummary`.

*Acceptance:* regex on every chunk pre-embed; `redact` leaves no raw PII indexed; `keep` records a summary; LLM verify toggleable; redacted snippets propagate to citations. **(M2)**

---

## 8. Retrieval & Generation v2

**Goal:** raise relevance (rerank, hybrid, rewrite), stream tokens, and make persona/model/retrieval per-bot — while preserving v1's anti-hallucination contract.

### 8.1 Per-bot retrieval config

`RetrievalConfig = { topK=12, finalK=4, minScore, hybrid, rerank, rewriteHistory, filters? }`, resolved per bot, defaulting to global.

### 8.2 Pipeline

1. **History-aware rewrite (optional):** when `rewriteHistory` and prior turns exist, `LLMProvider` produces a standalone query from `(history, question)` — enables follow-ups ("what about its price?"). First turn skips it. **(M2)**
2. **Hybrid retrieval:** dense (`embedQuery`) **+** sparse/BM25; fuse via RRF; retrieve `topK`. Requires a sparse-capable index (see 8.4); `hybrid:false` falls back to v1 dense path. **(M2)**
3. **Metadata filter:** apply `filters` (documentId set / source url / language) — same Pinecone metadata mechanism v1 already uses for `deleteMany({documentId})`. **(M1)**
4. **Rerank (`Reranker` port):** send `topK` candidates → Jina/Cohere reranker → keep `finalK` (3–5). Rerank score feeds `minScore` and the answered/missing decision. Reranker failure degrades gracefully to dense top-k. **(M1)**
5. **Generate** with reranked context. Below `minScore` or `NO_ANSWER` → `recordMissing` (loop preserved).

### 8.3 Generation

- **Streaming (SSE):** `POST …/chat` returns a `ReadableStream`: `token` events → `sources` event (provenance) → `usage` event → `done {confident, messageId}`. Groq adds `stream:true`. The test-chat page and widget render incrementally; `NO_ANSWER` detected on the accumulated buffer yields the configured fallback. **(M1)**
- **Persona-driven prompts:** generalize the hardcoded `lib/ai/groq.ts` prompt into a renderer over `Persona = { name, instructions, tone, welcome, fallback, starterQuestions? }`. **Grounding rules + `NO_ANSWER` sentinel preserved exactly.** **(M1)**
- **Per-bot model + cost:** `bot.modelConfig.model` overrides the global default; capture Groq token `usage`, compute `costUsd` from a per-model rate table, persist per message. **(M2)**
- **Citation provenance:** map each reranked chunk → document → source; citations carry `{ filename|title, url?, page?/slide?, snippet, score }` (additive over v1's `{filename,snippet,score}`). **(M1)**

### 8.4 Index migration note (hybrid)

The current 768-dim **cosine** index (`PINECONE_INDEX_NAME=botbhai-mvp`) doesn't support sparse vectors. Plan: stand up a **dotproduct serverless** index, dual-write during cutover, backfill via re-embed jobs (reuse the refresh/cleanup machinery), then flip reads. **Rerank (M1) and streaming work on the existing index;** only hybrid (M2) is gated on this migration.

---

## 9. Conversation Persistence & Retention

**Goal:** build the session/message model the README promises (absent in v1), with retention and usage limits.

### 9.1 Model
`ChatSession { id, botId, visitorId, startedAt, lastActivityAt, messageCount, dayBucket }` and `ChatMessage { id, sessionId, botId, role, content, sources?, confident?, usage?, feedback?, createdAt, expireAt }` (schema in §6.2). Mirrors v1 adapter conventions (collection const, typed CRUD, merge-set).

### 9.2 Retention (Firestore TTL)
- **Chat logs purge after 30 days**, **missing-questions after 90 days** (README) — implemented via Firestore **TTL policies** on `expireAt`, set at write time; owner-configurable within bounds.

### 9.3 Usage limits (durable, not in-memory)
- **≤ 200 sessions/day/bot:** on new-session creation, transactionally increment `usage_counters/{botId}__{dayBucket}`; reject the 201st with `429` + friendly message. (Replaces the README's non-durable in-memory tracking.)
- **≤ 15 concurrent:** "concurrent" = sessions with `lastActivityAt` in a sliding window (e.g. 5 min); maintain a counter with heartbeat per message; over → `429`; a sweep job decrements expired actives. With multiple server replicas, the counter lives in a shared store (Redis) so the cap holds globally.
- Both checks run **before** generation; no partial charges on rejection.

*Acceptance:* every turn persists session + messages with sources/usage/confidence; logs listable per bot newest-first; TTL purges on schedule; caps enforced transactionally with graceful `429`. **(M2)**

---

## 10. Embeddable Widget

**User story:** As a site owner, I paste **one `<script>` tag** and a branded, sandboxed chat bubble appears that answers from my bot. **(M1)**

### 10.1 Three parts
1. **Loader script** — `GET /embed.js` (static, cached, **< 10 KB gzipped, zero deps**). Reads `data-*` attrs / a `window.BotBhai` config, creates a single `<iframe>` host element positioned fixed, opens the `postMessage` channel. **Contains no chat UI and calls no AI API** — it only boots the iframe, keeping host-page CSS/JS fully isolated.
2. **Iframe app** — `GET /embed/[botId]` (Next route rendering the chat app on BotBhai's origin). Calls `GET /api/embed/[botId]/config`, renders launcher/panel, handles streaming chat, citations, thumbs, lead capture. Because it runs on BotBhai's origin, embed key + CORS are enforced server-side, never exposed to the host page.
3. **Security boundary** — loader ↔ iframe communicate only via `postMessage` with an **explicit `targetOrigin`** (never `*`) and a typed envelope (`resize`, `open`/`close`, `unread-badge`, `handoff-request`, `lead-submitted`). The loader validates `event.origin === BOTBHAI_ORIGIN` on every inbound message. The iframe uses `sandbox="allow-scripts allow-forms allow-same-origin"`.

### 10.2 The snippet owners copy
```html
<script src="https://app.botbhai.com/embed.js"
        data-bot-id="bot_8f3kd92m"
        data-key="pk_live_a1b2c3..."   <!-- public embed key, not a secret -->
        async></script>
```
Optional: `<script>window.BotBhai = { position:"bottom-right", openOnLoad:false };</script>`.

### 10.3 Theming (server-driven, set in dashboard)
`primaryColor`, `launcherIcon`, `avatarUrl`, `position`, `greeting`, `welcomeMessage`, `suggestedQuestions[]` (≤5), `fallbackMessage`, `showPoweredBy` (white-label, M3), `bubbleSize`, `headerTitle`.

### 10.4 Conversation features
Welcome message + clickable starter questions; **streaming** answers; collapsible citations (reuses v1 `ChatSource` + the `<details>` pattern from `test-chat`); thumbs up/down; lead-capture form (trigger: after N turns / on handoff / on low-confidence); human-handoff hook (postMessage + optional webhook); "Powered by BotBhai" (hideable in M3).

**Acceptance criteria:**
1. A new bot embeds on a third-party page via one `<script>` tag and streams a working answer in **< 5 min** from copy.
2. The widget injects exactly one DOM node and neither leaks nor inherits styles (verified against a page with aggressive global CSS).
3. Every `postMessage` specifies an explicit `targetOrigin`; mismatched-origin inbound messages are dropped.
4. First token renders without blocking the page; suggested questions, citations, thumbs all interactive.
5. Removing the script tag fully removes the widget (no residual globals/timers).

---

## 11. Public Embed API & Security

**User story:** As BotBhai, I expose bots to anonymous visitors safely, so a stranger cannot drive or scrape another customer's bot by guessing an id. **(M1)**

### 11.1 Endpoints
| Method + path | Purpose | Returns |
|---|---|---|
| `GET /api/v1/embed/[botId]/config` | Public persona + theme + suggested questions | `{ name, avatarUrl, primaryColor, position, greeting, welcomeMessage, suggestedQuestions[], fallbackMessage, showPoweredBy, leadCapture }` — **never** instructions/model/knobs |
| `POST /api/v1/embed/[botId]/chat` | Streaming grounded answer | `text/event-stream`: `token` → `sources`/`usage` → `done {confident, conversationId, messageId}` |
| `POST /api/v1/embed/[botId]/feedback` | Thumbs up/down | `{ ok }` |
| `POST /api/v1/embed/[botId]/lead` | Lead submission | `{ ok }` |
| `OPTIONS /api/v1/embed/[botId]/*` | CORS preflight | — |

### 11.2 Security model — the fix for v1's guessable-uid hole
v1's `/api/chat` accepts any `botId` (= a Firebase uid) with no key, no origin check. v2 layers:
1. **Public embed key (`pk_live_…`)** — per-bot, rotatable, non-secret (lives in the snippet); required on every embed call.
2. **Allowed-origins allowlist + CORS** — validate the `Origin` header against `bot.allowedOrigins`; reject (`403 FORBIDDEN_ORIGIN`) on mismatch (dev bypass for `localhost` only while a bot is in "test" state). Return `Access-Control-Allow-Origin: <matched origin>` (never `*`); handle `OPTIONS` preflight.
3. **Rate limiting** — per-IP + per-bot token bucket on `chat`; `429 RATE_LIMITED` + `Retry-After`.
4. **Caps** — daily session ≤ 200 and concurrency ≤ 15 (§9.3); over → `429/503 CAP_EXCEEDED` with the bot's fallback message.
5. **Abuse protection** — max question length, basic UA/bot heuristics, optional challenge on burst, hard per-message token ceiling.

The dashboard test-chat uses an **authed** sibling (`POST /api/bots/[botId]/test-chat`, Bearer + ownership), so internal testing is never gated by embed quotas/keys.

**Acceptance criteria:**
1. Missing/invalid embed key → `401`; valid key from a non-allowlisted origin → `403`.
2. Guessing a valid `botId` without key + allowlisted origin yields no answer (regression vs the v1 hole).
3. Exceeding caps → `429/503` + fallback; widget degrades gracefully.
4. CORS preflight succeeds only for allowlisted origins; ACAO echoes the specific origin, never `*`.
5. `config` response contains no instructions, model, or retrieval params (schema test).

---

## 12. Multi-Bot Dashboard

**User story:** As an owner, I create and manage multiple bots, each with its own knowledge base, persona, widget, analytics, and inbox, from one place. **(M1 foundation; sub-features M1–M3)**

- **Bot switcher** in the sidebar (replaces the static title in `app/(dashboard)/layout.tsx`); selecting a bot sets the active `botId` for all `/dashboard/[botId]/...` routes.
- **"My Bots"** landing: a card per bot (name, avatar, status, # docs, last activity) + "Create bot"; empty state → onboarding (§15).

| Section | Route | Milestone | Notes |
|---|---|---|---|
| Sources | `/dashboard/[botId]/sources` | M1 upload; M2 url/crawl | async status + re-sync |
| Settings | `/dashboard/[botId]/settings` | M1 | persona, branding, widget config, model, retrieval knobs ("advanced") |
| Test-chat | `/dashboard/[botId]/test-chat` | M1 | authed, streaming; `POST /api/bots/[botId]/test-chat` |
| Embed-config | `/dashboard/[botId]/embed` | M1 | copy snippet + **live preview**; manage embed key (rotate) + allowed-origins |
| Missing-answers v2 | `/dashboard/[botId]/missing` | M2 | trending/clustered + "Add data" + **"Revise wrong answer"** |
| Analytics | `/dashboard/[botId]/analytics` | M2 | §13 |
| Conversations | `/dashboard/[botId]/conversations` | M2 | read transcripts, filter by confident/thumbs |
| Leads | `/dashboard/[botId]/leads` | M3 | list + export + handoff log |

**Acceptance:** ≥2 bots per user, fully isolated (data, vectors, namespace); switcher persists active bot across nav/reload; every per-bot call enforces ownership and returns `404` for non-owned bots; deleting a bot removes its Firestore docs + Pinecone namespace; embed-config live preview reflects unsaved theme changes.

---

## 13. Analytics & Insights

**User story:** As an owner, I see volume, resolution, what people ask, where my content has gaps, and satisfaction. **(M2)**

**Events logged** (append-only, by the chat/feedback/lead paths): `conversation_started`, `message_sent {confident, sourcesUsed[], latencyMs, tokenCount}`, `answer_unresolved`, `feedback_given`, `lead_captured`, `handoff_requested`. Note: `sourcesUsed` and `confident` already exist in v1's chat path (`chunks.slice(0,3)`, the `answered` boolean) — v2 just **persists** them instead of discarding.

**Metrics:** # conversations, # messages (with sparkline); **resolution/confidence rate** (= confident ÷ total); **top questions** (clustered via the `normalize()` dedup already in `missing.ts`); **content-gap insights** (top open `missing_entries` by `timesAsked`); **sources-used frequency**; **thumbs satisfaction** (up ÷ up+down); **leads captured**.

**Aggregation (hybrid):** raw events append-only; a scheduled rollup writes daily pre-aggregates to `analytics_daily/{botId}__{day}`; the dashboard reads pre-aggregates (bounded queries, no full-collection scans); "last 24h" reads live `usage_counters`. Raw-event TTL follows the 30d/90d retention windows.

**Acceptance:** each turn yields a `message_sent` with `confident` + `sourcesUsed`; analytics renders from daily aggregates in a single bounded query; resolution rate / satisfaction / top-5 correct against a seeded set; content-gap insights deep-link into the missing-answers page; strictly per-bot.

---

## 14. Feedback & Improvement Loop

**User story:** As an owner, when my bot gives a thumbs-down or wrong answer, I correct it once and the fix is embedded immediately — extending the Missing-Answers moat from *unanswered* to *wrong* answers. **(M2)**

**Flow:** visitor thumbs down/up → `POST …/embed/[botId]/feedback` → stored via `FeedbackRepository` (`{botId, conversationId, messageId, question, answer, rating, sourcesUsed[]}`) → dashboard surfaces **low-rated answers** (grouped, sorted by frequency) in missing-answers v2 + conversation logs → **"Revise answer"**: owner edits the correct answer → chunk → embed → upsert (reuses the exact `add-data` pipeline in `app/api/missing/[id]/route.ts`: `chunkText`→`embedPassages`→`upsertChunks`), tagged as a manual correction → the gap is marked resolved.

**Acceptance:** thumbs recorded with `messageId` + answer text, viewable in-session; low-rated list sorted by count with a "Revise answer" action; revised info retrievable in the very next test-chat query (verified e2e); revising marks the gap resolved (mirrors `resolveMissing`) and is ownership-checked; the v1 one-click "Add data" for unanswered questions still works unchanged.

---

## 15. Onboarding Flow

**User story:** As a new user, I go from sign-up to a live, embeddable bot in minutes: create → add source → auto-process → test → copy snippet. **(M1)**

**Steps & defaults:** (1) **Create bot** — only name required; persona/tone/avatar/color/greeting/suggested-questions all defaulted; a `pk_live_` key + `localhost`-friendly allowlist auto-provisioned. (2) **Add a source** — upload (M1) or paste URL (M3); inline supported-types/size guidance. (3) **Auto-process** — show `processing → ready`; advance on first `ready`. (4) **Test** — drop into streaming test-chat with a pre-filled suggested question. (5) **Copy snippet** — show `<script>` + live preview + "add your domain to the allowlist."

**Empty states:** no bots → "Create your first bot"; bot with no sources → "Add knowledge…"; no conversations/leads → placeholders pointing at the embed page.

**Acceptance:** new user reaches a grounded test-chat answer in minutes; bot creation needs only a name; stepper reflects real processing status and auto-advances on `ready`; final step yields a valid copyable snippet + live preview; any step is skippable and resumable from the bots list without data loss.

---

## 16. Full API Surface

All authed endpoints require `Authorization: Bearer <Firebase ID token>` (via `FirebaseAuthVerifier`) **plus** a bot-ownership check on every `[botId]` route. Embed endpoints use the public-key + origin model (§11).

### 16.1 Authed dashboard endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/bots` | List the user's bots |
| POST | `/api/bots` | Create a bot (returns `botId` + embed key) |
| GET | `/api/bots/[botId]` | Full bot config (incl. instructions/model/knobs) |
| PATCH | `/api/bots/[botId]` | Update persona/branding/widget/model/retrieval knobs/allowedOrigins |
| DELETE | `/api/bots/[botId]` | Delete bot + namespace + child data |
| POST | `/api/bots/[botId]/embed-key/rotate` | Rotate the public embed key |
| GET | `/api/bots/[botId]/documents` | List sources |
| POST | `/api/bots/[botId]/documents` | Upload a file (multipart) → `202 queued` |
| POST | `/api/bots/[botId]/sources/paste` | Paste-text source |
| POST | `/api/bots/[botId]/sources/url` | Add a URL/crawl source (M2) |
| POST | `/api/bots/[botId]/sources/[id]/resync` | Re-sync a URL/crawl source (M2) |
| DELETE | `/api/bots/[botId]/documents/[id]` | Delete a source + its vectors |
| POST | `/api/bots/[botId]/test-chat` | Authed streaming playground (no embed quotas) |
| GET | `/api/bots/[botId]/missing` | List missing entries (`?status=open\|resolved`) |
| POST | `/api/bots/[botId]/missing/[id]` | `add-data` / `resolve` (v1) + `revise` (M2) |
| GET | `/api/bots/[botId]/conversations` | List/read transcripts (M2) |
| GET | `/api/bots/[botId]/feedback` | Low-rated answers (M2) |
| GET | `/api/bots/[botId]/analytics` | Daily aggregates (M2) |
| GET | `/api/bots/[botId]/leads` | Leads inbox + export (M3) |
| POST | `/api/jobs/worker` | Queue-invoked ingest worker (secret-signed, not user-facing) |

### 16.2 Public embed endpoints
`GET /embed.js` · `GET /embed/[botId]` · `GET/POST /api/v1/embed/[botId]/{config,chat,feedback,lead}` · `OPTIONS /api/v1/embed/[botId]/*` — all per §11.

> The v1 `POST /api/chat` is **removed**; its callers move to `/api/bots/[botId]/test-chat` (authed) and `/api/v1/embed/[botId]/chat` (public).

### 16.3 Error model & versioning
Consistent error envelope on every route: `{ "error": { "code": "<MACHINE_CODE>", "message": "<human>", "details"?: {} } }` with the matching status. Codes: `UNAUTHORIZED` (401), `FORBIDDEN_ORIGIN` (403), `NOT_FOUND` (404, also for non-owned bots — prevents enumeration), `VALIDATION` (400), `RATE_LIMITED` (429 + `Retry-After`), `CAP_EXCEEDED` (429/503), `INGESTION` (422), `INTERNAL` (500). Standardizes v1's ad-hoc `{ error: string }`. The **public** embed API is path-versioned (`/api/v1/embed/...`) so existing embeds never break; authed first-party endpoints evolve under additive/backward-compatible rules.

---

## 17. Non-Functional Requirements

**Performance budgets**
- Embed-chat **first-token latency:** p50 < 800 ms, p95 < 2 s (Groq `llama-3.1-8b-instant` is fast; streaming is the new win).
- Widget **loader bundle < 10 KB gzipped**, zero deps, fully async (non-render-blocking).
- Iframe app **interactive launcher < 1.5 s** cold.
- `config` endpoint cacheable (short TTL / CDN) — public, non-personalized.

**Scalability**
- Per-bot Pinecone namespace isolation scales with bot count.
- Daily-aggregate analytics avoid full-collection scans.
- Long ingestion/crawls run async (never block the request thread).
- Stateless API routes; concurrency-cap state in a shared store (Redis) so the ≤15 cap holds across replicas.

**Security / authorization**
- Every `[botId]` route enforces `bot.ownerId === uid`; non-owned → `404`.
- Embed = public key + allowed-origins + CORS (never `*`) + rate limits + caps (the explicit replacement for v1's guessable-uid `/api/chat`).
- Embed keys rotatable; instructions/model/knobs never leave the authed surface.
- Secrets in env/secret-manager; PII handled at ingest per §7.5.

**Observability**
- Structured request logs with `requestId`, `botId`, `conversationId`, latency, `confident`, cap-hit reason.
- Per-bot usage counters + error-rate dashboards; alert on cap saturation and embed-origin rejections (misconfig/abuse signal).

**Accessibility (widget — WCAG 2.1 AA)**
- Keyboard-operable launcher/panel; visible focus rings; ARIA roles for the chat log (`log` / `aria-live="polite"` for streamed answers); labeled lead-capture controls; owner-color contrast validation (warn in dashboard); respects `prefers-reduced-motion`.

**Browser support:** last 2 versions of Chrome/Firefox/Safari/Edge, iOS Safari, Android Chrome; graceful degradation (static fallback) where streaming/`EventSource` is unavailable.

---

## 18. Cross-Cutting Concerns

- **Validation at the edge:** zod schemas in `src/lib/http/validation.ts`, called by routes before any use-case runs; the domain trusts its inputs. Replaces scattered manual checks (`app/api/chat/route.ts`, `app/api/bot/route.ts`).
- **Result / Either + domain errors:** use-cases return `Result<T, DomainError>` for expected failures; only programmer errors throw. `DomainError` hierarchy (`NotFoundError`, `ForbiddenError`, `ValidationError`, `IngestionError`) carries `code` + `httpStatus`. `src/lib/http/respond.ts` maps `Result` → `NextResponse` once, consistently.
- **Structured logging:** `Logger` port; `ConsoleLogger` (dev) / `PinoLogger` (prod); a delivery wrapper generates/propagates `requestId` and `.child()`s it into the use-case. Replaces bare `console.error`.
- **Config at boot:** `src/composition/config.ts` validates all env with zod at startup (fail fast) — keeps v1's single-source-of-env principle but typed and total (no lazy `required()` thunks deferring failures to first call).
- **Testing strategy:**
  - **Unit (use-cases):** instantiate with **in-memory mock ports** (`InMemoryBotRepository`, `FakeEmbeddingProvider`, `FakeLLMProvider`, `FixedClock`, `SequentialIdGenerator`) — fast, no network. Cover authz, confidence threshold, missing-answer recording, multi-bot isolation. (Impossible in v1 due to concrete imports.)
  - **Contract tests (per adapter):** one shared suite per port run against each implementation (real + fake) to prove Liskov substitutability — real adapters against a test Pinecone index / Firestore emulator in CI.
  - **Integration:** real container + Firestore emulator + `InMemoryJobQueue`; exercise `IngestDocument → RunIngestJob → AnswerQuestion` end-to-end.
  - **E2E:** Playwright for dashboard flows (create bot, upload, chat, resolve missing) and the widget on a test host page.
  - **Tooling:** add **Vitest** + Firestore emulator (none today; `package.json` has only `tsx`). Domain layer targets ~100% coverage (it's pure).

---

## 19. RAG Tuning Defaults (v1 → v2)

| Knob | v1 (verified) | v2 default | Rationale |
|---|---|---|---|
| Chunk sizing | 1000 **chars** / 150 overlap | ~**512 tokens** / ~64 (12%) | Token-based matches embed/LLM budget; strong recall/precision balance |
| Chunking strategy | recursive char | recursive + structure-aware (auto by source) | Keep proven default; lift FAQ/CSV/heading retrieval |
| Candidate `topK` | 5 | **12** | Wider pool for the reranker |
| Final K (to LLM) | 5 | **4** (3–5) | Tighter, higher-precision context for an 8B model |
| Rerank | none | **on** (Jina/Cohere) | Highest-ROI relevance gain |
| Hybrid (dense+sparse) | dense only | **on** (after index migration) | Recovers exact terms/SKUs/codes |
| Min score | 0.35 raw **cosine** | tuned on **rerank** score (~0.3 start), per-bot | Rerank scores aren't comparable to cosine; tune per corpus via eval |
| History rewrite | none | **on** when history present | Multi-turn follow-ups |
| Streaming | non-streaming | **SSE streaming** | Perceived-latency win; pairs with fast Groq |
| Temperature | 0.2 | **0.2** | Low temp preserves grounding |
| `max_tokens` | 700 | 700–1024, per-bot | Headroom for cited answers |
| Model | `llama-3.1-8b-instant` (global) | per-bot, default unchanged | Keep cost/latency edge; owners can upgrade |
| PII | not built | regex on, `mode:keep`, `llmVerify:off` | Safe default; redaction opt-in |
| Semantic chunking | n/a | **off** by default | Higher ingest cost; enable per-bot |

**Migration callout:** hybrid (+ its dotproduct index) is the only v2 default requiring backend migration; everything else layers onto the existing cosine index + Groq/Jina stack.

---

## 20. Milestone Roadmap

**M1 — Foundation (distribution-unblocking).** Clean architecture (ports/adapters, DI, use-cases, `Result`, zod, Vitest); multi-bot data model + migration + `assertOwnsBot`; async ingestion (`JobQueue`: in-process dev + one prod adapter, staging→promote, orphan reaper); file ingest + DOCX/PPTX + paste; `ChunkingStrategy` (recursive token-based + CSV/markdown structure); per-bot `RetrievalConfig` + metadata filters; **reranking**; **token streaming**; persona templates (welcome/fallback/starter questions); citation provenance; **embeddable widget** + **secure public embed API**; multi-bot dashboard shell + bot switcher + embed-config; onboarding.

**M2 — Depth.** Crawl/sitemap + re-sync schedule; FAQ + semantic chunking; **PII** (regex + redact/keep + LLM verify); **hybrid search** + index migration; **history-aware rewrite**; per-bot model + cost accounting; conversation persistence + retention + usage limits; analytics & insights; feedback loop ("revise wrong answer"); eval harness + near-miss logging + thumbs.

**M3 — Expansion.** Leads inbox + human handoff; white-label; connectors (Notion/Drive/Zendesk) via the source/crawler seam → first connector; automated tuning suggestions from the feedback loop; LLM-verify hardening.

### Quality & evaluation (M2)
An offline eval harness (`scripts/eval.ts`, mirroring `scripts/test_integrations.ts`) runs a golden Q&A set through the real pipeline and reports retrieval hit-rate, recall@k, and LLM-judged faithfulness/relevance — enabling A/B of config (rerank/hybrid/chunk-size) before shipping. Near-threshold misses are logged; Missing-Answers clusters + thumbs-downs feed the golden set and tuning review.

---

## 21. Open Questions & Risks

| # | Item | Risk / decision needed |
|---|---|---|
| 1 | **Hybrid-search index migration** (cosine → dotproduct serverless) | Requires a new Pinecone index + dual-write/backfill. Rerank ships first on the existing index; hybrid is gated on this. Confirm timing and re-embed cost. |
| 2 | **Prod JobQueue adapter** | Choose Cloud Tasks vs QStash vs Redis/BullMQ based on the deploy target (serverless vs long-running worker). In-process adapter covers dev regardless. |
| 3 | **Crawler engine** | Build on `fetch` + `@mozilla/readability` in-house, or use a hosted crawler (Firecrawl)? Behind the `Crawler` port either way; decision affects JS-rendered-site coverage. |
| 4 | **Semantic chunking cost** | Extra embedding calls at ingest; keep off-by-default and measure ROI on the eval set before promoting. |
| 5 | **Concurrency-cap store** | The ≤15 concurrent cap needs a shared store (Redis) once there are multiple replicas; single-instance dev can use memory. |
| 6 | **`src/` move** | Relocating `app/`→`src/app/` + repointing `@/*` is a large mechanical change; do it as the first M1 PR with the build green before feature work. |
| 7 | **Reranker provider** | Jina Reranker (keeps the stack single-vendor) vs Cohere Rerank (quality benchmark). Behind the `Reranker` port; pick via eval. |
| 8 | **Multilingual** | Jina + Llama are multilingual-capable but answering-in-query-language isn't explicitly wired; scope for M2/M3 if demanded. |

---

*End of PRD. This document is the engineering blueprint for BotBhai v2; companion competitor analysis lives in [`COMPETITOR_RESEARCH.md`](./COMPETITOR_RESEARCH.md).*
