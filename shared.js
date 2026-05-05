/* ═══════════════════════════════════════════════════════════
   AvatarArchive — shared.js
   Loaded deferred on every page. Sections:

    1.  Password gate
    2.  Settings panel  (theme + volume sliders)
    3.  Install modal
    4.  Ambient audio   (sub-page seamless resume)
    5.  UI sound effects
    6.  Ambient keepalive  (t0 precision across tabs)
    7.  Particle canvas
    8.  PWA  (manifest + service-worker blob, index only)
    9.  Cursor ripple
   10.  Page transitions
   11.  Shooting stars
   12.  Dynamic vignette  (mouse-tracking glow)
   13.  Scroll parallax
   14.  Time-of-day tint
   15.  Card shimmer
   16.  Focus glow  (lives in shared.css)
═══════════════════════════════════════════════════════════ */

'use strict';


/* ══════════════════════════════════════════
   1. PASSWORD GATE
   Injects its own <style> + DOM so it blocks
   the page before any content is visible.
   Auth state lives in localStorage — users
   only ever need to enter the password once.
══════════════════════════════════════════ */
(function () {
  const PASS    = 'AvatarAang';
  const STORAGE = 'avatarhub_auth';

  if (localStorage.getItem(STORAGE) === '1') return; // already authenticated

  /* ── Styles ── */
  const style = document.createElement('style');
  style.textContent = `
#avatarGate {
  position:fixed; inset:0; z-index:99999;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2rem;
  background: radial-gradient(ellipse at 50% 40%, #071220 0%, #04070d 65%);
  font-family: "Cinzel", Georgia, serif;
}
#avatarGate .gate-symbols {
  display:flex; align-items:center;
  gap: clamp(1.2rem, 4vw, 3rem); margin-bottom:.5rem;
}
#avatarGate .gate-sym {
  width: clamp(36px,5vw,56px); height: clamp(36px,5vw,56px);
  object-fit:contain; opacity:.8;
}
#avatarGate .gate-title {
  font-family:"Cinzel Decorative",Georgia,serif;
  font-size: clamp(1.4rem,4vw,2.4rem); letter-spacing:.12em;
  background: linear-gradient(135deg,#fff 0%,#d4e8ff 40%,#4db8ff 100%);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  text-align:center; overflow:visible; padding:.05em .1em .15em; line-height:1.15;
  animation: gateIn .55s cubic-bezier(.22,1,.36,1) .05s both;
}
#avatarGate .gate-sub {
  font-family:"Philosopher",Georgia,serif; font-style:italic;
  font-size: clamp(.75rem,1.8vw,1rem);
  color:#6b8aab; letter-spacing:.3em; text-transform:uppercase; text-align:center;
  animation: gateIn .55s cubic-bezier(.22,1,.36,1) .12s both;
}
#avatarGate .gate-divider {
  width:60px; height:1px;
  background: linear-gradient(to right, transparent, rgba(201,168,76,.4), transparent);
}
#avatarGate .gate-form {
  display:flex; flex-direction:column; align-items:center; gap:.9rem;
  width: min(340px,88vw);
  animation: gateIn .55s cubic-bezier(.22,1,.36,1) .2s both;
}
#avatarGate .gate-label  { font-size:.44rem; letter-spacing:.35em; text-transform:uppercase; color:#6b8aab; }
#avatarGate .gate-input-wrap { position:relative; width:100%; }
#avatarGate .gate-input {
  width:100%; background:rgba(10,17,28,.85);
  border:1px solid rgba(77,184,255,.25); border-radius:30px;
  color:#f0f4ff; font-family:"Philosopher",Georgia,serif; font-size:1rem;
  padding:.75em 3rem .75em 1.4em; outline:none;
  letter-spacing:.05em; text-align:center;
  transition:border-color .25s, box-shadow .25s;
}
#avatarGate .gate-input:focus {
  border-color:rgba(77,184,255,.6); box-shadow:0 0 0 3px rgba(77,184,255,.1);
}
#avatarGate .gate-eye {
  position:absolute; right:.85rem; top:50%; transform:translateY(-50%);
  background:none; border:none; cursor:pointer; color:#6b8aab;
  padding:.2em; display:flex; align-items:center;
  transition:color .2s;
}
#avatarGate .gate-eye:hover { color:#4db8ff; }
#avatarGate .gate-btn {
  width:100%; font-family:"Cinzel",Georgia,serif;
  font-size:.55rem; letter-spacing:.35em; text-transform:uppercase;
  color:#04070d; background:linear-gradient(135deg,#4db8ff,#1a8fcc);
  border:none; border-radius:30px; padding:.8em 1.5em; cursor:pointer;
  box-shadow:0 4px 18px rgba(77,184,255,.35);
  transition:opacity .2s, transform .15s, box-shadow .2s;
}
#avatarGate .gate-btn:hover  { opacity:.92; box-shadow:0 6px 24px rgba(77,184,255,.5); }
#avatarGate .gate-btn:active { transform:scale(.97); }
#avatarGate .gate-err {
  font-family:"Philosopher",Georgia,serif; font-style:italic;
  font-size:.82rem; color:#f97316; letter-spacing:.08em;
  opacity:0; transition:opacity .3s; min-height:1.2em;
}
#avatarGate .gate-err.show { opacity:1; }

/* Keyframes */
@keyframes gateShake {
  0%,100%{ transform:translateX(0) }
  20%    { transform:translateX(-8px) }
  40%    { transform:translateX(8px) }
  60%    { transform:translateX(-6px) }
  80%    { transform:translateX(6px) }
}
#avatarGate .gate-form.shake { animation:gateShake .4s cubic-bezier(.36,.07,.19,.97) both; }

@keyframes gatePulseAir   { 0%,100%{filter:drop-shadow(0 0 4px #f5c518)} 50%{filter:drop-shadow(0 0 14px #f5c518)} }
@keyframes gatePulseWater { 0%,100%{filter:drop-shadow(0 0 4px #4db8ff)} 50%{filter:drop-shadow(0 0 14px #4db8ff)} }
@keyframes gatePulseEarth { 0%,100%{filter:drop-shadow(0 0 4px #6abf69)} 50%{filter:drop-shadow(0 0 14px #6abf69)} }
@keyframes gatePulseFire  { 0%,100%{filter:drop-shadow(0 0 4px #f97316)} 50%{filter:drop-shadow(0 0 14px #f97316)} }

@keyframes gateIn  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
@keyframes gateOut { to  {opacity:0;transform:scale(1.04)} }
#avatarGate.leaving { animation:gateOut .5s cubic-bezier(.4,0,1,1) both; pointer-events:none; }
`;
  document.head.appendChild(style);

  /* ── DOM ── */
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

  /* ── Interaction ── */
  const input   = document.getElementById('gateInput');
  const btn     = document.getElementById('gateSubmit');
  const err     = document.getElementById('gateErr');
  const form    = document.getElementById('gateForm');
  const eye     = document.getElementById('gateEye');
  const eyeShow = document.getElementById('eyeShow');
  const eyeHide = document.getElementById('eyeHide');
  let   errTimer;

  function showErr(msg) {
    clearTimeout(errTimer);
    err.textContent = msg || 'Incorrect password — try again';
    err.classList.add('show');
    // Force reflow so the shake animation restarts cleanly
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
      localStorage.setItem(STORAGE, '1');
      gate.classList.add('leaving');
      // Kick off audio if the ambient engine is already initialised
      if (window._avatarEnsureCtx && window._avatarStartAudio) {
        window._avatarEnsureCtx().then(() => window._avatarStartAudio());
      }
      setTimeout(() => { gate.style.display = 'none'; }, 500);
    } else {
      input.value = '';
      showErr('Incorrect password — try again');
    }
  }

  btn.addEventListener('click', tryEnter);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') tryEnter(); });

  eye.addEventListener('click', () => {
    const isPass = input.type === 'password';
    input.type          = isPass ? 'text'    : 'password';
    eyeShow.style.display = isPass ? 'none' : '';
    eyeHide.style.display = isPass ? ''     : 'none';
    input.focus();
  });

  // Slight delay prevents mobile keyboard from popping before the gate is visible
  setTimeout(() => input.focus(), 350);
})();


