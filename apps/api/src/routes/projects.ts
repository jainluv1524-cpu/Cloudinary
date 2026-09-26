import type { FastifyInstance } from 'fastify';
import { requireAuth, requireOrgAdmin } from '../middleware/auth.js';
import { CreateProjectSchema, UpdateProjectSchema, AssetFilterSchema } from '@impact/shared';

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  // List projects
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const { orgId, supabase } = request;
    const { limit = 20, cursor } = request.query as { limit?: number; cursor?: string };

    const clampedLimit = Math.min(limit, 100);

    let query = supabase
      .from('projects')
      .select('*', { count: 'exact' })
      .eq('org_id', orgId)
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

    const nextCursor = data && data.length === clampedLimit
      ? Buffer.from(JSON.stringify({ offset: (cursor ? JSON.parse(Buffer.from(cursor, 'base64url').toString()).offset : 0) + clampedLimit })).toString('base64url')
      : null;

    return { data, total: count ?? 0, next_cursor: nextCursor };
  });

  // Get project
  app.get<{ Params: { projectId: string } }>('/:projectId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { supabase } = request;
    const { projectId } = request.params;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error || !data) {
      return reply.status(404).send({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Project not found', request_id: request.id },
      });
    }

    return { data, error: null };
  });

  // Get project tree (recursive CTE)
  app.get<{ Params: { projectId: string } }>('/:projectId/tree', { preHandler: [requireAuth] }, async (request, reply) => {
    const { supabase } = request;
    const { projectId } = request.params;

    const { data, error } = await supabase
      .rpc('get_project_tree', { root_project_id: projectId });

    if (error) {
      return reply.status(500).send({
        data: null,
        error: { code: 'INTERNAL_ERROR', message: error.message, request_id: request.id },
      });
    }

    return { data, error: null };
  });

  // Create project
  app.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const { orgId, userId, supabase } = request;
    const parsed = CreateProjectSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid project data',
          details: parsed.error.flatten(),
          request_id: request.id,
        },
      });
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({ ...parsed.data, org_id: orgId })
      .select()
      .single();

    if (error) {
      return reply.status(500).send({
        data: null,
        error: { code: 'INTERNAL_ERROR', message: error.message, request_id: request.id },
      });
    }

    return reply.status(201).send({ data, error: null });
  });

  // Update project
  app.patch<{ Params: { projectId: string } }>('/:projectId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { supabase } = request;
    const { projectId } = request.params;
    const parsed = UpdateProjectSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid project data',
          details: parsed.error.flatten(),
          request_id: request.id,
        },
      });
    }

    const { data, error } = await supabase
      .from('projects')
      .update(parsed.data)
      .eq('id', projectId)
      .select()
      .single();

    if (error || !data) {
      return reply.status(404).send({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Project not found', request_id: request.id },
      });
    }

    return { data, error: null };
  });
}
