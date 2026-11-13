<script setup lang="ts">
const { token, save } = useAdminToken()
const editing = ref(!token.value)
const draft = ref(token.value)
const health = ref<{ publish: string; githubRepo: string; githubBranch: string; adminTokenSet: boolean } | null>(null)
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
    <span v-if="health?.publish === 'none'" class="pill warn" title="Add NUXT_GITHUB_TOKEN and NUXT_GITHUB_REPO to publish">Not publishing</span>
    <span v-else-if="health?.publish === 'github'" class="pill" :title="`Publishing to ${health.githubRepo} (${health.githubBranch})`">GitHub ✓</span>
    <span v-else-if="health" class="pill">Local files</span>
    <template v-if="editing">
      <input v-model="draft" type="password" placeholder="Admin token" class="input sm" @keyup.enter="apply" />
      <button class="btn sm" @click="apply">Save</button>
    </template>
    <button v-else class="btn ghost sm" @click="editing = true">🔑 Token</button>
  </div>
</template>
