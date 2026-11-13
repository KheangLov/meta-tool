<script setup lang="ts">
interface ScrapeResult {
  ok: boolean; status: number; finalUrl: string; ms: number; error?: string
  tags: Record<string, string>
  resolved: { siteName: string; title: string; description: string; image: string }
}

const route = useRoute()
const api = useApi()
const slug = String(route.params.slug)

const studio = useStudio()
const link = ref<LocalLink | null>(null)
const restoring = ref(false)
const draft = reactive({ targetUrl: '', siteName: '', title: '', description: '', image: '', imageStyle: 'large' as 'large' | 'small', extra: {} as PreviewExtra, platforms: {} as PlatformOverrides })
const theme = ref<'light' | 'dark'>('light')
const error = ref('')
const notice = ref('')
const saving = ref(false)
const importing = ref(false)
const imageInfo = ref<{ width: number; height: number; error: boolean } | null>(null)

const checking = ref(false)
const seen = ref<ScrapeResult | null>(null)
const showTags = ref(false)
const copied = ref('')

interface TgPreview { state: 'ready' | 'pending' | 'empty' | 'none'; url?: string; siteName?: string; title?: string; description?: string; hasLargeMedia?: boolean; image?: string }

const tgReady = ref(false)
const tgBot = ref(false)
const fbReady = ref(false)
const fbPage = ref(false)
const fbAppId = ref('')
const app = ref<PreviewApp>('telegram')
const overrideTab = ref<Platform>('telegram')
const fbPanel = ref<{ refresh: () => Promise<boolean> } | null>(null)
const waImageBytes = ref(0)
const notice2 = ref('')
const { options: sendOpts, template: sendTemplate } = useSendSettings()
const sender = ref<{ updateAll: () => Promise<boolean>; count: number } | null>(null)
const autoRefresh = ref(true)
const withContent = ref(false)
const tgBusy = ref<'' | 'refresh' | 'cached'>('')
const tgError = ref('')
const sync = ref<{ run: (urls: string[], o?: { withContent?: boolean }) => Promise<any[] | undefined>; running: boolean } | null>(null)
const syncDraft = ref(false)
const tgCached = ref<TgPreview | null>(null)

onMounted(async () => {
  try {
    const h = await $fetch<{ telegram: boolean; telegramBot: boolean; facebook: boolean; facebookPage: boolean; facebookAppId: string }>('/api/health')
    tgReady.value = !!h.telegram
    tgBot.value = !!h.telegramBot
    fbReady.value = !!h.facebook
    fbPage.value = !!h.facebookPage
    fbAppId.value = h.facebookAppId || ''
  } catch {}
})

/** Links people may already have posted: the plain link and the current ?v= link */
const refreshUrls = computed(() => [...new Set([baseShare.value, currentShare.value])])

async function refreshTelegram() {
  tgBusy.value = 'refresh'
  tgError.value = ''
  tgCached.value = null
  try {
    const rows = await sync.value?.run(refreshUrls.value, { withContent: withContent.value })
    return !!rows?.every((r) => r.state === 'match' || r.state === 'unknown')
  } finally { tgBusy.value = '' }
}

// Turning on "keep in sync" immediately shows the post's preview in the editor
watch(syncDraft, async (on) => {
  if (!on || !link.value?.postSlug || link.value.syncWithPost) return
  try {
    const p = await db().posts.get(link.value.postSlug)
    if (!p) throw new Error('The post this link follows isn\'t on this device. Open Test kit → Restore.')
    Object.assign(draft, { siteName: p.siteName, title: p.title, description: p.excerpt, image: p.cover, imageStyle: p.imageStyle, extra: { ...(p.extra || {}) }, platforms: JSON.parse(JSON.stringify(p.platforms || {})) })
  } catch (e) { error.value = errMsg(e) }
})

async function loadCached() {
  tgBusy.value = 'cached'
  tgError.value = ''
  try { tgCached.value = await api<TgPreview>('/api/telegram/preview', { method: 'POST', body: { url: baseShare.value } }) }
  catch (e) { tgError.value = errMsg(e) }
  finally { tgBusy.value = '' }
}

