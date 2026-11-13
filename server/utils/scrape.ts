export const TELEGRAM_UA = 'TelegramBot (like TwitterBot)'

export interface ScrapeResult {
  ok: boolean
  status: number
  /** size of the HTML in bytes */
  bytes?: number
  /** the URL changed while fetching (redirect) */
  redirected?: boolean
  finalUrl: string
  ms: number
  htmlTitle: string
  tags: Record<string, string>
  /** Values resolved the way link previews usually pick them */
  resolved: { siteName: string; title: string; description: string; image: string }
  error?: string
}

function decode(s: string) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
}

export function parseMeta(html: string) {
  const head = html.slice(0, 500_000)
  const tags: Record<string, string> = {}
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs: Record<string, string> = {}
    for (const a of m[0].matchAll(/([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
      attrs[a[1]!.toLowerCase()] = decode(a[3] ?? a[4] ?? a[5] ?? '')
    }
    const key = (attrs.property || attrs.name || attrs.itemprop || '').toLowerCase()
    if (key && attrs.content !== undefined && !(key in tags)) tags[key] = attrs.content
  }
  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return { tags, htmlTitle: titleMatch ? decode(titleMatch[1]!.trim()) : '' }
}

export async function scrapeAsTelegram(url: string): Promise<ScrapeResult> {
  return scrapeAs(url, TELEGRAM_UA)
}

/** Fetch a page the way a given app's crawler does */
export async function scrapeAs(url: string, userAgent: string): Promise<ScrapeResult> {
  const started = Date.now()
  const empty = { siteName: '', title: '', description: '', image: '' }
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': userAgent, accept: 'text/html,*/*;q=0.8', 'x-lps-check': '1' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })
    const html = await res.text()
    const { tags, htmlTitle } = parseMeta(html)
    const abs = (v: string) => {
      try { return v ? new URL(v, res.url || url).toString() : '' } catch { return v }
    }
    let host = ''
    try { host = new URL(res.url || url).hostname } catch {}
    return {
      ok: res.ok,
      status: res.status,
      bytes: Buffer.byteLength(html),
      redirected: res.redirected,
      finalUrl: res.url || url,
      ms: Date.now() - started,
      htmlTitle,
      tags,
      resolved: {
        siteName: tags['og:site_name'] || host,
        title: tags['og:title'] || tags['twitter:title'] || htmlTitle,
        description: tags['og:description'] || tags['twitter:description'] || tags['description'] || '',
        image: abs(tags['og:image'] || tags['og:image:url'] || tags['twitter:image'] || ''),
      },
    }
  } catch (e: any) {
    return {
      ok: false, status: 0, finalUrl: url, ms: Date.now() - started,
      htmlTitle: '', tags: {}, resolved: empty, error: e?.message || String(e),
    }
  }
}
