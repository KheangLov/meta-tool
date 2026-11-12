<script setup lang="ts">
/**
 * WhatsApp: no refresh tool exists. The preview is made when someone pastes the link,
 * so a new ?v= link always gets a fresh preview. Images must be small.
 */
const props = defineProps<{ primaryUrl: string; image: string; text: string; hasOverrideImage: boolean; lockedTo?: string }>()
const emit = defineEmits<{ useImage: [url: string]; imageBytes: [bytes: number] }>()
const shareUrl = computed(() => `https://wa.me/?text=${encodeURIComponent(props.text || props.primaryUrl)}`)
</script>

<template>
  <div>
    <h2>Update on WhatsApp</h2>
    <p class="muted small">
      WhatsApp has no refresh tool. The preview is made when someone pastes the link, and the phone and WhatsApp keep it.
      The reliable way to show a new preview is to share the newest <code>?v=</code> link, which every save creates.
    </p>

    <div class="step">
      <b>A. Share the newest link</b>
      <div class="copyrow">
        <code>{{ primaryUrl }}</code>
        <a class="btn sm" :href="shareUrl" target="_blank">Share on WhatsApp</a>
      </div>
    </div>

    <div class="step">
      <b>B. Image for WhatsApp</b>
      <p class="muted small">WhatsApp drops images over 600 KB, and some versions only show images under 300 KB. Images must be at least 300 px wide and no wider than 4:1.</p>
      <template v-if="image">
        <ImageCheck :url="image" :only="['whatsapp']" @info="emit('imageBytes', $event?.bytes || 0)" />
        <p v-if="lockedTo" class="muted small">This link copies its preview from <NuxtLink :to="`/posts/${lockedTo}`">the post</NuxtLink>. Make the WhatsApp-safe copy there.</p>
        <div v-else class="row" style="margin-top:8px">
          <OptimizeImageButton :url="image" preset="whatsapp" label="⚡ Make a WhatsApp-safe copy and use it for WhatsApp" @done="emit('useImage', $event)" />
        </div>
        <p class="muted small">The copy is used only for WhatsApp, under <i>Different text or image per app</i>. Other apps keep the full-size image.<span v-if="hasOverrideImage"> WhatsApp already has its own image.</span></p>
      </template>
      <p v-else class="muted small">No image set.</p>
    </div>

    <CrawlerCheck :url="primaryUrl" as="whatsapp" label="WhatsApp" />
  </div>
</template>
