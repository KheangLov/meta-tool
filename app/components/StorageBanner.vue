<script setup lang="ts">
/** Warns when the deployment has no database, which makes posts and links vanish ("not found"). */
const health = ref<{ storage: string; storageHints: string[] } | null>(null)
onMounted(async () => { try { health.value = await $fetch('/api/health') } catch {} })
</script>

<template>
  <div v-if="health?.storage === 'memory'" class="sbanner">
    <b>⚠️ No database connected.</b>
    Posts and links you save are kept only in temporary memory. Vercel clears it often, so pages will show "not found".
    <details>
      <summary>How to fix (2 minutes)</summary>
      <ol>
        <li>In Vercel, open your project → <b>Storage</b> → <b>Create Database</b> → choose <b>Upstash for Redis</b> (free) → connect it to this project. Any Redis that gives a <code>REDIS_URL</code> also works.</li>
        <li>Open <b>Deployments</b> → ⋯ → <b>Redeploy</b>. New environment variables only apply after a redeploy.</li>
        <li>This banner disappears once the database is found. Then open <b>Test kit</b> and click <b>Create sample posts &amp; links</b> again.</li>
      </ol>
      <p v-if="health.storageHints.length" class="small">Database-like variables found but not usable: <code>{{ health.storageHints.join(', ') }}</code>. Make sure there's a <code>…_REST_URL</code> + <code>…_REST_TOKEN</code> pair, or a <code>REDIS_URL</code> starting with <code>redis://</code>.</p>
      <p class="small">The built-in sample pages (<code>/p/sample-…</code>, <code>/s/test-…</code>) always open, even without a database.</p>
    </details>
  </div>
</template>

<style scoped>
.sbanner { background: #fff4e5; border-bottom: 1px solid #f5c98b; color: #7a4b00; padding: 10px 20px; font-size: 14px; }
.sbanner details { margin-top: 4px; }
.sbanner summary { cursor: pointer; font-weight: 600; }
.sbanner ol { margin: 6px 0; padding-left: 20px; line-height: 1.7; }
</style>
