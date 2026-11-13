<script setup lang="ts">
/** One link or post in a list: thumbnail, title, address and publish state. */
const props = defineProps<{ to: string; image?: string; title?: string; sub?: string; path: string; status: { kind: string; text: string } }>()
const failed = ref(false)
watch(() => props.image, () => { failed.value = false })
</script>

<template>
  <NuxtLink :to="to" class="lrow">
    <div class="lrow-thumb" :style="image && !failed ? { backgroundImage: `url('${image.replace(/'/g, '%27')}')` } : undefined">
      <span v-if="!image || failed">No image</span>
      <img v-if="image" :src="image" alt="" hidden @error="failed = true" />
    </div>
    <div class="lrow-body">
      <div class="lrow-title">{{ title || 'Untitled' }}</div>
      <div v-if="sub" class="lrow-sub">{{ sub }}</div>
      <div class="lrow-meta">
        <code>{{ path }}</code>
        <span :class="`pub pub-${status.kind}`">{{ status.text }}</span>
      </div>
    </div>
  </NuxtLink>
</template>
