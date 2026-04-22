// HGW 2026 — core frontend module
//
// Bevat:
//  - initPage(): topbar + sync-badge op elke pagina
//  - renderCountdown(): live tickende countdown naar de reveal
//  - mountHome(): stateful homepage (pre-reveal countdown, grand reveal,
//    onboarding-carrousel of de app-tiles)
//
// Geen dependencies, puur vanilla ES modules. State (of iemand de
// onboarding heeft gezien) wordt in localStorage opgeslagen.

import { WEEKEND, AUTH } from "../config.js";
import * as sfx from "./sfx.js";
import { FLASHBACK_IMGS } from "./flashback-imgs.js";

sfx.restorePref();

// iOS-PWA 100vh-fix: Safari + Firefox in standalone-mode rekenen
// met 100dvh/svh soms een andere hoogte dan de werkelijk zichtbare
// ruimte. We meten window.innerHeight in JS en zetten dat op een
// CSS-custom-property zodat de layout daarop kan bouwen.
function updateAppViewport() {
  document.documentElement.style.setProperty(
    "--app-vh",
    window.innerHeight + "px",
  );
}
updateAppViewport();
window.addEventListener("resize", updateAppViewport, { passive: true });
window.addEventListener("orientationchange", updateAppViewport);

// Browser-policy: AudioContext mag pas spelen na eerste user-gesture.
// We luisteren one-shot op elke gangbare interactie en resumen 'm dan,
// zodat de GPS-beeps op de eerste slide ook hoorbaar zijn.
{
  const events = ["pointerdown", "keydown", "touchstart"];
  const unlock = () => {
    sfx.unlock();
    events.forEach((e) =>
      document.removeEventListener(e, unlock, { capture: true }),
    );
  };
  events.forEach((e) =>
    document.addEventListener(e, unlock, { capture: true, once: false }),
  );
}

const STORAGE_KEY = "hgw:onboarded";
const AUTH_KEY = "hgw:auth-v2";

const APP_LINKS = [
  { href: "programma.html", label: "Programma" },
  { href: "horoscoop.html", label: "Horoscoop" },
  { href: "quiz.html", label: "Quiz" },
  { href: "quotes.html", label: "Starters" },
  { href: "playlist.html", label: "Playlist" },
  { href: "fotos.html", label: "Plakboek" },
];

// ---------------------------------------------------------------------------
// Topbar + sync badge (draait op elke pagina)
// ---------------------------------------------------------------------------

// Pagina's die altijd bereikbaar zijn, ook vóór de onthulling.
// Het Plakboek bevat alleen foto's uit oude edities — geen spoilers.
const PUBLIC_PAGES = new Set(["index.html", "fotos.html", ""]);

export function initPage() {
  // Groeps-wachtwoord-gate (soft privacy). Staat pre-render zodat
  // gebruikers die niet ingelogd zijn nooit iets van de echte
  // pagina zien.
  if (authRequired() && !isAuthed()) {
    renderAuthGate();
    return;
  }
  // Vóór de reveal: alle sub-pagina's terugsturen naar de homepage,
  // zodat bezoekers niet per ongeluk langs de gate heen kunnen
  // (uitzonderingen staan in PUBLIC_PAGES).
  const current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (!isRevealed() && !PUBLIC_PAGES.has(current)) {
    location.replace("index.html");
    return;
  }
  renderTopbar();
  renderSyncBadges();
}

function authRequired() {
  return !!(AUTH?.sharedCode && AUTH.sharedCode.length > 0);
}

function isAuthed() {
  try {
    return localStorage.getItem(AUTH_KEY) === AUTH.sharedCode;
  } catch {
    return false;
  }
}

function setAuthed() {
  try {
    localStorage.setItem(AUTH_KEY, AUTH.sharedCode);
  } catch {
    /* ignore */
  }
}

// Volledige-pagina wachtwoord-scherm. Vervangt de body-inhoud, dus
// pas wanneer je binnen bent, rendert de echte pagina zich.
function renderAuthGate() {
  // Auth-gate gebruikt dezelfde visuele taal als de teaser (marquee,
  // radar-pulse, classified-seal) zodat bezoekers al direct in de
  // sfeer zitten ipv een kaal lockscherm.
  document.body.innerHTML = `
    <header class="topbar">
      <div class="topbar-left">
        <div class="brand">HGW '26</div>
      </div>
    </header>
    <main class="container">
      <section class="hero teaser show-auth">
        <div class="teaser-bg" aria-hidden="true">
          <div class="radar-pulse"></div>
          <div class="radar-pulse"></div>
          <div class="radar-pulse"></div>
        </div>

        <div class="teaser-view teaser-view-auth">
          <div class="teaser-marquee" aria-hidden="true">
            <span>★ TOP SECRET ★ TOP SECRET ★ TOP SECRET ★ TOP SECRET ★ TOP SECRET ★ TOP SECRET ★&nbsp;</span><span>★ TOP SECRET ★ TOP SECRET ★ TOP SECRET ★ TOP SECRET ★ TOP SECRET ★ TOP SECRET ★&nbsp;</span>
          </div>

          <div class="teaser-stack teaser-auth-stack">
            <div class="stamp">Toegang Vereist</div>
            <h1 class="teaser-title">HGW 2026</h1>
            <p class="subtitle">Alleen voor de <strong>uitverkorenen</strong></p>

            <form id="auth-form" class="auth-form" autocomplete="off">
              <div class="auth-input-wrap">
                <input
                  id="auth-input"
                  type="password"
                  name="password"
                  placeholder="wachtwoord"
                  autocomplete="off"
                  autocapitalize="none"
                  autocorrect="off"
                  spellcheck="false"
                  required
                />
                <button
                  type="button"
                  id="auth-toggle"
                  class="auth-toggle"
                  aria-label="Wachtwoord tonen"
                  title="Tonen / verbergen"
                >👁</button>
              </div>
              <button type="submit" class="btn btn-accent">Binnen &rarr;</button>
            </form>
            <p class="auth-hint" id="auth-msg"></p>
          </div>

          <div class="seal">
            <span class="seal-lock">🔒</span>
            <span>Locatie onder embargo</span>
            <span class="seal-cls">CLASSIFIED</span>
          </div>
        </div>
      </section>
    </main>
  `;
  document.body.classList.add("onboarding-active");
  const form = document.getElementById("auth-form");
  const input = document.getElementById("auth-input");
  const toggle = document.getElementById("auth-toggle");
  const msg = document.getElementById("auth-msg");
  setTimeout(() => input?.focus(), 80);
  toggle?.addEventListener("click", () => {
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    toggle.classList.toggle("on", !showing);
    toggle.textContent = showing ? "👁" : "🙈";
    toggle.setAttribute(
      "aria-label",
      showing ? "Wachtwoord tonen" : "Wachtwoord verbergen",
    );
    input.focus();
  });
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    if ((input.value || "").trim().toLowerCase() === AUTH.sharedCode.toLowerCase()) {
      setAuthed();
      location.reload();
    } else {
      msg.textContent = "Helaas, niet correct.";
      form.classList.remove("shake");
      void form.offsetWidth;
      form.classList.add("shake");
      input.select();
    }
  });
}

