/**
 * Recent visits by apps' link-preview crawlers, kept in memory (no database).
 * Best effort: Vercel restarts and runs several copies of the server, so a visit can be missing.
 * It still answers the key question when a preview doesn't show: did the app reach the link at all?
 */
export interface CrawlerVisit { at: string; path: string; slug: string; kind: 'link' | 'post'; app: string; status: number; ua: string }

const store = globalThis as unknown as { __lpsVisits?: CrawlerVisit[]; __lpsStarted?: string }
store.__lpsVisits ||= []
store.__lpsStarted ||= new Date().toISOString()

const NAMES: [RegExp, string][] = [
  [/TelegramBot/i, 'Telegram'],
  [/WhatsApp/i, 'WhatsApp'],
  // iMessage sends both names, so test it before Facebook and X
  [/facebookexternalhit.*Twitterbot/i, 'iMessage'],
  [/facebookexternalhit|Facebot|facebookcatalog/i, 'Facebook / Messenger'],
  [/meta-externalagent|meta-externalfetcher/i, 'Meta (Instagram, Threads)'],
  [/Twitterbot/i, 'X'],
  [/LinkedInBot/i, 'LinkedIn'],
  [/Discordbot/i, 'Discord'],
  [/Slackbot|Slack-ImgProxy/i, 'Slack'],
  [/Viber/i, 'Viber'], [/Line\//i, 'LINE'], [/Zalo/i, 'Zalo'], [/KakaoTalk/i, 'KakaoTalk'],
  [/SkypeUriPreview|Teams/i, 'Skype / Teams'], [/Snapchat/i, 'Snapchat'], [/Pinterest/i, 'Pinterest'],
  [/redditbot/i, 'Reddit'], [/Mastodon/i, 'Mastodon'], [/Bluesky/i, 'Bluesky'],
  [/Googlebot|Google-InspectionTool/i, 'Google'], [/bingbot/i, 'Bing'], [/Applebot/i, 'Apple'],
]
export function crawlerName(ua: string) {
  for (const [re, name] of NAMES) if (re.test(ua)) return name
  return 'Other crawler'
}

export function recordVisit(v: Omit<CrawlerVisit, 'at' | 'app'>) {
  // The tool's own checks send this header so they don't show up as real visits
  store.__lpsVisits!.unshift({ ...v, ua: v.ua.slice(0, 160), at: new Date().toISOString(), app: crawlerName(v.ua) })
  if (store.__lpsVisits!.length > 300) store.__lpsVisits!.length = 300
}

export function listVisits(slug?: string, kind?: string) {
  const all = store.__lpsVisits!
  return { since: store.__lpsStarted!, visits: (slug ? all.filter((v) => v.slug === slug && (!kind || v.kind === kind)) : all).slice(0, 50) }
}
