<script setup lang="ts">
const { token, save } = useAdminToken()
const draft = ref(token.value)
const shown = ref(false)
const saved = ref(false)
const health = ref<any>(null)
onMounted(async () => { try { health.value = await $fetch('/api/health') } catch {} })
function apply() {
  save(draft.value)
  saved.value = true
  setTimeout(() => location.reload(), 400)
}
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
      <h2>Admin token</h2>
      <p class="muted small">The password you set as <code>NUXT_ADMIN_TOKEN</code> in Vercel. It unlocks publishing and the app tools on this device.</p>
      <div class="row wrap">
        <input v-model="draft" :type="shown ? 'text' : 'password'" class="input grow" placeholder="Admin token" autocomplete="current-password" @keyup.enter="apply" />
        <button class="btn ghost" type="button" @click="shown = !shown">{{ shown ? 'Hide' : 'Show' }}</button>
        <button class="btn primary" :disabled="!draft" @click="apply">{{ saved ? 'Saved' : 'Save token' }}</button>
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
