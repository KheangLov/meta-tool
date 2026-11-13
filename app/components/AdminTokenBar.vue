<script setup lang="ts">
const { token, save } = useAdminToken()
const editing = ref(!token.value)
const draft = ref(token.value)
const health = ref<{ publish: string; githubRepo: string; githubBranch: string; adminTokenSet: boolean } | null>(null)
const pending = ref(0)
const studio = useStudio()
onMounted(async () => {
  try { health.value = await $fetch('/api/health') } catch {}
  if (health.value?.publish !== 'github' || !token.value) return
  // Quietly retry anything that failed to publish earlier (e.g. before the token was fixed)
  try {
    const p = await studio.pendingItems()
    if (p.posts.length + p.links.length) await studio.publishPending()
    const left = await studio.pendingItems()
    pending.value = left.posts.length + left.links.length
  } catch {}
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
    <NuxtLink v-if="health?.publish === 'none'" to="/test-kit#github" class="pill warn" title="Add NUXT_GITHUB_TOKEN and NUXT_GITHUB_REPO to publish">Not publishing</NuxtLink>
    <NuxtLink v-else-if="health?.publish === 'github'" to="/test-kit#github" class="pill" :class="{ warn: pending > 0 }" :title="`Publishing to ${health.githubRepo} (${health.githubBranch})`">{{ pending ? `${pending} unpublished` : 'GitHub' }}</NuxtLink>
    <span v-else-if="health" class="pill">Local files</span>
    <template v-if="editing">
      <input v-model="draft" type="password" placeholder="Admin token" class="input sm" @keyup.enter="apply" />
      <button class="btn sm" @click="apply">Save</button>
    </template>
    <button v-else class="btn ghost sm" @click="editing = true">🔑 Token</button>
  </div>
</template>
