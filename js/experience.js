// Hope Hub — experience layer: smooth scroll, 3D shirt room, drop rail, word reveal,
// lookbook parallax, cart thud and optional soft music. Reads the same products.json
// the shop uses (via window.HH from app.js), so CMS edits flow through.
import * as THREE from "three";

const $ = (s) => document.querySelector(s);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Transparent cut-outs for the 3D room, by product id + colour.
// To add a new shirt to the 3D room, drop a transparent .webp in img/cut and add it here.
const CUT = {
  coreluxe: { Black: "img/cut/motoaitoai.webp" },
  sehalo: { Brown: "img/cut/sehalo.webp" },
  signature: { Black: "img/cut/signature-black.webp", White: "img/cut/signature-white.webp" },
  classic: { Black: "img/cut/classic-black.webp", White: "img/cut/classic-white.webp" },
};
const ORDER = ["coreluxe", "sehalo", "signature", "classic"];
const fmt = (v) => "M " + v.toFixed(2).replace(/\.00$/, "");

/* ================= SOUND ================= */
let actx = null;
function ctx() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
  }
  if (actx.state === "suspended") actx.resume();
  return actx;
}
// Soft fabric "thud": low sine drop + a short filtered noise puff.
function thud() {
  const a = ctx(); if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator(), g = a.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.3);
  const len = Math.floor(a.sampleRate * 0.12), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const n = a.createBufferSource(), f = a.createBiquadFilter(), ng = a.createGain();
  n.buffer = buf; f.type = "lowpass"; f.frequency.value = 700; ng.gain.value = 0.16;
  n.connect(f).connect(ng).connect(a.destination); n.start(t);
}
document.addEventListener("hh:added", () => {
  thud();
  const b = $("#cartBtn"); b.classList.remove("drop"); void b.offsetWidth; b.classList.add("drop");
});

// Optional ambient pad — generated live, very quiet, off until the visitor taps it.
let music = null;
function startMusic() {
  const a = ctx(); if (!a) return;
  const master = a.createGain(); master.gain.value = 0;
  const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
  lp.connect(master).connect(a.destination);
  const chords = [[220, 277.18, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [196, 246.94, 329.63]];
  const voices = [0, 1, 2].map(() => {
    const o1 = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain();
    o1.type = "sine"; o2.type = "triangle"; o2.detune.value = 7; g.gain.value = 0.33;
    o1.connect(g); o2.connect(g); g.connect(lp); o1.start(); o2.start();
    return { o1, o2 };
  });
  const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 350;
  lfo.connect(lg).connect(lp.frequency); lfo.start();
  let k = 0;
  const step = () => {
    const t = a.currentTime;
    chords[k % chords.length].forEach((f, i) => {
      voices[i].o1.frequency.setTargetAtTime(f / 2, t, 1.2);
      voices[i].o2.frequency.setTargetAtTime(f, t, 1.2);
    });
    k++;
  };
  step();
  const timer = setInterval(step, 7000);
  master.gain.setTargetAtTime(0.045, a.currentTime, 1.5);
  music = { master, timer, voices, lfo };
}
function stopMusic() {
  if (!music || !actx) return;
  const m = music; music = null;
  m.master.gain.setTargetAtTime(0, actx.currentTime, 0.4);
  clearInterval(m.timer);
  setTimeout(() => { m.voices.forEach((v) => { v.o1.stop(); v.o2.stop(); }); m.lfo.stop(); }, 2000);
}
$("#xpSound").addEventListener("click", (e) => {
  const b = e.currentTarget;
  if (music) { stopMusic(); b.classList.remove("on"); b.setAttribute("aria-pressed", "false"); }
  else { startMusic(); b.classList.add("on"); b.setAttribute("aria-pressed", "true"); }
});

/* ================= SCROLL + LOADER ================= */
gsap.registerPlugin(ScrollTrigger);
const lenis = reduce ? null : new Lenis({ lerp: 0.09, smoothWheel: true });
if (lenis) {
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute("href"); if (id.length < 2 || !document.querySelector(id)) return;
    e.preventDefault(); lenis.scrollTo(id, { duration: 1.4, offset: id === "#shop" ? -60 : 0 });
  });
  // pause smooth scroll while the cart or checkout is open
  const obs = new MutationObserver(() => {
    const open = $("#cartDrawer").classList.contains("show") || $("#checkoutModal").classList.contains("show");
    open ? lenis.stop() : lenis.start();
  });
  obs.observe($("#cartDrawer"), { attributes: true, attributeFilter: ["class"] });
  obs.observe($("#checkoutModal"), { attributes: true, attributeFilter: ["class"] });
}
const lo = { v: 0 };
gsap.to(lo, {
  v: 100, duration: reduce ? 0.2 : 1.3, ease: "power2.inOut",
  onUpdate: () => ($("#xpLn").textContent = String(Math.round(lo.v)).padStart(2, "0")),
  onComplete: () => {
    gsap.to("#xpLoader", { yPercent: -100, duration: 1, ease: "expo.inOut", onComplete: () => $("#xpLoader").remove() });
    gsap.to(".xp-big .w>span", { y: 0, duration: 1.2, ease: "expo.out", stagger: 0.08, delay: 0.35 });
    gsap.from(".xp-hero .hero-eyebrow, .xp-hero .hero-sesotho, .xp-hero .hero-sub, .xp-hero-ctas", { y: 30, opacity: 0, duration: 1, stagger: 0.1, delay: 0.6, ease: "power3.out" });
  },
});
gsap.to(".xp-hero video", { scale: 1, yPercent: 12, ease: "none", scrollTrigger: { trigger: ".xp-hero", start: "top top", end: "bottom top", scrub: true } });

