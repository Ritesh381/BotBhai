# BotBhai — Competitor & Landscape Research

> **What this is:** A comparison of self-service RAG chatbot–builder SaaS platforms in the same space as **BotBhai** — tools that let a non-technical user upload documents (or point at a website), and get a personalized, embeddable AI chatbot grounded in that content.
>
> **Sourcing & confidence note:** This document is compiled from general product knowledge of these platforms plus an (interrupted) web-research pass. Public-facing product behavior, supported inputs, and UX patterns are well-documented by the vendors themselves and are **high confidence**. Internal infrastructure (which exact vector DB / embedding model a company runs in production) is **rarely disclosed publicly** — where a specific backend is named below it is marked as either *(documented)* or *(industry-typical inference)*. Treat the latter as "what a team almost certainly does given the architecture," not a confirmed fact. Pricing and feature tiers change frequently; verify before quoting.

---

## 1. The landscape at a glance

| Platform | Primary positioning | Headline differentiator |
| :--- | :--- | :--- |
| **Chatbase** | "Custom GPT chatbot for your website/data" — the category leader | Polished onboarding, broad integrations, agent actions, lead capture |
| **CustomGPT.ai** | Accuracy / anti-hallucination, business knowledge | Citations on every answer, huge file-format support, sitemap ingest |
| **SiteGPT** | "Chatbot trained on *your website*" | One-click site crawl, support-deflection + human handoff |
| **DocsBot AI** | Docs/support Q&A for teams | Source citations, Q&A history, WordPress plugin, API/widget |
| **Botpress** | Developer-grade conversational platform | Visual flow builder + RAG "knowledge base", LLM-agnostic, omnichannel |
| **Dante AI** | No-code, multi-modal training | Train on video/audio (YouTube), white-label bubble |
| **Chatsimple** | Sales/lead-gen "AI agent" | Lead qualification, meeting booking, CRM sync, multilingual |
| **My AskAI** | Customer-support deflection | Deep Intercom/Zendesk integration, "insights" on user questions, human escalation |

These map onto **three sub-segments** worth keeping straight — they optimize for different things:

1. **Website/support deflection** (SiteGPT, My AskAI, DocsBot) → optimize *answer accuracy + escalation*.
2. **Sales/lead generation** (Chatsimple, Chatbase agents) → optimize *conversion, capturing contact info, booking*.
3. **General "chat with your data" builders** (Chatbase, CustomGPT, Dante) → optimize *breadth of inputs + ease of embedding*.

BotBhai today sits in segment 3 (general builder) with a notable feature — the **Missing-Answers feedback loop** — that most competitors only do a weaker version of.

---

## 2. Common end-to-end architecture (how they all basically work)

Despite different branding, virtually every product in this space runs the **same RAG pipeline** BotBhai already implements. The differentiation is in the *quality knobs* at each stage, not the shape of the pipeline.

```
          INGEST                 PROCESS                 INDEX                RETRIEVE            GENERATE
┌──────────────────────┐   ┌──────────────────┐   ┌────────────────┐   ┌────────────────┐   ┌──────────────────┐
│ Upload files / crawl │ → │ Parse + clean +  │ → │ Embed chunks → │ → │ Embed query →  │ → │ LLM answers from │
│ site / connect app   │   │ chunk (overlap)  │   │ vector DB      │   │ top-k + rerank │   │ retrieved context│
└──────────────────────┘   └──────────────────┘   └────────────────┘   └────────────────┘   └──────────────────┘
                                                                                                    │
                                                                              ┌─────────────────────┴─────────┐
                                                                              │ Cite sources, stream tokens,  │
                                                                              │ log low-confidence → feedback │
                                                                              └───────────────────────────────┘
```

### Stage-by-stage, with the common implementation choices

**a) Ingestion**
- File uploads: PDF, DOCX, TXT, MD, CSV, PPTX; many (CustomGPT) advertise "1000+ formats" via document-conversion libs (Apache Tika / unstructured.io style).
- **Website crawling** is the single biggest input most competitors have that a file-only tool lacks: paste a URL or `sitemap.xml`, the platform crawls and extracts main content (readability/boilerplate stripping).
- Third-party connectors: Notion, Google Drive, Confluence, Zendesk/Intercom help centers, YouTube transcripts (Dante), Slack.

