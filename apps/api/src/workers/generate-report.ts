import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import type { GenerateReportJobData } from '../services/queue.js';

const connection = new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

/**
 * Report Generation Worker
 *
 * Generates a self-contained HTML report with PDF option:
 * 1. Fetch all change events and their assets
 * 2. Generate signed Cloudinary URLs for all media
 * 3. Compile Handlebars template
 * 4. Optionally include integrity appendix
 * 5. Build report manifest with SHA-256 hashes
 * 6. Upload HTML/PDF to Cloudinary
 * 7. Update evidence_packages with URLs and manifest
 */
export const generateReportWorker = new Worker<GenerateReportJobData>(
  'generate-report',
  async (job: Job<GenerateReportJobData>) => {
    const {
      evidence_package_id,
      template_id,
      project_id,
      org_id,
      change_event_ids,
      include_integrity_appendix,
    } = job.data;

    job.log(`Generating report for package ${evidence_package_id}`);
    await job.updateProgress(10);

    // TODO: Implementation:
    // 1. Fetch template from report_templates
    // 2. Fetch all change_events + associated assets
    // 3. Generate signed URLs for report_full transformation
    // 4. Compile Handlebars template with data
    // 5. If include_integrity_appendix, add integrity check results
    // 6. Build manifest entries (photo, diff, map, chart roles)
    // 7. Hash each manifest entry
    // 8. Upload compiled HTML to Cloudinary
    // 9. Update evidence_packages row
    // 10. Append audit log

    await job.updateProgress(100);
    job.log(`Report generation completed: ${evidence_package_id}`);
  },
  {
    connection,
    concurrency: 2,
  },
);

generateReportWorker.on('completed', (job) => {
  console.log(`Report generation completed: ${job.id}`);
});

generateReportWorker.on('failed', (job, error) => {
  console.error(`Report generation failed: ${job?.id}`, error.message);
});
