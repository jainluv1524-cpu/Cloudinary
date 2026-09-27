import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { AssetFilterSchema, OriginalUrlSchema, DerivativeUrlSchema, isAllowedTransformation } from '@impact/shared';

export async function assetRoutes(app: FastifyInstance): Promise<void> {
  // List assets for a project (with filters)
  app.get<{ Params: { assetId: string } }>('/:assetId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { supabase } = request;
    const { assetId } = request.params as { assetId: string };

    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .single();

    if (error || !data) {
      return reply.status(404).send({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Asset not found', request_id: request.id },
      });
    }

    return { data, error: null };
  });

  // Original URL (authenticated + auth token, real expiry)
  // public_id is NEVER accepted from the client — resolved by asset_id under RLS
  app.post<{ Params: { assetId: string } }>('/:assetId/original-url', { preHandler: [requireAuth] }, async (request, reply) => {
    const { supabase } = request;
    const { assetId } = request.params;
    const parsed = OriginalUrlSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: parsed.error.flatten(), request_id: request.id },
      });
    }

    // Look up asset under RLS — this prevents cross-org access
    const { data: asset, error } = await supabase
      .from('assets')
      .select('cloudinary_public_id')
      .eq('id', assetId)
      .single();

    if (error || !asset) {
      return reply.status(404).send({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Asset not found', request_id: request.id },
      });
    }

    // SDK signs the URL — never hand-roll (AGENTS.md §3.11)
    const url = app.cloudinary.url(asset.cloudinary_public_id, {
      secure: true,
      resource_type: 'image',
      type: 'authenticated',
      sign_url: true,
    });

    const expiresAt = Math.floor(Date.now() / 1000) + parsed.data.ttl_seconds;

    return { data: { url, expires_at: expiresAt }, error: null };
  });

  // Derivative URL (signed, CDN-cacheable)
  // Transformation validated against allowlist
  app.post<{ Params: { assetId: string } }>('/:assetId/derivative-url', { preHandler: [requireAuth] }, async (request, reply) => {
    const { supabase } = request;
    const { assetId } = request.params;
    const parsed = DerivativeUrlSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: parsed.error.flatten(), request_id: request.id },
      });
    }

    // Validate transformation against allowlist
    if (!isAllowedTransformation(parsed.data.transformation)) {
      return reply.status(422).send({
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Transformation not allowed. Only named transforms and safe delivery parameters are permitted.',
          request_id: request.id,
        },
      });
    }

    // Look up asset under RLS
    const { data: asset, error } = await supabase
      .from('assets')
      .select('cloudinary_public_id')
      .eq('id', assetId)
      .single();

    if (error || !asset) {
      return reply.status(404).send({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Asset not found', request_id: request.id },
      });
    }

    const url = app.cloudinary.url(asset.cloudinary_public_id, {
      secure: true,
      resource_type: 'image',
      type: 'upload',
      sign_url: true,
      transformation: parsed.data.transformation,
    });

    return { data: { url }, error: null };
  });
}
