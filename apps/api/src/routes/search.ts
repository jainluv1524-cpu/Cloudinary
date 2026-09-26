import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { SearchQuerySchema } from '@impact/shared';

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  // Global search with faceted filters
  app.get('/search', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = SearchQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return reply.status(400).send({
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid search query', details: parsed.error.flatten(), request_id: request.id },
      });
    }

    const { q, bbox, date_from, date_to, tags, gps_accuracy_max, asset_type, limit, cursor } = parsed.data;
    const { supabase, orgId } = request;

    let query = supabase
      .from('assets')
      .select('*', { count: 'exact' })
      .eq('org_id', orgId)
      .order('device_capture_timestamp', { ascending: false })
      .limit(limit);

    // Apply filters
    if (date_from) query = query.gte('device_capture_timestamp', date_from);
    if (date_to) query = query.lte('device_capture_timestamp', date_to);
    if (gps_accuracy_max) query = query.lte('gps_accuracy_meters', gps_accuracy_max);
    if (asset_type) query = query.eq('asset_type', asset_type);
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim());
      query = query.contains('ai_tags', tagList);
    }

    // TODO: bbox requires PostGIS ST_Within — use RPC
    // TODO: full-text search on q with tsvector

    if (cursor) {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString()) as { offset: number };
      query = query.range(decoded.offset, decoded.offset + limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return reply.status(500).send({
        data: null,
        error: { code: 'INTERNAL_ERROR', message: error.message, request_id: request.id },
      });
    }

    const total = count ?? 0;
    const truncated = total > 1000;

    return {
      data,
      total: Math.min(total, 1000),
      total_matched: total,
      truncated,
      next_cursor: data && data.length === limit
        ? Buffer.from(JSON.stringify({ offset: (cursor ? JSON.parse(Buffer.from(cursor, 'base64url').toString()).offset : 0) + limit })).toString('base64url')
        : null,
    };
  });
}
