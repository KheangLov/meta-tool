<script setup lang="ts">
/** Publishing status in the header. Tapping it opens Settings. Also retries unpublished items quietly. */
const { token } = useAdminToken()
const health = ref<{ publish: string; githubRepo: string; githubBranch: string } | null>(null)
const pending = ref(0)
const studio = useStudio()
onMounted(async () => {
  try { health.value = await $fetch('/api/health') } catch {}
  if (health.value?.publish !== 'github' || !token.value) return
  try {
    const p = await studio.pendingItems()
    if (p.posts.length + p.links.length) await studio.publishPending()
    const left = await studio.pendingItems()
    pending.value = left.posts.length + left.links.length
  } catch {}
})
const state = computed(() => {
  if (!token.value) return { kind: 'warn', text: 'Add admin token' }
  if (!health.value) return { kind: 'none', text: '' }
  if (health.value.publish === 'none') return { kind: 'warn', text: 'Not publishing' }
  if (pending.value) return { kind: 'warn', text: `${pending.value} unpublished` }
  return { kind: 'ok', text: health.value.publish === 'github' ? 'Publishing on' : 'Local files' }
})
</script>

<template>
  <div class="tokenbar">
    <NuxtLink v-if="state.text" to="/settings" class="pill" :class="{ warn: state.kind === 'warn' }" :title="health?.githubRepo ? `Publishing to ${health.githubRepo} (${health.githubBranch})` : ''">
      <span :class="`pub pub-${state.kind}`">{{ state.text }}</span>
    </NuxtLink>
  </div>
</template>
