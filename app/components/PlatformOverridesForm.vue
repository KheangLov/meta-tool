<script setup lang="ts">
/** "Different text or image per app" — v-model is the platforms object. Empty fields use the main values. */
const model = defineModel<PlatformOverrides>({ required: true })
const props = defineProps<{ base: { siteName: string; title: string; description: string; image: string } }>()
const tab = defineModel<Platform>('tab', { default: 'telegram' })

const tabs: { id: Platform; label: string }[] = [
  { id: 'telegram', label: 'Telegram' },
  { id: 'facebook', label: 'Facebook & Messenger' },
  { id: 'whatsapp', label: 'WhatsApp' },
]
const cur = computed(() => model.value?.[tab.value] || {})
function set(k: keyof PlatformOverride, v: string) {
  const next: PlatformOverrides = { ...model.value }
  const o: PlatformOverride = { ...(next[tab.value] || {}) }
  if (v) o[k] = v
  else delete o[k]
  if (Object.keys(o).length) next[tab.value] = o
  else delete next[tab.value]
  model.value = next
}
const count = (p: Platform) => Object.keys(model.value?.[p] || {}).length
const total = computed(() => tabs.reduce((n, t) => n + count(t.id), 0))
</script>

<template>
  <details class="po" :open="total > 0">
    <summary>Different text or image per app <span v-if="total" class="pill">{{ total }} set</span></summary>
    <p class="muted small">Leave a field empty to use the main value. Each app's crawler gets its own version (Messenger uses Facebook's).</p>
    <div class="seg sm tabs">
      <button v-for="t in tabs" :key="t.id" :class="{ on: tab === t.id }" @click="tab = t.id">
        {{ t.label }}<span v-if="count(t.id)"> · {{ count(t.id) }}</span>
      </button>
    </div>
    <label class="field">
      <span>Site name</span>
      <input class="input" :value="cur.siteName || ''" :placeholder="props.base.siteName" @input="set('siteName', ($event.target as HTMLInputElement).value)" />
    </label>
    <label class="field">
      <span>Title</span>
      <input class="input" :value="cur.title || ''" :placeholder="props.base.title" @input="set('title', ($event.target as HTMLInputElement).value)" />
    </label>
    <label class="field">
      <span>Description</span>
      <textarea class="input" rows="2" :value="cur.description || ''" :placeholder="props.base.description" @input="set('description', ($event.target as HTMLTextAreaElement).value)" />
    </label>
    <div class="field">
      <span>Image</span>
      <div class="row">
        <input class="input grow" type="url" :value="cur.image || ''" :placeholder="props.base.image || 'https://…'" @input="set('image', ($event.target as HTMLInputElement).value)" />
        <TestImagePicker @pick="set('image', $event)" />
      </div>
      <ImageUpload @uploaded="set('image', $event)" />
      <div class="row wrap" style="margin-top:6px">
        <OptimizeImageButton
          v-if="tab === 'whatsapp' && (cur.image || props.base.image)" :url="cur.image || props.base.image" preset="whatsapp"
          label="⚡ Make a WhatsApp-safe copy (≤ 300 KB)" @done="set('image', $event)"
        />
        <button v-if="cur.image" type="button" class="btn sm ghost" @click="set('image', '')">Use main image</button>
      </div>
      <ImageCheck v-if="cur.image" :url="cur.image" :only="tab === 'facebook' ? ['facebook'] : tab === 'whatsapp' ? ['whatsapp'] : ['telegram']" />
    </div>
  </details>
</template>

<style scoped>
.po { border: 1px solid var(--line); border-radius: 8px; padding: 8px 12px; margin-bottom: 14px; }
.po summary { cursor: pointer; font-size: 13px; font-weight: 600; display: flex; gap: 8px; align-items: center; }
.po[open] summary { margin-bottom: 8px; }
.tabs { margin-bottom: 12px; flex-wrap: wrap; }
.wrap { flex-wrap: wrap; }
</style>
