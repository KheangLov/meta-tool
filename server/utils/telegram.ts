/**
 * Talks to Telegram as a normal user account (MTProto via GramJS), because:
 *  - only user accounts can message @WebpageBot (bots can't talk to bots), and
 *  - messages.getWebPagePreview returns the preview Telegram really has cached.
 *
 * Needs NUXT_TELEGRAM_API_ID, NUXT_TELEGRAM_API_HASH (from https://my.telegram.org)
 * and NUXT_TELEGRAM_SESSION (made once with `npm run telegram:login`).
 */
import { Api, TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'

export interface TgPreview {
  state: 'ready' | 'pending' | 'empty' | 'none'
  url?: string
  siteName?: string
  title?: string
  description?: string
  /** true → Telegram shows the big image, false → small thumbnail */
  hasLargeMedia?: boolean
  /** The image Telegram stored, as a data: URL */
  image?: string
}

export interface TgRefreshResult {
  botReplies: string[]
  pressedButton?: string
  preview: TgPreview
}

const WEBPAGE_BOT = 'WebpageBot'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let t: ReturnType<typeof setTimeout>
  return Promise.race([
    p,
    new Promise<T>((_, rej) => { t = setTimeout(() => rej(new Error(`${what} timed out after ${ms / 1000}s`)), ms) }),
  ]).finally(() => clearTimeout(t))
}

export function telegramSettings() {
  const c = useRuntimeConfig()
  return {
    apiId: Number(c.telegramApiId) || 0,
    apiHash: String(c.telegramApiHash || ''),
    session: String(c.telegramSession || ''),
  }
}

export function telegramConfigured() {
  const s = telegramSettings()
  return !!(s.apiId && s.apiHash && s.session)
}

export async function withTelegram<T>(fn: (client: TelegramClient) => Promise<T>): Promise<T> {
  const s = telegramSettings()
  if (!telegramConfigured()) {
    throw createError({
      statusCode: 501,
      statusMessage: 'Telegram is not connected. Set NUXT_TELEGRAM_API_ID, NUXT_TELEGRAM_API_HASH and NUXT_TELEGRAM_SESSION (see README).',
    })
  }
  const client = new TelegramClient(new StringSession(s.session), s.apiId, s.apiHash, {
    connectionRetries: 2,
    requestRetries: 2,
    autoReconnect: false,
  })
  client.setLogLevel('error' as any)
  try {
    await withTimeout(client.connect(), 15000, 'Connecting to Telegram')
    if (!(await withTimeout(client.checkAuthorization(), 10000, 'Checking Telegram login'))) {
      throw createError({ statusCode: 401, statusMessage: 'Telegram session expired or was logged out. Run `npm run telegram:login` again.' })
    }
    return await withTimeout(fn(client), 45000, 'Telegram request')
  } catch (e: any) {
    if (e?.statusCode) throw e
    const msg = String(e?.errorMessage || e?.message || e)
    const wait = /FLOOD_WAIT_(\d+)/.exec(msg)?.[1] || e?.seconds
    throw createError({
      statusCode: wait ? 429 : 502,
      statusMessage: wait ? `Telegram rate limit: try again in ${wait}s` : `Telegram error: ${msg}`,
    })
  } finally {
    // Don't let a stuck socket keep the function alive
    withTimeout(client.destroy(), 3000, 'disconnect').catch(() => {})
  }
}

async function toPreview(client: TelegramClient, media: Api.TypeMessageMedia | undefined): Promise<TgPreview> {
  if (!(media instanceof Api.MessageMediaWebPage)) return { state: 'none' }
  const wp = media.webpage
  if (wp instanceof Api.WebPagePending) return { state: 'pending' }
  if (!(wp instanceof Api.WebPage)) return { state: 'empty', url: (wp as any).url }

  let image = ''
  if (wp.photo instanceof Api.Photo) {
    try {
      const buf = await client.downloadMedia(media, {})
      if (buf && typeof buf !== 'string' && buf.length < 2_500_000) image = `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`
    } catch {}
  }
  return {
    state: 'ready',
    url: wp.url,
    siteName: wp.siteName || '',
    title: wp.title || '',
    description: wp.description || '',
    hasLargeMedia: !!wp.hasLargeMedia,
    image,
  }
}

/** What Telegram currently has cached for this URL (doesn't refresh anything). */
export async function getTelegramPreview(client: TelegramClient, url: string): Promise<TgPreview> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await client.invoke(new Api.messages.GetWebPagePreview({ message: url }))
    // Older layers return the media directly; newer ones wrap it in messages.WebPagePreview
    const media = (res as any)?.media ?? res
    const preview = await toPreview(client, media)
    if (preview.state !== 'pending') return preview
    await sleep(1500)
  }
  return { state: 'pending' }
}

/** Sends the URL to @WebpageBot (like doing it by hand), waits for its answer, then reads the fresh preview. */
export async function refreshWithWebpageBot(
  client: TelegramClient,
  url: string,
  opts: { withContent?: boolean } = {},
): Promise<TgRefreshResult> {
  const bot = await client.getInputEntity(WEBPAGE_BOT)

  // The bot needs /start once per account
  const history = await client.getMessages(bot, { limit: 1 })
  if (!history.length) {
    await client.sendMessage(bot, { message: '/start' })
    await sleep(1500)
  }

  const sent = await client.sendMessage(bot, { message: url, linkPreview: false })
  const replies = await waitForReplies(client, bot, sent.id)
  const result: TgRefreshResult = { botReplies: replies.map((m) => m.message).filter(Boolean), preview: { state: 'none' } }

  if (opts.withContent) {
    const target = replies.flatMap((m) => buttonsOf(m).map((b) => ({ m, b }))).find(({ b }) => /content/i.test(b.text))
    if (target) {
      await client.invoke(new Api.messages.GetBotCallbackAnswer({ peer: bot, msgId: target.m.id, data: target.b.data }))
      result.pressedButton = target.b.text
      await sleep(2500)
      const after = await waitForReplies(client, bot, target.m.id, 4000)
      result.botReplies.push(...after.map((m) => m.message).filter(Boolean))
    }
  }

  result.preview = await getTelegramPreview(client, url)
  return result
}

function buttonsOf(m: Api.Message) {
  const out: { text: string; data: Buffer }[] = []
  const markup = m.replyMarkup
  if (markup instanceof Api.ReplyInlineMarkup) {
    for (const row of markup.rows) for (const b of row.buttons) {
      if (b instanceof Api.KeyboardButtonCallback) out.push({ text: b.text, data: b.data })
    }
  }
  return out
}

async function waitForReplies(client: TelegramClient, bot: Api.TypeInputPeer, afterId: number, timeoutMs = 15000) {
  const start = Date.now()
  let replies: Api.Message[] = []
  while (Date.now() - start < timeoutMs) {
    await sleep(800)
    const msgs = await client.getMessages(bot, { limit: 10, minId: afterId })
    replies = msgs.filter((m) => !m.out).reverse()
    // Give the bot a moment to send follow-up messages after the first one arrives
    if (replies.length) {
      await sleep(1200)
      const more = await client.getMessages(bot, { limit: 10, minId: afterId })
      return more.filter((m) => !m.out).reverse()
    }
  }
  return replies
}
