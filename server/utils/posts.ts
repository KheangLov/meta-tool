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
  createdAt: string
  updatedAt: string
}

export const postStore = () => useStorage<Post>('posts')

export async function getPost(slug: string | undefined) {
  if (!slug || !SLUG_RE.test(slug)) return null
  return await postStore().getItem(slug)
}

export async function listPosts() {
  const store = postStore()
  const keys = await store.getKeys()
  const items = await Promise.all(keys.map((k) => store.getItem(k)))
  return items.filter((x): x is Post => !!x).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
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
  if (body.cover !== undefined) {
    const c = str(body.cover, 2000)
    if (c && !isHttpUrl(c)) throw createError({ statusCode: 400, statusMessage: 'Cover image must be a full http(s) URL' })
    out.cover = c
  }
  return out
}

export async function savePost(slug: string, fields: Partial<Post>, existing?: Post | null) {
  const now = new Date().toISOString()
  const post: Post = {
    slug,
    siteName: 'Test Blog',
    title: 'Untitled post',
    excerpt: '',
    body: '',
    cover: '',
    imageStyle: 'large',
    author: '',
    createdAt: existing?.createdAt || now,
    ...existing,
    ...fields,
    updatedAt: now,
  }
  await postStore().setItem(slug, post)
  return post
}
