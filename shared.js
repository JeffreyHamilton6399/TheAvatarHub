/* ═══════════════════════════════════════════════════════════
   AvatarArchive — shared.js  (performance-optimised build)
   Loaded by every page (deferred). Contains:
   - Theme application (also runs inline via tiny snippet)
   - Password gate
   - Settings panel (theme + ambient toggle)
   - Ambient audio resume (sub-pages)
   - UI SFX (click + hover ticks)
   - Ambient t0 keepalive
   - Particles canvas
   - Install modal
   - PWA service worker + manifest (index only, guarded)
═══════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════
   1. PASSWORD GATE
   Injects its own styles + DOM so it can run
   before any page content renders.
══════════════════════════════════════════ */
(function () {
  const PASS = 'AvatarAang';
  const KEY  = 'avatarhub_auth';
  if (localStorage.getItem(KEY) === '1') return;

  const style = document.createElement('style');
  style.textContent = `
#avatarGate{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2rem;background:radial-gradient(ellipse at 50% 40%,#071220 0%,#04070d 65%);font-family:"Cinzel",Georgia,serif;}
#avatarGate .gate-symbols{display:flex;align-items:center;gap:clamp(1.2rem,4vw,3rem);margin-bottom:.5rem;}
#avatarGate .gate-sym{width:clamp(36px,5vw,56px);height:clamp(36px,5vw,56px);object-fit:contain;opacity:.8;}
#avatarGate .gate-title{font-family:"Cinzel Decorative",Georgia,serif;font-size:clamp(1.4rem,4vw,2.4rem);letter-spacing:.12em;background:linear-gradient(135deg,#fff 0%,#d4e8ff 40%,#4db8ff 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-align:center;overflow:visible;padding:0.05em 0.1em 0.15em;line-height:1.15;}
#avatarGate .gate-sub{font-family:"Philosopher",Georgia,serif;font-style:italic;font-size:clamp(.75rem,1.8vw,1rem);color:#6b8aab;letter-spacing:.3em;text-transform:uppercase;text-align:center;}
#avatarGate .gate-form{display:flex;flex-direction:column;align-items:center;gap:.9rem;width:min(340px,88vw);}
#avatarGate .gate-label{font-size:.44rem;letter-spacing:.35em;text-transform:uppercase;color:#6b8aab;}
#avatarGate .gate-input-wrap{position:relative;width:100%;}
#avatarGate .gate-input{width:100%;background:rgba(10,17,28,.85);border:1px solid rgba(77,184,255,.25);border-radius:30px;color:#f0f4ff;font-family:"Philosopher",Georgia,serif;font-size:1rem;padding:.75em 3rem .75em 1.4em;outline:none;letter-spacing:.05em;transition:border-color .25s,box-shadow .25s;text-align:center;}
#avatarGate .gate-input:focus{border-color:rgba(77,184,255,.6);box-shadow:0 0 0 3px rgba(77,184,255,.1);}
#avatarGate .gate-eye{position:absolute;right:.85rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#6b8aab;padding:.2em;display:flex;align-items:center;}
#avatarGate .gate-eye:hover{color:#4db8ff;}
#avatarGate .gate-btn{width:100%;font-family:"Cinzel",Georgia,serif;font-size:.55rem;letter-spacing:.35em;text-transform:uppercase;color:#04070d;background:linear-gradient(135deg,#4db8ff,#1a8fcc);border:none;border-radius:30px;padding:.8em 1.5em;cursor:pointer;transition:opacity .2s,transform .15s,box-shadow .2s;box-shadow:0 4px 18px rgba(77,184,255,.35);}
#avatarGate .gate-btn:hover{opacity:.92;box-shadow:0 6px 24px rgba(77,184,255,.5);}
#avatarGate .gate-btn:active{transform:scale(.97);}
#avatarGate .gate-err{font-family:"Philosopher",Georgia,serif;font-style:italic;font-size:.82rem;color:#f97316;letter-spacing:.08em;opacity:0;transition:opacity .3s;min-height:1.2em;}
#avatarGate .gate-err.show{opacity:1;}
#avatarGate .gate-divider{width:60px;height:1px;background:linear-gradient(to right,transparent,rgba(201,168,76,.4),transparent);}
@keyframes gateShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
#avatarGate .gate-form.shake{animation:gateShake .4s cubic-bezier(.36,.07,.19,.97) both;}
@keyframes gatePulseAir{0%,100%{filter:drop-shadow(0 0 4px #f5c518)}50%{filter:drop-shadow(0 0 14px #f5c518)}}
@keyframes gatePulseWater{0%,100%{filter:drop-shadow(0 0 4px #4db8ff)}50%{filter:drop-shadow(0 0 14px #4db8ff)}}
@keyframes gatePulseEarth{0%,100%{filter:drop-shadow(0 0 4px #6abf69)}50%{filter:drop-shadow(0 0 14px #6abf69)}}
@keyframes gatePulseFire{0%,100%{filter:drop-shadow(0 0 4px #f97316)}50%{filter:drop-shadow(0 0 14px #f97316)}}
@keyframes gateIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
#avatarGate .gate-form{animation:gateIn .55s cubic-bezier(.22,1,.36,1) .2s both;}
#avatarGate .gate-title{animation:gateIn .55s cubic-bezier(.22,1,.36,1) .05s both;}
#avatarGate .gate-sub{animation:gateIn .55s cubic-bezier(.22,1,.36,1) .12s both;}
@keyframes gateOut{to{opacity:0;transform:scale(1.04)}}
#avatarGate.leaving{animation:gateOut .5s cubic-bezier(.4,0,1,1) both;pointer-events:none;}
`;
  document.head.appendChild(style);

  const gate = document.createElement('div');
  gate.id = 'avatarGate';
  gate.innerHTML = `
    <div class="gate-symbols">
      <img class="gate-sym" src="images/air.png"   alt="Air"   style="animation:gatePulseAir   2.8s ease-in-out infinite 0s">
      <img class="gate-sym" src="images/water.png" alt="Water" style="animation:gatePulseWater 2.8s ease-in-out infinite .5s">
      <img class="gate-sym" src="images/earth.png" alt="Earth" style="animation:gatePulseEarth 2.8s ease-in-out infinite 1s">
      <img class="gate-sym" src="images/fire.png"  alt="Fire"  style="animation:gatePulseFire  2.8s ease-in-out infinite 1.5s">
    </div>
    <div class="gate-title">AvatarArchive</div>
    <div class="gate-sub">Members Only</div>
    <div class="gate-divider"></div>
    <div class="gate-form" id="gateForm">
      <label class="gate-label" for="gateInput">Enter Password</label>
      <div class="gate-input-wrap">
        <input class="gate-input" type="password" id="gateInput" placeholder="••••••••••"
               autocomplete="current-password" autocorrect="off" autocapitalize="off" spellcheck="false">
        <button class="gate-eye" id="gateEye" type="button" tabindex="-1" aria-label="Toggle visibility">
          <svg id="eyeShow" width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
          <svg id="eyeHide" width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style="display:none"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
        </button>
      </div>
      <button class="gate-btn" id="gateSubmit">Enter the Avatar World</button>
      <div class="gate-err" id="gateErr">Incorrect password — try again</div>
    </div>`;
  document.body.insertBefore(gate, document.body.firstChild);

  const input   = document.getElementById('gateInput');
  const btn     = document.getElementById('gateSubmit');
  const err     = document.getElementById('gateErr');
  const form    = document.getElementById('gateForm');
  const eye     = document.getElementById('gateEye');
  const eyeShow = document.getElementById('eyeShow');
  const eyeHide = document.getElementById('eyeHide');
  let errTimer;

  function showErr(msg) {
    clearTimeout(errTimer);
    err.textContent = msg || 'Incorrect password — try again';
    err.classList.add('show');
    form.classList.remove('shake');
    void form.offsetWidth;
    form.classList.add('shake');
    input.select();
    errTimer = setTimeout(() => err.classList.remove('show'), 2800);
  }

  function tryEnter() {
    const val = input.value;
    if (!val) { showErr('Please enter the password'); return; }
    if (val === PASS) {
      localStorage.setItem(KEY, '1');
      gate.classList.add('leaving');
      if (window._avatarEnsureCtx && window._avatarStartAudio) {
        window._avatarEnsureCtx().then(() => window._avatarStartAudio());
      }
      setTimeout(() => gate.style.display = 'none', 500);
    } else {
      input.value = '';
      showErr('Incorrect password — try again');
    }
  }

  btn.addEventListener('click', tryEnter);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') tryEnter(); });
  eye.addEventListener('click', () => {
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    eyeShow.style.display = isPass ? 'none' : '';
    eyeHide.style.display = isPass ? ''     : 'none';
    input.focus();
  });
  setTimeout(() => input.focus(), 350);
})();


