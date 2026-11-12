/** Shared image-loading state for the preview mocks */
export function useMockImage(src: () => string) {
  const size = ref<{ w: number; h: number } | null>(null)
  const failed = ref(false)
  watch(src, () => { size.value = null; failed.value = false }, { immediate: true })
  const onLoad = (e: Event) => {
    const el = e.target as HTMLImageElement
    size.value = { w: el.naturalWidth, h: el.naturalHeight }
  }
  const onError = () => { failed.value = true }
  return { size, failed, onLoad, onError }
}

export function domainOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

/** Plain message text for apps without HTML: renders the template and strips tags */
export function plainMessage(html: string) {
  return html.replace(/<a [^>]*>(.*?)<\/a>/g, '$1').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}
