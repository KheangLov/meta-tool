<script setup lang="ts">
/** Explains where data lives, and warns when publishing to GitHub isn't set up. */
const health = ref<{ publish: string; githubRepo: string; githubBranch: string } | null>(null)
onMounted(async () => { try { health.value = await $fetch('/api/health') } catch {} })
</script>

<template>
  <div v-if="health?.publish === 'none'" class="sbanner">
    <b>⚠️ Publishing isn't set up yet.</b>
    Your posts and links are saved in this browser, but Telegram, Facebook and WhatsApp can only see them once they're published to GitHub.
    <details>
      <summary>How to set it up (3 minutes)</summary>
      <ol>
        <li>On GitHub, open <b>Settings → Developer settings → Fine-grained tokens → Generate new token</b>. Choose <b>Only select repositories</b> → your <code>meta-tool</code> repo, and under <b>Repository permissions</b> set <b>Contents: Read and write</b>.</li>
        <li>In Vercel → your project → <b>Settings → Environment Variables</b>, add <code>NUXT_GITHUB_TOKEN</code> (the token) and <code>NUXT_GITHUB_REPO</code> (e.g. <code>KheangLov/meta-tool</code>).</li>
        <li><b>Redeploy</b>. Then open each item and click <b>retry</b> next to "Not published", or just save again.</li>
      </ol>
      <p class="small">Published files go to the <code>published-data</code> branch, which Vercel is set not to deploy. The built-in sample pages work without any of this.</p>
    </details>
  </div>
</template>

<style scoped>
.sbanner { background: #fff4e5; border-bottom: 1px solid #f5c98b; color: #7a4b00; padding: 10px 20px; font-size: 14px; }
.sbanner details { margin-top: 4px; }
.sbanner summary { cursor: pointer; font-weight: 600; }
.sbanner ol { margin: 6px 0; padding-left: 20px; line-height: 1.7; }
</style>
