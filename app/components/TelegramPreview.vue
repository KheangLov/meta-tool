<script setup lang="ts">
/**
 * Approximates how Telegram renders a link preview inside a chat message.
 * Telegram decides the final layout itself (e.g. it may shrink the image to a
 * thumbnail if the image is small or not landscape), so treat this as a close mock.
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
    message?: string
    compact?: boolean
  }>(),
  { siteName: '', title: '', description: '', image: '', imageStyle: 'large', theme: 'light', message: '', compact: false },
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

// Telegram falls back to a thumbnail for small / tall images even when a large card is requested
const layout = computed(() => {
  if (!props.image || imgError.value) return 'none'
  if (props.imageStyle === 'small') return 'small'
  if (imgSize.value && (imgSize.value.w < 300 || imgSize.value.w / imgSize.value.h < 1)) return 'small'
  return 'large'
})

const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const hasCard = computed(() => props.siteName || props.title || props.description || props.image)
</script>

<template>
  <div class="tg" :class="[`tg-${theme}`, { 'tg-compact': compact }]">
    <div class="tg-bubble">
      <div class="tg-text">
        <template v-if="message">{{ message }}<br /></template>
        <a class="tg-link" :href="url" target="_blank" rel="noopener">{{ url }}</a>
      </div>

      <div v-if="hasCard" class="tg-card">
        <img
          v-if="layout === 'small'"
          :src="image" class="tg-thumb" alt="" referrerpolicy="no-referrer"
          @load="onLoad" @error="onError"
        />
        <div v-if="siteName" class="tg-site">{{ siteName }}</div>
        <div v-if="title" class="tg-title">{{ title }}</div>
        <div v-if="description" class="tg-desc">{{ description }}</div>
        <img
          v-if="layout === 'large'"
          :src="image" class="tg-image" alt="" referrerpolicy="no-referrer"
          @load="onLoad" @error="onError"
        />
        <div v-if="image && imgError" class="tg-imgerr">Image failed to load — Telegram will show no image</div>
      </div>

      <div class="tg-meta">{{ time }}</div>
    </div>
  </div>
</template>

<style scoped>
.tg {
  --bg: #c8dba9;
  --bubble: #ffffff;
  --text: #000;
  --accent: #3390ec;
  --muted: #8e9ba7;
  padding: 18px 14px;
  border-radius: 14px;
  background:
    radial-gradient(circle at 20% 20%, rgba(255,255,255,.25) 0 2px, transparent 3px) 0 0/28px 28px,
    linear-gradient(160deg, #d3e3a6 0%, #a7c98f 50%, #8fb8a0 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
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
  background: var(--bubble);
  color: var(--text);
  border-radius: 14px 14px 14px 4px;
  padding: 7px 10px 20px;
  box-shadow: 0 1px 1px rgba(0,0,0,.12);
  font-size: 15px;
  line-height: 1.35;
}
.tg-compact .tg-bubble { font-size: 13px; }
.tg-text { word-break: break-word; }
.tg-link { color: var(--accent); text-decoration: none; }
.tg-link:hover { text-decoration: underline; }
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
.tg-image { display: block; width: 100%; max-height: 340px; object-fit: cover; border-radius: 6px; margin-top: 7px; }
.tg-thumb { float: right; width: 58px; height: 58px; object-fit: cover; border-radius: 6px; margin: 2px 0 4px 10px; }
.tg-imgerr { margin-top: 6px; font-size: 12px; color: #e5484d; }
.tg-meta { position: absolute; right: 10px; bottom: 4px; font-size: 11px; color: var(--muted); }
</style>