**b) Chunking** *(industry-typical inference; rarely published verbatim)*
- Recursive character/token splitting, ~**300–1,000 tokens** per chunk with **10–20% overlap** — exactly BotBhai's approach.
- More advanced players experiment with **semantic chunking** (split on embedding-similarity boundaries) and **structure-aware** splitting (keep headings/tables/Q&A pairs intact). FAQ/Q&A content is often stored as paired units so a question retrieves its own answer.

**c) Embeddings** *(model usually inferred, not disclosed)*
- The default in this market is **OpenAI `text-embedding-3-small`/`-large`** (or the older `ada-002`); some use **Cohere Embed** or open models (BGE, E5, Jina). Dimensions 768–3,072.
- BotBhai's choice — **Jina `jina-embeddings-v3` at 768 dims (Matryoshka)** — is a legitimate, cost-effective, multilingual alternative and is dimension-compatible with a 768-d cosine index.

**d) Vector store** *(mostly inferred)*
- **Pinecone**, **Weaviate**, **Qdrant**, **Milvus**, or **pgvector** (Postgres) are the usual suspects; large players often build a thin abstraction so they can swap. Per-customer **namespaces/metadata filtering** isolate each bot's data — BotBhai already does this (Pinecone namespace per bot).

**e) Retrieval — this is where quality is won or lost**
- Baseline: top-k dense cosine search (BotBhai: top-k = 5).
- **Hybrid search** (dense + sparse/BM25) to catch exact keywords/product codes/names that pure embeddings miss.
- **Reranking** a larger candidate set with a cross-encoder (Cohere Rerank, BGE-reranker) before sending to the LLM — one of the highest-ROI accuracy upgrades.
- **Query transformation**: rewriting the user's question, expanding it, or using conversation history to make a standalone query before embedding.
- **Metadata filtering**: restrict to a doc set, language, recency.

