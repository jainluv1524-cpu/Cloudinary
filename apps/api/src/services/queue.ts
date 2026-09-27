import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection — used by all queues
const createRedisConnection = () =>
  new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

// ─── Queue Definitions ──────────────────────────────

export const aiEnrichQueue = new Queue('ai-enrich', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const pairAssetsQueue = new Queue('pair-assets', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const detectChangeQueue = new Queue('detect-change', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: 50,
    removeOnFail: 200,
  },
});

export const generateReportQueue = new Queue('generate-report', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 15000 },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});

export const integrityCheckQueue = new Queue('integrity-check', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 200,
    removeOnFail: 500,
  },
});

// ─── Job Types ──────────────────────────────────────

export interface AiEnrichJobData {
  asset_id: string;
  cloudinary_public_id: string;
  asset_type: 'image' | 'video';
  org_id: string;
  project_id: string;
  sector: string;
}

export interface PairAssetsJobData {
  project_id: string;
  org_id: string;
  new_asset_id: string;
  observation_type: string;
  phase: 'before' | 'after';
}

export interface DetectChangeJobData {
  change_event_id: string;
  before_asset_id: string;
  after_asset_id: string;
  project_id: string;
  org_id: string;
  sector: string;
}

export interface GenerateReportJobData {
  evidence_package_id: string;
  template_id: string;
  project_id: string;
  org_id: string;
  change_event_ids: string[];
  include_integrity_appendix: boolean;
}

export interface IntegrityCheckJobData {
  asset_id: string;
}
