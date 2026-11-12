/**
 * Extra Open Graph / Telegram tags, beyond title, description and image.
 * Telegram stores these in its link preview (type, author, duration, embed, …).
 * Whether a client shows each one varies, so the editor's "Telegram's saved preview" check shows what Telegram really kept.
 */
export interface PreviewExtra {
  /** og:type */
  ogType?: string
  /** article:author + <meta name="author"> */
  author?: string
  publishedTime?: string
  locale?: string
  imageAlt?: string
  imageWidth?: number
  imageHeight?: number
  /** og:video: a direct .mp4 or an embeddable player page (text/html) */
  videoUrl?: string
  videoType?: string
  videoWidth?: number
  videoHeight?: number
  /** seconds */
  videoDuration?: number
  audioUrl?: string
  audioType?: string
  /** telegram:channel, e.g. @mychannel: links the page to your channel (used by Instant View) */
  tgChannel?: string
}

export const OG_TYPES = ['website', 'article', 'video.other', 'video.movie', 'music.song', 'profile', 'book']

export function cleanExtra(v: any): PreviewExtra {
  if (!v || typeof v !== 'object') return {}
  const str = (x: unknown, max = 500) => String(x ?? '').trim().slice(0, max)
  const num = (x: unknown) => { const n = Math.round(Number(x)); return Number.isFinite(n) && n > 0 && n < 100_000 ? n : undefined }
  const url = (x: unknown, label: string) => {
    const s = str(x, 2000)
    if (s && !isHttpUrl(s)) throw createError({ statusCode: 400, statusMessage: `${label} must be a full http(s) URL` })
    return s
  }
  const out: PreviewExtra = {
    ogType: OG_TYPES.includes(v.ogType) ? v.ogType : undefined,
    author: str(v.author, 200),
    publishedTime: str(v.publishedTime, 40),
    locale: str(v.locale, 20).replace(/[^A-Za-z_]/g, ''),
    imageAlt: str(v.imageAlt, 500),
    imageWidth: num(v.imageWidth),
    imageHeight: num(v.imageHeight),
    videoUrl: url(v.videoUrl, 'Video URL'),
    videoType: str(v.videoType, 60),
    videoWidth: num(v.videoWidth),
    videoHeight: num(v.videoHeight),
    videoDuration: num(v.videoDuration),
    audioUrl: url(v.audioUrl, 'Audio URL'),
    audioType: str(v.audioType, 60),
    tgChannel: str(v.tgChannel, 80).replace(/^(https?:\/\/)?(www\.)?(t|telegram)\.me\//i, '@').replace(/[^@A-Za-z0-9_]/g, ''),
  }
  if (out.tgChannel && !out.tgChannel.startsWith('@')) out.tgChannel = '@' + out.tgChannel
  // Drop empty values so comparisons and storage stay tidy
  for (const k of Object.keys(out) as (keyof PreviewExtra)[]) if (out[k] === '' || out[k] === undefined) delete out[k]
  return out
}

export function sameExtra(a?: PreviewExtra, b?: PreviewExtra) {
  const norm = (x?: PreviewExtra) => JSON.stringify(Object.entries(x || {}).sort(([k1], [k2]) => k1.localeCompare(k2)))
  return norm(a) === norm(b)
}

function guessVideoType(u: string) {
  if (/\.mp4(\?|$)/i.test(u)) return 'video/mp4'
  if (/\.webm(\?|$)/i.test(u)) return 'video/webm'
  if (/\.mov(\?|$)/i.test(u)) return 'video/quicktime'
  return 'text/html'
}

/** Builds every <meta>/<title> tag for a share link or post page. */
export function renderMetaTags(p: {
  url: string; siteName: string; title: string; description: string; image: string
  imageStyle: 'large' | 'small'; extra?: PreviewExtra; defaultType?: string
}) {
  const e = escapeHtml
  const x = p.extra || {}
  const tag = (prop: string, content: unknown, attr = 'property') =>
    content === undefined || content === '' ? '' : `<meta ${attr}="${prop}" content="${e(String(content))}">`

  const videoType = x.videoUrl ? x.videoType || guessVideoType(x.videoUrl) : ''
  const isEmbed = videoType === 'text/html'
  const card = x.videoUrl && isEmbed ? 'player' : p.imageStyle === 'small' ? 'summary' : 'summary_large_image'
  const type = x.ogType || (x.videoUrl ? 'video.other' : p.defaultType || 'website')

  return [
    `<title>${e(p.title)}</title>`,
    tag('description', p.description, 'name'),
    tag('author', x.author, 'name'),
    tag('og:type', type),
    tag('og:url', p.url),
    tag('og:site_name', p.siteName),
    tag('og:title', p.title),
    tag('og:description', p.description),
    tag('og:locale', x.locale),
    tag('og:image', p.image),
    p.image && p.image.startsWith('https:') ? tag('og:image:secure_url', p.image) : '',
    p.image ? tag('og:image:width', x.imageWidth) : '',
    p.image ? tag('og:image:height', x.imageHeight) : '',
    p.image ? tag('og:image:alt', x.imageAlt) : '',
    tag('og:video', x.videoUrl),
    x.videoUrl?.startsWith('https:') ? tag('og:video:secure_url', x.videoUrl) : '',
    x.videoUrl ? tag('og:video:type', videoType) : '',
    x.videoUrl ? tag('og:video:width', x.videoWidth) : '',
    x.videoUrl ? tag('og:video:height', x.videoHeight) : '',
    x.videoUrl ? tag('video:duration', x.videoDuration) : '',
    tag('og:audio', x.audioUrl),
    x.audioUrl ? tag('og:audio:type', x.audioType || 'audio/mpeg') : '',
    tag('article:author', x.author),
    tag('article:published_time', x.publishedTime),
    tag('telegram:channel', x.tgChannel),
    tag('twitter:card', card, 'name'),
    tag('twitter:title', p.title, 'name'),
    tag('twitter:description', p.description, 'name'),
    tag('twitter:image', p.image, 'name'),
    tag('twitter:image:alt', p.image ? x.imageAlt : '', 'name'),
    x.videoUrl && isEmbed ? tag('twitter:player', x.videoUrl, 'name') : '',
    x.videoUrl && isEmbed ? tag('twitter:player:width', x.videoWidth || 1280, 'name') : '',
    x.videoUrl && isEmbed ? tag('twitter:player:height', x.videoHeight || 720, 'name') : '',
  ].filter(Boolean)
}