function isRevealed() {
  // ?preview (of ?preview=reveal) laat jou de reveal-flow zien zonder
  // dat je de echte countdown-datum hoeft te verzetten.
  if (typeof location !== "undefined" && location.search.includes("preview")) {
    return true;
  }
  return new Date() >= new Date(WEEKEND.revealDate);
}

function isOnboarded() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function setOnboarded(v) {
  try {
    if (v) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function renderTopbar() {
  const bar = document.querySelector("header.topbar");
  if (!bar) return;

  const revealed = isRevealed();
  const current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  // Behoud de preview-query bij doorklikken zodat sub-pagina's ook
  // pre-reveal (in test-mode) bereikbaar blijven.
  const previewQS = location.search.includes("preview") ? "?preview" : "";

  const nav = revealed
    ? APP_LINKS.map(
        (l) =>
          `<a href="${l.href}${previewQS}"${
            l.href.toLowerCase() === current ? ' class="active"' : ""
          }>${l.label}</a>`,
      ).join("")
    : "";

  const isSubPage = current !== "index.html" && current !== "";
  const backHtml = isSubPage
    ? `<a class="topbar-back" href="index.html${previewQS}" title="Terug naar het menu" aria-label="Terug naar het menu">← Terug</a>`
    : "";

  bar.innerHTML = `
    <div class="topbar-left">
      ${backHtml}
      <div class="brand"><a href="index.html${previewQS}" title="Terug naar het menu">HGW '26</a></div>
    </div>
    <nav>${nav}${
      revealed
        ? `<a href="index.html${previewQS}#reveal" class="replay" title="Bekijk de onthulling opnieuw">Replay onthulling</a>`
        : ""
    }</nav>
  `;
}

// Forceert een verse pagina-load: wist Cache-API caches (mocht er ooit
// een service worker bij komen) en hangt een timestamp aan de URL zodat
// de browser geen oude HTML serveert.
function hardRefresh() {
  const bust = () => {
    const url = new URL(location.href);
    url.searchParams.set("_t", Date.now().toString());
    // Behoud niet de hash zodat reveal-replay niet automatisch opent
    location.replace(url.pathname + url.search);
  };
  if ("caches" in window) {
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .finally(bust);
  } else {
    bust();
  }
}

function renderSyncBadges() {
  document.querySelectorAll("[data-sync-badge]").forEach((el) => {
    el.classList.add("local");
    el.textContent = "local";
  });
}

// ---------------------------------------------------------------------------
// Countdown
// ---------------------------------------------------------------------------

export function renderCountdown(el, targetIso = WEEKEND.revealDate) {
  if (!el) return;
  const target = new Date(targetIso).getTime();
  const labels = [
    ["dagen", "DAGEN"],
    ["uur", "UUR"],
    ["min", "MIN"],
    ["sec", "SEC"],
  ];

  // Build de structuur één keer; daarna per tick alleen waardes
  // updaten zodat de flip-animatie zonder onderbreking kan lopen.
  el.innerHTML = labels
    .map(
      ([key, label]) => `
        <div class="countdown-unit" data-unit="${key}">
          <div class="flip"><span class="flip-current">--</span></div>
          <span class="label">${label}</span>
        </div>
      `,
    )
    .join("");

  const numEls = {
    dagen: el.querySelector('[data-unit="dagen"] .flip-current'),
    uur: el.querySelector('[data-unit="uur"] .flip-current'),
    min: el.querySelector('[data-unit="min"] .flip-current'),
    sec: el.querySelector('[data-unit="sec"] .flip-current'),
  };

  function setVal(unit, num) {
    const target = numEls[unit];
    if (!target) return;
    const pad = String(num).padStart(2, "0");
    if (target.textContent === pad) return;
    target.classList.remove("flipping");
    void target.offsetWidth;
    target.classList.add("flipping");
    // Wissel halverwege de flip zodat 't visueel "doorvalt"
    setTimeout(() => {
      target.textContent = pad;
    }, 200);
  }

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      el.innerHTML = `<div class="countdown-done">🎉 REVEAL</div>`;
      return true;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff / 3600000) % 24);
    const m = Math.floor((diff / 60000) % 60);
    const s = Math.floor((diff / 1000) % 60);
    setVal("dagen", d);
    setVal("uur", h);
    setVal("min", m);
    setVal("sec", s);
    // Final-minute drama
    if (diff <= 60_000) {
      document.body.classList.add("teaser-final-minute");
    }
    return false;
  }

  tick();
  const id = setInterval(() => {
    if (tick()) {
      clearInterval(id);
      // Reload zodat de reveal-flow automatisch in beeld komt
      if (typeof window !== "undefined") setTimeout(() => location.reload(), 1500);
    }
  }, 1000);
}

// ---------------------------------------------------------------------------
// Homepage: beslist welke view te tonen
// ---------------------------------------------------------------------------

// Binnen één sessie: of de user al op START heeft gedrukt (om audio
// te unlocken en de onboarding te starten).
let sessionStarted = false;

export function mountHome(root) {
  if (!root) return;
  const hash = (location.hash || "").toLowerCase();
  const forceReveal = hash === "#reveal";
  const isPreview = location.search.includes("preview");

  if (!isRevealed()) {
    renderTeaser(root);
    return;
  }
  if (forceReveal || !isOnboarded() || isPreview) {
    if (!sessionStarted) {
      renderHackTerminal(root, () => {
        sessionStarted = true;
        renderOnboarding(root);
      });
      return;
    }
    renderOnboarding(root);
    return;
  }
  renderAppHome(root);
}

function renderStartScreen(root, onStart) {
  document.body.classList.add("onboarding-active");
  root.innerHTML = `
    <section class="start-screen">
      <div class="start-scanlines" aria-hidden="true"></div>
      <div class="start-stamp">★ EDITIE MMXXVI ★</div>
      <h1 class="start-title">HGW '26</h1>
      <p class="start-subtitle">Zin in een <em>grote onthulling</em>?</p>
      <button class="start-btn" id="start-btn" type="button">
        <span class="start-btn-glow" aria-hidden="true"></span>
        <span class="start-btn-label">▶ START</span>
      </button>
      <p class="start-hint">🔊 zet je geluid aan</p>
      <div class="start-coins" aria-hidden="true">
        <span>◀ INSERT COIN ▶</span>
      </div>
    </section>
  `;
  const btn = root.querySelector("#start-btn");
  btn?.addEventListener("click", () => {
    sfx.unlock();
    sfx.ping();
    btn.classList.add("pressed");
    setTimeout(() => onStart(), 320);
  }, { once: true });
}

