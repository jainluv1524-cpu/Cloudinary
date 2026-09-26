import fp from 'fastify-plugin';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    supabaseAdmin: SupabaseClient;
  }
  interface FastifyRequest {
    supabase: SupabaseClient;
    orgId: string;
    userId: string;
    userRole: string;
  }
}

export const supabasePlugin = fp(async (app: FastifyInstance) => {
  const supabaseUrl = process.env['SUPABASE_URL'];
  const serviceKey = process.env['SUPABASE_SERVICE_KEY'];
  const anonKey = process.env['SUPABASE_ANON_KEY'];

  if (!supabaseUrl || !serviceKey || !anonKey) {
    app.log.warn('Supabase env vars not set — running without database');
    return;
  }

  // Service-role client for workers and webhook handler only
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  app.decorate('supabaseAdmin', adminClient);

  // Request-scoped client using the caller's JWT
  app.addHook('onRequest', async (request) => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      request.supabase = userClient;

      // Decode JWT claims (org_id and role come from custom claims, not body)
      try {
        const { data: { user } } = await userClient.auth.getUser(token);
        if (user) {
          request.userId = user.id;
          // org_id and role from custom JWT claims (Supabase Custom Access Token Hook)
          const appMetadata = user.app_metadata as Record<string, string> | undefined;
          request.orgId = appMetadata?.['org_id'] ?? '';
          request.userRole = appMetadata?.['role'] ?? 'viewer';
        }
      } catch {
        // Will be handled by auth middleware
      }
    }
  });
});
