import bigInt from 'big-integer'
import { Api, client as tgClientNs, helpers } from 'telegram'
import type { TelegramClient } from 'telegram'

// Use the package's public exports (deep imports break in the server bundle)
const parseText = (client: TelegramClient, text: string, html: boolean) =>
  tgClientNs.messageParse._parseMessageText(client, text, html ? 'html' : false)

export interface SendOptions {
  /** auto = let Telegram decide; large/small = force media size */
  size: 'auto' | 'large' | 'small'
  /** where the preview sits relative to the message text */
  position: 'below' | 'above'
  disablePreview: boolean
  silent: boolean
  parseMode: 'plain' | 'html'
}

export interface SentRecord {
  id: string
  /** 'link:<slug>' or 'post:<slug>' */
  owner: string
  via: 'account' | 'bot' | 'fbpage'
  /** Facebook post id (for via = fbpage) */
  externalId?: string
  /** what the user typed: 'me', '@channel', or a numeric chat id */
  chat: string
  chatId: string
  chatTitle: string
  messageId: number
  /** message text with {link}, {title}, {description} placeholders */
  template: string
  options: SendOptions
  /** URL used for the preview last time it was sent/edited */
  url: string
  messageLink?: string
  sentAt: string
  updatedAt?: string
  lastStatus?: 'sent' | 'updated' | 'unchanged' | 'error' | 'unsupported'
  lastError?: string
}

export function cleanSendOptions(o: any): SendOptions {
  return {
    size: ['large', 'small'].includes(o?.size) ? o.size : 'auto',
    position: o?.position === 'above' ? 'above' : 'below',
    disablePreview: !!o?.disablePreview,
    silent: !!o?.silent,
    parseMode: o?.parseMode === 'html' ? 'html' : 'plain',
  }
}

export interface Target { url: string; title: string; description: string }

/** Validates the {url,title,description} the browser sends for the newest version of a link/post */
export function cleanTarget(t: any): Target {
  if (!t || !isHttpUrl(t.url)) throw createError({ statusCode: 400, statusMessage: 'target.url must be a full http(s) URL' })
  return { url: String(t.url), title: String(t.title || '').slice(0, 500), description: String(t.description || '').slice(0, 2000) }
}

export function renderTemplate(template: string, t: { url: string; title: string; description: string }, html: boolean) {
  const esc = (s: string) => (html ? escapeHtml(s) : s)
  return (template || '{link}')
    .replaceAll('{link}', t.url)
    .replaceAll('{title}', esc(t.title))
    .replaceAll('{description}', esc(t.description))
    .slice(0, 4096)
}

// ---------- via the connected Telegram account (MTProto) ----------