const FIELDS = ['targetUrl', 'siteName', 'title', 'description', 'image', 'imageStyle'] as const

function fill(l: LinkMeta) {
  for (const k of FIELDS) (draft as any)[k] = l[k]
  draft.extra = { ...(l.extra || {}) }
  draft.platforms = JSON.parse(JSON.stringify(l.platforms || {}))
  syncDraft.value = !!l.syncWithPost
}

async function load() {
  try {
    const l = await db().links.get(slug)
    if (!l) throw new Error('This link isn\'t on this device.')
    link.value = l
    fill(l)
  } catch (e) { error.value = errMsg(e) }
}

/** Pull published links/posts from GitHub into this browser, then try again */
async function restore() {
  restoring.value = true
  try { await studio.restoreFromPublished(); error.value = ''; await load() }
  catch (e) { error.value = errMsg(e) }
  finally { restoring.value = false }
}

async function retryPublish() {
  if (!link.value) return
  const r = await studio.publish('link', link.value)
  link.value = r.item as LocalLink
}
const pub = computed(() => publishLabel(link.value || undefined))
onMounted(load)

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a || {}) === JSON.stringify(b || {})
const dirty = computed(() => !!link.value && (
  FIELDS.some((k) => (draft as any)[k] !== link.value![k]) || syncDraft.value !== !!link.value.syncWithPost || !sameJson(draft.extra, link.value.extra) || !sameJson(draft.platforms, link.value.platforms)
))

/** What the selected app will show (its overrides applied) */
const view = computed(() => mergeOverride(
  { siteName: draft.siteName, title: draft.title, description: draft.description, image: draft.image },
  draft.platforms[overrideKey(app.value)],
))
const mockPlain = computed(() => plainMessage(mockText.value))
watch(app, (a) => { overrideTab.value = overrideKey(a) })

function useWhatsAppImage(url: string) {
  draft.platforms = { ...draft.platforms, whatsapp: { ...(draft.platforms.whatsapp || {}), image: url } }
  app.value = 'whatsapp'
  notice2.value = 'WhatsApp now has its own smaller image. Click Save to publish it.'
}

const mockText = computed(() => renderMessage(sendTemplate.value, { url: currentShare.value, title: draft.title, description: draft.description }, sendOpts.value.parseMode === 'html'))
const currentShare = computed(() => (link.value ? shareUrl(link.value) : ''))
const baseShare = computed(() => (link.value ? shareUrl(link.value, false) : ''))

async function save() {
  saving.value = true
  error.value = notice.value = ''
  try {
    const out = await studio.saveLink(slug, { ...plain(draft), syncWithPost: syncDraft.value })
    const res = out.link
    link.value = res
    fill(res)
    seen.value = null
    if (!out.published) {
      error.value = `Saved on this device, but not published: ${out.publishError}`
      return
    }
    notice.value = out.previewChanged
      ? `Published version ${res.version}.` + (tgReady.value && autoRefresh.value ? ' Updating Telegram…' : ` New link with the latest preview: ${shareUrl(res)}`)
      : 'Published.'
    if (out.previewChanged && autoRefresh.value && (tgReady.value || fbReady.value || sender.value?.count)) {
      saving.value = false
      const okRefresh = tgReady.value ? await refreshTelegram() : true
      const okSent = sender.value?.count ? await sender.value.updateAll() : true
      const okFb = fbReady.value ? await fbPanel.value?.refresh() !== false : true
      const done = [tgReady.value && 'Telegram', fbReady.value && 'Facebook & Messenger'].filter(Boolean).join(' and ')
      notice.value = okRefresh && okSent && okFb
        ? `Published version ${res.version}. ${done || 'Telegram'} now show${done.includes(' and ') ? '' : 's'} the latest preview${sender.value?.count ? ', and your sent messages were updated' : ''}.`
        : `Published version ${res.version}. Some updates didn't finish. See the details on the right.`
    }
  } catch (e) { error.value = errMsg(e) }
  finally { saving.value = false }
}

