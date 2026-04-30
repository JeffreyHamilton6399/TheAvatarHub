/* ═══════════════════════════════════════════════════════════
   AvatarArchive — player-engine.js  (performance-optimised)
   Shared video player: controls, seeking, volume, speed,
   fullscreen, OSD, captions (SRT), skip-intro, next-episode
   panel, brightness/contrast, keyboard shortcuts.

   Consuming pages must define window.PLAYER_CONFIG = { ... }
   before this script runs.
═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Refs — queried once, reused throughout ── */
  const vid        = document.getElementById('mainVideo');
  const shell      = document.getElementById('playerShell');
  if (!vid || !shell) return; // not a player page

  const bigPlay    = document.getElementById('bigPlay');
  const clickArea  = document.getElementById('clickArea');
  const playBtn    = document.getElementById('playBtn');
  const icPlay     = document.getElementById('icPlay');
  const icPause    = document.getElementById('icPause');
  const curEl      = document.getElementById('curTime');
  const durEl      = document.getElementById('durTime');
  const progFill   = document.getElementById('progFill');
  const progBuf    = document.getElementById('progBuf');
  const progThumb  = document.getElementById('progThumb');
  const prog       = document.getElementById('prog');
  const volBtn     = document.getElementById('volBtn');
  const volSlider  = document.getElementById('volSlider');
  const icVolOn    = document.getElementById('icVolOn');
  const icVolOff   = document.getElementById('icVolOff');
  const playerFrame= document.getElementById('playerFrame');
  const skipBtn    = document.getElementById('skipIntroBtn');
  const nextPanel  = document.getElementById('nextEpPanel');
  const nepTitle   = document.getElementById('nepTitle');
  const nepBtn     = document.getElementById('nepBtn');
  const nepProgress= document.getElementById('nepProgress');
  const nepSkip    = document.getElementById('nepSkip');
  const bufSpin    = document.getElementById('bufferSpinner');
  const ccBtn      = document.getElementById('ccBtn');
  const captionBox = document.getElementById('captionBox');
  const osdToast   = document.getElementById('osdToast');
  const fsBtn      = document.getElementById('fsBtn');

  /* ── Config (provided by each page) ── */
  const CFG = window.PLAYER_CONFIG || {};
  const INTRO_SHOW_FROM    = CFG.introShowFrom    ?? 2;
  const INTRO_END_SEC      = CFG.introEndSec      ?? 90;
  const NEXT_EP_BEFORE_END = CFG.nextEpBeforeEnd  ?? 30;

  /* ── Utilities ── */
  function fmt(s) {
    s = Math.floor(s || 0);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sc = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`
      : `${m}:${String(sc).padStart(2,'0')}`;
  }

  /* ── OSD Toast ── */
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
  window._playerShowOSD = showOSD;

  /* ── Idle cursor ── */
  let idleTimer;
  function resetIdle() {
    shell.classList.remove('idle');
    clearTimeout(idleTimer);
    if (!vid.paused) idleTimer = setTimeout(() => shell.classList.add('idle'), 1250);
  }
  document.addEventListener('mousemove', resetIdle, { passive: true });
  document.addEventListener('keydown',   resetIdle);
  document.addEventListener('touchstart',resetIdle, { passive: true });

  /* ── Play / Pause ── */
  function togglePlay() { vid.paused ? vid.play().catch(() => {}) : vid.pause(); }
  function updateShimmer() { playerFrame && playerFrame.classList.toggle('shimmer-active', vid.paused); }

  clickArea && clickArea.addEventListener('click', togglePlay);
  playBtn   && playBtn.addEventListener('click', togglePlay);

  vid.addEventListener('play', () => {
    if (icPlay)  icPlay.style.display  = 'none';
    if (icPause) icPause.style.display = '';
    bigPlay && bigPlay.classList.add('hidden');
    resetIdle(); updateShimmer();
  });
  vid.addEventListener('pause', () => {
    if (icPlay)  icPlay.style.display  = '';
    if (icPause) icPause.style.display = 'none';
    bigPlay && bigPlay.classList.remove('hidden');
    shell.classList.remove('idle');
    updateShimmer(); cancelAuto();
  });
  updateShimmer();

  /* ── Touch double-tap seek ── */
  let tapTimer = null, tapCount = 0, lastTapX = 0;
  clickArea && clickArea.addEventListener('touchend', e => {
    e.preventDefault(); resetIdle();
    lastTapX = e.changedTouches[0].clientX;
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => {
      if (tapCount === 1) { togglePlay(); }
      else {
        const rect   = clickArea.getBoundingClientRect();
        const isLeft = lastTapX < rect.left + rect.width / 2;
        if (isLeft) { vid.currentTime = Math.max(0, vid.currentTime - 10); showOSD('−10s'); }
        else { if (isFinite(vid.duration)) vid.currentTime = Math.min(vid.duration, vid.currentTime + 10); showOSD('+10s'); }
      }
      tapCount = 0;
    }, 250);
  }, { passive: false });

  /* ── Progress bar ── */
  vid.addEventListener('loadedmetadata', () => { if (durEl) durEl.textContent = fmt(vid.duration); });

  let isSeeking = false;

  /* PERF: throttle timeupdate to 4× per second max.
     The native event fires every 250ms already, but some browsers fire
     on every decoded frame. Using a flag + rAF prevents pointless repaints. */
  let _tuPending = false;
  vid.addEventListener('timeupdate', () => {
    if (_tuPending) return;
    _tuPending = true;
    requestAnimationFrame(() => {
      _tuPending = false;
      if (isSeeking) return;
      const t   = vid.currentTime;
      const dur = vid.duration;
      const pct = (t / dur) * 100 || 0;
      if (progFill)  progFill.style.width = pct + '%';
      if (progThumb) progThumb.style.left = pct + '%';
      if (curEl)     curEl.textContent    = fmt(t);
      if (vid.buffered.length && progBuf) {
        progBuf.style.width = ((vid.buffered.end(vid.buffered.length - 1) / dur) * 100 || 0) + '%';
      }
      window._playerOnTimeUpdate && window._playerOnTimeUpdate(vid, pct);
      handleSkipIntro();
      handleNextPanel();
      renderCaption();
    });
  });

  function seekTo(cx) {
    const r = prog.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (cx - r.left) / r.width));
    const t   = pct * vid.duration;
    vid.currentTime = t;
    if (progFill)  progFill.style.width = (pct * 100) + '%';
    if (progThumb) progThumb.style.left = (pct * 100) + '%';
    if (curEl)     curEl.textContent    = fmt(t);
  }
  if (prog) {
    prog.addEventListener('mousedown', e => { isSeeking = true; seekTo(e.clientX); e.stopPropagation(); });
    document.addEventListener('mousemove', e => { if (isSeeking) seekTo(e.clientX); }, { passive: true });
    document.addEventListener('mouseup', () => { isSeeking = false; });
    prog.addEventListener('touchstart', e => { isSeeking = true; seekTo(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('touchmove', e => { if (isSeeking) seekTo(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('touchend', () => { isSeeking = false; }, { passive: true });
  }

  /* ── Volume ── */
  function updateVolUI() {
    const m = vid.muted || vid.volume === 0;
    if (icVolOn)  icVolOn.style.display  = m ? 'none' : '';
    if (icVolOff) icVolOff.style.display = m ? '' : 'none';
    const p = m ? 0 : vid.volume * 100;
    if (volSlider) volSlider.style.background =
      `linear-gradient(to right,var(--blue) ${p}%,rgba(255,255,255,.15) ${p}%)`;
  }
  volSlider && volSlider.addEventListener('input', () => {
    vid.volume = parseFloat(volSlider.value); vid.muted = vid.volume === 0; updateVolUI();
  });
  volBtn && volBtn.addEventListener('click', () => {
    vid.muted = !vid.muted; if (volSlider) volSlider.value = vid.muted ? 0 : (vid.volume || 1); updateVolUI();
  });
  vid.addEventListener('volumechange', updateVolUI);

  // Restore persisted volume
  const _sv = localStorage.getItem('avatarhub_volume'), _sm = localStorage.getItem('avatarhub_muted');
  if (_sv !== null) { vid.volume = parseFloat(_sv); if (volSlider) volSlider.value = _sv; }
  if (_sm === 'true') { vid.muted = true; if (volSlider) volSlider.value = 0; }
  updateVolUI();

  // Persist volume changes (debounced to avoid excessive writes)
  let _volSaveTimer;
  vid.addEventListener('volumechange', () => {
    clearTimeout(_volSaveTimer);
    _volSaveTimer = setTimeout(() => {
      localStorage.setItem('avatarhub_volume', vid.volume);
      localStorage.setItem('avatarhub_muted', vid.muted);
    }, 300);
  });

  /* ── Fullscreen ── */
  function toggleFullscreen() {
    const inFS = document.fullscreenElement || document.webkitFullscreenElement;
    if (inFS) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      if (shell.requestFullscreen) shell.requestFullscreen().catch(() => {});
      else if (shell.webkitRequestFullscreen) shell.webkitRequestFullscreen();
      else if (vid.webkitEnterFullscreen) vid.webkitEnterFullscreen();
    }
  }
  fsBtn && fsBtn.addEventListener('click', toggleFullscreen);

  /* ── Playback speed ── */
  const speedBtn  = document.getElementById('speedBtn');
  const speedMenu = document.getElementById('speedMenu');
  function setSpeed(s) {
    vid.playbackRate = s;
    if (speedBtn) { speedBtn.textContent = s === 1 ? '1×' : s + '×'; speedBtn.classList.toggle('active', s !== 1); }
    speedMenu && speedMenu.querySelectorAll('.speed-opt').forEach(o =>
      o.classList.toggle('active', parseFloat(o.dataset.s) === s)
    );
  }
  speedBtn && speedBtn.addEventListener('click', e => { e.stopPropagation(); speedMenu && speedMenu.classList.toggle('open'); });
  speedMenu && speedMenu.querySelectorAll('.speed-opt').forEach(opt =>
    opt.addEventListener('click', e => {
      e.stopPropagation();
      const s = parseFloat(opt.dataset.s);
      setSpeed(s);
      speedMenu.classList.remove('open');
      showOSD(s + '×');
    })
  );
  document.addEventListener('click', () => speedMenu && speedMenu.classList.remove('open'));

  /* ── Buffer spinner ── */
  vid.addEventListener('waiting', () => bufSpin && (bufSpin.style.display = 'block'));
  vid.addEventListener('playing', () => bufSpin && (bufSpin.style.display = 'none'));
  vid.addEventListener('canplay', () => bufSpin && (bufSpin.style.display = 'none'));

  /* ── Brightness / Contrast ── */
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
      const p1 = br / 160 * 100, p2 = co / 160 * 100;
      if (brightSlider) brightSlider.style.background =
        `linear-gradient(to right,var(--gold) ${p1}%,rgba(255,255,255,.15) ${p1}%)`;
      if (contrastSlider) contrastSlider.style.background =
        `linear-gradient(to right,var(--gold) ${p2}%,rgba(255,255,255,.15) ${p2}%)`;
    }
    brightSlider   && brightSlider.addEventListener('input', () => {
      br = parseInt(brightSlider.value); if (brightVal) brightVal.textContent = br + '%'; applyPQ();
    });
    contrastSlider && contrastSlider.addEventListener('input', () => {
      co = parseInt(contrastSlider.value); if (contrastVal) contrastVal.textContent = co + '%'; applyPQ();
    });
    pqReset && pqReset.addEventListener('click', () => {
      br = co = 100;
      if (brightSlider)   brightSlider.value   = 100;
      if (contrastSlider) contrastSlider.value  = 100;
      if (brightVal)      brightVal.textContent   = '100%';
      if (contrastVal)    contrastVal.textContent  = '100%';
      applyPQ();
    });
    pqBtn.addEventListener('click', e => { e.stopPropagation(); pqMenu.classList.toggle('open'); });
    document.addEventListener('click', () => pqMenu.classList.remove('open'));
    pqMenu.addEventListener('click', e => e.stopPropagation());
    applyPQ();
  })();

  /* ── Skip Intro ── */
  function handleSkipIntro() {
    if (!skipBtn) return;
    const t = vid.currentTime;
    skipBtn.style.display = (t >= INTRO_SHOW_FROM && t < INTRO_END_SEC) ? 'block' : 'none';
  }
  skipBtn && skipBtn.addEventListener('click', () => {
    vid.currentTime = INTRO_END_SEC;
    if (skipBtn) skipBtn.style.display = 'none';
  });

  /* ── Next Episode panel ── */
  let panelShown = false, autoFrame = null, autoStart = null;

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
    if (nextPanel) { nextPanel.classList.add('visible'); nextPanel.style.display = 'block'; }
    cancelAuto();
    autoStart = Date.now();
    const fillDur = Math.max(1, (isFinite(vid.duration) ? vid.duration - vid.currentTime : NEXT_EP_BEFORE_END)) * 1000;
    function tick() {
      const pct = Math.min(100, ((Date.now() - autoStart) / fillDur) * 100);
      if (nepProgress) nepProgress.style.width = pct + '%';
      if (pct >= 100) { window._playerLoadNext && window._playerLoadNext(); return; }
      autoFrame = requestAnimationFrame(tick);
    }
    autoFrame = requestAnimationFrame(tick);
  }

  function hideNextPanel() {
    panelShown = false;
    if (nextPanel) { nextPanel.classList.remove('visible'); nextPanel.style.display = 'none'; }
    cancelAuto();
  }

  function cancelAuto() {
    if (autoFrame) { cancelAnimationFrame(autoFrame); autoFrame = null; }
    if (nepProgress) nepProgress.style.width = '0%';
    autoStart = null;
  }

  nepBtn  && nepBtn.addEventListener('click', () => window._playerLoadNext && window._playerLoadNext());
  nepSkip && nepSkip.addEventListener('click', () => { hideNextPanel(); panelShown = true; });
  vid.addEventListener('ended', () => { updateShimmer(); showNextPanel(); });

  /* ── SRT Captions ── */
  let captionsOn = false, srtCues = [], lastCueIdx = -1;
  let CAPTION_OFFSET = parseFloat(localStorage.getItem('avatarhub_cc_offset') || '0');

  function parseSRT(text) {
    return text.replace(/\r/g, '').trim().split(/\n\n+/).reduce((c, b) => {
      const l = b.split('\n');
      const t = l[1]?.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s-->\s(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
      if (t && l.length >= 3) {
        const p = (h, m, s, ms) => +h * 3600 + +m * 60 + +s + +ms / 1000;
        c.push({ start: p(t[1],t[2],t[3],t[4]), end: p(t[5],t[6],t[7],t[8]), text: l.slice(2).join('\n') });
      }
      return c;
    }, []);
  }

  function showCaption(t) {
    if (!captionBox) return;
    captionBox.innerHTML = '<span>' + t.replace(/\n/g, '<br>') + '</span>';
    captionBox.style.display = 'block';
    requestAnimationFrame(() => captionBox.classList.add('visible'));
  }

  function hideCaption() {
    if (!captionBox) return;
    captionBox.classList.remove('visible');
    setTimeout(() => { if (!captionBox.classList.contains('visible')) captionBox.style.display = 'none'; }, 200);
  }

  /* PERF: binary search for current cue instead of linear .find() */
  function findCue(t) {
    if (!srtCues.length) return null;
    let lo = 0, hi = srtCues.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const c   = srtCues[mid];
      if (t < c.start)    { hi = mid - 1; }
      else if (t > c.end) { lo = mid + 1; }
      else                { return { cue: c, idx: mid }; }
    }
    return null;
  }

  function renderCaption() {
    if (!captionsOn || !srtCues.length || vid.paused) return;
    const t      = vid.currentTime + CAPTION_OFFSET;
    const result = findCue(t);
    const idx    = result ? result.idx : -1;
    if (idx === lastCueIdx) return; // no change
    lastCueIdx = idx;
    result ? showCaption(result.cue.text) : hideCaption();
  }

  function nudgeCaptionOffset(delta) {
    CAPTION_OFFSET = Math.round((CAPTION_OFFSET + delta) * 10) / 10;
    localStorage.setItem('avatarhub_cc_offset', CAPTION_OFFSET);
    lastCueIdx = -1; // force re-render
    const sign = CAPTION_OFFSET > 0 ? '+' : '';
    showOSD('CC ' + (CAPTION_OFFSET === 0 ? 'Sync Reset' : sign + CAPTION_OFFSET + 's'));
  }

  ccBtn && ccBtn.addEventListener('click', () => {
    captionsOn = !captionsOn;
    ccBtn.classList.toggle('active', captionsOn);
    if (!captionsOn) { hideCaption(); lastCueIdx = -1; }
    if (captionsOn && !srtCues.length && window._playerGetSubUrl) {
      const url = window._playerGetSubUrl();
      if (url) fetch(url).then(r => r.ok ? r.text() : Promise.reject())
                         .then(t => { srtCues = parseSRT(t); lastCueIdx = -1; })
                         .catch(() => {});
    }
  });

  window._playerLoadSrt = function (url) {
    srtCues = []; lastCueIdx = -1; hideCaption();
    if (url) fetch(url).then(r => r.ok ? r.text() : Promise.reject())
                       .then(t => { srtCues = parseSRT(t); })
                       .catch(() => {});
  };

  /* ── Keyboard shortcuts ── */
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.code) {
      case 'Space': case 'KeyK': e.preventDefault(); togglePlay(); break;
      case 'ArrowRight': e.preventDefault();
        if (isFinite(vid.duration)) vid.currentTime = Math.min(vid.duration, vid.currentTime + 5);
        showOSD('+5s'); break;
      case 'ArrowLeft': e.preventDefault();
        vid.currentTime = Math.max(0, vid.currentTime - 5); showOSD('−5s'); break;
      case 'ArrowUp': e.preventDefault();
        vid.volume = Math.min(1, vid.volume + .1); vid.muted = false;
        if (volSlider) volSlider.value = vid.volume; updateVolUI();
        showOSD('Vol ' + Math.round(vid.volume * 100) + '%'); break;
      case 'ArrowDown': e.preventDefault();
        vid.volume = Math.max(0, vid.volume - .1); vid.muted = vid.volume === 0;
        if (volSlider) volSlider.value = vid.volume; updateVolUI();
        showOSD('Vol ' + Math.round(vid.volume * 100) + '%'); break;
      case 'KeyM':
        vid.muted = !vid.muted;
        if (volSlider) volSlider.value = vid.muted ? 0 : (vid.volume || 1);
        updateVolUI(); showOSD(vid.muted ? 'Muted' : 'Sound On'); break;
      case 'KeyF': e.preventDefault(); toggleFullscreen(); break;
      case 'KeyC': ccBtn && ccBtn.click(); break;
      case 'BracketLeft':  nudgeCaptionOffset(-0.5); break;
      case 'BracketRight': nudgeCaptionOffset(0.5); break;
      case 'Backslash':    nudgeCaptionOffset(-CAPTION_OFFSET); break;
      case 'KeyN': window._playerLoadNext && window._playerLoadNext(); break;
      case 'Slash':
        if (e.shiftKey) {
          e.preventDefault();
          const sm = document.getElementById('shortcutsModal');
          sm && sm.classList.toggle('open');
        }
        break;
    }
  });

  /* ── Shortcuts modal ── */
  const shortcutsModal = document.getElementById('shortcutsModal');
  const shortcutsClose = document.getElementById('shortcutsClose');
  shortcutsClose && shortcutsClose.addEventListener('click', () => shortcutsModal && shortcutsModal.classList.remove('open'));
  shortcutsModal && shortcutsModal.addEventListener('click', e => { if (e.target === shortcutsModal) shortcutsModal.classList.remove('open'); });

  /* ── Cleanup on page hide ── */
  window.addEventListener('pagehide', () => {
    vid.pause();
    clearTimeout(idleTimer);
    clearTimeout(osdTimer);
  }, { passive: true });

  /* ── Expose internals for page scripts ── */
  window._playerVid           = vid;
  window._playerParseSRT      = parseSRT;
  window._playerSrtCues       = () => srtCues;
  window._playerSetSrtCues    = c  => { srtCues = c; lastCueIdx = -1; };
  window._playerResetCaption  = () => { srtCues = []; lastCueIdx = -1; hideCaption(); };
  window._playerUpdateShimmer = updateShimmer;
  window._playerCancelAuto    = cancelAuto;
  window._playerHideNextPanel = hideNextPanel;
  window._playerFmt           = fmt;

})();
