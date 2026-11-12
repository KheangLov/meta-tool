export default defineEventHandler((event) => {
  const hasRedis = !!((process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
    (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN))
  return {
    storage: hasRedis ? 'redis' : import.meta.dev ? 'local-files' : 'memory',
    adminTokenSet: !!useRuntimeConfig(event).adminToken,
    telegram: telegramConfigured(),
    uploads: blobConfigured() ? 'blob' : hasRedis ? 'redis' : import.meta.dev ? 'local-files' : 'memory',
  }
})