/* ================= CURSOR ================= */
const cur = $("#xpCur");
if (matchMedia("(hover:hover)").matches) {
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
  addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; });
  (function lp() { cx += (mx - cx) * 0.18; cy += (my - cy) * 0.18; cur.style.left = cx + "px"; cur.style.top = cy + "px"; requestAnimationFrame(lp); })();
  document.addEventListener("pointerover", (e) => cur.classList.toggle("big", !!e.target.closest("a,button,.xp-card,#xpGl,.card")));
}

/* ================= 3D ROOM ================= */
const cv = $("#xpGl");
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { renderer = null; }
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
cam.position.set(0, -0.1, 10);
const group = new THREE.Group(); scene.add(group);
const H = 3.7, SX = 60, SY = 90;
let geo, front, back, base, aspect = 0.66;
const texLoader = new THREE.TextureLoader(), cache = {};
if (renderer) {
  renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  scene.add(new THREE.HemisphereLight(0xfff3e0, 0x2a2218, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-3, 3, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xd4a94b, 2.4); rim.position.set(4, 1, -4); scene.add(rim);
}
function alphaTex(img) {
  const cn = document.createElement("canvas"); cn.width = img.width; cn.height = img.height;
  const x = cn.getContext("2d"); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, cn.width, cn.height), a = d.data; let r = 0, g = 0, b = 0, k = 0;
  for (let i = 0; i < a.length; i += 4) {
    const al = a[i + 3], px = (i / 4) % cn.width, py = i / 4 / cn.width;
    if (al > 200 && px > cn.width * 0.3 && px < cn.width * 0.7 && py > cn.height * 0.75) { r += a[i]; g += a[i + 1]; b += a[i + 2]; k++; }
    a[i] = a[i + 1] = a[i + 2] = al; a[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  return { t: new THREE.CanvasTexture(cn), body: k ? new THREE.Color(`rgb(${(r / k) | 0},${(g / k) | 0},${(b / k) | 0})`) : new THREE.Color(0x222222) };
}
function getTex(src) {
  return cache[src] || (cache[src] = new Promise((res) => texLoader.load(src, (tx) => {
    tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
    const al = alphaTex(tx.image);
    res({ map: tx, alpha: al.t, body: al.body, aspect: tx.image.width / tx.image.height });
  })));
}
function build(t) {
  aspect = t.aspect; if (geo) geo.dispose();
  geo = new THREE.PlaneGeometry(H * aspect, H, SX, SY); base = geo.attributes.position.array.slice();
  if (!front) {
    front = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t.map, transparent: true, alphaTest: 0.45, roughness: 0.92, metalness: 0, side: THREE.FrontSide }));
    back = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: t.body, alphaMap: t.alpha, transparent: true, alphaTest: 0.45, roughness: 0.95, side: THREE.BackSide }));
    group.add(front, back);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = -H / 2 - 0.35; sh.scale.set(1, 0.35, 1); group.add(sh);
  } else {
    front.geometry = geo; back.geometry = geo; front.material.map = t.map; back.material.alphaMap = t.alpha; back.material.color = t.body;
    front.material.needsUpdate = back.material.needsUpdate = true;
  }
}
function resize() {
  if (!renderer) return;
  const w = cv.clientWidth, h = cv.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  group.position.x = w > 760 ? 1.15 : 0; group.position.y = w > 760 ? -0.15 : 0.66; group.scale.setScalar(w > 760 ? 1 : 0.55);
}
addEventListener("resize", resize);
// Shirt only turns ±50° so the plain back never shows. Drag springs back to front; idle sway is gentle.
const MAXR = 50 * Math.PI / 180;
let rotY = 0, vel = 0, drag = false, lx = 0, scrollRot = 0, visible = true, shown = 0;
cv.addEventListener("pointerdown", (e) => { drag = true; lx = e.clientX; cv.setPointerCapture(e.pointerId); });
cv.addEventListener("pointermove", (e) => { if (!drag) return; const dx = e.clientX - lx; lx = e.clientX; vel = dx * 0.006; rotY = Math.max(-MAXR * 1.3, Math.min(MAXR * 1.3, rotY + vel)); });
cv.addEventListener("pointerup", () => (drag = false));
cv.addEventListener("pointercancel", () => (drag = false));
ScrollTrigger.create({
  trigger: "#show", start: "top bottom", end: "bottom top", scrub: true,
  onToggle: (s) => (visible = s.isActive),
  onUpdate: (s) => { scrollRot = (s.progress - 0.5) * 1.1; gsap.set("#xpGhost", { xPercent: -50 - (s.progress - 0.5) * 30 }); },
});
const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  if (!visible || !renderer) return;
  const t = clock.getElapsedTime();
  if (!drag) { rotY += vel; vel *= 0.9; rotY *= 0.975; }
  const raw = rotY + scrollRot + Math.sin(t * 0.45) * 0.28;
  const target = MAXR * Math.tanh(raw / MAXR); // soft limit, never past ~50°
  shown += (target - shown) * 0.12;
  group.rotation.y = shown; group.rotation.x = Math.sin(t * 0.6) * 0.04;
  if (geo) {
    const p = geo.attributes.position.array, w = H * aspect;
    for (let i = 0; i < p.length; i += 3) {
      const x = base[i], y = base[i + 1], hang = Math.pow(Math.max(0, (H / 2 - y) / H), 1.4), nx = x / (w / 2);
      p[i + 2] = -0.32 * nx * nx + Math.sin(y * 2.6 + t * 1.7 + x * 1.3) * 0.07 * hang + Math.sin(x * 4.2 - t * 1.1) * 0.035 * hang + Math.cos(y * 7 + x * 3 + t * 2.2) * 0.012 * hang;
      p[i] = x + Math.sin(y * 1.8 + t * 1.2) * 0.03 * hang;
    }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
  }
  renderer.render(scene, cam);
}

