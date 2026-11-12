<template>
  <div class="shell">
    <header class="topbar">
      <div class="row">
        <NuxtLink to="/" class="brand"><span class="logo">◧</span> <span class="brand-name">Link Preview Studio</span></NuxtLink>
        <nav class="nav">
          <NuxtLink to="/" :class="{ active: $route.path === '/' || $route.path.startsWith('/links') }">Links</NuxtLink>
          <NuxtLink to="/posts" active-class="active">Posts</NuxtLink>
          <NuxtLink to="/test-kit" active-class="active">Test kit</NuxtLink>
        </nav>
      </div>
      <AdminTokenBar />
    </header>
    <main class="page"><NuxtPage /></main>
  </div>
</template>