function renderHackTerminal(root, onDone) {
  document.body.classList.add("onboarding-active");
  root.innerHTML = `
    <section class="start-screen hack-terminal">
      <div class="start-scanlines" aria-hidden="true"></div>
      <div class="terminal-window">
        <div class="terminal-bar" aria-hidden="true">
          <span class="terminal-traffic"><span></span><span></span><span></span></span>
          <span class="terminal-bar-title">TERMINAL v2.6 // ONBEVOEGDE TOEGANG</span>
        </div>
        <div class="terminal-body" id="terminal-body"></div>
        <div class="terminal-input-line">
          <span class="terminal-prompt" aria-hidden="true">&gt;&nbsp;</span>
          <button class="terminal-start-btn" id="terminal-start-btn" type="button">klik hier om te starten</button>
          <span class="terminal-cursor" id="terminal-cursor" aria-hidden="true">█</span>
        </div>
      </div>
    </section>
  `;

  const bodyEl = document.getElementById("terminal-body");
  const startBtn = document.getElementById("terminal-start-btn");
  const cursorEl = document.getElementById("terminal-cursor");

  const LINES = [
    { text: "> VERBINDING MET hgw2026.info...",              ms: 25, pause: 200 },
    { text: "  STATUS: VERBONDEN                   [OK]",    ms: 18, pause: 350, cls: "ok" },
    { text: "> BEVEILIGINGSLAAG GEDETECTEERD",               ms: 22, pause: 250 },
    { text: "> AUTH-GATE OMZEILEN...",                       ms: 30, pause: 100 },
    { text: "  [████████████████████] 100%         [GESLAAGD]", ms: 11, pause: 450, cls: "ok" },
    { text: "> GEHEIME ONTHULLINGSDATA GELADEN",             ms: 22, pause: 300 },
    { text: "> kopieren bankgegevens Kool",                  ms: 22, pause: 250, cls: "ok" },
    { text: "> lekken browser history Boot",                 ms: 22, pause: 250, cls: "ok" },
    { text: "> BisBis videos delen op LinkedIn Trup",          ms: 18, pause: 400, cls: "ok" },
    { text: "> WELKOM, ONBEVOEGDE GEBRUIKER.",               ms: 28, pause: 550 },
    { text: "> KLAAR OM TE BEGINNEN.",                       ms: 30, pause: 200, cls: "bright" },
  ];

  startBtn.style.visibility = "hidden";

  let totalDelay = 500;
  LINES.forEach(({ text, ms, pause, cls }) => {
    const startAt = totalDelay;
    totalDelay += text.length * ms + pause;
    setTimeout(() => {
      const line = document.createElement("div");
      line.className = "terminal-line" + (cls ? ` tl-${cls}` : "");
      bodyEl.appendChild(line);
      let i = 0;
      const id = setInterval(() => {
        line.textContent = text.slice(0, ++i);
        bodyEl.scrollTop = bodyEl.scrollHeight;
        if (i >= text.length) clearInterval(id);
      }, ms);
    }, startAt);
  });

  setTimeout(() => {
    cursorEl.style.display = "none";
    startBtn.style.visibility = "visible";
    startBtn.classList.add("terminal-start-ready");
  }, totalDelay + 200);

  startBtn.addEventListener("click", () => {
    sfx.unlock();
    sfx.ping();
    startBtn.textContent = "LADEN...";
    startBtn.disabled = true;
    setTimeout(() => onDone(), 300);
  }, { once: true });
}

// ---------------------------------------------------------------------------
// View 1: pre-reveal teaser
// ---------------------------------------------------------------------------

function renderTeaser(root) {
  document.body.classList.add("onboarding-active");
  document.body.classList.remove("teaser-final-minute");

  let seen = false;
  try {
    seen = sessionStorage.getItem("hgw:teaser-intro-v3") === "1";
  } catch {
    /* ignore */
  }

  // Twee simpele slides: eerst de transmissie, dan de countdown. Bij
  // hergebruik binnen dezelfde sessie (sessionStorage-flag) springen we
  // direct naar slide 2.
  root.innerHTML = `
    <section class="hero teaser ${seen ? "show-countdown" : "show-intro"}">
      <div class="teaser-bg" aria-hidden="true">
        <div class="radar-pulse"></div>
        <div class="radar-pulse"></div>
        <div class="radar-pulse"></div>
      </div>

      <!-- Slide 1: binnenkomende transmissie -->
      <div class="teaser-view teaser-view-intro" id="teaser-view-intro">
        <div class="teaser-typewriter" id="teaser-typewriter" aria-hidden="true">
          <div class="tw-text" id="tw-text"></div>
        </div>
      </div>

      <!-- Slide 2: countdown + details -->
      <div class="teaser-view teaser-view-countdown" id="teaser-view-countdown">
        <div class="teaser-marquee" aria-hidden="true">
          <span>★ TOP SECRET ★ TOP SECRET ★ TOP SECRET ★ TOP SECRET ★ TOP SECRET ★ TOP SECRET ★&nbsp;</span><span>★ TOP SECRET ★ TOP SECRET ★ TOP SECRET ★ TOP SECRET ★ TOP SECRET ★ TOP SECRET ★&nbsp;</span>
        </div>

        <div class="teaser-stack" id="teaser-stack">
          <div class="stamp">Editie MMXXVI</div>
          <h1 class="teaser-title">HGW 2026</h1>
          <p class="subtitle">
            Locatie onthuld op
            <strong>vrijdag 24 april · 17:00 CET</strong>
            <span class="sync-badge" data-sync-badge></span>
          </p>

          <div class="countdown-wrap">
            <div class="countdown" id="countdown"></div>
          </div>

          <div class="teaser-hints">
            <div class="hint">🤫 Houd vrij:<br><strong>25 t/m 27 september 2026</strong></div>
          </div>
        </div>

        <div class="seal">
          <span class="seal-lock">🔒</span>
          <span>Locatie onder embargo</span>
          <span class="seal-cls">CLASSIFIED</span>
        </div>
      </div>
    </section>
  `;
  renderCountdown(root.querySelector("#countdown"));
  renderSyncBadges();
  if (!seen) initTeaserTypewriter();
}

// Multi-regel typewriter-intro: regels tikken sequentieel in, met
// een blinkende cursor onder de laatste regel. Daarna fade-in van
// de hoofdcontent. Skip via sessionStorage zodat 't niet herhaalt
// bij navigatie binnen dezelfde sessie.
const TEASER_INTRO_LINES = [
  "> INCOMING TRANSMISSION ▓▓▓",
  "> MESSAGE RECEIVED",
  "> FROM: LEGENDARY WEEKEND COMMISSIE",
  "> AGENTS: BOOT · KOOL · TRUP",
  "> ▓▓▓ ACCESS GRANTED",
];

function initTeaserTypewriter() {
  const section = document.querySelector(".hero.teaser");
  const out = document.getElementById("tw-text");
  if (!section || !out) return;
  out.innerHTML = "";

  let li = 0;
  let ci = 0;

  function typeStep() {
    if (li >= TEASER_INTRO_LINES.length) {
      // Laatste regel getypt — 2.4s blijven staan, dan cross-fade
      // naar de countdown-slide.
      setTimeout(() => {
        section.classList.remove("show-intro");
        section.classList.add("show-countdown");
        try { sessionStorage.setItem("hgw:teaser-intro-v3", "1"); } catch { /* ignore */ }
      }, 2400);
      return;
    }
    if (ci === 0) {
      // Verwijder de cursor van de vorige regel, plaats nieuwe regel
      out.querySelectorAll(".tw-line.is-typing").forEach((n) =>
        n.classList.remove("is-typing"),
      );
      const line = document.createElement("div");
      line.className = "tw-line is-typing";
      out.appendChild(line);
    }
    ci++;
    out.lastElementChild.textContent =
      TEASER_INTRO_LINES[li].slice(0, ci);
    if (ci >= TEASER_INTRO_LINES[li].length) {
      li++;
      ci = 0;
      // Rustige pauze tussen regels — dramatic beat
      setTimeout(typeStep, li === 1 ? 520 : 400);
    } else {
      // Lichte timing-variatie per character zodat het échte voelt als
      // typen ipv robotachtig — iets langzamer (35-70ms per char)
      setTimeout(typeStep, 35 + Math.random() * 35);
    }
  }
  typeStep();
}


