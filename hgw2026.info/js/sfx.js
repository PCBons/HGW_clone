// HGW 2026 — Web Audio SFX
//
// Alle geluiden worden procedureel gegenereerd met Web Audio API —
// geen externe audio-files, geen downloads. Setenabled(true) activeert
// het geluid; zolang die uit staat doen alle helpers niks.
// Audio-context wordt lazy gemaakt na de eerste user-interactie
// (iOS autoplay-policy).

const KEY = "hgw:sfx";

let ctx = null;
let master = null;
let enabled = false;
let noiseBuffer = null;
let reverbNode = null;
let reverbWet = null;

function ensureCtx() {
  if (ctx) return ctx;
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  ctx = new C();
  master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);
  return ctx;
}

function getNoise() {
  if (noiseBuffer) return noiseBuffer;
  const size = ctx.sampleRate * 0.6;
  noiseBuffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

// Synthetische reverb-staart: noise met exponentieel uitsterven →
// convolver. Geen sample-files nodig, maar wel echt ruimtegevoel
// onder de cinematic momenten (lock + pop).
function getReverb() {
  if (reverbNode) return reverbNode;
  if (!ctx) return null;
  const length = Math.floor(ctx.sampleRate * 1.8);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      // Subtiel asymmetrisch tussen kanalen voor breedte
      const decay = Math.pow(1 - i / length, 2.6);
      data[i] = (Math.random() * 2 - 1) * decay;
    }
  }
  reverbNode = ctx.createConvolver();
  reverbNode.buffer = impulse;
  reverbWet = ctx.createGain();
  reverbWet.gain.value = 0.32;
  reverbNode.connect(reverbWet);
  reverbWet.connect(master);
  return reverbNode;
}

export function restorePref() {
  try {
    const v = localStorage.getItem(KEY);
    // Default AAN tenzij expliciet uitgezet.
    enabled = v === null ? true : v === "1";
  } catch {
    enabled = true;
  }
}

export function isEnabled() {
  return enabled;
}

export function setEnabled(v) {
  enabled = !!v;
  try {
    localStorage.setItem(KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (enabled) ensureCtx()?.resume?.();
}

// Browsers houden de AudioContext suspended tot er een user-gesture
// is geweest. Roep dit aan vanaf elke pointer/key/touch handler om
// de context vrij te maken — daarna spelen geluiden ook bij de
// eerste slide (GPS-beeps die direct na render starten).
export function unlock() {
  ensureCtx()?.resume?.();
}

// Korte beep (GPS-terminal per regel).
export function beep(freq = 880) {
  if (!enabled || !ensureCtx()) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "square";
  o.frequency.value = freq;
  o.connect(g);
  g.connect(master);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.12, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  o.start(t);
  o.stop(t + 0.1);
}

// Lange descending ping (GPS "destination locked").
export function ping() {
  if (!enabled || !ensureCtx()) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(1400, t);
  o.frequency.exponentialRampToValueAtTime(720, t + 0.35);
  o.connect(g);
  g.connect(master);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.22, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  o.start(t);
  o.stop(t + 0.75);
}

// Pop (confetti-explosion) — vol-spectrum: diepe sub-thump + air-pop
// transient + mid-triangle sparkle + hi-noise shimmer + ascending
// arpeggio + reverb-staart. Voor het confetti-moment na de scratch.
export function pop() {
  if (!enabled || !ensureCtx()) return;
  const t = ctx.currentTime;
  const reverb = getReverb();

  // 1) Diepe sub-bass thump (bom)
  {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.35);
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.5);
  }

  // 2) Air-pop transient — korte gefilterde noise-burst (kurk uit fles)
  {
    const src = ctx.createBufferSource();
    src.buffer = getNoise();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    if (reverb) g.connect(reverb);
    src.start(t);
    src.stop(t + 0.1);
  }

  // 3) Mid-sparkle (oude triangle-zweep, behouden voor herkenbare karakter)
  {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(1300, t);
    o.frequency.exponentialRampToValueAtTime(380, t + 0.25);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.connect(g);
    g.connect(master);
    if (reverb) g.connect(reverb);
    o.start(t);
    o.stop(t + 0.36);
  }

  // 4) Hi-shimmer noise (glitter-feel)
  {
    const src = ctx.createBufferSource();
    src.buffer = getNoise();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 4500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    src.connect(hp);
    hp.connect(g);
    g.connect(master);
    if (reverb) g.connect(reverb);
    src.start(t);
    src.stop(t + 0.32);
  }

  // 5) Opstijgende arpeggio (C-E-G-C) — feestelijke afterglow
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    o.connect(g);
    g.connect(master);
    if (reverb) g.connect(reverb);
    const start = t + 0.08 + i * 0.07;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.08, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
    o.start(start);
    o.stop(start + 0.45);
  });
}

