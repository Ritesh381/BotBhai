import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <Logo size={36} className="text-xl" />
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </nav>

      <section className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
        <Logo size={96} withWordmark={false} className="mb-6 justify-center" />
        <h1 className="text-5xl font-bold leading-tight">
          Build an AI chatbot from <span className="text-brand-500">your</span>{" "}
          documents.
        </h1>
        <p className="mt-6 text-lg text-gray-400">
          Upload resumes, product docs, manuals, or FAQs. BotBhai chunks them,
          builds a retrieval index, and gives you a chatbot that answers from
          your knowledge base — with cited sources.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg px-6 py-3 font-medium bg-brand-600 hover:bg-brand-700 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-lg px-6 py-3 font-medium bg-white/10 hover:bg-white/20 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid sm:grid-cols-3 gap-6">
        {[
          {
            title: "📄 Smart ingestion",
            body: "PDF, DOCX, PPTX, TXT, MD, CSV — async pipeline with streaming status updates.",
          },
          {
            title: "🔎 Ranked answers + streaming",
            body: "Jina embeddings → Pinecone retrieval → reranking → streaming Groq Llama 3.1 answers with cited sources.",
          },
          {
            title: "🔗 Embeddable widget",
            body: "One <script> tag → iframe-isolated floating bubble on any website, secured by an embed key.",
          },
          {
            title: "📭 Missing-answers loop",
            body: "Captures unanswered questions; one-click 'Add data' re-embeds the answer immediately.",
          },
          {
            title: "🤖 Multi-bot per account",
            body: "Create multiple bots, each with its own knowledge base, persona, and widget.",
          },
          {
            title: "⚡ Clean architecture",
            body: "SOLID ports-and-adapters design — providers are swappable, use-cases are independently testable.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-6"
          >
            <h3 className="font-semibold text-lg">{f.title}</h3>
            <p className="mt-2 text-sm text-gray-400">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
