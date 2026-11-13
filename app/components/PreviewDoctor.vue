<script setup lang="ts">
/**
 * "Preview not right?" Pick the app and what you see. The tool runs its checks (does the app's crawler get
 * the preview, is the image within the app's limits, did the app reach the link) and names the cause and the fix.
 */
type Symptom = 'none' | 'noimage' | 'small' | 'old' | 'wrong'
interface Issue { level: 'error' | 'warn'; text: string; fix?: string }
interface Result { id: string; label: string; level: string; status: number; ms: number; title: string; image: string; issues: Issue[] }
interface Visit { at: string; app: string; status: number; path: string }
interface Finding { state: 'bad' | 'good' | 'info'; title: string; text?: string; steps?: string[]; link?: { label: string; href: string } }

const props = defineProps<{ url: string; slug: string; kind: 'link' | 'post'; app?: string; dirty?: boolean; imageStyle?: 'large' | 'small' }>()
const api = useApi()

const APPS: { id: string; name: string; check: string; visits: string[]; phone?: boolean }[] = [
  { id: 'telegram', name: 'Telegram', check: 'telegram', visits: ['Telegram'] },
  { id: 'facebook', name: 'Facebook', check: 'facebook', visits: ['Facebook / Messenger'] },
  { id: 'messenger', name: 'Messenger', check: 'facebook', visits: ['Facebook / Messenger'] },
  { id: 'instagram', name: 'Instagram / Threads', check: 'facebook', visits: ['Facebook / Messenger', 'Meta (Instagram, Threads)'] },
  { id: 'whatsapp', name: 'WhatsApp', check: 'whatsapp', visits: ['WhatsApp'], phone: true },
  { id: 'x', name: 'X', check: 'x', visits: ['X'] },
  { id: 'linkedin', name: 'LinkedIn', check: 'linkedin', visits: ['LinkedIn'] },
  { id: 'discord', name: 'Discord', check: 'discord', visits: ['Discord'] },
  { id: 'slack', name: 'Slack', check: 'slack', visits: ['Slack'] },
  { id: 'imessage', name: 'iMessage', check: 'imessage', visits: ['iMessage'], phone: true },
]
const SYMPTOMS: { id: Symptom; label: string }[] = [
  { id: 'none', label: 'No preview, just the link' },
  { id: 'noimage', label: 'Preview has no image' },
  { id: 'small', label: 'Image is small' },
  { id: 'old', label: 'It shows an old version' },
  { id: 'wrong', label: 'It shows a different page' },
]
const FB_SAYS = [
  { id: 'ok', label: 'It shows my title and image', title: 'Facebook can read the link', text: 'The app was holding an older copy. Scrape Again just replaced it. Send the newest link to see it.' },
  { id: '403', label: 'Bad HTTP response code (403)', title: 'Vercel stopped Facebook before it reached this site', text: 'In Vercel → Firewall, turn off Bot Protection and Attack Challenge Mode, then press Scrape Again. If it still says 403, Vercel is blocking Facebook\'s servers for this project; other Vercel users report the same and it needs Vercel support or a different host for the share pages.' },
  { id: 'blocked', label: 'Community Standards / can\'t be shared', title: 'Facebook is blocking this address', text: 'Free shared addresses like *.vercel.app get flagged. Add your own domain in Vercel → Domains and share links from that domain.' },
  { id: 'noimg', label: 'Title is right, image is missing', title: 'Facebook couldn\'t use the image', text: 'It is under 200 × 200 px, over 8 MB, or couldn\'t be downloaded. Upload the image again here (a new address), publish and press Scrape Again.' },
  { id: 'other', label: 'It shows the target page', title: 'The target address was shared', text: 'Share the link from this tool (it starts with /s/ or /p/), not the page it opens.' },
]

const appId = ref(props.app && APPS.some((a) => a.id === props.app) ? props.app : 'facebook')
watch(() => props.app, (a) => { if (a && APPS.some((x) => x.id === a)) appId.value = a })
const symptom = ref<Symptom | ''>('')
const fbSays = ref('')
const busy = ref(false)
const error = ref('')
const result = ref<Result | null>(null)
const visits = ref<{ since: string; visits: Visit[] } | null>(null)

const cur = computed(() => APPS.find((a) => a.id === appId.value)!)
const guide = computed(() => APP_GUIDE.find((g) => g.id === appId.value))
const isFb = computed(() => cur.value.check === 'facebook')
const debuggerUrl = computed(() => `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(props.url)}`)
const time = (s: string) => new Date(s).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

