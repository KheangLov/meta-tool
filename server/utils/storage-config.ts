/**
 * Finds a database in the environment, whatever Vercel named it:
 *  - Upstash REST: UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN, also with a custom prefix (e.g. MYDB_KV_REST_API_URL)
 *  - Any Redis via a redis:// or rediss:// URL: REDIS_URL, KV_URL (also prefixed)
 *  - Vercel Blob: BLOB_READ_WRITE_TOKEN (also prefixed)
 */
export type StorageKind = 'upstash' | 'redis' | 'blob' | 'local-files' | 'memory'

function findKey(suffixes: string[]) {
  const keys = Object.keys(process.env).filter((k) => process.env[k])
  for (const s of suffixes) {
    const exact = keys.find((k) => k === s)
    if (exact) return exact
  }
  for (const s of suffixes) {
    const prefixed = keys.find((k) => k.endsWith('_' + s))
    if (prefixed) return prefixed
  }
  return ''
}

export function storageConfig() {
  const urlKey = findKey(['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL'])
  if (urlKey) {
    const tokenKey = urlKey.replace(/URL$/, 'TOKEN')
    const url = process.env[urlKey]!
    const token = process.env[tokenKey] || ''
    if (url.startsWith('https://') && token) return { kind: 'upstash' as StorageKind, url, token, envKey: urlKey }
  }
  const redisKey = findKey(['REDIS_URL', 'KV_URL', 'UPSTASH_REDIS_URL'])
  if (redisKey && /^rediss?:\/\//.test(process.env[redisKey]!)) {
    return { kind: 'redis' as StorageKind, url: process.env[redisKey]!, envKey: redisKey }
  }
  const blobKey = findKey(['BLOB_READ_WRITE_TOKEN'])
  if (blobKey) return { kind: 'blob' as StorageKind, token: process.env[blobKey]!, envKey: blobKey }
  return { kind: (import.meta.dev ? 'local-files' : 'memory') as StorageKind, envKey: '' }
}

export function blobToken() {
  const k = findKey(['BLOB_READ_WRITE_TOKEN'])
  return k ? process.env[k]! : ''
}

/** Env vars that look like a database but couldn't be used, to explain the problem */
export function storageHints() {
  return Object.keys(process.env)
    .filter((k) => /REDIS|KV_|UPSTASH|BLOB|DATABASE_URL|POSTGRES/i.test(k))
    .slice(0, 12)
}
