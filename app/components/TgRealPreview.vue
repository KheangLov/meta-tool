<script setup lang="ts">
// Shows the preview exactly as Telegram's servers returned it (data from the logged-in account)
defineProps<{
  preview: { state: string; siteName?: string; title?: string; description?: string; hasLargeMedia?: boolean; image?: string }
  url: string
  theme: 'light' | 'dark'
}>()
</script>

<template>
  <TelegramPreview
    v-if="preview.state === 'ready'"
    compact :theme="theme" :url="url"
    :site-name="preview.siteName" :title="preview.title" :description="preview.description"
    :image="preview.image" :image-style="preview.hasLargeMedia ? 'large' : 'small'"
  />
  <p v-else-if="preview.state === 'pending'" class="muted small">Telegram is still fetching this link. Try again in a few seconds.</p>
  <p v-else class="error small">Telegram has no preview for this link. It may not be able to reach your page or read its tags.</p>
</template>
