<script setup lang="ts">
/** Approximates a link shared in a LinkedIn post. LinkedIn shows the image, title and site address (no description). */
const props = withDefaults(defineProps<{
  url: string; title?: string; image?: string; text?: string; theme?: 'light' | 'dark'
}>(), { title: '', image: '', text: '', theme: 'light' })
const { size, failed, onLoad, onError } = useMockImage(() => props.image)
// LinkedIn Help: images narrower than 401 px show as a thumbnail
const small = computed(() => !!size.value && size.value.w < 401)
const showImg = computed(() => !!props.image && !failed.value)
const domain = computed(() => domainOf(props.url))
</script>

<template>
  <div class="li" :class="`li-${theme}`">
    <div class="li-head">
      <div class="li-avatar">Y</div>
      <div><div class="li-name">Your Name</div><div class="li-sub">Now · 🌐</div></div>
    </div>
    <div v-if="text" class="li-text">{{ text }}</div>
    <div class="li-card" :class="{ small: small || !showImg }">
      <img v-if="showImg" :src="image" class="li-img" alt="" referrerpolicy="no-referrer" @load="onLoad" @error="onError" />
      <div class="li-meta">
        <div class="li-title">{{ title || url }}</div>
        <div class="li-domain">{{ domain }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.li { --bg: #fff; --card: #eef3f8; --text: rgba(0,0,0,.9); --muted: rgba(0,0,0,.6); background: var(--bg); color: var(--text); border-radius: 10px; border: 1px solid #dfdeda; overflow: hidden; font-family: -apple-system, 'Segoe UI', Roboto, 'Noto Sans Khmer', sans-serif; }
.li-dark { --bg: #1b1f23; --card: #38434f; --text: rgba(255,255,255,.9); --muted: rgba(255,255,255,.6); border-color: #2c3136; }
.li-head { display: flex; gap: 8px; padding: 12px 14px 6px; align-items: center; }
.li-avatar { width: 40px; height: 40px; border-radius: 50%; background: #0a66c2; color: #fff; display: grid; place-items: center; font-weight: 700; }
.li-name { font-weight: 600; font-size: 14px; }
.li-sub { font-size: 12px; color: var(--muted); }
.li-text { padding: 2px 14px 10px; font-size: 14px; white-space: pre-line; word-break: break-word; }
.li-card { background: var(--card); }
.li-img { display: block; width: 100%; aspect-ratio: 1.91 / 1; object-fit: cover; }
.li-card.small { display: flex; align-items: center; margin: 0 14px 12px; border-radius: 8px; overflow: hidden; }
.li-card.small .li-img { width: 96px; height: 60px; aspect-ratio: auto; flex: none; }
.li-meta { padding: 8px 14px 10px; min-width: 0; }
.li-title { font-weight: 600; font-size: 14px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.li-domain { font-size: 12px; color: var(--muted); margin-top: 2px; }
</style>
