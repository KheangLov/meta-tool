<script setup lang="ts">
/** One quiet line when publishing isn't set up; details live in Settings. */
const health = ref<{ publish: string } | null>(null)
const route = useRoute()
onMounted(async () => { try { health.value = await $fetch('/api/health') } catch {} })
</script>

<template>
  <div v-if="health?.publish === 'none' && route.path !== '/settings'" class="sbanner">
    <span>Apps can't see your links until publishing is set up.</span>
    <NuxtLink to="/settings">Set up</NuxtLink>
  </div>
</template>

<style scoped>
.sbanner { display: flex; gap: 12px; align-items: center; justify-content: center; padding: 8px 16px; font-size: 13px; line-height: 1.35; background: var(--amber-soft); color: #6d4708; border-bottom: 1px solid #edd3a7; }
@media (max-width: 720px) { .sbanner { justify-content: space-between; padding: 7px 14px; } .sbanner a { white-space: nowrap; } }
.sbanner a { color: #6d4708; font-weight: 700; }
</style>
