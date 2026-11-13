/**
 * Published previews live as files in your GitHub repo (no database).
 *   published/links/<slug>.json · published/posts/<slug>.json · published/uploads/<name>
 * Written on "Publish", read whenever Telegram/Facebook/WhatsApp (or a person) opens a link.
 *
 * Env: NUXT_GITHUB_TOKEN (fine-grained token with Contents: read & write on the repo),
 *      NUXT_GITHUB_REPO (owner/name), NUXT_GITHUB_BRANCH (default "published-data").
 * During `nuxt dev` without a token, files go to ./.data/ instead.
 *
 * Reads use ETags: GitHub answers "304 Not Modified" for unchanged files, which is fast and
 * doesn't count against the rate limit, while new publishes show up immediately.
 */
import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'


export function githubConfig() {
  const c = useRuntimeConfig()
  return {
    token: String(c.githubToken || ''),
    repo: String(c.githubRepo || ''),
    branch: String(c.githubBranch || 'published-data'),
    /** Override for GitHub Enterprise (or tests) */
    api: String(c.githubApi || 'https://api.github.com').replace(/\/$/, ''),
  }
}
export const githubConfigured = () => { const g = githubConfig(); return !!(g.token && g.repo) }
/** Local files in dev when GitHub isn't set up, so the app is still usable locally */
const useLocal = () => !githubConfigured() && import.meta.dev
export const publishTarget = () => (githubConfigured() ? 'github' : useLocal() ? 'local-files' : 'none')

function notConfigured(): never {
  throw createError({
    statusCode: 501,
    statusMessage: 'Publishing is not set up. Add NUXT_GITHUB_TOKEN and NUXT_GITHUB_REPO in Vercel (see README → "Publishing to GitHub").',
  })
}

async function gh(method: string, path: string, init: { body?: unknown; headers?: Record<string, string> } = {}) {
  const g = githubConfig()
  try {
    return await fetch(`${g.api}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${g.token}`,
        'x-github-api-version': '2022-11-28',
        'user-agent': 'link-preview-studio',
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...init.headers,
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(20_000),
    })
  } catch (e: any) {
    throw createError({ statusCode: 502, statusMessage: `GitHub unreachable: ${e?.message || e}` })
  }
}

async function ghError(res: Response, what: string): Promise<never> {
  const data: any = await res.json().catch(() => ({}))
  const hint = res.status === 401 ? ' (token invalid or expired)'
    : res.status === 403 ? ' (token needs "Contents: Read and write" on this repo, or rate limit reached)'
    : res.status === 404 ? ' (repo not found, or the token can\'t see it)' : ''
  throw createError({ statusCode: res.status === 404 ? 502 : res.status, statusMessage: `GitHub ${what} failed: ${data.message || res.statusText}${hint}` })
}

const contentsPath = (path: string) => `/repos/${githubConfig().repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`

// ---------- reading (with ETag revalidation) ----------

const cache = new Map<string, { etag: string; data: Buffer; sha: string }>()

/** Returns the file's bytes, or null if it doesn't exist */
export async function readFile(path: string): Promise<Buffer | null> {
  if (useLocal()) {
    try { return await fs.readFile(join('.data', path)) } catch { return null }
  }
  if (!githubConfigured()) return null
  const g = githubConfig()
  const key = `${g.repo}@${g.branch}:${path}`
  const hit = cache.get(key)
  const res = await gh('GET', `${contentsPath(path)}?ref=${encodeURIComponent(g.branch)}`, {
    headers: { accept: 'application/vnd.github.raw+json', ...(hit ? { 'if-none-match': hit.etag } : {}) },
  })
  if (res.status === 304 && hit) return hit.data
  if (res.status === 404) { cache.delete(key); return null }
  if (!res.ok) await ghError(res, 'read')
  const data = Buffer.from(await res.arrayBuffer())
  const etag = res.headers.get('etag') || ''
  if (etag) cache.set(key, { etag, data, sha: '' })
  return data
}