async function importFromTarget() {
  importing.value = true
  error.value = ''
  try {
    const r = await api<ScrapeResult>('/api/inspect', { query: { url: draft.targetUrl } })
    if (!r.ok) throw new Error(r.error || `Target page answered with HTTP ${r.status}`)
    Object.assign(draft, r.resolved)
    notice.value = 'Imported from the target page. Review it, then save.'
  } catch (e) { error.value = errMsg(e) }
  finally { importing.value = false }
}

async function checkTelegram() {
  checking.value = true
  try { seen.value = await api<ScrapeResult>('/api/inspect', { query: { url: currentShare.value } }) }
  catch (e) { error.value = errMsg(e) }
  finally { checking.value = false }
}

async function copy(text: string, what: string) {
  try { await navigator.clipboard.writeText(text); copied.value = what; setTimeout(() => (copied.value = ''), 1500) } catch {}
}

async function remove() {
  if (!confirm(`Delete /s/${slug}? The short link will stop working.`)) return
  try { await studio.deleteLink(slug); await navigateTo('/') }
  catch (e) { error.value = errMsg(e) }
}

const tgShare = computed(() => `https://t.me/share/url?url=${encodeURIComponent(currentShare.value)}`)

const imageWarning = computed(() => {
  const i = imageInfo.value
  if (!draft.image || !i) return ''
  if (i.error) return 'The image could not be loaded. Use a public https URL that opens without logging in.'
  if (draft.imageStyle === 'large' && (i.width < 300 || i.width / i.height < 1))
    return `Image is ${i.width}×${i.height}. Telegram usually shows small or tall images as a thumbnail. Use about 1200×630 for a large preview.`
  return `Image ${i.width}×${i.height}`
})
</script>