async function run(s: Symptom) {
  symptom.value = s
  fbSays.value = ''
  busy.value = true
  error.value = ''
  result.value = null
  try {
    const [d, v] = await Promise.all([
      api<{ results: Result[] }>('/api/diagnose', { query: { url: props.url } }),
      api<{ since: string; visits: Visit[] }>('/api/visits', { query: { slug: props.slug, kind: props.kind } }).catch(() => null),
    ])
    result.value = d.results.find((r) => r.id === cur.value.check) || null
    visits.value = v
  } catch (e) { error.value = errMsg(e) }
  finally { busy.value = false }
}
watch(appId, () => { if (symptom.value) run(symptom.value) })

const refreshSteps = computed(() => guide.value?.refresh || ['Share the newest ?v= link'])

const findings = computed<Finding[]>(() => {
  const r = result.value
  const s = symptom.value
  if (!r || !s) return []
  const out: Finding[] = []
  const name = cur.value.name
  if (props.dirty) out.push({ state: 'bad', title: 'You have unpublished changes', text: 'Apps only see what is published. Tap Publish, then check again.' })

  // 1. Can the app's crawler read the link at all?
  const blocking = r.issues.filter((i) => i.level === 'error' && !i.text.startsWith('Image'))
  for (const i of blocking) out.push({ state: 'bad', title: i.text, text: i.fix })
  const imageIssues = r.issues.filter((i) => i.text.startsWith('Image') || /og:image/.test(i.text))
  const otherWarns = r.issues.filter((i) => i.level === 'warn' && !imageIssues.includes(i))
  if (!blocking.length) out.push({ state: 'good', title: `This site gives ${name} the preview`, text: r.title ? `"${r.title}"${r.image ? ', with an image' : ', without an image'}.` : undefined })

  // 2. Did the real app fetch it?
  const seen = visits.value?.visits.find((v) => cur.value.visits.includes(v.app))
  const reached = !!seen && seen.status === 200

  if (s === 'none') {
    if (seen) out.push({ state: reached ? 'good' : 'bad', title: reached ? `${name} fetched the link at ${time(seen.at)} and got the preview` : `${name} fetched the link at ${time(seen.at)} and got an error (${seen.status})`, text: reached ? `${name} has the right data, so it is showing a saved older copy.` : 'Publish the link, then share the newest link.', steps: reached ? refreshSteps.value : undefined })
    else if (!blocking.length) {
      out.push({ state: 'info', title: `${name} hasn't fetched this link${visits.value ? ` since ${time(visits.value.since)}` : ''}`, text: `If you shared it after that, ${name} never reached this site. Share the newest link once more, then press Check again.` })
      if (cur.value.phone) out.push({ state: 'info', title: `${name} makes the preview on the sender's phone`, steps: ['Wait a few seconds after pasting, before you send', 'Type the full link with https://', appId.value === 'whatsapp' ? 'In WhatsApp → Settings → Privacy → Advanced, turn off "Disable link previews"' : 'Try again on Wi-Fi: a slow connection gives a plain link'] })
      if (appId.value === 'telegram') out.push({ state: 'info', title: 'Check the message itself', steps: ['Tap the link while writing: Telegram lets the sender remove the preview', 'In the tool, the No preview option on the Message tab hides it'] })
      if (appId.value === 'slack') out.push({ state: 'info', title: 'Slack can hide previews', steps: ['A workspace admin can turn link previews off', 'Someone may have removed the preview from the message (the × on it)'] })
      if (appId.value === 'discord') out.push({ state: 'info', title: 'Discord can hide previews', steps: ['Only the first 5 links in a message get a preview', 'A link wrapped in < > gets none', 'The server may not give you the Embed Links permission'] })
    }
  }
  if (s === 'noimage' || s === 'small') {
    if (!r.image) out.push({ state: 'bad', title: 'No image is set', text: 'Add an image in the editor and publish.' })
    for (const i of imageIssues) out.push({ state: 'bad', title: i.text.replace(/^Image: /, ''), text: i.fix })
    if (s === 'small' && props.imageStyle === 'small' && ['telegram', 'x', 'discord', 'slack'].includes(appId.value)) out.push({ state: 'bad', title: 'Image size is set to Small thumbnail', text: `Switch it to Large in the editor. ${name} follows that setting.` })
    if (r.image && !imageIssues.length) out.push({ state: 'good', title: `The image is within ${name}'s limits`, text: `${name} is showing a saved older copy, or it saved the image by its address.`, steps: ['Upload the image again here, so it gets a new address', 'Publish', ...refreshSteps.value] })
  }
  if (s === 'old') out.push({ state: 'info', title: `${name} keeps the preview it saw first`, steps: refreshSteps.value })
  if (s === 'wrong') {
    const redirected = r.issues.find((i) => /redirected/.test(i.text))
    if (redirected) out.push({ state: 'bad', title: redirected.text })
    out.push({ state: 'info', title: 'Share the link from this tool', text: 'A preview you set here belongs to the short link. If you paste the address of the page it opens, the app shows that page\'s own preview.' })
  }
  for (const i of otherWarns) if (!/redirected/.test(i.text)) out.push({ state: 'info', title: i.text, text: i.fix })
  return out
})
const askFb = computed(() => isFb.value && !!result.value && (symptom.value === 'none' || symptom.value === 'noimage'))
const fbAnswer = computed(() => FB_SAYS.find((f) => f.id === fbSays.value))
const mark = { bad: '✕', good: '✓', info: 'i' }
</script>

