<script setup lang="ts">
/**
 * Approximates a WhatsApp message with a link preview.
 * Large image on top for wide images; small thumbnail on the left otherwise; no image if the file is over 600 KB.
 */
const props = withDefaults(defineProps<{
  url: string; title?: string; description?: string; image?: string; text?: string; theme?: 'light' | 'dark'; imageBytes?: number
}>(), { title: '', description: '', image: '', text: '', theme: 'light', imageBytes: 0 })

const { size, failed, onLoad, onError } = useMockImage(() => props.image)
const dropped = computed(() => props.imageBytes > 600 * 1024 || (!!size.value && (size.value.w < 300 || size.value.w / size.value.h > 4)))
const showImg = computed(() => !!props.image && !failed.value && !dropped.value)
const large = computed(() => !!size.value && size.value.w >= 300 && size.value.w / size.value.h >= 1.3)
const domain = computed(() => domainOf(props.url))
const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/** WhatsApp formatting: *bold* _italic_ ~strike~ ```mono``` and blue links */
const html = computed(() => {
  const raw = props.text || props.url
  return raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```([^`]+)```/g, '<code>$1</code>')
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, '$1<b>$2</b>')
    .replace(/(^|\s)_([^_\n]+)_(?=\s|$)/g, '$1<i>$2</i>')
    .replace(/(^|\s)~([^~\n]+)~(?=\s|$)/g, '$1<s>$2</s>')
    .replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`)
    .replace(/\n/g, '<br>')
})
</script>

<template>
  <div class="wa" :class="`wa-${theme}`">
    <div class="wa-bubble">
      <div class="wa-card" :class="{ large: showImg && large }">
        <img v-if="showImg && large" :src="image" class="wa-big" alt="" referrerpolicy="no-referrer" @load="onLoad" @error="onError" />
        <div class="wa-row">
          <img v-if="showImg && !large" :src="image" class="wa-thumb" alt="" referrerpolicy="no-referrer" @load="onLoad" @error="onError" />
          <div class="wa-meta">
            <div class="wa-title">{{ title || domain }}</div>
            <div v-if="description" class="wa-desc">{{ description }}</div>
            <div class="wa-domain">{{ domain }}</div>
          </div>
        </div>
        <!-- load once to learn the size before choosing the layout -->
        <img v-if="image && !size && !failed" :src="image" class="wa-probe" alt="" @load="onLoad" @error="onError" />
      </div>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="wa-text" v-html="html" />
      <div class="wa-time">{{ time }} <span class="wa-ticks">✓✓</span></div>
      <div v-if="image && dropped" class="wa-warn">Image not shown: WhatsApp drops images over 600 KB, narrower than 300 px, or wider than 4:1</div>
    </div>
  </div>
</template>

<style scoped>
.wa { --bg: #efeae2; --bubble: #d9fdd3; --card: #d1f4cc; --text: #111b21; --muted: #667781; --link: #027eb5; padding: 16px; border-radius: 14px; background: var(--bg); font-family: 'Segoe UI', Helvetica, Arial, 'Noto Sans Khmer', sans-serif; display: flex; justify-content: flex-end; }
.wa-dark { --bg: #0b141a; --bubble: #005c4b; --card: #025144; --text: #e9edef; --muted: #8696a0; --link: #53bdeb; }
.wa-bubble { position: relative; max-width: 360px; background: var(--bubble); color: var(--text); border-radius: 8px 0 8px 8px; padding: 4px 4px 18px; box-shadow: 0 1px .5px rgba(0,0,0,.13); font-size: 14.2px; }
.wa-card { background: var(--card); border-radius: 6px; overflow: hidden; }
.wa-big { display: block; width: 100%; max-height: 240px; object-fit: cover; }
.wa-row { display: flex; gap: 8px; padding: 8px; }
.wa-thumb { width: 72px; height: 72px; object-fit: cover; border-radius: 4px; flex: none; }
.wa-probe { display: none; }
.wa-title { font-weight: 600; font-size: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.wa-desc { font-size: 13px; color: var(--muted); margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.wa-domain { font-size: 12px; color: var(--muted); margin-top: 3px; }
.wa-text { padding: 6px 6px 0; white-space: normal; word-break: break-word; }
.wa-text :deep(a) { color: var(--link); text-decoration: none; }
.wa-text :deep(code) { font-family: ui-monospace, monospace; }
.wa-time { position: absolute; right: 8px; bottom: 3px; font-size: 11px; color: var(--muted); }
.wa-ticks { color: #53bdeb; }
.wa-warn { font-size: 11px; color: #e5484d; padding: 4px 6px 0; }
</style>
