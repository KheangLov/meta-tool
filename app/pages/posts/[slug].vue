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
const autoRefresh = ref(true)
const copied = ref(false)
const links = ref<LinkMeta[]>([])
const sync = ref<{ run: (urls: string[]) => Promise<any[] | undefined>; running: boolean } | null>(null)

async function loadLinks() {
  try { links.value = await api<LinkMeta[]>('/api/links', { query: { postSlug: slug } }) } catch {}
}

/** Every URL that shows this post's preview: the post itself and each synced share link (plain + newest ?v=) */
const affectedUrls = computed(() => [
  url.value,
  ...links.value.filter((l) => l.syncWithPost).flatMap((l) => [shareUrl(l, false), shareUrl(l)]),
])

function fill(p: Post) { for (const k of FIELDS) (draft as any)[k] = p[k] }

onMounted(async () => {
  try { post.value = await api<Post>(`/api/posts/${slug}`); fill(post.value) }
  catch (e) { error.value = errMsg(e) }
  try { tgReady.value = !!(await $fetch<{ telegram: boolean }>('/api/health')).telegram } catch {}
  loadLinks()
})

const dirty = computed(() => !!post.value && FIELDS.some((k) => (draft as any)[k] !== post.value![k]))
const url = computed(() => postUrl(slug))

async function save() {
  saving.value = true
  error.value = notice.value = ''
  try {
    const res = await api<Post & { previewChanged: boolean; syncedLinks: LinkMeta[] }>(`/api/posts/${slug}`, { method: 'PUT', body: { ...draft } })
    post.value = res
    fill(res)
    await loadLinks()
    if (!res.previewChanged) { notice.value = 'Saved.'; return }
    const n = res.syncedLinks.length
    const linkNote = n ? ` ${n} share link${n > 1 ? 's were' : ' was'} updated too.` : ''
    if (tgReady.value && autoRefresh.value) {
      notice.value = `Saved.${linkNote} Updating Telegram…`
      saving.value = false
      const rows = await sync.value?.run(affectedUrls.value)
      const ok = !!rows?.every((r) => r.state === 'match' || r.state === 'unknown')
      notice.value = ok ? `Saved.${linkNote} Telegram now shows the latest preview.` : `Saved.${linkNote} Telegram may still show the old preview for some links. See below.`
    } else {
      notice.value = `Saved.${linkNote} Links already posted in Telegram keep their old preview until refreshed. The newest ?v= links below always show the latest.`
    }
  } catch (e) { error.value = errMsg(e) }
  finally { saving.value = false }
}

async function makeShareLink() {
  making.value = true
  error.value = ''
  try {
    const link = await api<LinkMeta>('/api/links', {
      method: 'POST',
      body: { targetUrl: url.value, postSlug: slug, syncWithPost: true },
    })
    await navigateTo(`/links/${link.slug}`)
  } catch (e) { error.value = errMsg(e) }
  finally { making.value = false }
}

function refreshTelegram() {
  return sync.value?.run(affectedUrls.value)
}

const copiedText = ref('')
async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t); copiedText.value = t; setTimeout(() => (copiedText.value = ''), 1500) } catch {}
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
      <label v-if="tgReady" class="check"><input v-model="autoRefresh" type="checkbox" /> Refresh Telegram automatically after saving</label>
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
          <button v-if="tgReady" class="btn sm ghost" :disabled="!!sync?.running || dirty" @click="refreshTelegram">{{ sync?.running ? 'Updating…' : 'Refresh in Telegram' }}</button>
        </div>
        <p class="muted small">Share links made here stay in sync: saving the post updates them and gives each a new <code>?v=</code> version.</p>

        <div v-if="links.length" class="linked">
          <div class="small muted">Share links for this post</div>
          <div v-for="l in links" :key="l.slug" class="linkedrow small">
            <NuxtLink :to="`/links/${l.slug}`"><code>/s/{{ l.slug }}</code></NuxtLink>
            <span class="pill">{{ l.syncWithPost ? 'synced' : 'own preview' }}</span>
            <span class="grow" />
            <code class="muted">v{{ l.version }}</code>
            <button class="linkbtn" @click="copyText(shareUrl(l))">{{ copiedText === shareUrl(l) ? 'copied ✓' : 'copy newest' }}</button>
          </div>
        </div>

        <TelegramSync ref="sync" :theme="theme" />
      </div>
    </section>
  </div>
</template>
