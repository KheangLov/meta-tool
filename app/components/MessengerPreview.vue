<script setup lang="ts">
/** Approximates a link shared in Messenger (uses the same data Facebook stored). */
const props = withDefaults(defineProps<{
  url: string; title?: string; description?: string; image?: string; text?: string; theme?: 'light' | 'dark'
}>(), { title: '', description: '', image: '', text: '', theme: 'light' })

const { size, failed, onLoad, onError } = useMockImage(() => props.image)
const small = computed(() => !!size.value && (size.value.w < 600 || size.value.h < 315))
const showImg = computed(() => !!props.image && !failed.value && !(size.value && (size.value.w < 200 || size.value.h < 200)))
const domain = computed(() => domainOf(props.url))
</script>

<template>
  <div class="ms" :class="`ms-${theme}`">
    <div class="ms-col">
      <div v-if="text" class="ms-bubble">{{ text }}</div>
      <div class="ms-card" :class="{ small: small || !showImg }">
        <img v-if="showImg" :src="image" class="ms-img" alt="" referrerpolicy="no-referrer" @load="onLoad" @error="onError" />
        <div class="ms-meta">
          <div class="ms-title">{{ title || url }}</div>
          <div v-if="description" class="ms-desc">{{ description }}</div>
          <div class="ms-domain">{{ domain }}</div>
        </div>
      </div>
      <div class="ms-status">Sent</div>
    </div>
  </div>
</template>

<style scoped>
.ms { --bg: #fff; --card: #f0f0f0; --text: #050505; --muted: #65676b; padding: 16px; border-radius: 14px; background: var(--bg); border: 1px solid #e4e6eb; font-family: Helvetica, Arial, 'Noto Sans Khmer', sans-serif; display: flex; justify-content: flex-end; }
.ms-dark { --bg: #000; --card: #303030; --text: #e4e6eb; --muted: #b0b3b8; border-color: #222; }
.ms-col { max-width: 300px; display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.ms-bubble { background: linear-gradient(180deg, #0a7cff, #a033ff); color: #fff; padding: 8px 12px; border-radius: 18px 18px 4px 18px; font-size: 15px; white-space: pre-line; word-break: break-word; }
.ms-card { background: var(--card); color: var(--text); border-radius: 18px; overflow: hidden; width: 100%; }
.ms-img { display: block; width: 100%; aspect-ratio: 1.91 / 1; object-fit: cover; }
.ms-card.small { display: flex; }
.ms-card.small .ms-img { width: 80px; height: 80px; aspect-ratio: auto; flex: none; }
.ms-meta { padding: 8px 12px 10px; }
.ms-title { font-weight: 600; font-size: 14px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ms-desc { font-size: 13px; color: var(--muted); margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ms-domain { font-size: 12px; color: var(--muted); margin-top: 3px; }
.ms-status { font-size: 11px; color: var(--muted); }
</style>
