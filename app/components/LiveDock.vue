<script setup lang="ts">
/**
 * Phones and tablets: a live preview that stays on screen while you type.
 * Pick the app on top; the preview and the remarks under it follow every keystroke.
 */
const app = defineModel<PreviewApp>('app', { required: true })
defineProps<{ platforms: PlatformOverrides; notes: AppNote[] }>()
const open = ref(true)
onMounted(() => { try { open.value = localStorage.getItem('lps-dock') !== 'closed' } catch {} })
watch(open, (v) => { try { localStorage.setItem('lps-dock', v ? 'open' : 'closed') } catch {} })

// While the keyboard is up there is little room: shrink the preview and hide the bars under it
const typing = ref(false)
let blurTimer: ReturnType<typeof setTimeout> | undefined
const isText = (t: EventTarget | null) => t instanceof HTMLTextAreaElement || (t instanceof HTMLInputElement && !['color', 'checkbox', 'radio', 'file', 'range'].includes(t.type))
function onIn(e: FocusEvent) { if (isText(e.target)) { clearTimeout(blurTimer); typing.value = true } }
function onOut() { blurTimer = setTimeout(() => (typing.value = false), 120) }
watch(typing, async (v) => {
  document.documentElement.classList.toggle('lps-typing', v)
  if (!v) return
  // The dock just changed size: bring the focused field back between the dock and the keyboard
  await nextTick()
  requestAnimationFrame(() => (document.activeElement as HTMLElement | null)?.scrollIntoView({ block: 'nearest' }))
})
onMounted(() => { document.addEventListener('focusin', onIn); document.addEventListener('focusout', onOut) })
onBeforeUnmount(() => { document.removeEventListener('focusin', onIn); document.removeEventListener('focusout', onOut); document.documentElement.classList.remove('lps-typing') })
</script>

<template>
  <div class="dock stage" :class="{ closed: !open }">
    <div class="dock-top">
      <div class="seg sm apptabs" role="tablist" aria-label="Preview as">
        <button v-for="a in PREVIEW_APPS" :key="a.id" role="tab" :aria-selected="app === a.id" :class="{ on: app === a.id }" @click="app = a.id; open = true">
          {{ a.label }}<span v-if="platforms[overrideKey(a.id)]" title="Has its own text or image"> •</span>
        </button>
      </div>
      <button class="dock-toggle" :aria-expanded="open" aria-label="Show or hide the live preview" @click="open = !open">
        <SqIcon :icon="open ? 'chevronUp' : 'chevronDown'" />
      </button>
    </div>
    <div v-show="open" class="dock-body">
      <div class="dock-zoom"><slot /></div>
    </div>
    <div v-if="open && notes.length" class="dock-notes">
      <span v-for="n in notes" :key="n.text" :class="n.level">{{ n.text }}</span>
    </div>
  </div>
</template>

<style>
.dock { display: none; }
@media (max-width: 1020px) {
  .editor.show-edit .dock {
    display: block; position: sticky; top: calc(var(--head-h) + 60px); z-index: 8;
    margin: 0 -14px 10px; padding: 8px 12px; border-radius: 0 0 18px 18px;
    box-shadow: 0 10px 24px -14px color-mix(in srgb, #000 60%, transparent);
  }
  .dock-top { display: flex; gap: 8px; align-items: center; }
  .dock-top .apptabs { flex: 1 1 auto; min-width: 0; }
  .dock-toggle { flex: none; width: 34px; height: 34px; border-radius: 10px; border: 0; background: #2a3630; color: #e9f1ec; display: grid; place-items: center; cursor: pointer; }
  .dock-body { margin-top: 8px; max-height: min(30vh, 250px); overflow-y: auto; border-radius: 12px; overscroll-behavior: contain; }
  /* Keep a focused field clear of the dock above and the tab bar below */
  .editor.show-edit .ed-form > :not(.dock) * { scroll-margin-top: calc(var(--head-h) + 60px + min(30vh, 250px) + 110px); scroll-margin-bottom: 110px; }
  .editor.show-edit .dock.closed ~ * * { scroll-margin-top: calc(var(--head-h) + 130px); }
  /* Keyboard up (touch screens): half-size preview so the whole card stays visible above the field */
  @media (pointer: coarse) {
    .lps-typing .editor.show-edit .dock-body { max-height: 200px; }
    .lps-typing .editor.show-edit .dock-notes { display: none; }
    .lps-typing .editor.show-edit .dock-zoom { zoom: .5; }
    .lps-typing .lps-bnav, .lps-typing .editor.show-edit > .savebar { display: none; }
    .lps-typing .editor.show-edit .ed-form > :not(.dock) * { scroll-margin-top: calc(var(--head-h) + 60px + 300px); }
  }
  .dock-notes { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin-top: 8px; }
  .dock-notes span { flex: none; font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 99px; background: #2a3630; color: #c9d6cf; white-space: nowrap; }
  .dock-notes span.warn { background: #4a3a12; color: #ffd27a; }
}
</style>