export async function readJson<T>(path: string): Promise<T | null> {
  const buf = await readFile(path)
  if (!buf) return null
  try { return JSON.parse(buf.toString('utf8')) as T } catch { return null }
}

/** Lists file names in a folder (non-recursive) */
export async function listDir(path: string): Promise<string[]> {
  if (useLocal()) {
    try { return await fs.readdir(join('.data', path)) } catch { return [] }
  }
  if (!githubConfigured()) return []
  const g = githubConfig()
  const res = await gh('GET', `${contentsPath(path)}?ref=${encodeURIComponent(g.branch)}`, { headers: { accept: 'application/vnd.github+json' } })
  if (res.status === 404) return []
  if (!res.ok) await ghError(res, 'list')
  const items: any[] = await res.json()
  return Array.isArray(items) ? items.filter((i) => i.type === 'file').map((i) => i.name) : []
}

// ---------- writing ----------

async function ensureBranch() {
  const g = githubConfig()
  const ref = await gh('GET', `/repos/${g.repo}/git/ref/heads/${encodeURIComponent(g.branch)}`)
  if (ref.ok) return
  if (ref.status !== 404) await ghError(ref, 'branch check')
  // Create the data branch from the repo's default branch
  const repo = await gh('GET', `/repos/${g.repo}`)
  if (!repo.ok) await ghError(repo, 'repo lookup')
  const def = (await repo.json()).default_branch
  const head = await gh('GET', `/repos/${g.repo}/git/ref/heads/${encodeURIComponent(def)}`)
  if (!head.ok) await ghError(head, 'default branch lookup')
  const sha = (await head.json()).object.sha
  const created = await gh('POST', `/repos/${g.repo}/git/refs`, { body: { ref: `refs/heads/${g.branch}`, sha } })
  if (!created.ok && created.status !== 422) await ghError(created, 'branch create')
}

async function currentSha(path: string) {
  const g = githubConfig()
  const res = await gh('GET', `${contentsPath(path)}?ref=${encodeURIComponent(g.branch)}`, { headers: { accept: 'application/vnd.github.object+json' } })
  if (res.status === 404) return ''
  if (!res.ok) await ghError(res, 'read')
  return (await res.json()).sha as string
}

export async function writeFile(path: string, data: Buffer | string, message: string) {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data
  if (useLocal()) {
    await fs.mkdir(dirname(join('.data', path)), { recursive: true })
    await fs.writeFile(join('.data', path), buf)
    return
  }
  if (!githubConfigured()) notConfigured()
  const g = githubConfig()
  for (let attempt = 0; attempt < 3; attempt++) {
    const sha = await currentSha(path).catch(async (e) => {
      if (e?.statusCode === 502 && attempt === 0) { await ensureBranch(); return '' }
      throw e
    })
    const res = await gh('PUT', contentsPath(path), {
      body: { message, content: buf.toString('base64'), branch: g.branch, ...(sha ? { sha } : {}) },
    })
    if (res.ok) {
      cache.delete(`${g.repo}@${g.branch}:${path}`)
      return
    }
    // 404 = branch missing; 409/422 = someone else changed the file meanwhile → retry with the new sha
    if (res.status === 404 && attempt === 0) { await ensureBranch(); continue }
    if ((res.status === 409 || res.status === 422) && attempt < 2) continue
    await ghError(res, 'write')
  }
}

export async function deleteFile(path: string, message: string) {
  if (useLocal()) { await fs.rm(join('.data', path), { force: true }); return }
  if (!githubConfigured()) notConfigured()
  const g = githubConfig()
  const sha = await currentSha(path).catch(() => '')
  if (!sha) return
  const res = await gh('DELETE', contentsPath(path), { body: { message, sha, branch: g.branch } })
  if (!res.ok && res.status !== 404) await ghError(res, 'delete')
  cache.delete(`${g.repo}@${g.branch}:${path}`)
}
