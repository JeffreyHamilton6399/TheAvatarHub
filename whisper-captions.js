/* ═══════════════════════════════════════════════════════════════════
   AVATARARCHIVE  —  whisper-captions.js  v2.1
   Real-time AI caption engine using Transformers.js + Whisper Tiny.
   Works like YouTube auto-captions: captures live audio from the
   playing video, processes 30-second chunks, and injects timed cues
   into the player as the video plays — no video download required.

   v2.1 fixes:
   · AudioContext now runs at the browser's native sample rate
     (44100 or 48000 Hz) so video audio plays back at full quality.
   · PCM chunks are downsampled to 16 kHz in software before being
     sent to Whisper — keeps ASR quality without touching playback.
   · injectButton() accepts ep as a string OR a zero-argument function
     so the cache key always reflects the currently-playing episode.
═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* ── Constants ─────────────────────────────────────────────────── */
  const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1/dist/transformers.min.js';
  const MODEL_NAME       = 'Xenova/whisper-tiny.en';
  const CHUNK_SECS       = 30;
  const WHISPER_RATE     = 16000;   // Whisper's required input sample rate
  const BUFFER_SIZE      = 4096;
  const CACHE_KEY_PFX    = 'avatarachive_srt_';

  /* ── Module state ───────────────────────────────────────────────── */
  let _pipeline    = null;
  let _loadPromise = null;
  let _audioCtx    = null;
  let _sourceNode  = null;
  let _procNode    = null;
  let _pcmBuffer   = [];
  let _chunkStart  = 0;
  let _isCapturing = false;
  let _isProcessing= false;
  let _activeVid   = null;

  const WC = {

    injectButton(ccBtn, vid, captionBox, prefix, ep) {
      if (!ccBtn || !vid) return;
      if (document.getElementById('aiCCBtn')) return;

      const btn = document.createElement('button');
      btn.id        = 'aiCCBtn';
      btn.className = ccBtn.className;
      btn.title     = 'Auto-generate captions with AI (Whisper)';
      btn.innerHTML = `<span style="font-family:'Cinzel',serif;font-size:.48rem;letter-spacing:.06em">AI CC</span>`;
      btn.style.cssText = 'border:1px solid rgba(77,184,255,.35);border-radius:4px;padding:.2em .5em;color:rgba(77,184,255,.65);background:none;cursor:pointer;transition:color .2s,border-color .2s';

      ccBtn.parentNode.insertBefore(btn, ccBtn.nextSibling);
      /* ep can be a static string or a zero-arg function — evaluated at click time
         so the cache key always matches the currently-playing episode. */
      btn.addEventListener('click', () => {
        const epKey = typeof ep === 'function' ? ep() : ep;
        WC.toggle(btn, vid, captionBox, prefix, epKey);
      });
      return btn;
    },

    async toggle(btn, vid, captionBox, prefix, ep) {
      if (_isCapturing) {
        WC._stopCapture();
        btn.style.color       = 'rgba(77,184,255,.65)';
        btn.style.borderColor = 'rgba(77,184,255,.35)';
        btn.title = 'Auto-generate captions with AI (Whisper)';
        return;
      }

      const cacheKey = CACHE_KEY_PFX + prefix + '_' + ep;
      const cached   = WC._loadCache(cacheKey);
      if (cached) {
        WC._applyCues(cached, vid, captionBox);
        btn.style.color       = '#3ddc84';
        btn.style.borderColor = 'rgba(61,220,132,.5)';
        btn.title = 'AI Captions active (from cache)';
        return;
      }

      btn.style.color       = '#f5c518';
      btn.style.borderColor = 'rgba(245,197,24,.4)';
      btn.title = 'Loading AI model… (~39 MB first time only)';
      btn.innerHTML = `<span style="font-family:'Cinzel',serif;font-size:.44rem;letter-spacing:.04em">⟳ AI</span>`;

      try {
        const pipe = await WC._loadPipeline(btn);
        if (!pipe) return;

        btn.title = 'AI Captions: live generation active…';
        btn.innerHTML = `<span style="font-family:'Cinzel',serif;font-size:.48rem;letter-spacing:.06em">AI CC</span>`;
        await WC._startCapture(pipe, btn, vid, captionBox, cacheKey);

      } catch (err) {
        console.warn('[AvatarArchive Whisper]', err);
        btn.style.color       = '#f97316';
        btn.style.borderColor = 'rgba(249,115,22,.4)';
        btn.title = 'Caption error — ' + (err.message || err);
        btn.innerHTML = `<span style="font-family:'Cinzel',serif;font-size:.48rem;letter-spacing:.06em">AI CC</span>`;
      }
    },

    async _loadPipeline(btn) {
      if (_pipeline) return _pipeline;
      if (_loadPromise) return _loadPromise;

      _loadPromise = (async () => {
        const { pipeline, env } = await import(TRANSFORMERS_CDN);
        env.allowLocalModels = false;
        env.useBrowserCache  = true;
        _pipeline = await pipeline('automatic-speech-recognition', MODEL_NAME, { quantized: true });
        return _pipeline;
      })();

      try { return await _loadPromise; }
      catch (e) { _loadPromise = null; throw e; }
    },

    async _startCapture(pipe, btn, vid, captionBox, cacheKey) {
      /* Build AudioContext at the browser's native sample rate (44100 or 48000 Hz).
         Using 16 kHz here would route ALL video audio through a degraded 16 kHz
         graph, silencing or distorting playback.  We downsample to 16 kHz in
         software (see _downsample) only when handing data off to Whisper. */
      if (_activeVid !== vid) {
        WC._stopCapture();
        _audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
        _sourceNode = _audioCtx.createMediaElementSource(vid);
        _sourceNode.connect(_audioCtx.destination);   // keep audio audible
        _activeVid  = vid;
      }

      if (_audioCtx.state === 'suspended') await _audioCtx.resume();

      _procNode = _audioCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);
      _sourceNode.connect(_procNode);
      _procNode.connect(_audioCtx.destination);

      _pcmBuffer    = [];
      _chunkStart   = vid.currentTime;
      _isCapturing  = true;
      _isProcessing = false;

      const allCues  = [];
      /* How many native-rate samples equal CHUNK_SECS of audio */
      const nativeSamplesPerChunk = CHUNK_SECS * _audioCtx.sampleRate;

      _procNode.onaudioprocess = async (e) => {
        if (!_isCapturing) return;

        _pcmBuffer.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        const totalSamples = _pcmBuffer.reduce((n, c) => n + c.length, 0);
        /* Compare against native-rate sample count, not WHISPER_RATE */
        if (totalSamples < nativeSamplesPerChunk || _isProcessing) return;

        const frozen      = _pcmBuffer.slice();
        const frozenStart = _chunkStart;
        _pcmBuffer    = [];
        _chunkStart   = vid.currentTime;
        _isProcessing = true;

        try {
          /* Merge native-rate frames, then downsample to 16 kHz for Whisper */
          const merged     = WC._merge(frozen);
          const resampled  = WC._downsample(merged, _audioCtx.sampleRate, WHISPER_RATE);
          const result = await pipe(resampled, {
            task:              'transcribe',
            language:          'en',
            return_timestamps: true,
            chunk_length_s:    30,
            stride_length_s:   5,
          });

          const newCues = (result.chunks || [])
            .map(c => ({
              start: frozenStart + (c.timestamp[0] ?? 0),
              end:   frozenStart + (c.timestamp[1] ?? (c.timestamp[0] + 3)),
              text:  (c.text || '').trim(),
            }))
            .filter(c => c.text);

          if (typeof srtCues !== 'undefined') {
            srtCues.push(...newCues);
            captionsOn = true;
            if (typeof ccBtn !== 'undefined') ccBtn.classList.add('active');
          } else {
            WC._applyCues(newCues, vid, captionBox);
          }

          allCues.push(...newCues);

          if (vid.ended) {
            WC._saveCache(cacheKey, allCues);
            btn.style.color       = '#3ddc84';
            btn.style.borderColor = 'rgba(61,220,132,.5)';
            btn.title = 'AI Captions complete — cached for next time';
          }
        } catch (err) {
          console.warn('[AvatarArchive Whisper] Chunk error:', err);
        }

        _isProcessing = false;
      };

      vid.addEventListener('ended', () => {
        if (allCues.length) WC._saveCache(cacheKey, allCues);
        WC._stopCapture();
      }, { once: true });

      WC._startPulse(btn);
    },

    _stopCapture() {
      _isCapturing = false;
      if (_procNode) {
        try { _procNode.disconnect(); } catch (_) {}
        _procNode.onaudioprocess = null;
        _procNode = null;
      }
      _pcmBuffer = [];
      WC._stopPulse();
    },

    _merge(chunks) {
      const total  = chunks.reduce((n, c) => n + c.length, 0);
      const result = new Float32Array(total);
      let off = 0;
      for (const c of chunks) { result.set(c, off); off += c.length; }
      return result;
    },

    /* Linear downsampler — averages source samples into each output sample.
       fromRate: native AudioContext rate (e.g. 44100 / 48000)
       toRate  : Whisper's required input rate (16000) */
    _downsample(buffer, fromRate, toRate) {
      if (fromRate === toRate) return buffer;
      const ratio     = fromRate / toRate;
      const outLength = Math.floor(buffer.length / ratio);
      const out       = new Float32Array(outLength);
      for (let i = 0; i < outLength; i++) {
        const start = Math.floor(i * ratio);
        const end   = Math.min(Math.floor((i + 1) * ratio), buffer.length);
        let sum = 0;
        for (let j = start; j < end; j++) sum += buffer[j];
        out[i] = sum / (end - start);
      }
      return out;
    },

    _applyCues(cues, vid, captionBox) {
      if (!cues || !cues.length) return;

      if (typeof srtCues !== 'undefined') {
        srtCues.push(...cues);
        captionsOn = true;
        if (typeof ccBtn !== 'undefined') ccBtn.classList.add('active');
        return;
      }

      let last = null;
      vid.addEventListener('timeupdate', () => {
        const t   = vid.currentTime;
        const cue = cues.find(c => t >= c.start && t <= c.end);
        const txt = cue ? cue.text : null;
        if (txt === last) return;
        last = txt;
        if (txt) {
          captionBox.innerHTML = '<span>' + txt.replace(/\n/g, '<br>') + '</span>';
          captionBox.style.display = 'block';
          requestAnimationFrame(() => captionBox.classList.add('visible'));
        } else {
          captionBox.classList.remove('visible');
          setTimeout(() => {
            if (!captionBox.classList.contains('visible')) captionBox.style.display = 'none';
          }, 200);
        }
      });
    },

    _saveCache(key, cues) {
      try { localStorage.setItem(key, JSON.stringify(cues)); } catch (_) {}
    },
    _loadCache(key) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length ? parsed : null;
      } catch (_) { return null; }
    },

    _pulseInterval: null,
    _startPulse(btn) {
      let on = true;
      WC._pulseInterval = setInterval(() => { btn.style.opacity = (on = !on) ? '1' : '0.55'; }, 800);
    },
    _stopPulse() {
      if (WC._pulseInterval) { clearInterval(WC._pulseInterval); WC._pulseInterval = null; }
    },

    clearCache(prefix, ep) {
      try { localStorage.removeItem(CACHE_KEY_PFX + prefix + '_' + ep); } catch (_) {}
    },
  };

  global.WhisperCaptions = WC;

})(window);
