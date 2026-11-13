import upstashDriver from 'unstorage/drivers/upstash'
import redisDriver from 'unstorage/drivers/redis'
import vercelBlobDriver from 'unstorage/drivers/vercel-blob'
import fsDriver from 'unstorage/drivers/fs'

/**
 * Picks where data is stored. Without a database, Vercel keeps data only in the memory of
 * one server instance, which is wiped on restart, so pages would show "not found".
 */
const STORES = ['links', 'posts', 'uploads', 'sent']

export default defineNitroPlugin(() => {
  const cfg = storageConfig()
  const storage = useStorage()

  for (const name of STORES) {
    if (cfg.kind === 'upstash') storage.mount(name, upstashDriver({ url: cfg.url, token: cfg.token, base: `lps:${name}` }))
    else if (cfg.kind === 'redis') storage.mount(name, redisDriver({ url: cfg.url, base: `lps:${name}` }))
    else if (cfg.kind === 'blob') storage.mount(name, vercelBlobDriver({ access: 'public', token: cfg.token, base: `lps-data/${name}` }))
    else if (cfg.kind === 'local-files') storage.mount(name, fsDriver({ base: `./.data/${name}` }))
  }

  if (cfg.kind === 'memory') {
    console.warn('[storage] No database found: data lives in memory and is lost when the server restarts. Env vars seen:', storageHints().join(', ') || 'none')
  } else {
    console.info(`[storage] Using ${cfg.kind}${cfg.envKey ? ` (${cfg.envKey})` : ''}`)
  }
})
