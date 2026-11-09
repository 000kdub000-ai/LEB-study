// Easter eggs. None of this touches the study features; delete this file
// and its <script> line in index.html to remove all of it.
//
// 1. The duck: tap the "LEB Study" title 3 times quickly and a duck in a
//    top hat waddles across the bottom of the screen. It also visits on its
//    own about 1 in every 5 times the app is opened.
// 2. Gravity: shake your phone (or press G on a keyboard, or press and hold
//    the title) and everything on the home screen falls into a pile, then
//    floats back.
// 3. The frog: about 1 in every 5 visits, a tiny frog sits in a corner of the
//    home screen. Tap it and it croaks and jumps to another corner.
//
// To see them on demand, open the app with ?duck or ?frog at the end of the
// address (for example index.html?duck).

(() => {
  const DUCK_CHANCE = 1 / 5;
  const FROG_CHANCE = 1 / 5;
  const params = new URLSearchParams(location.search);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const homeShown = () => !document.getElementById("home-view").hidden;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- Styles (kept here so the whole feature is one file) ----------
  const style = document.createElement("style");
  style.textContent = `
    #brand h1 { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none;
      touch-action: manipulation; cursor: default; }
    .egg-duck { position: fixed; left: 0; bottom: max(14px, env(safe-area-inset-bottom));
      width: 76px; height: 76px; z-index: 50; pointer-events: none; }
    .egg-duck svg { width: 100%; height: 100%; overflow: visible; }
    .egg-duck.walking .egg-body { animation: egg-waddle 0.36s ease-in-out infinite alternate; transform-origin: 32px 56px; }
    .egg-duck.walking .egg-foot-a { animation: egg-step 0.36s ease-in-out infinite alternate; }
    .egg-duck.walking .egg-foot-b { animation: egg-step 0.36s ease-in-out infinite alternate-reverse; }
    .egg-duck .egg-bubble { margin-bottom: 14px; }
    .egg-duck .egg-hat { transform-origin: 38px 15px; transition: transform 0.25s ease; }
    .egg-duck.tipping .egg-hat { transform: translate(1px, -3px) rotate(-18deg); }
    @keyframes egg-waddle { from { transform: rotate(-5deg); } to { transform: rotate(5deg) translateY(-1px); } }
    @keyframes egg-step { from { transform: translateY(0); } to { transform: translateY(-3px); } }

    .egg-bubble { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
      background: var(--surface); color: var(--text); border: 1px solid var(--border);
      border-radius: 12px; padding: 4px 10px; font: italic 600 15px var(--font-body);
      text-transform: none; letter-spacing: normal;
      white-space: nowrap; box-shadow: 0 2px 8px var(--scroll-shadow);
      animation: egg-pop 0.2s ease-out; }
    .egg-bubble::after { content: ""; position: absolute; top: 100%; left: 50%; margin-left: -6px;
      border: 6px solid transparent; border-top-color: var(--border); }
    @keyframes egg-pop { from { transform: translateX(-50%) scale(0.4); opacity: 0; } }

    .egg-frog { position: fixed; width: 34px; height: 30px; z-index: 40; padding: 0; border: 0;
      background: none; cursor: pointer; -webkit-tap-highlight-color: transparent; }
    .egg-frog svg { width: 100%; height: 100%; overflow: visible; }
    .egg-frog[data-corner="tl"] { top: max(12px, env(safe-area-inset-top)); left: 12px; }
    .egg-frog[data-corner="tr"] { top: max(12px, env(safe-area-inset-top)); right: 12px; }
    .egg-frog[data-corner="bl"] { bottom: max(12px, env(safe-area-inset-bottom)); left: 12px; }
    .egg-frog[data-corner="br"] { bottom: max(12px, env(safe-area-inset-bottom)); right: 12px; }
    .egg-frog[data-corner^="t"] .egg-bubble { bottom: auto; top: 100%; margin-top: 8px; }
    .egg-frog[data-corner^="t"] .egg-bubble::after { top: auto; bottom: 100%; border-top-color: transparent; border-bottom-color: var(--border); }
    .egg-frog[data-corner$="l"] .egg-bubble { left: 0; transform: none; animation: none; }
    .egg-frog[data-corner$="r"] .egg-bubble { left: auto; right: 0; transform: none; animation: none; }
    .egg-frog[data-corner$="l"] .egg-bubble::after { left: 16px; }
    .egg-frog[data-corner$="r"] .egg-bubble::after { left: auto; right: 10px; }
  `;
  document.head.append(style);

  // ---------- Drawings ----------
  // A side-on duck facing right, wearing a top hat (64 x 64 drawing units).
  const DUCK_SVG = `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <g fill="#E8892B" stroke="#B9651A" stroke-width="1">
        <path class="egg-foot-a" d="M24 55 l-1 6 h7 z"/>
        <path class="egg-foot-b" d="M35 55 l-1 6 h7 z"/>
      </g>
      <g class="egg-body">
        <path d="M8 38 L2 31 L12 34 Z" fill="#F2C53D" stroke="#C99A1E" stroke-width="1.2"/>
        <ellipse cx="27" cy="44" rx="20" ry="13" fill="#F7D24A" stroke="#C99A1E" stroke-width="1.2"/>
        <path d="M16 42 q10 -9 20 0 q-10 8 -20 0 z" fill="#EDBC2F"/>
        <circle cx="42" cy="27" r="11" fill="#F7D24A" stroke="#C99A1E" stroke-width="1.2"/>
        <ellipse cx="38" cy="38" rx="6" ry="4" fill="#F7D24A"/>
        <path d="M51 27 q9 -1 10 3 q-5 3 -10 1 z" fill="#E8892B" stroke="#B9651A" stroke-width="1"/>
        <circle cx="46" cy="24" r="2.2" fill="#25344F"/>
        <circle cx="46.8" cy="23.3" r="0.7" fill="#fff"/>
        <ellipse cx="44" cy="30" rx="2.6" ry="1.4" fill="#F0A93B" opacity="0.6"/>
        <g class="egg-hat" stroke="#F5EEE2" stroke-width="0.9" stroke-opacity="0.55">
          <rect x="31" y="-2" width="14" height="16" rx="1.5" fill="#111318"/>
          <rect x="31" y="8.5" width="14" height="3.4" fill="#B23A3A" stroke="none"/>
          <rect x="27" y="13" width="22" height="3.6" rx="1.8" fill="#111318"/>
          <path d="M34 0 v7" stroke="#F5EEE2" stroke-opacity="0.35" stroke-width="1.4" stroke-linecap="round"/>
        </g>
      </g>
    </svg>`;

  // A small round frog, facing you (40 x 34 drawing units).
  const FROG_SVG = `
    <svg viewBox="0 0 40 34" aria-hidden="true">
      <ellipse cx="20" cy="22" rx="16" ry="11" fill="#6BAF4F" stroke="#3F7A2E" stroke-width="1.2"/>
      <ellipse cx="20" cy="25" rx="9" ry="6" fill="#B9DA8E"/>
      <circle cx="11" cy="11" r="6" fill="#6BAF4F" stroke="#3F7A2E" stroke-width="1.2"/>
      <circle cx="29" cy="11" r="6" fill="#6BAF4F" stroke="#3F7A2E" stroke-width="1.2"/>
      <circle cx="11" cy="10.5" r="3.6" fill="#fff"/>
      <circle cx="29" cy="10.5" r="3.6" fill="#fff"/>
      <circle cx="11.6" cy="11" r="2" fill="#25344F"/>
      <circle cx="28.4" cy="11" r="2" fill="#25344F"/>
      <path d="M13 19 q7 5 14 0" fill="none" stroke="#2F5E22" stroke-width="1.4" stroke-linecap="round"/>
      <ellipse cx="8.5" cy="19" rx="2" ry="1.2" fill="#E58A7B" opacity="0.55"/>
      <ellipse cx="31.5" cy="19" rx="2" ry="1.2" fill="#E58A7B" opacity="0.55"/>
      <path d="M7 31 q-4 1 -5 -1 M8 31 q-1 2 -4 2 M33 31 q4 1 5 -1 M32 31 q1 2 4 2"
            fill="none" stroke="#3F7A2E" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`;

  // A speech bubble that pops up over `parent` and goes away after `ms`
  async function say(parent, text, ms) {
    const bubble = document.createElement("span");
    bubble.className = "egg-bubble";
    bubble.textContent = text;
    parent.append(bubble);
    await wait(ms);
    bubble.remove();
  }

  // ---------- 1. The duck ----------
  let duckBusy = false;
  async function duckWalk() {
    if (duckBusy) return;
    duckBusy = true;
    const duck = document.createElement("div");
    duck.className = "egg-duck walking";
    duck.innerHTML = DUCK_SVG;
    document.body.append(duck);

    const w = 76;
    const middle = innerWidth / 2 - w / 2;
    const step = (from, to, ms) => duck.animate(
      [{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }],
      { duration: ms, fill: "forwards" }).finished;

    await step(-w, middle, 1700);                 // waddle in
    duck.classList.remove("walking");             // stop, hop, tip hat, quack
    await duck.animate(
      [{ transform: `translateX(${middle}px)` },
       { transform: `translateX(${middle}px) translateY(-12px)`, offset: 0.4 },
       { transform: `translateX(${middle}px)` }],
      { duration: 380, easing: "ease-out", fill: "forwards" }).finished;
    duck.classList.add("tipping");
    await say(duck, "quack.", 1300);
    duck.classList.remove("tipping");
    await wait(250);
    duck.classList.add("walking");
    await step(middle, innerWidth + 10, 1700);    // waddle off
    duck.remove();
    duckBusy = false;
  }

  // Three quick taps on the title
  const title = document.querySelector("#brand h1");
  let taps = [];
  let heldDown = false;
  title.addEventListener("click", () => {
    if (heldDown) { heldDown = false; return; } // that was a press-and-hold, not a tap
    const now = Date.now();
    taps = taps.filter((t) => now - t < 900).concat(now);
    if (taps.length >= 3) {
      taps = [];
      duckWalk();
    }
  });

  // Rare visit
  if (params.has("duck") || (!reduceMotion && Math.random() < DUCK_CHANCE)) {
    setTimeout(() => homeShown() && duckWalk(), 2500);
  }

  // ---------- 2. Gravity ----------
  let falling = false;
  async function gravity() {
    if (falling || !homeShown()) return;
    falling = true;
    const items = [document.getElementById("brand"),
      ...document.getElementById("home-view").children]
      .filter((n) => !n.hidden && n.offsetHeight > 0);

    // Land in a pile: the lowest item hits the floor first, the rest stack on it
    const floor = innerHeight - 10;
    let pileTop = floor;
    const drops = items.slice().reverse().map((node, i) => {
      const box = node.getBoundingClientRect();
      const dy = Math.max(0, pileTop - box.bottom);
      pileTop -= box.height * 0.55;
      const turn = (Math.random() * 2 - 1) * (node.tagName === "BUTTON" ? 18 : 9);
      const slide = (Math.random() * 2 - 1) * 24;
      node.style.pointerEvents = "none";
      const end = `translate(${slide}px, ${dy}px) rotate(${turn}deg)`;
      return { node, end, anim: node.animate([
        { transform: "none" },
        { transform: end, offset: 0.75, easing: "ease-out" },
        { transform: `translate(${slide}px, ${dy - 14}px) rotate(${turn}deg)`, offset: 0.87, easing: "ease-in" },
        { transform: end },
      ], { duration: 650 + i * 70, delay: (items.length - i) * 45,
           easing: "cubic-bezier(.5,0,1,.6)", fill: "forwards" }) };
    });
    await Promise.all(drops.map((d) => d.anim.finished));
    await wait(2200);
    await Promise.all(drops.map(({ node, end }, i) => node.animate(
      [{ transform: end }, { transform: "none" }],
      { duration: 900, delay: i * 40, easing: "ease-in-out", fill: "forwards" }).finished));
    drops.forEach(({ node, anim }) => {
      node.getAnimations().forEach((a) => a.cancel());
      anim.cancel();
      node.style.pointerEvents = "";
    });
    falling = false;
  }

  // Press G (not while typing in a box)
  addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey && !e.altKey &&
        !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) gravity();
  });

  // Press and hold the title
  // (Phones normally treat holding on text as "select this text", which
  // cancels the hold, so the title turns off text selection and the
  // copy/look-up menu, and a finger wobbling a little doesn't count as moving.)
  let holdTimer, holdStart;
  title.addEventListener("pointerdown", (e) => {
    heldDown = false;
    holdStart = { x: e.clientX, y: e.clientY };
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => { heldDown = true; gravity(); }, 800);
  });
  title.addEventListener("pointermove", (e) => {
    if (holdStart && Math.hypot(e.clientX - holdStart.x, e.clientY - holdStart.y) > 12) {
      clearTimeout(holdTimer);
    }
  });
  ["pointerup", "pointercancel"].forEach((type) =>
    title.addEventListener(type, () => clearTimeout(holdTimer)));
  title.addEventListener("contextmenu", (e) => e.preventDefault());

  // Shake the phone: two hard jolts within half a second. (iPhones only share
  // motion with sites that ask permission first, so there it's press-and-hold.)
  let lastJolt = 0, prev = null;
  addEventListener("devicemotion", (e) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x === null) return;
    if (prev) {
      const change = Math.abs(a.x - prev.x) + Math.abs(a.y - prev.y) + Math.abs(a.z - prev.z);
      if (change > 30) {
        const now = Date.now();
        if (now - lastJolt < 500) gravity();
        lastJolt = now;
      }
    }
    prev = { x: a.x, y: a.y, z: a.z };
  });

  // ---------- 3. The frog ----------
  if (params.has("frog") || Math.random() < FROG_CHANCE) {
    const corners = ["tl", "tr", "bl", "br"];
    const pick = (not) => {
      const options = corners.filter((c) => c !== not);
      return options[Math.floor(Math.random() * options.length)];
    };
    const frog = document.createElement("button");
    frog.className = "egg-frog";
    frog.setAttribute("aria-label", "A frog");
    frog.innerHTML = FROG_SVG;
    frog.dataset.corner = pick();
    document.body.append(frog);

    // Only on the home screen
    const showFrog = () => (frog.hidden = !homeShown());
    new MutationObserver(showFrog).observe(document.getElementById("home-view"),
      { attributes: true, attributeFilter: ["hidden"] });
    showFrog();

    let jumping = false;
    frog.addEventListener("click", async () => {
      if (jumping) return;
      jumping = true;
      await say(frog, "ribbit", 700);
      // Jump: move to the new corner, then animate from the old spot in an arc
      const from = frog.getBoundingClientRect();
      frog.dataset.corner = pick(frog.dataset.corner);
      const to = frog.getBoundingClientRect();
      const dx = from.left - to.left, dy = from.top - to.top;
      const lift = Math.min(160, Math.abs(dx) / 2 + Math.abs(dy) / 3 + 60);
      if (!reduceMotion) {
        await frog.animate([
          { transform: `translate(${dx}px, ${dy}px) scale(1.1, 0.85)` },
          { transform: `translate(${dx / 2}px, ${dy / 2 - lift}px) scale(0.9, 1.15)` },
          { transform: "translate(0, 0) scale(1.1, 0.85)", offset: 0.9 },
          { transform: "none" },
        ], { duration: 700, easing: "ease-in-out" }).finished;
      }
      jumping = false;
    });
  }
})();
