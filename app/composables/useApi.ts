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
  createdAt: string
  updatedAt: string
}

export function postUrl(slug: string) {
  return `${location.origin}/p/${slug}`
}
