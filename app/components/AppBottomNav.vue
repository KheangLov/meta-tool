<script setup lang="ts">
/**
 * Floating, iOS-style bottom navigation for phones, built on Squirkle's SqBottomNavigation.
 * A frosted squircle bar with one highlight that slides (with a little spring) to the active tab.
 */
const props = defineProps<{ active: string }>()
const items = [
  { title: 'Links', icon: 'lps:link', value: 'links', to: '/' },
  { title: 'Posts', icon: 'lps:post', value: 'posts', to: '/posts' },
  { title: 'Test kit', icon: 'lps:flask', value: 'kit', to: '/test-kit' },
  { title: 'Settings', icon: 'lps:gear', value: 'settings', to: '/settings' },
]
const index = computed(() => Math.max(0, items.findIndex((i) => i.value === props.active)))
function go(v: string | number) {
  const item = items.find((i) => i.value === v)
  if (item) navigateTo(item.to)
}
</script>

<template>
  <div class="lps-bnav" :style="{ '--n': items.length, '--i': index }">
    <SqBottomNavigation floating :items="items" :model-value="active" aria-label="Main" @update:model-value="go" />
  </div>
</template>

<style>
.lps-bnav { display: none; }
@media (max-width: 720px) {
  .lps-bnav {
    display: block; position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
    padding: 0 14px calc(env(safe-area-inset-bottom) + 10px);
    pointer-events: none;
  }
  .lps-bnav .sq-bottom-navigation {
    pointer-events: auto;
    max-width: 420px; margin: 0 auto; padding: 6px;
    --sq-r: 26px;
    --sq-bg: color-mix(in srgb, var(--sq-surface) 74%, transparent);
    border-radius: 30px;
    -webkit-backdrop-filter: blur(20px) saturate(1.7);
    backdrop-filter: blur(20px) saturate(1.7);
    box-shadow: 0 10px 30px -12px color-mix(in srgb, #000 45%, transparent), inset 0 0 0 0.5px color-mix(in srgb, var(--sq-on-surface) 12%, transparent);
  }
  /* the sliding highlight: sits above the squircle background, below the icons */
  .lps-bnav .sq-bottom-navigation::after {
    content: ''; position: absolute; z-index: 0;
    top: 6px; bottom: 6px; left: 6px;
    width: calc((100% - 12px) / var(--n));
    border-radius: 22px; corner-shape: squircle;
    background: color-mix(in srgb, var(--sq-primary) 15%, transparent);
    transform: translateX(calc(var(--i) * 100%));
    transition: transform .55s cubic-bezier(.32, 1.42, .48, 1);
  }
  .lps-bnav .sq-bottom-navigation__item {
    position: relative; z-index: 1; min-height: 52px; padding: 6px 2px; border-radius: 20px;
    font-size: 11px; font-weight: 600; -webkit-tap-highlight-color: transparent;
    transition: transform .2s ease, color .25s ease;
  }
  .lps-bnav .sq-bottom-navigation__item:active { transform: scale(.92); }
  .lps-bnav .sq-bottom-navigation__icon { width: auto; height: 26px; background: transparent !important; }
  .lps-bnav .sq-bottom-navigation__icon .sq-icon { --sq-icon-size: 24px; }
}
@media (prefers-reduced-motion: reduce) {
  .lps-bnav .sq-bottom-navigation::after { transition: none; }
}
</style>
