<script setup lang="ts">
/**
 * Approximates how Telegram renders a message with a link preview.
 * Telegram makes the final layout decisions (e.g. it may show a large image as a thumbnail),
 * so treat this as a close mock and use "Telegram's saved preview" for the real thing.
 */
const props = withDefaults(
  defineProps<{
    url: string
    siteName?: string
    title?: string
    description?: string
    image?: string
    imageStyle?: 'large' | 'small'
    theme?: 'light' | 'dark'
    /** Message text (already rendered). Empty = just the URL */
    text?: string
    /** Text uses Telegram HTML formatting */
    html?: boolean
    /** Preview above or below the text */
    position?: 'below' | 'above'
    noPreview?: boolean
    video?: boolean
    duration?: number
    audio?: boolean
    compact?: boolean
  }>(),
  {
    siteName: '', title: '', description: '', image: '', imageStyle: 'large', theme: 'light', text: '',
    html: false, position: 'below', noPreview: false, video: false, duration: 0, audio: false, compact: false,
  },
)

const emit = defineEmits<{ imageInfo: [info: { width: number; height: number; error: boolean } | null] }>()

const imgError = ref(false)
const imgSize = ref<{ w: number; h: number } | null>(null)

watch(() => props.image, () => {
  imgError.value = false
  imgSize.value = null
  if (!props.image) emit('imageInfo', null)
}, { immediate: true })

function onLoad(e: Event) {
  const el = e.target as HTMLImageElement
  imgSize.value = { w: el.naturalWidth, h: el.naturalHeight }
  emit('imageInfo', { width: el.naturalWidth, height: el.naturalHeight, error: false })
}
function onError() {
  imgError.value = true
  emit('imageInfo', { width: 0, height: 0, error: true })
}

// Telegram falls back to a thumbnail for small / tall images unless the sender forces "larger media"
const layout = computed(() => {
  if (!props.image || imgError.value) return 'none'
  if (props.imageStyle === 'small') return 'small'
  if (imgSize.value && (imgSize.value.w < 300 || imgSize.value.w / imgSize.value.h < 1)) return 'small'
  return 'large'
})

const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const hasCard = computed(() => !props.noPreview && !!(props.siteName || props.title || props.description || props.image))
const dur = computed(() => {
  const d = props.duration || 0
  return d ? `${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}` : ''
})

/** Safe HTML for the message: escapes everything, keeps Telegram's formatting tags, makes bare URLs blue */
const ALLOWED = /&lt;(\/?)(b|strong|i|em|u|ins|s|strike|del|code|pre|blockquote|tg-spoiler)&gt;|&lt;a href=&quot;(https?:\/\/[^&]*?)&quot;&gt;|&lt;\/a&gt;/g
const messageHtml = computed(() => {
  const raw = props.text || props.url
  let s = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const keep: string[] = []
  if (props.html) {
    s = s.replace(ALLOWED, (m, close, tag, href) => {
      let out: string
      if (href) out = `<a class="tg-link" href="${href}" target="_blank" rel="noopener">`
      else if (m === '&lt;/a&gt;') out = '</a>'
      else if (tag === 'tg-spoiler') out = close ? '</span>' : '<span class="tg-spoiler">'
      else out = `<${close}${tag}>`
      keep.push(out)
      return `\u0000${keep.length - 1}\u0000`
    })
  }
  s = s.replace(/https?:\/\/[^\s\u0000<]+/g, (u) => `<a class="tg-link" href="${u}" target="_blank" rel="noopener">${u}</a>`)
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[Number(i)]!).replace(/\n/g, '<br>')
})
</script>

<template>
  <div class="tg" :class="[`tg-${theme}`, { 'tg-compact': compact }]">
    <div class="tg-bubble" :class="{ 'tg-above': position === 'above' && hasCard }">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="tg-text" v-html="messageHtml" />

      <div v-if="hasCard" class="tg-card">
        <img
          v-if="layout === 'small'"
          :src="image" class="tg-thumb" alt="" referrerpolicy="no-referrer"
          @load="onLoad" @error="onError"
        />
        <div v-if="siteName" class="tg-site">{{ siteName }}</div>
        <div v-if="title" class="tg-title">{{ title }}</div>
        <div v-if="description" class="tg-desc">{{ description }}</div>
        <div v-if="audio" class="tg-audio">▶︎ <span class="tg-wave" /> audio</div>
        <div v-if="layout === 'large'" class="tg-media">
          <img :src="image" class="tg-image" alt="" referrerpolicy="no-referrer" @load="onLoad" @error="onError" />
          <span v-if="video" class="tg-play">▶</span>
          <span v-if="video && dur" class="tg-dur">{{ dur }}</span>
        </div>
        <div v-if="image && imgError" class="tg-imgerr">Image failed to load, so Telegram will show no image</div>
      </div>

      <div class="tg-meta">{{ time }}</div>
    </div>
  </div>
