"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/v2/api-client";

interface Stats {
  conversations: number;
  messages: number;
  confidentRate: number;
  topQuestions: { question: string; count: number }[];
  thumbsUp: number;
  thumbsDown: number;
}

export default function AnalyticsPage() {
  const { botId } = useParams<{ botId: string }>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [missingEntries, setMissingEntries] = useState<{ question: string; timesAsked: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Real analytics aggregation is an M2 feature.
    // For M1 we display a summary derived from the missing-answers data already collected.
    const [missingData, feedbackData] = await Promise.all([
      api.get(`/api/bots/${botId}/missing?status=open`),
      api.get(`/api/bots/${botId}/feedback`),
    ]);

    const entries: { question: string; timesAsked: number }[] =
      Array.isArray(missingData) ? missingData : [];
    const fb = Array.isArray(feedbackData?.feedback) ? feedbackData.feedback : [];

    setMissingEntries(entries.slice(0, 10));

    const totalFb = fb.length;
    const downCount = fb.filter((f: { rating: string }) => f.rating === "down").length;
    const upCount = totalFb - downCount;

    setStats({
      conversations: 0,
      messages: 0,
      confidentRate: 0,
      topQuestions: entries.slice(0, 5).map((e) => ({ question: e.question, count: e.timesAsked })),
      thumbsUp: upCount,
      thumbsDown: downCount,
    });
    setLoading(false);
  }, [botId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">
          Full conversation analytics arrive in M2. Below shows content-gap insights from current data.
        </p>
      </div>

      {/* Feedback summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-xs text-gray-500 mb-1">Thumbs Up</p>
          <p className="text-3xl font-bold text-green-400">{stats?.thumbsUp ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">Thumbs Down</p>
          <p className="text-3xl font-bold text-red-400">{stats?.thumbsDown ?? 0}</p>
        </Card>
      </div>

      {/* Content gaps */}
      <Card>
        <p className="text-sm font-semibold mb-3">Content gaps (unanswered questions)</p>
        {missingEntries.length === 0 ? (
          <p className="text-gray-400 text-sm">No unanswered questions yet — your knowledge base is covering everything.</p>
        ) : (
          <ul className="space-y-2">
            {missingEntries.map((e, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 truncate">{e.question}</span>
                <span className="text-gray-500 shrink-0 ml-4">
                  ×{e.timesAsked}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Top questions */}
      {(stats?.topQuestions?.length ?? 0) > 0 && (
        <Card>
          <p className="text-sm font-semibold mb-3">Top unanswered topics</p>
          <ol className="space-y-2 list-decimal list-inside">
            {stats!.topQuestions.map((q, i) => (
              <li key={i} className="text-sm text-gray-300">
                <span className="font-medium">{q.question}</span>{" "}
                <span className="text-gray-500 text-xs">— asked {q.count}×</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card className="border-white/5">
        <p className="text-xs text-gray-500">
          Full conversation logs, message counts, confidence rate, and daily trends are coming in M2.
          All underlying data is already being collected.
        </p>
      </Card>
    </div>
  );
}
