/**
 * Everything the editors do with data, in the browser:
 * save locally → publish to GitHub → keep linked share links in sync.
 */
const PREVIEW_KEYS = ['siteName', 'title', 'description', 'image', 'imageStyle'] as const
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? {}) === JSON.stringify(b ?? {})

export function linkPreviewDiffers(a: LinkMeta, b: LinkMeta) {
  return PREVIEW_KEYS.some((k) => a[k] !== b[k]) || !same(a.extra, b.extra) || !same(a.platforms, b.platforms)
}

export function previewFromPost(p: Post) {
  const extra: PreviewExtra = { ...(p.author ? { author: p.author } : {}), ...(p.extra || {}) }
  return {
    siteName: p.siteName, title: p.title, description: p.excerpt, image: p.cover, imageStyle: p.imageStyle,
    extra, platforms: JSON.parse(JSON.stringify(p.platforms || {})) as PlatformOverrides,
  }
}

function randomSlug(len = 7) {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}
export const SLUG_RE = /^[a-zA-Z0-9_-]{3,64}$/

/** "Rainy Season Sale!" → "rainy-season-sale" (non-Latin text like Khmer gives "", so a random name is used) */
export function slugify(s: string) {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '')
}

/** Last part of a URL's path ("…/p/sample-large?v=2" → "sample-large"), or its domain */
function slugFromUrl(u: string) {
  try {
    const url = new URL(u)
    const last = url.pathname.split('/').filter(Boolean).pop() || ''
    return slugify(last.replace(/\.[a-z0-9]+$/i, '')) || slugify(url.hostname.replace(/^www\./, '').split('.')[0] || '')
  } catch { return '' }
}