// ---------------------------------------------------------------------------
// View 2: grand reveal + onboarding-carrousel
// ---------------------------------------------------------------------------

// Bouwt een <img> met fallback-ketting: eerst een lokale foto uit
// /img/reveal/, dan de HD YouTube-thumbnail, dan de kleinere hqdefault,
// en als niks werkt wordt de img verwijderd. De fallbacks staan in een
// data-attribute en worden door onerror stap voor stap afgelopen.
function slideImg({ local, yt, alt = "" }) {
  const chain = [];
  if (yt) {
    chain.push(`https://i.ytimg.com/vi/${yt}/maxresdefault.jpg`);
    chain.push(`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`);
  }
  const first = local || chain.shift();
  const fallbacks = JSON.stringify(chain).replace(/"/g, "&quot;");
  const onerror =
    `const f=JSON.parse(this.dataset.fb||'[]');` +
    `if(f.length){this.src=f.shift();this.dataset.fb=JSON.stringify(f);}` +
    `else{this.remove();}`;
  return `<img class="slide-img" src="${first}" data-fb="${fallbacks}" loading="lazy" alt="${alt}" onerror="${onerror}" />`;
}

function daysUntil(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

// Google-Maps-link voor in de QR-code van de boarding pass
const MAPS_URL = "https://www.google.com/maps/place/De+Bonte+Wever/@52.9966,6.5634,17z";

const SLIDES = [
  {
    key: "flashback",
    theme: "vintage",
    autoAdvanceMs: 9000,
    render: () => `
      <div class="flashback">
        <div class="fb-grain" aria-hidden="true"></div>
        <div class="fb-flash">
          ${FLASHBACK_IMGS.map(
            (f, i) =>
              `<figure class="fb-frame"${i === 0 ? ' data-active="1"' : ""}>
                <img src="img/flashback/${f}" alt="" loading="${i < 4 ? "eager" : "lazy"}" />
              </figure>`,
          ).join("")}
        </div>
        <div class="fb-final">Tijd voor een nieuw avontuur…</div>
      </div>
    `,
  },
  {
    key: "map",
    theme: "dark",
    autoAdvanceMs: 11500,
    render: () => `
      <h2 class="reveal-heading">De Grote Onthulling</h2>
      <div class="gps-terminal">
        <div class="gps-head">[ DESTINATION · GPS v2.6 ]</div>
        <ol class="gps-log">
          <li style="animation-delay: 0.6s">&gt; establishing satellite link…</li>
          <li style="animation-delay: 2.4s">&gt; coordinates: 52.99°N, 6.56°E</li>
          <li style="animation-delay: 4.2s">&gt; country: NETHERLANDS ✓</li>
          <li style="animation-delay: 5.8s">&gt; province: DRENTHE ✓</li>
          <li style="animation-delay: 7.4s">&gt; city: ASSEN ✓</li>
          <li class="pulse" style="animation-delay: 9.2s">&gt; destination locked ▸</li>
        </ol>
        <div class="gps-bar" aria-hidden="true"><span></span></div>
      </div>
    `,
  },
  {
    key: "reveal",
    className: "slide-reveal",
    theme: "reveal",
    render: () => `
      <div class="stamp big">🎉 Grote Onthulling 🎉</div>
      <p class="typewriter" data-typewriter="De locatie is…"></p>
      <div class="scratch-stage">
        <h1 class="mega neon stacked" data-neon>De<br>Bonte<br>Wever</h1>
        <canvas class="scratch" aria-label="Kras het weg" data-scratch></canvas>
      </div>
      <div class="scratch-hint" data-scratch-hint>Krassen maar!</div>
    `,
  },
  {
    key: "route",
    theme: "paper",
    render: () => `
      <div class="route-slide">
        <div class="route-stage">
          <img class="route-nl-bg" src="img/nl-outline.svg" alt="" aria-hidden="true" />
          <svg class="route-map" viewBox="0 0 1024 1024" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
            <path class="route-line" pathLength="1"
                  d="M 470 600 Q 580 500 720 240" />
            <g class="route-start">
              <circle cx="470" cy="600" r="22" />
              <text x="540" y="655" text-anchor="middle">bewoonde</text>
              <text x="540" y="695" text-anchor="middle">wereld</text>
            </g>
            <g class="route-end">
              <circle cx="720" cy="240" r="32" />
              <text x="660" y="180">ASSEN</text>
            </g>
          </svg>
          <iframe class="route-gmap"
                  src="https://maps.google.com/maps?saddr=Utrecht&daddr=De+Bonte+Wever%2C+Stadsbroek+17%2C+Assen&output=embed&hl=nl&z=7"
                  title="Route naar De Bonte Wever"
                  loading="eager"
                  referrerpolicy="no-referrer-when-downgrade"
                  allowfullscreen></iframe>
        </div>
        <div class="route-info">
          <div class="route-eta">≈ 2 u rijden · via A28</div>
        </div>
      </div>
    `,
  },
  {
    key: "intro",
    emoji: "🏨",
    title: "Onze stek",
    img: { local: "img/reveal/hero.jpg", yt: "-UFPIvoW-Go" },
    imgAlt: "De Bonte Wever — hotel buitenkant",
    theme: "paper",
    body: `
      <p>4-sterren hotel aan de rand van Assen, grenzend aan het
      eeuwenoude <strong>Asserbos</strong> (114 ha).</p>
      <ul class="facts">
        <li>📍 Stadsbroek 17, Assen</li>
        <li>🚗 Direct aan de A28</li>
        <li>🌳 Asserbos om de hoek</li>
        <li>📅 25 t/m 27 september 2026</li>
      </ul>
    `,
  },
  {
    key: "pool",
    emoji: "🌴💦",
    title: "Subtropisch Zwemparadijs",
    img: { local: "img/reveal/pool.jpg", yt: "3SeLwHrwTg0" },
    imgAlt: "Subtropisch zwembad van De Bonte Wever",
    theme: "aqua",
    body: `
      <p>Zit bij de prijs in — zó je zwembroek aan en naar beneden.</p>
      <ul class="facts">
        <li>🌊 Golfslagbad met échte golven</li>
        <li>🎢 Glijbanen + wildwaterkreek</li>
        <li>☀️ Buitenzwembad + zonneweide</li>
        <li>🏊 25m-wedstrijdbad voor baantjes</li>
      </ul>
    `,
  },
  {
    key: "bowling",
    emoji: "🎳🍻",
    title: "Bowling + Caféstraat",
    img: { local: "img/reveal/bowling.jpg", yt: "XUJw4yTGc0Q" },
    imgAlt: "Caféstraat en bowling in De Bonte Wever",
    theme: "amber",
    body: `
      <p>Eigen caféstraat met bars, bowling en curling naast elkaar.</p>
      <ul class="facts">
        <li>🎳 6 bowlingbanen met lichteffecten</li>
        <li>🥌 4 Fun Curling-banen (2–4 spelers)</li>
        <li>🎤 Muziek in de Caféstraat</li>
        <li>🍺 Drank aan de bar inbegrepen</li>
      </ul>
    `,
  },
  {
    key: "food",
    emoji: "🍽️🥂",
    title: "Flinck + Dapper",
    img: { local: "img/reveal/food.jpg", yt: "NOiUUdxkWfo" },
    imgAlt: "Eten en drinken bij De Bonte Wever",
    theme: "wine",
    body: `
      <p>Twee restaurants, alles inbegrepen — behalve de kater.</p>
      <ul class="facts">
        <li>🍳 Ontbijtbuffet elke ochtend</li>
        <li>🍝 Onbeperkt buffet bij Flinck</li>
        <li>🍰 À la carte bij Bistro Dapper</li>
        <li>🍷 Bier, wijn &amp; cocktails inbegrepen</li>
      </ul>
    `,
  },
  {
    key: "kids",
    emoji: "🧒🦁",
    title: "Kidsjungle + Animatieteam",
    img: { local: "img/reveal/kids.jpg", yt: "hXuwIsQPEJc" },
    imgAlt: "Activiteiten voor kinderen bij De Bonte Wever",
    theme: "sunny",
    body: `
      <p>Overdekt speelparadijs plus een animatieteam dat ze de hele
      dag aan de gang houdt.</p>
      <ul class="facts">
        <li>🧗 Klimpark met glijbanen</li>
        <li>🕺 Kinderdisco</li>
        <li>🗺️ Speurtochten &amp; knutselclub</li>
        <li>🎪 Elke dag programma</li>
      </ul>
    `,
  },
  {
    key: "wellness",
    emoji: "🧖‍♀️🧘",
    title: "Sauna & wellness",
    img: { local: "img/reveal/wellness.jpg", yt: "Jtknay5-qoI" },
    imgAlt: "Sauna- en saunaparadijs De Bonte Wever",
    theme: "moss",
    body: `
      <p>Saunaparadijs inclusief; beauty-salon los te boeken.</p>
      <ul class="facts">
        <li>🔥 Finse sauna, Kelosauna &amp; stoombad</li>
        <li>💆 Massages &amp; beauty (apart)</li>
        <li>💪 Fitnessruimte + groepslessen</li>
        <li>⛳ Midgetgolf, darts, biljart</li>
      </ul>
    `,
  },
  {
    key: "rooms",
    emoji: "🛏️🏨",
    title: "262 kamers onder één dak",
    img: { local: "img/reveal/rooms.jpg", yt: "Rsm_fg_12ok" },
    imgAlt: "Welkom in De Bonte Wever",
    theme: "paper",
    body: `
      <p>Iedereen slaapt intern — geen getaxi, geen verdwaalde types
      om 3 uur 's nachts.</p>
      <ul class="facts">
        <li>⭐ 4-sterren hotel</li>
        <li>👨‍👩‍👧 2-pers, 3-pers, familie &amp; XL</li>
        <li>🛗 Alles intern bereikbaar</li>
        <li>🚪 Kamerindeling volgt in de app</li>
      </ul>
    `,
  },
  {
    key: "video",
    emoji: "🎬",
    title: "Alvast een voorproefje",
    theme: "paper",
    render: () => `
      <div class="slide-emoji">🎬</div>
      <h1>Alvast een voorproefje</h1>
      <div class="video-embed">
        <iframe
          loading="lazy"
          src="https://www.youtube-nocookie.com/embed/Rsm_fg_12ok"
          title="Welkom in De Bonte Wever"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>
      </div>
      <p class="video-caption">
        <span>Sfeerimpressie van De Bonte Wever.</span>
        <span class="video-caption-days">Nog <strong>${daysUntil(WEEKEND.startDate)} dagen</strong>.</span>
      </p>
    `,
  },
  {
    key: "boarding",
    className: "slide-boarding",
    theme: "ticket",
    render: () => `
      <h2 class="bp-invite">
        <span>Y</span><span>o</span><span>u</span>
        <span>&nbsp;</span>
        <span>a</span><span>r</span><span>e</span>
        <span>&nbsp;</span>
        <span>i</span><span>n</span><span>v</span><span>i</span><span>t</span><span>e</span><span>d</span><span>!</span>
      </h2>
      <div class="boarding-pass">
        <div class="bp-top">
          <div class="bp-brand">HGW ★ 2026</div>
          <div class="bp-class">ALL-IN</div>
        </div>
        <div class="bp-row">
          <div>
            <div class="bp-label">Passagier</div>
            <div class="bp-value">De groep</div>
          </div>
          <div>
            <div class="bp-label">Ticket</div>
            <div class="bp-value">#MMXXVI</div>
          </div>
        </div>
        <div class="bp-journey">
          <div class="bp-stop">
            <div class="bp-code">BWN</div>
            <div class="bp-place">Bewoonde wereld<br/>25 sep · 17:00</div>
          </div>
          <div class="bp-arrow" aria-hidden="true">───✈───</div>
          <div class="bp-stop">
            <div class="bp-code">ASN</div>
            <div class="bp-place">De Bonte Wever<br/>Assen</div>
          </div>
        </div>
        <div class="bp-perforation" aria-hidden="true"></div>
        <div class="bp-stub">
          <div class="bp-countdown">
            <span class="bp-days">${daysUntil(WEEKEND.startDate)}</span>
            <span class="bp-days-label">dagen te gaan</span>
          </div>
          <img class="bp-qr" alt="QR naar locatie"
               src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=1&data=${encodeURIComponent(MAPS_URL)}"
               onerror="this.style.display='none'"/>
        </div>
        <div class="bp-footer"><span class="bp-line">Toon deze voucher bij de receptie van</span> <span class="bp-line">De Bonte Wever 🍻</span></div>
      </div>
    `,
  },
];

function renderOnboarding(root) {
  document.body.classList.add("onboarding-active");

  if (!document.getElementById("rickroll-player")) {
    const audio = document.createElement("audio");
    audio.id = "rickroll-player";
    audio.src = "img/never_give_up.MP3";
    audio.loop = true;
    audio.autoplay = true;
    document.body.appendChild(audio);
    audio.play().catch(() => {});
  }
  root.innerHTML = `
    <section class="onboarding" id="onboarding" data-theme="paper">
      <div class="progress-bar" aria-hidden="true"><span id="progress"></span></div>
      <div class="slides" id="slides"></div>

      <nav class="onboarding-nav">
        <button class="btn btn-ghost" id="prev">‹ Terug</button>
        <div class="dots" id="dots"></div>
        <button class="btn btn-accent" id="next">Verder ›</button>
      </nav>
    </section>
  `;

  const onboardingEl = root.querySelector("#onboarding");
  const slidesEl = root.querySelector("#slides");
  const dotsEl = root.querySelector("#dots");
  const progressEl = root.querySelector("#progress");
  const prevBtn = root.querySelector("#prev");
  const nextBtn = root.querySelector("#next");

  let idx = 0;
  let autoAdvanceTimer = null;
  // Als een slide eerst iets wil laten afspelen (GPS-animatie, krassen)
  // staat de "vooruit"-gate dicht. Next-knop / swipe / arrow-right / dots
  // naar later slidenummer doen dan niks.
  let forwardGate = true;

  function setForwardGate(open) {
    forwardGate = open;
    const last = idx === SLIDES.length - 1;
    nextBtn.disabled = !open;
    nextBtn.textContent = !open
      ? (SLIDES[idx].key === "reveal" ? "Krassen…" : "Wacht…")
      : last
        ? "Opnieuw ›"
        : "Verder ›";
  }

  function renderSlide(i, direction = 1) {
    const s = SLIDES[i];
    const inner = s.render
      ? s.render()
      : `
        ${s.img ? slideImg({ ...s.img, alt: s.imgAlt || "" }) : ""}
        <div class="slide-emoji">${s.emoji || "✨"}</div>
        <h1>${s.title}</h1>
        ${s.body || ""}
      `;

    slidesEl.innerHTML = `
      <article class="slide ${s.className || ""}" data-key="${s.key}">
        ${inner}
      </article>
    `;

    // Entrance-animatie: van rechts bij vooruit, van links bij terug
    const slide = slidesEl.querySelector(".slide");
    slide.classList.add(direction < 0 ? "enter-back" : "enter");

    // Thema per slide — zet een data-theme attribuut op de onboarding
    // én op de body zodat op desktop de hele viewport meekleurt.
    onboardingEl.dataset.theme = s.theme || "paper";
    document.body.dataset.slideTheme = s.theme || "paper";
    // Tijdens de dramatic-reveal-slides (flashback, GPS, onthulling)
    // verbergen we de nav; vanaf de route-slide komt 'ie tevoorschijn.
    const HIDE_NAV_ON = new Set(["flashback", "map", "reveal"]);
    onboardingEl.classList.toggle("hide-nav", HIDE_NAV_ON.has(s.key));

    // Progressbar
    progressEl.style.width = `${((i + 1) / SLIDES.length) * 100}%`;

    dotsEl.innerHTML = SLIDES.map(
      (_, n) => `<span class="dot ${n === i ? "active" : ""}" data-n="${n}"></span>`,
    ).join("");

    prevBtn.disabled = i === 0;
    nextBtn.classList.toggle("btn-accent", true);

    // Slide-specifieke init + gate-bewaking
    clearTimeout(autoAdvanceTimer);
    setForwardGate(true);

    if (s.key === "reveal") {
      setForwardGate(false);
      initRevealSlide(slide, () => {
        if (idx === i) {
          setForwardGate(true);
          // Na het krassen mag de nav verschijnen zodat user zelf
          // kan klikken; parallel wordt na 3.5s automatisch door-
          // gegaan zodat het sowieso vloeit.
          onboardingEl.classList.remove("hide-nav");
        }
        sfx.buzz(1.3);
        setTimeout(() => {
          const mega = slide.querySelector(".mega.neon");
          if (mega) burstConfetti(mega);
          sfx.pop();
        }, 550);
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = setTimeout(() => {
          if (idx === i) go(1);
        }, 3500);
      });
    } else if (s.key === "map") {
      setForwardGate(false);
      scheduleGpsSounds(i);
      autoAdvanceTimer = setTimeout(() => {
        if (idx === i) {
          setForwardGate(true);
          go(1);
        }
      }, s.autoAdvanceMs);
    } else if (s.key === "route") {
      // Gate blijft dicht tot de sketch-animatie klaar is; daarna
      // kan user zelf verder klikken (Google Maps blijft interactief).
      setForwardGate(false);
      setTimeout(() => sfx.whoosh(2.3), 500);
      setTimeout(() => {
        if (idx === i) sfx.ping();
      }, 2800);
      autoAdvanceTimer = setTimeout(() => {
        if (idx === i) setForwardGate(true);
      }, 3600);
    } else if (s.key === "flashback") {
      // Spannings-drone onder de carousel (9s totaal)
      sfx.drone(8.5);
      initFlashback(slide);
      setForwardGate(false);
      autoAdvanceTimer = setTimeout(() => {
        if (idx === i) {
          setForwardGate(true);
          go(1);
        }
      }, s.autoAdvanceMs);
    } else if (s.autoAdvanceMs) {
      setForwardGate(false);
      autoAdvanceTimer = setTimeout(() => {
        if (idx === i) {
          setForwardGate(true);
          go(1);
        }
      }, s.autoAdvanceMs);
    } else if (s.key === "boarding") {
      // Ticket-stempel zodra de boarding-pass in beeld komt
      setTimeout(() => sfx.stamp(), 150);
    }
  }

  // GPS-terminal bouwt spanning op: elke regel hogere beep (crescendo
  // van 600 naar 1500 Hz) en aan het eind een bioscoop-akkoord.
  function scheduleGpsSounds(sliceIdx) {
    const beeps = [
      { ms: 600, freq: 620 },
      { ms: 2400, freq: 780 },
      { ms: 4200, freq: 940 },
      { ms: 5800, freq: 1120 },
      { ms: 7400, freq: 1320 },
    ];
    const timers = beeps.map(({ ms, freq }) =>
      setTimeout(() => {
        if (idx === sliceIdx) sfx.beep(freq);
      }, ms),
    );
    timers.push(
      setTimeout(() => {
        if (idx === sliceIdx) sfx.lock();
      }, 9200),
    );
  }

  function go(delta) {
    if (delta > 0 && !forwardGate) return;
    const next = Math.min(SLIDES.length - 1, Math.max(0, idx + delta));
    if (next === idx && delta > 0) {
      idx = 0;
      renderSlide(0, 1);
      return;
    }
    const direction = next > idx ? 1 : -1;
    idx = next;
    renderSlide(idx, direction);
  }

  function finish() {
    setOnboarded(true);
    // Verwijder #reveal uit de URL zodat refresh direct naar de app springt
    if (location.hash === "#reveal") {
      history.replaceState(null, "", location.pathname + location.search);
    }
    renderAppHome(root);
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  prevBtn.addEventListener("click", () => go(-1));
  nextBtn.addEventListener("click", () => go(1));
  dotsEl.addEventListener("click", (e) => {
    const n = e.target?.dataset?.n;
    if (n != null) {
      const next = Number(n);
      // Dots mogen alleen terug of naar de huidige slide als de gate
      // dichtzit (voorkomt dat user GPS / krassen overslaat door te
      // tikken op een latere dot).
      if (next > idx && !forwardGate) return;
      const direction = next >= idx ? 1 : -1;
      idx = next;
      renderSlide(idx, direction);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  });

  // Swipe-gestures: horizontaal vegen over de slide = vorige/volgende
  attachSwipe(slidesEl, {
    onLeft: () => go(1),
    onRight: () => go(-1),
  });

  renderSlide(0);
}

// ---------------------------------------------------------------------------
// Slide-helpers: typewriter, scratch-to-reveal, swipe
// ---------------------------------------------------------------------------

// Letter-voor-letter tekst typen. Speelt automatisch af op elk
// `[data-typewriter]` element dat in de nieuwe slide zit.
function runTypewriter(root, onDone) {
  const el = root.querySelector("[data-typewriter]");
  if (!el) {
    onDone?.();
    return;
  }
  const text = el.dataset.typewriter;
  el.textContent = "";
  el.classList.add("typing");
  let i = 0;
  const id = setInterval(() => {
    el.textContent = text.slice(0, ++i);
    if (i >= text.length) {
      clearInterval(id);
      setTimeout(() => el.classList.remove("typing"), 500);
      onDone?.();
    }
  }, 55);
}

// Maak een canvas-laag waar je over moet vegen om de naam eronder
// te onthullen. Bij ~60% weggekrast verdwijnt de laag helemaal en
// gaat de neon-flicker aan.
function initScratch(canvas, onRevealed) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  // Vulkleur: grijsbruin (past bij paper-thema) met ruwe korrel
  const grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
  grad.addColorStop(0, "#8a6f55");
  grad.addColorStop(1, "#6b5239");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, rect.width, rect.height);

  // Noise voor textuur
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
    ctx.fillRect(
      Math.random() * rect.width,
      Math.random() * rect.height,
      1.5,
      1.5,
    );
  }

  ctx.globalCompositeOperation = "destination-out";
  ctx.lineWidth = 30;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  let drawing = false;
  let lastX = 0;
  let lastY = 0;
  let revealed = false;

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function start(e) {
    drawing = true;
    const { x, y } = pos(e);
    lastX = x;
    lastY = y;
    canvas.setPointerCapture?.(e.pointerId);
  }

  function move(e) {
    if (!drawing) return;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
    sfx.sizzle();
    if (!revealed) checkReveal();
  }

  function end() {
    drawing = false;
    if (!revealed) checkReveal();
  }

  // Bepaal hoeveel procent transparant is — pas wanneer bijna alles
  // weg is (>=85%) verwijdert de canvas zich en gaat de neon aan.
  function checkReveal() {
    const sample = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0;
    for (let i = 3; i < sample.length; i += 16) {
      if (sample[i] < 30) clear++;
    }
    const total = sample.length / 16;
    if (clear / total > 0.85) {
      revealed = true;
      canvas.classList.add("cleared");
      onRevealed?.();
    }
  }

  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
}

// Canvas-based confetti-explosion vanuit een bronElement. Goud, rood,
// cream en olijf — past bij het retro-thema. Kleine particle-deeltjes
// met fysica (gravity + drag + rotatie).
function burstConfetti(sourceEl) {
  const canvas = document.createElement("canvas");
  canvas.className = "confetti-burst";
  canvas.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:9999;";
  document.body.appendChild(canvas);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  canvas.style.width = innerWidth + "px";
  canvas.style.height = innerHeight + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const rect = sourceEl?.getBoundingClientRect?.() || {
    left: innerWidth / 2 - 50,
    top: innerHeight / 2 - 20,
    width: 100,
    height: 40,
  };
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const colors = ["#c0392b", "#e4a72c", "#fef8e7", "#f59e0b", "#6b7c3a", "#f87171"];
  const N = 140;
  const particles = Array.from({ length: N }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 6 + Math.random() * 14;
    return {
      x: cx + (Math.random() - 0.5) * rect.width * 0.4,
      y: cy + (Math.random() - 0.5) * rect.height * 0.4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 6,
      size: 5 + Math.random() * 7,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.35,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  });

  const gravity = 0.45;
  const drag = 0.985;
  const start = performance.now();

  function tick(now) {
    const elapsed = (now - start) / 1000;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let alive = 0;
    const life = Math.max(0, 1 - elapsed / 2.8);
    for (const p of particles) {
      p.vx *= drag;
      p.vy = p.vy * drag + gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > innerHeight + 40) continue;
      alive++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = life;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (alive > 0 && elapsed < 3) requestAnimationFrame(tick);
    else canvas.remove();
  }
  requestAnimationFrame(tick);
}

// Snelle flashback-flitssequentie: eerst langzaam om het oog te laten
// wennen, daarna versnellend tot ratelende flits. Het GIFje aan het
// einde krijgt wat extra tijd als 'money shot'.
function initFlashback(slide) {
  const frames = Array.from(slide.querySelectorAll(".fb-frame"));
  const finalEl = slide.querySelector(".fb-final");
  if (!frames.length) return;

  // Cumulatieve delays, versnellend — eerste paar rustig, dan razend
  const delays = frames.map((_, i) => {
    if (i === frames.length - 1) return 900; // laatste blijft lang staan
    if (i < 3) return 500;
    if (i < 8) return 320;
    if (i < 15) return 200;
    return 140;
  });

  let elapsed = 0;
  const timers = [];
  frames.forEach((f, n) => {
    timers.push(
      setTimeout(() => {
        frames.forEach((other, m) =>
          other.dataset.active = m === n ? "1" : "",
        );
      }, elapsed),
    );
    elapsed += delays[n];
  });
  // Afsluitende tekst zodra laatste foto in beeld is
  timers.push(
    setTimeout(() => finalEl?.classList.add("visible"), elapsed - 200),
  );
}

// Koppelt alles aan op de reveal-slide: typewriter → scratch → neon.
// `onReady` wordt aangeroepen zodra er genoeg is weggekrast — caller
// gebruikt dat om de 'Verder'-knop te activeren.
function initRevealSlide(slide, onReady) {
  const canvas = slide.querySelector("[data-scratch]");
  const neon = slide.querySelector("[data-neon]");
  const hint = slide.querySelector("[data-scratch-hint]");
  if (!canvas || !neon) {
    onReady?.();
    return;
  }

  runTypewriter(slide);

  // Canvas-init moet wachten tot het element een echte size heeft.
  // Tijdens de slide-in animatie kan getBoundingClientRect 0 teruggeven
  // — dan probeer ik het opnieuw tot er pixels zijn.
  function tryInit(retries = 30) {
    const rect = canvas.getBoundingClientRect();
    if ((rect.width < 50 || rect.height < 20) && retries > 0) {
      setTimeout(() => tryInit(retries - 1), 60);
      return;
    }
    initScratch(canvas, () => {
      neon.classList.add("lit");
      hint?.remove();
      onReady?.();
    });
  }
  tryInit();
}

// Swipe-gestures met pointer events. Triggert linker-/rechter-callback
// bij horizontale drag > 50 px, mits verticale afwijking klein is.
function attachSwipe(el, { onLeft, onRight }) {
  let startX = 0;
  let startY = 0;
  let tracking = false;

  el.addEventListener("pointerdown", (e) => {
    if (e.target.closest("[data-scratch], iframe, .bp-qr, .bp-journey")) return;
    tracking = true;
    startX = e.clientX;
    startY = e.clientY;
  });
  el.addEventListener("pointerup", (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dy) < 60) {
      if (dx < 0) onLeft?.();
      else onRight?.();
    }
  });
  el.addEventListener("pointercancel", () => (tracking = false));
}

