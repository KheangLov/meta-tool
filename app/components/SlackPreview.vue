<script setup lang="ts">
/** Approximates a link pasted in Slack: site name, title, description, an optional "Written by" field and the image. */
const props = withDefaults(defineProps<{
  url: string; siteName?: string; title?: string; description?: string; image?: string
  imageStyle?: 'large' | 'small'; author?: string; theme?: 'light' | 'dark'
}>(), { siteName: '', title: '', description: '', image: '', imageStyle: 'large', author: '', theme: 'light' })
const { failed, onLoad, onError } = useMockImage(() => props.image)
const showImg = computed(() => !!props.image && !failed.value)
const site = computed(() => props.siteName || domainOf(props.url))
const writer = computed(() => (props.author && !/^https?:\/\//.test(props.author) ? props.author : ''))
</script>

<template>
  <div class="sk" :class="`sk-${theme}`">
    <div class="sk-avatar">Y</div>
    <div class="sk-body">
      <div class="sk-name">You <span>{{ new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }}</span></div>
      <div class="sk-link">{{ url }}</div>
      <div class="sk-att" :class="{ thumb: imageStyle === 'small' && showImg }">
        <div class="sk-main">
          <div class="sk-site"><i />{{ site }}</div>
          <div class="sk-title">{{ title || url }}</div>
          <div v-if="description" class="sk-desc">{{ description }}</div>
          <div v-if="writer" class="sk-field"><b>Written by</b><span>{{ writer }}</span></div>
        </div>
        <img v-if="showImg" :src="image" class="sk-img" alt="" referrerpolicy="no-referrer" @load="onLoad" @error="onError" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.sk { --bg: #fff; --text: #1d1c1d; --muted: #616061; --link: #1264a3; --bar: #ddd; display: flex; gap: 8px; padding: 14px; border-radius: 10px; background: var(--bg); color: var(--text); border: 1px solid #e3e3e3; font-family: Lato, 'Noto Sans Khmer', Helvetica, Arial, sans-serif; }
.sk-dark { --bg: #1a1d21; --text: #d1d2d3; --muted: #ababad; --link: #1d9bd1; --bar: #3b3d42; border-color: #2a2d31; }
.sk-avatar { width: 36px; height: 36px; border-radius: 6px; background: #4a154b; color: #fff; display: grid; place-items: center; font-weight: 700; flex: none; }
.sk-body { min-width: 0; flex: 1; }
.sk-name { font-weight: 900; font-size: 15px; }
.sk-name span { font-weight: 400; font-size: 12px; color: var(--muted); margin-left: 6px; }
.sk-link { color: var(--link); font-size: 15px; word-break: break-all; margin: 2px 0 6px; }
.sk-att { border-left: 4px solid var(--bar); border-radius: 2px; padding-left: 12px; display: grid; gap: 8px; max-width: 480px; }
.sk-att.thumb { grid-template-columns: 1fr 72px; align-items: start; }
.sk-main { min-width: 0; display: grid; gap: 2px; font-size: 15px; line-height: 1.4; }
.sk-site { font-weight: 700; display: flex; align-items: center; gap: 6px; }
.sk-site i { width: 16px; height: 16px; border-radius: 3px; background: var(--bar); display: inline-block; }
.sk-title { color: var(--link); font-weight: 700; }
.sk-desc { display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; }
.sk-field { display: grid; margin-top: 4px; }
.sk-img { display: block; max-width: 360px; width: 100%; border-radius: 8px; }
.sk-att.thumb .sk-img { width: 72px; height: 72px; object-fit: cover; border-radius: 4px; }
</style>
