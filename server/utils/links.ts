import { timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

export type ImageStyle = 'large' | 'small'

export interface LinkMeta {
  slug: string
  targetUrl: string
  siteName: string
  title: string
  description: string
  image: string
  imageStyle: ImageStyle
  /** Bumped every time preview fields change; used as ?v= to force a fresh Telegram preview */
  version: number
  /** Extra Open Graph / Telegram tags (type, author, video, …) */
  extra?: PreviewExtra
  /** Different title/description/image per app (Telegram, Facebook & Messenger, WhatsApp) */
  platforms?: PlatformOverrides
  /** Set when the link points at one of our posts */
  postSlug?: string
  /** When true, the link always copies its preview from the post (updated whenever the post is saved) */
  syncWithPost?: boolean
  createdAt: string
  updatedAt: string
}

export const SLUG_RE = /^[a-zA-Z0-9_-]{3,64}$/

/** Link-preview crawlers that should receive the meta-tag HTML instead of a redirect */
export const BOT_RE =
  /TelegramBot|facebookexternalhit|Facebot|meta-externalagent|Twitterbot|WhatsApp|Slackbot|Discordbot|LinkedInBot|SkypeUriPreview|vkShare|Viber|Line\/|redditbot|Pinterest|Embedly|Iframely|Googlebot|bingbot/i

export const linkStore = () => useStorage<LinkMeta>('links')

export async function getLink(slug: string | undefined) {
  if (!slug || !SLUG_RE.test(slug)) return null
  return await linkStore().getItem(slug)
}

export async function listLinks() {
  const store = linkStore()
  const keys = await store.getKeys()
  const items = await Promise.all(keys.map((k) => store.getItem(k)))
  return items
    .filter((x): x is LinkMeta => !!x)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function randomSlug(len = 7) {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export function isHttpUrl(v: unknown): v is string {
  if (typeof v !== 'string' || !v) return false
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function requireAdmin(event: H3Event) {
  const expected = String(useRuntimeConfig(event).adminToken || '')
  if (!expected) {
    if (import.meta.dev) return
    throw createError({
      statusCode: 503,
      statusMessage: 'NUXT_ADMIN_TOKEN is not set on the server. Add it in your Vercel environment variables.',
    })
  }
  const got = String(getHeader(event, 'x-admin-token') || '')
  const a = Buffer.from(got)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid admin token' })
  }
}

/** Validates and normalises editable fields from a request body */
export function cleanFields(body: any, partial = false) {
  const out: Partial<LinkMeta> = {}
  const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

  if (!partial || body.targetUrl !== undefined) {
    if (!isHttpUrl(body.targetUrl)) throw createError({ statusCode: 400, statusMessage: 'Target URL must start with http:// or https://' })
    out.targetUrl = body.targetUrl.trim()
  }
  if (body.image !== undefined) {
    const img = str(body.image, 2000)
    if (img && !isHttpUrl(img)) throw createError({ statusCode: 400, statusMessage: 'Image must be a full http(s) URL' })
    out.image = img
  }
  if (body.siteName !== undefined) out.siteName = str(body.siteName, 200)
  if (body.title !== undefined) out.title = str(body.title, 500)
  if (body.description !== undefined) out.description = str(body.description, 2000)
  if (body.imageStyle !== undefined) out.imageStyle = body.imageStyle === 'small' ? 'small' : 'large'
  if (body.extra !== undefined) out.extra = cleanExtra(body.extra)
  if (body.platforms !== undefined) out.platforms = cleanOverrides(body.platforms)
  return out
}

export const PREVIEW_FIELDS = ['siteName', 'title', 'description', 'image', 'imageStyle'] as const

export function previewFromPost(post: Post): Pick<LinkMeta, (typeof PREVIEW_FIELDS)[number] | 'extra' | 'platforms'> {
  return {
    siteName: post.siteName, title: post.title, description: post.excerpt, image: post.cover, imageStyle: post.imageStyle,
    extra: cleanExtra({ author: post.author, ...post.extra }), platforms: post.platforms || {},
  }
}

/** True when anything Telegram would show is different */
export function linkPreviewDiffers(a: LinkMeta, b: LinkMeta) {
  return PREVIEW_FIELDS.some((k) => a[k] !== b[k]) || !sameExtra(a.extra, b.extra) || !sameOverrides(a.platforms, b.platforms)
}

/** Copies a post's preview into every share link that follows it. Returns the links whose preview changed. */
export async function syncLinksForPost(post: Post) {
  const changed: LinkMeta[] = []
  for (const link of await listLinks()) {
    if (link.postSlug !== post.slug || !link.syncWithPost) continue
    const next = { ...link, ...previewFromPost(post) }
    if (linkPreviewDiffers(next, link)) {
      next.version = link.version + 1
      next.updatedAt = new Date().toISOString()
      await linkStore().setItem(link.slug, next)
      changed.push(next)
    }
  }
  return changed
}

/** Finds our own link or post behind a URL on this site, so we know what Telegram *should* show. */
export async function expectedPreviewFor(url: string, origin: string, platform?: Platform) {
  let u: URL
  try { u = new URL(url) } catch { return null }
  if (u.origin !== origin) return null
  const m = /^\/(s|p)\/([^/]+)\/?$/.exec(u.pathname)
  if (!m) return null
  if (m[1] === 's') {
    const l = await getLink(m[2])
    return l ? applyOverride({ siteName: l.siteName, title: l.title, description: l.description, image: l.image }, platform && l.platforms?.[platform]) : null
  }
  const p = await getPost(m[2])
  return p ? applyOverride({ siteName: p.siteName, title: p.title, description: p.excerpt, image: p.cover }, platform && p.platforms?.[platform]) : null
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