/* ══════════════════════════════════════════
   2. SETTINGS PANEL — theme + ambient toggle
══════════════════════════════════════════ */
(function () {
  const settingsBtn = document.getElementById('settingsBtn');
  const panel       = document.getElementById('settingsPanel');
  if (!settingsBtn || !panel) return;

  const opts   = panel.querySelectorAll('.theme-opt');
  const THEMES = ['dark', 'theme-parchment', 'theme-water', 'theme-earth'];
  const saved  = localStorage.getItem('avatarhub_theme') || 'dark';

  function applyTheme(t) {
    THEMES.forEach(th => document.body.classList.remove(th));
    if (t !== 'dark') document.body.classList.add(t);
    opts.forEach(o => o.classList.toggle('active', o.dataset.theme === t));
    localStorage.setItem('avatarhub_theme', t);
  }
  applyTheme(saved);

  settingsBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = panel.classList.toggle('open');
    settingsBtn.classList.toggle('open', isOpen);
  });
  opts.forEach(o => o.addEventListener('click', () => applyTheme(o.dataset.theme)));
  document.addEventListener('click', e => {
    if (!e.target.closest('#settingsBtn') && !e.target.closest('#settingsPanel')) {
      panel.classList.remove('open');
      settingsBtn.classList.remove('open');
    }
  });
})();


