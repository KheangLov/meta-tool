<script setup lang="ts">
/**
 * Approximates a link pasted in Discord. Limits from Discord's link-preview docs:
 * title trimmed at 70 bytes, description at 350 bytes, accent colour from theme-color.
 */
const props = withDefaults(defineProps<{
  url: string; siteName?: string; title?: string; description?: string; image?: string
  imageStyle?: 'large' | 'small'; themeColor?: string; theme?: 'light' | 'dark'
}>(), { siteName: '', title: '', description: '', image: '', imageStyle: 'large', themeColor: '', theme: 'dark' })
const { failed, onLoad, onError } = useMockImage(() => props.image)
const showImg = computed(() => !!props.image && !failed.value)
function trimBytes(s: string, max: number) {
  const enc = new TextEncoder()
  if (enc.encode(s).length <= max) return s
  let out = ''
  for (const ch of s) { if (enc.encode(out + ch).length > max - 3) break; out += ch }
  return out.trimEnd() + '…'
}
const shownTitle = computed(() => trimBytes(props.title || props.url, 70))
const shownDesc = computed(() => trimBytes(props.description, 350))
const accent = computed(() => (/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(props.themeColor) ? props.themeColor : ''))
</script>

<template>
  <div class="dc" :class="`dc-${theme}`">
    <div class="dc-avatar">Y</div>
    <div class="dc-body">
      <div class="dc-name">You <span>Today at {{ new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }}</span></div>
      <div class="dc-link">{{ url }}</div>
      <div class="dc-embed" :class="{ thumb: imageStyle === 'small' && showImg }" :style="accent ? { borderLeftColor: accent } : undefined">
        <div class="dc-main">
          <div v-if="siteName" class="dc-site">{{ siteName }}</div>
          <div class="dc-title">{{ shownTitle }}</div>
          <div v-if="shownDesc" class="dc-desc">{{ shownDesc }}</div>
        </div>
        <img v-if="showImg" :src="image" class="dc-img" alt="" referrerpolicy="no-referrer" @load="onLoad" @error="onError" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.dc { --bg: #313338; --embed: #2b2d31; --text: #dbdee1; --muted: #949ba4; --link: #00a8fc; --bar: #1e1f22; display: flex; gap: 12px; padding: 14px; border-radius: 10px; background: var(--bg); color: var(--text); font-family: 'gg sans', 'Noto Sans', 'Noto Sans Khmer', Helvetica, Arial, sans-serif; }
.dc-light { --bg: #fff; --embed: #f2f3f5; --text: #313338; --muted: #5c5e66; --link: #006ce7; --bar: #e3e5e8; border: 1px solid #e3e5e8; }
.dc-avatar { width: 40px; height: 40px; border-radius: 50%; background: #5865f2; color: #fff; display: grid; place-items: center; font-weight: 700; flex: none; }
.dc-body { min-width: 0; flex: 1; }
.dc-name { font-weight: 600; font-size: 15px; }
.dc-name span { font-weight: 400; font-size: 12px; color: var(--muted); margin-left: 6px; }
.dc-link { color: var(--link); font-size: 15px; word-break: break-all; margin: 2px 0 6px; }
.dc-embed { background: var(--embed); border-left: 4px solid var(--bar); border-radius: 4px; padding: 10px 14px 14px 12px; max-width: 432px; display: grid; gap: 12px; }
.dc-embed.thumb { grid-template-columns: 1fr 80px; align-items: start; }
.dc-main { min-width: 0; display: grid; gap: 4px; }
.dc-site { font-size: 12px; color: var(--muted); }
.dc-title { color: var(--link); font-weight: 600; font-size: 15px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.dc-desc { font-size: 14px; line-height: 1.35; white-space: pre-line; word-break: break-word; }
.dc-img { display: block; width: 100%; border-radius: 4px; max-height: 300px; object-fit: cover; }
.dc-embed.thumb .dc-img { width: 80px; height: 80px; }
</style>
