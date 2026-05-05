/* ═══════════════════════════════════════════════════════════
   AvatarArchive — player-engine.js
   Shared video player engine. Handles: controls, seeking,
   volume, playback speed, fullscreen, OSD toasts, SRT
   captions, skip-intro, next-episode auto-advance,
   brightness/contrast, and keyboard shortcuts.

   Each consuming page must define:
     window.PLAYER_CONFIG = { ... }
   before this script executes. See config block below.
═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════
     ELEMENT REFS
     Queried once at startup and reused.
     All refs are optional — the engine degrades
     gracefully when elements are absent.
  ══════════════════════════════════════════ */
  const vid         = document.getElementById('mainVideo');
  const shell       = document.getElementById('playerShell');
  if (!vid || !shell) return; // not a video page

  const bigPlay     = document.getElementById('bigPlay');
  const clickArea   = document.getElementById('clickArea');
  const playBtn     = document.getElementById('playBtn');
  const icPlay      = document.getElementById('icPlay');
  const icPause     = document.getElementById('icPause');
  const curEl       = document.getElementById('curTime');
  const durEl       = document.getElementById('durTime');
  const progFill    = document.getElementById('progFill');
  const progBuf     = document.getElementById('progBuf');
  const progThumb   = document.getElementById('progThumb');
  const prog        = document.getElementById('prog');
  const volBtn      = document.getElementById('volBtn');
  const volSlider   = document.getElementById('volSlider');
  const icVolOn     = document.getElementById('icVolOn');
  const icVolOff    = document.getElementById('icVolOff');
  const playerFrame = document.getElementById('playerFrame');
  const skipBtn     = document.getElementById('skipIntroBtn');
  const nextPanel   = document.getElementById('nextEpPanel');
  const nepTitle    = document.getElementById('nepTitle');
  const nepBtn      = document.getElementById('nepBtn');
  const nepProgress = document.getElementById('nepProgress');
  const nepSkip     = document.getElementById('nepSkip');
  const bufSpin     = document.getElementById('bufferSpinner');
  const ccBtn       = document.getElementById('ccBtn');
  const captionBox  = document.getElementById('captionBox');
  const osdToast    = document.getElementById('osdToast');
  const fsBtn       = document.getElementById('fsBtn');


  /* ══════════════════════════════════════════
     CONFIG
     Pages set window.PLAYER_CONFIG before
     this script runs to customise behaviour.
  ══════════════════════════════════════════ */
  const CFG = window.PLAYER_CONFIG || {};
  const INTRO_SHOW_FROM    = CFG.introShowFrom    ?? 2;  // seconds
  const INTRO_END_SEC      = CFG.introEndSec      ?? 90; // seconds
  const NEXT_EP_BEFORE_END = CFG.nextEpBeforeEnd  ?? 30; // seconds


  /* ══════════════════════════════════════════
     UTILITIES
  ══════════════════════════════════════════ */

  // Format seconds → "h:mm:ss" or "m:ss"
  function fmt(s) {
    s = Math.floor(s || 0);
    const h  = Math.floor(s / 3600);
    const m  = Math.floor((s % 3600) / 60);
    const sc = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`
      : `${m}:${String(sc).padStart(2,'0')}`;
  }


  /* ══════════════════════════════════════════
     OSD TOAST
     Brief centred message — volume level,
     seek offset, speed, etc.
  ══════════════════════════════════════════ */
  let osdTimer = null;

  function showOSD(msg) {
    if (!osdToast) return;
    osdToast.textContent = msg;
    osdToast.classList.remove('hide');
    osdToast.classList.add('show');
    clearTimeout(osdTimer);
    osdTimer = setTimeout(() => {
      osdToast.classList.remove('show');
      osdToast.classList.add('hide');
    }, 700);
  }

  // Expose so page scripts can fire OSD messages too
  window._playerShowOSD = showOSD;


  /* ══════════════════════════════════════════
     IDLE CURSOR
     Hides the controls and cursor after 1.25 s
     of inactivity during playback.
  ══════════════════════════════════════════ */
  let idleTimer;

  function resetIdle() {
    shell.classList.remove('idle');
    clearTimeout(idleTimer);
    if (!vid.paused) idleTimer = setTimeout(() => shell.classList.add('idle'), 1250);
  }

  document.addEventListener('mousemove',  resetIdle, { passive: true });
  document.addEventListener('keydown',    resetIdle);
  document.addEventListener('touchstart', resetIdle, { passive: true });


  /* ══════════════════════════════════════════
     PLAY / PAUSE
  ══════════════════════════════════════════ */
  function togglePlay() {
    vid.paused ? vid.play().catch(() => {}) : vid.pause();
  }

  // Gold shimmer on the player frame while paused
  function updateShimmer() {
    playerFrame?.classList.toggle('shimmer-active', vid.paused);
  }

  clickArea?.addEventListener('click', togglePlay);
  playBtn?.addEventListener('click', togglePlay);

  vid.addEventListener('play', () => {
    if (icPlay)  icPlay.style.display  = 'none';
    if (icPause) icPause.style.display = '';
    bigPlay?.classList.add('hidden');
    resetIdle();
    updateShimmer();
  });

  vid.addEventListener('pause', () => {
    if (icPlay)  icPlay.style.display  = '';
    if (icPause) icPause.style.display = 'none';
    bigPlay?.classList.remove('hidden');
    shell.classList.remove('idle');
    updateShimmer();
    cancelAuto();
  });

  updateShimmer();


  /* ══════════════════════════════════════════
     TOUCH DOUBLE-TAP SEEK
     Single tap → play/pause.
     Double tap left  → −10 s.
     Double tap right → +10 s.
  ══════════════════════════════════════════ */
  let tapTimer = null, tapCount = 0, lastTapX = 0;

  clickArea?.addEventListener('touchend', e => {
    e.preventDefault();
    resetIdle();
    lastTapX = e.changedTouches[0].clientX;
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => {
      if (tapCount === 1) {
        togglePlay();
      } else {
        const rect   = clickArea.getBoundingClientRect();
        const isLeft = lastTapX < rect.left + rect.width / 2;
        if (isLeft) {
          vid.currentTime = Math.max(0, vid.currentTime - 10);
          showOSD('−10s');
        } else {
          if (isFinite(vid.duration)) vid.currentTime = Math.min(vid.duration, vid.currentTime + 10);
          showOSD('+10s');
        }
      }
      tapCount = 0;
    }, 250);
  }, { passive: false });


  /* ══════════════════════════════════════════
     PROGRESS BAR
     timeupdate is throttled: we flag a pending
     update and only apply it inside rAF to
     prevent redundant paints on browsers that
     fire timeupdate on every decoded frame.
  ══════════════════════════════════════════ */
  vid.addEventListener('loadedmetadata', () => { if (durEl) durEl.textContent = fmt(vid.duration); });

  let isSeeking  = false;
  let tuPending  = false;

  vid.addEventListener('timeupdate', () => {
    if (tuPending) return;
    tuPending = true;
    requestAnimationFrame(() => {
      tuPending = false;
      if (isSeeking) return;

      const t   = vid.currentTime;
      const dur = vid.duration;
      const pct = (t / dur) * 100 || 0;

      if (progFill)  progFill.style.width  = pct + '%';
      if (progThumb) progThumb.style.left  = pct + '%';
      if (curEl)     curEl.textContent     = fmt(t);

      // Buffer indicator
      if (vid.buffered.length && progBuf) {
        const bufferedEnd = vid.buffered.end(vid.buffered.length - 1);
        progBuf.style.width = ((bufferedEnd / dur) * 100 || 0) + '%';
      }

      // Delegate to page scripts (progress saving, etc.)
      window._playerOnTimeUpdate?.(vid, pct);

      handleSkipIntro();
      handleNextPanel();
      renderCaption();
    });
  });

  // Translate a clientX position into a video timestamp and apply it
  function seekTo(clientX) {
    const r   = prog.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const t   = pct * vid.duration;
    vid.currentTime = t;
    if (progFill)  progFill.style.width = (pct * 100) + '%';
    if (progThumb) progThumb.style.left = (pct * 100) + '%';
    if (curEl)     curEl.textContent    = fmt(t);
  }

  if (prog) {
    prog.addEventListener('mousedown', e => { isSeeking = true; seekTo(e.clientX); e.stopPropagation(); });
    document.addEventListener('mousemove',  e => { if (isSeeking) seekTo(e.clientX); },          { passive: true });
    document.addEventListener('mouseup',    ()  => { isSeeking = false; });
    prog.addEventListener('touchstart',     e => { isSeeking = true; seekTo(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('touchmove',  e => { if (isSeeking) seekTo(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('touchend',   ()  => { isSeeking = false; },                        { passive: true });
  }


  /* ══════════════════════════════════════════
     VOLUME
  ══════════════════════════════════════════ */
  function updateVolUI() {
    const muted = vid.muted || vid.volume === 0;
    if (icVolOn)  icVolOn.style.display  = muted ? 'none' : '';
    if (icVolOff) icVolOff.style.display = muted ? ''     : 'none';
    const pct = muted ? 0 : vid.volume * 100;
    if (volSlider) {
      volSlider.style.background =
        `linear-gradient(to right,var(--blue) ${pct}%,rgba(255,255,255,.15) ${pct}%)`;
    }
  }

  volSlider?.addEventListener('input', () => {
    vid.volume = parseFloat(volSlider.value);
    vid.muted  = vid.volume === 0;
    updateVolUI();
  });

  volBtn?.addEventListener('click', () => {
    vid.muted = !vid.muted;
    if (volSlider) volSlider.value = vid.muted ? 0 : (vid.volume || 1);
    updateVolUI();
  });

  vid.addEventListener('volumechange', updateVolUI);

  // Restore persisted volume on load
  const savedVol   = localStorage.getItem('avatarhub_volume');
  const savedMuted = localStorage.getItem('avatarhub_muted');
  if (savedVol   !== null) { vid.volume = parseFloat(savedVol); if (volSlider) volSlider.value = savedVol; }
  if (savedMuted === 'true') { vid.muted = true; if (volSlider) volSlider.value = 0; }
  updateVolUI();

  // Persist volume changes (debounced to reduce localStorage writes)
  let volSaveTimer;
  vid.addEventListener('volumechange', () => {
    clearTimeout(volSaveTimer);
    volSaveTimer = setTimeout(() => {
      localStorage.setItem('avatarhub_volume', vid.volume);
      localStorage.setItem('avatarhub_muted',  vid.muted);
    }, 300);
  });


  /* ══════════════════════════════════════════
     FULLSCREEN
     Tries the Fullscreen API first, falls back
     to the WebKit prefix, then to iOS native.
  ══════════════════════════════════════════ */
  function toggleFullscreen() {
    const inFS = document.fullscreenElement || document.webkitFullscreenElement;
    if (inFS) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      if      (shell.requestFullscreen)       shell.requestFullscreen().catch(() => {});
      else if (shell.webkitRequestFullscreen)  shell.webkitRequestFullscreen();
      else if (vid.webkitEnterFullscreen)      vid.webkitEnterFullscreen();
    }
  }

  fsBtn?.addEventListener('click', toggleFullscreen);


  /* ══════════════════════════════════════════
     PLAYBACK SPEED
  ══════════════════════════════════════════ */
  const speedBtn  = document.getElementById('speedBtn');
  const speedMenu = document.getElementById('speedMenu');

  function setSpeed(s) {
    vid.playbackRate = s;
    if (speedBtn) {
      speedBtn.textContent = s === 1 ? '1×' : s + '×';
      speedBtn.classList.toggle('active', s !== 1);
    }
    speedMenu?.querySelectorAll('.speed-opt').forEach(o =>
      o.classList.toggle('active', parseFloat(o.dataset.s) === s)
    );
  }

  speedBtn?.addEventListener('click', e => { e.stopPropagation(); speedMenu?.classList.toggle('open'); });
  speedMenu?.querySelectorAll('.speed-opt').forEach(opt =>
    opt.addEventListener('click', e => {
      e.stopPropagation();
      const s = parseFloat(opt.dataset.s);
      setSpeed(s);
      speedMenu.classList.remove('open');
      showOSD(s + '×');
    })
  );
  document.addEventListener('click', () => speedMenu?.classList.remove('open'));


  /* ══════════════════════════════════════════
     BUFFER SPINNER
  ══════════════════════════════════════════ */
  const showSpinner = () => bufSpin && (bufSpin.style.display = 'block');
  const hideSpinner = () => bufSpin && (bufSpin.style.display = 'none');

  vid.addEventListener('waiting', showSpinner);
  vid.addEventListener('playing', hideSpinner);
  vid.addEventListener('canplay', hideSpinner);


  /* ══════════════════════════════════════════
     BRIGHTNESS & CONTRAST
     Mini picture-quality panel with sliders
     and a one-click reset.
  ══════════════════════════════════════════ */
  (function () {
    const pqBtn          = document.getElementById('pqBtn');
    const pqMenu         = document.getElementById('pqMenu');
    const brightSlider   = document.getElementById('brightSlider');
    const contrastSlider = document.getElementById('contrastSlider');
    const brightVal      = document.getElementById('brightVal');
    const contrastVal    = document.getElementById('contrastVal');
    const pqReset        = document.getElementById('pqReset');
    if (!pqBtn || !pqMenu) return;

    let br = 100, co = 100;

    function applyPQ() {
      vid.style.filter = `brightness(${br}%) contrast(${co}%)`;
      pqBtn.classList.toggle('active', br !== 100 || co !== 100);

      // Update slider track fill
      const fillStyle = (pct) =>
        `linear-gradient(to right,var(--gold) ${pct}%,rgba(255,255,255,.15) ${pct}%)`;
      if (brightSlider)   brightSlider.style.background   = fillStyle(br  / 160 * 100);
      if (contrastSlider) contrastSlider.style.background = fillStyle(co  / 160 * 100);
    }

    brightSlider?.addEventListener('input', () => {
      br = parseInt(brightSlider.value);
      if (brightVal) brightVal.textContent = br + '%';
      applyPQ();
    });

    contrastSlider?.addEventListener('input', () => {
      co = parseInt(contrastSlider.value);
      if (contrastVal) contrastVal.textContent = co + '%';
      applyPQ();
    });

    pqReset?.addEventListener('click', () => {
      br = co = 100;
      if (brightSlider)   brightSlider.value         = 100;
      if (contrastSlider) contrastSlider.value        = 100;
      if (brightVal)      brightVal.textContent       = '100%';
      if (contrastVal)    contrastVal.textContent     = '100%';
      applyPQ();
    });

    pqBtn.addEventListener('click',   e => { e.stopPropagation(); pqMenu.classList.toggle('open'); });
    pqMenu.addEventListener('click',  e => e.stopPropagation());
    document.addEventListener('click', () => pqMenu.classList.remove('open'));

    applyPQ();
  })();


  /* ══════════════════════════════════════════
     SKIP INTRO BUTTON
  ══════════════════════════════════════════ */
  function handleSkipIntro() {
    if (!skipBtn) return;
    const t = vid.currentTime;
    skipBtn.style.display = (t >= INTRO_SHOW_FROM && t < INTRO_END_SEC) ? 'block' : 'none';
  }

  skipBtn?.addEventListener('click', () => {
    vid.currentTime         = INTRO_END_SEC;
    skipBtn.style.display   = 'none';
  });


  /* ══════════════════════════════════════════
     NEXT EPISODE PANEL
     Appears 30 s (configurable) before the
     episode ends. An animated progress bar
     counts down to auto-advance.
  ══════════════════════════════════════════ */
  let panelShown = false;
  let autoFrame  = null;
  let autoStart  = null;

  function handleNextPanel() {
    if (!nextPanel || !window._playerGetNext) return;
    if (!isFinite(vid.duration) || vid.duration === 0) return;

    const rem = vid.duration - vid.currentTime;
    if (rem <= NEXT_EP_BEFORE_END && rem > 0) { if (!panelShown) showNextPanel(); }
    else if (rem > NEXT_EP_BEFORE_END)          { if (panelShown) hideNextPanel(); }
  }

  function showNextPanel() {
    if (!window._playerGetNext) return;
    const next = window._playerGetNext();
    if (!next) { hideNextPanel(); return; }

    panelShown = true;
    if (nepTitle) nepTitle.textContent = next.title;
    nextPanel.classList.add('visible');
    nextPanel.style.display = 'block';

    cancelAuto();
    autoStart = Date.now();

    // Fill duration = remaining video time (or default)
    const fillDur = Math.max(1, isFinite(vid.duration)
      ? (vid.duration - vid.currentTime) * 1000
      : NEXT_EP_BEFORE_END * 1000
    );

    function tick() {
      const pct = Math.min(100, ((Date.now() - autoStart) / fillDur) * 100);
      if (nepProgress) nepProgress.style.width = pct + '%';
      if (pct >= 100) { window._playerLoadNext?.(); return; }
      autoFrame = requestAnimationFrame(tick);
    }
    autoFrame = requestAnimationFrame(tick);
  }

  function hideNextPanel() {
    panelShown = false;
    nextPanel.classList.remove('visible');
    nextPanel.style.display = 'none';
    cancelAuto();
  }

  function cancelAuto() {
    if (autoFrame)   { cancelAnimationFrame(autoFrame); autoFrame = null; }
    if (nepProgress)   nepProgress.style.width = '0%';
    autoStart = null;
  }

  nepBtn?.addEventListener('click',  () => window._playerLoadNext?.());
  nepSkip?.addEventListener('click', () => { hideNextPanel(); panelShown = true; });
  vid.addEventListener('ended', () => { updateShimmer(); showNextPanel(); });


  /* ══════════════════════════════════════════
     SRT CAPTIONS
     Fetches a .srt file, parses it, and renders
     the current cue via a binary search — O(log n)
     vs the naive O(n) .find() approach.
  ══════════════════════════════════════════ */
  let captionsOn  = false;
  let srtCues     = [];
  let lastCueIdx  = -1;
  let CAPTION_OFFSET = parseFloat(localStorage.getItem('avatarhub_cc_offset') || '0');

  function parseSRT(text) {
    return text.replace(/\r/g, '').trim().split(/\n\n+/).reduce((acc, block) => {
      const lines = block.split('\n');
      const times = lines[1]?.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s-->\s(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
      if (times && lines.length >= 3) {
        const toSec = (h, m, s, ms) => +h * 3600 + +m * 60 + +s + +ms / 1000;
        acc.push({
          start: toSec(times[1],times[2],times[3],times[4]),
          end:   toSec(times[5],times[6],times[7],times[8]),
          text:  lines.slice(2).join('\n'),
        });
      }
      return acc;
    }, []);
  }

  function showCaption(text) {
    if (!captionBox) return;
    captionBox.innerHTML = '<span>' + text.replace(/\n/g, '<br>') + '</span>';
    captionBox.style.display = 'block';
    requestAnimationFrame(() => captionBox.classList.add('visible'));
  }

  function hideCaption() {
    if (!captionBox) return;
    captionBox.classList.remove('visible');
    // Only set display:none after the CSS fade completes
    setTimeout(() => {
      if (!captionBox.classList.contains('visible')) captionBox.style.display = 'none';
    }, 200);
  }

  // Binary search — far faster than .find() on large SRT files
  function findCue(t) {
    if (!srtCues.length) return null;
    let lo = 0, hi = srtCues.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const c   = srtCues[mid];
      if (t < c.start)    hi = mid - 1;
      else if (t > c.end) lo = mid + 1;
      else                return { cue: c, idx: mid };
    }
    return null;
  }

  function renderCaption() {
    if (!captionsOn || !srtCues.length || vid.paused) return;
    const result = findCue(vid.currentTime + CAPTION_OFFSET);
    const idx    = result ? result.idx : -1;
    if (idx === lastCueIdx) return; // cue hasn't changed
    lastCueIdx = idx;
    result ? showCaption(result.cue.text) : hideCaption();
  }

  function nudgeCaptionOffset(delta) {
    CAPTION_OFFSET = Math.round((CAPTION_OFFSET + delta) * 10) / 10;
    localStorage.setItem('avatarhub_cc_offset', CAPTION_OFFSET);
    lastCueIdx = -1; // force re-render at new offset
    const sign = CAPTION_OFFSET > 0 ? '+' : '';
    showOSD('CC ' + (CAPTION_OFFSET === 0 ? 'Sync Reset' : sign + CAPTION_OFFSET + 's'));
  }

  function fetchSRT(url) {
    if (!url) return;
    fetch(url)
      .then(r  => r.ok ? r.text() : Promise.reject())
      .then(t  => { srtCues = parseSRT(t); lastCueIdx = -1; })
      .catch(() => {});
  }

  ccBtn?.addEventListener('click', () => {
    captionsOn = !captionsOn;
    ccBtn.classList.toggle('active', captionsOn);
    if (!captionsOn) { hideCaption(); lastCueIdx = -1; return; }
    // Lazy-load SRT on first CC enable
    if (!srtCues.length) fetchSRT(window._playerGetSubUrl?.());
  });

  // Exposed so page scripts can swap SRT files on episode change
  window._playerLoadSrt = function (url) {
    srtCues = []; lastCueIdx = -1; hideCaption();
    fetchSRT(url);
  };


  /* ══════════════════════════════════════════
     KEYBOARD SHORTCUTS
  ══════════════════════════════════════════ */
  document.addEventListener('keydown', e => {
    // Don't intercept when typing in a text field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.code) {
      case 'Space': case 'KeyK':
        e.preventDefault(); togglePlay(); break;

      case 'ArrowRight':
        e.preventDefault();
        if (isFinite(vid.duration)) vid.currentTime = Math.min(vid.duration, vid.currentTime + 5);
        showOSD('+5s'); break;

      case 'ArrowLeft':
        e.preventDefault();
        vid.currentTime = Math.max(0, vid.currentTime - 5);
        showOSD('−5s'); break;

      case 'ArrowUp':
        e.preventDefault();
        vid.volume = Math.min(1, vid.volume + .1); vid.muted = false;
        if (volSlider) volSlider.value = vid.volume;
        updateVolUI(); showOSD('Vol ' + Math.round(vid.volume * 100) + '%'); break;

      case 'ArrowDown':
        e.preventDefault();
        vid.volume = Math.max(0, vid.volume - .1); vid.muted = vid.volume === 0;
        if (volSlider) volSlider.value = vid.volume;
        updateVolUI(); showOSD('Vol ' + Math.round(vid.volume * 100) + '%'); break;

      case 'KeyM':
        vid.muted = !vid.muted;
        if (volSlider) volSlider.value = vid.muted ? 0 : (vid.volume || 1);
        updateVolUI(); showOSD(vid.muted ? 'Muted' : 'Sound On'); break;

      case 'KeyF':
        e.preventDefault(); toggleFullscreen(); break;

      case 'KeyC':
        ccBtn?.click(); break;

      case 'BracketLeft':  nudgeCaptionOffset(-0.5); break;
      case 'BracketRight': nudgeCaptionOffset( 0.5); break;
      case 'Backslash':    nudgeCaptionOffset(-CAPTION_OFFSET); break; // reset sync

      case 'KeyN':
        window._playerLoadNext?.(); break;

      case 'Slash':
        if (e.shiftKey) {
          e.preventDefault();
          document.getElementById('shortcutsModal')?.classList.toggle('open');
        }
        break;
    }
  });


  /* ══════════════════════════════════════════
     SHORTCUTS MODAL
  ══════════════════════════════════════════ */
  const shortcutsModal = document.getElementById('shortcutsModal');
  const shortcutsClose = document.getElementById('shortcutsClose');

  shortcutsClose?.addEventListener('click', () => shortcutsModal?.classList.remove('open'));
  shortcutsModal?.addEventListener('click', e => { if (e.target === shortcutsModal) shortcutsModal.classList.remove('open'); });


  /* ══════════════════════════════════════════
     CLEANUP
     Pause the video and clear timers when the
     browser navigates away to free resources.
  ══════════════════════════════════════════ */
  window.addEventListener('pagehide', () => {
    vid.pause();
    clearTimeout(idleTimer);
    clearTimeout(osdTimer);
  }, { passive: true });


  /* ══════════════════════════════════════════
     PUBLIC API
     Exposed on window so consuming page scripts
     can integrate without importing this file.
  ══════════════════════════════════════════ */
  window._playerVid            = vid;
  window._playerParseSRT       = parseSRT;
  window._playerSrtCues        = () => srtCues;
  window._playerSetSrtCues     = c  => { srtCues = c; lastCueIdx = -1; };
  window._playerResetCaption   = () => { srtCues = []; lastCueIdx = -1; hideCaption(); };
  window._playerUpdateShimmer  = updateShimmer;
  window._playerCancelAuto     = cancelAuto;
  window._playerHideNextPanel  = hideNextPanel;
  window._playerFmt            = fmt;

})();