/* ══════════════════════════════════════════
   3. INSTALL MODAL (shared)
══════════════════════════════════════════ */
(function () {
  const btn   = document.getElementById('installBtn');
  const modal = document.getElementById('installModal');
  const close = document.getElementById('installClose');
  if (!btn || !modal) return;

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });

  btn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    } else {
      modal.classList.add('open');
    }
  });
  close && close.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
  window.addEventListener('appinstalled', () => { btn.style.display = 'none'; });
})();


/* ══════════════════════════════════════════
   4. AMBIENT AUDIO — sub-page resume
   (Index page has its own full engine; this
    only runs on non-index pages)
══════════════════════════════════════════ */
(function () {
  if (document.getElementById('mapSplash')) return;
  if (localStorage.getItem('avatarhub_ambient_off') === '1') return;
  if (sessionStorage.getItem('avatarhub_ambient_active') !== '1') return;

  let _raw = null, _ctx = null, _gain = null, _started = false;

  // Prefetch audio in the background — use fetch over XHR for better streaming support
  fetch('audio/ambient.MP3')
    .then(r => r.ok ? r.arrayBuffer() : null)
    .then(b => { _raw = b; })
    .catch(() => {});

  setTimeout(tryStart, 80);
  armGesture();

  function armGesture() {
    const h = function () {
      ['click', 'touchstart', 'keydown'].forEach(ev => document.removeEventListener(ev, h));
      tryStart();
    };
    ['click', 'touchstart', 'keydown'].forEach(ev =>
      document.addEventListener(ev, h, { passive: true, once: true })
    );
  }

  async function tryStart() {
    if (_started) return;
    if (!_ctx) {
      try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return; }
    }
    try { await _ctx.resume(); } catch (e) {}
    if (_ctx.state !== 'running') { armGesture(); return; }

    const raw = _raw || await fetch('audio/ambient.MP3').then(r => r.ok ? r.arrayBuffer() : null).catch(() => null);
    if (!raw) return;

    let decoded;
    try { decoded = await _ctx.decodeAudioData(raw.slice(0)); }
    catch (e) { return; }
    if (_started) return;
    _started = true;

    const t0      = parseInt(sessionStorage.getItem('avatarhub_ambient_t0') || '0');
    const elapsed = parseFloat(sessionStorage.getItem('avatarhub_ambient_elapsed') || '0');
    const rawSecs = t0 ? (Date.now() - t0) / 1000 : elapsed;
    const offset  = (rawSecs > 0 && decoded.duration > 0) ? rawSecs % decoded.duration : 0;

    const src = _ctx.createBufferSource();
    _gain = _ctx.createGain();
    src.buffer = decoded;
    src.loop   = true;
    _gain.gain.value = 0;
    src.connect(_gain).connect(_ctx.destination);
    src.start(0, offset);
    _gain.gain.setValueAtTime(0, _ctx.currentTime);
    _gain.gain.linearRampToValueAtTime(0.55, _ctx.currentTime + 2.5);

    const ambientRow = document.getElementById('ambientRow');
    if (ambientRow) ambientRow.classList.add('active');

    // Duck during video playback
    const video = document.getElementById('mainVideo');
    if (video) {
      video.addEventListener('play',  () => fadeTo(0),    { passive: true });
      video.addEventListener('pause', () => fadeTo(0.55), { passive: true });
      video.addEventListener('ended', () => fadeTo(0.55), { passive: true });
    }

    if (ambientRow) {
      ambientRow.addEventListener('click', () => {
        if (!_gain) return;
        const isPlaying = _gain.gain.value > 0.1;
        fadeTo(isPlaying ? 0 : 0.55);
        localStorage.setItem('avatarhub_ambient_off', isPlaying ? '1' : '0');
        sessionStorage.setItem('avatarhub_ambient_active', isPlaying ? '0' : '1');
        ambientRow.classList.toggle('active', !isPlaying);
      });
    }
  }

  function fadeTo(target) {
    if (!_gain || !_ctx) return;
    _gain.gain.cancelScheduledValues(_ctx.currentTime);
    _gain.gain.setValueAtTime(_gain.gain.value, _ctx.currentTime);
    _gain.gain.linearRampToValueAtTime(target, _ctx.currentTime + 0.8);
  }
})();