</template>

<style scoped>
.tg {
  --bubble: #ffffff;
  --text: #000;
  --accent: #3390ec;
  --muted: #8e9ba7;
  padding: 18px 14px;
  border-radius: 14px;
  background:
    radial-gradient(circle at 20% 20%, rgba(255,255,255,.25) 0 2px, transparent 3px) 0 0/28px 28px,
    linear-gradient(160deg, #d3e3a6 0%, #a7c98f 50%, #8fb8a0 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans Khmer', sans-serif;
}
.tg-dark {
  --bubble: #182533;
  --text: #f5f5f5;
  --accent: #6ab2f2;
  --muted: #6d7f8f;
  background:
    radial-gradient(circle at 20% 20%, rgba(255,255,255,.04) 0 2px, transparent 3px) 0 0/28px 28px,
    linear-gradient(160deg, #0e1621 0%, #17212b 100%);
}
.tg-bubble {
  position: relative;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  background: var(--bubble);
  color: var(--text);
  border-radius: 14px 14px 14px 4px;
  padding: 7px 10px 20px;
  box-shadow: 0 1px 1px rgba(0,0,0,.12);
  font-size: 15px;
  line-height: 1.35;
}
.tg-above .tg-card { order: -1; margin: 0 0 6px; }
.tg-compact .tg-bubble { font-size: 13px; }
.tg-text { word-break: break-word; }
.tg-text :deep(.tg-link) { color: var(--accent); text-decoration: none; }
.tg-text :deep(code) { font-family: ui-monospace, monospace; font-size: .92em; background: color-mix(in srgb, var(--accent) 12%, transparent); padding: 0 3px; border-radius: 3px; }
.tg-text :deep(blockquote) { margin: 4px 0; padding: 2px 8px; border-left: 3px solid var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); border-radius: 4px; }
.tg-text :deep(.tg-spoiler) { background: var(--muted); color: transparent; border-radius: 3px; filter: blur(.5px); }
.tg-card {
  margin-top: 6px;
  padding: 6px 8px 7px 10px;
  border-left: 3px solid var(--accent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  overflow: hidden;
}
.tg-site { color: var(--accent); font-weight: 600; font-size: .93em; }
.tg-title { font-weight: 600; font-size: .93em; margin-top: 1px; }
.tg-desc { font-size: .93em; margin-top: 1px; white-space: pre-line; display: -webkit-box; -webkit-line-clamp: 8; -webkit-box-orient: vertical; overflow: hidden; }
.tg-media { position: relative; margin-top: 7px; }
.tg-image { display: block; width: 100%; max-height: 340px; object-fit: cover; border-radius: 6px; }
.tg-play { position: absolute; inset: 0; margin: auto; width: 46px; height: 46px; border-radius: 50%; background: rgba(0,0,0,.5); color: #fff; display: grid; place-items: center; font-size: 18px; padding-left: 3px; }
.tg-dur { position: absolute; left: 6px; top: 6px; background: rgba(0,0,0,.5); color: #fff; font-size: 11px; padding: 1px 6px; border-radius: 8px; }
.tg-audio { margin-top: 6px; display: flex; gap: 8px; align-items: center; color: var(--accent); font-size: .9em; }
.tg-wave { flex: 1; height: 14px; background: repeating-linear-gradient(90deg, var(--accent) 0 2px, transparent 2px 5px); opacity: .5; border-radius: 2px; }
.tg-thumb { float: right; width: 58px; height: 58px; object-fit: cover; border-radius: 6px; margin: 2px 0 4px 10px; }
.tg-imgerr { margin-top: 6px; font-size: 12px; color: #e5484d; }
.tg-meta { position: absolute; right: 10px; bottom: 4px; font-size: 11px; color: var(--muted); }
</style>
