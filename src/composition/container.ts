import "server-only";
import { loadConfig, type AppConfig } from "./config";

// ── Adapters ──
import { JinaEmbeddingProvider } from "@adapters/embedding/jina-embedding-provider";
import { PineconeVectorStore } from "@adapters/vector/pinecone-vector-store";
import { GroqLLMProvider } from "@adapters/llm/groq-llm-provider";
import { NoopReranker } from "@adapters/reranker/noop-reranker";
import { MultiParser } from "@adapters/parsing/multi-parser";
import { RecursiveChunkingStrategy } from "@adapters/chunking/recursive-chunking-strategy";
import { InMemoryJobQueue, registerJobHandler } from "@adapters/queue/inmemory-job-queue";
import { getDb } from "@adapters/persistence/firestore/firestore-client";
import { FirestoreBotRepository } from "@adapters/persistence/firestore/firestore-bot-repository";
import { FirestoreDocumentRepository } from "@adapters/persistence/firestore/firestore-document-repository";
import { FirestoreMissingAnswerRepository } from "@adapters/persistence/firestore/firestore-missing-answer-repository";
import { FirestoreFeedbackRepository } from "@adapters/persistence/firestore/firestore-feedback-repository";
import { FirestoreEmbedKeyRepository } from "@adapters/persistence/firestore/firestore-embed-key-repository";
import { FirebaseAuthVerifier } from "@adapters/auth/firebase-auth-verifier";
import { getAdminApp } from "@adapters/persistence/firestore/firestore-client";

// ── Use-cases ──
import { CreateBot } from "@core/usecases/bot/create-bot";
import { ListBots } from "@core/usecases/bot/list-bots";
import { GetBot } from "@core/usecases/bot/get-bot";
import { UpdateBot } from "@core/usecases/bot/update-bot";
import { DeleteBot } from "@core/usecases/bot/delete-bot";
import { IngestDocument } from "@core/usecases/ingest/ingest-document";
import { RunIngestJob } from "@core/usecases/ingest/run-ingest-job";
import { IngestText } from "@core/usecases/ingest/ingest-text";
import { AnswerQuestion } from "@core/usecases/chat/answer-question";
import { ListMissing } from "@core/usecases/missing/list-missing";
import { ResolveMissing } from "@core/usecases/missing/resolve-missing";
import { AddDataFromMissing } from "@core/usecases/missing/add-data-from-missing";
import { SubmitFeedback } from "@core/usecases/feedback/submit-feedback";
import { ListDocuments } from "@core/usecases/ingest/list-documents";
import { v4 as uuid } from "uuid";

export interface Container {
  cfg: AppConfig;
  authVerifier: FirebaseAuthVerifier;

  // Use-case factories (stateless, new instance per call)
  createBot(): CreateBot;
  listBots(): ListBots;
  getBot(): GetBot;
  updateBot(): UpdateBot;
  deleteBot(): DeleteBot;
  ingestDocument(): IngestDocument;
  runIngestJob(): RunIngestJob;
  answerQuestion(): AnswerQuestion;
  listMissing(): ListMissing;
  resolveMissing(): ResolveMissing;
  addDataFromMissing(): AddDataFromMissing;
  submitFeedback(): SubmitFeedback;
  listDocuments(): ListDocuments;
}

let _container: Container | null = null;

export function getContainer(): Container {
  if (_container) return _container;

  const cfg = loadConfig();
  const db = getDb(cfg.firebase.adminJson);
  const adminApp = getAdminApp(cfg.firebase.adminJson);

  // Singleton adapters
  const embedder = new JinaEmbeddingProvider(cfg.jina);
  const vectors = new PineconeVectorStore(cfg.pinecone);
  const llm = new GroqLLMProvider(cfg.groq);
  const reranker = new NoopReranker();
  const parser = new MultiParser();
  const chunker = new RecursiveChunkingStrategy();
  const queue = new InMemoryJobQueue();

  const bots = new FirestoreBotRepository(db);
  const docs = new FirestoreDocumentRepository(db);
  const missing = new FirestoreMissingAnswerRepository(db);
  const feedback = new FirestoreFeedbackRepository(db);
  const embedKeys = new FirestoreEmbedKeyRepository(db);

  const chunkingConfig = { strategy: "recursive" as const, maxTokens: cfg.chunking.maxTokens, overlapTokens: cfg.chunking.overlapTokens };

  const ingestText = new IngestText(embedder, vectors, chunker, docs, chunkingConfig);
  const runIngestJob = new RunIngestJob(parser, embedder, vectors, chunker, docs, chunkingConfig);

  // Register the job handler for the in-process queue
  registerJobHandler("ingest-document", async (payload) => {
    await runIngestJob.execute(payload);
  });

  const authVerifier = new FirebaseAuthVerifier(adminApp);

  _container = {
    cfg,
    authVerifier,
    createBot: () => new CreateBot(bots, embedKeys, () => uuid()),
    listBots: () => new ListBots(bots),
    getBot: () => new GetBot(bots),
    updateBot: () => new UpdateBot(bots),
    deleteBot: () => new DeleteBot(bots, docs, vectors, embedKeys),
    ingestDocument: () => new IngestDocument(bots, docs, queue, () => uuid()),
    runIngestJob: () => runIngestJob,
    answerQuestion: () => new AnswerQuestion(bots, embedder, vectors, reranker, llm, missing, cfg.retrieval),
    listMissing: () => new ListMissing(bots, missing),
    resolveMissing: () => new ResolveMissing(bots, missing),
    addDataFromMissing: () => new AddDataFromMissing(bots, missing, docs, ingestText, () => uuid()),
    submitFeedback: () => new SubmitFeedback(feedback, () => uuid()),
    listDocuments: () => new ListDocuments(bots, docs),
  };

  return _container;
}