/* ══════════════════════════════════════════
   5. UI SFX — synthesised click + hover ticks
   Deferred until idle to avoid blocking paint
══════════════════════════════════════════ */
(function () {
  const _run = function () {
    let _sfxCtx = null;

    function getSfxCtx() {
      if (_sfxCtx && _sfxCtx.state !== 'closed') return _sfxCtx;
      try { _sfxCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
      return _sfxCtx;
    }

    function playTick(freq, dur, vol, Q) {
      const ctx = getSfxCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (ctx.state !== 'running') return;

      const len  = Math.floor(ctx.sampleRate * dur);
      const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
      }
      const src  = ctx.createBufferSource();
      const bp   = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = Q;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      src.buffer = buf;
      src.connect(bp).connect(gain).connect(ctx.destination);
      src.start();
    }

    const playClickSfx = () => playTick(1100, 0.038, 0.22, 0.9);
    const playHoverSfx = () => playTick(2200, 0.018, 0.06, 1.2);

    const CLICK_SEL = 'a,button,[role="button"],.hub-card,.card-cta,.ep-card,.ep-thumb,.book-tab,.season-tab,.pill-btn,.pill-tab,.theme-opt,.sp-ambient-row,.sp-install-row,.star-btn,.ctrl-btn,.card-poster,.merch-card,.comic-btn,.nav-btn,.modal-close,.page-btn,[data-ep],[data-book]';
    const HOVER_SEL = 'a,button,[role="button"],.hub-card,.ep-card,.ep-thumb,.pill-btn,.pill-tab,.theme-opt,.card-cta,.merch-card,.comic-btn,.nav-btn,.ctrl-btn,.star-btn,[data-ep],[data-book]';

    document.addEventListener('click', e => {
      if (e.target.closest(CLICK_SEL)) playClickSfx();
    }, { passive: true });

    let _hoverCooldown = false;
    document.addEventListener('mouseover', e => {
      if (_hoverCooldown) return;
      if (e.target.closest(HOVER_SEL)) {
        playHoverSfx();
        _hoverCooldown = true;
        setTimeout(() => { _hoverCooldown = false; }, 80);
      }
    }, { passive: true });
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(_run, { timeout: 1500 });
  } else {
    setTimeout(_run, 100);
  }
})();


