<script setup lang="ts">
const route = useRoute()
const api = useApi()
const slug = String(route.params.slug)

const post = ref<Post | null>(null)
const draft = reactive({ siteName: '', title: '', excerpt: '', body: '', cover: '', imageStyle: 'large' as 'large' | 'small', author: '' })
const FIELDS = ['siteName', 'title', 'excerpt', 'body', 'cover', 'imageStyle', 'author'] as const
const theme = ref<'light' | 'dark'>('light')
const error = ref('')
const notice = ref('')
const saving = ref(false)
const making = ref(false)
const tgReady = ref(false)
const tgBusy = ref(false)
const tgMsg = ref('')
const copied = ref(false)

function fill(p: Post) { for (const k of FIELDS) (draft as any)[k] = p[k] }

onMounted(async () => {
  try { post.value = await api<Post>(`/api/posts/${slug}`); fill(post.value) }
  catch (e) { error.value = errMsg(e) }
  try { tgReady.value = !!(await $fetch<{ telegram: boolean }>('/api/health')).telegram } catch {}
})

const dirty = computed(() => !!post.value && FIELDS.some((k) => (draft as any)[k] !== post.value![k]))
const url = computed(() => postUrl(slug))

async function save() {
  saving.value = true
  error.value = notice.value = ''
  try {
    post.value = await api<Post>(`/api/posts/${slug}`, { method: 'PUT', body: { ...draft } })
    fill(post.value)
    notice.value = 'Saved. The page is updated. Refresh it in Telegram if you already shared it.'
  } catch (e) { error.value = errMsg(e) }
  finally { saving.value = false }
}

async function makeShareLink() {
  making.value = true
  error.value = ''
  try {
    const link = await api<LinkMeta>('/api/links', {
      method: 'POST',
      body: {
        targetUrl: url.value, importMeta: false,
        siteName: draft.siteName, title: draft.title, description: draft.excerpt,
        image: draft.cover, imageStyle: draft.imageStyle,
      },
    })
    await navigateTo(`/links/${link.slug}`)
  } catch (e) { error.value = errMsg(e) }
  finally { making.value = false }
}

async function refreshTelegram() {
  tgBusy.value = true
  tgMsg.value = ''
  try {
    const r = await api<{ results: { botReplies: string[] }[] }>('/api/telegram/refresh', { method: 'POST', body: { url: url.value } })
    tgMsg.value = '🤖 ' + (r.results[0]?.botReplies.join(' · ') || 'Sent to @WebpageBot')
  } catch (e) { tgMsg.value = errMsg(e) }
  finally { tgBusy.value = false }
}

async function copyUrl() {
  try { await navigator.clipboard.writeText(url.value); copied.value = true; setTimeout(() => (copied.value = false), 1500) } catch {}
}

async function remove() {
  if (!confirm(`Delete post /p/${slug}?`)) return
  try { await api(`/api/posts/${slug}`, { method: 'DELETE' }); await navigateTo('/posts') }
  catch (e) { error.value = errMsg(e) }
}
</script>

<template>
  <div v-if="!post && !error" class="muted">Loading…</div>
  <div v-else-if="!post" class="card"><p class="error">{{ error }}</p><NuxtLink to="/posts">← Back</NuxtLink></div>

  <div v-else class="editor">
    <section class="card">
      <div class="row between">
        <h1>Edit post <code>/p/{{ post.slug }}</code></h1>
        <a class="btn sm ghost" :href="url" target="_blank">Open ↗</a>
      </div>

      <label class="field">
        <span>Site name</span>
        <input v-model="draft.siteName" class="input" />
      </label>
      <label class="field">
        <span>Title <em class="count">{{ draft.title.length }}</em></span>
        <input v-model="draft.title" class="input" />
      </label>
      <label class="field">
        <span>Summary <em>(shown in the preview)</em> <em class="count">{{ draft.excerpt.length }}</em></span>
        <textarea v-model="draft.excerpt" class="input" rows="3" />
      </label>
      <div class="field">
        <span>Cover image</span>
        <div class="row">
          <input v-model="draft.cover" class="input grow" type="url" placeholder="https://…/cover-1200x630.jpg" />
          <TestImagePicker @pick="draft.cover = $event" />
        </div>
      </div>
      <div class="field">
        <span>Image style</span>
        <div class="seg">
          <button :class="{ on: draft.imageStyle === 'large' }" @click="draft.imageStyle = 'large'">Large image</button>
          <button :class="{ on: draft.imageStyle === 'small' }" @click="draft.imageStyle = 'small'">Small thumbnail</button>
        </div>
      </div>
      <label class="field">
        <span>Author</span>
        <input v-model="draft.author" class="input" />
      </label>
      <label class="field">
        <span>Body <em>(blank line = new paragraph)</em></span>
        <textarea v-model="draft.body" class="input" rows="8" />
      </label>

      <div class="row actions">
        <button class="btn primary" :disabled="!dirty || saving" @click="save">{{ saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved' }}</button>
        <button class="btn ghost" :disabled="!dirty" @click="fill(post)">Discard</button>
        <span class="grow" />
        <button class="btn danger ghost" @click="remove">Delete</button>
      </div>
      <p v-if="notice" class="notice">{{ notice }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </section>

    <section class="side">
      <div class="card">
        <div class="row between">
          <h2>Telegram preview <span v-if="dirty" class="pill warn">unsaved</span></h2>
          <div class="seg sm">
            <button :class="{ on: theme === 'light' }" @click="theme = 'light'">Light</button>
            <button :class="{ on: theme === 'dark' }" @click="theme = 'dark'">Dark</button>
          </div>
        </div>
        <TelegramPreview
          :theme="theme" :url="url" :site-name="draft.siteName" :title="draft.title"
          :description="draft.excerpt" :image="draft.cover" :image-style="draft.imageStyle"
        />
      </div>

      <div class="card">
        <h2>Share this post</h2>
        <div class="copyrow">
          <code>{{ url }}</code>
          <button class="btn sm" @click="copyUrl">{{ copied ? 'Copied ✓' : 'Copy' }}</button>
          <a class="btn sm ghost" :href="`https://t.me/share/url?url=${encodeURIComponent(url)}`" target="_blank">Share to Telegram</a>
        </div>
        <div class="copyrow">
          <button class="btn sm" :disabled="making" @click="makeShareLink">{{ making ? 'Creating…' : 'Create a share link for this post' }}</button>
          <button v-if="tgReady" class="btn sm ghost" :disabled="tgBusy || dirty" @click="refreshTelegram">{{ tgBusy ? 'Refreshing…' : 'Refresh in Telegram' }}</button>
        </div>
        <p v-if="tgMsg" class="small">{{ tgMsg }}</p>
        <p class="muted small">A share link (<code>/s/…</code>) lets you change the preview separately from the page, and adds <code>?v=</code> versions.</p>
      </div>
    </section>
  </div>
</template>