// ---------------------------------------------------------------------------
// View 3: normale app-home (tiles)
// ---------------------------------------------------------------------------

function renderAppHome(root) {
  document.body.classList.remove("onboarding-active");
  delete document.body.dataset.slideTheme;
  document.body.classList.add("app-home");
  // Behoud de preview-query in alle app-home tiles zodat je in
  // preview-modus door de hele app kan klikken zonder uit de
  // preview te vallen.
  const qs = location.search.includes("preview") ? "?preview" : "";
  root.innerHTML = `
    <section class="home-hero">
      <h1>Welkom genieters</h1>
      <p class="home-sub">25 t/m 27 sept · De Bonte Wever</p>
    </section>
    <nav class="home-grid">
      <a class="home-tile" href="programma.html${qs}">
        <span class="home-tile-emoji">📅</span>
        <span class="home-tile-label">Programma</span>
      </a>
      <a class="home-tile" href="horoscoop.html${qs}">
        <span class="home-tile-emoji">🔮</span>
        <span class="home-tile-label">Horoscoop</span>
      </a>
      <a class="home-tile" href="quiz.html${qs}">
        <span class="home-tile-emoji">🎓</span>
        <span class="home-tile-label">Pubquiz</span>
      </a>
      <a class="home-tile" href="quotes.html${qs}">
        <span class="home-tile-emoji">💬</span>
        <span class="home-tile-label" data-long>Conversation<br>starters</span>
      </a>
      <a class="home-tile" href="playlist.html${qs}">
        <span class="home-tile-emoji">🎵</span>
        <span class="home-tile-label">Playlist</span>
      </a>
      <a class="home-tile" href="fotos.html${qs}">
        <span class="home-tile-emoji">📸</span>
        <span class="home-tile-label">Plakboek</span>
      </a>
    </nav>
    <div class="home-soundtrack">
      <button type="button" class="soundtrack-btn" id="soundtrack-btn"
              aria-label="Speel de HGW anthem">
        <span class="soundtrack-icon" id="soundtrack-icon" aria-hidden="true">▶</span>
        <span class="soundtrack-text">Speel de HGW anthem</span>
      </button>
      <audio id="soundtrack-audio" src="img/penisboter.m4a" loop preload="none"></audio>
    </div>
  `;

  const sBtn = document.getElementById("soundtrack-btn");
  const sAudio = document.getElementById("soundtrack-audio");
  const sIcon = document.getElementById("soundtrack-icon");
  if (sBtn && sAudio) {
    sBtn.addEventListener("click", () => {
      if (sAudio.paused) {
        sAudio.play().then(() => {
          sIcon.textContent = "⏸";
          sBtn.classList.add("is-playing");
        }).catch(() => {
          // bestand niet gevonden of autoplay blocked → expliciet
          // resetten zodat een tweede klik niet in een vreemde state belandt
          sIcon.textContent = "▶";
          sBtn.classList.remove("is-playing");
        });
      } else {
        sAudio.pause();
        sIcon.textContent = "▶";
        sBtn.classList.remove("is-playing");
      }
    });
    sAudio.addEventListener("ended", () => {
      sIcon.textContent = "▶";
      sBtn.classList.remove("is-playing");
    });
  }

  maybeShowInstallPrompt();
}

