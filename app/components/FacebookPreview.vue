<script setup lang="ts">
/** Approximates a Facebook feed link post. Images under 600×315 become a small square thumbnail. */
const props = withDefaults(defineProps<{
  url: string; title?: string; description?: string; image?: string; text?: string; theme?: 'light' | 'dark'; pageName?: string
}>(), { title: '', description: '', image: '', text: '', theme: 'light', pageName: 'Your Page' })

const { size, failed, onLoad, onError } = useMockImage(() => props.image)
const small = computed(() => !!size.value && (size.value.w < 600 || size.value.h < 315))
const showImg = computed(() => !!props.image && !failed.value && !(size.value && (size.value.w < 200 || size.value.h < 200)))
const domain = computed(() => domainOf(props.url).toUpperCase())
</script>

<template>
  <div class="fb" :class="`fb-${theme}`">
    <div class="fb-post">
      <div class="fb-head">
        <div class="fb-avatar">{{ pageName.slice(0, 1) }}</div>
        <div><div class="fb-name">{{ pageName }}</div><div class="fb-sub">Just now · 🌐</div></div>
      </div>
      <div v-if="text" class="fb-text">{{ text }}</div>
      <div class="fb-card" :class="{ small: small || !showImg }">
        <img v-if="showImg" :src="image" class="fb-img" alt="" referrerpolicy="no-referrer" @load="onLoad" @error="onError" />
        <div class="fb-meta">
          <div class="fb-domain">{{ domain }}</div>
          <div class="fb-title">{{ title || url }}</div>
          <div v-if="description" class="fb-desc">{{ description }}</div>
        </div>
      </div>
      <div class="fb-actions"><span>👍 Like</span><span>💬 Comment</span><span>↗ Share</span></div>
    </div>
  </div>
</template>

<style scoped>
.fb { --bg: #f0f2f5; --card: #fff; --text: #050505; --muted: #65676b; --meta: #f0f2f5; --line: #ced0d4; padding: 14px; border-radius: 14px; background: var(--bg); font-family: Helvetica, Arial, 'Noto Sans Khmer', sans-serif; }
.fb-dark { --bg: #18191a; --card: #242526; --text: #e4e6eb; --muted: #b0b3b8; --meta: #3a3b3c; --line: #3e4042; }
.fb-post { background: var(--card); color: var(--text); border-radius: 8px; max-width: 500px; box-shadow: 0 1px 2px rgba(0,0,0,.2); overflow: hidden; }
.fb-head { display: flex; gap: 8px; align-items: center; padding: 12px 16px 0; }
.fb-avatar { width: 40px; height: 40px; border-radius: 50%; background: #1877f2; color: #fff; display: grid; place-items: center; font-weight: 700; }
.fb-name { font-weight: 600; font-size: 15px; }
.fb-sub { font-size: 13px; color: var(--muted); }
.fb-text { padding: 10px 16px; font-size: 15px; white-space: pre-line; word-break: break-word; }
.fb-card { margin-top: 10px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.fb-img { display: block; width: 100%; aspect-ratio: 1.91 / 1; object-fit: cover; }
.fb-meta { background: var(--meta); padding: 10px 12px; }
.fb-card.small { display: flex; margin: 10px 12px 0; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.fb-card.small .fb-img { width: 120px; height: 120px; aspect-ratio: auto; flex: none; }
.fb-card.small .fb-meta { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.fb-domain { font-size: 12px; color: var(--muted); letter-spacing: .02em; }
.fb-title { font-size: 16px; font-weight: 600; line-height: 1.25; margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.fb-desc { font-size: 14px; color: var(--muted); margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.fb-actions { display: flex; justify-content: space-around; padding: 8px; font-size: 14px; color: var(--muted); font-weight: 600; }
</style>
