"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Neutral, alpha-based styling so it reads well on BOTH the dark dashboard
// and the light embed widget (no theme prop needed).
const components: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-brand-500 underline underline-offset-2 break-words"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-1 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h3>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  hr: () => <hr className="my-3 border-zinc-500/30" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-zinc-500/40 pl-3 italic opacity-80 my-2">
      {children}
    </blockquote>
  ),
  pre: ({ children }) => <pre className="my-2 overflow-x-auto">{children}</pre>,
  code: ({ className, children }) => {
    // Fenced code blocks carry a `language-xxx` class; inline code does not.
    const isBlock = /language-/.test(className || "");
    return isBlock ? (
      <code className="block w-full p-3 rounded-lg bg-zinc-500/15 text-xs font-mono overflow-x-auto whitespace-pre">
        {children}
      </code>
    ) : (
      <code className="px-1 py-0.5 rounded bg-zinc-500/25 text-[0.85em] font-mono">{children}</code>
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="text-xs border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-zinc-500/40 px-2 py-1 font-semibold text-left">{children}</th>
  ),
  td: ({ children }) => <td className="border border-zinc-500/25 px-2 py-1">{children}</td>,
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