// "Destination locked" — volledige cinematic stab met pre-impact
// noise-swell, sub-kick, brass-stack, string-pad, bell-cascade en
// reverb-staart. Duurt ~2.5s. Voor het GROTE moment in de reveal.
export function lock() {
  if (!enabled || !ensureCtx()) return;
  const t = ctx.currentTime;
  const reverb = getReverb();
  // Impact-moment ligt 0.4s na het start; daarvoor bouwt de noise
  // sweep spanning op (klassieke "Inception-bwah" voorbereiding).
  const impact = t + 0.4;

  // 1) Pre-impact noise-swell (cymbal/wind-rise)
  {
    const src = ctx.createBufferSource();
    src.buffer = getNoise();
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(800, t);
    hp.frequency.exponentialRampToValueAtTime(7000, impact);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, impact - 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, impact + 0.18);
    src.connect(hp);
    hp.connect(g);
    g.connect(master);
    if (reverb) g.connect(reverb);
    src.start(t);
    src.stop(impact + 0.25);
  }

  // 2) Sub-bass impact-kick (de "bwah")
  {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(95, impact);
    o.frequency.exponentialRampToValueAtTime(34, impact + 0.5);
    g.gain.setValueAtTime(0, impact);
    g.gain.linearRampToValueAtTime(0.6, impact + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, impact + 0.85);
    o.connect(g);
    g.connect(master);
    o.start(impact);
    o.stop(impact + 0.9);
  }

  // 3) Brass-stab stack (sawtooth + lowpass die opent) — C major
  //    octaaf-stack voor breedte
  const chord = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99]; // C4 E4 G4 C5 E5 G5
  chord.forEach((freq, i) => {
    const o = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(700, impact);
    lp.frequency.exponentialRampToValueAtTime(3800, impact + 0.18);
    o.type = "sawtooth";
    o.frequency.value = freq;
    // Lichte detune per laag voor analoge dikte
    o.detune.value = i % 2 === 0 ? -6 : 6;
    o.connect(lp);
    lp.connect(g);
    g.connect(master);
    if (reverb) g.connect(reverb);
    g.gain.setValueAtTime(0, impact);
    g.gain.linearRampToValueAtTime(0.06, impact + 0.04);
    g.gain.setValueAtTime(0.06, impact + 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, impact + 1.6);
    o.start(impact);
    o.stop(impact + 1.7);
  });

  // 4) String-pad sine-laag voor warmte (octaaf hoger dan brass)
  chord.forEach((freq) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq * 2;
    o.connect(g);
    g.connect(master);
    if (reverb) g.connect(reverb);
    g.gain.setValueAtTime(0, impact);
    g.gain.linearRampToValueAtTime(0.025, impact + 0.18);
    g.gain.setValueAtTime(0.025, impact + 1.4);
    g.gain.exponentialRampToValueAtTime(0.001, impact + 2.3);
    o.start(impact);
    o.stop(impact + 2.4);
  });

  // 5) Bell-cascade — felle triangle-stings boven het akkoord
  const sparkles = [2093.0, 1567.98, 1318.51, 1046.5]; // C7 G6 E6 C6
  sparkles.forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    o.connect(g);
    g.connect(master);
    if (reverb) g.connect(reverb);
    const start = impact + 0.05 + i * 0.07;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.05, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
    o.start(start);
    o.stop(start + 0.6);
  });
}

