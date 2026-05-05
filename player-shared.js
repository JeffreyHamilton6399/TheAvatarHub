/* ═══════════════════════════════════════════════════════════
   AvatarArchive — player-shared.js
   Loaded inline (before render) on all video/viewer pages.
   Sections:
     A. Theme   — applies saved theme immediately to avoid FOUC
     B. Gate    — password overlay (same logic as shared.js,
                  inlined here so video pages don't need a
                  separate blocking script tag)
     C. Ambient — seamless sub-page ambient loop resume
═══════════════════════════════════════════════════════════ */


/* ══════════════════════════════════════════
   A. APPLY SAVED THEME
   Runs synchronously before any CSS paints
   so there is never a flash of unstyled content.
══════════════════════════════════════════ */
(function () {
  const t = localStorage.getItem('avatarhub_theme');
  if (t && t !== 'dark') document.body.classList.add(t);
})();


/* ══════════════════════════════════════════
   B. PASSWORD GATE
   Injects its own <style> + DOM before any
   page content is visible. Auth is persisted
   in localStorage so the gate only appears once.
══════════════════════════════════════════ */
(function () {
  const PASS    = 'AvatarAang';
  const STORAGE = 'avatarhub_auth';

  if (localStorage.getItem(STORAGE) === '1')     return; // already authenticated
  if (document.getElementById('avatarGate'))     return; // already injected

  /* ── Styles ── */
  const style = document.createElement('style');
  style.textContent = `
#avatarGate {
  position:fixed; inset:0; z-index:99999;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2rem;
  background: radial-gradient(ellipse at 50% 40%, #071220 0%, #04070d 65%);
  font-family:"Cinzel",Georgia,serif;
}
#avatarGate .gate-symbols {
  display:flex; align-items:center;
  gap: clamp(1.2rem,4vw,3rem); margin-bottom:.5rem;
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
  padding:.2em; display:flex; align-items:center; transition:color .2s;
}
#avatarGate .gate-eye:hover { color:#4db8ff; }
#avatarGate .gate-btn {
  width:100%; font-family:"Cinzel",Georgia,serif;
  font-size:.55rem; letter-spacing:.35em; text-transform:uppercase;
  color:#04070d; background: linear-gradient(135deg,#4db8ff,#1a8fcc);
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
  0%,100%{ transform:translateX(0) }  20%{ transform:translateX(-8px) }
  40%    { transform:translateX(8px) } 60%{ transform:translateX(-6px) }
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
  gate.id    = 'avatarGate';
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
    form.classList.remove('shake');
    void form.offsetWidth; // force reflow to restart shake animation
    form.classList.add('shake');
    input.select();
    errTimer = setTimeout(() => err.classList.remove('show'), 2800);
  }

  function tryEnter() {
    const val = input.value;
    if (!val)        { showErr('Please enter the password'); return; }
    if (val === PASS) {
      localStorage.setItem(STORAGE, '1');
      gate.classList.add('leaving');
      setTimeout(() => { gate.style.display = 'none'; }, 500);
    } else {
      input.value = '';
      showErr('Incorrect password — try again');
    }
  }

  btn.addEventListener('click', tryEnter);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') tryEnter(); });

  eye.addEventListener('click', () => {
    const isPass       = input.type === 'password';
    input.type         = isPass ? 'text'    : 'password';
    eyeShow.style.display = isPass ? 'none' : '';
    eyeHide.style.display = isPass ? ''     : 'none';
    input.focus();
  });

  // Delay focus slightly so the keyboard doesn't pop before the gate is visible
  setTimeout(() => input.focus(), 350);
})();


/* ══════════════════════════════════════════
   C. AMBIENT AUDIO — seamless sub-page resume
   Picks up the loop at exactly the position
   it was at on the hub, using the t0 and
   elapsed timestamps written by the keepalive.
   Ducks when the main video starts playing.
══════════════════════════════════════════ */
(function () {
  if (localStorage.getItem('avatarhub_ambient_off')      === '1') return;
  if (sessionStorage.getItem('avatarhub_ambient_active') !== '1') return;

  let _raw     = null;  // prefetched ArrayBuffer
  let _ctx     = null;  // AudioContext
  let _gain    = null;  // master gain node
  let _started = false;

  const targetVol = () => parseFloat(localStorage.getItem('avatarhub_ambient_vol') ?? '0.55');

  // Prefetch audio immediately — no AudioContext needed yet
  fetch('audio/ambient.MP3')
    .then(r => r.ok ? r.arrayBuffer() : null)
    .then(b  => { _raw = b; })
    .catch(() => {});

  setTimeout(tryStart, 80);
  armGesture();

  function armGesture() {
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

    const raw = _raw ?? await fetch('audio/ambient.MP3')
      .then(r => r.ok ? r.arrayBuffer() : null).catch(() => null);
    if (!raw) return;

    let decoded;
    try { decoded = await _ctx.decodeAudioData(raw.slice(0)); }
    catch { return; }

    if (_started) return; // guard against gesture + timeout race
    _started = true;

    // Calculate loop resume offset
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

    // Fade in over 2.5 seconds
    _gain.gain.setValueAtTime(0, _ctx.currentTime);
    _gain.gain.linearRampToValueAtTime(targetVol(), _ctx.currentTime + 2.5);

    // Duck when the main video plays, restore when it pauses / ends
    const video = document.getElementById('mainVideo');
    if (video) {
      video.addEventListener('play',  () => fadeTo(0),           { passive: true });
      video.addEventListener('pause', () => fadeTo(targetVol()), { passive: true });
      video.addEventListener('ended', () => fadeTo(targetVol()), { passive: true });
    }
  }

  function fadeTo(target) {
    if (!_gain || !_ctx) return;
    _gain.gain.cancelScheduledValues(_ctx.currentTime);
    _gain.gain.setValueAtTime(_gain.gain.value, _ctx.currentTime);
    _gain.gain.linearRampToValueAtTime(target, _ctx.currentTime + 0.8);
  }
})();
