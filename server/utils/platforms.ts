/** Per-app overrides: each app's crawler can get its own title, description, image and site name. */
export type Platform = 'telegram' | 'facebook' | 'whatsapp' | 'linkedin' | 'discord' | 'slack'
export const PLATFORMS: Platform[] = ['telegram', 'facebook', 'whatsapp', 'linkedin', 'discord', 'slack']

export interface PlatformOverride { siteName?: string; title?: string; description?: string; image?: string }
export type PlatformOverrides = Partial<Record<Platform, PlatformOverride>>

export function cleanOverrides(v: any): PlatformOverrides {
  const out: PlatformOverrides = {}
  if (!v || typeof v !== 'object') return out
  const str = (x: unknown, max: number) => String(x ?? '').trim().slice(0, max)
  for (const p of PLATFORMS) {
    const o = v[p]
    if (!o || typeof o !== 'object') continue
    const c: PlatformOverride = {}
    if (str(o.siteName, 200)) c.siteName = str(o.siteName, 200)
    if (str(o.title, 500)) c.title = str(o.title, 500)
    if (str(o.description, 2000)) c.description = str(o.description, 2000)
    const img = str(o.image, 2000)
    if (img) {
      if (!isHttpUrl(img)) throw createError({ statusCode: 400, statusMessage: `${p} image must be a full http(s) URL` })
      c.image = img
    }
    if (Object.keys(c).length) out[p] = c
  }
  return out
}

export function sameOverrides(a?: PlatformOverrides, b?: PlatformOverrides) {
  const norm = (x?: PlatformOverrides) => JSON.stringify(PLATFORMS.map((p) => x?.[p] ? Object.entries(x[p]!).sort() : null))
  return norm(a) === norm(b)
}

/** Which app's crawler is asking (Messenger uses Facebook's crawler) */
export function platformFromUA(ua: string): Platform | null {
  if (/TelegramBot/i.test(ua)) return 'telegram'
  if (/WhatsApp/i.test(ua)) return 'whatsapp'
  if (/facebookexternalhit|Facebot|meta-externalagent|meta-externalfetcher/i.test(ua)) return 'facebook'
  if (/LinkedInBot/i.test(ua)) return 'linkedin'
  if (/Discordbot/i.test(ua)) return 'discord'
  if (/Slackbot|Slack-ImgProxy/i.test(ua)) return 'slack'
  return null
}

export function applyOverride<T extends { siteName: string; title: string; description: string; image: string }>(base: T, o?: PlatformOverride) {
  return {
    ...base,
    siteName: o?.siteName || base.siteName,
    title: o?.title || base.title,
    description: o?.description || base.description,
    image: o?.image || base.image,
    imageOverridden: !!o?.image && o.image !== base.image,
  }
}

export const CRAWLER_UA: Record<Platform, string> = {
  telegram: 'TelegramBot (like TwitterBot)',
  facebook: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  whatsapp: 'WhatsApp/2.24.20.80 A',
  linkedin: 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
  discord: 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
  slack: 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
}

/** Turns a query value like ?as=whatsapp into a Platform (or null) */
export function parsePlatform(v: unknown): Platform | null {
  return PLATFORMS.includes(String(v) as Platform) ? (String(v) as Platform) : null
}
