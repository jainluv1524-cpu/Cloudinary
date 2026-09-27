import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import type { DetectChangeJobData } from '../services/queue.js';

const connection = new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

/**
 * Change Detection Worker
 *
 * Process a before/after pair:
 * 1. Update change_events.status to 'claimed'
 * 2. Download both assets from Cloudinary (via signed URLs)
 * 3. Send to ML service /v1/detect-change
 * 4. Record metrics and model_version in change_events
 * 5. Upload diff image to Cloudinary as derivative
 * 6. Update status to 'persisted' or 'failed'
 *
 * RULES:
 * - Never fall back to another sector's model (§3.3)
 * - Record model_version on every change_event (§6)
 * - Failures persisted with reason, never swallowed (§3.6)
 */
export const detectChangeWorker = new Worker<DetectChangeJobData>(
  'detect-change',
  async (job: Job<DetectChangeJobData>) => {
    const { change_event_id, before_asset_id, after_asset_id, sector } = job.data;

    job.log(`Starting change detection: ${change_event_id}`);
    await job.updateProgress(10);

    // TODO: Implementation:
    // 1. supabase.from('change_events').update({ status: 'claimed' })
    // 2. Generate signed download URLs for both assets
    // 3. Call ML /v1/detect-change with both URLs
    // 4. If status === 'unsupported', persist failure reason
    // 5. Upload diff image to Cloudinary
    // 6. Record in asset_derivatives with is_generative=false
    // 7. Update change_events with metrics, model_version, diff_asset_cloudinary_id
    // 8. Append audit log

    await job.updateProgress(100);
    job.log(`Change detection completed: ${change_event_id}`);
  },
  {
    connection,
    concurrency: 2, // Limited by ML service capacity
    limiter: {
      max: 5,
      duration: 60_000,
    },
  },
);

detectChangeWorker.on('completed', (job) => {
  console.log(`Change detection completed: ${job.id}`);
});

detectChangeWorker.on('failed', (job, error) => {
  // Persist failure reason — never swallow (§3.6)
  console.error(`Change detection failed: ${job?.id}`, error.message);
  // TODO: supabase.from('change_events').update({ status: 'failed', failure_reason: error.message })
});
