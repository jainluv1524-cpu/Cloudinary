import type { FastifyInstance } from 'fastify';
import { projectRoutes } from './projects.js';
import { assetRoutes } from './assets.js';
import { changeEventRoutes } from './change-events.js';
import { searchRoutes } from './search.js';
import { reportRoutes } from './reports.js';
import { integrityRoutes } from './integrity.js';
import { webhookRoutes } from './webhooks/cloudinary.js';
import { orgRoutes } from './orgs.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(projectRoutes, { prefix: '/projects' });
  await app.register(assetRoutes, { prefix: '/assets' });
  await app.register(changeEventRoutes, { prefix: '/projects' });
  await app.register(searchRoutes);
  await app.register(reportRoutes);
  await app.register(integrityRoutes);
  await app.register(orgRoutes, { prefix: '/orgs' });

  // Webhooks are outside /v1 auth
  await app.register(webhookRoutes, { prefix: '/webhooks' });
}
