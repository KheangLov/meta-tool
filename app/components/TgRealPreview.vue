<script setup lang="ts">
// Shows the preview exactly as Telegram's servers returned it (data from the logged-in account)
const props = defineProps<{
  preview: {
    state: string; siteName?: string; title?: string; description?: string; hasLargeMedia?: boolean; image?: string
    type?: string; author?: string; duration?: number; embedUrl?: string; embedType?: string; documentMime?: string
  }
  url: string
  theme: 'light' | 'dark'
}>()
const details = computed(() => {
  const p = props.preview
  return [
    ['Type', p.type],
    ['Author', p.author],
    ['Media size', p.image ? (p.hasLargeMedia ? 'large' : 'small') : ''],
    ['Duration', p.duration ? `${p.duration}s` : ''],
    ['Embedded player', p.embedUrl ? `${p.embedType || 'iframe'} · ${p.embedUrl}` : ''],
    ['Attached file', p.documentMime],
  ].filter(([, v]) => v)
})
</script>

<template>
  <template v-if="preview.state === 'ready'">
    <TelegramPreview
      compact :theme="theme" :url="url"
      :site-name="preview.siteName" :title="preview.title" :description="preview.description"
      :image="preview.image" :image-style="preview.hasLargeMedia ? 'large' : 'small'"
      :video="!!(preview.duration || preview.embedUrl || preview.documentMime?.startsWith('video'))" :duration="preview.duration"
    />
    <table v-if="details.length" class="tags">
      <tr v-for="[k, v] in details" :key="k"><td>{{ k }}</td><td>{{ v }}</td></tr>
    </table>
  </template>
  <p v-else-if="preview.state === 'pending'" class="muted small">Telegram is still fetching this link. Try again in a few seconds.</p>
  <p v-else class="error small">Telegram has no preview for this link. It may not be able to reach your page or read its tags.</p>
</template>