// ---------------------------------------------------------------------------
// 'Installeer op beginscherm'-promptje voor mobiele bezoekers die nog niet
// in PWA-modus zitten. Eenmalig per device — dismissed-flag bewaard in
// localStorage. iOS krijgt handmatige Deel-instructies, Android gebruikt
// de native beforeinstallprompt als die beschikbaar is.
// ---------------------------------------------------------------------------

const INSTALL_DISMISSED_KEY = "hgw:install-dismissed";
let deferredInstallPrompt = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });
}

function isStandalone() {
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  } catch {
    return false;
  }
}

function isIOS() {
  return /iP(ad|hone|od)/.test(navigator.userAgent || "");
}

function isMobileDevice() {
  return /Android|iP(ad|hone|od)/.test(navigator.userAgent || "");
}

function maybeShowInstallPrompt() {
  if (!isMobileDevice()) return;
  if (isStandalone()) return;
  try {
    if (localStorage.getItem(INSTALL_DISMISSED_KEY) === "1") return;
  } catch {
    /* ignore */
  }
  // Kleine delay zodat de tegels eerst rustig verschijnen.
  setTimeout(renderInstallPrompt, 700);
}

function renderInstallPrompt() {
  if (document.querySelector(".install-prompt")) return;
  const el = document.createElement("div");
  el.className = "install-prompt";
  el.innerHTML = `
    <div class="install-prompt-icon" aria-hidden="true">📲</div>
    <div class="install-prompt-text">
      <strong>Zet de HGW-app op je beginscherm.</strong>
      <span class="install-prompt-sub">Voelt als een echte app — en werkt offline.</span>
    </div>
    <div class="install-prompt-actions">
      <button type="button" class="install-prompt-btn" data-action="how">Hoe?</button>
      <button type="button" class="install-prompt-dismiss" data-action="close" aria-label="Sluiten">×</button>
    </div>
  `;
  document.body.appendChild(el);

  el.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "close") {
      dismissInstallPrompt(el);
    } else if (action === "how") {
      triggerInstall(el);
    }
  });
}

