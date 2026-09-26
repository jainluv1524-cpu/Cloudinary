import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';

export async function changeEventRoutes(app: FastifyInstance): Promise<void> {
  // List change events for a project
  app.get<{ Params: { projectId: string } }>('/:projectId/change-events', { preHandler: [requireAuth] }, async (request, reply) => {
    const { supabase } = request;
    const { projectId } = request.params;
    const { limit = 20, cursor } = request.query as { limit?: number; cursor?: string };

    const clampedLimit = Math.min(limit, 100);

    let query = supabase
      .from('change_events')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(clampedLimit);

    if (cursor) {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString()) as { offset: number };
      query = query.range(decoded.offset, decoded.offset + clampedLimit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return reply.status(500).send({
        data: null,
        error: { code: 'INTERNAL_ERROR', message: error.message, request_id: request.id },
      });
    }

    return { data, total: count ?? 0, next_cursor: null };
  });
}
