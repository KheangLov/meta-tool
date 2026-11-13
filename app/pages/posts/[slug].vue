<script setup lang="ts">
const route = useRoute()
const api = useApi()
const slug = String(route.params.slug)

const studio = useStudio()
const post = ref<LocalPost | null>(null)
const restoring = ref(false)
const draft = reactive({ siteName: '', title: '', excerpt: '', body: '', cover: '', imageStyle: 'large' as 'large' | 'small', author: '', extra: {} as PreviewExtra, platforms: {} as PlatformOverrides })
const FIELDS = ['siteName', 'title', 'excerpt', 'body', 'cover', 'imageStyle', 'author'] as const
const theme = ref<'light' | 'dark'>('light')
const error = ref('')
const notice = ref('')
const saving = ref(false)
const making = ref(false)
const tgReady = ref(false)
const tgBot = ref(false)
const imageInfo = ref<{ width: number; height: number; error: boolean } | null>(null)
const { options: sendOpts, template: sendTemplate } = useSendSettings()
const sender = ref<{ updateAll: () => Promise<boolean>; count: number } | null>(null)
const autoRefresh = ref(true)
const copied = ref(false)
const links = ref<LinkMeta[]>([])
const sync = ref<{ run: (urls: string[]) => Promise<any[] | undefined>; running: boolean } | null>(null)
const fbReady = ref(false)
const fbPage = ref(false)
const fbAppId = ref('')
const app = ref<PreviewApp>('telegram')
const overrideTab = ref<Platform>('telegram')
const fbPanel = ref<{ refresh: () => Promise<boolean> } | null>(null)
const waImageBytes = ref(0)
const notice2 = ref('')

async function loadLinks() {
  try { links.value = await db().links.where('postSlug').equals(slug).toArray() } catch {}
}

/** Every URL that shows this post's preview: the post itself and each synced share link (plain + newest ?v=) */
const affectedUrls = computed(() => [
  url.value,
  ...(latestUrl.value !== url.value ? [latestUrl.value] : []),
  ...links.value.filter((l) => l.syncWithPost).flatMap((l) => [shareUrl(l, false), shareUrl(l)]),
])

function fill(p: Post) {
  for (const k of FIELDS) (draft as any)[k] = p[k]
  draft.extra = { ...(p.extra || {}) }
  draft.platforms = JSON.parse(JSON.stringify(p.platforms || {}))
}

onMounted(async () => {
  await loadPost()
  try {
    const h = await $fetch<{ telegram: boolean; telegramBot: boolean; facebook: boolean; facebookPage: boolean; facebookAppId: string }>('/api/health')
    tgReady.value = !!h.telegram
    tgBot.value = !!h.telegramBot
    fbReady.value = !!h.facebook
    fbPage.value = !!h.facebookPage
    fbAppId.value = h.facebookAppId || ''
  } catch {}
  loadLinks()
})

const dirty = computed(() => !!post.value && (
  FIELDS.some((k) => (draft as any)[k] !== post.value![k]) || JSON.stringify(draft.extra || {}) !== JSON.stringify(post.value.extra || {})
  || JSON.stringify(draft.platforms || {}) !== JSON.stringify(post.value.platforms || {})
))
const url = computed(() => postUrl(slug))
/** Newest versioned URL (what the tool sends, so Telegram always fetches the latest) */
const latestUrl = computed(() => postUrl(slug, post.value?.version))
const view = computed(() => mergeOverride(
  { siteName: draft.siteName, title: draft.title, description: draft.excerpt, image: draft.cover },
  draft.platforms[overrideKey(app.value)],
))
const mockPlain = computed(() => plainMessage(mockText.value))
watch(app, (a) => { overrideTab.value = overrideKey(a) })
function useWhatsAppImage(u: string) {
  draft.platforms = { ...draft.platforms, whatsapp: { ...(draft.platforms.whatsapp || {}), image: u } }
  app.value = 'whatsapp'
  notice2.value = 'WhatsApp now has its own smaller image. Click Save to publish it.'
}
const mockText = computed(() => renderMessage(sendTemplate.value, { url: latestUrl.value, title: draft.title, description: draft.excerpt }, sendOpts.value.parseMode === 'html'))

