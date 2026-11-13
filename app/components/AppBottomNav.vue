<script setup lang="ts">
/**
 * Floating, iOS-style bottom navigation for phones, built on Squirkle's SqBottomNavigation.
 * One highlight pill sits behind the tabs. It springs (and briefly stretches) to the tab you
 * pick, and you can drag it along the bar with your finger: let go and it snaps to that tab.
 */
const props = defineProps<{ active: string }>()
const items = [
  { title: 'Links', icon: 'lps:link', value: 'links', to: '/' },
  { title: 'Posts', icon: 'lps:post', value: 'posts', to: '/posts' },
  { title: 'Test kit', icon: 'lps:flask', value: 'kit', to: '/test-kit' },
  { title: 'Settings', icon: 'lps:gear', value: 'settings', to: '/settings' },
]
const root = ref<HTMLElement>()
const pos = reactive({ x: 0, w: 0, ready: false })
const stretch = ref(false)
const dragging = ref(false)
// Shown tab: follows the route, but switches straight away on tap so the pill moves before the page loads
const shown = ref(props.active)
watch(() => props.active, (v) => { shown.value = v })

function buttons() {
  return Array.from(root.value?.querySelectorAll<HTMLElement>('.sq-bottom-navigation__item') || [])
}
function place() {
  const i = Math.max(0, items.findIndex((it) => it.value === shown.value))
  const b = buttons()[i]
  if (!b) return
  pos.x = b.offsetLeft
  pos.w = b.offsetWidth
  pos.ready = true
}
let stretchTimer: ReturnType<typeof setTimeout> | undefined
watch(shown, async (v, old) => {
  await nextTick()
  if (old !== undefined && !dragging.value) {
    stretch.value = true
    clearTimeout(stretchTimer)
    stretchTimer = setTimeout(() => (stretch.value = false), 220)
  }
  place()
})

function go(v: string | number) {
  const item = items.find((i) => i.value === v)
  if (!item) return
  shown.value = item.value
  navigateTo(item.to)
}

// Drag the pill along the bar
let startX = 0
let startPos = 0
let moved = false
function onDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  startX = e.clientX
  startPos = pos.x
  moved = false
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp, { once: true })
  window.addEventListener('pointercancel', onUp, { once: true })
}
function onMove(e: PointerEvent) {
  const dx = e.clientX - startX
  if (!moved && Math.abs(dx) < 8) return
  moved = true
  dragging.value = true
  const bs = buttons()
  const first = bs[0]
  const last = bs[bs.length - 1]
  if (!first || !last) return
  pos.x = Math.min(last.offsetLeft, Math.max(first.offsetLeft, startPos + dx))
}
function onUp() {
  window.removeEventListener('pointermove', onMove)
  if (!moved) return
  // snap to the tab under the pill's centre
  const centre = pos.x + pos.w / 2
  const bs = buttons()
  let best = 0
  bs.forEach((b, i) => {
    const bc = b.offsetLeft + b.offsetWidth / 2
    const cur = bs[best]!
    if (Math.abs(bc - centre) < Math.abs(cur.offsetLeft + cur.offsetWidth / 2 - centre)) best = i
  })
  dragging.value = false
  // swallow the click that follows a drag
  root.value?.addEventListener('click', (ev) => { ev.stopPropagation(); ev.preventDefault() }, { capture: true, once: true })
  setTimeout(() => (moved = false), 0)
  const target = items[best]!
  if (target.value === shown.value) place()
  else go(target.value)
}

let ro: ResizeObserver | undefined
onMounted(() => {
  place()
  ro = new ResizeObserver(place)
  if (root.value) ro.observe(root.value)
})
onBeforeUnmount(() => { ro?.disconnect(); window.removeEventListener('pointermove', onMove) })
</script>

<template>
  <div
    ref="root" class="lps-bnav"
    :class="{ 'is-ready': pos.ready, 'is-dragging': dragging, 'is-stretch': stretch }"
    :style="{ '--x': `${pos.x}px`, '--w': `${pos.w}px` }"
    @pointerdown="onDown"
  >
    <SqBottomNavigation floating :items="items" :model-value="shown" aria-label="Main" @update:model-value="go" />
  </div>
</template>

<style>
.lps-bnav { display: none; }
@media (max-width: 720px) {
  .lps-bnav {
    display: block; position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
    padding: 0 16px calc(env(safe-area-inset-bottom) + 8px);
    pointer-events: none;
    touch-action: pan-y;
  }
  .lps-bnav .sq-bottom-navigation {
    pointer-events: auto;
    max-width: 340px; margin: 0 auto; padding: 4px; gap: 0;
    --sq-r: 24px;
    --sq-bg: color-mix(in srgb, var(--sq-surface) 82%, transparent);
    border-radius: 26px;
    -webkit-backdrop-filter: blur(22px) saturate(1.8);
    backdrop-filter: blur(22px) saturate(1.8);
    box-shadow: 0 8px 28px -10px color-mix(in srgb, #000 40%, transparent), inset 0 0 0 0.5px color-mix(in srgb, var(--sq-on-surface) 14%, transparent);
    user-select: none; -webkit-user-select: none;
  }
  /* The sliding pill. Lives inside the bar (above its squircle background, below the tabs) */
  .lps-bnav .sq-bottom-navigation::after {
    content: ''; position: absolute; z-index: 0; pointer-events: none;
    top: 4px; bottom: 4px; left: 0;
    width: var(--w, 25%);
    border-radius: 20px; corner-shape: squircle;
    background: color-mix(in srgb, var(--sq-primary) 16%, var(--sq-surface));
    box-shadow: 0 1px 2px color-mix(in srgb, #000 10%, transparent), inset 0 0 0 0.5px color-mix(in srgb, var(--sq-primary) 22%, transparent);
    opacity: 0;
    transform: translateX(var(--x, 0px));
    transition: transform .5s cubic-bezier(.3, 1.35, .45, 1), scale .22s ease, opacity .2s;
  }
  .lps-bnav.is-ready .sq-bottom-navigation::after { opacity: 1; }
  .lps-bnav.is-stretch .sq-bottom-navigation::after { scale: 1.12 .9; }
  .lps-bnav.is-dragging .sq-bottom-navigation::after { transition: scale .2s ease; scale: 1.04 1.04; }
  .lps-bnav .sq-bottom-navigation__item {
    position: relative; z-index: 1; min-height: 46px; padding: 4px 2px; gap: 1px; border-radius: 20px;
    font-size: 10.5px; font-weight: 600; letter-spacing: .01em; -webkit-tap-highlight-color: transparent;
    transition: transform .2s ease, color .25s ease;
  }
  .lps-bnav .sq-bottom-navigation__item:active { transform: scale(.92); }
  .lps-bnav .sq-bottom-navigation__icon { width: auto; height: 24px; background: transparent !important; }
  .lps-bnav .sq-bottom-navigation__icon .sq-icon { --sq-icon-size: 21px !important; }
}
@media (prefers-reduced-motion: reduce) {
  .lps-bnav .sq-bottom-navigation::after { transition: opacity .2s; }
  .lps-bnav.is-stretch .sq-bottom-navigation::after, .lps-bnav.is-dragging .sq-bottom-navigation::after { scale: 1; }
}
</style>
