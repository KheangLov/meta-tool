<script setup lang="ts">
const { token, save } = useAdminToken()
const draft = ref(token.value)
const saved = ref(false)
const health = ref<any>(null)
onMounted(async () => { try { health.value = await $fetch('/api/health') } catch {} })
function apply() {
  save(draft.value)
  saved.value = true
  setTimeout(() => location.reload(), 400)
}
const { mode } = useColorMode()
const modes = [
  { title: 'System', value: 'system', icon: 'lps:system' },
  { title: 'Light', value: 'light', icon: 'sun' },
  { title: 'Dark', value: 'dark', icon: 'moon' },
]
const yes = (v: boolean) => (v ? 'Connected' : 'Not connected')
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Settings</h1>
      <p>Your admin password and the connections the tool uses. Saved on this device.</p>
    </div>
  </div>

  <div class="kitgrid">
    <section class="card">
      <h2>Appearance</h2>
      <p class="muted small">System follows your phone or computer.</p>
      <SqTabs :model-value="mode" variant="segmented" grow :items="modes" @update:model-value="(v: string | number) => (mode = v as typeof mode)" />
    </section>

    <section class="card">
      <h2>Admin token</h2>
      <p class="muted small">The password you set as <code>NUXT_ADMIN_TOKEN</code> in Vercel. It unlocks publishing and the app tools on this device.</p>
      <div class="row wrap end">
        <AppField v-model="draft" class="grow" input-type="password" label="Admin token" autocomplete="current-password" hide-details @enter="apply" />
        <SqBtn color="primary" variant="flat" :disabled="!draft" @click="apply">{{ saved ? 'Saved' : 'Save token' }}</SqBtn>
      </div>
    </section>

    <section class="card">
      <h2>Connections</h2>
      <table v-if="health" class="kit">
        <tr><td>Publishing</td><td :class="health.publish === 'none' ? 'error' : 'ok'">{{ health.publish === 'github' ? `GitHub · ${health.githubRepo}` : health.publish === 'local-files' ? 'Local files (dev)' : 'Not set up' }}</td></tr>
        <tr><td>Image uploads</td><td>{{ health.uploads === 'blob' ? 'Vercel Blob' : health.uploads === 'github' ? 'GitHub' : health.uploads }}</td></tr>
        <tr><td>Telegram account</td><td :class="health.telegram ? 'ok' : 'muted'">{{ yes(health.telegram) }}</td></tr>
        <tr><td>Telegram bot</td><td :class="health.telegramBot ? 'ok' : 'muted'">{{ yes(health.telegramBot) }}</td></tr>
        <tr><td>Facebook app</td><td :class="health.facebook ? 'ok' : 'muted'">{{ yes(health.facebook) }}</td></tr>
        <tr><td>Facebook Page</td><td :class="health.facebookPage ? 'ok' : 'muted'">{{ yes(health.facebookPage) }}</td></tr>
      </table>
      <p class="muted small">Each one is optional except publishing. The README explains how to connect them.</p>
    </section>

    <section id="github" class="card">
      <GitHubCheck />
    </section>
  </div>
</template>
