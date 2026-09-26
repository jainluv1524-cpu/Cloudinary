import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/** Auth guard middleware — rejects unauthenticated requests */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.userId || !request.orgId) {
    return reply.status(401).send({
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Valid authentication required',
        request_id: request.id,
      },
    });
  }
}

/** Role guard — requires specific role */
export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await requireAuth(request, reply);
    if (reply.sent) return;

    if (!roles.includes(request.userRole)) {
      return reply.status(403).send({
        data: null,
        error: {
          code: 'FORBIDDEN',
          message: `Requires role: ${roles.join(' or ')}`,
          request_id: request.id,
        },
      });
    }
  };
}

/** Platform admin only */
export const requirePlatformAdmin = requireRole('platform_admin');

/** Org admin or platform admin */
export const requireOrgAdmin = requireRole('org_admin', 'platform_admin');
