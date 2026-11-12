<script setup lang="ts">
// Small dropdown to drop one of the built-in test images into an image field
const emit = defineEmits<{ pick: [url: string] }>()
const images = ref<{ file: string; url: string; w: number; h: number; note: string }[]>([])
onMounted(async () => { try { images.value = await $fetch('/api/test-kit/images') } catch {} })
function onChange(e: Event) {
  const el = e.target as HTMLSelectElement
  if (el.value) emit('pick', el.value)
  el.value = ''
}
</script>

<template>
  <select class="input picker" @change="onChange">
    <option value="">Use a test image…</option>
    <option v-for="i in images" :key="i.file" :value="i.url">{{ i.w }}×{{ i.h }} · {{ i.note }}</option>
  </select>
</template>
