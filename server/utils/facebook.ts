/**
 * Facebook Graph API: re-scrape links (Facebook & Messenger share the same cache), read what Facebook stored,
 * and optionally publish to a Facebook Page.
 * App token: NUXT_FACEBOOK_APP_ID + NUXT_FACEBOOK_APP_SECRET (or NUXT_FACEBOOK_ACCESS_TOKEN).
 * Page posting: NUXT_FACEBOOK_PAGE_ID + NUXT_FACEBOOK_PAGE_TOKEN.
 */
const GRAPH = 'https://graph.facebook.com'

export function facebookToken() {
  const c = useRuntimeConfig()
  if (c.facebookAccessToken) return String(c.facebookAccessToken)
  if (c.facebookAppId && c.facebookAppSecret) return `${c.facebookAppId}|${c.facebookAppSecret}`
  return ''
}
export const facebookConfigured = () => !!facebookToken()
export function facebookPage() {
  const c = useRuntimeConfig()
  return { id: String(c.facebookPageId || ''), token: String(c.facebookPageToken || '') }
}
export const facebookPageConfigured = () => !!(facebookPage().id && facebookPage().token)

async function graph(method: 'GET' | 'POST', path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params)
  let res: Response
  try {
    res = await fetch(`${GRAPH}/${path}?${qs}`, { method, signal: AbortSignal.timeout(25_000) })
  } catch (e: any) {
    throw createError({ statusCode: 502, statusMessage: `Facebook unreachable: ${e?.message || e}` })
  }
  const data: any = await res.json().catch(() => ({}))
  if (data?.error) {
    throw createError({ statusCode: res.status === 429 || data.error.code === 4 ? 429 : 400, statusMessage: `Facebook: ${data.error.message}` })
  }
  return data
}

export interface FbPreview {
  title: string
  description: string
  siteName: string
  type: string
  image: string
  imageWidth?: number
  imageHeight?: number
  updatedTime?: string
  url?: string
}

function toPreview(o: any): FbPreview {
  const img = Array.isArray(o?.image) ? o.image[0] : o?.image
  return {
    title: o?.title || '',
    description: o?.description || '',
    siteName: o?.site_name || '',
    type: o?.type || '',
    image: (typeof img === 'string' ? img : img?.url) || '',
    imageWidth: img?.width, imageHeight: img?.height,
    updatedTime: o?.updated_time, url: o?.url,
  }
}

/** Makes Facebook fetch the page again now (same as "Scrape Again" in the Sharing Debugger) */
export async function facebookScrape(url: string) {
  if (!facebookConfigured()) throw createError({ statusCode: 501, statusMessage: 'Facebook is not connected. Set NUXT_FACEBOOK_APP_ID and NUXT_FACEBOOK_APP_SECRET (see README).' })
  return toPreview(await graph('POST', '', { id: url, scrape: 'true', access_token: facebookToken() }))
}

/** What Facebook currently has stored (no re-scrape). Facebook limits this to ~10 reads per URL per hour. */
export async function facebookCached(url: string) {
  if (!facebookConfigured()) throw createError({ statusCode: 501, statusMessage: 'Facebook is not connected. Set NUXT_FACEBOOK_APP_ID and NUXT_FACEBOOK_APP_SECRET (see README).' })
  const data = await graph('GET', '', { id: url, fields: 'og_object{id,title,description,type,updated_time,image,site_name},engagement', access_token: facebookToken() })
  return { preview: data.og_object ? toPreview(data.og_object) : null, engagement: data.engagement || null }
}

export function compareFacebook(p: FbPreview, want: { siteName: string; title: string; description: string; image: string }) {
  const n = (s = '') => s.replace(/\s+/g, ' ').trim()
  const diffs: string[] = []
  if (n(p.title) !== n(want.title)) diffs.push(`title is "${n(p.title)}"`)
  if (n(p.description) !== n(want.description) && !(n(want.description).startsWith(n(p.description)) && n(p.description))) diffs.push(`description is "${n(p.description)}"`)
  if (!!want.image !== !!p.image) diffs.push(want.image ? 'image is missing' : 'still shows an image')
  else if (want.image && p.image && !p.image.includes('fbcdn') && p.image !== want.image) diffs.push('uses a different image')
  return diffs
}

/** Publishes a link post on your Facebook Page */
export async function facebookPagePost(message: string, link: string) {
  const page = facebookPage()
  if (!page.id || !page.token) throw createError({ statusCode: 501, statusMessage: 'Set NUXT_FACEBOOK_PAGE_ID and NUXT_FACEBOOK_PAGE_TOKEN to post to a Page (see README).' })
  const res = await graph('POST', `${page.id}/feed`, { message, link, access_token: page.token })
  let permalink = ''
  try { permalink = (await graph('GET', res.id, { fields: 'permalink_url', access_token: page.token })).permalink_url || '' } catch {}
  return { id: String(res.id), permalink }
}

export async function facebookPageDelete(postId: string) {
  await graph('POST', postId, { method: 'delete', access_token: facebookPage().token })
}
