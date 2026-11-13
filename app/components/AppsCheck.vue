<script setup lang="ts">
/** Fetches a link as Telegram, Facebook/Messenger, WhatsApp and an in-app fetcher, and lists what's wrong. */
interface Issue { level: 'error' | 'warn'; text: string; fix?: string }
interface Result { id: string; label: string; level: 'ok' | 'warn' | 'error'; status: number; ms: number; title: string; image: string; issues: Issue[] }

const props = defineProps<{ url?: string; editable?: boolean }>()
const api = useApi()
const target = ref(props.url || '')
watch(() => props.url, (u) => { if (u) target.value = u })
const busy = ref(false)
const error = ref('')
const res = ref<{ results: Result[]; tools: { facebook: string } } | null>(null)

async function run() {
  busy.value = true
  error.value = ''
  try { res.value = await api('/api/diagnose', { query: { url: target.value } }) }
  catch (e) { error.value = errMsg(e) }
  finally { busy.value = false }
}
const icon = { ok: '✅', warn: '⚠️', error: '❌' }
</script>

<template>
  <div class="apps">
    <div class="row between wrap">
      <b>Check all apps</b>
      <button class="btn sm primary" :disabled="busy || !target" @click="run">{{ busy ? 'Checking…' : 'Check all apps' }}</button>
    </div>
    <p class="muted small">Fetches the link exactly like Telegram, Facebook/Messenger and WhatsApp do, then checks each app's rules.</p>
    <input v-if="editable" v-model="target" class="input" type="url" placeholder="https://…/s/your-link" />
    <p v-if="error" class="error small">{{ error }}</p>
    <div v-for="r in res?.results || []" :key="r.id" class="app" :class="r.level">
      <div class="row between">
        <b>{{ icon[r.level] }} {{ r.label }}</b>
        <span class="small muted">HTTP {{ r.status || '—' }} · {{ r.ms }} ms</span>
      </div>
      <div v-if="r.title" class="small seen">
        <img v-if="r.image" :src="r.image" alt="" />
        <span>{{ r.title }}</span>
      </div>
      <ul v-if="r.issues.length" class="small">
        <li v-for="(i, n) in r.issues" :key="n" :class="i.level">
          {{ i.text }}<div v-if="i.fix" class="fix">👉 {{ i.fix }}</div>
        </li>
      </ul>
    </div>
    <p v-if="res" class="small">
      Facebook's own check: <a :href="res.tools.facebook" target="_blank">Sharing Debugger ↗</a>.
      If it says the link "goes against our Community Standards", Facebook is blocking the domain itself, not your tags. Free shared domains like <code>*.vercel.app</code> can get flagged; a custom domain (Vercel → Domains) avoids that.
    </p>
  </div>
</template>

<style scoped>
.apps { display: grid; gap: 8px; }
.wrap { flex-wrap: wrap; gap: 8px; }
.app { border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; display: grid; gap: 6px; }
.app.ok { border-color: #bfe3cc; }
.app.warn { border-color: #f5c98b; }
.app.error { border-color: #f1b0b0; background: #fff7f7; }
.seen { display: flex; gap: 8px; align-items: center; color: var(--muted); }
.seen img { width: 64px; height: 34px; object-fit: cover; border-radius: 4px; }
ul { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
li.error { color: #8a1f1f; }
li.warn { color: var(--warn); }
.fix { margin-top: 3px; background: #fff4e5; color: #7a4b00; padding: 4px 8px; border-radius: 6px; }
</style>
