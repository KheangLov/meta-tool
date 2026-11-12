# Link Preview Studio (Telegram first)

Make short share links whose **Telegram preview** (site name, title, description, image) you control and can change at any time.

- `/s/<slug>` is the link you share.
  - **Telegram's crawler** (and Facebook, WhatsApp and similar) gets a small HTML page with your Open Graph tags.
  - **People** who tap it are sent (302) to your target URL.
  - Add `?preview` to view the crawler HTML in a browser.
- The editor shows a **live Telegram-style preview** (light and dark) as you type.
- **Check live** fetches your link the way `TelegramBot` does and shows what it reads.
- Every saved change adds a new `?v=` number. Post `…/s/promo?v=3` and Telegram treats it as a new link, so it shows the new preview straight away.
- **Refresh in Telegram (built in):** the tool sends your link to Telegram's official [@WebpageBot](https://t.me/WebpageBot) for you. It can also press "Update with content", and it shows the preview Telegram really has saved, image included. Turn on *Refresh Telegram automatically after saving* and every save updates Telegram too. This needs a connected Telegram account (see below).

## Posts and Test kit

- **Posts** (`/posts` in the editor) are simple article pages hosted by the tool at `/p/<slug>`, with their own preview tags. Share them directly, or click *Create a share link for this post*.
- **Test kit** (`/test-kit`) has one button that creates 8 sample posts and matching share links (`/s/test-large`, `/s/test-khmer`, `/s/test-thumbnail`, `/s/test-no-image`, `/s/test-long-text`, `/s/test-emoji`, `/s/test-video`, `/s/test-audio`), plus `/s/test-override`. It also lists the test images and media in `public/test/` (1200×630 in three colors, 2400×1260, square, portrait, small, a video poster, a 6 s MP4 and an 8 s MP3). Both editors have a *Use a test image…* menu.

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

## Image uploads

Every image field has an **Upload image** button. You can also drag a file onto it, or click it and paste (Ctrl/⌘+V) a copied image.

- JPEG, PNG, WebP and GIF are accepted. The server checks the real file type, not just the file name.
- Photos larger than 2400 px or 3.8 MB are resized in the browser to a JPEG first, so they fit Vercel's 4.5 MB upload limit.
- **Recommended:** in Vercel go to **Storage → Create → Blob**, choose **public** access, and connect it to the project. It adds `BLOB_READ_WRITE_TOKEN`. Uploads then go to Vercel Blob, which serves them from a fast public CDN URL.
- Without Blob, or if a Blob upload fails, images are saved in the app's own storage (Upstash Redis) and served from `/u/<name>`. If neither is connected, uploads are kept in memory and disappear when the server restarts.

## How the tool keeps previews up to date after you save

1. **Your server always serves the latest.** `/s/…` and `/p/…` are never cached (`Cache-Control: no-store`), so Telegram's crawler always reads what you last saved.
2. **Share links follow their post.** A share link made from a post is *synced*: saving the post copies its title, summary and image into the link and bumps its `?v=` version. Untick *Keep in sync with post* to give a link its own preview.
3. **Every change gets a new `?v=` link.** Telegram has never seen it, so pasting it always shows the newest preview, even without a connected Telegram account.
4. **Telegram is refreshed and checked** (when a Telegram account is connected). After each save, the tool sends every affected URL to @WebpageBot: the post, and each synced link both plain and with the newest `?v=`. It then reads back what Telegram has stored and compares the title, description, site name and whether there's an image. If anything is still old, it presses *Update with content* and checks again. Each link is marked ✅ up to date or ⚠️ still old, with the differences listed.

Links that were already posted in chats may still show the old card until the chat reloads. That's how Telegram works, and the refresh fixes it for new views.

## Run locally

```bash
npm install
npm run dev            # http://localhost:3000. Data is saved in .data/ and no token is needed in dev.
```

Telegram can't reach `localhost`. To test real previews, deploy it (below) or use a tunnel such as `cloudflared tunnel --url http://localhost:3000`.

## Deploy to Vercel

1. Push this folder to a GitHub repo, then go to **vercel.com → Add New → Project** and import it. Vercel detects Nuxt on its own, so you don't need to change any build settings.
2. Under **Settings → Environment Variables**, add
   `NUXT_ADMIN_TOKEN` = a long random string. This is the password for the editor.
3. Under **Storage → Create / Connect → Upstash (Redis)**, connect it to the project. It adds `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_*`), and the app picks either up.
   *If you skip this, the app still runs but keeps data in memory, so links disappear when the function restarts. The header shows "Memory storage" when this is happening.*
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
3. Change the title and click **Save**. The version goes up.
4. Paste the new `?v=` link and you'll see the new preview. Or send the original link to @WebpageBot, then post it again.

## API (all calls need the `x-admin-token` header)

| Method | Path | Body / query |
|---|---|---|
| GET | `/api/links` | – |
| POST | `/api/links` | `{ targetUrl, slug?, importMeta?, title?, description?, image?, siteName?, imageStyle? }` |
| GET / PUT / DELETE | `/api/links/:slug` | PUT: any editable fields |
| GET | `/api/inspect?url=` | Fetches a URL as TelegramBot and returns the parsed meta tags |
| GET / POST | `/api/posts` | POST: `{ title, slug?, siteName?, excerpt?, body?, cover?, imageStyle?, author? }` |
| GET / PUT / DELETE | `/api/posts/:slug` | PUT: any post fields |
| POST | `/api/uploads` | multipart form field `file` → `{ url }` |
| POST | `/api/telegram/send` | `{ owner: 'link:<slug>'\|'post:<slug>', via: 'account'\|'bot', chat, template, options: { size, position, disablePreview, silent, parseMode } }` |
| GET / DELETE | `/api/telegram/sent?owner=` | List / forget (`&id=…&deleteMessage=1` also deletes in Telegram) |
| POST | `/api/telegram/update-sent` | `{ owner, ids? }`: edit sent messages to the newest preview |
| POST | `/api/test-kit/seed` | Creates or resets the sample posts and links |
| GET | `/api/telegram/status` | Whether Telegram is connected, and which account |
| POST | `/api/telegram/preview` | `{ url }`: the preview Telegram has saved right now |
| POST | `/api/telegram/refresh` | `{ url }` or `{ urls: [...] }` (max 5), `withContent?`: refresh with @WebpageBot |

## Project layout

```
app/                       Editor UI (Vue, runs in the browser)
  components/TelegramPreview.vue   Telegram-style preview card
  pages/index.vue          Create and list links
  pages/links/[slug].vue   Editor, preview and "Update in Telegram" panel
  pages/posts/…            Create and edit posts
  pages/test-kit.vue       Sample content + test images
server/
  routes/s/[slug].ts       The public share link (meta HTML for bots, redirect for people)
  routes/p/[slug].ts       Public post page
  utils/samples.ts         Sample posts and test cases
  api/…                    Create, read, update and delete links + inspect
  api/telegram/…           Refresh with @WebpageBot, and read Telegram's saved preview
  plugins/storage.ts       Chooses Upstash Redis, local files or memory
  utils/telegram.ts        Telegram user-account client (GramJS)
  utils/                   Validation, auth, meta-tag scraper
scripts/telegram-login.mjs One-time Telegram login that prints the session string
```

## Next steps (ideas)

- Upload images directly (Vercel Blob) instead of pasting a URL
- Facebook / Messenger: preview tab + one-click re-scrape through the Graph API (`POST /?id=<url>&scrape=true`)
- Click counts per link
