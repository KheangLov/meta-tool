<script setup lang="ts">
/**
 * Message & preview options + "Send to Telegram" + list of messages this tool sent (which it can update later).
 * The options and text are v-models so the editor's Telegram mock shows exactly what will be sent.
 */
interface SendOptions { size: 'auto' | 'large' | 'small'; position: 'below' | 'above'; disablePreview: boolean; silent: boolean; parseMode: 'plain' | 'html' }
interface SentRecord {
  id: string; via: 'account' | 'bot'; chat: string; chatTitle: string; messageId: number; messageLink?: string
  url: string; sentAt: string; updatedAt?: string; lastStatus?: string; lastError?: string; options: SendOptions
}

const props = defineProps<{ owner: string; latestUrl: string; account: boolean; bot: boolean; dirty?: boolean }>()
const options = defineModel<SendOptions>('options', { required: true })
const template = defineModel<string>('template', { required: true })

const api = useApi()
const via = ref<'account' | 'bot'>(props.account ? 'account' : 'bot')
const chat = ref('')
const recent = ref<string[]>([])
const sending = ref(false)
const updating = ref(false)
const error = ref('')
const notice = ref('')
const sent = ref<SentRecord[]>([])
const canSend = computed(() => (via.value === 'account' ? props.account : props.bot))

watch(() => [props.account, props.bot], () => { if (!canSend.value) via.value = props.account ? 'account' : 'bot' })

const RECENT_KEY = 'lps-recent-chats'
onMounted(() => {
  try { recent.value = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch {}
  chat.value = recent.value[0] || (props.account ? 'me' : '')
  load()
})

async function load() {
  if (!props.owner) return
  try { sent.value = await api<SentRecord[]>('/api/telegram/sent', { query: { owner: props.owner } }) } catch {}
}

function remember(c: string) {
  recent.value = [c, ...recent.value.filter((x) => x !== c)].slice(0, 8)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent.value)) } catch {}
}

async function send() {
  sending.value = true
  error.value = notice.value = ''
  try {
    const rec = await api<SentRecord>('/api/telegram/send', {
      method: 'POST',
      body: { owner: props.owner, via: via.value, chat: chat.value || (via.value === 'account' ? 'me' : ''), template: template.value, options: options.value },
    })
    remember(chat.value || 'me')
    sent.value = [rec, ...sent.value]
    notice.value = `Sent to ${rec.chatTitle}.`
  } catch (e) { error.value = errMsg(e) }
  finally { sending.value = false }
}

/** Edits every message this tool sent so it shows the newest preview. Returns true if all worked. */
async function updateAll(ids?: string[]) {
  if (!sent.value.length) return true
  updating.value = true
  error.value = ''
  try {
    const res = await api<{ results: SentRecord[] }>('/api/telegram/update-sent', { method: 'POST', body: { owner: props.owner, ids } })
    const byId = new Map(res.results.map((r) => [r.id, r]))
    sent.value = sent.value.map((r) => byId.get(r.id) || r)
    const failed = res.results.filter((r) => r.lastStatus === 'error').length
    notice.value = failed ? `${failed} message(s) couldn't be updated. See below.` : `Updated ${res.results.length} sent message(s) to the newest preview.`
    return !failed
  } catch (e) { error.value = errMsg(e); return false }
  finally { updating.value = false }
}

async function forget(r: SentRecord, deleteMessage: boolean) {
  if (deleteMessage && !confirm(`Delete this message from ${r.chatTitle} in Telegram?`)) return
  try {
    await api('/api/telegram/sent', { method: 'DELETE', query: { owner: props.owner, id: r.id, deleteMessage: deleteMessage ? 1 : undefined } })
    sent.value = sent.value.filter((x) => x.id !== r.id)
  } catch (e) { error.value = errMsg(e) }
}

const insert = (s: string) => { template.value = (template.value || '') + s }
const shareLink = computed(() => {
  const text = template.value.replaceAll('{link}', '').replace(/\{title\}|\{description\}/g, '').trim()
  return `https://t.me/share/url?url=${encodeURIComponent(props.latestUrl)}${text ? `&text=${encodeURIComponent(text)}` : ''}`
})

defineExpose({ updateAll, count: computed(() => sent.value.length) })
</script>

