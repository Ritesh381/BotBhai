import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <span className="text-xl font-bold">
          BotBhai <span className="text-brand-500">🤖</span>
        </span>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </nav>

      <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
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
            href="/login"
            className="rounded-lg px-6 py-3 font-medium bg-brand-600 hover:bg-brand-700 transition-colors"
          >
            Get started free
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid sm:grid-cols-3 gap-6">
        {[
          {
            title: "📄 Smart ingestion",
            body: "PDF, TXT, MD, CSV — parsed, cleaned, and recursively chunked with overlap.",
          },
          {
            title: "🔎 Cited answers",
            body: "Powered by Jina embeddings + Pinecone retrieval and a Groq Llama 3.1 model.",
          },
          {
            title: "📭 Missing-answers loop",
            body: "Captures questions your bot couldn't answer so you can fill the gaps.",
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
