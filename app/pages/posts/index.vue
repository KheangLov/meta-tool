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
  <section class="card">
    <h1>New post</h1>
    <p class="muted">A simple article page on this site, with its own preview tags. Share it directly (<code>/p/…</code>) or point a share link at it.</p>
    <form class="create" @submit.prevent="create">
      <label class="field grow">
        <span>Title</span>
        <input v-model="title" class="input" required placeholder="My test post" />
      </label>
      <label class="field">
        <span>Custom slug <em>(optional)</em></span>
        <input v-model="slug" class="input" placeholder="my-post" pattern="[A-Za-z0-9_\-]{3,64}" />
      </label>
      <button class="btn primary" :disabled="creating">{{ creating ? 'Creating…' : 'Create' }}</button>
    </form>
    <p v-if="error" class="error">{{ error }}</p>
  </section>

  <section>
    <div class="row between">
      <h2 class="section-title">Your posts</h2>
      <NuxtLink to="/test-kit" class="small">Need sample posts? → Test kit</NuxtLink>
    </div>
    <p v-if="loading" class="muted">Loading…</p>
    <p v-else-if="!posts.length && !error" class="muted">No posts on this device yet. Create one, or <NuxtLink to="/test-kit">load samples / restore what you published</NuxtLink>.</p>
    <div class="grid">
      <NuxtLink v-for="p in posts" :key="p.slug" :to="`/posts/${p.slug}`" class="link-card">
        <TelegramPreview
          compact :url="postUrl(p.slug)" :site-name="p.siteName" :title="p.title"
          :description="p.excerpt" :image="p.cover" :image-style="p.imageStyle"
        />
        <div class="link-card-foot">
          <code>/p/{{ p.slug }}</code>
          <span :class="`pub pub-${publishLabel(p).kind}`">{{ publishLabel(p).text }}</span>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>