<template>
  <div class="send">
    <h2>Message &amp; preview options</h2>
    <p class="muted small">These options shape the message the preview appears in. The mock above shows exactly what will be sent.</p>

    <label class="field">
      <span>Message text <em>use {link}, {title}, {description}</em></span>
      <textarea v-model="template" class="input" rows="3" placeholder="{link}" />
      <div class="chips">
        <button type="button" class="chip" @click="insert('{link}')">+ link</button>
        <button type="button" class="chip" @click="insert('{title}')">+ title</button>
        <button type="button" class="chip" @click="insert('{description}')">+ description</button>
        <template v-if="options.parseMode === 'html'">
          <button type="button" class="chip" @click="insert('<b></b>')"><b>B</b></button>
          <button type="button" class="chip" @click="insert('<i></i>')"><i>I</i></button>
          <button type="button" class="chip" @click="insert('<u></u>')"><u>U</u></button>
          <button type="button" class="chip" @click="insert('<s></s>')"><s>S</s></button>
          <button type="button" class="chip" @click="insert('<code></code>')">code</button>
          <button type="button" class="chip" @click="insert('<tg-spoiler></tg-spoiler>')">spoiler</button>
          <button type="button" class="chip" @click="insert('<blockquote></blockquote>')">quote</button>
          <button type="button" class="chip" @click="insert('<a href=&quot;{link}&quot;>Read more</a>')">link text</button>
        </template>
      </div>
      <small class="hint">Leave out {link} to hide the address. The preview card still shows.</small>
    </label>

    <div class="optgrid">
      <div class="field">
        <span>Media size</span>
        <div class="seg sm">
          <button :class="{ on: options.size === 'auto' }" @click="options = { ...options, size: 'auto' }">Auto</button>
          <button :class="{ on: options.size === 'large' }" @click="options = { ...options, size: 'large' }">Larger</button>
          <button :class="{ on: options.size === 'small' }" @click="options = { ...options, size: 'small' }">Smaller</button>
        </div>
      </div>
      <div class="field">
        <span>Preview position</span>
        <div class="seg sm">
          <button :class="{ on: options.position === 'below' }" @click="options = { ...options, position: 'below' }">Below text</button>
          <button :class="{ on: options.position === 'above' }" @click="options = { ...options, position: 'above' }">Above text</button>
        </div>
      </div>
      <div class="field">
        <span>Formatting</span>
        <div class="seg sm">
          <button :class="{ on: options.parseMode === 'plain' }" @click="options = { ...options, parseMode: 'plain' }">Plain</button>
          <button :class="{ on: options.parseMode === 'html' }" @click="options = { ...options, parseMode: 'html' }">HTML</button>
        </div>
      </div>
    </div>
    <div class="row wrap">
      <label class="check"><input type="checkbox" :checked="options.disablePreview" @change="options = { ...options, disablePreview: ($event.target as HTMLInputElement).checked }" /> No preview</label>
      <label class="check"><input type="checkbox" :checked="options.silent" @change="options = { ...options, silent: ($event.target as HTMLInputElement).checked }" /> Send silently</label>
    </div>

    <div class="sendbox">
      <template v-if="account || bot">
        <div class="row wrap">
          <div v-if="account && bot" class="seg sm">
            <button :class="{ on: via === 'account' }" @click="via = 'account'">My account</button>
            <button :class="{ on: via === 'bot' }" @click="via = 'bot'">Bot</button>
          </div>
          <input v-model="chat" class="input grow" list="lps-chats" :placeholder="via === 'account' ? 'me (Saved Messages), @channel, @user or chat id' : '@channel or chat id'" />
          <datalist id="lps-chats">
            <option v-if="via === 'account'" value="me">Saved Messages</option>
            <option v-for="c in recent" :key="c" :value="c" />
          </datalist>
          <button class="btn primary sm" :disabled="sending || !canSend || dirty" @click="send">{{ sending ? 'Sending…' : 'Send to Telegram' }}</button>
        </div>
        <p v-if="dirty" class="muted small">Save first. Messages always use the saved preview.</p>
        <p v-if="via === 'bot'" class="muted small">The bot must be an admin of the channel or group, or the person must have started the bot.</p>
      </template>
      <template v-else>
        <p class="small">
          <a class="btn sm" :href="shareLink" target="_blank">Open in Telegram to share</a>
          <span class="muted"> Telegram opens with the link filled in. Connect an account or a bot (README) to send with these options and keep sent messages updated.</span>
        </p>
      </template>
      <p v-if="notice" class="small ok">{{ notice }}</p>
      <p v-if="error" class="small error">{{ error }}</p>
    </div>

    <div v-if="sent.length" class="sentlist">
      <div class="row between">
        <b class="small">Sent from this tool ({{ sent.length }})</b>
        <button class="btn sm" :disabled="updating || dirty" @click="updateAll()">{{ updating ? 'Updating…' : 'Update all to newest preview' }}</button>
      </div>
      <div v-for="r in sent" :key="r.id" class="sentrow small">
        <span :title="r.lastError">{{ r.lastStatus === 'error' ? '❌' : r.lastStatus === 'updated' ? '✅' : r.lastStatus === 'unchanged' ? '✔️' : '📨' }}</span>
        <span class="grow">
          <b>{{ r.chatTitle }}</b> <span class="muted">via {{ r.via }} · {{ new Date(r.updatedAt || r.sentAt).toLocaleString() }}</span>
          <span v-if="r.lastError" class="error"> · {{ r.lastError }}</span>
        </span>
        <a v-if="r.messageLink" :href="r.messageLink" target="_blank">open ↗</a>
        <button class="linkbtn" :disabled="updating" @click="updateAll([r.id])">update</button>
        <button class="linkbtn" @click="forget(r, false)">forget</button>
        <button class="linkbtn error" @click="forget(r, true)">delete</button>
      </div>
      <p class="muted small">Updating edits each message to point at the newest <code>?v=</code> link, so Telegram re-fetches the preview even in chats where it was already posted.</p>
    </div>
  </div>
</template>

<style scoped>
.send { border-top: 1px solid var(--line); margin-top: 14px; padding-top: 14px; }
.chips { display: flex; gap: 4px; flex-wrap: wrap; }
.chip { font: inherit; font-size: 12px; padding: 2px 8px; border: 1px solid var(--line); border-radius: 99px; background: #fff; cursor: pointer; }
.optgrid { display: flex; gap: 14px; flex-wrap: wrap; }
.optgrid .field { margin-bottom: 8px; }
.wrap { flex-wrap: wrap; }
.sendbox { background: #f7f9fb; border-radius: 8px; padding: 10px; margin-top: 10px; }
.sendbox .input { min-width: 180px; }
.sentlist { margin-top: 12px; display: grid; gap: 6px; }
.sentrow { display: flex; gap: 8px; align-items: center; padding: 6px 8px; border: 1px solid var(--line); border-radius: 8px; }
</style>
