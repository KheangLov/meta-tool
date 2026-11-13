<script setup lang="ts">
/**
 * The text and image of the preview, with one switch: edit for all apps, or for one app only.
 * Picking an app also turns the live preview to that app, so every keystroke shows there.
 */
type Field = 'siteName' | 'title' | 'description' | 'image'
const props = defineProps<{
  base: Record<Field, string>
  descriptionLabel?: string; imageLabel?: string
  disabled?: boolean; imageWarning?: string
  notes?: AppNote[]
}>()
const emit = defineEmits<{ base: [field: Field, value: string] }>()
const platforms = defineModel<PlatformOverrides>('platforms', { required: true })
const app = defineModel<PreviewApp>('app', { required: true })
const extra = defineModel<PreviewExtra>('extra', { required: true })
const imageStyle = defineModel<'large' | 'small'>('imageStyle', { required: true })

/** null = all apps */
const scope = ref<Platform | null>(null)
// When the preview is turned to another app while editing one app, follow it
watch(app, (a) => { if (scope.value) scope.value = overrideKey(a) })
function pick(p: Platform | null) {
  scope.value = p
  if (p && overrideKey(app.value) !== p) app.value = p
}
const own = computed(() => (scope.value ? platforms.value[scope.value] || {} : {}))
const name = computed(() => (scope.value ? PLATFORM_LABEL[scope.value] : ''))
const value = (k: Field) => (scope.value ? own.value[k] || '' : props.base[k])
function set(k: Field, v: string) {
  if (!scope.value) return emit('base', k, v)
  const next: PlatformOverrides = { ...platforms.value }
  const o: PlatformOverride = { ...(next[scope.value] || {}) }
  if (v) o[k] = v
  else delete o[k]
  if (Object.keys(o).length) next[scope.value] = o
  else delete next[scope.value]
  platforms.value = next
}
function clearOwn() {
  if (!scope.value) return
  const next = { ...platforms.value }
  delete next[scope.value]
  platforms.value = next
}
const hasOwn = (p: Platform) => Object.keys(platforms.value[p] || {}).length > 0
const image = computed(() => value('image') || (scope.value ? props.base.image : ''))
function setExtra(k: 'themeColor' | 'author', v: string) {
  const next: any = { ...extra.value }
  if (v) next[k] = v
  else delete next[k]
  extra.value = next
}
const PLATFORM_LIST = Object.keys(PLATFORM_LABEL) as Platform[]
</script>