**f) Generation**
- LLM is told to **answer only from retrieved context** and to say "I don't know" otherwise (BotBhai's `NO_ANSWER` sentinel pattern is exactly this).
- Most stream tokens for perceived speed and append **citations** (which chunks/sources were used).
- Model choice ranges from GPT-4o-mini / GPT-3.5 (cost) to GPT-4o / Claude (quality). BotBhai uses **Groq `llama-3.1-8b-instant`**, which is unusually *fast and cheap* — a genuine latency advantage, with the trade-off that an 8B model needs tighter grounding and good retrieval to match GPT-4-class answer quality.

---

## 3. What they take as input from the user

| Input type | Chatbase | CustomGPT | SiteGPT | DocsBot | Botpress | Dante | Chatsimple | My AskAI | **BotBhai (today)** |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| File upload (PDF/TXT/MD/CSV/DOCX) | ✅ | ✅ (1000+) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (PDF/TXT/MD/CSV) |
| **Single URL / paste text** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Full-site crawl / sitemap** | ✅ | ✅ | ✅ (core) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Notion / Drive / Confluence | ✅ | ✅ | partial | ✅ | ✅ | partial | partial | ✅ | ❌ |
| Help desk (Zendesk/Intercom) | ✅ | partial | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ (core) | ❌ |
| Audio / video / YouTube | partial | ✅ | ❌ | ❌ | ❌ | ✅ (core) | ❌ | ❌ | ❌ |
| Q&A / manual snippet entry | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (via Missing-Answers) |

**Configuration / persona inputs users get to set** (near-universal):
- Bot **name**, **avatar/logo**, **brand colors**, widget **position**.
- **System/base prompt** ("You are a support agent for Acme…") + **tone/personality**.
- **Temperature / "creativity"** slider; model selection (on paid tiers).
- **Welcome message** + **suggested/starter questions** (clickable prompts).
- **Fallback message** when the bot doesn't know.
- **Allowed/blocked topics**, profanity, "only answer from sources" toggle.
- **Language** (auto-detect or fixed).
- **Lead-capture form** fields and when to trigger them.

> **BotBhai gap:** Today BotBhai exposes name, system instructions, and tone — a solid core. It lacks URL/site-crawl ingestion, branding/widget customization, welcome message + starter questions, and a configurable fallback. These are the most common "table-stakes" inputs competitors offer.

---

## 4. What they optimize for (and how)

| Goal | Techniques competitors use | BotBhai status |
| :--- | :--- | :--- |
| **Reduce hallucination** | Strict "answer only from context" prompting; confidence thresholds; "I don't know" fallback; citations so users can verify | ✅ Has grounding + `NO_ANSWER` + min-score threshold (0.35) + sources |
| **Retrieval quality** | Hybrid (dense+BM25) search; cross-encoder **reranking**; query rewriting; metadata filters; semantic chunking | ⚠️ Dense-only top-k; no rerank/hybrid yet |
| **Latency / UX speed** | **Token streaming**; small/fast models; caching frequent answers; edge deployment | ⚠️ Fast model (Groq) but **no streaming**; answer returns all-at-once |
| **Cost** | Cheap models (GPT-4o-mini/3.5), caching embeddings, dedup, batching | ✅ Groq 8B + Jina are low-cost; batches embeddings |
| **Citations / trust** | Show source doc + snippet + (sometimes) link/page number; clickable | ✅ Returns filename + snippet + score (collapsible) |
| **Answer correction** | "Revise answer" — owner edits a bad answer and it's saved/retrained | ⚠️ Partial: Missing-Answers "Add data" covers *unanswered*, not *wrong* answers |
| **Knowledge freshness** | Scheduled re-crawl/re-sync of sources | ❌ No re-sync (no crawl source to sync) |
| **Multilingual** | Auto-detect query language, answer in kind | ⚠️ Jina + Llama are multilingual-capable but not explicitly wired |

**The two highest-impact accuracy upgrades** competitors lean on that BotBhai doesn't have yet:
1. **Reranking** the retrieved candidates (e.g., Cohere Rerank / BGE-reranker) — typically the biggest single jump in answer relevance.
2. **Hybrid search** so exact terms (SKUs, names, error codes) aren't lost by pure semantic similarity.

---

## 5. How they make it user-friendly (UX patterns worth copying)

These are the patterns that separate a "demo" from a product people actually deploy:

**Onboarding**
- **Time-to-first-bot in minutes**: paste a URL → auto-crawl → "Your bot is ready, try it" — no manual chunking config exposed. Sensible defaults hidden; advanced settings tucked away.
- A **playground/test chat** right after creation (BotBhai has this ✅).

**The embed experience**
- **One snippet** (a single `<script>` tag) → floating bubble. This is the core distribution mechanism and is in BotBhai's README roadmap but **not yet built**.
- Customizable bubble: color, icon, position, greeting, "powered by" (white-label on paid tiers).
- **Inline / full-page / iframe** embed options in addition to the bubble.

**During the conversation**
- **Streaming** answers (feels instant).
- **Suggested questions** to guide first-time users.
- **Citations** shown as expandable "Sources" (BotBhai ✅).
- **Thumbs up/down** feedback on each answer.
- **Human handoff / "talk to a person"** + lead-capture form (email, name) — core to support & sales bots.

**For the bot owner (dashboard)**
- **Conversation logs** (read every chat).
- **Analytics**: # conversations, # messages, top questions, satisfaction rate, countries/time, deflection rate.
- **"Insights" / question clustering**: *what are people asking?* — My AskAI and Chatbase surface trending questions and content gaps.
- **Missing/unanswered tracking + one-click fix**: capture questions the bot failed, let the owner add the answer, re-index instantly. **This is BotBhai's standout feature** ✅ and is more proactive than most — many competitors only show "low-confidence" flags without the one-click "Add Data → re-embed" loop BotBhai built.
- **Revise/correct answers**: edit a wrong answer and persist it.

**Trust, privacy, limits**
- PII handling, data-retention windows, GDPR statements.
- Rate limits / message caps per plan (BotBhai README defines session & concurrency limits).
- Per-bot data isolation (BotBhai ✅ via namespaces).

---

## 6. Per-platform notes

### Chatbase — the bar to clear
Category leader for "chatbot trained on your data." Strong, opinionated onboarding; broad ingestion (files, URLs/sitemap, Notion, Q&A pairs); **AI "actions"/agents** (call APIs, collect leads, book/handoff); integrations (Slack, WhatsApp, Messenger, Zapier, Crisp); analytics + chat logs; lead forms; "revise answers." Customizable widget with white-label on higher tiers. *Internal stack not officially published; behavior consistent with OpenAI models + a managed vector store.*

### CustomGPT.ai — accuracy & citations
Sells on **anti-hallucination + citations on every response**. Very broad file-format support and **sitemap-based** ingestion of large sites. Business/enterprise framing (no-code + API, persona, source attribution). Good model for BotBhai's "trust" story.

### SiteGPT — website-first + support handoff
Built around **crawling your website** and deflecting support. Lead capture, **human escalation**, multilingual, email follow-ups, per-page training. Strong example of the support-deflection sub-segment.

### DocsBot AI — docs Q&A for teams
Q&A over documentation with **source citations**, question history/reporting, **WordPress plugin**, widget, and API. Often used for internal knowledge + public docs. Clean example of the "embed on docs site" use case.

### Botpress — developer platform
The most powerful/flexible: **visual flow builder** + an LLM **Knowledge Base** (RAG) + "autonomous" nodes, **LLM-agnostic**, and true **omnichannel** (WhatsApp, Messenger, Telegram, web). Aimed at builders/agencies rather than one-click SaaS users. Useful reference for *where BotBhai could go* if it adds flows/actions — but heavier than BotBhai's positioning.

### Dante AI — multi-modal, no-code
No-code training on files, websites, and notably **video/audio (incl. YouTube)**; white-label embeddable bubble; broad model choice. Good reference for *expanding input modalities*.

### Chatsimple — sales agent
Optimizes for **lead generation**: qualifies visitors, captures contact info, **books meetings**, syncs to CRM, multilingual, proactive engagement. Reference for the sales sub-segment / monetization features.

### My AskAI — support deflection + insights
Deep **Intercom/Zendesk** integration to deflect tickets, **escalate to humans**, and surface **"insights"** about what customers ask and where docs fall short. Its analytics/insights layer is the strongest comparison point for BotBhai's Missing-Answers feature.

---

## 7. Where BotBhai already competes well

- ✅ **Clean RAG pipeline** with per-bot isolation (Pinecone namespaces).
- ✅ **Grounded answers + citations** (filename, snippet, score) with an explicit "don't know" path.
- ✅ **Missing-Answers feedback loop with one-click "Add Data"** — re-embeds the owner's answer immediately. This proactive close-the-gap loop is *better than the passive "low-confidence flag"* most competitors ship.
- ✅ **Cost/latency-friendly stack** (Groq 8B + Jina 768-d) — cheaper and faster than the GPT-4 default many competitors run.
- ✅ **Persona controls** (name, instructions, tone).

## 8. Highest-leverage gaps to close next (prioritized for BotBhai)

1. **Embeddable widget (single `<script>` floating bubble).** This is the product's distribution mechanism and the #1 table-stakes feature still missing. *(Already on the README roadmap.)*
2. **URL / sitemap ingestion.** Every competitor has it; file-only is a real limitation. Add "paste a URL / crawl my site."
3. **Answer streaming.** Big perceived-speed win; pairs perfectly with the fast Groq model.
4. **Reranking + (optionally) hybrid search.** The biggest accuracy upgrade per unit of effort.
5. **Suggested/starter questions + configurable welcome & fallback messages.** Cheap UX wins that lift first-session success.
6. **Owner-facing analytics & "top questions" insights.** Pairs naturally with the Missing-Answers data you already collect.
7. **Thumbs up/down feedback** on answers → feeds the same improvement loop.
8. **Widget branding** (colors, avatar, position) + white-label toggle.

---

### Appendix — quick "knob" cheat sheet for tuning BotBhai's RAG

| Knob | Current | Consider |
| :--- | :--- | :--- |
| Chunk size / overlap | 1000 chars / 150 | Try 500–800 tokens; test structure-aware splitting for FAQs |
| top-k | 5 | 8–12 candidates → rerank down to 3–5 |
| Min score threshold | 0.35 (cosine) | Tune empirically per corpus; log near-threshold misses |
| Reranker | none | Add cross-encoder rerank before LLM |
| Search type | dense only | Add sparse/BM25 hybrid for exact terms |
| Generation | non-streaming, temp 0.2 | Stream tokens; keep temp low for grounding |
| Query handling | raw question | Add history-aware query rewrite for multi-turn |

> **Reminder:** Re-verify any vendor-specific claim (especially pricing, model names, and internal infra) against the vendor's current docs before using it in marketing or product decisions — this space changes fast and internal stacks are mostly undisclosed.
