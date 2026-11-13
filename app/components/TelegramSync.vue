<script setup lang="ts">
/**
 * Refreshes Telegram's preview for a list of URLs, one at a time, and shows whether
 * Telegram now displays the saved title/description/image for each one.
 */
interface TgPreview { state: string; siteName?: string; title?: string; description?: string; hasLargeMedia?: boolean; hasPhoto?: boolean; image?: string }
interface Row {
  url: string
  state: 'queued' | 'running' | 'match' | 'mismatch' | 'unknown' | 'error'
  diffs: string[]
  botReplies: string[]
  retried?: boolean
  preview?: TgPreview
  error?: string
  open?: boolean
}

defineProps<{ theme: 'light' | 'dark' }>()
const api = useApi()
const rows = ref<Row[]>([])
const running = ref(false)

const summary = computed(() => {
  if (!rows.value.length) return null
  if (running.value) {
    const done = rows.value.filter((r) => !['queued', 'running'].includes(r.state)).length
    return { kind: 'info', text: `Updating Telegram… ${done}/${rows.value.length}` }
  }
  const bad = rows.value.filter((r) => r.state === 'mismatch' || r.state === 'error').length
  return bad
    ? { kind: 'warn', text: `${bad} of ${rows.value.length} link(s) may still show an older preview in Telegram. See the details below.` }
    : { kind: 'ok', text: 'Telegram now shows the latest preview ✓' }
})

async function run(urls: string[], opts: { withContent?: boolean } = {}) {
  if (running.value) return
  running.value = true
  rows.value = [...new Set(urls)].map((url) => ({ url, state: 'queued', diffs: [], botReplies: [] }))
  for (const row of rows.value) {
    row.state = 'running'
    try {
      const res = await api<{ results: any[] }>('/api/telegram/refresh', {
        method: 'POST', body: { url: row.url, withContent: !!opts.withContent, verify: true },
      })
      const r = res.results[0]
      Object.assign(row, { state: r.status, diffs: r.diffs, botReplies: r.botReplies, retried: r.retried, preview: r.preview })
      row.open = r.status !== 'match'
    } catch (e) {
      row.state = 'error'
      row.error = errMsg(e)
      row.open = true
    }
  }
  running.value = false
  return rows.value
}

const icon: Record<Row['state'], string> = { queued: '·', running: '⏳', match: '✅', mismatch: '⚠️', unknown: '✔️', error: '❌' }
const label: Record<Row['state'], string> = {
  queued: 'Waiting', running: 'Refreshing…', match: 'Up to date', mismatch: 'Still old', unknown: 'Refreshed', error: 'Failed',
}

defineExpose({ run, running })
</script>

<template>
  <div v-if="rows.length" class="tgsync">
    <p v-if="summary" class="tgsum" :class="summary.kind">{{ summary.text }}</p>
    <div v-for="r in rows" :key="r.url" class="tgrow">
      <button class="tgrow-head" @click="r.open = !r.open">
        <span>{{ icon[r.state] }}</span>
        <code class="grow">{{ r.url.replace(/^https?:\/\//, '') }}</code>
        <span class="small" :class="{ ok: r.state === 'match', error: r.state === 'mismatch' || r.state === 'error' }">{{ label[r.state] }}</span>
      </button>
      <div v-if="r.open && !['queued', 'running'].includes(r.state)" class="tgrow-body">
        <p v-if="r.error" class="error small">{{ r.error }}</p>
        <ul v-if="r.diffs.length" class="small diffs">
          <li v-for="d in r.diffs" :key="d">Telegram's {{ d }}</li>
        </ul>
        <p v-if="r.retried" class="muted small">The first try didn't match, so "Update with content" was pressed automatically.</p>
        <p v-if="r.state === 'mismatch'" class="muted small">
          Telegram can take a minute to fetch the new image. Try "Refresh in Telegram" again, or share the newest <code>?v=</code> link, which always shows the latest preview.
        </p>
        <ul v-if="r.botReplies.length" class="botreplies small">
          <li v-for="(t, i) in r.botReplies" :key="i">🤖 {{ t }}</li>
        </ul>
        <TgRealPreview v-if="r.preview" :preview="r.preview" :url="r.url" :theme="theme" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.tgsync { margin-top: 10px; display: grid; gap: 6px; }
.tgsum { margin: 0 0 4px; padding: 8px 10px; border-radius: 8px; font-size: 14px; }
.tgsum.ok { background: var(--signal-soft); color: var(--ok); }
.tgsum.warn { background: var(--amber-soft); color: var(--warn); }
.tgsum.info { background: var(--signal-soft); color: var(--primary); }
.tgrow { border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.tgrow-head { display: flex; gap: 8px; align-items: center; width: 100%; padding: 7px 10px; background: var(--raised); color: var(--ink); border: 0; cursor: pointer; font: inherit; text-align: left; }
.tgrow-head code { font-size: 12px; word-break: break-all; }
.tgrow-body { padding: 8px 10px 10px; }
.diffs { margin: 0 0 6px; padding-left: 18px; color: var(--warn); }
</style>