/* ══════════════════════════════════════════
   2. SETTINGS PANEL
   Self-injecting: creates the gear button and
   full panel on every page if not already
   present in the HTML. Handles theme, ambient
   volume, SFX volume with polished sliders.
══════════════════════════════════════════ */
(function () {

  /* ── Inject button + panel if page doesn't have them ── */
  if (!document.getElementById('settingsBtn')) {
    const btn = document.createElement('button');
    btn.id    = 'settingsBtn';
    btn.title = 'Settings';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>`;
    document.body.appendChild(btn);
  }

  if (!document.getElementById('settingsPanel')) {
    const panel = document.createElement('div');
    panel.id = 'settingsPanel';
    const hasAmbient = !!document.getElementById('ambientRow') ||
                       sessionStorage.getItem('avatarhub_ambient_active') === '1' ||
                       !document.getElementById('mapSplash');
    panel.innerHTML = `
      <div class="sp-section">
        <div class="sp-section-label">Sound</div>
        ${hasAmbient ? `
        <div class="sp-ambient-row" id="ambientRow" title="Toggle ambient sound">
          <div class="sp-ambient-label">
            <div class="ambient-wave">
              <span style="height:5px"></span><span style="height:9px"></span>
              <span style="height:7px"></span><span style="height:11px"></span>
            </div>
            Ambient
          </div>
          <div class="sp-toggle"></div>
        </div>` : ''}
        <div class="sp-vol-row">
          <span class="sp-vol-label">Music</span>
          <div class="sp-slider-wrap">
            <input class="sp-vol-slider" id="ambientVolSlider" type="range" min="0" max="100" value="55" title="Ambient volume">
            <div class="sp-slider-fill" id="ambientVolFill"></div>
            <div class="sp-slider-tooltip" id="ambientVolTip">55%</div>
          </div>
        </div>
        <div class="sp-vol-row">
          <span class="sp-vol-label">SFX</span>
          <div class="sp-slider-wrap">
            <input class="sp-vol-slider" id="sfxVolSlider" type="range" min="0" max="100" value="100" title="UI sound effects volume">
            <div class="sp-slider-fill" id="sfxVolFill"></div>
            <div class="sp-slider-tooltip" id="sfxVolTip">100%</div>
          </div>
        </div>
      </div>
      <div class="sp-divider"></div>
      <div class="sp-section">
        <div class="sp-section-label">Theme</div>
        <button class="theme-opt active" data-theme="dark">
          <span class="theme-swatch" style="background:#04070d;border:1px solid rgba(255,255,255,.2)"></span> Dark
        </button>
        <button class="theme-opt" data-theme="theme-parchment">
          <span class="theme-swatch" style="background:#c9a84c"></span> Parchment
        </button>
        <button class="theme-opt" data-theme="theme-water">
          <span class="theme-swatch" style="background:#4db8ff"></span> Water
        </button>
        <button class="theme-opt" data-theme="theme-earth">
          <span class="theme-swatch" style="background:#6abf69"></span> Earth
        </button>
      </div>`;
    document.body.appendChild(panel);
  }

  const settingsBtn = document.getElementById('settingsBtn');
  const panel       = document.getElementById('settingsPanel');

  /* ── Polished slider update helper ── */
  function updateSlider(slider, fillEl, tipEl, pct) {
    if (fillEl) fillEl.style.width = pct + '%';
    if (tipEl) {
      tipEl.textContent = Math.round(pct) + '%';
      // Position tooltip over the thumb
      tipEl.style.left = `calc(${pct}% + ${8 - pct * 0.16}px)`;
    }
    // Also drive --range-pct CSS variable for fill gradient
    slider.style.setProperty('--rp', pct + '%');
  }

  /* ── Theme ── */
  const THEMES    = ['dark', 'theme-parchment', 'theme-water', 'theme-earth'];
  const themeOpts = panel.querySelectorAll('.theme-opt');
  const saved     = localStorage.getItem('avatarhub_theme') || 'dark';

  function applyTheme(t) {
    THEMES.forEach(th => document.body.classList.remove(th));
    if (t !== 'dark') document.body.classList.add(t);
    themeOpts.forEach(o => o.classList.toggle('active', o.dataset.theme === t));
    localStorage.setItem('avatarhub_theme', t);
  }
  applyTheme(saved);
  themeOpts.forEach(o => o.addEventListener('click', () => applyTheme(o.dataset.theme)));

  /* ── Ambient volume ── */
  const ambientSlider = document.getElementById('ambientVolSlider');
  const ambientFill   = document.getElementById('ambientVolFill');
  const ambientTip    = document.getElementById('ambientVolTip');
  if (ambientSlider) {
    const savedVol = parseFloat(localStorage.getItem('avatarhub_ambient_vol') ?? '0.55');
    const initPct  = Math.round(savedVol * 100);
    ambientSlider.value = initPct;
    updateSlider(ambientSlider, ambientFill, ambientTip, initPct);

    ambientSlider.addEventListener('input', () => {
      const pct = parseFloat(ambientSlider.value);
      const vol = pct / 100;
      updateSlider(ambientSlider, ambientFill, ambientTip, pct);
      localStorage.setItem('avatarhub_ambient_vol', vol.toFixed(2));
      // Drive the live engine if it's running
      if (typeof window._avatarSetAmbientVol === 'function') {
        window._avatarSetAmbientVol(vol);
      }
    });

    // Show tooltip on drag
    ambientSlider.addEventListener('pointerdown', () => { if (ambientTip) ambientTip.classList.add('show'); });
    document.addEventListener('pointerup', () => { if (ambientTip) ambientTip.classList.remove('show'); }, { once: false, passive: true });
  }

  /* ── SFX volume ── */
  const sfxSlider = document.getElementById('sfxVolSlider');
  const sfxFill   = document.getElementById('sfxVolFill');
  const sfxTip    = document.getElementById('sfxVolTip');
  if (sfxSlider) {
    const savedSfx = parseFloat(localStorage.getItem('avatarhub_sfx_vol') ?? '1');
    const initPct  = Math.round(savedSfx * 100);
    sfxSlider.value = initPct;
    updateSlider(sfxSlider, sfxFill, sfxTip, initPct);

    sfxSlider.addEventListener('input', () => {
      const pct = parseFloat(sfxSlider.value);
      const vol = pct / 100;
      updateSlider(sfxSlider, sfxFill, sfxTip, pct);
      localStorage.setItem('avatarhub_sfx_vol', vol.toFixed(2));
      if (typeof window._avatarSetSfxVol === 'function') {
        window._avatarSetSfxVol(vol);
      }
    });

    sfxSlider.addEventListener('pointerdown', () => { if (sfxTip) sfxTip.classList.add('show'); });
  }

  /* ── Open / close ── */
  settingsBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = panel.classList.toggle('open');
    settingsBtn.classList.toggle('open', isOpen);
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#settingsBtn') && !e.target.closest('#settingsPanel')) {
      panel.classList.remove('open');
      settingsBtn.classList.remove('open');
    }
  });

  // Persist tooltip hide on pointerup globally
  document.addEventListener('pointerup', () => {
    document.getElementById('ambientVolTip')?.classList.remove('show');
    document.getElementById('sfxVolTip')?.classList.remove('show');
  }, { passive: true });
})();


/* ══════════════════════════════════════════
   3. INSTALL MODAL
   Shows browser prompt if available,
   otherwise shows a manual instructions modal.
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

  close?.addEventListener('click',  () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
  window.addEventListener('appinstalled', () => { btn.style.display = 'none'; });
})();


/* ══════════════════════════════════════════
   4. AMBIENT AUDIO — sub-page seamless resume
   The index page runs its own full ambient
   engine. This module only runs on other pages
   and picks up the loop exactly where it left
   off by reading the t0 + elapsed timestamps.
══════════════════════════════════════════ */
(function () {
  // Skip on the index (which has its own engine)
  if (document.getElementById('mapSplash'))                   return;
  if (localStorage.getItem('avatarhub_ambient_off')    === '1') return;
  if (sessionStorage.getItem('avatarhub_ambient_active') !== '1') return;

  let _raw     = null;  // prefetched ArrayBuffer
  let _ctx     = null;  // AudioContext
  let _gain    = null;  // master gain node
  let _started = false;

  const targetVol = () => parseFloat(localStorage.getItem('avatarhub_ambient_vol') ?? '0.55');

  /* Expose live volume control so the settings slider can reach in */
  window._avatarSetAmbientVol = function (v) {
    if (!_gain || !_ctx) { localStorage.setItem('avatarhub_ambient_vol', v.toFixed(2)); return; }
    _gain.gain.cancelScheduledValues(_ctx.currentTime);
    _gain.gain.setValueAtTime(_gain.gain.value, _ctx.currentTime);
    _gain.gain.linearRampToValueAtTime(v, _ctx.currentTime + 0.3);
    localStorage.setItem('avatarhub_ambient_vol', v.toFixed(2));
  };

  // Prefetch audio bytes immediately — no AudioContext required yet
  fetch('audio/ambient.MP3')
    .then(r => r.ok ? r.arrayBuffer() : null)
    .then(b  => { _raw = b; })
    .catch(() => {});

  setTimeout(tryStart, 80);
  armGesture();

  function armGesture() {
    // One-time handler fires on first user interaction (needed on mobile)
    const handler = function () {
      ['click', 'touchstart', 'keydown'].forEach(ev => document.removeEventListener(ev, handler));
      tryStart();
    };
    ['click', 'touchstart', 'keydown'].forEach(ev =>
      document.addEventListener(ev, handler, { passive: true, once: true })
    );
  }

  async function tryStart() {
    if (_started) return;

    if (!_ctx) {
      try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch { return; }
    }

    try { await _ctx.resume(); } catch { /* ignore */ }
    if (_ctx.state !== 'running') { armGesture(); return; }

    // Use prefetched bytes or fall back to a fresh fetch
    const raw = _raw ?? await fetch('audio/ambient.MP3')
      .then(r => r.ok ? r.arrayBuffer() : null).catch(() => null);
    if (!raw) return;

    let decoded;
    try { decoded = await _ctx.decodeAudioData(raw.slice(0)); }
    catch { return; }

    if (_started) return; // guard against double-start from gesture + timeout races
    _started = true;

    // Calculate how far into the loop we should resume
    const t0      = parseInt(sessionStorage.getItem('avatarhub_ambient_t0')    || '0');
    const elapsed = parseFloat(sessionStorage.getItem('avatarhub_ambient_elapsed') || '0');
    const rawSecs = t0 ? (Date.now() - t0) / 1000 : elapsed;
    const offset  = rawSecs > 0 && decoded.duration > 0
      ? rawSecs % decoded.duration
      : 0;

    const src = _ctx.createBufferSource();
    _gain     = _ctx.createGain();
    src.buffer   = decoded;
    src.loop     = true;
    _gain.gain.value = 0;
    src.connect(_gain).connect(_ctx.destination);
    src.start(0, offset);

    // Fade in smoothly
    _gain.gain.setValueAtTime(0, _ctx.currentTime);
    _gain.gain.linearRampToValueAtTime(targetVol(), _ctx.currentTime + 2.5);

    // Show active state in settings panel if present
    document.getElementById('ambientRow')?.classList.add('active');

    // Duck ambient when a video is playing, restore when done
    const video = document.getElementById('mainVideo');
    if (video) {
      video.addEventListener('play',  () => fadeTo(0),            { passive: true });
      video.addEventListener('pause', () => fadeTo(targetVol()),  { passive: true });
      video.addEventListener('ended', () => fadeTo(targetVol()),  { passive: true });
    }

    // Ambient toggle row in settings
    const ambientRow = document.getElementById('ambientRow');
    ambientRow?.addEventListener('click', () => {
      if (!_gain) return;
      const isPlaying = _gain.gain.value > 0.01;
      fadeTo(isPlaying ? 0 : targetVol());
      localStorage.setItem('avatarhub_ambient_off',    isPlaying ? '1' : '0');
      sessionStorage.setItem('avatarhub_ambient_active', isPlaying ? '0' : '1');
      ambientRow.classList.toggle('active', !isPlaying);
    });
  }

  function fadeTo(target) {
    if (!_gain || !_ctx) return;
    _gain.gain.cancelScheduledValues(_ctx.currentTime);
    _gain.gain.setValueAtTime(_gain.gain.value, _ctx.currentTime);
    _gain.gain.linearRampToValueAtTime(target, _ctx.currentTime + 0.8);
  }
})();


/* ══════════════════════════════════════════
   5. UI SOUND EFFECTS
   Rich synthesised sound library — 8 distinct
   tones for different interaction types.
   All pure Web Audio API, no files needed.
   Deferred via requestIdleCallback.

   Sound palette:
   • hover      — soft high whisper tick
   • click      — warm mid tap
   • nav        — deeper navigation thud
   • open       — bright ascending chime
   • close      — descending soft close
   • success    — two-tone success ding
   • error      — low buzz shake
   • slider     — gentle frequency sweep
   • card-enter — soft water-drop blip
   • star        — sparkle shimmer
══════════════════════════════════════════ */
(function () {
  let _sfxVol = parseFloat(localStorage.getItem('avatarhub_sfx_vol') ?? '1');
  window._avatarSetSfxVol = v => { _sfxVol = Math.max(0, Math.min(1, v)); };

  const _run = function () {
    let _ctx = null;

    function getCtx() {
      if (_ctx && _ctx.state !== 'closed') return _ctx;
      try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch { return null; }
      return _ctx;
    }

    function prep() {
      const ctx = getCtx();
      if (!ctx) return null;
      if (ctx.state === 'suspended') ctx.resume();
      if (ctx.state !== 'running')   return null;
      return ctx;
    }

    /* ── Noise burst (filtered white noise) ── */
    function noiseBurst(ctx, freq, Q, dur, vol, decay = 4) {
      const len  = Math.floor(ctx.sampleRate * dur);
      const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      const src  = ctx.createBufferSource();
      const bp   = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = Q;
      gain.gain.setValueAtTime(vol * _sfxVol, ctx.currentTime);
      src.buffer = buf;
      src.connect(bp).connect(gain).connect(ctx.destination);
      src.start();
    }

    /* ── Tone (oscillator with envelope) ── */
    function tone(ctx, freq, type, dur, vol, freqEnd, attack = 0.005) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (freqEnd !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + dur);
      }
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol * _sfxVol, ctx.currentTime + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.01);
    }

    /* ═══ Named sounds ═══ */

    // Soft high whisper — hover over interactive elements
    function sfxHover() {
      const ctx = prep(); if (!ctx) return;
      noiseBurst(ctx, 3200, 2.5, 0.014, 0.04, 6);
    }

    // Warm mid tap — generic button / link click
    function sfxClick() {
      const ctx = prep(); if (!ctx) return;
      noiseBurst(ctx, 1100, 1.2, 0.034, 0.18, 5);
    }

    // Deeper navigation thud — hub cards, page links
    function sfxNav() {
      const ctx = prep(); if (!ctx) return;
      noiseBurst(ctx, 600, 0.9, 0.055, 0.22, 3);
      tone(ctx, 280, 'sine', 0.07, 0.06, 180);
    }

    // Bright ascending chime — open panel / modal
    function sfxOpen() {
      const ctx = prep(); if (!ctx) return;
      tone(ctx, 700, 'triangle', 0.14, 0.12, 1050);
      setTimeout(() => {
        const c = prep(); if (!c) return;
        tone(c, 1050, 'sine', 0.10, 0.07);
      }, 55);
    }

    // Descending soft close — close / dismiss
    function sfxClose() {
      const ctx = prep(); if (!ctx) return;
      tone(ctx, 900, 'triangle', 0.12, 0.10, 480);
    }

    // Two-tone success ding — password enter, confirm
    function sfxSuccess() {
      const ctx = prep(); if (!ctx) return;
      tone(ctx, 880, 'sine', 0.14, 0.14);
      setTimeout(() => {
        const c = prep(); if (!c) return;
        tone(c, 1320, 'sine', 0.18, 0.12);
      }, 80);
    }

    // Low buzz — wrong password / error
    function sfxError() {
      const ctx = prep(); if (!ctx) return;
      tone(ctx, 140, 'sawtooth', 0.18, 0.15, 100);
      noiseBurst(ctx, 220, 0.7, 0.18, 0.10, 2);
    }

    // Gentle frequency sweep — slider drag
    function sfxSlider(pct) {
      const ctx = prep(); if (!ctx) return;
      const f   = 300 + pct * 12; // pitch tracks value
      tone(ctx, f, 'sine', 0.04, 0.06 * _sfxVol);
    }

    // Soft water-drop blip — episode card hover
    function sfxCardEnter() {
      const ctx = prep(); if (!ctx) return;
      tone(ctx, 660, 'sine', 0.07, 0.07, 740);
      noiseBurst(ctx, 2000, 3, 0.018, 0.04);
    }

    // Sparkle shimmer — star rating click
    function sfxStar() {
      const ctx = prep(); if (!ctx) return;
      [0, 40, 90].forEach((delay, i) => {
        setTimeout(() => {
          const c = prep(); if (!c) return;
          tone(c, 900 + i * 280, 'sine', 0.10, 0.09);
        }, delay);
      });
    }

    // Theme switch — soft colour-shift tone
    function sfxTheme() {
      const ctx = prep(); if (!ctx) return;
      tone(ctx, 520, 'triangle', 0.16, 0.10, 780);
      noiseBurst(ctx, 1600, 2, 0.02, 0.05);
    }

    // Era accordion open — deep rumble + ascending two-tone (timeline)
    function sfxEraOpen() {
      const ctx = prep(); if (!ctx) return;
      noiseBurst(ctx, 420, 0.8, 0.09, 0.20, 3);
      tone(ctx, 260, 'sine', 0.12, 0.08, 420);
      setTimeout(() => { const c = prep(); if (!c) return; tone(c, 520, 'triangle', 0.10, 0.06); }, 60);
    }

    // Era accordion close — descending (timeline)
    function sfxEraClose() {
      const ctx = prep(); if (!ctx) return;
      tone(ctx, 480, 'triangle', 0.10, 0.09, 280);
      noiseBurst(ctx, 500, 0.7, 0.06, 0.10, 5);
    }

    // Subfolder open — lighter chime (timeline / family trees)
    function sfxSubOpen() {
      const ctx = prep(); if (!ctx) return;
      tone(ctx, 700, 'triangle', 0.10, 0.08, 980);
      noiseBurst(ctx, 1400, 1.8, 0.022, 0.07);
    }

    // Subfolder close — soft descend (timeline / family trees)
    function sfxSubClose() {
      const ctx = prep(); if (!ctx) return;
      tone(ctx, 820, 'triangle', 0.09, 0.07, 520);
    }

    // Search keystroke — tiny tick (timeline search, hub search)
    let _searchThrottle = 0;
    function sfxSearch() {
      const now = Date.now();
      if (now - _searchThrottle < 70) return;
      _searchThrottle = now;
      noiseBurst(ctx() || prep(), 3000, 2.2, 0.012, 0.04, 6);
    }

    /* ═══ Routing ═══ */

    const NAV_SEL = [
      '.hub-card', '.card-cta', '.card-poster',
      'a[href]:not([href^="#"]):not([href^="mailto"])'
    ].join(',');

    const CLICK_SEL = [
      'button', '[role="button"]', '.pill-btn', '.pill-tab', '.book-tab',
      '.season-tab', '.ctrl-btn', '.comic-btn', '.nav-btn', '.modal-close',
      '.page-btn', '.vcbtn', '[data-ep]', '[data-book]', '.sp-install-row',
      '.back-link', '.ev-btn', '.dp-close', '#dpClose', '#dpHandle',
      '.ft-node', '[data-node]', '.pn'
    ].join(',');

    const CARD_HOVER_SEL = [
      '.ep-card', '.ep-thumb', '.merch-card', '.book-card', '.game-card',
      '.ft-node', '.pn', '[data-node]'
    ].join(',');

    const HOVER_SEL = [
      'button', '[role="button"]', '.pill-btn', '.pill-tab', '.theme-opt',
      '.ctrl-btn', '.star-btn', '.era-hd', '.sub-hd', '.ev', '.ev-btn',
      '.dp-close', '#dpClose'
    ].join(',');

    // ── Click routing ──
    document.addEventListener('click', e => {
      if (_sfxVol <= 0) return;
      const t = e.target;

      // Star rating
      if (t.closest('.star-btn'))                          { sfxStar();    return; }
      // Theme switch
      if (t.closest('.theme-opt'))                         { sfxTheme();   return; }
      // Settings gear — open/close handled below
      if (t.closest('#settingsBtn'))                       { return; }
      // Ambient toggle
      if (t.closest('.sp-ambient-row'))                    { sfxOpen();    return; }
      // Detail panel / modal close
      if (t.closest('.modal-close, #installClose, [data-close], #dpClose, #dpHandle, .dp-close')) {
        sfxClose(); return;
      }
      // Timeline era accordion — read state BEFORE the class toggles
      if (t.closest('.era-hd')) {
        const era = t.closest('.era');
        era?.classList.contains('open') ? sfxEraClose() : sfxEraOpen();
        return;
      }
      // Timeline subfolder accordion
      if (t.closest('.sub-hd')) {
        const sf = t.closest('.subfolder');
        sf?.classList.contains('open') ? sfxSubClose() : sfxSubOpen();
        return;
      }
      // Timeline event row
      if (t.closest('.ev'))                                { sfxEvent();   return; }
      // Nav (hub cards, links)
      if (t.closest(NAV_SEL))                             { sfxNav();     return; }
      // Generic buttons / everything else
      if (t.closest(CLICK_SEL))                           { sfxClick();   return; }
    }, { passive: true });

    // Settings gear — open vs close sound
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
      const isOpen = document.getElementById('settingsPanel')?.classList.contains('open');
      isOpen ? sfxClose() : sfxOpen();
    }, { passive: true });

    // ── Hover ticks — throttled ──
    let hoverThrottle = 0;
    document.addEventListener('mouseover', e => {
      if (_sfxVol <= 0) return;
      const now = Date.now();
      if (now - hoverThrottle < 80) return;
      const t = e.target;
      if (t.closest(CARD_HOVER_SEL)) {
        sfxCardEnter(); hoverThrottle = now;
      } else if (t.closest('.ev')) {
        sfxHover(); hoverThrottle = now;
      } else if (t.closest(HOVER_SEL)) {
        sfxHover(); hoverThrottle = now;
      }
    }, { passive: true });

    // ── Slider drag — throttled ──
    let sliderThrottle = 0;
    document.addEventListener('input', e => {
      if (_sfxVol <= 0) return;
      const el = e.target;
      if (!el.classList.contains('sp-vol-slider') && el.type !== 'range') return;
      const now = Date.now();
      if (now - sliderThrottle < 60) return;
      sliderThrottle = now;
      sfxSlider(parseFloat(el.value));
    }, { passive: true });

    // ── Search inputs (hub search, timeline search) ──
    document.addEventListener('input', e => {
      if (_sfxVol <= 0) return;
      const el = e.target;
      if (el.type === 'search' || el.id === 'tlSearch' || el.id === 'hubSearch' ||
          el.classList.contains('search-input')) {
        sfxSearch();
      }
    }, { passive: true });

    // Hook into gate: success / error
    const _tryEnterOrig = window._avatarGateTryEnter;
    // Intercept gate form submit via event delegation
    document.addEventListener('click', e => {
      if (!e.target.closest('#gateSubmit')) return;
      setTimeout(() => {
        const errEl = document.getElementById('gateErr');
        if (errEl?.classList.contains('show')) {
          sfxError();
        } else if (localStorage.getItem('avatarhub_auth') === '1') {
          sfxSuccess();
        }
      }, 30);
    }, { passive: true });

    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && document.getElementById('gateInput') === document.activeElement) {
        setTimeout(() => {
          const errEl = document.getElementById('gateErr');
          if (errEl?.classList.contains('show')) sfxError();
          else if (localStorage.getItem('avatarhub_auth') === '1') sfxSuccess();
        }, 30);
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
   6. AMBIENT KEEPALIVE
   Keeps the ambient loop position accurate
   across page navigations by flushing the
   elapsed timestamp on tab-hide and pagehide.
══════════════════════════════════════════ */
(function () {
  if (localStorage.getItem('avatarhub_ambient_off')      === '1') return;
  if (sessionStorage.getItem('avatarhub_ambient_active') !== '1') return;

  function flush() {
    const t0 = parseInt(sessionStorage.getItem('avatarhub_ambient_t0') || '0');
    if (!t0) return;
    sessionStorage.setItem('avatarhub_ambient_elapsed', ((Date.now() - t0) / 1000).toFixed(3));
  }

  document.addEventListener('visibilitychange', flush, { passive: true });
  window.addEventListener('pagehide',           flush, { passive: true });
  // Backup flush every 10 s for long-running tabs that never navigate
  setInterval(flush, 10_000);
})();


/* ══════════════════════════════════════════
   7. AMBIENT PARTICLES
   Floating element symbols (air/water/earth/
   fire) drift across the canvas in three
   movement modes: orbit, wave, drift.
   Pauses when the browser tab is hidden.
   Deferred via requestIdleCallback.
══════════════════════════════════════════ */
(function () {
  const _run = function () {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx  = canvas.getContext('2d', { alpha: true });
    const BASE = 'images/';

    // Load all four element images
    const imgs = ['air', 'water', 'earth', 'fire'].map(name => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = BASE + name + '.png';
      return img;
    });

    const isMobile = window.matchMedia('(max-width:640px)').matches;
    const COUNT    = isMobile ? 18 : 45;
    const PAD      = 60; // px outside viewport before recycling
    let W, H;
    let particles = [];
    let rafId;

    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    resize();

    // Debounce resize to avoid thrashing during window drag
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    }, { passive: true });

    const rand = (a, b) => a + Math.random() * (b - a);

    function spawn() {
      const img    = imgs[Math.floor(Math.random() * imgs.length)];
      const mode   = Math.random() < .4 ? 'orbit' : Math.random() < .5 ? 'wave' : 'drift';
      const base   = {
        img, mode,
        x: rand(0, W), y: rand(0, H),
        alpha: rand(.04, .12),          // slightly brighter upper bound
        size:  rand(10, 24),            // slightly larger max
        rot:   rand(0, Math.PI * 2),
        vrot:  rand(-.004, .004),
      };

      if (mode === 'orbit') return {
        ...base,
        cx: rand(0, W), cy: rand(0, H),
        rx: rand(40, 160), ry: rand(30, 110),
        angle: rand(0, Math.PI * 2),
        speed: rand(.002, .006) * (Math.random() < .5 ? 1 : -1),
      };

      const angle = rand(0, Math.PI * 2);
      const speed = rand(.06, .22);

      if (mode === 'wave') return {
        ...base,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        wAmp: rand(.4, 1.6), wFreq: rand(.008, .02), wOff: rand(0, Math.PI * 2), t: 0,
      };

      return { ...base, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
    }

    for (let i = 0; i < COUNT; i++) particles.push(spawn());

    function draw() {
      ctx.clearRect(0, 0, W, H);

      for (const p of particles) {
        // Update position
        if (p.mode === 'orbit') {
          p.angle += p.speed;
          p.x = p.cx + Math.cos(p.angle) * p.rx;
          p.y = p.cy + Math.sin(p.angle) * p.ry;
        } else if (p.mode === 'wave') {
          p.t++;
          p.x += p.vx + Math.sin(p.t * p.wFreq + p.wOff) * p.wAmp * .08;
          p.y += p.vy;
        } else {
          p.x += p.vx;
          p.y += p.vy;
        }
        p.rot += p.vrot;

        // Recycle non-orbit particles that drift off-screen
        if (p.mode !== 'orbit' && (p.x < -PAD || p.x > W + PAD || p.y < -PAD || p.y > H + PAD)) {
          Object.assign(p, spawn());
          p.x = rand(0, W);
          p.y = rand(0, H);
          continue;
        }

        // Skip images that haven't loaded yet
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

    // Pause loop when tab is hidden, resume when visible again
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
        rafId = null;
      } else if (!rafId) {
        rafId = requestAnimationFrame(draw);
      }
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
   Only runs on index.html (guarded by the
   #mapSplash element). Registers a blob-URL
   service worker so the site is installable
   and works offline after first visit.
══════════════════════════════════════════ */
(function () {
  if (!document.getElementById('mapSplash')) return;

  // Inject blob manifest only if the HTML didn't include one
  if (!document.querySelector('link[rel="manifest"]')) {
    const manifest = {
      name: 'AvatarArchive', short_name: 'AvatarArchive',
      description: 'Watch Avatar: The Last Airbender, The Legend of Korra, the films, and more.',
      start_url: './index.html', display: 'standalone',
      background_color: '#04070d', theme_color: '#04070d',
      orientation: 'portrait-primary',
      icons: [
        { src: 'images/favicon.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: 'images/favicon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    };
    const link = document.createElement('link');
    link.rel   = 'manifest';
    link.href  = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
    document.head.appendChild(link);
  }

  if (!('serviceWorker' in navigator)) return;

  // Inline service-worker with three caching strategies:
  //   • HTML  → network-first  (always get fresh page shells)
  //   • JS/CSS → stale-while-revalidate
  //   • Images → cache-first
  const swCode = `
const CACHE = 'avatar-v5';
const SHELL = [
  './index.html','./atla.html','./kora.html','./movie2026.html',
  './movie2010.html','./liveshow.html','./books.html','./games.html',
  './merch.html','./shared.css','./shared.js','./player-engine.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  if (request.destination === 'document') {
    // HTML: network-first, fall back to cache
    e.respondWith(
      fetch(request)
        .then(r => { if (r.ok) caches.open(CACHE).then(c => c.put(request, r.clone())); return r; })
        .catch(() => caches.match(request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  if (request.destination === 'script' || request.destination === 'style') {
    // JS/CSS: stale-while-revalidate
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached  = await cache.match(request);
        const fetched = fetch(request)
          .then(r => { if (r.ok) cache.put(request, r.clone()); return r; })
          .catch(() => null);
        return cached || fetched;
      })
    );
    return;
  }

  if (request.destination === 'image') {
    // Images: cache-first
    e.respondWith(
      caches.match(request).then(r => r || fetch(request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()));
        return res;
      }).catch(() => new Response('', { status: 404 })))
    );
    return;
  }

  // Everything else: cache-first with network fallback
  e.respondWith(caches.match(request).then(r => r || fetch(request)).catch(() => {}));
});
`;
  navigator.serviceWorker
    .register(URL.createObjectURL(new Blob([swCode], { type: 'application/javascript' })))
    .catch(() => {});
})();


/* ══════════════════════════════════════════
   9. CURSOR RIPPLE
   On every mouse click a small coloured bloom
   expands at the cursor position then fades.
   Colour is sampled from the nearest CSS accent
   variable on the clicked element.
   Skipped on touch devices.
══════════════════════════════════════════ */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if ('ontouchstart' in window) return;

  const ACCENT_PROPS = ['--accent', '--ec', '--fire', '--water', '--earth', '--air'];
  const FALLBACK     = '#c9a84c'; // gold

  function nearestAccent(el) {
    let node = el;
    while (node && node !== document.body) {
      const cs = getComputedStyle(node);
      for (const prop of ACCENT_PROPS) {
        const val = cs.getPropertyValue(prop).trim();
        if (val && (val.startsWith('#') || val.startsWith('rgb'))) return val;
      }
      node = node.parentElement;
    }
    return FALLBACK;
  }

  const style = document.createElement('style');
  style.textContent = `
