/**
 * What each app lets you change in a link preview, its limits, how to refresh an old preview and
 * how to test. Limits come from the apps' own docs where they publish them (Facebook, WhatsApp);
 * the rest is observed behaviour and can change, so the real app is always the final check.
 */
export interface AppGuide {
  id: string
  name: string
  /** The preview tab this guide belongs to in the editors */
  tab?: PreviewApp
  shows: string[]
  limits: string[]
  refresh: string[]
  test: string[]
  cant: string[]
}

export const APP_GUIDE: AppGuide[] = [
  {
    id: 'telegram', name: 'Telegram', tab: 'telegram',
    shows: ['Site name, title, description and image', 'Large image or small thumbnail (you choose per message)', 'Preview above or below the text, or hidden', 'Video and audio badges, author, Instant View channel', 'Its own title, text and image (Different text or image per app)'],
    limits: ['Long titles and descriptions are cut after a few lines', 'Image: JPG or PNG, around 1200 × 630 for a large card'],
    refresh: ['Send the link to @WebpageBot (the tool does it for you when a Telegram account is connected)', 'Or share the newest ?v= link'],
    test: ['Paste the link into Saved Messages', 'Or use Send to Telegram on the Message tab'],
    cant: ['Change a card someone else already posted, unless Telegram refreshes it'],
  },
  {
    id: 'facebook', name: 'Facebook', tab: 'facebook',
    shows: ['Image, title and site address', 'Description (often hidden on phones)', 'Its own title, text and image (Different text or image per app)'],
    limits: ['Image at least 200 × 200 px; 600 × 315 or more for the large card; 1200 × 630 is best', 'Image file under 8 MB, JPG or PNG', 'A new image needs a new image address, or Facebook keeps the old one'],
    refresh: ['Sharing Debugger → Scrape Again (or Re-scrape here with a Facebook app connected)', 'Or share the newest ?v= link'],
    test: ['Share on Facebook, set the audience to Only me', 'Sharing Debugger shows exactly what Facebook read'],
    cant: ['Edit the title or image while writing the post: Facebook only uses the page\'s tags', 'Change the card on a post that is already published'],
  },
  {
    id: 'messenger', name: 'Messenger', tab: 'messenger',
    shows: ['Image, title and site address', 'Same text and image as Facebook: both use one crawler and one saved copy'],
    limits: ['Same image rules as Facebook', 'A small or missing image gives a small card or a bare link'],
    refresh: ['Same as Facebook: Sharing Debugger → Scrape Again also updates Messenger', 'Or send the newest ?v= link'],
    test: ['Send the link to yourself in Messenger (search your own name)', 'On a phone, Share… opens the system share sheet with Messenger in it'],
    cant: ['Give Messenger a different preview from Facebook', 'Change a message that was already sent'],
  },
  {
    id: 'instagram', name: 'Instagram DMs & Threads',
    shows: ['Image, title and site address, read by Meta\'s crawler like Facebook'],
    limits: ['Same image rules as Facebook', 'Links in Instagram captions and comments are not clickable and get no preview'],
    refresh: ['Sharing Debugger → Scrape Again', 'Or send the newest ?v= link'],
    test: ['Send the link to yourself in an Instagram DM, or draft a Threads post'],
    cant: ['Set a separate preview from Facebook'],
  },
  {
    id: 'whatsapp', name: 'WhatsApp', tab: 'whatsapp',
    shows: ['Image, title, description and site address', 'Its own title, text and image (Different text or image per app)'],
    limits: ['Image under 600 KB (under 300 KB is safest), at least 300 px wide, no wider than 4:1', 'Tags must be in the first 300 KB of the page', 'The preview is made on the sender\'s phone while they type, so a slow page gives no preview'],
    refresh: ['There is no refresh tool. Share the newest ?v= link'],
    test: ['Paste the link in a chat with yourself and wait for the card before sending'],
    cant: ['Refresh a link people already sent', 'Use big images: they are dropped without an error'],
  },
  {
    id: 'x', name: 'X (Twitter)',
    shows: ['Large image card or small square card (the Large / Small image setting)', 'Title and site address; description on the small card', 'A player card for embeddable video'],
    limits: ['Large card image is cropped to about 2:1; keep faces and text in the centre', 'Image under 5 MB'],
    refresh: ['Share the newest ?v= link; X keeps its copy for about a week'],
    test: ['Start a new post, paste the link and look at the card before posting'],
    cant: ['Force a refresh: X removed its card validator preview'],
  },
  {
    id: 'linkedin', name: 'LinkedIn', tab: 'linkedin',
    shows: ['Image, title and site address', 'Its own title and image (Different text or image per app)'],
    limits: ['Image at least 1200 × 627 px, 1.91:1, under 5 MB (LinkedIn Help)', 'An image narrower than 401 px becomes a small thumbnail', 'JPG, PNG or GIF', 'LinkedIn expects og:title, og:image, og:description and og:url; this tool always sends them'],
    refresh: ['Post Inspector re-reads the link, also for posts already shared', 'Or share the newest ?v= link', 'Otherwise LinkedIn keeps its copy for about a week'],
    test: ['Post Inspector shows the card without posting', 'Or start a post, paste the link and look at the card'],
    cant: ['Show the description: LinkedIn reads it but hides it in the feed', 'Edit the title or image while writing the post'],
  },
  {
    id: 'discord', name: 'Discord', tab: 'discord',
    shows: ['Site name above the title, title, description and image', 'A colour bar from the Accent colour setting (#RRGGBB)', 'Large image below the text, or a small thumbnail (the Large / Small image setting)', 'Inline video for direct .mp4, .webm or .mov links', 'Its own title, text and image (Different text or image per app)'],
    limits: ['Title is trimmed at 70 bytes and 3 lines; Khmer letters count 3 bytes each', 'Description is trimmed at 350 bytes and 20 lines', 'Site name over 256 characters, or any address over 2,048, gives no preview', 'The page and its image must load within 10 seconds', 'Image: PNG, JPG, GIF, WebP or AVIF, over https', 'Only the first 5 links in a message get a preview'],
    refresh: ['Discord keeps a preview for about 30 minutes', 'Share the newest ?v= link to see a change at once'],
    test: ['Embed Debugger shows the tags Discord read and the layout it chose', 'Or paste the link in a DM or a private server'],
    cant: ['Refresh a message that was already sent before the 30 minutes pass'],
  },
  {
    id: 'slack', name: 'Slack', tab: 'slack',
    shows: ['Site name, title, description and image', 'Large image, or a small thumbnail (the Large / Small image setting)', 'A "Written by" line from the Author setting', 'Its own title, text and image (Different text or image per app)'],
    limits: ['Slack reads only the start of the page (about 32 KB), so tags must come first; this tool puts them first', 'Slack downloads the image to check it, so it must be public', 'Slack publishes no image size limit'],
    refresh: ['Slack keeps a preview for about 30 minutes, shared by every workspace', 'Share the newest ?v= link to see a change at once', 'There is no refresh tool'],
    test: ['Paste the link in a DM to yourself (your own name in the sidebar)'],
    cant: ['Show a preview where a workspace admin turned link previews off', 'Change a preview someone removed from a message'],
  },
  {
    id: 'imessage', name: 'iMessage',
    shows: ['Image, title and site address', 'It reads the page as Facebook\'s crawler, so it gets the Facebook text and image'],
    limits: ['No description', 'Made on the sender\'s iPhone, so a slow page gives a plain link'],
    refresh: ['Share the newest ?v= link'],
    test: ['Send the link to yourself in Messages'],
    cant: ['Refresh a message that was already sent'],
  },
]

export interface ShareTarget { id: string; label: string; href?: string; note?: string }

/** One-tap ways to put a link into each app */
export function shareTargets(url: string, text = '', fbAppId = ''): ShareTarget[] {
  const e = encodeURIComponent
  const onPhone = import.meta.client && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  const messenger = onPhone
    ? `fb-messenger://share/?link=${e(url)}`
    : fbAppId ? `https://www.facebook.com/dialog/send?app_id=${e(fbAppId)}&link=${e(url)}&redirect_uri=${e(url)}` : ''
  return [
    { id: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${e(url)}` },
    { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}` },
    { id: 'messenger', label: 'Messenger', href: messenger || 'https://www.messenger.com/', note: messenger ? '' : 'The link is copied. Paste it in a chat with yourself.' },
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${e(text && text.includes(url) ? text : url)}` },
    { id: 'x', label: 'X', href: `https://x.com/intent/post?url=${e(url)}` },
    { id: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}` },
  ]
}