async function loadPost() {
  try {
    const p = await db().posts.get(slug)
    if (!p) throw new Error('This post isn\'t on this device.')
    post.value = p
    fill(p)
  } catch (e) { error.value = errMsg(e) }
}
async function restore() {
  restoring.value = true
  try { await studio.restoreFromPublished(); error.value = ''; await loadPost(); await loadLinks() }
  catch (e) { error.value = errMsg(e) }
  finally { restoring.value = false }
}
async function retryPublish() {
  if (!post.value) return
  post.value = (await studio.publish('post', post.value)).item as LocalPost
}
const pub = computed(() => publishLabel(post.value || undefined))

async function save() {
  saving.value = true
  error.value = notice.value = ''
  try {
    const out = await studio.savePost(slug, plain(draft))
    const res = { ...out.post, previewChanged: out.previewChanged, syncedLinks: out.syncedLinks }
    post.value = out.post
    fill(out.post)
    await loadLinks()
    if (!out.published) { error.value = `Saved on this device, but not published: ${out.publishError}`; return }
    if (!res.previewChanged) { notice.value = 'Published.'; return }
    const n = res.syncedLinks.length
    const linkNote = n ? ` ${n} share link${n > 1 ? 's were' : ' was'} updated too.` : ''
    if (autoRefresh.value && (tgReady.value || fbReady.value || sender.value?.count)) {
      notice.value = `Published.${linkNote} Updating apps…`
      saving.value = false
      const rows = tgReady.value ? await sync.value?.run(affectedUrls.value) : []
      const okRefresh = !rows || rows.every((r) => r.state === 'match' || r.state === 'unknown')
      const okSent = sender.value?.count ? await sender.value.updateAll() : true
      const okFb = fbReady.value ? await fbPanel.value?.refresh() !== false : true
      const done = [tgReady.value && 'Telegram', fbReady.value && 'Facebook & Messenger'].filter(Boolean).join(' and ') || 'Telegram'
      notice.value = okRefresh && okSent && okFb
        ? `Published.${linkNote} ${done} now show${done.includes(' and ') ? '' : 's'} the latest preview${sender.value?.count ? ', and your sent messages were updated' : ''}.`
        : `Published.${linkNote} Some updates didn't finish. See the details on the right.`
    } else {
      notice.value = `Published.${linkNote} Links already posted in Telegram keep their old preview until refreshed. The newest ?v= links below always show the latest.`
    }
  } catch (e) { error.value = errMsg(e) }
  finally { saving.value = false }
}