/* ══════════════════════════════════════════
   6. AMBIENT t0 KEEPALIVE
   Uses Page Visibility API + interval for accuracy.
   Updates elapsed every 10s.
══════════════════════════════════════════ */
(function () {
  if (localStorage.getItem('avatarhub_ambient_off') === '1') return;
  if (sessionStorage.getItem('avatarhub_ambient_active') !== '1') return;

  // Flush elapsed when the user leaves/hides the tab — most reliable write opportunity
  function flush() {
    const t0old = parseInt(sessionStorage.getItem('avatarhub_ambient_t0') || '0');
    if (!t0old) return;
    sessionStorage.setItem('avatarhub_ambient_elapsed', ((Date.now() - t0old) / 1000).toFixed(3));
  }

  document.addEventListener('visibilitychange', flush, { passive: true });
  window.addEventListener('pagehide', flush, { passive: true });

  // Periodic backup every 10s (catches long-running tabs without navigation)
  setInterval(flush, 10000);
})();


/* ══════════════════════════════════════════
   7. AMBIENT PARTICLES
   Runs on any page that has #particleCanvas.
   Uses requestIdleCallback so it doesn't compete
   with first paint. Skips frames when tab hidden.
══════════════════════════════════════════ */
(function () {
  const _run = function () {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;

    // Respect reduced-motion — CSS hides the canvas, but skip JS work too
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx  = canvas.getContext('2d', { alpha: true });
    const BASE = 'images/';
    const imgs = ['air', 'water', 'earth', 'fire'].map(n => {
      const img = new Image(); img.crossOrigin = 'anonymous'; img.src = BASE + n + '.png'; return img;
    });

    const isMobile = window.matchMedia('(max-width:640px)').matches;
    const COUNT    = isMobile ? 18 : 45; // slightly reduced for perf
    let W, H, particles = [];

    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    resize();

    // Debounced resize — use a shared pattern with a named fn to allow removal
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    }, { passive: true });

    function rand(a, b) { return a + Math.random() * (b - a); }

    function spawn() {
      const img  = imgs[Math.floor(Math.random() * imgs.length)];
      const type = Math.random() < .4 ? 'orbit' : (Math.random() < .5 ? 'wave' : 'drift');
      const base = { img, x: rand(0, W), y: rand(0, H), alpha: rand(.04, .1), size: rand(10, 22),
                     rot: rand(0, Math.PI * 2), vrot: rand(-.004, .004), type };
      if (type === 'orbit') return {
        ...base, cx: rand(0, W), cy: rand(0, H), rx: rand(40, 160), ry: rand(30, 110),
        angle: rand(0, Math.PI * 2), speed: rand(.002, .006) * (Math.random() < .5 ? 1 : -1)
      };
      const angle = rand(0, Math.PI * 2), sp = rand(.06, .22);
      if (type === 'wave') return {
        ...base, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp,
        wAmp: rand(.4, 1.6), wFreq: rand(.008, .02), wOff: rand(0, Math.PI * 2), t: 0
      };
      return { ...base, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp };
    }

    for (let i = 0; i < COUNT; i++) particles.push(spawn());
    const pad = 60;
    let rafId;

    // Pre-cache loaded state — avoids repeated property access in hot loop
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        if (p.type === 'orbit') {
          p.angle += p.speed;
          p.x = p.cx + Math.cos(p.angle) * p.rx;
          p.y = p.cy + Math.sin(p.angle) * p.ry;
        } else if (p.type === 'wave') {
          p.t++;
          p.x += p.vx + Math.sin(p.t * p.wFreq + p.wOff) * p.wAmp * .08;
          p.y += p.vy;
        } else {
          p.x += p.vx; p.y += p.vy;
        }
        p.rot += p.vrot;
        if (p.type !== 'orbit' && (p.x < -pad || p.x > W + pad || p.y < -pad || p.y > H + pad)) {
          Object.assign(p, spawn()); p.x = rand(0, W); p.y = rand(0, H); continue;
        }
        if (!p.img.complete || !p.img.naturalWidth) continue;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(p.img, -p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(rafId); rafId = null; }
      else if (!rafId) { rafId = requestAnimationFrame(draw); }
    }, { passive: true });
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(_run, { timeout: 2000 });
  } else {
    setTimeout(_run, 200);
  }
})();


