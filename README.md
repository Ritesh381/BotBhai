# BotBhai 🤖💼

**BotBhai** is a self-service SaaS platform that allows professionals, content creators, and businesses to build, customize, and embed personalized chatbots powered by Retrieval-Augmented Generation (RAG). 

By uploading resume files, product documentation, policy manuals, or FAQs, BotBhai ingests the knowledge, chunks it, and builds a dedicated context retriever. It features a unique **Feedback Loop (Missing Answers)** system that captures questions the chatbot couldn't answer, enabling bot owners to update the chatbot's knowledge base on the fly.

---

## 🌟 Key Features

*   **Document Management & Ingestion:**
    *   Supports `.pdf`, `.txt`, `.md`, and `.csv` files.
    *   Automated text parsing and cleaning.
    *   Smart recursive chunking with custom overlap limits for high-fidelity vector searches.
*   **PII (Personally Identifiable Information) Detection:**
    *   Scans documents on upload using regex and OpenRouter AI validation.
    *   Detects emails, phone numbers, physical addresses, and government ID patterns.
    *   Allows owners to choose between auto-redaction (`[REDACTED]`) or storing the original.
*   **Embeddable Widget:**
    *   Generates a simple, zero-dependency HTML script snippet.
    *   Injects a floating, responsive chat assistant onto any website or blog.
*   **Missing Answers Log (Feedback Loop):**
    *   Logs questions from visitors that received low-confidence or "I don't know" answers.
    *   Groups and tallies identical missing queries.
    *   Provides a one-click "Add Data" feature to instantly append missing information.
*   **Custom Persona & Configurations:**
    *   Customize bot name, system instructions, and response tone (Professional, Friendly, Humorous).
*   **Sources & Attributions:**
    *   Displays collapsible references showing the exact document chunks and text snippets used to formulate answers.

---

## 🛠️ Technology Stack

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React, Next.js (App Router), Tailwind CSS | Core UI and Dashboard |
| **Database** | Google Cloud Firestore | Metadata, session state, and config storage |
| **Authentication** | Firebase Authentication | Google Sign-in + Email/Password |
| **Storage** | In-memory ingestion (originals not persisted) | Files are parsed → embedded on upload |
| **Vector DB** | Pinecone | Dense vector similarity retrieval (768 dims, cosine) |
| **Embeddings Model**| Jina `jina-embeddings-v3` | Generates 768-dimension text embeddings (Matryoshka) |
| **Chat LLM** | Groq `llama-3.1-8b-instant` | Context-aware answer generation |

---

## 📁 Project Structure

```
botbhai/
├── app/
│   ├── (public)/              # Public landing page and static files
│   │   ├── page.tsx           # Landing page
│   │   └── embed.js           # Static widget script for floating bubble
│   ├── (dashboard)/           # Protected dashboard panel
│   │   ├── layout.tsx         # Dashboard shell & sidebar layout
│   │   ├── page.tsx           # /dashboard - Documents and uploading
│   │   ├── test-chat/         # /dashboard/test-chat - Sandbox testing
│   │   ├── missing/           # /dashboard/missing - Unanswered questions log
│   │   ├── embed-config/      # /dashboard/embed-config - Embed code copier
│   │   └── analytics/         # /dashboard/analytics - Usage statistics
│   └── api/                   # API routes (Controllers)
│       ├── documents/         # Upload/list/delete knowledge docs
│       ├── chat/              # Public chat conversation endpoint
│       ├── missing/           # Read/resolve unanswered questions
│       ├── bot/               # Configuration settings
│       └── analytics/         # Usage stat aggregations
├── components/                # Reusable React components (Views)
│   ├── ui/                    # Design system primitives (Button, Card, Modal, etc.)
│   ├── dashboard/             # Page-specific feature layouts
│   └── chat/                  # Public floating bubble widgets
├── lib/                       # Business logic layer (Models & Services)
│   ├── db/                    # Firestore CRUD adapters
│   ├── vector/                # Pinecone client & embedding integrations
│   ├── ai/                    # OpenRouter LLM interface (Chat, PII, Rewriter)
│   └── chunking/              # Recursive text splitting algorithms
├── types/                     # Global TypeScript interfaces
└── scripts/                   # CLI maintenance & validation scripts
```

---

## ⚙️ Environment Configuration

Create a `.env.local` file in the root directory (based on `.env.local.example`):

```bash
# Firebase Client SDK Credentials (Publicly exposed)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK Credentials (Server-only)
# Format: Single-line stringified JSON of service account private key
FIREBASE_ADMIN_SDK_JSON={"type":"service_account","project_id":"...","private_key":"..."}

# Pinecone Integration (index: 768 dims, cosine)
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=botbhai-mvp

# Jina embeddings
JINA_API_KEY=your_jina_api_key
JINA_EMBED_MODEL=jina-embeddings-v3
JINA_EMBED_DIM=768

# Groq LLM
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant

# Web Client URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🚀 Installation & Local Development

### 1. Prerequisites
Ensure you have **Node.js v18+** installed. Set up your Pinecone index with **768 dimensions** and **cosine** distance metric.

### 2. Install Dependencies
```bash
npm install
```

### 3. Firestore Indexes Setup
Make sure the following composite indexes are deployed in your Firebase Firestore database (configured in [firestore.indexes.json](file:///Users/riteshprajapati/Desktop/Projects/BotBhai/firestore.indexes.json)):

| Collection ID | Field 1 | Field 2 | Field 3 | Query Scope |
| :--- | :--- | :--- | :--- | :--- |
| `documents` | `userId` (Ascending) | `uploadedAt` (Descending) | — | Collection |
| `documents` | `botId` (Ascending) | `uploadedAt` (Descending) | — | Collection |
| `missing_entries` | `botId` (Ascending) | `status` (Ascending) | `lastSeen` (Descending) | Collection |
| `missing_entries` | `botId` (Ascending) | `status` (Ascending) | `timesAsked` (Descending) | Collection |

To deploy Firestore indexes via Firebase CLI:
```bash
firebase deploy --only firestore:indexes
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the client.

### 5. Running Integration Tests
Verify Jina, Groq, and Pinecone connections by executing the integration test suite:
```bash
npm run test:integrations
```

---

## 🔒 Security & Limits

*   **PII Check:** Optional scanning verifies context prior to DB save.
*   **Daily Sessions:** Limited to `200` sessions per bot.
*   **Concurrency:** In-memory tracking restricts bots to `15` concurrent sessions.
*   **Retention:** Chat logs auto-purge after `30` days, and unanswered questions are retained for `90` days.
