import type { FastifyInstance } from 'fastify';
import { requirePlatformAdmin } from '../middleware/auth.js';
import { CreateOrgSchema } from '@impact/shared';

export async function orgRoutes(app: FastifyInstance): Promise<void> {
  // Provision org — platform_admin only. No self-service signup (AGENTS.md §3.10).
  app.post('/', { preHandler: [requirePlatformAdmin] }, async (request, reply) => {
    const parsed = CreateOrgSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid org data', details: parsed.error.flatten(), request_id: request.id },
      });
    }

    const supabase = app.supabaseAdmin;

    const { data: org, error } = await supabase
      .from('orgs')
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
      return reply.status(500).send({
        data: null,
        error: { code: 'INTERNAL_ERROR', message: error.message, request_id: request.id },
      });
    }

    // Generate single-use invite token (72h expiry, stored hashed)
    const inviteToken = crypto.randomUUID();
    const { createHash } = await import('crypto');
    const hashedToken = createHash('sha256').update(inviteToken).digest('hex');

    await supabase
      .from('invite_tokens')
      .insert({
        org_id: org.id,
        token_hash: hashedToken,
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        role: 'org_admin',
      });

    return reply.status(201).send({
      data: {
        org_id: org.id,
        invite_url: `${process.env['DASHBOARD_URL'] ?? 'http://localhost:5173'}/invite/${inviteToken}`,
      },
      error: null,
    });
  });
}