/* ══════════════════════════════════════════
   8. PWA — manifest + service worker
   Only runs on index.html (guarded by mapSplash)
══════════════════════════════════════════ */
(function () {
  if (!document.getElementById('mapSplash')) return;

  // Only inject blob manifest if a <link rel="manifest"> isn't already present from the HTML
  if (!document.querySelector('link[rel="manifest"]')) {
    const manifest = {
      name: 'AvatarArchive', short_name: 'AvatarArchive',
      description: 'Watch Avatar: The Last Airbender, The Legend of Korra, the films, and more.',
      start_url: './index.html', display: 'standalone',
      background_color: '#04070d', theme_color: '#04070d',
      orientation: 'portrait-primary',
      icons: [
        { src: 'images/favicon.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: 'images/favicon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    };
    const mBlob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    const mLink = document.createElement('link');
    mLink.rel = 'manifest'; mLink.href = URL.createObjectURL(mBlob);
    document.head.appendChild(mLink);
  }

  if ('serviceWorker' in navigator) {
    const swCode = `
const CACHE = 'avatar-v5';
const SHELL = [
  './index.html','./atla.html','./kora.html','./movie2026.html',
  './movie2010.html','./liveshow.html','./books.html','./games.html',
  './merch.html','./shared.css','./shared.js','./player-engine.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks =>
      Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // HTML: network-first (always fresh page structure)
  if (request.destination === 'document') {
    e.respondWith(
      fetch(request)
        .then(r => {
          if (r.ok) { const clone = r.clone(); caches.open(CACHE).then(c => c.put(request, clone)); }
          return r;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // JS/CSS: stale-while-revalidate
  if (request.destination === 'script' || request.destination === 'style') {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then(r => { if (r.ok) cache.put(request, r.clone()); return r; })
          .catch(() => null);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Images: cache-first
  if (request.destination === 'image') {
    e.respondWith(
      caches.match(request).then(r => r || fetch(request).then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(request, clone)); }
        return res;
      }).catch(() => new Response('', { status: 404 })))
    );
    return;
  }

  // Fonts/other: cache-first with fallback
  e.respondWith(caches.match(request).then(r => r || fetch(request)).catch(() => {}));
});
`;
    const swBlob = new Blob([swCode], { type: 'application/javascript' });
    navigator.serviceWorker.register(URL.createObjectURL(swBlob)).catch(() => {});
  }
})();
