<script setup lang="ts">
const route = useRoute()
const api = useApi()
const slug = String(route.params.slug)

const studio = useStudio()
const mview = ref<'edit' | 'preview' | 'share'>('edit')
const panel = ref<'send' | 'update' | 'check'>('send')
const post = ref<LocalPost | null>(null)
const restoring = ref(false)
const draft = reactive({ siteName: '', title: '', excerpt: '', body: '', cover: '', imageStyle: 'large' as 'large' | 'small', author: '', extra: {} as PreviewExtra, platforms: {} as PlatformOverrides })
const FIELDS = ['siteName', 'title', 'excerpt', 'body', 'cover', 'imageStyle', 'author'] as const
// Mock previews start in the same light/dark as the tool
const theme = ref<'light' | 'dark'>(useColorMode().isDark.value ? 'dark' : 'light')
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
const notes = computed(() => appNotes(app.value, view.value, { imageStyle: draft.imageStyle, themeColor: draft.extra.themeColor, author: draft.extra.author || draft.author, waBytes: waImageBytes.value }))
function setBase(k: 'siteName' | 'title' | 'description' | 'image', v: string) {
  if (k === 'description') draft.excerpt = v
  else if (k === 'image') draft.cover = v
  else draft[k] = v
}
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
    <h1>Post not on this device</h1>
    <p class="muted">{{ error }} Posts are kept in the browser you made them in. If you published it from another device, restore it from GitHub.</p>
    <div class="row wrap"><SqBtn color="primary" variant="flat" :disabled="restoring" @click="restore">{{ restoring ? 'Restoring…' : 'Restore from GitHub' }}</SqBtn><SqBtn variant="text" to="/posts">Back to posts</SqBtn></div>
  </div>

  <div v-else class="editor" :class="`show-${mview}`">
    <header class="ed-head">
      <div class="grow">
        <NuxtLink to="/posts" class="ed-back">‹ Posts</NuxtLink>
        <h1>{{ draft.title || post.slug }}</h1>
        <div class="ed-share">
          <code>{{ url.replace(/^https?:\/\//, '') }}</code>
          <SqBtn variant="text" size="small" @click="copyUrl">{{ copied ? 'Copied' : 'Copy link' }}</SqBtn>
          <SqBtn variant="text" size="small" :href="url" target="_blank" rel="noopener">Open page</SqBtn>
          <span :class="`pub pub-${pub.kind}`" :title="post.publishError">{{ pub.text }}</span>
        </div>
      </div>
      <SqBtn color="error" variant="text" size="small" @click="remove">Delete</SqBtn>
    </header>

    <div class="ed-switch">
      <SqTabs
        :model-value="mview" variant="segmented" grow
        :items="[{ title: 'Edit', value: 'edit', icon: 'edit' }, { title: dirty ? 'Preview •' : 'Preview', value: 'preview', icon: 'eye' }, { title: 'Share', value: 'share', icon: 'lps:send' }]"
        @update:model-value="(v: string | number) => (mview = v as typeof mview)"
      />
    </div>

    <section class="ed-form">
      <LiveDock v-model:app="app" :platforms="draft.platforms" :notes="notes">
        <AppPreview :app="app" :theme="theme" :url="latestUrl" :view="view" :image-style="draft.imageStyle" :text="mockText" :plain="mockPlain" :extra="draft.extra" :author="draft.extra.author || draft.author" :wa-bytes="waImageBytes" :send="sendOpts" />
      </LiveDock>
      <div v-if="post.publishError" class="group">
        <SqAlert type="error" variant="tonal" title="Not published" :text="post.publishError">
          <template #append><SqBtn variant="text" color="error" size="small" @click="retryPublish">Retry</SqBtn></template>
        </SqAlert>
      </div>

      <ScopedFields
        v-model:platforms="draft.platforms" v-model:app="app" v-model:extra="draft.extra" v-model:image-style="draft.imageStyle"
        :base="{ siteName: draft.siteName, title: draft.title, description: draft.excerpt, image: draft.cover }"
        description-label="Summary" image-label="Cover image" :notes="notes"
        @base="setBase"
      />

      <div class="group">
        <h3>The page</h3>
        <div class="fields">
          <AppField v-model="draft.author" label="Author" />
          <AppField v-model="draft.body" multiline label="Body" hint="Leave a blank line between paragraphs" :rows="8" />
        </div>
      </div>

      <div class="group">
        <PreviewExtras v-model="draft.extra" :image-size="imageInfo && !imageInfo.error ? imageInfo : null" />
      </div>
    </section>

    <aside class="ed-side">
      <div class="stage">
        <div class="stage-top">
          <div class="seg sm apptabs" role="tablist" aria-label="App">
            <button v-for="a in PREVIEW_APPS" :key="a.id" :class="{ on: app === a.id }" @click="app = a.id">
              {{ a.label }}<span v-if="draft.platforms[overrideKey(a.id)]" title="Has its own text or image"> •</span>
            </button>
          </div>
          <div class="seg sm" aria-label="Theme">
            <button :class="{ on: theme === 'light' }" @click="theme = 'light'">Light</button>
            <button :class="{ on: theme === 'dark' }" @click="theme = 'dark'">Dark</button>
          </div>
        </div>
        <FacebookPreview v-if="app === 'facebook'" :theme="theme" :url="latestUrl" :title="view.title" :description="view.description" :image="view.image" :text="mockPlain.replace(latestUrl, '').trim()" :page-name="draft.siteName || 'Your Page'" />
        <MessengerPreview v-if="app === 'messenger'" :theme="theme" :url="latestUrl" :title="view.title" :description="view.description" :image="view.image" :text="mockPlain" />
        <WhatsAppPreview v-if="app === 'whatsapp'" :theme="theme" :url="latestUrl" :title="view.title" :description="view.description" :image="view.image" :text="mockPlain" :image-bytes="waImageBytes" />
        <LinkedInPreview v-if="app === 'linkedin'" :theme="theme" :url="latestUrl" :title="view.title" :image="view.image" :text="mockPlain" />
        <DiscordPreview v-if="app === 'discord'" :theme="theme" :url="latestUrl" :site-name="view.siteName" :title="view.title" :description="view.description" :image="view.image" :image-style="draft.imageStyle" :theme-color="draft.extra.themeColor" />
        <SlackPreview v-if="app === 'slack'" :theme="theme" :url="latestUrl" :site-name="view.siteName" :title="view.title" :description="view.description" :image="view.image" :image-style="draft.imageStyle" :author="draft.extra.author || draft.author" />
        <TelegramPreview
          v-show="app === 'telegram'"
          :theme="theme" :url="latestUrl" :site-name="view.siteName" :title="view.title"
          :description="view.description" :image="view.image" :image-style="mockImageStyle(sendOpts.size, draft.imageStyle)"
          :text="mockText" :html="sendOpts.parseMode === 'html'" :position="sendOpts.position" :no-preview="sendOpts.disablePreview"
          :video="!!draft.extra.videoUrl" :duration="draft.extra.videoDuration" :audio="!!draft.extra.audioUrl"
          @image-info="imageInfo = $event"
        />
        <div v-if="notes.length" class="stage-notes"><span v-for="n in notes" :key="n.text" :class="n.level">{{ n.text }}</span></div>
        <p class="stage-note">A close copy of the app's layout<span v-if="dirty">, showing your unsaved changes</span>. The app makes the final call, such as shrinking an image to a thumbnail.</p>
      </div>

      <div class="panels">
        <div class="panel-body sharebox">
          <ShareToApps :url="latestUrl" :title="draft.title" :fb-app-id="fbAppId" :dirty="dirty" />
        </div>
        <div class="panel-tabs" role="tablist">
          <button :class="{ on: panel === 'send' }" @click="panel = 'send'">Message</button>
          <button :class="{ on: panel === 'update' }" @click="panel = 'update'">Update apps</button>
          <button :class="{ on: panel === 'check' }" @click="panel = 'check'">Check</button>
        </div>

        <div v-show="panel === 'send'" class="panel-body">
          <div class="step" style="padding-top:0">
            <h3>Short links for this post</h3>
            <div class="copyrow">
              <SqBtn variant="tonal" size="small" :disabled="making" @click="makeShareLink">{{ making ? 'Creating…' : 'Make a short link' }}</SqBtn>
              <SqBtn variant="text" size="small" :href="`https://t.me/share/url?url=${encodeURIComponent(latestUrl)}`" target="_blank" rel="noopener">Open Telegram</SqBtn>
            </div>
            <div v-if="links.length" class="linked">
              <div v-for="l in links" :key="l.slug" class="linkedrow small">
                <NuxtLink :to="`/links/${l.slug}`"><code>/s/{{ l.slug }}</code></NuxtLink>
                <span class="pill">{{ l.syncWithPost ? 'follows this post' : 'own preview' }}</span>
                <span class="grow" />
                <button class="linkbtn" @click="copyText(shareUrl(l))">{{ copiedText === shareUrl(l) ? 'copied' : 'copy newest' }}</button>
              </div>
            </div>
            <p class="muted small">Short links that follow this post get its new preview, and a new <code>?v=</code>, every time you publish.</p>
          </div>
          <TelegramSend
            ref="sender" v-model:options="sendOpts" v-model:template="sendTemplate"
            :owner="`post:${slug}`" :latest-url="latestUrl" :account="tgReady" :bot="tgBot" :dirty="dirty" :title="draft.title" :description="draft.excerpt"
          />
        </div>

        <div v-show="panel === 'update'" class="panel-body">
          <SqSwitch v-if="tgReady || tgBot || fbReady" v-model="autoRefresh" inset class="mb" label="Update apps automatically each time I publish" />
          <div class="seg sm" style="margin-bottom:12px">
            <button v-for="a in PREVIEW_APPS" :key="a.id" :class="{ on: app === a.id }" @click="app = a.id">{{ a.label }}</button>
          </div>
          <AppGuide :only="app" class="mb" />
          <div v-show="app === 'telegram'">
            <h2>Update in Telegram</h2>
            <template v-if="tgReady">
              <p class="muted small">Refreshes this post and its short links through @WebpageBot, then checks what Telegram shows.</p>
              <SqBtn color="primary" variant="flat" size="small" :disabled="!!sync?.running || dirty" @click="refreshTelegram">{{ sync?.running ? 'Updating…' : 'Refresh in Telegram' }}</SqBtn>
            </template>
            <p v-else class="muted small">Share the newest link (each publish makes one), or send the link to <a href="https://t.me/WebpageBot" target="_blank" rel="noopener">@WebpageBot</a>. Connect a Telegram account (see the README) to refresh from here.</p>
            <TelegramSync ref="sync" :theme="theme" />
          </div>
          <div v-show="app === 'facebook' || app === 'messenger'">
            <FacebookPanel
              ref="fbPanel" :primary-url="latestUrl" :urls="affectedUrls" :owner="`post:${slug}`" :template="sendTemplate"
              :dirty="dirty" :connected="fbReady" :page-connected="fbPage" :app-id="fbAppId" :theme="theme" :title="draft.title" :description="draft.excerpt"
            />
          </div>
          <OtherAppPanel v-if="app === 'linkedin' || app === 'discord' || app === 'slack'" :app="app" :primary-url="latestUrl" :dirty="dirty" />

          <div v-show="app === 'whatsapp'">
            <WhatsAppPanel
              :primary-url="latestUrl" :image="view.image" :text="mockPlain" :has-override-image="!!draft.platforms.whatsapp?.image"
              @use-image="useWhatsAppImage" @image-bytes="waImageBytes = $event"
            />
          </div>
        </div>

        <div v-show="panel === 'check'" class="panel-body">
          <PreviewDoctor :url="latestUrl" :slug="slug" kind="post" :app="app" :dirty="dirty" :image-style="draft.imageStyle" />
          <div class="step"><AppsCheck :url="latestUrl" /></div>
          <AppVisits :slug="slug" kind="post" />
        </div>
      </div>
    </aside>

    <div class="savebar" :class="{ idle: !dirty && !saving && !notice && !error }">
      <div class="msg" aria-live="polite">
        <span v-if="error" class="error">{{ error }}</span>
        <span v-else-if="notice">{{ notice }}</span>
        <span v-else-if="notice2 && dirty">{{ notice2 }}</span>
        <span v-else-if="dirty" class="quiet">Unpublished changes</span>
        <span v-else class="quiet">Everything is published.</span>
      </div>
      <SqBtn variant="text" :disabled="!dirty || saving" @click="fill(post)">Discard</SqBtn>
      <SqBtn color="primary" variant="flat" :disabled="!dirty || saving" @click="save">{{ saving ? 'Publishing…' : 'Publish' }}</SqBtn>
    </div>
  </div>
</template>
