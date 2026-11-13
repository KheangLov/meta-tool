<script setup lang="ts">
const route = useRoute()
const section = computed(() =>
  route.path.startsWith('/posts') ? 'posts'
    : route.path.startsWith('/test-kit') ? 'kit'
      : route.path.startsWith('/settings') ? 'settings'
        : 'links')
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <NuxtLink to="/" class="brand" aria-label="Link Preview Studio home"><span class="logo" /> <span class="brand-name">Link Preview Studio</span></NuxtLink>
      <nav class="nav" aria-label="Main">
        <NuxtLink to="/" :class="{ active: section === 'links' }">Links</NuxtLink>
        <NuxtLink to="/posts" :class="{ active: section === 'posts' }">Posts</NuxtLink>
        <NuxtLink to="/test-kit" :class="{ active: section === 'kit' }">Test kit</NuxtLink>
        <NuxtLink to="/settings" :class="{ active: section === 'settings' }">Settings</NuxtLink>
      </nav>
      <AdminTokenBar />
      <ThemeToggle />
    </header>
    <StorageBanner />
    <main class="page"><NuxtPage /></main>
    <AppBottomNav :active="section" />
  </div>
</template>
