import type { FastifyInstance } from 'fastify';
import { CloudinaryWebhookSchema } from '@impact/shared';
import { createHash } from 'crypto';

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  // Cloudinary upload notification webhook
  app.post('/cloudinary', async (request, reply) => {
    // Verify webhook signature
    const signature = request.headers['x-cloudinary-signature'] as string | undefined;
    const apiSecret = process.env['CLOUDINARY_API_SECRET'];

    if (apiSecret && signature) {
      // Verify notification signature
      const body = JSON.stringify(request.body);
      const expectedSig = createHash('sha256')
        .update(body + apiSecret)
        .digest('hex');

      if (signature !== `sha256=${expectedSig}` && signature !== expectedSig) {
        app.log.warn('Cloudinary webhook signature mismatch');
        return reply.status(401).send({ error: 'Invalid signature' });
      }
    }

    const parsed = CloudinaryWebhookSchema.safeParse(request.body);
    if (!parsed.success) {
      app.log.error({ errors: parsed.error.flatten() }, 'Invalid webhook payload');
      return reply.status(400).send({ error: 'Invalid payload' });
    }

    const { event, info } = parsed.data;
    if (event !== 'upload') {
      return reply.status(200).send({ status: 'ignored' });
    }

    const supabase = app.supabaseAdmin;
    const context = (info.context ?? {}) as Record<string, string>;
    const metadata = (info.metadata ?? {}) as Record<string, unknown>;

    // Extract integrity fields from context
    // org_id from verified context, never from a JWT on webhooks
    const orgId = context['org_id'];
    const projectId = context['project_id'];

    if (!orgId || !projectId) {
      app.log.error('Missing org_id or project_id in webhook context');
      return reply.status(400).send({ error: 'Missing context fields' });
    }

    // Check for idempotency — same sha256 + project = upsert
    const sha256 = (metadata['sha256'] as string) ?? context['capture_commit_hash'] ?? '';
    const { data: existing } = await supabase
      .from('assets')
      .select('id')
      .eq('sha256_hash', sha256)
      .eq('project_id', projectId)
      .maybeSingle();

    if (existing) {
      app.log.info({ assetId: existing.id }, 'Duplicate upload, skipping');
      return reply.status(200).send({ status: 'duplicate', asset_id: existing.id });
    }

    // Construct GPS point
    const lat = parseFloat(context['gps_lat'] ?? '0');
    const lon = parseFloat(context['gps_lon'] ?? '0');
    const gpsPoint = lat && lon ? `SRID=4326;POINT(${lon} ${lat})` : null;

    // Insert asset row using service role
    const { data: asset, error } = await supabase
      .from('assets')
      .insert({
        project_id: projectId,
        org_id: orgId,
        cloudinary_public_id: info.public_id,
        cloudinary_asset_id: info.asset_id ?? null,
        asset_type: info.resource_type === 'video' ? 'video' : 'image',
        device_capture_timestamp: context['capture_timestamp'],
        device_commit_hash: context['capture_commit_hash'] ?? sha256,
        device_id: context['device_id'] ?? 'unknown',
        device_public_key: context['device_public_key'] ?? '',
        capture_signature: context['capture_signature'] ?? '',
        gps_point: gpsPoint,
        gps_accuracy_meters: context['gps_accuracy'] ? parseFloat(context['gps_accuracy']) : null,
        gps_altitude: context['gps_altitude'] ? parseFloat(context['gps_altitude']) : null,
        gps_provider: context['gps_provider'] ?? null,
        caption: context['caption'] ?? null,
        caption_signature: context['caption_signature'] ?? null,
        caption_language: context['caption_language'] ?? null,
        exif: metadata['exif'] ?? {},
        exif_hash: context['exif_hash'] ?? '',
        sha256_hash: sha256,
        signature_tier: context['signature_tier'] ?? 'server',
        observation_type: context['observation_type'] ?? null,
        phase: context['phase'] as 'before' | 'after' | null ?? null,
        app_version: context['app_version'] ?? null,
        server_upload_timestamp: info.created_at,
        upload_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      app.log.error({ error }, 'Failed to insert asset');
      return reply.status(500).send({ error: 'Failed to insert asset' });
    }

    app.log.info({ assetId: asset.id, publicId: info.public_id }, 'Asset ingested');

    // TODO: Enqueue ai-enrich job via BullMQ
    // TODO: Run verification (signature, EXIF hash, caption sig)

    return reply.status(200).send({ status: 'ok', asset_id: asset.id });
  });
}
