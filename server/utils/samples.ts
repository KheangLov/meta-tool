/** Ready-made test content. Each case checks one thing about how Telegram shows a preview. */
export const TEST_IMAGES = [
  { file: 'large-blue-1200x630.jpg', w: 1200, h: 630, note: 'Ideal size: large preview' },
  { file: 'large-red-1200x630.jpg', w: 1200, h: 630, note: 'Swap with blue to test changing the image' },
  { file: 'large-green-1200x630.jpg', w: 1200, h: 630, note: 'Another color for update tests' },
  { file: 'wide-2400x1260.jpg', w: 2400, h: 1260, note: 'High resolution, same ratio' },
  { file: 'square-600x600.jpg', w: 600, h: 600, note: 'Square: usually shown as a thumbnail' },
  { file: 'tall-600x900.jpg', w: 600, h: 900, note: 'Portrait: usually shown as a thumbnail' },
  { file: 'small-200x200.jpg', w: 200, h: 200, note: 'Small: thumbnail' },
  { file: 'video-poster-1200x675.jpg', w: 1200, h: 675, note: 'Poster frame for the test video' },
]

/** Media files in public/test (for the video/audio fields) */
export const TEST_MEDIA = [
  { file: 'video-640x360.mp4', note: '6 s MP4 video, 640×360, ~300 KB' },
  { file: 'audio-8s.mp3', note: '8 s MP3 tone' },
]

interface Sample {
  slug: string
  case: string
  post: { siteName: string; title: string; excerpt: string; body: string; image: string; imageStyle: 'large' | 'small'; author: string }
  /** Extra tags; videoUrl/audioUrl are file names in public/test */
  extra?: PreviewExtra
  /** Optional share-link meta that differs from the post (to show a link overriding a page) */
  linkOverride?: { title: string; description: string; image: string }
}

const BODY_EN = `This is a sample post made by Link Preview Studio so you have something to share while testing.

Change the title, description or image in the editor, save, then refresh the link in Telegram to see the new preview.

Everything on this page is test content.`

const BODY_KM = `នេះជាអត្ថបទគំរូសម្រាប់សាកល្បងការបង្ហាញតំណនៅក្នុង Telegram។

សូមកែចំណងជើង ការពិពណ៌នា ឬរូបភាព រួចរក្សាទុក ហើយធ្វើបច្ចុប្បន្នភាពតំណនៅក្នុង Telegram ដើម្បីមើលការបង្ហាញថ្មី។`

export const SAMPLES: Sample[] = [
  {
    slug: 'sample-large',
    case: 'Large image (1200×630)',
    post: {
      siteName: 'Angkor Shop', author: 'Test Team', imageStyle: 'large', image: 'large-blue-1200x630.jpg',
      title: 'Rainy season sale: 30% off all rain jackets',
      excerpt: 'Free delivery in Phnom Penh until 30 November. Tap to see all styles.',
      body: BODY_EN,
    },
    extra: { ogType: 'article', imageWidth: 1200, imageHeight: 630, imageAlt: 'Blue test banner', locale: 'en_US' },
  },
  {
    slug: 'sample-khmer',
    case: 'Khmer text',
    post: {
      siteName: 'ហាងអង្គរ', author: 'ក្រុមសាកល្បង', imageStyle: 'large', image: 'large-green-1200x630.jpg',
      title: 'បញ្ចុះតម្លៃ ៣០% លើអាវភ្លៀងទាំងអស់',
      excerpt: 'ដឹកជញ្ជូនឥតគិតថ្លៃក្នុងរាជធានីភ្នំពេញ រហូតដល់ថ្ងៃទី៣០ ខែវិច្ឆិកា។',
      body: BODY_KM,
    },
  },
  {
    slug: 'sample-thumbnail',
    case: 'Square image → small thumbnail',
    post: {
      siteName: 'Phnom Penh Eats', author: 'Test Team', imageStyle: 'small', image: 'square-600x600.jpg',
      title: 'Top 5 noodle soups to try this week',
      excerpt: 'Square image with the small-thumbnail card style.',
      body: BODY_EN,
    },
  },
  {
    slug: 'sample-no-image',
    case: 'No image (text only)',
    post: {
      siteName: 'Company News', author: 'Test Team', imageStyle: 'large', image: '',
      title: 'Office closed on Water Festival holidays',
      excerpt: 'A text-only preview: no og:image tag at all.',
      body: BODY_EN,
    },
  },
  {
    slug: 'sample-long-text',
    case: 'Very long title and description',
    post: {
      siteName: 'A Site With A Rather Long Name For Testing Truncation',
      author: 'Test Team', imageStyle: 'large', image: 'large-red-1200x630.jpg',
      title: 'This is a deliberately long title to see where Telegram cuts it off in the link preview card on phones and desktop',
      excerpt:
        'This description is intentionally long. It keeps going to show how many lines Telegram displays before it trims the text. ' +
        'Line lengths differ between phones, tablets and Telegram Desktop, so check it on each one. ' +
        'If you can still read this sentence in the preview, Telegram is showing a lot of text. ' +
        'Usually it is better to keep descriptions to one or two short sentences.',
      body: BODY_EN,
    },
  },
  {
    slug: 'sample-emoji',
    case: 'Emoji and special characters',
    post: {
      siteName: 'Fun & Games 🎮', author: 'Test Team', imageStyle: 'large', image: 'wide-2400x1260.jpg',
      title: '🎉 Big launch: "Quotes", <tags> & ampersands — all safe',
      excerpt: 'Checks that emoji 🚀🔥, “curly quotes”, <b>not bold</b> and & signs show correctly.',
      body: BODY_EN,
    },
  },
]