function dismissInstallPrompt(el) {
  try {
    localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
  el?.classList.add("is-closing");
  setTimeout(() => el?.remove(), 250);
}

async function triggerInstall(promptEl) {
  // Android Chrome: native prompt
  if (deferredInstallPrompt) {
    promptEl?.remove();
    try {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === "accepted") {
        try { localStorage.setItem(INSTALL_DISMISSED_KEY, "1"); } catch {}
      }
    } catch {
      /* ignore */
    }
    deferredInstallPrompt = null;
    return;
  }
  // Anders: handmatige instructies (iOS, Firefox, etc.)
  renderInstallModal();
  promptEl?.remove();
}

function renderInstallModal() {
  const ios = isIOS();
  const shareIcon = `<svg class="install-share-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M12 3l-4 4h3v7h2V7h3l-4-4z"/>
    <path fill="currentColor" d="M5 10v10h14V10h-4v2h2v6H7v-6h2v-2H5z"/>
  </svg>`;
  const modal = document.createElement("div");
  modal.className = "install-modal";
  modal.innerHTML = `
    <div class="install-modal-box" role="dialog" aria-modal="true" aria-label="Toevoegen aan beginscherm">
      <button type="button" class="install-modal-close" data-action="close" aria-label="Sluiten">×</button>
      <div class="install-modal-icon" aria-hidden="true">📱</div>
      <h2>Toevoegen aan beginscherm</h2>
      ${
        ios
          ? `
        <ol class="install-steps">
          <li>Tik onderin op <strong>Deel</strong> ${shareIcon}</li>
          <li>Scroll en kies <strong>'Zet op beginscherm'</strong></li>
          <li>Tik rechtsboven op <strong>Voeg toe</strong></li>
        </ol>
        <p class="install-note">Werkt in Safari, Chrome én Firefox op iOS.</p>
      `
          : `
        <ol class="install-steps">
          <li>Tik rechtsboven op het menu <strong>(⋮)</strong></li>
          <li>Kies <strong>'App installeren'</strong> of <strong>'Toevoegen aan beginscherm'</strong></li>
          <li>Bevestig met <strong>Installeren</strong></li>
        </ol>
      `
      }
      <button type="button" class="install-modal-ok" data-action="close">Oké, komt goed</button>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => {
    try { localStorage.setItem(INSTALL_DISMISSED_KEY, "1"); } catch {}
    modal.remove();
  };
  modal.addEventListener("click", (e) => {
    if (e.target === modal) return close();
    if (e.target.closest('[data-action="close"]')) close();
  });
}
