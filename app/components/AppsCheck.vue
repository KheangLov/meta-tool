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
const res = ref<{ results: Result[]; tools: { facebook: string; linkedin: string; discord: string } } | null>(null)

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
      <SqBtn color="primary" variant="flat" size="small" :disabled="busy || !target" @click="run">{{ busy ? 'Checking…' : 'Check all apps' }}</SqBtn>
    </div>
    <p class="muted small">Fetches the link the way Telegram, Facebook, Messenger, WhatsApp, X, LinkedIn, Discord, Slack and iMessage do, then checks each app's rules.</p>
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
      The apps' own checkers: <a :href="res.tools.facebook" target="_blank" rel="noopener">Facebook Sharing Debugger</a>, <a :href="res.tools.linkedin" target="_blank" rel="noopener">LinkedIn Post Inspector</a>, <a :href="res.tools.discord" target="_blank" rel="noopener">Discord Embed Debugger</a>.
      If it says the link "goes against our Community Standards", Facebook is blocking the domain itself, not your tags. Free shared domains like <code>*.vercel.app</code> can get flagged; a custom domain (Vercel → Domains) avoids that.
    </p>
  </div>
</template>

<style scoped>
.apps { display: grid; gap: 8px; }
.wrap { flex-wrap: wrap; gap: 8px; }
.app { border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; display: grid; gap: 6px; }
.app.ok { border-color: color-mix(in srgb, var(--live) 40%, var(--rule)); }
.app.warn { border-color: color-mix(in srgb, var(--amber) 45%, var(--rule)); }
.app.error { border-color: color-mix(in srgb, var(--red) 45%, var(--rule)); background: var(--red-soft); }
.seen { display: flex; gap: 8px; align-items: center; color: var(--muted); }
.seen img { width: 64px; height: 34px; object-fit: cover; border-radius: 4px; }
ul { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
li.error { color: var(--red-ink); }
li.warn { color: var(--warn); }
.fix { margin-top: 3px; background: var(--amber-soft); color: var(--amber-ink); padding: 4px 8px; border-radius: 6px; }
</style>
