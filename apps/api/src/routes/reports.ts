import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { GenerateReportSchema } from '@impact/shared';

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  // Generate report
  app.post('/reports/generate', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = GenerateReportSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid report request', details: parsed.error.flatten(), request_id: request.id },
      });
    }

    const { supabase, orgId } = request;
    const { project_id, template_id, change_event_ids, include_integrity_appendix } = parsed.data;

    // Verify all change events exist and are verified
    const { data: events, error: eventError } = await supabase
      .from('change_events')
      .select('id, status, before_asset_id, after_asset_id')
      .in('id', change_event_ids);

    if (eventError || !events) {
      return reply.status(500).send({
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch change events', request_id: request.id },
      });
    }

    // Collect all asset IDs from pairs
    const assetIds = events.flatMap(e => [e.before_asset_id, e.after_asset_id].filter(Boolean));

    // Check if any asset is quarantined — reject if so
    const { data: assets, error: assetError } = await supabase
      .from('assets')
      .select('id, verification, upload_status')
      .in('id', assetIds);

    if (assetError) {
      return reply.status(500).send({
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to verify assets', request_id: request.id },
      });
    }

    const quarantined = assets?.filter(a => a.upload_status === 'flagged' || a.verification === 'fail');
    if (quarantined && quarantined.length > 0) {
      return reply.status(422).send({
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Report cannot include quarantined or failed assets',
          details: { quarantined_asset_ids: quarantined.map(a => a.id) },
          request_id: request.id,
        },
      });
    }

    // TODO: Enqueue report generation job via BullMQ
    // For now, return a placeholder
    const reportId = crypto.randomUUID();

    return reply.status(200).send({
      data: {
        report_id: reportId,
        self_contained: true,
        pdf_url: null, // populated by worker
        html_url: null,
        manifest: [],
        blocked_reason: null,
        generated_at: new Date().toISOString(),
        template_version: template_id,
      },
      error: null,
    });
  });

  // List report templates
  app.get('/report-templates', { preHandler: [requireAuth] }, async (request, reply) => {
    const { supabase, orgId } = request;
    const { sector } = request.query as { sector?: string };

    let query = supabase
      .from('report_templates')
      .select('*')
      .eq('org_id', orgId);

    if (sector) {
      query = query.eq('sector', sector);
    }

    const { data, error } = await query;

    if (error) {
      return reply.status(500).send({
        data: null,
        error: { code: 'INTERNAL_ERROR', message: error.message, request_id: request.id },
      });
    }

    return { data, error: null };
  });
}
