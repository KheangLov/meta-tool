export interface Post {
  slug: string
  siteName: string
  title: string
  /** Short summary, used as og:description */
  excerpt: string
  /** Plain text; blank lines separate paragraphs */
  body: string
  cover: string
  imageStyle: 'large' | 'small'
  author: string
  /** Extra Open Graph / Telegram tags */
  extra?: PreviewExtra
  /** Different title/description/image per app */
  platforms?: PlatformOverrides
  /** Bumped when anything in the preview changes; used as ?v= on the post URL */
  version?: number
  createdAt: string
  updatedAt: string
}

/** A published post (from GitHub), or null */
export async function getPost(slug: string | undefined) {
  if (!slug || !SLUG_RE.test(slug)) return null
  return await readJson<Post>(`published/posts/${slug}.json`)
}

export function cleanPost(body: any) {
  const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)
  const out: Partial<Post> = {}
  if (body.title !== undefined) out.title = str(body.title, 500)
  if (body.siteName !== undefined) out.siteName = str(body.siteName, 200)
  if (body.excerpt !== undefined) out.excerpt = str(body.excerpt, 2000)
  if (body.body !== undefined) out.body = str(body.body, 50_000)
  if (body.author !== undefined) out.author = str(body.author, 200)
  if (body.imageStyle !== undefined) out.imageStyle = body.imageStyle === 'small' ? 'small' : 'large'
  if (body.extra !== undefined) out.extra = cleanExtra(body.extra)
  if (body.platforms !== undefined) out.platforms = cleanOverrides(body.platforms)
  if (body.cover !== undefined) {
    const c = str(body.cover, 2000)
    if (c && !isHttpUrl(c)) throw createError({ statusCode: 400, statusMessage: 'Cover image must be a full http(s) URL' })
    out.cover = c
  }
  return out
}