/* ================= DATA-DRIVEN PARTS ================= */
function start() {
  const HH = window.HH, ALL = HH.products;
  // 3D room uses products that have a cut-out, in a fixed order; colours limited to those with cut-outs
  const P = ORDER.map((id) => ALL.find((p) => p.id === id)).filter(Boolean)
    .concat(ALL.filter((p) => CUT[p.id] && !ORDER.includes(p.id)))
    .map((p) => ({ p, colors: p.colors.filter((c) => CUT[p.id] && CUT[p.id][c.n]) }))
    .filter((x) => x.colors.length);
  let curP = 0, curC = 0, curS = "M";

  function setProduct(pi, ci = 0, anim = true) {
    curP = pi; curC = ci;
    const { p, colors } = P[pi], col = colors[ci];
    if (!p.sizes.includes(curS)) curS = p.sizes[Math.min(2, p.sizes.length - 1)];
    $("#xpNum").textContent = String(pi + 1).padStart(2, "0") + " / " + String(P.length).padStart(2, "0");
    $("#xpName").textContent = p.name; $("#xpTag").textContent = p.tagline || ""; $("#xpStory").textContent = p.story || "";
    $("#xpPrice").innerHTML = fmt(p.price) + " <small>" + (p.fabric || "") + "</small>";
    $("#xpGhost").textContent = p.name.split(" ")[0];
    $("#xpSw").innerHTML = colors.map((c, i) => `<button class="${i === ci ? "on" : ""}" style="background:${c.h}" data-c="${i}" aria-label="${c.n}" title="${c.n}"></button>`).join("");
    $("#xpSz").innerHTML = p.sizes.map((s) => `<button class="${s === curS ? "on" : ""}" data-s="${s}">${s}</button>`).join("");
    document.querySelectorAll("#xpPicker button").forEach((b, i) => b.classList.toggle("on", i === pi));
    if (renderer) getTex(CUT[p.id][col.n]).then((t) => {
      if (!anim || !front) { build(t); return; }
      gsap.to(group.scale, { x: 0.001, duration: 0.35, ease: "power2.in", onComplete: () => { build(t); gsap.to(group.scale, { x: group.scale.y, duration: 0.6, ease: "back.out(1.6)" }); } });
    });
    if (anim) gsap.fromTo("#xpPanel>*", { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.04, duration: 0.55, ease: "power3.out" });
  }
  $("#xpPicker").innerHTML = P.map(({ p }, i) => `<button data-p="${i}">${p.name.replace("Motoaitoai ", "")}</button>`).join("");
  $("#xpPicker").addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (b) setProduct(+b.dataset.p, 0); });
  $("#xpSw").addEventListener("click", (e) => { const b = e.target.closest("[data-c]"); if (b) setProduct(curP, +b.dataset.c); });
  $("#xpSz").addEventListener("click", (e) => {
    const b = e.target.closest("[data-s]"); if (!b) return; curS = b.dataset.s;
    document.querySelectorAll("#xpSz button").forEach((x) => x.classList.toggle("on", x === b));
  });
  $("#xpAdd").addEventListener("click", () => {
    const { p, colors } = P[curP];
    HH.addItem(p.id, colors[curC].n, curS, 1);
    gsap.fromTo(group.position, { y: group.position.y - 0.12 }, { y: group.position.y, duration: 0.5, ease: "back.out(3)" });
  });
  if (P.length) { resize(); setProduct(0, 0, false); tick(); }
  else $("#show").remove();

  // Drop rail — every product/colour from the catalogue
  const cards = [];
  ALL.forEach((p) => p.colors.forEach((c) => {
    const cut = CUT[p.id] && CUT[p.id][c.n];
    const img = cut || HH.imageFor(p, c.n);
    const hasOwn = cut || (p.colorImages || []).some((ci) => ci.color === c.n) || c === p.colors[0];
    if (hasOwn) cards.push({ p, c, img, cut: !!cut });
  }));
  $("#xpTrack").innerHTML = cards.map(({ p, c, img, cut }, i) =>
    `<a class="xp-card ${c.n === "White" || c.n === "Brown" || c.n === "Cream White" ? "" : "dark"}" data-i="${i}" href="#shop">` +
    (p.badge && c === p.colors[0] ? `<span class="badge">${p.badge}</span>` : "") +
    `<div class="bgw">${p.name.split(" ")[0]}</div><img class="${cut ? "" : "photo"}" src="${img}" alt="${p.name} ${c.n}" loading="lazy">` +
    `<div class="info"><div><b>${p.name}</b><small>${c.n} · ${p.sizes.length > 1 ? p.sizes[0] + "–" + p.sizes[p.sizes.length - 1] : p.sizes[0]}</small></div><div class="p">${fmt(p.price)}</div></div></a>`).join("");
  $("#xpTrack").addEventListener("click", (e) => {
    const a = e.target.closest(".xp-card"); if (!a) return;
    const { p, c } = cards[+a.dataset.i];
    const pi = P.findIndex((x) => x.p.id === p.id);
    const ci = pi > -1 ? P[pi].colors.findIndex((x) => x.n === c.n) : -1;
    if (pi > -1 && ci > -1) { e.preventDefault(); e.stopPropagation(); setProduct(pi, ci); lenis ? lenis.scrollTo("#show", { duration: 1.4 }) : $("#show").scrollIntoView({ behavior: "smooth" }); }
  }, true);
  const track = $("#xpTrack"), mm = gsap.matchMedia();
  mm.add("(min-width:761px)", () => {
    gsap.to(track, { x: () => -(track.scrollWidth - innerWidth), ease: "none", scrollTrigger: { trigger: ".xp-rail", start: "top top", end: () => "+=" + (track.scrollWidth - innerWidth), pin: true, scrub: 1, invalidateOnRefresh: true } });
  });
  mm.add("(max-width:760px)", () => {
    track.style.overflowX = "auto"; track.style.width = "auto"; track.style.scrollSnapType = "x mandatory"; track.setAttribute("data-lenis-prevent-wheel", "");
    [...track.children].forEach((c) => (c.style.scrollSnapAlign = "center"));
  });

  // Founder quote — from the CMS story text when present
  const q = $("#xpQuote");
  const raw = (HH.content.story_paragraph_2 || "").replace(/<[^>]+>/g, "").replace(/["“”]/g, "").trim();
  if (raw) q.textContent = raw.replace(/^Same reason we print the boy who looked beyond the village,\s*/i, "").replace(/^./, (m) => m.toUpperCase());
  q.innerHTML = q.textContent.split(/\s+/).map((w) => `<span class="wd">${w}</span>`).join(" ");
  if (!reduce) gsap.to("#xpQuote .wd", { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: ".xp-quote", start: "top 75%", end: "bottom 55%", scrub: true } });
  gsap.from(".xp-quote .sig", { y: 30, opacity: 0, duration: 1, scrollTrigger: { trigger: ".xp-quote .sig", start: "top 90%" } });

  // Lookbook parallax
  document.querySelectorAll(".xp-look .look-item img").forEach((img) =>
    gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: "none", scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } }));

  ScrollTrigger.refresh();
}
if (window.HH) start(); else document.addEventListener("hh:ready", start, { once: true });