<template>
  <div class="group">
    <h3>What apps show</h3>
    <div class="scope" role="radiogroup" aria-label="Edit for">
      <button role="radio" :aria-checked="!scope" :class="{ on: !scope }" :disabled="disabled" @click="pick(null)">All apps</button>
      <button v-for="p in PLATFORM_LIST" :key="p" role="radio" :aria-checked="scope === p" :class="{ on: scope === p }" :disabled="disabled" @click="pick(p)">
        {{ PLATFORM_LABEL[p] }}<i v-if="hasOwn(p)" title="Has its own version" />
      </button>
    </div>
    <p v-if="scope" class="scope-note small">
      Only {{ name }} gets what you type here. Empty fields use the <button class="linkbtn" @click="pick(null)">All apps</button> value.
      <button v-if="hasOwn(scope)" class="linkbtn" @click="clearOwn">Remove {{ name }}'s own version</button>
    </p>
    <p v-else class="muted small">Every app gets this. Pick an app to give it its own title, text or image.</p>

    <div class="fields">
      <AppField :model-value="value('siteName')" label="Site name" :placeholder="scope ? base.siteName : 'My Shop'" :counter="true" :disabled="disabled" @update:model-value="set('siteName', $event)" />
      <AppField :model-value="value('title')" :label="scope ? `Title for ${name}` : 'Title'" :placeholder="scope ? base.title : 'Headline shown in bold'" :counter="90" :disabled="disabled" @update:model-value="set('title', $event)" />
      <AppField :model-value="value('description')" multiline :label="scope ? `${descriptionLabel || 'Description'} for ${name}` : descriptionLabel || 'Description'" :placeholder="scope ? base.description : 'A sentence or two'" :rows="3" :counter="300" :disabled="disabled" @update:model-value="set('description', $event)" />
    </div>
    <div v-if="notes?.length" class="notes">
      <span v-for="n in notes" :key="n.text" :class="n.level">{{ n.text }}</span>
    </div>
  </div>

  <div class="group">
    <h3>{{ scope ? `Image for ${name}` : imageLabel || 'Image' }}</h3>
    <div class="field">
      <div class="row">
        <AppField :model-value="value('image')" class="grow" label="Image URL" input-type="url" inputmode="url" :placeholder="scope && base.image ? 'Same as all apps' : 'Paste an image link, 1200 × 630 works best'" hide-details :disabled="disabled" @update:model-value="set('image', $event)" />
        <TestImagePicker @pick="set('image', $event)" />
      </div>
      <ImageUpload @uploaded="set('image', $event)" />
      <div v-if="scope" class="row wrap" style="margin-top:6px">
        <OptimizeImageButton v-if="scope === 'whatsapp' && image" :url="image" preset="whatsapp" label="⚡ Make a WhatsApp-safe copy (≤ 300 KB)" @done="set('image', $event)" />
        <SqBtn v-if="own.image" variant="text" size="small" @click="set('image', '')">Use the all-apps image</SqBtn>
      </div>
      <small v-if="imageWarning" class="hint warn">{{ imageWarning }}</small>
      <ImageCheck :url="image" :only="scope ? [scope] : undefined" />
    </div>
    <div v-if="!scope" class="field">
      <span>Image size in the preview</span>
      <div class="seg">
        <button :class="{ on: imageStyle === 'large' }" @click="imageStyle = 'large'">Large</button>
        <button :class="{ on: imageStyle === 'small' }" @click="imageStyle = 'small'">Small thumbnail</button>
      </div>
    </div>

    <label v-if="scope === 'discord'" class="field">
      <span>Accent colour <em>(the bar beside Discord's card)</em></span>
      <div class="row">
        <input type="color" :value="extra.themeColor || '#5865f2'" aria-label="Pick a colour" @input="setExtra('themeColor', ($event.target as HTMLInputElement).value)" />
        <SqBtn v-if="extra.themeColor" variant="text" size="small" @click="setExtra('themeColor', '')">Remove</SqBtn>
      </div>
    </label>
    <AppField v-if="scope === 'slack'" :model-value="extra.author || ''" label="Author (Slack shows “Written by”)" placeholder="Jane Doe" hide-details @update:model-value="setExtra('author', $event)" />
    <p v-if="scope === 'telegram'" class="muted small">Large or small image, preview above the text, and hiding the preview are set per message on the <b>Message</b> tab.</p>
    <p v-if="scope === 'facebook'" class="muted small">Messenger and Instagram use this version too.</p>
    <AppGuide v-if="scope" :only="app" closed />
  </div>
</template>

<style scoped>
.scope { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin: 0 -2px 8px; padding: 2px; }
.scope::-webkit-scrollbar { display: none; }
.scope button { flex: none; font: inherit; font-size: 13.5px; font-weight: 600; min-height: 36px; padding: 6px 12px; border-radius: 99px; border: 1px solid var(--rule-strong); background: var(--surface); color: var(--ink); cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
.scope button.on { border-color: var(--signal); background: var(--signal); color: var(--sq-on-primary); }
.scope button:disabled { opacity: .55; }
.scope button:focus-visible { outline: 2px solid var(--signal); outline-offset: 2px; }
.scope i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; opacity: .8; }
.scope-note { background: var(--signal-soft); border-radius: var(--r-control); padding: 8px 12px; margin: 0 0 12px; }
.notes { display: flex; flex-wrap: wrap; gap: 6px; margin: -6px 0 14px; }
.notes span { font-size: 12.5px; font-weight: 600; padding: 3px 10px; border-radius: 99px; background: var(--raised); color: var(--muted); }
.notes span.warn { background: var(--amber-soft); color: var(--amber-ink); }
input[type='color'] { width: 48px; height: 36px; padding: 2px; border: 1px solid var(--rule-strong); border-radius: 8px; background: var(--surface); }
</style>
