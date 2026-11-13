<script setup lang="ts">
/** The mock for one app, from one set of props. Used by the live dock on phones. */
defineProps<{
  app: PreviewApp; theme: 'light' | 'dark'; url: string
  view: { siteName: string; title: string; description: string; image: string }
  imageStyle: 'large' | 'small'; text: string; plain: string
  extra?: PreviewExtra; author?: string; waBytes?: number
  send?: SendOptions
}>()
</script>

<template>
  <TelegramPreview
    v-if="app === 'telegram'" compact :theme="theme" :url="url"
    :site-name="view.siteName" :title="view.title" :description="view.description" :image="view.image"
    :image-style="send ? mockImageStyle(send.size, imageStyle) : imageStyle"
    :position="send?.position" :no-preview="send?.disablePreview"
    :video="!!extra?.videoUrl" :duration="extra?.videoDuration" :audio="!!extra?.audioUrl"
  />
  <FacebookPreview v-else-if="app === 'facebook'" :theme="theme" :url="url" :title="view.title" :description="view.description" :image="view.image" />
  <MessengerPreview v-else-if="app === 'messenger'" :theme="theme" :url="url" :title="view.title" :description="view.description" :image="view.image" />
  <WhatsAppPreview v-else-if="app === 'whatsapp'" :theme="theme" :url="url" :title="view.title" :description="view.description" :image="view.image" :text="url" :image-bytes="waBytes" />
  <LinkedInPreview v-else-if="app === 'linkedin'" :theme="theme" :url="url" :title="view.title" :image="view.image" />
  <DiscordPreview v-else-if="app === 'discord'" :theme="theme" :url="url" :site-name="view.siteName" :title="view.title" :description="view.description" :image="view.image" :image-style="imageStyle" :theme-color="extra?.themeColor" />
  <SlackPreview v-else-if="app === 'slack'" :theme="theme" :url="url" :site-name="view.siteName" :title="view.title" :description="view.description" :image="view.image" :image-style="imageStyle" :author="author" />
</template>
