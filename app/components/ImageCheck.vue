<script setup lang="ts">
/** Checks an image URL against Telegram, Facebook/Messenger and WhatsApp rules. */
interface Check { platform: 'telegram' | 'facebook' | 'whatsapp'; verdict: 'ok' | 'warn' | 'error'; notes: string[] }
interface Info { bytes: number; width: number; height: number; type: string; checks: Check[] }

const props = defineProps<{ url: string; only?: Check['platform'][] }>()
const emit = defineEmits<{ info: [info: Info | null] }>()
const api = useApi()
const info = ref<Info | null>(null)
const error = ref('')
const loading = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0

watch(() => props.url, (url) => {
  clearTimeout(timer)
  info.value = null
  error.value = ''
  emit('info', null)
  if (!url || !/^https?:\/\//.test(url)) return
  timer = setTimeout(async () => {
    const mine = ++seq
    loading.value = true
    try {
      const r = await api<Info>('/api/image-info', { query: { url } })
      if (mine === seq) { info.value = r; emit('info', r) }
    } catch (e) { if (mine === seq) error.value = errMsg(e) }
    finally { if (mine === seq) loading.value = false }
  }, 500)
}, { immediate: true })

const label: Record<Check['platform'], string> = { telegram: 'Telegram', facebook: 'Facebook & Messenger', whatsapp: 'WhatsApp' }
const icon = { ok: '✅', warn: '⚠️', error: '❌' }
const shown = computed(() => (info.value?.checks || []).filter((c) => !props.only || props.only.includes(c.platform)))
</script>

<template>
  <div v-if="url" class="imgcheck small">
    <span v-if="loading" class="muted">Checking image…</span>
    <span v-else-if="error" class="error">Image check failed: {{ error }}</span>
    <template v-else-if="info">
      <span class="muted">{{ info.width }}×{{ info.height }} · {{ Math.round(info.bytes / 1024) }} KB · {{ info.type.replace('image/', '') }}</span>
      <span v-for="c in shown" :key="c.platform" class="ic" :class="c.verdict" :title="c.notes.join(' · ')">
        {{ icon[c.verdict] }} {{ label[c.platform] }}<span v-if="c.verdict !== 'ok'">: {{ c.notes[0] }}</span>
      </span>
    </template>
  </div>
</template>

<style scoped>
.imgcheck { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 6px; font-weight: 400; }
.ic { white-space: nowrap; }
.ic.warn { color: var(--warn); white-space: normal; }
.ic.error { color: var(--danger); white-space: normal; }
</style>
