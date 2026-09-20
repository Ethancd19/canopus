import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

// Static public pages (`revalidate = 60`) are stored in R2 and refreshed in the
// background by the memory queue, which re-requests the page through the
// WORKER_SELF_REFERENCE binding. No tag cache: there is no on-demand purge yet.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: memoryQueue,
});
