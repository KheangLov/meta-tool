/**
 * "Check all apps": fetches a link the way Telegram, Facebook/Messenger and WhatsApp do (through the
 * public URL, so Vercel's firewall applies too), then checks each app's rules. ?url=…
 */
type Level = 'error' | 'warn' | 'ok'
interface Issue { level: Level; text: string; fix?: string }

const APPS = [
  { id: 'telegram', label: 'Telegram', ua: CRAWLER_UA.telegram },
  { id: 'facebook', label: 'Facebook & Messenger', ua: CRAWLER_UA.facebook },
  { id: 'whatsapp', label: 'WhatsApp', ua: CRAWLER_UA.whatsapp },
  { id: 'x', label: 'X (Twitter)', ua: 'Twitterbot/1.0' },
  { id: 'linkedin', label: 'LinkedIn', ua: 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)' },
  { id: 'discord', label: 'Discord', ua: 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' },
  { id: 'slack', label: 'Slack', ua: 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)' },
  { id: 'imessage', label: 'iMessage', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0' },
  { id: 'inapp', label: 'Other apps / in-app fetchers', ua: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' },
] as const

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const url = String(getQuery(event).url || '')
  if (!isHttpUrl(url)) throw createError({ statusCode: 400, statusMessage: 'Provide a full http(s) url' })

  const results = await Promise.all(APPS.map(async (app) => {
    const r = await scrapeAs(url, app.ua)
    const t = r.tags
    const issues: Issue[] = []
    const err = (text: string, fix?: string) => issues.push({ level: 'error', text, fix })
    const warn = (text: string, fix?: string) => issues.push({ level: 'warn', text, fix })

    if (r.error) err(`Couldn't load the link: ${r.error}`)
    else if (r.status === 403) err('The site answered 403 (blocked) to this app\'s crawler.', 'In Vercel → Firewall, check Bot Protection / Attack Challenge Mode and allow this crawler, or add a custom domain.')
    else if (r.status === 404) err('The site answered 404: this link isn\'t published.', 'Open it in the editor and publish (Test kit → Check connection if publishing fails).')
    else if (r.status === 401) err('The site asked for a login (401). Vercel Deployment Protection is on for this URL.', 'Use the production domain, or turn off Deployment Protection for it.')
    else if (!r.ok) err(`The site answered HTTP ${r.status}.`)
    if (r.redirected) warn(`The crawler was redirected to ${r.finalUrl}, so it reads that page's tags, not yours.`)

    if (r.ok) {
      if (!t['og:title']) err('No og:title.')
      if (!t['og:image']) warn('No og:image, so there is no picture in the preview.')
      if (app.id === 'facebook' || app.id === 'inapp') {
        for (const req of ['og:url', 'og:type', 'og:title', 'og:image']) if (!t[req]) warn(`Facebook expects ${req}.`)
        if (t['article:author'] && !/^https?:\/\//.test(t['article:author'])) err('article:author must be a profile URL for Facebook.')
        if (t['og:image'] && !(t['og:image:width'] && t['og:image:height'])) warn('No og:image:width/height, so Facebook may show no image on the first share.')
      }
      const bytesOf = (s?: string) => Buffer.byteLength(s || '')
      if (app.id === 'linkedin') for (const req of ['og:title', 'og:image', 'og:description', 'og:url']) if (!t[req]) warn(`LinkedIn expects ${req}.`)
      if (app.id === 'discord') {
        if (bytesOf(t['og:title']) > 70) warn('Title is over 70 bytes, so Discord trims it.', 'Shorten the title, or give Discord its own under "Different text or image per app". Khmer letters count as 3 bytes each.')
        if (bytesOf(t['og:description']) > 350) warn('Description is over 350 bytes, so Discord trims it.')
        if ((t['og:site_name'] || '').length > 256) err('Site name is over 256 characters, so Discord shows no preview.')
        if (t['theme-color'] && !/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(t['theme-color'])) warn('Accent colour must look like #RRGGBB for Discord.')
        if (r.ms > 8000) warn('The page is slow. Discord gives up after 10 seconds.')
      }
      if (app.id === 'slack' && (r.bytes || 0) > 32 * 1024) warn('Tags may be too far down the page: Slack reads only the start of it (about 32 KB).')
      if (app.id === 'x' && !t['twitter:card']) warn('No twitter:card, so X picks the card size itself.')
      if (app.id === 'whatsapp' && (r.bytes || 0) > 300 * 1024) warn('Tags may be too far down the page: WhatsApp reads about the first 300 KB.')
      if (app.id === 'inapp' && !t['og:title']) err('Apps that fetch links from the phone don\'t get your preview.')
      if (t['og:image']) {
        try {
          const img = await fetchImage(t['og:image'])
          const dims = imageDimensions(img.data)
          const info = { bytes: img.data.length, width: dims?.width || 0, height: dims?.height || 0, type: detectImageType(img.data)?.type || img.type, https: img.finalUrl.startsWith('https:') }
          const key = ['telegram', 'whatsapp', 'linkedin', 'discord', 'slack'].includes(app.id) ? app.id : 'facebook'
          const c = checkImage(info).find((x) => x.platform === key)
          if (c && c.verdict !== 'ok') issues.push({ level: c.verdict === 'error' ? 'error' : 'warn', text: `Image: ${c.notes.join('; ')}`, fix: app.id === 'whatsapp' && /KB|px|4:1/.test(c.notes.join(' ')) ? 'Use "Make a WhatsApp-safe copy" on the WhatsApp tab.' : /https/.test(c.notes.join(' ')) ? 'Use an https image URL (on Vercel, your own images already are).' : undefined })
        } catch (e: any) {
          err(`The image can't be downloaded: ${e?.statusMessage || e?.message}`, 'Use a public https image URL.')
        }
      }
    }
    const level: Level = issues.some((i) => i.level === 'error') ? 'error' : issues.length ? 'warn' : 'ok'
    return { id: app.id, label: app.label, level, status: r.status, ms: r.ms, title: t['og:title'] || '', image: r.resolved.image, issues }
  }))

  return {
    url,
    results,
    tools: {
      facebook: `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(url)}`,
      discord: 'https://discord.com/developers/embeds',
    },
  }
})
