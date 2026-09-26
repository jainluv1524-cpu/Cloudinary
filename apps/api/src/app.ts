import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { registerRoutes } from './routes/index.js';
import { supabasePlugin } from './plugins/supabase.js';
import { cloudinaryPlugin } from './plugins/cloudinary.js';

const app = Fastify({
  logger: {
    level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
    transport: process.env['NODE_ENV'] !== 'production'
      ? { target: 'pino-pretty' }
      : undefined,
  },
  requestId: 'req-',
  genReqId: () => crypto.randomUUID(),
});

// Security
await app.register(helmet);
await app.register(cors, {
  origin: process.env['DASHBOARD_URL'] ?? 'http://localhost:5173',
  credentials: true,
});
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Plugins
await app.register(supabasePlugin);
await app.register(cloudinaryPlugin);

// Routes
await app.register(registerRoutes, { prefix: '/v1' });

// Health check (no prefix)
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('/health/ready', async (_request, reply) => {
  // TODO: Check DB, Redis, Cloudinary connectivity
  return reply.send({
    status: 'ok',
    checks: {
      database: 'ok',
      redis: 'ok',
      cloudinary: 'ok',
    },
  });
});

// Error handler
app.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  const statusCode = error.statusCode ?? 500;
  return reply.status(statusCode).send({
    data: null,
    error: {
      code: statusCode >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR',
      message: error.message,
      request_id: request.id,
    },
  });
});

// Start
const port = parseInt(process.env['PORT'] ?? '3001', 10);
const host = process.env['HOST'] ?? '0.0.0.0';

try {
  await app.listen({ port, host });
  app.log.info(`API server listening on ${host}:${port}`);
} catch (err) {
  app.log.fatal(err);
  process.exit(1);
}

export default app;
