<script setup lang="ts">
/** One place to put the newest link into each real app, so the preview can be checked there. */
const props = defineProps<{ url: string; text?: string; title?: string; fbAppId?: string; dirty?: boolean }>()
const targets = computed(() => shareTargets(props.url, props.text, props.fbAppId))
const copied = ref(false)
const note = ref('')
const canShare = ref(false)
onMounted(() => { canShare.value = typeof navigator.share === 'function' })

async function copy() {
  try { await navigator.clipboard.writeText(props.url); copied.value = true; setTimeout(() => (copied.value = false), 1500) } catch {}
}
async function systemShare() {
  try { await navigator.share({ url: props.url, title: props.title }) } catch {}
}
async function open(t: ShareTarget) {
  note.value = t.note || ''
  if (t.note) await copy()
}
</script>

<template>
  <div class="share">
    <div class="row between">
      <h3>Test in the real apps</h3>
      <span v-if="dirty" class="small warn">Publish first</span>
    </div>
    <p class="muted small">Sends the newest link. The app reads it fresh, so you see the preview you just published.</p>
    <div class="copyrow">
      <code>{{ url }}</code>
      <SqBtn variant="tonal" size="small" @click="copy">{{ copied ? 'Copied' : 'Copy link' }}</SqBtn>
    </div>
    <div class="apps">
      <SqBtn v-if="canShare" color="primary" variant="flat" size="small" @click="systemShare">Share…</SqBtn>
      <SqBtn v-for="t in targets" :key="t.id" variant="tonal" size="small" :href="t.href" target="_blank" rel="noopener" @click="open(t)">{{ t.label }}</SqBtn>
    </div>
    <p v-if="canShare" class="muted small">Share… opens your phone's share sheet, which reaches Messenger, Instagram and any other app.</p>
    <p v-if="note" class="small">{{ note }}</p>
  </div>
</template>

<style scoped>
.share { display: grid; gap: 8px; }
.share h3 { margin: 0; }
.apps { display: flex; flex-wrap: wrap; gap: 8px; }
.warn { color: var(--amber-ink); }
</style>
