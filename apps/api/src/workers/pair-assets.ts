import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import type { PairAssetsJobData } from '../services/queue.js';

const connection = new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

/**
 * Asset Pairing Worker
 *
 * When an "after" asset arrives, find the best "before" match:
 * 1. Same project, same observation_type
 * 2. GPS proximity (within project config gps_radius)
 * 3. Must be phase='before' when new asset is phase='after'
 * 4. Best match by GPS distance, then time recency
 *
 * On match:
 * 1. Create change_events row with status='queued'
 * 2. Enqueue detect-change job
 */
export const pairAssetsWorker = new Worker<PairAssetsJobData>(
  'pair-assets',
  async (job: Job<PairAssetsJobData>) => {
    const { project_id, org_id, new_asset_id, observation_type, phase } = job.data;

    job.log(`Attempting to pair asset ${new_asset_id} (${phase})`);

    if (phase !== 'after') {
      job.log('Not an after-phase asset, skipping pairing');
      return;
    }

    // TODO: Implementation:
    // 1. Fetch the new "after" asset GPS
    // 2. Query for matching "before" assets:
    //    - Same project_id + observation_type
    //    - phase = 'before'
    //    - Not already paired in change_events
    //    - Within GPS radius
    // 3. Score by GPS distance + time proximity
    // 4. Create change_events row
    // 5. Enqueue detect-change job
    // 6. Append audit log for 'pair' action

    job.log(`Pairing completed for asset ${new_asset_id}`);
  },
  {
    connection,
    concurrency: 5,
  },
);

pairAssetsWorker.on('completed', (job) => {
  console.log(`Asset pairing completed: ${job.id}`);
});

pairAssetsWorker.on('failed', (job, error) => {
  console.error(`Asset pairing failed: ${job?.id}`, error.message);
});
