<script setup lang="ts">
/** Did the app's crawler reach this link? Lists recent real visits the server saw. */
const props = defineProps<{ slug: string; kind: 'link' | 'post' }>()
interface Visit { at: string; path: string; app: string; status: number; ua: string }
const api = useApi()
const busy = ref(false)
const error = ref('')
const data = ref<{ since: string; visits: Visit[] } | null>(null)
async function load() {
  busy.value = true
  error.value = ''
  try { data.value = await api('/api/visits', { query: { slug: props.slug, kind: props.kind } }) }
  catch (e) { error.value = errMsg(e) }
  finally { busy.value = false }
}
const time = (s: string) => new Date(s).toLocaleTimeString()
</script>

<template>
  <div class="step">
    <div class="row between">
      <h3>Did the app reach your link?</h3>
      <SqBtn variant="tonal" size="small" :disabled="busy" @click="load">{{ busy ? 'Loading…' : data ? 'Refresh' : 'Show visits' }}</SqBtn>
    </div>
    <p class="muted small">Share the link in an app, then look here. Each app that fetched it shows up within seconds.</p>
    <p v-if="error" class="error small">{{ error }}</p>
    <template v-if="data">
      <div v-for="(v, i) in data.visits" :key="i" class="visit small">
        <b>{{ v.app }}</b>
        <span :class="v.status === 200 ? 'ok' : 'error'">{{ v.status === 200 ? 'got the preview' : `got ${v.status}` }}</span>
        <span class="muted grow">{{ v.path }}</span>
        <span class="muted">{{ time(v.at) }}</span>
      </div>
      <p v-if="!data.visits.length" class="small">No app has fetched this link since {{ time(data.since) }}.</p>
      <p class="muted small">
        The list is kept in memory and resets when the server restarts, so an old visit can be missing.
        If you just shared the link and the app isn't listed, its crawler never got through: see <i>Preview not showing?</i> on the Update apps tab.
      </p>
    </template>
  </div>
</template>

<style scoped>
.visit { display: flex; gap: 8px; align-items: baseline; padding: 6px 0; border-top: 1px solid var(--rule); flex-wrap: wrap; }
.visit .grow { overflow-wrap: anywhere; }
</style>
