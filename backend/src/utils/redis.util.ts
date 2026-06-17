import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL;
const redis = redisUrl
  ? new Redis(redisUrl, {
      tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    });

export default redis;