@keyframes _avatarRipple {
  0%   { transform:scale(0);   opacity:.55; }
  60%  { transform:scale(1);   opacity:.22; }
  100% { transform:scale(1.4); opacity:0;   }
}
._avatar-ripple {
  position:fixed; pointer-events:none; z-index:9998;
  border-radius:50%; mix-blend-mode:screen;
  animation: _avatarRipple .55s cubic-bezier(.22,1,.36,1) forwards;
}`;
  document.head.appendChild(style);

  document.addEventListener('click', e => {
    const size  = 80;
    const color = nearestAccent(e.target);
    const el    = document.createElement('div');
    el.className  = '_avatar-ripple';
    el.style.cssText = `
      width:${size}px; height:${size}px;
      left:${e.clientX - size / 2}px; top:${e.clientY - size / 2}px;
      background: radial-gradient(circle, ${color} 0%, transparent 70%);
    `;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, { passive: true });
})();


/* ══════════════════════════════════════════
   10. PAGE TRANSITIONS
   Internal link clicks fade the page out
   over 220 ms before navigating, making every
   page-to-page jump feel silky.
══════════════════════════════════════════ */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.addEventListener('click', e => {
    const a    = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');

    // Skip external, anchor, mailto, or modifier-key clicks
    if (!href || href.startsWith('#') || href.startsWith('http') ||
        href.startsWith('mailto') || a.target === '_blank')   return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)     return;

    e.preventDefault();
    document.body.classList.add('_avatar-leaving');
    setTimeout(() => { window.location.href = href; }, 230);
  });
})();


/* ══════════════════════════════════════════
   11. SHOOTING STARS
   Rare golden streaks fire across the particle
   canvas every 18–45 seconds. Each streak has
   a head that races ahead of a fading tail,
   giving a realistic comet appearance.
══════════════════════════════════════════ */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function scheduleNext() {
    const delay = 18_000 + Math.random() * 27_000; // 18–45 s
    setTimeout(fireStar, delay);
  }

  function fireStar() {
    if (document.hidden) { scheduleNext(); return; }

    const canvas = document.getElementById('particleCanvas');
    if (!canvas) { scheduleNext(); return; }

    const ctx    = canvas.getContext('2d');
    const W      = canvas.width;
    const H      = canvas.height;

    // Random diagonal angle around 45°
    const angle  = Math.PI / 4 + (Math.random() - .5) * .4;
    const startX = Math.random() * W;
    const startY = Math.random() * (H * .45);
    const len    = 80 + Math.random() * 140;
    const endX   = startX + Math.cos(angle) * len;
    const endY   = startY + Math.sin(angle) * len;
    const dur    = 900 + Math.random() * 600; // ms
    const t0     = performance.now();
    const TAIL   = 0.38; // tail lag as a fraction of total progress
    let   rafId;

    function draw(now) {
      const t    = Math.min(1, (now - t0) / dur);
      const ease = t < .5 ? 2*t*t : -1 + (4 - 2*t) * t; // quad ease-in-out

      // Head position
      const hx = startX + (endX - startX) * ease;
      const hy = startY + (endY - startY) * ease;

      // Tail lags behind the head by TAIL fraction
      const tx = startX + (endX - startX) * Math.max(0, ease - TAIL);
      const ty = startY + (endY - startY) * Math.max(0, ease - TAIL);

      // Fade in for first 25%, full for middle 50%, fade out last 25%
      const alpha = t < .25 ? t / .25 : t > .75 ? (1 - t) / .25 : 1;

      const grad = ctx.createLinearGradient(tx, ty, hx, hy);
      grad.addColorStop(0,  `rgba(240,220,140,0)`);
      grad.addColorStop(.5, `rgba(240,220,140,${(alpha * .6).toFixed(3)})`);
      grad.addColorStop(1,  `rgba(255,245,200,${(alpha * .9).toFixed(3)})`);

      ctx.save();
      ctx.lineWidth               = 1.5;
      ctx.strokeStyle             = grad;
      ctx.lineCap                 = 'round';
      ctx.globalCompositeOperation = 'screen';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.restore();

      if (t < 1) {
        rafId = requestAnimationFrame(draw);
      } else {
        scheduleNext();
      }
    }

    rafId = requestAnimationFrame(draw);

    // Cancel and reschedule if the tab hides mid-animation
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && rafId) { cancelAnimationFrame(rafId); scheduleNext(); }
    }, { passive: true, once: true });
  }

  scheduleNext();
})();


/* ══════════════════════════════════════════
   12. DYNAMIC VIGNETTE
   A soft directional glow follows the mouse
   with heavy lag (4% lerp per frame), giving
   the background a living, breathing quality.
   Single fixed div — zero extra DOM cost per
   frame beyond two CSS variable writes.
   Skipped on touch devices.
══════════════════════════════════════════ */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if ('ontouchstart' in window) return;

  const style = document.createElement('style');
  style.textContent = `
