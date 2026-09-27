import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import type { AiEnrichJobData } from '../services/queue.js';

const connection = new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

/**
 * AI Enrichment Worker
 *
 * After an asset is verified:
 * 1. Call ML service /v1/classify-activity
 * 2. Call ML service /v1/extract-signals
 * 3. Update asset.ai_tags and asset.custom_metadata
 * 4. Copy Cloudinary categorization/detection into observations
 * 5. Enqueue pair-assets job if observation_type + phase suggest pairing
 */
export const aiEnrichWorker = new Worker<AiEnrichJobData>(
  'ai-enrich',
  async (job: Job<AiEnrichJobData>) => {
    const { asset_id, cloudinary_public_id, asset_type, org_id, project_id, sector } = job.data;

    job.log(`Processing AI enrichment for asset ${asset_id}`);

    // TODO: Mint internal JWT for ML service auth
    // TODO: Call classify-activity
    // TODO: Call extract-signals
    // TODO: Update asset metadata
    // TODO: Enqueue pair-assets if applicable
    // TODO: Append audit log

    job.log(`AI enrichment completed for asset ${asset_id}`);
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 60_000, // 10 jobs per minute to avoid ML service overload
    },
  },
);

aiEnrichWorker.on('completed', (job) => {
  console.log(`AI enrich completed: ${job.id}`);
});

aiEnrichWorker.on('failed', (job, error) => {
  console.error(`AI enrich failed: ${job?.id}`, error.message);
});
