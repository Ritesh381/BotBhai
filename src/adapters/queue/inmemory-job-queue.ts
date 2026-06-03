import type { JobQueue, JobPayloadMap } from "@core/ports/job-queue";
import { v4 as uuid } from "uuid";

type JobHandler<K extends keyof JobPayloadMap> = (payload: JobPayloadMap[K]) => Promise<void>;

// Handlers are registered by the composition root.
const handlers = new Map<string, JobHandler<keyof JobPayloadMap>>();

export function registerJobHandler<K extends keyof JobPayloadMap>(
  kind: K,
  handler: JobHandler<K>
): void {
  handlers.set(kind, handler as JobHandler<keyof JobPayloadMap>);
}

// In-process async queue — drains on the next tick so the request returns first.
// Prod adapter (Cloud Tasks / QStash) is swapped in via the composition root.
export class InMemoryJobQueue implements JobQueue {
  async enqueue<K extends keyof JobPayloadMap>(
    kind: K,
    payload: JobPayloadMap[K]
  ): Promise<{ jobId: string }> {
    const jobId = uuid();
    const handler = handlers.get(kind);
    if (handler) {
      // Fire-and-forget on the next tick
      setImmediate(() => {
        handler(payload).catch((err: unknown) =>
          console.error(`[JobQueue] job ${kind}/${jobId} failed:`, err)
        );
      });
    } else {
      console.warn(`[JobQueue] no handler registered for job kind: ${kind}`);
    }
    return { jobId };
  }
}
