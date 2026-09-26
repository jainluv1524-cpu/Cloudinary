import fp from 'fastify-plugin';
import { v2 as cloudinary } from 'cloudinary';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    cloudinary: typeof cloudinary;
  }
}

export const cloudinaryPlugin = fp(async (app: FastifyInstance) => {
  const cloudName = process.env['CLOUDINARY_CLOUD_NAME'];
  const apiKey = process.env['CLOUDINARY_API_KEY'];
  const apiSecret = process.env['CLOUDINARY_API_SECRET'];

  if (!cloudName || !apiKey || !apiSecret) {
    app.log.warn('Cloudinary env vars not set — running without media pipeline');
    return;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret, // server-only, never returned to clients
    secure: true,
  });

  app.decorate('cloudinary', cloudinary);
});
