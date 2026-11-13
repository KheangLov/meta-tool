<script setup lang="ts">
/** LinkedIn, Discord and Slack: share the newest link, the app's own checker, and what its crawler reads. */
const props = defineProps<{ app: 'linkedin' | 'discord' | 'slack'; primaryUrl: string; dirty?: boolean }>()
const enc = encodeURIComponent
const info = computed(() => ({
  linkedin: {
    name: 'LinkedIn',
    keeps: 'LinkedIn keeps the preview it saw first, for about a week.',
    share: { label: 'Share on LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(props.primaryUrl)}` },
    tool: { label: 'Open Post Inspector', href: `https://www.linkedin.com/post-inspector/inspect/${enc(props.primaryUrl)}`, how: 'Post Inspector (log in to LinkedIn) re-reads the link and shows the card without posting. It also refreshes links you already shared.' },
    wait: '',
  },
  discord: {
    name: 'Discord',
    keeps: 'Discord keeps a preview for about 30 minutes.',
    share: { label: 'Open Discord', href: 'https://discord.com/channels/@me' },
    tool: { label: 'Open Embed Debugger', href: 'https://discord.com/developers/embeds', how: 'Paste the link into Discord\'s Embed Debugger to see which tags it read and the layout it chose.' },
    wait: 'Or wait 30 minutes and paste the same link again.',
  },
  slack: {
    name: 'Slack',
    keeps: 'Slack keeps a preview for about 30 minutes, for everyone on Slack.',
    share: { label: 'Open Slack', href: 'https://app.slack.com/client' },
    tool: null as null | { label: string; href: string; how: string },
    wait: 'Or wait 30 minutes and paste the same link again. Slack has no refresh tool.',
  },
}[props.app]))
const copied = ref(false)
async function copy() {
  try { await navigator.clipboard.writeText(props.primaryUrl); copied.value = true; setTimeout(() => (copied.value = false), 1500) } catch {}
}
</script>

<template>
  <div>
    <h2>Update on {{ info.name }}</h2>
    <p class="muted small">{{ info.keeps }}</p>

    <div class="step">
      <b>A. Share the newest link</b>
      <div class="copyrow">
        <code>{{ primaryUrl }}</code>
        <SqBtn variant="tonal" size="small" @click="copy">{{ copied ? 'Copied' : 'Copy' }}</SqBtn>
        <SqBtn variant="text" size="small" :href="info.share.href" target="_blank" rel="noopener" @click="copy">{{ info.share.label }}</SqBtn>
      </div>
      <p class="muted small">Each publish makes a new <code>?v=</code> link, which {{ info.name }} has never seen, so it reads the latest preview. {{ info.wait }}</p>
      <p v-if="dirty" class="muted small">Publish your changes first.</p>
    </div>

    <div v-if="info.tool" class="step">
      <b>B. Check it with {{ info.name }}'s own tool</b>
      <p class="muted small">{{ info.tool.how }}</p>
      <SqBtn color="primary" variant="flat" size="small" :href="info.tool.href" target="_blank" rel="noopener" @click="copy">{{ info.tool.label }}</SqBtn>
    </div>

    <CrawlerCheck :url="primaryUrl" :as="app" :label="info.name" />
  </div>
</template>