#_avatar-vignette {
  position:fixed; inset:0; z-index:0; pointer-events:none;
  background: radial-gradient(
    ellipse 72% 62% at var(--vx, 50%) var(--vy, 40%),
    rgba(77,184,255,.032) 0%,
    transparent 70%
  );
  mix-blend-mode: screen;
}`;
  document.head.appendChild(style);

  const v = document.createElement('div');
  v.id = '_avatar-vignette';
  document.body.appendChild(v);

  let mx = 50, my = 40; // mouse target (%)
  let cx = 50, cy = 40; // current lerped position (%)
  let raf = null;

  document.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth)  * 100;
    my = (e.clientY / window.innerHeight) * 100;
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });

  function tick() {
    cx += (mx - cx) * 0.04;
    cy += (my - cy) * 0.04;
    v.style.setProperty('--vx', cx.toFixed(2) + '%');
    v.style.setProperty('--vy', cy.toFixed(2) + '%');
    // Stop the loop once the glow has caught up
    raf = (Math.abs(mx - cx) > 0.05 || Math.abs(my - cy) > 0.05)
      ? requestAnimationFrame(tick)
      : null;
  }
})();


/* ══════════════════════════════════════════
   13. SCROLL PARALLAX
   The .bg-layer image drifts upward at 18%
   of the scroll offset, adding a subtle sense
   of depth between content and background.
   One transform per scroll event — cheap.
══════════════════════════════════════════ */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const bg = document.querySelector('.bg-layer');
  if (!bg) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      bg.style.transform = `scale(1.04) translateY(${-(window.scrollY * 0.18)}px)`;
      ticking = false;
    });
  }, { passive: true });
})();


/* ══════════════════════════════════════════
   14. TIME-OF-DAY TINT
   A single full-screen div with a colour that
   matches the real-world time of day — warm
   amber at dawn, near-neutral by day, golden
   orange at dusk, deep blue at night, indigo
   late at night. Applied once on page load.
══════════════════════════════════════════ */
(function () {
  const h = new Date().getHours();

  // Map hour ranges to [r,g,b, opacity]
  const [color, alpha] = (
    h >= 5  && h < 8  ? ['255,160,60',  0.022] : // dawn   — warm amber
    h >= 8  && h < 17 ? ['240,248,255', 0.008] : // day    — near neutral
    h >= 17 && h < 20 ? ['255,140,60',  0.025] : // dusk   — golden orange
    h >= 20 && h < 23 ? ['60,90,200',   0.018] : // evening — deep blue
                        ['20,30,80',    0.030]    // night  — indigo
  );

  const style = document.createElement('style');
  style.textContent = `
#_avatar-tod {
  position:fixed; inset:0; z-index:0; pointer-events:none;
  background: rgba(${color},${alpha});
  mix-blend-mode: screen;
}`;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.id = '_avatar-tod';
  document.body.appendChild(el);
})();


/* ══════════════════════════════════════════
   15. CARD SHIMMER
   A single highlight stripe sweeps across
   .hub-card elements on hover — pure CSS
   injection, zero JS per frame cost.
══════════════════════════════════════════ */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const style = document.createElement('style');
  style.textContent = `
.hub-card::after {
  content:''; position:absolute; inset:0; pointer-events:none; z-index:3;
  background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,.06) 50%, transparent 65%);
  background-size: 250% 100%;
  background-position: 200% center;
  opacity:0;
  transition: opacity .2s, background-position 0s;
}
.hub-card:hover::after {
  opacity:1;
  background-position: -60% center;
  transition: opacity .15s, background-position .6s cubic-bezier(.22,1,.36,1);
}`;
  document.head.appendChild(style);
})();
