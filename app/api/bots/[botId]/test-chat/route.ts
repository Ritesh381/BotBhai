import { NextRequest } from "next/server";
import { getContainer } from "@/src/composition/container";
import { unauthorized, badRequest } from "@/src/lib/http/respond";

export const runtime = "nodejs";

// Authed streaming test-chat — never gated by embed keys/quotas
export async function POST(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  const c = getContainer();
  const user = await c.authVerifier.verify(req);
  if (!user) return unauthorized();
  const { botId } = await params;

  // Verify ownership
  const owned = await c.getBot().execute(user.uid, botId);
  if (!owned.ok) {
    return new Response(
      JSON.stringify({ error: { code: owned.error.code, message: owned.error.message } }),
      { status: owned.error.httpStatus, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const question = String(body.question || "").trim();
  if (!question) return badRequest("question is required");

  const answerer = c.answerQuestion();

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        for await (const chunk of answerer.stream({ botId, question })) {
          if (chunk.type === "token") send("token", { t: chunk.data });
          else if (chunk.type === "sources") send("sources", { sources: chunk.data });
          else if (chunk.type === "done") send("done", { confident: chunk.confident });
        }
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : "Unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
