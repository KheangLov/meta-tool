<script setup lang="ts">
const studio = useStudio()
const posts = ref<LocalPost[]>([])
const loading = ref(true)
const error = ref('')
const title = ref('')
const slug = ref('')
const creating = ref(false)

async function load() {
  loading.value = true
  try { posts.value = await db().posts.orderBy('updatedAt').reverse().toArray() }
  catch (e) { error.value = errMsg(e) }
  finally { loading.value = false }
}
async function create() {
  creating.value = true
  error.value = ''
  try {
    const p = await studio.createPost({ title: title.value, slug: slug.value || undefined })
    await navigateTo(`/posts/${p.slug}`)
  } catch (e) { error.value = errMsg(e) }
  finally { creating.value = false }
}
onMounted(load)
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Posts</h1>
      <p>Simple article pages hosted on your site, each with its own preview. Share a post directly or make a short link for it.</p>
    </div>
  </div>

  <section class="card">
    <form class="create" @submit.prevent="create">
      <AppField v-model="title" label="Title" required placeholder="Rainy season sale" hide-details />
      <AppField v-model="slug" label="Page name (optional)" placeholder="rainy-sale" autocapitalize="off" hide-details />
      <SqBtn color="primary" variant="flat" type="submit" :loading="creating" :disabled="creating">{{ creating ? 'Creating…' : 'Create post' }}</SqBtn>
    </form>
    <p v-if="error" class="error small">{{ error }}</p>
  </section>

  <h2 class="section-title">On this device <span v-if="posts.length" class="muted small">({{ posts.length }})</span></h2>
  <p v-if="loading" class="muted">Loading…</p>
  <div v-else-if="!posts.length && !error" class="empty">
    No posts here yet. Create one above, or <NuxtLink to="/test-kit">load the sample posts</NuxtLink>.
  </div>
  <div class="rows">
    <ItemRow
      v-for="p in posts" :key="p.slug" :to="`/posts/${p.slug}`"
      :image="p.cover" :title="p.title" :sub="p.excerpt"
      :path="`/p/${p.slug}`" :status="publishLabel(p)"
    />
  </div>
</template>