async function makeShareLink() {
  making.value = true
  error.value = ''
  try {
    const link = await studio.createLink({ targetUrl: url.value, postSlug: slug })
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
  try { await studio.deletePost(slug); await navigateTo('/posts') }
  catch (e) { error.value = errMsg(e) }
}
</script>

<template>
  <div v-if="!post && !error" class="muted">Loading…</div>
  <div v-else-if="!post" class="card">
    <p class="error">{{ error }}</p>
    <p class="muted small">Posts are kept in the browser you made them in. If you published it from another device, restore it from GitHub.</p>
    <div class="row"><button class="btn primary" :disabled="restoring" @click="restore">{{ restoring ? 'Restoring…' : 'Restore from GitHub' }}</button><NuxtLink to="/posts">← Back</NuxtLink></div>
  </div>

  <div v-else class="editor">
    <section class="card">
      <div class="row between">
        <h1>Edit post <code>/p/{{ post.slug }}</code> <span :class="`pub pub-${pub.kind}`" :title="post.publishError">{{ pub.text }}<button v-if="pub.kind === 'error' || pub.kind === 'warn'" class="linkbtn small" @click="retryPublish"> · retry</button></span></h1>
        <a class="btn sm ghost" :href="url" target="_blank">Open ↗</a>
      </div>

      <p class="whatis small">
        <b>{{ url.replace(/^https?:\/\//, '') }}</b> is this post's own page. Share it as it is, or make a short share link for it on the right.
      </p>
      <div v-if="post.publishError" class="puberr small">
        <b>Not published:</b> {{ post.publishError }}
        <button class="btn sm" @click="retryPublish">Retry</button>
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
        <ImageUpload @uploaded="draft.cover = $event" />
        <ImageCheck :url="draft.cover" />
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
      <PlatformOverridesForm
        v-model="draft.platforms" v-model:tab="overrideTab"
        :base="{ siteName: draft.siteName, title: draft.title, description: draft.excerpt, image: draft.cover }"
      />
      <PreviewExtras v-model="draft.extra" :image-size="imageInfo && !imageInfo.error ? imageInfo : null" />

      <label class="field">
        <span>Body <em>(blank line = new paragraph)</em></span>
        <textarea v-model="draft.body" class="input" rows="8" />
      </label>

      <div class="row actions">
        <button class="btn primary" :disabled="!dirty || saving" @click="save">{{ saving ? 'Publishing…' : dirty ? 'Save & publish' : 'Saved' }}</button>
        <button class="btn ghost" :disabled="!dirty" @click="fill(post)">Discard</button>
        <span class="grow" />
        <button class="btn danger ghost" @click="remove">Delete</button>
      </div>
      <label v-if="tgReady || tgBot || fbReady" class="check"><input v-model="autoRefresh" type="checkbox" /> Update apps automatically after saving (refresh Telegram &amp; Facebook, edit sent messages)</label>
      <p v-if="notice2 && dirty" class="notice">{{ notice2 }}</p>
      <p v-if="notice" class="notice">{{ notice }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </section>

    <section class="side">
      <div class="card">
        <div class="row between">
          <h2>Preview <span v-if="dirty" class="pill warn">unsaved</span></h2>
          <div class="seg sm">
            <button :class="{ on: theme === 'light' }" @click="theme = 'light'">Light</button>
            <button :class="{ on: theme === 'dark' }" @click="theme = 'dark'">Dark</button>
          </div>
        </div>
        <div class="seg sm apptabs">
          <button v-for="a in PREVIEW_APPS" :key="a.id" :class="{ on: app === a.id }" @click="app = a.id">
            {{ a.label }}<span v-if="draft.platforms[overrideKey(a.id)]" title="Has its own text or image"> •</span>
          </button>
        </div>
        <FacebookPreview v-if="app === 'facebook'" :theme="theme" :url="latestUrl" :title="view.title" :description="view.description" :image="view.image" :text="mockPlain.replace(latestUrl, '').trim()" :page-name="draft.siteName || 'Your Page'" />
        <MessengerPreview v-if="app === 'messenger'" :theme="theme" :url="latestUrl" :title="view.title" :description="view.description" :image="view.image" :text="mockPlain" />
        <WhatsAppPreview v-if="app === 'whatsapp'" :theme="theme" :url="latestUrl" :title="view.title" :description="view.description" :image="view.image" :text="mockPlain" :image-bytes="waImageBytes" />
        <TelegramPreview
          v-show="app === 'telegram'"
          :theme="theme" :url="latestUrl" :site-name="view.siteName" :title="view.title"
          :description="view.description" :image="view.image" :image-style="mockImageStyle(sendOpts.size, draft.imageStyle)"
          :text="mockText" :html="sendOpts.parseMode === 'html'" :position="sendOpts.position" :no-preview="sendOpts.disablePreview"
          :video="!!draft.extra.videoUrl" :duration="draft.extra.videoDuration" :audio="!!draft.extra.audioUrl"
          @image-info="imageInfo = $event"
        />
        <TelegramSend
          v-show="app === 'telegram'"
          ref="sender" v-model:options="sendOpts" v-model:template="sendTemplate"
          :owner="`post:${slug}`" :latest-url="latestUrl" :account="tgReady" :bot="tgBot" :dirty="dirty" :title="draft.title" :description="draft.excerpt"
        />
      </div>

      <div v-show="app === 'facebook' || app === 'messenger'" class="card">
        <FacebookPanel
          ref="fbPanel" :primary-url="latestUrl" :urls="affectedUrls" :owner="`post:${slug}`" :template="sendTemplate"
          :dirty="dirty" :connected="fbReady" :page-connected="fbPage" :app-id="fbAppId" :theme="theme" :title="draft.title" :description="draft.excerpt"
        />
      </div>

      <div v-show="app === 'whatsapp'" class="card">
        <WhatsAppPanel
          :primary-url="latestUrl" :image="view.image" :text="mockPlain" :has-override-image="!!draft.platforms.whatsapp?.image"
          @use-image="useWhatsAppImage" @image-bytes="waImageBytes = $event"
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