async function resolvePeer(client: TelegramClient, chat: string) {
  const c = chat.trim()
  if (!c || c === 'me' || /^saved/i.test(c)) return { peer: 'me' as const, entity: null }
  const target: any = /^-?\d+$/.test(c) ? bigInt(c) : c.replace(/^https?:\/\/t\.me\//, '@')
  try {
    return { peer: await client.getInputEntity(target), entity: await client.getEntity(target) }
  } catch {
    // Private chats are only known after loading the dialog list once
    await client.getDialogs({ limit: 200 })
    return { peer: await client.getInputEntity(target), entity: await client.getEntity(target) }
  }
}

function describeEntity(entity: any, messageId: number) {
  if (!entity) return { chatId: 'me', chatTitle: 'Saved Messages', messageLink: undefined }
  if (entity instanceof Api.Channel) {
    return {
      chatId: `-100${entity.id}`,
      chatTitle: entity.title,
      messageLink: entity.username ? `https://t.me/${entity.username}/${messageId}` : `https://t.me/c/${entity.id}/${messageId}`,
    }
  }
  if (entity instanceof Api.Chat) return { chatId: `-${entity.id}`, chatTitle: entity.title, messageLink: undefined }
  if (entity instanceof Api.User) {
    return { chatId: String(entity.id), chatTitle: [entity.firstName, entity.lastName].filter(Boolean).join(' ') || entity.username || 'User', messageLink: undefined }
  }
  return { chatId: String(entity.id ?? ''), chatTitle: 'Chat', messageLink: undefined }
}

function messageIdFrom(res: any): number {
  if (res instanceof Api.UpdateShortSentMessage) return res.id
  for (const u of res?.updates || []) {
    if (u instanceof Api.UpdateMessageID) return u.id
    if ((u instanceof Api.UpdateNewMessage || u instanceof Api.UpdateNewChannelMessage) && u.message && 'id' in u.message) return u.message.id
    if (u instanceof Api.UpdateEditMessage || u instanceof Api.UpdateEditChannelMessage) return (u.message as any).id
  }
  return 0
}

function webPageMedia(url: string, o: SendOptions) {
  return new Api.InputMediaWebPage({ url, forceLargeMedia: o.size === 'large', forceSmallMedia: o.size === 'small', optional: true })
}

export async function sendViaAccount(client: TelegramClient, chat: string, text: string, url: string, o: SendOptions) {
  const { peer, entity } = await resolvePeer(client, chat)
  const [message, entities] = await parseText(client, text, o.parseMode === 'html')
  const common = { peer, message, entities, silent: o.silent, randomId: helpers.generateRandomBigInt() }
  const res = o.disablePreview
    ? await client.invoke(new Api.messages.SendMessage({ ...common, noWebpage: true }))
    : await client.invoke(new Api.messages.SendMedia({ ...common, media: webPageMedia(url, o), invertMedia: o.position === 'above' }))
  const messageId = messageIdFrom(res)
  return { messageId, ...describeEntity(entity, messageId) }
}

export async function editViaAccount(client: TelegramClient, rec: SentRecord, text: string, url: string) {
  const { peer } = await resolvePeer(client, rec.chat)
  const o = rec.options
  const [message, entities] = await parseText(client, text, o.parseMode === 'html')
  try {
    await client.invoke(new Api.messages.EditMessage({
      peer, id: rec.messageId, message, entities,
      ...(o.disablePreview ? { noWebpage: true } : { media: webPageMedia(url, o), invertMedia: o.position === 'above' }),
    }))
    return 'updated' as const
  } catch (e: any) {
    if (String(e?.errorMessage || e?.message).includes('MESSAGE_NOT_MODIFIED')) return 'unchanged' as const
    throw e
  }
}

export async function deleteViaAccount(client: TelegramClient, rec: SentRecord) {
  const { peer } = await resolvePeer(client, rec.chat)
  await client.deleteMessages(peer, [rec.messageId], { revoke: true })
}

// ---------- via a bot (Bot API) ----------

function previewOptions(url: string, o: SendOptions) {
  return o.disablePreview
    ? { is_disabled: true }
    : { url, prefer_large_media: o.size === 'large', prefer_small_media: o.size === 'small', show_above_text: o.position === 'above' }
}

export async function sendViaBot(chat: string, text: string, url: string, o: SendOptions) {
  if (!chat || chat === 'me') throw createError({ statusCode: 400, statusMessage: 'A bot has no Saved Messages. Use a @channel, a group/chat id, or send via your account.' })
  const msg = await botCall<any>('sendMessage', {
    chat_id: chat.replace(/^https?:\/\/t\.me\//, '@'),
    text,
    parse_mode: o.parseMode === 'html' ? 'HTML' : undefined,
    link_preview_options: previewOptions(url, o),
    disable_notification: o.silent,
  })
  const c = msg.chat
  const internal = String(c.id).replace(/^-100/, '')
  return {
    messageId: msg.message_id as number,
    chatId: String(c.id),
    chatTitle: c.title || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.username || String(c.id),
    messageLink: c.username ? `https://t.me/${c.username}/${msg.message_id}` : ['channel', 'supergroup'].includes(c.type) ? `https://t.me/c/${internal}/${msg.message_id}` : undefined,
  }
}

export async function editViaBot(rec: SentRecord, text: string, url: string) {
  try {
    await botCall('editMessageText', {
      chat_id: rec.chatId, message_id: rec.messageId, text,
      parse_mode: rec.options.parseMode === 'html' ? 'HTML' : undefined,
      link_preview_options: previewOptions(url, rec.options),
    })
    return 'updated' as const
  } catch (e: any) {
    if (/not modified/i.test(e?.botDescription || '')) return 'unchanged' as const
    throw e
  }
}

export async function deleteViaBot(rec: SentRecord) {
  await botCall('deleteMessage', { chat_id: rec.chatId, message_id: rec.messageId })
}
