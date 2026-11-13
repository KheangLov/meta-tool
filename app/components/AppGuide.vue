<script setup lang="ts">
/** What each app allows in a link preview. `only` shows one app, opened. */
const props = defineProps<{ only?: string; closed?: boolean }>()
const list = computed(() => (props.only ? APP_GUIDE.filter((a) => a.id === props.only) : APP_GUIDE))
const parts: { key: 'shows' | 'limits' | 'refresh' | 'test' | 'cant'; label: string }[] = [
  { key: 'shows', label: 'You can set' },
  { key: 'limits', label: 'Limits' },
  { key: 'refresh', label: 'To update an old preview' },
  { key: 'test', label: 'How to test' },
  { key: 'cant', label: 'Not possible' },
]
</script>

<template>
  <div class="guide">
    <details v-for="a in list" :key="a.id" :open="!!only && !closed">
      <summary>{{ only ? `What ${a.name} allows` : a.name }}</summary>
      <dl>
        <template v-for="p in parts" :key="p.key">
          <template v-if="a[p.key].length">
            <dt>{{ p.label }}</dt>
            <dd><ul><li v-for="x in a[p.key]" :key="x">{{ x }}</li></ul></dd>
          </template>
        </template>
      </dl>
    </details>
    <p v-if="!only" class="muted small">Facebook and WhatsApp publish their limits. The other apps don't, so those lines describe what the apps do today. The real app is always the final check.</p>
  </div>
</template>

<style scoped>
.guide { display: grid; gap: 8px; }
details { border: 1px solid var(--rule); border-radius: var(--r-control); padding: 10px 12px; background: var(--surface); }
summary { cursor: pointer; font-weight: 650; font-size: 14px; }
dl { margin: 10px 0 0; display: grid; gap: 4px; font-size: 13px; }
dt { font-weight: 650; color: var(--muted); margin-top: 6px; }
dd { margin: 0; }
ul { margin: 0; padding-left: 18px; display: grid; gap: 3px; }
</style>
