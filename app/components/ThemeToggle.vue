<script setup lang="ts">
/** Light ↔ dark switch for the header (Settings also offers "System"). */
const { mode, isDark } = useColorMode()
function flip() { mode.value = isDark.value ? 'light' : 'dark' }
</script>

<template>
  <SqBtn
    :icon="isDark ? 'sun' : 'moon'" variant="text" size="small" class="theme-toggle"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" :title="isDark ? 'Light mode' : 'Dark mode'"
    @click="flip"
  />
</template>
