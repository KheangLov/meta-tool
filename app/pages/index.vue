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
  <section class="card">
    <h1>New share link</h1>
    <p class="muted">
      You get a short link on this site. People who open it go to your target page. Telegram gets the preview you set here.
    </p>
    <form class="create" @submit.prevent="create">
      <label class="field grow">
        <span>Target URL</span>
        <input v-model="targetUrl" class="input" type="url" required placeholder="https://example.com/article" />
      </label>
      <label class="field">
        <span>Custom slug <em>(optional)</em></span>
        <input v-model="slug" class="input" placeholder="summer-sale" pattern="[A-Za-z0-9_\-]{3,64}" />
      </label>
      <button class="btn primary" :disabled="creating">{{ creating ? 'Creating…' : 'Create' }}</button>
    </form>
    <label class="check"><input v-model="importMeta" type="checkbox" /> Copy current title, description and image from the target page</label>
    <p v-if="error" class="error">{{ error }}</p>
  </section>

  <section>
    <h2 class="section-title">Your links</h2>
    <p v-if="loading" class="muted">Loading…</p>
    <p v-else-if="!links.length && !error" class="muted">No links on this device yet. Create one, or <NuxtLink to="/test-kit">restore what you published</NuxtLink>.</p>
    <div class="grid">
      <NuxtLink v-for="l in links" :key="l.slug" :to="`/links/${l.slug}`" class="link-card">
        <TelegramPreview
          compact
          :url="shareUrl(l)" :site-name="l.siteName" :title="l.title"
          :description="l.description" :image="l.image" :image-style="l.imageStyle"
        />
        <div class="link-card-foot">
          <code>/s/{{ l.slug }}</code>
          <span :class="`pub pub-${publishLabel(l).kind}`">{{ publishLabel(l).text }}</span>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>
