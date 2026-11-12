<script setup lang="ts">
/** Fetches a URL as a given app's crawler and shows what it reads. */
const props = defineProps<{ url: string; as: Platform; label: string }>()
const api = useApi()
const busy = ref(false)
const res = ref<any>(null)
const error = ref('')
const showTags = ref(false)
async function run() {
  busy.value = true
  error.value = ''
  try { res.value = await api('/api/inspect', { query: { url: props.url, as: props.as } }) }
  catch (e) { error.value = errMsg(e) }
  finally { busy.value = false }
}
</script>

<template>
  <div class="step">
    <div class="row between">
      <b>Check what {{ label }}'s crawler sees</b>
      <button class="btn sm" :disabled="busy" @click="run">{{ busy ? 'Checking…' : 'Check live' }}</button>
    </div>
    <p v-if="error" class="small error">{{ error }}</p>
    <template v-if="res">
      <p class="small" :class="res.ok ? 'ok' : 'error'">HTTP {{ res.status || '—' }} · {{ res.ms }} ms<span v-if="res.error"> · {{ res.error }}</span></p>
      <div class="crawl">
        <img v-if="res.resolved.image" :src="res.resolved.image" alt="" />
        <div>
          <div class="small muted">{{ res.resolved.siteName }}</div>
          <b>{{ res.resolved.title || '(no title)' }}</b>
          <div class="small">{{ res.resolved.description }}</div>
        </div>
      </div>
      <button class="linkbtn small" @click="showTags = !showTags">{{ showTags ? 'Hide' : 'Show' }} raw meta tags</button>
      <table v-if="showTags" class="tags"><tr v-for="(v, k) in res.tags" :key="k"><td>{{ k }}</td><td>{{ v }}</td></tr></table>
    </template>
  </div>
</template>

<style scoped>
.crawl { display: flex; gap: 10px; align-items: flex-start; background: #f7f9fb; border-radius: 8px; padding: 8px; }
.crawl img { width: 96px; height: 50px; object-fit: cover; border-radius: 4px; flex: none; }
</style>
