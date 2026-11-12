<script setup lang="ts">
/** Makes a smaller copy of any image URL (fetched through our server), uploads it, and emits the new URL. */
const props = defineProps<{ url: string; preset?: keyof typeof IMAGE_PRESETS; label?: string }>()
const emit = defineEmits<{ done: [url: string] }>()
const api = useApi()
const busy = ref(false)
const msg = ref('')

async function run() {
  busy.value = true
  msg.value = ''
  try {
    const p = IMAGE_PRESETS[props.preset || 'whatsapp']
    const src = await api<Blob>('/api/image-proxy', { query: { url: props.url }, responseType: 'blob' } as any)
    const small = await compressImage(src, { maxSide: p.maxSide, maxBytes: p.maxBytes, force: true })
    const res = await uploadBlob(api, small, 'optimized')
    msg.value = `${Math.round(src.size / 1024)} KB → ${Math.round(res.bytes / 1024)} KB`
    emit('done', res.url)
  } catch (e) { msg.value = errMsg(e) }
  finally { busy.value = false }
}
</script>

<template>
  <span class="opt">
    <button type="button" class="btn sm ghost" :disabled="busy || !url" @click="run">{{ busy ? 'Optimizing…' : label || `⚡ ${IMAGE_PRESETS[preset || 'whatsapp'].label}` }}</button>
    <span v-if="msg" class="small muted">{{ msg }}</span>
  </span>
</template>

<style scoped>
.opt { display: inline-flex; gap: 8px; align-items: center; flex-wrap: wrap; }
</style>