export function useStudio() {
  const api = useApi()

  /** Sends one link/post to GitHub and records the result on the local copy */
  async function publish(kind: 'link' | 'post', item: LocalLink | LocalPost) {
    const table = kind === 'link' ? db().links : db().posts
    try {
      const { builtIn, publishedVersion, publishedAt, publishError, ...data } = item as any
      await api('/api/publish', { method: 'POST', body: { kind, item: data } })
      const patch = { publishedVersion: item.version || 1, publishedAt: new Date().toISOString(), publishError: undefined, builtIn: false }
      await table.update(item.slug, patch)
      return { ok: true as const, item: { ...item, ...patch } }
    } catch (e) {
      const msg = errMsg(e)
      await table.update(item.slug, { publishError: msg })
      return { ok: false as const, error: msg, item: { ...item, publishError: msg } }
    }
  }

  async function uniqueSlug(table: 'links' | 'posts', wanted?: string, suggestion?: string) {
    if (wanted) {
      if (!SLUG_RE.test(wanted)) throw new Error('Slug: 3–64 characters, letters, numbers, - or _')
      if (await db()[table].get(wanted)) throw new Error('That slug is already used')
      return wanted
    }
    // Readable name from the post or page (e.g. "sample-large", "sample-large-2") before falling back to random
    const base = slugify(suggestion || '')
    if (base.length >= 3) {
      for (let i = 1; i < 50; i++) {
        const s = i === 1 ? base : `${base}-${i}`
        if (!(await db()[table].get(s))) return s
      }
    }
    let s = randomSlug()
    while (await db()[table].get(s)) s = randomSlug()
    return s
  }

  // ---------- links ----------

  async function createLink(o: { targetUrl: string; slug?: string; importMeta?: boolean; postSlug?: string }) {
    if (!/^https?:\/\//.test(o.targetUrl)) throw new Error('Target URL must start with http:// or https://')
    const post = o.postSlug ? await db().posts.get(o.postSlug) : null
    const slug = await uniqueSlug('links', o.slug, post?.slug || slugFromUrl(o.targetUrl))
    const now = new Date().toISOString()
    let meta = { siteName: '', title: '', description: '', image: '' }
    if (o.importMeta !== false && !post) {
      try {
        const r = await api<any>('/api/inspect', { query: { url: o.targetUrl } })
        if (r.ok) meta = r.resolved
      } catch {}
    }
    const link: LocalLink = {
      slug, targetUrl: o.targetUrl, ...meta, imageStyle: 'large', extra: {}, platforms: {},
      ...(post ? { ...previewFromPost(post), postSlug: post.slug, syncWithPost: true } : {}),
      version: 1, createdAt: now, updatedAt: now,
    }
    await db().links.put(plain(link))
    return (await publish('link', link)).item as LocalLink
  }

  async function saveLink(slug: string, fields: Partial<LinkMeta>) {
    const before = await db().links.get(slug)
    if (!before) throw new Error('Link not found on this device')
    const next: LocalLink = plain({ ...before, ...fields, updatedAt: new Date().toISOString() })
    if (next.syncWithPost && next.postSlug) {
      const post = await db().posts.get(next.postSlug)
      if (post) Object.assign(next, previewFromPost(post))
      else next.syncWithPost = false
    }
    const previewChanged = linkPreviewDiffers(next, before)
    if (previewChanged) next.version = (before.version || 1) + 1
    await db().links.put(next)
    const pub = await publish('link', next)
    return { link: pub.item as LocalLink, previewChanged, published: pub.ok, publishError: pub.ok ? '' : pub.error }
  }

  async function deleteLink(slug: string) {
    const l = await db().links.get(slug)
    if (l?.publishedVersion && !l.builtIn) await api('/api/publish', { method: 'DELETE', query: { kind: 'link', slug } })
    await db().links.delete(slug)
    await db().sent.where('owner').equals(`link:${slug}`).delete()
  }

  // ---------- posts ----------

  async function createPost(o: { title: string; slug?: string }) {
    const slug = await uniqueSlug('posts', o.slug, o.title)
    const now = new Date().toISOString()
    const post: LocalPost = {
      slug, siteName: 'Test Blog', title: o.title || 'Untitled post', excerpt: '', body: '', cover: '', imageStyle: 'large',
      author: '', extra: {}, platforms: {}, version: 1, createdAt: now, updatedAt: now,
    }
    await db().posts.put(post)
    return (await publish('post', post)).item as LocalPost
  }

  const POST_PREVIEW = ['siteName', 'title', 'excerpt', 'cover', 'imageStyle', 'author'] as const

  async function savePost(slug: string, fields: Partial<Post>) {
    const before = await db().posts.get(slug)
    if (!before) throw new Error('Post not found on this device')
    const next: LocalPost = plain({ ...before, ...fields, updatedAt: new Date().toISOString() })
    const previewChanged = POST_PREVIEW.some((k) => next[k] !== before[k]) || !same(next.extra, before.extra) || !same(next.platforms, before.platforms)
    if (previewChanged) next.version = (before.version || 1) + 1
    await db().posts.put(next)
    const pub = await publish('post', next)

    // Share links that follow this post get the new preview (and a new ?v=)
    const syncedLinks: LocalLink[] = []
    const errors: string[] = pub.ok ? [] : [pub.error]
    if (previewChanged) {
      for (const link of await db().links.where('postSlug').equals(slug).toArray()) {
        if (!link.syncWithPost) continue
        const updated: LocalLink = plain({ ...link, ...previewFromPost(next), updatedAt: new Date().toISOString() })
        if (!linkPreviewDiffers(updated, link)) continue
        updated.version = (link.version || 1) + 1
        await db().links.put(updated)
        const r = await publish('link', updated)
        if (!r.ok) errors.push(r.error)
        syncedLinks.push(r.item as LocalLink)
      }
    }
    return { post: pub.item as LocalPost, previewChanged, syncedLinks, published: errors.length === 0, publishError: errors[0] || '' }
  }

  async function deletePost(slug: string) {
    const p = await db().posts.get(slug)
    if (p?.publishedVersion && !p.builtIn) await api('/api/publish', { method: 'DELETE', query: { kind: 'post', slug } })
    await db().posts.delete(slug)
    await db().sent.where('owner').equals(`post:${slug}`).delete()
  }

  // ---------- samples & restore ----------

  /** Copies the built-in samples into this browser (they're live on the site already) */
  async function loadSamples() {
    const s = await api<{ posts: Post[]; links: (LinkMeta & { case: string })[] }>('/api/test-kit/samples')
    for (const p of s.posts) {
      const existing = await db().posts.get(p.slug)
      await db().posts.put({ ...p, version: Math.max(p.version || 1, (existing?.version || 0) + 1), builtIn: !existing?.publishedVersion, publishedVersion: existing?.publishedVersion })
      if (existing?.publishedVersion) await publish('post', (await db().posts.get(p.slug))!)
    }
    for (const { case: _c, ...l } of s.links) {
      const existing = await db().links.get(l.slug)
      await db().links.put({ ...l, version: Math.max(l.version || 1, (existing?.version || 0) + 1), builtIn: !existing?.publishedVersion, publishedVersion: existing?.publishedVersion })
      if (existing?.publishedVersion) await publish('link', (await db().links.get(l.slug))!)
    }
    return s.links.map((l) => ({ case: l.case, link: `/s/${l.slug}`, post: l.postSlug && l.syncWithPost ? `/p/${l.postSlug}` : undefined }))
  }

  /** Brings everything that's published on GitHub into this browser (e.g. on a new device) */
  async function restoreFromPublished() {
    const r = await api<{ links: LinkMeta[]; posts: Post[] }>('/api/published')
    let added = 0
    for (const p of r.posts) {
      const local = await db().posts.get(p.slug)
      if (!local || (local.updatedAt || '') < (p.updatedAt || '')) { await db().posts.put({ ...p, publishedVersion: p.version || 1, publishedAt: p.updatedAt }); added++ }
    }
    for (const l of r.links) {
      const local = await db().links.get(l.slug)
      if (!local || (local.updatedAt || '') < (l.updatedAt || '')) { await db().links.put({ ...l, publishedVersion: l.version || 1, publishedAt: l.updatedAt }); added++ }
    }
    return { added, total: r.links.length + r.posts.length }
  }

  return { publish, createLink, saveLink, deleteLink, createPost, savePost, deletePost, loadSamples, restoreFromPublished }
}

/** "Published v3" / "Not published" label for a local item */
export function publishLabel(i?: { version?: number; publishedVersion?: number; publishError?: string; builtIn?: boolean }) {
  if (!i) return { kind: 'none', text: '' }
  if (i.builtIn && !i.publishError) return { kind: 'ok', text: 'Built-in sample (live)' }
  if (i.publishError) return { kind: 'error', text: 'Not published' }
  if (i.publishedVersion && i.publishedVersion >= (i.version || 1)) return { kind: 'ok', text: `Published v${i.publishedVersion}` }
  return { kind: 'warn', text: 'Unpublished changes' }
}
