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
    </header>
    <StorageBanner />
    <main class="page"><NuxtPage /></main>

    <nav class="tabbar" aria-label="Main">
      <NuxtLink to="/" :class="{ active: section === 'links' }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
        Links
      </NuxtLink>
      <NuxtLink to="/posts" :class="{ active: section === 'posts' }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="3.5" width="16" height="17" rx="2.5" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
        Posts
      </NuxtLink>
      <NuxtLink to="/test-kit" :class="{ active: section === 'kit' }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" /><path d="M7.5 15h9" /></svg>
        Test kit
      </NuxtLink>
      <NuxtLink to="/settings" :class="{ active: section === 'settings' }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" /></svg>
        Settings
      </NuxtLink>
    </nav>
  </div>
</template>
