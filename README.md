# Link Preview Studio (Telegram first)

Make short share links whose **Telegram preview** (site name, title, description, image) you control and can change at any time.

- `/s/<slug>` is the link you share.
  - **Telegram's crawler** (and Facebook, WhatsApp and similar) gets a small HTML page with your Open Graph tags.
  - **People** who tap it are sent (302) to your target URL.
  - Add `?preview` to view the crawler HTML in a browser.
- **No database.** Your posts, links and sent messages are kept in your browser (IndexedDB, via [Dexie](https://dexie.org)). **Save & publish** writes a small JSON file to your GitHub repo, and the site reads it whenever Telegram, Facebook or WhatsApp opens a link. See *How data is stored* below.
- The editor shows a **live Telegram-style preview** (light and dark) as you type.
- **Check live** fetches your link the way `TelegramBot` does and shows what it reads.
- Every saved change adds a new `?v=` number. Post `…/s/promo?v=3` and Telegram treats it as a new link, so it shows the new preview straight away.
- **Refresh in Telegram (built in):** the tool sends your link to Telegram's official [@WebpageBot](https://t.me/WebpageBot) for you. It can also press "Update with content", and it shows the preview Telegram really has saved, image included. Turn on *Refresh Telegram automatically after saving* and every save updates Telegram too. This needs a connected Telegram account (see below).

## Posts and Test kit

- **Posts** (`/posts` in the editor) are simple article pages hosted by the tool at `/p/<slug>`, with their own preview tags. Share them directly, or click *Create a share link for this post*.
- **Test kit** (`/test-kit`) has one button that creates 8 sample posts and matching share links (`/s/test-large`, `/s/test-khmer`, `/s/test-thumbnail`, `/s/test-no-image`, `/s/test-long-text`, `/s/test-emoji`, `/s/test-video`, `/s/test-audio`), plus `/s/test-override` and `/s/test-per-app` (a different title and image in each app). It also lists the test images and media in `public/test/` (1200×630 in three colors, 2400×1260, square, portrait, small, a video poster, a 6 s MP4 and an 8 s MP3). Both editors have a *Use a test image…* menu.

## Everything you can customise in a Telegram preview

**On the page (Open Graph tags, read by Telegram's crawler).** These are in each editor, plus *Advanced*:

| Field | Tag(s) |
|---|---|
| Site name, title, description, image | `og:site_name`, `og:title`, `og:description`, `og:image` (+ Twitter equivalents) |
| Large image / small thumbnail | `twitter:card` = `summary_large_image` / `summary` |
| Page type | `og:type` (website, article, video, song, profile, book) |
| Author, published time, language | `article:author`, `author`, `article:published_time`, `og:locale` |
| Image size and alt text | `og:image:width`, `og:image:height`, `og:image:alt` |
| Video | `og:video` (+ `secure_url`, `type`, `width`, `height`), `video:duration`; a player page also sets `twitter:player` |
| Audio | `og:audio`, `og:audio:type` |
| Your channel | `telegram:channel` (used by Instant View) |

Telegram stores all of these with the preview, but each Telegram app decides what to show. *Show Telegram's saved preview* lists what Telegram actually kept (type, author, duration, embedded player, media size).

**In the message (set when the message is sent).** These are under *Message & preview options*:

- **Larger / smaller media.** Forces the big image or the thumbnail, whatever the page says.
- **Preview above or below the text.**
- **Message text** with `{link}`, `{title}`, `{description}`. Leave out `{link}` to hide the address while keeping the card.
- **HTML formatting:** bold, italic, underline, strike, `code`, spoiler, quote, and links with your own text.
- **No preview** and **send silently**.

Telegram only applies these to a message that is actually sent, so the tool can **send the message for you**. It sends through your connected account (Saved Messages, any chat or channel you can post in) or through a bot. Messages sent this way are listed under *Sent from this tool*. After you save, the tool **edits them to point at the newest `?v=` link**, so even messages already posted in chats show the new preview.

### Connect a bot (optional, for channels and groups)

1. In Telegram, open @BotFather, send `/newbot`, and copy the token.
2. Add the bot as an **admin** of your channel or group, with permission to post and edit messages.
3. In Vercel, add `NUXT_TELEGRAM_BOT_TOKEN=<token>` and redeploy.
4. In the editor, choose **Bot**, type `@yourchannel` (or a numeric chat id), and send.

A bot can't post to Saved Messages, and it can only message a person who has started it. Use *My account* for those.

## Using it on phone, tablet and desktop

- **Desktop:** the form is on the left and the preview stage stays in view on the right. Below the preview, the **Message**, **Update apps** and **Check** tabs hold the sending and checking tools. **Publish** sits at the bottom of the form.
- **Phones and tablets:** a compact floating, frosted tab bar at the bottom (the active pill springs to the tab you tap, and you can drag it along the bar, iOS-style) switches between Links, Posts, Test kit and Settings. In an editor, the **Edit / Preview / Share** switch shows one part at a time, and the **Publish** bar appears as soon as you change something.
- **Settings** holds the admin token, the list of connections, and the GitHub connection check. The header badge shows the publishing state (*Publishing on*, *N unpublished*, *Not publishing*) and opens Settings.

## Live preview while you edit

- **Desktop:** the preview sits beside the form and follows every keystroke. Tabs switch between Telegram, Facebook, Messenger, WhatsApp, LinkedIn, Discord and Slack.
- **Phones and tablets:** a live preview stays pinned above the form in the Edit view. Pick the app on top; hide it with the arrow. With the keyboard up it shrinks to half size so the card and the field are both visible.
- **Edit for all apps or one app:** under *What apps show*, pick **All apps** or one app. With an app picked, the same title, text and image fields write that app's own version, and the preview turns to that app. A dot marks apps that have their own version.
- **Live remarks** under the preview say how the selected app will treat what you typed (Discord trimming a long title, WhatsApp dropping a heavy image, LinkedIn hiding the description).

## Testing previews in every app

- **Test in the real apps** (in each editor, and on the Test kit page): one-tap buttons put the newest link into Telegram, Facebook, Messenger, WhatsApp, X and LinkedIn. On a phone, **Share…** opens the system share sheet for any other app.
- **What each app allows** (Test kit, and per app on the *Update apps* tab): what you can set, the limits, how to update an old preview and how to test, for Telegram, Facebook, Messenger, Instagram DMs & Threads, WhatsApp, X, LinkedIn, Discord, Slack and iMessage.
- **Check all apps** fetches the link as each of those apps' crawlers and lists what's wrong.
- **Did the app reach your link?** (Check tab) lists real crawler visits the server saw, so you can tell whether Facebook, WhatsApp and the rest got through. It is kept in memory and resets when the server restarts.
- **Preview not right?** (Check tab) is a guided checker. Pick the app and what you see (no preview, no image, small image, old version, wrong page). It fetches the link as that app, checks the app's image rules and whether the app reached the link, then names the cause and the fix. For Facebook, Messenger and Instagram it ends by asking what the Sharing Debugger says.
- **LinkedIn, Discord and Slack** are full apps: their own preview tab, their own title/text/image under *Different text or image per app*, image checks, and an *Update apps* tab with LinkedIn's Post Inspector and Discord's Embed Debugger.

| App | Limits the tool checks |
|---|---|
| LinkedIn | Image at least 1200 × 627, under 5 MB; narrower than 401 px shows as a thumbnail; kept about a week unless Post Inspector refreshes it |
| Discord | Title trimmed at 70 bytes, description at 350 bytes; site name up to 256 characters; page and image must load in 10 seconds; `theme-color` must be `#RRGGBB`; kept about 30 minutes |
| Slack | Tags must be at the start of the page (about 32 KB); Author becomes a "Written by" line; kept about 30 minutes; no refresh tool |
- **Accent colour** (Advanced) sets `theme-color`, the colour bar on Discord's card.

## Look and dark mode

The UI is built with [squirkle-ui](https://github.com/KheangLov/squirkle-ui) (`@squirkle-ui/nuxt` + `@squirkle-ui/ui`): buttons, fields, switches, tabs, alerts and the bottom navigation are Squirkle components with squircle corners. The light and dark palettes live in `nuxt.config.ts` under `squirkle.theme.themes`; `app/assets/css/main.css` maps the app's own tokens onto the `--sq-*` variables, so both modes stay in sync.

Dark mode follows the device by default. Switch it with the sun/moon button in the header, or pick **System / Light / Dark** in Settings → Appearance (remembered on this device). The app mock-ups in the preview stage start in the same mode and still have their own Light/Dark switch.

## How data is stored (no database)

| What | Where |
|---|---|
| Your links, posts, drafts and the list of messages the tool sent | **This browser**, in IndexedDB (Dexie). Nothing leaves the browser until you publish. |
| What Telegram, Facebook, WhatsApp and visitors see | **Your GitHub repo**, branch `published-data`: `published/links/<slug>.json`, `published/posts/<slug>.json`, `published/uploads/…` |
| Built-in samples (`/p/sample-…`, `/s/test-…`) | In the code. They're always live, even before anything is published. |

- **Save & publish** saves to the browser first, then commits the JSON file to GitHub (one small commit per publish). The status next to the title shows *Published v3*, *Unpublished changes* or *Not published*, with a **retry** button if GitHub was unreachable.
- The site reads published files from the GitHub API with ETags. Unchanged files get a quick "not modified" answer that doesn't count against GitHub's rate limit, and new publishes show up immediately, with no redeploy.
- **Another browser or device?** Open **Test kit → Restore published items from GitHub** (or open a link's editor and click *Restore from GitHub*) to copy everything published into that browser.
- Clearing your browser data removes local drafts and the sent-message list. Published items can be restored from GitHub.
- `vercel.json` tells Vercel not to deploy the `published-data` branch, so publishing never starts a new deployment. If you change the branch name, change it there too.

### Publishing to GitHub

1. On GitHub: **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   - *Repository access*: **Only select repositories** → your `meta-tool` repo
   - *Repository permissions*: **Contents → Read and write** (nothing else needed)
2. In Vercel → **Settings → Environment Variables**:
   ```
   NUXT_GITHUB_TOKEN=github_pat_…
   NUXT_GITHUB_REPO=KheangLov/meta-tool
   # optional, default "published-data"
   NUXT_GITHUB_BRANCH=published-data
   ```
3. **Redeploy**. The header shows **GitHub ✓**. Until then it shows *Not publishing*, with an orange banner explaining the steps.

The `published-data` branch is created automatically on the first publish. The repo can be private: the server reads files with the token.

### Previews wrong in Facebook, Messenger or WhatsApp?

Use **Check all apps** (in the Test kit and at the bottom of each editor). It fetches the link exactly as Telegram, Facebook/Messenger and WhatsApp do, plus a generic in-app fetcher, then lists problems with fixes. Typical findings:
- **403**: Vercel's firewall or Bot Protection blocked Meta's crawler. Allow it in Vercel → Firewall.
- **404**: the link isn't published (see below).
- **Image** too big for WhatsApp, or too small for Facebook.

Then open Facebook's **Sharing Debugger** (linked from the check). If it says the link "goes against our Community Standards", Facebook is blocking the domain itself, not your tags. Free shared domains like `*.vercel.app` can get flagged, and a custom domain (Vercel → Domains) avoids that.

How the site serves links, for reference:
- Every page includes `og:image:width/height/type`, detected automatically from the image, so Facebook and Messenger show the image on the very first share.
- `article:author` is only output when it's a profile URL, because Facebook rejects plain names there. Names go in `<meta name="author">`.
- Nobody gets a blind 302 redirect any more. Crawlers get the preview page; people (and any fetcher we don't recognise) get the same page with a script that forwards them instantly, so link fetchers inside apps read your tags, not the target's. Add `?go` for a plain redirect.

### Links show "not found"?

That means the link was saved in your browser but never published, so the site has nothing to serve. To fix it:

1. Open **Test kit → GitHub publishing → Check connection**. It tests the settings, token, repo access, write permission and data branch, then does a test write. Every failing step says exactly what to change, for example *"The token can read this repo but not write to it → Contents: Read and write"*.
2. Fix the token or variables in Vercel and **redeploy**.
3. Open the app. Anything that wasn't published (the header shows *N unpublished*) is published automatically, or press **Publish N pending item(s)** after the check.

If you open your own unpublished link in the same browser, the not-found page says so and links straight to its editor.
`NUXT_GITHUB_REPO` can be `owner/name` or a pasted GitHub URL; both work.

## Facebook, Messenger and WhatsApp

Every editor has a **Telegram / Facebook / Messenger / WhatsApp** switch above the preview. Each tab shows a mock of that app and its own update panel.

**Different text or image per app.** Under *Different text or image per app* you can give Telegram, Facebook & Messenger, and WhatsApp their own title, description, image and site name. The server detects which app's crawler is asking (`TelegramBot`, `facebookexternalhit`/`meta-externalagent`, `WhatsApp`) and sends that version. Messenger uses Facebook's crawler, so it shares Facebook's version. Add `?as=whatsapp` (or `telegram`, `facebook`) to a `/s/` or `/p/` link to see a version in your browser.

**Image checks.** Every image is checked against each app's rules:
- Telegram: small or tall images become a thumbnail.
- Facebook & Messenger: at least 200×200, under 8 MB, below 600×315 shows a small thumbnail, 1.91:1 avoids cropping.
- WhatsApp: under 600 KB (some versions need under 300 KB), at least 300 px wide, no wider than 4:1.

**⚡ Make a WhatsApp-safe copy** shrinks any image to 1200 px and under 300 KB, uploads it, and sets it as the WhatsApp-only image. Other apps keep the full-size one.

**Facebook & Messenger tab:**
- Share on Facebook / Send in Messenger buttons, and a link to the Sharing Debugger.
- **Re-scrape on Facebook** (also updates Messenger). It runs automatically after every save when connected, then checks that Facebook's saved title, description and image match what you saved.
- **Show Facebook's saved preview**: what Facebook currently has, with share and reaction counts. Facebook allows about 10 of these reads per link per hour.
- **Publish on your Facebook Page** (optional). Facebook doesn't let apps change the card of a post that's already published, so delete and post again to get a new card.

**WhatsApp tab:** WhatsApp has no refresh tool. It makes the preview when someone pastes the link, and phones keep it, so the reliable way to show a new preview is to share the newest `?v=` link. The tab has a Share on WhatsApp button, the image check and compressor, and a check of what WhatsApp's crawler sees.

### Connect Facebook (optional)

1. Go to <https://developers.facebook.com/apps>, create an app (type *Business* or *Other*), and copy its **App ID** and **App Secret** (*App settings → Basic*).
2. In Vercel, add `NUXT_FACEBOOK_APP_ID` and `NUXT_FACEBOOK_APP_SECRET`, then redeploy. Pages also get an `fb:app_id` tag, which Facebook's debugger asks for.
3. To publish to a Page as well, add `NUXT_FACEBOOK_PAGE_ID` and a Page access token with `pages_manage_posts` as `NUXT_FACEBOOK_PAGE_TOKEN`. You can generate one in the Graph API Explorer.

## Image uploads

Every image field has an **Upload image** button. You can also drag a file onto it, or click it and paste (Ctrl/⌘+V) a copied image.

- JPEG, PNG, WebP and GIF are accepted. The server checks the real file type, not just the file name.
- Photos larger than 2400 px or 3.8 MB are resized in the browser to a JPEG first, so they fit Vercel's 4.5 MB upload limit.
- Uploads are committed to your GitHub repo (`published/uploads/` on the data branch) and served from `/u/<name>` with a one-year cache, so Vercel's CDN serves them after the first request.
- Optional: if a **public** Vercel Blob store is connected (`BLOB_READ_WRITE_TOKEN`), uploads go there instead.

## How the tool keeps previews up to date after you save

1. **Your server always serves the latest.** `/s/…` and `/p/…` are never cached (`Cache-Control: no-store`), so Telegram's crawler always reads what you last saved.
2. **Share links follow their post.** A share link made from a post is *synced*: saving the post copies its title, summary and image into the link and bumps its `?v=` version. Untick *Keep in sync with post* to give a link its own preview.
3. **Every change gets a new `?v=` link.** Telegram has never seen it, so pasting it always shows the newest preview, even without a connected Telegram account.
4. **Telegram is refreshed and checked** (when a Telegram account is connected). After each save, the tool sends every affected URL to @WebpageBot: the post, and each synced link both plain and with the newest `?v=`. It then reads back what Telegram has stored and compares the title, description, site name and whether there's an image. If anything is still old, it presses *Update with content* and checks again. Each link is marked ✅ up to date or ⚠️ still old, with the differences listed.

Links that were already posted in chats may still show the old card until the chat reloads. That's how Telegram works, and the refresh fixes it for new views.

## Run locally

```bash
npm install
npm run dev            # http://localhost:3000. Without a GitHub token, "published" files go to .data/ and no admin token is needed in dev.
```

Telegram can't reach `localhost`. To test real previews, deploy it (below) or use a tunnel such as `cloudflared tunnel --url http://localhost:3000`.

## Deploy to Vercel

1. Push this folder to a GitHub repo, then go to **vercel.com → Add New → Project** and import it. Vercel detects Nuxt on its own, so you don't need to change any build settings.
2. Under **Settings → Environment Variables**, add
   `NUXT_ADMIN_TOKEN` = a long random string. This is the password for the editor.
3. Set up **Publishing to GitHub** (next section): add `NUXT_GITHUB_TOKEN` and `NUXT_GITHUB_REPO`.
4. **Redeploy**. Open your `https://<project>.vercel.app`, click **🔑 Token** and paste the token.

CLI alternative: `npx vercel` then `npx vercel --prod`.

> ⚠️ **Test on the production URL.** Vercel turns on *Deployment Protection* for preview deployments by default. Telegram's crawler would get a login page there, so you'd see no preview.

## Connect Telegram (for the built-in @WebpageBot refresh)

Telegram bots can't message other bots, so the tool talks to @WebpageBot as a **normal Telegram user account**, using the official MTProto API (through the [GramJS](https://gram.js.org) library). You set this up once:

1. **Use a separate Telegram account** for this, not your personal one. The tool sends messages from it.
2. Go to <https://my.telegram.org>, sign in with that account, open **API development tools**, create an app (any name), and copy its `api_id` and `api_hash`.
3. On your own computer, inside this project, run:
   ```bash
   npm install
   npm run telegram:login
   ```
   Enter the api_id and api_hash, then the phone number, the login code Telegram sends you, and your 2-step password if you have one. The script prints three lines.
4. Add those three variables in **Vercel → Settings → Environment Variables** and redeploy:
   ```
   NUXT_TELEGRAM_API_ID=…
   NUXT_TELEGRAM_API_HASH=…
   NUXT_TELEGRAM_SESSION=…   (long string, keep it secret)
   ```
5. The editor now shows **Refresh in Telegram** and **Show Telegram's saved preview**.

Notes:
- The session string gives full access to that Telegram account. Store it only in Vercel's environment variables, and never commit it to git.
- If you log that session out (Telegram → Settings → Devices), run `npm run telegram:login` again.
- Telegram rate-limits accounts that send a lot of messages. If that happens the tool shows "try again in N s". Normal editing use stays well under the limit.

## How to test the Telegram flow

1. Create a link and set a title, description and a 1200×630 image (it must be a public https URL).
2. Copy the link and paste it into Telegram (Saved Messages works well). The preview should match.
3. Change the title and click **Save & publish**. The version goes up.
4. Paste the new `?v=` link and you'll see the new preview. Or send the original link to @WebpageBot, then post it again.

## API (all calls need the `x-admin-token` header)

The server keeps no data of its own. These calls publish to GitHub or talk to the apps.

| Method | Path | Body / query |
|---|---|---|
| POST | `/api/publish` | `{ kind: 'link'\|'post', item }`: validate and write to GitHub |
| DELETE | `/api/publish?kind=&slug=` | Unpublish (delete the file) |
| GET | `/api/published` | Everything published, for restoring into a browser |
| POST | `/api/uploads` | multipart form field `file` → `{ url }` |
| GET | `/api/inspect?url=&as=` | Fetch as `telegram`, `facebook` or `whatsapp` and return the meta tags |
| GET | `/api/image-info?url=` | Size, dimensions and per-app checks |
| GET | `/api/test-kit/samples` | The built-in sample posts and links |
| GET | `/api/telegram/status` | Whether Telegram is connected, and which account |
| POST | `/api/telegram/preview` | `{ url }`: the preview Telegram has saved right now |
| POST | `/api/telegram/refresh` | `{ url }` or `{ urls }` (max 5), `withContent?`: refresh with @WebpageBot and check |
| POST | `/api/telegram/send` | `{ owner, via, chat, template, options, target: { url, title, description } }` → record (kept in the browser) |
| POST | `/api/telegram/update-sent` | `{ records, target }`: edit sent messages to the newest preview |
| POST | `/api/telegram/delete-sent` | `{ record }`: delete a sent message or Page post |
| POST | `/api/facebook/refresh` | `{ url }` or `{ urls }` (max 10): re-scrape and compare |
| POST | `/api/facebook/preview` | `{ url }`: what Facebook has saved |
| POST | `/api/facebook/post` | `{ owner, template, target }`: publish to your Page |

## Project layout

```
app/                       Editor UI (Vue, runs in the browser)
  composables/useDb.ts     Browser database (Dexie / IndexedDB)
  composables/useStudio.ts Save → publish → keep share links in sync
  components/              Previews for each app, panels, image tools
  pages/index.vue          Create and list links
  pages/links/[slug].vue   Link editor
  pages/posts/…            Create and edit posts
  pages/test-kit.vue       Samples, restore from GitHub, test images
server/
  routes/s/[slug].ts       The public share link (meta HTML for crawlers, redirect for people)
  routes/p/[slug].ts       Public post page
  routes/u/[name].ts       Uploaded images (from GitHub)
  utils/github.ts          Read/write published files in your GitHub repo
  utils/samples.ts         Built-in sample posts and test cases
  api/publish*.ts          Publish / unpublish / list
  api/telegram/…           Refresh with @WebpageBot, send and edit messages
  utils/telegram.ts        Telegram user-account client (GramJS)
  utils/                   Validation, auth, meta-tag scraper, per-app rules
scripts/telegram-login.mjs One-time Telegram login that prints the session string
```

## Next steps (ideas)

- Click counts per link
- LinkedIn and X previews
