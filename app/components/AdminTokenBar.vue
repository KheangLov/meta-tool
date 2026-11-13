<script setup lang="ts">
const { token, save } = useAdminToken()
const editing = ref(!token.value)
const draft = ref(token.value)
const health = ref<{ storage: string; adminTokenSet: boolean } | null>(null)
onMounted(async () => {
  try { health.value = await $fetch('/api/health') } catch {}
})
function apply() {
  save(draft.value)
  editing.value = false
  refreshNuxtData()
  location.reload()
}
</script>

<template>
  <div class="tokenbar">
    <span v-if="health?.storage === 'memory'" class="pill warn" title="Connect Upstash Redis in Vercel to keep data">Memory storage</span>
    <span v-else-if="health" class="pill">{{ { upstash: 'Upstash Redis', redis: 'Redis', blob: 'Vercel Blob', 'local-files': 'Local files' }[health.storage] || health.storage }}</span>
    <template v-if="editing">
      <input v-model="draft" type="password" placeholder="Admin token" class="input sm" @keyup.enter="apply" />
      <button class="btn sm" @click="apply">Save</button>
    </template>
    <button v-else class="btn ghost sm" @click="editing = true">🔑 Token</button>
  </div>
</template>
