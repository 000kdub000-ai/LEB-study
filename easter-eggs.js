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
//    home screen. Tap it and it usually says "ribbit" and jumps to another
//    corner, but about 1 tap in 5 it says "ow!", flips onto its back with X
//    eyes, and falls off the bottom of the screen. Every 3rd time it dies
//    (counted across visits), it explodes instead, filling the whole screen.
//    After it leaves, it comes back on its own 5 to 10 minutes later. Hold
//    the title for 5 seconds to bring it back right away.
//
// To see them on demand, open the app with ?duck, ?frog, ?deadfrog (the frog
// dies on the first tap) or ?boomfrog (it explodes on the first tap) at the
// end of the address, for example index.html?duck.

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
    .egg-frog .egg-dead, .egg-frog.dead .egg-alive { display: none; }
    .egg-frog.dead .egg-dead { display: inline; }
    .egg-frog.dead { cursor: default; }
    .egg-boom { position: fixed; inset: 0; z-index: 100; pointer-events: none; overflow: hidden; }
    .egg-boom .egg-flash { position: absolute; inset: 0; background: #FFF8D6; }
    .egg-boom .egg-burst { position: absolute; }
    .egg-boom .egg-burst svg { width: 100%; height: 100%; display: block; }
    .egg-boom .egg-boom-word { position: absolute; left: 50%; top: 45%; margin: 0;
      font: 72px var(--font-display); color: #8C2430; letter-spacing: 2px;
      text-shadow: 2px 2px 0 #FFF3B0, -2px 2px 0 #FFF3B0, 2px -2px 0 #FFF3B0, -2px -2px 0 #FFF3B0,
        0 6px 0 #6F1C22; white-space: nowrap; }
    .egg-boom .egg-bit { position: absolute; width: 16px; height: 12px; border-radius: 50%;
      background: #6BAF4F; border: 1.5px solid #3F7A2E; }
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
      <g class="egg-alive">
        <circle cx="11.6" cy="11" r="2" fill="#25344F"/>
        <circle cx="28.4" cy="11" r="2" fill="#25344F"/>
      </g>
      <g class="egg-dead" stroke="#25344F" stroke-width="1.4" stroke-linecap="round">
        <path d="M9 8.5 l4 4 M13 8.5 l-4 4 M27 8.5 l4 4 M31 8.5 l-4 4"/>
        <ellipse cx="23" cy="22.6" rx="1.7" ry="2.6" fill="#E5737A" stroke="#B9505A" stroke-width="0.8"/>
      </g>
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
  // Hold for 5 seconds (gravity happens along the way) and the frog comes back.
  // Letting go and moving are watched on the whole page, because gravity
  // moves the title out from under your finger.
  let holdTimer, frogHoldTimer, holdStart;
  const stopHold = () => {
    clearTimeout(holdTimer);
    clearTimeout(frogHoldTimer);
    holdStart = null;
  };
  title.addEventListener("pointerdown", (e) => {
    heldDown = false;
    stopHold();
    holdStart = { x: e.clientX, y: e.clientY };
    holdTimer = setTimeout(() => { heldDown = true; gravity(); }, 800);
    frogHoldTimer = setTimeout(() => spawnFrog({ popIn: true }), 5000);
  });
  addEventListener("pointermove", (e) => {
    if (holdStart && Math.hypot(e.clientX - holdStart.x, e.clientY - holdStart.y) > 12) stopHold();
  });
  ["pointerup", "pointercancel"].forEach((type) => addEventListener(type, stopHold));
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
  // Each tap: usually "ribbit" and a jump to another corner. About 1 tap in
  // 5 (the very first tap too, with ?deadfrog) it says "ow!", flips onto its
  // back with X eyes, and drops off the bottom of the screen.
  const FROG_DIES_CHANCE = 1 / 5;
  const FROG_EXPLODES_EVERY = 3; // every 3rd death is an explosion
  const DEATHS_KEY = "leb-frog-deaths";
  const RETURN_KEY = "leb-frog-returns-at"; // when a frog that left comes back
  const RETURN_MIN = 5 * 60 * 1000, RETURN_MAX = 10 * 60 * 1000;
  let returnTimer;

  // Put a frog in a corner of the home screen (unless one is already there).
  // death: "dies" or "explodes" makes the first tap kill it (for ?deadfrog
  // and ?boomfrog). popIn: a little entrance, for a frog that comes back.
  function spawnFrog({ death = "", popIn = false } = {}) {
    if (document.querySelector(".egg-frog")) return;
    // The frog is back, so nothing is waiting to bring it back
    clearTimeout(returnTimer);
    try { localStorage.removeItem(RETURN_KEY); } catch (e) {}

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
    const watcher = new MutationObserver(showFrog);
    watcher.observe(document.getElementById("home-view"),
      { attributes: true, attributeFilter: ["hidden"] });
    showFrog();
    if (popIn && !reduceMotion) {
      frog.animate([
        { transform: "translateY(16px) scale(0.2)", opacity: 0 },
        { transform: "translateY(-10px) scale(1.15, 0.9)", opacity: 1, offset: 0.6 },
        { transform: "none" },
      ], { duration: 500, easing: "ease-out" });
    }

    // The frog leaves (falls or explodes): it comes back in 5 to 10 minutes
    function leave() {
      watcher.disconnect();
      frog.remove();
      frogLeft();
    }

    let busy = false;
    let forceDeath = Boolean(death);
    frog.addEventListener("click", async () => {
      if (busy) return;
      busy = true;
      if (forceDeath || Math.random() < FROG_DIES_CHANCE) await frogDies();
      else await frogJumps();
      forceDeath = false;
      busy = false;
    });

    async function frogJumps() {
      await say(frog, "ribbit", 700);
      // Move to the new corner, then animate from the old spot in an arc
      const from = frog.getBoundingClientRect();
      frog.dataset.corner = pick(frog.dataset.corner);
      const to = frog.getBoundingClientRect();
      const dx = from.left - to.left, dy = from.top - to.top;
      const lift = Math.min(160, Math.abs(dx) / 2 + Math.abs(dy) / 3 + 60);
      if (reduceMotion) return;
      await frog.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(1.1, 0.85)` },
        { transform: `translate(${dx / 2}px, ${dy / 2 - lift}px) scale(0.9, 1.15)` },
        { transform: "translate(0, 0) scale(1.1, 0.85)", offset: 0.9 },
        { transform: "none" },
      ], { duration: 700, easing: "ease-in-out" }).finished;
    }

    async function frogDies() {
      frog.classList.add("dead");
      frog.setAttribute("aria-label", "A frog (deceased)");
      say(frog, "ow!", 1300);
      // Flip onto its back
      await frog.querySelector("svg").animate([
        { transform: "none" },
        { transform: "translateY(-10px) rotate(100deg)", offset: 0.45 },
        { transform: "translateY(2px) rotate(180deg)", offset: 0.85 },
        { transform: "rotate(180deg)" },
      ], { duration: reduceMotion ? 1 : 550, easing: "ease-out", fill: "forwards" }).finished;
      await wait(1500);
      if (death === "explodes" || countDeath() % FROG_EXPLODES_EVERY === 0) {
        await explode();
        return;
      }
      // Drop off the bottom of the screen, picking up speed
      const fall = innerHeight - frog.getBoundingClientRect().top + 60;
      const spin = Math.random() < 0.5 ? -40 : 40;
      await frog.animate([
        { transform: "none" },
        { transform: `translateY(-14px) rotate(${spin / 4}deg)`, offset: 0.12, easing: "cubic-bezier(.55,0,1,.45)" },
        { transform: `translateY(${fall}px) rotate(${spin}deg)` },
      ], { duration: reduceMotion ? 1 : 500 + fall * 0.9, fill: "forwards" }).finished;
      leave();
    }

    // Add one to the saved death count and return the new total. (try/catch:
    // if the browser blocks storage, every death counts as the first.)
    function countDeath() {
      let deaths = 1;
      try {
        deaths = (parseInt(localStorage.getItem(DEATHS_KEY), 10) || 0) + 1;
        localStorage.setItem(DEATHS_KEY, deaths);
      } catch (e) {}
      return deaths;
    }

    // Swell up, tremble, then a cartoon blast that fills the whole screen
    async function explode() {
      const svg = frog.querySelector("svg");
      if (!reduceMotion) {
        await svg.animate([
          { transform: "rotate(180deg)" },
          { transform: "rotate(172deg) scale(1.4)" },
          { transform: "rotate(188deg) scale(1.6)" },
          { transform: "rotate(170deg) scale(1.9)" },
          { transform: "rotate(190deg) scale(2.2)" },
          { transform: "rotate(180deg) scale(2.6)" },
        ], { duration: 800, easing: "ease-in", fill: "forwards" }).finished;
      }
      const box = frog.getBoundingClientRect();
      const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
      leave();

      // The burst grows out of the frog and settles in the middle of the
      // screen, big enough that its solid part (62% of its size) reaches
      // every corner
      const mx = innerWidth / 2, my = innerHeight / 2;
      const far = Math.hypot(mx, my);
      const size = (2 * far) / 0.62;

      const boom = document.createElement("div");
      boom.className = "egg-boom";
      boom.setAttribute("aria-hidden", "true");
      const flash = document.createElement("div");
      flash.className = "egg-flash";
      const burst = document.createElement("div");
      burst.className = "egg-burst";
      Object.assign(burst.style, { width: size + "px", height: size + "px",
        left: mx - size / 2 + "px", top: my - size / 2 + "px" });
      burst.innerHTML = `<svg viewBox="-100 -100 200 200">
        <polygon points="${star(18, 100, 62)}" fill="#C8342B"/>
        <polygon points="${star(14, 82, 50)}" fill="#F08A24" transform="rotate(9)"/>
        <polygon points="${star(12, 62, 40)}" fill="#FFD23F" transform="rotate(4)"/>
        <circle r="30" fill="#FFF3B0"/>
      </svg>`;
      const word = el("p", "BOOM!", "egg-boom-word");
      boom.append(burst, flash, word);
      // Bits of frog flying out
      const bits = Array.from({ length: 14 }, () => {
        const bit = document.createElement("span");
        bit.className = "egg-bit";
        Object.assign(bit.style, { left: cx - 8 + "px", top: cy - 6 + "px" });
        boom.append(bit);
        return bit;
      });
      document.body.append(boom);

      const runs = [
        flash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: "forwards" }),
        burst.animate([
          { transform: `translate(${cx - mx}px, ${cy - my}px) scale(0.03) rotate(-20deg)` },
          { transform: "scale(1.05) rotate(4deg)", offset: 0.7 },
          { transform: "scale(1) rotate(0deg)" },
        ], { duration: reduceMotion ? 1 : 450, easing: "ease-out", fill: "forwards" }),
        word.animate([
          { transform: "translate(-50%, -50%) scale(0.2) rotate(-12deg)", opacity: 0 },
          { transform: "translate(-50%, -50%) scale(1.25) rotate(-6deg)", opacity: 1, offset: 0.6 },
          { transform: "translate(-50%, -50%) scale(1) rotate(-6deg)", opacity: 1 },
        ], { duration: reduceMotion ? 1 : 500, delay: 120, easing: "ease-out", fill: "forwards" }),
        ...bits.map((bit, i) => {
          const angle = (i / bits.length) * Math.PI * 2 + Math.random() * 0.5;
          const dist = far * (0.35 + Math.random() * 0.45);
          return bit.animate([
            { transform: "none" },
            { transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) rotate(${360 + Math.random() * 360}deg)` },
          ], { duration: reduceMotion ? 1 : 1100, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" });
        }),
      ];
      // Shake the page behind it
      if (!reduceMotion) {
        ["brand", "home-view"].forEach((id) => document.getElementById(id).animate(
          [0, 1, 2, 3, 4, 5, 6, 7].map((n) => ({
            transform: n === 7 ? "none" : `translate(${(Math.random() - 0.5) * 16}px, ${(Math.random() - 0.5) * 16}px)` })),
          { duration: 450 }));
      }
      await Promise.all(runs.map((a) => a.finished));
      await wait(700);
      await boom.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 800, fill: "forwards" }).finished;
      boom.remove();
    }

    // Points for a spiky star: `spikes` points between radius `outer` and `inner`
    function star(spikes, outer, inner) {
      return Array.from({ length: spikes * 2 }, (_, i) => {
        const r = i % 2 ? inner : outer * (0.85 + Math.random() * 0.15);
        const a = (i / (spikes * 2)) * Math.PI * 2;
        return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
      }).join(" ");
    }
  }

  // Save when the frog comes back (5 to 10 minutes from now). Saved, so it
  // still comes back on time if the app is closed and opened again.
  function frogLeft() {
    const at = Date.now() + RETURN_MIN + Math.random() * (RETURN_MAX - RETURN_MIN);
    try { localStorage.setItem(RETURN_KEY, at); } catch (e) {}
    scheduleReturn(at);
  }

  function scheduleReturn(at) {
    clearTimeout(returnTimer);
    returnTimer = setTimeout(() => spawnFrog({ popIn: true }), Math.max(0, at - Date.now()));
  }

  // When the app opens
  let returnsAt = null;
  try { returnsAt = parseInt(localStorage.getItem(RETURN_KEY), 10) || null; } catch (e) {}
  if (params.has("boomfrog")) spawnFrog({ death: "explodes" });
  else if (params.has("deadfrog")) spawnFrog({ death: "dies" });
  else if (params.has("frog")) spawnFrog();
  else if (returnsAt) scheduleReturn(returnsAt); // right away if it's already time
  else if (Math.random() < FROG_CHANCE) spawnFrog();
})();
