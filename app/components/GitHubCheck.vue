<script setup lang="ts">
/** Tests the GitHub publishing setup step by step, then publishes anything still pending. */
interface Step { name: string; ok: boolean; detail: string; fix?: string }
const api = useApi()
const studio = useStudio()
const busy = ref(false)
const result = ref<{ ok: boolean; repo: string; branch: string; steps: Step[] } | null>(null)
const error = ref('')
const pending = ref(0)
const pubMsg = ref('')

async function countPending() {
  const p = await studio.pendingItems()
  pending.value = p.posts.length + p.links.length
}
onMounted(countPending)

async function run() {
  busy.value = true
  error.value = pubMsg.value = ''
  try {
    result.value = await api('/api/github/check', { method: 'POST' })
    if (result.value?.ok) await publishAll()
  } catch (e) { error.value = errMsg(e) }
  finally { busy.value = false }
}

async function publishAll() {
  await countPending()
  if (!pending.value) return
  pubMsg.value = `Publishing ${pending.value} item(s)…`
  const r = await studio.publishPending()
  pubMsg.value = r.failed ? `Published ${r.ok}, ${r.failed} failed: ${r.error}` : `Published ${r.ok} pending item(s). Your links work now.`
  await countPending()
}
</script>

<template>
  <div class="ghc">
    <div class="row between wrap">
      <b>GitHub publishing</b>
      <button class="btn sm primary" :disabled="busy" @click="run">{{ busy ? 'Checking…' : 'Check connection' }}</button>
    </div>
    <p v-if="pending && !result" class="small warn-text">{{ pending }} item(s) in this browser aren't published yet, so they show "not found". Check the connection to publish them.</p>
    <p v-if="error" class="error small">{{ error }}</p>
    <ol v-if="result" class="steps small">
      <li v-for="s in result.steps" :key="s.name" :class="s.ok ? 'ok' : 'bad'">
        {{ s.ok ? '✅' : '❌' }} <b>{{ s.name }}:</b> {{ s.detail }}
        <div v-if="s.fix" class="fix">👉 {{ s.fix }}</div>
      </li>
    </ol>
    <p v-if="result?.ok" class="ok small">Everything works. Publishing is ready.</p>
    <p v-if="pubMsg" class="small">{{ pubMsg }}</p>
    <button v-if="result?.ok && pending" class="btn sm" @click="publishAll">Publish {{ pending }} pending item(s)</button>
  </div>
</template>

<style scoped>
.ghc { display: grid; gap: 8px; }
.wrap { flex-wrap: wrap; gap: 8px; }
.steps { margin: 0; padding-left: 4px; list-style: none; display: grid; gap: 6px; }
.steps .bad { color: #8a1f1f; }
.fix { margin: 4px 0 0 22px; background: #fff4e5; color: #7a4b00; padding: 6px 8px; border-radius: 6px; }
.warn-text { color: var(--warn); }
</style>
