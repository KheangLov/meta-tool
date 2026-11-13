/**
 * Your posts, links and sent messages live in this browser (IndexedDB via Dexie).
 * "Publish" copies a link/post to GitHub so Telegram, Facebook and WhatsApp can read it.
 */
import Dexie, { type Table } from 'dexie'

interface PublishState {
  /** version that is live on the site (in GitHub) */
  publishedVersion?: number
  publishedAt?: string
  publishError?: string
  /** came from the built-in samples, which are live even without publishing */
  builtIn?: boolean
}
export type LocalLink = LinkMeta & PublishState
export type LocalPost = Post & PublishState

export interface SentRecord {
  id: string; owner: string; via: 'account' | 'bot' | 'fbpage'; chat: string; chatId: string; chatTitle: string
  messageId: number; externalId?: string; template: string; options: SendOptions; url: string; messageLink?: string
  sentAt: string; updatedAt?: string; lastStatus?: 'sent' | 'updated' | 'unchanged' | 'error' | 'unsupported'; lastError?: string
}

class StudioDB extends Dexie {
  links!: Table<LocalLink, string>
  posts!: Table<LocalPost, string>
  sent!: Table<SentRecord, string>
  constructor() {
    super('link-preview-studio')
    this.version(1).stores({
      links: 'slug, updatedAt, postSlug',
      posts: 'slug, updatedAt',
      sent: 'id, owner, sentAt',
    })
  }
}

let instance: StudioDB | null = null
export function db() {
  return (instance ??= new StudioDB())
}

/** Vue reactive objects can't be stored in IndexedDB; this makes a plain copy */
export function plain<T>(v: T): T {
  return JSON.parse(JSON.stringify(toRaw(v)))
}
