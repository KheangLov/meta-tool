const KEY = 'lps-admin-token'

export function useAdminToken() {
  const token = useState('adminToken', () => (import.meta.client ? localStorage.getItem(KEY) || '' : ''))
  const save = (v: string) => {
    token.value = v.trim()
    try { localStorage.setItem(KEY, token.value) } catch {}
  }
  return { token, save }
}

export function useApi() {
  const { token } = useAdminToken()
  return <T>(url: string, opts: Parameters<typeof $fetch>[1] = {}) =>
    $fetch<T>(url, { ...opts, headers: { ...(opts.headers as any), 'x-admin-token': token.value } } as any)
}

export function errMsg(e: any) {
  return e?.data?.statusMessage || e?.statusMessage || e?.message || 'Something went wrong'
}

export interface LinkMeta {
  slug: string
  targetUrl: string
  siteName: string
  title: string
  description: string
  image: string
  imageStyle: 'large' | 'small'
  version: number
  postSlug?: string
  syncWithPost?: boolean
  extra?: PreviewExtra
  platforms?: PlatformOverrides
  createdAt: string
  updatedAt: string
}

export function shareUrl(link: Pick<LinkMeta, 'slug' | 'version'>, versioned = true) {
  const base = `${location.origin}/s/${link.slug}`
  return versioned && link.version > 1 ? `${base}?v=${link.version}` : base
}

export interface Post {
  slug: string
  siteName: string
  title: string
  excerpt: string
  body: string
  cover: string
  imageStyle: 'large' | 'small'
  author: string
  extra?: PreviewExtra
  platforms?: PlatformOverrides
  version?: number
  createdAt: string
  updatedAt: string
}

/** Same shapes as server/utils/platforms.ts */
export type Platform = 'telegram' | 'facebook' | 'whatsapp'
export interface PlatformOverride { siteName?: string; title?: string; description?: string; image?: string }
export type PlatformOverrides = Partial<Record<Platform, PlatformOverride>>

/** Same shape as server/utils/preview.ts */
export interface PreviewExtra {
  ogType?: string
  author?: string
  publishedTime?: string
  locale?: string
  imageAlt?: string
  imageWidth?: number
  imageHeight?: number
  videoUrl?: string
  videoType?: string
  videoWidth?: number
  videoHeight?: number
  videoDuration?: number
  audioUrl?: string
  audioType?: string
  tgChannel?: string
  themeColor?: string
}

export function postUrl(slug: string, version?: number) {
  return `${location.origin}/p/${slug}${version && version > 1 ? `?v=${version}` : ''}`
}

export interface SendOptions { size: 'auto' | 'large' | 'small'; position: 'below' | 'above'; disablePreview: boolean; silent: boolean; parseMode: 'plain' | 'html' }

/** Message options + text, remembered in this browser so they're the same next time */
export function useSendSettings() {
  const KEY = 'lps-send-settings'
  let saved: any = {}
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') } catch {}
  const options = ref<SendOptions>({ size: 'auto', position: 'below', disablePreview: false, silent: false, parseMode: 'plain', ...saved.options })
  const template = ref<string>(saved.template ?? '{link}')
  watch([options, template], () => {
    try { localStorage.setItem(KEY, JSON.stringify({ options: options.value, template: template.value })) } catch {}
  }, { deep: true })
  return { options, template }
}

/** What the message will say, for the mock (same rules as the server) */
export function renderMessage(template: string, t: { url: string; title: string; description: string }, html: boolean) {
  const esc = (s: string) => (html ? s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : s)
  return (template || '{link}').replaceAll('{link}', t.url).replaceAll('{title}', esc(t.title)).replaceAll('{description}', esc(t.description))
}

export function mockImageStyle(size: SendOptions['size'], own: 'large' | 'small') {
  return size === 'auto' ? own : size
}

/** Same rule as the server: an app's override wins, empty fields fall back to the main value */
export function mergeOverride(base: { siteName: string; title: string; description: string; image: string }, o?: PlatformOverride) {
  return { siteName: o?.siteName || base.siteName, title: o?.title || base.title, description: o?.description || base.description, image: o?.image || base.image }
}

export type PreviewApp = 'telegram' | 'facebook' | 'messenger' | 'whatsapp'
export const PREVIEW_APPS: { id: PreviewApp; label: string }[] = [
  { id: 'telegram', label: 'Telegram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'messenger', label: 'Messenger' },
  { id: 'whatsapp', label: 'WhatsApp' },
]
export const overrideKey = (app: PreviewApp): Platform => (app === 'messenger' ? 'facebook' : app)
