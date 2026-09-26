import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';

export async function integrityRoutes(app: FastifyInstance): Promise<void> {
  // Get asset integrity
  app.get<{ Params: { assetId: string } }>('/assets/:assetId/integrity', { preHandler: [requireAuth] }, async (request, reply) => {
    const { supabase } = request;
    const { assetId } = request.params;

    // Call the verify_asset_integrity DB function
    const { data, error } = await supabase
      .rpc('verify_asset_integrity', { p_asset_id: assetId });

    if (error) {
      return reply.status(500).send({
        data: null,
        error: { code: 'INTERNAL_ERROR', message: error.message, request_id: request.id },
      });
    }

    // Determine overall status
    const checks = (data as Array<{ check_name: string; state: string; details: Record<string, unknown> }>) ?? [];
    const hasFail = checks.some(c => c.state === 'fail');
    const hasUnknown = checks.some(c => c.state === 'unknown');
    const overall = hasFail ? 'fail' : hasUnknown ? 'unknown' : 'pass';

    return {
      data: {
        asset_id: assetId,
        checks,
        overall,
      },
      error: null,
    };
  });

  // Get audit trail
  app.get<{ Params: { assetId: string } }>('/assets/:assetId/audit-trail', { preHandler: [requireAuth] }, async (request, reply) => {
    const { supabase } = request;
    const { assetId } = request.params;

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('asset_id', assetId)
      .order('id', { ascending: true });

    if (error) {
      return reply.status(500).send({
        data: null,
        error: { code: 'INTERNAL_ERROR', message: error.message, request_id: request.id },
      });
    }

    return { data, error: null };
  });
}
