# AvatarArchive

A fan-made personal media hub for the entire Avatar universe — built by Jeffrey Creates.

## What's inside

| Page | Content |
|------|---------|
| `index.html` | Home screen — all series, films, and features in one place |
| `atla.html` | Avatar: The Last Airbender (2005–2008) — all 3 books, 61 episodes |
| `kora.html` | The Legend of Korra (2012–2014) — all 4 books, 52 episodes |
| `liveshow.html` | Netflix Live Action Series (2024) — seasons 1 & 2 |
| `movie2026.html` | Aang, The Last Airbender — 2026 animated film |
| `movie2010.html` | The Last Airbender — 2010 live action film |
| `books.html` | Avatar graphic novels & comics (Dark Horse) |
| `games.html` | ATLA games collection |
| `merch.html` | Official merchandise — links to Paramount, Netflix, Nick, Funko, and more |

## Features

- 🎬 Custom video player with skip intro, next episode, progress memory
- 💬 **AI Captions** — real-time Whisper-powered captions that generate as you watch, YouTube-style
- 📺 SRT subtitle support with automatic fetch per episode
- 🔍 Cross-series episode search
- 🎨 Multiple themes (Dark, Parchment, Water, Earth)
- 🔊 Ambient sound toggle
- 📱 PWA — installable on mobile and desktop
- 🛍️ Official merch links (Paramount, Netflix Shop, Nick Shop, Funko, Hot Topic, Dark Horse, and more)

## AI Captions

The AI CC button in the video player uses **Whisper Tiny** (via Transformers.js + WebAssembly) to
generate captions in real-time as the video plays — no server required, everything runs in the browser.

- First use downloads ~39 MB of model weights (cached in IndexedDB, permanent)
- Audio is captured live from the playing video via the Web Audio API
- Processed in 30-second chunks — captions appear progressively like YouTube
- Once an episode is fully captioned, results are cached in localStorage for instant replay

## Tech stack

- Vanilla HTML/CSS/JS — no frameworks
- Transformers.js + Whisper Tiny for AI captions
- Web Audio API for real-time audio capture
- LocalStorage for progress, captions cache, and preferences
- PWA with service worker for offline shell caching

---

*Made with 🔥 by [Jeffrey Creates](https://www.youtube.com/@Jeffrey_Creates)*