// Spanning-opbouw drone — twee oscillators die langzaam in pitch
// stijgen. Voor onder de flashback-carousel. Eindigt met een kleine
// build-up-swell vlak voor de lokalisatie.
export function drone(duration = 8) {
  if (!enabled || !ensureCtx()) return;
  const t = ctx.currentTime;
  const base = 55; // A1
  [1, 1.5, 2].forEach((mult, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = i === 0 ? "sine" : "triangle";
    o.frequency.setValueAtTime(base * mult, t);
    o.frequency.linearRampToValueAtTime(base * mult * 1.45, t + duration - 0.8);
    o.connect(g);
    g.connect(master);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.04 + i * 0.015, t + 1.2);
    g.gain.setValueAtTime(0.05 + i * 0.015, t + duration - 1.5);
    g.gain.linearRampToValueAtTime(0.11, t + duration - 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.start(t);
    o.stop(t + duration + 0.1);
  });
}

// Laag buzzzz (neon-ignition) — begint gedempt, lowpass filter opent,
// tremolo voor ouderwetse neon-flicker-feel.
export function buzz(duration = 1.3) {
  if (!enabled || !ensureCtx()) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(180, t);
  filter.frequency.exponentialRampToValueAtTime(2600, t + 0.4);
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  o.type = "sawtooth";
  o.frequency.value = 72;
  lfo.frequency.value = 55;
  lfoGain.gain.value = 0.14;
  lfo.connect(lfoGain);
  lfoGain.connect(g.gain);
  o.connect(filter);
  filter.connect(g);
  g.connect(master);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.12, t + 0.08);
  g.gain.setValueAtTime(0.12, t + duration - 0.15);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  o.start(t);
  lfo.start(t);
  o.stop(t + duration);
  lfo.stop(t + duration);
}

// Korte sizzle (scratch-stroke).
let lastSizzle = 0;
export function sizzle() {
  if (!enabled || !ensureCtx()) return;
  const now = performance.now();
  if (now - lastSizzle < 130) return; // throttle zodat 't niet krijst
  lastSizzle = now;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = getNoise();
  const g = ctx.createGain();
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2400;
  src.connect(hp);
  hp.connect(g);
  g.connect(master);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.07, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  src.start(t);
  src.stop(t + 0.1);
}

// Whoosh / drawing sound (route wordt getrokken). Band-pass filtered
// noise die van lage naar hoge frequentie sweept, plus een subtiele
// tremolo. Duurt net zolang als de route-animation.
export function whoosh(duration = 2.2) {
  if (!enabled || !ensureCtx()) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = getNoise();
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 4;
  bp.frequency.setValueAtTime(280, t);
  bp.frequency.exponentialRampToValueAtTime(1600, t + duration * 0.7);
  bp.frequency.exponentialRampToValueAtTime(500, t + duration);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.13, t + 0.2);
  g.gain.setValueAtTime(0.13, t + duration - 0.25);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  src.connect(bp);
  bp.connect(g);
  g.connect(master);
  src.start(t);
  src.stop(t + duration + 0.05);
}

// Diepe klap + click (boarding pass stempel).
export function stamp() {
  if (!enabled || !ensureCtx()) return;
  const t = ctx.currentTime;
  // Lage thump
  const o1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  o1.type = "sine";
  o1.frequency.setValueAtTime(140, t);
  o1.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g1.gain.setValueAtTime(0.5, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  o1.connect(g1);
  g1.connect(master);
  o1.start(t);
  o1.stop(t + 0.22);
  // Scherpe click erbovenop
  const src = ctx.createBufferSource();
  src.buffer = getNoise();
  const g2 = ctx.createGain();
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 3000;
  src.connect(hp);
  hp.connect(g2);
  g2.connect(master);
  g2.gain.setValueAtTime(0.25, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  src.start(t);
  src.stop(t + 0.05);
}
