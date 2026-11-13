<script setup lang="ts">
const studio = useStudio()
const links = ref<LocalLink[]>([])
const loading = ref(true)
const error = ref('')

const targetUrl = ref('')
const slug = ref('')
const importMeta = ref(true)
const creating = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try { links.value = await db().links.orderBy('updatedAt').reverse().toArray() }
  catch (e) { error.value = errMsg(e) }
  finally { loading.value = false }
}

async function create() {
  creating.value = true
  error.value = ''
  try {
    const link = await studio.createLink({ targetUrl: targetUrl.value, slug: slug.value || undefined, importMeta: importMeta.value })
    await navigateTo(`/links/${link.slug}`)
  } catch (e) { error.value = errMsg(e) }
  finally { creating.value = false }
}

onMounted(load)
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Links</h1>
      <p>Short links on your site. Apps show the preview you set here, and people who tap them go to the target page.</p>
    </div>
  </div>

  <section class="card">
    <form class="create" @submit.prevent="create">
      <label class="field">
        <span>Page to link to</span>
        <input v-model="targetUrl" class="input" type="url" inputmode="url" required placeholder="https://example.com/article" />
      </label>
      <label class="field">
        <span>Link name <em>(optional)</em></span>
        <input v-model="slug" class="input" placeholder="summer-sale" pattern="[A-Za-z0-9_\-]{3,64}" autocapitalize="off" />
      </label>
      <button class="btn primary" :disabled="creating">{{ creating ? 'Creating…' : 'Create link' }}</button>
    </form>
    <label class="check"><input v-model="importMeta" type="checkbox" /> Start from the page's current title, description and image</label>
    <p v-if="error" class="error small">{{ error }}</p>
  </section>

  <h2 class="section-title">On this device <span v-if="links.length" class="muted small">({{ links.length }})</span></h2>
  <p v-if="loading" class="muted">Loading…</p>
  <div v-else-if="!links.length && !error" class="empty">
    No links here yet. Create one above, <NuxtLink to="/test-kit">load the samples</NuxtLink>, or restore what you published from another device.
  </div>
  <div class="rows">
    <ItemRow
      v-for="l in links" :key="l.slug" :to="`/links/${l.slug}`"
      :image="l.platforms?.telegram?.image || l.image" :title="l.title" :sub="l.targetUrl.replace(/^https?:\/\//, '')"
      :path="`/s/${l.slug}`" :status="publishLabel(l)"
    />
  </div>
</template>