<template>
  <div class="doc">
    <h2>Preview not right?</h2>
    <p class="muted small">Pick the app and what you see. The tool checks this link and tells you the cause.</p>

    <div class="q">Which app?</div>
    <div class="chips" role="radiogroup" aria-label="App">
      <button v-for="a in APPS" :key="a.id" role="radio" :aria-checked="appId === a.id" :class="{ on: appId === a.id }" @click="appId = a.id">{{ a.name }}</button>
    </div>

    <div class="q">What do you see in {{ cur.name }}?</div>
    <div class="chips col" role="radiogroup" aria-label="Problem">
      <button v-for="s in SYMPTOMS" :key="s.id" role="radio" :aria-checked="symptom === s.id" :class="{ on: symptom === s.id }" :disabled="busy" @click="run(s.id)">{{ s.label }}</button>
    </div>

    <p v-if="busy" class="muted small" aria-live="polite">Checking the link as {{ cur.name }}…</p>
    <p v-if="error" class="error small">{{ error }}</p>

    <div v-if="findings.length && !busy" class="found" aria-live="polite">
      <div v-for="(f, i) in findings" :key="i" class="f" :class="f.state">
        <span class="mark" aria-hidden="true">{{ mark[f.state] }}</span>
        <div>
          <b>{{ f.title }}</b>
          <p v-if="f.text" class="small">{{ f.text }}</p>
          <ol v-if="f.steps" class="small"><li v-for="x in f.steps" :key="x">{{ x }}</li></ol>
        </div>
      </div>

      <div v-if="askFb" class="ask">
        <div class="q">Last check, only Facebook can answer it</div>
        <p class="small">Open the Sharing Debugger, log in and press <i>Scrape Again</i>. {{ cur.name === 'Facebook' ? '' : `${cur.name} uses Facebook's saved copy. ` }}What does it say?</p>
        <SqBtn color="primary" variant="flat" size="small" :href="debuggerUrl" target="_blank" rel="noopener">Open Sharing Debugger</SqBtn>
        <div class="chips col" role="radiogroup" aria-label="Sharing Debugger result">
          <button v-for="o in FB_SAYS" :key="o.id" role="radio" :aria-checked="fbSays === o.id" :class="{ on: fbSays === o.id }" @click="fbSays = o.id">{{ o.label }}</button>
        </div>
        <div v-if="fbAnswer" class="f" :class="fbAnswer.id === 'ok' ? 'good' : 'bad'">
          <span class="mark" aria-hidden="true">{{ fbAnswer.id === 'ok' ? '✓' : '✕' }}</span>
          <div><b>{{ fbAnswer.title }}</b><p class="small">{{ fbAnswer.text }}</p></div>
        </div>
      </div>

      <SqBtn variant="text" size="small" @click="run(symptom as Symptom)">Check again</SqBtn>
    </div>
  </div>
</template>

<style scoped>
.doc { display: grid; gap: 8px; }
.doc h2 { margin: 0; }
.q { font-weight: 650; font-size: 14px; margin-top: 6px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chips.col { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
.chips button { font: inherit; font-size: 13.5px; font-weight: 600; min-height: 36px; padding: 6px 12px; border-radius: 10px; border: 1px solid var(--rule-strong); background: var(--surface); color: var(--ink); cursor: pointer; text-align: left; }
.chips button.on { border-color: var(--signal); background: var(--signal-soft); color: var(--signal); }
.chips button:disabled { opacity: .6; }
.chips button:focus-visible { outline: 2px solid var(--signal); outline-offset: 2px; }
.found { display: grid; gap: 8px; margin-top: 6px; }
.f { display: grid; grid-template-columns: 22px 1fr; gap: 10px; padding: 10px 12px; border-radius: var(--r-control); border: 1px solid var(--rule); background: var(--surface); }
.f p, .f ol { margin: 3px 0 0; }
.f ol { padding-left: 18px; display: grid; gap: 2px; }
.f.bad { border-color: color-mix(in srgb, var(--red) 45%, var(--rule)); background: var(--red-soft); }
.f.good { border-color: color-mix(in srgb, var(--live) 40%, var(--rule)); }
.mark { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 800; background: var(--raised); color: var(--muted); }
.f.bad .mark { background: var(--red); color: #fff; }
.f.good .mark { background: var(--live); color: #fff; }
.ask { display: grid; gap: 8px; padding: 12px; border-radius: var(--r-control); border: 1px dashed var(--rule-strong); }
.ask p { margin: 0; }
</style>