SAMPLES.push(
  {
    slug: 'sample-video',
    case: 'Video (og:video MP4 + duration)',
    post: {
      siteName: 'Video Test', author: 'Test Team', imageStyle: 'large', image: 'video-poster-1200x675.jpg',
      title: 'Watch: 6-second test clip',
      excerpt: 'A page with og:video pointing at a small MP4. Check whether Telegram shows a play button or duration.',
      body: BODY_EN,
    },
    extra: { ogType: 'video.other', videoUrl: 'video-640x360.mp4', videoType: 'video/mp4', videoWidth: 640, videoHeight: 360, videoDuration: 6, imageWidth: 1200, imageHeight: 675 },
  },
  {
    slug: 'sample-audio',
    case: 'Audio (og:audio)',
    post: {
      siteName: 'Podcast Test', author: 'Test Team', imageStyle: 'small', image: 'square-600x600.jpg',
      title: 'Episode 1: an 8-second tone',
      excerpt: 'A page with og:audio pointing at an MP3.',
      body: BODY_EN,
    },
    extra: { ogType: 'music.song', audioUrl: 'audio-8s.mp3', audioType: 'audio/mpeg' },
  },
)

/** A share link that shows different text and images in each app */
export const PER_APP_LINK = {
  slug: 'test-per-app',
  case: 'Different title and image in each app',
  target: 'sample-large',
  base: { siteName: 'Angkor Shop', title: 'One link, a different preview in every app', description: 'Open this link in each app to compare.', image: 'large-blue-1200x630.jpg' },
  platforms: {
    telegram: { title: '👋 Hello Telegram', description: 'This title and image are only for Telegram.', image: 'large-blue-1200x630.jpg' },
    facebook: { title: '👋 Hello Facebook & Messenger', description: 'Facebook and Messenger read this version.', image: 'large-red-1200x630.jpg' },
    whatsapp: { title: '👋 Hello WhatsApp', description: 'WhatsApp gets a small, fast image.', image: 'large-green-1200x630.jpg' },
    linkedin: { title: '👋 Hello LinkedIn', description: 'LinkedIn reads this version.', image: 'large-red-1200x630.jpg' },
    discord: { title: '👋 Hello Discord', description: 'Discord reads this version.', image: 'large-green-1200x630.jpg' },
    slack: { title: '👋 Hello Slack', description: 'Slack reads this version.', image: 'large-blue-1200x630.jpg' },
  } as Record<string, { title: string; description: string; image: string }>,
}

/** One extra share link that points at sample-large but shows different meta */
export const OVERRIDE_LINK = {
  slug: 'test-override',
  case: 'Share link with its own title and image (overrides the page)',
  target: 'sample-large',
  title: 'Flash deal: today only! ⚡',
  description: 'This share link shows its own title and image, while the page it opens is the rain-jacket post.',
  image: 'large-red-1200x630.jpg',
}
