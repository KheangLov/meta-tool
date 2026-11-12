import upstashDriver from 'unstorage/drivers/upstash'
import fsDriver from 'unstorage/drivers/fs'

/**
 * Picks where link data is stored:
 *  - Upstash Redis (Vercel Marketplace) when its env vars are present
 *  - local ./.data folder during `nuxt dev`
 *  - in-memory otherwise (data is lost on every cold start — only for quick tests)
 */
export default defineNitroPlugin(() => {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  const storage = useStorage()

  if (url && token) {
    storage.mount('links', upstashDriver({ url, token, base: 'lps:links' }))
    storage.mount('posts', upstashDriver({ url, token, base: 'lps:posts' }))
    console.info('[storage] Using Upstash Redis')
  } else if (import.meta.dev) {
    storage.mount('links', fsDriver({ base: './.data/links' }))
    storage.mount('posts', fsDriver({ base: './.data/posts' }))
    console.info('[storage] Using local .data/links folder')
  } else {
    console.warn('[storage] No Redis configured — using in-memory storage. Data will be lost on cold start.')
  }
})