<template>
  <div v-if="!link && !error" class="muted">Loading…</div>
  <div v-else-if="!link" class="card">
    <p class="error">{{ error }}</p>
    <p class="muted small">Links are kept in the browser you made them in. If you published it from another device, restore it from GitHub.</p>
    <div class="row"><button class="btn primary" :disabled="restoring" @click="restore">{{ restoring ? 'Restoring…' : 'Restore from GitHub' }}</button><NuxtLink to="/">← Back</NuxtLink></div>
  </div>

  <div v-else class="editor">
    <!-- LEFT: form -->
    <section class="card">
      <div class="row between">
        <h1>Edit <code>/s/{{ link.slug }}</code></h1>
        <span :class="`pub pub-${pub.kind}`" :title="link.publishError">{{ pub.text }}<button v-if="pub.kind === 'error' || pub.kind === 'warn'" class="linkbtn small" @click="retryPublish"> · retry</button></span>
      </div>

      <label class="field">
        <span>Target URL <em>(where people land)</em></span>
        <div class="row">
          <input v-model="draft.targetUrl" class="input grow" type="url" />
          <button class="btn ghost" :disabled="importing || syncDraft" @click="importFromTarget">{{ importing ? 'Importing…' : 'Import meta' }}</button>
        </div>
      </label>

      <div v-if="link.postSlug" class="syncbox">
        <label class="check"><input v-model="syncDraft" type="checkbox" /> Keep in sync with post <NuxtLink :to="`/posts/${link.postSlug}`"><code>/p/{{ link.postSlug }}</code></NuxtLink></label>
        <p v-if="syncDraft" class="muted small">This link copies the post's title, summary and image. Edit the post, and this link updates automatically. Untick to give the link its own preview.</p>
      </div>

      <fieldset class="plain" :disabled="syncDraft">
      <label class="field">
        <span>Site name <em class="count">{{ draft.siteName.length }}</em></span>
        <input v-model="draft.siteName" class="input" placeholder="My Shop" />
      </label>

      <label class="field">
        <span>Title <em class="count" :class="{ over: draft.title.length > 90 }">{{ draft.title.length }}</em></span>
        <input v-model="draft.title" class="input" placeholder="Headline shown in bold" />
      </label>

      <label class="field">
        <span>Description <em class="count" :class="{ over: draft.description.length > 300 }">{{ draft.description.length }}</em></span>
        <textarea v-model="draft.description" class="input" rows="4" placeholder="A sentence or two" />
      </label>

      <div class="field">
        <span>Image URL</span>
        <div class="row">
          <input v-model="draft.image" class="input grow" type="url" placeholder="https://…/cover-1200x630.jpg" />
          <TestImagePicker @pick="draft.image = $event" />
        </div>
        <ImageUpload @uploaded="draft.image = $event" />
        <small v-if="imageWarning && imageInfo?.error" class="hint warn">{{ imageWarning }}</small>
        <ImageCheck :url="draft.image" />
      </div>

      <div class="field">
        <span>Image style</span>
        <div class="seg">
          <button :class="{ on: draft.imageStyle === 'large' }" @click="draft.imageStyle = 'large'">Large image</button>
          <button :class="{ on: draft.imageStyle === 'small' }" @click="draft.imageStyle = 'small'">Small thumbnail</button>
        </div>
      </div>

      <PlatformOverridesForm
        v-model="draft.platforms" v-model:tab="overrideTab"
        :base="{ siteName: draft.siteName, title: draft.title, description: draft.description, image: draft.image }"
      />
      <PreviewExtras v-model="draft.extra" :image-size="imageInfo && !imageInfo.error ? imageInfo : null" />
      </fieldset>

      <div class="row actions">
        <button class="btn primary" :disabled="!dirty || saving" @click="save">{{ saving ? 'Publishing…' : dirty ? 'Save & publish' : 'Saved' }}</button>
        <button class="btn ghost" :disabled="!dirty" @click="fill(link)">Discard</button>
        <span class="grow" />
        <button class="btn danger ghost" @click="remove">Delete</button>
      </div>
      <label v-if="tgReady || tgBot || fbReady" class="check"><input v-model="autoRefresh" type="checkbox" /> Update apps automatically after saving (refresh Telegram &amp; Facebook, edit sent messages)</label>
      <p v-if="notice2 && dirty" class="notice">{{ notice2 }}</p>
      <p v-if="notice" class="notice">{{ notice }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </section>

    <!-- RIGHT: preview + publish -->
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
        <TelegramPreview
          v-show="app === 'telegram'"
          :theme="theme" :url="currentShare"
          :site-name="view.siteName" :title="view.title" :description="view.description"
          :image="view.image" :image-style="mockImageStyle(sendOpts.size, draft.imageStyle)"
          :text="mockText" :html="sendOpts.parseMode === 'html'" :position="sendOpts.position" :no-preview="sendOpts.disablePreview"
          :video="!!draft.extra.videoUrl" :duration="draft.extra.videoDuration" :audio="!!draft.extra.audioUrl"
          @image-info="imageInfo = $event"
        />
        <FacebookPreview v-if="app === 'facebook'" :theme="theme" :url="currentShare" :title="view.title" :description="view.description" :image="view.image" :text="mockPlain.replace(currentShare, '').trim()" />
        <MessengerPreview v-if="app === 'messenger'" :theme="theme" :url="currentShare" :title="view.title" :description="view.description" :image="view.image" :text="mockPlain" />
        <WhatsAppPreview v-if="app === 'whatsapp'" :theme="theme" :url="currentShare" :title="view.title" :description="view.description" :image="view.image" :text="mockPlain" :image-bytes="waImageBytes" />
        <p class="muted small">A close copy of each app's layout. The apps make the final choice, for example showing a large image as a small thumbnail.</p>
        <TelegramSend
          v-show="app === 'telegram'"
          ref="sender" v-model:options="sendOpts" v-model:template="sendTemplate"
          :owner="`link:${link.slug}`" :latest-url="currentShare" :account="tgReady" :bot="tgBot" :dirty="dirty" :title="draft.title" :description="draft.description"
        />
      </div>

      <div v-show="app === 'facebook' || app === 'messenger'" class="card">
        <FacebookPanel
          ref="fbPanel" :primary-url="currentShare" :urls="refreshUrls" :owner="`link:${link.slug}`" :template="sendTemplate"
          :dirty="dirty" :connected="fbReady" :page-connected="fbPage" :app-id="fbAppId" :theme="theme" :title="draft.title" :description="draft.description"
        />
      </div>

      <div v-show="app === 'whatsapp'" class="card">
        <WhatsAppPanel
          :primary-url="currentShare" :image="view.image" :text="mockPlain" :has-override-image="!!draft.platforms.whatsapp?.image" :locked-to="syncDraft ? link.postSlug : undefined"
          @use-image="useWhatsAppImage" @image-bytes="waImageBytes = $event"
        />
      </div>

      <div v-show="app === 'telegram'" class="card">
        <h2>Update in Telegram</h2>
        <p class="muted small">Telegram saves a link's preview the first time anyone posts it. Saving here changes what your server sends, but Telegram keeps the old preview until you do one of these:</p>

        <div class="step">
          <b>A. Post the new versioned link</b> <span class="muted small">(works right away)</span>
          <div class="copyrow">
            <code>{{ currentShare }}</code>
            <button class="btn sm" @click="copy(currentShare, 'v')">{{ copied === 'v' ? 'Copied ✓' : 'Copy' }}</button>
            <a class="btn sm ghost" :href="tgShare" target="_blank">Share to Telegram</a>
          </div>
          <p class="muted small">Every saved change adds a new <code>?v=</code> number. Telegram sees it as a new link and reads the preview again.</p>
        </div>

        <div class="step">
          <b>B. Refresh a link you already posted</b>
          <template v-if="tgReady">
            <p class="muted small">Sends your links to Telegram's official @WebpageBot, then checks that Telegram shows what you saved. If it doesn't, the tool presses "Update with content" and checks again.</p>
            <div class="copyrow">
              <button class="btn sm primary" :disabled="!!tgBusy || dirty" @click="refreshTelegram">
                {{ tgBusy === 'refresh' ? 'Updating…' : 'Refresh in Telegram' }}
              </button>
              <button class="btn sm ghost" :disabled="!!tgBusy" @click="loadCached">
                {{ tgBusy === 'cached' ? 'Loading…' : "Show Telegram's saved preview" }}
              </button>
            </div>
            <label class="check"><input v-model="withContent" type="checkbox" /> Also press "Update with content" (use this if the image or description stays old)</label>
            <p v-if="dirty" class="muted small">Save your changes first.</p>
            <p v-if="tgError" class="error small">{{ tgError }}</p>

            <TelegramSync ref="sync" :theme="theme" />

            <div v-if="tgCached" class="tgresult">
              <div class="small muted">Saved in Telegram right now for <code>{{ baseShare }}</code></div>
              <TgRealPreview :preview="tgCached" :url="baseShare" :theme="theme" />
            </div>
          </template>
          <template v-else>
            <ol class="small">
              <li>Open <a href="https://t.me/WebpageBot" target="_blank">@WebpageBot</a> and press Start.</li>
              <li>Send it the exact link you posted, for example
                <button class="linkbtn" @click="copy(baseShare, 'b')">{{ copied === 'b' ? 'copied ✓' : baseShare }}</button>
              </li>
              <li>If it still looks old, tap <i>Update with content</i>.</li>
            </ol>
            <p class="muted small">💡 Connect a Telegram account (see README → "Connect Telegram") to do this from here with one click.</p>
          </template>
        </div>

        <div class="step">
          <div class="row between">
            <b>Check what Telegram's crawler sees</b>
            <button class="btn sm" :disabled="checking" @click="checkTelegram">{{ checking ? 'Checking…' : 'Check live' }}</button>
          </div>
          <template v-if="seen">
            <p class="small" :class="seen.ok ? 'ok' : 'error'">
              HTTP {{ seen.status || '—' }} · {{ seen.ms }} ms<span v-if="seen.error"> · {{ seen.error }}</span>
            </p>
            <TelegramPreview
              compact :theme="theme" :url="currentShare"
              :site-name="seen.resolved.siteName" :title="seen.resolved.title"
              :description="seen.resolved.description" :image="seen.resolved.image"
              :image-style="seen.tags['twitter:card'] === 'summary' ? 'small' : 'large'"
            />
            <button class="linkbtn small" @click="showTags = !showTags">{{ showTags ? 'Hide' : 'Show' }} raw meta tags</button>
            <table v-if="showTags" class="tags">
              <tr v-for="(v, k) in seen.tags" :key="k"><td>{{ k }}</td><td>{{ v }}</td></tr>
            </table>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>
