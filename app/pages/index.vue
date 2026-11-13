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
      <AppField v-model="targetUrl" label="Page to link to" input-type="url" inputmode="url" required placeholder="https://example.com/article" hide-details />
      <AppField v-model="slug" label="Link name (optional)" placeholder="summer-sale" autocapitalize="off" hide-details />
      <SqBtn color="primary" variant="flat" type="submit" :loading="creating" :disabled="creating">{{ creating ? 'Creating…' : 'Create link' }}</SqBtn>
    </form>
    <SqCheckbox v-model="importMeta" class="mt" label="Start from the page's current title, description and image" />
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
