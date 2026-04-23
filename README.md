# AvatarArchive

A fan-made personal media hub for the entire Avatar universe — built by Jeffrey Creates.

---

## Pages

| File | Content |
|------|---------|
| `index.html` | Home screen — all series, films, and features in one place |
| `atla.html` | Avatar: The Last Airbender (2005–2008) — all 3 Books, 61 episodes |
| `kora.html` | The Legend of Korra (2012–2014) — all 4 Books, 52 episodes |
| `liveshow.html` | Netflix Live Action Series (2024) — Seasons 1 & 2 |
| `movie2026.html` | Aang, The Last Airbender — 2026 animated film |
| `movie2010.html` | The Last Airbender — 2010 live action film |
| `books.html` | Avatar graphic novels and comics (Dark Horse) |
| `games.html` | ATLA games collection |
| `merch.html` | Official merchandise — links to Paramount, Netflix, Nick, Funko, and more |

---

## Features

### Video Player
Custom-built player with skip-intro detection, next-episode auto-advance, and per-episode progress memory stored in `localStorage`. Keyboard shortcuts cover playback, volume, fullscreen, and captions.

### AI Captions
The **AI CC** button in the video player uses Whisper Tiny (via Transformers.js + WebAssembly) to generate captions in real time as the video plays — no server required. Audio is captured through the Web Audio API at the browser's native sample rate and downsampled to 16 kHz before being processed by the model.

- First use downloads approximately 39 MB of model weights (cached permanently in IndexedDB)
- Audio is processed in 30-second chunks; captions appear progressively like YouTube auto-captions
- Once an episode is fully captioned, results are cached in `localStorage` for instant replay on subsequent views
- The cache key updates per episode so each episode's captions are stored and retrieved independently

### SRT Subtitles
Each episode supports standard SRT subtitle files fetched automatically at load time. The CC button toggles these; AI CC generates captions independently.

### Cross-Series Search
A debounced search bar on the home page queries all 113+ episodes across ATLA, Korra, the films, games, and merchandise — results appear inline with series color-coding.

### Themes
Four built-in themes — Dark, Parchment, Water, Earth — applied via CSS custom properties and persisted in `localStorage`.

### Ambient Sound
Optional looping ambient audio with fade-in and fade-out, triggered on user gesture to comply with browser autoplay policies. Toggle lives in the settings panel.

### PWA
Installable on mobile and desktop via a Web App Manifest and inline service worker. Offline shell caching covers all HTML pages.

---

## AI Captions — Technical Detail

The engine lives in `whisper-captions.js`. Key design decisions:

**Native-rate AudioContext.** The `AudioContext` is created at the browser's default sample rate (44100 or 48000 Hz). Using 16 kHz here would route all video audio through a degraded graph, silencing or distorting playback entirely.

**Software downsampling.** The captured PCM buffer is resampled from the native rate down to 16 kHz via a linear averaging function (`_downsample`) before being passed to Whisper. Playback quality is never affected.

**Per-episode cache keys.** The episode identifier is evaluated lazily via a getter function passed to `injectButton`, so the cache key always matches the episode currently loaded in the player — even after the user switches episodes without refreshing.

**Capture lifecycle.** `loadEpisode()` calls `WhisperCaptions._stopCapture()` before changing the video source, preventing the `ScriptProcessorNode` from processing stale audio after a track change.

---

## Tech Stack

- Vanilla HTML, CSS, and JavaScript — no frameworks
- Transformers.js + Whisper Tiny for AI captions
- Web Audio API for real-time audio capture and processing
- `localStorage` for progress tracking, caption cache, and user preferences
- PWA with service worker for offline shell caching

---

*Made by [Jeffrey Creates](https://www.youtube.com/@Jeffrey_Creates)*
